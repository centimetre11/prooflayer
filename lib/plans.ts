import type { Tier } from "@prisma/client";

export interface Plan {
  tier: Tier;
  name: string;
  /** 原价展示（划线） */
  price: string;
  /** 限时价；付费档当前统一限时 $0 */
  promoPrice?: string;
  priceNote: string;
  appLimit: number;
  retentionDays: number;
  canExport: boolean;
  features: string[];
  highlight?: boolean;
}

/** 早鸟限时：付费档标原价，成交价暂为 $0 */
export const PROMO_LABEL = "限时早鸟";

export const PLANS: Plan[] = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    priceNote: "永久免费",
    appLimit: 1,
    retentionDays: 7,
    canExport: false,
    features: [
      "1 个应用",
      "一次性体检 + 每周被动监测",
      "最近 7 天快照",
      "事故诊断报告（关键细节打码）",
      "只读分享链接",
    ],
  },
  {
    tier: "INDIE",
    name: "Indie",
    price: "$19",
    promoPrice: "$0",
    priceNote: "每月",
    appLimit: 3,
    retentionDays: 30,
    canExport: true,
    features: [
      "3 个应用",
      "每日实时监测",
      "完整事故报告 + 修复指引",
      "深度 RLS 审计",
      "尽调应答包导出",
    ],
  },
  {
    tier: "TEAM",
    name: "Team",
    price: "$99",
    promoPrice: "$0",
    priceNote: "每月",
    appLimit: 15,
    retentionDays: 365,
    canExport: true,
    highlight: true,
    features: [
      "15 个应用",
      "合规档案（证据链自动生成）",
      "多渠道告警",
      "365 天数据保留",
      "SOC2 预审（差距分析）",
    ],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "$2,000+",
    promoPrice: "$0",
    priceNote: "每月起",
    appLimit: 9999,
    retentionDays: 3650,
    canExport: true,
    features: [
      "不限应用数",
      "SSO、审计导出",
      "档案白标（客户尽调用）",
      "SLA",
      "专属支持",
    ],
  },
];

export function planFor(tier: Tier): Plan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}
