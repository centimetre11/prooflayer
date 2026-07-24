# Deployment Guide (InsightElk)

This project deploys to your own server (Ubuntu) following the conventions below: the web app runs in Docker,
while Nginx + Certbot are installed on the host to handle reverse proxying and TLS.

## Conventions

| Item | Convention |
| --- | --- |
| Server directory | `/opt/<app-name>`, default `/opt/prooflayer` |
| `.env` | **Server-only**, random secrets auto-generated on first deploy, never committed to Git (`.gitignore` already ignores `.env*`) |
| Release method | Pushing to `main` does **not** auto-deploy; you must run `scripts/deploy.sh` locally |
| Reverse proxy | Host Nginx → `127.0.0.1:3001` (the container only listens on loopback; 3000/3100 are used by other apps on this box) |
| TLS | Certbot (Let's Encrypt); the domain must already resolve to the server IP |

## Prerequisites

- Your local machine can SSH to the server without a password (e.g. `ssh ubuntu@43.164.65.54`).
- For HTTPS: the domain's A record already points to the server IP.

## First-Time Provisioning (installs Docker / Nginx / Certbot and deploys)

```bash
./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com --init
```

`--init` is only needed the first time. Later deploys don't need `--init`.

## Routine Deployment

```bash
# Git strategy (default, official repo): the server runs git pull, then rebuilds the containers
./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com

# Just get it running for now, no domain yet (HTTP, accessed via IP)
./scripts/deploy.sh ubuntu@43.164.65.54
```

## Two Sync Strategies

### 1. Git deploy (default, `--strategy git`)

The code lives on GitHub, and the server holds a clone. Good for the official repo.
On deploy, the server runs `git fetch && git reset --hard origin/<branch>`.

- **Public repo**: no extra configuration needed; the server clones directly over HTTPS.
- **Private repo**: you need to configure a **Deploy Key** on the server so it can `git pull`:

  ```bash
  # 1) Generate a read-only Deploy Key on the server
  ssh ubuntu@43.164.65.54 'ssh-keygen -t ed25519 -N "" -f ~/.ssh/prooflayer_deploy -C prooflayer-deploy'
  ssh ubuntu@43.164.65.54 'cat ~/.ssh/prooflayer_deploy.pub'

  # 2) Add the public key as a repo Deploy Key (Settings → Deploy keys, read-only is fine)
  gh repo deploy-key add <(ssh ubuntu@43.164.65.54 'cat ~/.ssh/prooflayer_deploy.pub') \
    -R centimetre11/prooflayer -t prooflayer-deploy

  # 3) Make that key be used for github.com (server ~/.ssh/config)
  #    Host github.com
  #      IdentityFile ~/.ssh/prooflayer_deploy
  #      IdentitiesOnly yes

  # 4) Use the SSH-form repo URL when deploying
  ./scripts/deploy.sh ubuntu@43.164.65.54 --repo git@github.com:centimetre11/prooflayer.git
  ```

### 2. rsync deploy (`--strategy rsync`)

The local working tree syncs directly to the server, bypassing GitHub. Good for projects you don't want to publish via Git yet.

```bash
./scripts/deploy.sh ubuntu@43.164.65.54 --strategy rsync
```

It excludes `.git / node_modules / .next / .env`.

## Environment Variables (.env)

On first deploy, `deploy.sh` generates `/opt/prooflayer/.env` on the server, containing random
`POSTGRES_PASSWORD / AUTH_SECRET / CREDENTIAL_MASTER_KEY / CRON_SECRET`,
with `DATABASE_URL` pointing at the `db` service inside compose. See `.env.example` for field descriptions.

When you need real email sending (magic-link sign-in, alert emails), log in to the server, add `RESEND_API_KEY`, and restart:

```bash
ssh ubuntu@43.164.65.54
cd /opt/prooflayer && nano .env         # fill in RESEND_API_KEY
sudo docker compose -f docker-compose.prod.yml up -d
```

## Service Makeup (docker-compose.prod.yml)

- `db`: Postgres 16, data stored in the named volume `prooflayer_pgdata`.
- `app`: the Next.js app (includes Playwright/Chromium for real scanning). On startup it automatically
  runs `prisma db push` to create tables and seeds the rules, then `next start`, listening only on `127.0.0.1:3000`.
- `worker`: a resident cron process that runs drift detection / secret monitoring / email alerts daily at 03:00.

## Common Ops Commands

```bash
# View logs
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml logs -f app'

# Restart
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml restart'

# Run monitoring once manually
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml exec worker npx tsx worker/monitor.ts --once'
```
