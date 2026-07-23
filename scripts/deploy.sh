#!/usr/bin/env bash
# =============================================================================
# Prooflayer deploy script
#
# Conventions:
#   - Server directory:      /opt/<app-name>   (default: /opt/prooflayer)
#   - .env lives ONLY on the server, generated on first deploy, never in Git.
#   - Pushing to `main` does NOT auto-deploy. You must run this script.
#
# Sync strategies:
#   - git   (default): server holds a `git clone` of the GitHub repo.
#                      Good for the "official" repo. Private repos need a
#                      Deploy Key on the server (see DEPLOY.md).
#   - rsync          : push the local working tree straight to the server.
#                      Good for projects you don't want to publish via Git yet.
#
# First-time provisioning (installs Docker + Nginx + Certbot):
#   ./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com --init
#
# Subsequent deploys:
#   ./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com
#   ./scripts/deploy.sh ubuntu@43.164.65.54 --strategy rsync
#
# Prerequisites: local machine can SSH to the target; domain (if any) already
# resolves to the server IP.
# =============================================================================
set -euo pipefail

# ---- defaults -------------------------------------------------------------
APP_NAME="prooflayer"
APP_DIR=""                         # defaults to /opt/$APP_NAME
STRATEGY="git"
BRANCH="main"
REPO_URL="https://github.com/centimetre11/prooflayer.git"
DOMAIN=""
CERTBOT_EMAIL=""
INIT=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  sed -n '2,40p' "$0"
  exit "${1:-0}"
}

# ---- parse args -----------------------------------------------------------
if [[ $# -lt 1 ]]; then usage 1; fi
SSH_TARGET="$1"; shift
case "$SSH_TARGET" in
  -h|--help) usage 0 ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)   DOMAIN="$2"; shift 2 ;;
    --email)    CERTBOT_EMAIL="$2"; shift 2 ;;
    --strategy) STRATEGY="$2"; shift 2 ;;
    --branch)   BRANCH="$2"; shift 2 ;;
    --repo)     REPO_URL="$2"; shift 2 ;;
    --app-name) APP_NAME="$2"; shift 2 ;;
    --app-dir)  APP_DIR="$2"; shift 2 ;;
    --init)     INIT=1; shift ;;
    -h|--help)  usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

APP_DIR="${APP_DIR:-/opt/$APP_NAME}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN:-example.com}}"
HOST_PART="${SSH_TARGET#*@}"
if [[ -n "$DOMAIN" ]]; then
  APP_PUBLIC_URL="https://$DOMAIN"
