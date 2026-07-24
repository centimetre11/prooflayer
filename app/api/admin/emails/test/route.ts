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
      subject: "[InsightElk] Admin test email",
      text: "This is a test email from the admin console. If you can read it, your email pipeline is working correctly.",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0b1210">Admin test email</h2>
          <p style="color:#444">This is a test email from the admin console. If you can read it, your email pipeline is working correctly.</p>
          <p style="color:#888;font-size:12px">Triggered by: ${session.user.email ?? session.user.id}</p>
        </div>`,
    });

    return NextResponse.json({ ok: true, status: res.status, id: res.id });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[admin/emails/test]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
