/* AccountE long film: chapters after the 7.5 s reveal.
 * Loaded by index.html. Active only with ?long — the reveal (f0–224) plays as-is, then the chapters below.
 * Every style is a pure function of the frame (no timers, no Math.random). Relies on the reveal script's
 * globals: kf, kfMono, Ease, lerp, clamp, hash, rgb, hex, drawGrain, C_INDIGO, C_BLUE, C_MAROON, C_INK.
 */
const LONG = new URLSearchParams(location.search).has('long');

/* ======================= helpers ======================= */
const CC = (tag, cls, parent, css, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (css) e.style.cssText = css;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};
const PR = (lf, a, b, e = Ease.out5) => e(clamp((lf - a) / (b - a)));
const money = (v, d = 2) => (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const tf = (e, x = 0, y = 0, s = 1, r = 0) => { e.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`; };
const show = (e, on) => { // remembers the element's own inline display (flex etc.)
  if (e.dataset.d === undefined) e.dataset.d = e.style.display === 'none' ? '' : e.style.display;
  e.style.display = on ? e.dataset.d : 'none';
};

function wordsInto(el, text) {
  el.innerHTML = text.split('\n').map(line => '<div class="ln">' + line.split(' ').map(w => `<span class="wmk"><span class="wi">${w}</span></span>`).join(' ') + '</div>').join('');
  return [...el.querySelectorAll('.wi')];
}
function riseWords(words, lf, tIn, stagger = 2.5, dur = 18, tOut = null) {
  words.forEach((w, i) => {
    let y = 1 - PR(lf, tIn + i * stagger, tIn + i * stagger + dur);
    if (tOut != null) y -= PR(lf, tOut + i * 0.8, tOut + i * 0.8 + 12, Ease.in);
    w.style.transform = `translateY(${y * 112}%)`;
  });
}
function typeSpans(el, text) { el.innerHTML = ''; return [...text].map(ch => { const s = CC('span', null, el); s.textContent = ch; return s; }); }
function typeTimes(n, t0, perChar, seed) {
  const t = [t0];
  for (let i = 1; i < n; i++) t.push(t[i - 1] + perChar * (0.55 + 0.9 * hash(i, seed)));
  return t;
}
// typed characters arrive indigo, pass through blue and maroon, settle to ink
function typeSeek(spans, times, lf, settleTo = C_INK) {
  let last = -1;
  spans.forEach((s, i) => {
    const a = lf - times[i];
    if (a < 0) { s.style.visibility = 'hidden'; return; }
    last = i; s.style.visibility = 'visible';
    s.style.color = rgb(kf(a, [[0, C_INDIGO], [4, C_BLUE, Ease.lin], [8, C_MAROON, Ease.lin], [13, settleTo, Ease.lin]]));
  });
  return last;
}
function streamWords(el, text) { // AI answer: words appear one by one
  el.innerHTML = text.split(' ').map(w => `<span>${w}</span>`).join(' ');
  return [...el.children];
}
function streamSeek(words, lf, t0, perWord) {
  words.forEach((w, i) => {
    const a = lf - (t0 + i * perWord);
    w.style.visibility = a >= 0 ? 'visible' : 'hidden';
    w.style.opacity = clamp(a / 4);
  });
}

const CURSOR_PATH = 'M3 2 L3 20.2 L7.9 15.6 L11.3 22.6 L14.6 21.1 L11.3 14.3 L17.9 14.3 Z';
function makeCursor(parent) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', 24); s.setAttribute('height', 24); s.setAttribute('viewBox', '0 0 24 24');
  s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;transform-origin:0 0;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3))';
  s.innerHTML = `<path d="${CURSOR_PATH}" fill="#000" stroke="#fff" stroke-width="1.15" stroke-linejoin="round"/>`;
  parent.appendChild(s); return s;
}
function placeCursor(c, keys, lf, press = null) {
  if (lf < keys[0][0] || lf > keys[keys.length - 1][0]) { c.style.display = 'none'; return; }
  const [x, y, r] = kf(lf, keys);
  const s = press == null ? 1 : kf(lf, [[press, 1], [press + 2, .88, Ease.out], [press + 6, 1, Ease.inOut]]);
  c.style.display = 'block';
  c.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${5.4 * s}) translate(-3px,-2px)`;
}

const GEO = { 2: { w: 544, h: 1198, r: 56, b: 35 }, 11: { w: 577, h: 1177, r: 60, b: 0 }, 12: { w: 577, h: 1205, r: 60, b: 3 }, 18: { w: 547, h: 1199, r: 57, b: 26 }, 19: { w: 557, h: 1175, r: 58, b: 31 }, 22: { w: 562, h: 1216, r: 58, b: 39 }, 27: { w: 529, h: 1163, r: 55, b: 48 } };
function phoneEl(parent, id, h, x, y) { // device cut out along its traced bezel (rounded rect)
  const g = GEO[id], s = h / g.h, w = g.w * s;
  const wrap = CC('div', 'phone', parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`);
  const img = CC('img', null, wrap, `width:${w}px;height:${h}px;clip-path:inset(${8 * s}px ${9 * s}px ${g.b * s}px ${8 * s}px round ${g.r * s}px)`);
  img.src = `assets/phones/p${id}.png`;
  return wrap;
}
function browserEl(parent, src, w, x, y, aspect = 887 / 1774) {
  const h = w * aspect + 46;
  const b = CC('div', 'browser', parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`);
  CC('div', 'bbar', b, null, '<i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>app.accounte.com</span>');
  const im = CC('img', null, b, `width:${w}px;height:${w * aspect}px;display:block`); im.src = src;
  return b;
}
const ICON = {
  check: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#10b981"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spark: (c = '#2f63f0', s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2.5c.7 5 4.5 8.8 9.5 9.5-5 .7-8.8 4.5-9.5 9.5-.7-5-4.5-8.8-9.5-9.5 5-.7 8.8-4.5 9.5-9.5z" fill="${c}"/></svg>`,
  arrowUp: '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mic: '<svg width="24" height="24" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M6 11a6 6 0 0012 0M12 17v4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  pdf: '<svg width="34" height="40" viewBox="0 0 34 40"><path d="M3 1h20l10 10v28H3z" fill="#e5484d"/><path d="M23 1v10h10" fill="#ffb4b4"/><text x="18" y="31" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="InterL">PDF</text></svg>',
  bank: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/></svg>',
  card: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/></svg>',
  wallet: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H4z M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.3" fill="currentColor"/></svg>',
  target: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  pie: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3a9 9 0 109 9h-9z"/><path d="M15 3.5A9 9 0 0120.5 9H15z"/></svg>',
  pct: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
  cal: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="15.5" cy="15.5" r="2.6"/><path d="M15.5 14.3v1.3l.9.6"/></svg>',
  loan: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.4"/></svg>',
};

/* ======================= styles ======================= */
CC('style', null, document.head, null, `
#chap{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;display:none}
#cbg{position:absolute;inset:0;background:linear-gradient(180deg,#294376 0%,#4f6f9e 55%,#769cc2 100%)}
#cbgDrift{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:960px 540px}
#cglow{position:absolute;width:1000px;height:640px;border-radius:50%;
  background:linear-gradient(115deg,#7b5cff 8%,#c77dff 30%,#ffd96a 52%,#7fe3c4 72%,#2fc7c9 92%);filter:blur(90px);opacity:.5;mix-blend-mode:screen}
.chapRoot{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden}
.chapRoot *{box-sizing:border-box}
.eyebrow{position:absolute;font-size:18px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.78);display:flex;align-items:center;gap:14px;white-space:nowrap}
.eyebrow i{display:block;width:9px;height:9px;border-radius:50%;background:#7fe9ff}
.h1{position:absolute;font-size:76px;line-height:82px;font-weight:700;letter-spacing:-.03em;color:#fff}
.h1 .ln,.sub .ln{white-space:nowrap}
.wmk{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em}
.wi{display:inline-block}
.sub{position:absolute;font-size:24px;line-height:36px;color:rgba(255,255,255,.84)}
.sub .ln{white-space:normal}
.card{position:absolute;background:#fff;border-radius:18px;color:#121212;overflow:hidden;
  box-shadow:0 34px 90px rgba(12,22,52,.40),0 8px 22px rgba(0,0,0,.13)}
.phone{position:absolute;filter:drop-shadow(0 40px 50px rgba(8,18,40,.45));transform-origin:50% 100%}
.phone img{position:absolute;left:0;top:0}
.browser{position:absolute;background:#fff;border-radius:16px;overflow:hidden;transform-origin:50% 50%;
  box-shadow:0 50px 110px rgba(8,18,44,.45),0 10px 26px rgba(0,0,0,.14)}
.bbar{height:46px;display:flex;align-items:center;gap:9px;padding:0 18px;background:#f3f5f9;border-bottom:1px solid #e3e7ee}
.bbar i{width:13px;height:13px;border-radius:50%;display:block}
.bbar span{margin-left:22px;height:28px;padding:0 18px;border-radius:8px;background:#fff;border:1px solid #e3e7ee;font-size:15px;color:#6b7280;display:flex;align-items:center}
.lbl{font-size:15px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#8a93a3}
.val{font-size:25px;font-weight:500;color:#121212}
.chip{display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:999px;font-size:18px;font-weight:600}
.row{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:0 34px}
.hair{position:absolute;left:34px;right:34px;height:1px;background:#edf0f5}
.ptext{position:absolute;font-size:34.8px;line-height:44.4px;color:#121212;white-space:pre-wrap}
.sendb{position:absolute;width:64px;height:64px;border-radius:19px;background:#000;display:flex;align-items:center;justify-content:center}
.mlab{position:absolute;font-size:24px;font-weight:500;color:#8c8c8c;display:flex;align-items:center;gap:8px}
.mono{font-family:'DejaVu Sans Mono',monospace}
.pill{position:absolute;height:64px;padding:0 30px;border-radius:999px;display:flex;align-items:center;gap:12px;font-size:24px;font-weight:600;white-space:nowrap}
.hl{position:absolute;border:2.5px solid #22d3ee;border-radius:8px;background:rgba(34,211,238,.10)}
.stat{position:absolute;background:#fff;border-radius:18px;padding:26px 28px;box-shadow:0 26px 70px rgba(12,22,52,.35)}
.stat .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.bubble{position:absolute;right:30px;max-width:560px;padding:16px 22px;border-radius:18px 18px 4px 18px;color:#fff;font-size:22px;line-height:31px;
  background:linear-gradient(135deg,#4f7cff,#2453e6)}
.ai{position:absolute;left:30px;right:30px;display:flex;gap:16px}
.ai .av{flex:0 0 46px;height:46px;border-radius:12px;background:#eef3ff;display:flex;align-items:center;justify-content:center}
.ai .body{flex:1;background:#fff;border:1px solid #e6eaf2;border-radius:16px;padding:20px 24px;font-size:21px;line-height:32px;color:#1f2937}
.mq{position:absolute;left:0;display:flex;gap:22px;white-space:nowrap}
.mq span{display:inline-flex;align-items:center;height:72px;padding:0 34px;border-radius:999px;border:1.5px solid rgba(255,255,255,.45);color:#fff;font-size:28px;font-weight:500;background:rgba(255,255,255,.07)}
#cband{position:absolute;left:0;width:1920px;height:120px;pointer-events:none;display:none;
  background:linear-gradient(180deg,rgba(94,231,255,0) 0%,rgba(94,231,255,.35) 70%,rgba(235,255,255,.95) 97%,rgba(94,231,255,0) 100%)}
`);

/* ======================= stage wiring ======================= */
const CHAP = CC('div', null, null); CHAP.id = 'chap';
$('stage').insertBefore(CHAP, $('grain'));
const CBG = CC('div', null, CHAP); CBG.id = 'cbg';
const CBGD = CC('div', null, CBG); CBGD.id = 'cbgDrift';
const CGLOW = CC('div', null, CBGD); CGLOW.id = 'cglow';
(function chapLines() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', 1920); s.setAttribute('height', 1080); s.style.position = 'absolute';
  const sp = (x, y, r) => `<path d="M${x} ${y - r}C${x + r * .12} ${y - r * .12} ${x + r * .12} ${y - r * .12} ${x + r} ${y}C${x + r * .12} ${y + r * .12} ${x + r * .12} ${y + r * .12} ${x} ${y + r}C${x - r * .12} ${y + r * .12} ${x - r * .12} ${y + r * .12} ${x - r} ${y}C${x - r * .12} ${y - r * .12} ${x - r * .12} ${y - r * .12} ${x} ${y - r}Z" fill="#fff"/>`;
  s.innerHTML = `<g fill="none" stroke="rgba(255,255,255,.32)" stroke-width="1.5">
    <circle cx="1560" cy="300" r="380"/><circle cx="260" cy="860" r="520"/>
    <line x1="-100" y1="210" x2="2020" y2="210"/><line x1="-100" y1="950" x2="2020" y2="950"/>
    <line x1="90" y1="-100" x2="90" y2="1180"/><line x1="1830" y1="-100" x2="1830" y2="1180"/>
    <line x1="-100" y1="1060" x2="2020" y2="40"/><line x1="-100" y1="30" x2="2020" y2="1090"/></g>
    ${sp(90, 210, 18)}${sp(1830, 210, 22)}${sp(90, 950, 20)}${sp(1830, 950, 16)}`;
  CBGD.appendChild(s);
})();
const CBAND = CC('div', null, CHAP); CBAND.id = 'cband';

