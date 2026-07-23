import "dotenv/config";
import cron from "node-cron";
import { runMonitoringCycle } from "@/lib/monitor/run";
import { closeBrowser } from "@/lib/scanner/render";

const once = process.argv.includes("--once");

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

async function main() {
  if (once) {
    await cycle();
    await closeBrowser();
    process.exit(0);
  }
  // Daily at 03:00 local time.
  cron.schedule("0 3 * * *", cycle);
  console.log("[monitor] scheduled daily at 03:00. Running an initial cycle now…");
  await cycle();
}

main();
