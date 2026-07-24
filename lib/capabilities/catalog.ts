/**
 * Detection capability catalog — used by the ops admin console to show
 * "Done / Partial / Not done" grouped by layer.
 * Keep this file in sync whenever you add a rule or audit check.
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
  /** Implementing module, for easy cross-referencing with the code */
  module: string;
  /** ruleId(s) of the corresponding rule / finding (optional) */
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
    name: "Secrets & Exposure Surface",
    summary:
      "Detection of leaked secrets, private keys, source maps, and more in frontend assets and runtime requests.",
    access: "Zero-touch · External scan",
    items: [
      {
        id: "supabase-service-role",
        title: "Supabase service_role key leak",
        description:
          "JWT decoding identifies role=service_role; CRITICAL the moment it appears in the frontend.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-service-role-key"],
      },
      {
        id: "supabase-secret-key",
        title: "Supabase Secret Key (sb_secret_) leak",
        description: "Regex detection of the new secret key prefix.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-secret-key-new"],
      },
      {
        id: "supabase-anon-key",
        title: "anon / publishable key exposure notice",
        description: "Identifies public keys and flags that RLS must be confirmed.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["supabase-anon-key", "supabase-publishable-key-new"],
      },
      {
        id: "third-party-keys",
        title: "Third-party API key leak",
        description: "Stripe / OpenAI / Anthropic / AWS / Google / GitHub, etc.",
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
        title: "Private keys & hardcoded credentials",
        description:
          "PEM private key blocks, hardcoded password= patterns, and a high-entropy catch-all.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["private-key-block", "hardcoded-password", "high-entropy-secret"],
      },
      {
        id: "source-map",
        title: "Source map exposure",
        description: "Detection of sourceMappingURL in production.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["source-map-exposed"],
      },
      {
        id: "firebase-config",
        title: "Firebase config exposure",
        description: "Detects firebaseio.com addresses and prompts a rules review.",
        status: "done",
        module: "scanner + supabase-v1",
        ruleIds: ["firebase-config"],
      },
      {
        id: "env-file-leak",
        title: ".env / build-artifact environment variable leak",
        description:
          "Detects publicly accessible .env files, sensitive values misused via NEXT_PUBLIC_, and similar issues.",
        status: "planned",
        module: "scanner",
        note: "Ruleset to be expanded",
      },
    ],
  },
  {
    id: "auth",
    name: "Identity & Access",
    summary: "Probing of public Auth config: self-service signup, email confirmation, etc.",
    access: "Zero-touch · HTTP probe",
    items: [
      {
        id: "auth-settings-reachable",
        title: "Auth settings publicly readable",
        description: "Probes /auth/v1/settings as the basis for subsequent checks.",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-reachable"],
      },
      {
        id: "auth-signup-open",
        title: "Self-service signup open",
        description: "Alerts when disable_signup=false.",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-signup-open"],
      },
      {
        id: "auth-autoconfirm",
        title: "Email confirmation disabled (auto-confirm)",
        description: "Alerts when mailer_autoconfirm=true.",
        status: "done",
        module: "scanner + http_probe",
        ruleIds: ["supabase-auth-autoconfirm"],
      },
      {
        id: "auth-providers-weak",
        title: "Weak auth providers / anonymous sign-in abuse",
        description: "Anonymous sign-in, unrestricted OAuth callback domains, etc.",
        status: "planned",
        module: "scanner",
      },
      {
        id: "cors-misconfig",
        title: "CORS / overly broad allowed origins",
        description: "Detects APIs that allow requests from any Origin.",
        status: "planned",
        module: "scanner",
      },
    ],
  },
  {
    id: "data",
    name: "Data Layer (RLS / Rules)",
    summary: "Semi-touch deep audit: Postgres RLS and Firestore security rules.",
    access: "Semi-touch · Deep audit",
    items: [
      {
        id: "rls-disabled-anon",
        title: "Table without RLS and granted to anon",
        description: "Same root cause as CVE-2025-48757; CRITICAL.",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-disabled-anon-grant"],
      },
      {
        id: "rls-disabled",
        title: "Table without RLS enabled",
        description: "A table holding user data does not have row-level security enabled.",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-disabled"],
      },
      {
        id: "rls-using-true",
        title: "Always-true policy USING(true)",
        description: "The policy is effectively meaningless.",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-policy-using-true"],
      },
      {
        id: "rls-anon-no-policy",
        title: "anon granted but no policy",
        description: "A dangerous, indeterminate state.",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["rls-anon-grant-no-policy"],
      },
      {
        id: "security-definer",
        title: "SECURITY DEFINER without a fixed search_path",
        description: "Prevents privilege escalation via search_path injection.",
        status: "done",
        module: "auditor/rls",
        ruleIds: ["func-securitydefiner-searchpath"],
      },
      {
        id: "firestore-rules",
        title: "Static Firestore rules audit",
        description: "allow if true, test-mode time windows, writes without auth, etc.",
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
        title: "Policy coverage & least-privilege scoring",
        description: "Per-table stats on policy completeness and overly permissive roles.",
        status: "planned",
        module: "auditor/rls",
      },
      {
        id: "storage-rls",
        title: "Object-level Storage policy audit",
        description: "Cross-checks storage.objects policies against public buckets.",
        status: "planned",
        module: "auditor",
      },
    ],
  },
  {
    id: "storage",
    name: "Storage & Cloud Config",
    summary: "Public buckets, object ACLs, Edge Function exposure surface, etc.",
    access: "Zero-touch / Semi-touch",
    items: [
      {
        id: "public-bucket-probe",
        title: "Anonymous probing of public Storage buckets",
        description: "Anonymous list/get probing against known bucket paths.",
        status: "planned",
        module: "scanner",
        note: "Technical approach planned, not yet implemented",
      },
      {
        id: "edge-function-exposure",
        title: "Edge Function / API route exposure",
        description: "Probing of unauthenticated functions/v1 endpoints.",
        status: "planned",
        module: "scanner",
      },
      {
        id: "realtime-channel-open",
        title: "Overly broad Realtime channel subscriptions",
        description: "Sensitive channels that can be subscribed to without authentication.",
        status: "planned",
        module: "scanner",
      },
    ],
  },
  {
    id: "supply",
    name: "Dependencies & Supply Chain",
    summary: "Known CVEs, outdated packages, and lockfile integrity (SCA).",
    access: "Semi-touch · Repo/build artifacts",
    items: [
      {
        id: "dependency-cve",
        title: "Known-CVE dependency scan",
        description: "Vulnerability matching based on package-lock / bun.lock.",
        status: "planned",
        module: "supply-chain",
      },
      {
        id: "outdated-critical",
        title: "High-risk outdated dependency alerts",
        description: "Alerts when core frameworks go long without upgrades.",
        status: "planned",
        module: "supply-chain",
      },
      {
        id: "lockfile-integrity",
        title: "Lockfile tampering detection",
        description: "Alerts when hashes don't match expected values.",
        status: "planned",
        module: "supply-chain",
      },
    ],
  },
  {
    id: "runtime",
    name: "Runtime & Business Logic",
    summary: "Deep dynamic detection of IDOR, privilege escalation, injection, etc. (DAST-leaning).",
    access: "Semi-touch / Authorized testing",
    items: [
      {
        id: "idor-probe",
        title: "IDOR / privilege escalation probing",
        description: "Swaps resource IDs to verify cross-user access.",
        status: "planned",
        module: "dast",
        note: "High cost, out of MVP scope",
      },
      {
        id: "injection-probe",
        title: "Injection probing (SQLi / XSS baseline)",
        description: "Lightweight injection probes against public forms and APIs.",
        status: "planned",
        module: "dast",
      },
      {
        id: "ssrf-probe",
        title: "SSRF / callback abuse",
        description: "Probing of webhook / preview URL endpoints.",
        status: "planned",
        module: "dast",
      },
    ],
  },
  {
    id: "governance",
    name: "Continuous Governance",
    summary:
      "Drift monitoring, closed-loop alerting, a tamper-evident evidence chain, and a due-diligence dossier.",
    access: "Subscription · Always-on",
    items: [
      {
        id: "daily-rescan",
        title: "Daily baseline re-scan",
        description: "A lightweight daily re-scan for apps with monitoring enabled.",
        status: "done",
        module: "monitor + worker",
      },
      {
        id: "security-regression-alert",
        title: "Alert only on security regressions",
        description: "Only alerts on loosened RLS/policies; tightening is logged only.",
        status: "done",
        module: "alerts/engine",
      },
      {
        id: "alert-lifecycle",
        title: "Alert state machine & deduplication",
        description: "open→ack→resolved, with fingerprints to prevent alert fatigue.",
        status: "done",
        module: "alerts/engine",
      },
      {
        id: "evidence-chain",
        title: "Tamper-evident evidence hash chain",
        description: "Scans/remediations/heartbeats are written to a verifiable chain.",
        status: "done",
        module: "evidence/chain",
      },
      {
        id: "compliance-dossier",
        title: "Automatic due-diligence response pack generation",
        description: "Answers common due-diligence questions based on the evidence chain.",
        status: "done",
        module: "compliance/dossier",
      },
      {
        id: "credential-envelope",
        title: "Envelope encryption & auto-burn of audit credentials",
        description:
          "Deep-audit credentials are stored encrypted, with support for a short-lived retention policy.",
        status: "partial",
        module: "auditor/crypto",
        note: "Envelope encryption is implemented; the default 24h auto-burn policy can be hardened further",
      },
      {
        id: "slack-webhook",
        title: "Slack / multi-channel alerts",
        description: "Instant channels beyond email.",
        status: "partial",
        module: "alerts",
        note: "Email is live; Slack Webhook pending",
      },
      {
        id: "weekly-digest",
        title: "Plain-language weekly digest",
        description: "This week's scan count, findings, and trends.",
        status: "partial",
        module: "email + admin digest",
        note: "Can be triggered from the admin console; user-facing weekly digest in progress",
      },
    ],
  },
];

export const STATUS_LABEL: Record<
  CapabilityStatus,
  { label: string; short: string }
> = {
  done: { label: "Implemented", short: "Done" },
  partial: { label: "Partially implemented", short: "Partial" },
  planned: { label: "Not done / Planned", short: "Not done" },
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
