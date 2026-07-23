import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";

export async function subscribeEmail(input: {
  email: string;
  source?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false as const, code: "INVALID" as const, message: "请输入有效邮箱" };
  }

  const existing = await prisma.emailSubscriber.findUnique({ where: { email } });
  if (existing && !existing.unsubscribed) {
    return { ok: true as const, already: true as const };
  }

  await prisma.emailSubscriber.upsert({
    where: { email },
    update: {
      unsubscribed: false,
      source: input.source ?? existing?.source ?? "unknown",
    },
    create: {
      email,
      source: input.source ?? "unknown",
    },
  });

  // Best-effort acknowledgement; don't fail the subscription if mail fails.
  try {
    await sendEmail({
      to: email,
      kind: "SYSTEM",
      force: true,
      subject: "[麋鹿洞察] 已收到你的邮箱登记",
      text: "感谢关注麋鹿洞察。我们会不定期发送产品更新与安全资讯，不会用此邮箱开通控制台账号。",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0b1210">已登记成功</h2>
          <p style="color:#444">感谢关注麋鹿洞察。我们会不定期发送产品更新与安全资讯。</p>
          <p style="color:#888;font-size:12px">这不会开通控制台账号。若要使用控制台，请前往注册。</p>
        </div>`,
      meta: { source: input.source ?? "unknown", kind: "subscribe_ack" },
    });
  } catch (err) {
    console.warn("[subscribe] ack email failed", err);
  }

  return { ok: true as const, already: false as const };
}
