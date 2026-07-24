import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureNotificationPreference } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  emailAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  scanComplete: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pref = await ensureNotificationPreference(session.user.id);
  return NextResponse.json(pref);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  await ensureNotificationPreference(session.user.id);
  const pref = await prisma.notificationPreference.update({
    where: { userId: session.user.id },
    data: body.data,
  });
  return NextResponse.json(pref);
}
