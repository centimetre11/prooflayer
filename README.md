# Prooflayer — Vibe 应用治理套件

> 为 vibe coding 长成业务的应用，提供"持续尽责的证明"——从免费安全体检切入，以治理订阅和合规档案为收入主体。

Prooflayer 是 AI 生成应用（Lovable / Bolt / v0 / Cursor 等）的「合规档案 + 保险」。它对 Supabase 生态应用做真实的外部安全体检、深度 RLS 审计、每日漂移监测，并把每一次结果沉淀为不可篡改的证据链——出事故或客户尽调时，一键自证清白。

本仓库是完整 MVP：**真实可运行的扫描引擎 + 深度审计 + 持续监测告警 + 合规档案 + 恐慌时刻付费墙**，Next.js 全栈实现。

## 技术栈

- **Next.js 16（App Router）+ TypeScript + Tailwind v4** —— 页面 + API Route Handlers 一体
- **Prisma + PostgreSQL** —— 自有数据存储（扫描/发现/告警/证据链/订阅）
- **Playwright（Chromium headless）** —— 真实渲染 SPA、拦截运行时请求以发现泄露的密钥
- **Auth.js（next-auth v5）+ Resend** —— 邮箱魔法链接登录 & 告警邮件（无 key 时回退控制台）
- **node-cron worker** —— 独立进程做每日漂移检测与告警

## 目录结构

```
app/                      页面 + API 路由
  page.tsx                入口页 / landing（粘贴 URL 零注册体检）
  scan/[id]/              扫描进度页（轮询 + 白话解说）
  report/[id]/            体检报告（三个数字 / 风险卡片 / 复测对比 / 分享）
  share/[token]/          只读分享报告
  audit/                  深度 RLS 审计表单
  dashboard/              控制台 + 应用详情（时间轴 / 告警 / 档案 / 恐慌面板）
  pricing/                定价
  login/                  魔法链接登录
  api/                    scan / audit / share / alerts / compliance / export / cron
lib/
  rules/                  规则引擎（regex/entropy/jwt_decode/http_probe）+ rulesets
  scanner/                外部扫描流水线（Playwright 渲染 + 提取 + 打分 + 落库）
  auditor/                深度 RLS 审计（pg 只读 / Management API）+ 凭证信封加密
  evidence/               不可篡改证据哈希链
  alerts/                 告警状态机（open→ack→resolved）+ 去重 + 防疲劳
  monitor/                监测循环（供 worker 与 cron API 复用）
  compliance/             尽调应答包生成
worker/monitor.ts         独立 cron worker
prisma/                   schema + seed
```

## 快速开始

### 1. 安装依赖 + Chromium

```bash
npm install
npx playwright install chromium
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 生成密钥
npx auth secret            # 写入 AUTH_SECRET
openssl rand -base64 32    # 写入 CREDENTIAL_MASTER_KEY
```

（`npm install` 时已通过 `postinstall` 生成过一次含随机密钥的 `.env`，可直接使用。）

### 3. 启动数据库

有 Docker：

```bash
docker compose up -d
```

没有 Docker：把 `.env` 里的 `DATABASE_URL` 指向任意 Postgres（如 Supabase / Neon 免费实例）。

### 4. 建表 + 种子

```bash
npm run db:push     # 或 npm run db:migrate
npm run db:seed     # 落库规则集（保证历史报告可复现）+ demo@prooflayer.dev
```

### 5. 运行

```bash
npm run dev
```

打开 http://localhost:3000 ，粘贴任意 Supabase 应用地址即可跑一次**真实**体检。

## 真实扫描示例

入口页粘贴一个用 Supabase 的公开应用地址，Prooflayer 会：

1. 用真实浏览器渲染页面，抓取前端 bundle 与运行时 XHR/fetch；
2. 提取 Supabase 项目地址、解码 JWT 判断 anon / **service_role**（后者出现在前端即为严重事故）；
3. 正则匹配各类泄露密钥（Stripe / OpenAI / AWS / GitHub / 私钥等）；
4. 匿名探测 `/auth/v1/settings` 判断自助注册、邮箱确认是否被关闭；
5. 输出白话报告：**风险总数 / 最高危一项 / 修复预估分钟数**。

### 深度 RLS 审计（可选，真实）

报告页点「深度 RLS 审计」，粘贴 **只读连接串** 或 **Supabase Management API Token（+ Project Ref）**：

- 只读连接：强制 `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`，查 `pg_class` / `pg_policies` / `pg_proc`；
- Management API：调用 `POST /v1/projects/{ref}/database/query`（`read_only: true`）；
- 判级：RLS 未启用=High、`USING(true)`=High、`grant to anon` 无策略=Critical、`SECURITY DEFINER` 未固定 search_path=Medium；
- 凭证仅在内存使用、API 永不回显、**默认用后即焚**（勾选保留才信封加密存储）。

## 持续监测（cron worker）

```bash
# 立即跑一轮（强制，便于测试）
npm run monitor:once

# 常驻：每日 03:00 自动跑，对开启监测的应用重扫 + 只对安全回退告警
npm run worker
```

或用外部调度器打 API：

```bash
curl -X POST "http://localhost:3000/api/cron/monitor?force=1" -H "x-cron-secret: $CRON_SECRET"
```

监测会：重扫 → 写入基线快照 + 监测心跳（连续性证明）→ 协调告警（open→ack→resolved，fingerprint 去重，每应用每 30 天高优通知 ≤2 条）→ 邮件通知。

## 合规档案与恐慌时刻

- 每次扫描/监测都追加到应用的**证据哈希链**：`chain_hash = sha256(prev_hash ‖ payload_hash ‖ created_at)`；
- 应用详情页可「校验证据链完整性」，任意篡改都会被发现；
- 「恐慌时刻」面板据此一键生成**尽调应答包**（SIG-Lite 精简问答 + 证据时间轴）；
- 付费墙卡在**导出/分享**而非查看：查看免费，导出需 Indie 及以上（`GET /api/export/[appId]` 对免费层返回 402）。

## 定位与红线

- 卖的是「持续尽责的证明」：监控是钩子，档案是资产，治理是生意；
- **仅提供检测工具，非安全担保方**；默认**只告警不阻断**；宣传不使用绝对化表述。

## 不在本次 MVP 范围（对齐方案 P1/P2）

RUM SDK、ClickHouse 事件管道、异常流量、SOC2 完整映射、企业治理面板 / SSO、Slack/短信告警、支付网关接入。
