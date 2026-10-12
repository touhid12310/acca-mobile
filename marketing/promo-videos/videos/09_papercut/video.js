/* 09 · Paper-cut / Collage — "Plan it. Track it. Reach it."  (Bricolage Grotesque + Urbanist) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const CREAM = '#F6EFE3', KRAFT = '#D9B98C', BLUE = '#2F5BEA', SKY = '#8FB8FF', MINT = '#7FD1AE', CORAL = '#F28B82', MUST = '#F2C14E', INK = '#1B1B1F', LILAC = '#B9A6F2';
  E.stage.style.background = CREAM;
  E.css(`.cut{font:800 ${L(84, 80)}px "Bricolage Grotesque";color:${INK};letter-spacing:-.02em;line-height:1}
    .ub{font-family:Urbanist;color:${INK}} .lab9{font:800 ${L(40, 36)}px Urbanist;color:${INK}}
    .boil{will-change:transform}`);
  const cx = W / 2;
  const rnd = (seed) => { const x = Math.sin(seed * 78.233 + 12.9898) * 43758.5453; return x - Math.floor(x); };
  // paper grain pattern
  const nc = document.createElement('canvas'); nc.width = nc.height = 200; const ng = nc.getContext('2d'); const id = ng.createImageData(200, 200);
  for (let i = 0; i < 40000; i++) { const v = 120 + Math.floor(rnd(i) * 120); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 40; }
  ng.putImageData(id, 0, 0); const GRAIN = nc.toDataURL();
  const defsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); defsSvg.setAttribute('width', 0); defsSvg.setAttribute('height', 0); defsSvg.style.position = 'absolute';
  defsSvg.innerHTML = `<defs><pattern id="pgrain" width="200" height="200" patternUnits="userSpaceOnUse"><image href="${GRAIN}" width="200" height="200"/></pattern></defs>`;
  E.stage.appendChild(defsSvg);
  const grainBg = E.div('fill', E.stage, null, { backgroundImage: `url(${GRAIN})`, opacity: 0.55, zIndex: 0, mixBlendMode: 'multiply' });

  function torn(w, h, seed, jag, step) {
    jag = jag || 5; step = step || 16; const pts = [];
    const edge = (x0, y0, x1, y1, nx, ny, k) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step)); for (let i = 0; i < n; i++) { const t = i / n, j = (rnd(seed + k * 1000 + i) - 0.3) * jag; pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]); } };
    edge(0, 0, w, 0, 0, 1, 1); edge(w, 0, w, h, -1, 0, 2); edge(w, h, 0, h, 0, -1, 3); edge(0, h, 0, 0, 1, 0, 4);
    return 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
  }
  /* paper scrap: torn-edge shape + grain + shadow; HTML content on top */
  let seedN = 1;
  function paper(parent, x, y, w, h, color, opts) {
    opts = opts || {}; const sd = opts.seed || seedN++ * 7;
    const d = E.div('abs boil', parent, `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0;overflow:visible"><path d="${torn(w, h, sd, opts.jag, opts.step)}" fill="${color}"/><path d="${torn(w, h, sd, opts.jag, opts.step)}" fill="url(#pgrain)" opacity=".5"/></svg>`, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', filter: `drop-shadow(0 ${opts.sh == null ? 7 : opts.sh}px 0 rgba(60,40,20,.16))` });
    if (opts.html) { const c = E.div('abs', d, opts.html, { inset: 0 }); d.content = c; }
    d.seed = sd; if (opts.rot) gsap.set(d, { rotation: opts.rot });
    return d;
  }
  function tape(parent, x, y, w, rot) { const t = E.div('abs', parent, null, { left: x + 'px', top: y + 'px', width: (w || 120) + 'px', height: '34px', background: 'rgba(240,226,190,.75)', boxShadow: '0 2px 0 rgba(0,0,0,.06)' }); gsap.set(t, { rotation: rot || -8 }); return t; }
  // stop-motion "boil": every paper piece jitters slightly at 12 fps
  E.frame((t) => { const f = Math.floor(t * 12); document.querySelectorAll('.boil').forEach((el, i) => { const s = el.seed || i; el.style.translate = `${((rnd(f * 3 + s) - 0.5) * 2.4).toFixed(2)}px ${((rnd(f * 5 + s) - 0.5) * 2.4).toFixed(2)}px`; el.style.rotate = `${((rnd(f * 7 + s) - 0.5) * 0.7).toFixed(2)}deg`; }); });
  // stop-motion entrance (stepped)
  const stepIn = (el, t, from, d) => E.ft(el, t, Object.assign({ autoAlpha: 0 }, from), { autoAlpha: 1, x: 0, y: 0, rotation: from.rotationTo || 0, scale: 1, duration: d || 0.5, ease: 'steps(6)' });
  const sc = (t0, t1, bg) => { const s = E.scene(t0, t1); if (bg) s.style.background = bg; return s; };
  function label(s, t, text, color, x, y) { const p = paper(s, x, y, L(360, 380), L(84, 90), color || MUST, { html: `<div class="cut" style="font-size:${L(50, 54)}px;text-align:center;line-height:${L(84, 90)}px">${text}</div>`, rot: -3 }); stepIn(p, t, { y: -60, rotation: 8 }); E.cue(t, 'paper', { gain: 0.45 }); return p; }

  /* ---------- S1 hook: scissors cut a $ ---------- */
  let s = sc(0, 2.8);
  { const bigW = L(420, 460), bigH = L(520, 560), bx = cx - bigW / 2, by = L(260, 520);
    const sheet = paper(s, bx - 40, by - 30, bigW + 80, bigH + 60, KRAFT, { jag: 3 });
    const dollar = paper(s, bx, by, bigW, bigH, MINT, { html: `<div class="cut" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${L(440, 480)}px;color:#2E7D5B">$</div>`, jag: 8 });
    const dash = E.div('abs', s, `<svg width="${bigW + 20}" height="${bigH + 20}"><rect x="6" y="6" width="${bigW + 8}" height="${bigH + 8}" rx="26" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="14 12"/></svg>`, { left: bx - 10 + 'px', top: by - 10 + 'px' });
    const sci = E.div('abs', s, E.icon('scissors', 96, INK, 2.4), { left: '0px', top: '0px' });
    const per = 2 * (bigW + bigH);
    E.frame((t) => { if (t > 2.8) return; const p = Math.min(1, t / 1.2); let d = p * per, x, y, rot; if (d < bigW) { x = bx + d; y = by; rot = 0; } else if (d < bigW + bigH) { x = bx + bigW; y = by + d - bigW; rot = 90; } else if (d < 2 * bigW + bigH) { x = bx + bigW - (d - bigW - bigH); y = by + bigH; rot = 180; } else { x = bx; y = by + bigH - (d - 2 * bigW - bigH); rot = 270; }
      sci.style.left = (x - 48) + 'px'; sci.style.top = (y - 48) + 'px'; sci.style.transform = `rotate(${rot + (Math.floor(t * 12) % 2 ? 8 : -8)}deg)`; sci.style.opacity = t < 1.25 ? 1 : 0; });
    for (let i = 0; i < 6; i++) E.cue(0.05 + i * 0.2, 'snip', { gain: 0.45 });
    E.to(dash, 1.2, { autoAlpha: 0, duration: 0.1 });
    E.ft(dollar, 1.3, { y: 0, rotation: 0 }, { y: -40, rotation: -10, duration: 0.3, ease: 'power2.out' });
    E.to(dollar, 1.6, { y: 30, rotation: 6, duration: 0.4, ease: 'bounce.out' }); E.cue(1.3, 'paper', { gain: 0.5 });
    const words = P ? ['Plans', 'don’t keep', 'themselves.'] : ['Plans', 'don’t keep', 'themselves.'];
    const cols = [CORAL, SKY, MUST];
    words.forEach((w2, i) => { const ww = L(380 + w2.length * 6, 420 + w2.length * 10), hh = L(110, 116);
      const x = P ? cx - ww / 2 : [120, 1400 - 30, 1380][i] - (i ? ww / 2 : 0), y = P ? 120 + i * 0 : 0;
      const px = P ? [cx - ww / 2, cx - ww / 2, cx - ww / 2][i] : [110, cx + 330, cx + 330][i];
      const py = P ? [130, 1160, 1290][i] : [130, 640, 790][i];
      const p = paper(s, px, py, ww, hh, cols[i], { html: `<div class="cut" style="text-align:center;line-height:${hh}px;font-size:${L(76, 80)}px">${w2}</div>`, rot: [-4, 3, -2][i] });
      stepIn(p, 1.4 + i * 0.25, { y: 60, rotation: 12 }); E.cue(1.4 + i * 0.25, 'paper', { gain: 0.35 }); });
  }

  /* ---------- S2 collage logo ---------- */
  s = sc(2.8, 5.6);
  { const ic = E.logoIcon(s, L(250, 280), { left: cx - L(125, 140) + 'px', top: L(200, 470) + 'px', filter: 'drop-shadow(0 8px 0 rgba(60,40,20,.18))' });
    ic.parts.forEach((p, i) => E.ft(p, 2.9 + i * 0.2, { opacity: 0, y: -400, rotation: (i - 1) * 30 }, { opacity: 1, y: 0, rotation: 0, duration: 0.5, ease: 'steps(6)' }));
    for (let i = 0; i < 3; i++) E.cue(2.9 + i * 0.2 + 0.4, 'paper', { gain: 0.4 });
    const t1 = paper(s, cx - L(640, 450), L(560, 860), L(1280, 900), L(130, 230), '#FFFFFF', { html: `<div class="cut" style="text-align:center;padding:${L('22px', '30px')} 30px;font-size:${L(72, 70)}px"><span style="color:${BLUE}">AccountE</span> keeps them${P ? '<br>' : ' '}on track.</div>`, rot: 1.5 });
    stepIn(t1, 3.6, { y: 50 }); tape(s, cx - 60, L(540, 840), 130, -6); }

  /* ---------- S3–S5 budgets ---------- */
  s = sc(5.6, 14.0);
  { label(s, 5.65, 'Budgets', MUST, cx - L(180, 190), L(90, 250));
    const B = [['Groceries', 600, 372, MINT, 'shopping-cart'], ['Dining', 250, 188, CORAL, 'utensils'], ['Shopping', 300, 120, SKY, 'shopping-bag']];
    const ew = L(500, 860), eh = L(400, 250);
    const env = B.map(([n, max, spent, col, ic], i) => {
      const x = P ? cx - ew / 2 : 140 + i * 560, y = P ? 360 + i * 262 : 300;
      const e = paper(s, x, y, ew, eh, KRAFT, { jag: 4, rot: P ? [-1.5, 1, -1][i] : [-2, 1.5, -1][i] });
      const flap = E.div('abs', e, `<svg width="${ew}" height="${eh * 0.45}"><path d="M4 4 L${ew / 2} ${eh * 0.4} L${ew - 4} 4" fill="#C9A26E" stroke="#B48A55" stroke-width="3"/></svg>`, { left: 0, top: 0 });
      const card = E.div('abs', e, `<div style="display:flex;align-items:center;gap:14px">${E.icon(ic, 44, INK, 2.2)}<span class="lab9">${n}</span></div><div class="ub" style="font:700 ${L(30, 30)}px Urbanist;margin-top:10px;opacity:.75">Budget $${max}</div>`, { left: '36px', top: L(eh * 0.42, eh * 0.31) + 'px' });
      const track = E.div('abs', e, null, { left: '36px', right: '36px', bottom: '40px', height: '34px', background: '#F4E7CF', borderRadius: '6px', overflow: 'hidden' });
      const fill = paper(track, 0, 0, ew - 72, 34, col, { jag: 3, sh: 0 }); fill.classList.remove('boil');
      gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' });
      const pct = E.div('abs ub', e, '0%', { right: '36px', top: L(eh * 0.42, eh * 0.31) + 'px', font: `800 ${L(50, 42)}px Urbanist` });
      stepIn(e, 5.8 + i * 0.25, { x: P ? 0 : -200, y: P ? 200 : 0, rotation: -10 }); E.cue(5.8 + i * 0.25, 'paper', { gain: 0.35 });
      return { e, fill, pct, max, spent, i };
    });
    E.frame((t) => { if (t < 5.6 || t > 14) return; env.forEach(({ fill, pct, max, spent, i }) => { const target = i === 1 && t > 11.2 ? 0.75 : spent / max * (i === 1 ? 0.75 / 0.752 * 0.94 : 1); const p = Math.min(1, Math.max(0, (t - 8.5 - i * 0.2) / 1.6)); const pe = Math.floor(p * 10) / 10; const v = i === 1 ? (t < 11.2 ? 0.6 * pe : 0.6 + 0.15 * Math.min(1, Math.floor(((t - 11.2) / 0.6) * 6) / 6)) : (spent / max) * pe; fill.style.transform = `scaleX(${v.toFixed(3)})`; const s2 = Math.round(v * 100) + '%'; if (pct.__l !== s2) { pct.textContent = s2; pct.__l = s2; } }); });
    for (let i = 0; i < 6; i++) E.cue(8.6 + i * 0.3, 'paper', { gain: 0.15 });
    // alert note + bell at 11.2
    const note = paper(s, P ? cx - 430 : cx + 160, P ? 1150 : 640, L(560, 860), L(220, 165), '#FFF3A8', { html: `<div style="padding:${L('28px 34px', '20px 34px')}"><div class="ub" style="font:800 ${L(30, 32)}px Urbanist;color:#92400E;letter-spacing:.08em">HEADS UP</div><div class="cut" style="font-size:${L(46, 48)}px;margin-top:10px">75% of Dining budget used</div></div>`, rot: 3, jag: 3 });
    stepIn(note, 11.4, { y: 120, rotation: -10 }); E.cue(11.4, 'notify', { gain: 0.5 });
    const bell = E.div('abs boil', s, `<div style="width:${L(120, 130)}px;height:${L(120, 130)}px;border-radius:50%;background:${MUST};display:flex;align-items:center;justify-content:center;box-shadow:0 7px 0 rgba(60,40,20,.16)">${E.icon('bell-ring', 66, INK, 2.2)}</div>`, { left: (P ? cx + 280 : cx + 640) + 'px', top: (P ? 1090 : 590) + 'px' });
    stepIn(bell, 11.3, { scale: 0.3 }); E.frame((t) => { if (t >= 11.3 && t < 14) bell.style.rotate = `${(Math.sin(t * 24) * 14 * Math.max(0, 1 - (t - 11.3) / 1.6)).toFixed(1)}deg`; });
    tape(s, (P ? cx - 60 : cx + 380), (P ? 1132 : 620), 140, 4); }

  /* ---------- S6–S8 goals: paper mountains ---------- */
  s = sc(14.0, 22.4, '#EAF2FB');
  { label(s, 14.05, 'Goals', MINT, cx - L(180, 190), L(90, 250));
    const mt = (w, h, color, seed, x, y) => { const pts = []; const n = 14; for (let i = 0; i <= n; i++) { const t = i / n; const peak = 1 - Math.abs(t - 0.55) * 1.7; pts.push([t * w, h - Math.max(0.04, peak) * h + (rnd(seed + i) - 0.5) * 30]); } const d = 'M0,' + h + ' L' + pts.map((p) => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' L') + ` L${w},${h} Z`;
      const m = E.div('abs boil', s, `<svg width="${w}" height="${h}" style="overflow:visible"><path d="${d}" fill="${color}"/><path d="${d}" fill="url(#pgrain)" opacity=".5"/></svg>`, { left: x + 'px', top: y + 'px', filter: 'drop-shadow(0 -6px 0 rgba(60,40,20,.10))' }); m.seed = seed; return m; };
    const baseY = L(980, 1300);
    const m3 = mt(L(1500, 1300), L(560, 520), '#C7D7F2', 31, L(210, -110), baseY - L(560, 520));
    const m2 = mt(L(1300, 1100), L(660, 600), SKY, 47, L(300, -10), baseY - L(660, 600));
    const m1 = mt(L(1100, 900), L(520, 440), '#5C86E6', 63, L(420, 90), baseY - L(520, 440));
    const ground = paper(s, -40, baseY - 24, W + 80, H - baseY + 80, '#A9D8BE', { jag: 6, sh: 0 });
    [m3, m2, m1, ground].forEach((m, i) => stepIn(m, 14.1 + i * 0.2, { y: 300 })); E.cue(14.1, 'paper', { gain: 0.4 });
    const peakX = L(300 + 1300 * 0.55, -10 + 1100 * 0.55), peakY = baseY - L(660, 600) + 10;
    const flag = E.div('abs boil', s, `<svg width="160" height="200"><rect x="10" y="10" width="8" height="190" fill="${INK}"/><path d="M18 14 L150 40 L18 70 Z" fill="${CORAL}"/></svg>`, { left: peakX - 14 + 'px', top: peakY - 196 + 'px' });
    stepIn(flag, 14.6, { y: -80 });
    const goalCard = paper(s, P ? cx - 430 : 120, P ? 380 : 300, L(640, 860), L(200, 160), '#FFFFFF', { html: `<div style="padding:26px 34px"><div class="ub" style="font:800 ${L(28, 30)}px Urbanist;opacity:.6;letter-spacing:.1em">SAVINGS GOAL</div><div class="cut" style="font-size:${L(52, 54)}px;margin-top:8px">Emergency fund${P ? ' · ' : '<br>'}$5,000</div></div>`, rot: -2 });
    stepIn(goalCard, 14.9, { x: -200, rotation: -10 }); E.cue(14.9, 'paper', { gain: 0.4 });
    // climber along the ridge
    const climber = E.div('abs boil', s, `<svg width="60" height="90"><circle cx="30" cy="16" r="14" fill="${INK}"/><path d="M14 36 Q30 26 46 36 L42 80 L18 80 Z" fill="${MUST}"/></svg>`, {});
    const path = (p) => { const x0 = L(300 + 1300 * 0.12, -10 + 1100 * 0.12), y0 = baseY - L(160, 150); return [x0 + (peakX - x0) * p, y0 + (peakY - y0) * p - Math.sin(p * Math.PI * 3) * 20]; };
    const saved = paper(s, P ? cx - 40 : cx + 300, P ? 1010 : 330, L(560, 520), L(150, 150), MUST, { html: `<div style="padding:22px 30px;display:flex;align-items:baseline;gap:18px"><span class="cut sv" style="font-size:${L(64, 66)}px">$0</span><span class="ub" style="font:800 ${L(32, 34)}px Urbanist">saved · <span class="pc">0%</span></span></div>`, rot: 2 });
    stepIn(saved, 16.8, { y: 80 });
    E.frame((t) => { if (t < 14 || t > 22.4) return; const p = Math.min(1, Math.max(0, (t - 16.9) / 2.2)); const q = Math.floor(p * 12) / 12 * 0.62; const [x, y] = path(Math.max(0.0, q)); climber.style.left = (x - 30) + 'px'; climber.style.top = (y - 86) + 'px';
      const v = Math.round(5000 * q / 10) * 10; const sv = saved.querySelector('.sv'), pc = saved.querySelector('.pc'); const s1 = '$' + v.toLocaleString('en-US'); if (sv.__l !== s1) { sv.textContent = s1; sv.__l = s1; } const s2 = Math.round(q * 100) + '%'; if (pc.__l !== s2) { pc.textContent = s2; pc.__l = s2; } });
    E.set(climber, 14.0, { autoAlpha: 0 }); E.set(climber, 16.8, { autoAlpha: 1 }); for (let i = 0; i < 8; i++) E.cue(16.9 + i * 0.28, 'click', { gain: 0.2 });
    const [mx, my] = path(0.7);
    const ms = paper(s, P ? mx - 360 : mx - 430, P ? my - 210 : my + 50, L(330, 340), L(110, 110), '#FFFFFF', { html: `<div class="cut" style="font-size:${L(38, 40)}px;text-align:center;line-height:${L(110, 110)}px">Next stop: $3,500</div>`, rot: -3 });
    stepIn(ms, 19.7, { scale: 0.4 }); E.cue(19.7, 'pop', { gain: 0.4 });
    const conf = Array.from({ length: 18 }, (_, i) => E.div('abs', s, null, { width: '18px', height: '12px', background: [CORAL, MUST, MINT, SKY, LILAC][i % 5], left: mx + 'px', top: my - 100 + 'px', opacity: 0 }));
    E.frame((t) => { if (t < 19.7 || t > 22.4) { conf.forEach((c) => (c.style.opacity = 0)); return; } const u = Math.floor((t - 19.7) * 12) / 12; conf.forEach((c, i) => { const a = rnd(i) * Math.PI * 2, v = 200 + rnd(i + 3) * 300; c.style.opacity = 1; c.style.transform = `translate(${(Math.cos(a) * v * u).toFixed(1)}px, ${(-Math.abs(Math.sin(a)) * v * u + 400 * u * u).toFixed(1)}px) rotate(${(u * 400 + i * 30).toFixed(0)}deg)`; }); }); }

  /* ---------- S9–S11 loans ---------- */
  s = sc(22.4, 30.8);
  { label(s, 22.45, 'Loans', CORAL, cx - L(180, 190), L(90, 250));
    const tw = L(1000, 900), th = L(300, 330), tx = cx - tw / 2, ty = L(260, 430);
    const ticket = paper(s, tx, ty, tw, th, '#FFFFFF', { jag: 2, rot: -1.5, html: `<div style="position:absolute;left:${tw * 0.7}px;top:10px;bottom:10px;border-left:5px dashed #E5D9C3"></div><div style="padding:${L('34px 44px', '36px 40px')}"><div class="ub" style="font:800 ${L(28, 30)}px Urbanist;opacity:.6;letter-spacing:.1em">LOAN · BORROWED</div><div class="cut" style="font-size:${L(76, 70)}px;margin-top:10px">Car loan</div><div class="ub" style="font:700 ${L(34, 32)}px Urbanist;margin-top:14px">$9,000 · 9.5% APR · $250 / month</div></div><div style="position:absolute;right:${L(46, 30)}px;top:${L(70, 80)}px;text-align:center"><div class="ub" style="font:700 26px Urbanist;opacity:.6">REMAINING</div><div class="cut rem" style="font-size:${L(64, 54)}px;color:${CORAL}">$9,000</div></div>` });
    stepIn(ticket, 22.6, { y: -300, rotation: 10 }); E.cue(22.6, 'stamp', { gain: 0.45 });
    // payoff path 25.2
    const pw = L(1300, 840), px0 = cx - pw / 2, py0 = L(700, 960);
    const months = ['Oct ’26', 'Apr ’27', 'Oct ’27', 'Jun ’28'];
    const pathEl = E.div('abs', s, `<svg width="${pw}" height="160" style="overflow:visible"><path class="pp" d="M0,120 C${pw * 0.3},120 ${pw * 0.35},30 ${pw * 0.6},50 S${pw * 0.9},20 ${pw},10" fill="none" stroke="${INK}" stroke-width="5" stroke-dasharray="14 12" stroke-linecap="round"/></svg>`, { left: px0 + 'px', top: py0 + 'px' });
    const pp = pathEl.querySelector('.pp'); const plen = 2000; pp.style.strokeDasharray = '14 12';
    E.ft(pathEl, 25.2, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'steps(10)' });
    const marks = []; months.forEach((m, i) => { const x = px0 + (pw * i) / 3; const y = py0 + [120, 70, 40, 10][i]; const mk = paper(s, x - 70, y + 30, 140, 64, i === 3 ? MINT : '#FFFFFF', { html: `<div class="ub" style="font:800 26px Urbanist;text-align:center;line-height:64px">${m}</div>`, rot: (i % 2 ? 3 : -3) }); marks.push(mk); stepIn(mk, 25.4 + i * 0.35, { y: 40 }); E.cue(25.4 + i * 0.35, 'stamp', { gain: 0.25 }); });
    const proj = paper(s, px0 + pw - L(380, 360), py0 - L(140, 170), L(420, 400), L(100, 100), MINT, { html: `<div class="cut" style="font-size:${L(38, 38)}px;text-align:center;line-height:${L(100, 100)}px">Projected payoff 🏁</div>`, rot: 2 });
    stepIn(proj, 26.6, { scale: 0.4 }); E.cue(26.6, 'success', { gain: 0.35 });
    // remaining 28.0
    const rem = ticket.querySelector('.rem'); E.count(rem, 9000, 4650, 28.1, 1.0, (v) => '$' + Math.round(v).toLocaleString('en-US'), 'steps(12)');
    const bar = paper(s, cx - L(500, 430), L(760, 1000), L(1000, 860), 70, '#F1E4CC', { jag: 3, html: `<div class="pf" style="position:absolute;left:0;top:0;bottom:0;width:48.3%;background:${CORAL};border-radius:4px;transform-origin:0 50%"></div><div class="ub" style="position:absolute;right:20px;top:0;line-height:70px;font:800 30px Urbanist">48% paid off</div>` });
    E.set(bar, 22.4, { autoAlpha: 0 }); stepIn(bar, 28.1, { y: 60 }); E.ft(bar.querySelector('.pf'), 28.3, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'steps(8)' });
    E.to([pathEl, proj].concat(marks), 27.9, { autoAlpha: 0, duration: 0.15 }); }

  /* ---------- S12–S13 borrowed & lent ---------- */
  s = sc(30.8, 36.4);
  { label(s, 30.85, P ? 'Lent & borrowed' : 'Lent & borrowed', LILAC, cx - L(220, 220), L(90, 250)).style.width = L(440, 440) + 'px';
    const hand = (flip) => `<svg width="240" height="160" style="transform:scaleX(${flip ? -1 : 1})"><path d="M0 60 L120 60 Q150 60 160 40 Q170 20 190 30 Q205 40 195 62 L230 62 Q240 64 236 78 L200 80 L232 82 Q240 90 232 100 L196 102 L226 104 Q232 116 222 122 L192 124 L210 126 Q214 140 200 142 L110 142 Q60 142 0 122 Z" fill="#E9C9A6" stroke="#C9A27E" stroke-width="3"/><rect x="0" y="56" width="70" height="92" fill="${flip ? SKY : MINT}"/></svg>`;
    const hl = E.div('abs boil', s, hand(false), { left: L(80, -20) + 'px', top: L(470, 1210) + 'px' }); const hr = E.div('abs boil', s, hand(true), { left: L(W - 320, W - 220) + 'px', top: L(470, 1210) + 'px' });
    stepIn(hl, 31.0, { x: -300 }); stepIn(hr, 31.0, { x: 300 });
    const iou1 = paper(s, cx - L(380, 380), L(330, 560), L(760, 760), L(180, 190), '#FFFFFF', { rot: -3, html: `<div style="padding:24px 34px"><div class="ub" style="font:800 26px Urbanist;opacity:.55;letter-spacing:.12em">IOU · LENT</div><div class="cut" style="font-size:${L(54, 54)}px;margin-top:8px">Lent to Sam · $300</div></div>` });
    E.ft(iou1, 31.3, { autoAlpha: 0, x: -360, rotation: -20 }, { autoAlpha: 1, x: 0, rotation: -3, duration: 0.9, ease: 'steps(8)' }); E.cue(31.3, 'paper', { gain: 0.45 });
    const iou2 = paper(s, cx - L(380, 380), L(560, 820), L(760, 760), L(180, 190), '#FFF3A8', { rot: 3, html: `<div style="padding:24px 34px"><div class="ub" style="font:800 26px Urbanist;opacity:.55;letter-spacing:.12em">IOU · BORROWED</div><div class="cut" style="font-size:${L(48, 46)}px;margin-top:8px">Borrowed from Maya · $150</div></div>` });
    E.ft(iou2, 33.7, { autoAlpha: 0, x: 360, rotation: 20 }, { autoAlpha: 1, x: 0, rotation: 3, duration: 0.9, ease: 'steps(8)' }); E.cue(33.7, 'paper', { gain: 0.45 });
    const who = paper(s, cx - L(300, 320), L(800, 1080), L(600, 640), L(100, 104), MUST, { rot: -1, html: `<div class="cut" style="font-size:${L(44, 46)}px;text-align:center;line-height:${L(100, 104)}px">Who owes whom, sorted.</div>` });
    stepIn(who, 34.6, { y: 60 }); E.cue(34.6, 'stamp', { gain: 0.3 }); }

  /* ---------- S14–S15 recurring calendar ---------- */
  s = sc(36.4, 42.0);
  { label(s, 36.45, 'Recurring', SKY, cx - L(200, 200), L(90, 250)).style.width = L(400, 400) + 'px';
    const cw = L(1060, 920), ch = L(640, 640), cx0 = cx - cw / 2, cy0 = L(220, 380);
    const cal = paper(s, cx0, cy0, cw, ch, '#FFFFFF', { jag: 2, rot: -1, html: `<div style="height:${L(80, 84)}px;background:${CORAL};display:flex;align-items:center;justify-content:center" class="cut"><span style="font-size:${L(46, 48)}px;color:#fff">November 2026</span></div><div class="grid9" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:16px"></div>` });
    const grid = cal.querySelector('.grid9'); const cellH = (ch - L(80, 84) - 40) / 5 - 6;
    for (let d = 1; d <= 35; d++) { const day = d - 0; E.div('', grid, day <= 30 ? `<span class="ub" style="font:700 ${L(24, 24)}px Urbanist;opacity:.55">${day}</span>` : '', { height: cellH + 'px', border: '2px solid #F1E7D6', borderRadius: '8px', padding: '6px 10px', position: 'relative' }); }
    stepIn(cal, 36.6, { y: 300, rotation: 6 }); E.cue(36.6, 'paper', { gain: 0.45 });
    const cells = grid.children;
    const STAMPS = [[1, 'Rent', CORAL], [5, 'Internet', LILAC], [19, 'Salary', MINT], [12, 'Gym', MUST]];
    STAMPS.forEach(([d, n, col], i) => { const c = cells[d - 1]; const st = E.div('abs', c, `<div style="width:100%;height:100%;border:4px solid ${col};border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 ${L(22, 22)}px Urbanist;color:${col};transform:rotate(-12deg);background:${col}22">${n}</div>`, { inset: '6px' });
      E.ft(st, 37.4 + i * 0.35, { autoAlpha: 0, scale: 2.2 }, { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'power4.in' }); E.cue(37.55 + i * 0.35, 'stamp', { gain: 0.5 }); });
    const sticky = paper(s, P ? cx - 330 : cx + 260, P ? 1050 : 560, L(520, 660), L(230, 220), '#FFF3A8', { rot: 4, jag: 2, html: `<div style="padding:30px 36px"><div style="display:flex;align-items:center;gap:12px">${E.icon('bell-ring', 40, '#92400E', 2.2)}<span class="ub" style="font:800 28px Urbanist;color:#92400E;letter-spacing:.08em">REMINDER</span></div><div class="cut" style="font-size:${L(52, 54)}px;margin-top:10px">Rent due tomorrow</div><div class="ub" style="font:700 26px Urbanist;margin-top:8px;opacity:.7">$1,850 · Main Checking</div></div>` });
    stepIn(sticky, 39.3, { y: -200, rotation: -10 }); E.cue(39.3, 'notify', { gain: 0.45 });
    const pin = E.div('abs', s, `<div style="width:44px;height:44px;border-radius:50%;background:${CORAL};box-shadow:0 5px 0 rgba(0,0,0,.18)"></div>`, { left: (P ? cx - 20 : cx + 570) + 'px', top: (P ? 1030 : 540) + 'px' }); E.set(pin, 36.4, { autoAlpha: 0 }); E.set(pin, 39.7, { autoAlpha: 1 }); }

  /* ---------- S16 corkboard collage ---------- */
  s = sc(42.0, 44.8, '#C9A16E');
  { const cork = E.div('fill', s, null, { backgroundImage: `url(${GRAIN})`, opacity: 0.9, mixBlendMode: 'multiply' });
    const items = [['Groceries · 62%', MINT], ['Dining · 75% ⚠︎', CORAL], ['Emergency fund · 62%', SKY], ['Car loan · 48% paid', '#FFFFFF'], ['Lent to Sam · $300', '#FFFFFF'], ['Rent due tomorrow', '#FFF3A8']];
    items.forEach(([t2, col], i) => { const x = P ? 90 + (i % 2) * 470 : 160 + (i % 3) * 560, y = P ? 380 + Math.floor(i / 2) * 300 : 240 + Math.floor(i / 3) * 330;
      const p = paper(s, x, y, L(480, 420), L(200, 220), col, { rot: (rnd(i + 5) - 0.5) * 10, html: `<div class="cut" style="font-size:${L(44, 42)}px;padding:30px;line-height:1.1">${t2}</div>` });
      stepIn(p, 42.05 + i * 0.12, { y: -150, rotation: 20 }); E.cue(42.05 + i * 0.12, 'paper', { gain: 0.2 });
      E.div('abs', p, `<div style="width:36px;height:36px;border-radius:50%;background:${[CORAL, BLUE, MUST][i % 3]};box-shadow:0 4px 0 rgba(0,0,0,.2)"></div>`, { left: '50%', top: '-14px', marginLeft: '-18px' }); }); }

  /* ---------- S17 headline ---------- */
  s = sc(44.8, 47.6);
  { const words = [['Plan it.', CORAL], ['Track it.', SKY], ['Reach it.', MINT]];
    words.forEach(([w2, col], i) => { const ww = L(520, 700), hh = L(170, 200);
      const p = paper(s, P ? cx - ww / 2 : 140 + i * 560, P ? 380 + i * 280 : 420, ww, hh, col, { rot: [-4, 3, -2][i], html: `<div class="cut" style="font-size:${L(96, 110)}px;text-align:center;line-height:${hh}px">${w2}</div>` });
      stepIn(p, 44.85 + i * 0.35, { y: 120, rotation: 15 }); E.cue(44.85 + i * 0.35, 'stamp', { gain: 0.45 }); }); }

  /* ---------- S18 paper logo ---------- */
  s = sc(47.6, 50.4);
  { const ic = E.logoIcon(s, L(230, 260), { left: cx - L(115, 130) + 'px', top: L(220, 520) + 'px', filter: 'drop-shadow(0 8px 0 rgba(60,40,20,.18))' });
    ic.parts.forEach((p, i) => E.ft(p, 47.65 + i * 0.15, { opacity: 0, y: -300, rotation: (i - 1) * 25 }, { opacity: 1, y: 0, rotation: 0, duration: 0.5, ease: 'steps(6)' }));
    for (let i = 0; i < 3; i++) E.cue(47.95 + i * 0.15, 'paper', { gain: 0.35 });
    const card = paper(s, cx - L(430, 450), L(540, 880), L(860, 900), L(190, 200), '#FFFFFF', { rot: -1.5, jag: 3 });
    const wm = E.wordmark(card, { width: L(700, 740), left: L(80, 80), top: L(42, 40) }); E.set(wm.glyph('icon'), 47.6, { opacity: 0 }); wm.style.translate = '0 0';
    stepIn(card, 48.3, { y: 120 }); tape(s, cx - 70, L(520, 860), 140, -5); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
