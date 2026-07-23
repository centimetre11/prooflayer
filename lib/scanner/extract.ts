import type { ScanContext } from "@/lib/types";

const SUPABASE_URL_RE = /https?:\/\/([a-z0-9]{16,30})\.supabase\.co/gi;
// JWT-ish: three base64url segments; supabase keys start with eyJ
const JWT_RE = /eyJ[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{6,}/g;

/**
 * Populate ctx.supabaseUrl / supabaseRef and ctx.tokens from the collected
 * HTML + asset text + observed network URLs. This is deterministic core logic
 * (not rule-driven) so http_probe rules have a target to probe.
 */
export function extractTargets(ctx: ScanContext): void {
  const haystacks = [ctx.html, ctx.assetText, ctx.networkUrls.join("\n")];

  // supabase url + ref
  for (const text of haystacks) {
    SUPABASE_URL_RE.lastIndex = 0;
    const m = SUPABASE_URL_RE.exec(text);
    if (m) {
      ctx.supabaseUrl = `https://${m[1]}.supabase.co`;
      ctx.supabaseRef = m[1];
      break;
    }
  }

  // candidate JWT tokens with where they were found
  const seen = new Set<string>();
  const scan = (text: string, where: string) => {
    JWT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = JWT_RE.exec(text))) {
      const val = m[0];
      if (seen.has(val)) continue;
      seen.add(val);
      ctx.tokens.push({ value: val, where });
      if (ctx.tokens.length > 50) return;
    }
  };
  scan(ctx.html, "html");
  scan(ctx.assetText, "asset");
  scan(ctx.networkUrls.join("\n"), "network");
}
