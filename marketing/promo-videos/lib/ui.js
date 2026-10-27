/* AccountE UI recreations (sample data only). Mobile screens are laid out at a 860×1860 design
   size inside a CSS phone; the phone is then scaled into each composition. */
(function () {
  const UI = (window.UI = {});
  const I = (n, s, c, w) => E.icon(n, s, c, w);
  UI.SW = 860; UI.SH = 1860;

  /* ---------- phone ---------- */
  UI.phone = function (parent, x, y, scale, opts) {
    opts = opts || {};
    const ph = E.div('phone', parent, null, { left: x + 'px', top: y + 'px', width: UI.SW + 28 + 'px', height: UI.SH + 28 + 'px' });
    gsap.set(ph, { scale, transformOrigin: '0 0' });
    E.div('btn', ph, null, { top: '330px', height: '120px' }); E.div('btn', ph, null, { top: '480px', height: '190px' });
    const screen = E.div('screen', ph);
    if (!opts.nopunch) E.div('punch', ph);
    ph.screen = screen; ph.scaleV = scale;
    return ph;
  };
  UI.status = function (screen, dark) {
    const c = dark ? '#fff' : '#0f172a';
    return E.div('m-status abs', screen, `<span>9:41</span><span style="display:flex;gap:10px;align-items:center">${I('signal', 28, c, 2.4)}${I('wifi', 28, c, 2.4)}${I('battery-full', 32, c, 2)}</span>`,
      { left: 0, right: 0, top: 0, height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 52px 0', font: '500 27px var(--ui)', color: c, zIndex: 40 });
  };
  UI.header = function (screen, top) {
    const h = E.div('abs', screen, null, { left: 0, right: 0, top: (top || 76) + 'px', height: '96px', display: 'flex', justifyContent: 'center', alignItems: 'center' });
    const wm = E.wordmark(h, { width: 330 }); wm.style.position = 'relative';
    return h;
  };
  UI.tabbar = function (screen, active) {
    const tabs = [['Home', 'layout-grid'], ['Activity', 'list-checks'], ['AI Chat', null], ['Reports', 'chart-column'], ['More', 'menu']];
    const bar = E.div('abs', screen, null, { left: 0, right: 0, bottom: 0, height: '150px', background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: '20px', zIndex: 30 });
    tabs.forEach(([name, ic]) => {
      const on = name === active;
      const col = on ? '#4f46e5' : '#64748b';
      if (!ic) {
        E.div('', bar, `<div style="width:108px;height:108px;margin-top:-50px;border-radius:50%;background:linear-gradient(145deg,#6366f1,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(99,102,241,.45)">${I('sparkles', 52, '#fff', 2)}</div><div style="font:500 22px var(--ui);color:${col};margin-top:6px;text-align:center">AI Chat</div>`, { width: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center' });
      } else {
        E.div('', bar, `${I(ic, 40, col, 2)}<div style="font:${on ? 600 : 500} 22px var(--ui);color:${col};margin-top:6px">${name}</div>`, { width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' });
      }
    });
    return bar;
  };

  /* ---------- Home ---------- */
  UI.home = function (screen, d) {
    d = Object.assign({ name: 'Alex', balance: '$12,480.50', income: '$4,900.00', expenses: '$3,151.69', delta: '8.4%' }, d || {});
    UI.status(screen); UI.header(screen);
    const g = E.div('abs', screen, `<div style="font:400 27px var(--ui);color:#64748b">Good evening</div><div style="font:700 46px var(--ui);color:#0f172a;margin-top:4px">${d.name} 👋</div>`, { left: '56px', top: '200px' });
    E.div('abs', screen, `<div style="width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#c7d2fe,#a5b4fc);display:flex;align-items:center;justify-content:center;font:700 38px var(--ui);color:#3730a3">${d.name[0]}</div>`, { right: '56px', top: '206px' });
    const card = E.div('abs', screen, null, { left: '40px', right: '40px', top: '340px', height: '400px', borderRadius: '40px', overflow: 'hidden', background: 'linear-gradient(120deg,#3b82f6 0%,#4f7cf7 45%,#6366f1 100%)', boxShadow: '0 18px 40px rgba(79,70,229,.35)' });
    E.div('abs', card, null, { width: '420px', height: '420px', borderRadius: '50%', right: '-120px', top: '-170px', background: 'rgba(255,255,255,.10)' });
    E.div('abs', card, null, { width: '300px', height: '300px', borderRadius: '50%', left: '-90px', bottom: '-160px', background: 'rgba(255,255,255,.08)' });
    E.div('abs', card, `<span style="display:flex;align-items:center;gap:12px">Total balance ${I('eye', 30, 'rgba(255,255,255,.85)', 2)}</span>`, { left: '48px', top: '48px', font: '500 30px var(--ui)', color: 'rgba(255,255,255,.92)' });
    E.div('abs', card, `This month ${I('chevron-down', 26, '#fff', 2.4)}`, { right: '40px', top: '38px', padding: '12px 22px', borderRadius: '999px', background: 'rgba(255,255,255,.18)', font: '600 25px var(--ui)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' });
    const bal = E.div('abs', card, d.balance, { left: '48px', top: '106px', font: '700 82px var(--ui)', color: '#fff', letterSpacing: '-1px' });
    E.div('abs', card, `<span style="color:#bbf7d0">↑ ${d.delta}</span> vs last month`, { left: '48px', top: '206px', font: '500 27px var(--ui)', color: 'rgba(255,255,255,.85)' });
    E.div('abs', card, null, { left: '48px', right: '48px', top: '262px', height: '1px', background: 'rgba(255,255,255,.25)' });
    E.div('abs', card, `<div style="font:500 25px var(--ui);color:rgba(255,255,255,.8)">Income</div><div style="font:700 36px var(--ui);color:#86efac;margin-top:4px">${d.income}</div>`, { left: '48px', top: '290px' });
    E.div('abs', card, `<div style="font:500 25px var(--ui);color:rgba(255,255,255,.8)">Expenses</div><div style="font:700 36px var(--ui);color:#fdba74;margin-top:4px">${d.expenses}</div>`, { left: '300px', top: '290px' });
    E.div('abs', card, `Accounts ${I('chevron-right', 26, '#fff', 2.4)}`, { right: '40px', top: '300px', padding: '14px 24px', borderRadius: '999px', background: 'rgba(255,255,255,.2)', font: '600 26px var(--ui)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' });
    const qa = E.div('abs m card', screen, null, { left: '40px', right: '40px', top: '780px', height: '250px', position: 'absolute', display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff' });
    const acts = [['Add Expense', 'circle-plus', '#ef4444', '#fee2e2'], ['Add Income', 'circle-dollar-sign', '#10b981', '#d1fae5'], ['Transfer', 'arrow-left-right', '#6366f1', '#e0e7ff'], ['Scan Receipt', 'camera', '#a855f7', '#f3e8ff']];
    const btns = acts.map(([n, ic, c, bg]) => E.div('', qa, `<div class="qa-ic" style="width:108px;height:108px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;margin:0 auto">${I(ic, 50, c, 2)}</div><div style="font:500 25px var(--ui);color:#0f172a;margin-top:14px;text-align:center">${n}</div>`, { width: '190px' }));
    const cf = E.div('abs', screen, null, { left: '40px', right: '40px', top: '1070px', height: '600px', background: '#fff', borderRadius: '30px', boxShadow: '0 2px 10px rgba(15,23,42,.06)' });
    E.div('abs', cf, 'Cashflow Trend', { left: '40px', top: '40px', font: '700 36px var(--ui)', color: '#0f172a' });
    E.div('abs', cf, '<span style="padding:10px 18px">Weekly</span><span style="padding:10px 18px;background:#6366f1;color:#fff;border-radius:999px">Monthly</span><span style="padding:10px 18px">Yearly</span>', { right: '30px', top: '34px', font: '500 23px var(--ui)', color: '#64748b', background: '#f1f5f9', borderRadius: '999px', padding: '6px', display: 'flex' });
    E.div('abs', cf, ['Income|#10b981', 'Expenses|#ef4444', 'Assets|#3b82f6'].map((s) => { const [n, c] = s.split('|'); return `<span style="display:inline-flex;align-items:center;gap:8px;margin-right:16px;padding:8px 16px;background:#f8fafc;border-radius:999px"><i style="width:14px;height:14px;border-radius:50%;background:${c}"></i>${n}</span>`; }).join(''), { left: '36px', top: '110px', font: '500 23px var(--ui)', color: '#0f172a' });
    const svg = `<svg viewBox="0 0 700 330" width="700" height="330"><defs><linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10b981" stop-opacity=".35"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></linearGradient><linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444" stop-opacity=".25"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></linearGradient></defs>
      ${[60, 140, 220, 300].map((y) => `<line x1="0" x2="700" y1="${y}" y2="${y}" stroke="#eef2f7" stroke-width="2"/>`).join('')}
      <path d="M0,170 C90,120 160,90 240,110 S400,60 470,80 S620,40 700,50 L700,330 L0,330Z" fill="url(#hg1)"/><path d="M0,170 C90,120 160,90 240,110 S400,60 470,80 S620,40 700,50" fill="none" stroke="#10b981" stroke-width="5"/>
      <path d="M0,240 C100,220 170,200 240,215 S390,190 470,200 S610,170 700,185 L700,330 L0,330Z" fill="url(#hg2)"/><path d="M0,240 C100,220 170,200 240,215 S390,190 470,200 S610,170 700,185" fill="none" stroke="#ef4444" stroke-width="5"/>
      <path d="M0,290 C120,280 220,270 330,275 S540,255 700,250" fill="none" stroke="#3b82f6" stroke-width="5"/></svg>`;
    E.div('abs', cf, svg, { left: '40px', top: '190px' });
    UI.tabbar(screen, 'Home');
    return { greet: g, card, bal, qa, btns, cf };
  };

  /* ---------- AI Chat (Assistant) ---------- */
  UI.chat = function (screen, opts) {
    opts = opts || {};
    UI.status(screen); UI.header(screen);
    E.div('abs', screen, `<div style="font:600 21px var(--ui);letter-spacing:.08em;color:#64748b">ASK ABOUT EXPENSES, REPORTS, OR SCAN RECEIPTS</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px"><div style="font:700 44px var(--ui);color:#0f172a">AccountE Assistant</div><i style="width:20px;height:20px;border-radius:50%;background:#22c55e;display:block"></i></div><div style="margin-top:20px;display:inline-flex;align-items:center;gap:14px;background:#eef0f5;border-radius:18px;padding:14px 22px;font:500 26px var(--ui);color:#0f172a">${I('calendar', 30, '#6366f1', 2)} Today - ${opts.date || 'Oct 12, 2026'}</div>`, { left: '56px', right: '56px', top: '190px' });
    const area = E.div('abs', screen, null, { left: '40px', right: '40px', top: '420px', bottom: '330px', overflow: 'hidden' });
    const list = E.div('abs', area, null, { left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: '30px' });
    const chips = E.div('abs', screen, `<span style="background:#fee2e2;color:#dc2626"><i style="background:#ef4444"></i>Expense</span><span style="background:#dcfce7;color:#15803d"><i style="background:#22c55e"></i>Income</span><span style="background:#e0e7ff;color:#4338ca">${I('chart-column', 24, '#4338ca', 2.4)}Report</span>`, { left: '40px', bottom: '260px', display: 'flex', gap: '16px', font: '600 25px var(--ui)' });
    E.css('.chips-x span{display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px}.chips-x i{width:16px;height:16px;border-radius:50%;display:block}');
    chips.classList.add('chips-x');
    const input = E.div('abs', screen, `<div style="flex:1;height:96px;border-radius:999px;background:#eef0f5;display:flex;align-items:center;padding:0 30px;gap:20px">${I('smile', 36, '#64748b', 2)}<span class="ph" style="flex:1;font:400 30px var(--ui);color:#94a3b8">Message</span>${I('paperclip', 34, '#64748b', 2)}${I('camera', 36, '#64748b', 2)}</div><div class="mic" style="width:96px;height:96px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;margin-left:16px">${I('mic', 42, '#fff', 2.2)}</div>`, { left: '40px', right: '40px', bottom: '160px', display: 'flex', alignItems: 'center' });
    UI.tabbar(screen, 'AI Chat');
    const api = { area, list, chips, input, items: [] };
    api.user = function (text) {
      const row = E.div('', list, `<div style="max-width:560px;background:linear-gradient(135deg,#6366f1,#7c5cf5);color:#fff;font:500 30px/1.35 var(--ui);padding:22px 30px;border-radius:30px 30px 8px 30px">${text}</div><div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#c7d2fe,#a5b4fc);display:flex;align-items:center;justify-content:center;font:700 28px var(--ui);color:#3730a3;flex:none">A</div>`, { display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '14px' });
      api.items.push(row); return row;
    };
    api.bot = function (html, w) {
      const row = E.div('', list, `<div style="width:64px;height:64px;flex:none;display:flex;align-items:center;justify-content:center">${I('sparkles', 44, '#6366f1', 2)}</div><div class="bb" style="max-width:${w || 640}px;background:#eceff4;color:#0f172a;font:400 29px/1.42 var(--ui);padding:24px 30px;border-radius:30px 30px 30px 8px">${html}</div>`, { display: 'flex', alignItems: 'flex-end', gap: '10px' });
      api.items.push(row); return row;
    };
    api.typing = function () {
      return api.bot('<span class="dots" style="display:inline-flex;gap:10px;padding:6px 0">' + [0, 1, 2].map(() => '<i style="width:14px;height:14px;border-radius:50%;background:#94a3b8;display:block"></i>').join('') + '</span>');
    };
    return api;
  };
  /* ---------- AI Chat, current UX (Oct 2026 screenshot): header, "Hi, I'm AccountE." empty state,
     four suggestion cards, "you confirm" note, input pill + mic button. Positions are the screenshot's ×0.946. ---------- */
  UI.assistant = function (screen) {
    const IND = '#6366F1', SL = '#64748b', INK = '#0f172a';
    screen.style.background = '#F5F6FA';
    const st = UI.status(screen); st.style.height = '95px'; st.style.background = '#F8F9FB';
    const hdr = E.div('abs', screen, null, { left: 0, right: 0, top: '95px', height: '125px', background: '#EEF0F4' });
    E.wordmark(hdr, { width: 310, left: 38, top: 39, color: '#0b1220' });
    E.div('abs', hdr, I('bell', 46, INK, 2), { right: '60px', top: '40px' });
    const av = (sz, r, ic) => `<div style="width:${sz}px;height:${sz}px;border-radius:${r}px;background:linear-gradient(135deg,#5B5FEF,#7062F6);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(99,102,241,.28)">${I('sparkles', ic, '#fff', 2)}</div>`;
    E.div('abs', screen, av(106, 26, 52) + `<i style="position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;background:#22c55e;border:4px solid #F5F6FA"></i>`, { left: '38px', top: '248px' });
    E.div('abs', screen, `<div style="display:flex;align-items:center;gap:16px"><span style="font:700 44px var(--ui);color:${INK}">AccountE</span><span style="font:700 25px var(--ui);color:#4F46E5;background:#E8EAFD;border-radius:999px;padding:5px 15px">AI</span></div><div style="font:400 29px var(--ui);color:${SL};margin-top:6px">Your AI bookkeeper, always on</div>`, { left: '172px', top: '258px' });
    E.div('abs', screen, `${I('calendar-days', 34, IND, 2)}<span>Today</span>`, { right: '41px', top: '263px', height: '76px', padding: '0 30px', display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', border: '2px solid #E8EAF0', borderRadius: '40px', font: `700 31px var(--ui)`, color: INK });
    // empty state
    const empty = E.div('abs', screen, null, { left: 0, right: 0, top: '380px', height: '1060px' });
    E.div('abs', empty, av(143, 34, 84), { left: '359px', top: '8px' });
    E.div('abs', empty, 'Hi, I’m AccountE.', { left: 0, right: 0, top: '186px', textAlign: 'center', font: `800 56px var(--ui)`, color: INK, letterSpacing: '-.01em' });
    E.div('abs', empty, 'Snap a receipt, say what you spent, or ask about<br>your money. I’ll keep your books tidy.', { left: 0, right: 0, top: '262px', textAlign: 'center', font: `400 32px/51px var(--ui)`, color: SL });
    const CARDS = [['scan-line', 'Scan a receipt', 40, 405, 216], ['mic', '“Lunch, $450, cash”', 443, 405, 216], ['chart-column', 'Where did my money<br>go this month?', 40, 653, 252], ['piggy-bank', 'How are my budgets<br>doing?', 443, 653, 252]];
    const cards = CARDS.map(([ic, txt, x, y, h]) => E.div('abs', empty, `<div style="width:76px;height:76px;border-radius:18px;background:#EEF0FF;display:flex;align-items:center;justify-content:center">${I(ic, 38, IND, 2)}</div><div style="position:absolute;left:28px;right:20px;${h > 230 ? 'top:122px' : 'top:132px'};font:600 31px/46px var(--ui);color:${INK}">${txt}</div>`, { left: x + 'px', top: y + 'px', width: '377px', height: h + 'px', padding: '28px', boxSizing: 'border-box', background: '#fff', borderRadius: '34px', boxShadow: '0 2px 10px rgba(15,23,42,.05)' }));
    E.div('abs', empty, `<span style="position:absolute;left:58px;top:2px">${I('lock', 30, SL, 2)}</span>AccountE suggests, you confirm. Nothing is saved<br>without you.`, { left: 0, right: 0, top: '944px', textAlign: 'center', font: `400 27px/40px var(--ui)`, color: SL, paddingLeft: '40px' });
    // conversation list (bottom-anchored above the input band)
    const list = E.div('abs', screen, null, { left: '32px', right: '32px', bottom: '410px', display: 'flex', flexDirection: 'column', gap: '26px' });
    // input band
    const band = E.div('abs', screen, null, { left: 0, right: 0, top: '1470px', height: '166px', background: '#F8F9FB', borderTop: '2px solid #E9EBF0' });
    const pill = E.div('abs', band, `<span class="ph" style="flex:1;font:400 34px var(--ui);color:${SL};white-space:nowrap;overflow:hidden">Ask AccountE anything…</span>${I('paperclip', 44, SL, 2)}<span style="width:40px"></span>${I('scan-line', 44, SL, 2)}`, { left: '21px', top: '20px', width: '676px', height: '121px', borderRadius: '61px', background: '#EEF0F5', display: 'flex', alignItems: 'center', padding: '0 38px', boxSizing: 'border-box' });
    const btn = E.div('abs', band, I('mic', 46, '#fff', 2.2), { left: '717px', top: '20px', width: '123px', height: '123px', borderRadius: '50px', background: IND, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(99,102,241,.35)' });
    const bar = UI.tabbar(screen, 'AI Chat'); bar.style.bottom = '72px'; bar.style.height = '152px';
    E.div('abs', screen, '<i style="display:block;width:150px;height:9px;border-radius:9px;background:#1f2937;opacity:.55;margin:32px auto 0"></i>', { left: 0, right: 0, bottom: 0, height: '72px', background: '#fff' });
    return { empty, cards, list, field: pill.querySelector('.ph'), pill, btn, av };
  };
  UI.txCard = function (merchant, meta, amount, kind) {
    const exp = kind !== 'income';
    return `<div style="margin-top:16px;background:#fff;border-radius:22px;padding:22px 24px;display:flex;align-items:center;gap:18px;box-shadow:0 2px 8px rgba(15,23,42,.06)"><div style="width:52px;height:52px;border-radius:50%;background:${exp ? '#ef4444' : '#10b981'};display:flex;align-items:center;justify-content:center;flex:none">${I(exp ? 'arrow-up' : 'arrow-down', 30, '#fff', 3)}</div><div style="flex:1"><div style="font:600 29px var(--ui)">${merchant}</div><div style="font:400 23px var(--ui);color:#64748b;margin-top:4px">${meta}</div></div><div style="font:600 30px var(--ui);color:${exp ? '#ef4444' : '#10b981'}">${amount}</div></div>`;
  };
  UI.miniTable = function (title, cols, rows) {
    return `<div style="margin-top:16px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden"><div style="font:600 24px var(--ui);padding:16px 20px;border-bottom:1px solid #eef2f7">${title}</div><table style="width:100%;border-collapse:collapse;font:400 23px var(--ui)"><tr>${cols.map((c) => `<th style="text-align:left;color:#64748b;font-weight:500;padding:12px 20px">${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:12px 20px;border-top:1px solid #f1f5f9">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
  };

  /* ---------- Activity ---------- */
  UI.activity = function (screen, rows) {
    UI.status(screen); UI.header(screen);
    E.div('abs', screen, `<div style="font:600 21px var(--ui);letter-spacing:.08em;color:#64748b">TRANSACTIONS</div><div style="display:flex;justify-content:space-between;align-items:center"><div style="font:700 44px var(--ui);color:#0f172a;margin-top:6px">Activity</div><div style="font:600 24px var(--ui);color:#0f172a;background:#fff;border-radius:999px;padding:10px 20px;display:flex;align-items:center;gap:8px">${I('calendar', 26, '#6366f1', 2)}This month</div></div>`, { left: '56px', right: '56px', top: '190px' });
    E.div('abs', screen, `<div style="flex:1;border-radius:24px;padding:22px 26px;background:linear-gradient(135deg,#22c3e6,#0ea5e9);color:#fff"><div style="font:500 23px var(--ui);opacity:.9">Total Income</div><div style="font:700 38px var(--ui);margin-top:4px">$4,900.00</div></div><div style="flex:1;border-radius:24px;padding:22px 26px;background:linear-gradient(135deg,#fb7185,#ef4444);color:#fff"><div style="font:500 23px var(--ui);opacity:.9">Total Expenses</div><div style="font:700 38px var(--ui);margin-top:4px">$3,151.69</div></div>`, { left: '40px', right: '40px', top: '330px', display: 'flex', gap: '20px' });
    E.div('abs', screen, `<span style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:999px;display:flex;align-items:center;gap:8px">${I('check', 24, '#fff', 3)}Ledger</span><span style="padding:12px 24px;display:flex;align-items:center;gap:8px"><i style="width:12px;height:12px;border-radius:50%;background:#f59e0b;display:block"></i>Pending</span><span style="padding:12px 24px">Archived</span>`, { left: '40px', top: '500px', display: 'flex', gap: '8px', font: '600 25px var(--ui)', color: '#475569' });
    const list = E.div('abs', screen, null, { left: '40px', right: '40px', top: '590px', bottom: '170px', display: 'flex', flexDirection: 'column', gap: '18px', overflow: 'hidden' });
    const els = (rows || []).map((r) => UI.actRow(list, r));
    UI.tabbar(screen, 'Activity');
    return { list, rows: els };
  };
  UI.actRow = function (list, r, prepend) {
    const inc = r.kind === 'income';
    const html = `<div style="width:76px;height:76px;border-radius:50%;background:${r.bg || (inc ? '#d1fae5' : '#fee2e2')};display:flex;align-items:center;justify-content:center;flex:none">${I(r.icon || (inc ? 'arrow-down-left' : 'arrow-up-right'), 38, r.color || (inc ? '#10b981' : '#ef4444'), 2.2)}</div><div style="flex:1;min-width:0"><div style="font:600 30px var(--ui);color:#0f172a;white-space:nowrap">${r.m}</div><div style="font:400 23px var(--ui);color:#64748b;margin-top:4px">${r.meta}</div></div>${r.receipt ? `<div style="margin-right:6px">${I('receipt', 30, '#6366f1', 2)}</div>` : ''}<div style="font:700 31px var(--ui);color:${inc ? '#10b981' : '#0f172a'}">${r.a}</div>`;
    const row = document.createElement('div');
    row.innerHTML = html;
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '22px', background: '#fff', borderRadius: '26px', padding: '22px 26px', boxShadow: '0 2px 8px rgba(15,23,42,.05)' });
    if (prepend) list.insertBefore(row, list.firstChild); else list.appendChild(row);
    return row;
  };

  /* ---------- generic receipt (HTML paper) ---------- */
  UI.receipt = function (parent, r, w) {
    w = w || 520;
    const lines = r.items.map(([n, p]) => `<div style="display:flex;justify-content:space-between"><span>${n}</span><span>${p}</span></div>`).join('');
    const el = E.div('abs receipt', parent, `<div class="r-store" style="text-align:center;font-weight:700;font-size:1.25em;letter-spacing:.06em;border-radius:6px">${r.store}</div><div style="text-align:center;opacity:.75;margin-top:4px">${r.addr || ''}</div><div class="r-date" style="display:flex;justify-content:space-between;margin-top:14px;border-radius:6px"><span>${r.date}</span><span>${r.time || ''}</span></div><div style="border-top:2px dashed #9ca3af;margin:12px 0"></div><div class="items r-items" style="display:flex;flex-direction:column;gap:6px;border-radius:6px">${lines}</div><div style="border-top:2px dashed #9ca3af;margin:12px 0"></div>${r.tax ? `<div style="display:flex;justify-content:space-between;opacity:.85"><span>Tax</span><span>${r.tax}</span></div>` : ''}<div class="r-total" style="display:flex;justify-content:space-between;font-weight:800;font-size:1.3em;margin-top:6px;border-radius:6px"><span>TOTAL</span><span>${r.total}</span></div><div style="text-align:center;margin-top:16px;opacity:.7">${r.foot || 'Thank you!'}</div>`,
      { width: w + 'px', padding: '30px 34px 40px', background: '#fffdf8', color: '#1f2937', font: `500 ${Math.round(w / 21)}px var(--receipt-font, var(--ui))`, boxShadow: '0 20px 40px rgba(15,23,42,.18)', clipPath: 'polygon(0 0,100% 0,100% 97%,96% 100%,92% 97%,88% 100%,84% 97%,80% 100%,76% 97%,72% 100%,68% 97%,64% 100%,60% 97%,56% 100%,52% 97%,48% 100%,44% 97%,40% 100%,36% 97%,32% 100%,28% 97%,24% 100%,20% 97%,16% 100%,12% 97%,8% 100%,4% 97%,0 100%)' });
    return el;
  };
  UI.RECEIPT_GROCERY = { store: 'GREEN LEAF MARKET', addr: '418 Elm Street', date: '10/09/2026', time: '6:42 PM', items: [['Avocados x2', '2.98'], ['Sourdough loaf', '4.50'], ['Oat milk', '3.79'], ['Eggs (12)', '3.99'], ['Baby spinach', '2.49']], tax: '1.07', total: '$18.82', foot: 'Thanks for shopping local' };
})();
