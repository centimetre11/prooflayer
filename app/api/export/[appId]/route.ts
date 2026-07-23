import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { planFor } from "@/lib/plans";
import { buildDossier, renderDossierHtml } from "@/lib/compliance/dossier";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { appId } = await params;

  const app = await prisma.app.findFirst({ where: { id: appId, userId: session.user.id } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  const plan = planFor(sub?.tier ?? "FREE");

  // The panic-moment paywall: viewing is free, exporting requires a paid plan.
  if (!plan.canExport) {
    return NextResponse.json(
      {
        error: "导出尽调应答包需要付费方案",
        upgrade: true,
        message: "你的证据已就绪。升级到 Indie 及以上即可导出/分享给客户与投资人。",
      },
      { status: 402 }
    );
  }

  const dossier = await buildDossier(appId);
  if (!dossier) return NextResponse.json({ error: "not found" }, { status: 404 });

  const html = renderDossierHtml(dossier);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="prooflayer-dossier-${appId}.html"`,
    },
  });
}
