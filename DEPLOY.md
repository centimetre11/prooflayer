# 部署指南（Prooflayer）

本项目按以下约定部署到自有服务器（Ubuntu），Web 应用跑在 Docker 里，
Nginx + Certbot 装在宿主机上做反向代理与 TLS。

## 约定

| 项目 | 约定 |
| --- | --- |
| 服务器目录 | `/opt/<项目名>`，默认 `/opt/prooflayer` |
| `.env` | **只放服务器**，首次部署自动生成随机密钥，永不进 Git（`.gitignore` 已忽略 `.env*`） |
| 上线方式 | 推到 `main` **不会**自动上线，必须本机跑 `scripts/deploy.sh` |
| 反向代理 | 宿主机 Nginx → `127.0.0.1:3000`（容器只监听回环） |
| TLS | Certbot（Let's Encrypt），需域名已解析到服务器 IP |

## 前提

- 本机能免密 SSH 到服务器（例如 `ssh ubuntu@43.164.65.54`）。
- 若要 HTTPS：域名的 A 记录已指向服务器 IP。

## 首次装机（安装 Docker / Nginx / Certbot 并部署）

```bash
./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com --init
```

`--init` 只需第一次执行。之后再部署不用带 `--init`。

## 日常部署

```bash
# Git 策略（默认，正式仓库）：服务器 git pull 后重建容器
./scripts/deploy.sh ubuntu@43.164.65.54 --domain example.com

# 仅先跑起来、暂无域名（HTTP，用 IP 访问）
./scripts/deploy.sh ubuntu@43.164.65.54
```

## 两种同步策略

### 1. Git 部署（默认，`--strategy git`）

代码在 GitHub，服务器是 clone 副本。适合正式仓库。
部署时服务器执行 `git fetch && git reset --hard origin/<branch>`。

- **公开仓库**：无需额外配置，服务器直接 HTTPS clone。
- **私有仓库**：需要在服务器配 **Deploy Key**，服务器才能 `git pull`：

  ```bash
  # 1) 在服务器生成一把只读 Deploy Key
  ssh ubuntu@43.164.65.54 'ssh-keygen -t ed25519 -N "" -f ~/.ssh/prooflayer_deploy -C prooflayer-deploy'
  ssh ubuntu@43.164.65.54 'cat ~/.ssh/prooflayer_deploy.pub'

  # 2) 把公钥加为仓库 Deploy Key（Settings → Deploy keys，read-only 即可）
  gh repo deploy-key add <(ssh ubuntu@43.164.65.54 'cat ~/.ssh/prooflayer_deploy.pub') \
    -R centimetre11/prooflayer -t prooflayer-deploy

  # 3) 让该 key 用于 github.com（服务器 ~/.ssh/config）
  #    Host github.com
  #      IdentityFile ~/.ssh/prooflayer_deploy
  #      IdentitiesOnly yes

  # 4) 部署时用 SSH 形式的仓库地址
  ./scripts/deploy.sh ubuntu@43.164.65.54 --repo git@github.com:centimetre11/prooflayer.git
  ```

### 2. rsync 部署（`--strategy rsync`）

本机工作区直接同步到服务器，不经过 GitHub。适合还不想走 Git 发布的项目。

```bash
./scripts/deploy.sh ubuntu@43.164.65.54 --strategy rsync
```

会排除 `.git / node_modules / .next / .env`。

## 环境变量（.env）

首次部署时 `deploy.sh` 会在服务器生成 `/opt/prooflayer/.env`，包含随机的
`POSTGRES_PASSWORD / AUTH_SECRET / CREDENTIAL_MASTER_KEY / CRON_SECRET`，
`DATABASE_URL` 指向 compose 内的 `db` 服务。字段说明见 `.env.example`。

需要真实发信（魔法链接登录、告警邮件）时，登录服务器补上 `RESEND_API_KEY` 后重启：

```bash
ssh ubuntu@43.164.65.54
cd /opt/prooflayer && nano .env         # 填入 RESEND_API_KEY
sudo docker compose -f docker-compose.prod.yml up -d
```

## 服务构成（docker-compose.prod.yml）

- `db`：Postgres 16，数据存于命名卷 `prooflayer_pgdata`。
- `app`：Next.js 应用（含 Playwright/Chromium 做真实扫描）。启动时自动
  `prisma db push` 建表并 seed 规则，然后 `next start`，仅监听 `127.0.0.1:3000`。
- `worker`：常驻 cron 进程，每日 03:00 做漂移检测 / secret 监测 / 邮件告警。

## 常用运维命令

```bash
# 看日志
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml logs -f app'

# 重启
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml restart'

# 手动跑一次监测
ssh ubuntu@43.164.65.54 'cd /opt/prooflayer && sudo docker compose -f docker-compose.prod.yml exec worker npx tsx worker/monitor.ts --once'
```
