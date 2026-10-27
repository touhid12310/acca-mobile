/* 17 · Tutorial recap — "Accounting Made Easy with AI" · 9:16 · 6 s · silent
   For the VO line "তাহলে দেখলেন, AccountE দিয়ে ট্রানজেকশন রেকর্ড করা কতটা সহজ!".
   0–2 five methods float, then curve into the centre with light trails · 2–4 AI symbol → card → processing → green check,
   "Transaction Recorded!" · 4–6 card scales away, AccountE logo + "Accounting Made Easy with AI", fade to navy.
   No particles; no amounts (placeholder bars only). */
(function () {
  const { W, H } = E;
  E.duration = 6;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', ICE = '#E0FAFF', GREEN = '#22C55E';
  const cx = W / 2;
  E.css(`.h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.025em;line-height:1.06}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .tile{position:absolute;width:150px;height:150px;border-radius:42px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.6);box-shadow:0 14px 36px rgba(0,4,40,.45),inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}
    .bar{display:block;height:20px;border-radius:10px;background:#DCE1EA;overflow:hidden;position:relative}`);

  /* ---------- background: navy gradient + two slow glows (no particles) ---------- */
  E.stage.style.background = 'linear-gradient(180deg,#030A26 0%,#061650 52%,#0A2A86 100%)';
  const glowA = E.div('abs', E.stage, null, { left: '-420px', top: '-260px', width: '1300px', height: '1300px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.18),rgba(34,211,238,0))' });
  const glowB = E.div('abs', E.stage, null, { left: '120px', top: '1060px', width: '1500px', height: '1500px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(37,99,235,.40),rgba(37,99,235,0))' });
  E.frame((t) => { glowA.style.translate = `${(Math.sin(t * 0.5) * 50).toFixed(1)}px ${(Math.cos(t * 0.4) * 36).toFixed(1)}px`; glowB.style.translate = `${(Math.cos(t * 0.4) * -60).toFixed(1)}px ${(Math.sin(t * 0.5) * 40).toFixed(1)}px`; });
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const nc = document.createElement('canvas'); nc.width = nc.height = 192; const ng = nc.getContext('2d'); const id = ng.createImageData(192, 192);
  for (let i = 0; i < 192 * 192; i++) { const v = Math.floor(rnd(i + 9) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 9; }
  ng.putImageData(id, 0, 0);
  E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, zIndex: 850, pointerEvents: 'none' });   // static dither against banding
  E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at 50% 45%,transparent 58%,rgba(1,4,20,.5) 100%)', zIndex: 851, pointerEvents: 'none' });
  const fadeIn = E.div('fill', E.stage, null, { background: '#020617', zIndex: 860 });
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power2.out' });

  const s = E.scene(0, 6, null, null, { static: true });
  const root = E.div('fill', s);
  const ct = (html, x, y, size, style) => K.ctext(root, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), 'h1');
  const C = { x: cx, y: 940 };
  function art(i) {
    const ic = (n, sz) => E.icon(n, sz, ICE, 2);
    if (i === 0) return `<div style="position:relative;width:82px;height:82px">${ic('message-circle', 82)}<span class="td" style="position:absolute;left:0;right:0;top:35px;display:flex;justify-content:center;gap:8px">${('<i style="width:9px;height:9px;border-radius:50%;background:' + ICE + ';display:block"></i>').repeat(3)}</span></div>`;
    if (i === 1) return `<div style="position:relative;width:82px;height:82px;display:flex;align-items:center;justify-content:center">${ic('mic', 76)}<i class="r1" style="position:absolute;inset:-8px;border-radius:50%;border:3px solid ${CYAN2}"></i><i class="r2" style="position:absolute;inset:-8px;border-radius:50%;border:3px solid ${CYAN2}"></i></div>`;
    if (i === 2) return `<div style="position:relative;width:82px;height:82px">${ic('receipt-text', 80)}<i class="sl" style="position:absolute;left:-10px;right:-10px;height:4px;top:0;border-radius:3px;background:${CYAN2};box-shadow:0 0 12px ${CYAN},0 0 4px #fff"></i></div>`;
    if (i === 3) return `<div style="position:relative;width:82px;height:82px">${ic('mail', 80)}<span class="fw" style="position:absolute;right:-30px;top:-24px;width:46px;height:46px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(34,211,238,.8)">${E.icon('forward', 28, '#03122e', 2.6)}</span></div>`;
    return `<div style="position:relative;width:82px;height:82px">${ic('smartphone', 80)}<span class="bd" style="position:absolute;right:-30px;top:-22px;width:50px;height:42px;border-radius:14px 14px 14px 5px;background:${CYAN};display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 0 14px rgba(34,211,238,.8)">${'<i style="width:6px;height:6px;border-radius:50%;background:#03122e;display:block"></i>'.repeat(3)}</span></div>`;
  }
  /* ---------- 0–2 s: five methods float, then curve into the centre ---------- */
  const METHODS = [['Text'], ['Voice'], ['Receipt Scan'], ['Email'], ['SMS']];
  const R0 = 380, A0 = METHODS.map((_, k) => -90 + 72 * k);
  const pathAt = (k, u) => { const a = (A0[k] + 75 * u) * Math.PI / 180, r = R0 * (1 - u); return { x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) }; };   // inward spiral
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const tiles = METHODS.map(([name], k) => {
    const g = E.div('abs', root, null, { left: '0px', top: '0px', width: 0, height: 0 });
    const tile = E.div('tile', g, art(k), { left: '-75px', top: '-75px' });
    const lab = E.div('abs', g, name, { left: '-200px', width: '400px', textAlign: 'center', top: (k === 0 || k === 1 || k === 4 ? -132 : 90) + 'px', font: '700 40px Urbanist', color: '#fff' });
    E.ft(tile, 0.08 + k * 0.08, { autoAlpha: 0, scale: 0.55 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' });
    E.ft(lab, 0.2 + k * 0.08, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' });
    E.to(lab, 0.95, { autoAlpha: 0, duration: 0.3 });
    // light trail behind each icon while it travels
    const trail = Array.from({ length: 7 }, (_, j) => E.div('abs', root, null, { left: '0px', top: '0px', width: 26 - j * 2.5 + 'px', height: 26 - j * 2.5 + 'px', borderRadius: '50%', background: j < 2 ? '#BFF4FF' : CYAN, boxShadow: `0 0 22px ${CYAN}`, opacity: 0 }));
    root.insertBefore(trail[0], root.firstChild); trail.forEach((d) => root.insertBefore(d, root.firstChild));
    return { g, tile, trail, k };
  });
  E.frame((t) => {
    tiles.forEach(({ g, tile, trail, k }) => {
      const p = Math.min(1, Math.max(0, (t - 0.9 - k * 0.04) / 1.0)), u = ease(p);
      const pt = pathAt(k, u), bob = t < 0.9 ? Math.sin(t * 3 + k) * 6 : 0;
      g.style.transform = `translate(${pt.x.toFixed(1)}px,${(pt.y + bob).toFixed(1)}px) scale(${(1 - 0.55 * u).toFixed(3)})`;
      g.style.opacity = t > 1.88 ? Math.max(0, 1 - (t - 1.88) / 0.12).toFixed(2) : 1;
      trail.forEach((d, j) => { const uu = ease(Math.max(0, p - (j + 1) * 0.035)); if (p <= 0.02 || p >= 1 || uu <= 0) { d.style.opacity = 0; return; } const q = pathAt(k, uu); const sz = 26 - j * 2.5; d.style.transform = `translate(${(q.x - sz / 2).toFixed(1)}px,${(q.y - sz / 2).toFixed(1)}px)`; d.style.opacity = ((0.75 - j * 0.1) * Math.min(1, (1 - p) * 5)).toFixed(2); });
      if (k === 0) tile.querySelectorAll('.td i').forEach((d, j) => { d.style.transform = `translateY(${(-Math.max(0, Math.sin(t * 6.5 - j * 0.9)) * 6).toFixed(1)}px)`; });
      if (k === 1) ['.r1', '.r2'].forEach((c, j) => { const q = ((t + j * 0.6) % 1.2) / 1.2; const r = tile.querySelector(c); r.style.transform = `scale(${(0.85 + q * 0.7).toFixed(3)})`; r.style.opacity = (0.7 * (1 - q)).toFixed(3); });
      if (k === 2) tile.querySelector('.sl').style.top = (4 + ((Math.sin(t * 3.2) + 1) / 2) * 72).toFixed(1) + 'px';
      if (k === 3) { const q = (t % 1.3) / 1.3; const fw = tile.querySelector('.fw'); fw.style.transform = `translate(${(q * 14).toFixed(1)}px,${(-q * 4).toFixed(1)}px)`; fw.style.opacity = (q < 0.75 ? 1 : (1 - q) / 0.25).toFixed(3); }
      if (k === 4) { const q = (t % 1.4) / 1.4; const bd = tile.querySelector('.bd'); bd.style.transform = `scale(${(q < 0.18 ? 0.4 + (q / 0.18) * 0.75 : q < 0.3 ? 1.15 - ((q - 0.18) / 0.12) * 0.15 : 1).toFixed(3)})`; }
    });
  });

  /* ---------- 2–4 s: AI symbol → card → processing → check ---------- */
  const OR = 120;
  const orb = E.div('abs', root, `
    <div class="halo" style="position:absolute;left:-170px;top:-170px;width:${OR * 2 + 340}px;height:${OR * 2 + 340}px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.34),rgba(37,99,235,.16) 55%,rgba(37,99,235,0))"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 35%,#0E3A86,#06164A 70%);border:3px solid rgba(103,232,249,.7);box-shadow:0 24px 60px rgba(0,4,40,.5),inset 0 0 40px rgba(34,211,238,.22);display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 100, ICE, 1.8)}</div>
    <svg class="arc" width="${OR * 2 + 64}" height="${OR * 2 + 64}" style="position:absolute;left:-32px;top:-32px;overflow:visible"><circle cx="${OR + 32}" cy="${OR + 32}" r="${OR + 22}" fill="none" stroke="${CYAN2}" stroke-width="5" stroke-linecap="round" stroke-dasharray="140 70 40 70"/></svg>`,
    { left: C.x - OR + 'px', top: C.y - OR + 'px', width: OR * 2 + 'px', height: OR * 2 + 'px', transformOrigin: '50% 50%' });
  E.ft(orb, 1.78, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' });
  const arc = orb.querySelector('.arc'); E.frame((t) => { arc.style.rotate = (t * 300).toFixed(1) + 'deg'; });
  E.to(orb, 2.35, { scale: 0.6, autoAlpha: 0, duration: 0.25, ease: 'power2.in' });
  const CW = 820, CH = 400, CX = cx - CW / 2, CY = C.y - CH / 2;
  const card = E.div('abs', root, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', background: 'rgba(255,255,255,.97)', borderRadius: '40px', boxShadow: '0 30px 80px rgba(0,4,40,.5), 0 0 0 2px rgba(103,232,249,.4)', transformOrigin: '50% 50%' });
  E.ft(card, 2.35, { autoAlpha: 0, scaleX: 0.29, scaleY: 0.6, borderRadius: '200px' }, { autoAlpha: 1, scaleX: 1, scaleY: 1, borderRadius: '40px', duration: 0.45, ease: 'back.out(1.3)' });
  const body = E.div('abs', root, `
    <div style="position:absolute;left:44px;top:42px;display:flex;align-items:center;gap:20px"><span style="width:76px;height:76px;border-radius:22px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 42, '#4F46E5', 2.2)}</span><span style="display:flex;flex-direction:column;gap:12px"><i class="bar" style="width:300px;background:#C3CAD6"></i><i class="bar" style="width:190px"></i></span></div>
    <div style="position:absolute;left:44px;right:44px;top:156px;height:2px;background:#EEF0F5"></div>
    ${[[230, 150], [180, 200], [260, 120]].map(([a, b], k) => `<div style="position:absolute;left:44px;right:44px;top:${186 + k * 62}px;display:flex;justify-content:space-between"><i class="bar" style="width:${a}px"></i><i class="bar" style="width:${b}px"></i></div>`).join('')}
    <i class="shine" style="position:absolute;inset:0;border-radius:40px;background:linear-gradient(100deg,rgba(255,255,255,0) 35%,rgba(103,232,249,.35) 50%,rgba(255,255,255,0) 65%);background-size:300% 100%;opacity:0"></i>`,
    { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px' });
  E.ft(body, 2.6, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
  const shine = body.querySelector('.shine');
  E.ft(shine, 2.65, { opacity: 1, backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 0.5, ease: 'power1.inOut' }); E.to(shine, 3.15, { opacity: 0, duration: 0.1 });
  // green check + success pulse
  const ok = E.div('abs', root, `<div style="position:relative;width:120px;height:120px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px #fff,0 14px 34px rgba(34,197,94,.5)"><svg width="70" height="70" viewBox="0 0 24 24" style="overflow:visible"><path class="ck" pathLength="1" d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1 1"/></svg></div>`, { left: CX + CW - 80 + 'px', top: CY - 46 + 'px' });
  E.ft(ok, 3.1, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)' });
  E.ft(ok.querySelector('.ck'), 3.22, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' });
  const pulse = E.div('abs', root, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '40px', border: '4px solid rgba(52,211,153,.9)', opacity: 0 });
  E.frame((t) => { const q = (t - 3.2) / 0.7; if (q < 0 || q > 1) { pulse.style.opacity = 0; return; } pulse.style.transform = `scale(${(1 + q * 0.08).toFixed(3)},${(1 + q * 0.17).toFixed(3)})`; pulse.style.opacity = (0.9 * (1 - q)).toFixed(2); });
  const done = ct(`<span style="color:#fff">Transaction Recorded!</span>`, cx, CY + CH + 120, 66);
  E.ft(done, 3.25, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });

  /* ---------- 4–6 s: logo + headline, fade to navy ---------- */
  E.to([card, body, ok], 4.0, { scale: 0.5, y: 160, autoAlpha: 0, duration: 0.5, ease: 'power3.in' });
  E.to(done, 4.0, { autoAlpha: 0, y: 30, duration: 0.35, ease: 'power2.in' });
  const WW = 820, WT = 790, WL = cx - WW / 2;
  const halo = E.div('abs', root, null, { left: cx - 600 + 'px', top: WT + 62 - 340 + 'px', width: '1200px', height: '680px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.32),rgba(1,129,250,.16) 50%,rgba(2,4,245,0))' });
  E.ft(halo, 4.25, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' });
  const wm = E.wordmark(root, { width: WW, left: WL, top: WT, color: '#fff' });
  const vb = wm.querySelector('svg').viewBox.baseVal, kk = WW / vb.width;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; wm.glyph('icon').forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  const mg = E.div('abs', root, null, { left: WL + ((x0 + x1) / 2) * kk - 150 + 'px', top: WT + ((y0 + y1) / 2) * kk - 150 + 'px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(56,189,248,.55),rgba(1,129,250,.2) 50%,rgba(1,129,250,0))' });
  root.insertBefore(mg, wm);
  E.set(wm, 0, { autoAlpha: 0 }); E.set(wm, 4.25, { autoAlpha: 1 });
  E.ft(wm.glyph('icon'), 4.25, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.7)' });
  E.ft(mg, 4.25, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.6 });
  wm.glyphs.filter((q) => q.k !== 'icon').forEach((q, i) => E.ft(q.els, 4.4 + i * 0.045, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }));
  const l1 = ct('<div style="overflow:hidden;padding:0 .06em .1em"><div class="ln">Accounting Made Easy</div></div>', cx, WT + 290, 78);
  const l2 = ct('<div style="overflow:hidden;padding:0 .06em .1em"><div class="ln">with <span class="grad">AI</span></div></div>', cx, WT + 384, 78);
  E.ft(l1.querySelector('.ln'), 4.75, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });
  E.ft(l2.querySelector('.ln'), 4.88, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });
  E.ft(root, 4.25, { scale: 1 }, { scale: 1.02, duration: 1.75, ease: 'none', transformOrigin: '50% 45%' });
  // seamless hand-off: everything fades back to the navy background by the last frame
  E.to(root, 5.68, { opacity: 0, duration: 0.3, ease: 'power2.inOut' });

  E.ready().then(() => { window.__ready = true; });
})();