const CHAPS = [];
const REVEAL_END = 225;
function chapter(len, setup) {
  const root = CC('div', 'chapRoot', CHAP);
  const c = { len, root, cues: [], seek: () => {} };
  c.cue = (lf, type, o = {}) => c.cues.push({ lf, type, ...o });
  setup(c, root);
  CHAPS.push(c);
  return c;
}
// shared left-column title block
function textBlock(root, x, y, eyebrow, h1, sub, subW = 620) {
  const eb = CC('div', 'eyebrow', root, `left:${x}px;top:${y}px`, `<i></i>${eyebrow}`);
  const h = CC('div', 'h1', root, `left:${x - 4}px;top:${y + 44}px`);
  const words = wordsInto(h, h1);
  const lines = h1.split('\n').length;
  const sb = CC('div', 'sub', root, `left:${x}px;top:${y + 44 + lines * 82 + 28}px;width:${subW}px`);
  sb.innerHTML = sub.split(' ').map(w => `<span class="wmk"><span class="wi">${w}</span></span>`).join(' ');
  const subWords = [...sb.querySelectorAll('.wi')];
  return {
    seek(lf, tIn = 6, tOut = null) {
      const p = PR(lf, tIn, tIn + 16) - (tOut != null ? PR(lf, tOut, tOut + 12, Ease.in) : 0);
      eb.style.opacity = clamp(p); eb.style.transform = `translateX(${(1 - clamp(p)) * -24}px)`;
      riseWords(words, lf, tIn + 4, 3, 20, tOut);
      riseWords(subWords, lf, tIn + 22, 0.55, 16, tOut != null ? tOut + 2 : null);
    }
  };
}
// a white prompt box with typing + send press (reused in chapter 1)
function promptBox(root, x, y, w, h, text, t0, perChar, seed) {
  const box = CC('div', 'card', root, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`);
  const inner = CC('div', null, box, 'position:absolute;inset:0');
  const pt = CC('div', 'ptext', inner, `left:30px;top:24px;width:${w - 60}px`);
  const spans = typeSpans(pt, text);
  const times = typeTimes(spans.length, t0, perChar, seed);
  const caret = CC('div', null, inner, 'position:absolute;width:3px;height:40px;background:#121212;border-radius:1px');
  const lab = CC('div', 'mlab', inner, `right:${16 + 64 + 18}px;bottom:${16 + 14}px`, 'AccountE <svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 7.5l5 5 5-5" fill="none" stroke="#8c8c8c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  const send = CC('div', 'sendb', inner, 'right:16px;bottom:16px', ICON.arrowUp);
  return {
    box, inner, spans, times, send, end: times[times.length - 1],
    seek(lf, press) {
      const last = typeSeek(spans, times, lf);
      const typing = lf >= t0 && lf <= times[times.length - 1] + 1;
      const on = last >= 0 && lf < press + 4 && (typing || Math.floor(lf / 8) % 2 === 0);
      caret.style.display = on ? 'block' : 'none';
      if (on) { const s = spans[last]; caret.style.left = (30 + s.offsetLeft + s.offsetWidth + 1) + 'px'; caret.style.top = (24 + s.offsetTop + 2) + 'px'; }
      const bs = kf(lf, [[press, 1], [press + 3, 1.12, Ease.out], [press + 7, 1, Ease.inOut]]);
      const fl = kf(lf, [[press, 0], [press + 1, 1, Ease.lin], [press + 5, 1], [press + 8, 0]]);
      send.style.transform = `scale(${bs})`;
      send.style.background = rgb(lerp([0, 0, 0], hex('#D97757'), fl));
    }
  };
}
function detailRows(card, rows, top, gap) { // [label, valueHTML]
  return rows.map(([l, v], i) => {
    const r = CC('div', 'row', card, `top:${top + i * gap}px;height:${gap}px`, `<span class="lbl">${l}</span><span class="val">${v}</span>`);
    if (i > 0) CC('div', 'hair', card, `top:${top + i * gap}px`);
    return r;
  });
}
function rowsIn(rows, lf, t0, stagger = 4) {
  rows.forEach((r, i) => { const p = PR(lf, t0 + i * stagger, t0 + i * stagger + 16); r.style.opacity = p; r.style.transform = `translateY(${(1 - p) * 26}px)`; });
}

/* ======================= C1 · intro ======================= */
chapter(240, (c, R) => {
  const l1 = CC('div', 'h1', R, 'left:0;top:360px;width:1920px;text-align:center;font-size:104px;line-height:112px');
  const w1 = wordsInto(l1, 'Built by an accountant.');
  const l2 = CC('div', 'h1', R, 'left:0;top:478px;width:1920px;text-align:center;font-size:104px;line-height:112px');
  const w2 = wordsInto(l2, 'Powered by AI.');
  w2[2].style.color = '#9fe8ff';
  const icon = CC('img', null, R, 'position:absolute;left:845px;top:330px;width:230px;height:230px;border-radius:52px;box-shadow:0 40px 90px rgba(5,15,60,.5)');
  icon.src = 'assets/icons/app-icon.png';
  const ring = CC('div', null, R, 'position:absolute;border:2.5px solid rgba(160,238,255,.95);border-radius:50%');
  const logo = CC('img', null, R, 'position:absolute;left:0;top:600px;height:66px;filter:brightness(0) invert(1)');
  logo.src = 'assets/logo.png';
  const tag = CC('div', 'sub', R, 'left:0;top:700px;width:1920px;text-align:center;font-size:30px');
  const tw = wordsInto(tag, 'Your money hub in one place');
  c.cue(0, 'whoosh', { dur: .6, f0: 400, f1: 6000, gain: .5 });
  [6, 9, 12, 15, 34, 37, 40].forEach(t => c.cue(t, 'tick', { gain: .35 }));
  c.cue(98, 'shimmerTo', { from: 70 }); c.cue(100, 'boom', { gain: .55 }); c.cue(128, 'pop');
  c.seek = lf => {
    riseWords(w1, lf, 6, 3, 18, 90); riseWords(w2, lf, 34, 3, 18, 92);
    const ip = PR(lf, 100, 124, Ease.back(1.8)), z = kf(lf, [[124, 1], [239, 1.04, Ease.sine]]);
    show(icon, lf >= 100); icon.style.opacity = PR(lf, 100, 104, Ease.lin);
    icon.style.transform = `scale(${lerp(.2, 1, ip) * z})`;
    const rp = PR(lf, 104, 152, Ease.out);
    show(ring, lf >= 104 && lf < 152);
    const rs = lerp(240, 760, rp);
    Object.assign(ring.style, { left: `${960 - rs / 2}px`, top: `${445 - rs / 2}px`, width: `${rs}px`, height: `${rs}px`, opacity: 1 - rp });
    const lp = PR(lf, 128, 152);
    logo.style.opacity = lp; logo.style.left = (960 - logo.naturalWidth * 66 / logo.naturalHeight / 2) + 'px';
    logo.style.transform = `translateY(${(1 - lp) * 30}px)`;
    riseWords(tw, lf, 146, 2, 18);
  };
});

/* ======================= C2 · chat to record ======================= */
chapter(600, (c, R) => {
  const tb = textBlock(R, 120, 300, '01 — Chat to record', 'Type it.\nIt’s recorded.', 'Type any transaction in plain words. AccountE detects the amount, category, date and vendor—instantly.');
  const pb = promptBox(R, 1010, 400, 800, 186, 'Grabbed lunch at Chipotle for $15.75, paid by credit card', 26, 1.25, 41);
  const PRESS = 124;
  // transaction result, revealed by the band inside the same card
  const tx = CC('div', null, pb.box, 'position:absolute;inset:0;background:#fff');
  const head = CC('div', 'row', tx, 'top:26px;height:40px;justify-content:flex-start;gap:12px;font-size:21px;font-weight:600;color:#10b981', ICON.check + 'Saved to transactions');
  const title = CC('div', 'row', tx, 'top:82px;height:60px', '<span style="font-size:40px;font-weight:700;letter-spacing:-.02em">Chipotle</span><span style="font-size:40px;font-weight:700;color:#e5484d">−$15.75</span>');
  const rows = detailRows(tx, [
    ['Category', '<span class="chip" style="background:#fff4e5;color:#c2410c">Food &amp; Dining</span>'],
    ['Payment', 'Credit card'], ['Date', 'Today'],
    ['Type', '<span class="chip" style="background:#fdecec;color:#e5484d">Expense</span>']], 160, 62);
  const note = CC('div', 'row', tx, 'top:418px;height:36px;justify-content:flex-start;gap:10px;font-size:18px;color:#6b7280', ICON.spark('#2f63f0', 20) + 'AI detected amount, vendor, category &amp; payment method');
  const band = CC('div', null, pb.box, 'position:absolute;left:0;right:0;height:90px;background:linear-gradient(180deg,rgba(94,231,255,0),rgba(94,231,255,.55) 80%,#eaffff 97%,rgba(94,231,255,0))');
  const cur = makeCursor(R);
  // beat 2
  const br = browserEl(R, 'assets/ui/chat-to-record.jpg', 1180, 110, 230);
  const ph = phoneEl(R, 27, 880, 1370, 150);
  const cap = CC('div', 'eyebrow', R, 'left:112px;top:930px', '<i></i>Web · iOS · Android — one ledger everywhere');
  pb.spans.forEach((s, i) => { if (i % 3 === 0) c.cue(pb.times[i], 'tick', { gain: .3 }); });
  c.cue(98, 'swish'); c.cue(PRESS + 1, 'click'); c.cue(134, 'whoosh', { dur: .5, f0: 500, f1: 5000, gain: .35 });
  [0, 1, 2, 3, 4].forEach(i => c.cue(166 + i * 5, 'pop', { gain: .22, pitch: 1 + i * .08 }));
  c.cue(286, 'whoosh', { dur: .7, f0: 250, f1: 4000, gain: .5 }); c.cue(310, 'pop', { gain: .3 });
  c.seek = lf => {
    tb.seek(lf, 4, 272);
    // prompt box enters, types, gets pressed, grows into the saved transaction
    const ein = PR(lf, 0, 26);
    const g = PR(lf, 132, 162, Ease.inOut);
    const bx = 1010, by = lerp(400, 300, g), bh = lerp(186, 480, g);
    const out = PR(lf, 272, 296, Ease.in);
    pb.box.style.top = by + 'px'; pb.box.style.height = bh + 'px';
    pb.box.style.opacity = ein;
    pb.box.style.transform = `translate(${out * 1000}px,${(1 - ein) * 60}px) scale(${lerp(.96, 1, ein)}) rotate(${out * 6}deg)`;
    pb.seek(lf, PRESS);
    const b = PR(lf, 134, 160, Ease.sine) * 112 - 6;
    show(band, lf >= 134 && lf <= 162); band.style.top = `calc(${b}% - 80px)`;
    pb.inner.style.clipPath = lf >= 134 ? `inset(${clamp(b, 0, 100)}% 0 0 0)` : 'none';
    show(tx, lf >= 134); tx.style.clipPath = `inset(0 0 ${100 - clamp(b, 0, 100)}% 0)`;
    rowsIn([head, title, ...rows, note], lf, 160, 5);
    placeCursor(cur, [[96, [1990, 900, 26]], [112, [1745, 560, 4], Ease.out], [PRESS, [1752, 556, 0], Ease.inOut], [150, [2050, 760, 20], Ease.in]], lf, PRESS);
    // beat 2: the same flow on web and phone
    const bp = PR(lf, 292, 344);
    show(br, lf >= 288); show(ph, lf >= 300); show(cap, lf >= 340);
    br.style.transform = `perspective(2200px) translateX(${(1 - bp) * -900}px) rotateY(${lerp(22, 9, bp) - PR(lf, 344, 600, Ease.sine) * 4}deg)`;
    const pp = PR(lf, 306, 350);
    ph.style.transform = `translateY(${(1 - pp) * 700 + Math.sin(lf / 30) * 6}px) rotate(${lerp(8, 3, pp)}deg)`;
    const cp = PR(lf, 344, 364); cap.style.opacity = cp; cap.style.transform = `translateY(${(1 - cp) * 16}px)`;
  };
});

/* ======================= C3 · receipt scan ======================= */
chapter(540, (c, R) => {
  const tb = textBlock(R, 120, 300, '02 — Receipt scan AI', 'Snap it.\nWe read it.', 'Vendor, date, total and tax pulled from any receipt—and the photo stays with the record.', 560);
  const RX = 820, RY = 150, RW = 420, RH = 770, ROT = -3;
  const rc = CC('div', null, R, `position:absolute;left:${RX}px;top:${RY}px;width:${RW}px;height:${RH}px;filter:drop-shadow(0 40px 50px rgba(8,18,40,.4));transform-origin:50% 50%`);
  const zig = []; for (let i = 0; i <= 20; i++) zig.push(`${i * 5}% ${i % 2 ? 100 : 97.6}%`);
  const paper = CC('div', 'mono', rc, `position:absolute;inset:0;background:#fbfaf6;color:#1d1d1d;padding:46px 40px;font-size:21px;line-height:34px;clip-path:polygon(0 0,100% 0,${zig.reverse().join(',')})`);
  const L = (t, css = '') => CC('div', null, paper, css, t);
  const fVendor = L('URBAN COFFEE', 'font-size:30px;font-weight:700;text-align:center;letter-spacing:.06em;margin-bottom:6px');
  L('123 Market St<br>San Francisco, CA 94105<br>(415) 555-0199', 'text-align:center;font-size:18px;line-height:27px;color:#555;margin-bottom:18px');
  const fDate = L('May 14, 2025 &nbsp; 10:18 AM', 'display:flex;justify-content:space-between');
  L('Receipt # 20491', 'margin-bottom:16px;color:#555');
  L('------------------------------', 'color:#999');
  L('<span>Cappuccino</span><span>3.75</span>', 'display:flex;justify-content:space-between');
  L('<span>Bagel</span><span>2.50</span>', 'display:flex;justify-content:space-between');
  L('------------------------------', 'color:#999');
  const fTax = L('<span>Tax</span><span>0.56</span>', 'display:flex;justify-content:space-between');
  const fTotal = L('<span>TOTAL</span><span>$6.81</span>', 'display:flex;justify-content:space-between;font-size:27px;font-weight:700;margin-top:6px');
  L('VISA •••• 4417', 'color:#555;margin-top:12px');
  L('Thank you!<br>Visit us again.', 'text-align:center;margin-top:30px;color:#555');
  const scan = CC('div', null, rc, 'position:absolute;left:-14px;right:-14px;height:130px;background:linear-gradient(180deg,rgba(94,231,255,0),rgba(94,231,255,.32) 78%,#eaffff 97%,rgba(94,231,255,0))');
  const hls = [fVendor, fDate, fTax, fTotal].map(() => CC('div', 'hl', rc));
  const corners = [0, 1, 2, 3].map(i => CC('div', null, R, `position:absolute;width:64px;height:64px;border:4px solid #fff;${i % 2 ? 'border-left:0' : 'border-right:0'};${i > 1 ? 'border-top:0' : 'border-bottom:0'};border-radius:${['14px 0 0 0', '0 14px 0 0', '0 0 0 14px', '0 0 14px 0'][i]}`));
  // extracted details card
  const card = CC('div', 'card', R, 'left:1330px;top:200px;width:480px;height:660px');
  CC('div', 'row', card, 'top:28px;height:44px;justify-content:flex-start;gap:12px;font-size:26px;font-weight:700', ICON.spark('#2f63f0', 24) + 'Extracted details');
  const FIELDS = [['Vendor', 'Urban Coffee', 0], ['Date', 'May 14, 2025', 1], ['Total', '$6.81', 3], ['Tax', '$0.56', 2], ['Category', 'Meals &amp; Drinks', -1], ['Payment', 'Business card', -1]];
  const vals = FIELDS.map(([l], i) => {
    const r = CC('div', 'row', card, `top:${96 + i * 76}px;height:76px`, `<span class="lbl">${l}</span><span class="val"></span>`);
    CC('div', 'hair', card, `top:${96 + i * 76}px`);
    return r.lastChild;
  });
  const save = CC('div', 'pill', card, 'left:34px;right:34px;top:574px;justify-content:center;background:#2f63f0;color:#fff;border-radius:14px');
  const cur = makeCursor(R);
  const SCAN0 = 56, SCAN1 = 120, FIELD_SP = [.072, .25, .52, .57]; // band progress at which it crosses vendor/date/tax/total
  const fieldT = FIELD_SP.map(sp => SCAN0 + (SCAN1 - SCAN0) * Math.acos(1 - 2 * sp) / Math.PI);
  const fieldOrderT = [fieldT[0], fieldT[1], fieldT[3], fieldT[2], 150, 164];
  const PRESS = 236;
  // beat 2
  const br = browserEl(R, 'assets/ui/receipt-scan-ai.jpg', 1240, 120, 220);
  const hand = CC('img', null, R, 'position:absolute;left:1260px;top:340px;width:760px;filter:drop-shadow(0 40px 60px rgba(8,18,40,.45))'); hand.src = 'assets/hand-phone.png';
  const cap = CC('div', 'eyebrow', R, 'left:122px;top:930px', '<i></i>Stores receipts with records · reduces missing expenses');
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 }); c.cue(SCAN0, 'scan', { dur: (SCAN1 - SCAN0) / 30 });
  fieldOrderT.forEach((t, i) => c.cue(t + 6, 'pop', { gain: .2, pitch: 1 + i * .07 }));
  c.cue(214, 'swish'); c.cue(PRESS + 1, 'click'); c.cue(PRESS + 8, 'pop', { gain: .3, pitch: 1.4 });
  c.cue(300, 'whoosh', { dur: .7, f0: 250, f1: 4200, gain: .5 });
  c.seek = lf => {
    tb.seek(lf, 4, 290);
    const ein = PR(lf, 0, 34), out = PR(lf, 290, 312, Ease.in);
    rc.style.transform = `translate(${-out * 1300}px,${(1 - ein) * 760}px) rotate(${lerp(-12, ROT, ein)}deg)`;
    const vf = PR(lf, 30, 46), sc = lerp(1.18, 1, vf);
    const box = [RX - 34, RY - 34, RX + RW + 34, RY + RH + 34], cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    corners.forEach((k, i) => {
      const x = cx + ((i % 2 ? box[2] - 64 : box[0]) - cx) * sc, y = cy + ((i > 1 ? box[3] - 64 : box[1]) - cy) * sc;
      show(k, lf >= 30 && lf < 290); k.style.left = x + 'px'; k.style.top = y + 'px'; k.style.opacity = vf * (1 - PR(lf, 200, 230, Ease.lin));
    });
    const sp = PR(lf, SCAN0, SCAN1, Ease.sine);
    show(scan, lf >= SCAN0 && lf <= SCAN1 + 4); scan.style.top = (sp * (RH + 40) - 120) + 'px';
    [fVendor, fDate, fTax, fTotal].forEach((f, i) => {
      const h = hls[i], a = PR(lf, fieldT[i], fieldT[i] + 8);
      show(h, lf >= fieldT[i] && lf < 280);
      h.style.left = (f.offsetLeft - 10) + 'px'; h.style.top = (f.offsetTop - 6) + 'px';
      h.style.width = (f.offsetWidth + 20) + 'px'; h.style.height = (f.offsetHeight + 12) + 'px';
      h.style.opacity = a * (1 - PR(lf, 220, 250, Ease.lin)); h.style.transform = `scale(${lerp(1.15, 1, a)})`;
    });
    const cin = PR(lf, 40, 70);
    card.style.opacity = cin; card.style.transform = `translate(${(1 - cin) * 80 + out * 900}px,0)`;
    vals.forEach((v, i) => {
      const txt = FIELDS[i][1].replace('&amp;', '&'), k = Math.round(txt.length * PR(lf, fieldOrderT[i] + 4, fieldOrderT[i] + 16, Ease.lin));
      v.textContent = txt.slice(0, k);
      v.style.color = lf - fieldOrderT[i] < 20 ? '#2f63f0' : '#121212';
    });
    const saved = lf >= PRESS + 5;
    save.innerHTML = saved ? ICON.check.replace('#10b981', '#ffffff').replace('stroke="#fff"', 'stroke="#10b981"') + 'Saved' : 'Save expense';
    save.style.background = saved ? '#10b981' : '#2f63f0';
    save.style.transform = `scale(${kf(lf, [[PRESS, 1], [PRESS + 3, .95, Ease.out], [PRESS + 9, 1, Ease.back(2)]])})`;
    placeCursor(cur, [[212, [2000, 1000, 24]], [230, [1590, 900, 4], Ease.out], [PRESS, [1585, 905, 0], Ease.inOut], [262, [2060, 1100, 18], Ease.in]], lf, PRESS);
    const bp = PR(lf, 300, 350);
    show(br, lf >= 296); show(hand, lf >= 310); show(cap, lf >= 350);
    br.style.transform = `perspective(2400px) translateY(${(1 - bp) * 900}px) rotateX(${lerp(26, 8, bp) - PR(lf, 350, 540, Ease.sine) * 4}deg) scale(${1 + PR(lf, 350, 540, Ease.sine) * .03})`;
    const hp = PR(lf, 316, 360);
    hand.style.transform = `translate(${(1 - hp) * 500}px,${(1 - hp) * 300 + Math.sin(lf / 28) * 6}px)`;
    const cp = PR(lf, 350, 370); cap.style.opacity = cp;
  };
});

