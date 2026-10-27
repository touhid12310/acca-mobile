// Frame-accurate renderer: loads videos/<id>/index.html?ar=..., calls window.seek(f/fps) per frame,
// captures via CDP and pipes JPEG frames into ffmpeg (H.264, yuv420p, faststart).
// usage: node tools/render.mjs [--jobs 3] [--from 0 --to 56] [--still t] id:ar [id:ar ...]
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = { jobs: 3, from: null, to: null, still: null, every: null, quality: 94 };
const jobs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--jobs') opt.jobs = +args[++i];
  else if (a === '--from') opt.from = +args[++i];
  else if (a === '--to') opt.to = +args[++i];
  else if (a === '--still') opt.still = args[++i].split(',').map(Number);
  else if (a === '--every') opt.every = +args[++i];
  else jobs.push(a);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'] });

async function renderJob(spec) {
  const [id, ar] = spec.split(':');
  const W = ar === '9x16' ? 1080 : 1920, H = ar === '9x16' ? 1920 : 1080;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${spec}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[${spec}] PAGEERROR: ${e.message}`));
  await page.goto(`http://127.0.0.1:${PORT}/videos/${id}/index.html?ar=${ar}${process.env.CUES ? '&cues=' + encodeURIComponent(process.env.CUES) : ''}`, { waitUntil: 'load' });   // CUES="voice:5.2,s3:11.4" retimes videos that read a cue table
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const meta = await page.evaluate(() => window.__meta());
  const outDir = path.join(ROOT, 'out', id); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `meta_${ar}.json`), JSON.stringify(meta, null, 1));
  const cdp = await ctx.newCDPSession(page);
  const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: opt.quality, optimizeForSpeed: true, captureBeyondViewport: false })).data, 'base64');

  if (opt.still || opt.every) {
    const times = opt.still || [];
    if (opt.every) for (let t = 0; t < meta.duration; t += opt.every) times.push(+t.toFixed(2));
    const sdir = path.join(outDir, `stills_${ar}`); fs.mkdirSync(sdir, { recursive: true });
    for (const t of times) {
      await page.evaluate((t) => window.seek(t), t);
      fs.writeFileSync(path.join(sdir, `t${String(t.toFixed(2)).padStart(6, '0')}.jpg`), await shot());
    }
    console.log(`[${spec}] stills: ${times.length}`);
    await ctx.close(); return;
  }

  const fps = meta.fps;
  const f0 = Math.round((opt.from ?? 0) * fps), f1 = Math.round((opt.to ?? meta.duration) * fps);
  const outFile = path.join(outDir, `video_${ar}${opt.from != null ? '_part' : ''}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps), '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate((t) => window.seek(t), f / fps);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`[${spec}] frame ${f}/${f1} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`[${spec}] done ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outFile}`);
  await ctx.close();
}

const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(opt.jobs, queue.length) }, async () => {
  while (queue.length) { const j = queue.shift(); try { await renderJob(j); } catch (e) { console.log(`[${j}] FAILED`, e); } }
}));
await browser.close();
server.close();
