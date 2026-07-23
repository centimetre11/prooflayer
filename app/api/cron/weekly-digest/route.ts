import { NextResponse } from "next/server";
import { runWeeklyDigest } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await runWeeklyDigest();
  return NextResponse.json({
    ran: results.length,
    sent: results.filter((r) => r.status === "SENT").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    results,
  });
}