/* ======================= C4 · email to record ======================= */
chapter(420, (c, R) => {
  const tb = textBlock(R, 120, 300, '03 — Email to record', 'Forward it.\nIt’s filed.', 'Forward bills and receipts to your AccountE inbox. AI reads the amount and vendor and records it for you.', 560);
  const mail = CC('div', 'card', R, 'left:900px;top:250px;width:600px;height:400px;transform-origin:50% 50%');
  mail.innerHTML = `<div style="position:absolute;left:34px;top:30px;font-size:30px;font-weight:700">Fwd: Uber receipt</div>
    <div style="position:absolute;left:34px;top:88px;display:flex;align-items:center;gap:14px">
      <div style="width:46px;height:46px;border-radius:50%;background:#111;color:#fff;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center">U</div>
      <div><div style="font-size:20px;font-weight:600">Uber Receipts</div><div style="font-size:16px;color:#8a93a3">to me · 9:41 AM</div></div></div>
    <div style="position:absolute;left:34px;right:34px;top:160px;font-size:20px;line-height:30px;color:#374151">Hi team,<br>Please see the attached Uber receipt from my trip to the client meeting.<br>Thanks!</div>
    <div style="position:absolute;left:34px;top:300px;height:66px;width:300px;border:1px solid #e6eaf2;border-radius:12px;display:flex;align-items:center;gap:14px;padding:0 16px">${ICON.pdf}<div><div style="font-size:18px;font-weight:600">Uber receipt.pdf</div><div style="font-size:15px;color:#8a93a3">128 KB</div></div></div>
    <div class="chip" style="position:absolute;right:30px;top:30px;background:#eef3ff;color:#2f63f0">Forward →</div>`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  path.setAttribute('width', 1920); path.setAttribute('height', 1080); path.style.cssText = 'position:absolute;left:0;top:0';
  path.innerHTML = '<path id="mailArc" d="M1200 450 Q1520 260 1680 770" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>';
  R.appendChild(path);
  const arc = path.firstChild;
  const icon = CC('img', null, R, 'position:absolute;left:1610px;top:700px;width:140px;height:140px;border-radius:32px;box-shadow:0 30px 70px rgba(5,15,60,.5)');
  icon.src = 'assets/icons/app-icon.png';
  const ring = CC('div', null, R, 'position:absolute;border:2.5px solid rgba(160,238,255,.95);border-radius:50%');
  const card = CC('div', 'card', R, 'left:960px;top:170px;width:620px;height:560px;transform-origin:95% 100%');
  const head = CC('div', 'row', card, 'top:28px;height:48px;justify-content:flex-start;gap:12px;font-size:28px;font-weight:700', ICON.check + 'Transaction created');
  const rows = detailRows(card, [['Vendor', 'Uber'], ['Date', 'May 14, 2025'], ['Amount', '<b style="font-weight:700">$28.40</b>'],
    ['Category', '<span class="chip" style="background:#eef3ff;color:#2f63f0">Transport</span>'], ['Payment', 'Business card']], 100, 74);
  const savePill = CC('div', 'pill', card, 'left:34px;right:34px;top:476px;height:58px;justify-content:center;background:#2f63f0;color:#fff;border-radius:14px', 'Recorded from your inbox');
  const br = browserEl(R, 'assets/ui/email-to-record.jpg', 1060, 780, 250);
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 }); c.cue(44, 'pop', { gain: .25 });
  c.cue(78, 'whoosh', { dur: .9, f0: 600, f1: 7000, gain: .45 }); c.cue(112, 'pop', { gain: .45, pitch: .8 }); c.cue(112, 'boom', { gain: .25 });
  [0, 1, 2, 3, 4, 5].forEach(i => c.cue(150 + i * 5, 'pop', { gain: .2, pitch: 1 + i * .07 }));
  c.cue(262, 'whoosh', { dur: .7, f0: 250, f1: 4200, gain: .45 });
  c.seek = lf => {
    tb.seek(lf, 4);
    const mi = PR(lf, 6, 34), fly = PR(lf, 80, 112, Ease.inOut);
    const P0 = [1200, 450], P1 = [1520, 260], P2 = [1680, 770];
    const q = (a, b, cc, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * cc;
    const mx = q(P0[0], P1[0], P2[0], fly) - 1200, my = q(P0[1], P1[1], P2[1], fly) - 450;
    show(mail, lf < 113);
    mail.style.opacity = mi;
    mail.style.transform = `translate(${mx}px,${my + (1 - mi) * 60}px) scale(${lerp(1, .12, fly)}) rotate(${fly * 24}deg)`;
    const len = 1200, ap = PR(lf, 66, 96, Ease.inOut) - PR(lf, 112, 130, Ease.lin);
    show(path, lf >= 66 && lf < 130); arc.style.strokeDasharray = '2 12'; arc.style.opacity = clamp(ap);
    arc.setAttribute('stroke-dashoffset', (1 - PR(lf, 66, 96, Ease.inOut)) * -len);
    const ii = PR(lf, 50, 66, Ease.back(2)), pulse = kf(lf, [[112, 1], [116, 1.14, Ease.out], [126, 1, Ease.inOut]]);
    const iout = PR(lf, 248, 268, Ease.in);
    icon.style.opacity = PR(lf, 50, 54, Ease.lin);
    icon.style.transform = `translateY(${iout * 500}px) scale(${lerp(.3, 1, ii) * pulse})`;
    const rp = PR(lf, 112, 150, Ease.out);
    show(ring, lf >= 112 && lf < 150);
    const rs = lerp(150, 520, rp);
    Object.assign(ring.style, { left: `${1680 - rs / 2}px`, top: `${770 - rs / 2}px`, width: `${rs}px`, height: `${rs}px`, opacity: 1 - rp });
    const cg = PR(lf, 126, 156);
    show(card, lf >= 126);
    card.style.opacity = PR(lf, 126, 132, Ease.lin);
    card.style.transform = `translateY(${iout * 1300}px) scale(${lerp(.12, 1, cg)})`;
    rowsIn([head, ...rows, savePill], lf, 140, 5);
    const bp = PR(lf, 262, 312);
    show(br, lf >= 258);
    br.style.transform = `perspective(2200px) translateX(${(1 - bp) * 1100}px) rotateY(${lerp(-26, -9, bp) + PR(lf, 312, 420, Ease.sine) * 3}deg)`;
  };
});

