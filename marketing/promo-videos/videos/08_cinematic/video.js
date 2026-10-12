/* 08 · Cinematic — "Four money lives"  (Urbanist titles + Roboto UI) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  E.stage.style.background = '#03050A';
  E.css(`.cine-t{font:300 ${L(64, 60)}px Urbanist;color:#F4F7FF;letter-spacing:.42em;text-transform:uppercase;text-shadow:0 0 30px rgba(120,170,255,.35)}
    .cine-n{font:600 ${L(26, 28)}px Urbanist;color:#8FB7FF;letter-spacing:.5em}
    .cine-h{font:500 ${L(76, 74)}px Urbanist;color:#F4F7FF;letter-spacing:.02em;line-height:1.1;text-shadow:0 6px 40px rgba(0,0,0,.6)}
    .glass8{background:linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1.5px solid rgba(255,255,255,.22);border-radius:28px;box-shadow:0 40px 90px rgba(0,0,0,.55);color:#F4F7FF;font-family:Roboto}
    .g8k{font:600 ${L(24, 26)}px Roboto;color:#AFC4E8;letter-spacing:.06em}
    .g8v{font:700 ${L(56, 58)}px Roboto;color:#fff;letter-spacing:-.01em}`);
  const cx = W / 2;
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const rnd = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

  /* ---------- illustration helper: 1920x1080 art, sliced for 9:16 ---------- */
  function art(parent, svgInner, focusX) {
    const d = E.div('fill', parent, `<svg width="${W}" height="${H}" viewBox="${P ? `${(focusX || 960) - 304} 0 608 1080` : '0 0 1920 1080'}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0">${svgInner}</svg>`);
    return d.firstChild;
  }
  const bokeh = (n, seed, cols, rmin, rmax, yMin, yMax, op) => Array.from({ length: n }, (_, i) => { const x = rnd(seed + i) * 1920, y = yMin + rnd(seed + i + 50) * (yMax - yMin), r = rmin + rnd(seed + i + 99) * (rmax - rmin), c = cols[i % cols.length]; return `<circle class="bk" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#bk${c})" opacity="${(op * (0.5 + rnd(seed + i + 7) * 0.5)).toFixed(2)}"/>`; }).join('');
  const bkDefs = `<radialGradient id="bkW"><stop offset="0" stop-color="#FFD39A" stop-opacity="1"/><stop offset=".6" stop-color="#FFB86B" stop-opacity=".45"/><stop offset="1" stop-color="#FFB86B" stop-opacity="0"/></radialGradient><radialGradient id="bkB"><stop offset="0" stop-color="#9CC3FF" stop-opacity="1"/><stop offset=".6" stop-color="#3B82F6" stop-opacity=".45"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0"/></radialGradient><radialGradient id="bkC"><stop offset="0" stop-color="#A5F3FC" stop-opacity="1"/><stop offset=".6" stop-color="#22D3EE" stop-opacity=".4"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>`;

  /* ---------- sets ---------- */
  const SET_DESK = `<defs>${bkDefs}<linearGradient id="dk_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060A16"/><stop offset="1" stop-color="#0B1530"/></linearGradient>
    <linearGradient id="dk_scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5EA2FF"/><stop offset="1" stop-color="#1D3FB8"/></linearGradient>
    <radialGradient id="dk_spill" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3B82F6" stop-opacity=".55"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0"/></radialGradient>
    <radialGradient id="dk_lamp" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#FFC27A" stop-opacity=".55"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></radialGradient>
    <linearGradient id="dk_win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1D3F"/><stop offset="1" stop-color="#1A2E5C"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#dk_bg)"/>
    <g class="far"><rect x="1080" y="90" width="700" height="560" fill="url(#dk_win)"/>${bokeh(26, 3, ['W', 'B', 'W', 'C'], 8, 26, 160, 600, 0.9).replace(/cx="(\d+)"/g, (m, x) => `cx="${1090 + (+x / 1920) * 680}"`)}<rect x="1080" y="90" width="700" height="560" fill="none" stroke="#04060C" stroke-width="18"/><line x1="1430" y1="90" x2="1430" y2="650" stroke="#04060C" stroke-width="14"/><line x1="1080" y1="370" x2="1780" y2="370" stroke="#04060C" stroke-width="10"/></g>
    <g class="mid"><polygon points="0,760 1920,720 1920,1080 0,1080" fill="#05070D"/><polygon points="0,760 1920,720 1920,736 0,776" fill="#1B2440"/>
      <ellipse cx="900" cy="770" rx="560" ry="90" fill="url(#dk_spill)"/>
      <g transform="translate(640 420)"><polygon points="20,330 520,330 560,372 -20,372" fill="#0B0F1A"/><polygon points="40,0 500,0 500,320 40,320" fill="#0A0E18"/><rect x="58" y="16" width="424" height="290" fill="url(#dk_scr)"/><g opacity=".85"><rect x="78" y="40" width="120" height="14" rx="7" fill="#fff" opacity=".9"/><rect x="78" y="76" width="180" height="56" rx="10" fill="#fff" opacity=".22"/><rect x="274" y="76" width="188" height="56" rx="10" fill="#fff" opacity=".22"/><rect x="78" y="150" width="384" height="130" rx="12" fill="#fff" opacity=".12"/><polyline points="96,250 160,220 220,236 290,190 350,204 440,160" fill="none" stroke="#A7F3D0" stroke-width="5"/></g></g>
      <g transform="translate(1260 610)"><rect x="0" y="40" width="110" height="130" rx="16" fill="#06080F"/><path d="M110 70 q40 0 40 40 q0 40 -40 40" fill="none" stroke="#06080F" stroke-width="16"/><path class="steam1" d="M30 30 q-20 -40 10 -70 q30 -30 0 -70" fill="none" stroke="#9FB4D8" stroke-width="5" opacity=".35"/><path class="steam2" d="M70 30 q20 -40 -10 -70 q-30 -30 0 -70" fill="none" stroke="#9FB4D8" stroke-width="4" opacity=".28"/></g>
      <g><polygon points="300,330 520,760 80,760" fill="url(#dk_lamp)"/><path d="M220 760 L260 760 L250 560 L330 360 L310 350 L230 550 Z" fill="#05070D"/><path d="M270 300 L400 360 L360 420 L230 360 Z" fill="#0A0D16"/></g></g>
    <g class="near">${bokeh(6, 41, ['W', 'B'], 70, 140, 820, 1080, 0.35)}</g>`;
  const SET_SHOP = `<defs>${bkDefs}<linearGradient id="sh_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D1A36"/><stop offset=".55" stop-color="#5B3A55"/><stop offset=".8" stop-color="#F08A5D"/><stop offset="1" stop-color="#FFD08A"/></linearGradient>
    <radialGradient id="sh_sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4D6"/><stop offset=".35" stop-color="#FFC27A" stop-opacity=".8"/><stop offset="1" stop-color="#FF8A4C" stop-opacity="0"/></radialGradient>
    <linearGradient id="sh_win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC985"/><stop offset="1" stop-color="#E9894A"/></linearGradient>
    <linearGradient id="sh_road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1420"/><stop offset="1" stop-color="#07060A"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#sh_sky)"/>
    <g class="far"><circle cx="1480" cy="760" r="300" fill="url(#sh_sun)"/><path d="M0 700 L180 700 L180 560 L300 560 L300 640 L420 640 L420 520 L520 520 L520 700 L1920 700 L1920 760 L0 760Z" fill="#2A1C2E" opacity=".75"/><path d="M1300 700 L1340 600 L1420 600 L1440 520 L1560 520 L1600 610 L1700 610 L1700 700Z" fill="#2A1C2E" opacity=".6"/></g>
    <g class="mid"><rect x="560" y="250" width="800" height="560" fill="#120C16"/><rect x="560" y="250" width="800" height="26" fill="#1F1622"/>
      <g>${Array.from({ length: 10 }, (_, i) => `<path d="M${560 + i * 80} 400 L${640 + i * 80} 400 L${636 + i * 80} 470 Q${600 + i * 80} 490 ${564 + i * 80} 470Z" fill="${i % 2 ? '#2B1E33' : '#4A2236'}"/>`).join('')}</g>
      <rect x="620" y="500" width="440" height="270" fill="url(#sh_win)" opacity=".92"/><rect x="620" y="500" width="440" height="270" fill="none" stroke="#120C16" stroke-width="12"/><line x1="840" y1="500" x2="840" y2="770" stroke="#120C16" stroke-width="10"/>
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${670 + i * 64}" cy="${740}" rx="26" ry="12" fill="#7A3E1E" opacity=".75"/>`).join('')}
      <rect x="1120" y="500" width="170" height="310" fill="#1B1219"/><rect x="1132" y="512" width="146" height="160" fill="url(#sh_win)" opacity=".65"/>
      <rect x="760" y="300" width="400" height="80" rx="10" fill="#0B080E" stroke="#3A2A3E" stroke-width="3"/></g>
    <rect x="0" y="808" width="1920" height="272" fill="url(#sh_road)"/><rect x="620" y="812" width="440" height="140" fill="#FFC27A" opacity=".08"/>
    <g class="near">${bokeh(5, 71, ['W'], 60, 120, 860, 1080, 0.3)}</g>`;
  const SET_WARE = `<defs>${bkDefs}<linearGradient id="wh_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040812"/><stop offset="1" stop-color="#0A1A38"/></linearGradient>
    <linearGradient id="wh_beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE0FF" stop-opacity=".35"/><stop offset="1" stop-color="#BFE0FF" stop-opacity="0"/></linearGradient>
    <linearGradient id="wh_box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E6E8C"/><stop offset="1" stop-color="#28344D"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#wh_bg)"/>
    <g class="far">${[0, 1, 2].map((k) => { const sc = 0.55 + k * 0.22, x0 = 960 - 900 * sc, y0 = 260 - k * 40; return `<g transform="translate(${x0} ${y0}) scale(${sc})" opacity="${0.45 + k * 0.25}">` + [0, 1, 2, 3].map((r) => `<rect x="0" y="${r * 170}" width="1800" height="14" fill="#141D33"/>` + Array.from({ length: 11 }, (_, j) => `<rect x="${20 + j * 160 + (r % 2) * 40}" y="${r * 170 - 110}" width="${110 + ((j * 7 + r) % 3) * 18}" height="${100 + ((j + r) % 2) * 8}" rx="6" fill="url(#wh_box)"/><rect x="${20 + j * 160 + (r % 2) * 40}" y="${r * 170 - 110}" width="${110 + ((j * 7 + r) % 3) * 18}" height="16" fill="#8BA3C7" opacity=".25"/>`).join('')).join('') + `</g>`; }).join('')}</g>
    <g class="mid"><polygon class="beam1" points="560,0 760,0 980,1080 260,1080" fill="url(#wh_beam)"/><polygon class="beam2" points="1240,0 1400,0 1680,1080 1040,1080" fill="url(#wh_beam)" opacity=".8"/></g>
    <rect y="900" width="1920" height="180" fill="#030610" opacity=".85"/>
    <g class="near">${bokeh(8, 91, ['B', 'C'], 50, 110, 760, 1080, 0.28)}</g>`;
  const SET_HOME = `<defs>${bkDefs}<linearGradient id="hm_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140B08"/><stop offset="1" stop-color="#2A160E"/></linearGradient>
    <radialGradient id="hm_lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD7A0" stop-opacity=".9"/><stop offset=".4" stop-color="#FFB86B" stop-opacity=".35"/><stop offset="1" stop-color="#FFB86B" stop-opacity="0"/></radialGradient>
    <linearGradient id="hm_win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2C5C"/><stop offset="1" stop-color="#3A3F78"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#hm_bg)"/>
    <g class="far"><rect x="140" y="140" width="520" height="560" fill="url(#hm_win)"/>${bokeh(14, 13, ['W', 'B'], 6, 16, 300, 640, 0.8).replace(/cx="(\d+)"/g, (m, x) => `cx="${150 + (+x / 1920) * 500}"`)}<rect x="140" y="140" width="520" height="560" fill="none" stroke="#0C0705" stroke-width="16"/><line x1="400" y1="140" x2="400" y2="700" stroke="#0C0705" stroke-width="12"/>
      <circle cx="1420" cy="420" r="380" fill="url(#hm_lamp)"/></g>
    <g class="mid"><path d="M1400 760 L1420 330 L1440 330 L1460 760Z" fill="#0C0705"/><path d="M1340 330 L1520 330 L1480 230 L1380 230Z" fill="#2B170C"/><path d="M1350 330 L1510 330 L1480 240 L1380 240Z" fill="#FFCF96" opacity=".55"/>
      <path d="M520 860 Q520 640 700 640 L1240 640 Q1420 640 1420 860 L1420 900 L520 900Z" fill="#0F0806"/><path d="M560 700 Q560 600 660 600 L1280 600 Q1380 600 1380 700 L1380 720 L560 720Z" fill="#170C08"/>
      <path d="M1640 900 Q1600 700 1700 560 Q1690 700 1760 900Z" fill="#0A0503"/><path d="M1700 900 Q1760 640 1860 600 Q1800 760 1780 900Z" fill="#0A0503"/>
      <ellipse cx="960" cy="960" rx="700" ry="90" fill="#3B2014" opacity=".55"/></g>
    <g class="near">${bokeh(7, 33, ['W'], 60, 130, 820, 1080, 0.32)}</g>`;

  /* ---------- shot helper: set + slow dolly + parallax ---------- */
  function shot(t0, t1, set, focusX, move) {
    const s = E.scene(t0, t1, '', {}, { static: true });
    const setL = E.div('fill', s);            // only the set dollies; overlays added to s stay fixed
    const svg = art(setL, set, focusX);
    const far = svg.querySelector('.far'), mid = svg.querySelector('.mid'), near = svg.querySelector('.near');
    move = move || { s0: 1.0, s1: 1.07, x: -30, y: -10 };
    E.ft(setL, t0, { scale: move.s0, x: 0, y: 0 }, { scale: move.s1, x: move.x, y: move.y, duration: t1 - t0, ease: 'none' });
    E.frame((t) => { if (t < t0 || t > t1) return; const p = (t - t0) / (t1 - t0);
      if (far) far.setAttribute('transform', `translate(${(-p * 20).toFixed(1)} 0)`); if (mid) mid.setAttribute('transform', `translate(${(-p * 45).toFixed(1)} 0)`); if (near) near.setAttribute('transform', `translate(${(-p * 120).toFixed(1)} ${(-p * 10).toFixed(1)})`); });
    return { s, svg };
  }
  function chapterTitle(s, t0, n, title) {
    const box = E.div('abs', s, null, { left: 0, right: 0, top: L(166, 300) + 'px', textAlign: 'center', zIndex: 5 });
    const num = E.div('cine-n', box, n); const tt = E.div('cine-t', box, title, { marginTop: '18px' });
    const ln = E.div('', box, null, { width: '360px', height: '2px', margin: '26px auto 0', background: 'linear-gradient(90deg,transparent,#8FB7FF,transparent)' });
    E.ft(num, t0 + 0.3, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' });
    E.ft(tt, t0 + 0.5, { autoAlpha: 0, letterSpacing: '.8em', filter: 'blur(8px)' }, { autoAlpha: 1, letterSpacing: '.42em', filter: 'blur(0px)', duration: 1.4, ease: 'power3.out' });
    E.ft(ln, t0 + 0.9, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power3.out' });
    E.cue(t0, 'impact', { gain: 0.25 });
  }
  function subLine(s, text) {
    return E.div('abs cine-h', s, text, P ? { left: '60px', right: '60px', top: '200px', fontSize: '54px', textAlign: 'center', zIndex: 5 } : { left: '130px', top: '172px', fontSize: '56px', textAlign: 'left', zIndex: 5, whiteSpace: 'nowrap' });
  }
  function glassCard(s, t0, html, x, y, w, opts) {
    const c = E.div('abs glass8', s, html, Object.assign({ left: x + 'px', top: y + 'px', width: w + 'px', padding: L('36px 42px', '36px 40px'), zIndex: 4 }, opts || {}));
    E.ft(c, t0 + 0.15, { autoAlpha: 0, y: 50, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }); E.cue(t0 + 0.15, 'swoosh', { gain: 0.3 });
    return c;
  }
  const flare = (s, t, y) => { const f = E.div('abs', s, null, { left: '-10%', width: '120%', top: y + 'px', height: '6px', background: 'linear-gradient(90deg,transparent,rgba(140,190,255,.0) 10%,rgba(170,210,255,.85) 50%,rgba(140,190,255,0) 90%,transparent)', filter: 'blur(1px)', zIndex: 6 });
    const core = E.div('abs', s, null, { left: '50%', top: y - 40 + 'px', width: '80px', height: '80px', marginLeft: '-40px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,.95), rgba(140,190,255,.3), transparent)', zIndex: 6 });
    E.ft([f, core], t, { autoAlpha: 0, x: -600 }, { autoAlpha: 1, x: 600, duration: 1.4, ease: 'power2.inOut' }); E.to([f, core], t + 1.1, { autoAlpha: 0, duration: 0.4 }); };

  /* ---------- hook ---------- */
  { const s = E.scene(0, 2.8);
    s.style.background = 'radial-gradient(1000px 500px at 50% 55%, #0B1530, #03050A)';
    for (let i = 0; i < 40; i++) { const d = E.div('abs', s, null, { width: '4px', height: '4px', borderRadius: '50%', background: '#cfe0ff', left: rnd(i) * W + 'px', top: rnd(i + 9) * H + 'px', opacity: 0.2 + rnd(i + 3) * 0.5 }); E.frame((t) => { if (t < 2.8) d.style.translate = `${(t * (10 + rnd(i) * 20)).toFixed(1)}px ${(-t * (6 + rnd(i + 1) * 12)).toFixed(1)}px`; }); }
    const beam = E.div('abs', s, null, { left: '-40%', width: '50%', top: 0, bottom: 0, background: 'linear-gradient(100deg, transparent, rgba(160,200,255,.18), transparent)' });
    E.ft(beam, 0.0, { x: 0 }, { x: W * 1.6, duration: 2.6, ease: 'power1.inOut' });
    const h = K.ctext(s, 'Four money lives.', cx, L(500, 860), {}, 'cine-h'); h.style.fontSize = L(110, 96) + 'px';
    E.ft(h, 0.2, { autoAlpha: 0, filter: 'blur(14px)', letterSpacing: '.2em' }, { autoAlpha: 1, filter: 'blur(0px)', letterSpacing: '.02em', duration: 1.6, ease: 'power3.out' });
    E.cue(0.0, 'rise', { gain: 0.3 }); }
  { const s = E.scene(2.8, 5.6);
    s.style.background = 'radial-gradient(1000px 600px at 50% 50%, #0E1E44, #03050A)';
    const ic = E.logoIcon(s, L(170, 200), { left: cx - L(85, 100) + 'px', top: L(260, 600) + 'px', filter: 'drop-shadow(0 0 40px rgba(60,130,255,.8))' });
    E.ft(ic, 2.9, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'power3.out' });
    const h = K.ctext(s, 'One AI bookkeeper.', cx, L(600, 960), {}, 'cine-h'); h.style.fontSize = L(100, 88) + 'px';
    E.ft(h, 3.2, { autoAlpha: 0, y: 20, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' });
    flare(s, 3.0, L(560, 900)); E.cue(2.85, 'impact', { gain: 0.4 }); }

  /* ---------- CH1 freelancer ---------- */
  { const { s } = shot(5.6, 8.8, SET_DESK, 900); chapterTitle(s, 5.6, '01', 'The freelancer'); }
  { const { s, svg } = shot(8.8, 12.0, SET_DESK, 900, { s0: 1.35, s1: 1.45, x: L(-120, 0), y: -40 });
    const st1 = svg.querySelector('.steam1'), st2 = svg.querySelector('.steam2');
    const c = glassCard(s, 8.8, `<div class="g8k">VIEW</div><div style="display:flex;gap:10px;margin:14px 0 26px;background:rgba(255,255,255,.08);padding:8px;border-radius:999px;width:max-content"><span style="padding:12px 28px;border-radius:999px;background:#fff;color:#0B1220;font:700 28px Roboto">Business</span><span style="padding:12px 28px;border-radius:999px;color:#C7D7F5;font:600 28px Roboto">Personal</span></div><div style="display:flex;gap:40px"><div><div class="g8k">Client income</div><div class="g8v">$6,840</div></div><div><div class="g8k">Business costs</div><div class="g8v">$1,215</div></div></div>`, L(1140, 110), L(330, 930), L(640, 860));
    const sub = subLine(s, 'Separate business & personal');
    E.ft(sub, 9.3, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 });
    E.frame((t) => { if (t >= 5.6 && t < 12) { st1.setAttribute('opacity', (0.25 + 0.15 * Math.sin(t * 2)).toFixed(2)); st1.setAttribute('transform', `translate(0 ${(-((t * 12) % 30)).toFixed(1)})`); st2.setAttribute('transform', `translate(0 ${(-((t * 9 + 10) % 30)).toFixed(1)})`); } }); }
  { const s = E.scene(12.0, 15.4, '', {}, { static: true });
    s.style.background = 'radial-gradient(900px 700px at 40% 40%, #2A1C10, #07060A)';
    const lamp = E.div('abs', s, null, { left: L(200, -200) + 'px', top: '-200px', width: '1200px', height: '1200px', background: 'radial-gradient(closest-side, rgba(255,194,122,.35), transparent)' });
    const rc = UI.receipt(s, { store: 'STUDIO SUPPLY CO', addr: 'Design & print', date: '10/07/2026', time: '3:20 PM', items: [['Sketchbook A4', '18.50'], ['Ink cartridges', '42.00'], ['Cutting mat', '24.90']], tax: '6.84', total: '$92.24', foot: 'Thank you!' }, L(420, 440));
    rc.style.left = L(cx - 560, cx - 220) + 'px'; rc.style.top = L(290, 360) + 'px'; gsap.set(rc, { rotation: -6 });
    E.ft(rc, 12.0, { scale: 1.05 }, { scale: 1.12, duration: 3.4, ease: 'none' });
    const tag = glassCard(s, 12.1, `<div style="display:flex;align-items:center;gap:18px"><div style="width:74px;height:74px;border-radius:22px;background:rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center">${E.icon('badge-check', 42, '#6EE7B7', 2.2)}</div><div><div class="g8k">TAGGED</div><div style="font:700 40px Roboto;color:#fff">Tax-deductible</div></div></div><div class="g8k" style="margin-top:22px">Office supplies · $92.24 · receipt saved</div>`, L(cx + 20, 110), L(380, 1080), L(620, 860));
    const sub = subLine(s, 'Tag tax-deductibles year-round');
    E.ft(sub, 12.6, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); E.cue(12.2, 'ding', { gain: 0.3 }); }

  /* ---------- CH2 small business ---------- */
  { const { s } = shot(15.4, 18.6, SET_SHOP, 940, { s0: 1.0, s1: 1.08, x: -40, y: 0 });
    const open = K.ctext(s, 'OPEN', L(960, cx), L(340, 560), { font: '800 54px Urbanist', color: '#FFD3E0', letterSpacing: '.2em', textShadow: '0 0 12px #FF5C93,0 0 30px #FF5C93,0 0 60px #FF2D78', zIndex: 3 });
    E.ft(open, 15.6, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, repeat: 2, yoyo: true }); E.cue(15.6, 'click', { gain: 0.4 });
    chapterTitle(s, 15.4, '02', 'The small business'); flare(s, 15.9, L(760, 1100)); }
  { const { s } = shot(18.6, 21.8, SET_SHOP, 940, { s0: 1.25, s1: 1.33, x: -60, y: -20 });
    const veil = E.div('fill', s, null, { background: 'rgba(5,6,12,.45)' });
    glassCard(s, 18.6, `<div class="g8k">PROFIT &amp; LOSS · SEPTEMBER</div><div style="display:grid;grid-template-columns:1fr auto;row-gap:16px;margin-top:22px;font:500 32px Roboto;color:#E2E8F5"><span>Revenue</span><span>$18,420.00</span><span>Cost of goods</span><span>-$7,380.00</span><span>Operating expenses</span><span>-$5,580.00</span></div><div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid rgba(255,255,255,.25);margin-top:22px;padding-top:20px"><span style="font:600 32px Roboto">Net profit</span><span class="g8v" style="color:#6EE7B7">$5,460.00</span></div>`, L(cx - 380, 90), L(310, 440), L(760, 900));
    const sub = subLine(s, 'Real Profit & Loss'); E.ft(sub, 19.2, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }
  { const { s } = shot(21.8, 25.2, SET_SHOP, 940, { s0: 1.4, s1: 1.48, x: 40, y: -30 });
    E.div('fill', s, null, { background: 'rgba(5,6,12,.5)' });
    glassCard(s, 21.8, `<div class="g8k">BALANCE SHEET</div><div class="g8v" style="margin-top:10px">$84,300</div><div class="g8k" style="margin-top:6px">total assets</div>`, L(cx - 700, 90), L(330, 400), L(440, 420));
    glassCard(s, 22.2, `<div class="g8k">CASH FLOW · 30 DAYS</div><div class="g8v" style="margin-top:10px;color:#6EE7B7">+$3,915</div><svg width="340" height="70" style="margin-top:12px"><polyline points="0,60 50,48 100,52 150,30 200,36 250,18 300,22 340,8" fill="none" stroke="#6EE7B7" stroke-width="4"/></svg>`, L(cx - 220, 570), L(330, 400), L(440, 420));
    const rec = glassCard(s, 22.6, `<div style="display:flex;align-items:center;gap:16px">${E.icon('circle-check', 54, '#6EE7B7', 2.2)}<div><div class="g8k">BANK STATEMENT</div><div style="font:700 40px Roboto;color:#fff">Reconciled</div></div></div>`, L(cx + 260, 90), L(330, 820), L(440, 900));
    E.cue(22.7, 'success', { gain: 0.35 });
    const sub = subLine(s, 'Without hiring an accountant'); E.ft(sub, 23.0, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }

  /* ---------- CH3 online seller ---------- */
  { const { s, svg } = shot(25.2, 28.4, SET_WARE, 960, { s0: 1.0, s1: 1.1, x: 0, y: -20 });
    const b1 = svg.querySelector('.beam1'), b2 = svg.querySelector('.beam2');
    E.frame((t) => { if (t >= 25.2 && t < 35) { b1.setAttribute('opacity', (0.7 + 0.3 * Math.sin(t * 0.8)).toFixed(2)); b2.setAttribute('opacity', (0.6 + 0.3 * Math.sin(t * 0.6 + 1)).toFixed(2)); } });
    for (let i = 0; i < 50; i++) { const d = E.div('abs', s, null, { width: '3px', height: '3px', borderRadius: '50%', background: '#DCEBFF', left: (300 + rnd(i + 200) * 1300) * (W / 1920) + 'px', top: rnd(i + 300) * H + 'px', opacity: 0.15 + rnd(i + 400) * 0.45 }); E.frame((t) => { if (t >= 25.2 && t < 28.4) d.style.translate = `${(Math.sin(t + i) * 12).toFixed(1)}px ${(-(t - 25.2) * (8 + rnd(i) * 14)).toFixed(1)}px`; }); }
    chapterTitle(s, 25.2, '03', 'The online seller'); }
  { const { s } = shot(28.4, 31.6, SET_WARE, 960, { s0: 1.2, s1: 1.28, x: -50, y: 0 });
    E.div('fill', s, null, { background: 'rgba(3,6,14,.45)' });
    const CH = [['US', '+$1,240.00', 'Sales · USD', '#6EE7B7'], ['EU', '+€860.00', 'Sales · EUR', '#6EE7B7'], ['GB', '+£420.00', 'Sales · GBP', '#6EE7B7'], ['', '-$86.40', 'Platform fees', '#FCA5A5'], ['', '-€32.00', 'Refund', '#FCD34D']];
    CH.forEach((c, i) => { const x = P ? 110 : [cx - 760, cx - 240, cx + 280, cx - 500, cx + 20][i], y = P ? 330 + i * 200 : [330, 300, 350, 600, 620][i];
      const card = glassCard(s, 28.4 + i * 0.15, `<div class="g8k">${c[2]}</div><div class="g8v" style="color:${c[3]};margin-top:8px">${c[1]}</div>`, x, y, L(440, 860), { padding: '26px 32px' });
      E.frame((t) => { if (t >= 28.4 && t < 31.6) card.style.translate = `0 ${(Math.sin(t * 1.2 + i) * 8).toFixed(1)}px`; }); E.cue(28.6 + i * 0.15, 'coin', { gain: 0.2 }); });
    const sub = subLine(s, 'Revenue, fees & refunds, in many currencies'); E.ft(sub, 29.0, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }
  { const { s } = shot(31.6, 35.0, SET_WARE, 960, { s0: 1.35, s1: 1.42, x: 40, y: -20 });
    E.div('fill', s, null, { background: 'rgba(3,6,14,.55)' });
    const ROWS = [['Order #1042', 'Sales', '#6EE7B7', '+$84.00'], ['Platform fee', 'Fees', '#FCA5A5', '-$6.72'], ['Order #1043', 'Sales', '#6EE7B7', '+$129.00'], ['Refund #0981', 'Refunds', '#FCD34D', '-$32.00'], ['Shipping label', 'Shipping', '#93C5FD', '-$7.40'], ['Order #1044', 'Sales', '#6EE7B7', '+$56.50']];
    const tbl = E.div('abs glass8', s, `<div style="display:flex;align-items:center;gap:14px" class="g8k">${E.icon('file-spreadsheet', 30, '#AFC4E8', 2)} orders_export.csv · 1,240 rows</div>`, { left: L(cx - 620, 70) + 'px', top: L(270, 330) + 'px', width: L(1240, 940) + 'px', padding: '26px 40px', zIndex: 4 });
    E.ft(tbl, 31.7, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.7 });
    ROWS.forEach((r, i) => { const row = E.div('', tbl, `<span style="flex:1;font:500 30px Roboto">${r[0]}</span><span class="cat" style="font:700 24px Roboto;color:#0B1220;background:${r[2]};padding:6px 16px;border-radius:999px;margin-right:30px">${r[1]}</span><span style="width:150px;text-align:right;font:700 30px Roboto">${r[3]}</span>`, { display: 'flex', alignItems: 'center', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,.12)' });
      E.ft(row, 32.0 + i * 0.13, { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.35 }); E.ft(row.querySelector('.cat'), 32.4 + i * 0.13, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }); E.cue(32.4 + i * 0.13, 'pop_hi', { gain: 0.15 }); });
    const sub = subLine(s, 'CSV in. Categories out.'); E.ft(sub, 33.0, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }

  /* ---------- CH4 household ---------- */
  { const { s } = shot(35.0, 38.2, SET_HOME, 980, { s0: 1.0, s1: 1.07, x: -30, y: -10 }); chapterTitle(s, 35.0, '04', 'The household'); flare(s, 35.6, L(420, 700)); }
  { const { s } = shot(38.2, 41.4, SET_HOME, 980, { s0: 1.25, s1: 1.32, x: -40, y: 0 });
    E.div('fill', s, null, { background: 'rgba(10,5,3,.45)' });
    const n = glassCard(s, 38.2, `<div style="display:flex;align-items:center;gap:18px"><div style="width:76px;height:76px;border-radius:22px;background:rgba(245,158,11,.22);display:flex;align-items:center;justify-content:center">${E.icon('bell-ring', 42, '#FCD34D', 2.2)}</div><div><div class="g8k">BUDGET ALERT</div><div style="font:700 40px Roboto;color:#fff">Groceries · 75% used</div></div></div><div style="margin-top:26px;height:22px;border-radius:11px;background:rgba(255,255,255,.15);overflow:hidden"><div class="bar" style="width:75%;height:100%;border-radius:11px;background:linear-gradient(90deg,#FCD34D,#F59E0B)"></div></div><div class="g8k" style="margin-top:14px">$450 of $600 · 9 days left</div>`, L(cx - 380, 90), L(330, 520), L(760, 900));
    E.ft(n.querySelector('.bar'), 38.8, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 1.0, ease: 'power3.out' }); E.cue(38.5, 'notify', { gain: 0.4 });
    const sub = subLine(s, 'Alerts before you overspend'); E.ft(sub, 38.9, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }
  { const { s } = shot(41.4, 44.8, SET_HOME, 980, { s0: 1.4, s1: 1.47, x: 30, y: -20 });
    E.div('fill', s, null, { background: 'rgba(10,5,3,.5)' });
    const R = 110, C = 2 * Math.PI * R;
    const g1 = glassCard(s, 41.4, `<div class="g8k">SAVINGS GOAL</div><div style="display:flex;align-items:center;gap:30px;margin-top:16px"><svg width="260" height="260"><circle cx="130" cy="130" r="${R}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="22"/><circle class="arc" cx="130" cy="130" r="${R}" fill="none" stroke="#6EE7B7" stroke-width="22" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 130 130)"/><text x="130" y="145" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="52" fill="#fff">62%</text></svg><div><div style="font:700 40px Roboto">Family trip</div><div class="g8k" style="margin-top:8px">$2,480 of $4,000</div></div></div>`, L(cx - 760, 90), L(310, 380), L(700, 900));
    E.ft(g1.querySelector('.arc'), 41.8, { attr: { 'stroke-dashoffset': C } }, { attr: { 'stroke-dashoffset': C * 0.38 }, duration: 1.4, ease: 'power3.out' });
    glassCard(s, 41.8, `<div class="g8k">NET WORTH</div><div class="g8v" style="margin-top:8px">$59,174 <span style="font-size:32px;color:#6EE7B7">▲</span></div><svg width="520" height="120" style="margin-top:14px"><polyline points="0,110 80,96 160,100 240,72 320,64 400,40 520,18" fill="none" stroke="#93C5FD" stroke-width="5"/></svg>`, L(cx + 20, 90), L(330, 860), L(640, 900));
    const sub = subLine(s, 'Goals & net worth, in one place'); E.ft(sub, 42.2, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }); }

  /* ---------- montage 44.8–47.6 ---------- */
  { const s = E.scene(44.8, 47.6); s.style.background = '#03050A';
    const sets = [[SET_DESK, 900, 'Freelancer'], [SET_SHOP, 940, 'Small business'], [SET_WARE, 960, 'Online seller'], [SET_HOME, 980, 'Household']];
    sets.forEach(([set, fx, name], i) => {
      const pw = P ? W / 2 : W / 4, ph = P ? 760 : H, px = P ? (i % 2) * pw : i * pw, py = P ? 160 + Math.floor(i / 2) * 770 : 0;
      const panel = E.div('abs', s, null, { left: px + 'px', top: py + 'px', width: pw + 'px', height: ph + 'px', overflow: 'hidden', borderRight: '2px solid #03050A', borderBottom: '2px solid #03050A' });
      panel.innerHTML = `<svg width="${pw}" height="${ph}" viewBox="${fx - 300} 100 600 ${600 * ph / pw}" preserveAspectRatio="xMidYMid slice">${set}</svg>`;
      const lab = E.div('abs', panel, name.toUpperCase(), { left: 0, right: 0, top: P ? '40px' : '170px', textAlign: 'center', font: `400 ${L(26, 28)}px Urbanist`, letterSpacing: '.35em', color: '#F4F7FF', textShadow: '0 2px 20px rgba(0,0,0,.8)' });
      E.ft(panel, 44.8 + i * 0.12, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }); E.cue(44.8 + i * 0.12, 'swoosh', { gain: 0.2 });
    });
    const h = K.ctext(s, 'Built for every user.', cx, L(540, 960), {}, 'cine-h'); h.style.fontSize = L(92, 84) + 'px'; h.style.zIndex = 5;
    h.style.background = 'rgba(3,5,10,.55)'; h.style.padding = '16px 40px 22px'; h.style.borderRadius = '18px';
    E.ft(h, 45.5, { autoAlpha: 0, filter: 'blur(10px)' }, { autoAlpha: 1, filter: 'blur(0px)', duration: 0.9 }); E.cue(45.5, 'impact', { gain: 0.35 }); }

  /* ---------- finale 47.6–50.4 ---------- */
  { const s = E.scene(47.6, 50.4); s.style.background = 'radial-gradient(1000px 600px at 50% 50%, #0E1E44, #03050A)';
    flare(s, 47.6, L(540, 900));
    const ic = E.logoIcon(s, L(200, 230), { left: cx - L(100, 115) + 'px', top: L(250, 560) + 'px', filter: 'drop-shadow(0 0 40px rgba(60,130,255,.8))' });
    E.ft(ic, 47.9, { autoAlpha: 0, scale: 0.8, filter: 'blur(12px) drop-shadow(0 0 40px rgba(60,130,255,.8))' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px) drop-shadow(0 0 40px rgba(60,130,255,.8))', duration: 1.0, ease: 'power3.out' });
    const wm = E.wordmark(s, { width: L(760, 780), left: cx - L(380, 390), top: L(560, 880), color: '#fff' }); E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
    wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.3 + i * 0.05, { opacity: 0 }, { opacity: 1, duration: 0.6 }));
    const wf = E.div('fill', s, null, { background: '#F7F9FF' }); E.ft(wf, 49.7, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.in' }); E.cue(47.6, 'rise', { gain: 0.35 }); }

  /* ---------- cinema layers: letterbox, grain, vignette ---------- */
  const lbH = L(138, 96);
  const lb1 = E.div('abs', E.stage, null, { left: 0, right: 0, top: 0, height: lbH + 'px', background: '#000', zIndex: 860 });
  const lb2 = E.div('abs', E.stage, null, { left: 0, right: 0, bottom: 0, height: lbH + 'px', background: '#000', zIndex: 860 });
  const nc = document.createElement('canvas'); nc.width = nc.height = 256; const ng = nc.getContext('2d'); const id = ng.createImageData(256, 256);
  for (let i = 0; i < 65536; i++) { const v = Math.floor(rnd(i + 3) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 30; }
  ng.putImageData(id, 0, 0);
  const grain = E.div('fill', E.stage, null, { backgroundImage: `url(${nc.toDataURL()})`, zIndex: 855, mixBlendMode: 'overlay', opacity: 0.9 });
  const vig = E.div('fill', E.stage, null, { background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.6) 100%)', zIndex: 854 });
  E.frame((t) => { const on = t < 50.4; [lb1, lb2, grain, vig].forEach((e) => (e.style.display = on ? '' : 'none')); const f = Math.floor(t * 24); grain.style.backgroundPosition = `${Math.floor(rnd(f) * 256)}px ${Math.floor(rnd(f + 5) * 256)}px`; });
  // captions sit inside the picture area (above the bottom letterbox)
  E.css(`.ar-16x9 #captions{bottom:${lbH + 24}px} .ar-9x16 #captions{bottom:470px}`);

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
