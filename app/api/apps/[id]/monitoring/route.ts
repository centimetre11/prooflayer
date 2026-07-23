import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({ enabled: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const app = await prisma.app.findFirst({ where: { id, userId: session.user.id } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.app.update({
    where: { id },
    data: { monitoringEnabled: parsed.data.enabled },
  });
  return NextResponse.json({ monitoringEnabled: updated.monitoringEnabled });
}
