export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export type MatcherType = "regex" | "entropy" | "jwt_decode" | "http_probe";

export interface RuleRemediation {
  summary: string;
  steps: string[];
  /** Human-friendly Supabase console path, e.g. "Authentication → Policies". */
  consolePath?: string;
  /** Rough fix time estimate in minutes, used for the report's third headline number. */
  estMinutes?: number;
}

export interface RuleDefinition {
  id: string;
  category: string;
  severity: Severity;
  matcherType: MatcherType;
  title: string;
  description: string;
  enabled?: boolean;
  confidence?: number;
  remediation: RuleRemediation;
  /** matcher-specific config */
  payload: Record<string, unknown>;
}

export interface RuleSet {
  version: string;
  name: string;
  rules: RuleDefinition[];
}

export interface Finding {
  ruleId: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
  fingerprint: string;
  remediation: RuleRemediation;
  /** Redacted evidence safe to display/store. */
  evidence: Record<string, unknown>;
}

export interface RiskCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/** Everything the detectors/probes need about a target, gathered during scan. */
export interface ScanContext {
  url: string;
  /** normalized origin */
  origin: string;
  /** raw HTML of root document */
  html: string;
  /** concatenated text of all discovered JS/CSS assets + inline scripts */
  assetText: string;
  /** list of asset URLs collected */
  assets: string[];
  /** request URLs observed at runtime (XHR/fetch) */
  networkUrls: string[];
  /** detected supabase project url, if any */
  supabaseUrl?: string;
  /** detected supabase project ref, if any */
  supabaseRef?: string;
  /** collected candidate tokens (jwt-like strings) with where they were found */
  tokens: { value: string; where: string }[];
  /** timings + errors for meta */
  timings: Record<string, number>;
  errors: string[];
}
