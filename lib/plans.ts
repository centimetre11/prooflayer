import type { Tier } from "@prisma/client";

export interface Plan {
  tier: Tier;
  name: string;
  /** original (strikethrough) price */
  price: string;
  /** limited-time price; paid tiers are currently all a limited-time $0 */
  promoPrice?: string;
  priceNote: string;
  appLimit: number;
  retentionDays: number;
  canExport: boolean;
  features: string[];
  highlight?: boolean;
}

/** Early-bird limited time: paid tiers show the original price, deal price is $0 for now */
export const PROMO_LABEL = "Limited early-bird";

export const PLANS: Plan[] = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    priceNote: "Free forever",
    appLimit: 1,
    retentionDays: 7,
    canExport: false,
    features: [
      "1 app",
      "One-time security check + weekly passive monitoring",
      "Last 7 days of snapshots",
      "Incident diagnostic report (key details redacted)",
      "Read-only share link",
    ],
  },
  {
    tier: "INDIE",
    name: "Indie",
    price: "$19",
    promoPrice: "$0",
    priceNote: "per month",
    appLimit: 3,
    retentionDays: 30,
    canExport: true,
    features: [
      "3 apps",
      "Daily real-time monitoring",
      "Full incident report + remediation guide",
      "Deep RLS audit",
      "Due diligence response package export",
    ],
  },
  {
    tier: "TEAM",
    name: "Team",
    price: "$99",
    promoPrice: "$0",
    priceNote: "per month",
    appLimit: 15,
    retentionDays: 365,
    canExport: true,
    highlight: true,
    features: [
      "15 apps",
      "Compliance Dossier (evidence chain auto-generated)",
      "Multi-channel alerts",
      "365-day data retention",
      "SOC2 pre-audit (gap analysis)",
    ],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "$2,000+",
    promoPrice: "$0",
    priceNote: "from /month",
    appLimit: 9999,
    retentionDays: 3650,
    canExport: true,
    features: [
      "Unlimited apps",
      "SSO, audit export",
      "White-labeled dossier (for customer due diligence)",
      "SLA",
      "Dedicated support",
    ],
  },
];

export function planFor(tier: Tier): Plan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}
