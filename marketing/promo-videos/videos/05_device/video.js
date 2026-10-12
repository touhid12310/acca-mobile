/* 05 · UI / Device mockup — "Snap a receipt"  (Urbanist callouts + Roboto app UI) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const INK = '#0F172A', BLUE = '#0204F5', INDIGO = '#6366F1', GREEN = '#10B981';
  E.stage.style.background = 'radial-gradient(1400px 1000px at 50% 30%, #FFFFFF 0%, #EEF1F8 55%, #E2E7F2 100%)';
  E.css(`.co{font:800 ${L(66, 70)}px Urbanist;color:${INK};letter-spacing:-.02em;line-height:1.05}
    .chip5{display:inline-flex;align-items:center;gap:14px;background:#fff;border-radius:22px;padding:16px 24px;box-shadow:0 14px 34px rgba(30,41,90,.12);font:700 ${L(34, 36)}px Urbanist;color:${INK};white-space:nowrap}
    .fld{display:flex;align-items:center;justify-content:space-between;padding:26px 34px;border-bottom:1px solid #EEF2F7;font:400 30px Roboto;color:#64748B}
    .fld b{font:600 31px Roboto;color:#0F172A}
    .touch{position:absolute;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:rgba(255,255,255,.55);border:4px solid rgba(99,102,241,.85);box-shadow:0 8px 24px rgba(15,23,42,.25);z-index:60}`);
  const cx = W / 2;
  const PS = L(0.47, 0.54);
  const phX = L(690, cx - 240), phY = L(78, 250);
  const sc = (t0, t1, bg) => { const s = E.scene(t0, t1); if (bg) s.style.background = bg; return s; };

  /* touch indicator inside a phone screen */
  function touch(screen, x, y, t, dur) {
    const d = E.div('touch', screen, null, { left: x + 'px', top: y + 'px' });
    E.ft(d, t - 0.35, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
    E.to(d, t, { scale: 0.8, duration: 0.08 }); E.to(d, t + 0.08, { scale: 1.3, autoAlpha: 0, duration: (dur || 0.4), ease: 'power2.out' });
    E.cue(t, 'tap', { gain: 0.7 });
    return d;
  }
  /* receipt with crumple shading */
  function crumpled(parent, r, w) {
    const el = UI.receipt(parent, r, w);
    el.style.backgroundImage = 'linear-gradient(115deg,rgba(0,0,0,.035) 0 12%,transparent 12% 30%,rgba(0,0,0,.04) 30% 33%,transparent 33% 58%,rgba(0,0,0,.035) 58% 61%,transparent 61%),linear-gradient(28deg,transparent 0 40%,rgba(0,0,0,.035) 40% 43%,transparent 43%)';
    return el;
  }
  const R = UI.RECEIPT_GROCERY;

  /* ---------- S1 hook ---------- */
  let s = sc(0, 2.8);
  const rc0 = crumpled(s, R, L(470, 520)); rc0.style.left = L(cx - 640, cx - 260) + 'px'; rc0.style.top = L(170, 560) + 'px';
  E.ft(rc0, 0.05, { y: -900, rotation: -40, scale: 1.3 }, { y: 0, rotation: -7, scale: 1, duration: 0.55, ease: 'power4.in' }); E.cue(0.55, 'thud', { gain: 0.7 }); E.cue(0.45, 'paper', { gain: 0.5 });
  E.ft(rc0, 0.6, { y: 0 }, { keyframes: [{ y: -14, duration: 0.08 }, { y: 0, duration: 0.25, ease: 'bounce.out' }] });
  const kb = E.div('abs', s, null, { left: L(cx + 60, 110) + 'px', top: L(330, 290) + 'px' });
  const dt = E.div('co', kb, P ? 'Don’t type this.' : 'Don’t type<br>this.', { fontSize: L(120, 104) + 'px', textAlign: P ? 'center' : 'left', width: P ? '860px' : 'auto' });
  K.slam(dt, 0.8, { from: 1.5, sfx: 'thud', gain: 0.5 });
  const nokey = E.div('', kb, `<span class="chip5">${E.icon('keyboard', 44, '#EF4444', 2.2)} No more manual entry</span>`, { marginTop: '30px', textAlign: P ? 'center' : 'left' });
  K.rise(nokey, 1.4, { dist: 30 });

  /* ---------- phone (persistent 2.8 – 33.6) ---------- */
  const ps = sc(2.8, 33.6);
  const ph = UI.phone(ps, phX, phY, PS);
  E.ft(ph, 2.8, { y: 900, rotation: 8 }, { y: 0, rotation: 0, duration: 0.8, ease: 'power4.out' }); E.cue(2.8, 'whoosh', { gain: 0.5 });
  const scr = ph.screen;
  // layer 1: home
  const homeL = E.div('abs', scr, null, { inset: 0 }); const home = UI.home(homeL);
  // layer 2: camera
  const camL = E.div('abs', scr, null, { inset: 0, background: '#0B0F19' }); E.set(camL, 0, { autoAlpha: 0 });
  UI.status(camL, true);
  E.div('abs', camL, `${E.icon('x', 46, '#fff', 2.4)}<span style="font:600 32px Roboto;color:#fff">Scan receipt</span>${E.icon('zap', 40, '#FDE68A', 2.2)}`, { left: '40px', right: '40px', top: '96px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  const vf = E.div('abs', camL, null, { left: '60px', right: '60px', top: '220px', height: '1200px', borderRadius: '30px', overflow: 'hidden', background: 'radial-gradient(800px 900px at 50% 40%, #8a7a66, #4a4036 70%, #2b241e)' });
  const camR = crumpled(vf, R, 520); camR.style.left = '110px'; camR.style.top = '140px'; gsap.set(camR, { rotation: -4 });
  const brk = E.div('abs', vf, ['tl', 'tr', 'bl', 'br'].map((k) => `<i style="position:absolute;width:70px;height:70px;border:9px solid #fff;${k[0] === 't' ? 'top:0' : 'bottom:0'};${k[1] === 'l' ? 'left:0' : 'right:0'};border-${k[0] === 't' ? 'bottom' : 'top'}:none;border-${k[1] === 'l' ? 'right' : 'left'}:none;border-radius:10px"></i>`).join(''), { left: '70px', top: '100px', width: '600px', height: '950px' });
  const scanLine = E.div('abs', vf, null, { left: '80px', right: '80px', height: '8px', top: '120px', background: 'linear-gradient(90deg,transparent,#22D3EE,transparent)', boxShadow: '0 0 30px 10px rgba(34,211,238,.45)' });
  E.set(scanLine, 0, { autoAlpha: 0 });
  const aiChip = E.div('abs', camL, `${E.icon('sparkles', 34, '#fff', 2.2)} AI is reading your receipt…`, { left: '50%', top: '1460px', display: 'flex', alignItems: 'center', gap: '12px', background: INDIGO, color: '#fff', font: '600 30px Roboto', padding: '18px 30px', borderRadius: '999px', whiteSpace: 'nowrap' });
  gsap.set(aiChip, { xPercent: -50 }); E.set(aiChip, 0, { autoAlpha: 0 });
  const shutter = E.div('abs', camL, `<div style="width:150px;height:150px;border-radius:50%;border:8px solid #fff;display:flex;align-items:center;justify-content:center"><div style="width:118px;height:118px;border-radius:50%;background:#fff"></div></div>`, { left: '50%', bottom: '120px', marginLeft: '-75px' });
  E.div('abs', camL, `${E.icon('image', 44, '#fff', 2)}`, { left: '120px', bottom: '170px' });
  E.div('abs', camL, `<span style="font:600 26px Roboto;color:#FDE68A">AUTO</span>`, { right: '110px', bottom: '176px' });
  // layer 3: review sheet
  const revL = E.div('abs', scr, null, { inset: 0, background: '#F3F4F8' }); E.set(revL, 0, { autoAlpha: 0 });
  UI.status(revL);
  E.div('abs', revL, `<div style="display:flex;align-items:center;gap:16px">${E.icon('arrow-left', 44, INK, 2.2)}<span style="font:700 40px Roboto;color:${INK}">Review receipt</span></div><span style="display:inline-flex;align-items:center;gap:8px;background:#EEF2FF;color:#4338CA;font:600 24px Roboto;padding:10px 18px;border-radius:999px">${E.icon('sparkles', 26, '#4338CA', 2.2)} Extracted by AI</span>`, { left: '40px', right: '40px', top: '96px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  const thumb = E.div('abs', revL, null, { left: '40px', top: '200px', width: '200px', height: '260px', borderRadius: '18px', overflow: 'hidden', background: '#fffdf8', boxShadow: '0 6px 16px rgba(15,23,42,.12)' });
  const thR = UI.receipt(thumb, R, 200); thR.style.left = '0'; thR.style.top = '0'; thR.style.boxShadow = 'none'; thR.style.padding = '14px';
  E.div('abs', revL, `<div style="font:400 26px Roboto;color:#64748B">Expense</div><div class="tot" style="font:700 74px Roboto;color:#EF4444;margin-top:6px">$0.00</div><div style="font:400 24px Roboto;color:#64748B;margin-top:6px">${E.icon('receipt', 24, '#64748B', 2)} 1 receipt attached</div>`, { left: '280px', top: '230px' });
  const card = E.div('abs', revL, null, { left: '40px', right: '40px', top: '500px', background: '#fff', borderRadius: '28px', boxShadow: '0 2px 10px rgba(15,23,42,.06)', overflow: 'hidden' });
  const FIELDS = [['Merchant', 'Green Leaf Market', 'store'], ['Date', 'Oct 9, 2026', 'calendar'], ['Total', '$18.82', 'banknote'], ['Line items', '5 items', 'list'], ['Category', 'Groceries', 'shopping-cart'], ['Account', 'Everyday Card', 'credit-card']];
  const fRows = FIELDS.map(([k, v, ic]) => { const r = E.div('fld', card, `<span style="display:flex;align-items:center;gap:16px">${E.icon(ic, 34, '#94A3B8', 2)} ${k}</span><span class="v" style="display:flex;align-items:center;gap:10px"><b>${v}</b>${k === 'Category' || k === 'Account' ? E.icon('chevron-down', 28, '#94A3B8', 2.4) : ''}</span>`); r.v = r.querySelector('.v'); return r; });
  const items = E.div('abs', revL, ['Avocados x2 · $2.98', 'Sourdough loaf · $4.50', 'Oat milk · $3.79', 'Eggs (12) · $3.99', 'Baby spinach · $2.49'].map((x) => `<span style="display:inline-block;background:#fff;border-radius:999px;padding:10px 18px;margin:0 10px 12px 0;font:500 24px Roboto;color:#334155;box-shadow:0 2px 6px rgba(15,23,42,.05)">${x}</span>`).join(''), { left: '40px', right: '40px', top: '1190px' });
  const saveBtn = E.div('abs', revL, `${E.icon('check', 38, '#fff', 3)} Save expense`, { left: '40px', right: '40px', bottom: '70px', height: '120px', borderRadius: '28px', background: 'linear-gradient(90deg,#6366F1,#4F46E5)', color: '#fff', font: '600 36px Roboto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', boxShadow: '0 12px 26px rgba(79,70,229,.35)' });
  const dropdown = E.div('abs', revL, ['Groceries|shopping-cart|1', 'Food & Dining|utensils|0', 'Household|house|0'].map((x) => { const [n, ic, on] = x.split('|'); return `<div style="display:flex;align-items:center;gap:16px;padding:22px 28px;${on === '1' ? 'background:#EEF2FF;color:#4338CA;font-weight:600' : 'color:#0F172A'}">${E.icon(ic, 32, on === '1' ? '#4338CA' : '#64748B', 2)} ${n}${on === '1' ? `<span style="margin-left:auto">${E.icon('check', 30, '#4338CA', 3)}</span>` : ''}</div>`; }).join(''), { right: '60px', top: '1010px', width: '480px', background: '#fff', borderRadius: '24px', boxShadow: '0 24px 60px rgba(15,23,42,.22)', font: '400 30px Roboto', overflow: 'hidden', zIndex: 20 });
  E.set(dropdown, 0, { autoAlpha: 0 });
  const toast = E.div('abs', revL, `${E.icon('circle-check', 46, '#fff', 2.4)} Saved to transactions`, { left: '50%', top: '760px', display: 'flex', alignItems: 'center', gap: '16px', background: '#047857', color: '#fff', font: '600 36px Roboto', padding: '26px 40px', borderRadius: '999px', boxShadow: '0 20px 40px rgba(16,185,129,.35)', whiteSpace: 'nowrap', zIndex: 30 });
  gsap.set(toast, { xPercent: -50 }); E.set(toast, 0, { autoAlpha: 0 });
  // layer 4: activity
  const actL = E.div('abs', scr, null, { inset: 0 }); E.set(actL, 0, { autoAlpha: 0 });
  const act = UI.activity(actL, [{ m: 'Corner Café', meta: 'Oct 9 · Food & Dining', a: '-$5.40', icon: 'coffee', color: '#F59E0B', bg: '#FEF3C7' }, { m: 'City Transit', meta: 'Oct 8 · Transport', a: '-$2.75', icon: 'bus', color: '#0EA5E9', bg: '#E0F2FE' }, { m: 'Salary Deposit', meta: 'Oct 1 · Salary', a: '+$4,200.00', kind: 'income' }, { m: 'Rent', meta: 'Oct 1 · Housing', a: '-$1,850.00' }]);
  const newRow = UI.actRow(act.list, { m: 'Green Leaf Market', meta: 'Oct 9 · Groceries', a: '-$18.82', icon: 'shopping-cart', color: '#10B981', bg: '#D1FAE5', receipt: true }, true);
  newRow.style.boxShadow = '0 0 0 4px rgba(16,185,129,.55), 0 8px 18px rgba(16,185,129,.18)';

  // ---- screen sequencing ----
  E.ft(home.btns[3].querySelector('.qa-ic'), 4.6, { scale: 1 }, { keyframes: [{ scale: 0.85, duration: 0.1 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }] });
  touch(scr, 40 + 3 * 195 + 95, 780 + 70, 4.6);
  E.to(homeL, 5.6, { autoAlpha: 0, duration: 0.2 }); E.ft(camL, 5.6, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.35 }); E.cue(5.6, 'swoosh', { gain: 0.4 });
  E.ft(camR, 5.6, { x: 60, y: 40, rotation: -14 }, { x: 0, y: 0, rotation: -4, duration: 1.4, ease: 'power2.out' });
  E.ft(brk, 6.3, { scale: 1.35, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }); E.cue(6.4, 'beep', { gain: 0.35 }); E.cue(6.9, 'beep', { gain: 0.35 });
  E.ft(brk.children, 7.0, { borderColor: '#ffffff' }, { borderColor: '#22C55E', duration: 0.2 });
  touch(scr, 430, 1860 - 195, 7.5);
  K.flash(camL, 7.55, '#fff', 0.45); E.cue(7.55, 'shutter', { gain: 0.9 });
  E.set(scanLine, 8.4, { autoAlpha: 1 }); E.frame((t) => { if (t >= 8.4 && t < 11.2) scanLine.style.top = (120 + ((Math.sin((t - 8.4) * 2.4 - Math.PI / 2) + 1) / 2) * 960).toFixed(1) + 'px'; });
  E.ft(aiChip, 8.5, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.cue(8.5, 'scan', { gain: 0.6 });
  E.to(camL, 11.2, { autoAlpha: 0, duration: 0.2 }); E.ft(revL, 11.2, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' }); E.cue(11.2, 'swoosh', { gain: 0.4 });
  // fields fill
  const fillT = [11.5, 12.6, 14.1, 15.2, 16.9, 18.0];
  fRows.forEach((r, i) => {
    E.ft(r.v, fillT[i], { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.35 });
    E.to(r, fillT[i], { backgroundColor: 'rgba(99,102,241,.16)', duration: 0.05 }); E.to(r, fillT[i] + 0.05, { backgroundColor: 'rgba(99,102,241,0)', duration: 1.3 });
    E.cue(fillT[i], 'pop_hi', { gain: 0.35 });
  });
  const totEl = revL.querySelector('.tot'); E.count(totEl, 0, 18.82, 14.1, 0.6, (v) => E.money(v));
  E.ft(items.children, 15.3, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, stagger: 0.08, duration: 0.3, ease: 'back.out(2)' });
  // review: open category dropdown, keep Groceries
  touch(scr, 640, 500 + 4 * 92 + 46, 19.9);
  E.ft(dropdown, 20.0, { autoAlpha: 0, y: -20, scaleY: 0.7, transformOrigin: '50% 0%' }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.3 });
  touch(scr, 600, 1010 + 45, 21.3);
  E.to(dropdown, 21.4, { autoAlpha: 0, duration: 0.2 });
  touch(scr, 430, 1860 - 130, 22.7);
  E.ft(saveBtn, 22.7, { scale: 1 }, { keyframes: [{ scale: 0.95, duration: 0.08 }, { scale: 1, duration: 0.25 }] });
  E.ft(toast, 22.85, { autoAlpha: 0, y: 30, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }); E.cue(22.85, 'success', { gain: 0.6 });
  // receipt docks onto record (25.2)
  E.to(toast, 25.0, { autoAlpha: 0, duration: 0.2 });
  E.to(thumb, 25.3, { x: 470, y: -40, scale: 0.35, rotation: 8, duration: 0.6, ease: 'power3.inOut' });
  E.cue(25.3, 'swoosh', { gain: 0.35 }); E.cue(25.9, 'click', { gain: 0.6 });
  E.to(revL, 28.0, { autoAlpha: 0, duration: 0.2 });
  E.ft(actL, 28.0, { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' });
  E.ft(newRow, 28.4, { autoAlpha: 0, y: -40, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(2)' }); E.cue(28.4, 'pop', { gain: 0.5 });
  // phone motion (subtle) + exit
  E.ft(ph, 3.6, { rotationY: 0 }, { rotationY: L(-6, 0), duration: 8, ease: 'sine.inOut' });
  E.ft(ph, 11.2, { scale: PS }, { scale: PS * 1.04, duration: 8.4, ease: 'none' });
  E.to(ph, 30.8, { x: L(-380, 0), y: L(0, -40), scale: PS * L(0.92, 0.9), duration: 0.6, ease: 'power3.inOut' });

  /* ---------- callouts (outside the phone) ---------- */
  const coX = L(phX + 888 * PS + 90, 0);
  function callout(t0, t1, html, y, opt) {
    const s2 = sc(t0, t1); s2.style.zIndex = 4;
    const c = P ? K.ctext(s2, html, cx, y, {}, 'co') : E.div('abs co', s2, html, { left: coX + 'px', top: y + 'px' });
    if (P) { c.style.fontSize = '62px'; c.style.background = 'rgba(255,255,255,.92)'; c.style.padding = '10px 28px 16px'; c.style.borderRadius = '24px'; }
    K.rise(c, t0 + 0.05, { dist: 40, d: 0.5 });
    return c;
  }
  callout(2.8, 5.6, 'Snap it.', L(400, 150));
  { const s2 = sc(2.8, 5.6); s2.style.zIndex = 4; if (!P) { const ch = E.div('abs', s2, `<span class="chip5">${E.icon('camera', 40, '#A855F7', 2.2)} Home → Scan Receipt</span>`, { left: coX + 'px', top: '520px' }); K.rise(ch, 3.3, { dist: 30 }); } }
  callout(5.6, 8.4, P ? 'Frame it. Tap.' : 'Frame it.<br>Tap.', L(360, 150));
  callout(8.4, 11.2, P ? 'AI reads every line.' : 'AI reads<br>every line.', L(360, 150));
  // field list callout (11.2 – 19.6)
  { const s2 = sc(11.2, 19.6); s2.style.zIndex = 4;
    const box = E.div('abs', s2, null, P ? { left: '60px', right: '60px', top: '96px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' } : { left: coX + 'px', top: '170px', display: 'flex', flexDirection: 'column', gap: '18px' });
    const COL = ['#6366F1', '#0EA5E9', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'];
    FIELDS.forEach(([k, v], i) => {
      const c = E.div('', box, P ? `<span class="chip5" style="font-size:30px;padding:12px 18px">${E.icon('check', 30, COL[i], 3)} ${k}</span>` : `<span class="chip5">${E.icon('circle-check', 40, COL[i], 2.4)} <span style="color:#64748B;font-weight:600">${k}</span>&nbsp;${v}</span>`);
      E.ft(c, fillT[i], { autoAlpha: 0, x: P ? 0 : 60, y: P ? 20 : 0 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'back.out(1.6)' });
    });
    if (!P) { const rcS = crumpled(s2, R, 330); rcS.style.left = '90px'; rcS.style.top = '200px'; gsap.set(rcS, { rotation: -6 }); E.ft(rcS, 11.2, { autoAlpha: 0, x: -200 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power3.out' });
      // colour highlights on the receipt lines
      const hl = (sel, col, t) => { const d = rcS.querySelector(sel); E.to(d, t, { backgroundColor: col + '55', boxShadow: `0 0 0 6px ${col}55`, duration: 0.3 }); };
      hl('.r-store', COL[0], fillT[0]); hl('.r-date', COL[1], fillT[1]); hl('.r-total', COL[2], fillT[2]); hl('.r-items', COL[3], fillT[3]);
    }
  }
  callout(19.6, 22.4, P ? 'You review.' : 'You review.<br><span style="color:#6366F1">You stay in control.</span>', L(380, 150));
  callout(22.4, 25.2, P ? 'Confirm. Saved.' : 'Confirm.<br><span style="color:#047857">Saved.</span>', L(380, 150));
  callout(25.2, 28.0, P ? 'Receipt kept with the record.' : 'Receipt kept<br>with the record.', L(380, 150));
  callout(28.0, 30.8, P ? 'There it is.' : 'There it is.', L(400, 150));
  // budget card (30.8 – 33.6)
  { const s2 = sc(30.8, 33.6); s2.style.zIndex = 4;
    const bc = E.div('abs', s2, `<div style="display:flex;align-items:center;gap:18px"><div style="width:84px;height:84px;border-radius:24px;background:#D1FAE5;display:flex;align-items:center;justify-content:center">${E.icon('shopping-cart', 46, '#059669', 2.2)}</div><div><div style="font:800 44px Urbanist;color:${INK}">Groceries budget</div><div style="font:600 30px Urbanist;color:#64748B">Monthly</div></div></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:34px"><span class="spent" style="font:800 72px Urbanist;color:${INK}">$412.60</span><span style="font:700 36px Urbanist;color:#64748B">of $600</span></div>
      <div style="margin-top:20px;height:28px;border-radius:14px;background:#E2E8F0;overflow:hidden"><div class="bar" style="height:100%;width:68.77%;background:linear-gradient(90deg,#34D399,#10B981);border-radius:14px"></div></div>
      <div class="plus" style="margin-top:22px;font:800 34px Urbanist;color:#059669">+ $18.82 from Green Leaf Market</div>`,
      { left: L(cx - 40, 90) + 'px', width: L(780, 900) + 'px', top: L(310, 1150) + 'px', background: '#fff', borderRadius: '36px', padding: '44px 48px', boxShadow: '0 30px 70px rgba(30,41,90,.16)' });
    E.ft(bc, 30.9, { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out' }); E.cue(30.9, 'whoosh', { gain: 0.35 });
    E.count(bc.querySelector('.spent'), 412.6, 431.42, 31.6, 0.8, (v) => E.money(v));
    E.ft(bc.querySelector('.bar'), 31.6, { width: '68.77%' }, { width: '71.9%', duration: 0.8, ease: 'power2.out' });
    E.ft(bc.querySelector('.plus'), 31.6, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.cue(31.6, 'coin', { gain: 0.4 });
    if (P) { E.set(ph, 30.8, {}); }
  }

  /* ---------- rapid snaps 33.6 – 42.0 ---------- */
  const SN = [
    { name: 'Corner Café', store: 'CORNER CAFÉ', addr: '12 Market St', date: '10/10/2026', time: '8:12 AM', items: [['Latte (L)', '5.40'], ['Croissant', '3.95']], tax: '0.75', total: '$10.10', foot: 'See you tomorrow!', cat: 'Food & Dining', icon: 'coffee', col: '#F59E0B' },
    { name: 'Fix-It Hardware', store: 'FIX-IT HARDWARE', addr: '77 Mill Road', date: '10/10/2026', time: '1:40 PM', items: [['Wood screws (100)', '8.99'], ['Paint roller', '12.49'], ['Masking tape x2', '7.98'], ['Sandpaper pack', '9.79']], tax: '3.12', total: '$42.37', foot: 'Build something good', cat: 'Home & Garden', icon: 'hammer', col: '#0EA5E9' },
    { name: 'Parkside Pharmacy', store: 'PARKSIDE PHARMACY', addr: '3 Park Ave', date: '10/11/2026', time: '6:05 PM', items: [['Vitamin D', '9.99'], ['Hand cream', '5.29']], tax: '1.17', total: '$16.45', foot: 'Feel better soon', cat: 'Health', icon: 'heart-pulse', col: '#EC4899' },
  ];
  const stackCards = [];
  SN.forEach((r, i) => {
    const t0 = 33.6 + i * 2.8; const s2 = sc(t0, i < 2 ? t0 + 2.8 : 44.8); s2.style.zIndex = 3 + i;
    if (i > 0) s2.style.background = 'transparent';
    const rc = crumpled(s2, r, L(400, 380)); rc.style.left = L(cx - 640 + i * 30, 120 + i * 20) + 'px'; rc.style.top = L(160, 250) + 'px';
    E.ft(rc, t0, { x: -800, rotation: -30 }, { x: 0, rotation: -5 + i * 4, duration: 0.5, ease: 'power3.out' }); E.cue(t0, 'paper', { gain: 0.45 });
    K.flash(s2, t0 + 0.75, '#fff', 0.35); E.cue(t0 + 0.75, 'shutter', { gain: 0.8 });
    E.to(rc, t0 + 1.0, { scale: 0.92, rotation: -8 + i * 4, duration: 0.4, ease: 'power2.out' }); E.to(rc, t0 + 2.55, { autoAlpha: 0, x: -200, duration: 0.25 });
    const card2 = E.div('abs', s2, `<div style="width:96px;height:96px;border-radius:28px;background:${r.col}22;display:flex;align-items:center;justify-content:center;flex:none">${E.icon(r.icon, 52, r.col, 2.2)}</div><div style="flex:1"><div style="font:800 40px Urbanist;color:${INK}">${r.name}</div><div style="font:600 28px Urbanist;color:#64748B;margin-top:6px">${r.cat} · receipt saved</div></div><div style="font:800 46px Urbanist;color:${INK}">${r.total}</div>`,
      { left: L(cx + 40, 90) + 'px', width: L(800, 900) + 'px', top: L(380 + i * 0, 1040) + 'px', display: 'flex', alignItems: 'center', gap: '26px', background: '#fff', borderRadius: '32px', padding: '30px 34px', boxShadow: '0 24px 50px rgba(30,41,90,.16)' });
    E.ft(card2, t0 + 1.2, { autoAlpha: 0, scale: 0.6, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }); E.cue(t0 + 1.2, 'success', { gain: 0.4 });
    const lab = E.div('abs co', s2, ['Café.', 'Hardware store.', 'Pharmacy.'][i], { left: L(cx + 40, 90) + 'px', top: L(220, 880) + 'px', fontSize: L(80, 76) + 'px' });
    K.rise(lab, t0 + 0.1, { dist: 30 });
    E.to([card2, lab], t0 + 2.6, { autoAlpha: 0, duration: 0.2 });
  });
  { const s2 = sc(33.6, 44.8); s2.style.zIndex = 2; s2.style.background = 'radial-gradient(1400px 1000px at 50% 30%, #FFFFFF 0%, #EEF1F8 55%, #E2E7F2 100%)'; }

  /* ---------- 42.0 stack: Fewer missing expenses ---------- */
  { const s2 = sc(42.0, 44.8); s2.style.zIndex = 8; s2.style.background = 'radial-gradient(1400px 1000px at 50% 30%, #FFFFFF 0%, #EEF1F8 55%, #E2E7F2 100%)';
    const rows = [['Green Leaf Market', 'Groceries', '$18.82', 'shopping-cart', '#10B981'], ['Corner Café', 'Food & Dining', '$10.10', 'coffee', '#F59E0B'], ['Fix-It Hardware', 'Home & Garden', '$42.37', 'hammer', '#0EA5E9'], ['Parkside Pharmacy', 'Health', '$16.45', 'heart-pulse', '#EC4899']];
    rows.forEach((r, i) => { const c = E.div('abs', s2, `<div style="width:80px;height:80px;border-radius:24px;background:${r[4]}22;display:flex;align-items:center;justify-content:center">${E.icon(r[3], 44, r[4], 2.2)}</div><div style="flex:1;font:800 36px Urbanist;color:${INK}">${r[0]}<div style="font:600 26px Urbanist;color:#64748B">${r[1]}</div></div>${E.icon('receipt', 32, '#6366F1', 2)}<div style="font:800 40px Urbanist;color:${INK};margin-left:16px">${r[2]}</div>`,
      { left: L(cx - 380, 90) + 'px', width: L(760, 900) + 'px', top: L(330, 620) + i * L(128, 150) + 'px', display: 'flex', alignItems: 'center', gap: '22px', background: '#fff', borderRadius: '28px', padding: '22px 30px', boxShadow: '0 14px 30px rgba(30,41,90,.12)' });
      E.ft(c, 42.05 + i * 0.12, { autoAlpha: 0, y: 80, rotation: (i % 2 ? 4 : -4) }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' }); E.cue(42.05 + i * 0.12, 'pop_hi', { gain: 0.25 }); });
    const h = K.ctext(s2, 'Fewer missing expenses.', cx, L(190, 430), {}, 'co'); h.style.fontSize = L(84, 74) + 'px'; K.rise(h, 42.1, { dist: 40 }); }

  /* ---------- 44.8 Snap. Check. Saved. ---------- */
  { const s2 = sc(44.8, 47.6, '#FFFFFF'); s2.style.zIndex = 9;
    const words = [['Snap.', 'camera', '#A855F7'], ['Check.', 'list-checks', '#6366F1'], ['Saved.', 'circle-check', '#10B981']];
    words.forEach(([w, ic, col], i) => { const x = P ? cx : 420 + i * 540, y = P ? 520 + i * 300 : 520;
      const el = K.ctext(s2, `<div style="width:${L(150, 150)}px;height:${L(150, 150)}px;border-radius:44px;background:${col};display:flex;align-items:center;justify-content:center;margin:0 auto 26px">${E.icon(ic, 82, '#fff', 2.2)}</div>${w}`, x, y, { font: `800 ${L(100, 96)}px Urbanist`, color: INK });
      if (P) { el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '34px'; el.firstChild.style.margin = '0'; }
      E.ft(el, 44.85 + i * 0.35, { autoAlpha: 0, y: 80, scale: 0.7 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(2)' }); E.cue(44.85 + i * 0.35, i === 2 ? 'success' : 'pop', { gain: 0.45 }); }); }

  /* ---------- 47.6 logo ---------- */
  { const s2 = sc(47.6, 50.4, '#FFFFFF'); s2.style.zIndex = 10;
    const ph2 = UI.phone(s2, cx - 888 * 0.3 / 2, L(140, 420), 0.3);
    const h2 = UI.home(ph2.screen);
    E.ft(ph2, 47.6, { y: 300, autoAlpha: 0, rotationY: 30 }, { y: 0, autoAlpha: 1, rotationY: 0, duration: 0.6, ease: 'power3.out' });
    E.to(ph2, 48.6, { y: -40, scale: 0.27, duration: 1.6, ease: 'sine.inOut' });
    const wm = E.wordmark(s2, { width: L(660, 760), left: cx - L(330, 380), top: L(780, 1060) });
    wm.glyphs.forEach((g, i) => E.ft(g.els, 48.2 + i * 0.05, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45 })); E.cue(48.2, 'whoosh', { gain: 0.4 }); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
