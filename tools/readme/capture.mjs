/**
 * Captures the README media from the real rstris UI running in a browser.
 *
 * The UI is the unmodified React/Canvas front end; only the Tauri IPC layer is
 * swapped for `mockIpc.ts`, which replays a recording of the real Rust engine
 * produced by `cargo run --example readme_capture`.
 *
 * Usage:
 *   node capture.mjs            # screenshots + gameplay gif/webm
 *   node capture.mjs --shots    # screenshots only
 *   node capture.mjs --clip     # gameplay clip only
 */
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import gifenc from "gifenc";
import { chromium } from "playwright-core";
import sharp from "sharp";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const dist = path.join(here, "dist");
const outDir = path.join(root, "docs");
const shotsDir = path.join(outDir, "screenshots");
const clipsDir = path.join(outDir, "clips");
const workDir = path.join(here, ".work");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".gz": "application/gzip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function serve(dir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      let file = path.join(dir, decodeURIComponent(url.pathname));
      if (url.pathname === "/" || url.pathname.endsWith("/")) file = path.join(file, "index.html");
      const resolved = path.resolve(file);
      if (!resolved.startsWith(dir)) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(resolved);
      res.writeHead(200, {
        "content-type": MIME[path.extname(resolved)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

async function shoot(page, name, width = 1680) {
  const file = path.join(shotsDir, `${name}.png`);
  const buffer = await page.screenshot();
  await sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`  screenshot ${path.relative(root, file)}`);
}

async function waitForMenu(page) {
  await page.waitForSelector("h1:has-text('RSTRIS')");
  await page.waitForTimeout(900);
}

async function clickMenu(page, label) {
  await page
    .locator("li", { hasText: new RegExp(`^\\s*${label}\\s*$`) })
    .first()
    .click();
}

async function captureScreenshots(browser, url) {
  console.log("screenshots:");
  await fs.mkdir(shotsDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(url);
  await waitForMenu(page);
  await shoot(page, "main-menu");

  await clickMenu(page, "Play");

  // Wait for a line clear later in the game so the board looks lived-in.
  const start = Date.now();
  let captured = false;
  while (Date.now() - start < 32000 && !captured) {
    const popups = await page.locator(".animate-popup").count();
    if (popups === 1 && Date.now() - start > 16000) {
      await shoot(page, "gameplay");
      captured = true;
      break;
    }
    await page.waitForTimeout(50);
  }
  if (!captured) await shoot(page, "gameplay");

  await page.reload();
  await waitForMenu(page);
  await clickMenu(page, "High Scores");
  await page.waitForSelector("table tbody tr", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  await shoot(page, "high-scores");

  await page.reload();
  await waitForMenu(page);
  await clickMenu(page, "Settings");
  await page.waitForSelector("text=Settings", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  await shoot(page, "settings");

  await context.close();
}

async function captureClip(browser, url) {
  console.log("clip:");
  await fs.mkdir(clipsDir, { recursive: true });
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(workDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: workDir, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(url);
  await waitForMenu(page);

  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (event) => {
    frames.push({ data: event.data, ts: event.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
  });

  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: 1280,
    maxHeight: 800,
    everyNthFrame: 1,
  });

  // Warm up the screencast while the menu is up, then cut the menu frames once
  // the in-game countdown is on screen.
  await page.waitForTimeout(500);
  await clickMenu(page, "Play");
  await page.waitForSelector(".animate-countdown", { timeout: 5000 });
  await page.waitForTimeout(80);
  const cutoff = (frames.at(-1)?.ts ?? 0) * 1000 - 1;

  const seconds = Number(process.env.CLIP_SECONDS ?? 20);
  await page.waitForTimeout(seconds * 1000);
  await cdp.send("Page.stopScreencast").catch(() => {});

  await context.close();
  const videoPath = await video?.path();
  await cdp.detach().catch(() => {});

  console.log(`  captured ${frames.length} screencast frames`);

  if (videoPath) {
    const dest = path.join(clipsDir, "gameplay.webm");
    await fs.copyFile(videoPath, dest);
    console.log(`  clip ${path.relative(root, dest)}`);
  }

  await buildGif(
    frames.filter((frame) => frame.ts * 1000 > cutoff),
    path.join(clipsDir, "gameplay.gif"),
  );
}

async function buildGif(frames, dest) {
  if (frames.length === 0) throw new Error("no screencast frames captured");
  const WIDTH = Number(process.env.GIF_WIDTH ?? 880);
  const MIN_STEP_MS = Number(process.env.GIF_STEP_MS ?? 80);

  // Downsample to a stable cadence, keeping the newest frame in each slot.
  const picked = [];
  let last = -Infinity;
  for (const frame of frames) {
    const ms = frame.ts * 1000;
    if (ms - last >= MIN_STEP_MS) {
      picked.push({ ...frame, ms });
      last = ms;
    }
  }
  if (picked.length < 2) throw new Error("not enough frames for a clip");

  const decoded = [];
  for (const frame of picked) {
    const image = sharp(Buffer.from(frame.data, "base64"));
    const meta = await image.metadata();
    const width = Math.min(WIDTH, meta.width ?? WIDTH);
    const { data, info } = await image
      .resize({ width })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    decoded.push({ rgba: data, width: info.width, height: info.height, ms: frame.ms });
  }

  const width = decoded[0].width;
  const height = decoded[0].height;

  // One shared palette built from a sample of frames keeps the file small.
  const sampleStride = Math.max(1, Math.floor(decoded.length / 8));
  const sampled = decoded
    .filter((_, index) => index % sampleStride === 0)
    .map((frame) => frame.rgba);
  const sampleLength = sampled.reduce((total, rgba) => total + rgba.length, 0);
  const sample = new Uint8Array(sampleLength);
  let offset = 0;
  for (const rgba of sampled) {
    sample.set(rgba, offset);
    offset += rgba.length;
  }
  const palette = quantize(sample, 256);

  const gif = GIFEncoder();
  decoded.forEach((frame, index) => {
    const indexPixels = applyPalette(frame.rgba, palette);
    const delay = Math.max(
      2,
      Math.round(((decoded[index + 1]?.ms ?? frame.ms + MIN_STEP_MS) - frame.ms) / 10),
    );
    gif.writeFrame(indexPixels, width, height, {
      palette: index === 0 ? palette : undefined,
      delay,
    });
  });
  gif.finish();

  await fs.writeFile(dest, Buffer.from(gif.bytes()));
  const stats = await fs.stat(dest);
  console.log(
    `  gif ${path.relative(root, dest)} (${width}x${height}, ${decoded.length} frames, ${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const shots = args.has("--shots") || args.size === 0;
  const clip = args.has("--clip") || args.size === 0;

  const { server, port } = await serve(dist);
  const url = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  try {
    if (shots) await captureScreenshots(browser, url);
    if (clip) await captureClip(browser, url);
  } finally {
    await browser.close();
    server.close();
  }
  await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
