/* 12 · Feature bumper — "Voice to Record" · 9:16 · 4 s · silent
   Same visual system as 11_tutorial_intro (navy gradient, cyan accents, Urbanist titles, app UI in Roboto).
   0–1.7 mic + expanding waveform + transcript · 1.7–2.3 waveform folds into a transaction card ·
   2.3–3.15 confirmed card · 3.15–4.0 the card opens to full frame in the app's background colour (cut point). */
(function () {
  const { W, H } = E;
  E.duration = 4;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', GREEN = '#22C55E', APPBG = '#F5F6FA';
  const cx = W / 2, MY = 960;   // mic centre
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  E.css(`
    .h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.028em;line-height:1}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}`);

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
  const dither = E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, zIndex: 850, pointerEvents: 'none' });
  const vig = E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at 50% 45%,transparent 58%,rgba(1,4,20,.5) 100%)', zIndex: 851, pointerEvents: 'none' });
  const fadeIn = E.div('fill', E.stage, null, { background: '#020617', zIndex: 860 });
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'power2.out' });

  const s = E.scene(0, 4, null, null, { static: true });
  const ct = (html, x, y, size, cls, style) => K.ctext(s, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), cls || 'h1');

  /* ---------- brand + title ---------- */
  const wmW = 270, wm = E.wordmark(s, { width: wmW, left: cx - wmW / 2, top: 318, color: '#fff' });
  E.ft(wm, 0.15, { autoAlpha: 0, y: -16 }, { autoAlpha: 0.92, y: 0, duration: 0.5, ease: 'power3.out' });
  const title = ct('<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln"><span class="grad">Voice</span> to Record</div></div>', cx, 600, 100);
  E.ft(title.querySelector('.ln'), 0.45, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });

  /* ---------- microphone ---------- */
  const halo = E.div('abs', s, null, { left: cx - 380 + 'px', top: MY - 380 + 'px', width: '760px', height: '760px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.30),rgba(37,99,235,.14) 55%,rgba(37,99,235,0))' });
  const ringA = E.div('abs', s, null, { left: cx - 180 + 'px', top: MY - 180 + 'px', width: '360px', height: '360px', borderRadius: '50%', border: '2px solid rgba(103,232,249,.45)', boxShadow: 'inset 0 0 40px rgba(34,211,238,.12)' });
  const MR = 140;
  const mic = E.div('abs', s, `<div style="width:${MR * 2}px;height:${MR * 2}px;border-radius:50%;background:linear-gradient(145deg,${CYAN} 0%,#0EA5E9 38%,#2563EB 78%,#1D4ED8 100%);box-shadow:0 24px 60px rgba(2,8,60,.55),0 0 70px rgba(34,211,238,.45),inset 0 2px 0 rgba(255,255,255,.45),inset 0 -10px 30px rgba(3,10,60,.35);display:flex;align-items:center;justify-content:center">${E.icon('mic', 132, '#fff', 1.9)}</div>`, { left: cx - MR + 'px', top: MY - MR + 'px' });
  E.ft(halo, 0.05, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' });
  E.ft(mic, 0.1, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
  E.ft(ringA, 0.25, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  // listening ripples
  const ripples = [0, 1].map(() => E.div('abs', s, null, { left: cx - MR + 'px', top: MY - MR + 'px', width: MR * 2 + 'px', height: MR * 2 + 'px', borderRadius: '50%', border: `3px solid ${CYAN2}`, opacity: 0 }));
  E.frame((t) => ripples.forEach((r, k) => { const t0 = 0.55 + k * 0.45; if (t < t0 || t > 1.75) { r.style.opacity = 0; return; } const q = ((t - t0) % 0.9) / 0.9; r.style.transform = `scale(${(1 + q * 0.9).toFixed(3)})`; r.style.opacity = (0.55 * (1 - q)).toFixed(3); }));

  /* ---------- waveform: bars grow outward from the mic, then fold into the card ---------- */
  const NB = 10, GAP = 27, X0 = 214;   // first bar just outside the ring
  const bars = [];
  [-1, 1].forEach((side) => { for (let k = 0; k < NB; k++) { const b = E.div('abs', s, null, { left: cx + side * (X0 + k * GAP) - 5 + 'px', top: MY - 60 + 'px', width: '10px', height: '120px', borderRadius: '6px', background: `linear-gradient(180deg,${CYAN2},${CYAN} 50%,${CYAN2})`, boxShadow: '0 0 14px rgba(34,211,238,.55)', transformOrigin: '50% 50%' }); b.k = k; b.side = side; bars.push(b); } });
  E.frame((t) => {
    bars.forEach((b) => {
      const k = b.k, appear = 0.42 + k * 0.045;
      const grow = Math.min(1, Math.max(0, (t - appear) / 0.25));
      const env = Math.exp(-k * 0.13) * (0.55 + 0.45 * Math.sin(k * 0.9 + 1));
      const voice = 0.35 + 0.65 * Math.abs(Math.sin(t * 9.0 + k * 0.75 + (b.side > 0 ? 0.6 : 0)) * Math.sin(t * 4.3 + k * 0.4) * 0.7 + Math.sin(t * 13 + k) * 0.3);
      let h = Math.max(0.08, grow * env * voice) * 1.9;       // × 120 px
      let x = 0, o = grow;
      if (t >= 1.68) { const f = Math.min(1, (t - 1.68) / 0.3); const e = f * f; h = h * (1 - e) + 0.06 * e; x = -b.side * (X0 + k * GAP) * e; o = 1 - Math.max(0, (f - 0.75) / 0.25); }
      b.style.transform = `translateX(${x.toFixed(1)}px) scaleY(${h.toFixed(3)})`; b.style.opacity = o.toFixed(3);
    });
  });

  /* ---------- transcript (the app's own example) ---------- */
  const words = ['“Lunch,', '$450,', 'cash”'];
  const tr = ct(words.map((w) => `<span class="w" style="display:inline-block;margin:0 .14em">${w}</span>`).join(''), cx, 1222, 50, 'h1', { fontWeight: 600, letterSpacing: '-.005em', padding: '22px 44px', borderRadius: '999px', background: 'linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04))', border: '2px solid rgba(255,255,255,.16)', boxShadow: '0 20px 50px rgba(0,4,40,.35)' });
  E.ft(tr, 0.95, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' });
  tr.querySelectorAll('.w').forEach((w, i) => E.ft(w, 1.02 + i * 0.16, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }));
  E.to(tr, 1.72, { autoAlpha: 0, y: -50, scale: 0.92, duration: 0.28, ease: 'power2.in' });

  /* ---------- transaction card ---------- */
  const CW = 840, CH = 300, CX = cx - CW / 2, CY = 990 - CH / 2;
  const line = E.div('abs', s, null, { left: CX + 'px', top: 990 - 2 + 'px', width: CW + 'px', height: '4px', borderRadius: '4px', background: `linear-gradient(90deg,rgba(103,232,249,0),${CYAN2} 20%,${CYAN2} 80%,rgba(103,232,249,0))`, boxShadow: `0 0 20px ${CYAN}`, transformOrigin: '50% 50%' });
  E.ft(line, 1.86, { scaleX: 0.05, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.2, ease: 'power3.out' }); E.to(line, 2.12, { autoAlpha: 0, duration: 0.12 });
  const card = E.div('abs', s, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '40px', background: '#FFFFFF', boxShadow: '0 30px 80px rgba(0,4,40,.45), 0 0 0 2px rgba(103,232,249,.35)', transformOrigin: '50% 50%' });
  E.ft(card, 2.02, { scaleY: 0.02, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.3, ease: 'power3.out' });
  const body = E.div('abs', s, `
    <div style="position:absolute;left:184px;top:62px;font:700 50px Roboto;color:#0f172a">Lunch</div>
    <div style="position:absolute;left:184px;top:130px;font:400 32px Roboto;color:#64748b">Food &amp; Dining · Cash</div>
    <div style="position:absolute;right:48px;top:62px;font:700 50px Roboto;color:#DC2626;text-align:right">$450.00</div>
    <div style="position:absolute;right:48px;top:130px;font:400 32px Roboto;color:#64748b;text-align:right">Today</div>
    <div style="position:absolute;left:40px;right:40px;top:206px;height:2px;background:#EEF0F5"></div>
    <div style="position:absolute;left:40px;top:226px;display:flex;align-items:center;gap:12px;font:500 28px Roboto;color:#4F46E5">${E.icon('mic', 30, '#4F46E5', 2.2)}Recorded by voice</div>`, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px' });
  E.ft(body, 2.22, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  // the mic travels into the card's icon slot (kept above the card)
  s.appendChild(mic);
  const slot = { x: CX + 40 + 56, y: CY + 40 + 56 + 8 };   // 112 px badge
  E.to([halo, ringA], 1.68, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in' });
  E.to(mic, 1.7, { x: slot.x - cx, y: slot.y - MY, scale: 112 / (MR * 2), duration: 0.55, ease: 'power3.inOut' });
  // green confirmation
  const ok = E.div('abs', s, `<div style="position:relative;width:76px;height:76px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #fff,0 10px 26px rgba(34,197,94,.45)">${E.icon('check', 46, '#fff', 3.2)}<i class="rp" style="position:absolute;inset:-6px;border-radius:50%;border:3px solid rgba(52,211,153,.9);opacity:0"></i></div>`, { left: CX + CW - 50 + 'px', top: CY - 26 + 'px' });
  s.appendChild(ok);
  E.ft(ok, 2.5, { autoAlpha: 0, scale: 0.3, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.2)' });
  const rp = ok.querySelector('.rp');
  E.frame((t) => { const q = (t - 2.62) / 0.6; if (q < 0 || q > 1) { rp.style.opacity = 0; return; } rp.style.transform = `scale(${(1 + q * 0.8).toFixed(3)})`; rp.style.opacity = (0.85 * (1 - q)).toFixed(3); });

  /* ---------- hand-off: the card opens to full frame in the app's background colour ---------- */
  E.to([wm, title], 3.12, { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power2.in' });
  E.to([body, ok, mic], 3.12, { autoAlpha: 0, duration: 0.18, ease: 'power2.in' });
  E.to(card, 3.22, { left: 0, top: 0, width: W, height: H, borderRadius: 0, backgroundColor: APPBG, boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 0.6, ease: 'power3.inOut' });
  E.to([parts, dither, vig], 3.5, { opacity: 0, duration: 0.3 });

  E.ready().then(() => { window.__ready = true; });
})();
