/* 03 · 3D — "One app. Every currency."  (three.js; Urbanist + Roboto) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const { P, W, H, L } = E;
E.duration = 56;
const NAVY = '#0B1830', WHITE = '#FFFFFF';
E.stage.style.background = `radial-gradient(${L(1400, 1100)}px ${L(900, 1400)}px at 50% 42%, #17305A 0%, #0F213D 45%, #070F20 100%)`;
E.css(`.h3{font:800 ${L(84, 80)}px Urbanist;color:#fff;letter-spacing:-.02em;text-align:center;line-height:1.05;text-shadow:0 2px 0 rgba(3,8,24,.55),0 0 28px rgba(3,8,24,.95),0 0 60px rgba(3,8,24,.8)}
  .scrim{position:absolute;left:0;right:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,10,28,0),rgba(4,10,28,.78) 35%,rgba(4,10,28,.78) 65%,rgba(4,10,28,0))}
  .sub3{font:600 ${L(40, 40)}px Urbanist;color:#BFD3FF;text-align:center}
  .glass{background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1.5px solid rgba(255,255,255,.28);border-radius:32px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  .code{font:800 ${L(40, 40)}px Urbanist;color:#fff;letter-spacing:.06em}`);
const cx = W / 2, cy = L(540, 860);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pr = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eo = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;

/* ================= three.js world ================= */
const s3d = E.scene(0, 50.4, '', { zIndex: 1 }, { static: true });
const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
Object.assign(canvas.style, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });
s3d.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1830, 18, 46);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(L(34, 52), W / H, 0.1, 200);
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
const rimL = new THREE.DirectionalLight(0x6aa8ff, 2.0); rimL.position.set(-6, 2, -4); scene.add(rimL);
scene.add(new THREE.AmbientLight(0x8fb2ff, 0.35));

/* ---- coins ---- */
const CODES = [['us', 'USD'], ['bd', 'BDT'], ['gb', 'GBP'], ['eu', 'EUR'], ['ae', 'AED'], ['jp', 'JPY'], ['in', 'INR'], ['ca', 'CAD'], ['au', 'AUD'], ['sg', 'SGD'], ['cn', 'CNY'], ['ch', 'CHF'], ['se', 'SEK'], ['kr', 'KRW'], ['br', 'BRL'], ['mx', 'MXN'], ['ng', 'NGN'], ['ph', 'PHP'], ['sa', 'SAR']];
const flagTex = {};
function loadFlag(cc) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      g.fillStyle = '#d4a93a'; g.fillRect(0, 0, 512, 512);
      g.save(); g.beginPath(); g.arc(256, 256, 226, 0, Math.PI * 2); g.clip(); g.drawImage(img, 0, 0, 512, 512);
      const sh = g.createRadialGradient(190, 170, 20, 256, 256, 260); sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)');
      g.fillStyle = sh; g.fillRect(0, 0, 512, 512); g.restore();
      g.lineWidth = 14; g.strokeStyle = '#f6d47a'; g.beginPath(); g.arc(256, 256, 228, 0, Math.PI * 2); g.stroke();
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; flagTex[cc] = tx; res();
    };
    img.onerror = () => res();
    img.src = `../../node_modules/flag-icons/flags/1x1/${cc}.svg`;
  });
}
const coinGeo = new THREE.CylinderGeometry(1, 1, 0.16, 48, 1);
const rimGeo = new THREE.TorusGeometry(1.0, 0.06, 8, 48);
const rimMat = new THREE.MeshStandardMaterial({ color: 0xf5c451, metalness: 1, roughness: 0.24 });
const coins = [];
function makeCoin(cc) {
  const grp = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: flagTex[cc], metalness: 0.15, roughness: 0.3 });
  const body = new THREE.Mesh(coinGeo, [rimMat, face, face]); body.rotation.x = Math.PI / 2; grp.add(body);
  const r1 = new THREE.Mesh(rimGeo, rimMat); r1.position.z = 0.08; grp.add(r1);
  const r2 = new THREE.Mesh(rimGeo, rimMat); r2.position.z = -0.08; grp.add(r2);
  grp.userData.cc = cc; scene.add(grp); coins.push(grp); return grp;
}

