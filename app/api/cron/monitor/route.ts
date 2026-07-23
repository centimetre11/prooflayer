import { NextResponse } from "next/server";
import { runMonitoringCycle } from "@/lib/monitor/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const results = await runMonitoringCycle(force);
  return NextResponse.json({ ran: results.length, results });
}
