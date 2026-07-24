import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdminApi } from "@/lib/admin/auth";
import { planFor } from "@/lib/plans";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  tier: z.enum(["FREE", "INDIE", "TEAM", "ENTERPRISE"]).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminApi();
    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());

    if (body.role === "USER" && id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot demote yourself to a regular user" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (body.role) {
      await prisma.user.update({
        where: { id },
        data: { role: body.role },
      });
    }

    if (body.tier) {
      const plan = planFor(body.tier);
      await prisma.subscription.upsert({
        where: { userId: id },
        update: { tier: body.tier, appLimit: plan.appLimit, status: "active" },
        create: {
          userId: id,
          tier: body.tier,
          appLimit: plan.appLimit,
          status: "active",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