else
  APP_PUBLIC_URL="http://$HOST_PART"
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
run_remote() { ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"; }

log "target      : $SSH_TARGET"
log "app dir     : $APP_DIR"
log "strategy    : $STRATEGY"
log "branch/repo : $BRANCH  $REPO_URL"
log "public url  : $APP_PUBLIC_URL"
[[ -n "$DOMAIN" ]] && log "domain      : $DOMAIN (certbot email: $CERTBOT_EMAIL)"

# ---- 0. connectivity check ------------------------------------------------
log "checking SSH connectivity…"
run_remote "echo ok >/dev/null" || { echo "Cannot SSH to $SSH_TARGET" >&2; exit 1; }

# ---- 1. provisioning (--init) --------------------------------------------
if [[ "$INIT" -eq 1 ]]; then
  log "provisioning host (Docker + Nginx + Certbot)…"
  run_remote 'bash -s' <<'INIT'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1; then
  echo "[init] installing Docker…"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi
if ! sudo docker compose version >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y docker-compose-plugin
fi
echo "[init] installing Nginx / Certbot / git / rsync…"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx git rsync openssl
sudo systemctl enable --now nginx
echo "[init] done."
INIT
fi

# ---- 2. ensure app dir ----------------------------------------------------
log "ensuring $APP_DIR exists…"
run_remote "sudo mkdir -p '$APP_DIR' && sudo chown -R \$(whoami):\$(whoami) '$APP_DIR'"

# ---- 3. sync code ---------------------------------------------------------
if [[ "$STRATEGY" == "git" ]]; then
  log "syncing code via git ($BRANCH)…"
  run_remote 'bash -s' <<EOF
set -euo pipefail
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch --all --prune
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
EOF
elif [[ "$STRATEGY" == "rsync" ]]; then
  log "syncing code via rsync…"
  rsync -az --delete \
    --exclude '.git' --exclude 'node_modules' --exclude '.next' \
    --exclude '.env' --exclude '.env.*' --exclude '.DS_Store' \
    -e "ssh ${SSH_OPTS[*]}" \
    "$REPO_ROOT/" "$SSH_TARGET:$APP_DIR/"
else
  echo "Unknown strategy: $STRATEGY (use git|rsync)" >&2; exit 1
fi

# ---- 4. ensure .env on the server ----------------------------------------
log "ensuring .env on server (generated once, never overwritten)…"
run_remote 'bash -s' <<EOF
set -euo pipefail
cd "$APP_DIR"
if [ ! -f .env ]; then
  echo "[deploy] .env not found — generating with random secrets…"
  DB_PW=\$(openssl rand -hex 24)
  AUTH_SECRET=\$(openssl rand -base64 32)
  CRED_KEY=\$(openssl rand -base64 32)
  CRON_SECRET=\$(openssl rand -hex 24)
  cat > .env <<ENV
# Generated by deploy.sh — safe to edit. NEVER commit this file.
POSTGRES_USER=prooflayer
POSTGRES_PASSWORD=\$DB_PW
POSTGRES_DB=prooflayer
DATABASE_URL=postgresql://prooflayer:\$DB_PW@db:5432/prooflayer?schema=public

APP_URL=$APP_PUBLIC_URL
AUTH_URL=$APP_PUBLIC_URL
AUTH_SECRET=\$AUTH_SECRET

RESEND_API_KEY=
EMAIL_FROM=Prooflayer <onboarding@resend.dev>

SCANNER_USER_AGENT=ProoflayerBot/1.0 (+https://prooflayer.example/bot)
SCANNER_RENDER_TIMEOUT_MS=30000

CREDENTIAL_MASTER_KEY=\$CRED_KEY
CRON_SECRET=\$CRON_SECRET
ENV
  chmod 600 .env
  echo "[deploy] .env created. Add RESEND_API_KEY later to enable real emails."
else
  echo "[deploy] .env already exists — left untouched."
fi
EOF

# ---- 5. build & start containers -----------------------------------------
log "building & starting containers (this pulls the Playwright image on first run)…"
run_remote 'bash -s' <<EOF
set -euo pipefail
cd "$APP_DIR"
sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml ps
EOF

# ---- 6. nginx + TLS (only when a domain is provided) ----------------------
if [[ -n "$DOMAIN" ]]; then
  log "configuring Nginx for $DOMAIN…"
  TMP_NGINX="$(mktemp)"
  cat > "$TMP_NGINX" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX
  scp "${SSH_OPTS[@]}" "$TMP_NGINX" "$SSH_TARGET:/tmp/$APP_NAME.nginx"
  rm -f "$TMP_NGINX"
  run_remote "bash -s" <<EOF
set -euo pipefail
sudo mv "/tmp/$APP_NAME.nginx" "/etc/nginx/sites-available/$APP_NAME"
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect; then
  echo "[deploy] TLS enabled for $DOMAIN"
else
  echo "[deploy] certbot failed — check that $DOMAIN resolves to the server IP. Site still served over HTTP."
fi
EOF
fi

# ---- 7. summary -----------------------------------------------------------
log "deploy complete."
log "app should be reachable at: $APP_PUBLIC_URL"
log "view logs:  ssh $SSH_TARGET 'cd $APP_DIR && sudo docker compose -f docker-compose.prod.yml logs -f app'"
