/* 13 · Feature bumper — "Receipt Scan" · 9:16 · 5 s · silent
   Shared style with 11/12. No real merchant or value: receipt and card use neutral placeholder bars.
   0–1 receipt appears · 1–3 cyan scan line top→bottom · 3–4 Merchant / Amount / Category extracted · 4–5 merged into a confirmed card. */
(function () {
  const { W, H } = E;
  E.duration = 5;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', GREEN = '#22C55E';
  const cx = W / 2;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  E.css(`.h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.028em;line-height:1}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .bar{display:block;height:14px;border-radius:7px;background:#D7DCE5}`);

  /* ---------- background (shared style) ---------- */
  E.stage.style.background = 'linear-gradient(180deg,#030A26 0%,#061650 52%,#0A2A86 100%)';
  const glowA = E.div('abs', E.stage, null, { left: '-420px', top: '-260px', width: '1300px', height: '1300px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.20),rgba(34,211,238,0))' });
  const glowB = E.div('abs', E.stage, null, { left: '120px', top: '1060px', width: '1500px', height: '1500px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(37,99,235,.42),rgba(37,99,235,0))' });
  const parts = E.div('fill', E.stage, null, { zIndex: 1, pointerEvents: 'none' });
  const dots = Array.from({ length: 34 }, (_, i) => { const sz = 2 + rnd(i + 100) * 4; return E.div('abs', parts, null, { left: '0px', top: '0px', width: sz + 'px', height: sz + 'px', borderRadius: '50%', background: i % 3 === 0 ? CYAN2 : '#fff' }); });
  E.frame((t) => {
    glowA.style.translate = `${(Math.sin(t * 0.5) * 50).toFixed(1)}px ${(Math.cos(t * 0.4) * 36).toFixed(1)}px`;
    glowB.style.translate = `${(Math.cos(t * 0.4) * -60).toFixed(1)}px ${(Math.sin(t * 0.5) * 40).toFixed(1)}px`;
    dots.forEach((d, i) => { const sp = 22 + rnd(i + 50) * 40, span = H + 200; const y = H + 100 - ((rnd(i + 7) * span + t * sp) % span); const x = rnd(i) * W + Math.sin(t * 0.8 + i) * 14; d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; d.style.opacity = ((0.16 + 0.45 * rnd(i + 3)) * (0.55 + 0.45 * Math.sin(t * 1.6 + i * 1.7))).toFixed(3); });
  });
  const nc = document.createElement('canvas'); nc.width = nc.height = 192; const ng = nc.getContext('2d'); const id = ng.createImageData(192, 192);
  for (let i = 0; i < 192 * 192; i++) { const v = Math.floor(rnd(i + 9) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 9; }
  ng.putImageData(id, 0, 0);
  E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, zIndex: 850, pointerEvents: 'none' });
  E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at 50% 45%,transparent 58%,rgba(1,4,20,.5) 100%)', zIndex: 851, pointerEvents: 'none' });
  const fadeIn = E.div('fill', E.stage, null, { background: '#020617', zIndex: 860 });
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power2.out' });

  const s = E.scene(0, 5, null, null, { static: true });
  const ct = (html, x, y, size, cls, style) => K.ctext(s, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), cls || 'h1');

  /* ---------- brand + headline ---------- */
  const wmW = 270, wm = E.wordmark(s, { width: wmW, left: cx - wmW / 2, top: 400, color: '#fff' });
  E.ft(wm, 0.15, { autoAlpha: 0, y: -16 }, { autoAlpha: 0.92, y: 0, duration: 0.5, ease: 'power3.out' });
  const title = ct('<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln"><span class="grad">Receipt</span> Scan</div></div>', cx, 610, 100);
  E.ft(title.querySelector('.ln'), 0.35, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });

  /* ---------- receipt (placeholder lines only) ---------- */
  const RW = 440, RH = 640, RX = cx - RW / 2, RY = 770;
  const b = (w, extra) => `<i class="bar" style="width:${w}px;${extra || ''}"></i>`;
  const row = (l, r, extra) => `<div style="display:flex;justify-content:space-between;align-items:center;height:30px">${b(l, extra)}${b(r, extra)}</div>`;
  const zig = Array.from({ length: 23 }, (_, i) => `${(i * 100) / 22}% ${i % 2 ? 100 : 96.5}%`).join(',');
  const rc = E.div('abs', s, null, { left: RX + 'px', top: RY + 'px', width: RW + 'px', height: RH + 'px', transformOrigin: '50% 50%' });
  const shadow = E.div('abs', rc, null, { left: '10px', right: '10px', top: '24px', bottom: '-10px', borderRadius: '20px', background: 'rgba(0,4,30,.45)', filter: 'blur(22px)' });
  const paper = E.div('abs', rc, `
    <div class="z-m" style="position:absolute;left:40px;right:40px;top:44px;display:flex;flex-direction:column;align-items:center;gap:14px">${b(220, 'height:22px;border-radius:11px;background:#C3CAD6')}${b(150)}</div>
    <div style="position:absolute;left:40px;right:40px;top:150px;border-top:3px dashed #E2E6EE"></div>
    <div class="z-c" style="position:absolute;left:40px;right:40px;top:178px;display:flex;flex-direction:column;gap:10px">${row(200, 70)}${row(160, 60)}${row(230, 70)}${row(140, 56)}${row(190, 64)}</div>
    <div style="position:absolute;left:40px;right:40px;top:398px;border-top:3px dashed #E2E6EE"></div>
    <div style="position:absolute;left:40px;right:40px;top:420px;display:flex;flex-direction:column;gap:8px">${row(110, 60)}${row(90, 56)}</div>
    <div class="z-a" style="position:absolute;left:40px;right:40px;top:500px;display:flex;justify-content:space-between;align-items:center;height:40px">${b(130, 'height:22px;border-radius:11px;background:#C3CAD6')}${b(110, 'height:22px;border-radius:11px;background:#C3CAD6')}</div>
    <div style="position:absolute;left:0;right:0;top:568px;display:flex;justify-content:center;gap:5px">${Array.from({ length: 26 }, (_, i) => `<i style="display:block;width:${[3, 5, 2, 4][i % 4]}px;height:34px;background:#C9CFDA"></i>`).join('')}</div>`,
    { left: 0, top: 0, width: RW + 'px', height: RH + 'px', background: '#FFFFFF', clipPath: `polygon(0 0,100% 0,${zig.split(',').reverse().join(',')})`, borderRadius: '6px 6px 0 0' });
  E.ft(rc, 0.1, { autoAlpha: 0, y: 70, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, ease: 'power3.out' });

  // regions the scan "finds" (receipt-local coordinates)
  const ZONES = [['Merchant', 'store', 30, 30, RW - 60, 100], ['Category', 'tag', 30, 168, RW - 60, 210], ['Amount', 'banknote', 30, 490, RW - 60, 60]];
  const boxes = ZONES.map(([, , x, y, w, h]) => E.div('abs', rc, null, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: '14px', border: `3px solid ${CYAN}`, background: 'rgba(34,211,238,.10)', boxShadow: '0 0 18px rgba(34,211,238,.45)' }));
  const hitT = (y, h) => 1.0 + ((y + h / 2) / RH) * 2.0;   // when the scan line passes a zone
  boxes.forEach((bx, i) => { const z = ZONES[i]; E.ft(bx, hitT(z[3], z[5]), { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }); });

  /* ---------- scan line 1–3 s ---------- */
  const scan = E.div('abs', rc, `<i style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(180deg,rgba(34,211,238,0),rgba(34,211,238,.22))"></i><i style="position:absolute;left:-26px;right:-26px;bottom:-3px;height:6px;border-radius:6px;background:${CYAN2};box-shadow:0 0 24px ${CYAN},0 0 8px #fff"></i>`, { left: 0, right: 0, top: 0, height: '0px' });
  E.ft(scan, 0.95, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 });
  E.frame((t) => { const p = Math.min(1, Math.max(0, (t - 1.0) / 2.0)); const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; scan.style.height = (e * RH).toFixed(1) + 'px'; });
  E.to(scan, 3.0, { autoAlpha: 0, duration: 0.15 });
  // corner brackets frame the receipt while scanning (scanner viewfinder)
  const BW = RW + 72, BH = RH + 72, L = 70, Rr = 22;
  const corner = (x, y, sx, sy) => `<path d="M${x + sx * L},${y} H${x + sx * Rr} Q${x},${y} ${x},${y + sy * Rr} V${y + sy * L}" fill="none" stroke="${CYAN2}" stroke-width="7" stroke-linecap="round"/>`;
  const br = E.div('abs', s, `<svg width="${BW}" height="${BH}" style="overflow:visible">${corner(4, 4, 1, 1)}${corner(BW - 4, 4, -1, 1)}${corner(4, BH - 4, 1, -1)}${corner(BW - 4, BH - 4, -1, -1)}</svg>`, { left: RX - 36 + 'px', top: RY - 36 + 'px', width: BW + 'px', height: BH + 'px' });
  E.ft(br, 0.75, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out' });
  E.to(br, 2.95, { autoAlpha: 0, scale: 1.05, duration: 0.25 });

  /* ---------- 3–4 s: extract three labels ---------- */
  E.to(rc, 3.0, { scale: 0.62, y: -120, x: -150, duration: 0.5, ease: 'power3.inOut' });
  const LY = [900, 1060, 1220], LX = 640;   // label centres (right column)
  const pill = (name, ic) => `<div style="display:flex;align-items:center;gap:20px;padding:20px 30px 20px 20px;border-radius:30px;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(103,232,249,.55);box-shadow:0 18px 44px rgba(0,4,40,.4),0 0 24px rgba(34,211,238,.18)"><span style="width:72px;height:72px;border-radius:20px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.55);display:flex;align-items:center;justify-content:center">${E.icon(ic, 38, '#E0FAFF', 2.2)}</span><span style="font:700 40px Urbanist;color:#fff;white-space:nowrap">${name}</span></div>`;
  const order = [0, 2, 1];   // Merchant, Amount, Category
  const labels = order.map((zi, k) => {
    const [name, ic, zx, zy, zw, zh] = ZONES[zi];
    const el = K.ctext(s, pill(name, ic), LX + 40, LY[k], {});
    // start where the zone sits on the shrunken receipt (receipt scaled 0.62 about its centre, shifted −150/−120)
    const sx = cx - 150 + (RX + zx + zw / 2 - cx) * 0.62, sy = RY + RH / 2 - 120 + (RY + zy + zh / 2 - (RY + RH / 2)) * 0.62;
    E.ft(el, 3.35 + k * 0.12, { autoAlpha: 0, x: sx - (LX + 40), y: sy - LY[k], scale: 0.4 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' });
    return el;
  });

  /* ---------- 4–5 s: merge into a confirmed transaction card ---------- */
  const CW = 860, CH = 480, CX = cx - CW / 2, CY = 1080 - CH / 2;
  E.to(rc, 4.0, { autoAlpha: 0, scale: 0.4, duration: 0.3, ease: 'power2.in' });
  const card = E.div('abs', s, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '40px', background: '#FFFFFF', boxShadow: '0 30px 80px rgba(0,4,40,.45), 0 0 0 2px rgba(103,232,249,.35)', transformOrigin: '50% 50%' });
  E.ft(card, 4.08, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' });
  labels.forEach((el, k) => E.to(el, 4.0 + k * 0.04, { x: cx - (LX + 40), y: CY + 200 + k * 96 - LY[k], scale: 0.5, autoAlpha: 0, duration: 0.32, ease: 'power2.in' }));
  const ROWS = [['Merchant', 'store', 250], ['Amount', 'banknote', 170], ['Category', 'tag', 210]];
  const body = E.div('abs', s, `
    <div style="position:absolute;left:44px;top:40px;display:flex;align-items:center;gap:18px"><span style="width:64px;height:64px;border-radius:18px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${E.icon('receipt-text', 36, '#4F46E5', 2.2)}</span><span style="font:700 44px Roboto;color:#0f172a">New transaction</span></div>
    <div style="position:absolute;left:44px;right:44px;top:132px;height:2px;background:#EEF0F5"></div>
    ${ROWS.map(([n, ic, w], k) => `<div class="cr" style="position:absolute;left:44px;right:44px;top:${164 + k * 96}px;height:70px;display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:16px;font:500 37px Roboto;color:#475569">${E.icon(ic, 36, '#64748b', 2)}${n}</span><i class="bar" style="width:${w}px;height:20px;border-radius:9px;background:#DCE1EA"></i></div>`).join('')}`,
    { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px' });
  E.ft(body, 4.25, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  body.querySelectorAll('.cr').forEach((r, k) => E.ft(r, 4.3 + k * 0.06, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.25 }));
  const ok = E.div('abs', s, `<div style="position:relative;width:84px;height:84px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #fff,0 10px 26px rgba(34,197,94,.45)">${E.icon('check', 50, '#fff', 3.2)}<i class="rp" style="position:absolute;inset:-6px;border-radius:50%;border:3px solid rgba(52,211,153,.9);opacity:0"></i></div>`, { left: CX + CW - 56 + 'px', top: CY - 30 + 'px' });
  E.ft(ok, 4.5, { autoAlpha: 0, scale: 0.3, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(2.2)' });
  const rp = ok.querySelector('.rp');
  E.frame((t) => { const q = (t - 4.6) / 0.4; if (q < 0 || q > 1) { rp.style.opacity = 0; return; } rp.style.transform = `scale(${(1 + q * 0.8).toFixed(3)})`; rp.style.opacity = (0.85 * (1 - q)).toFixed(3); });

  E.ready().then(() => { window.__ready = true; });
})();