/* ======================= C5 · ask your books ======================= */
chapter(720, (c, R) => {
  const tb = textBlock(R, 120, 300, '04 — Ask your books', 'Ask anything.\nGet answers.', 'Plain-English questions, answered from your real data—with the sources to prove it.', 560);
  const P = CC('div', 'card', R, 'left:900px;top:110px;width:900px;height:860px;background:#f7f9fd');
  P.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;height:86px;background:#fff;border-bottom:1px solid #e6eaf2;display:flex;align-items:center;gap:16px;padding:0 28px">
      <div style="width:50px;height:50px;border-radius:14px;background:#eef3ff;display:flex;align-items:center;justify-content:center">${ICON.spark('#2f63f0', 26)}</div>
      <div style="font-size:26px;font-weight:700">Account<span style="color:#2f63f0">E</span> Assistant</div>
      <div class="chip" style="margin-left:auto;background:#f3f5f9;color:#6b7280;font-weight:500">Today</div></div>`;
  const list = CC('div', null, P, 'position:absolute;left:0;right:0;top:86px;bottom:150px;overflow:hidden');
  const scroll = CC('div', null, list, 'position:absolute;left:0;right:0;top:0;height:2000px');
  const input = CC('div', null, P, 'position:absolute;left:24px;right:24px;bottom:66px;height:66px;background:#fff;border:1px solid #e3e7ee;border-radius:16px');
  const itext = CC('div', null, input, 'position:absolute;left:22px;top:17px;font-size:22px;color:#121212;white-space:nowrap');
  const iph = CC('div', null, input, 'position:absolute;left:22px;top:18px;font-size:21px;color:#9aa3b2', 'Type a message or describe the document you uploaded…');
  const isend = CC('div', null, input, 'position:absolute;right:10px;top:9px;width:48px;height:48px;border-radius:12px;background:#2f63f0;display:flex;align-items:center;justify-content:center', ICON.mic);
  CC('div', null, P, 'position:absolute;left:24px;bottom:16px;display:flex;gap:12px', '<span class="chip" style="height:38px;background:#10b981;color:#fff">$ Income</span><span class="chip" style="height:38px;background:#e5484d;color:#fff">↘ Expense</span><span class="chip" style="height:38px;background:#2f63f0;color:#fff">▤ Report</span>');
  const Q1 = 'Which subscription costs me the most this year?', Q2 = 'How is my Utilities spend vs budget?';
  const q1 = CC('div', 'bubble', scroll, 'top:28px'); q1.textContent = Q1;
  const a1 = CC('div', 'ai', scroll, 'top:150px', `<div class="av">${ICON.spark('#2f63f0', 22)}</div><div class="body"></div>`);
  const a1t = CC('div', null, a1.lastChild);
  const A1 = 'Hulu is your most expensive subscription this year — 1,493.82 USD across 18 transactions, 34.3% of your subscription spend. Adobe is second at 769.86 USD, followed by LinkedIn at 479.88 USD.';
  const a1w = streamWords(a1t, A1);
  const tbl = CC('div', null, a1.lastChild, 'margin-top:16px;border:1px solid #e6eaf2;border-radius:12px;padding:16px 18px;background:#fbfcfe');
  CC('div', null, tbl, 'font-size:17px;font-weight:600;color:#374151;margin-bottom:10px', 'Top merchants · 2026-01-01 to 2026-12-31');
  const BARS = [['Hulu', 1493.82, '#2f63f0'], ['Adobe', 769.86, '#7c9cf5'], ['LinkedIn', 479.88, '#b3c5fa']].map(([n, v, col]) => {
    const r = CC('div', null, tbl, 'display:flex;align-items:center;gap:14px;height:34px;font-size:17px');
    CC('div', null, r, 'width:90px;color:#374151', n);
    const tr = CC('div', null, r, 'flex:1;height:14px;border-radius:7px;background:#eef1f6;position:relative;overflow:hidden');
    const bar = CC('div', null, tr, `position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:${col}`);
    const num = CC('div', null, r, 'width:96px;text-align:right;font-weight:600;color:#121212');
    return { bar, num, v };
  });
  const src1 = CC('div', null, a1.lastChild, 'margin-top:12px;font-size:15px;color:#8a93a3', 'Source: your totals by merchant · Jan 1 – Dec 31, 2026 · 14 records');
  const dots = CC('div', 'ai', scroll, 'top:150px', `<div class="av">${ICON.spark('#2f63f0', 22)}</div><div style="background:#fff;border:1px solid #e6eaf2;border-radius:16px;padding:18px 22px;display:flex;gap:8px"><i></i><i></i><i></i></div>`);
  const dotEls = [...dots.querySelectorAll('i')]; dotEls.forEach(d => d.style.cssText = 'display:block;width:11px;height:11px;border-radius:50%;background:#9aa3b2');
  const q2 = CC('div', 'bubble', scroll); q2.textContent = Q2;
  const a2 = CC('div', 'ai', scroll, null, `<div class="av">${ICON.spark('#2f63f0', 22)}</div><div class="body"></div>`);
  const a2t = CC('div', null, a2.lastChild);
  const a2w = streamWords(a2t, 'You’re on track for September: 265.19 of 400 USD spent (66.3%), with 134.81 USD left and 16 days to go.');
  const bud = CC('div', null, a2.lastChild, 'margin-top:16px;border:1px solid #e6eaf2;border-radius:12px;padding:16px 18px;background:#fbfcfe');
  bud.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:17px;font-weight:600;color:#374151"><span>Utilities · Monthly</span><span class="chip" style="height:28px;font-size:15px;background:#e7f8f0;color:#0e9f6e">On track</span></div>';
  const btr = CC('div', null, bud, 'margin-top:12px;height:14px;border-radius:7px;background:#eef1f6;position:relative;overflow:hidden');
  const bbar = CC('div', null, btr, 'position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:linear-gradient(90deg,#10b981,#34d399)');
  const bnum = CC('div', null, bud, 'margin-top:8px;display:flex;justify-content:space-between;font-size:16px;color:#6b7280');
  const ph1 = phoneEl(R, 2, 860, 1080, 130), ph2 = phoneEl(R, 22, 800, 1480, 190);
  const T1 = typeTimes(Q1.length, 18, 1.1, 51), T2 = typeTimes(Q2.length, 316, 1.05, 52);
  const S1 = Math.round(T1[T1.length - 1]) + 6, S2 = Math.round(T2[T2.length - 1]) + 6;
  T1.forEach((t, i) => { if (i % 3 === 0) c.cue(t, 'tick', { gain: .26 }); });
  T2.forEach((t, i) => { if (i % 3 === 0) c.cue(t, 'tick', { gain: .26 }); });
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 });
  c.cue(S1, 'click'); c.cue(S1 + 3, 'pop', { gain: .25 }); c.cue(S2, 'click'); c.cue(S2 + 3, 'pop', { gain: .25 });
  c.cue(214, 'rise', { dur: 1.2, gain: .2 }); c.cue(455, 'rise', { dur: 1, gain: .2 });
  c.cue(540, 'whoosh', { dur: .8, f0: 250, f1: 4200, gain: .5 }); c.cue(575, 'pop', { gain: .3 }); c.cue(592, 'pop', { gain: .25, pitch: 1.2 });
  c.seek = lf => {
    tb.seek(lf, 4, 532);
    const pin = PR(lf, 0, 30), mv = PR(lf, 540, 580, Ease.inOut);
    P.style.opacity = pin;
    P.style.transform = `translate(${mv * -780}px,${(1 - pin) * 70}px)`;
    // input typing → bubbles
    const typingQ1 = lf < S1, typingQ2 = lf >= 300 && lf < S2;
    const q = typingQ1 ? Q1 : Q2, T = typingQ1 ? T1 : T2;
    const n = (typingQ1 || typingQ2) ? T.filter(t => t <= lf).length : 0;
    itext.textContent = q.slice(0, n); show(iph, n === 0);
    isend.style.background = n > 0 ? '#2f63f0' : '#9db5f7';
    const b1 = PR(lf, S1, S1 + 12);
    show(q1, lf >= S1); q1.style.opacity = b1; q1.style.transform = `translateY(${(1 - b1) * 30}px)`;
    show(dots, lf >= S1 + 8 && lf < S1 + 36);
    dotEls.forEach((d, i) => d.style.transform = `translateY(${-6 * Math.max(0, Math.sin((lf - i * 4) / 3.2))}px)`);
    const A1T = S1 + 36;
    show(a1, lf >= A1T); a1.style.opacity = PR(lf, A1T, A1T + 8);
    streamSeek(a1w, lf, A1T, 2.2);
    const barT = A1T + a1w.length * 2.2;
    tbl.style.opacity = PR(lf, barT, barT + 10); src1.style.opacity = PR(lf, barT + 40, barT + 52);
    BARS.forEach((b, i) => {
      const p = PR(lf, barT + 6 + i * 6, barT + 36 + i * 6, Ease.out);
      b.bar.style.width = (b.v / 1493.82 * 100 * p) + '%';
      b.num.textContent = (b.v * p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
    // second exchange, after the list scrolls
    q2.style.top = (a1.offsetTop + a1.offsetHeight + 34) + 'px';
    const b2 = PR(lf, S2, S2 + 12);
    show(q2, lf >= S2); q2.style.opacity = b2; q2.style.transform = `translateY(${(1 - b2) * 30}px)`;
    a2.style.top = (q2.offsetTop + q2.offsetHeight + 30) + 'px';
    const A2T = S2 + 30;
    show(a2, lf >= A2T); a2.style.opacity = PR(lf, A2T, A2T + 8);
    streamSeek(a2w, lf, A2T, 2.2);
    const bT = A2T + a2w.length * 2.2;
    bud.style.opacity = PR(lf, bT, bT + 10);
    const bp = PR(lf, bT + 6, bT + 40, Ease.out);
    bbar.style.width = (66.3 * bp) + '%';
    bnum.innerHTML = `<span>${(265.19 * bp).toFixed(2)} of 400.00 USD</span><span>${(66.3 * bp).toFixed(1)}%</span>`;
    const target = Math.max(0, q2.offsetTop - 30);
    scroll.style.transform = `translateY(${-target * PR(lf, 290, 318, Ease.inOut)}px)`;
    // beat 2 phones
    show(ph1, lf >= 556); show(ph2, lf >= 570);
    const p1 = PR(lf, 556, 596), p2 = PR(lf, 572, 612);
    ph1.style.transform = `translateY(${(1 - p1) * 900 + Math.sin(lf / 30) * 5}px) rotate(${lerp(6, -2, p1)}deg)`;
    ph2.style.transform = `translateY(${(1 - p2) * 900 + Math.sin(lf / 26 + 1) * 5}px) rotate(${lerp(10, 5, p2)}deg)`;
  };
});

/* ======================= C6 · dashboard ======================= */
chapter(600, (c, R) => {
  const tb = textBlock(R, 120, 96, '05 — Dashboard', 'Your money, at a glance.', '', 10);
  const cam = CC('div', null, R, 'position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:960px 600px');
  const STATS = [
    ['Total balance', 145912.58, v => money(v), '5 accounts linked', ICON.wallet, '#eef3ff', '#2f63f0'],
    ['Budget health', 5, v => `${Math.round(v)}/5`, '0 over limit', ICON.pie, '#fff4e5', '#ea8a19', 1],
    ['Goal progress', 16, v => `${Math.round(v)}%`, '1 active goal', ICON.target, '#fdeef6', '#db2777', .16],
    ['Savings rate', 54.61, v => `${v.toFixed(2)}%`, 'Last 6 months', ICON.pct, '#e7f8f0', '#0e9f6e', .5461],
  ].map(([l, v, fmt, s, ic, bg, col, bar], i) => {
    const st = CC('div', 'stat', cam, `left:${120 + i * 428}px;top:258px;width:404px;height:178px`);
    st.innerHTML = `<div style="display:flex;align-items:center;gap:14px"><div class="ic" style="background:${bg};color:${col}">${ic}</div><span class="lbl">${l}</span></div>`;
    const num = CC('div', null, st, 'margin-top:14px;font-size:40px;font-weight:700;letter-spacing:-.02em');
    const foot = CC('div', null, st, 'margin-top:8px;display:flex;align-items:center;gap:12px;font-size:17px;color:#6b7280', `<span>${s}</span>`);
    let bf = null;
    if (bar != null) { const tr = CC('div', null, foot, 'flex:1;height:8px;border-radius:4px;background:#eef1f6;position:relative;overflow:hidden'); bf = CC('div', null, tr, `position:absolute;left:0;top:0;bottom:0;background:${col};border-radius:4px`); }
    return { st, num, fmt, v, bf, bar };
  });
  // cash-flow chart
  const ch = CC('div', 'card', cam, 'left:120px;top:466px;width:1060px;height:500px');
  ch.innerHTML = `<div style="position:absolute;left:34px;top:26px;font-size:26px;font-weight:700">Cashflow trend</div>
    <div style="position:absolute;left:34px;top:64px;font-size:17px;color:#6b7280">Income, expenses, assets and liabilities across the last 6 months</div>
    <div style="position:absolute;right:30px;top:28px;display:flex;gap:18px;font-size:16px;color:#374151">
    <span>● Income</span><span style="color:#e5484d">● Expenses</span><span style="color:#3b82f6">● Assets</span><span style="color:#14b8c4">● Liabilities</span></div>`;
  const svgNS = 'http://www.w3.org/2000/svg';
  const sv = document.createElementNS(svgNS, 'svg'); sv.setAttribute('width', 1000); sv.setAttribute('height', 360);
  sv.style.cssText = 'position:absolute;left:40px;top:118px'; ch.appendChild(sv);
  const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const SERIES = [['#10b981', [25000, 25500, 19500, 17000, 5000, 0]], ['#e5484d', [11800, 9500, 9100, 6800, 4800, 0]],
    ['#3b82f6', [1500, 0, 3200, 2000, 0, 0]], ['#14b8c4', [0, 14800, 2100, 8000, 0, 0]]];
  const X = i => 70 + i * 180, Y = v => 300 - v / 30000 * 270;
  let grid = '';
  for (let k = 0; k <= 6; k++) { const y = Y(k * 5000); grid += `<line x1="70" x2="970" y1="${y}" y2="${y}" stroke="#eef1f6"/><text x="58" y="${y + 5}" font-size="13" fill="#9aa3b2" text-anchor="end" font-family="InterL">$${k * 5}k</text>`; }
  MONTHS.forEach((m, i) => grid += `<text x="${X(i)}" y="335" font-size="15" fill="#6b7280" text-anchor="middle" font-family="InterL">${m}</text>`);
  const smooth = vals => { // Catmull-Rom → cubic bézier
    const p = vals.map((v, i) => [X(i), Y(v)]);
    let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    return d;
  };
  sv.innerHTML = grid + SERIES.map(([col, v], i) => `<path class="area" d="${smooth(v)} L${X(5)} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="${col}" fill-opacity=".14"/><path class="ln" d="${smooth(v)}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  const areas = [...sv.querySelectorAll('.area')], lines = [...sv.querySelectorAll('.ln')];
  // accounts
  const ac = CC('div', 'card', cam, 'left:1210px;top:466px;width:590px;height:500px');
  CC('div', 'row', ac, 'top:22px;height:50px', '<span style="font-size:26px;font-weight:700">Accounts</span><span style="font-size:17px;color:#2f63f0;font-weight:600">Manage →</span>');
  const ACC = [['Chase Checking', 123868.48, ICON.bank], ['Cash on Hand', 4920.00, ICON.wallet], ['Chase Savings', 15406.20, ICON.bank], ['Fidelity Brokerage', 1717.90, ICON.bank], ['Chase Credit Card', 0, ICON.card]];
  const accRows = ACC.map(([n, v, ic], i) => {
    const r = CC('div', 'row', ac, `top:${92 + i * 80}px;height:80px`, `<span style="display:flex;align-items:center;gap:16px;font-size:21px;font-weight:600"><span class="stat ic" style="position:static;padding:0;box-shadow:none;background:#eef3ff;color:#2f63f0;width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center">${ic}</span>${n}</span><span style="font-size:22px;font-weight:700">${money(v)}</span>`);
    if (i) CC('div', 'hair', ac, `top:${92 + i * 80}px`);
    return r;
  });
  // beat 2: every device
  const b2 = CC('div', null, R, 'position:absolute;inset:0');
  const t2 = textBlock(b2, 120, 96, 'Synced everywhere', 'Same books. Every device.', '', 10);
  const br = browserEl(b2, 'assets/ui/ai-financial-reports.jpg', 1180, 110, 300);
  const ph = phoneEl(b2, 11, 900, 1340, 180);
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 });
  STATS.forEach((s, i) => c.cue(20 + i * 8, 'pop', { gain: .22, pitch: 1 + i * .08 }));
  c.cue(96, 'rise', { dur: 2.6, gain: .22 });
  ACC.forEach((a, i) => c.cue(130 + i * 7, 'pop', { gain: .16, pitch: 1.2 + i * .06 }));
  c.cue(372, 'whoosh', { dur: .8, f0: 250, f1: 4200, gain: .5 }); c.cue(410, 'pop', { gain: .3 });
  c.seek = lf => {
    const beat2 = lf >= 380;
    show(cam, !beat2); show(b2, beat2);
    tb.seek(lf, 2, 362);
    cam.style.transform = `scale(${1 + PR(lf, 0, 380, Ease.sine) * .035}) translateY(${-PR(lf, 362, 380, Ease.in) * 1100}px)`;
    STATS.forEach((s, i) => {
      const p = PR(lf, 16 + i * 8, 36 + i * 8), cnt = PR(lf, 22 + i * 8, 90 + i * 8, Ease.out);
      s.st.style.opacity = p; s.st.style.transform = `translateY(${(1 - p) * 40}px)`;
      s.num.textContent = s.fmt(s.v * cnt);
      if (s.bf) s.bf.style.width = (s.bar * 100 * cnt) + '%';
    });
    const cp = PR(lf, 70, 96);
    ch.style.opacity = cp; ch.style.transform = `translateY(${(1 - cp) * 50}px)`;
    lines.forEach((l, i) => {
      const L = l.getTotalLength(), p = PR(lf, 96 + i * 10, 176 + i * 10, Ease.inOut);
      l.style.strokeDasharray = `${L} ${L}`; l.style.strokeDashoffset = L * (1 - p);
      areas[i].style.opacity = PR(lf, 150 + i * 10, 190 + i * 10, Ease.lin);
    });
    const ap = PR(lf, 100, 126);
    ac.style.opacity = ap; ac.style.transform = `translateX(${(1 - ap) * 60}px)`;
    rowsIn(accRows, lf, 126, 7);
    if (beat2) {
      const l2 = lf - 380;
      t2.seek(l2, 6);
      const bp = PR(l2, 0, 44);
      br.style.transform = `perspective(2200px) translateY(${(1 - bp) * 800}px) rotateY(${lerp(18, 10, bp) - PR(l2, 44, 220, Ease.sine) * 4}deg)`;
      const pp = PR(l2, 14, 56);
      ph.style.transform = `translateY(${(1 - pp) * 900 + Math.sin(lf / 30) * 5}px) rotate(${lerp(7, 3, pp)}deg)`;
    }
  };
});

