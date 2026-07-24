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
        error: "Exporting the due diligence response package requires a paid plan",
        upgrade: true,
        message: "Your evidence is ready. Upgrade to Indie or above to export/share it with customers and investors.",
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
      "Content-Disposition": `attachment; filename="milu-dossier-${appId}.html"`,
    },
  });
}
