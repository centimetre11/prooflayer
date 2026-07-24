import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";

export async function subscribeEmail(input: {
  email: string;
  source?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false as const, code: "INVALID" as const, message: "Please enter a valid email" };
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
      subject: "[InsightElk] We received your email subscription",
      text: "Thanks for following InsightElk. We'll occasionally send product updates and security insights. This email won't be used to create a console account.",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0b1210">You're subscribed</h2>
          <p style="color:#444">Thanks for following InsightElk. We'll occasionally send product updates and security insights.</p>
          <p style="color:#888;font-size:12px">This does not create a console account. To use the console, please sign up.</p>
        </div>`,
      meta: { source: input.source ?? "unknown", kind: "subscribe_ack" },
    });
  } catch (err) {
    console.warn("[subscribe] ack email failed", err);
  }

  return { ok: true as const, already: false as const };
}
