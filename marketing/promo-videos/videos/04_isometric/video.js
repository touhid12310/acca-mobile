/* 04 · Isometric — "Messy receipts → clean books in 3 steps"  (Urbanist + Roboto) */
(function () {
  const { P, W, H, L } = E;
  E.duration = 56;
  const INK = '#0B1220', BLUE = '#0204F5';
  E.stage.style.background = 'linear-gradient(180deg,#F3F6FF 0%,#E6EDFF 100%)';
  E.css(`.stp{font:800 ${L(30, 32)}px Urbanist;letter-spacing:.18em;color:${BLUE}}
    .stt{font:800 ${L(70, 66)}px Urbanist;color:${INK};letter-spacing:-.02em;line-height:1.05}
    .bb{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;font:700 26px Roboto;color:${INK};background:#fff;border-radius:16px;padding:10px 18px;box-shadow:0 8px 0 rgba(11,18,32,.08)}`);
  const U = 40; const C30 = 0.8660254;
  const iso = (x, y, z) => [(x - y) * C30 * U, (x + y) * 0.5 * U - z * U];
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (c, w, f) => { const a = hex(c), b = hex(w); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
  const shade = (c) => ({ top: mix(c, '#ffffff', 0.25), left: c, right: mix(c, '#0b1530', 0.22) });
  const pts = (arr) => arr.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  function boxSVG(x, y, z, w, d, h, color, opts) {
    const s = opts && opts.faces ? opts.faces : shade(color);
    const A = iso(x, y, z + h), B = iso(x + w, y, z + h), Cc = iso(x + w, y + d, z + h), D = iso(x, y + d, z + h);
    const B0 = iso(x + w, y, z), C0 = iso(x + w, y + d, z), D0 = iso(x, y + d, z);
    const st = opts && opts.stroke ? ` stroke="${opts.stroke}" stroke-width="1.2" stroke-linejoin="round"` : '';
    return `<polygon points="${pts([D, Cc, C0, D0])}" fill="${s.left}"${st}/><polygon points="${pts([B, Cc, C0, B0])}" fill="${s.right}"${st}/><polygon points="${pts([A, B, Cc, D])}" fill="${s.top}"${st}/>`;
  }
  /* matrix that maps a flat 2D design (units px) onto an iso face */
  function faceMatrix(face, x, y, z, scale) {
    const o = iso(x, y, z); const k = scale || 1;
    if (face === 'right') { const ex = [(-C30 * U) / U, (0.5 * U) / U], ey = [0, 1]; return `matrix(${ex[0] * -k},${ex[1] * -k},${ey[0] * k},${ey[1] * k},${o[0]},${o[1]})`; }
    if (face === 'left') { const ex = [C30, 0.5], ey = [0, 1]; return `matrix(${ex[0] * k},${ex[1] * k},${ey[0] * k},${ey[1] * k},${o[0]},${o[1]})`; }
    const ex = [C30, 0.5], ey = [-C30, 0.5]; return `matrix(${ex[0] * k},${ex[1] * k},${ey[0] * k},${ey[1] * k},${o[0]},${o[1]})`; // top
  }

  /* ---------- world ---------- */
  const isl = P ? { a: [0, 0], b: [15, 0], c: [15, 15] } : { a: [0, 0], b: [15, 0], c: [30, 0] };
  const world = E.div('abs', E.stage, null, { left: 0, top: 0, width: W + 'px', height: H + 'px' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.position = 'absolute'; svg.style.overflow = 'visible'; world.appendChild(svg);
  const cam = document.createElementNS(svgNS, 'g'); svg.appendChild(cam);
  const layer = (cls) => { const g = document.createElementNS(svgNS, 'g'); if (cls) g.setAttribute('class', cls); cam.appendChild(g); return g; };
  const G = (parent, html) => { const g = document.createElementNS(svgNS, 'g'); g.innerHTML = html || ''; parent.appendChild(g); return g; };
  const html = E.div('abs', world, null, { left: 0, top: 0, width: W + 'px', height: H + 'px' }); // billboards layer (screen-space, follows camera)

  // ground shadows + platforms
  const lGround = layer(), lBack = layer(), lItems = layer(), lMid = layer(), lFront = layer(), lTop = layer();
  function platform([ox, oy], color) {
    G(lGround, `<polygon points="${pts([iso(ox - 0.6, oy - 0.6, -1.4), iso(ox + 8.6, oy - 0.6, -1.4), iso(ox + 8.6, oy + 8.6, -1.4), iso(ox - 0.6, oy + 8.6, -1.4)])}" fill="#c7d4ff" opacity=".45"/>`);
    return G(lBack, boxSVG(ox, oy, -0.8, 8, 8, 0.8, color, { faces: { top: '#FFFFFF', left: '#D6E0FF', right: '#BCCBFF' } }) +
      `<polygon points="${pts([iso(ox + 0.4, oy + 0.4, 0), iso(ox + 7.6, oy + 0.4, 0), iso(ox + 7.6, oy + 7.6, 0), iso(ox + 0.4, oy + 7.6, 0)])}" fill="none" stroke="#E3E9FF" stroke-width="3" stroke-dasharray="10 10"/>`);
  }
  const pA = platform(isl.a), pB = platform(isl.b), pC = platform(isl.c);

  // conveyors
  function belt(x0, y0, x1, y1) {
    const along = x1 !== x0 ? 'x' : 'y';
    const w = along === 'x' ? x1 - x0 : 2, d = along === 'y' ? y1 - y0 : 2;
    const g = G(lBack, boxSVG(x0, y0, -0.2, w, d, 0.5, '#94A3B8', { faces: { top: '#475569', left: '#94A3B8', right: '#64748B' } }));
    const stripes = G(g, ''); stripes.setAttribute('class', 'stripes');
    for (let i = 0; i < (along === 'x' ? w : d) * 2; i++) {
      const s0 = i * 0.5;
      const q = along === 'x' ? [iso(x0 + s0, y0 + 0.15, 0.3), iso(x0 + s0 + 0.12, y0 + 0.15, 0.3), iso(x0 + s0 + 0.12, y0 + 1.85, 0.3), iso(x0 + s0, y0 + 1.85, 0.3)] : [iso(x0 + 0.15, y0 + s0, 0.3), iso(x0 + 1.85, y0 + s0, 0.3), iso(x0 + 1.85, y0 + s0 + 0.12, 0.3), iso(x0 + 0.15, y0 + s0 + 0.12, 0.3)];
      G(stripes, `<polygon points="${pts(q)}" fill="#64748B"/>`);
    }
    return { g, along, x0, y0, x1, y1, stripes };
  }
  const belt1 = belt(isl.a[0] + 8, isl.a[1] + 3, isl.b[0], isl.a[1] + 3);
  const belt2 = P ? belt(isl.b[0] + 3, isl.b[1] + 8, isl.b[0] + 3, isl.c[1]) : belt(isl.b[0] + 8, isl.b[1] + 3, isl.c[0], isl.b[1] + 3);
  E.frame((t) => { const o = ((t * 1.2) % 0.5) * U; [belt1, belt2].forEach((b) => { const v = b.along === 'x' ? [o * C30, o * 0.5] : [-o * C30, o * 0.5]; b.stripes.setAttribute('transform', `translate(${v[0].toFixed(1)},${v[1].toFixed(1)})`); }); });

  /* ----- Island A: desk with receipts + 4 input stations ----- */
  const [ax, ay] = isl.a;
  G(lMid, boxSVG(ax + 1, ay + 4.6, 0, 3.4, 2.2, 1.3, '#F4B678', { faces: { top: '#FBD7A8', left: '#E9A15E', right: '#C9813F' } }));
  const pile = [];
  for (let i = 0; i < 9; i++) { const g = G(lMid, boxSVG(ax + 1.3 + (i % 3) * 0.75 + (i % 2) * 0.2, ay + 4.8 + Math.floor(i / 3) * 0.55, 1.3 + i * 0.07, 1.0, 0.7, 0.06, '#ffffff', { faces: { top: '#FFFFFF', left: '#E2E8F0', right: '#CBD5E1' } })); pile.push(g); }
  const stations = [['camera', '#EF4444', 'Photo'], ['mic', '#8B5CF6', 'Voice'], ['mail', '#F59E0B', 'Email'], ['file-spreadsheet', '#10B981', 'CSV']];
  const stPos = [[ax + 0.8, ay + 1.2], [ax + 3.4, ay + 0.3], [ax + 6.2, ay + 0.3], [ax + 5.6, ay + 4.6]];
  const stG = stations.map((s, i) => G(lMid, boxSVG(stPos[i][0], stPos[i][1], 0, 1.5, 1.5, 0.7, s[1])));
  const stBB = stations.map((s, i) => {
    const [px, py] = iso(stPos[i][0] + 0.75, stPos[i][1] + 0.75, 1.0);
    const b = E.div('abs', html, `<div style="width:84px;height:84px;border-radius:26px;background:${s[1]};display:flex;align-items:center;justify-content:center;box-shadow:0 10px 0 rgba(11,18,32,.12);margin:0 auto">${E.icon(s[0], 46, '#fff', 2.4)}</div><div style="margin-top:12px;font:800 26px Urbanist;color:${INK};background:#fff;border-radius:12px;padding:6px 14px;box-shadow:0 6px 0 rgba(11,18,32,.06)">${s[2]}</div>`, { textAlign: 'center' });
    b.wx = px; b.wy = py; b.style.transform = 'translate(-50%,-100%)'; return b;
  });

  /* ----- Island B: AI machine + bins ----- */
  const [bx, by] = isl.b;
  const mach = G(lMid, boxSVG(bx + 1.2, by + 1.2, 0, 4.2, 4.2, 3.4, '#0A5BFA', { faces: { top: '#3D8BFF', left: '#1B63FB', right: '#0A2FE0' } }));
  const logoOnFace = G(mach, BRAND.icon.replace('<svg', '<svg width="923" height="1054"').split('id="ic-').join('id="icm-').split('url(#ic-').join('url(#icm-'));
  logoOnFace.setAttribute('transform', `${faceMatrix('left', bx + 1.2 + 0.55, by + 5.4, 3.05, 1)} scale(0.12)`);
  logoOnFace.querySelectorAll('path').forEach((p) => p.setAttribute('fill', '#ffffff'));
  const beam = G(lTop, `<polygon points="${pts([iso(bx + 0.2, by + 2.2, 0.3), iso(bx + 0.9, by + 2.2, 0.3), iso(bx + 0.9, by + 4.2, 0.3), iso(bx + 0.2, by + 4.2, 0.3)])}" fill="#22D3EE" opacity=".55"/><polygon points="${pts([iso(bx + 0.55, by + 2.2, 0.3), iso(bx + 0.55, by + 4.2, 0.3), iso(bx + 0.55, by + 4.2, 2.6), iso(bx + 0.55, by + 2.2, 2.6)])}" fill="#22D3EE" opacity=".22"/>`);
  const cats = [['Groceries', '#10B981'], ['Transport', '#0EA5E9'], ['Utilities', '#8B5CF6'], ['Income', '#F59E0B']];
  const binPos = P ? [[bx + 0.6, by + 6.0], [bx + 2.6, by + 6.0], [bx + 6.0, by + 1.0], [bx + 6.0, by + 3.4]] : [[bx + 6.0, by + 0.6], [bx + 6.0, by + 2.6], [bx + 6.0, by + 4.6], [bx + 2.6, by + 6.0]];
  const bins = cats.map((c, i) => { const [x, y] = binPos[i]; const g = G(lMid, boxSVG(x, y, 0, 1.6, 1.6, 0.9, c[1]) + `<polygon points="${pts([iso(x + 0.2, y + 0.2, 0.9), iso(x + 1.4, y + 0.2, 0.9), iso(x + 1.4, y + 1.4, 0.9), iso(x + 0.2, y + 1.4, 0.9)])}" fill="${mix(c[1], '#0b1530', 0.45)}"/>`); return g; });
  const binBB = cats.map((c, i) => { const [x, y] = binPos[i]; const [px, py] = iso(x + 0.8, y + 0.8, 1.2); const b = E.div('bb', html, `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c[1]};margin-right:8px"></span>${c[0]}`); b.wx = px; b.wy = py; return b; });
  const fills = cats.map((c, i) => { const [x, y] = binPos[i]; const g = G(lMid, ''); g.x = x; g.y = y; g.c = c[1]; return g; });

  /* ----- Island C: chart towers, line panel, chat ----- */
  const [ccx, ccy] = isl.c;
  const towers = [0.9, 1.6, 1.2, 2.3, 1.9, 2.9].map((h, i) => ({ h, x: ccx + 0.8 + i * 1.05, y: ccy + 4.6, col: i % 2 ? '#10B981' : '#EF4444' }));
  towers.forEach((tw, i) => { tw.col = ['#10B981', '#EF4444'][i % 2]; tw.g = G(lMid, ''); });
  const panel = G(lMid, boxSVG(ccx + 1.0, ccy + 1.0, 0, 5.4, 0.3, 3.2, '#ffffff', { faces: { top: '#F8FAFC', left: '#FFFFFF', right: '#E2E8F0' } }));
  const lineG = G(panel, ''); lineG.setAttribute('transform', faceMatrix('left', ccx + 1.0, ccy + 1.3, 3.2, 1));
  const lpts = [[0.3, 2.5], [1.2, 2.2], [2.0, 2.35], [2.8, 1.6], [3.7, 1.2], [4.6, 0.6], [5.1, 0.45]].map(([a, b]) => [a * U, b * U]);
  lineG.innerHTML = `<polyline class="ln" points="${pts(lpts)}" fill="none" stroke="${BLUE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` + lpts.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="7" fill="#fff" stroke="${BLUE}" stroke-width="4"/>`).join('');
  const lnEl = lineG.querySelector('.ln'); const lnLen = lpts.reduce((s2, p, i) => (i ? s2 + Math.hypot(p[0] - lpts[i - 1][0], p[1] - lpts[i - 1][1]) : 0), 0);
  lnEl.style.strokeDasharray = lnLen; lnEl.style.strokeDashoffset = lnLen;
  const chatBB = (() => { const [px, py] = iso(ccx + 5.8, ccy + 1.6, 4.4); const b = E.div('abs', html, `<div class="q" style="font:700 30px Urbanist;color:#fff;background:linear-gradient(135deg,#6366F1,#7C5CF5);border-radius:26px 26px 6px 26px;padding:16px 24px;box-shadow:0 10px 0 rgba(11,18,32,.1)">How's my cash flow?</div><div class="a" style="margin-top:14px;font:700 30px Urbanist;color:${INK};background:#fff;border-radius:26px 26px 26px 6px;padding:16px 24px;box-shadow:0 10px 0 rgba(11,18,32,.08);display:flex;align-items:center;gap:10px">${E.icon('sparkles', 30, '#6366F1', 2.2)} Up $640 vs last month.</div>`, { whiteSpace: 'nowrap' }); b.wx = px; b.wy = py; b.style.transform = 'translate(-50%,-100%)'; return b; })();
  const insightBB = (() => { const [px, py] = iso(ccx + 1.2, ccy + 6.6, 1.0); const b = E.div('bb', html, `<span style="display:inline-flex;align-items:center;gap:10px">${E.icon('bell', 28, '#F59E0B', 2.4)} Smart insights & alerts</span>`); b.wx = px; b.wy = py; return b; })();

  /* ----- moving items (receipts/inputs riding belts) ----- */
  const ITEM_COL = ['#EF4444', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981'];
  const items = ITEM_COL.map((c, i) => { const g = G(lItems, boxSVG(0, 0, 0, 0.9, 0.9, 0.5, c)); g.c = c; g.k = i; return g; });
  function placeItem(g, x, y, z, vis) { if (!vis) { g.style.display = 'none'; return; } g.style.display = ''; const [sx, sy] = iso(x, y, z); g.setAttribute('transform', `translate(${sx.toFixed(1)},${sy.toFixed(1)})`); }
  const itemTag = E.div('bb', html, `<span style="color:#059669">Green Leaf Market</span> · Oct 9 · <b>$18.82</b>`); itemTag.style.fontSize = '28px';
  const dupFlag = E.div('bb', html, `<span style="display:inline-flex;align-items:center;gap:8px;color:#DC2626">${E.icon('flag', 28, '#DC2626', 2.4)} Duplicate?</span>`);

  /* ---------- camera ---------- */
  const centre = (k) => { const [x, y] = isl[k]; return iso(x + 4, y + 4, 0); };
  const cA = centre('a'), cB = centre('b'), cC = centre('c');
  const mid = P ? [(cA[0] + cB[0] + cC[0]) / 3 + 40, (cA[1] + cC[1]) / 2] : [(cA[0] + cC[0]) / 2, (cA[1] + cC[1]) / 2];
  const desk = iso(ax + 2.7, ay + 5.7, 1.4);
  const beltMid = P ? iso((isl.a[0] + 8 + isl.b[0]) / 2, isl.a[1] + 4, 0) : iso((isl.a[0] + 8 + isl.b[0]) / 2, isl.a[1] + 4, 0);
  const KF = [ // [t, cx, cy, scale]
    [0, desk[0], desk[1], L(3.0, 3.3)], [2.6, desk[0], desk[1] + 10, L(2.6, 2.9)], [3.6, mid[0], mid[1], L(0.95, 0.86)], [5.4, mid[0], mid[1], L(1.0, 0.92)],
    [6.2, cA[0], cA[1] - 20, L(1.7, 1.75)], [11.0, cA[0] + 20, cA[1] - 30, L(1.85, 1.9)], [12.4, beltMid[0], beltMid[1] - 40, L(1.6, 1.7)], [14.4, cB[0], cB[1] - 40, L(1.6, 1.7)],
    [19.6, cB[0] - 30, cB[1] - 50, L(1.9, 1.95)], [22.4, cB[0], cB[1] - 30, L(1.7, 1.75)], [27.6, cB[0] + 20, cB[1] - 40, L(1.75, 1.8)], [28.6, cC[0], cC[1] - 50, L(1.7, 1.75)],
    [36.0, cC[0] + 20, cC[1] - 60, L(1.85, 1.9)], [39.0, cC[0] + 20, cC[1] - 60, L(1.8, 1.85)], [40.2, mid[0], mid[1] - 20, L(0.98, 0.86)], [47.6, mid[0], mid[1] - 20, L(1.08, 0.94)], [50.4, mid[0], mid[1] - 20, L(1.12, 0.98)],
  ];
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const viewY = L(560, 860);
  let camState = [0, 0, 1];
  E.frame((t) => {
    let i = 0; while (i < KF.length - 2 && t > KF[i + 1][0]) i++;
    const a = KF[i], b = KF[i + 1]; const p = ease(Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))));
    const cx = a[1] + (b[1] - a[1]) * p, cy = a[2] + (b[2] - a[2]) * p, s = a[3] + (b[3] - a[3]) * p;
    camState = [cx, cy, s];
    cam.setAttribute('transform', `translate(${W / 2},${viewY}) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)},${(-cy).toFixed(2)})`);
    // billboards follow camera
    [...stBB, ...binBB, chatBB, insightBB, itemTag, dupFlag].forEach((b) => { if (b.wx == null) return; b.style.left = (W / 2 + (b.wx - cx) * s).toFixed(1) + 'px'; b.style.top = (viewY + (b.wy - cy) * s).toFixed(1) + 'px'; b.style.scale = Math.min(1.25, Math.max(0.7, s / 1.5)).toFixed(3); });
  });

  /* ---------- object animation ---------- */
  // hook: receipts flutter from the pile
  pile.forEach((g, i) => E.ft(g, 0.05 + i * 0.06, { y: -260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'bounce.out' }));
  for (let i = 0; i < 6; i++) E.cue(0.15 + i * 0.12, 'paper', { gain: 0.35 });
  const flutter = Array.from({ length: 7 }, (_, i) => {
    const f = E.div('abs', world, `<svg width="70" height="90" viewBox="0 0 70 90"><path d="M2 2H68V82L60 88L52 82L44 88L36 82L28 88L20 82L12 88L2 82Z" fill="#fff" stroke="#CBD5E1" stroke-width="2"/><rect x="12" y="14" width="40" height="6" rx="3" fill="#94A3B8"/><rect x="12" y="30" width="46" height="5" rx="2.5" fill="#CBD5E1"/><rect x="12" y="42" width="34" height="5" rx="2.5" fill="#CBD5E1"/><rect x="12" y="60" width="22" height="7" rx="3" fill="#0B1220"/></svg>`, { left: '0px', top: '0px' });
    K.rand(200 + i); const ox = (K.rand() - 0.5) * L(900, 700), oy = (K.rand() - 0.5) * 300, rot = (K.rand() - 0.5) * 80;
    E.frame((t) => { if (t > 3.2) { f.style.display = 'none'; return; } f.style.display = ''; const k = t / 3.2; f.style.left = (W / 2 + ox + Math.sin(t * 2 + i) * 40).toFixed(1) + 'px'; f.style.top = (viewY - 360 + oy + k * 520 + Math.cos(t * 3 + i) * 20).toFixed(1) + 'px'; f.style.transform = `rotate(${(rot + t * 60 * (i % 2 ? 1 : -1)).toFixed(1)}deg)`; f.style.opacity = Math.min(1, t * 3).toFixed(2); });
    return f;
  });
  // stations pop (step 01)
  stG.forEach((g, i) => E.ft(g, 8.4 + i * 0.25, { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }));
  stBB.forEach((b, i) => { E.ft(b, 8.6 + i * 0.25, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }); E.cue(8.6 + i * 0.25, 'pop', { gain: 0.4 }); });
  E.set(stBB, 0, { autoAlpha: 0 }); E.set(binBB, 0, { autoAlpha: 0 }); E.set([chatBB, insightBB, itemTag, dupFlag], 0, { autoAlpha: 0 });
  // items along the belts
  E.frame((t) => {
    items.forEach((g, k) => {
      const st = 11.2 + k * 0.55; const u = t - st; const len1 = isl.b[0] - (isl.a[0] + 8) + 1.6;
      if (u < 0) { placeItem(g, 0, 0, 0, false); return; }
      const speed = 2.4; let d = u * speed;
      if (d < len1) placeItem(g, isl.a[0] + 7.0 + d, isl.a[1] + 3.55, 0.35, t < 28);
      else if (u < 9) { placeItem(g, 0, 0, 0, false); }
      else placeItem(g, 0, 0, 0, false);
    });
  });
  E.cue(11.2, 'whoosh', { gain: 0.35 }); for (let i = 0; i < 8; i++) E.cue(11.2 + i * 0.55, 'click', { gain: 0.3 });
  // machine scanning, tags, bins filling (step 02)
  E.ft(beam, 14.0, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  E.frame((t) => { beam.style.opacity = t < 14 ? 0 : (0.55 + 0.45 * Math.sin(t * 9)).toFixed(2); });
  E.ft(mach, 14.0, { scale: 1 }, { keyframes: [{ scaleY: 1.03, duration: 0.15 }, { scaleY: 1, duration: 0.4, ease: 'elastic.out(1,0.4)' }], transformOrigin: '50% 100%' });
  E.cue(14.2, 'scan', { gain: 0.5 });
  const tagPos = iso(bx + 0.6, by + 3.2, 2.2); itemTag.wx = tagPos[0]; itemTag.wy = tagPos[1];
  E.ft(itemTag, 16.9, { autoAlpha: 0, y: 30, scale: 0.6 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(2)' }); E.cue(16.9, 'ding', { gain: 0.45 });
  E.to(itemTag, 19.4, { autoAlpha: 0, duration: 0.3 });
  binBB.forEach((b, i) => { E.ft(b, 19.7 + i * 0.18, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }); });
  // drops into bins: small cubes falling in from above
  E.frame((t) => {
    fills.forEach((g, i) => {
      let html2 = '';
      for (let k = 0; k < 4; k++) {
        const st = 19.8 + i * 0.35 + k * 1.3; const u = t - st; if (u < 0) continue;
        const z = Math.max(0.95 + k * 0.08, 4 - u * 9);
        if (z > 4) continue;
        html2 += boxSVG(g.x + 0.45, g.y + 0.45, z, 0.7, 0.7, 0.35, g.c);
      }
      if (g.__h !== html2) { g.innerHTML = html2; g.__h = html2; }
    });
  });
  for (let i = 0; i < 10; i++) E.cue(20.1 + i * 0.42, 'pop_lo', { gain: 0.2 });
  const dupPos = iso(bx + 0.6, by + 3.2, 2.0); dupFlag.wx = dupPos[0]; dupFlag.wy = dupPos[1];
  E.ft(dupFlag, 22.5, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)' }); E.cue(22.5, 'error', { gain: 0.35 });
  E.to(dupFlag, 25.0, { autoAlpha: 0, duration: 0.3 });
  const gear = E.div('abs', world, E.icon('refresh-cw', 64, '#fff', 2.4), { width: '96px', height: '96px', borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 0 rgba(11,18,32,.15)' });
  const gp = iso(bx + 3.3, by + 3.3, 4.4); gear.wx = gp[0]; gear.wy = gp[1]; gear.style.transform = 'translate(-50%,-50%)';
  E.set(gear, 0, { autoAlpha: 0 });
  E.ft(gear, 25.2, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }); E.to(gear, 28.0, { autoAlpha: 0, duration: 0.2 });
  E.frame((t) => { if (gear.wx == null) return; const s = camState[2]; gear.style.left = (W / 2 + (gear.wx - camState[0]) * s) + 'px'; gear.style.top = (viewY + (gear.wy - camState[1]) * s) + 'px'; gear.firstChild.style.transform = `rotate(${(t * 180).toFixed(1)}deg)`; });
  const learn = E.div('bb', html, 'Learns as it goes'); const lp2 = iso(bx + 3.3, by + 3.3, 4.4); learn.wx = lp2[0]; learn.wy = lp2[1]; learn.style.transform = 'translate(70px,-50%)';
  E.set(learn, 0, { autoAlpha: 0 }); E.ft(learn, 25.5, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }); E.to(learn, 28.0, { autoAlpha: 0, duration: 0.2 });
  E.frame((t) => { const s = camState[2]; learn.style.left = (W / 2 + (learn.wx - camState[0]) * s) + 'px'; learn.style.top = (viewY + (learn.wy - camState[1]) * s) + 'px'; });
  // towers grow (step 03)
  E.frame((t) => {
    towers.forEach((tw, i) => { const p = Math.max(0, Math.min(1, (t - 30.9 - i * 0.18) / 0.7)); const e = 1 - Math.pow(1 - p, 3); const h = Math.max(0.05, tw.h * e * (1 + 0.04 * Math.sin(t * 2 + i) * (t > 33 ? 1 : 0))); const key = h.toFixed(3);
      if (tw.__k !== key) { tw.g.innerHTML = boxSVG(tw.x, tw.y, 0, 0.8, 0.8, h, tw.col); tw.__k = key; } });
    lnEl.style.strokeDashoffset = (lnLen * (1 - Math.max(0, Math.min(1, (t - 31.6) / 1.4)))).toFixed(1); lineG.style.opacity = t < 31.4 ? 0 : 1; const lp = Math.max(0, Math.min(1, (t - 31.6) / 1.4)); lineG.querySelectorAll('circle').forEach((c, i) => { c.style.opacity = lp >= i / (lpts.length - 1) - 0.02 ? 1 : 0; });
  });
  for (let i = 0; i < 6; i++) E.cue(30.9 + i * 0.18, 'pop_hi', { gain: 0.22 });
  const qEl = chatBB.querySelector('.q'), aEl = chatBB.querySelector('.a');
  E.set(chatBB, 33.5, { autoAlpha: 1 }); E.ft(qEl, 33.6, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35 }); E.ft(aEl, 34.6, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35 });
  E.cue(33.6, 'tap', { gain: 0.5 }); E.cue(34.6, 'notify', { gain: 0.45 });
  E.ft(insightBB, 36.5, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)' }); E.cue(36.5, 'ding', { gain: 0.4 });
  E.to([chatBB, insightBB], 39.6, { autoAlpha: 0, duration: 0.3 });
  E.to(binBB, 39.6, { autoAlpha: 0, duration: 0.3 }); E.to(stBB, 39.6, { autoAlpha: 0, duration: 0.3 });


  /* ---------- screen-space titles ---------- */
  function stepTitle(t0, t1, n, text) {
    const s = E.scene(t0, t1); s.style.zIndex = 5;
    const box = E.div('abs', s, null, P ? { left: '0', right: '0', top: '150px', textAlign: 'center' } : { left: '90px', top: '70px' });
    const card = E.div('', box, null, { display: 'inline-block', background: '#fff', borderRadius: '26px', padding: P ? '22px 34px 26px' : '20px 32px 24px', boxShadow: '0 16px 40px rgba(30,50,120,.14)', textAlign: P ? 'center' : 'left' });
    const num = E.div('stp', card, n ? `STEP ${n}` : ''); const tt = E.div('stt', card, text, { marginTop: '8px' });
    K.rise(card, t0 + 0.05, { dist: 40, d: 0.5 }); K.rise([num, tt], t0 + 0.12, { stagger: 0.1, dist: 20, d: 0.45 }); E.cue(t0, 'whoosh', { gain: 0.35 });
    return s;
  }
  { const s = E.scene(0, 2.8); s.style.zIndex = 5; const h = K.ctext(s, 'Messy receipts?', W / 2, L(150, 330), { font: `800 ${L(110, 110)}px Urbanist`, color: INK, background: 'rgba(255,255,255,.9)', padding: '6px 34px 16px', borderRadius: '28px' }); E.ft(h, 0.1, { autoAlpha: 0, scale: 1.6, rotation: -6 }, { autoAlpha: 1, scale: 1, rotation: -3, duration: 0.5, ease: 'back.out(2)' }); E.cue(0.1, 'thud', { gain: 0.5 }); }
  { const s = E.scene(2.8, 5.6); s.style.zIndex = 5; const h = K.ctext(s, `Clean books${P ? '<br>' : ' '}in <span style="color:${BLUE}">3 steps.</span>`, W / 2, L(140, 330), { font: `800 ${L(96, 88)}px Urbanist`, color: INK, background: 'rgba(255,255,255,.9)', padding: '6px 34px 16px', borderRadius: '28px', lineHeight: 1.08 }); K.rise(h, 2.9, { dist: 50 }); E.cue(2.8, 'whoosh', { gain: 0.4 }); }
  stepTitle(5.6, 14.0, '01', P ? 'Capture, however<br>you like.' : 'Capture, however you like.');
  stepTitle(14.0, 28.0, '02', P ? 'AI does the<br>boring part.' : 'AI does the boring part.');
  stepTitle(28.0, 39.2, '03', P ? 'See clarity,<br>ask anything.' : 'See clarity, ask anything.');
  // overview: numbered markers over each island
  { const s = E.scene(39.2, 47.6); s.style.zIndex = 5;
    const marks = [['01', 'a'], ['02', 'b'], ['03', 'c']].map(([n, k], i) => { const [x, y] = isl[k]; const p = iso(x + 4, y + 4, 4.5); const m = E.div('abs', world, `<div style="width:110px;height:110px;border-radius:50%;background:${BLUE};color:#fff;font:800 46px Urbanist;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 0 rgba(2,4,245,.2)">${n}</div>`, {}); m.wx = p[0]; m.wy = p[1]; m.style.transform = 'translate(-50%,-50%)'; E.set(m, 0, { autoAlpha: 0 }); E.ft(m, 39.5 + i * 0.25, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)' }); E.to(m, 47.4, { autoAlpha: 0, duration: 0.2 }); E.cue(39.5 + i * 0.25, 'pop', { gain: 0.4 }); return m; });
    E.frame((t) => { const s2 = camState[2]; marks.forEach((m) => { m.style.left = (W / 2 + (m.wx - camState[0]) * s2) + 'px'; m.style.top = (viewY + (m.wy - camState[1]) * s2) + 'px'; }); });
    const lines = P ? ['No accounting degree.', 'No spreadsheets.', 'No setup fees.'] : ['No accounting degree.', 'No spreadsheets.', 'No setup fees.'];
    const box = E.div('abs', s, null, P ? { left: 0, right: 0, top: '160px', textAlign: 'center' } : { left: 0, right: 0, top: '70px', textAlign: 'center' });
    lines.forEach((l, i) => { const e = E.div('', box, l, { display: P ? 'block' : 'inline-block', font: `800 ${L(50, 54)}px Urbanist`, color: INK, background: 'rgba(255,255,255,.9)', borderRadius: '16px', padding: '6px 20px 10px', margin: P ? '10px auto 0' : '0 10px', width: P ? 'fit-content' : 'auto' }); E.ft(e, 42.0 + i * 0.3, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }); E.cue(42.0 + i * 0.3, 'pop_hi', { gain: 0.35 }); E.to(e, 44.6, { autoAlpha: 0, duration: 0.2 }); });
    const go = K.ctext(s, `<span style="display:inline-flex;align-items:center;gap:18px">${E.icon('timer', L(70, 70), BLUE, 2.4)} Start in 60 seconds.</span>`, W / 2, L(120, 280), { font: `800 ${L(84, 76)}px Urbanist`, color: INK, background: 'rgba(255,255,255,.92)', borderRadius: '24px', padding: '8px 32px 14px' });
    E.ft(go, 44.85, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }); E.cue(44.85, 'success', { gain: 0.45 });
  }
  // finale: iso logo block rises from the middle island
  { const s = E.scene(47.6, 50.4); s.style.zIndex = 6; s.style.background = 'rgba(243,246,255,0)';
    const veil = E.div('fill', s, null, { background: '#F3F6FF' }); E.ft(veil, 47.6, { opacity: 0 }, { opacity: 1, duration: 0.6 });
    const lg = E.logoIcon(s, L(230, 260), { left: W / 2 - L(115, 130) + 'px', top: L(270, 560) + 'px' });
    E.ft(lg, 48.0, { autoAlpha: 0, y: 200, scaleY: 0.4 }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.6, ease: 'back.out(1.8)' }); E.cue(48.0, 'pop', { gain: 0.6 });
    const shadow = E.div('abs', s, null, { left: W / 2 - 160 + 'px', top: L(560, 880) + 'px', width: '320px', height: '50px', borderRadius: '50%', background: 'rgba(11,18,32,.14)', filter: 'blur(6px)' });
    E.ft(shadow, 48.0, { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6 });
    const wm = E.wordmark(s, { width: L(700, 760), left: W / 2 - L(350, 380), top: L(640, 960) });
    E.set(wm.glyph('icon'), 47.6, { opacity: 0 });
    wm.glyphs.filter((g) => g.k !== 'icon').forEach((g, i) => E.ft(g.els, 48.5 + i * 0.04, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45 })); }

  E.setupCaptions({ hideFrom: 50.4 });
  E.endCard(50.4, 56);
  E.ready().then(() => { window.__ready = true; });
})();