/* ======================= C7 · plan ahead ======================= */
chapter(600, (c, R) => {
  const tb = textBlock(R, 120, 92, '06 — Plan ahead', 'Budgets, goals & loans. Handled.', '', 10);
  const col = (x, w, title, sub) => {
    const k = CC('div', 'card', R, `left:${x}px;top:250px;width:${w}px;height:740px;background:#f7f9fd`);
    CC('div', null, k, 'position:absolute;left:30px;top:26px;font-size:28px;font-weight:700', title);
    CC('div', null, k, 'position:absolute;left:30px;top:68px;font-size:17px;color:#6b7280', sub);
    return k;
  };
  const kB = col(120, 540, 'Budgets', 'Total budgeted $6,600 · 5 budgets');
  const BUD = [['Shopping', 300, .42, '#2f63f0'], ['Utilities', 400, .663, '#10b981'], ['Subscriptions', 400, .85, '#ea8a19'], ['Dining & drinks', 500, .31, '#db2777']];
  const rings = BUD.map(([n, v, p, colr], i) => {
    const r = CC('div', null, kB, `position:absolute;left:24px;right:24px;top:${118 + i * 150}px;height:134px;background:#fff;border-radius:16px;border:1px solid #e6eaf2`);
    r.innerHTML = `<div style="position:absolute;left:24px;top:22px;font-size:21px;font-weight:600">${n}</div><div class="lbl" style="position:absolute;left:24px;top:62px;font-size:13px">Budget</div><div style="position:absolute;left:24px;top:82px;font-size:28px;font-weight:700">$${v}</div>
      <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;right:22px;top:19px"><circle cx="48" cy="48" r="40" fill="none" stroke="#eef1f6" stroke-width="9"/><circle class="rg" cx="48" cy="48" r="40" fill="none" stroke="${colr}" stroke-width="9" stroke-linecap="round" transform="rotate(-90 48 48)" stroke-dasharray="251.3 251.3"/><text class="rt" x="48" y="55" text-anchor="middle" font-size="20" font-weight="700" fill="#121212" font-family="InterL">0%</text></svg>`;
    return { r, rg: r.querySelector('.rg'), rt: r.querySelector('.rt'), p };
  });
  const kG = col(690, 520, 'Goals', 'Track progress toward your financial goals');
  const g = CC('div', null, kG, 'position:absolute;left:24px;right:24px;top:118px;height:420px;background:#fff;border-radius:16px;border:1px solid #e6eaf2');
  g.innerHTML = `<div style="position:absolute;left:26px;top:24px;font-size:24px;font-weight:700">Income target</div><div style="position:absolute;left:26px;top:60px;font-size:16px;color:#6b7280">Category: Salary</div>`;
  const gRows = [['Target', '$12,900'], ['Saved', '$2,000'], ['Remaining', '<span style="color:#0e9f6e">$10,900</span>']].map(([l, v], i) =>
    CC('div', null, g, `position:absolute;left:22px;right:22px;top:${104 + i * 62}px;height:52px;border-radius:10px;background:#f5f7fb;display:flex;justify-content:space-between;align-items:center;padding:0 18px`, `<span class="lbl" style="font-size:13px">${l}</span><b style="font-size:21px">${v}</b>`));
  CC('div', null, g, 'position:absolute;left:26px;right:26px;top:310px;display:flex;justify-content:space-between;font-size:17px;font-weight:600', '<span>Progress</span><span class="gp" style="color:#2f63f0">0%</span>');
  const gtr = CC('div', null, g, 'position:absolute;left:26px;right:26px;top:346px;height:12px;border-radius:6px;background:#eef1f6;overflow:hidden');
  const gbar = CC('div', null, gtr, 'height:100%;width:0;background:#2f63f0;border-radius:6px');
  const gpct = g.querySelector('.gp');
  const gTot = CC('div', null, kG, 'position:absolute;left:24px;right:24px;top:560px;height:150px;background:#fff;border-radius:16px;border:1px solid #e6eaf2;display:flex;align-items:center;gap:20px;padding:0 26px',
    `<div class="ic" style="width:56px;height:56px;border-radius:14px;background:#e7f8f0;color:#0e9f6e;display:flex;align-items:center;justify-content:center">${ICON.target}</div><div><div class="lbl" style="font-size:13px">Total saved</div><div style="font-size:34px;font-weight:700">$2,000</div></div>`);
  const kL = col(1240, 560, 'Loans', 'Track payments and outstanding balances');
  const loan = (top, name, tags, cells, prog, progCol) => {
    const l = CC('div', null, kL, `position:absolute;left:24px;right:24px;top:${top}px;height:${cells.length > 2 ? 340 : 230}px;background:#fff;border-radius:16px;border:1px solid #e6eaf2;border-left:5px solid #2f63f0`);
    l.innerHTML = `<div style="position:absolute;left:24px;top:22px;font-size:21px;font-weight:600">${name}</div><div style="position:absolute;right:20px;top:20px;display:flex;gap:8px">${tags}</div>` +
      cells.map(([lb, v], i) => `<div style="position:absolute;left:${22 + (i % 2) * 243}px;top:${66 + Math.floor(i / 2) * 64}px;width:233px;height:54px;border-radius:10px;background:#f5f7fb;display:flex;justify-content:space-between;align-items:center;padding:0 14px"><span class="lbl" style="font-size:12px">${lb}</span><b style="font-size:19px">${v}</b></div>`).join('');
    const py = 66 + Math.ceil(cells.length / 2) * 64 + 10;
    CC('div', null, l, `position:absolute;left:24px;right:24px;top:${py}px;display:flex;justify-content:space-between;font-size:16px;font-weight:600`, `<span>Loan progress</span><span class="lp" style="color:#2f63f0">0%</span>`);
    const tr = CC('div', null, l, `position:absolute;left:24px;right:24px;top:${py + 32}px;height:10px;border-radius:5px;background:#eef1f6;overflow:hidden`);
    const bar = CC('div', null, tr, `height:100%;width:0;background:${progCol};border-radius:5px`);
    return { l, bar, pct: l.querySelector('.lp'), prog };
  };
  const tag = (t, bg, cl) => `<span class="chip" style="height:26px;font-size:12px;padding:0 10px;background:${bg};color:${cl}">${t}</span>`;
  const L1 = loan(118, 'Marcus personal loan', tag('ACTIVE', '#eef3ff', '#2f63f0') + tag('BORROWED', '#e7f8f0', '#0e9f6e'),
    [['Total borrowed', '$9,000'], ['Remaining', '$1,000'], ['Next payment', '$250'], ['Interest', '9.50%']], 88.9, '#10b981');
  const L2 = loan(482, 'Loan to Michael (brother)', tag('ACTIVE', '#eef3ff', '#2f63f0') + tag('LENT', '#fdecec', '#e5484d'),
    [['Total lent', '$3,000'], ['Remaining', '$3,000']], 0, '#2f63f0');
  // beat 2: schedules
  const b2 = CC('div', null, R, 'position:absolute;inset:0');
  const t2 = textBlock(b2, 120, 92, 'Repeating transactions', 'Recurring bills? On autopilot.', '', 10);
  const sc = CC('div', 'card', b2, 'left:120px;top:300px;width:1680px;height:430px');
  sc.innerHTML = `<div style="position:absolute;left:36px;top:30px;display:flex;align-items:center;gap:16px"><div style="width:58px;height:58px;border-radius:14px;background:#e8f6fd;color:#0284c7;display:flex;align-items:center;justify-content:center">${ICON.cal}</div><div><div style="font-size:28px;font-weight:700">Schedules</div><div style="font-size:17px;color:#6b7280">Automate your recurring transactions and track upcoming payments</div></div></div>
    <div style="position:absolute;left:36px;right:36px;top:128px;height:52px;border-radius:10px;background:#f5f7fb;display:grid;grid-template-columns:2.2fr 1fr 1.2fr 1.2fr 1.3fr 1.4fr 1fr;align-items:center;padding:0 22px" class="lbl"><span>Vendor</span><span>Type</span><span>Category</span><span>Frequency</span><span style="text-align:right;padding-right:30px">Amount</span><span>Next due</span><span>Status</span></div>`;
  const SCH = [['Acme Corp', 'Salary deposit – Acme Corp', 'Income', '#e7f8f0', '#0e9f6e', 'Salary', 'Monthly', '+$4,200.00', 'Oct 19, 2026'],
    ['Landlord', 'Monthly apartment rent', 'Expense', '#fdecec', '#e5484d', 'Housing › Rent', 'Monthly', '−$1,850.00', 'Nov 1, 2026']];
  const schRows = SCH.map(([v, s, ty, bg, cl, cat, fr, amt, nd], i) => CC('div', null, sc,
    `position:absolute;left:36px;right:36px;top:${196 + i * 104}px;height:96px;border-bottom:1px solid #edf0f5;display:grid;grid-template-columns:2.2fr 1fr 1.2fr 1.2fr 1.3fr 1.4fr 1fr;align-items:center;padding:0 22px;font-size:21px`,
    `<span><b style="font-size:22px">${v}</b><br><span style="font-size:16px;color:#6b7280">${s}</span></span><span><span class="chip" style="background:${bg};color:${cl}">${ty}</span></span><span>${cat}</span><span>${fr}</span><span style="text-align:right;padding-right:30px;font-weight:700">${amt}</span><span>${nd}</span><span style="color:#ea580c;font-size:18px">scheduled</span>`));
  const pills = ['Rent', 'Salary', 'Subscriptions', 'Transfers', 'Loan payments'].map((t, i) =>
    CC('div', 'pill', b2, `left:${120 + i * 270}px;top:790px;height:60px;font-size:22px;border:1.5px solid rgba(255,255,255,.5);color:#fff;background:rgba(255,255,255,.08)`, `↻ ${t}`));
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 });
  [18, 40, 62].forEach((t, i) => c.cue(t, 'pop', { gain: .3, pitch: .9 + i * .1 }));
  c.cue(70, 'rise', { dur: 1.6, gain: .2 });
  c.cue(312, 'whoosh', { dur: .8, f0: 250, f1: 4200, gain: .5 });
  [0, 1].forEach(i => c.cue(372 + i * 10, 'pop', { gain: .25, pitch: 1 + i * .1 }));
  pills.forEach((p, i) => c.cue(420 + i * 6, 'tick', { gain: .25 }));
  c.seek = lf => {
    const beat2 = lf >= 330;
    tb.seek(lf, 2, 304);
    [kB, kG, kL].forEach((k, i) => {
      const p = PR(lf, 14 + i * 22, 44 + i * 22), o = PR(lf, 304 + i * 4, 326 + i * 4, Ease.in);
      show(k, !beat2); k.style.opacity = p; k.style.transform = `translateY(${(1 - p) * 120 + o * 900}px)`;
    });
    rings.forEach((r, i) => {
      const p = PR(lf, 50 + i * 8, 120 + i * 8, Ease.out) * r.p;
      r.rg.setAttribute('stroke-dashoffset', 251.3 * (1 - p)); r.rt.textContent = Math.round(p * 100) + '%';
      const q = PR(lf, 30 + i * 6, 50 + i * 6); r.r.style.opacity = q; r.r.style.transform = `translateY(${(1 - q) * 30}px)`;
    });
    rowsIn(gRows, lf, 56, 5);
    const gp = PR(lf, 80, 150, Ease.out) * 16;
    gbar.style.width = gp + '%'; gpct.textContent = Math.round(gp) + '%';
    gTot.style.opacity = PR(lf, 96, 116);
    [L1, L2].forEach((L, i) => {
      const q = PR(lf, 70 + i * 12, 92 + i * 12); L.l.style.opacity = q; L.l.style.transform = `translateY(${(1 - q) * 30}px)`;
      const p = PR(lf, 100 + i * 10, 180 + i * 10, Ease.out) * L.prog;
      L.bar.style.width = p + '%'; L.pct.textContent = p.toFixed(1) + '%';
    });
    show(b2, beat2);
    if (beat2) {
      const l2 = lf - 330;
      t2.seek(l2, 4);
      const sp = PR(l2, 14, 50);
      sc.style.opacity = sp; sc.style.transform = `translateY(${(1 - sp) * 80}px) scale(${1 + PR(l2, 50, 270, Ease.sine) * .02})`;
      rowsIn(schRows, l2, 40, 10);
      pills.forEach((p, i) => { const q = PR(l2, 90 + i * 6, 110 + i * 6); p.style.opacity = q; p.style.transform = `translateY(${(1 - q) * 24}px)`; });
    }
  };
});

