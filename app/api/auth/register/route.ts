import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/access/register";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await registerUser(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Please check your name, email, and password (at least 8 characters)" }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
