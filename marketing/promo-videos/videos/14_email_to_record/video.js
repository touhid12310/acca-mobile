/* 14 · Feature bumper — "Email to Record" · 9:16 · 5 s · silent
   Shared style with 11–13. No real sender, vendor or amount: placeholder bars only.
   0–1 envelope + PDF invoice · 1–3 forwarded across to the AccountE symbol · 3–4 AI extracts invoice fields ·
   4–5 becomes a transaction card marked "Pending Review" (awaits the user's confirmation, not saved automatically). */
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

  /* ---------- brand + title ---------- */
  const wmW = 270, wm = E.wordmark(s, { width: wmW, left: cx - wmW / 2, top: 400, color: '#fff' });
  E.ft(wm, 0.15, { autoAlpha: 0, y: -16 }, { autoAlpha: 0.92, y: 0, duration: 0.5, ease: 'power3.out' });
  const title = ct('<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln"><span class="grad">Email</span> to Record</div></div>', cx, 610, 100);
  E.ft(title.querySelector('.ln'), 0.35, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });

  /* ---------- AccountE symbol (destination) ---------- */
  const AP = { x: 790, y: 1300 }, AS = 190;
  const app = E.div('abs', s, null, { left: AP.x - AS / 2 + 'px', top: AP.y - AS / 2 + 'px', width: AS + 'px', height: AS + 'px', transformOrigin: '50% 50%' });
  const appHalo = E.div('abs', app, null, { left: '-130px', top: '-130px', width: AS + 260 + 'px', height: AS + 260 + 'px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(1,129,250,.5),rgba(34,211,238,.14) 55%,rgba(34,211,238,0))' });
  E.div('abs', app, null, { left: 0, top: 0, width: AS + 'px', height: AS + 'px', borderRadius: '50px', background: 'linear-gradient(145deg,#0B2A6B,#06164A)', border: '2px solid rgba(103,232,249,.6)', boxShadow: '0 24px 60px rgba(0,4,40,.5), inset 0 1px 0 rgba(255,255,255,.18)' });
  const IW = 104; E.logoIcon(app, IW, { left: (AS - IW) / 2 + 'px', top: (AS - IW * 1054 / 923) / 2 + 'px' });
  const ring = E.div('abs', app, `<svg width="${AS + 70}" height="${AS + 70}" style="overflow:visible"><circle cx="${(AS + 70) / 2}" cy="${(AS + 70) / 2}" r="${(AS + 50) / 2}" fill="none" stroke="${CYAN2}" stroke-width="5" stroke-linecap="round" stroke-dasharray="120 60 40 60"/></svg>`, { left: '-35px', top: '-35px', width: AS + 70 + 'px', height: AS + 70 + 'px', opacity: 0 });
  E.ft(app, 0.75, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' });

  /* ---------- envelope + PDF invoice ---------- */
  const EV = { x: 330, y: 1000 }, EW = 330, EH = 230;
  const env = E.div('abs', s, `
    <svg width="${EW}" height="${EH}" style="position:absolute;left:0;top:0;overflow:visible">
      <rect x="0" y="0" width="${EW}" height="${EH}" rx="26" fill="#FFFFFF"/>
      <path d="M14 22 L${EW / 2} ${EH * 0.56} L${EW - 14} 22" fill="none" stroke="#C7D0DD" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 ${EH - 18} L${EW * 0.38} ${EH * 0.5} M${EW - 18} ${EH - 18} L${EW * 0.62} ${EH * 0.5}" fill="none" stroke="#E2E8F0" stroke-width="5" stroke-linecap="round"/>
    </svg>
    <div class="pdf" style="position:absolute;right:-46px;bottom:-56px;width:112px;height:136px;transform:rotate(8deg)">
      <svg width="112" height="136" style="position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(0 10px 18px rgba(0,4,40,.35))"><path d="M10 0 H78 L112 34 V126 Q112 136 102 136 H10 Q0 136 0 126 V10 Q0 0 10 0 Z" fill="#fff"/><path d="M78 0 V24 Q78 34 88 34 H112" fill="#E2E8F0"/><rect x="16" y="56" width="62" height="8" rx="4" fill="#D7DCE5"/><rect x="16" y="72" width="80" height="8" rx="4" fill="#D7DCE5"/><rect x="16" y="88" width="50" height="8" rx="4" fill="#D7DCE5"/></svg>
      <span style="position:absolute;left:-14px;bottom:14px;padding:5px 12px;border-radius:9px;background:#DC2626;font:800 24px Roboto;color:#fff;letter-spacing:.04em">PDF</span>
      <span style="position:absolute;left:34px;top:-30px;transform:rotate(-20deg)">${E.icon('paperclip', 46, CYAN2, 2.4)}</span>
    </div>`, { left: EV.x - EW / 2 + 'px', top: EV.y - EH / 2 + 'px', width: EW + 'px', height: EH + 'px', transformOrigin: '50% 50%' });
  E.ft(env, 0.1, { autoAlpha: 0, y: 70, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: 'power3.out' });
  E.ft(env.querySelector('.pdf'), 0.5, { autoAlpha: 0, scale: 0.4, rotation: -20 }, { autoAlpha: 1, scale: 1, rotation: 8, duration: 0.45, ease: 'back.out(2)' });

  /* ---------- 1–3 s: forwarded across to AccountE ---------- */
  const fw = E.div('abs', s, `<div style="display:flex;align-items:center;gap:14px;padding:14px 26px 14px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(103,232,249,.55)"><span style="width:52px;height:52px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center">${E.icon('forward', 30, '#03122e', 2.6)}</span><span style="font:700 36px Urbanist;color:#fff">Forward</span></div>`, { left: EV.x - 120 + 'px', top: EV.y - EH / 2 - 120 + 'px' });
  E.ft(fw, 0.95, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' }); E.to(fw, 1.75, { autoAlpha: 0, y: -16, duration: 0.25 });
  const P0 = EV, P1 = { x: 380, y: 1330 }, P2 = { x: AP.x - 70, y: AP.y - 10 };   // quadratic path, dips then rises into the symbol
  const qb = (u) => ({ x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * P1.x + u * u * P2.x, y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * P1.y + u * u * P2.y });
  const path = E.div('abs', s, `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path pathLength="1" d="M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}" fill="none" stroke="${CYAN2}" stroke-width="4" stroke-dasharray="0.02 0.018" stroke-linecap="round" opacity=".75"/></svg>`, { left: 0, top: 0 });
  E.ft(path, 1.05, { clipPath: 'inset(0 100% 0 0)', autoAlpha: 1 }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power2.out' });
  E.to(path, 2.8, { autoAlpha: 0, duration: 0.3 });
  const trail = Array.from({ length: 6 }, () => E.div('abs', s, null, { left: '0px', top: '0px', width: '14px', height: '14px', borderRadius: '50%', background: CYAN2, boxShadow: `0 0 14px ${CYAN}`, opacity: 0 }));
  E.frame((t) => {
    const p = Math.min(1, Math.max(0, (t - 1.45) / 1.25)); const u = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    if (t >= 1.45) { const q = qb(u); env.style.translate = `${(q.x - EV.x).toFixed(1)}px ${(q.y - EV.y).toFixed(1)}px`; env.style.scale = (1 - 0.68 * u).toFixed(3); env.style.rotate = (Math.sin(u * Math.PI) * -10).toFixed(2) + 'deg'; }
    else { env.style.translate = '0px 0px'; env.style.scale = '1'; env.style.rotate = '0deg'; }
    trail.forEach((d, k) => { const uu = u - (k + 1) * 0.045; if (t < 1.5 || uu <= 0 || t > 2.8) { d.style.opacity = 0; return; } const q = qb(uu); d.style.transform = `translate(${(q.x - 7).toFixed(1)}px,${(q.y - 7).toFixed(1)}px) scale(${(1 - k * 0.12).toFixed(2)})`; d.style.opacity = (0.8 - k * 0.12).toFixed(2); });
  });
  E.to(env, 2.62, { autoAlpha: 0, duration: 0.12 });
  E.to(app, 2.7, { scale: 1.12, duration: 0.12, ease: 'power2.out' }); E.to(app, 2.82, { scale: 1, duration: 0.25, ease: 'back.out(3)' });

  /* ---------- 3–4 s: AI extracts the invoice fields ---------- */
  const C = { x: cx, y: 1120 };
  E.to(app, 2.95, { x: C.x - AP.x, y: C.y - AP.y, scale: 1.15, duration: 0.4, ease: 'power3.inOut' });
  E.ft(ring, 3.05, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  E.frame((t) => { ring.style.rotate = (t * 260).toFixed(1) + 'deg'; appHalo.style.scale = (1 + Math.sin(t * 9) * 0.05).toFixed(3); });
  E.to(ring, 3.9, { opacity: 0, duration: 0.15 });
  const FIELDS = [['Vendor', 'building-2', -1, -160], ['Amount', 'banknote', 1, -40], ['Date', 'calendar', -1, 160]];
  const chips = FIELDS.map(([n, ic, side, dy], k) => {
    const el = K.ctext(s, `<div style="display:flex;align-items:center;gap:16px;padding:16px 26px 16px 16px;border-radius:26px;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(103,232,249,.55);box-shadow:0 14px 36px rgba(0,4,40,.4)"><span style="width:60px;height:60px;border-radius:17px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.55);display:flex;align-items:center;justify-content:center">${E.icon(ic, 32, '#E0FAFF', 2.2)}</span><span style="font:700 36px Urbanist;color:#fff;white-space:nowrap">${n}</span></div>`, C.x + side * 290, C.y + dy, {});
    E.ft(el, 3.25 + k * 0.12, { autoAlpha: 0, x: -side * 290, y: -dy, scale: 0.3 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
    return el;
  });

  /* ---------- 4–5 s: transaction card, Pending Review ---------- */
  const CW = 860, CH = 560, CX = cx - CW / 2, CY = 1110 - CH / 2;
  E.to(app, 3.95, { autoAlpha: 0, scale: 0.5, duration: 0.25, ease: 'power2.in' });
  chips.forEach((el, k) => E.to(el, 3.95 + k * 0.04, { x: (cx - (C.x + FIELDS[k][2] * 290)), y: (CY + 270 + k * 92) - (C.y + FIELDS[k][3]), scale: 0.5, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }));
  const card = E.div('abs', s, null, { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '40px', background: '#FFFFFF', boxShadow: '0 30px 80px rgba(0,4,40,.45), 0 0 0 2px rgba(103,232,249,.35)', transformOrigin: '50% 50%' });
  E.ft(card, 4.05, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' });
  const ROWS = [['Vendor', 'building-2', 240], ['Amount', 'banknote', 170], ['Date', 'calendar', 200]];
  const body = E.div('abs', s, `
    <div style="position:absolute;left:44px;top:40px;display:flex;align-items:center;gap:18px"><span style="width:68px;height:68px;border-radius:18px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${E.icon('mail', 38, '#4F46E5', 2.2)}</span><span><span style="display:block;font:700 40px Roboto;color:#0f172a">Invoice from email</span><span style="display:flex;align-items:center;gap:8px;font:400 28px Roboto;color:#64748b;margin-top:4px">${E.icon('paperclip', 26, '#64748b', 2)}PDF attachment</span></span></div>
    <div class="pend" style="position:absolute;right:40px;top:50px;display:flex;align-items:center;gap:10px;padding:10px 20px;border-radius:999px;background:#FEF3C7;border:2px solid #FCD34D;font:700 31px Roboto;color:${AMBER}">${E.icon('clock', 31, AMBER, 2.4)}Pending Review</div>
    <div style="position:absolute;left:44px;right:44px;top:150px;height:2px;background:#EEF0F5"></div>
    ${ROWS.map(([n, ic, w], k) => `<div class="cr" style="position:absolute;left:44px;right:44px;top:${172 + k * 92}px;height:70px;display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:16px;font:500 36px Roboto;color:#475569">${E.icon(ic, 34, '#64748b', 2)}${n}</span><i class="bar" style="width:${w}px"></i></div>`).join('')}
    <div style="position:absolute;left:44px;right:44px;bottom:36px;height:64px;border-radius:18px;background:#F8FAFC;border:2px dashed #CBD5E1;display:flex;align-items:center;justify-content:center;gap:12px;font:600 28px Roboto;color:#475569">${E.icon('circle-check', 30, '#64748b', 2)}Review and confirm to save</div>`,
    { left: CX + 'px', top: CY + 'px', width: CW + 'px', height: CH + 'px' });
  E.ft(body, 4.22, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  body.querySelectorAll('.cr').forEach((r, k) => E.ft(r, 4.28 + k * 0.06, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.25 }));
  const pend = body.querySelector('.pend');
  E.ft(pend, 4.3, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' });
  E.frame((t) => { if (t > 4.6) pend.style.boxShadow = `0 0 0 ${(Math.sin((t - 4.6) * 10) * 0.5 + 0.5) * 6}px rgba(252,211,77,.35)`; else pend.style.boxShadow = 'none'; });

  E.ready().then(() => { window.__ready = true; });
})();
