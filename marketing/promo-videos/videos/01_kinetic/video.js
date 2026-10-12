/* 01 · Kinetic Type — "Talk to your money"
   Fonts: Bricolage Grotesque (display) + Urbanist (support, captions, app UI). */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  E.css(`:root{--ui:"Urbanist"} .disp{font-family:"Bricolage Grotesque";font-weight:800;letter-spacing:-0.035em;line-height:.92}
    .sup{font-family:Urbanist;font-weight:700} .eyebrow{font:800 ${L(30, 34)}px Urbanist;letter-spacing:.22em;text-transform:uppercase}`);
  const BLUE = '#0204F5', INK = '#0B1220', WHITE = '#FFFFFF', VIOLET = '#8B5CF6', GREEN = '#10B981';
  const cx = W / 2, cy = L(500, 820);   // optical centre (keeps text clear of captions)

  function sc(t0, t1, bg) { const s = E.scene(t0, t1); s.style.background = bg; return s; }
  function bgIn(s, t0) { E.cue(t0, 'whoosh', { gain: 0.35 }); }

  /* ---------- S1 0–1.4  YOUR MONEY ---------- */
  let s = sc(0, 1.4, BLUE);
  const w1 = K.ctext(s, 'YOUR', cx, L(cy - 150, cy - 170), { color: WHITE, fontSize: L(290, 260) + 'px' }, 'disp');
  const w2 = K.ctext(s, 'MONEY', cx, L(cy + 120, cy + 90), { color: WHITE, fontSize: L(290, 260) + 'px' }, 'disp');
  K.slam([w1, w2], 0.05, { stagger: 0.32, from: 2.4 });
  K.drift(s, 0, 1.4, { from: { scale: 1 }, to: { scale: 1.05 } });

  /* ---------- S2 1.4–2.8  has answers. ---------- */
  s = sc(1.4, 2.8, WHITE); bgIn(s, 1.4);
  const h1 = K.ctext(s, 'has', cx, L(cy - 190, cy - 230), { color: INK, fontSize: L(120, 120) + 'px', fontFamily: 'Urbanist', fontWeight: 800 });
  const h2 = K.ctext(s, 'answers.', cx, L(cy + 40, cy + 20), { color: BLUE, fontSize: L(330, 230) + 'px' }, 'disp');
  K.rise(h1, 1.42, { dist: 50, d: 0.4 });
  E.ft(h2, 1.62, { autoAlpha: 0, scale: 0.35 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' }); E.cue(1.62, 'pop_lo', { gain: 0.6 });
  const ul = E.div('abs', s, null, { left: L(420, 120) + 'px', top: L(cy + 190, cy + 140) + 'px', width: L(1080, 840) + 'px', height: '22px', background: BLUE, borderRadius: '12px', transformOrigin: '0 50%' });
  E.ft(ul, 1.95, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.inOut' });
  K.drift(h2, 2.0, 2.8, { from: { scale: 1 }, to: { scale: 1.06 } });

  /* ---------- S3 2.8–5.6  Talk to your money. ---------- */
  s = sc(2.8, 5.6, WHITE);
  const ic = E.logoIcon(s, L(150, 170), { left: cx - L(75, 85) + 'px', top: L(cy - 360, cy - 430) + 'px' });
  E.ft(ic, 2.85, { autoAlpha: 0, scale: 0.2, rotation: -40 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)' }); E.cue(2.85, 'pop', { gain: 0.6 });
  const t1 = K.ctext(s, '', cx, L(cy - 30, cy - 120), { color: INK, fontSize: L(200, 170) + 'px' }, 'disp');
  const t2 = K.ctext(s, '', cx, L(cy + 170, cy + 80), { fontSize: L(200, 170) + 'px' }, 'disp');
  const c1 = K.chars(t1, P ? 'Talk to' : 'Talk to your');
  t2.innerHTML = `<span class="hl" style="display:inline-block;background:${BLUE};color:#fff;padding:0 .18em .06em;border-radius:.12em">${P ? 'your money.' : 'money.'}</span>`;
  const hl = t2.querySelector('.hl');
  E.ft(c1, 2.95, { autoAlpha: 0, yPercent: 80, rotation: 8 }, { autoAlpha: 1, yPercent: 0, rotation: 0, duration: 0.5, stagger: 0.03, ease: 'power4.out' });
  E.ft(hl, 3.45, { autoAlpha: 0, scaleX: 0.2, transformOrigin: '0% 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: 'expo.out' }); E.cue(3.45, 'whoosh', { gain: 0.4 });
  K.drift(s, 3.4, 5.6, { from: { scale: 1 }, to: { scale: 1.05 } });

  /* ---------- S4 5.6–8.4  Let AI do the books. ---------- */
  s = sc(5.6, 8.4, BLUE); bgIn(s, 5.6);
  const l1 = K.ctext(s, '', cx, L(cy - 70, cy - 140), { color: WHITE, fontSize: L(190, 175) + 'px' }, 'disp');
  l1.innerHTML = `Let <span class="ai" style="display:inline-block;background:linear-gradient(135deg,#a78bfa,${VIOLET});color:#fff;padding:0 .16em .05em;border-radius:.16em;box-shadow:0 18px 40px rgba(0,0,0,.25)">AI</span>${P ? '' : ' do'}`;
  const l2 = K.ctext(s, P ? 'do the books.' : 'the books.', cx, L(cy + 130, cy + 60), { color: WHITE, fontSize: L(190, 150) + 'px' }, 'disp');
  K.rise(l1, 5.65, { dist: 120, d: 0.55 }); K.rise(l2, 5.95, { dist: 120, d: 0.55 });
  const ai = l1.querySelector('.ai');
  E.ft(ai, 6.0, { rotation: -14, scale: 0.5 }, { rotation: -4, scale: 1, duration: 0.6, ease: 'back.out(2.2)' }); E.cue(6.0, 'pop_hi', { gain: 0.5 });
  const book = K.ctext(s, E.icon('book-open', L(110, 120), 'rgba(255,255,255,.22)', 1.6), L(1680, 900), L(220, 380), {});
  E.ft(book, 6.2, { autoAlpha: 0, rotation: -20 }, { autoAlpha: 1, rotation: 0, duration: 0.8 });
  K.drift(s, 5.6, 8.4, { from: { scale: 1.04 }, to: { scale: 1 } });

  /* ---------- question helper ---------- */
  function question(t0, t1, bg, fg, text, size, lines, eyebrowColor) {
    const q = sc(t0, t1, bg); bgIn(q, t0);
    const eb = K.ctext(q, 'You ask', cx, L(cy - 290, cy - 340), { color: eyebrowColor || fg, opacity: 0.7 }, 'eyebrow');
    K.rise(eb, t0 + 0.02, { dist: 20, d: 0.35 });
    const box = E.div('abs disp', q, '', { left: L(140, 70) + 'px', right: L(140, 70) + 'px', top: L(cy - 210, cy - 250) + 'px', color: fg, fontSize: size + 'px', textAlign: 'center' });
    E.type(box, text, t0 + 0.2, Math.min(1.6, text.length * 0.035), { caret: true, caretUntil: t1 });
    K.drift(box, t0, t1, { from: { scale: 1 }, to: { scale: 1.04 } });
    return q;
  }

  /* ---------- S5 8.4–11.2 Q1 ---------- */
  question(8.4, 11.2, WHITE, INK, 'How much did I spend on groceries this month?', L(118, 112));

  /* ---------- S6 11.2–14.0 A1 ---------- */
  s = sc(11.2, 14.0, INK); bgIn(s, 11.2);
  K.rise(K.ctext(s, 'AccountE answers', cx, L(cy - 260, cy - 380), { color: '#93c5fd' }, 'eyebrow'), 11.22, { dist: 20, d: 0.35 });
  const a1 = K.ctext(s, '$0.00', cx, L(cy - 10, cy - 120), { color: WHITE, fontSize: L(300, 230) + 'px' }, 'disp');
  E.count(a1, 0, 412.6, 11.3, 1.0, (v) => E.money(v), 'expo.out'); E.cue(12.25, 'ding', { gain: 0.5 });
  E.ft(a1, 11.3, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.5)' });
  const sub1 = K.ctext(s, `on groceries <span style="color:${GREEN}">·</span> across 9 transactions`, cx, L(cy + 180, cy + 90), { color: '#cbd5e1', fontSize: L(52, 46) + 'px', whiteSpace: P ? 'normal' : 'nowrap', width: P ? '900px' : 'auto' }, 'sup');
  K.rise(sub1, 11.9, { dist: 30, d: 0.5 });
  K.drift(a1, 12.3, 14.0, { from: { scale: 1 }, to: { scale: 1.05 } });

  /* ---------- S7 14.0–16.8 Q2 ---------- */
  question(14.0, 16.8, BLUE, WHITE, 'Was I over budget last month?', L(150, 130));

  /* ---------- S8 16.8–19.6 A2 ---------- */
  s = sc(16.8, 19.6, WHITE); bgIn(s, 16.8);
  const chk = K.ctext(s, `<div style="width:${L(150, 170)}px;height:${L(150, 170)}px;border-radius:50%;background:${GREEN};display:flex;align-items:center;justify-content:center">${E.icon('check', L(90, 100), '#fff', 3.5)}</div>`, L(cx - 520, cx), L(cy - 40, cy - 420), {});
  E.ft(chk, 16.85, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.4)' }); E.cue(16.9, 'success', { gain: 0.6 });
  const nope = K.ctext(s, 'Nope.', L(cx + 120, cx), L(cy - 110, cy - 160), { color: INK, fontSize: L(240, 230) + 'px' }, 'disp');
  K.slam(nope, 17.0, { from: 1.6, sfx: 'thud' });
  const spare = K.ctext(s, `<span style="color:#047857">$38</span> to spare.`, L(cx + 120, cx), L(cy + 90, cy + 50), { color: INK, fontSize: L(120, 110) + 'px' }, 'disp');
  K.rise(spare, 17.35, { dist: 50, d: 0.5 });
  const bud = E.div('abs', s, `<div style="display:flex;justify-content:space-between;font:700 ${L(34, 36)}px Urbanist;color:#475569"><span>Dining budget</span><span>$212 of $250</span></div><div style="margin-top:14px;height:22px;border-radius:12px;background:#e2e8f0;overflow:hidden"><div class="bar" style="height:100%;width:84.8%;background:${GREEN};border-radius:12px;transform-origin:0 50%"></div></div>`, { left: L(cx - 300, 160) + 'px', width: L(840, 760) + 'px', top: L(cy + 220, cy + 210) + 'px' });
  K.rise(bud, 17.6, { dist: 30 }); E.ft(bud.querySelector('.bar'), 17.7, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.out' });

  /* ---------- S9 19.6–22.4 Q3 ---------- */
  s = sc(19.6, 22.4, INK); bgIn(s, 19.6);
  K.rise(K.ctext(s, 'You ask', cx, L(cy - 290, cy - 420), { color: '#93c5fd' }, 'eyebrow'), 19.62, { dist: 20, d: 0.35 });
  const q3 = E.div('abs disp', s, '', { left: L(160, 70) + 'px', right: L(160, 70) + 'px', top: L(cy - 190, cy - 310) + 'px', color: WHITE, fontSize: L(170, 150) + 'px', textAlign: 'center' });
  const q3w = K.words(q3, "What's my current balance?");
  K.slam(q3w, 19.7, { stagger: 0.16, from: 1.7, gain: 0.35 });

  /* ---------- S10 22.4–25.2 A3 ---------- */
  s = sc(22.4, 25.2, WHITE); bgIn(s, 22.4);
  K.rise(K.ctext(s, 'AccountE answers', cx, L(cy - 300, cy - 420), { color: BLUE }, 'eyebrow'), 22.42, { dist: 20, d: 0.35 });
  const a3 = K.ctext(s, '$0.00', cx, L(cy - 70, cy - 200), { color: INK, fontSize: L(270, 210) + 'px' }, 'disp');
  E.count(a3, 0, 8240.15, 22.5, 1.0, (v) => E.money(v), 'expo.out'); E.cue(23.45, 'ding', { gain: 0.45 });
  E.ft(a3, 22.5, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.45 });
  const accs = [['Main Checking', '$5,120.40', 'landmark'], ['Savings', '$2,450.00', 'piggy-bank'], ['Cash Wallet', '$318.25', 'wallet'], ['Everyday Card', '$351.50', 'credit-card']];
  const accWrap = E.div('abs', s, null, { left: L(160, 90) + 'px', right: L(160, 90) + 'px', top: L(cy + 120, cy + 0) + 'px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: L(22, 20) + 'px' });
  const chipsA = accs.map(([n, v, icn]) => E.div('', accWrap, `${E.icon(icn, 34, BLUE, 2)}<span>${n}</span>`, { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 26px', borderRadius: '999px', background: '#eef2ff', font: `700 ${L(32, 34)}px Urbanist`, color: INK }));
  K.rise(chipsA, 23.1, { stagger: 0.09, dist: 30, d: 0.45 }); chipsA.forEach((c, i) => E.cue(23.1 + i * 0.09, 'pop_hi', { gain: 0.2 }));
  K.ctext(s, 'across 4 accounts', cx, L(cy + 290, cy + 300), { color: '#64748b', fontSize: L(40, 42) + 'px' }, 'sup');

  /* ---------- S11 25.2–28.0 Q4 ---------- */
  question(25.2, 28.0, BLUE, WHITE, 'Show me my biggest expenses this week.', L(140, 122));

  /* ---------- S12 28.0–30.8 A4 list ---------- */
  s = sc(28.0, 30.8, WHITE); bgIn(s, 28.0);
  const rows = [['Rent', 1850, '#0204F5'], ['Groceries', 96.4, '#8B5CF6'], ['Fuel', 54.1, '#0EA5E9']];
  rows.forEach(([n, v, c], i) => {
    const y = L(cy - 230, cy - 360) + i * L(190, 230);
    const r = E.div('abs', s, null, { left: L(220, 80) + 'px', right: L(220, 80) + 'px', top: y + 'px', height: L(150, 180) + 'px' });
    const nm = E.div('abs disp', r, n, { left: 0, top: 0, fontSize: L(110, 96) + 'px', color: INK });
    const am = E.div('abs disp', r, E.money(v), { right: 0, top: 0, fontSize: L(110, 96) + 'px', color: c });
    if (P) { am.style.top = '0px'; }
    const bar = E.div('abs', r, null, { left: 0, bottom: '0px', height: '16px', width: Math.max(8, (v / 1850) * 100) + '%', background: c, borderRadius: '10px', transformOrigin: '0 50%' });
    K.slam([nm, am], 28.1 + i * 0.32, { stagger: 0.05, from: 1.5, gain: 0.4 });
    E.ft(bar, 28.25 + i * 0.32, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.out' });
  });

  /* ---------- S13 30.8–33.6 No menus. No spreadsheets. ---------- */
  s = sc(30.8, 33.6, INK); bgIn(s, 30.8);
  const n1 = K.ctext(s, 'No menus.', cx, L(cy - 110, cy - 160), { color: WHITE, fontSize: L(200, 170) + 'px' }, 'disp');
  const n2 = K.ctext(s, P ? 'No spread-<br>sheets.' : 'No spreadsheets.', cx, L(cy + 110, cy + 120), { color: WHITE, fontSize: L(200, 150) + 'px', lineHeight: 0.95 }, 'disp');
  K.slam(n1, 30.85, { from: 1.6 }); K.slam(n2, 31.9, { from: 1.6 });
  K.strike(s, n1, 31.4, '#F43F5E', 18); K.strike(s, n2, 32.6, '#F43F5E', 18);

  /* ---------- S14 33.6–36.4 Just ask. ---------- */
  s = sc(33.6, 36.4, BLUE); bgIn(s, 33.6);
  const ja = K.ctext(s, 'Just ask.', cx, L(cy, cy - 60), { color: WHITE, fontSize: L(330, 250) + 'px' }, 'disp');
  E.ft(ja, 33.65, { autoAlpha: 0, scale: 3.2, filter: 'blur(20px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' }); E.cue(33.65, 'impact', { gain: 0.5 });
  E.ft(ja, 34.2, { scale: 1 }, { scale: 1.12, duration: 2.2, ease: 'none' });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, rr = L(560, 430);
    const sp = K.ctext(s, E.icon('sparkle', 40 + (i % 3) * 16, 'rgba(255,255,255,.75)', 2), cx + Math.cos(a) * rr * L(1.25, 1), L(cy, cy - 60) + Math.sin(a) * rr * L(0.62, 1.1), {});
    E.ft(sp, 33.8 + (i % 5) * 0.06, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' });
    E.to(sp, 35.6, { autoAlpha: 0, duration: 0.6 });
  }

  /* ---------- S15 36.4–42.0 Real Assistant UI ---------- */
  s = sc(36.4, 42.0, 'radial-gradient(1200px 900px at 50% 40%, #EEF2FF, #DCE3FF)'); bgIn(s, 36.4);
  const pscale = L(0.46, 0.54);
  const ph = UI.phone(s, L(cx - 204, cx - 240), L(60, 300), pscale);
  const chat = UI.chat(ph.screen, { date: 'Oct 12, 2026' });
  const u = chat.user('Which subscription costs me the most this year?');
  const typing = chat.typing();
  const reply = chat.bot(`Your top subscription this year is <b>Streaming Plus</b>: <b>$191.88</b> across 12 payments, about 31% of your subscription spend.${UI.miniTable('Top subscriptions (2026)', ['Merchant', 'Amount', 'Txns'], [['Streaming Plus', '191.88', '12'], ['Cloud Storage', '119.88', '12'], ['Fitness Club', '89.99', '1']])}`, 650);
  E.set(u, 36.4, { display: 'none' }); E.set(typing, 36.4, { display: 'none' }); E.set(reply, 36.4, { display: 'none' });
  E.ft(ph, 36.4, { y: 500, rotation: 6 }, { y: 0, rotation: 0, duration: 0.8, ease: 'power4.out' });
  const ph2 = chat.input.querySelector('.ph');
  const qtxt = 'Which subscription costs me the most…';
  E.frame((t) => {
    const typing = t >= 36.75 && t < 37.6;
    const s2 = typing ? qtxt.slice(0, Math.round(qtxt.length * Math.min(1, (t - 36.75) / 0.75))) : 'Message';
    if (ph2.__last !== s2) { ph2.textContent = s2; ph2.__last = s2; ph2.style.color = typing ? '#0f172a' : '#94a3b8'; }
  });
  for (let i = 0; i < 16; i++) E.cue(36.75 + i * 0.047, 'type', { gain: 0.3 });
  E.set(u, 37.6, { display: 'flex' }); E.ft(u, 37.6, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.cue(37.6, 'tap', { gain: 0.6 });
  E.set(typing, 37.95, { display: 'flex' }); E.ft(typing, 37.95, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
  E.set(typing, 39.0, { display: 'none' });
  E.set(reply, 39.0, { display: 'flex' }); E.ft(reply, 39.0, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.45 }); E.cue(39.0, 'notify', { gain: 0.5 });
  const dots = typing.querySelectorAll('.dots i');
  E.frame((t) => { dots.forEach((d, i) => { d.style.opacity = (0.35 + 0.65 * Math.max(0, Math.sin((t * 6) - i * 0.9))).toFixed(2); }); });
  // zoom toward the answer at the beat change (39.2)
  E.ft(ph, 39.2, { scale: pscale, x: 0, y: 0 }, { scale: pscale * L(1.22, 1.06), x: L(-50, -15), y: L(-220, -20), duration: 2.4, ease: 'power2.inOut' });
  const lab1 = K.ctext(s, P ? 'Plain English in.' : 'Plain English<br>in.', L(380, cx), L(380, 200), { color: INK, fontSize: L(96, 92) + 'px', lineHeight: 1 }, 'disp');
  const lab2 = K.ctext(s, P ? 'Straight answers out.' : 'Straight<br>answers out.', L(1540, cx), L(700, 1460), { color: BLUE, fontSize: L(96, 84) + 'px', lineHeight: 1 }, 'disp');
  K.rise(lab1, 36.7, { dist: 60 }); K.rise(lab2, 39.25, { dist: 60 });
  if (P) { E.to(lab1, 39.1, { autoAlpha: 0, duration: 0.3 }); E.set(lab2, 36.4, { top: '170px' }); }

  /* ---------- S16 42.0–44.8 Ask anything (orbit) ---------- */
  s = sc(42.0, 44.8, INK); bgIn(s, 42.0);
  const aa = K.ctext(s, 'Ask anything.', cx, L(cy, cy - 40), { color: WHITE, fontSize: L(200, 150) + 'px' }, 'disp');
  K.slam(aa, 42.05, { from: 1.8, sfx: 'thud' });
  const qs = ['Groceries this month?', 'Over budget?', 'Current balance?', 'Biggest expenses?', 'Top subscription?', 'Income vs expenses?', 'Utilities vs budget?', 'Net worth?'];
  const chipsQ = qs.map((q, i) => E.div('abs', s, q, { left: 0, top: 0, padding: '14px 26px', borderRadius: '999px', background: i % 2 ? '#1e293b' : BLUE, color: '#fff', font: `700 ${L(30, 32)}px Urbanist`, whiteSpace: 'nowrap', transform: 'translate(-50%,-50%)' }));
  E.frame((t) => {
    if (t < 42 || t > 44.8) return;
    chipsQ.forEach((c, i) => {
      const a = (i / qs.length) * Math.PI * 2 + (t - 42) * 0.35;
      const rx = L(720, 400), ry = L(330, 470);
      c.style.left = (cx + Math.cos(a) * rx).toFixed(1) + 'px'; c.style.top = (L(cy, cy - 40) + Math.sin(a) * ry).toFixed(1) + 'px';
    });
  });
  chipsQ.forEach((c, i) => { E.ft(c, 42.2 + i * 0.07, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }); E.cue(42.2 + i * 0.07, 'pop_hi', { gain: 0.15 }); });

  /* ---------- S17 44.8–47.6 Talk to your money. (stack) ---------- */
  s = sc(44.8, 47.6, WHITE); bgIn(s, 44.8);
  const stack = E.div('abs disp', s, null, { left: 0, right: 0, top: L(150, 380) + 'px', textAlign: 'center', fontSize: L(210, 200) + 'px', color: INK, lineHeight: 0.98 });
  const li = K.lines(stack, ['Talk', 'to your', `<span style="color:${BLUE}">money.</span>`]);
  K.maskUp(li, 44.85, { stagger: 0.14, d: 0.6 }); li.forEach((_, i) => E.cue(44.85 + i * 0.14, 'thud', { gain: 0.35 }));
  K.drift(stack, 44.8, 47.6, { from: { scale: 1 }, to: { scale: 1.06 } });

  /* ---------- S18 47.6–50.4 collapse into the logo ---------- */
  s = sc(47.6, 50.4, WHITE);
  const words2 = K.ctext(s, 'Talk to your money.', cx, L(cy, cy - 40), { color: INK, fontSize: L(150, 96) + 'px' }, 'disp');
  E.ft(words2, 47.6, { scale: 1, autoAlpha: 1 }, { scale: 0.05, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }); E.cue(47.6, 'whoosh_down', { gain: 0.4 });
  const big = E.logoIcon(s, L(260, 300), { left: cx - L(130, 150) + 'px', top: L(cy - 150, cy - 210) + 'px' });
  E.ft(big, 48.2, { autoAlpha: 0, scale: 0.1, rotation: 90 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)' }); E.cue(48.2, 'pop', { gain: 0.6 });
  const wm = E.wordmark(s, { width: L(820, 800), left: cx - L(410, 400), top: L(cy + 170, cy + 190), color: '#000' });
  wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.6 + i * 0.04, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.45 }));
  E.set(wm.glyph('icon'), 47.6, { opacity: 0 });

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
