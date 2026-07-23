import { NextResponse } from "next/server";
import { AdminAuthError, requireAdminApi } from "@/lib/admin/auth";
import { runWeeklyDigest } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  try {
    await requireAdminApi();
    const results = await runWeeklyDigest();
    const sent = results.filter((r) => r.status === "SENT").length;
    const skipped = results.filter((r) => r.status === "SKIPPED").length;
    const failed = results.filter((r) => r.status === "FAILED").length;
    return NextResponse.json({
      ok: true,
      total: results.length,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/emails/digest]", err);
    return NextResponse.json({ error: "周报发送失败" }, { status: 500 });
  }
}
