/* Shared motion helpers (all tweens go into E.tl, so they are frame-deterministic). */
(function () {
  const K = (window.K = {});

  K.text = function (parent, html, style, cls) {
    return E.div('abs ' + (cls || ''), parent, html, style);
  };
  /* centred text block: x/y are the block centre */
  K.ctext = function (parent, html, x, y, style, cls) {
    const d = E.div('abs ' + (cls || ''), parent, html, Object.assign({ left: x + 'px', top: y + 'px', textAlign: 'center', whiteSpace: 'nowrap' }, style || {}));
    gsap.set(d, { xPercent: -50, yPercent: -50 });
    return d;
  };
  K.words = function (el, text, wrapStyle) {
    el.innerHTML = text.split(' ').map((w) => `<span class="w" style="display:inline-block;white-space:nowrap;${wrapStyle || ''}">${w}</span>`).join(' ');
    return [...el.querySelectorAll('.w')];
  };
  K.chars = function (el, text) {
    el.innerHTML = [...text].map((c) => (c === ' ' ? ' ' : `<span class="c" style="display:inline-block">${c}</span>`)).join('');
    return [...el.querySelectorAll('.c')];
  };
  K.lines = function (el, lines, lineStyle) {
    el.innerHTML = lines.map((l) => `<div class="ln" style="overflow:hidden;${lineStyle || ''}"><div class="li" style="display:inline-block">${l}</div></div>`).join('');
    return [...el.querySelectorAll('.li')];
  };

  /* entrances */
  K.slam = function (els, t, opts) {
    opts = opts || {};
    [].concat(els).forEach((el, i) => {
      const tt = t + i * (opts.stagger || 0.12);
      E.ft(el, tt, { autoAlpha: 0, scale: opts.from || 1.9, filter: 'blur(14px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: opts.d || 0.38, ease: 'expo.out' });
      if (opts.sfx !== false) E.cue(tt, opts.sfx || 'thud', { gain: opts.gain || 0.55 });
    });
  };
  K.rise = function (els, t, opts) {
    opts = opts || {};
    [].concat(els).forEach((el, i) => {
      E.ft(el, t + i * (opts.stagger == null ? 0.06 : opts.stagger), { autoAlpha: 0, y: opts.dist == null ? 60 : opts.dist, rotation: opts.rot || 0 }, { autoAlpha: 1, y: 0, rotation: 0, duration: opts.d || 0.6, ease: opts.ease || 'power4.out' });
    });
  };
  K.maskUp = function (inner, t, opts) {
    opts = opts || {};
    [].concat(inner).forEach((el, i) => E.ft(el, t + i * (opts.stagger || 0.08), { yPercent: 110 }, { yPercent: 0, duration: opts.d || 0.6, ease: 'power4.out' }));
  };
  K.wipe = function (el, t, d, dir) {
    const from = { l: 'inset(0% 100% 0% 0%)', r: 'inset(0% 0% 0% 100%)', u: 'inset(100% 0% 0% 0%)', d: 'inset(0% 0% 100% 0%)' }[dir || 'l'];
    E.ft(el, t, { clipPath: from, autoAlpha: 1 }, { clipPath: 'inset(0% 0% 0% 0%)', duration: d || 0.5, ease: 'power3.inOut' });
  };
  K.wipeOut = function (el, t, d, dir) {
    const to = { l: 'inset(0% 0% 0% 100%)', r: 'inset(0% 100% 0% 0%)', u: 'inset(0% 0% 100% 0%)', d: 'inset(100% 0% 0% 0%)' }[dir || 'l'];
    E.ft(el, t, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: to, duration: d || 0.4, ease: 'power3.in' });
  };
  K.strike = function (parent, el, t, color, thick) {
    const s = E.div('abs', el, null, { left: '-2%', top: '52%', height: (thick || 14) + 'px', width: '104%', background: color || '#ef4444', transformOrigin: '0 50%', borderRadius: '8px' });
    E.ft(s, t, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power3.inOut' });
    E.cue(t, 'swipe', { gain: 0.5 });
    return s;
  };
  K.flash = function (parent, t, color, d) {
    const f = E.div('fill', parent, null, { background: color || '#fff', zIndex: 700, opacity: 0 });
    E.to(f, t, { opacity: 0.9, duration: 0.04, ease: 'none' });
    E.to(f, t + 0.04, { opacity: 0, duration: d || 0.35, ease: 'power2.out' });
    return f;
  };
  K.bgFill = function (scene, color) { scene.style.background = color; };
  /* slow drift for "no dead frames" */
  K.drift = function (el, t0, t1, vars) {
    E.ft(el, t0, Object.assign({}, vars.from || { scale: 1 }), Object.assign({ duration: t1 - t0, ease: 'none' }, vars.to || { scale: 1.06 }));
  };
  K.float = function (el, t0, t1, amp, period) {
    const per = period || 3, a = amp || 10;
    E.frame((t) => { if (t >= t0 && t <= t1) el.style.translate = `0 ${(Math.sin(((t - t0) / per) * Math.PI * 2) * a).toFixed(2)}px`; });
  };
  /* simple seeded random */
  K.rand = (function () { let s = 1234567; return function (seed) { if (seed != null) s = seed; s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
})();
