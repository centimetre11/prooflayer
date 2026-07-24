// Sniff what the user's AI assistant handed back, so the UI never has to expose
// backend types. Two shapes matter: a Postgres result envelope (from running our
// read-only SQL) and raw Firestore rules text.

export type DeepKind = "connection_string" | "firestore_rules" | "pg_result";

export interface PgPayload {
  tables?: unknown;
  policies?: unknown;
  grants?: unknown;
  functions?: unknown;
}

/**
 * If the assistant ran our read-only SQL, it pastes back a JSON envelope tagged
 * `insightelk: "pg-audit-*"`. We can analyze it directly — nothing connects from
 * our side.
 */
export function tryParsePgEnvelope(secret: string): PgPayload | null {
  const t = secret.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t);
    const tag = o?.insightelk ?? o?.prooflayer;
    if (o && typeof o === "object" && typeof tag === "string" && tag.startsWith("pg-audit")) {
      return o as PgPayload;
    }
  } catch {
    // not JSON
  }
  return null;
}

/** Recognize a live connection string or raw Firestore rules text. */
export function detectKind(secret: string): "connection_string" | "firestore_rules" | null {
  const s = secret.trim();
  if (/^postgres(ql)?:\/\//i.test(s)) return "connection_string";
  if (/rules_version|service\s+cloud\.firestore/i.test(s)) return "firestore_rules";
  if (/\ballow\s+[a-z]/i.test(s) && /\bmatch\s+\//i.test(s)) return "firestore_rules";
  return null;
}