/* ---- globe (dotted land from Natural Earth 110m via world-atlas) ---- */
let globe, globeGrp = new THREE.Group(); scene.add(globeGrp);
async function buildGlobe() {
  const topo = await (await fetch('../../node_modules/world-atlas/land-110m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const mw = 1024, mh = 512, mc = document.createElement('canvas'); mc.width = mw; mc.height = mh; const mg = mc.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, mw, mh); mg.fillStyle = '#fff';
  const polys = land.geometry ? (land.geometry.type === 'MultiPolygon' ? land.geometry.coordinates : [land.geometry.coordinates]) : land.features.flatMap((f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]));
  polys.forEach((poly) => { mg.beginPath(); poly.forEach((ring) => ring.forEach(([lo, la], i) => { const x = ((lo + 180) / 360) * mw, y = ((90 - la) / 180) * mh; i ? mg.lineTo(x, y) : mg.moveTo(x, y); })); mg.fill('evenodd'); });
  const md = mg.getImageData(0, 0, mw, mh).data;
  const tw = 4096, th = 2048, tc = document.createElement('canvas'); tc.width = tw; tc.height = th; const tg = tc.getContext('2d');
  const grad = tg.createLinearGradient(0, 0, 0, th); grad.addColorStop(0, '#0c1f44'); grad.addColorStop(0.5, '#0a1a3a'); grad.addColorStop(1, '#0c1f44');
  tg.fillStyle = grad; tg.fillRect(0, 0, tw, th);
  const ec = document.createElement('canvas'); ec.width = tw; ec.height = th; const eg = ec.getContext('2d'); eg.fillStyle = '#000'; eg.fillRect(0, 0, tw, th);
  const step = 18;
  for (let y = step / 2; y < th; y += step) {
    const lat = 90 - (y / th) * 180; const cosl = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    const sx = step / cosl;
    for (let x = (y / step) % 2 ? sx / 2 : 0; x < tw; x += sx) {
      const mx = Math.floor((x / tw) * mw), my = Math.floor((y / th) * mh);
      if (md[(my * mw + mx) * 4] > 128) {
        tg.fillStyle = '#3d8bff'; tg.beginPath(); tg.arc(x, y, 5.2, 0, Math.PI * 2); tg.fill();
        eg.fillStyle = '#2f7bff'; eg.beginPath(); eg.arc(x, y, 5.2, 0, Math.PI * 2); eg.fill();
      }
    }
  }
  const map = new THREE.CanvasTexture(tc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const emi = new THREE.CanvasTexture(ec); emi.colorSpace = THREE.SRGBColorSpace;
  globe = new THREE.Mesh(new THREE.SphereGeometry(2.2, 96, 64), new THREE.MeshStandardMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.1 }));
  globeGrp.add(globe);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(2.32, 64, 48), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.12, side: THREE.BackSide }));
  globeGrp.add(atm);
}
function ll(lat, lon, r) {
  const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
const CITIES = { ny: [40.7, -74.0], ldn: [51.5, -0.1], dxb: [25.2, 55.3], dhk: [23.8, 90.4], tyo: [35.7, 139.7], sgp: [1.35, 103.8] };
const arcs = [];
function buildArcs() {
  [['ny', 'ldn'], ['ldn', 'dxb'], ['dxb', 'dhk'], ['dhk', 'sgp'], ['sgp', 'tyo']].forEach(([a, b], i) => {
    const A = ll(...CITIES[a], 2.22), B = ll(...CITIES[b], 2.22);
    const M = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(2.22 + A.distanceTo(B) * 0.45);
    const curve = new THREE.QuadraticBezierCurve3(A, M, B);
    const geo = new THREE.TubeGeometry(curve, 90, 0.022, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22d3ee : 0x60a5fa, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(geo, mat); geo.setDrawRange(0, 0); globe.add(m);
    const dotA = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); dotA.position.copy(A); globe.add(dotA);
    const dotB = dotA.clone(); dotB.position.copy(B); globe.add(dotB);
    arcs.push({ m, n: geo.index.count, dots: [dotA, dotB] });
  });
}

/* ---- extruded AccountE mark ---- */
const logoGrp = new THREE.Group(); scene.add(logoGrp);
async function buildLogo() {
  const txt = await (await fetch('../../assets/brand/icon_parts.svg')).text();
  const data = new SVGLoader().parse(txt);
  const geos = [];
  data.paths.forEach((p) => p.toShapes(true).forEach((sh) => geos.push(new THREE.ExtrudeGeometry(sh, { depth: 120, bevelEnabled: true, bevelThickness: 18, bevelSize: 10, bevelSegments: 4, curveSegments: 10 }))));
  const box = new THREE.Box3(); geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox); });
  const ctr = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
  const c1 = new THREE.Color('#0181fa'), c2 = new THREE.Color('#0204f5');
  geos.forEach((g) => {
    g.translate(-ctr.x, -ctr.y, -ctr.z);
    const pos = g.attributes.position; const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const f = clamp((pos.getX(i) + size.x / 2) / size.x, 0, 1); const c = c1.clone().lerp(c2, f); cols.set([c.r * 0.42, c.g * 0.42, c.b * 0.42], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.0, roughness: 0.42, envMapIntensity: 0.18, emissive: 0x0010c0, emissiveIntensity: 0.12 }));
    logoGrp.add(m);
  });
  const s = 3.2 / size.y; logoGrp.scale.set(s, -s, s); logoGrp.visible = false;
}

