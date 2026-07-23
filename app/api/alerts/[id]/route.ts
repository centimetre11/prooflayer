import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ackAlert, resolveAlert } from "@/lib/alerts/engine";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["ack", "resolve"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const alert = await prisma.alert.findUnique({ where: { id }, include: { app: true } });
  if (!alert || alert.app.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated =
    parsed.data.action === "ack" ? await ackAlert(id) : await resolveAlert(id);
  return NextResponse.json({ state: updated.state });
}
