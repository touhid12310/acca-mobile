/* 10 · Minimal Premium — "Free. Private. Secure."  (Urbanist display + Roboto app UI) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const IVORY = '#FAFAF7', INK = '#0B0B0F', GRAY = '#5F6672', HAIR = '#D9DCE1', BLUE = '#0204F5', GREEN = '#0E9F6E';
  E.stage.style.background = IVORY;
  E.css(`.lt{font-family:Urbanist;font-weight:300;color:${INK};letter-spacing:-.02em;line-height:1.02}
    .md{font-family:Urbanist;font-weight:500;color:${GRAY};letter-spacing:.02em}
    .eb{font-family:Urbanist;font-weight:600;color:${GRAY};letter-spacing:.32em;text-transform:uppercase}
    .hl{stroke:${INK};fill:none;stroke-linecap:round;stroke-linejoin:round}`);
  const cx = W / 2, cy = L(470, 760);
  const sc = (t0, t1, opts) => E.scene(t0, t1, null, null, opts);
  const ct = (s, html, x, y, size, cls, style) => K.ctext(s, html, x, y, Object.assign({ fontSize: size + 'px' }, style || {}), cls || 'lt');
  // slow, precise entrance: tracking settles while the line rises
  const reveal = (el, t, d) => E.ft(el, t, { autoAlpha: 0, y: 26, letterSpacing: '0.06em' }, { autoAlpha: 1, y: 0, letterSpacing: '-0.02em', duration: d || 1.1, ease: 'power3.out' });
  const fadeUp = (el, t, d, dist) => E.ft(el, t, { autoAlpha: 0, y: dist == null ? 18 : dist }, { autoAlpha: 1, y: 0, duration: d || 0.9, ease: 'power2.out' });
  // hairline stroke drawing (pathLength = 1)
  const draw = (els, t, d, ease) => E.ft(els, t, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d || 1.0, ease: ease || 'power2.inOut', stagger: 0.12 });
  const svgEl = (s, w, h, inner, x, y) => E.div('abs', s, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">${inner}</svg>`, { left: x + 'px', top: y + 'px' });
  const hp = (d, sw, col) => `<path pathLength="1" stroke-dasharray="1 1" class="hl" d="${d}" style="stroke-width:${sw || 2.5}px;${col ? 'stroke:' + col : ''}"/>`;
  const hair = (name, size, col, px) => E.icon(name, size, col || INK, ((px || 2.5) * 24) / size);
  const rr = (x, y, w, h, r) => `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;

  // quiet signature: small wordmark in the corner for the whole film
  const sig = E.wordmark(E.stage, { width: L(220, 250), left: L(84, cx - 125), top: L(70, 150), color: INK });
  sig.style.zIndex = 600; E.ft(sig, 0.4, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }); E.to(sig, 47.4, { autoAlpha: 0, duration: 0.3 });
  // hairline baseline rule that persists and re-measures each section
  const rule = E.div('abs', E.stage, null, { left: L(84, 90) + 'px', right: L(84, 90) + 'px', top: L(1036, 1260) + 'px', height: '2px', background: HAIR, transformOrigin: '0 50%', zIndex: 5 });
  E.ft(rule, 0.2, { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'power2.inOut' }); E.to(rule, 47.4, { autoAlpha: 0, duration: 0.3 });
  const counter = E.div('abs md', E.stage, '', { right: L(84, 90) + 'px', top: L(1044, 1276) + 'px', fontSize: L(22, 24) + 'px', zIndex: 5 });
  const SECTIONS = [[0, '01 · Personal'], [5.6, '02 · Private'], [11.2, '03 · Secure'], [22.4, '04 · Discreet'], [28.0, '05 · Free'], [44.8, '06 · AccountE']];
  E.frame((t) => { let lab = ''; SECTIONS.forEach(([t0, l]) => { if (t >= t0) lab = l; }); if (t >= 47.4) lab = ''; if (counter.__l !== lab) { counter.textContent = lab; counter.__l = lab; } });

  /* ---------- S1–S2 0–5.6  personal ---------- */
  let s = sc(0, 5.6);
  { const a = ct(s, P ? 'Your money<br>is personal.' : 'Your money is personal.', cx, cy, L(112, 108));
    reveal(a, 0.15, 1.3); E.cue(0.15, 'swoosh', { gain: 0.25 });
    E.to(a, 2.8, { y: L(-110, -190), color: GRAY, scale: 0.72, duration: 0.9, ease: 'power3.inOut' });
    const b = ct(s, P ? `Your data<br>should be <span style="color:${BLUE}">too.</span>` : `Your data should be <span style="color:${BLUE}">too.</span>`, cx, cy + L(70, 120), L(112, 108));
    reveal(b, 3.0, 1.2); E.cue(3.0, 'swoosh', { gain: 0.25 });
    const u = E.div('abs', s, null, { left: cx - L(330, 260) + 'px', top: cy + L(150, 300) + 'px', width: L(660, 520) + 'px', height: '2px', background: INK, transformOrigin: '50% 50%' });
    E.ft(u, 3.6, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power3.inOut' }); }

  /* ---------- S3–S4 5.6–11.2  private workspace ---------- */
  s = sc(5.6, 11.2);
  { const t0 = 5.6;
    const head = ct(s, 'Your private workspace.', cx, L(250, 400), L(84, 76)); reveal(head, t0 + 0.1);
    const bw = L(1040, 860), bh = L(470, 560), bx = cx - bw / 2, by = L(380, 560);
    const room = svgEl(s, bw, bh, hp(rr(2, 2, bw - 4, bh - 4, 36), 3), bx, by);
    draw(room.querySelectorAll('path'), t0 + 0.5, 1.6, 'power2.inOut'); E.cue(t0 + 0.5, 'swipe', { gain: 0.2 });
    const lock = E.div('abs', s, `<div style="width:76px;height:76px;border-radius:50%;background:${IVORY};border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center">${hair('lock', 38, INK, 2.2)}</div>`, { left: cx - 40 + 'px', top: by - 40 + 'px' });
    E.pop(lock, t0 + 2.0, 0.6, 0.6); E.cue(t0 + 2.0, 'click', { gain: 0.35 });
    const DOCS = [['file-text', 'Records'], ['receipt', 'Receipts'], ['landmark', 'Accounts']];
    const cw = L(250, 230), chh = L(290, 300), gap = L(70, 40);
    DOCS.forEach(([ic, lab], i) => {
      const x = P ? (i < 2 ? cx - cw - gap / 2 + i * (cw + gap) : cx - cw / 2) : cx - (3 * cw + 2 * gap) / 2 + i * (cw + gap);
      const y = P ? (i < 2 ? by + 50 : by + 50 + chh - 70) : by + (bh - chh) / 2;
      const card = E.div('abs', s, `<div style="width:${cw}px;height:${P ? chh - 90 : chh}px;border:2.5px solid ${INK};border-radius:22px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${L(26, 18)}px">${hair(ic, L(84, 72), INK, 2.5)}<div class="md" style="font-size:${L(30, 30)}px;color:${INK}">${lab}</div></div>`, { left: x + 'px', top: y + 'px' });
      // drift in from outside the room, then settle
      const fx = [-1, 0, 1][i] * L(520, 300), fy = L(-220, 260) * (i === 1 ? 1 : 0.4);
      E.ft(card, t0 + 0.4 + i * 0.25, { autoAlpha: 0, x: fx, y: fy, rotation: [-8, 5, 9][i] }, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 1.8, ease: 'power3.inOut' });
      E.cue(t0 + 2.0 + i * 0.25, 'tap', { gain: 0.2 });
    });
    const sub = ct(s, 'Records · Receipts · Accounts — only yours.', cx, by + bh + L(70, 80), L(32, 32), 'md'); fadeUp(sub, 8.6);
    E.ft(s, t0, { scale: 1.04 }, { scale: 1, duration: 5.6, ease: 'none' }); }

  /* ---------- S5 11.2–14.0  two-factor ---------- */
  s = sc(11.2, 14.0);
  { const t0 = 11.2;
    const head = ct(s, 'Two-factor authentication.', cx, L(270, 420), L(84, 76)); reveal(head, t0 + 0.1);
    const sub = ct(s, 'Enter the 6-digit code', cx, L(380, 520), L(30, 32), 'md'); fadeUp(sub, t0 + 0.5);
    const bs = L(110, 120), g = L(26, 18), tot = 6 * bs + 5 * g + L(40, 0), x0 = cx - tot / 2, y0 = L(470, 640);
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * (bs + g) + (i >= 3 ? L(40, 0) : 0);
      const box = svgEl(s, bs, bs * 1.2, hp(rr(1.5, 1.5, bs - 3, bs * 1.2 - 3, 18), 2.5), x, y0);
      draw(box.querySelectorAll('path'), t0 + 0.4 + i * 0.06, 0.7);
      const dot = E.div('abs', s, null, { left: x + bs / 2 - 13 + 'px', top: y0 + bs * 0.6 - 13 + 'px', width: '26px', height: '26px', borderRadius: '50%', background: INK });
      E.ft(dot, t0 + 1.0 + i * 0.16, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }); E.cue(t0 + 1.0 + i * 0.16, 'click', { gain: 0.3 });
      E.to(dot, t0 + 2.05, { background: BLUE, duration: 0.3 });
    }
    const ok = E.div('abs', s, `<div style="display:flex;align-items:center;gap:14px">${hair('circle-check', 44, BLUE, 2.5)}<span class="md" style="font-size:${L(32, 34)}px;color:${BLUE}">Verified</span></div>`, { left: cx + 'px', top: y0 + bs * 1.2 + L(70, 80) + 'px' });
    gsap.set(ok, { xPercent: -50 }); fadeUp(ok, t0 + 2.1, 0.5); E.cue(t0 + 2.1, 'ding', { gain: 0.3 }); }

  /* ---------- S6 14.0–16.8  sessions ---------- */
  s = sc(14.0, 16.8);
  { const t0 = 14.0;
    const head = ct(s, P ? 'Secure sign-in<br>&amp; session management.' : 'Secure sign-in &amp; session management.', cx, L(270, 430), L(76, 70)); reveal(head, t0 + 0.1);
    const lw = L(1100, 920), lx = cx - lw / 2, ly = L(390, 600), rh = L(150, 160);
    const ROWS = [['smartphone', 'Android phone', 'This device · Active now', true], ['monitor', 'Web browser', 'Signed in · Last active 2 days ago', false], ['tablet', 'Tablet', 'Signed in · Last active 3 weeks ago', false]];
    ROWS.forEach(([ic, n, meta, cur], i) => {
      const y = ly + i * rh;
      const row = E.div('abs', s, `<div style="display:flex;align-items:center;gap:${L(30, 28)}px;font-family:var(--ui)">${hair(ic, L(64, 64), INK, 2.2)}<div><div style="font:500 ${L(40, 40)}px var(--ui);color:${INK}">${n}</div><div style="font:400 ${L(30, 30)}px var(--ui);color:${GRAY};margin-top:6px;display:flex;align-items:center;gap:10px">${cur ? `<i style="width:12px;height:12px;border-radius:50%;background:${GREEN};display:inline-block"></i>` : ''}${meta}</div></div></div>`, { left: lx + 'px', top: y + 'px', width: lw + 'px', height: rh + 'px', display: 'flex', alignItems: 'center', borderBottom: `2px solid ${HAIR}` });
      const act = E.div('abs', row, cur ? '' : 'Sign out', { right: '0px', top: '50%', marginTop: L(-24, -24) + 'px', font: `500 ${L(32, 32)}px var(--ui)`, color: BLUE });
      fadeUp(row, t0 + 0.5 + i * 0.18, 0.7, 24); E.cue(t0 + 0.5 + i * 0.18, 'tap', { gain: 0.2 });
      if (i === 2) { E.to(row, t0 + 2.0, { autoAlpha: 0, x: 60, duration: 0.45, ease: 'power2.in' }); E.to(act, t0 + 1.7, { color: '#fff', backgroundColor: BLUE, padding: '6px 18px', borderRadius: '999px', duration: 0.2 }); E.cue(t0 + 1.75, 'click', { gain: 0.3 }); }
    }); }

  /* ---------- S7 16.8–19.6  encrypted in transit ---------- */
  s = sc(16.8, 19.6);
  { const t0 = 16.8;
    const head = ct(s, 'Encrypted in transit.', cx, L(270, 430), L(84, 76)); reveal(head, t0 + 0.1);
    const ax = L(360, 150), bx2 = W - ax, ly = L(600, 820);
    const ln = E.div('abs', s, null, { left: ax + 'px', top: ly + 'px', width: bx2 - ax + 'px', height: '2.5px', background: INK, transformOrigin: '0 50%' });
    E.ft(ln, t0 + 0.3, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power2.inOut' });
    const node = (ic, x, lab) => { const d = E.div('abs', s, `<div style="width:120px;height:120px;border-radius:50%;background:${IVORY};border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center">${hair(ic, 54, INK, 2.2)}</div><div class="md" style="font-size:26px;text-align:center;margin-top:16px">${lab}</div>`, { left: x - 60 + 'px', top: ly - 60 + 'px', width: '120px' }); return d; };
    const n1 = node('smartphone', ax, 'Your app'), n2 = node('server', bx2, 'AccountE');
    fadeUp(n1, t0 + 0.2, 0.6, 12); fadeUp(n2, t0 + 0.9, 0.6, 12);
    const lk = E.div('abs', s, `<div style="width:96px;height:96px;border-radius:24px;background:${BLUE};display:flex;align-items:center;justify-content:center">${hair('lock', 48, '#fff', 2.4)}</div>`, { left: cx - 48 + 'px', top: ly - 48 + 'px' });
    E.pop(lk, t0 + 0.8, 0.5, 0.5); E.cue(t0 + 0.8, 'click', { gain: 0.35 });
    // packets: readable figures before the lock, ciphertext after it
    const PK = ['$84.20', '$1,850', '$12.60'];
    const pk = PK.map((v) => E.div('abs', s, `<span class="plain">${v}</span><span class="ciph" style="display:none">#a9f2·e1</span>`, { left: '0px', top: ly - L(78, 82) + 'px', font: `500 ${L(26, 28)}px var(--ui)`, color: INK, padding: '6px 14px', border: `2px solid ${INK}`, borderRadius: '999px', background: IVORY, whiteSpace: 'nowrap', opacity: 0 }));
    E.frame((t) => { if (t < t0 || t > t0 + 2.8) return; pk.forEach((p, i) => { const u = (t - (t0 + 1.0 + i * 0.45)) / 1.3; if (u < 0 || u > 1) { p.style.opacity = 0; return; } const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; const x = ax + 70 + (bx2 - ax - 140) * e; const enc = x > cx; p.style.opacity = Math.min(1, u * 8, (1 - u) * 8).toFixed(2); p.style.left = x + 'px'; p.style.transform = 'translateX(-50%)'; p.querySelector('.plain').style.display = enc ? 'none' : ''; p.querySelector('.ciph').style.display = enc ? '' : 'none'; p.style.color = enc ? BLUE : INK; p.style.borderColor = enc ? BLUE : INK; }); });
    for (let i = 0; i < 3; i++) E.cue(t0 + 1.0 + i * 0.45 + 0.65, 'beep_lo', { gain: 0.12 }); }

  /* ---------- S8 19.6–22.4  never shared ---------- */
  s = sc(19.6, 22.4);
  { const t0 = 19.6;
    const head = ct(s, 'Never shared with third parties.', cx, L(250, 420), L(80, 66)); reveal(head, t0 + 0.1);
    const ox = cx, oy = L(610, 900), R = L(190, 220);
    const ring = svgEl(s, 2 * R + 8, 2 * R + 8, `<circle pathLength="1" stroke-dasharray="1 1" class="hl" cx="${R + 4}" cy="${R + 4}" r="${R}" style="stroke-width:3px"/>`, ox - R - 4, oy - R - 4);
    draw(ring.querySelectorAll('circle'), t0 + 0.2, 1.0);
    const me = E.div('abs', s, `<div style="width:120px;height:120px;border-radius:50%;background:${BLUE};display:flex;align-items:center;justify-content:center">${hair('user-round', 60, '#fff', 2.4)}</div>`, { left: ox - 60 + 'px', top: oy - 60 + 'px' });
    E.pop(me, t0 + 0.3, 0.6, 0.6);
    const N = 10; const dots = Array.from({ length: N }, (_, i) => E.div('abs', s, null, { width: '22px', height: '22px', borderRadius: '50%', border: `2.5px solid ${GRAY}`, background: IVORY, left: '0px', top: '0px', opacity: 0 }));
    const pulse = E.div('abs', s, null, { left: ox - R + 'px', top: oy - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px', borderRadius: '50%', border: `3px solid ${BLUE}`, opacity: 0 });
    E.frame((t) => { if (t < t0 || t > t0 + 2.8) return; let hit = 0;
      dots.forEach((d, i) => { const a = (i / N) * Math.PI * 2 + 0.3, st = t0 + 0.6 + (i % 5) * 0.16, u = t - st; const far = R + L(420, 230), near = R + 26, kv = L(0.3, 0.55); if (u < 0) { d.style.opacity = 0; return; }
        let r; if (u < 0.6) { const k = u / 0.6; r = far - (far - near) * k * k; } else { const k = Math.min(1, (u - 0.6) / 0.9); r = near + (far - near) * (1 - Math.pow(1 - k, 3)) * 0.8; if (u - 0.6 < 0.25) hit = Math.max(hit, 1 - (u - 0.6) / 0.25); }
        d.style.opacity = Math.min(1, u * 5).toFixed(2); d.style.left = (ox + Math.cos(a) * r - 11).toFixed(1) + 'px'; d.style.top = (oy + Math.sin(a) * (near + (r - near) * kv) - 11).toFixed(1) + 'px'; });
      pulse.style.opacity = (hit * 0.6).toFixed(2); pulse.style.transform = `scale(${(1 + (1 - hit) * 0.06).toFixed(3)})`; });
    for (let k = 0; k < 5; k++) E.cue(t0 + 1.2 + k * 0.16, 'tap', { gain: 0.12 }); }

  /* ---------- S9 22.4–25.2  privacy mode: one balance ---------- */
  s = sc(22.4, 25.2);
  { const t0 = 22.4;
    const head = ct(s, 'Privacy mode hides balances.', cx, L(250, 420), L(80, 70)); reveal(head, t0 + 0.1);
    const lab = E.div('abs', s, `<span style="display:flex;align-items:center;gap:16px">Total balance <span class="eye">${hair('eye', 40, GRAY, 2.2)}</span><span class="eyeoff" style="display:none">${hair('eye-off', 40, BLUE, 2.2)}</span></span>`, { left: cx + 'px', top: L(450, 640) + 'px', font: `500 ${L(34, 36)}px var(--ui)`, color: GRAY });
    gsap.set(lab, { xPercent: -50 }); fadeUp(lab, t0 + 0.3);
    const bal = ct(s, '', cx, L(610, 800), L(170, 150), 'lt', { fontWeight: 200 });
    const txt = '$12,480.50';
    bal.innerHTML = [...txt].map((c) => `<span class="ch" style="display:inline-block;position:relative;width:.58em;text-align:center"><span class="v">${c}</span><span class="d" style="position:absolute;left:50%;top:50%;width:.2em;height:.2em;margin:-.06em 0 0 -.1em;border-radius:50%;background:${INK};opacity:0"></span></span>`).join('');
    fadeUp(bal, t0 + 0.5, 0.8, 24);
    const chs = [...bal.querySelectorAll('.ch')];
    chs.forEach((c, i) => { const tt = t0 + 1.4 + i * 0.05; E.ft(c.querySelector('.v'), tt, { autoAlpha: 1, yPercent: 0 }, { autoAlpha: 0, yPercent: -40, duration: 0.3 }); E.ft(c.querySelector('.d'), tt + 0.08, { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, duration: 0.3 }); });
    E.set(lab.querySelector('.eye'), t0 + 1.35, { display: 'none' }); E.set(lab.querySelector('.eyeoff'), t0 + 1.35, { display: 'inline' }); E.cue(t0 + 1.35, 'click', { gain: 0.35 }); E.cue(t0 + 1.5, 'swoosh', { gain: 0.2 }); }

  /* ---------- S10 25.2–28.0  privacy toggle, every account ---------- */
  s = sc(25.2, 28.0);
  { const t0 = 25.2;
    const lw = L(980, 900), lx = cx - lw / 2, ly = L(290, 470), rh = L(118, 132);
    const tg = E.div('abs', s, `<div style="display:flex;align-items:center;justify-content:space-between;width:${lw}px"><span style="font:500 ${L(40, 42)}px var(--ui);color:${INK};display:flex;align-items:center;gap:18px">${hair('eye-off', 46, INK, 2.2)}Privacy mode</span><span class="sw" style="position:relative;width:110px;height:60px;border-radius:999px;border:2.5px solid ${INK};display:inline-block"><i class="kn" style="position:absolute;left:8px;top:8px;width:40px;height:40px;border-radius:50%;background:${INK}"></i></span></div>`, { left: lx + 'px', top: ly + 'px' });
    fadeUp(tg, t0 + 0.1, 0.6);
    const sw = tg.querySelector('.sw'), kn = tg.querySelector('.kn');
    E.to(kn, t0 + 0.9, { x: 50, background: '#fff', duration: 0.35, ease: 'power3.inOut' }); E.to(sw, t0 + 0.9, { background: BLUE, borderColor: BLUE, duration: 0.35 }); E.cue(t0 + 0.9, 'click', { gain: 0.4 });
    const ACC = [['landmark', 'Main Checking', '$4,912.30'], ['piggy-bank', 'Savings', '$8,640.00'], ['credit-card', 'Credit Card', '−$1,071.80'], ['wallet', 'Cash', '$240.00']];
    ACC.forEach(([ic, n, v], i) => {
      const y = ly + L(130, 150) + i * rh;
      const row = E.div('abs', s, `<span style="display:flex;align-items:center;gap:22px">${hair(ic, 44, GRAY, 2.2)}<span style="font:500 ${L(32, 34)}px var(--ui);color:${INK}">${n}</span></span><span style="position:relative;font:500 ${L(34, 36)}px var(--ui);color:${INK}"><span class="v">${v}</span><span class="d" style="position:absolute;right:0;top:0;opacity:0;letter-spacing:.12em">••••••</span></span>`, { left: lx + 'px', top: y + 'px', width: lw + 'px', height: rh + 'px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${HAIR}` });
      fadeUp(row, t0 + 0.2 + i * 0.1, 0.6, 16);
      E.ft(row.querySelector('.v'), t0 + 1.15 + i * 0.1, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25 });
      E.ft(row.querySelector('.d'), t0 + 1.2 + i * 0.1, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.3 });
    }); }

  /* ---------- S11 28.0–30.8  Free. ---------- */
  s = sc(28.0, 30.8);
  { const f = ct(s, `Free<span style="color:${BLUE}">.</span>`, cx, cy, L(330, 300), 'lt', { fontWeight: 200 });
    E.ft(f, 28.05, { autoAlpha: 0, letterSpacing: '0.2em', y: 20 }, { autoAlpha: 1, letterSpacing: '-0.03em', y: 0, duration: 1.6, ease: 'power3.out' }); E.cue(28.05, 'pop_lo', { gain: 0.35 });
    const u = ct(s, 'to start', cx, cy + L(220, 220), L(40, 44), 'md'); fadeUp(u, 29.0); }

  /* ---------- S12 30.8–33.6  free forever plan ---------- */
  s = sc(30.8, 33.6);
  { const iw = L(300, 300), ih = iw / 2.2;
    const inf = svgEl(s, iw, ih, hp(`M${iw / 2},${ih / 2} C${iw * 0.66},${ih * 0.05} ${iw * 0.97},${ih * 0.05} ${iw * 0.97},${ih / 2} C${iw * 0.97},${ih * 0.95} ${iw * 0.66},${ih * 0.95} ${iw / 2},${ih / 2} C${iw * 0.34},${ih * 0.05} ${iw * 0.03},${ih * 0.05} ${iw * 0.03},${ih / 2} C${iw * 0.03},${ih * 0.95} ${iw * 0.34},${ih * 0.95} ${iw / 2},${ih / 2} Z`, 3.5, BLUE), cx - iw / 2, cy - L(250, 300));
    draw(inf.querySelectorAll('path'), 30.9, 1.8, 'power1.inOut');
    const h = ct(s, P ? 'Free forever<br>plan.' : 'Free forever plan.', cx, cy + L(40, 40), L(110, 110)); reveal(h, 31.0); E.cue(31.0, 'swoosh', { gain: 0.25 }); }

  /* ---------- S13 33.6–36.4  no card, no time limit ---------- */
  s = sc(33.6, 36.4);
  { const ITEMS = [['credit-card', 'No credit card.'], ['hourglass', 'No time limit.']];
    ITEMS.forEach(([ic, txt], i) => {
      const x = P ? cx : cx + (i ? 1 : -1) * 430, y = P ? L(0, 470) + i * 420 : cy - 40;
      const icon = E.div('abs', s, hair(ic, 150, INK, 3), { left: x - 75 + 'px', top: y - 150 + 'px', width: '150px', height: '150px' });
      const slash = svgEl(s, 190, 190, hp('M10,180 L180,10', 4, BLUE), x - 95, y - 170);
      const tx = ct(s, txt, x, y + 110, L(64, 70));
      fadeUp(icon, 33.7 + i * 0.5, 0.7); draw(slash.querySelectorAll('path'), 34.3 + i * 0.5, 0.45, 'power2.out'); E.cue(34.3 + i * 0.5, 'swipe', { gain: 0.25 }); reveal(tx, 33.85 + i * 0.5, 0.9);
    }); }

  /* ---------- S14 36.4–39.2  add AI when ready ---------- */
  s = sc(36.4, 39.2);
  { const h = ct(s, P ? 'Add AI when<br>you’re ready.' : 'Add AI when you’re ready.', cx, cy - L(60, 60), L(104, 100)); reveal(h, 36.5);
    const tw = L(520, 560), ty = cy + L(140, 200);
    const tg = E.div('abs', s, `<div style="display:flex;align-items:center;justify-content:space-between;width:${tw}px;padding:22px 30px;border:2.5px solid ${INK};border-radius:28px;background:#fff"><span style="font:500 ${L(34, 36)}px var(--ui);color:${INK};display:flex;align-items:center;gap:16px"><span class="sp">${hair('sparkles', 44, INK, 2.2)}</span>AI features</span><span class="sw" style="position:relative;width:110px;height:60px;border-radius:999px;border:2.5px solid ${INK};display:inline-block"><i class="kn" style="position:absolute;left:8px;top:8px;width:40px;height:40px;border-radius:50%;background:${INK}"></i></span></div>`, { left: cx - tw / 2 - 30 + 'px', top: ty + 'px' });
    fadeUp(tg, 37.0, 0.7);
    E.to(tg.querySelector('.kn'), 37.9, { x: 50, background: '#fff', duration: 0.35, ease: 'power3.inOut' }); E.to(tg.querySelector('.sw'), 37.9, { background: BLUE, borderColor: BLUE, duration: 0.35 });
    E.to(tg.querySelector('.sp svg'), 37.9, { stroke: BLUE, duration: 0.3 }); E.cue(37.9, 'click', { gain: 0.4 }); E.cue(38.05, 'ding', { gain: 0.25 }); }

  /* ---------- S15 39.2–42.0  trial · cancel ---------- */
  s = sc(39.2, 42.0);
  { const LINES = ['Free trial on paid plans', 'Cancel anytime'];
    LINES.forEach((t2, i) => {
      const y = cy - L(70, 90) + i * L(150, 170);
      const row = ct(s, `<span style="display:inline-flex;align-items:center;gap:${L(28, 24)}px">${hair('check', L(64, 60), BLUE, 3)}${t2}</span>`, cx, y, L(76, 66));
      reveal(row, 39.3 + i * 0.45, 1.0); E.cue(39.3 + i * 0.45, 'tap', { gain: 0.25 });
    });
    const rl = E.div('abs', s, null, { left: cx - L(380, 330) + 'px', top: cy + L(10, 0) + 'px', width: L(760, 660) + 'px', height: '2px', background: HAIR }); E.ft(rl, 39.6, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power2.inOut' }); }

  /* ---------- S16 42.0–44.8  minimal phone, balance hidden ---------- */
  s = sc(42.0, 44.8, { static: true });
  { const sc0 = L(0.43, 0.5), phW = (UI.SW + 28) * sc0, x = P ? cx - phW / 2 : cx - phW / 2 + 330, y = L(150, 300);
    const ph = UI.phone(s, x, y, sc0);
    const home = UI.home(ph.screen, { balance: '••••••••', income: '••••••', expenses: '••••••' });
    const eye = home.card.querySelector('svg'); if (eye) eye.outerHTML = E.icon('eye-off', 30, 'rgba(255,255,255,.85)', 2);
    E.ft(ph, 42.0, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' }); E.ft(ph, 43.2, { rotation: 0 }, { rotation: -2, duration: 1.6, ease: 'none' }); E.cue(42.0, 'whoosh', { gain: 0.25 });
    if (!P) { const t1 = ct(s, 'Privacy<br>mode on.', cx - 470, cy - 20, 92, 'lt', { textAlign: 'left', lineHeight: '1.06' }); reveal(t1, 42.4, 1.2); }
    else { /* portrait: phone carries the beat alone */ } }

  /* ---------- S17 44.8–47.6  built by an accountant ---------- */
  s = sc(44.8, 47.6);
  { const a = ct(s, P ? 'Built by<br>an accountant.' : 'Built by an accountant.', cx, cy - L(80, 140), L(100, 100)); reveal(a, 44.9, 1.2);
    const b = ct(s, `Powered by <span style="color:${BLUE};font-weight:500">AI</span>.`, cx, cy + L(80, 110), L(100, 100)); reveal(b, 45.6, 1.2); E.cue(44.9, 'swoosh', { gain: 0.25 }); E.cue(45.6, 'swoosh', { gain: 0.25 }); }

  /* ---------- S18 47.6–50.4  mark → lock → mark ---------- */
  s = sc(47.6, 50.4, { static: true });
  { const icS = L(220, 240), iy = L(300, 560);
    const ic = E.logoIcon(s, icS, { left: cx - icS / 2 + 'px', top: iy + 'px' });
    E.ft(ic, 47.65, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' });
    const bw = icS + 120, bh = icS + 100, bx = cx - bw / 2, by = iy - 50;
    const body = svgEl(s, bw, bh, hp(rr(2, 2, bw - 4, bh - 4, 40), 4), bx, by);
    const shk = svgEl(s, bw, 170, hp(`M${bw * 0.33},170 V${bw * 0.3} A${bw * 0.17},${bw * 0.17} 0 0 1 ${bw * 0.67},${bw * 0.3} V170`, 6), bx, by - 166);
    draw(body.querySelectorAll('path'), 47.9, 0.7); draw(shk.querySelectorAll('path'), 48.2, 0.6); E.cue(48.85, 'click', { gain: 0.45 });
    E.to(shk, 48.85, { y: 14, duration: 0.15, ease: 'power2.in' });
    E.to([body, shk], 49.4, { autoAlpha: 0, duration: 0.4 });
    const wm = E.wordmark(s, { width: L(620, 640), left: cx - L(310, 320), top: iy + icS + L(60, 90), color: INK });
    E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
    wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 49.5 + i * 0.05, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }));
    E.cue(49.5, 'swoosh', { gain: 0.25 }); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
