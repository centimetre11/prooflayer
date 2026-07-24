import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processDeepResult, DeepInputError } from "@/lib/auditor/process";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Long-term deep-monitoring drop-off. The user's AI agent (cron / CI / scheduled
 * task, in whatever environment can reach the database) runs our read-only SQL
 * and POSTs the result here on a schedule. The token authenticates the app — we
 * never hold a DB connection ourselves.
 *
 * Body: the verbatim result (pg-audit JSON envelope or firestore.rules text),
 * either as the raw request body, or wrapped as { "result": "..." }.
 */
function unwrap(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t);
      // Our own pg-audit envelope: use as-is.
      const tag = o?.insightelk ?? o?.prooflayer;
      if (typeof tag === "string" && tag.startsWith("pg-audit")) return t;
      // A wrapper object carrying the real payload in a field.
      const inner = o?.result ?? o?.secret ?? o?.data;
      if (typeof inner === "string" && inner.trim().length > 0) return inner;
      if (inner && typeof inner === "object") return JSON.stringify(inner);
    } catch {
      // fall through — treat as raw text
    }
  }
  return t;
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const app = await prisma.app.findUnique({
    where: { ingestToken: token },
    include: { user: true },
  });
  if (!app) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  if (!app.deepMonitoringEnabled) {
    return NextResponse.json({ error: "deep monitoring disabled" }, { status: 403 });
  }

  const raw = await req.text().catch(() => "");
  const secret = unwrap(raw);
  if (!secret || secret.trim().length < 8) {
    return NextResponse.json({ error: "empty payload" }, { status: 400 });
  }

  try {
    const { scanId, opened, resolved, notified } = await processDeepResult(
      secret,
      { id: app.id, name: app.name, url: app.url, userEmail: app.user?.email, userId: app.userId },
      { notify: true }
    );
    return NextResponse.json({ ok: true, scanId, opened, resolved, notified });
  } catch (err) {
    if (err instanceof DeepInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingest failed" },
      { status: 502 }
    );
  }
}
