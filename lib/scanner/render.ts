import { chromium, type Browser } from "playwright";

const g = globalThis as unknown as { __pf_browser?: Browser };

async function getBrowser(): Promise<Browser> {
  if (g.__pf_browser && g.__pf_browser.isConnected()) return g.__pf_browser;
  g.__pf_browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  return g.__pf_browser;
}

export async function closeBrowser() {
  if (g.__pf_browser) {
    await g.__pf_browser.close().catch(() => {});
    g.__pf_browser = undefined;
  }
}

export interface RenderResult {
  html: string;
  assets: string[];
  assetText: string;
  networkUrls: string[];
  finalUrl: string;
  errors: string[];
}

/**
 * Render a URL with a real headless browser so SPA JS executes, then collect
 * the root HTML + all JS/CSS asset bodies + observed runtime request URLs.
 */
export async function renderAndCollect(url: string): Promise<RenderResult> {
  const timeout = Number(process.env.SCANNER_RENDER_TIMEOUT_MS ?? 30000);
  const ua =
    process.env.SCANNER_USER_AGENT ??
    "ProoflayerBot/1.0 (+https://prooflayer.example/bot)";

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: ua,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const assets = new Set<string>();
  const networkUrls = new Set<string>();
  const assetTexts: string[] = [];
  const errors: string[] = [];
  const pending: Promise<void>[] = [];

  page.on("request", (req) => {
    networkUrls.add(req.url());
  });

  page.on("response", (res) => {
    const req = res.request();
    const type = req.resourceType();
    if (type === "script" || type === "stylesheet") {
      const u = res.url();
      assets.add(u);
      // capture body text (best-effort, bounded)
      pending.push(
        res
          .text()
          .then((t) => {
            if (t && t.length < 3_000_000) assetTexts.push(t);
          })
          .catch(() => {})
      );
    }
  });

  let finalUrl = url;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    // let the SPA settle and fire its API calls
    await page
      .waitForLoadState("networkidle", { timeout: Math.min(timeout, 12000) })
      .catch(() => {});
    finalUrl = page.url();
  } catch (err) {
    errors.push(
      `render failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let html = "";
  try {
    html = await page.content();
  } catch {
    /* ignore */
  }

  // wait for outstanding asset bodies (bounded)
  await Promise.race([
    Promise.allSettled(pending),
    new Promise((r) => setTimeout(r, 5000)),
  ]);

  await context.close().catch(() => {});

  return {
    html,
    assets: [...assets],
    assetText: assetTexts.join("\n\n"),
    networkUrls: [...networkUrls],
    finalUrl,
    errors,
  };
}
