import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomToken } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  enabled: z.boolean().optional(),
  rotate: z.boolean().optional(),
});

async function mintToken(appId: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const token = randomToken(40);
    try {
      await prisma.app.update({ where: { id: appId }, data: { ingestToken: token } });
      return token;
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("could not allocate ingest token");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const app = await prisma.app.findFirst({ where: { id, userId: session.user.id } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  let ingestToken = app.ingestToken;
  if (parsed.data.rotate || (parsed.data.enabled && !ingestToken)) {
    ingestToken = await mintToken(id);
  }

  const updated = await prisma.app.update({
    where: { id },
    data: {
      ...(parsed.data.enabled !== undefined ? { deepMonitoringEnabled: parsed.data.enabled } : {}),
    },
  });

  return NextResponse.json({
    deepMonitoringEnabled: updated.deepMonitoringEnabled,
    ingestToken,
  });
}
