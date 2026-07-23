import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, requireAdminApi } from "@/lib/admin/auth";
import {
  approveApplication,
  rejectApplication,
} from "@/lib/access/applications";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminApi();
    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());

    if (body.action === "approve") {
      const result = await approveApplication(id, session.user.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const result = await rejectApplication(id, session.user.id, body.reason);
    if (!result.ok) {
      return NextResponse.json({ error: result.code }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    console.error("[admin/applications]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
