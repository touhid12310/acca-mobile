/* 11 · Tutorial intro (for a Bengali tutorial) — "AI Transaction Recording" · 9:16 · 20 s · silent
   Fonts: Urbanist (all titles and labels) + Roboto (the recreated app UI inside the phone).
   Scenes: 0–4 brand · 4–8 AI chat · 8–16 five methods one by one · 16–18 five-ways reveal · 18–20 logo + "Let's Get Started". */
(function () {
  const { W, H } = E;
  E.duration = 20;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', ICE = '#E0FAFF', MUTED = '#9FB0D3', IDX = '#8FA3C8', GREEN = '#22C55E';
  const cx = W / 2;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  E.css(`
    .h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.028em;line-height:1}
    .h2{font-family:Urbanist;font-weight:700;color:#fff;letter-spacing:-.018em;line-height:1.08}
    .sub{font-family:Urbanist;font-weight:600;color:${MUTED};letter-spacing:.08em}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .glass{position:absolute;border-radius:40px;background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.035));border:2px solid rgba(255,255,255,.13);box-shadow:0 24px 60px rgba(0,4,40,.35),inset 0 1px 0 rgba(255,255,255,.14)}
    .tile{position:absolute;width:116px;height:116px;border-radius:34px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.55);box-shadow:0 10px 30px rgba(8,145,178,.30),inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}
    .caret{display:inline-block;width:3px;height:1.05em;background:#6366f1;vertical-align:-.16em;margin-left:3px}
    .dots3 i{display:inline-block;width:12px;height:12px;border-radius:50%;background:#94a3b8;margin-left:7px}`);

  /* ---------- persistent background: navy gradient, drifting glows, particles, static dither ---------- */
  E.stage.style.background = 'linear-gradient(180deg,#030A26 0%,#061650 52%,#0A2A86 100%)';
  const glowA = E.div('abs', E.stage, null, { left: '-420px', top: '-260px', width: '1300px', height: '1300px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.20),rgba(34,211,238,0))' });
  const glowB = E.div('abs', E.stage, null, { left: '120px', top: '1060px', width: '1500px', height: '1500px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(37,99,235,.42),rgba(37,99,235,0))' });
  const glowC = E.div('abs', E.stage, null, { left: '-200px', top: '520px', width: '1480px', height: '1000px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(2,4,245,.22),rgba(2,4,245,0))' });
  const parts = E.div('fill', E.stage, null, { zIndex: 1, pointerEvents: 'none' });
  const PN = 46;
  const dots = Array.from({ length: PN }, (_, i) => { const sz = 2 + rnd(i + 100) * 4.2; return E.div('abs', parts, null, { left: '0px', top: '0px', width: sz + 'px', height: sz + 'px', borderRadius: '50%', background: i % 3 === 0 ? CYAN2 : '#fff', boxShadow: sz > 4.5 ? `0 0 ${sz * 3}px ${i % 3 === 0 ? 'rgba(103,232,249,.8)' : 'rgba(255,255,255,.6)'}` : 'none' }); });
  E.frame((t) => {
    glowA.style.translate = `${(Math.sin(t * 0.32) * 70).toFixed(1)}px ${(Math.cos(t * 0.27) * 50).toFixed(1)}px`;
    glowB.style.translate = `${(Math.cos(t * 0.25) * -80).toFixed(1)}px ${(Math.sin(t * 0.3) * 60).toFixed(1)}px`;
    glowC.style.translate = `${(Math.sin(t * 0.22 + 1) * 90).toFixed(1)}px 0px`;
    dots.forEach((d, i) => {
      const sp = 16 + rnd(i + 50) * 34, span = H + 200;
      const y = H + 100 - ((rnd(i + 7) * span + t * sp) % span);
      const x = rnd(i) * W + Math.sin(t * 0.6 + i) * 18;
      const a = (0.18 + 0.5 * rnd(i + 3)) * (0.55 + 0.45 * Math.sin(t * 1.4 + i * 1.7));
      d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; d.style.opacity = a.toFixed(3);
    });
  });
  // static dither (prevents gradient banding after H.264) + soft vignette
  const nc = document.createElement('canvas'); nc.width = nc.height = 192; const ng = nc.getContext('2d'); const id = ng.createImageData(192, 192);
  for (let i = 0; i < 192 * 192; i++) { const v = Math.floor(rnd(i + 9) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 9; }
  ng.putImageData(id, 0, 0);
  E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, zIndex: 850, pointerEvents: 'none' });
  E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at 50% 45%,transparent 58%,rgba(1,4,20,.5) 100%)', zIndex: 851, pointerEvents: 'none' });
  const fadeIn = E.div('fill', E.stage, null, { background: '#020617', zIndex: 860 });
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.6, ease: 'power2.out' });

  // soft glow behind the mark of a wordmark, measured from the SVG (inserted behind it)
  function markGlow(wm, left, top, width, size) {
    const vb = wm.querySelector('svg').viewBox.baseVal, k = width / vb.width;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; wm.glyph('icon').forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    const c = { x: left + ((x0 + x1) / 2) * k, y: top + ((y0 + y1) / 2) * k, w: (x1 - x0) * k };
    const g = E.div('abs', wm.parentNode, null, { left: c.x - size / 2 + 'px', top: c.y - size / 2 + 'px', width: size + 'px', height: size + 'px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(56,189,248,.55),rgba(1,129,250,.22) 50%,rgba(1,129,250,0))' });
    wm.parentNode.insertBefore(g, wm); g.slot = c; return g;
  }
  // centred text block helper
  const ct = (s, html, x, y, size, cls, style) => K.ctext(s, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), cls || 'h1');
  const maskLine = (s, html, y, size, cls) => { const wrap = ct(s, `<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln">${html}</div></div>`, cx, y, size, cls); return { wrap, inner: wrap.querySelector('.ln') }; };

  /* ---------- S1 0–4.4 · brand intro ---------- */
  let s = E.scene(0, 4.4);
  { const g = E.div('fill', s);
    const wmW = 800, wmTop = 690;
    const halo = E.div('abs', g, null, { left: cx - 560 + 'px', top: wmTop + 57 - 330 + 'px', width: '1120px', height: '660px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(1,129,250,.42),rgba(2,4,245,.16) 55%,rgba(2,4,245,0))' });
    E.ft(halo, 0.15, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'power2.out' });
    const wm = E.wordmark(g, { width: wmW, left: cx - wmW / 2, top: wmTop, color: '#fff' });
    const mg = markGlow(wm, cx - wmW / 2, wmTop, wmW, 300);
    const icon = wm.glyph('icon');
    E.ft(mg, 0.2, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 1.0, ease: 'power2.out' });
    E.ft(icon, 0.2, { opacity: 0, scale: 0.45, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' });
    wm.glyphs.filter((q) => q.k !== 'icon').forEach((q, i) => E.ft(q.els, 0.55 + i * 0.05, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }));
    const streak = E.div('abs', g, null, { left: cx - 300 + 'px', top: wmTop + 165 + 'px', width: '600px', height: '3px', borderRadius: '3px', background: `linear-gradient(90deg,rgba(103,232,249,0),${CYAN2} 50%,rgba(103,232,249,0))`, boxShadow: '0 0 18px rgba(34,211,238,.7)' });
    E.ft(streak, 1.0, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }); E.to(streak, 1.9, { opacity: 0.45, duration: 0.8 });
    const l1 = maskLine(g, '<span class="grad">AI</span> Transaction', 968, 100), l2 = maskLine(g, 'Recording', 1074, 100);
    E.ft(l1.inner, 1.4, { yPercent: 110 }, { yPercent: 0, duration: 0.75, ease: 'power4.out' });
    E.ft(l2.inner, 1.55, { yPercent: 110 }, { yPercent: 0, duration: 0.75, ease: 'power4.out' });
    const sub = ct(g, 'Fast, Easy, Smart', cx, 1196, 46, 'sub');
    E.ft(sub, 2.1, { autoAlpha: 0, y: 18, letterSpacing: '0.22em' }, { autoAlpha: 1, y: 0, letterSpacing: '0.08em', duration: 0.9, ease: 'power3.out' });
    E.frame((t) => { if (t <= 4.4) halo.style.scale = (1 + Math.sin(t * 2.1) * 0.03).toFixed(4); });
    E.to(g, 3.7, { autoAlpha: 0, y: -70, scale: 0.97, duration: 0.55, ease: 'power2.in' }); }

  /* ---------- S2 3.8–8.7 · AI chat records a typed transaction ---------- */
  s = E.scene(3.8, 8.7);
  { const head = ct(s, 'Record Transactions <span class="grad">with AI</span>', cx, 268, 56, 'h2');
    E.ft(head, 4.0, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' });
    const wrap = E.div('fill', s);
    const sc0 = 0.64, phW = (UI.SW + 28) * sc0, phH = (UI.SH + 28) * sc0, phX = cx - phW / 2, phY = 378;
    const back = E.div('abs', wrap, null, { left: cx - 520 + 'px', top: phY + phH / 2 - 560 + 'px', width: '1040px', height: '1120px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.22),rgba(37,99,235,.18) 50%,rgba(37,99,235,0))' });
    const ph = UI.phone(wrap, phX, phY, sc0);
    ph.style.boxShadow = '0 0 0 2px rgba(103,232,249,.28), 0 50px 120px rgba(0,3,40,.6), 0 0 90px rgba(34,211,238,.18)';
    const A2 = UI.assistant(ph.screen);
    E.ft(wrap, 3.85, { autoAlpha: 0, y: 260, scale: 0.94, transformOrigin: '50% 60%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.95, ease: 'power3.out' });
    E.to(wrap, 4.8, { scale: 1.045, duration: 3.2, ease: 'none' });
    // typing the app's own example into the input; the mic turns into a send button while typing
    const MSG = 'Lunch, $450, cash';
    const field = A2.field, btn = A2.btn, micHTML = btn.innerHTML, sendHTML = E.icon('send-horizontal', 44, '#fff', 2.2);
    E.frame((t) => {
      if (t < 3.8 || t > 8.7) return;
      const typing = t >= 4.55 && t < 5.25;
      let html = 'Ask AccountE anything…';
      if (typing) { const n = Math.round(Math.min(1, (t - 4.55) / 0.55) * MSG.length); html = MSG.slice(0, n) + (t < 5.1 || Math.floor(t * 4) % 2 ? '<i class="caret"></i>' : ''); }
      if (field.__l !== html) { field.innerHTML = html; field.__l = html; field.style.color = typing ? '#0f172a' : '#64748b'; }
      const st = typing ? 'send' : 'mic';
      if (btn.__s !== st) { btn.innerHTML = typing ? sendHTML : micHTML; btn.__s = st; }
    });
    E.ft(btn, 5.12, { scale: 1 }, { scale: 0.86, duration: 0.1, ease: 'power2.out' }); E.to(btn, 5.22, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
    // the empty state gives way to the conversation
    E.to(A2.empty, 5.25, { autoAlpha: 0, y: -50, duration: 0.35, ease: 'power2.in' });
    const uRow = E.div('', A2.list, `<div style="max-width:560px;background:linear-gradient(135deg,#6366F1,#7C5CF5);color:#fff;font:500 31px/1.35 var(--ui);padding:22px 30px;border-radius:30px 30px 8px 30px">${MSG}</div>`, { display: 'flex', justifyContent: 'flex-end' });
    E.tl.set(uRow, { display: 'none' }, 0); E.tl.set(uRow, { display: 'flex' }, 5.4);
    E.ft(uRow.firstChild, 5.4, { autoAlpha: 0, y: 26, scale: 0.94, transformOrigin: '100% 100%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
    // AI reply: reading → suggested transaction → confirmed by the user ("AccountE suggests, you confirm")
    const bRow = E.div('', A2.list, `${A2.av(58, 16, 32)}<div class="bb"></div>`, { display: 'flex', alignItems: 'flex-start', gap: '16px' });
    const bb = bRow.querySelector('.bb');
    E.tl.set(bRow, { display: 'none' }, 0); E.tl.set(bRow, { display: 'flex' }, 5.65);
    const proc = `<div style="background:#fff;border-radius:8px 30px 30px 30px;padding:22px 28px;box-shadow:0 4px 16px rgba(15,23,42,.06);display:inline-flex;align-items:center;font:500 29px var(--ui)"><span class="shim" style="background:linear-gradient(90deg,#64748b 0%,#64748b 38%,#6366f1 50%,#64748b 62%,#64748b 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent">Reading your message</span><span class="dots3"><i></i><i></i><i></i></span></div>`;
    const kv = (k, v, extra) => `<span style="color:#64748b">${k}</span><span style="text-align:right;color:#0f172a;${extra || ''}">${v}</span>`;
    const card = (saved) => `<div style="width:620px;background:#fff;border-radius:8px 30px 30px 30px;padding:26px 28px;box-shadow:0 6px 24px rgba(15,23,42,.08);font:500 28px var(--ui)">
      <div style="display:flex;align-items:center;justify-content:space-between"><span style="font:700 22px var(--ui);letter-spacing:.08em;color:#6366F1">SUGGESTED TRANSACTION</span>${saved ? `<span style="display:inline-flex;align-items:center;gap:8px;font:700 22px var(--ui);color:#15803D;background:#DCFCE7;border-radius:999px;padding:6px 14px">${E.icon('check', 22, '#15803D', 3)}Saved</span>` : `<span style="font:700 22px var(--ui);color:#DC2626;background:#FEE2E2;border-radius:999px;padding:6px 14px">Expense</span>`}</div>
      <div style="margin-top:18px;display:grid;grid-template-columns:auto 1fr;gap:14px 26px">${kv('Item', 'Lunch')}${kv('Amount', '$450.00', 'color:#DC2626;font-weight:700')}${kv('Category', 'Food &amp; Dining')}${kv('Account', 'Cash')}${kv('Date', 'Today')}</div>
      <div style="margin-top:22px;height:76px">${saved ? `<div style="height:76px;border-radius:20px;background:#DCFCE7;color:#15803D;font:700 28px var(--ui);display:flex;align-items:center;justify-content:center;gap:12px">${E.icon('circle-check', 34, '#15803D', 2.4)}Saved to transactions</div>` : `<div style="display:flex;gap:16px;height:76px"><div style="flex:1;border:2px solid #E2E8F0;border-radius:20px;display:flex;align-items:center;justify-content:center;font:600 28px var(--ui);color:#334155">Edit</div><div class="cf" style="flex:1.4;position:relative;overflow:hidden;background:#6366F1;border-radius:20px;display:flex;align-items:center;justify-content:center;font:700 28px var(--ui);color:#fff">Confirm<i class="rip" style="position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;background:rgba(255,255,255,.5);opacity:0"></i></div></div>`}</div></div>`;
    E.frame((t) => {
      if (t < 3.8 || t > 8.7) return;
      const st = t < 6.4 ? 'p' : t < 7.05 ? 's' : 'd';
      if (bb.__s !== st) { bb.innerHTML = st === 'p' ? proc : card(st === 'd'); bb.__s = st; }
      if (st === 'p') { const sh = bb.querySelector('.shim'); sh.style.backgroundPosition = `${(100 - ((t - 5.65) / 0.75) * 100).toFixed(1)}% 0`; bb.querySelectorAll('.dots3 i').forEach((d, i) => { d.style.transform = `translateY(${(-Math.max(0, Math.sin((t * 7 - i * 0.9))) * 8).toFixed(1)}px)`; }); }
      if (st === 's') { const cf = bb.querySelector('.cf'), rip = bb.querySelector('.rip'); const u = (t - 6.82) / 0.23; cf.style.transform = `scale(${(u > 0 && u < 1 ? 1 - Math.sin(u * Math.PI) * 0.05 : 1).toFixed(3)})`; rip.style.opacity = (u > 0 ? Math.max(0, 0.9 - u * 0.9) : 0).toFixed(2); rip.style.transform = `scale(${(u > 0 ? 1 + u * 7 : 1).toFixed(2)})`; }
    });
    E.ft(bb, 5.65, { autoAlpha: 0, y: 20, scale: 0.95, transformOrigin: '0% 0%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
    E.to(bb, 6.4, { scale: 0.98, duration: 0.06 }); E.to(bb, 6.46, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
    // a touch indicator taps "Confirm" (tutorial style)
    const touch = E.div('abs', ph.screen, '<i style="position:absolute;inset:0;border-radius:50%;background:rgba(15,23,42,.18);border:4px solid rgba(255,255,255,.9);box-shadow:0 4px 14px rgba(0,0,0,.25)"></i>', { width: '78px', height: '78px', zIndex: 70, opacity: 0 });
    E.frame((t) => { if (t < 6.6 || t > 7.35) { touch.style.opacity = 0; return; } const cf = bb.querySelector('.cf') || touch.__cf; if (cf) { touch.__cf = cf; const sr = ph.screen.getBoundingClientRect(), r = cf.getBoundingClientRect(), k = sr.width / ph.screen.offsetWidth; touch.style.left = ((r.left - sr.left) / k + (r.width / k) * 0.5 - 39).toFixed(1) + 'px'; touch.style.top = ((r.top - sr.top) / k + (r.height / k) * 0.5 - 39).toFixed(1) + 'px'; } const a = t < 6.75 ? (t - 6.6) / 0.15 : t > 7.15 ? Math.max(0, 1 - (t - 7.15) / 0.2) : 1; touch.style.opacity = a.toFixed(2); touch.style.transform = `scale(${(t > 6.82 && t < 7.0 ? 0.85 : 1)})`; });
    // AI processing: light sweep across the screen + cyan rim pulse
    const sweep = E.div('fill', ph.screen, null, { background: 'linear-gradient(115deg,rgba(103,232,249,0) 38%,rgba(103,232,249,.22) 50%,rgba(103,232,249,0) 62%)', backgroundSize: '300% 100%', zIndex: 60, opacity: 0 });
    E.ft(sweep, 5.65, { opacity: 0, backgroundPosition: '100% 0' }, { opacity: 1, backgroundPosition: '0% 0', duration: 0.75, ease: 'power1.inOut' }); E.to(sweep, 6.4, { opacity: 0, duration: 0.15 });
    const rim = E.div('abs', wrap, null, { left: phX - 6 + 'px', top: phY - 6 + 'px', width: phW + 12 + 'px', height: phH + 12 + 'px', borderRadius: '44px', boxShadow: `0 0 0 3px ${CYAN}, 0 0 60px rgba(34,211,238,.55)`, opacity: 0 });
    E.ft(rim, 5.65, { opacity: 0 }, { opacity: 0.9, duration: 0.3 }); E.to(rim, 6.2, { opacity: 0, duration: 0.45 });
    // success chip (readable at phone size)
    const chip = E.div('abs', wrap, `<span class="ck" style="position:relative;width:72px;height:72px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(34,197,94,.55)">${E.icon('check', 44, '#fff', 3)}<i class="rp" style="position:absolute;inset:-6px;border-radius:50%;border:3px solid rgba(52,211,153,.8)"></i></span><span style="font:700 42px Urbanist;color:#fff;letter-spacing:-.01em">Transaction recorded</span>`, { left: cx + 'px', top: phY + phH - 150 + 'px', display: 'flex', alignItems: 'center', gap: '22px', padding: '18px 38px 18px 18px', borderRadius: '999px', background: 'linear-gradient(135deg,rgba(15,30,80,.92),rgba(10,24,70,.88))', border: '2px solid rgba(52,211,153,.55)', boxShadow: '0 24px 60px rgba(0,3,30,.55), 0 0 40px rgba(34,197,94,.18)', whiteSpace: 'nowrap' });
    gsap.set(chip, { xPercent: -50 });
    E.ft(chip, 7.15, { autoAlpha: 0, y: 40, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.7)' });
    const rp = chip.querySelector('.rp');
    E.frame((t) => { if (t < 7.15 || t > 8.7) return; const u = ((t - 7.3) % 0.9) / 0.9; rp.style.transform = `scale(${(1 + Math.max(0, u) * 0.45).toFixed(3)})`; rp.style.opacity = (t < 7.3 ? 0 : 0.8 * (1 - u)).toFixed(3); });
    E.to(head, 8.0, { autoAlpha: 0, y: -30, duration: 0.45, ease: 'power2.in' });
    E.to(wrap, 8.0, { autoAlpha: 0, y: 200, scale: 0.92, duration: 0.6, ease: 'power2.in' }); }

  /* ---------- S3–S5 7.9–20 · five methods → five-ways reveal → logo ---------- */
  s = E.scene(7.9, 20);
  const root = E.div('fill', s);
  const METHODS = [
    ['Text', 'message-circle'], ['Voice', 'mic'], ['Receipt Scan', 'receipt-text'], ['Email', 'mail'], ['SMS', 'smartphone'],
  ];
  const A = [9.1, 10.4, 11.7, 13.0, 14.3];          // arrival of each method (one per beat of the VO list)
  const rowY = (i) => 530 + i * 204, cardX = 120, cardW = 840, cardH = 168;
  // eyebrow + progress dots
  const eyebrow = ct(root, '5 WAYS TO RECORD', cx, 392, 30, 'sub', { letterSpacing: '0.26em', fontWeight: 700 });
  E.ft(eyebrow, 8.2, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 });
  const prog = Array.from({ length: 5 }, (_, i) => E.div('abs', root, null, { left: cx - 70 + i * 32 - 7 + 'px', top: '440px', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,.22)' }));
  prog.forEach((p, i) => { E.ft(p, 8.3 + i * 0.05, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.4 }); E.to(p, A[i], { background: CYAN, boxShadow: '0 0 14px rgba(34,211,238,.9)', scale: 1.25, duration: 0.3 }); E.to(p, A[i] + 0.3, { scale: 1, duration: 0.3 }); });
  E.to([eyebrow].concat(prog), 15.85, { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' });
  // empty slots announce "five" before the methods fill them
  const slots = METHODS.map((_, i) => E.div('abs', root, null, { left: cardX + 'px', top: rowY(i) + 'px', width: cardW + 'px', height: cardH + 'px', borderRadius: '40px', border: '2px dashed rgba(255,255,255,.14)' }));
  slots.forEach((sl, i) => { E.ft(sl, 8.35 + i * 0.09, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.45 }); E.to(sl, A[i] + 0.2, { autoAlpha: 0, duration: 0.3 }); });

  // icon tile contents with a looping micro-animation each
  function tileArt(i) {
    const ic = (n, sz) => E.icon(n, sz || 60, ICE, 2);
    if (i === 0) return `<div style="position:relative;width:64px;height:64px">${ic('message-circle', 64)}<span class="td" style="position:absolute;left:0;right:0;top:27px;display:flex;justify-content:center;gap:6px">${('<i style="width:7px;height:7px;border-radius:50%;background:' + ICE + ';display:block"></i>').repeat(3)}</span></div>`;
    if (i === 1) return `<div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center">${ic('mic', 58)}<i class="r1" style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${CYAN2}"></i><i class="r2" style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${CYAN2}"></i></div>`;
    if (i === 2) return `<div style="position:relative;width:64px;height:64px">${ic('receipt-text', 62)}<i class="sl" style="position:absolute;left:-8px;right:-8px;height:3px;top:0;border-radius:3px;background:${CYAN2};box-shadow:0 0 12px ${CYAN},0 0 4px #fff"></i></div>`;
    if (i === 3) return `<div style="position:relative;width:64px;height:64px">${ic('mail', 62)}<span class="fw" style="position:absolute;right:-26px;top:-20px;width:38px;height:38px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(34,211,238,.8)">${E.icon('forward', 24, '#03122e', 2.6)}</span></div>`;
    return `<div style="position:relative;width:64px;height:64px">${ic('smartphone', 62)}<span class="bd" style="position:absolute;right:-24px;top:-18px;width:40px;height:34px;border-radius:12px 12px 12px 4px;background:${CYAN};display:flex;align-items:center;justify-content:center;gap:3px;box-shadow:0 0 14px rgba(34,211,238,.8)">${'<i style="width:5px;height:5px;border-radius:50%;background:#03122e;display:block"></i>'.repeat(3)}</span></div>`;
  }
  // radial layout for the reveal (Text at the top, clockwise)
  const RC = { x: cx, y: 1110 }, RR = 360;
  const pos = METHODS.map((_, k) => { const a = (-90 + 72 * k) * Math.PI / 180; return { x: RC.x + RR * Math.cos(a), y: RC.y + RR * Math.sin(a), dx: Math.cos(a), dy: Math.sin(a) }; });
  const TS = 168 / 116;   // tile scale in the reveal
  const cards = METHODS.map(([name], i) => {
    const y = rowY(i);
    const bg = E.div('glass', root, null, { left: cardX + 'px', top: y + 'px', width: cardW + 'px', height: cardH + 'px' });
    const glow = E.div('abs', root, null, { left: cardX + 'px', top: y + 'px', width: cardW + 'px', height: cardH + 'px', borderRadius: '40px', border: `2px solid ${CYAN}`, boxShadow: '0 0 38px rgba(34,211,238,.38), inset 0 0 30px rgba(34,211,238,.10)', opacity: 0 });
    const tile = E.div('tile', root, tileArt(i), { left: cardX + 26 + 'px', top: y + 26 + 'px' });
    const label = E.div('abs h2', root, name, { left: cardX + 176 + 'px', top: y + cardH / 2 - 30 + 'px', fontSize: '50px', lineHeight: '60px' });
    const idx = E.div('abs', root, '0' + (i + 1), { right: W - cardX - cardW + 44 + 'px', top: y + cardH / 2 - 20 + 'px', font: `700 32px Urbanist`, color: IDX, letterSpacing: '.06em', lineHeight: '40px' });
    const t = A[i];
    E.ft([bg, tile, label, idx], t, { autoAlpha: 0, x: 90 }, { autoAlpha: 1, x: 0, duration: 0.65, ease: 'power3.out', stagger: 0.04 });
    E.ft(tile, t + 0.12, { scale: 0.6, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)' });
    E.ft(glow, t, { opacity: 0 }, { opacity: 1, duration: 0.35 }); E.to(glow, i < 4 ? A[i + 1] : 15.6, { opacity: 0, duration: 0.5 });
    // light sweep across every card once all five are in
    bg.style.overflow = 'hidden';
    const sw = E.div('abs', bg, null, { left: '-240px', top: '-60%', width: '170px', height: '220%', background: 'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.16),rgba(255,255,255,0))', transform: 'rotate(18deg)' });
    E.ft(sw, 15.0 + i * 0.09, { x: 0 }, { x: cardW + 420, duration: 0.85, ease: 'power1.inOut' });
    // 16.0 → morph into the radial layout
    const p = pos[i];
    E.to([bg, idx], 16.0, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' });
    E.to(label, 16.0, { autoAlpha: 0, x: -20, duration: 0.25, ease: 'power2.in' });
    E.to(tile, 16.05, { x: p.x - (cardX + 26 + 58), y: p.y - (y + 26 + 58), scale: TS, duration: 0.75, ease: 'power3.inOut' });
    const rl = ct(root, name, p.x, i === 0 || i === 1 || i === 4 ? p.y - 126 : p.y + 124, 40, 'h2');
    E.ft(rl, 16.55 + i * 0.04, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45 });
    // 18.0 → collapse into the AccountE mark
    E.to(tile, 18.0, { x: RC.x - (cardX + 26 + 58), y: RC.y - (y + 26 + 58), scale: 0.3, autoAlpha: 0, duration: 0.42, ease: 'power2.in' });
    E.to(rl, 18.0, { autoAlpha: 0, duration: 0.2 });
    return { tile, i };
  });
  // micro-animations (run while the methods are on screen)
  E.frame((t) => {
    if (t < 8.9 || t > 18.5) return;
    cards.forEach(({ tile, i }) => {
      const u = t - A[i]; if (u < 0) return;
      if (i === 0) tile.querySelectorAll('.td i').forEach((d, k) => { d.style.transform = `translateY(${(-Math.max(0, Math.sin(t * 6.5 - k * 0.9)) * 5).toFixed(1)}px)`; });
      if (i === 1) ['.r1', '.r2'].forEach((c, k) => { const q = ((u + k * 0.6) % 1.2) / 1.2; const r = tile.querySelector(c); r.style.transform = `scale(${(0.85 + q * 0.75).toFixed(3)})`; r.style.opacity = (0.75 * (1 - q)).toFixed(3); });
      if (i === 2) { const q = (Math.sin(u * 3.2 - Math.PI / 2) + 1) / 2; tile.querySelector('.sl').style.top = (4 + q * 54).toFixed(1) + 'px'; }
      if (i === 3) { const q = (u % 1.3) / 1.3; const fw = tile.querySelector('.fw'); fw.style.transform = `translate(${(q * 14).toFixed(1)}px,${(-q * 4).toFixed(1)}px) scale(${q < 0.15 ? (q / 0.15).toFixed(3) : 1})`; fw.style.opacity = (q < 0.75 ? 1 : (1 - q) / 0.25).toFixed(3); }
      if (i === 4) { const q = (u % 1.4) / 1.4; const bd = tile.querySelector('.bd'); const sc = q < 0.18 ? 0.4 + (q / 0.18) * 0.75 : q < 0.3 ? 1.15 - ((q - 0.18) / 0.12) * 0.15 : 1; bd.style.transform = `scale(${sc.toFixed(3)})`; bd.style.opacity = q > 0.85 ? ((1 - q) / 0.15).toFixed(3) : 1; }
    });
  });

  /* ---------- S4 16–18 · five-ways reveal: AI hub + connecting lines ---------- */
  const hl1 = maskLine(root, '<span class="grad">5 Easy Ways</span> to', 330, 66), hl2 = maskLine(root, 'Record Transactions', 414, 66);
  E.ft(hl1.inner, 16.2, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' });
  E.ft(hl2.inner, 16.32, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' });
  E.to([hl1.wrap, hl2.wrap], 18.0, { autoAlpha: 0, y: -30, duration: 0.3, ease: 'power2.in' });
  const NS = 'http://www.w3.org/2000/svg';
  const net = document.createElementNS(NS, 'svg'); net.setAttribute('width', W); net.setAttribute('height', H); net.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  root.insertBefore(net, root.firstChild.nextSibling);   // lines sit behind the tiles
  const mk = (x1, y1, x2, y2, col, w, op) => { const l = document.createElementNS(NS, 'line'); Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v.toFixed(1))); l.setAttribute('stroke', col); l.setAttribute('stroke-width', w); l.setAttribute('stroke-linecap', 'round'); l.setAttribute('pathLength', 1); l.style.strokeDasharray = '1 1'; l.style.opacity = op; net.appendChild(l); return l; };
  const spokesGlow = pos.map((p) => mk(RC.x + p.dx * 134, RC.y + p.dy * 134, p.x - p.dx * 98, p.y - p.dy * 98, CYAN, 12, 0.18));
  const spokes = pos.map((p) => mk(RC.x + p.dx * 134, RC.y + p.dy * 134, p.x - p.dx * 98, p.y - p.dy * 98, CYAN2, 3, 0.9));
  const edges = pos.map((p, k) => { const q = pos[(k + 1) % 5]; const ex = q.x - p.x, ey = q.y - p.y, L = Math.hypot(ex, ey); return mk(p.x + ex / L * 100, p.y + ey / L * 100, q.x - ex / L * 100, q.y - ey / L * 100, '#FFFFFF', 2, 0.22); });
  E.ft(spokes, 16.6, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', stagger: 0.06 });
  E.ft(spokesGlow, 16.6, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', stagger: 0.06 });
  E.set(net, 0, { autoAlpha: 0 }); E.set(net, 16.58, { autoAlpha: 1 });
  E.ft(edges, 16.8, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05 });
  E.to(net, 18.0, { opacity: 0, duration: 0.25 });
  // data pulses travelling from each method into the hub
  const pulses = pos.map(() => E.div('abs', root, null, { left: '0px', top: '0px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', boxShadow: `0 0 14px ${CYAN}, 0 0 4px #fff`, opacity: 0 }));
  E.frame((t) => { pulses.forEach((d, k) => { const p = pos[k]; const u = ((t - 17.0 - k * 0.13) % 0.8) / 0.8; if (t < 17.0 + k * 0.13 || t > 18.0) { d.style.opacity = 0; return; } const r = 134 + (1 - u) * (RR - 98 - 134); const x = RC.x + p.dx * r, y = RC.y + p.dy * r; d.style.transform = `translate(${(x - 7).toFixed(1)}px,${(y - 7).toFixed(1)}px)`; d.style.opacity = Math.min(1, u * 6, (1 - u) * 6).toFixed(2); }); });
  // the AccountE mark as the AI hub
  const hubHalo = E.div('abs', root, null, { left: RC.x - 240 + 'px', top: RC.y - 240 + 'px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(1,129,250,.55),rgba(34,211,238,.16) 55%,rgba(34,211,238,0))' });
  const hubRing = E.div('abs', root, null, { left: RC.x - 126 + 'px', top: RC.y - 126 + 'px', width: '252px', height: '252px', borderRadius: '50%', border: '2px solid rgba(103,232,249,.55)', boxShadow: '0 0 30px rgba(34,211,238,.25), inset 0 0 30px rgba(34,211,238,.12)', background: 'radial-gradient(closest-side,rgba(6,22,80,.85),rgba(6,22,80,.55))' });
  const HW = 146, HH = HW * 1054 / 923;
  const hub = E.logoIcon(root, HW, { left: RC.x - HW / 2 + 'px', top: RC.y - HH / 2 + 'px' });
  E.ft([hubHalo, hubRing], 16.3, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
  E.ft(hub, 16.4, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' });
  E.frame((t) => { if (t >= 16.9 && t <= 18.0) hubHalo.style.scale = (1 + Math.sin((t - 16.9) * 5) * 0.06).toFixed(4); });

  /* ---------- S5 18–20 · methods merge into the logo → "Let's Get Started" ---------- */
  const wmW = 760, wmL = cx - wmW / 2, wmT = 812;
  const wm = E.wordmark(root, { width: wmW, left: wmL, top: wmT, color: '#fff' });
  const mg5 = markGlow(wm, wmL, wmT, wmW, 280); E.ft(mg5, 18.55, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.6 });
  const wIcon = wm.glyph('icon'); const letters = wm.glyphs.filter((q) => q.k !== 'icon');
  E.set(wIcon, 0, { opacity: 0 }); letters.forEach((q) => E.set(q.els, 0, { opacity: 0 }));
  E.set(wm, 0, { autoAlpha: 0 }); E.set(wm, 18.4, { autoAlpha: 1 });   // keep the glow layer off until the reveal
  // where the mark sits inside the official wordmark (measured from the SVG)
  const wsvg = wm.querySelector('svg'); const vb = wsvg.viewBox.baseVal; const kk = wmW / vb.width;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; wIcon.forEach((pth) => { const b = pth.getBBox(); bx0 = Math.min(bx0, b.x); by0 = Math.min(by0, b.y); bx1 = Math.max(bx1, b.x + b.width); by1 = Math.max(by1, b.y + b.height); });
  const slot = { x: wmL + ((bx0 + bx1) / 2) * kk, y: wmT + ((by0 + by1) / 2) * kk, w: (bx1 - bx0) * kk };
  E.to([hubRing], 18.2, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in' });
  E.to(hubHalo, 18.22, { scale: 1.35, opacity: 0, duration: 0.6, ease: 'power2.out' });
  E.to(hub, 18.22, { x: slot.x - RC.x, y: slot.y - RC.y, scale: slot.w / HW, duration: 0.55, ease: 'power3.inOut' });
  E.to(hub, 18.75, { autoAlpha: 0, duration: 0.12 }); E.to(wIcon, 18.73, { opacity: 1, duration: 0.12 });
  letters.forEach((q, i) => E.ft(q.els, 18.45 + i * 0.04, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }));
  const endHalo = E.div('abs', root, null, { left: cx - 560 + 'px', top: wmT + 57 - 300 + 'px', width: '1120px', height: '600px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(1,129,250,.36),rgba(2,4,245,.12) 55%,rgba(2,4,245,0))' });
  E.ft(endHalo, 18.35, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' });
  const streak = E.div('abs', root, null, { left: cx - 300 + 'px', top: wmT + 162 + 'px', width: '600px', height: '3px', borderRadius: '3px', background: `linear-gradient(90deg,rgba(103,232,249,0),${CYAN2} 50%,rgba(103,232,249,0))`, boxShadow: '0 0 18px rgba(34,211,238,.7)' });
  E.ft(streak, 18.6, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.6, ease: 'power3.inOut' });
  const go = ct(root, `<span style="display:inline-flex;align-items:center;gap:26px">Let’s Get Started<span class="arw" style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,${CYAN2},#0EA5E9);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(34,211,238,.6)">${E.icon('arrow-right', 42, '#03122e', 2.8)}</span></span>`, cx, 1090, 70, 'h2');
  E.ft(go, 18.62, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' });
  const arw = go.querySelector('.arw');
  E.frame((t) => { if (t >= 18.62 && t <= 20) arw.style.translate = `${(Math.max(0, Math.sin((t - 18.95) * 6)) * 10).toFixed(1)}px 0`; });
  // clean cut point: content and particles fade out, the navy background stays
  E.to([root, parts], 19.6, { opacity: 0, duration: 0.33, ease: 'power2.inOut' });

  E.ready().then(() => { window.__ready = true; });
})();
