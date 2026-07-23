import type { Finding, RiskCounts, ScanContext } from "@/lib/types";
import { evaluateRuleSet } from "@/lib/rules/engine";
import { getActiveRuleSet } from "@/lib/rules/loader";
import { renderAndCollect } from "./render";
import { extractTargets } from "./extract";
import { headlineNumbers, riskCounts, safetyScore } from "./score";

export interface ScanResult {
  url: string;
  finalUrl: string;
  rulesetVersion: string;
  findings: Finding[];
  riskCounts: RiskCounts;
  score: number;
  headline: ReturnType<typeof headlineNumbers>;
  meta: {
    supabaseUrl?: string;
    supabaseRef?: string;
    assetCount: number;
    networkCount: number;
    timings: Record<string, number>;
    errors: string[];
  };
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

async function fetchRoot(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          process.env.SCANNER_USER_AGENT ?? "ProoflayerBot/1.0",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full external-scan pipeline:
 * fetch_root -> render(Playwright) -> collect_assets -> detect -> probe -> score -> report
 */
export async function runExternalScan(inputUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(inputUrl);
  const origin = new URL(url).origin;
  const timings: Record<string, number> = {};

  const t0 = Date.now();
  const rawHtml = await fetchRoot(url);
  timings.fetch_root = Date.now() - t0;

  const t1 = Date.now();
  const rendered = await renderAndCollect(url);
  timings.render = Date.now() - t1;

  const ctx: ScanContext = {
    url,
    origin,
    html: `${rawHtml}\n${rendered.html}`,
    assetText: rendered.assetText,
    assets: rendered.assets,
    networkUrls: rendered.networkUrls,
    tokens: [],
    timings,
    errors: [...rendered.errors],
  };

  const t2 = Date.now();
  extractTargets(ctx);
  timings.detect = Date.now() - t2;

  const ruleset = getActiveRuleSet();
  const t3 = Date.now();
  const findings = await evaluateRuleSet(ruleset, ctx);
  timings.rules = Date.now() - t3;

  return {
    url,
    finalUrl: rendered.finalUrl,
    rulesetVersion: ruleset.version,
    findings,
    riskCounts: riskCounts(findings),
    score: safetyScore(findings),
    headline: headlineNumbers(findings),
    meta: {
      supabaseUrl: ctx.supabaseUrl,
      supabaseRef: ctx.supabaseRef,
      assetCount: ctx.assets.length,
      networkCount: ctx.networkUrls.length,
      timings,
      errors: ctx.errors,
    },
  };
}
