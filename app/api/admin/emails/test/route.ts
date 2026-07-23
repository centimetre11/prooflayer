import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, requireAdminApi } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminApi();
    const { to } = bodySchema.parse(await req.json());

    const res = await sendEmail({
      to,
      userId: session.user.id,
      kind: "SYSTEM",
      force: true,
      subject: "[麋鹿洞察] 后台测试邮件",
      text: "这是一封来自运营后台的测试邮件。若你能看到它，说明邮件通道正常。",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0b1210">后台测试邮件</h2>
          <p style="color:#444">这是一封来自运营后台的测试邮件。若你能看到它，说明邮件通道正常。</p>
          <p style="color:#888;font-size:12px">操作者：${session.user.email ?? session.user.id}</p>
        </div>`,
    });

    return NextResponse.json({ ok: true, status: res.status, id: res.id });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "邮箱无效" }, { status: 400 });
    }
    console.error("[admin/emails/test]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "发送失败" },
      { status: 500 }
    );
  }
}
