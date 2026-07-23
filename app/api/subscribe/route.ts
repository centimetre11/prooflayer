import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeEmail } from "@/lib/access/subscribe";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await subscribeEmail(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, already: result.already });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
    }
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "登记失败" }, { status: 500 });
  }
}
