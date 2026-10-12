/* AccountE promo engine: deterministic, frame-addressable timeline on top of GSAP.
   Every video page builds its scenes into E.tl (paused); the renderer calls window.seek(t)
   for each frame, so output never depends on wall-clock time. */
(function () {
  const qs = new URLSearchParams(location.search);
  const AR = qs.get('ar') === '9x16' ? '9x16' : '16x9';
  const P = AR === '9x16';
  const W = P ? 1080 : 1920, H = P ? 1920 : 1080;
  document.documentElement.classList.add('ar-' + AR);
  gsap.ticker.lagSmoothing(0);
  // note: never pause gsap.globalTimeline — gsap.set() would stop rendering
  gsap.defaults({ ease: 'power3.out', duration: 0.6 });

  const E = (window.E = {
    AR, P, W, H, fps: 30, duration: 56,
    tl: gsap.timeline({ paused: true }),
    hooks: [], cues: [], vo: [], captions: [], waits: [],
    L: (land, port) => (P ? port : land),
  });

  E.stage = document.getElementById('stage');

  /* ---- DOM helpers ---- */
  E.el = function (tag, cls, parent, html, style) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (style) Object.assign(n.style, style);
    (parent || E.stage).appendChild(n);
    return n;
  };
  E.div = (cls, parent, html, style) => E.el('div', cls, parent, html, style);
  E.css = function (text) { const s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); };
  E.box = function (parent, x, y, w, h, cls, html, style) {
    return E.div('abs ' + (cls || ''), parent, html, Object.assign({ left: x + 'px', top: y + 'px', width: w == null ? 'auto' : w + 'px', height: h == null ? 'auto' : h + 'px' }, style || {}));
  };

  /* ---- Lucide icons (ISC licensed, same family the AccountE app uses) ---- */
  E.icons = window.ICONS || {};
  E.icon = function (name, size, color, sw) {
    const raw = E.icons[name];
    if (!raw) { console.warn('missing icon', name); return '<span></span>'; }
    return raw.replace('<svg', `<svg style="width:${size}px;height:${size}px;stroke:${color || 'currentColor'};stroke-width:${sw || 2}"`).replace(/ width="24"| height="24"/g, '').replace(/stroke="currentColor"/, '');
  };

  /* ---- Brand ---- (gradient ids are made unique per instance so url(#…) never points into another scene) */
  let _uid = 0;
  const uniq = (svg, pre) => { const n = ++_uid; return svg.split('id="' + pre).join('id="' + pre + n + '-').split('url(#' + pre).join('url(#' + pre + n + '-'); };
  E.wordmark = function (parent, opts) {
    opts = opts || {};
    const d = E.div('abs wordmark', parent, uniq(BRAND.wordmark, 'wm-'));
    d.style.color = opts.color || '#000';
    if (opts.width) d.style.width = opts.width + 'px';
    if (opts.left != null) d.style.left = opts.left + 'px';
    if (opts.top != null) d.style.top = opts.top + 'px';
    const svg = d.querySelector('svg');
    svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.overflow = 'visible';
    const parts = [...svg.querySelectorAll('path.p')];
    d.glyph = (k) => BRAND.glyphs[k].map((i) => parts[i]);
    d.glyphs = Object.keys(BRAND.glyphs).map((k) => ({ k, els: BRAND.glyphs[k].map((i) => parts[i]) }));
    d.parts = parts;
    return d;
  };
  E.logoIcon = function (parent, size, style) {
    const d = E.div('abs logo-icon', parent, uniq(BRAND.icon, 'ic-'), Object.assign({ width: size + 'px' }, style || {}));
    const svg = d.querySelector('svg'); svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.overflow = 'visible';
    d.parts = [...svg.querySelectorAll('path.p')];
    return d;
  };

  /* ---- Scenes: container visible only inside [t0, t1) ---- */
  E.scene = function (t0, t1, cls, style, opts) {
    const s = E.div('scene ' + (cls || ''), E.stage, null, style);
    E.tl.set(s, { visibility: 'visible' }, t0);
    if (t1 != null) E.tl.set(s, { visibility: 'hidden' }, t1);
    // slow "camera" drift on every scene so no frame is ever static (overridable by later tweens)
    if (t1 != null && !(opts && opts.static)) E.tl.fromTo(s, { scale: 1, y: 0 }, { scale: 1.04, y: -10, duration: t1 - t0, ease: 'none', immediateRender: false }, t0);
    s.t0 = t0; s.t1 = t1;
    return s;
  };

  /* ---- Tween sugar (absolute times) ---- */
  E.ft = (el, t, from, to) => E.tl.fromTo(el, from, Object.assign({ immediateRender: true }, to), t);
  E.to = (el, t, vars) => E.tl.to(el, vars, t);
  E.set = (el, t, vars) => E.tl.set(el, vars, t);
  E.inUp = (el, t, d, dist) => E.ft(el, t, { autoAlpha: 0, y: dist == null ? 40 : dist }, { autoAlpha: 1, y: 0, duration: d || 0.6, ease: 'power3.out' });
  E.out = (el, t, d) => E.to(el, t, { autoAlpha: 0, duration: d || 0.35, ease: 'power2.in' });
  E.pop = (el, t, d, from) => E.ft(el, t, { autoAlpha: 0, scale: from == null ? 0.6 : from }, { autoAlpha: 1, scale: 1, duration: d || 0.55, ease: 'back.out(1.8)' });

  /* typewriter: reveals text between t and t+d (deterministic, via frame hook) */
  E.type = function (el, text, t, d, opts) {
    opts = opts || {};
    const caret = opts.caret ? '<span class="caret" style="display:inline-block;width:0.08em;height:1em;background:currentColor;vertical-align:-0.12em;margin-left:0.04em"></span>' : '';
    E.hooks.push((now) => {
      const p = Math.max(0, Math.min(1, (now - t) / d));
      const n = Math.round(text.length * p);
      const blink = opts.caret && (p < 1 || Math.floor(now * 2.2) % 2 === 0) && now >= t - 0.3 && (opts.caretUntil == null || now < opts.caretUntil);
      const s = text.slice(0, n);
      const html = (opts.html ? s : s.replace(/&/g, '&amp;').replace(/</g, '&lt;')) + (blink ? caret : '');
      if (el.__last !== html) { el.innerHTML = html; el.__last = html; }
    });
    // typing clicks
    if (opts.sfx !== false) {
      const step = Math.max(0.05, d / Math.max(1, text.length));
      for (let i = 0; i < text.length; i += 2) if (text[i] !== ' ') E.cue(t + i * step, 'type', { gain: 0.35 });
    }
  };

  /* number counter (deterministic) */
  E.count = function (el, from, to, t, d, fmt, ease) {
    const ez = gsap.parseEase(ease || 'power2.out');
    E.hooks.push((now) => {
      const p = Math.max(0, Math.min(1, (now - t) / d));
      const v = from + (to - from) * ez(p);
      const s = fmt ? fmt(v) : Math.round(v).toString();
      if (el.__last !== s) { el.textContent = s; el.__last = s; }
    });
  };
  E.money = (v, cur, dec) => (v < 0 ? '-' : '') + (cur == null ? '$' : cur) + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dec == null ? 2 : dec, maximumFractionDigits: dec == null ? 2 : dec });

  /* per-frame hook */
  E.frame = (fn) => E.hooks.push(fn);

  /* ---- Sound cues: consumed by the audio mixer (same timeline for 16:9 and 9:16) ---- */
  E.cue = function (t, name, opts) { E.cues.push(Object.assign({ t: +t.toFixed(3), name }, opts || {})); };

  /* ---- Voice-over + burned-in captions ----
     VO lines live in videos/<id>/script.json; tools/vo.py renders them and writes
     out/<id>/vo.js (window.VO = [{t, text, dur}]) which the page loads before engine use. */
  E.captionsEnabled = true;
  E.setupCaptions = function (opts) {
    opts = opts || {};
    const wrap = E.div('', E.stage); wrap.id = 'captions';
    if (opts.light) wrap.classList.add('light');
    const cap = E.div('cap', wrap);
    const maxChars = E.P ? 26 : 44;
    const chunks = [];
    (window.VO || []).forEach((line) => {
      if (line.nocap) return;
      const words = (line.cap || line.text).split(/\s+/);
      const groups = []; let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > maxChars && cur) { groups.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) groups.push(cur);
      // merge into chunks of up to 2 lines
      const merged = []; for (let i = 0; i < groups.length; i += 2) merged.push(groups.slice(i, i + 2).join('\n'));
      const total = merged.reduce((a, s) => a + s.length, 0);
      let tt = line.t;
      merged.forEach((s) => { const d = (line.dur * s.length) / total; chunks.push({ t0: tt, t1: tt + d + 0.12, text: s }); tt += d; });
    });
    E.captionChunks = chunks;
    const hideFrom = opts.hideFrom == null ? 1e9 : opts.hideFrom;
    E.hooks.push((now) => {
      let c = null;
      if (now < hideFrom) for (const k of chunks) if (now >= k.t0 && now < k.t1) { c = k; }
      const html = c ? c.text.replace(/</g, '&lt;').replace('\n', '<br>') : '';
      if (cap.__last !== html) { cap.innerHTML = html; cap.__last = html; }
      let a = 0;
      if (c) a = Math.min(1, (now - c.t0) / 0.12, (c.t1 - now) / 0.12);
      cap.style.opacity = a.toFixed(3);
      cap.style.transform = `translateY(${((1 - a) * 8).toFixed(1)}px)`;
    });
  };

  /* ---- Shared end card (identical in all ten videos) ---- */
  E.endCard = function (t0, t1) {
    const s = E.scene(t0, t1, 'endcard');
    s.style.zIndex = 800;
    const b1 = E.div('blob', s, null, { width: E.L(760, 820) + 'px', height: E.L(760, 820) + 'px', left: E.L(-180, -320) + 'px', top: E.L(-260, -200) + 'px', background: '#7fb4ff' });
    const b2 = E.div('blob', s, null, { width: E.L(820, 900) + 'px', height: E.L(820, 900) + 'px', left: E.L(1300, 500) + 'px', top: E.L(560, 1350) + 'px', background: '#8c9bff' });
    const wm = E.wordmark(s, { color: '#000' }); wm.classList.add('wm');
    const tag = E.div('tag', s, E.P ? 'Your AI bookkeeper<br>in your pocket' : 'Your AI bookkeeper in your pocket');
    const pill = E.div('pill', s, 'Free forever plan · No credit card');
    const badge = E.el('img', 'badge', s); badge.src = '../../assets/brand/google_play_badge.png';
    const url = E.div('url', s, 'accounte.com');
    // backdrop motion
    E.ft([b1, b2], t0, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 0.55, duration: 1.2, ease: 'power2.out' });
    E.ft(b1, t0, { x: 0, y: 0 }, { x: 80, y: 60, duration: t1 - t0, ease: 'none' });
    E.ft(b2, t0, { x: 0, y: 0 }, { x: -90, y: -50, duration: t1 - t0, ease: 'none' });
    // logo: icon pops, letters cascade
    const icon = wm.glyph('icon');
    E.ft(icon, t0 + 0.05, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' });
    const letters = wm.glyphs.filter((g) => g.k !== 'icon');
    letters.forEach((g, i) => E.ft(g.els, t0 + 0.2 + i * 0.045, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }));
    E.ft(wm, t0, { scale: 1.06, transformOrigin: '50% 50%' }, { scale: 1, duration: t1 - t0, ease: 'none' });
    E.ft(tag, t0 + 0.55, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 });
    E.ft(pill, t0 + 0.85, { opacity: 0, y: 20, xPercent: -50 }, { opacity: 1, y: 0, xPercent: -50, duration: 0.5 });
    E.ft(badge, t0 + 1.1, { opacity: 0, scale: 0.7, xPercent: -50 }, { opacity: 1, scale: 1, xPercent: -50, duration: 0.6, ease: 'back.out(1.7)' });
    E.ft(url, t0 + 1.35, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 });
    E.cue(t0, 'endhit'); E.cue(t0 + 1.1, 'pop', { gain: 0.6 });
    return s;
  };

  /* ---- boot: wait for fonts + images, expose seek ---- */
  E.ready = async function () {
    await document.fonts.ready;
    const fams = ['800 40px Urbanist', '400 40px Urbanist', '700 40px "Bricolage Grotesque"', '400 30px Roboto', '500 30px Roboto', '700 30px Roboto', '500 30px "JetBrains Mono"'];
    await Promise.all(fams.map((f) => document.fonts.load(f).catch(() => 0)));
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    for (const w of E.waits) await w;
    window.seek(0);
    return true;
  };
  window.seek = function (t) {
    E.tl.seek(t, false);
    for (const h of E.hooks) h(t);
  };
  window.__meta = () => ({ duration: E.duration, fps: E.fps, cues: E.cues, ar: E.AR, captions: E.captionChunks || [] });
})();
