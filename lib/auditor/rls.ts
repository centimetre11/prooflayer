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
            `表 ${key} 未启用 RLS 且对 anon 开放`,
            "该表未启用行级安全（RLS），同时对 anon 角色授予了访问权限。任何人拿 anon 公钥即可直接读写该表数据（CVE-2025-48757 同款根因）。",
            { table: key, rls: false, anonGrant: true },
            {
              summary: "立即为该表启用 RLS 并编写最小权限策略。",
              steps: [
                `ALTER TABLE ${key} ENABLE ROW LEVEL SECURITY;`,
                "为该表创建仅允许必要访问的策略，避免 USING (true)",
                "确认 anon 角色仅能访问真正需要公开的数据",
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
            `表 ${key} 未启用 RLS`,
            "该表未启用行级安全（RLS）。若存在任何面向 anon/authenticated 的授权，数据将失去保护。",
            { table: key, rls: false },
            {
              summary: "为该表启用 RLS 并添加策略。",
              steps: [
                `ALTER TABLE ${key} ENABLE ROW LEVEL SECURITY;`,
                "添加最小权限策略",
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
            `表 ${key} 的策略 ${p.policyname} 使用恒真条件`,
            "策略包含 USING (true) 或 WITH CHECK (true) 恒真条件，等同于对所有人开放，RLS 形同虚设。",
            { table: key, policy: p.policyname, cmd: p.cmd, qual: p.qual, with_check: p.with_check },
            {
              summary: "将恒真条件替换为基于 auth.uid() 等的真实约束。",
              steps: [
                "定位该策略：Authentication → Policies",
                "把 USING (true) 改为如 USING (auth.uid() = user_id) 的最小权限条件",
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
          `表 ${key} 对 anon 授权但无任何策略`,
          "该表启用了 RLS，但对 anon 授予了权限却没有任何策略——取决于配置可能完全放行或完全拒绝，属于危险的不确定状态。",
          { table: key, anonGrant: true, policies: 0 },
          {
            summary: "为该表添加明确的最小权限策略。",
            steps: ["为 anon 可访问的场景编写精确策略", "移除不必要的 anon 授权"],
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
          `SECURITY DEFINER 函数 ${f.proname} 未固定 search_path`,
          "SECURITY DEFINER 函数以定义者权限运行，若未固定 search_path，可能被 search_path 注入攻击提权。",
          { function: f.proname },
          {
            summary: "为函数固定 search_path。",
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

async function auditViaConnection(conn: string): Promise<{
  tables: TableRow[];
  policies: PolicyRow[];
  grants: GrantRow[];
  funcs: FuncRow[];
}> {
  const client = new Client({
    connectionString: conn,
    ssl: conn.includes("localhost") ? undefined : { rejectUnauthorized: false },
    statement_timeout: 15000,
  });
  await client.connect();
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
