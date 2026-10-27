/* 16 · Tutorial outro — 9:16 · 12 s · silent
   0–3 five methods in a pentagon · 3–6 lines into a central AI symbol · 6–9 zoom/fade into the official AccountE logo ·
   9–12 tagline "Your AI Financial Assistant" + "Smarter Transaction Recording". The wordmark is the title and the largest element at the end. */
(function () {
  const { W, H } = E;
  E.duration = 12;
  const CYAN = '#22D3EE', CYAN2 = '#67E8F9', ICE = '#E0FAFF', MUTED = '#9FB0D3';
  const cx = W / 2;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  E.css(`.h2{font-family:Urbanist;font-weight:700;color:#fff;letter-spacing:-.018em;line-height:1.08}
    .grad{background:linear-gradient(92deg,${CYAN2} 0%,${CYAN} 55%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .tile{position:absolute;width:150px;height:150px;border-radius:42px;background:linear-gradient(145deg,#115488,#14399A);border:2px solid rgba(103,232,249,.6);box-shadow:0 14px 36px rgba(8,145,178,.30),inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}`);

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
  E.ft(fadeIn, 0, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'power2.out' });

  const s = E.scene(0, 12, null, null, { static: true });
  const root = E.div('fill', s);
  const ct = (html, x, y, size, cls, style) => K.ctext(root, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), cls || 'h2');
  const RC = { x: cx, y: 960 }, RR = 350;
  const METHODS = [['Text', 'message-circle'], ['Voice', 'mic'], ['Receipt Scan', 'receipt-text'], ['Email', 'mail'], ['SMS', 'smartphone']];
  const pos = METHODS.map((_, k) => { const a = (-90 + 72 * k) * Math.PI / 180; return { x: RC.x + RR * Math.cos(a), y: RC.y + RR * Math.sin(a), dx: Math.cos(a), dy: Math.sin(a) }; });

  /* ---------- 3–6 s lines (drawn behind the tiles) ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const net = document.createElementNS(NS, 'svg'); net.setAttribute('width', W); net.setAttribute('height', H); net.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  root.appendChild(net);
  const mk = (x1, y1, x2, y2, col, w, op) => { const l = document.createElementNS(NS, 'line'); Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v.toFixed(1))); l.setAttribute('stroke', col); l.setAttribute('stroke-width', w); l.setAttribute('stroke-linecap', 'round'); l.setAttribute('pathLength', 1); l.style.strokeDasharray = '1 1'; l.style.opacity = op; net.appendChild(l); return l; };
  const sp = (p, w, col, op) => mk(RC.x + p.dx * 140, RC.y + p.dy * 140, p.x - p.dx * 92, p.y - p.dy * 92, col, w, op);
  const spokesGlow = pos.map((p) => sp(p, 12, CYAN, 0.16)), spokes = pos.map((p) => sp(p, 3, CYAN2, 0.9));
  const edges = pos.map((p, k) => { const q = pos[(k + 1) % 5]; const ex = q.x - p.x, ey = q.y - p.y, L = Math.hypot(ex, ey); return mk(p.x + ex / L * 96, p.y + ey / L * 96, q.x - ex / L * 96, q.y - ey / L * 96, '#FFFFFF', 2, 0.18); });
  E.set(net, 0, { autoAlpha: 0 }); E.set(net, 3.35, { autoAlpha: 1 });
  E.ft(spokesGlow, 3.4, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12 });
  E.ft(spokes, 3.4, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12 });
  E.ft(edges, 3.9, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08 });
  const pulses = pos.map(() => E.div('abs', root, null, { left: '0px', top: '0px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', boxShadow: `0 0 14px ${CYAN}, 0 0 4px #fff`, opacity: 0 }));
  E.frame((t) => pulses.forEach((d, k) => { const t0 = 4.2 + k * 0.15; if (t < t0 || t > 6.0) { d.style.opacity = 0; return; } const u = ((t - t0) % 0.9) / 0.9; const p = pos[k]; const r = 140 + (1 - u) * (RR - 92 - 140); d.style.transform = `translate(${(RC.x + p.dx * r - 7).toFixed(1)}px,${(RC.y + p.dy * r - 7).toFixed(1)}px)`; d.style.opacity = Math.min(1, u * 6, (1 - u) * 6).toFixed(2); }));

  /* ---------- 0–3 s five methods ---------- */
  function art(i) {
    const ic = (n, sz) => E.icon(n, sz, ICE, 2);
    if (i === 0) return `<div style="position:relative;width:82px;height:82px">${ic('message-circle', 82)}<span class="td" style="position:absolute;left:0;right:0;top:35px;display:flex;justify-content:center;gap:8px">${('<i style="width:9px;height:9px;border-radius:50%;background:' + ICE + ';display:block"></i>').repeat(3)}</span></div>`;
    if (i === 1) return `<div style="position:relative;width:82px;height:82px;display:flex;align-items:center;justify-content:center">${ic('mic', 76)}<i class="r1" style="position:absolute;inset:-8px;border-radius:50%;border:3px solid ${CYAN2}"></i><i class="r2" style="position:absolute;inset:-8px;border-radius:50%;border:3px solid ${CYAN2}"></i></div>`;
    if (i === 2) return `<div style="position:relative;width:82px;height:82px">${ic('receipt-text', 80)}<i class="sl" style="position:absolute;left:-10px;right:-10px;height:4px;top:0;border-radius:3px;background:${CYAN2};box-shadow:0 0 12px ${CYAN},0 0 4px #fff"></i></div>`;
    if (i === 3) return `<div style="position:relative;width:82px;height:82px">${ic('mail', 80)}<span class="fw" style="position:absolute;right:-30px;top:-24px;width:46px;height:46px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(34,211,238,.8)">${E.icon('forward', 28, '#03122e', 2.6)}</span></div>`;
    return `<div style="position:relative;width:82px;height:82px">${ic('smartphone', 80)}<span class="bd" style="position:absolute;right:-30px;top:-22px;width:50px;height:42px;border-radius:14px 14px 14px 5px;background:${CYAN};display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 0 14px rgba(34,211,238,.8)">${'<i style="width:6px;height:6px;border-radius:50%;background:#03122e;display:block"></i>'.repeat(3)}</span></div>`;
  }
  const tiles = METHODS.map(([name], i) => {
    const p = pos[i];
    const g = E.div('abs', root, null, { left: p.x + 'px', top: p.y + 'px', width: 0, height: 0 });
    const tile = E.div('tile', g, art(i), { left: '-75px', top: '-75px' });
    const lab = E.div('abs h2', g, name, { left: '-200px', width: '400px', textAlign: 'center', top: (i === 0 || i === 1 || i === 4 ? -136 : 92) + 'px', fontSize: '42px', lineHeight: '46px' });
    E.ft(tile, 0.3 + i * 0.18, { autoAlpha: 0, scale: 0.55, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.8)' });
    E.ft(lab, 0.45 + i * 0.18, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    // 6.0 s: methods zoom outward and fade
    E.to(g, 6.0, { x: p.dx * 160, y: p.dy * 160, scale: 1.25, autoAlpha: 0, duration: 0.75, ease: 'power2.in' });
    return { tile, i };
  });
  E.frame((t) => { if (t > 6.8) return; tiles.forEach(({ tile, i }) => { const u = t;
    if (i === 0) tile.querySelectorAll('.td i').forEach((d, k) => { d.style.transform = `translateY(${(-Math.max(0, Math.sin(t * 6.5 - k * 0.9)) * 6).toFixed(1)}px)`; });
    if (i === 1) ['.r1', '.r2'].forEach((c, k) => { const q = ((u + k * 0.6) % 1.2) / 1.2; const r = tile.querySelector(c); r.style.transform = `scale(${(0.85 + q * 0.7).toFixed(3)})`; r.style.opacity = (0.7 * (1 - q)).toFixed(3); });
    if (i === 2) { const q = (Math.sin(u * 3.2) + 1) / 2; tile.querySelector('.sl').style.top = (4 + q * 72).toFixed(1) + 'px'; }
    if (i === 3) { const q = (u % 1.3) / 1.3; const fw = tile.querySelector('.fw'); fw.style.transform = `translate(${(q * 14).toFixed(1)}px,${(-q * 4).toFixed(1)}px)`; fw.style.opacity = (q < 0.75 ? 1 : (1 - q) / 0.25).toFixed(3); }
    if (i === 4) { const q = (u % 1.4) / 1.4; const bd = tile.querySelector('.bd'); bd.style.transform = `scale(${(q < 0.18 ? 0.4 + (q / 0.18) * 0.75 : q < 0.3 ? 1.15 - ((q - 0.18) / 0.12) * 0.15 : 1).toFixed(3)})`; bd.style.opacity = q > 0.85 ? ((1 - q) / 0.15).toFixed(3) : 1; }
  }); });
  E.to(net, 6.0, { autoAlpha: 0, duration: 0.5 });

  /* ---------- 3 s: central AI finance symbol ---------- */
  const OR = 125;
  const orb = E.div('abs', root, `
    <div class="halo" style="position:absolute;left:-170px;top:-170px;width:${OR * 2 + 340}px;height:${OR * 2 + 340}px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,211,238,.30),rgba(37,99,235,.16) 55%,rgba(37,99,235,0))"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 35%,#0E3A86,#06164A 70%);border:3px solid rgba(103,232,249,.65);box-shadow:0 24px 60px rgba(0,4,40,.5),inset 0 0 40px rgba(34,211,238,.2);display:flex;align-items:center;justify-content:center">${E.icon('sparkles', 104, ICE, 1.8)}</div>
    <svg class="arc" width="${OR * 2 + 64}" height="${OR * 2 + 64}" style="position:absolute;left:-32px;top:-32px;overflow:visible"><circle cx="${OR + 32}" cy="${OR + 32}" r="${OR + 22}" fill="none" stroke="${CYAN2}" stroke-width="4" stroke-linecap="round" stroke-dasharray="140 70 40 70" opacity=".85"/></svg>`,
    { left: RC.x - OR + 'px', top: RC.y - OR + 'px', width: OR * 2 + 'px', height: OR * 2 + 'px', transformOrigin: '50% 50%' });
  E.ft(orb, 3.0, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' });
  const arc = orb.querySelector('.arc'), ohalo = orb.querySelector('.halo');
  E.frame((t) => { arc.style.rotate = (t * 90).toFixed(1) + 'deg'; ohalo.style.scale = (1 + Math.sin(t * 3) * 0.05 + (t > 5.4 && t < 6.2 ? (t - 5.4) * 0.25 : 0)).toFixed(3); });

  /* ---------- 6–9 s: zoom + fade into the official logo ---------- */
  E.to(orb, 6.25, { scale: 2.6, autoAlpha: 0, duration: 0.8, ease: 'power2.in' });
  const flash = E.div('abs', root, null, { left: RC.x - 500 + 'px', top: RC.y - 500 + 'px', width: '1000px', height: '1000px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(103,232,249,.45),rgba(34,211,238,.12) 45%,rgba(34,211,238,0))', opacity: 0 });
  E.ft(flash, 6.75, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.1, duration: 0.35, ease: 'power2.out' }); E.to(flash, 7.1, { opacity: 0, duration: 0.7 });
  // the mark arrives large at the centre (zoom from bigger), then settles into the full wordmark
  const MW = 300, MH = MW * 1054 / 923;
  const markHalo = E.div('abs', root, null, { left: RC.x - 330 + 'px', top: RC.y - 330 + 'px', width: '660px', height: '660px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(56,189,248,.5),rgba(1,129,250,.2) 50%,rgba(1,129,250,0))' });
  const mark = E.logoIcon(root, MW, { left: RC.x - MW / 2 + 'px', top: RC.y - MH / 2 + 'px' });
  E.ft([mark, markHalo], 6.7, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'power3.out' });
  // official wordmark (white letters on navy), centred, the largest element of the final frame
  const WW = 860, WT = 806, WL = cx - WW / 2;
  const wm = E.wordmark(root, { width: WW, left: WL, top: WT, color: '#fff' });
  const vb = wm.querySelector('svg').viewBox.baseVal, k = WW / vb.width;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; wm.glyph('icon').forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  const slot = { x: WL + ((x0 + x1) / 2) * k, y: WT + ((y0 + y1) / 2) * k, w: (x1 - x0) * k };
  const wglow = E.div('abs', root, null, { left: slot.x - 160 + 'px', top: slot.y - 160 + 'px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(56,189,248,.55),rgba(1,129,250,.2) 50%,rgba(1,129,250,0))' });
  root.insertBefore(wglow, wm);
  const wIcon = wm.glyph('icon'), letters = wm.glyphs.filter((q) => q.k !== 'icon');
  E.set(wm, 0, { autoAlpha: 0 }); E.set(wm, 7.9, { autoAlpha: 1 });
  E.set(wIcon, 0, { opacity: 0 });
  E.to(mark, 7.9, { x: slot.x - RC.x, y: slot.y - RC.y, scale: slot.w / MW, duration: 0.75, ease: 'power3.inOut' });
  E.to(markHalo, 7.9, { x: slot.x - RC.x, y: slot.y - RC.y, scale: 0.5, autoAlpha: 0, duration: 0.75, ease: 'power3.inOut' });
  E.ft(wglow, 8.3, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
  E.to(mark, 8.62, { autoAlpha: 0, duration: 0.1 }); E.to(wIcon, 8.6, { opacity: 1, duration: 0.1 });
  letters.forEach((q, i) => E.ft(q.els, 8.25 + i * 0.06, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }));
  const wHalo = E.div('abs', root, null, { left: cx - 620 + 'px', top: WT + 68 - 340 + 'px', width: '1240px', height: '680px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(1,129,250,.30),rgba(2,4,245,.10) 55%,rgba(2,4,245,0))' });
  root.insertBefore(wHalo, root.firstChild);
  E.ft(wHalo, 8.2, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'power2.out' });
  E.frame((t) => { if (t > 9) wHalo.style.scale = (1 + Math.sin((t - 9) * 1.6) * 0.03).toFixed(4); });

  /* ---------- 9–12 s: tagline + secondary line ---------- */
  const streak = E.div('abs', root, null, { left: cx - 320 + 'px', top: WT + 190 + 'px', width: '640px', height: '3px', borderRadius: '3px', background: `linear-gradient(90deg,rgba(103,232,249,0),${CYAN2} 50%,rgba(103,232,249,0))`, boxShadow: '0 0 18px rgba(34,211,238,.7)' });
  E.ft(streak, 8.9, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }); E.to(streak, 9.9, { opacity: 0.5, duration: 0.8 });
  const tag = ct('<div style="overflow:hidden;padding:0 .06em .12em"><div class="ln">Your <span class="grad">AI</span> Financial Assistant</div></div>', cx, WT + 290, 62, 'h2');
  E.ft(tag.querySelector('.ln'), 9.05, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power4.out' });
  const sub = ct('Smarter Transaction Recording', cx, WT + 400, 34, 'h2', { fontWeight: 600, color: MUTED, letterSpacing: '0.08em' });
  E.ft(sub, 9.6, { autoAlpha: 0, y: 14, letterSpacing: '0.2em' }, { autoAlpha: 1, y: 0, letterSpacing: '0.08em', duration: 0.9, ease: 'power3.out' });
  // slow, confident settle over the final hold
  E.ft(root, 9.0, { scale: 1 }, { scale: 1.025, duration: 3.0, ease: 'none', transformOrigin: '50% 50%' });

  E.ready().then(() => { window.__ready = true; });
})();
