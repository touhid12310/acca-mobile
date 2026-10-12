/* 02 · 2D Flat — "Four ways in"  (Urbanist + Roboto) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const INK = '#0B1220', BLUE = '#0204F5';
  const C = { photo: '#EF4444', chat: '#10B981', voice: '#8B5CF6', email: '#F59E0B', csv: '#0EA5E9' };
  const BG = { base: '#EAF1FF', photo: '#FFE9E9', chat: '#E2F8EF', voice: '#EFEAFF', email: '#FFF3DC', csv: '#E3F4FD' };
  E.css(`.ttl{font:800 ${L(78, 82)}px Urbanist;color:${INK};letter-spacing:-.02em;text-align:center;line-height:1.05}
    .pill2{font:800 ${L(40, 44)}px Urbanist;color:#fff;border-radius:999px;padding:12px 34px 14px;display:inline-flex;align-items:center;gap:14px}
    .fcard{background:#fff;border-radius:34px;box-shadow:0 14px 0 rgba(11,18,32,.08);display:flex;align-items:center;gap:26px;padding:28px 34px;font-family:Urbanist}
    .tagc{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;font:700 26px Urbanist}`);
  const cx = W / 2, cy = L(560, 880);
  const sc = (t0, t1, bg) => { const s = E.scene(t0, t1); s.style.background = bg; return s; };

  /* ---------- flat drawings ---------- */
  function deco(s, color, seed) { // floating flat confetti shapes for depth
    K.rand(seed || 11);
    for (let i = 0; i < (P ? 13 : 9); i++) {
      const sz = 18 + K.rand() * 40, x = K.rand() * W, y = K.rand() * (P ? 1850 : 1000);
      const shape = i % 3 === 0 ? '50%' : i % 3 === 1 ? '8px' : '50% 0 50% 50%';
      const d = E.div('abs', s, null, { left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', borderRadius: shape, background: color, opacity: 0.18 });
      E.ft(d, s.t0, { rotation: 0, y: 0 }, { rotation: 90 + K.rand() * 180, y: -40 - K.rand() * 60, duration: s.t1 - s.t0, ease: 'none' });
    }
  }
  function receipt(parent, x, y, w, rot) {
    const h = w * 1.35;
    const r = E.div('abs', parent, `<svg viewBox="0 0 100 135" width="${w}" height="${h}"><path d="M4 0H96V125L88 132L80 125L72 132L64 125L56 132L48 125L40 132L32 125L24 132L16 125L8 132L4 128Z" fill="#fff"/>
      <rect x="22" y="12" width="56" height="8" rx="4" fill="${INK}"/><rect x="14" y="32" width="50" height="5" rx="2.5" fill="#CBD5E1"/><rect x="72" y="32" width="14" height="5" rx="2.5" fill="#CBD5E1"/>
      <rect x="14" y="46" width="44" height="5" rx="2.5" fill="#CBD5E1"/><rect x="72" y="46" width="14" height="5" rx="2.5" fill="#CBD5E1"/><rect x="14" y="60" width="54" height="5" rx="2.5" fill="#CBD5E1"/><rect x="72" y="60" width="14" height="5" rx="2.5" fill="#CBD5E1"/>
      <rect x="14" y="80" width="72" height="2" fill="#E2E8F0"/><rect x="14" y="92" width="30" height="8" rx="4" fill="${INK}"/><rect x="62" y="92" width="24" height="8" rx="4" fill="${C.photo}"/></svg>`,
      { left: x + 'px', top: y + 'px', filter: 'drop-shadow(0 10px 0 rgba(11,18,32,.10))' });
    gsap.set(r, { rotation: rot || 0, xPercent: -50, yPercent: -50 });
    return r;
  }
  function camera(parent, x, y, w) {
    const c = E.div('abs', parent, `<svg viewBox="0 0 120 90" width="${w}" height="${w * 0.75}"><rect x="36" y="4" width="36" height="16" rx="6" fill="#1E293B"/><rect x="2" y="14" width="116" height="74" rx="18" fill="${C.photo}"/>
      <rect x="2" y="40" width="116" height="10" fill="#DC2626"/><circle cx="60" cy="51" r="27" fill="#fff"/><circle cx="60" cy="51" r="20" fill="#1E293B"/><circle cx="60" cy="51" r="9" fill="#475569"/><circle cx="66" cy="45" r="4" fill="#fff" opacity=".8"/><circle cx="100" cy="28" r="5" fill="#FDE68A"/></svg>`,
      { left: x + 'px', top: y + 'px', filter: 'drop-shadow(0 12px 0 rgba(11,18,32,.10))' });
    gsap.set(c, { xPercent: -50, yPercent: -50 });
    return c;
  }
  function bubble(parent, x, y, w, color, text, fs) {
    const b = E.div('abs', parent, `<div class="tx" style="font:800 ${fs}px Urbanist;color:#fff;white-space:nowrap">${text}</div>`, { left: x + 'px', top: y + 'px', background: color, borderRadius: '44px 44px 44px 10px', padding: `${fs * 0.5}px ${fs * 0.8}px`, boxShadow: '0 12px 0 rgba(11,18,32,.10)', minWidth: w ? w + 'px' : 'auto' });
    gsap.set(b, { xPercent: -50, yPercent: -50 });
    return b;
  }
  function envelope(parent, x, y, w) {
    const e = E.div('abs', parent, `<svg viewBox="0 0 120 84" width="${w}" height="${w * 0.7}"><rect x="2" y="2" width="116" height="80" rx="12" fill="#fff"/><path d="M4 8 L60 48 L116 8" fill="none" stroke="${C.email}" stroke-width="8" stroke-linejoin="round"/><path d="M4 78 L44 40 M116 78 L76 40" stroke="#FCD34D" stroke-width="5"/></svg>`,
      { left: x + 'px', top: y + 'px', filter: 'drop-shadow(0 10px 0 rgba(11,18,32,.10))' });
    gsap.set(e, { xPercent: -50, yPercent: -50 });
    return e;
  }
  function micBadge(parent, x, y, w) {
    const m = E.div('abs', parent, `<div style="width:${w}px;height:${w}px;border-radius:50%;background:${C.voice};display:flex;align-items:center;justify-content:center;box-shadow:0 12px 0 rgba(11,18,32,.10)">${E.icon('mic', w * 0.5, '#fff', 2.4)}</div>`, { left: x + 'px', top: y + 'px' });
    gsap.set(m, { xPercent: -50, yPercent: -50 });
    return m;
  }
  function fileIcon(parent, x, y, w, label, color) {
    const f = E.div('abs', parent, `<svg viewBox="0 0 90 110" width="${w}" height="${w * 1.22}"><path d="M4 4H62L86 28V106H4Z" fill="#fff"/><path d="M62 4V28H86" fill="#E2E8F0"/>
      ${[40, 54, 68, 82].map((yy) => `<rect x="16" y="${yy}" width="58" height="6" rx="3" fill="#E2E8F0"/>`).join('')}<rect x="10" y="62" width="70" height="30" rx="8" fill="${color}"/><text x="45" y="83" font-family="Urbanist" font-weight="800" font-size="18" fill="#fff" text-anchor="middle">${label}</text></svg>`,
      { left: x + 'px', top: y + 'px', filter: 'drop-shadow(0 10px 0 rgba(11,18,32,.10))' });
    gsap.set(f, { xPercent: -50, yPercent: -50 });
    return f;
  }
  function card(parent, x, y, w, o) {
    const c = E.div('abs fcard', parent, `<div style="width:96px;height:96px;border-radius:28px;background:${o.color}22;display:flex;align-items:center;justify-content:center;flex:none">${E.icon(o.icon, 52, o.color, 2.4)}</div>
      <div style="flex:1;min-width:0"><div style="font:800 ${L(40, 42)}px Urbanist;color:${INK};white-space:nowrap">${o.m}</div><div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap" class="tags"><span class="tagc t-cat" style="background:${o.color}1f;color:${o.dark || o.color}">${o.cat}</span><span class="tagc t-date" style="background:#F1F5F9;color:#475569">${o.date}</span></div></div>
      <div class="amt" style="font:800 ${L(46, 48)}px Urbanist;color:${INK}">${o.a}</div>`, { left: x + 'px', top: y + 'px', width: w + 'px' });
    gsap.set(c, { xPercent: -50, yPercent: -50 });
    return c;
  }
  function stepPill(s, t, n, label, color) {
    const p = K.ctext(s, `<span class="pill2" style="background:${color}">${n}<span style="opacity:.55">·</span>${label}</span>`, cx, L(140, 330), {});
    E.pop(p, t + 0.05, 0.5, 0.5); E.cue(t + 0.05, 'pop', { gain: 0.5 });
    return p;
  }
  const flatPhone = (s, x, y, w) => {
    const ph = E.div('abs', s, `<div style="position:absolute;inset:${w * 0.045}px;border-radius:${w * 0.12}px;background:#fff;overflow:hidden" class="scr"></div><div style="position:absolute;top:${w * 0.07}px;left:50%;width:${w * 0.08}px;height:${w * 0.08}px;margin-left:-${w * 0.04}px;border-radius:50%;background:#1E293B"></div>`,
      { left: x + 'px', top: y + 'px', width: w + 'px', height: w * 2.05 + 'px', borderRadius: w * 0.16 + 'px', background: '#1E293B', boxShadow: '0 18px 0 rgba(11,18,32,.12)' });
    gsap.set(ph, { xPercent: -50, yPercent: -50 });
    ph.scr = ph.querySelector('.scr');
    return ph;
  };

  /* ---------- S1 0–2.8 Money shows up everywhere ---------- */
  let s = sc(0, 2.8, BG.base); deco(s, BLUE, 3);
  const ttl1 = K.ctext(s, P ? 'Money shows up<br>everywhere.' : 'Money shows up everywhere.', cx, L(150, 360), {}, 'ttl');
  K.rise(ttl1, 0.05, { dist: 60, d: 0.5 });
  const pile = [
    [receipt(s, cx - L(260, 170), cy + L(40, 30), L(260, 230), -14), -W * 0.6, -200],
    [bubble(s, cx + L(260, 180), cy - L(110, 150), 0, C.chat, 'Coffee 5.40', L(56, 48)), W * 0.6, -300],
    [envelope(s, cx + L(250, 160), cy + L(170, 190), L(280, 250)), W * 0.6, 400],
    [micBadge(s, cx - L(10, 0), cy - L(190, 250), L(170, 160)), -W * 0.5, -500],
  ];
  pile.forEach(([el, dx, dy], i) => {
    E.ft(el, 0.3 + i * 0.18, { x: dx, y: dy, rotation: -60 }, { x: 0, y: 0, rotation: [-14, 6, 8, -4][i], duration: 0.7, ease: 'back.out(1.4)' });
    E.cue(0.3 + i * 0.18, 'swoosh', { gain: 0.35 }); E.cue(0.95 + i * 0.18, 'pop_lo', { gain: 0.35 });
  });

  /* ---------- S2 2.8–5.6 AccountE catches it all ---------- */
  s = sc(2.8, 5.6, BG.base); deco(s, BLUE, 5);
  const ttl2 = K.ctext(s, '', cx, L(150, 360), {}, 'ttl');
  ttl2.innerHTML = `<span style="color:${BLUE}">AccountE</span> catches it all.`;
  K.rise(ttl2, 2.85, { dist: 60, d: 0.5 });
  const fph = flatPhone(s, cx, cy + L(60, 40), L(230, 300));
  E.ft(fph, 2.8, { y: 700 }, { y: 0, duration: 0.7, ease: 'back.out(1.2)' }); E.cue(2.8, 'whoosh', { gain: 0.4 });
  const plogo = E.logoIcon(fph.scr, L(110, 140), { left: '50%', top: '42%' }); gsap.set(plogo, { xPercent: -50, yPercent: -50 });
  E.pop(plogo, 3.3, 0.5);
  const pile2 = [receipt(s, cx - L(420, 300), cy - L(80, 360), L(150, 170), -14), bubble(s, cx + L(420, 300), cy - L(160, 380), 0, C.chat, 'Coffee 5.40', L(34, 38)), envelope(s, cx + L(430, 310), cy + L(160, 300), L(170, 190)), micBadge(s, cx - L(420, 300), cy + L(170, 300), L(110, 130))];
  pile2.forEach((el, i) => {
    const tt = 3.6 + i * 0.22;
    E.ft(el, 2.85, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
    const bx = parseFloat(el.style.left), by = parseFloat(el.style.top);
    E.to(el, tt, { x: cx - bx, y: cy + L(60, 40) - by, scale: 0.1, rotation: 180, autoAlpha: 0, duration: 0.55, ease: 'power3.in' });
    E.cue(tt + 0.45, 'pop_hi', { gain: 0.35 });
  });
  E.ft(fph, 3.6, { scaleX: 1, scaleY: 1 }, { keyframes: [{ scaleX: 1.08, scaleY: 0.94, duration: 0.12 }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' }], duration: 0.42 });

  /* ---------- helper: channel scenes ---------- */
  function channelCard(t0, t1, key, o) {
    const s2 = sc(t0, t1, BG[key]); deco(s2, C[key], 20 + t0);
    const cw = L(900, 900);
    const cd = card(s2, cx, cy, cw, o);
    E.ft(cd, t0, { scale: 0.4, autoAlpha: 0, rotation: -6 }, { scale: L(1.3, 1), autoAlpha: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.8)' }); E.cue(t0, 'pop', { gain: 0.6 });
    const tags = cd.querySelectorAll('.tagc');
    E.ft(tags, t0 + 0.35, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, stagger: 0.15, duration: 0.4, ease: 'back.out(3)' });
    E.ft(cd.querySelector('.amt'), t0 + 0.25, { scale: 1.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)' });
    const ok = K.ctext(s2, `<span style="display:inline-flex;align-items:center;gap:12px;font:800 ${L(38, 40)}px Urbanist;color:${o.dark || o.color}">${E.icon('circle-check', 44, o.dark || o.color, 2.6)} Recorded</span>`, cx, cy + L(190, 190), {});
    E.ft(ok, t0 + 0.9, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }); E.cue(t0 + 0.9, 'success', { gain: 0.4 });
    return s2;
  }

  /* ---------- S3/S4 Snap it ---------- */
  s = sc(5.6, 8.4, BG.photo); deco(s, C.photo, 7);
  stepPill(s, 5.6, '1', 'Snap it', C.photo);
  const cam = camera(s, L(cx - 260, cx), L(cy + 20, cy - 220), L(300, 300));
  const rc = receipt(s, L(cx + 260, cx), L(cy + 30, cy + 280), L(230, 240), 6);
  E.ft(cam, 5.65, { x: -500, rotation: -20 }, { x: 0, rotation: 0, duration: 0.6, ease: 'back.out(1.5)' });
  E.ft(rc, 5.8, { y: 600, rotation: 30 }, { y: 0, rotation: 6, duration: 0.6, ease: 'back.out(1.5)' }); E.cue(5.8, 'paper', { gain: 0.5 });
  const fr = E.div('abs', s, ['tl', 'tr', 'bl', 'br'].map((k) => `<i style="position:absolute;width:44px;height:44px;border:8px solid ${C.photo};${k[0] === 't' ? 'top:0' : 'bottom:0'};${k[1] === 'l' ? 'left:0' : 'right:0'};border-${k[0] === 't' ? 'bottom' : 'top'}:none;border-${k[1] === 'l' ? 'right' : 'left'}:none;border-radius:6px"></i>`).join(''), { left: L(cx + 260, cx) - L(150, 155) + 'px', top: L(cy + 30, cy + 280) - L(175, 185) + 'px', width: L(300, 310) + 'px', height: L(350, 370) + 'px' });
  E.ft(fr, 6.3, { scale: 1.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'power3.out' }); E.cue(6.3, 'beep', { gain: 0.3 });
  K.flash(s, 6.9, '#fff', 0.4); E.cue(6.9, 'shutter', { gain: 0.8 });
  E.ft(cam, 6.85, { scaleX: 1, scaleY: 1 }, { keyframes: [{ scaleX: 1.08, scaleY: 0.9, duration: 0.08 }, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1,0.35)' }] });
  channelCard(8.4, 11.2, 'photo', { icon: 'shopping-cart', color: '#10B981', dark: '#047857', m: 'Green Leaf Market', cat: 'Groceries', date: 'Oct 9', a: '$18.82' });

  /* ---------- S5/S6 Type it ---------- */
  s = sc(11.2, 14.0, BG.chat); deco(s, C.chat, 9);
  stepPill(s, 11.2, '2', 'Type it', '#059669');
  const kb = E.div('abs', s, null, { left: L(cx - 420, 90) + 'px', width: L(840, 900) + 'px', top: L(cy - 70, cy - 90) + 'px', height: L(150, 170) + 'px', borderRadius: '999px', background: '#fff', boxShadow: '0 12px 0 rgba(11,18,32,.08)', display: 'flex', alignItems: 'center', padding: '0 24px 0 50px', gap: '20px' });
  const kbt = E.div('', kb, '', { flex: 1, font: `800 ${L(66, 70)}px Urbanist`, color: INK });
  E.div('', kb, `<div style="width:${L(104, 116)}px;height:${L(104, 116)}px;border-radius:50%;background:#10B981;display:flex;align-items:center;justify-content:center">${E.icon('send', 50, '#fff', 2.6)}</div>`);
  E.ft(kb, 11.25, { scaleX: 0.2, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.4)' });
  E.type(kbt, 'Coffee 5.40', 11.7, 0.9, { caret: true, caretUntil: 13.0 });
  const send = kb.lastChild;
  E.ft(send, 12.9, { scale: 1 }, { keyframes: [{ scale: 0.82, duration: 0.08 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }] }); E.cue(12.9, 'tap', { gain: 0.7 });
  const flyB = bubble(s, cx, L(cy + 200, cy + 260), 0, C.chat, 'Coffee 5.40', L(56, 60));
  E.ft(flyB, 13.0, { autoAlpha: 0, y: -160, scale: 0.6 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }); E.cue(13.0, 'swoosh', { gain: 0.4 });
  s = channelCard(14.0, 16.8, 'chat', { icon: 'coffee', color: '#F59E0B', dark: '#B45309', m: 'Coffee', cat: 'Food & Dining', date: 'Today', a: '$5.40' });
  ['amount', 'category', 'date'].forEach((lab, i) => {
    const tg = K.ctext(s, `<span style="font:800 ${L(30, 32)}px Urbanist;color:#047857;background:#fff;border:3px solid #A7F3D0;border-radius:999px;padding:8px 20px">✓ ${lab}</span>`, cx + [L(330, 300), L(-200, -260), L(80, 40)][i], cy - L(170, 190) - (i === 1 ? 0 : 0), {});
    E.ft(tg, 14.5 + i * 0.25, { autoAlpha: 0, y: 30, scale: 0.6 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2.5)' }); E.cue(14.5 + i * 0.25, 'pop_hi', { gain: 0.3 });
  });

  /* ---------- S7/S8 Say it ---------- */
  s = sc(16.8, 19.6, BG.voice); deco(s, C.voice, 13);
  stepPill(s, 16.8, '3', 'Say it', C.voice);
  const mic = micBadge(s, cx, L(cy - 40, cy - 160), L(220, 240));
  E.pop(mic, 16.85, 0.55); E.cue(16.9, 'beep_lo', { gain: 0.3 });
  const ring = E.div('abs', s, null, { left: cx - L(150, 160) + 'px', top: L(cy - 40, cy - 160) - L(150, 160) + 'px', width: L(300, 320) + 'px', height: L(300, 320) + 'px', borderRadius: '50%', border: `6px solid ${C.voice}` });
  E.frame((t) => { if (t < 16.8 || t > 19.6) return; const p = ((t - 16.8) % 0.9) / 0.9; ring.style.transform = `scale(${1 + p * 0.7})`; ring.style.opacity = (1 - p) * 0.6; });
  const wave = E.div('abs', s, null, { left: cx - L(330, 330) + 'px', top: L(cy + 120, cy + 70) + 'px', width: L(660, 660) + 'px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
  const bars = Array.from({ length: 28 }, () => E.div('', wave, null, { width: '12px', borderRadius: '6px', background: C.voice, height: '20px' }));
  E.frame((t) => { if (t < 16.8 || t > 19.6) return; const on = t > 17.2 && t < 19.2; bars.forEach((b, i) => { const v = on ? 20 + 110 * Math.abs(Math.sin(t * 7 + i * 0.7) * Math.sin(t * 3.1 + i * 0.33)) : 16; b.style.height = v.toFixed(0) + 'px'; }); });
  const said = K.ctext(s, '', cx, L(cy + 270, cy + 280), { font: `800 ${L(60, 56)}px Urbanist`, color: INK }, '');
  const sw = K.words(said, '“Paid 60 for internet”');
  K.rise(sw, 17.3, { stagger: 0.28, dist: 30, d: 0.4 });
  channelCard(19.6, 22.4, 'voice', { icon: 'wifi', color: '#8B5CF6', dark: '#6D28D9', m: 'Internet', cat: 'Utilities', date: 'Today', a: '$60.00' });

  /* ---------- S9/S10 Forward it ---------- */
  s = sc(22.4, 25.2, BG.email); deco(s, C.email, 17);
  stepPill(s, 22.4, '4', 'Forward it', '#D97706');
  const inbox = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:16px;background:#fff;border-radius:28px;padding:22px 34px;box-shadow:0 12px 0 rgba(11,18,32,.08);font:800 ${L(42, 40)}px Urbanist;color:${INK}">${E.icon('mail', 46, '#D97706', 2.4)} yourname@accounte.app</span>`, L(cx + 330, cx), L(cy + 60, cy + 330), {});
  E.ft(inbox, 22.5, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
  const env = envelope(s, L(cx - 520, cx - 200), L(cy - 20, cy - 160), L(230, 230));
  const subj = K.ctext(s, `<span style="font:800 ${L(32, 32)}px Urbanist;color:#92400E;background:#FEF3C7;border-radius:999px;padding:8px 22px">Fwd: Invoice #2291</span>`, L(cx - 520, cx - 200), L(cy + 110, cy - 20), {});
  E.ft([env, subj], 22.6, { autoAlpha: 0, x: -300 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'back.out(1.5)' });
  const path = E.el('div', 'abs', s); path.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path id="fp" d="${P ? `M ${cx - 200} ${cy - 160} C ${cx + 200} ${cy - 260}, ${cx + 260} ${cy + 120}, ${cx} ${cy + 300}` : `M ${cx - 520} ${cy - 20} C ${cx - 200} ${cy - 260}, ${cx + 100} ${cy - 160}, ${cx + 200} ${cy + 40}`}" fill="none" stroke="#F59E0B" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round"/></svg>`;
  const pth = path.querySelector('path'); const plen = pth.getTotalLength ? 0 : 0;
  E.ft(path, 23.0, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
  E.frame((t) => {
    if (t < 23.3 || t > 25.2) return;
    const p = Math.min(1, (t - 23.3) / 0.9); const e2 = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const L2 = pth.getTotalLength(); const pt = pth.getPointAtLength(e2 * L2);
    const x0 = parseFloat(env.style.left), y0 = parseFloat(env.style.top);
    env.style.translate = `${(pt.x - x0).toFixed(1)}px ${(pt.y - y0).toFixed(1)}px`; env.style.scale = String(1 - 0.55 * e2);
  });
  E.cue(23.3, 'whoosh', { gain: 0.5 }); E.cue(24.2, 'ding', { gain: 0.45 });
  E.to(subj, 23.3, { autoAlpha: 0, duration: 0.3 });
  E.ft(inbox, 24.2, { scale: 1 }, { keyframes: [{ scale: 1.1, duration: 0.1 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }] });
  channelCard(25.2, 28.0, 'email', { icon: 'server', color: '#0EA5E9', dark: '#0369A1', m: 'Northwind Hosting', cat: 'Software', date: 'Oct 8', a: '$29.00' });

  /* ---------- S11/S12 Import it ---------- */
  s = sc(28.0, 30.8, BG.csv); deco(s, C.csv, 23);
  stepPill(s, 28.0, '+', 'Import it', '#0284C7');
  const f1 = fileIcon(s, cx - L(170, 170), L(cy + 20, cy - 20), L(230, 250), 'CSV', '#10B981');
  const f2 = fileIcon(s, cx + L(170, 170), L(cy + 20, cy - 20), L(230, 250), 'XLSX', '#0EA5E9');
  E.ft(f1, 28.1, { y: -700, rotation: -30 }, { y: 0, rotation: -6, duration: 0.7, ease: 'bounce.out' }); E.cue(28.55, 'thud', { gain: 0.5 });
  E.ft(f2, 28.35, { y: -700, rotation: 30 }, { y: 0, rotation: 6, duration: 0.7, ease: 'bounce.out' }); E.cue(28.8, 'thud', { gain: 0.5 });
  const ct = K.ctext(s, 'CSV or Excel. Hundreds of rows, all at once.', cx, L(cy + 270, cy + 300), { font: `800 ${L(46, 40)}px Urbanist`, color: '#075985', whiteSpace: P ? 'normal' : 'nowrap', width: P ? '880px' : 'auto' });
  K.rise(ct, 29.2, { dist: 30 });
  s = sc(30.8, 33.6, BG.csv);
  const rowsData = [['Green Leaf Market', 'Groceries', '#10B981', '-$64.20'], ['City Transit', 'Transport', '#0EA5E9', '-$2.75'], ['Client payment', 'Income', '#22C55E', '+$500.00'], ['Power & Light Co.', 'Utilities', '#8B5CF6', '-$92.40'], ['Corner Café', 'Food & Dining', '#F59E0B', '-$5.40'], ['Northwind Hosting', 'Software', '#0EA5E9', '-$29.00'], ['Bookshop on 5th', 'Education', '#EC4899', '-$18.99'], ['Fuel Stop', 'Transport', '#0EA5E9', '-$54.10']];
  const tbl = E.div('abs', s, null, { left: L(cx - 560, 70) + 'px', width: L(1120, 940) + 'px', top: L(110, 300) + 'px', background: '#fff', borderRadius: '30px', boxShadow: '0 14px 0 rgba(11,18,32,.08)', padding: '18px 0', overflow: 'hidden' });
  const showRows = P ? rowsData : rowsData.slice(0, 7);
  showRows.forEach(([m, cat, col, a], i) => {
    const r = E.div('', tbl, `<span style="flex:1;font:700 ${L(34, 34)}px Roboto;color:${INK}">${m}</span><span class="chip" style="font:700 ${L(26, 26)}px Urbanist;color:#fff;background:${col};border-radius:999px;padding:6px 18px;margin-right:24px">${cat}</span><span style="width:${L(170, 170)}px;text-align:right;font:700 ${L(34, 34)}px Roboto;color:${a[0] === '+' ? '#059669' : INK}">${a}</span>`, { display: 'flex', alignItems: 'center', padding: `${L(16, 18)}px 40px`, borderTop: i ? '2px solid #F1F5F9' : 'none' });
    E.ft(r, 30.85 + i * 0.12, { autoAlpha: 0, x: -80 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out' });
    E.ft(r.querySelector('.chip'), 31.2 + i * 0.12, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(3)' });
    E.cue(31.2 + i * 0.12, 'pop_hi', { gain: 0.18 });
  });
  const aiTag = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:10px;font:800 ${L(32, 34)}px Urbanist;color:#fff;background:${BLUE};border-radius:999px;padding:12px 26px">${E.icon('sparkles', 34, '#fff', 2.4)} AI predicts each category</span>`, cx, L(cy + 360, cy + 470), {});
  E.pop(aiTag, 32.2, 0.5);

  /* ---------- S13 Converge ---------- */
  s = sc(33.6, 36.4, BG.base); deco(s, BLUE, 29);
  const hub = { x: cx, y: L(cy, cy) };
  const chans = [['camera', C.photo], ['message-square', C.chat], ['mic', C.voice], ['mail', C.email], ['file-spreadsheet', C.csv]];
  const pos = P ? [[200, 420], [880, 420], [140, 1140], [940, 1140], [540, 300]] : [[260, 260], [260, 820], [1660, 260], [1660, 820], [960, 140]];
  const pipes = E.el('div', 'abs', s); pipes.style.left = 0; pipes.style.top = 0;
  pipes.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">${pos.map(([x, y], i) => `<path d="M${x} ${y} Q ${(x + hub.x) / 2} ${y}, ${hub.x} ${hub.y}" stroke="${chans[i][1]}" stroke-width="16" fill="none" stroke-linecap="round" class="pipe" opacity=".85"/>`).join('')}</svg>`;
  const pp = [...pipes.querySelectorAll('path')];
  pp.forEach((p, i) => { const len = 2000; p.style.strokeDasharray = len; E.ft(p, 33.7 + i * 0.08, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }); });
  pos.forEach(([x, y], i) => {
    const b = K.ctext(s, `<div style="width:${L(130, 140)}px;height:${L(130, 140)}px;border-radius:40px;background:${chans[i][1]};display:flex;align-items:center;justify-content:center;box-shadow:0 12px 0 rgba(11,18,32,.12)">${E.icon(chans[i][0], 64, '#fff', 2.4)}</div>`, x, y, {});
    E.pop(b, 33.65 + i * 0.08, 0.5); E.cue(33.65 + i * 0.08, 'pop', { gain: 0.25 });
  });
  const dots = pos.map((p, i) => E.div('abs', s, null, { width: '26px', height: '26px', marginLeft: '-13px', marginTop: '-13px', borderRadius: '50%', background: '#fff', border: `6px solid ${chans[i][1]}` }));
  E.frame((t) => { if (t < 34.3 || t > 36.4) return; dots.forEach((d, i) => { const p = ((t - 34.3) * 0.9 + i * 0.2) % 1; const len = pp[i].getTotalLength(); const pt = pp[i].getPointAtLength(p * len); d.style.left = pt.x + 'px'; d.style.top = pt.y + 'px'; }); });
  const hubEl = flatPhone(s, hub.x, hub.y, L(170, 200));
  const hl2 = E.logoIcon(hubEl.scr, L(90, 110), { left: '50%', top: '45%' }); gsap.set(hl2, { xPercent: -50, yPercent: -50 });
  E.pop(hubEl, 33.65, 0.5);
  E.frame((t) => { if (t < 34.3 || t > 36.4) return; hubEl.style.scale = String(1 + 0.03 * Math.sin(t * 9)); });

  /* ---------- S14 Activity list on the real UI ---------- */
  s = sc(36.4, 42.0, 'radial-gradient(1200px 900px at 50% 45%, #F5F8FF, #DCE6FF)'); deco(s, BLUE, 31);
  const ps = L(0.46, 0.56);
  const ph = UI.phone(s, L(cx - 204 + 300, cx - 249), L(54, 230), ps);
  const act = UI.activity(ph.screen, [{ m: 'Salary Deposit', meta: 'Oct 1 · Salary', a: '+$4,200.00', kind: 'income' }, { m: 'Rent', meta: 'Oct 1 · Housing', a: '-$1,850.00' }]);
  const newRows = [
    { m: 'Northwind Hosting', meta: 'Today · Software', a: '-$29.00', icon: 'server', color: '#0EA5E9', bg: '#E0F2FE' },
    { m: 'Internet', meta: 'Today · Utilities', a: '-$60.00', icon: 'wifi', color: '#8B5CF6', bg: '#EDE9FE' },
    { m: 'Coffee', meta: 'Today · Food & Dining', a: '-$5.40', icon: 'coffee', color: '#F59E0B', bg: '#FEF3C7' },
    { m: 'Green Leaf Market', meta: 'Oct 9 · Groceries', a: '-$18.82', icon: 'shopping-cart', color: '#10B981', bg: '#D1FAE5', receipt: true },
  ];
  newRows.forEach((r, i) => { const el = UI.actRow(act.list, r, true); E.ft(el, 36.9 + (3 - i) * 0.35, { autoAlpha: 0, height: 0, paddingTop: 0, paddingBottom: 0, scale: 0.9 }, { autoAlpha: 1, height: 'auto', paddingTop: 22, paddingBottom: 22, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }); E.cue(36.9 + (3 - i) * 0.35, 'pop_hi', { gain: 0.3 }); });
  E.ft(ph, 36.4, { y: 600 }, { y: 0, duration: 0.7, ease: 'power4.out' });
  if (!P) {
    const side = E.div('abs', s, null, { left: '180px', top: '300px', width: '620px' });
    const tl1 = E.div('', side, 'Four ways in.', { font: `800 92px Urbanist`, color: INK, letterSpacing: '-.02em' });
    const tl2 = E.div('', side, '', { font: `800 92px Urbanist`, color: BLUE, letterSpacing: '-.02em', marginTop: '6px' }); tl2.innerHTML = 'One clean<br>ledger.';
    K.rise(tl1, 36.6, { dist: 50 }); K.rise(tl2, 39.2, { dist: 50 }); E.cue(39.2, 'whoosh', { gain: 0.35 });
    const chipsRow = E.div('', side, chans.map(([ic, c]) => `<span style="width:76px;height:76px;border-radius:24px;background:${c};display:inline-flex;align-items:center;justify-content:center;margin-right:14px">${E.icon(ic, 40, '#fff', 2.4)}</span>`).join(''), { marginTop: '40px' });
    K.rise(chipsRow, 37.0, { dist: 30 });
  } else {
    const t1p = K.ctext(s, 'Four ways in.', cx, 150, { font: `800 76px Urbanist`, color: INK }); K.rise(t1p, 36.6, { dist: 40 });
    E.to(t1p, 39.0, { autoAlpha: 0, duration: 0.25 });
    const t2p = K.ctext(s, 'One clean ledger.', cx, 150, { font: `800 76px Urbanist`, color: BLUE }); K.rise(t2p, 39.2, { dist: 40 });
  }
  E.ft(ph, 39.2, { scale: ps }, { scale: ps * 1.05, duration: 2.8, ease: 'none' });

  /* ---------- S16 icons row ---------- */
  s = sc(42.0, 44.8, BG.base); deco(s, BLUE, 37);
  const labels = ['Snap', 'Type', 'Say', 'Forward', 'Import'];
  chans.forEach(([ic, c], i) => {
    const x = P ? (i < 3 ? 210 + i * 330 : 375 + (i - 3) * 330) : 360 + i * 300, y = P ? (i < 3 ? 640 : 1000) : 470;
    const b = K.ctext(s, `<div style="width:${L(190, 200)}px;height:${L(190, 200)}px;border-radius:56px;background:${c};display:flex;align-items:center;justify-content:center;box-shadow:0 16px 0 rgba(11,18,32,.12);margin:0 auto">${E.icon(ic, 96, '#fff', 2.2)}</div><div style="font:800 ${L(40, 42)}px Urbanist;color:${INK};margin-top:22px">${labels[i]}</div>`, x, y, {});
    E.ft(b, 42.05 + i * 0.1, { y: 300, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(2)' }); E.cue(42.05 + i * 0.1, 'pop', { gain: 0.3 });
    E.frame((t) => { if (t < 42.8 || t > 44.8) return; b.style.translate = `0 ${(-18 * Math.abs(Math.sin((t - 42.8) * 3.2 + i * 0.6))).toFixed(1)}px`; });
  });

  /* ---------- S17 headline ---------- */
  s = sc(44.8, 47.6, '#FFFFFF'); deco(s, BLUE, 41);
  const hd = E.div('abs', s, null, { left: 0, right: 0, top: L(330, 560) + 'px', textAlign: 'center' });
  const lns = K.lines(hd, P ? ['Capture it', 'however', 'you like.'] : ['Capture it however', 'you like.'], `font:800 ${L(120, 124)}px Urbanist;color:${INK};letter-spacing:-.03em;line-height:1.08`);
  K.maskUp(lns, 44.85, { stagger: 0.12, d: 0.6 }); E.cue(44.85, 'whoosh', { gain: 0.4 });
  lns[lns.length - 1].style.color = BLUE;

  /* ---------- S18 merge into logo ---------- */
  s = sc(47.6, 50.4, '#FFFFFF');
  chans.forEach(([ic, c], i) => {
    const a = (i / 5) * Math.PI * 2;
    const b = K.ctext(s, `<div style="width:120px;height:120px;border-radius:36px;background:${c};display:flex;align-items:center;justify-content:center">${E.icon(ic, 60, '#fff', 2.4)}</div>`, cx + Math.cos(a) * L(420, 360), L(cy - 40, cy) + Math.sin(a) * L(300, 360), {});
    E.ft(b, 47.6, { autoAlpha: 1, x: 0, y: 0, scale: 1 }, { x: -Math.cos(a) * L(420, 360), y: -Math.sin(a) * L(300, 360), scale: 0.2, autoAlpha: 0, duration: 0.8, ease: 'power3.in' });
  });
  E.cue(47.6, 'whoosh_down', { gain: 0.4 });
  const lg = E.logoIcon(s, L(240, 280), { left: cx - L(120, 140) + 'px', top: L(cy - 210, cy - 260) + 'px' });
  E.ft(lg, 48.35, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }); E.cue(48.35, 'pop', { gain: 0.6 });
  const wm = E.wordmark(s, { width: L(760, 780), left: cx - L(380, 390), top: L(cy + 100, cy + 110) });
  E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
  wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.7 + i * 0.04, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45 }));

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
