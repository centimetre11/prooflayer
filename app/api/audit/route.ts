import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomToken } from "@/lib/utils";
import { processDeepResult, DeepInputError } from "@/lib/auditor/process";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().min(3).max(2048),
  secret: z.string().min(8),
  projectRef: z.string().optional(),
});

async function ensureIngestToken(appId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  for (let i = 0; i < 5; i++) {
    const token = randomToken(40);
    try {
      await prisma.app.update({ where: { id: appId }, data: { ingestToken: token } });
      return token;
    } catch {
      // extremely unlikely unique collision — retry
    }
  }
  throw new Error("could not allocate ingest token");
}

export async function POST(req: Request) {
  // Layer 2 requires an account: the deep result is recorded against an app and
  // watched long-term, so it must belong to a user.
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to run a deeper check." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { url, secret, projectRef } = parsed.data;

  const host = (() => {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).host;
    } catch {
      return url;
    }
  })();

  const app =
    (await prisma.app.findFirst({ where: { userId: session.user.id, url } })) ??
    (await prisma.app.create({ data: { userId: session.user.id, name: host, url } }));

  try {
    // The user is looking at the result on screen right now, so don't email for
    // this first, interactive run — only the unattended scheduled ingests do.
    const { scanId } = await processDeepResult(
      secret,
      { id: app.id, name: app.name, url: app.url, userEmail: session.user.email, userId: session.user.id },
      { notify: false, projectRef }
    );

    // First deep result = enroll the app in continuous deep monitoring and mint
    // the ingest token its AI agent will POST to on a schedule.
    const token = await ensureIngestToken(app.id, app.ingestToken);
    if (!app.deepMonitoringEnabled) {
      await prisma.app.update({ where: { id: app.id }, data: { deepMonitoringEnabled: true } });
    }

    return NextResponse.json({ scanId, appId: app.id, ingestToken: token });
  } catch (err) {
    if (err instanceof DeepInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "audit failed" },
      { status: 502 }
    );
  }
}