/* ======================= C8 · reports ======================= */
chapter(480, (c, R) => {
  const tb = textBlock(R, 120, 92, '07 — AI reports', 'Reports that make sense.', '', 10);
  const k = CC('div', 'card', R, 'left:120px;top:250px;width:1100px;height:600px');
  k.innerHTML = `<div style="position:absolute;left:36px;top:28px;font-size:26px;font-weight:700">Monthly summary</div>
    <div style="position:absolute;right:34px;top:32px;display:flex;gap:18px;font-size:16px;color:#374151">
    <span><i style="display:inline-block;width:26px;height:12px;background:#34c38f;margin-right:6px"></i>Income</span><span><i style="display:inline-block;width:26px;height:12px;background:#f06a6a;margin-right:6px"></i>Expenses</span><span><i style="display:inline-block;width:26px;height:12px;background:#5b93f5;margin-right:6px"></i>Assets</span><span><i style="display:inline-block;width:26px;height:12px;background:#f5ad3c;margin-right:6px"></i>Liabilities</span></div>`;
  const DATA = [[25500, 11600, 1500, 0], [25400, 9500, 0, 14800], [19500, 9100, 3400, 2200], [17100, 6900, 2000, 8000], [5000, 4800, 0, 0], [0, 0, 0, 0]];
  const COLS = ['#34c38f', '#f06a6a', '#5b93f5', '#f5ad3c'];
  const M = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];
  for (let i = 0; i <= 6; i++) CC('div', null, k, `position:absolute;left:110px;right:36px;top:${520 - i * 70}px;height:1px;background:#eef1f6`);
  for (let i = 0; i <= 6; i++) CC('div', null, k, `position:absolute;left:16px;width:84px;text-align:right;top:${511 - i * 70}px;font-size:13px;color:#9aa3b2`, `$${(i * 5).toFixed(0)}k`);
  const bars = [];
  DATA.forEach((d, m) => {
    CC('div', null, k, `position:absolute;left:${110 + m * 159}px;width:159px;text-align:center;top:534px;font-size:15px;color:#6b7280`, M[m]);
    d.forEach((v, j) => bars.push({ el: CC('div', null, k, `position:absolute;left:${124 + m * 159 + j * 33}px;width:29px;bottom:80px;height:0;background:${COLS[j]};border-radius:4px 4px 0 0`), v, t: m * 6 + j * 2 }));
  });
  const ins = CC('div', 'pill', R, 'left:120px;top:880px;height:62px;font-size:21px;background:#fff;color:#121212;box-shadow:0 20px 50px rgba(12,22,52,.3)', ICON.spark('#2f63f0', 22) + 'Insight: housing is your top expense category this period');
  const SUM = [['Total income', 92446.69, '#121212'], ['Total expenses', 41962.18, '#121212'], ['Net savings', 50484.51, '#0e9f6e'], ['Savings rate', 54.61, '#2f63f0', '%']];
  const tiles = SUM.map(([l, v, cl, u], i) => {
    const t = CC('div', 'stat', R, `left:1260px;top:${250 + i * 152}px;width:540px;height:136px;border-left:5px solid #2f63f0`);
    t.innerHTML = `<div class="lbl">${l}</div>`;
    const n = CC('div', null, t, `margin-top:12px;font-size:44px;font-weight:700;letter-spacing:-.02em;color:${cl}`);
    return { t, n, v, u };
  });
  const b2 = CC('div', null, R, 'position:absolute;inset:0');
  const t2 = textBlock(b2, 120, 300, 'Trends & statements', 'Your month,\nexplained.', 'Monthly breakdowns, net worth and cash flow—summarised by AI in plain English.', 560);
  const p1 = phoneEl(b2, 19, 880, 1000, 150), p2 = phoneEl(b2, 18, 820, 1400, 210);
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 }); c.cue(30, 'rise', { dur: 2.4, gain: .24 });
  SUM.forEach((s, i) => c.cue(60 + i * 10, 'pop', { gain: .2, pitch: 1 + i * .08 }));
  c.cue(180, 'pop', { gain: .3, pitch: 1.3 });
  c.cue(290, 'whoosh', { dur: .8, f0: 250, f1: 4200, gain: .5 }); c.cue(330, 'pop', { gain: .3 });
  c.seek = lf => {
    const beat2 = lf >= 300;
    show(b2, beat2);
    tb.seek(lf, 2, 286);
    const kp = PR(lf, 8, 34), out = PR(lf, 286, 304, Ease.in);
    k.style.opacity = kp; k.style.transform = `translate(${out * -1300}px,${(1 - kp) * 60}px)`; show(k, !beat2);
    bars.forEach(b => { const p = PR(lf, 34 + b.t, 70 + b.t, Ease.out); b.el.style.height = (b.v / 30000 * 420 * p) + 'px'; });
    tiles.forEach((t, i) => {
      const p = PR(lf, 50 + i * 10, 74 + i * 10), cnt = PR(lf, 56 + i * 10, 140 + i * 10, Ease.out);
      show(t.t, !beat2);
      t.t.style.opacity = p; t.t.style.transform = `translateX(${(1 - p) * 60 + out * 900}px)`;
      t.n.textContent = t.u ? (t.v * cnt).toFixed(2) + '%' : money(t.v * cnt);
    });
    const ip = PR(lf, 180, 200); show(ins, !beat2); ins.style.opacity = ip; ins.style.transform = `translateY(${(1 - ip) * 20 + out * 300}px)`;
    if (beat2) {
      const l2 = lf - 300;
      t2.seek(l2, 4);
      const a = PR(l2, 4, 44), b = PR(l2, 18, 58);
      p1.style.transform = `translateY(${(1 - a) * 900 + Math.sin(lf / 30) * 5}px) rotate(${lerp(6, -3, a)}deg)`;
      p2.style.transform = `translateY(${(1 - b) * 900 + Math.sin(lf / 26 + 1) * 5}px) rotate(${lerp(10, 5, b)}deg)`;
    }
  };
});

