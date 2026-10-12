// Usage: node render.js <outDir> [frames...]   (no frames = all 0..225)
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const out = path.resolve(process.argv[2] || 'frames');
  require('fs').mkdirSync(out, { recursive: true });
  const frames = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [...Array(226).keys()];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.ready);
  for (const f of frames) {
    await page.evaluate(f => window.seekFrame(f), f);
    await page.screenshot({ path: path.join(out, `f${String(f).padStart(3, '0')}.png`) });
  }
  await browser.close();
})();
