import { Client } from "pg";
import type { Finding, RiskCounts } from "@/lib/types";
import { fingerprint } from "@/lib/rules/engine";
import { riskCounts, safetyScore } from "@/lib/scanner/score";

const Q_TABLES = `
  SELECT n.nspname AS schemaname, c.relname AS tablename,
         c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  ORDER BY 1,2;`;

const Q_POLICIES = `
  SELECT schemaname, tablename, policyname, cmd,
         pg_get_expr(pol.polqual, pol.polrelid) AS qual,
         pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check,
         (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(pol.polroles)) AS roles
  FROM pg_policies pp
  JOIN pg_policy pol ON pol.polname = pp.policyname
  JOIN pg_class c ON c.oid = pol.polrelid AND c.relname = pp.tablename
  ORDER BY 1,2;`;

// Simpler policy query fallback (pg_policies already has qual/with_check as text)
const Q_POLICIES_SIMPLE = `
  SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles
  FROM pg_policies
  ORDER BY 1,2;`;

const Q_GRANTS = `
  SELECT table_schema, table_name, privilege_type, grantee
  FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated')
    AND table_schema NOT IN ('pg_catalog','information_schema');`;

const Q_FUNCS = `
  SELECT p.proname, p.prosecdef, p.proconfig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public';`;

interface TableRow {
  schemaname: string;
  tablename: string;
  rls_enabled: boolean;
  rls_forced: boolean;
}
interface PolicyRow {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
  roles: string[] | null;
}
interface GrantRow {
  table_schema: string;
  table_name: string;
  privilege_type: string;
  grantee: string;
}
interface FuncRow {
  proname: string;
  prosecdef: boolean;
  proconfig: string[] | null;
}

export interface AuditInput {
  kind: "connection_string" | "pat";
  secret: string;
  projectRef?: string;
}

export interface AuditResult {
  findings: Finding[];
  riskCounts: RiskCounts;
  score: number;
  tableCount: number;
  meta: { errors: string[]; source: string };
}

function mk(
  ruleId: string,
  severity: Finding["severity"],
  title: string,
  description: string,
  evidence: Record<string, unknown>,
  remediation: Finding["remediation"],
  fpKey: string
): Finding {
  return {
    ruleId,
    category: "rls",
    severity,
    title,
    description,
    confidence: 92,
    remediation,
    evidence,
    fingerprint: fingerprint(ruleId, fpKey),
  };
}

