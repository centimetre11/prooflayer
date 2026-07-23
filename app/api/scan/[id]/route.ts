import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      score: true,
      riskCounts: true,
      error: true,
      appId: true,
    },
  });
  if (!scan) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(scan);
}
