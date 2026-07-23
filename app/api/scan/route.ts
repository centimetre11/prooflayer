import { NextResponse } from "next/server";
import { z } from "zod";
import { runExternalScan, normalizeUrl } from "@/lib/scanner/pipeline";
import { createPendingScan, saveScanResult, failScan } from "@/lib/scanner/persist";
import { recordBaselineEvidence } from "@/lib/evidence/chain";
import { syncAlertsForApp } from "@/lib/alerts/engine";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(3).max(2048),
  appId: z.string().optional(),
});

async function processScan(scanId: string, url: string, appId: string | null) {
  try {
    const result = await runExternalScan(url);
    await saveScanResult(scanId, result);
    if (appId) {
      await prisma.app.update({
        where: { id: appId },
        data: {
          lastScanAt: new Date(),
          supabaseUrl: result.meta.supabaseUrl,
          projectRef: result.meta.supabaseRef,
        },
      });
      await recordBaselineEvidence(appId, scanId, result);
      await syncAlertsForApp(appId, scanId);
    }
  } catch (err) {
    await failScan(scanId, err instanceof Error ? err.message : String(err));
  }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const url = normalizeUrl(parsed.data.url);
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  let appId: string | null = parsed.data.appId ?? null;

  // Logged-in users get a persistent App + evidence chain per scanned URL.
  if (session?.user?.id) {
    const host = new URL(url).host;
    const app =
      (appId
        ? await prisma.app.findFirst({ where: { id: appId, userId: session.user.id } })
        : null) ??
      (await prisma.app.findFirst({ where: { userId: session.user.id, url } })) ??
      (await prisma.app.create({
        data: { userId: session.user.id, name: host, url },
      }));
    appId = app.id;
  }

  const scan = await createPendingScan(url, appId ?? undefined);
  // fire-and-forget: the persistent node server keeps this alive
  void processScan(scan.id, url, appId);

  return NextResponse.json({ scanId: scan.id, appId });
}
