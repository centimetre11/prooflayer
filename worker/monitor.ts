import "dotenv/config";
import cron from "node-cron";
import { runMonitoringCycle } from "@/lib/monitor/run";
import { runWeeklyDigest } from "@/lib/email";
import { closeBrowser } from "@/lib/scanner/render";

const once = process.argv.includes("--once");
const digestOnly = process.argv.includes("--digest");

async function cycle() {
  const start = new Date().toISOString();
  console.log(`[monitor] cycle start ${start}`);
  try {
    const results = await runMonitoringCycle(once);
    console.log(`[monitor] scanned ${results.length} app(s)`);
    for (const r of results) {
      console.log(
        `  - ${r.appName} (${r.appId}): score=${r.score ?? "-"} opened=${r.opened} resolved=${r.resolved} notified=${r.notified}${r.error ? ` error=${r.error}` : ""}`
      );
    }
  } catch (err) {
    console.error("[monitor] cycle failed", err);
  }
}

async function digest() {
  console.log(`[digest] weekly digest start ${new Date().toISOString()}`);
  try {
    const results = await runWeeklyDigest();
    const sent = results.filter((r) => r.status === "SENT").length;
    const skipped = results.filter((r) => r.status === "SKIPPED").length;
    const failed = results.filter((r) => r.status === "FAILED").length;
    console.log(
      `[digest] users=${results.length} sent=${sent} skipped=${skipped} failed=${failed}`
    );
  } catch (err) {
    console.error("[digest] failed", err);
  }
}

async function main() {
  if (digestOnly) {
    await digest();
    process.exit(0);
  }
  if (once) {
    await cycle();
    await closeBrowser();
    process.exit(0);
  }
  // Daily monitoring at 03:00 local time.
  cron.schedule("0 3 * * *", cycle);
  // Weekly digest every Monday at 09:00 local time.
  cron.schedule("0 9 * * 1", digest);
  console.log(
    "[monitor] scheduled daily 03:00 + weekly digest Mon 09:00. Running an initial cycle now…"
  );
  await cycle();
}

main();
