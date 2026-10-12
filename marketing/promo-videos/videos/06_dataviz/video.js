/* 06 · Data viz — "Reports that make sense"  (Urbanist + Roboto) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const INK = '#0F172A', MUTED = '#64748B', GRID = '#E2E8F0', BLUE = '#0204F5';
  const INC = '#10B981', EXP = '#EF4444', AST = '#3B82F6', LIA = '#F59E0B', IND = '#6366F1';
  E.stage.style.background = '#F6F8FC';
  E.css(`.t6{font:800 ${L(78, 76)}px Urbanist;color:${INK};letter-spacing:-.02em;line-height:1.05}
    .k6{font:800 ${L(26, 28)}px Urbanist;color:${IND};letter-spacing:.2em;text-transform:uppercase}
    .lab{font:500 ${L(24, 26)}px Roboto;fill:${MUTED}} .val{font:700 ${L(26, 28)}px Roboto;fill:${INK}}
    .card6{background:#fff;border-radius:28px;box-shadow:0 18px 50px rgba(15,23,42,.08)}`);
  const cx = W / 2;
  // chart frame (screen px)
  const F = P ? { x: 110, y: 520, w: 880, h: 720 } : { x: 230, y: 300, w: 1460, h: 560 };
  const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const INCOME = [6850, 7120, 6940, 7480, 7210, 7640], EXPENSE = [5420, 5880, 5310, 6120, 5690, 6356];
  const NET = INCOME.map((v, i) => v - EXPENSE[i]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const fmt = (v, d) => E.money(v, '$', d == null ? 0 : d);
  const sc = (t0, t1, bg) => { const s = E.scene(t0, t1); if (bg) s.style.background = bg; return s; };
  const svgEl = (parent, w, h, x, y) => { const d = E.div('abs', parent, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible"></svg>`, { left: x + 'px', top: y + 'px' }); return d.firstChild; };
  const NS = 'http://www.w3.org/2000/svg';
  const add = (svg, tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
  function header(s, t0, kicker, title, opts) {
    const box = E.div('abs', s, null, P ? { left: '70px', right: '70px', top: '170px', textAlign: 'left' } : { left: F.x + 'px', top: '92px' });
    const k = E.div('k6', box, kicker); const h = E.div('t6', box, title, { marginTop: '8px' });
    K.rise([k, h], t0 + 0.05, { stagger: 0.08, dist: 40, d: 0.5 }); E.cue(t0, 'whoosh', { gain: 0.35 });
    return box;
  }
  function gridY(svg, w, h, max, steps, t0) {
    const g = add(svg, 'g', {});
    for (let i = 0; i <= steps; i++) {
      const y = h - (i / steps) * h; const v = (max / steps) * i;
      const ln = add(g, 'line', { x1: 0, x2: w, y1: y, y2: y, stroke: GRID, 'stroke-width': 2 });
      add(g, 'text', { x: -18, y: y + 8, 'text-anchor': 'end', class: 'lab' }, v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '$' + v);
      E.ft(ln, t0 + i * 0.04, { attr: { x2: 0 } }, { attr: { x2: w }, duration: 0.5, ease: 'power2.out' });
    }
    return g;
  }

  /* ---------- S1 0–2.8 dots burst ---------- */
  let s = sc(0, 5.6);
  const DOTN = P ? 240 : 320;
  K.rand(5);
  const catCols = [IND, INC, EXP, AST, LIA, '#EC4899', '#0EA5E9', '#8B5CF6'];
  const dots = Array.from({ length: DOTN }, (_, i) => ({ el: E.div('abs', s, null, { width: '18px', height: '18px', marginLeft: '-9px', marginTop: '-9px', borderRadius: '50%', background: catCols[i % catCols.length] }), a: K.rand() * Math.PI * 2, r: 120 + K.rand() * L(820, 620), sp: 0.3 + K.rand() * 0.7, sz: 0.5 + K.rand() * 0.9, ph: K.rand() * 6 }));
  // calendar grid targets (7 cols x 5 rows)
  const gw = L(980, 900), gh = L(560, 640), gx = cx - gw / 2, gy = L(380, 720);
  const cellW = gw / 7, cellH = gh / 5;
  const cal = E.div('abs', s, Array.from({ length: 35 }, (_, i) => `<div style="position:absolute;left:${(i % 7) * cellW + 4}px;top:${Math.floor(i / 7) * cellH + 4}px;width:${cellW - 8}px;height:${cellH - 8}px;border-radius:16px;background:#fff;box-shadow:0 4px 12px rgba(15,23,42,.05)"><span style="position:absolute;left:12px;top:8px;font:600 20px Roboto;color:#64748B">${i + 1 <= 31 ? i + 1 : ''}</span></div>`).join(''), { left: gx + 'px', top: gy + 'px', width: gw + 'px', height: gh + 'px' });
  E.ft(cal, 2.9, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.5 });
  s.insertBefore(cal, s.firstChild); // keep the calendar *under* the dots
  E.frame((t) => {
    if (t >= 5.6) return;
    dots.forEach((d, i) => {
      const burst = eo(pr(t, 0, 1.1));
      const ox = cx + Math.cos(d.a + t * d.sp * 0.6) * d.r * burst, oy = L(560, 900) + Math.sin(d.a + t * d.sp * 0.6) * d.r * burst * L(0.62, 1);
      const cell = i % 31, tx = gx + (cell % 7) * cellW + cellW * (0.25 + ((i * 37) % 7) / 10), ty = gy + Math.floor(cell / 7) * cellH + cellH * (0.45 + ((i * 53) % 5) / 12);
      const p = eo(pr(t, 2.9 + (i % 40) * 0.012, 3.9 + (i % 40) * 0.012));
      const x = ox + (tx - ox) * p, y = oy + (ty - oy) * p, sc2 = d.sz * (1 - 0.45 * p) * Math.min(1, t * 4);
      d.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc2.toFixed(3)})`;
      d.el.style.left = '0px'; d.el.style.top = '0px';
    });
  });
  E.cue(0.05, 'rise', { gain: 0.3 }); E.cue(0.3, 'impact', { gain: 0.45 });
  const q1 = K.ctext(s, 'Where did your money go?', cx, L(160, 330), {}, 't6'); if (P) { q1.style.whiteSpace = 'normal'; q1.style.width = '880px'; }
  K.rise(q1, 0.15, { dist: 50, d: 0.5 }); E.to(q1, 2.75, { autoAlpha: 0, duration: 0.2 });
  const q2 = K.ctext(s, `Reports that <span style="color:${BLUE}">make sense.</span>`, cx, L(160, 330), {}, 't6'); if (P) { q2.style.whiteSpace = 'normal'; q2.style.width = '880px'; }
  K.rise(q2, 2.95, { dist: 50, d: 0.5 }); E.cue(2.9, 'whoosh', { gain: 0.4 });
  for (let i = 0; i < 12; i++) E.cue(2.95 + i * 0.07, 'click', { gain: 0.12 });

  /* ---------- S3 5.6–11.2 Income & expenses ---------- */
  s = sc(5.6, 11.2);
  header(s, 5.6, 'Report 1', 'Income & expenses');
  { const svg = svgEl(s, F.w, F.h, F.x, F.y); const max = 8000; gridY(svg, F.w, F.h, max, 4, 5.7);
    const bw = F.w / 6; const barW = bw * 0.28;
    const bars = [];
    MONTHS.forEach((m, i) => {
      const x0 = i * bw + bw * 0.18;
      const bi = add(svg, 'rect', { x: x0, width: barW, y: F.h, height: 0, rx: 8, fill: INC });
      const be = add(svg, 'rect', { x: x0 + barW + 10, width: barW, y: F.h, height: 0, rx: 8, fill: EXP });
      add(svg, 'text', { x: x0 + barW + 5, y: F.h + L(42, 44), 'text-anchor': 'middle', class: 'lab' }, m);
      const vi = add(svg, 'text', { x: x0 + barW / 2, y: F.h, 'text-anchor': 'middle', class: 'val', opacity: 0 }, '');
      const ve = add(svg, 'text', { x: x0 + barW * 1.5 + 10, y: F.h, 'text-anchor': 'middle', class: 'val', opacity: 0 }, '');
      bars.push({ bi, be, vi, ve, i });
      E.cue(6.0 + i * 0.13, 'pop_hi', { gain: 0.18 });
    });
    E.frame((t) => {
      if (t < 5.6 || t > 11.2) return;
      bars.forEach(({ bi, be, vi, ve, i }) => {
        const p = eo(pr(t, 6.0 + i * 0.13, 6.9 + i * 0.13)); const hi = (INCOME[i] / max) * F.h * p, he = (EXPENSE[i] / max) * F.h * p;
        bi.setAttribute('y', F.h - hi); bi.setAttribute('height', hi); be.setAttribute('y', F.h - he); be.setAttribute('height', he);
        const show = t > 8.3; vi.setAttribute('opacity', show ? 1 : 0); ve.setAttribute('opacity', show ? 1 : 0);
        if (!P || i % 2 === 1) { vi.textContent = '$' + (INCOME[i] / 1000).toFixed(1) + 'k'; ve.textContent = '$' + (EXPENSE[i] / 1000).toFixed(1) + 'k'; } else { vi.textContent = ''; ve.textContent = ''; }
        vi.setAttribute('y', F.h - hi - 14); ve.setAttribute('y', F.h - he - 14);
      });
    });
    const leg = E.div('abs', s, `<span style="display:inline-flex;align-items:center;gap:10px;margin-right:30px"><i style="width:22px;height:22px;border-radius:6px;background:${INC}"></i>Income</span><span style="display:inline-flex;align-items:center;gap:10px"><i style="width:22px;height:22px;border-radius:6px;background:${EXP}"></i>Expenses</span>`, P ? { left: '110px', top: '420px', font: `600 30px Roboto`, color: INK } : { right: W - F.x - F.w + 'px', top: '130px', font: `600 28px Roboto`, color: INK });
    K.rise(leg, 6.0, { dist: 20 });
    // 8.4 beat: highlight October
    const hl = E.div('abs', s, null, { left: F.x + 5 * bw + 'px', top: F.y - 20 + 'px', width: bw + 'px', height: F.h + 70 + 'px', borderRadius: '24px', background: 'rgba(99,102,241,.08)', border: '2px dashed rgba(99,102,241,.4)' });
    E.ft(hl, 8.4, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }); E.cue(8.4, 'ding', { gain: 0.3 });
  }

  /* ---------- S4 11.2–16.8 Cash flow ---------- */
  s = sc(11.2, 16.8);
  header(s, 11.2, 'Report 2', 'Cash flow');
  { const svg = svgEl(s, F.w, F.h, F.x, F.y); const max = 2000; gridY(svg, F.w, F.h, max, 4, 11.3);
    const xs = MONTHS.map((_, i) => (i + 0.5) * (F.w / 6)), ys = NET.map((v) => F.h - (v / max) * F.h);
    let dLine = `M${xs[0]},${ys[0]}`; for (let i = 1; i < 6; i++) { const cx1 = (xs[i - 1] + xs[i]) / 2; dLine += ` C${cx1},${ys[i - 1]} ${cx1},${ys[i]} ${xs[i]},${ys[i]}`; }
    const defs = add(svg, 'defs', {}); defs.innerHTML = `<linearGradient id="cfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INC}" stop-opacity=".35"/><stop offset="1" stop-color="${INC}" stop-opacity="0"/></linearGradient><clipPath id="cfc"><rect x="0" y="-50" width="0" height="${F.h + 100}"/></clipPath>`;
    const area = add(svg, 'path', { d: dLine + ` L${xs[5]},${F.h} L${xs[0]},${F.h} Z`, fill: 'url(#cfg)', 'clip-path': 'url(#cfc)' });
    const line = add(svg, 'path', { d: dLine, fill: 'none', stroke: INC, 'stroke-width': 7, 'stroke-linecap': 'round' });
    const len = line.getTotalLength ? 2400 : 2400; line.style.strokeDasharray = len;
    const pts2 = xs.map((x, i) => add(svg, 'circle', { cx: x, cy: ys[i], r: 11, fill: '#fff', stroke: INC, 'stroke-width': 5, opacity: 0 }));
    MONTHS.forEach((m, i) => add(svg, 'text', { x: xs[i], y: F.h + L(42, 44), 'text-anchor': 'middle', class: 'lab' }, m));
    const clipR = defs.querySelector('rect');
    E.frame((t) => { if (t < 11.2 || t > 16.8) return; const p = eo(pr(t, 11.6, 13.6)); line.style.strokeDashoffset = (len * (1 - p)).toFixed(1); clipR.setAttribute('width', (F.w * p).toFixed(1)); pts2.forEach((c, i) => c.setAttribute('opacity', p >= (i + 0.5) / 6 ? 1 : 0)); });
    for (let i = 0; i < 6; i++) E.cue(11.6 + i * 0.33, 'click', { gain: 0.3 });
    const tag = E.div('abs card6', s, `<div style="font:600 26px Roboto;color:${MUTED}">October net cash flow</div><div style="font:800 64px Urbanist;color:#047857;margin-top:4px">+$1,284</div>`, { left: F.x + xs[5] - L(330, 400) + 'px', top: F.y + ys[5] - L(220, 260) + 'px', padding: '22px 30px' });
    E.ft(tag, 14.0, { autoAlpha: 0, y: 30, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(2)' }); E.cue(14.0, 'coin', { gain: 0.45 });
    E.ft(pts2[5], 14.0, { attr: { r: 11 } }, { attr: { r: 16 }, duration: 0.4, ease: 'back.out(3)' });
  }

  /* ---------- S5 16.8–22.4 Spending by category (donut) ---------- */
  s = sc(16.8, 22.4);
  header(s, 16.8, 'Report 3', 'Spending by category');
  { const CATS = [['Housing', 38, '#6366F1'], ['Groceries', 14, '#10B981'], ['Transport', 9, '#0EA5E9'], ['Dining', 8, '#F59E0B'], ['Utilities', 7, '#8B5CF6'], ['Shopping', 6, '#EC4899'], ['Other', 18, '#CBD5E1']];
    const R = L(250, 290), cxD = P ? cx : F.x + 330, cyD = P ? 860 : F.y + F.h / 2 + 10;
    const svg = svgEl(s, R * 2 + 80, R * 2 + 80, cxD - R - 40, cyD - R - 40);
    const C = 2 * Math.PI * R; let acc = 0;
    const arcs = CATS.map(([n, pct, col], i) => { const c = add(svg, 'circle', { cx: R + 40, cy: R + 40, r: R, fill: 'none', stroke: col, 'stroke-width': L(90, 100), 'stroke-dasharray': `0 ${C}`, transform: `rotate(${-90 + (acc / 100) * 360} ${R + 40} ${R + 40})` }); const o = { c, pct, acc }; acc += pct; return o; });
    E.frame((t) => { if (t < 16.8 || t > 22.4) return; const p = eo(pr(t, 17.0, 18.6)); arcs.forEach(({ c, pct, acc: a }) => { const vis = clamp(p * 100 - a, 0, pct); c.setAttribute('stroke-dasharray', `${((vis / 100) * C).toFixed(1)} ${C}`); }); });
    E.cue(17.0, 'scan', { gain: 0.3 });
    const ctr = K.ctext(s, `<div style="font:800 ${L(58, 62)}px Urbanist;color:${INK}">$6,356</div><div style="font:500 ${L(24, 26)}px Roboto;color:${MUTED}">spent in October</div>`, cxD, cyD, {});
    E.ft(ctr, 17.6, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
    const list = E.div('abs', s, null, P ? { left: '90px', right: '90px', top: '1220px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '30px', rowGap: '8px' } : { left: F.x + 760 + 'px', top: F.y + 20 + 'px', width: '640px' });
    const ROWS = P ? CATS.slice(0, 6) : CATS;
    ROWS.forEach(([n, pct, col], i) => {
      const r = E.div('', list, `<span style="display:inline-flex;align-items:center;gap:14px"><i style="width:22px;height:22px;border-radius:6px;background:${col}"></i>${n}</span><b style="font-weight:700;color:${INK}">${pct}%</b>`, { display: 'flex', justifyContent: 'space-between', font: `500 ${L(32, 30)}px Roboto`, color: '#334155', padding: L('12px 0', '6px 0'), borderBottom: P ? 'none' : `2px solid ${GRID}` });
      E.ft(r, 19.6 + i * 0.12, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.35 }); E.cue(19.6 + i * 0.12, 'pop_hi', { gain: 0.15 });
    });
  }

  /* ---------- S6 22.4–28.0 Net worth over time ---------- */
  s = sc(22.4, 28.0);
  header(s, 22.4, 'Report 4', 'Net worth over time');
  { const NW = [48.1, 49.0, 49.6, 50.9, 51.2, 52.4, 53.1, 54.6, 55.2, 56.8, 58.0, 59.174];
    const ASSETS = [57.2, 58.1, 58.7, 60.0, 59.9, 61.2, 61.8, 62.9, 63.1, 64.0, 64.6, 65.108];
    const ML = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const svg = svgEl(s, F.w, F.h, F.x, F.y); const min = 40, max = 70;
    const g = add(svg, 'g', {}); for (let i = 0; i <= 3; i++) { const y = F.h - (i / 3) * F.h; add(g, 'line', { x1: 0, x2: F.w, y1: y, y2: y, stroke: GRID, 'stroke-width': 2 }); add(g, 'text', { x: -18, y: y + 8, 'text-anchor': 'end', class: 'lab' }, '$' + (min + i * 10) + 'k'); }
    const X = (i) => (i + 0.5) * (F.w / 12), Y = (v) => F.h - ((v - min) / (max - min)) * F.h;
    // assets & liabilities bars (stacked look: liabilities = assets - net worth)
    const bars = NW.map((v, i) => { const bw = F.w / 12 * 0.42; const a = add(svg, 'rect', { x: X(i) - bw / 2, width: bw, y: F.h, height: 0, rx: 6, fill: AST, opacity: 0.22 }); const l = add(svg, 'rect', { x: X(i) - bw / 2, width: bw, y: F.h, height: 0, rx: 6, fill: LIA, opacity: 0.55 }); return { a, l, i }; });
    ML.forEach((m, i) => { if (!P || i % 2) add(svg, 'text', { x: X(i), y: F.h + 44, 'text-anchor': 'middle', class: 'lab' }, m); });
    let d = `M${X(0)},${Y(NW[0])}`; for (let i = 1; i < 12; i++) d += ` L${X(i)},${Y(NW[i])}`;
    const line = add(svg, 'path', { d, fill: 'none', stroke: IND, 'stroke-width': 7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }); line.style.strokeDasharray = 3000;
    const head = add(svg, 'circle', { r: 13, fill: IND, stroke: '#fff', 'stroke-width': 5 });
    const tick = E.div('abs card6', s, `<div style="font:600 26px Roboto;color:${MUTED}">Net worth</div><div class="v" style="font:800 64px Urbanist;color:${IND}">$48,100</div>`, P ? { left: '90px', top: '420px', padding: '18px 28px' } : { right: W - F.x - F.w + 'px', top: '100px', padding: '18px 30px' });
    E.ft(tick, 22.6, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 });
    E.frame((t) => {
      if (t < 22.4 || t > 28.0) return; const p = eo(pr(t, 22.7, 25.0)); const len = line.getTotalLength(); line.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
      const pt = line.getPointAtLength(len * p); head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      const k = Math.min(11, p * 11); const iv = Math.floor(k), fr = k - iv; const val = (NW[iv] + ((NW[Math.min(11, iv + 1)] || NW[11]) - NW[iv]) * fr) * 1000;
      tick.querySelector('.v').textContent = fmt(val);
      const q = eo(pr(t, 25.2, 26.4));
      bars.forEach(({ a, l, i }) => { const ha = ((ASSETS[i] - min) / (max - min)) * F.h * q; const hl = ((ASSETS[i] - NW[i]) / (max - min)) * F.h * q; a.setAttribute('y', F.h - ha); a.setAttribute('height', ha); l.setAttribute('y', F.h - ha); l.setAttribute('height', hl); });
    });
    const leg = E.div('abs', s, `<span style="display:inline-flex;align-items:center;gap:10px;margin-right:26px"><i style="width:22px;height:6px;border-radius:3px;background:${IND}"></i>Net worth</span><span style="display:inline-flex;align-items:center;gap:10px;margin-right:26px"><i style="width:20px;height:20px;border-radius:5px;background:${AST};opacity:.35"></i>Assets</span><span style="display:inline-flex;align-items:center;gap:10px"><i style="width:20px;height:20px;border-radius:5px;background:${LIA};opacity:.7"></i>Liabilities</span>`, { left: F.x + 'px', top: F.y + F.h + 80 + 'px', font: `600 ${L(26, 28)}px Roboto`, color: INK });
    E.ft(leg, 25.2, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }); E.cue(25.2, 'whoosh', { gain: 0.25 });
    for (let i = 0; i < 8; i++) E.cue(22.8 + i * 0.28, 'tick' in {} ? 'click' : 'click', { gain: 0.18 });
  }

  /* ---------- S7 28.0–30.8 Account balances ---------- */
  s = sc(28.0, 30.8);
  header(s, 28.0, 'Report 5', 'Account balances');
  { const ACC = [['Main Checking', 8240], ['Savings', 24600], ['Brokerage', 31950], ['Cash Wallet', 318], ['Everyday Card', -1284], ['Car Loan', -4650]];
    // one linear scale for every bar (negatives are not exaggerated)
    const max = 32000; const zeroX = P ? 250 : F.x + 600, span = P ? 600 : 860, rowH = L(86, 118), top = F.y + L(0, 20);
    ACC.forEach(([n, v], i) => {
      const y = top + i * rowH;
      E.div('abs', s, n, P ? { left: '250px', top: y - 40 + 'px', font: '600 30px Roboto', color: INK } : { left: F.x + 'px', top: y + 'px', width: '400px', font: '600 32px Roboto', color: INK, lineHeight: '60px' });
      const w = Math.max(8, (Math.abs(v) / max) * span);
      const bar = E.div('abs', s, null, { left: (v < 0 ? zeroX - w : zeroX) + 'px', top: y + 8 + 'px', width: w + 'px', height: L(44, 52) + 'px', borderRadius: '10px', background: v < 0 ? EXP : AST, transformOrigin: v < 0 ? '100% 50%' : '0% 50%' });
      const val = E.div('abs', s, (v < 0 ? '-' : '') + fmt(Math.abs(v)), { left: (v < 0 ? zeroX + 16 : zeroX + w + 16) + 'px', top: y + 'px', font: `700 ${L(32, 30)}px Roboto`, color: v < 0 ? EXP : INK, lineHeight: L(60, 70) + 'px' });
      E.ft(bar, 28.2 + i * 0.1, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power3.out' }); E.ft(val, 28.5 + i * 0.1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
      E.cue(28.2 + i * 0.1, 'pop_hi', { gain: 0.15 });
    });
    E.div('abs', s, null, { left: zeroX + 'px', top: top - 10 + 'px', width: '3px', height: ACC.length * rowH + 'px', background: '#94A3B8' });
  }

  /* ---------- S8 30.8–33.6 Monthly summary ---------- */
  s = sc(30.8, 33.6);
  header(s, 30.8, 'Report 6', 'Monthly summary');
  { const STATS = [['Total income', 43240, INC, 'trending-up'], ['Total expenses', 34776, EXP, 'trending-down'], ['Net savings', 8464, IND, 'piggy-bank'], ['Savings rate', 19.6, AST, 'percent']];
    const grid = E.div('abs', s, null, P ? { left: '70px', right: '70px', top: '470px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px' } : { left: F.x + 'px', width: F.w + 'px', top: F.y + 40 + 'px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '28px' });
    STATS.forEach(([n, v, col, ic], i) => {
      const c = E.div('card6', grid, `<div style="width:76px;height:76px;border-radius:22px;background:${col}1f;display:flex;align-items:center;justify-content:center">${E.icon(ic, 42, col, 2.2)}</div><div style="font:600 ${L(26, 28)}px Roboto;color:${MUTED};margin-top:24px">${n}</div><div class="v" style="font:800 ${L(56, 54)}px Urbanist;color:${INK};margin-top:6px">0</div><div style="font:500 22px Roboto;color:#94A3B8;margin-top:6px">May – Oct 2026</div>`, { padding: '34px 32px', borderTop: `6px solid ${col}` });
      E.ft(c, 30.9 + i * 0.12, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' });
      E.count(c.querySelector('.v'), 0, v, 31.1 + i * 0.12, 1.1, ic === 'percent' ? (x) => x.toFixed(1) + '%' : (x) => fmt(x));
      E.cue(30.9 + i * 0.12, 'pop', { gain: 0.25 });
    });
  }

  /* ---------- S9 33.6–39.2 Profit & Loss ---------- */
  s = sc(33.6, 39.2);
  header(s, 33.6, 'Report 7', 'Profit & Loss · October');
  { const ROWS = [['Income', null, 'h'], ['Salary', 6200], ['Freelance', 1240], ['Interest', 200], ['Total income', 7640, 't'], ['Expenses', null, 'h'], ['Housing', 2415], ['Groceries', 890], ['Transport', 572], ['Dining', 508], ['Utilities', 445], ['Shopping & other', 1526], ['Total expenses', 6356, 't'], ['Net income', 1284, 'n']];
    const tw = L(1160, 940), card = E.div('abs card6', s, null, { left: cx - tw / 2 + 'px', top: L(258, 430) + 'px', width: tw + 'px', padding: L('20px 44px', '26px 40px') });
    const rows = P ? ROWS : ROWS.filter((r) => !['Transport', 'Dining', 'Utilities'].includes(r[0]));
    rows.forEach(([n, v, k], i) => {
      const r = E.div('', card, `<span>${n}</span><span>${v == null ? '' : (k === 'n' ? '+' : '') + fmt(v, 2)}</span>`, { display: 'flex', justifyContent: 'space-between', font: `${k ? 700 : 400} ${k === 'n' ? L(38, 40) : L(28, 30)}px Roboto`, color: k === 'h' ? IND : k === 'n' ? '#059669' : INK, padding: L(k === 'n' ? '16px 0 8px' : '7px 0', k === 'n' ? '18px 0 8px' : '8px 0'), borderTop: k === 't' || k === 'n' ? `2px solid ${GRID}` : 'none', marginTop: k === 'h' && i ? '10px' : 0, letterSpacing: k === 'h' ? '.12em' : 0, textTransform: k === 'h' ? 'uppercase' : 'none' });
      E.ft(r, 33.8 + i * 0.13, { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.3 }); E.cue(33.8 + i * 0.13, 'type', { gain: 0.3 });
      if (k === 'n') { E.to(r, 36.6, { backgroundColor: 'rgba(16,185,129,.12)', duration: 0.4 }); E.cue(36.6, 'success', { gain: 0.45 }); }
    });
  }

  /* ---------- S10 39.2–42.0 Balance sheet ---------- */
  s = sc(39.2, 42.0);
  header(s, 39.2, 'Report 8', 'Balance Sheet');
  { const colW = L(640, 900);
    const mk = (title, rows, total, col, x, y) => { const c = E.div('abs card6', s, `<div style="font:800 30px Urbanist;color:${col};letter-spacing:.14em;text-transform:uppercase">${title}</div>` + rows.map(([n, v]) => `<div style="display:flex;justify-content:space-between;font:400 ${L(28, 28)}px Roboto;color:${INK};padding:8px 0"><span>${n}</span><span>${fmt(v)}</span></div>`).join('') + `<div style="display:flex;justify-content:space-between;font:700 ${L(34, 32)}px Roboto;color:${INK};border-top:2px solid ${GRID};margin-top:10px;padding-top:14px"><span>Total</span><span>${fmt(total)}</span></div>`, { left: x + 'px', top: y + 'px', width: colW + 'px', padding: '30px 36px' }); return c; };
    const a = mk('Assets', [['Cash & bank', 32840], ['Investments', 31950], ['Cash wallet', 318]], 65108, AST, P ? 90 : cx - colW - 40, L(300, 440));
    const b = mk('Liabilities + Equity', [['Credit card', 1284], ['Car loan', 4650], ['Equity (net worth)', 59174]], 65108, LIA, P ? 90 : cx + 40, L(300, 880));
    E.ft(a, 39.3, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.5 }); E.ft(b, 39.5, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.5 }); E.cue(39.3, 'swoosh', { gain: 0.35 });
    const eq = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:18px">${E.icon('scale', 52, IND, 2.2)} Assets = Liabilities + Equity <span style="color:#059669">✓</span></span>`, cx, L(800, 1320), { font: `800 ${L(46, 44)}px Urbanist`, color: INK, background: '#fff', borderRadius: '999px', padding: '16px 34px', boxShadow: '0 12px 30px rgba(15,23,42,.08)' });
    E.ft(eq, 40.3, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }); E.cue(40.3, 'ding', { gain: 0.45 });
  }

  /* ---------- S11 42.0–44.8 tiles + S12 44.8–47.6 headline ---------- */
  s = sc(42.0, 47.6);
  { const TILES = [['Income & expenses', 'chart-column', INC], ['Cash flow', 'chart-line', INC], ['By category', 'chart-pie', IND], ['Net worth', 'trending-up', IND], ['Balances', 'wallet', AST], ['Monthly summary', 'calendar', AST], ['Profit & Loss', 'file-text', LIA], ['Balance Sheet', 'scale', LIA]];
    const cols = P ? 2 : 4, tw = P ? 430 : 380, th = P ? 200 : 210, gap = 28;
    const gx2 = cx - (cols * tw + (cols - 1) * gap) / 2, gy2 = L(330, 420);
    const tiles = TILES.map(([n, ic, col], i) => { const x = gx2 + (i % cols) * (tw + gap), y = gy2 + Math.floor(i / cols) * (th + gap);
      const tl = E.div('abs card6', s, `<div style="width:72px;height:72px;border-radius:20px;background:${col}1f;display:flex;align-items:center;justify-content:center">${E.icon(ic, 40, col, 2.2)}</div><div style="font:800 32px Urbanist;color:${INK};margin-top:22px">${n}</div>`, { left: x + 'px', top: y + 'px', width: tw + 'px', height: th + 'px', padding: '30px' });
      E.ft(tl, 42.05 + i * 0.07, { autoAlpha: 0, scale: 0.6, rotation: (i % 2 ? 3 : -3) }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(1.8)' }); E.cue(42.05 + i * 0.07, 'pop_hi', { gain: 0.18 });
      return tl; });
    const t1 = K.ctext(s, 'Every report. From your real records.', cx, L(180, 260), {}, 't6'); if (P) { t1.style.whiteSpace = 'normal'; t1.style.width = '900px'; t1.style.fontSize = '68px'; }
    K.rise(t1, 42.1, { dist: 40 }); E.to(t1, 44.6, { autoAlpha: 0, duration: 0.2 });
    const t2 = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:20px"><i style="width:30px;height:30px;border-radius:50%;background:${INC};box-shadow:0 0 0 10px rgba(16,185,129,.2)"></i>Updated as you go.</span>`, cx, L(180, 260), {}, 't6');
    K.rise(t2, 44.85, { dist: 40 }); E.cue(44.85, 'whoosh', { gain: 0.35 });
    E.frame((t) => { if (t < 44.8 || t > 47.6) return; tiles.forEach((tl, i) => { tl.style.translate = `0 ${(Math.sin(t * 3 + i) * 6).toFixed(1)}px`; }); });
    // live pulse: numbers tick in each tile
    tiles.forEach((tl, i) => { const live = E.div('', tl, `<span style="font:600 22px Roboto;color:#059669">● live</span>`, { position: 'absolute', right: '26px', top: '26px' }); E.ft(live, 45.0 + i * 0.08, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }); });
    // collapse into logo
    tiles.forEach((tl, i) => E.to(tl, 47.2, { left: cx - 60, top: L(480, 820), width: 120, height: 120, autoAlpha: 0, duration: 0.4, ease: 'power3.in' }));
  }
  s = sc(47.6, 50.4, '#F6F8FC');
  { const lg = E.logoIcon(s, L(230, 260), { left: cx - L(115, 130) + 'px', top: L(300, 600) + 'px' });
    E.ft(lg, 47.65, { autoAlpha: 0, scale: 0.3, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2)' }); E.cue(47.65, 'pop', { gain: 0.55 });
    const wm = E.wordmark(s, { width: L(720, 760), left: cx - L(360, 380), top: L(600, 940) }); E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
    wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.1 + i * 0.04, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45 })); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