E.waits.push((async () => {
  await Promise.all(CODES.map(([cc]) => loadFlag(cc)));
  CODES.forEach(([cc]) => makeCoin(cc)); CODES.slice(0, 19).forEach(([cc]) => makeCoin(cc)); CODES.slice(0, 6).forEach(([cc]) => makeCoin(cc));
  await buildGlobe(); buildArcs(); await buildLogo();
})());

/* deterministic per-coin random params */
K.rand(99);
const R = Array.from({ length: 60 }, () => ({ a: K.rand(), b: K.rand(), c: K.rand(), d: K.rand(), e: K.rand() }));

function coinField(i, t) { // tunnel of coins for the hook
  const r = R[i]; const ang = r.a * Math.PI * 2, rad = 2.2 + r.b * L(6, 4);
  return new THREE.Vector3(Math.cos(ang) * rad * L(1.4, 0.9), Math.sin(ang) * rad * L(0.8, 1.4), -r.c * 40 + 6);
}
function coinOrbit(i, t) {
  const r = R[i]; const ring = i % 3; const rad = 3.3 + ring * 0.75; const sp = 0.35 + ring * 0.08;
  const a = r.a * Math.PI * 2 + t * sp * (ring % 2 ? -1 : 1); const tilt = [0.35, -0.25, 0.1][ring];
  const v = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad); v.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt); v.y += (r.d - 0.5) * 0.6;
  return v;
}

