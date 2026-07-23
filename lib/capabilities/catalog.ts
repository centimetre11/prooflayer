/**
 * 检测能力清单 —— 供运营后台按层展示「已做 / 部分 / 未做」。
 * 新增规则或审计项时请同步更新本文件。
 */

export type CapabilityStatus = "done" | "partial" | "planned";

export type CapabilityLayerId =
  | "secrets"
  | "auth"
  | "data"
  | "storage"
  | "supply"
  | "runtime"
  | "governance";

export interface CapabilityItem {
  id: string;
  title: string;
  description: string;
  status: CapabilityStatus;
  /** 落地模块，便于对照代码 */
  module: string;
  /** 对应规则 / finding 的 ruleId（可选） */
  ruleIds?: string[];
  note?: string;
}

export interface CapabilityLayer {
  id: CapabilityLayerId;
  name: string;
  summary: string;
  access: string;
  items: CapabilityItem[];
}

export const CAPABILITY_LAYERS: CapabilityLayer[] = [
  {
    id: "secrets",
    name: "密钥与暴露面",
    summary: "前端资源与运行时请求中的密钥、私钥、Source Map 等泄露检测。",
    access: "零接入 · 外部扫描",
    items: [
      {
        id: "supabase-service-role",
        title: "Supabase service_role 密钥泄露",
        description: "JWT 解码识别 role=service_role，前端出现即 CRITICAL。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-service-role-key"],
      },
      {
        id: "supabase-secret-key",
        title: "Supabase Secret Key（sb_secret_）泄露",
        description: "新版 secret key 前缀正则检测。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-secret-key-new"],
      },
      {
        id: "supabase-anon-key",
        title: "anon / publishable key 暴露提示",
        description: "识别公开 key，并提示需确认 RLS。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-anon-key", "supabase-publishable-key-new"],
      },
      {
        id: "third-party-keys",
        title: "第三方 API Key 泄露",
        description: "Stripe / OpenAI / Anthropic / AWS / Google / GitHub 等。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: [
          "stripe-secret-live",
          "openai-key",
          "anthropic-key",
          "aws-access-key",
          "google-api-key",
          "github-token",
        ],
      },
      {
        id: "private-key-hardcoded",
        title: "私钥与硬编码口令",
        description: "PEM 私钥块、password= 形态硬编码、高熵兜底。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["private-key-block", "hardcoded-password", "high-entropy-secret"],
      },
      {
        id: "source-map",
        title: "Source Map 暴露",
        description: "生产环境 sourceMappingURL 检测。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["source-map-exposed"],
      },
      {
        id: "firebase-config",
        title: "Firebase 配置暴露",
        description: "发现 firebaseio.com 地址并提示检查规则。",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["firebase-config"],
      },
      {
        id: "env-file-leak",
        title: ".env / 构建产物环境变量泄露",
        description: "检测可公开访问的 .env、NEXT_PUBLIC_ 误用敏感值等。",
        status: "planned",
        module: "scanner",
        note: "待扩展规则集",
      },
    ],
  },
  {
    id: "auth",
    name: "身份与访问",
    summary: "Auth 公开配置探测：自助注册、邮箱确认等。",
    access: "零接入 · HTTP 探测",
    items: [
      {
        id: "auth-settings-reachable",
        title: "Auth settings 可公开读取",
        description: "探测 /auth/v1/settings 作为后续检查依据。",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-reachable"],
      },
      {
        id: "auth-signup-open",
        title: "自助注册开放",
        description: "disable_signup=false 时告警。",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-signup-open"],
      },
      {
        id: "auth-autoconfirm",
        title: "邮箱确认关闭（自动确认）",
        description: "mailer_autoconfirm=true 时告警。",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-autoconfirm"],
      },
      {
        id: "auth-providers-weak",
        title: "弱认证提供方 / 匿名登录滥用",
        description: "匿名登录、未限制的 OAuth 回调域等。",
        status: "planned",
        module: "scanner",
      },
      {
        id: "cors-misconfig",
        title: "CORS / 允许来源过宽",
        description: "检测 API 对任意 Origin 放行。",
        status: "planned",
        module: "scanner",
      },
    ],
  },
  {
    id: "data",
    name: "数据层（RLS / 规则）",
    summary: "半接入深度审计：Postgres RLS 与 Firestore 安全规则。",
    access: "半接入 · 深度审计",
    items: [
      {
        id: "rls-disabled-anon",
        title: "表未开 RLS 且对 anon 授权",
        description: "CVE-2025-48757 同款根因，CRITICAL。",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-disabled-anon-grant"],
      },
      {
        id: "rls-disabled",
        title: "表未启用 RLS",
        description: "含用户数据的表未开行级安全。",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-disabled"],
      },
      {
        id: "rls-using-true",
        title: "策略恒真 USING(true)",
        description: "策略形同虚设。",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-policy-using-true"],
      },
      {
        id: "rls-anon-no-policy",
        title: "anon 授权但无策略",
        description: "危险的不确定状态。",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-anon-grant-no-policy"],
      },
      {
        id: "security-definer",
        title: "SECURITY DEFINER 未固定 search_path",
        description: "防 search_path 注入提权。",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["func-securitydefiner-searchpath"],
      },
      {
        id: "firestore-rules",
        title: "Firestore 规则静态审计",
        description: "allow if true、测试模式时间窗、写操作无 auth 等。",
        status: "done",
        module: "auditor/firestore",
        ruleIds: [
          "fs-rules-version",
          "fs-allow-true",
          "fs-test-mode",
          "fs-write-no-auth",
          "fs-no-allow",
        ],
      },
      {
        id: "rls-policy-coverage",
        title: "策略覆盖度与最小权限评分",
        description: "按表统计策略完整度、过大权限角色。",
        status: "planned",
        module: "auditor/rls",
      },
      {
        id: "storage-rls",
        title: "Storage 对象级策略审计",
        description: "storage.objects 策略与公开桶交叉检查。",
        status: "planned",
        module: "auditor",
      },
    ],
  },
  {
    id: "storage",
    name: "存储与云配置",
    summary: "公开桶、对象 ACL、Edge Function 暴露面等。",
    access: "零接入 / 半接入",
    items: [
      {
        id: "public-bucket-probe",
        title: "Storage 公开桶匿名探测",
        description: "对已知 bucket 路径做匿名 list/get 探测。",
        status: "planned",
        module: "scanner",
        note: "技术方案已规划，尚未落地",
      },
      {
        id: "edge-function-exposure",
        title: "Edge Function / API 路由暴露",
        description: "未鉴权的 functions/v1 端点探测。",
        status: "planned",
        module: "scanner",
      },
      {
        id: "realtime-channel-open",
        title: "Realtime 频道过宽订阅",
        description: "未鉴权即可订阅敏感频道。",
        status: "planned",
        module: "scanner",
      },
    ],
  },
  {
    id: "supply",
    name: "依赖与供应链",
    summary: "已知 CVE、过期包、锁文件完整性（SCA）。",
    access: "半接入 · 仓库/构建产物",
    items: [
      {
        id: "dependency-cve",
        title: "依赖已知 CVE 扫描",
        description: "基于 package-lock / bun.lock 的漏洞匹配。",
        status: "planned",
        module: "supply-chain",
      },
      {
        id: "outdated-critical",
        title: "高危过期依赖提示",
        description: "核心框架长期未升级告警。",
        status: "planned",
        module: "supply-chain",
      },
      {
        id: "lockfile-integrity",
        title: "锁文件篡改检测",
        description: "与预期哈希不一致时告警。",
        status: "planned",
        module: "supply-chain",
      },
    ],
  },
  {
    id: "runtime",
    name: "运行时与业务逻辑",
    summary: "IDOR、越权、注入等深度动态检测（偏 DAST）。",
    access: "半接入 / 授权测试",
    items: [
      {
        id: "idor-probe",
        title: "IDOR / 越权探测",
        description: "替换资源 ID 验证跨用户访问。",
        status: "planned",
        module: "dast",
        note: "成本高，非 MVP 范围",
      },
      {
        id: "injection-probe",
        title: "注入类探测（SQLi / XSS 基线）",
        description: "对公开表单与 API 做轻量注入探针。",
        status: "planned",
        module: "dast",
      },
      {
        id: "ssrf-probe",
        title: "SSRF / 回调滥用",
        description: "Webhook / 预览 URL 类端点探测。",
        status: "planned",
        module: "dast",
      },
    ],
  },
  {
    id: "governance",
    name: "持续治理",
    summary: "漂移监测、告警闭环、不可篡改证据链与尽调档案。",
    access: "订阅 · 持续运行",
    items: [
      {
        id: "daily-rescan",
        title: "每日基线重扫",
        description: "对开启监测的应用每日轻量重扫。",
        status: "done",
        module: "monitor + worker",
      },
      {
        id: "security-regression-alert",
        title: "仅对安全回退告警",
        description: "RLS/策略放宽等才告警，收紧只记档。",
        status: "done",
        module: "alerts/engine",
      },
      {
        id: "alert-lifecycle",
        title: "告警状态机与去重",
        description: "open→ack→resolved，fingerprint 防疲劳。",
        status: "done",
        module: "alerts/engine",
      },
      {
        id: "evidence-chain",
        title: "不可篡改证据哈希链",
        description: "扫描/修复/心跳写入可核验链。",
        status: "done",
        module: "evidence/chain",
      },
      {
        id: "compliance-dossier",
        title: "尽调应答包自动生成",
        description: "基于证据链回答常见尽调问题。",
        status: "done",
        module: "compliance/dossier",
      },
      {
        id: "credential-envelope",
        title: "审计凭证信封加密与即焚",
        description: "深度审计凭证加密存储，支持短期留存策略。",
        status: "partial",
        module: "auditor/crypto",
        note: "信封加密已落地；默认 24h 即焚策略可再强化",
      },
      {
        id: "slack-webhook",
        title: "Slack / 多通道告警",
        description: "除邮件外的即时通道。",
        status: "partial",
        module: "alerts",
        note: "邮件已通；Slack Webhook 待接",
      },
      {
        id: "weekly-digest",
        title: "周报白话摘要",
        description: "本周扫描次数、发现项、趋势。",
        status: "partial",
        module: "email + admin digest",
        note: "后台可触发；用户侧周报完善中",
      },
    ],
  },
];

export const STATUS_LABEL: Record<
  CapabilityStatus,
  { label: string; short: string }
> = {
  done: { label: "已落地", short: "已做" },
  partial: { label: "部分落地", short: "部分" },
  planned: { label: "未做 / 规划中", short: "未做" },
};

export function summarizeCapabilities(layers: CapabilityLayer[] = CAPABILITY_LAYERS) {
  const totals = { done: 0, partial: 0, planned: 0, all: 0 };
  const byLayer = layers.map((layer) => {
    const counts = { done: 0, partial: 0, planned: 0, all: layer.items.length };
    for (const item of layer.items) {
      counts[item.status] += 1;
      totals[item.status] += 1;
      totals.all += 1;
    }
    return { layer, counts };
  });
  return { totals, byLayer };
}