/* ======================= C9 · everything AccountE can do ======================= */
chapter(360, (c, R) => {
  const title = CC('div', 'h1', R, 'left:0;top:150px;width:1920px;text-align:center;font-size:88px;line-height:96px');
  const tw = wordsInto(title, 'Everything AccountE can do.');
  const ROWS = [
    ['AI bookkeeper', 'Auto-categorization', 'Receipt scan', 'Voice entry', 'Chat with your books', 'Smart insights', 'Cash flow forecast'],
    ['Tax tagging', 'AI report generation', 'Smart budgets', 'Loan tracker', 'Email forwarding', 'Bank reconciliation', 'Bulk CSV import'],
    ['Bank-grade security', 'Multi-account', 'Custom rules', 'Savings goals', 'Net worth tracker', 'Repeating transactions', 'Bank feed AI record'],
  ];
  const rows = ROWS.map((r, i) => {
    const el = CC('div', 'mq', R, `top:${330 + i * 100}px`);
    el.innerHTML = [...r, ...r, ...r].map(t => `<span>${t}</span>`).join('');
    return el;
  });
  const FLAGS = ['usd_flag_currency_only_no_bg_large_flag', 'eur_flag_currency_no_bg', 'united_kingdom_gbp_no_bg', 'japan_jpy_no_bg', 'india_inr_no_bg', 'bangladesh_bdt_no_bg', 'cad_flag_currency_no_bg_from_user', 'aud_flag_currency_no_bg_from_user',
    'singapore_sgd_no_bg', 'uae_aed_no_bg', 'sar_flag_currency_no_bg_from_user', 'china_cny_no_bg', 'krw_flag_currency_no_bg_updated', 'brl_flag_currency_no_bg_from_user', 'mxn_flag_currency_no_bg_from_user', 'chf_flag_currency_no_bg_from_user', 'sek_flag_currency_no_bg_from_user', 'nigeria_ngn_no_bg', 'philippines_php_no_bg'];
  const fl = CC('div', null, R, 'position:absolute;top:680px;left:0;display:flex;gap:30px;align-items:center');
  [...FLAGS, ...FLAGS].forEach(f => { const im = CC('img', null, fl, 'height:96px;width:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.25))'); im.src = `assets/flags/${f}.png`; });
  const foot = CC('div', 'sub', R, 'left:0;top:850px;width:1920px;text-align:center;font-size:32px;color:#fff;font-weight:500');
  const fw = wordsInto(foot, '160+ currencies · Free forever plan · Bank-grade security');
  c.cue(0, 'whoosh', { dur: .6, f0: 300, f1: 3000, gain: .4 });
  [10, 14, 18, 22].forEach(t => c.cue(t, 'tick', { gain: .3 }));
  c.cue(120, 'shimmer', { dur: 1.4, gain: .14 }); c.cue(200, 'pop', { gain: .25 });
  c.seek = lf => {
    riseWords(tw, lf, 6, 3, 18);
    rows.forEach((r, i) => {
      const dir = i % 2 ? 1 : -1, w = r.scrollWidth / 3;
      const x = (i % 2 ? -w : 0) + dir * lf * (2.6 + i * .5) - 60 * i;
      const p = PR(lf, 20 + i * 8, 50 + i * 8);
      r.style.transform = `translate(${x}px,${(1 - p) * 40}px)`; r.style.opacity = p;
      [...r.children].forEach((s, j) => {
        const hl = hash(i, j, Math.floor((lf + j * 7) / 40)) > .86 && lf > 40;
        s.style.background = hl ? '#fff' : 'rgba(255,255,255,.07)'; s.style.color = hl ? '#121212' : '#fff';
      });
    });
    const fp = PR(lf, 110, 150);
    fl.style.opacity = fp; fl.style.transform = `translate(${-lf * 3.2 + 200}px,${(1 - fp) * 40}px)`;
    riseWords(fw, lf, 196, 2, 18);
  };
});

