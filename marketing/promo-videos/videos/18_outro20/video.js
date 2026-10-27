/* 18 · Tutorial outro, 20 s · 9:16 · silent — synced to the Bengali VO (added in the edit)
   S1 0–4   "তাহলে দেখলেন…সহজ!"             phone records a transaction → "Transaction Recorded!" / "It's That Easy."
   S2 4–11  "আপনি লিখে, কথা বলে…"            Text · Voice · Receipt Scan · Email · SMS, then 2-2-1 grid + "Your Money. Your Way."
   S3 11–16 "কম সময়, কম ম্যানুয়াল এন্ট্রি…"     Save Time · Less Manual Work · All in One Place
   S4 16–20 "AccountE। আপনার এআই…"          light trails → AccountE logo → "Your AI-Powered Money Manager", held to the end.
   RETIMING: every beat hangs off the CUE table. Override any cue from the URL without editing code, e.g.
   index.html?ar=9x16&cues=voice:5.2,receipt:6.4,s3:11.4   (preview.html has a scrubber and shows the cues). */
(function () {
  const { W, H } = E;
  E.duration = 20;
  const CUE = { phone: 0, recorded: 2.0, s2: 4.0, text: 4.0, voice: 5.0, receipt: 6.0, email: 7.2, sms: 8.4, all: 9.6, s3: 11.0, b2: 12.5, b3: 14.0, s4: 16.0, logo: 16.9, tag: 17.5 };
  (new URLSearchParams(location.search).get('cues') || '').split(',').filter(Boolean).forEach((kv) => { const [k, v] = kv.split(':'); if (k in CUE && !isNaN(+v)) CUE[k] = +v; });
  window.CUES = CUE;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', ICE = '#E0FAFF', GREEN = '#22C55E';
  const cx = W / 2;
  E.css(`.h1{font-family:Urbanist;font-weight:800;color:#fff;letter-spacing:-.025em;line-height:1.06}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .glass{position:absolute;box-sizing:border-box;border-radius:40px;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.15);box-shadow:0 24px 60px rgba(0,4,40,.38),inset 0 1px 0 rgba(255,255,255,.14)}
    .tile{position:absolute;width:150px;height:150px;border-radius:42px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.6);box-shadow:0 14px 36px rgba(0,4,40,.4),inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}
    .bar{display:block;height:20px;border-radius:10px;background:#DCE1EA}`);

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
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.out' });

  const s = E.scene(0, 20, null, null, { static: true });
  const root = E.div('fill', s);
  const ct = (html, x, y, size, style, parent) => K.ctext(parent || root, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), 'h1');
  const mask = (html, x, y, size, parent) => { const el = ct(`<div style="overflow:hidden;padding:0 .06em .1em"><div class="ln">${html}</div></div>`, x, y, size, null, parent); el.ln = el.querySelector('.ln'); return el; };

  /* =================== SCENE 1 · phone records a transaction =================== */
  { const t0 = CUE.phone, tR = CUE.recorded, tOut = CUE.s2 - 0.3;
    const g = E.div('fill', root);
    const sc0 = 0.52, phW = (UI.SW + 28) * sc0, phH = (UI.SH + 28) * sc0, phX = cx - phW / 2, phY = 590;
    E.div('abs', g, null, { left: cx - 520 + 'px', top: phY + phH / 2 - 560 + 'px', width: '1040px', height: '1120px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.22),rgba(37,99,235,.18) 50%,rgba(37,99,235,0))' });
    const ph = UI.phone(g, phX, phY, sc0);
    ph.style.boxShadow = '0 0 0 2px rgba(103,232,249,.28), 0 50px 120px rgba(0,3,40,.6), 0 0 90px rgba(34,211,238,.18)';
    const sc = ph.screen; sc.style.background = '#F5F6FA';
    UI.status(sc).style.background = '#F8F9FB';
    const hdr = E.div('abs', sc, null, { left: 0, right: 0, top: '76px', height: '120px', background: '#EEF0F4' });
    E.wordmark(hdr, { width: 300, left: 40, top: 37, color: '#0b1220' });
    E.div('abs', hdr, E.icon('bell', 44, '#0f172a', 2), { right: '56px', top: '38px' });
    E.div('abs', sc, `<span style="font:700 46px Roboto;color:#0f172a">Record transaction</span><span style="margin-left:16px;font:700 24px Roboto;color:#4F46E5;background:#E8EAFD;border-radius:999px;padding:5px 14px;vertical-align:6px">AI</span>`, { left: '48px', top: '250px' });
    // the transaction card being created (placeholder bars only — no amounts)
    const card = E.div('abs', sc, `
      <div style="position:absolute;left:40px;top:40px;display:flex;align-items:center;gap:22px"><span style="width:96px;height:96px;border-radius:26px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 52, '#4F46E5', 2)}</span><span style="display:flex;flex-direction:column;gap:14px"><i class="bar" style="width:330px;height:26px;background:#C3CAD6"></i><i class="bar" style="width:210px"></i></span></div>
      <div style="position:absolute;left:40px;right:40px;top:176px;height:2px;background:#EEF0F5"></div>
      ${[[240, 170], [200, 230], [270, 150], [180, 200]].map(([a, b], k) => `<div class="rw" style="position:absolute;left:40px;right:40px;top:${212 + k * 74}px;display:flex;justify-content:space-between"><i class="bar" style="width:${a}px"></i><i class="bar" style="width:${b}px"></i></div>`).join('')}
      <i class="shine" style="position:absolute;inset:0;border-radius:40px;background:linear-gradient(100deg,rgba(255,255,255,0) 35%,rgba(99,102,241,.22) 50%,rgba(255,255,255,0) 65%);background-size:300% 100%;opacity:0"></i>
      <div class="okb" style="position:absolute;left:40px;right:40px;bottom:36px;height:88px;border-radius:24px;background:#DCFCE7;display:flex;align-items:center;justify-content:center;gap:14px;font:700 34px Roboto;color:#15803D;opacity:0">${E.icon('circle-check', 40, '#15803D', 2.4)}Recorded</div>`,
      { left: '40px', right: '40px', top: '360px', height: '640px', background: '#fff', borderRadius: '40px', boxShadow: '0 8px 30px rgba(15,23,42,.08)', border: '3px solid rgba(34,197,94,0)' });
    const ai = E.div('abs', sc, `<span style="position:relative;width:78px;height:78px;border-radius:22px;background:linear-gradient(135deg,#5B5FEF,#7062F6);display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 42, '#fff', 2)}<svg class="ring" width="110" height="110" style="position:absolute;left:-16px;top:-16px;overflow:visible"><circle cx="55" cy="55" r="50" fill="none" stroke="#22D3EE" stroke-width="5" stroke-linecap="round" stroke-dasharray="80 40 30 40"/></svg></span><span class="msg" style="font:500 34px Roboto;color:#475569">AI is recording…</span>`, { left: '60px', top: '1060px', display: 'flex', alignItems: 'center', gap: '30px' });
    E.div('abs', sc, `<span style="flex:1;font:400 34px Roboto;color:#64748b">Ask AccountE anything…</span>`, { left: '24px', right: '170px', bottom: '250px', height: '118px', borderRadius: '60px', background: '#EEF0F5', display: 'flex', alignItems: 'center', padding: '0 40px' });
    E.div('abs', sc, E.icon('mic', 46, '#fff', 2.2), { right: '24px', bottom: '250px', width: '118px', height: '118px', borderRadius: '48px', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    UI.tabbar(sc, 'AI Chat');
    E.ft(g, t0, { autoAlpha: 0, y: 220, scale: 0.94, transformOrigin: '50% 60%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' });
    E.frame((t) => { if (t < tOut + 0.5) ph.style.translate = `0 ${(Math.sin(t * 1.8) * 8).toFixed(1)}px`; });   // gentle float
    E.ft(card, t0 + 0.45, { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
    card.querySelectorAll('.rw').forEach((r, k) => E.ft(r, t0 + 0.65 + k * 0.08, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3 }));
    E.ft(ai, t0 + 0.75, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35 });
    const shine = card.querySelector('.shine');
    E.ft(shine, t0 + 1.0, { opacity: 1, backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: Math.max(0.3, tR - t0 - 1.05), ease: 'power1.inOut' }); E.to(shine, tR, { opacity: 0, duration: 0.1 });
    const ring = ai.querySelector('.ring'), msg = ai.querySelector('.msg');
    E.frame((t) => { ring.style.rotate = (t * 320).toFixed(1) + 'deg'; ring.style.opacity = t < tR ? 1 : 0; const st = t < tR ? 'a' : 'b'; if (msg.__s !== st) { msg.textContent = st === 'a' ? 'AI is recording…' : 'Saved to your transactions'; msg.style.color = st === 'a' ? '#475569' : '#15803D'; msg.__s = st; } });
    // success: green border, "Recorded" bar, big check beside the phone + success pulse
    E.to(card, tR, { borderColor: 'rgba(34,197,94,1)', boxShadow: '0 8px 30px rgba(34,197,94,.25)', duration: 0.3 });
    E.ft(card.querySelector('.okb'), tR + 0.05, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
    const ok = E.div('abs', g, `<div style="width:150px;height:150px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(255,255,255,.95),0 18px 44px rgba(34,197,94,.5)"><svg width="86" height="86" viewBox="0 0 24 24"><path class="ck" pathLength="1" d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1 1"/></svg></div>`, { left: phX + phW - 110 + 'px', top: phY + 150 + 'px' });
    E.ft(ok, tR, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' });
    E.ft(ok.querySelector('.ck'), tR + 0.12, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' });
    const pulse = E.div('abs', g, null, { left: phX - 8 + 'px', top: phY - 8 + 'px', width: phW + 16 + 'px', height: phH + 16 + 'px', borderRadius: '44px', border: '4px solid rgba(52,211,153,.9)', opacity: 0 });
    E.frame((t) => { const q = (t - tR - 0.05) / 0.8; if (q < 0 || q > 1) { pulse.style.opacity = 0; return; } pulse.style.transform = `scale(${(1 + q * 0.08).toFixed(3)})`; pulse.style.opacity = (0.9 * (1 - q)).toFixed(2); });
    const h1 = mask('Transaction Recorded!', cx, 330, 80, g), h2 = mask('<span class="grad">It’s That Easy.</span>', cx, 440, 66, g);
    E.ft(h1.ln, tR + 0.1, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });
    E.ft(h2.ln, tR + 0.75, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' });
    E.to(g, tOut, { autoAlpha: 0, y: -80, scale: 0.96, duration: 0.45, ease: 'power2.in' }); }

  /* =================== SCENE 2 · five ways to record =================== */
  const M = [['Text', CUE.text], ['Voice', CUE.voice], ['Receipt Scan', CUE.receipt], ['Email', CUE.email], ['SMS', CUE.sms]];
  const CW2 = 420, CH2 = 300;
  const SLOT = [[300, 790], [780, 790], [300, 1120], [780, 1120], [540, 1450]];   // 2 · 2 · 1
  const STAGE = { x: cx, y: 1080, s: 1.5 };                                       // where each method is introduced
  const SHELF = { x0: 190, dx: 233, y: 560, s: 0.48 };                            // where introduced methods wait
  function art(i) {
    const ic = (n, sz) => E.icon(n, sz, ICE, 2);
    if (i === 0) return `<div style="position:relative;width:96px;height:96px">${ic('message-circle', 96)}<span style="position:absolute;left:28px;top:40px;display:flex;align-items:center;gap:4px"><i class="ty" style="display:block;height:8px;width:0;border-radius:4px;background:${ICE}"></i><i class="cu" style="display:block;width:4px;height:22px;border-radius:2px;background:${CYAN2}"></i></span></div>`;
    if (i === 1) return `<div style="position:relative;width:96px;height:96px;display:flex;align-items:center;justify-content:center">${ic('mic', 84)}${[-1, 1].map((sd) => `<span style="position:absolute;top:28px;${sd < 0 ? 'right:100px;flex-direction:row-reverse' : 'left:100px'};display:flex;gap:6px;align-items:center;height:40px">${[0, 1, 2].map(() => '<i class="wv" style="display:block;width:6px;height:34px;border-radius:3px;background:' + CYAN2 + '"></i>').join('')}</span>`).join('')}</div>`;
    if (i === 2) return `<div style="position:relative;width:96px;height:96px">${ic('receipt-text', 94)}<i class="sl" style="position:absolute;left:-12px;right:-12px;height:5px;top:0;border-radius:3px;background:${CYAN2};box-shadow:0 0 14px ${CYAN},0 0 4px #fff"></i></div>`;
    if (i === 3) return `<div style="position:relative;width:96px;height:96px">${ic('mail', 94)}<span class="fw" style="position:absolute;right:-34px;top:-26px;width:52px;height:52px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(34,211,238,.8)">${E.icon('forward', 30, '#03122e', 2.6)}</span></div>`;
    return `<div style="position:relative;width:96px;height:96px">${ic('smartphone', 94)}<span class="bd" style="position:absolute;right:-34px;top:-24px;width:56px;height:46px;border-radius:16px 16px 16px 5px;background:${CYAN};display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 0 14px rgba(34,211,238,.8)">${'<i style="width:7px;height:7px;border-radius:50%;background:#03122e;display:block"></i>'.repeat(3)}</span></div>`;
  }
  const glowCard = E.div('abs', root, null, { left: STAGE.x - (CW2 * STAGE.s) / 2 - 10 + 'px', top: STAGE.y - (CH2 * STAGE.s) / 2 - 10 + 'px', width: CW2 * STAGE.s + 20 + 'px', height: CH2 * STAGE.s + 20 + 'px', borderRadius: '66px', border: `3px solid ${CYAN}`, boxShadow: '0 0 50px rgba(34,211,238,.35)', opacity: 0 });
  const cards2 = M.map(([name, tin], i) => {
    const [sx, sy] = SLOT[i];
    const c = E.div('glass', root, `<div class="tile" style="left:${(CW2 - 150) / 2}px;top:34px">${art(i)}</div><div style="position:absolute;left:0;right:0;bottom:32px;text-align:center;font:700 46px Urbanist;color:#fff">${name}</div>`, { left: sx - CW2 / 2 + 'px', top: sy - CH2 / 2 + 'px', width: CW2 + 'px', height: CH2 + 'px', transformOrigin: '50% 50%' });
    const tNext = i < 4 ? M[i + 1][1] : CUE.all;
    E.ft(c, tin, { autoAlpha: 0, x: STAGE.x - sx, y: STAGE.y - sy + 60, scale: STAGE.s * 0.85 }, { autoAlpha: 1, y: STAGE.y - sy, scale: STAGE.s, duration: 0.45, ease: 'power3.out' });
    // after its moment on stage each method waits on a small shelf row; all five settle into the 2-2-1 grid together
    if (i < 4) E.to(c, tNext - 0.05, { x: SHELF.x0 + i * SHELF.dx - sx, y: SHELF.y - sy, scale: SHELF.s, duration: 0.5, ease: 'power3.inOut' });
    E.to(c, CUE.all - 0.05 + (i < 4 ? i * 0.04 : 0), { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power3.inOut' });
    E.to(c, CUE.s3 - 0.42 + i * 0.03, { autoAlpha: 0, scale: 0.85, y: -30, duration: 0.35, ease: 'power2.in' });
    c.tin = tin; return c;
  });
  M.forEach(([, tin], i) => { const tNext = i < 4 ? M[i + 1][1] : CUE.all; E.to(glowCard, tin + 0.15, { opacity: 1, duration: 0.25 }); E.to(glowCard, tNext - 0.12, { opacity: 0, duration: 0.15 }); });
  E.frame((t) => {
    cards2.forEach((c, i) => { if (t < c.tin || t > CUE.s3) return; const u = t - c.tin;
      if (i === 0) { const n = (u * 1.4) % 1.3; c.querySelector('.ty').style.width = (Math.min(1, n) * 34).toFixed(1) + 'px'; c.querySelector('.cu').style.opacity = Math.floor(t * 3.2) % 2 ? 1 : 0.15; }
      if (i === 1) c.querySelectorAll('.wv').forEach((w, k) => { w.style.transform = `scaleY(${(0.3 + 0.7 * Math.abs(Math.sin(t * 9 + k * 1.3))).toFixed(3)})`; });
      if (i === 2) c.querySelector('.sl').style.top = (4 + ((Math.sin(u * 3.4 - Math.PI / 2) + 1) / 2) * 84).toFixed(1) + 'px';
      if (i === 3) { const q = (u % 1.2) / 1.2; const fw = c.querySelector('.fw'); fw.style.transform = `translate(${(q * 18).toFixed(1)}px,${(-q * 6).toFixed(1)}px) scale(${q < 0.15 ? (q / 0.15).toFixed(3) : 1})`; fw.style.opacity = (q < 0.75 ? 1 : (1 - q) / 0.25).toFixed(3); }
      if (i === 4) { const q = (u % 1.2) / 1.2; const bd = c.querySelector('.bd'); bd.style.transform = `translateY(${(q < 0.2 ? (1 - q / 0.2) * -20 : 0).toFixed(1)}px) scale(${(q < 0.2 ? 0.5 + (q / 0.2) * 0.6 : q < 0.32 ? 1.1 - ((q - 0.2) / 0.12) * 0.1 : 1).toFixed(3)})`; bd.style.opacity = q > 0.85 ? ((1 - q) / 0.15).toFixed(3) : 1; }
    });
  });
  const yw = mask('Your Money. <span class="grad">Your Way.</span>', cx, 470, 72);
  E.ft(yw.ln, CUE.all + 0.4, { yPercent: 110 }, { yPercent: 0, duration: 0.65, ease: 'power4.out' });
  E.to(yw, CUE.s3 - 0.42, { autoAlpha: 0, y: -30, duration: 0.32, ease: 'power2.in' });

  /* =================== SCENE 3 · less work, more control =================== */
  const VY = 1000, LY = 1420;   // visual centre, label line
  const label = (txt, t1, t2) => { const l = mask(txt, cx, LY, 84); E.ft(l.ln, t1 + 0.35, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' }); if (t2) E.to(l, t2 - 0.25, { autoAlpha: 0, y: -24, duration: 0.3, ease: 'power2.in' }); return l; };
  // 3a · Save Time — clock hands spin, then settle
  { const t1 = CUE.s3, t2 = CUE.b2, R = 170, Q = R + 20;
    const ticks = Array.from({ length: 12 }, (_, k) => { const a = (k * 30 * Math.PI) / 180, r1 = R - 28, r2 = R - (k % 3 ? 14 : 6); return `<line x1="${Q + Math.sin(a) * r1}" y1="${Q - Math.cos(a) * r1}" x2="${Q + Math.sin(a) * r2}" y2="${Q - Math.cos(a) * r2}" stroke="${ICE}" stroke-width="${k % 3 ? 4 : 7}" stroke-linecap="round"/>`; }).join('');
    const halo = E.div('abs', root, null, { left: cx - 330 + 'px', top: VY - 330 + 'px', width: '660px', height: '660px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.22),rgba(34,211,238,0))' });
    const g = E.div('abs', root, `<svg width="${Q * 2}" height="${Q * 2}" style="overflow:visible"><circle cx="${Q}" cy="${Q}" r="${R}" fill="rgba(255,255,255,.06)" stroke="rgba(103,232,249,.7)" stroke-width="5"/>${ticks}<line class="hh" x1="${Q}" y1="${Q}" x2="${Q}" y2="${Q - 82}" stroke="#fff" stroke-width="11" stroke-linecap="round"/><line class="mh" x1="${Q}" y1="${Q}" x2="${Q}" y2="${Q - 128}" stroke="${CYAN2}" stroke-width="7" stroke-linecap="round"/><circle cx="${Q}" cy="${Q}" r="13" fill="#fff"/></svg>`, { left: cx - Q + 'px', top: VY - Q + 'px' });
    E.ft([g, halo], t1, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
    const hh = g.querySelector('.hh'), mh = g.querySelector('.mh');
    E.frame((t) => { const p = Math.min(1, Math.max(0, (t - t1 - 0.15) / 1.0)); const e = 1 - Math.pow(1 - p, 4); mh.setAttribute('transform', `rotate(${(e * 1140).toFixed(1)} ${Q} ${Q})`); hh.setAttribute('transform', `rotate(${(e * 665).toFixed(1)} ${Q} ${Q})`); });
    E.to([g, halo], t2 - 0.25, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: 'power2.in' });
    label('Save Time', t1, t2); }
  // 3b · Less Manual Work — typed entry lines fade away, an AI sparkle takes over
  { const t1 = CUE.b2, t2 = CUE.b3, KW = 400, KH = 220;
    const keys = [0, 1, 2].map((r) => Array.from({ length: 9 - r }, (_, k) => `<rect x="${30 + r * 18 + k * 40}" y="${30 + r * 46}" width="30" height="32" rx="7" fill="rgba(224,250,255,.75)"/>`).join('')).join('');
    const kb = E.div('abs', root, `<svg width="${KW}" height="${KH}"><rect x="2" y="2" width="${KW - 4}" height="${KH - 4}" rx="30" fill="rgba(255,255,255,.07)" stroke="rgba(103,232,249,.6)" stroke-width="4"/>${keys}<rect x="110" y="${30 + 3 * 46}" width="180" height="24" rx="8" fill="rgba(224,250,255,.75)"/></svg>`, { left: cx - KW / 2 + 'px', top: VY + 20 + 'px' });
    const lines = E.div('abs', root, [300, 360, 240, 330].map((w) => `<i class="dl" style="display:block;height:20px;width:${w}px;border-radius:10px;background:rgba(224,250,255,.6);margin:0 auto 16px;transform-origin:0 50%"></i>`).join(''), { left: cx - 200 + 'px', top: VY - 210 + 'px', width: '400px' });
    const spark = E.div('abs', root, `<div style="width:220px;height:220px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.45),rgba(34,211,238,0));display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 130, CYAN2, 1.8)}</div>`, { left: cx - 110 + 'px', top: VY - 250 + 'px' });
    E.ft(kb, t1, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    E.ft(lines, t1 + 0.1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    const dls = lines.querySelectorAll('.dl');
    E.frame((t) => dls.forEach((d, k) => { const q = Math.min(1, Math.max(0, (t - t1 - 0.15 - k * 0.12) / 0.3)); d.style.transform = `scaleX(${q.toFixed(3)})`; }));
    E.to(lines, t1 + 0.75, { autoAlpha: 0, y: -30, duration: 0.3, ease: 'power2.in' });
    E.to(kb, t1 + 0.8, { opacity: 0.35, duration: 0.3 });
    E.ft(spark, t1 + 0.85, { autoAlpha: 0, scale: 0.4, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' });
    E.frame((t) => { if (t > t1 + 1.3 && t < t2) spark.style.scale = (1 + Math.sin((t - t1) * 6) * 0.04).toFixed(3); });
    E.to([kb, spark], t2 - 0.25, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: 'power2.in' });
    label('Less Manual Work', t1, t2); }
  // 3c · All in One Place — three cards fly into one dashboard
  const dash = { x: cx, y: VY, w: 780, h: 560 };
  const dashG = E.div('abs', root, null, { left: 0, top: 0, width: W + 'px', height: H + 'px' });
  { const t1 = CUE.b3;
    const panel = E.div('glass', dashG, `<div style="position:absolute;left:36px;top:30px;display:flex;align-items:center;gap:16px">${E.icon('layout-dashboard', 40, CYAN2, 2.2)}<i class="bar" style="width:220px;background:rgba(224,250,255,.55)"></i></div>`, { left: dash.x - dash.w / 2 + 'px', top: dash.y - dash.h / 2 + 'px', width: dash.w + 'px', height: dash.h + 'px', background: 'linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.05))' });
    const mini = (kind) => {
      if (kind === 0) return `<svg width="160" height="90">${[40, 66, 30, 80, 54].map((h, k) => `<rect x="${k * 32 + 6}" y="${90 - h}" width="20" height="${h}" rx="5" fill="${k === 3 ? CYAN2 : 'rgba(224,250,255,.65)'}"/>`).join('')}</svg>`;
      if (kind === 1) return `<svg width="560" height="90"><path d="M4 76 C90 70 140 40 230 46 S400 20 556 12 L556 90 L4 90 Z" fill="rgba(34,211,238,.18)"/><path d="M4 76 C90 70 140 40 230 46 S400 20 556 12" fill="none" stroke="${CYAN2}" stroke-width="6" stroke-linecap="round"/></svg>`;
      return `<svg width="104" height="104" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(224,250,255,.25)" stroke-width="6"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="${CYAN2}" stroke-width="6" stroke-dasharray="60 40" stroke-dashoffset="25"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#3B82F6" stroke-width="6" stroke-dasharray="25 75" stroke-dashoffset="65"/></svg>`;
    };
    const IN = [[dash.x - 180, dash.y - 30, 330, 220, 0], [dash.x + 180, dash.y - 30, 330, 220, 2], [dash.x, dash.y + 180, 690, 160, 1]];
    const FROM = [[-420, -300], [420, -300], [0, 560]];
    IN.forEach(([x, y, w, h, kind], k) => { const m = E.div('glass', dashG, `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${mini(kind)}</div>`, { left: x - w / 2 + 'px', top: y - h / 2 + 'px', width: w + 'px', height: h + 'px', borderRadius: '30px' });
      E.ft(m, t1 + k * 0.12, { autoAlpha: 0, x: FROM[k][0], y: FROM[k][1], scale: 0.8, rotation: [-8, 8, 0][k] }, { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0, duration: 0.85, ease: 'power3.inOut' }); });
    E.ft(panel, t1 + 0.55, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    dashG.insertBefore(panel, dashG.firstChild);
    label('All in One Place', t1, CUE.s4 + 0.25); }

  /* =================== SCENE 4 · light trails → AccountE =================== */
  const L0 = { x: cx, y: 850 };
  E.to(dashG, CUE.s4, { autoAlpha: 0, scale: 0.9, duration: 0.6, ease: 'power2.in', transformOrigin: `${dash.x}px ${dash.y}px` });
  { const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; root.appendChild(svg);
    const rr = (n) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
    const trails = Array.from({ length: 14 }, (_, k) => {
      const a = (k / 14) * Math.PI * 2, sx = dash.x + Math.cos(a) * (dash.w / 2) * 0.95, sy = dash.y + Math.sin(a) * (dash.h / 2) * 0.95;
      const c1x = sx + (rr(k) - 0.5) * 500, c1y = sy - 200 - rr(k + 3) * 300, c2x = L0.x + (rr(k + 7) - 0.5) * 400, c2y = L0.y + (rr(k + 9) - 0.5) * 300;
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${sx.toFixed(0)} ${sy.toFixed(0)} C${c1x.toFixed(0)} ${c1y.toFixed(0)} ${c2x.toFixed(0)} ${c2y.toFixed(0)} ${L0.x} ${L0.y}`);
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', k % 3 ? CYAN2 : '#FFFFFF'); p.setAttribute('stroke-width', k % 3 ? 6 : 4); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('pathLength', 1); p.style.strokeDasharray = '0.28 1.2';
      const gl = p.cloneNode(); gl.setAttribute('stroke', CYAN); gl.setAttribute('stroke-width', 18); gl.style.strokeOpacity = 0.25; svg.appendChild(gl); svg.appendChild(p);
      return [gl, p]; }).flat();
    E.set(svg, 0, { autoAlpha: 0 }); E.set(svg, CUE.s4, { autoAlpha: 1 });
    trails.forEach((p, k) => E.ft(p, CUE.s4 + 0.05 + Math.floor(k / 2) * 0.03, { strokeDashoffset: 0.28 }, { strokeDashoffset: -1, duration: 0.85, ease: 'power1.inOut' }));
    E.to(svg, CUE.s4 + 0.95, { autoAlpha: 0, duration: 0.25 }); }
  const burst = E.div('abs', root, null, { left: L0.x - 420 + 'px', top: L0.y - 420 + 'px', width: '840px', height: '840px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(103,232,249,.55),rgba(34,211,238,.14) 45%,rgba(34,211,238,0))', opacity: 0 });
  E.ft(burst, CUE.logo - 0.15, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }); E.to(burst, CUE.logo + 0.2, { opacity: 0, scale: 1.2, duration: 0.8 });
  // the original AccountE wordmark, large and centred
  const WW = 880, WL = cx - WW / 2, WT = L0.y - (WW * 365 / 2435) / 2;
  const halo = E.div('abs', root, null, { left: cx - 620 + 'px', top: L0.y - 340 + 'px', width: '1240px', height: '680px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(34,211,238,.26),rgba(1,129,250,.14) 50%,rgba(2,4,245,0))' });
  const wm = E.wordmark(root, { width: WW, left: WL, top: WT, color: '#fff' });
  const vb = wm.querySelector('svg').viewBox.baseVal, kk = WW / vb.width;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; wm.glyph('icon').forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  const mg = E.div('abs', root, null, { left: WL + ((x0 + x1) / 2) * kk - 160 + 'px', top: WT + ((y0 + y1) / 2) * kk - 160 + 'px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(56,189,248,.55),rgba(1,129,250,.2) 50%,rgba(1,129,250,0))' });
  root.insertBefore(mg, wm); root.insertBefore(halo, mg);
  E.ft(wm, CUE.logo, { autoAlpha: 0, scale: 1.14, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'power3.out' });
  E.ft([halo, mg], CUE.logo, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 1.0, ease: 'power2.out' });
  E.frame((t) => { if (t > CUE.logo + 1) { const b = Math.sin((t - CUE.logo) * 1.8); halo.style.scale = (1 + b * 0.04).toFixed(4); mg.style.scale = (1 + b * 0.06).toFixed(4); } });
  const streak = E.div('abs', root, null, { left: cx - 320 + 'px', top: L0.y + 120 + 'px', width: '640px', height: '3px', borderRadius: '3px', background: `linear-gradient(90deg,rgba(103,232,249,0),${CYAN2} 50%,rgba(103,232,249,0))`, boxShadow: '0 0 18px rgba(34,211,238,.7)' });
  E.ft(streak, CUE.tag - 0.15, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }); E.to(streak, CUE.tag + 0.9, { opacity: 0.5, duration: 0.6 });
  const tg1 = mask('Your <span class="grad">AI-Powered</span>', cx, L0.y + 240, 76), tg2 = mask('Money Manager', cx, L0.y + 336, 76);
  E.ft(tg1.ln, CUE.tag, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' });
  E.ft(tg2.ln, CUE.tag + 0.14, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' });
  // steady, confident hold to the last frame (no fade)
  E.ft(root, CUE.logo, { scale: 1 }, { scale: 1.02, duration: 20 - CUE.logo, ease: 'none', transformOrigin: `50% ${L0.y}px` });

  E.ready().then(() => { window.__ready = true; });
})();