function analyze(
  tables: TableRow[],
  policies: PolicyRow[],
  grants: GrantRow[],
  funcs: FuncRow[]
): Finding[] {
  const findings: Finding[] = [];
  const anonGrants = grants.filter((g) => g.grantee === "anon");
  const anonByTable = new Set(anonGrants.map((g) => `${g.table_schema}.${g.table_name}`));

  for (const t of tables) {
    const key = `${t.schemaname}.${t.tablename}`;
    const tablePolicies = policies.filter(
      (p) => p.schemaname === t.schemaname && p.tablename === t.tablename
    );
    const anonExposed = anonByTable.has(key);

    if (!t.rls_enabled) {
      if (anonExposed) {
        findings.push(
          mk(
            "rls-disabled-anon-grant",
            "CRITICAL",
            `Table ${key} has RLS disabled and is granted to anon`,
            "This table does not have row-level security (RLS) enabled, and it has also granted access to the anon role. Anyone with the anon public key can read and write this table's data directly (the same root cause as CVE-2025-48757).",
            { table: key, rls: false, anonGrant: true },
            {
              summary: "Immediately enable RLS on this table and write least-privilege policies.",
              steps: [
                `ALTER TABLE ${key} ENABLE ROW LEVEL SECURITY;`,
                "Create policies for this table that allow only the necessary access, avoiding USING (true)",
                "Confirm that the anon role can only access data that genuinely needs to be public",
              ],
              consolePath: "Authentication → Policies",
              estMinutes: 20,
            },
            key
          )
        );
      } else {
        findings.push(
          mk(
            "rls-disabled",
            "HIGH",
            `Table ${key} does not have RLS enabled`,
            "This table does not have row-level security (RLS) enabled. If there are any grants to anon/authenticated, the data will be left unprotected.",
            { table: key, rls: false },
            {
              summary: "Enable RLS on this table and add policies.",
              steps: [
                `ALTER TABLE ${key} ENABLE ROW LEVEL SECURITY;`,
                "Add least-privilege policies",
              ],
              consolePath: "Authentication → Policies",
              estMinutes: 15,
            },
            key
          )
        );
      }
      continue;
    }

    // RLS enabled — inspect policies
    for (const p of tablePolicies) {
      const qual = (p.qual ?? "").trim().toLowerCase();
      const wc = (p.with_check ?? "").trim().toLowerCase();
      if (qual === "true" || wc === "true") {
        findings.push(
          mk(
            "rls-policy-using-true",
            "HIGH",
            `Policy ${p.policyname} on table ${key} uses an always-true condition`,
            "The policy contains an always-true USING (true) or WITH CHECK (true) condition, which is equivalent to opening it up to everyone, rendering RLS meaningless.",
            { table: key, policy: p.policyname, cmd: p.cmd, qual: p.qual, with_check: p.with_check },
            {
              summary: "Replace the always-true condition with a real constraint based on auth.uid() or similar.",
              steps: [
                "Locate the policy: Authentication → Policies",
                "Change USING (true) to a least-privilege condition such as USING (auth.uid() = user_id)",
              ],
              consolePath: "Authentication → Policies",
              estMinutes: 20,
            },
            `${key}:${p.policyname}`
          )
        );
      }
    }

    if (anonExposed && tablePolicies.length === 0) {
      findings.push(
        mk(
          "rls-anon-grant-no-policy",
          "CRITICAL",
          `Table ${key} is granted to anon but has no policies`,
          "This table has RLS enabled but grants permissions to anon without any policies — depending on the configuration this may allow everything or deny everything, which is a dangerous, indeterminate state.",
          { table: key, anonGrant: true, policies: 0 },
          {
            summary: "Add explicit least-privilege policies for this table.",
            steps: ["Write precise policies for scenarios that anon should access", "Remove unnecessary anon grants"],
            consolePath: "Authentication → Policies",
            estMinutes: 20,
          },
          key
        )
      );
    }
  }

  for (const f of funcs) {
    if (!f.prosecdef) continue;
    const hasSearchPath = (f.proconfig ?? []).some((c) => c.toLowerCase().startsWith("search_path="));
    if (!hasSearchPath) {
      findings.push(
        mk(
          "func-securitydefiner-searchpath",
          "MEDIUM",
          `SECURITY DEFINER function ${f.proname} does not have a fixed search_path`,
          "SECURITY DEFINER functions run with the definer's privileges; without a fixed search_path, they can be escalated via a search_path injection attack.",
          { function: f.proname },
          {
            summary: "Fix the search_path for the function.",
            steps: [`ALTER FUNCTION ${f.proname} SET search_path = public, pg_temp;`],
            consolePath: "Database → Functions",
            estMinutes: 10,
          },
          f.proname
        )
      );
    }
  }

  return findings;
}

// Works for ANY Postgres — Supabase, Neon, RDS, Railway, Render, self-hosted, etc.
// Managed providers usually require SSL; self-hosted containers usually don't.
function sslFor(conn: string): false | { rejectUnauthorized: boolean } {
  const l = conn.toLowerCase();
  if (l.includes("sslmode=disable")) return false;
  if (/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(l)) return false;
  return { rejectUnauthorized: false };
}

