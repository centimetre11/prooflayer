import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verifyChain } from "@/lib/evidence/chain";

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

  const result = await verifyChain(appId);
  return NextResponse.json({
    ...result,
    verifiedAt: new Date().toISOString(),
    app: { id: app.id, name: app.name },
  });
}
