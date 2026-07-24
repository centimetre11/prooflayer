import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const app = await prisma.app.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.app.update({
    where: { id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ id: updated.id, name: updated.name });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const app = await prisma.app.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Scans, alerts, evidence records and audit credentials cascade on delete.
  await prisma.app.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
