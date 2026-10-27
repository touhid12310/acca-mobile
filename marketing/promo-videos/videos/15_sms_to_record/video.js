/* 15 · Feature bumper — "SMS to Record" · 9:16 · 5 s · silent
   Shared style with 11–14. No phone numbers, account numbers or bank details: the SMS and the record use placeholder bars.
   0–1 phone receives an SMS · 1–3 SMS moves into an AI circle with a cyan scan · 3–4 transaction recognised, record generated ·
   4–5 record shown as "Pending" + headline. */
(function () {
  const { W, H } = E;
  E.duration = 5;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', AMBER = '#B45309';
  const cx = W / 2;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  E.css(`.h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.028em;line-height:1}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .bar{display:block;height:20px;border-radius:10px;background:#DCE1EA}`);

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
  const wmW = 270, wm = E.wordmark(s, { width: wmW, left: cx - wmW / 2, top: 400, color: '#fff' });
  E.ft(wm, 0.15, { autoAlpha: 0, y: -16 }, { autoAlpha: 0.92, y: 0, duration: 0.5, ease: 'power3.out' });

  /* ---------- 0–1 s: phone outline receives an SMS ---------- */
  const PW = 400, PH = 780, PX = cx - PW / 2, PY = 560;
  const phone = E.div('abs', s, `<svg width="${PW}" height="${PH}" style="position:absolute;left:0;top:0;overflow:visible">
      <rect x="3" y="3" width="${PW - 6}" height="${PH - 6}" rx="62" fill="rgba(255,255,255,.04)" stroke="rgba(224,250,255,.85)" stroke-width="5"/>
      <rect x="${PW / 2 - 52}" y="24" width="104" height="26" rx="13" fill="rgba(224,250,255,.85)"/>
      <rect x="${PW / 2 - 70}" y="${PH - 30}" width="140" height="7" rx="4" fill="rgba(224,250,255,.5)"/>
      <rect x="${PW}" y="170" width="6" height="90" rx="3" fill="rgba(224,250,255,.6)"/></svg>`,
    { left: PX + 'px', top: PY + 'px', width: PW + 'px', height: PH + 'px', transformOrigin: '50% 30%' });
  E.ft(phone, 0.05, { autoAlpha: 0, y: 60, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
  // the SMS notification (no sender number, no text: placeholder bars only)
  const NW = 540, NH = 170;
  const sms = E.div('abs', s, `<div style="width:${NW}px;height:${NH}px;box-sizing:border-box;border-radius:34px;background:#FFFFFF;box-shadow:0 22px 50px rgba(0,4,40,.45);padding:24px 28px;display:flex;gap:22px">
      <span style="width:76px;height:76px;border-radius:22px;background:linear-gradient(145deg,#22C55E,#16A34A);display:flex;align-items:center;justify-content:center;flex:none">${E.icon('message-square-text', 42, '#fff', 2.2)}</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:12px;padding-top:4px">
        <span style="display:flex;justify-content:space-between;align-items:center"><span style="font:700 30px Roboto;color:#0f172a">Messages</span><span style="font:400 26px Roboto;color:#64748b">now</span></span>
        <i class="bar" style="width:300px;background:#C3CAD6"></i><i class="bar" style="width:210px"></i></span></div>`,
    { left: cx - NW / 2 + 'px', top: PY + 90 + 'px', transformOrigin: '50% 50%' });
  E.ft(sms, 0.55, { autoAlpha: 0, y: -60, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
  const ping = E.div('abs', s, null, { left: cx - NW / 2 + 'px', top: PY + 90 + 'px', width: NW + 'px', height: NH + 'px', borderRadius: '34px', border: `3px solid ${CYAN2}`, opacity: 0 });
  E.frame((t) => { const q = (t - 0.8) / 0.5; if (q < 0 || q > 1) { ping.style.opacity = 0; return; } ping.style.transform = `scale(${(1 + q * 0.12).toFixed(3)})`; ping.style.opacity = (0.9 * (1 - q)).toFixed(2); });

  /* ---------- 1–3 s: SMS moves into the AI circle, cyan scan ---------- */
  const AC = { x: cx, y: 1060 }, AR = 170;
  const ai = E.div('abs', s, `
    <div class="halo" style="position:absolute;left:-150px;top:-150px;width:${AR * 2 + 300}px;height:${AR * 2 + 300}px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.28),rgba(37,99,235,.14) 55%,rgba(37,99,235,0))"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 35%,#0E3A86,#06164A 70%);border:3px solid rgba(103,232,249,.6);box-shadow:0 24px 60px rgba(0,4,40,.5),inset 0 0 40px rgba(34,211,238,.18);overflow:hidden">
      <div class="scan" style="position:absolute;left:0;right:0;top:0;height:0;"><i style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(34,211,238,0),rgba(34,211,238,.28))"></i><i style="position:absolute;left:0;right:0;bottom:-3px;height:6px;background:${CYAN2};box-shadow:0 0 18px ${CYAN},0 0 6px #fff"></i></div>
      <div class="ic" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 120, '#E0FAFF', 1.8)}</div></div>
    <svg class="arc" width="${AR * 2 + 60}" height="${AR * 2 + 60}" style="position:absolute;left:-30px;top:-30px;overflow:visible"><circle cx="${AR + 30}" cy="${AR + 30}" r="${AR + 20}" fill="none" stroke="${CYAN2}" stroke-width="5" stroke-linecap="round" stroke-dasharray="150 70 50 70"/></svg>`,
    { left: AC.x - AR + 'px', top: AC.y - AR + 'px', width: AR * 2 + 'px', height: AR * 2 + 'px', transformOrigin: '50% 50%' });
  E.to(phone, 1.0, { autoAlpha: 0, y: -80, scale: 0.9, duration: 0.45, ease: 'power2.in' });
  E.ft(ai, 1.15, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
  E.to(sms, 1.25, { y: AC.y - (PY + 90 + NH / 2), scale: 0.22, duration: 0.85, ease: 'power3.in' });
  E.to(sms, 2.02, { autoAlpha: 0, duration: 0.1 });
  const arc = ai.querySelector('.arc'), scan = ai.querySelector('.scan'), halo = ai.querySelector('.halo'), aiIc = ai.querySelector('.ic');
  E.frame((t) => {
    arc.style.rotate = (t * 220).toFixed(1) + 'deg'; halo.style.scale = (1 + Math.sin(t * 8) * 0.05).toFixed(3);
    const p = t < 2.05 || t > 3.0 ? 0 : (Math.sin(((t - 2.05) / 0.95) * Math.PI * 2 - Math.PI / 2) + 1) / 2;   // down and back up once
    scan.style.height = (p * AR * 2).toFixed(1) + 'px'; scan.style.opacity = t < 2.05 || t > 3.0 ? 0 : 1;
  });
  E.ft(ai, 2.04, { scale: 1 }, { scale: 1.08, duration: 0.1 }); E.to(ai, 2.14, { scale: 1, duration: 0.3, ease: 'back.out(3)' });

  /* ---------- 3–4 s: recognised → record generated ---------- */
  const det = ct(`<span style="display:inline-flex;align-items:center;gap:14px;padding:16px 30px 16px 18px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(103,232,249,.6)"><span style="width:50px;height:50px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center">${E.icon('check', 30, '#03122e', 3)}</span>Transaction detected</span>`, cx, AC.y + AR + 110, 38, 'h1', { fontWeight: 700 });
  E.ft(det, 3.0, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }); E.to(det, 3.6, { autoAlpha: 0, y: 30, duration: 0.25 });
  E.to(aiIc, 3.0, { scale: 1.15, duration: 0.15 }); E.to(aiIc, 3.15, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
  const CW = 860, CH = 500, CX = cx - CW / 2, CY = 1110 - CH / 2;
  E.to(ai, 3.5, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in' });
  const card = E.div('abs', s, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '40px', background: '#FFFFFF', boxShadow: '0 30px 80px rgba(0,4,40,.45), 0 0 0 2px rgba(103,232,249,.35)', transformOrigin: '50% 50%' });
  E.ft(card, 3.55, { autoAlpha: 0, scale: 0.6, borderRadius: '200px' }, { autoAlpha: 1, scale: 1, borderRadius: '40px', duration: 0.45, ease: 'back.out(1.3)' });
  const ROWS = [['Amount', 'banknote', `<i class="bar" style="width:170px"></i>`], ['Date', 'calendar', `<i class="bar" style="width:200px"></i>`], ['Source', 'message-square-text', `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 18px;border-radius:999px;background:#EEF0FF;font:700 28px Roboto;color:#4F46E5">SMS</span>`]];
  const body = E.div('abs', s, `
    <div style="position:absolute;left:44px;top:40px;display:flex;align-items:center;gap:18px"><span style="width:68px;height:68px;border-radius:18px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 38, '#4F46E5', 2.2)}</span><span style="font:700 40px Roboto;color:#0f172a">New transaction</span></div>
    <div class="pend" style="position:absolute;right:40px;top:50px;display:flex;align-items:center;gap:10px;padding:10px 22px;border-radius:999px;background:#FEF3C7;border:2px solid #FCD34D;font:700 31px Roboto;color:${AMBER}">${E.icon('clock', 31, AMBER, 2.4)}Pending</div>
    <div style="position:absolute;left:44px;right:44px;top:146px;height:2px;background:#EEF0F5"></div>
    ${ROWS.map(([n, ic, v], k) => `<div class="cr" style="position:absolute;left:44px;right:44px;top:${168 + k * 92}px;height:70px;display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:16px;font:500 36px Roboto;color:#475569">${E.icon(ic, 34, '#64748b', 2)}${n}</span>${v}</div>`).join('')}
    <div style="position:absolute;left:44px;right:44px;bottom:30px;font:500 27px Roboto;color:#64748b;text-align:center">Imported from SMS · review to confirm</div>`,
    { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px' });
  E.ft(body, 3.8, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  body.querySelectorAll('.cr').forEach((r, k) => E.ft(r, 3.85 + k * 0.06, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.25 }));

  /* ---------- 4–5 s: Pending label + headline ---------- */
  const pend = body.querySelector('.pend');
  E.ft(pend, 4.05, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' });
  E.frame((t) => { pend.style.boxShadow = t > 4.4 ? `0 0 0 ${((Math.sin((t - 4.4) * 10) * 0.5 + 0.5) * 6).toFixed(1)}px rgba(252,211,77,.35)` : 'none'; });
  E.to(wm, 3.95, { y: -30, duration: 0.4, ease: 'power3.out' });
  const title = ct('<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln"><span class="grad">SMS</span> to Record</div></div>', cx, 610, 100);
  E.ft(title.querySelector('.ln'), 4.0, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: 'power4.out' });

  E.ready().then(() => { window.__ready = true; });
})();
