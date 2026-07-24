import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/access/password-reset";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    await requestPasswordReset(body.email);
    // Always succeed to avoid leaking whether the email is registered.
    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, we’ve sent a password reset link.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { error: "Unable to send reset email. Please try again later." },
      { status: 500 }
    );
  }
}
