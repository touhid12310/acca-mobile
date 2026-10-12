// Usage: node render.js <outDir> [--long] [--jpg] [--workers N] [--range a-b] [frames...]
//   no frames/range = every frame (226 for the 7.5 s cut, the full timeline with --long)
//   with --long, also writes <outDir>/../cues.json (sound cues) next to the frames
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const args = process.argv.slice(2);
  const out = path.resolve(args.find(a => !a.startsWith('--') && isNaN(+a) && !/^\d+-\d+$/.test(a)) || 'frames');
  const long = args.includes('--long');
  const jpg = args.includes('--jpg'), ext = jpg ? 'jpg' : 'png';
  const wi = args.indexOf('--workers'), workers = wi >= 0 ? +args[wi + 1] : 1;
  const ri = args.indexOf('--range');
  fs.mkdirSync(out, { recursive: true });
  const url = 'file://' + path.join(__dirname, 'index.html') + (long ? '?long' : '');
  const browser = await chromium.launch();
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    await page.goto(url);
    await page.evaluate(() => window.ready);
    return page;
  };
  const first = await open();
  const total = await first.evaluate(() => window.TOTAL_FRAMES);
  if (long) fs.writeFileSync(path.join(out, '..', 'cues.json'), JSON.stringify(await first.evaluate(() => window.SFX_CUES), null, 1));
  let frames = args.filter(a => /^\d+$/.test(a) && args[args.indexOf(a) - 1] !== '--workers').map(Number);
  if (ri >= 0) { const [a, b] = args[ri + 1].split('-').map(Number); frames = []; for (let f = a; f <= b; f++) frames.push(f); }
  if (!frames.length) frames = [...Array(total).keys()];
  const pages = [first]; for (let i = 1; i < workers; i++) pages.push(await open());
  let next = 0, done = 0;
  await Promise.all(pages.map(async page => {
    while (next < frames.length) {
      const f = frames[next++];
      await page.evaluate(f => window.seekFrame(f), f);
      await page.screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.${ext}`), ...(jpg ? { type: 'jpeg', quality: 95 } : {}) });
      if (++done % 100 === 0) console.log(`${done}/${frames.length}`);
    }
  }));
  await browser.close();
  console.log('total frames', total);
})();