E.frame((t) => {
  if (t >= 50.4 || !globe) return;
  const N = coins.length;
  // ---------- camera ----------
  let camPos = new THREE.Vector3(), look = new THREE.Vector3(0, 0, 0);
  if (t < 2.8) { const p = eo(pr(t, 0, 2.8)); camPos.set(0, 0.3, lerp(34, 11.5, p)); look.set(0, 0, lerp(10, 0, p)); }
  else if (t < 5.6) { const a = (t - 2.8) * 0.12; camPos.set(Math.sin(a) * 11.5, lerp(0.3, 1.4, pr(t, 2.8, 5.6)), Math.cos(a) * 11.5); }
  else if (t < 8.4) { camPos.set(Math.sin(0.336) * lerp(11.5, 15, eo(pr(t, 5.6, 7))), 1.4, Math.cos(0.336) * lerp(11.5, 15, eo(pr(t, 5.6, 7)))); }
  else if (t < 14.0) { camPos.set(lerp(0.4, -0.4, pr(t, 8.4, 14)), 0.2, L(12, 15)); }
  else if (t < 33.6) { camPos.set(Math.sin(t * 0.05) * 2, 0.6, 16); }
  else if (t < 39.2) { const p = eio(pr(t, 33.6, 35.2)); camPos.set(lerp(2, 0, p), lerp(0.6, 1.2, p), lerp(16, L(9.4, 11.5), p)); look.set(0, L(0.55, 0.9) * p, 0); }
  else if (t < 44.8) { camPos.set(0, 0.4, lerp(L(10, 12.5), L(9, 11.5), pr(t, 39.2, 44.8))); }
  else { const p = eio(pr(t, 44.8, 47.6)); camPos.set(0, lerp(0.4, 1.6, p), lerp(L(9, 11.5), L(16, 20), p)); }
  camera.position.copy(camPos); camera.lookAt(look); camera.updateProjectionMatrix();

  // ---------- globe ----------
  let gs = 0, gx = 0, gy = 0;
  if (t >= 2.8 && t < 8.4) gs = t < 5.6 ? eo(pr(t, 2.8, 3.6)) : lerp(1, 0.6, eo(pr(t, 5.6, 6.6)));
  if (t >= 8.4 && t < 33.6) gs = 0;
  if (t >= 33.6 && t < 44.8) gs = t < 39.2 ? eo(pr(t, 33.6, 34.6)) : lerp(1, 0, eio(pr(t, 39.2, 40.4)));
  globeGrp.visible = gs > 0.001; globeGrp.scale.setScalar(Math.max(gs, 0.001)); globeGrp.position.set(gx, gy, 0);
  globe.rotation.y = t < 33.6 ? 2.2 + t * 0.18 : lerp(4.3, 4.9, eio(pr(t, 33.6, 39.2)));
  globe.rotation.x = 0.35;
  arcs.forEach((a, i) => { const p = eio(pr(t, 34.4 + i * 0.7, 35.4 + i * 0.7)); a.m.geometry.setDrawRange(0, Math.floor(a.n * p / 3) * 3); a.dots.forEach((d) => (d.visible = t > 34.2 + i * 0.7)); });

  // ---------- coins ----------
  for (let i = 0; i < N; i++) {
    const c = coins[i]; const r = R[i % R.length]; let pos, sc = 1, vis = true, rx = 0, ry = t * (0.6 + r.e) + r.a * 6, rz = 0;
    if (t < 2.8) { pos = coinField(i, t); sc = 0.9; rx = 0.4 * Math.sin(t + i); }
    else if (t < 5.6) { const p = eio(pr(t, 2.8, 3.8)); pos = coinField(i, t).lerp(coinOrbit(i, t), p); sc = lerp(0.9, 0.42, p); }
    else if (t < 8.4) { const o = coinOrbit(i, t); const p = eo(pr(t, 5.6, 6.6)); pos = o.clone().multiplyScalar(lerp(1, 2.6, p)); pos.z -= p * 4; sc = 0.42; }
    else if (t < 14.0) {
      // front row of 5 (USD BDT GBP EUR AED) then 10 more
      if (i < 5) { const p = eio(pr(t, 8.4 + i * 0.1, 9.2 + i * 0.1)); const x = (i - 2) * L(2.5, 1.6); const y = L(0.4, 1.9); pos = new THREE.Vector3(lerp(x * 2.5, x, p), lerp(y + 6, y, p), 0); sc = L(0.95, 0.68); ry = lerp(Math.PI * 3, 0, p) + Math.sin(t * 2 + i) * 0.12 * p; rx = 0;
        if (t > 11.2) { const q = eio(pr(t, 11.2, 11.9)); pos.y = lerp(pos.y, L(2.6, 4.1), q); sc = lerp(sc, L(0.62, 0.5), q); } }
      else if (i < 15) { const k = i - 5; const p = eio(pr(t, 11.3 + k * 0.06, 12.0 + k * 0.06)); const col = k % 5, row = Math.floor(k / 5); const x = (col - 2) * L(2.1, 1.5), y = L(0.1, 0.5) - row * L(1.65, 1.45); pos = new THREE.Vector3(x, lerp(y - 8, y, p), 0); sc = L(0.7, 0.55); ry = lerp(-Math.PI * 2, 0, p) + Math.sin(t * 2 + i) * 0.1; rx = 0; vis = t > 11.2; }
      else { pos = coinOrbit(i, t).multiplyScalar(2.6); pos.z -= 8; sc = 0.4; vis = t < 8.9; }
    }
    else if (t < 33.6) { const o = coinOrbit(i, t * 0.5); pos = o.multiplyScalar(2.2); pos.z -= 6; sc = 0.45; }
    else if (t < 39.2) { const o = coinOrbit(i, t); const p = eo(pr(t, 33.6, 34.6)); pos = o.multiplyScalar(lerp(2.2, 1.05, p)); pos.z -= p * 1.5; sc = lerp(0.45, 0.17, p); }
    else if (t < 44.8) { const o = coinOrbit(i, t).multiplyScalar(1.05); const p = eio(pr(t, 39.2 + (i % 10) * 0.06, 40.6 + (i % 10) * 0.06)); pos = o.lerp(new THREE.Vector3(0, 0, 0), p); sc = lerp(0.3, 0.05, p); vis = p < 0.98; }
    else { const o = coinOrbit(i, t).multiplyScalar(1.25); const p = eo(pr(t, 44.8, 46.2)); pos = new THREE.Vector3().lerp(o, p); sc = lerp(0.05, 0.32, p); }
    c.visible = vis; c.position.copy(pos); c.scale.setScalar(sc); c.rotation.set(rx, ry, rz);
  }
  // ---------- logo ----------
  const lgOn = t >= 40.2;
  logoGrp.visible = lgOn;
  if (lgOn) { const p = eo(pr(t, 40.2, 41.2)); const base = 3.2 / 1054; logoGrp.scale.set(base * p, -base * p, base * p); logoGrp.rotation.y = lerp(Math.PI * 2.5, 0, eio(pr(t, 40.2, 42.6))) + Math.sin(t * 0.9) * 0.18 * pr(t, 42.6, 43.6); logoGrp.position.y = L(0.25, 0.95) + Math.sin(t * 1.3) * 0.05; }
  canvas.style.opacity = t >= 14.0 && t < 33.6 ? (t < 14.4 ? lerp(1, 0.45, pr(t, 14, 14.4)) : t > 33.2 ? lerp(0.45, 1, pr(t, 33.2, 33.6)) : 0.45) : 1;
  // dimmed backdrop behind the cards/dashboard: render at half resolution with a soft blur (depth-of-field look, ~4x cheaper)
  const back = t >= 14.4 && t < 33.2; const pr2 = back ? 0.5 : 1;
  if (renderer.getPixelRatio() !== pr2) { renderer.setPixelRatio(pr2); renderer.setSize(W, H, false); }

  renderer.render(scene, camera);
});

