import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({ scanId: z.string() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const scan = await prisma.scan.findUnique({ where: { id: parsed.data.scanId } });
  if (!scan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const existing = await prisma.shareLink.findFirst({
    where: { scanId: scan.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return NextResponse.json({ token: existing.token });

  const token = randomToken(28);
  await prisma.shareLink.create({ data: { token, scanId: scan.id } });
  return NextResponse.json({ token });
}
