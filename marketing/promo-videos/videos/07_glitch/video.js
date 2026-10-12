/* 07 · Glitch / Futuristic — "Your AI bookkeeper. Working in real time."  (Urbanist + JetBrains Mono) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const BG = '#050816', TXT = '#E2E8F0', DIM = '#7C8DB5', NEON = '#2F7BFF', CYAN = '#22D3EE', VIO = '#8B5CF6', RED = '#F43F5E', AMB = '#F59E0B', GRN = '#34D399';
  E.stage.style.background = BG;
  E.css(`.mono{font-family:"JetBrains Mono",monospace;letter-spacing:.02em}
    .hd7{font:800 ${L(120, 104)}px Urbanist;letter-spacing:-.01em;color:#fff;line-height:.95;text-transform:uppercase}
    .mod{font:700 ${L(26, 28)}px "JetBrains Mono";color:${CYAN};letter-spacing:.24em}
    .ln7{font:500 ${L(30, 30)}px "JetBrains Mono";color:${TXT};white-space:pre}
    .tag7{display:inline-block;font:700 ${L(24, 24)}px "JetBrains Mono";padding:4px 14px;border-radius:6px;letter-spacing:.06em}
    .panel7{border:1.5px solid rgba(47,123,255,.45);background:linear-gradient(180deg,rgba(10,22,60,.72),rgba(5,10,30,.72));box-shadow:0 0 40px rgba(47,123,255,.18), inset 0 0 30px rgba(47,123,255,.08);border-radius:14px}`);
  const cx = W / 2, cy = L(520, 820);
  const sc = (t0, t1) => E.scene(t0, t1);
  K.rand(77);
  const rnd = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

  /* ---------- persistent background: perspective grid, noise, scanlines ---------- */
  const bgS = E.scene(0, 50.4, '', { zIndex: 0 }, { static: true });
  const floor = E.div('abs', bgS, null, { left: '-50%', width: '200%', top: L(560, 1050) + 'px', height: '1400px', backgroundImage: `linear-gradient(rgba(47,123,255,.35) 2px, transparent 2px), linear-gradient(90deg, rgba(47,123,255,.35) 2px, transparent 2px)`, backgroundSize: '90px 90px', transform: 'perspective(700px) rotateX(64deg)', transformOrigin: '50% 0%', opacity: 0.55, maskImage: 'linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)', webkitMaskImage: 'linear-gradient(180deg, transparent, #000 25%)' });
  const glow = E.div('abs', bgS, null, { left: cx - 700 + 'px', top: L(380, 760) + 'px', width: '1400px', height: '420px', background: 'radial-gradient(closest-side, rgba(47,123,255,.28), transparent)', filter: 'blur(10px)' });
  E.frame((t) => { floor.style.backgroundPosition = `0px ${((t * 120) % 90).toFixed(1)}px`; });
  // noise texture (seeded)
  const nc = document.createElement('canvas'); nc.width = nc.height = 160; const ng = nc.getContext('2d'); const id = ng.createImageData(160, 160);
  for (let i = 0; i < 160 * 160; i++) { const v = Math.floor(rnd(i + 1) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 16; }
  ng.putImageData(id, 0, 0);
  const noise = E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, backgroundSize: '320px 320px', zIndex: 850, pointerEvents: 'none', mixBlendMode: 'screen' });
  const scan = E.div('fill', E.stage, null, { backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0px, rgba(0,0,0,.22) 2px, transparent 2px, transparent 4px)', zIndex: 851, pointerEvents: 'none' });
  const vig = E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%)', zIndex: 852, pointerEvents: 'none' });
  E.frame((t) => { const show = t < 50.4; noise.style.display = scan.style.display = vig.style.display = show ? '' : 'none'; const f = Math.floor(t * 6); noise.style.backgroundPosition = `${Math.floor(rnd(f) * 320)}px ${Math.floor(rnd(f + 7) * 320)}px`; });

  /* ---------- glitch system ---------- */
  const GW = [[0.0, 0.5], [2.75, 3.0], [5.55, 5.75], [11.15, 11.4], [16.75, 17.0], [22.35, 22.6], [24.6, 24.9], [28.0, 28.25], [33.55, 33.8], [39.15, 39.4], [44.75, 45.05], [47.55, 47.8], [50.0, 50.4]];
  const gAmt = (t) => { for (const [a, b] of GW) if (t >= a && t <= b) return 1 - Math.abs((t - a) / (b - a) - 0.5) * 1.2; return 0; };
  GW.forEach(([a]) => E.cue(a, 'glitch', { gain: 0.55 }));
  const glitchers = [];
  function gtext(parent, html, x, y, cls, style) {
    const wrap = K.ctext(parent, '', x, y, style || {}, cls);
    wrap.innerHTML = `<span class="g-r" style="position:absolute;inset:0;color:${RED};mix-blend-mode:screen;opacity:.85">${html}</span><span class="g-c" style="position:absolute;inset:0;color:${CYAN};mix-blend-mode:screen;opacity:.85">${html}</span><span class="g-b" style="position:relative">${html}</span>`;
    const r = wrap.querySelector('.g-r'), c = wrap.querySelector('.g-c'), b = wrap.querySelector('.g-b');
    glitchers.push({ r, c, b, seed: glitchers.length * 13 });
    return wrap;
  }
  E.frame((t) => {
    const a = gAmt(t); const f = Math.floor(t * 30);
    glitchers.forEach((g) => {
      const base = 2.5 + Math.sin(t * 2 + g.seed) * 1.5;
      const off = base + a * 26 * rnd(f + g.seed);
      g.r.style.transform = `translate(${(-off).toFixed(1)}px, ${(a * 6 * (rnd(f + 3) - 0.5)).toFixed(1)}px)`;
      g.c.style.transform = `translate(${off.toFixed(1)}px, ${(a * 6 * (rnd(f + 5) - 0.5)).toFixed(1)}px)`;
      if (a > 0.05) { const y1 = Math.floor(rnd(f + g.seed + 1) * 70), y2 = Math.floor(rnd(f + g.seed + 2) * (90 - y1)); g.b.style.clipPath = `inset(0 0 0 0)`; g.r.style.clipPath = `inset(${y1}% 0 ${100 - y1 - 18}% 0)`; g.c.style.clipPath = `inset(${y2}% 0 ${Math.max(0, 100 - y2 - 22)}% 0)`; g.b.style.transform = `translateX(${(a * 18 * (rnd(f + 9) - 0.5)).toFixed(1)}px)`; }
      else { g.r.style.clipPath = g.c.style.clipPath = 'none'; g.b.style.transform = 'none'; }
    });
    E.stage.style.filter = a > 0.3 ? `hue-rotate(${Math.floor(rnd(f) * 40 - 20)}deg)` : 'none';
  });
  // global slice-shift during glitch windows
  const slices = Array.from({ length: 5 }, () => E.div('abs', E.stage, null, { left: 0, right: 0, height: '0px', zIndex: 853, background: 'rgba(47,123,255,.0)', backdropFilter: 'none', pointerEvents: 'none', borderTop: '2px solid rgba(34,211,238,.5)' }));
  E.frame((t) => { const a = gAmt(t); const f = Math.floor(t * 30); slices.forEach((s2, i) => { if (a > 0.1 && t < 50.4) { s2.style.top = Math.floor(rnd(f * 3 + i) * H) + 'px'; s2.style.height = Math.floor(4 + rnd(f + i * 7) * 40) + 'px'; s2.style.background = `rgba(${i % 2 ? '244,63,94' : '34,211,238'},${(0.08 + a * 0.15).toFixed(2)})`; } else s2.style.height = '0px'; }); });

  /* ---------- HUD frame (corners + readouts) ---------- */
  const hud = E.scene(0, 50.4, '', { zIndex: 5 }, { static: true });
  ['tl', 'tr', 'bl', 'br'].forEach((k) => E.div('abs', hud, null, { [k[0] === 't' ? 'top' : 'bottom']: L(40, 110) + 'px', [k[1] === 'l' ? 'left' : 'right']: L(50, 40) + 'px', width: '70px', height: '70px', borderColor: 'rgba(34,211,238,.7)', borderStyle: 'solid', borderWidth: `${k[0] === 't' ? 3 : 0}px ${k[1] === 'r' ? 3 : 0}px ${k[0] === 'b' ? 3 : 0}px ${k[1] === 'l' ? 3 : 0}px` }));
  const ro1 = E.div('abs mono', hud, '', { left: L(140, 70) + 'px', top: L(52, 120) + 'px', font: `500 ${L(22, 24)}px "JetBrains Mono"`, color: DIM });
  const ro2 = E.div('abs mono', hud, '', { right: L(140, 70) + 'px', top: L(52, 120) + 'px', font: `500 ${L(22, 24)}px "JetBrains Mono"`, color: DIM, textAlign: 'right' });
  E.frame((t) => { const s = Math.floor(t); const clock = `09:41:${String(7 + s).padStart(2, '0')}`; ro1.innerHTML = `<span style="color:${GRN}">●</span> ACCOUNTE.AI · LIVE`; ro2.textContent = `${clock} · LEDGER SYNC ${Math.min(100, Math.floor(t * 40))}%`; });
  E.ft([ro1, ro2], 0.2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });

  /* ---------- S1 boot + headline ---------- */
  let s = sc(0, 2.8);
  const boot = E.div('abs ln7', s, '', { left: L(140, 80) + 'px', top: L(150, 300) + 'px', color: CYAN, fontSize: L(26, 26) + 'px', lineHeight: 1.6 });
  E.type(boot, '> accounte.ai --init\n> loading ledger ........ ok\n> categorizer ........... ok\n> anomaly watch ......... ok', 0.0, 0.9, { sfx: false });
  for (let i = 0; i < 8; i++) E.cue(0.05 + i * 0.1, 'type', { gain: 0.25 });
  const h1 = gtext(s, P ? 'Your AI<br>bookkeeper' : 'Your AI bookkeeper', cx, L(cy + 20, cy - 20), 'hd7');
  E.ft(h1, 0.9, { autoAlpha: 0, scaleY: 0.05 }, { autoAlpha: 1, scaleY: 1, duration: 0.35, ease: 'expo.out' }); E.cue(0.9, 'impact', { gain: 0.5 });
  const sub1 = K.ctext(s, 'IS ONLINE', cx, L(cy + 150, cy + 210), { font: `700 ${L(34, 36)}px "JetBrains Mono"`, color: GRN, letterSpacing: '.4em' });
  E.set(sub1, 0, { autoAlpha: 0 }); E.frame((t) => { if (t < 2.8) sub1.style.opacity = t < 1.5 ? 0 : (t < 2.0 && Math.floor(t * 20) % 2 ? 0.25 : 1); }); E.set(sub1, 1.5, { visibility: 'inherit' }); E.cue(1.5, 'beep', { gain: 0.4 });

  /* ---------- S2 working in real time ---------- */
  s = sc(2.8, 5.6);
  const ring = E.div('abs', s, `<svg width="560" height="560" viewBox="0 0 560 560"><circle cx="280" cy="280" r="250" fill="none" stroke="rgba(47,123,255,.35)" stroke-width="2"/><circle class="r1" cx="280" cy="280" r="220" fill="none" stroke="${NEON}" stroke-width="6" stroke-dasharray="60 30 120 40 20 30"/><circle class="r2" cx="280" cy="280" r="180" fill="none" stroke="${CYAN}" stroke-width="3" stroke-dasharray="4 10"/><circle cx="280" cy="280" r="120" fill="rgba(47,123,255,.12)" stroke="rgba(34,211,238,.5)" stroke-width="2"/></svg>`, { left: cx - 280 + 'px', top: L(cy - 280, cy - 380) + 'px' });
  const r1 = ring.querySelector('.r1'), r2 = ring.querySelector('.r2');
  E.frame((t) => { r1.setAttribute('transform', `rotate(${(t * 40).toFixed(1)} 280 280)`); r2.setAttribute('transform', `rotate(${(-t * 25).toFixed(1)} 280 280)`); });
  const live = K.ctext(s, `<span style="color:${GRN}">●</span> LIVE`, cx, L(cy - 10, cy - 100), { font: `800 ${L(56, 60)}px "JetBrains Mono"`, color: '#fff' });
  E.frame((t) => { if (t >= 2.8 && t < 5.6) live.firstChild.style.opacity = (Math.floor(t * 3) % 2 ? 0.35 : 1); });
  E.ft(ring, 2.85, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
  const h2 = gtext(s, P ? 'Working in<br>real time.' : 'Working in real time.', cx, L(cy + 330, cy + 290), 'hd7', { fontSize: L(96, 92) + 'px' });
  E.ft(h2, 3.0, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.35 });
  const beam = E.div('abs', s, null, { left: 0, right: 0, height: '4px', background: CYAN, boxShadow: `0 0 30px 8px ${CYAN}` });
  E.frame((t) => { if (t >= 2.8 && t < 5.6) beam.style.top = ((t - 2.8) / 2.8 * H).toFixed(1) + 'px'; });
  E.cue(2.85, 'scan', { gain: 0.45 });

  /* ---------- S3/S4 transaction stream ---------- */
  const TX = [['09:41:12', 'CORNER CAFE', '-5.40', 'FOOD & DINING', AMB], ['09:41:18', 'CITY TRANSIT', '-2.75', 'TRANSPORT', CYAN], ['09:41:25', 'NORTHWIND HOSTING', '-29.00', 'SOFTWARE', NEON], ['09:42:03', 'PAYROLL DEPOSIT', '+4,200.00', 'SALARY', GRN], ['09:42:31', 'GREEN LEAF MARKET', '-18.82', 'GROCERIES', GRN], ['09:43:10', 'POWER & LIGHT CO', '-92.40', 'UTILITIES', VIO], ['09:43:44', 'FUEL STOP', '-54.10', 'TRANSPORT', CYAN]];
  s = sc(5.6, 11.2);
  { const mod = K.ctext(s, 'STREAM · INCOMING TRANSACTIONS', cx, L(140, 300), {}, 'mod'); E.ft(mod, 5.65, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    const panel = E.div('abs panel7', s, null, { left: L(cx - 760, 50) + 'px', width: L(1520, 980) + 'px', top: L(210, 380) + 'px', height: L(640, 880) + 'px', overflow: 'hidden' });
    const rows = TX.map((r, i) => {
      const row = E.div('abs', panel, `<span class="ln7" style="color:${DIM}">${r[0]}</span><span class="ln7" style="flex:1;margin-left:${L(30, 18)}px">${r[1]}</span><span class="ln7" style="color:${r[2][0] === '+' ? GRN : TXT};margin-right:${L(26, 14)}px">${r[2]}</span><span class="tag7" style="color:${BG};background:${r[4]};min-width:${L(260, 230)}px;text-align:center">→ ${r[3]}</span>`, { left: L(40, 26) + 'px', right: L(40, 26) + 'px', top: 30 + i * L(84, 118) + 'px', height: L(64, 96) + 'px', display: 'flex', alignItems: 'center', flexWrap: P ? 'wrap' : 'nowrap', borderBottom: '1px solid rgba(47,123,255,.18)' });
      if (P) { row.children[1].style.flex = '1 1 60%'; row.children[3].style.marginLeft = 'auto'; }
      E.ft(row, 5.9 + i * 0.32, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: 'power2.out' }); E.cue(5.9 + i * 0.32, 'data', { gain: 0.25 });
      const tag = row.querySelector('.tag7');
      E.ft(tag, 8.5 + i * 0.22, { autoAlpha: 0, scaleX: 0, transformOrigin: '0% 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.25, ease: 'power3.out' }); E.cue(8.5 + i * 0.22, 'beep', { gain: 0.18 });
      return row;
    });
    const auto = K.ctext(s, `<span style="color:${GRN}">✓</span> CATEGORIZED AUTOMATICALLY`, cx, L(910, 1310), { font: `700 ${L(34, 32)}px "JetBrains Mono"`, color: '#fff', letterSpacing: '.1em' });
    E.ft(auto, 10.2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }); E.cue(10.2, 'success', { gain: 0.35 }); }

  /* ---------- module header helper ---------- */
  function module(t0, t1, n, title) {
    const s2 = sc(t0, t1);
    const m = K.ctext(s2, `MODULE ${n}`, cx, L(120, 290), {}, 'mod'); E.ft(m, t0 + 0.02, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 });
    const h = gtext(s2, title, cx, L(205, 380), 'hd7', { fontSize: L(76, 66) + 'px', whiteSpace: P ? 'normal' : 'nowrap', width: P ? '960px' : 'auto' });
    E.ft(h, t0 + 0.05, { autoAlpha: 0, scaleY: 0.1 }, { autoAlpha: 1, scaleY: 1, duration: 0.3, ease: 'expo.out' });
    return s2;
  }

  /* ---------- M01 auto-categorization 11.2–16.8 ---------- */
  s = module(11.2, 16.8, '01', 'Auto-categorization');
  { const CATS = [['GROCERIES', GRN], ['TRANSPORT', CYAN], ['FOOD & DINING', AMB], ['UTILITIES', VIO], ['SOFTWARE', NEON], ['SALARY', '#22C55E']];
    const R = L(250, 270), ccx = cx, ccy = L(cy + 110, cy + 130);
    const svgW = R * 2 + 360;
    const wheel = E.div('abs', s, null, { left: ccx - svgW / 2 + 'px', top: ccy - svgW / 2 + 'px', width: svgW + 'px', height: svgW + 'px' });
    const C = 2 * Math.PI * R;
    wheel.innerHTML = `<svg width="${svgW}" height="${svgW}">${CATS.map(([n, col], i) => `<circle cx="${svgW / 2}" cy="${svgW / 2}" r="${R}" fill="none" stroke="${col}" stroke-width="44" stroke-dasharray="${C / 6 - 14} ${C}" transform="rotate(${-90 + i * 60} ${svgW / 2} ${svgW / 2})" class="seg" opacity=".9"/>`).join('')}<circle cx="${svgW / 2}" cy="${svgW / 2}" r="${R - 70}" fill="rgba(47,123,255,.1)" stroke="rgba(34,211,238,.4)" stroke-width="2"/></svg>`;
    const segs = [...wheel.querySelectorAll('.seg')];
    E.ft(segs, 11.4, { attr: { 'stroke-dasharray': `0 ${C}` } }, { attr: { 'stroke-dasharray': `${C / 6 - 14} ${C}` }, duration: 0.5, stagger: 0.07, ease: 'power3.out' });
    const counts = CATS.map(([n, col], i) => { const a = (-90 + i * 60 + 30) * Math.PI / 180; const lx = ccx + Math.cos(a) * (R + L(150, 120)), ly = ccy + Math.sin(a) * (R + L(90, 120)); const c = K.ctext(s, `<div style="font:700 ${L(22, 22)}px 'JetBrains Mono';color:${col};letter-spacing:.08em">${n}</div><div class="n" style="font:800 ${L(40, 40)}px 'JetBrains Mono';color:#fff">0</div>`, lx, ly, {}); E.ft(c, 11.6 + i * 0.07, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }); return c.querySelector('.n'); });
    const core = K.ctext(s, E.icon('sparkles', 110, CYAN, 1.6), ccx, ccy, {}); E.pop(core, 11.5, 0.5);
    // chips fly from centre into sectors and counters tick
    const NCH = 30; const chips = Array.from({ length: NCH }, (_, k) => E.div('abs', s, null, { width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px', borderRadius: '5px', background: CATS[k % 6][1], boxShadow: `0 0 12px ${CATS[k % 6][1]}` }));
    E.frame((t) => {
      if (t < 11.2 || t > 16.8) return;
      chips.forEach((c, k) => { const st = 14.0 + k * 0.08; const p = Math.max(0, Math.min(1, (t - st) / 0.5)); const a = (-90 + (k % 6) * 60 + 30 + (rnd(k) - 0.5) * 30) * Math.PI / 180; const e = 1 - Math.pow(1 - p, 3);
        const x = ccx + Math.cos(a) * R * e, y = ccy + Math.sin(a) * R * e; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.opacity = p > 0 && p < 1 ? 1 : 0; });
      counts.forEach((n, i) => { let v = 0; for (let k = i; k < NCH; k += 6) if (t > 14.5 + k * 0.08) v++; v += [11, 8, 6, 4, 3, 1][i]; const sv = String(v); if (n.__l !== sv) { n.textContent = sv; n.__l = sv; } });
    });
    for (let k = 0; k < 10; k++) E.cue(14.0 + k * 0.24, 'pop_hi', { gain: 0.12 }); }

  /* ---------- M02 learns 16.8–22.4 ---------- */
  s = module(16.8, 22.4, '02', 'Learns from your corrections');
  { const panel = E.div('abs panel7', s, null, { left: L(cx - 720, 50) + 'px', width: L(1440, 980) + 'px', top: L(330, 520) + 'px', padding: L('34px 44px', '30px 32px') });
    const line = (merchant, amt, tagHtml) => `<div style="display:flex;align-items:center;gap:${L(26, 16)}px;flex-wrap:wrap"><span class="ln7" style="flex:1;font-size:${L(34, 32)}px">${merchant}</span><span class="ln7" style="font-size:${L(34, 32)}px">${amt}</span>${tagHtml}</div>`;
    const l1 = E.div('', panel, line('PAGE TURNER BOOKS', '-18.99', `<span class="t-old tag7" style="color:${BG};background:#94A3B8;position:relative">→ SHOPPING</span><span class="t-new tag7" style="color:${BG};background:${GRN}">→ EDUCATION</span>`));
    const told = l1.querySelector('.t-old'), tnew = l1.querySelector('.t-new');
    const strike = E.div('abs', told, null, { left: '-4px', right: '-4px', top: '50%', height: '4px', background: RED, transformOrigin: '0 50%' });
    E.ft(l1, 17.0, { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 0.3 });
    const cursor = E.div('abs', s, `<svg width="44" height="56" viewBox="0 0 22 28"><path d="M2 2 L2 22 L7 17 L11 26 L14 24.5 L10 16 L17 16 Z" fill="#fff" stroke="#000" stroke-width="1.5"/></svg>`, { left: '0px', top: '0px', zIndex: 20 });
    E.ft(cursor, 17.4, { autoAlpha: 0, x: L(cx + 300, 700), y: L(800, 1100) }, { autoAlpha: 1, x: L(cx + 380, 800), y: L(410, 600), duration: 0.8, ease: 'power3.inOut' });
    E.ft(strike, 18.3, { scaleX: 0 }, { scaleX: 1, duration: 0.25 }); E.cue(18.3, 'click', { gain: 0.6 });
    E.ft(tnew, 18.6, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }); E.cue(18.6, 'pop', { gain: 0.4 });
    E.to(cursor, 19.4, { autoAlpha: 0, duration: 0.2 });
    const rule = E.div('', panel, `<span style="color:${GRN}">✓ RULE LEARNED</span><span style="color:${DIM}">  merchant = PAGE TURNER BOOKS → EDUCATION</span>`, { marginTop: L('34px', '30px'), font: `700 ${L(30, 26)}px "JetBrains Mono"`, color: '#fff', whiteSpace: P ? 'normal' : 'pre' });
    E.ft(rule, 19.7, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, repeat: 2, yoyo: false }); E.cue(19.7, 'success', { gain: 0.4 });
    const l2 = E.div('', panel, line('PAGE TURNER BOOKS', '-12.50', `<span class="tag7" style="color:${BG};background:${GRN}">→ EDUCATION</span><span class="tag7" style="color:${CYAN};border:1.5px solid ${CYAN}">AUTO</span>`), { marginTop: L('34px', '30px'), paddingTop: L('28px', '24px'), borderTop: '1px solid rgba(47,123,255,.25)' });
    E.ft(l2, 20.8, { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 0.3 }); E.cue(20.8, 'data', { gain: 0.3 }); }

  /* ---------- M03 duplicates 22.4–28.0 ---------- */
  s = module(22.4, 28.0, '03', 'Duplicate check');
  { const panel = E.div('abs panel7', s, null, { left: L(cx - 720, 50) + 'px', width: L(1440, 980) + 'px', top: L(340, 540) + 'px', padding: L('34px 44px', '30px 32px') });
    const mk = (y) => E.div('', panel, `<span class="ln7" style="color:${DIM}">10/05</span><span class="ln7" style="flex:1;margin-left:24px">POWER &amp; LIGHT CO</span><span class="ln7">-145.00</span>`, { display: 'flex', alignItems: 'center', padding: '16px 0', position: 'relative' });
    const a = mk(), b = mk();
    E.ft(a, 22.6, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.3 }); E.ft(b, 22.9, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.3 });
    E.to(b, 23.6, { y: -40, duration: 0.25, ease: 'power3.in' }); E.to(b, 23.85, { y: 0, duration: 0.3, ease: 'back.out(3)' }); E.cue(23.7, 'glitch', { gain: 0.5 });
    const box = E.div('abs', panel, null, { left: '20px', right: '20px', top: '20px', bottom: L('80px', '84px'), border: `3px solid ${RED}`, borderRadius: '10px', boxShadow: `0 0 30px rgba(244,63,94,.45)` });
    E.ft(box, 23.9, { autoAlpha: 0, scale: 1.1 }, { autoAlpha: 1, scale: 1, duration: 0.25 });
    const lab = E.div('', panel, `${E.icon('triangle-alert', 36, RED, 2.4)} POSSIBLE DUPLICATE`, { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '22px', font: `800 ${L(32, 30)}px "JetBrains Mono"`, color: RED, letterSpacing: '.1em' });
    E.ft(lab, 24.0, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }); E.cue(24.0, 'error', { gain: 0.45 });
    const flag = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:16px;border:2px solid ${AMB};color:${AMB};padding:16px 30px;border-radius:12px;font:800 ${L(36, 34)}px 'JetBrains Mono';letter-spacing:.12em">${E.icon('flag', 40, AMB, 2.4)} FLAGGED FOR YOUR REVIEW</span>`, cx, L(830, 1160), {});
    E.ft(flag, 25.3, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 }); E.cue(25.3, 'notify', { gain: 0.4 });
    E.to(b, 25.4, { opacity: 0.45, duration: 0.3 }); }

  /* ---------- M04 anomaly 28.0–33.6 ---------- */
  s = module(28.0, 33.6, '04', 'Unusual amounts');
  { const VALS = [60, 60, 60, 60, 60, 189], MON = ['MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT'];
    const cw = L(1100, 900), chh = L(380, 480), x0 = cx - cw / 2, y0 = L(360, 580);
    const bars = VALS.map((v, i) => { const bw = cw / 6 * 0.5; const x = x0 + (i + 0.25) * (cw / 6); const h = (v / 200) * chh;
      const b = E.div('abs', s, null, { left: x + 'px', top: y0 + chh - h + 'px', width: bw + 'px', height: h + 'px', background: i === 5 ? AMB : 'rgba(47,123,255,.7)', boxShadow: i === 5 ? `0 0 30px ${AMB}` : 'none', borderRadius: '6px 6px 0 0', transformOrigin: '50% 100%' });
      E.div('abs mono', s, MON[i], { left: x - 10 + 'px', top: y0 + chh + 14 + 'px', width: bw + 20 + 'px', textAlign: 'center', font: `600 ${L(22, 24)}px "JetBrains Mono"`, color: DIM });
      E.ft(b, 28.3 + i * 0.12, { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: i === 5 ? 'back.out(2)' : 'power3.out' }); return b; });
    E.cue(28.9, 'rise', { gain: 0.3 });
    const usual = E.div('abs', s, null, { left: x0 + 'px', width: cw + 'px', top: y0 + chh - (60 / 200) * chh + 'px', borderTop: `2px dashed ${CYAN}` });
    E.ft(usual, 29.2, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.5 });
    const lab = E.div('abs', s, `<span class="ln7" style="color:#fff">INTERNET  <span style="color:${AMB}">-189.00</span></span><br><span class="ln7" style="color:${DIM};font-size:${L(26, 26)}px">usually ~60.00 / month</span>`, P ? { left: '80px', top: y0 + chh + 80 + 'px' } : { left: x0 + cw + 30 + 'px', top: y0 + 'px' });
    if (!P) { lab.style.left = (x0 + cw * 0.42) + 'px'; lab.style.top = (y0 + 10) + 'px'; }
    E.ft(lab, 29.6, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    const warn = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:16px;background:rgba(245,158,11,.12);border:2px solid ${AMB};color:${AMB};padding:16px 30px;border-radius:12px;font:800 ${L(36, 34)}px 'JetBrains Mono';letter-spacing:.12em">${E.icon('triangle-alert', 40, AMB, 2.4)} UNUSUAL AMOUNT · CHECK IT?</span>`, cx, L(900, 1290), {});
    E.ft(warn, 30.9, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }); E.cue(30.9, 'error', { gain: 0.35 });
    E.frame((t) => { if (t >= 30.9 && t < 33.6) warn.style.opacity = (0.75 + 0.25 * Math.sin(t * 10)).toFixed(2); }); }

  /* ---------- M05 insights 33.6–39.2 ---------- */
  s = module(33.6, 39.2, '05', 'Smart insights');
  { const c1 = E.div('abs panel7', s, `<div class="mod" style="color:${DIM}">TREND</div><div style="font:800 ${L(64, 60)}px Urbanist;color:#fff;margin-top:10px">Dining <span style="color:${AMB}">▲ 18%</span></div><div class="ln7" style="color:${DIM};font-size:${L(26, 26)}px;margin-top:8px">vs last month · $508 vs $430</div><div class="bars" style="display:flex;gap:16px;align-items:flex-end;height:150px;margin-top:26px">${[52, 61, 47, 58, 72, 85].map((v, i) => `<i style="display:block;width:46px;height:${v * 1.6}px;border-radius:6px 6px 0 0;background:${i === 5 ? AMB : 'rgba(47,123,255,.65)'}"></i>`).join('')}</div>`,
      { left: L(cx - 760, 60) + 'px', top: L(320, 500) + 'px', width: L(720, 960) + 'px', padding: '36px 42px' });
    E.ft(c1, 33.8, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.ft(c1.querySelectorAll('.bars i'), 34.0, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, stagger: 0.06, duration: 0.35 }); E.cue(33.8, 'data', { gain: 0.3 });
    const REC = [['Streaming', 'tv'], ['Cloud storage', 'cloud'], ['Gym', 'dumbbell'], ['Phone plan', 'smartphone'], ['Internet', 'wifi'], ['Rent', 'house']];
    const c2 = E.div('abs panel7', s, `<div class="mod" style="color:${DIM}">RECURRING</div><div style="font:800 ${L(64, 60)}px Urbanist;color:#fff;margin-top:10px"><span style="color:${CYAN}">6</span> recurring payments found</div><div class="chips" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px">${REC.map(([n, ic]) => `<span style="display:inline-flex;align-items:center;gap:10px;border:1.5px solid rgba(34,211,238,.5);border-radius:999px;padding:10px 18px;font:600 ${L(24, 26)}px 'JetBrains Mono';color:#fff">${E.icon(ic, 26, CYAN, 2)} ${n}</span>`).join('')}</div>`,
      { left: L(cx + 40, 60) + 'px', top: L(320, 1000) + 'px', width: L(720, 960) + 'px', padding: '36px 42px' });
    E.ft(c2, 36.4, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.ft(c2.querySelectorAll('.chips span'), 36.6, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, stagger: 0.08, duration: 0.3, ease: 'back.out(2)' });
    for (let i = 0; i < 6; i++) E.cue(36.6 + i * 0.08, 'beep', { gain: 0.15 }); }

  /* ---------- M06 reconciliation 39.2–44.8 ---------- */
  s = module(39.2, 44.8, '06', 'Bank reconciliation · web');
  { const ST = [['10/01', 'RENT', '-1,850.00'], ['10/02', 'PAYROLL', '+4,200.00'], ['10/05', 'POWER & LIGHT', '-145.00'], ['10/08', 'NORTHWIND', '-29.00'], ['10/09', 'GREEN LEAF', '-18.82'], ['10/10', 'ATM WITHDRAWAL', '-80.00']];
    const colW = L(620, 450), gx = L(cx - 690, 50), gx2 = L(cx + 70, 580), y0 = L(330, 520), rh = L(78, 92);
    E.div('abs mod', s, 'BANK STATEMENT', { left: gx + 'px', top: y0 - 50 + 'px', color: DIM, fontSize: L(22, 22) + 'px' });
    E.div('abs mod', s, 'ACCOUNTE LEDGER', { left: gx2 + 'px', top: y0 - 50 + 'px', color: DIM, fontSize: L(22, 22) + 'px' });
    const svg = E.div('abs', s, `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"></svg>`, { left: 0, top: 0 }).firstChild;
    ST.forEach((r, i) => {
      const y = y0 + i * rh; const matched = i !== 5;
      const a = E.div('abs panel7', s, `<span class="ln7" style="color:${DIM};font-size:${L(24, 22)}px">${r[0]}</span><span class="ln7" style="flex:1;margin-left:14px;font-size:${L(26, 22)}px">${r[1]}</span><span class="ln7" style="font-size:${L(26, 22)}px">${r[2]}</span>`, { left: gx + 'px', top: y + 'px', width: colW + 'px', height: rh - 16 + 'px', display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '10px' });
      const b = E.div('abs panel7', s, matched ? `<span class="ln7" style="flex:1;font-size:${L(26, 22)}px">${r[1]}</span><span class="ln7" style="font-size:${L(26, 22)}px">${r[2]}</span>` : `<span class="ln7" style="flex:1;color:${AMB};font-size:${L(26, 22)}px">— no match yet —</span>`, { left: gx2 + 'px', top: y + 'px', width: colW + 'px', height: rh - 16 + 'px', display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '10px', borderColor: matched ? 'rgba(52,211,153,.5)' : 'rgba(245,158,11,.7)' });
      E.ft([a, b], 39.4 + i * 0.1, { autoAlpha: 0, x: (k) => (k ? 40 : -40) }, { autoAlpha: 1, x: 0, duration: 0.3 });
      if (matched) { const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('x1', gx + colW); ln.setAttribute('x2', gx2); ln.setAttribute('y1', y + (rh - 16) / 2); ln.setAttribute('y2', y + (rh - 16) / 2); ln.setAttribute('stroke', GRN); ln.setAttribute('stroke-width', 3); svg.appendChild(ln); E.ft(ln, 40.4 + i * 0.18, { attr: { x2: gx + colW } }, { attr: { x2: gx2 }, duration: 0.3 }); E.cue(40.4 + i * 0.18, 'beep', { gain: 0.15 }); }
    });
    const res = K.ctext(s, `<span style="color:${GRN}">MATCHED <span class="cnt-m">0</span></span>   <span style="color:${AMB}">UNMATCHED <span class="cnt-u">0</span></span>`, cx, L(880, 1180), { font: `800 ${L(44, 40)}px "JetBrains Mono"`, letterSpacing: '.08em', whiteSpace: 'pre' });
    E.ft(res, 42.0, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 });
    E.count(res.querySelector('.cnt-m'), 0, 56, 42.1, 1.0, (v) => String(Math.round(v))); E.count(res.querySelector('.cnt-u'), 0, 2, 42.1, 1.0, (v) => String(Math.round(v)));
    E.cue(42.0, 'data', { gain: 0.35 }); E.cue(43.2, 'success', { gain: 0.35 }); }

  /* ---------- 44.8 slogan ---------- */
  s = sc(44.8, 47.6);
  { const words = ['LIVE UPDATES', 'AI-POWERED', 'AUDIT-READY'];
    words.forEach((w, i) => { const g = gtext(s, w, P ? cx : 380 + i * 580, P ? 560 + i * 220 : cy, 'hd7', { fontSize: L(72, 86) + 'px' }); E.ft(g, 44.85 + i * 0.4, { autoAlpha: 0, scaleY: 0.05 }, { autoAlpha: 1, scaleY: 1, duration: 0.25, ease: 'expo.out' }); E.cue(44.85 + i * 0.4, 'impact', { gain: 0.3 }); });
    if (!P) [1, 2].forEach((i) => E.div('abs', s, null, { left: 380 + i * 580 - 290 - 4 + 'px', top: cy - 50 + 'px', width: '8px', height: '100px', background: CYAN, boxShadow: `0 0 20px ${CYAN}` })); }

  /* ---------- 47.6 resolve into logo ---------- */
  s = sc(47.6, 50.4);
  { const lg = E.logoIcon(s, L(220, 250), { left: cx - L(110, 125) + 'px', top: L(cy - 260, cy - 330) + 'px', filter: 'drop-shadow(0 0 30px rgba(47,123,255,.7))' });
    E.ft(lg, 47.7, { autoAlpha: 0, scale: 1.6, filter: 'blur(20px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }); E.cue(47.7, 'impact', { gain: 0.5 });
    const wm = E.wordmark(s, { width: L(760, 800), left: cx - L(380, 400), top: L(cy + 60, cy + 40), color: '#fff' }); E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
    wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.0 + i * 0.05, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.2, ease: 'steps(3)' }));
    const wf = E.div('fill', s, null, { background: '#F7F9FF' }); E.ft(wf, 50.05, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.in' }); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