/* ================= HTML overlays ================= */
function title(t0, t1, html, y, cls) {
  const s = E.scene(t0, t1); s.style.zIndex = 5;
  const lines = (html.match(/<br>/g) || []).length + 1, bh = lines * L(90, 86) + L(120, 130);
  const sc2 = E.div('scrim', s, null, { top: y - bh / 2 + 'px', height: bh + 'px' });
  E.ft(sc2, t0, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
  const h = K.ctext(s, html, cx, y, {}, cls || 'h3');
  K.rise(h, t0 + 0.05, { dist: 50, d: 0.55 });
  return { s, h };
}
title(0, 2.8, P ? "Your money isn't in<br>one currency." : "Your money isn't in one currency.", L(170, 330));
E.cue(0.0, 'whoosh', { gain: 0.5 }); for (let i = 0; i < 6; i++) E.cue(0.4 + i * 0.35, 'coin', { gain: 0.25 });
title(2.8, 5.6, P ? 'Your app shouldn’t<br>be either.' : 'Your app shouldn’t be either.', L(170, 330));
E.cue(2.8, 'whoosh', { gain: 0.4 });
// 160+
{ const s = E.scene(5.6, 8.4); s.style.zIndex = 5;
  const big = K.ctext(s, '160+', cx, L(cy - 30, cy - 80), { font: `800 ${L(330, 300)}px Urbanist`, letterSpacing: '-.04em', background: 'linear-gradient(180deg,#ffffff 20%,#8fbaff 100%)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 20px 60px rgba(30,100,255,.55))' });
  E.ft(big, 5.65, { scale: 0.3, autoAlpha: 0, rotationX: 70 }, { scale: 1, autoAlpha: 1, rotationX: 0, duration: 0.8, ease: 'back.out(1.4)' }); E.cue(5.65, 'impact', { gain: 0.6 });
  const lab = K.ctext(s, 'currencies', cx, L(cy + 160, cy + 120), { font: `700 ${L(70, 66)}px Urbanist`, color: '#cfe0ff', letterSpacing: '.02em' });
  K.rise(lab, 6.0, { dist: 40 }); }
// code labels for the coin row
{ const s = E.scene(8.4, 14.0); s.style.zIndex = 5;
  const codes = ['USD', 'BDT', 'GBP', 'EUR', 'AED'];
  codes.forEach((c, i) => {
    const x = cx + (i - 2) * L(338, 236), y = L(cy + 150, cy + 30);
    const lb = K.ctext(s, c, x, y, {}, 'code');
    E.ft(lb, 8.9 + i * 0.12, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }); E.cue(8.9 + i * 0.12, 'coin', { gain: 0.35 });
    E.to(lb, 11.15, { autoAlpha: 0, duration: 0.25 });
  });
  const more = K.ctext(s, '…and many more', cx, L(cy + 410, cy + 470), {}, 'sub3');
  E.ft(more, 12.3, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.45 }); E.cue(12.0, 'coin', { gain: 0.3 }); E.cue(12.3, 'coin', { gain: 0.25 }); }