// Connect with an SSL fallback: if the first attempt fails with an SSL-related
// error, retry with the opposite SSL setting (covers both "SSL required" and
// "server does not support SSL").
async function connectPg(conn: string): Promise<Client> {
  const primarySsl = sslFor(conn);
  const first = new Client({ connectionString: conn, ssl: primarySsl, statement_timeout: 15000 });
  try {
    await first.connect();
    return first;
  } catch (err) {
    await first.end().catch(() => {});
    const msg = String((err as Error)?.message ?? err).toLowerCase();
    if (msg.includes("ssl") || msg.includes("secure") || msg.includes("certificate") || msg.includes("encryption")) {
      const alt = new Client({
        connectionString: conn,
        ssl: primarySsl ? false : { rejectUnauthorized: false },
        statement_timeout: 15000,
      });
      await alt.connect();
      return alt;
    }
    throw err;
  }
}

async function auditViaConnection(conn: string): Promise<{
  tables: TableRow[];
  policies: PolicyRow[];
  grants: GrantRow[];
  funcs: FuncRow[];
}> {
  const client = await connectPg(conn);
  try {
    // enforce read-only session
    await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;");
    const tables = (await client.query(Q_TABLES)).rows as TableRow[];
    let policies: PolicyRow[];
    try {
      policies = (await client.query(Q_POLICIES_SIMPLE)).rows as PolicyRow[];
    } catch {
      policies = (await client.query(Q_POLICIES)).rows as PolicyRow[];
    }
    const grants = (await client.query(Q_GRANTS)).rows as GrantRow[];
    const funcs = (await client.query(Q_FUNCS)).rows as FuncRow[];
    return { tables, policies, grants, funcs };
  } finally {
    await client.end().catch(() => {});
  }
}

async function runManagementQuery(ref: string, pat: string, query: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, read_only: true }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Management API ${res.status}: ${t.slice(0, 200)}`);
  }
  return (await res.json()) as unknown[];
}

async function auditViaPat(ref: string, pat: string) {
  const tables = (await runManagementQuery(ref, pat, Q_TABLES)) as TableRow[];
  const policies = (await runManagementQuery(ref, pat, Q_POLICIES_SIMPLE)) as PolicyRow[];
  const grants = (await runManagementQuery(ref, pat, Q_GRANTS)) as GrantRow[];
  const funcs = (await runManagementQuery(ref, pat, Q_FUNCS)) as FuncRow[];
  return { tables, policies, grants, funcs };
}

// Audit from a result set the user's AI assistant already collected (by running
// our read-only SQL wherever it can reach the DB — local, tunnel, docker exec).
// Nothing connects from our side, so internal/self-hosted DBs "just work" and no
// credential ever leaves the user's environment.
export function runPgResultAudit(payload: {
  tables?: unknown;
  policies?: unknown;
  grants?: unknown;
  functions?: unknown;
}): AuditResult {
  const tables = (Array.isArray(payload.tables) ? payload.tables : []) as TableRow[];
  const policies = (Array.isArray(payload.policies) ? payload.policies : []) as PolicyRow[];
  const grants = (Array.isArray(payload.grants) ? payload.grants : []) as GrantRow[];
  const funcs = (Array.isArray(payload.functions) ? payload.functions : []) as FuncRow[];
  const findings = analyze(tables, policies, grants, funcs);
  return {
    findings,
    riskCounts: riskCounts(findings),
    score: safetyScore(findings),
    tableCount: tables.length,
    meta: { errors: [], source: "pg_result" },
  };
}

export async function runDeepAudit(input: AuditInput): Promise<AuditResult> {
  const errors: string[] = [];
  let data: {
    tables: TableRow[];
    policies: PolicyRow[];
    grants: GrantRow[];
    funcs: FuncRow[];
  } = { tables: [], policies: [], grants: [], funcs: [] };
  const source = input.kind;

  if (input.kind === "connection_string") {
    data = await auditViaConnection(input.secret);
  } else {
    if (!input.projectRef) throw new Error("projectRef required for PAT audit");
    data = await auditViaPat(input.projectRef, input.secret);
  }

  const findings = analyze(data.tables, data.policies, data.grants, data.funcs);
  return {
    findings,
    riskCounts: riskCounts(findings),
    score: safetyScore(findings),
    tableCount: data.tables.length,
    meta: { errors, source },
  };
}