/* ======================= C10 · finale ======================= */
// replays the landing page from the reveal (its own DOM, seekReveal), then sign-off on black
const FINALE = chapter(375, (c, R) => {
  const top = CC('div', 'h1', R, 'left:0;top:52px;width:1920px;text-align:center;font-size:58px;line-height:66px;color:#121212');
  const tw = wordsInto(top, 'Start free today.');
  const badges = CC('div', null, R, 'position:absolute;left:0;top:948px;width:1920px;display:flex;justify-content:center;align-items:center;gap:22px');
  ['appstore', 'playstore'].forEach(b => { const im = CC('img', null, badges, 'height:68px;border-radius:12px;box-shadow:0 12px 26px rgba(0,0,0,.18)'); im.src = `assets/icons/${b}.png`; });
  CC('div', null, badges, 'margin-left:18px;font-size:30px;font-weight:600;color:#121212', 'accounte.com');
  const black = CC('div', null, R, 'position:absolute;inset:0;background:#000');
  const icon = CC('img', null, black, 'position:absolute;left:870px;top:330px;width:180px;height:180px;border-radius:42px'); icon.src = 'assets/icons/app-icon.png';
  const logo = CC('img', null, black, 'position:absolute;top:560px;height:62px;filter:brightness(0) invert(1)'); logo.src = 'assets/logo.png';
  const tag = CC('div', null, black, 'position:absolute;left:0;top:670px;width:1920px;text-align:center;font-size:30px;color:rgba(255,255,255,.75)', 'Talk to your money. Let AI do the books.');
  c.cue(0, 'whoosh', { dur: .5, f0: 3000, f1: 300, gain: .35 });
  c.cue(40, 'whoosh', { dur: 1.6, f0: 200, f1: 1200, gain: .3 }); c.cue(108, 'settle');
  [118, 121, 124].forEach(t => c.cue(t, 'tick', { gain: .3 })); c.cue(150, 'pop', { gain: .3 });
  c.cue(262, 'shimmerTo', { from: 200 }); c.cue(264, 'boom', { gain: .8 }); c.cue(286, 'pop', { gain: .25 });
  c.revealFrame = lf => lf < 40 ? 161 : Math.min(224, 161 + (lf - 40) * (214 - 161) / 70);
  c.seek = lf => {
    riseWords(tw, lf, 116, 3, 18);
    const bp = PR(lf, 140, 168);
    badges.style.opacity = bp; badges.style.transform = `translateY(${(1 - bp) * 30}px)`;
    show(top, lf < 262); show(badges, lf < 262);
    show(black, lf >= 262);
    const ip = PR(lf, 264, 288, Ease.back(1.7));
    icon.style.transform = `scale(${lerp(.3, 1, ip)})`; icon.style.opacity = PR(lf, 264, 268, Ease.lin) * (1 - PR(lf, 350, 362, Ease.lin));
    const lp = PR(lf, 284, 304);
    logo.style.left = (960 - logo.naturalWidth * 62 / logo.naturalHeight / 2) + 'px';
    logo.style.opacity = lp * (1 - PR(lf, 350, 362, Ease.lin)); logo.style.transform = `translateY(${(1 - lp) * 24}px)`;
    tag.style.opacity = PR(lf, 300, 320) * (1 - PR(lf, 350, 362, Ease.lin));
  };
});

/* ======================= timeline ======================= */
let acc = REVEAL_END;
CHAPS.forEach(ch => { ch.start = acc; acc += ch.len; });
const TOTAL_FRAMES = acc; // last frame is black
const WIPE = 14;

const seekReveal = window.seekFrame;
function seekLong(F) {
  const f = Math.round(F);
  if (f < REVEAL_END) { CHAP.style.display = 'none'; $('world').style.display = ''; seekReveal(f); return; }
  const ci = CHAPS.findIndex(ch => f >= ch.start && f < ch.start + ch.len);
  const ch = CHAPS[ci < 0 ? CHAPS.length - 1 : ci], lf = f - ch.start;
  const finale = ch === FINALE && lf < 262;
  // the reveal layer is only used by the finale (landing page replay)
  if (finale) { seekReveal(ch.revealFrame(lf)); $('world').style.display = ''; }
  else $('world').style.display = 'none';
  ['cursor', 'pink', 'veil', 'black'].forEach(id => $(id).style.display = 'none');
  CHAP.style.display = 'block';
  show(CBG, !finale);
  // background drift is continuous across chapters
  CBGD.style.transform = `translate(${Math.sin(f / 170) * 26}px,${Math.cos(f / 210) * 18}px) scale(1.04)`;
  CGLOW.style.left = (1180 + Math.sin(f / 300 + ci) * 260) + 'px'; CGLOW.style.top = (-330 + Math.cos(f / 260) * 60) + 'px';
  // band wipe from the previous chapter (never a crossfade)
  const prev = ci > 0 && lf < WIPE && ch !== FINALE ? CHAPS[ci - 1] : null;
  CHAPS.forEach(c2 => { c2.root.style.display = (c2 === ch || c2 === prev) ? 'block' : 'none'; c2.root.style.clipPath = 'none'; });
  if (prev) prev.seek(prev.len - 1);
  ch.seek(lf);
  if (prev) {
    const b = PR(lf, 0, WIPE, Ease.inOut) * 100;
    ch.root.style.clipPath = `inset(0 0 ${100 - b}% 0)`;
    CBAND.style.display = 'block'; CBAND.style.top = (b * 10.8 - 116) + 'px';
  } else CBAND.style.display = 'none';
  CHAP.appendChild(CBAND);
  drawGrain(f);
  $('black').style.display = f >= TOTAL_FRAMES - 1 ? 'block' : 'none';
}
// sound cues (absolute seconds) for audio.py
window.SFX_CUES = CHAPS.flatMap(ch => ch.cues.map(q => ({ ...q, t: (ch.start + q.lf) / 30 }))).sort((a, b) => a.t - b.t);
window.TOTAL_FRAMES = LONG ? TOTAL_FRAMES : 226;
if (LONG) window.seekFrame = seekLong;