/* ---- account cards (3D glass, CSS perspective) ---- */
const ACC = [['us', 'Main Checking', 'USD', '$4,920.00'], ['gb', 'UK Clients', 'GBP', '£1,250.00'], ['bd', 'Family Savings', 'BDT', '৳85,000.00'], ['ae', 'Travel Wallet', 'AED', 'AED 2,400.00'], ['jp', 'Tokyo Trip', 'JPY', '¥48,000'], ['eu', 'Euro Account', 'EUR', '€3,180.50']];
function accCard(parent, a, w) {
  return E.div('abs glass', parent, `<div style="display:flex;align-items:center;gap:22px"><img src="../../node_modules/flag-icons/flags/1x1/${a[0]}.svg" style="width:${L(84, 84)}px;height:${L(84, 84)}px;border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,.35)"><div><div style="font:700 ${L(36, 38)}px Urbanist;color:#fff">${a[1]}</div><div style="font:600 ${L(26, 28)}px Urbanist;color:#a9c4ff;letter-spacing:.08em;margin-top:4px">${a[2]}</div></div></div><div style="font:800 ${L(62, 66)}px Urbanist;color:#fff;margin-top:${L(26, 26)}px;letter-spacing:-.01em">${a[3]}</div>`, { width: w + 'px', padding: L('34px 38px', '34px 40px') });
}
{ const s = E.scene(14.0, 25.2); s.style.zIndex = 5; s.style.perspective = '1600px';
  const groups = [[0], [1, 2], [3, 4]];
  const cw = L(640, 640);
  const cards = [];
  groups.forEach((g, gi) => g.forEach((ai, k) => {
    const t0 = 14.0 + gi * 2.8;
    const n = g.length; const x = P ? cx - cw / 2 : cx - (n * cw + (n - 1) * 70) / 2 + k * (cw + 70); const y = P ? (n === 1 ? cy - 120 : cy - 330 + k * 400) : cy - 150;
    const c = accCard(s, ACC[ai], cw); c.style.left = x + 'px'; c.style.top = y + 'px';
    E.ft(c, t0 + 0.05 + k * 0.15, { autoAlpha: 0, rotationY: -60, rotationX: 20, z: -400, scale: 1 }, { autoAlpha: 1, rotationY: -8, rotationX: 6, z: 0, scale: n === 1 ? L(1.3, 1.15) : 1, duration: 0.8, ease: 'power3.out' });
    E.cue(t0 + 0.05 + k * 0.15, 'swoosh', { gain: 0.4 }); E.cue(t0 + 0.6 + k * 0.15, 'coin', { gain: 0.35 });
    E.ft(c, t0 + 0.9, { rotationY: -8 }, { rotationY: 8, duration: 1.9, ease: 'sine.inOut' });
    if (gi < 2) E.to(c, t0 + 2.6, { autoAlpha: 0, z: -300, duration: 0.3 });
    cards.push(c);
  }));
  // 22.4: everything flies into one panel
  const panel = E.div('abs glass', s, '', { left: cx - L(700, 470) + 'px', top: L(cy - 300, cy - 520) + 'px', width: L(1400, 940) + 'px', height: L(640, 1040) + 'px' });
  E.ft(panel, 22.4, { autoAlpha: 0, scale: 0.6, rotationX: 30 }, { autoAlpha: 1, scale: 1, rotationX: 0, duration: 0.7, ease: 'power3.out' });
  cards.slice(3).forEach((c, k) => E.to(c, 22.4, { scale: 0.4, x: (k ? 1 : -1) * 120, y: 120, autoAlpha: 0, duration: 0.5, ease: 'power3.in' }));
  const one = K.ctext(s, 'One clean dashboard.', cx, L(cy - 20, cy - 20), {}, 'h3');
  K.rise(one, 22.7, { dist: 50 }); E.cue(22.4, 'whoosh', { gain: 0.5 }); E.cue(22.9, 'pop', { gain: 0.4 });
}

/* ---- dashboard (recreated web UI, tilted) ---- */
{ const s = E.scene(25.2, 33.6); s.style.zIndex = 5; s.style.perspective = '2000px';
  const dw = L(1500, 960), dh = L(830, 1180);
  const dash = E.div('abs', s, null, { left: cx - dw / 2 + 'px', top: L(110, 260) + 'px', width: dw + 'px', height: dh + 'px', borderRadius: '28px', background: '#F4F6FB', boxShadow: '0 60px 120px rgba(0,0,0,.5)', overflow: 'hidden', fontFamily: 'Roboto' });
  E.div('abs', dash, `<div style="display:flex;align-items:center;gap:18px"><div style="width:64px;height:64px;border-radius:18px;background:#dbeafe;display:flex;align-items:center;justify-content:center">${E.icon('landmark', 36, '#2563eb', 2)}</div><div><div style="font:700 ${L(40, 40)}px Roboto;color:#0f172a">Accounts</div><div style="font:400 ${L(22, 24)}px Roboto;color:#64748b">Every account, in its own currency</div></div></div>`, { left: '40px', top: '34px' });
  const sel = E.div('abs', dash, `<span style="color:#64748b">Default currency</span> <b style="color:#0f172a;margin-left:10px">USD · US Dollar</b> ${E.icon('chevron-down', 26, '#0f172a', 2.4)}`, { right: '40px', top: L('44px', '150px'), background: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '14px 22px', font: `500 ${L(24, 26)}px Roboto`, display: 'flex', alignItems: 'center', gap: '6px' });
  const drop = E.div('abs', dash, ['USD · US Dollar', 'EUR · Euro', 'GBP · British Pound', 'BDT · Bangladeshi Taka', 'AED · UAE Dirham', 'JPY · Japanese Yen'].map((c, i) => `<div style="padding:14px 22px;${i === 0 ? 'background:#eef2ff;color:#4338ca;font-weight:700' : ''}">${c}</div>`).join(''), { right: '40px', top: L('108px', '214px'), width: '400px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(15,23,42,.18)', font: `500 ${L(24, 26)}px Roboto`, color: '#0f172a', overflow: 'hidden', zIndex: 5 });
  E.ft(drop, 28.2, { autoAlpha: 0, y: -20, scaleY: 0.6, transformOrigin: '50% 0%' }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.35, ease: 'power3.out' }); E.cue(28.2, 'click', { gain: 0.6 });
  E.to(drop, 30.6, { autoAlpha: 0, duration: 0.25 }); E.cue(30.55, 'tap', { gain: 0.5 });
  const grid = E.div('abs', dash, null, { left: '40px', right: '40px', top: L('140px', '250px'), display: 'grid', gridTemplateColumns: L('repeat(3,1fr)', 'repeat(2,1fr)'), gap: '22px' });
  ACC.forEach((a, i) => {
    const c = E.div('', grid, `<div style="display:flex;align-items:center;gap:16px"><img src="../../node_modules/flag-icons/flags/1x1/${a[0]}.svg" style="width:56px;height:56px;border-radius:50%"><div style="flex:1"><div style="font:700 ${L(26, 28)}px Roboto;color:#0f172a">${a[1]}</div><div style="font:500 ${L(20, 22)}px Roboto;color:#64748b;margin-top:2px">${a[2]}</div></div></div><div style="font:700 ${L(38, 40)}px Roboto;color:#0f172a;margin-top:18px">${a[3]}</div>`, { background: '#fff', borderRadius: '20px', padding: '24px 26px', boxShadow: '0 2px 10px rgba(15,23,42,.06)', borderLeft: '6px solid #3b82f6' });
    E.ft(c, 25.4 + i * 0.1, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 });
  });
  const tx = E.div('abs', dash, null, { left: '40px', right: '40px', top: L('520px', '880px'), background: '#fff', borderRadius: '20px', padding: '8px 0', boxShadow: '0 2px 10px rgba(15,23,42,.06)' });
  E.ft(tx, 30.8, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4 });
  const TX = [['Design retainer', 'UK Clients', '+£850.00', true], ['Groceries', 'Main Checking', '-$64.20'], ['Family transfer', 'Family Savings', '+৳12,000.00', true], ['Hotel deposit', 'Travel Wallet', '-AED 640.00'], ['Ramen', 'Tokyo Trip', '-¥1,200'], ['Train ticket', 'Euro Account', '-€24.90']];
  const showTx = P ? TX : TX.slice(0, 4);
  showTx.forEach((r, i) => { const row = E.div('', tx, `<span style="flex:1;font:600 ${L(24, 26)}px Roboto;color:#0f172a">${r[0]}</span><span style="width:${L(260, 280)}px;font:400 ${L(22, 24)}px Roboto;color:#64748b">${r[1]}</span><span style="width:${L(220, 220)}px;text-align:right;font:700 ${L(24, 26)}px Roboto;color:${r[3] ? '#059669' : '#0f172a'}">${r[2]}</span>`, { display: 'flex', alignItems: 'center', padding: `${L(13, 15)}px 26px`, borderTop: i ? '1px solid #f1f5f9' : 'none' });
    E.ft(row, 31.0 + i * 0.12, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.35 }); E.cue(31.0 + i * 0.12, 'pop_hi', { gain: 0.15 }); });
  E.ft(dash, 25.2, { rotationX: 25, rotationY: L(-18, -10), z: -600, autoAlpha: 0 }, { rotationX: 10, rotationY: L(-10, -6), z: 0, autoAlpha: 1, duration: 1.0, ease: 'power3.out' });
  E.ft(dash, 26.2, { rotationY: L(-10, -6) }, { rotationY: L(8, 5), rotationX: 4, duration: 7.4, ease: 'sine.inOut' });
  E.cue(25.2, 'whoosh', { gain: 0.45 });
}
title(33.6, 39.2, P ? 'At home or<br>across countries.' : 'At home or across countries.', L(140, 330));
for (let i = 0; i < 5; i++) E.cue(34.4 + i * 0.7, 'ping', { gain: 0.25 });
{ const t2 = title(42.0, 47.6, P ? 'One app.<br>Every account.<br>Every currency.' : 'One app. Every account. Every currency.', L(900, 1150)); }
E.cue(40.2, 'impact', { gain: 0.5 }); E.cue(39.2, 'rise', { gain: 0.4 });
for (let i = 0; i < 10; i++) E.cue(39.3 + i * 0.12, 'coin', { gain: 0.15 });
{ const s = E.scene(47.6, 50.4); s.style.zIndex = 6; const f = E.div('fill', s, null, { background: '#F7F9FF' });
  E.ft(f, 49.4, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: 'power2.in' });
  const fl = E.div('abs', s, null, { left: cx - 900 + 'px', top: L(cy - 30, cy - 30) + 'px', width: '1800px', height: '60px', background: 'radial-gradient(closest-side, rgba(255,255,255,.95), rgba(120,170,255,.35), rgba(0,0,0,0))', filter: 'blur(6px)' });
  E.ft(fl, 47.7, { scaleX: 0.1, opacity: 0 }, { scaleX: 1.4, opacity: 1, duration: 1.2, ease: 'power2.out' }); E.cue(47.6, 'rise', { gain: 0.4 }); }

E.setupCaptions({ hideFrom: 50.4 });
E.endCard(50.4, 56);
E.ready().then(() => { window.__ready = true; });
