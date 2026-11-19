import * as THREE from 'three';
import { WP, ROUTES } from './kili';

// The 3D Kilimanjaro climb. Works inside `root` (the ClimbExperience markup).
// onRoute(k) fires when the user picks another route; onExit() when they press Escape.
// Returns a cleanup function.
export function createClimb(root, { route = 'lemosho', onRoute, onExit } = {}) {
  const $ = (s) => root.querySelector(s);
  const EX = 1.5, V3 = THREE.Vector3, PI = Math.PI, cv = $('#cv'), labL = $('#cLabels');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, logarithmicDepthBuffer: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFShadowMap;
  const S = new THREE.Scene(), fog = new THREE.Fog(0xc9dcea, 30, 150); S.fog = fog;
  const cam = new THREE.PerspectiveCamera(50, 1, 0.004, 900);

  // ---------- terrain ----------
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  function alt(x, z) { // km above sea level
    const dM = Math.hypot(x / 1.3 - 1.5, z - 1.5); let h = 0.85 + 3.7 * Math.exp(-Math.pow(dM / 14, 2.6));
    const dK = Math.hypot(x, z + 0.3); h += 1.35 * sst(3.9, 1.3, dK);
    const dc = Math.hypot(x - 0.1, z + 0.5); h -= 0.2 * sst(1.05, 0.6, dc); h += 0.06 * sst(0.32, 0, dc);
    const dW = Math.hypot(x - 11, z + 1); h += 1.25 * Math.exp(-(dW * dW) / 2.9) * (0.55 + 0.9 * fbm(x * 1.4 + 5, z * 1.4, 4));
    const dS = Math.hypot((x + 9.5) / 1.2, z - 2); h += (3.62 - h) * sst(5.5, 3.2, dS) * 0.5;
    const n = fbm(x * 0.33 + 20, z * 0.33 + 20, 5), ang = Math.atan2(z + 0.3, x);
    h += (n - 0.5) * 0.4 * sst(0.5, 6, dK) + 0.07 * Math.sin(ang * 23 + n * 7) * sst(2.6, 6, dK) * sst(19, 9, dK);
    h += (fbm(x * 1.7, z * 1.7, 3) - 0.5) * 0.07;
    return Math.max(0.75, h);
  }
  const SZ = 46, SEG = 360, CX = -1, CZ = -1, CELL = SZ / SEG;
  const tg = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); tg.rotateX(-PI / 2); tg.translate(CX, 0, CZ);
  const tp = tg.attributes.position, N = tp.count, AL = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = alt(tp.getX(i), tp.getZ(i)); AL[i] = a; tp.setY(i, a * EX); }
  tg.computeVertexNormals();
  function th(x, z) { // terrain height exactly as the mesh draws it
    const gx = (x - CX + SZ / 2) / CELL, gz = (z - CZ + SZ / 2) / CELL;
    if (gx < 0 || gz < 0 || gx >= SEG || gz >= SEG) return alt(x, z);
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, i = iz * (SEG + 1) + ix;
    return (AL[i] * (1 - fx) + AL[i + 1] * fx) * (1 - fz) + (AL[i + SEG + 1] * (1 - fx) + AL[i + SEG + 2] * fx) * fz;
  }
  const jit = (x, z) => (fbm(x * 0.8 + 40, z * 0.8, 3) - 0.5) * 0.4;
  const P = (k) => new THREE.Color(k);
  const PAL = { f1: P(0x5d7d33), f2: P(0x8b9a4c), f3: P(0x7d6c45), fo: P(0x1b4024), fo2: P(0x2f5d30), he: P(0x6e7d44), mo: P(0x978c5b), de: P(0x857668), de2: P(0x6c625b), ro: P(0x55504e), sn: P(0xf2f5f9), ic: P(0xcfe2ee) };
  const nm = tg.attributes.normal, cols = new Float32Array(N * 3), c = new THREE.Color(), k = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = tp.getX(i), z = tp.getZ(i), a = AL[i], ny = nm.getY(i), b = a + jit(x, z), fh = hash(Math.floor(x * 2.2), Math.floor(z * 2.2));
    c.copy(fh < 0.4 ? PAL.f1 : fh < 0.75 ? PAL.f2 : PAL.f3);
    c.lerp(k.copy(PAL.fo).lerp(PAL.fo2, vn(x * 5, z * 5)), sst(1.65, 1.85, b));
    c.lerp(PAL.he, sst(2.75, 3, b)); c.lerp(PAL.mo, sst(3.35, 3.7, b));
    c.lerp(k.copy(PAL.de).lerp(PAL.de2, vn(x * 3 + 9, z * 3)), sst(3.95, 4.3, b));
    c.lerp(PAL.ro, Math.max(sst(0.86, 0.64, ny) * 0.7, sst(5, 5.5, b) * 0.45));
    const snow = sst(5.42, 5.6, a + (fbm(x * 2.5, z * 2.5, 3) - 0.5) * 0.35) * sst(0.5, 0.8, ny);
    const ice = sst(5.05, 5.3, a) * sst(0.45, 0.9, z) * sst(2.4, 1.2, Math.abs(x + 0.4)) * sst(0.4, 0.55, fbm(x * 3, z * 3, 3))
      + sst(5.1, 5.3, a) * sst(-1.5, -1.9, z) * sst(0.45, 0.6, fbm(x * 3 + 7, z * 3, 3));
    c.lerp(PAL.sn, Math.min(1, snow)); c.lerp(PAL.ic, Math.min(1, ice * 1.3));
    c.multiplyScalar(0.84 + 0.16 * vn(x * 9, z * 9));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terr = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }));
  terr.receiveShadow = terr.castShadow = true; S.add(terr);
  const plain = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x58723a, roughness: 1 }));
  plain.rotation.x = -PI / 2; plain.position.y = 0.76 * EX - 0.02; S.add(plain);

  // ---------- vegetation, rocks, tents ----------
  const dummy = new THREE.Object3D();
  function scatter(n, lo, hi) { const o = []; let t = 0; while (o.length < n && t < n * 25) { t++; const x = CX + (Math.random() - 0.5) * SZ * 0.97, z = CZ + (Math.random() - 0.5) * SZ * 0.97, b = alt(x, z) + jit(x, z); if (b > lo && b < hi) o.push([x, z]); } return o; }
  function mats(list, sc) {
    return list.map((p) => {
      const s = sc * (0.7 + Math.random() * 0.7);
      dummy.position.set(p[0], th(p[0], p[1]) * EX, p[1]); dummy.scale.set(s, s * (0.8 + Math.random() * 0.5), s); dummy.rotation.set(0, Math.random() * 6.3, 0); dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }
  function inst(geo, mat, ms, cl) {
    const m = new THREE.InstancedMesh(geo, mat, ms.length);
    ms.forEach((x, i) => { m.setMatrixAt(i, x); if (cl) m.setColorAt(i, cl[(i * 7919) % cl.length]); });
    m.castShadow = m.receiveShadow = true; S.add(m); return m;
  }
  const fm = () => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.92 });
  inst(new THREE.ConeGeometry(0.02, 0.075, 6).translate(0, 0.03, 0), fm(), mats(scatter(8500, 1.85, 2.85), 1), [0x1d4a2a, 0x2a5b2e, 0x214f33, 0x3a6633, 0x16402a].map(P));
  inst(new THREE.IcosahedronGeometry(0.009, 0).scale(1, 0.6, 1), fm(), mats(scatter(3500, 2.85, 3.75), 1), [0x6f7d3e, 0x8c8a4a, 0x5f6e3a, 0x9a8a52].map(P));
  const sen = mats(scatter(1400, 3.4, 4.15), 1);
  inst(new THREE.CylinderGeometry(0.0018, 0.0026, 0.028, 5).translate(0, 0.014, 0), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, flatShading: true }), sen);
  inst(new THREE.DodecahedronGeometry(0.0075).translate(0, 0.031, 0), new THREE.MeshStandardMaterial({ color: 0x4f7a3a, flatShading: true }), sen);
  inst(new THREE.DodecahedronGeometry(0.009, 0), fm(), mats(scatter(2600, 4.1, 5.4), 1), [0x6a625c, 0x7a716a, 0x55504c].map(P));
  const tentList = [];
  Object.keys(WP).forEach((kk) => {
    if (!/Camp|Hut|Cave|Tarn/.test(WP[kk][0])) return;
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.012 + i * 0.004; tentList.push([WP[kk][1] + Math.cos(a) * r, WP[kk][2] + Math.sin(a) * r]); }
  });
  inst(new THREE.ConeGeometry(0.005, 0.006, 4).translate(0, 0.003, 0), fm(), mats(tentList, 1), [0xe8692e, 0xf2b233, 0x3d8a5a, 0xd9d2c4].map(P));

  // ---------- clouds ----------
  const tex = (draw, size) => { const cc = document.createElement('canvas'); cc.width = cc.height = size; draw(cc.getContext('2d')); const t = new THREE.CanvasTexture(cc); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const ctex = tex((g) => {
    for (let i = 0; i < 16; i++) {
      const x = 30 + Math.random() * 68, y = 44 + Math.random() * 44, r = 18 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
  }, 128);
  const clouds = scatter(150, 1.6, 2.9).map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, transparent: true, depthWrite: false })), sc = 2 + Math.random() * 3.5;
    s.scale.set(sc, sc * 0.55, 1); s.position.set(p[0], (2.75 + Math.random() * 0.45) * EX, p[1]);
    s.userData = { o: 0.5 + Math.random() * 0.4, a: Math.atan2(p[1] - 1, p[0]), r: Math.hypot(p[0], p[1] - 1), y: s.position.y };
    S.add(s); return s;
  });

  // ---------- sky, stars, lights ----------
  const SU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sun: { value: new V3(0, 1, 0) }, sc: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    uniforms: SU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top,hor,sc,sun;varying vec3 vD;void main(){vec3 d=normalize(vD);float y=d.y;vec3 c=mix(hor,top,pow(smoothstep(-.02,.65,y),.6));float s=max(dot(d,normalize(sun)),0.);c+=sc*(pow(s,6.)*.35+pow(s,1200.)*3.);c=mix(c,hor*.75,smoothstep(0.,-.25,y));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}',
  }));
  sky.renderOrder = -2; S.add(sky);
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1800; i++) { const u = Math.random(), t = Math.random() * 6.283, r = Math.sqrt(1 - u * u); sp.push(r * Math.cos(t) * 450, u * 450, r * Math.sin(t) * 450); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  S.add(stars);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x3a3428, 0.6); S.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; S.add(sun); S.add(sun.target);
  function shadowBox(r) { const s = sun.shadow.camera; s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 0.5; s.far = 150; s.updateProjectionMatrix(); }

  // ---------- climbers ----------
  const climbers = [0xd4451a, 0x2f6fb0, 0xf2b233].map((cl) => {
    const g = new THREE.Group(), sm = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, 0.008, 6), sm(cl)); b.position.y = 0.0055;
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), sm(0x5a3d2a)); hd.position.y = 0.0108;
    const pk = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0045, 0.0022), sm(0x333a44)); pk.position.set(0, 0.0068, -0.0026);
    [b, hd, pk].forEach((m) => { m.castShadow = true; g.add(m); });
    g.scale.setScalar(1.6); S.add(g); return g;
  });
  const gtex = tex((g) => { const gg = g.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(255,190,120,.9)'); gg.addColorStop(1, 'rgba(255,140,80,0)'); g.fillStyle = gg; g.fillRect(0, 0, 64, 64); }, 64);
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, transparent: true, depthWrite: false, fog: false }));
  beacon.scale.set(0.06, 0.06, 1); S.add(beacon);
  const lamp = new THREE.SpotLight(0xfff2d0, 0, 0.9, 0.55, 0.6, 1); S.add(lamp); S.add(lamp.target);

  // ---------- routes ----------
  function segPts(a, b) {
    const key = a < b ? [a, b] : [b, a], A = WP[key[0]], B = WP[key[1]], dx = B[1] - A[1], dz = B[2] - A[2], d = Math.hypot(dx, dz);
    const n = Math.max(12, Math.ceil(d / 0.03)), px = -dz / d, pz = dx / d, sd = hash(A[1] * 3.1 + B[1], A[2] * 1.7 + B[2]), m1 = (sd - 0.5) * d * 0.22;
    const steep = Math.abs(B[3] - A[3]) / 1000 / d, zz = steep > 0.12 ? Math.min(0.1, 0.03 + d * 0.02) : 0, kz = Math.max(4, Math.round(d * 5)), o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, e = Math.sin(PI * t), off = e * m1 + e * zz * Math.sin(t * PI * kz) + (vn(sd * 50 + t * d * 2.5, sd * 30) - 0.5) * 0.12 * e;
      const x = A[1] + dx * t + px * off, z = A[2] + dz * t + pz * off;
      o.push(new V3(x, th(x, z) * EX + 0.007, z));
    }
    if (key[0] !== a) o.reverse();
    return o;
  }
  function build(rk) {
    const r = ROUTES[rk], pts = [], L = [0], items = []; let tEnd = null, km = 0, tl = 0;
    r.steps.forEach(([a, b, hrs, dk, f]) => {
      let st;
      if (tEnd === null) st = 8; else if (f === 'n') st = (Math.floor(tEnd / 24) + 1) * 24 + 8; else if (f === 'l') st = tEnd + 1; else if (f === 'c') st = tEnd + 0.25; else if (f === 'b') st = tEnd + 2; else st = Math.floor(tEnd / 24) * 24 + 23.5;
      if (tEnd !== null) { const gap = st - tEnd, dur = gap < 2 ? Math.max(0.6, gap * 1.2) : 3 + gap * 0.18; items.push({ type: 'rest', at: a, h0: tEnd, h1: st, k0: km, i0: pts.length - 1, t0: tl, dur }); tl += dur; }
      const sp = segPts(a, b), i0 = Math.max(0, pts.length - 1);
      sp.forEach((p, j) => { if (pts.length && j === 0) return; if (pts.length) L.push(L[L.length - 1] + p.distanceTo(pts[pts.length - 1])); pts.push(p); });
      items.push({ type: 'walk', a, b, hrs, km: dk, st, f, k0: km, i0, i1: pts.length - 1, t0: tl, dur: hrs * 2.4 });
      tl += hrs * 2.4; km += dk; tEnd = st + hrs;
    });
    const col = new THREE.Color(r.col), curve = new THREE.CatmullRomCurve3(pts);
    const dim = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length, 0.0016, 5, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
    const done = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length, 0.0019, 5, false), new THREE.MeshBasicMaterial({ color: 0xfff1c8 })); done.renderOrder = 1;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 }));
    [dim, done].forEach((m) => { m.visible = false; S.add(m); }); S.add(line);
    return { k: rk, r, pts, L, items, total: tl, kmTot: km, days: Math.floor(tEnd / 24) + 1, dim, done, line, segs: pts.length };
  }
  const DATA = {}; Object.keys(ROUTES).forEach((kk) => (DATA[kk] = build(kk)));

  // ---------- state ----------
  let D = null, T = 0, playing = false, started = false, speed = 1, mode = 'map', run = true, last = performance.now(), snap = true, drag = null, raf = 0;
  let mapYaw = 0.5, mapPitch = 0.6, mapR = 38, fYaw = 0, fPitch = 0.32, fDist = 0.32, eYaw = 0, ePitch = -0.04;
  const hp = new V3(), dir = new V3(0, 0, 1), sdir = new V3(0, 0, 1), cp = new V3(), ct = new V3(), dp = new V3(), dt3 = new V3(), tmp = new V3(), sunD = new V3(), pv = new V3();
  function posAt(len, i0, i1, out) {
    const L = D.L; let i = i0; while (i < i1 - 1 && L[i + 1] < len) i++;
    const seg = L[i + 1] - L[i] || 1, f = Math.min(1, Math.max(0, (len - L[i]) / seg));
    out.lerpVectors(D.pts[i], D.pts[i + 1], f);
    dir.subVectors(D.pts[Math.min(i1, i + 2)], D.pts[Math.max(i0, i - 1)]).setY(0).normalize();
    return out;
  }
  function state() {
    let it = D.items[0]; for (const x of D.items) { if (T >= x.t0) it = x; else break; }
    const f = Math.min(1, Math.max(0, (T - it.t0) / it.dur));
    if (it.type === 'walk') {
      posAt(D.L[it.i0] + f * (D.L[it.i1] - D.L[it.i0]), it.i0, it.i1, hp);
      return { it, f, hour: it.st + f * it.hrs, alt: WP[it.a][3] + (WP[it.b][3] - WP[it.a][3]) * f, km: it.k0 + f * it.km, walking: true };
    }
    hp.copy(D.pts[it.i0]);
    return { it, f, hour: it.h0 + f * (it.h1 - it.h0), alt: WP[it.at][3], km: it.k0, walking: false };
  }

  // ---------- light by time of day and altitude ----------
  const C1 = new THREE.Color(), C2 = new THREE.Color(), Ck = new THREE.Color();
  const NT = P(0x03060f), DT = P(0x2b66b3), HT = P(0x10306f), NH = P(0x0b1424), DH = P(0xcadcea), TW = P(0xf08a4b), TP = P(0x3a3566), WH = P(0xffffff), CN = P(0x1c2436), CP = P(0xffb48a);
  const MOON = new V3(-0.3, 0.9, 0.4).normalize();
  function light(h, a) {
    const t = ((h % 24) - 6.4) / 12.2 * PI; sunD.set(Math.cos(t), Math.sin(t), 0.28).normalize(); const e = sunD.y;
    const day = sst(-0.06, 0.28, e), twi = sst(-0.3, -0.02, e) * (1 - sst(0.04, 0.3, e)), night = 1 - sst(-0.28, -0.04, e);
    C1.copy(NT).lerp(Ck.copy(DT).lerp(HT, sst(3.5, 5.9, a)), day).lerp(TP, twi * 0.45);
    C2.copy(NH).lerp(DH, day).lerp(TW, twi * 0.8);
    SU.top.value.copy(C1); SU.hor.value.copy(C2); SU.sun.value.copy(sunD);
    SU.sc.value.set(0xff9a55).lerp(Ck.set(0xfff4dc), sst(0, 0.4, e)).multiplyScalar(sst(-0.12, 0.02, e));
    fog.color.copy(C2);
    const tgt = mode === 'map' ? tmp.set(0, 4.5, 1) : hp; sun.target.position.copy(tgt);
    if (e > -0.04) { sun.position.copy(tgt).addScaledVector(sunD, 60); sun.color.set(0xff9a55).lerp(Ck.set(0xfff1d8), sst(0, 0.35, e)); sun.intensity = 1.35 * PI * sst(-0.04, 0.2, e); }
    else { sun.position.copy(tgt).addScaledVector(MOON, 60); sun.color.set(0x8ea6d8); sun.intensity = 0.4 * PI * sst(-0.04, -0.16, e); }
    hemi.color.copy(C1).lerp(WH, 0.3 * day + 0.1); hemi.groundColor.set(0x3a3428).multiplyScalar(0.3 + 0.7 * day);
    hemi.intensity = (0.22 + 0.45 * day + 0.12 * twi) * PI;
    stars.material.opacity = night * 0.95;
    Ck.copy(CN).lerp(WH, day).lerp(CP, twi * 0.6); clouds.forEach((s) => s.material.color.copy(Ck));
    lamp.intensity = mode === 'map' ? 0 : night * 0.9;
    return { day, night };
  }

  // ---------- UI ----------
  const pick = $('#cPick'), rl = $('#cRoutes'), pf = $('#cProf');
  rl.innerHTML = Object.entries(ROUTES).map(([kk, r]) => `<button data-r="${kk}" aria-pressed="false"><i style="background:${r.col}"></i><b>${r.name}</b><span>${DATA[kk].days} days · ${DATA[kk].kmTot} km</span></button>`).join('');
  rl.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { select(b.dataset.r); onRoute?.(b.dataset.r); } });
  let labs = [], PX = null, PY = null, uiKey = '';
  const walks = () => D.items.filter((i) => i.type === 'walk');
  function select(kk) {
    D = DATA[kk]; T = 0; playing = false; uiKey = '';
    rl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.r === kk));
    Object.values(DATA).forEach((d) => { const on = d === D; d.dim.visible = d.done.visible = on; d.line.visible = !on; d.line.material.opacity = 0.35; });
    const r = D.r;
    $('#cDetail').innerHTML = `<p>${r.blurb}</p><dl><dt>Start</dt><dd>${r.start}</dd><dt>Length</dt><dd>${D.days} days, ${D.kmTot} km</dd><dt>Highest camp</dt><dd>${r.sleep}</dd><dt>Character</dt><dd>${r.feel}</dd><dt>Summit night</dt><dd>from ${WP[D.items.find((i) => i.f === 's').a][0]}, about 23:30</dd></dl>`;
    $('#cTitle').textContent = r.name + ' Route';
    labL.innerHTML = ''; labs = []; const seen = new Set();
    D.items.forEach((i) => {
      if (i.type !== 'walk') return;
      [i.a, i.b].forEach((w) => {
        if (seen.has(w)) return; seen.add(w);
        const el = document.createElement('button'); el.className = 'lab';
        el.innerHTML = `<b>${WP[w][0]}</b><span>${WP[w][3].toLocaleString('en-US')} m</span>`;
        el.addEventListener('click', () => seekWp(w)); labL.appendChild(el);
        labs.push({ w, el, p: new V3(WP[w][1], th(WP[w][1], WP[w][2]) * EX + 0.03, WP[w][2]) });
      });
    });
    [['Mawenzi, 5,149 m', 11, -1, 0.45], ['Shira Plateau', -9.5, 2, 0.3]].forEach(([n, x, z, o]) => {
      const el = document.createElement('div'); el.className = 'lab peak'; el.textContent = n; labL.appendChild(el);
      labs.push({ el, p: new V3(x, th(x, z) * EX + o, z), peak: 1 });
    });
    drawProf(); ui(true);
  }
  function setMode(m) {
    mode = m;
    root.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === m));
    shadowBox(m === 'map' ? 27 : 2.5);
    climbers.forEach((c) => (c.visible = m !== 'eye'));
    beacon.visible = m !== 'eye';
  }
  const hud = (on) => { ['#cStats', '#cNote', '#cBar'].forEach((s) => ($(s).hidden = !on)); pick.hidden = on; };
  const setPlay = () => { $('#cPlay').textContent = playing ? 'Pause' : T >= D.total ? 'Replay' : 'Play'; };
  function start(fromZero) { started = true; if (fromZero) T = 0; uiKey = ''; hud(true); setMode('follow'); playing = true; setPlay(); snap = true; }
  function curWalk() { let w = 0; walks().forEach((x, i) => { if (T >= x.t0 - 0.001) w = i; }); return w; }
  function seekWp(w) { const W = walks(); const x = W.find((i) => i.b === w); T = W[0].a === w ? 0 : x ? x.t0 + x.dur : 0; if (!started) start(false); snap = true; setPlay(); }
  function seekKm(km) { const W = walks(); let x = W[W.length - 1]; for (const i of W) if (km <= i.k0 + i.km) { x = i; break; } T = x.t0 + Math.min(1, Math.max(0, (km - x.k0) / x.km)) * x.dur; snap = true; setPlay(); }
  function drawProf() {
    if (!D) return; const W = pf.clientWidth, H = pf.clientHeight; if (!W) return;
    const wl = walks(), pts = [[0, WP[wl[0].a][3]]].concat(wl.map((i) => [i.k0 + i.km, WP[i.b][3]]));
    const X = (kk) => 46 + kk / D.kmTot * (W - 56), Y = (a) => 6 + (1 - (a - 1400) / 4700) * (H - 26); PX = X; PY = Y;
    const d = pts.map(([kk, a], i) => (i ? 'L' : 'M') + X(kk).toFixed(1) + ' ' + Y(a).toFixed(1)).join('');
    let dl = '', lastX = -99;
    wl.forEach((i) => { if (i.f === 'n' && X(i.k0) - lastX > 50) { lastX = X(i.k0); dl += `<text class="dy" x="${lastX}" y="${H - 3}">Day ${Math.floor(i.st / 24) + 1}</text>`; } });
    pf.innerHTML = [2000, 4000, 6000].map((a) => `<line class="gl" x1="46" x2="${W - 10}" y1="${Y(a)}" y2="${Y(a)}"/><text class="ax" x="40" y="${Y(a) + 4}">${a.toLocaleString('en-US')}</text>`).join('')
      + `<path class="ar" d="${d}L${X(D.kmTot)} ${H - 20}L${X(0)} ${H - 20}Z"/><path class="ln" d="${d}"/>${pts.map(([kk, a]) => `<circle class="dt" cx="${X(kk)}" cy="${Y(a)}" r="2.5"/>`).join('')}${dl}<line id="pfm" class="mk" y1="4" y2="${H - 20}"/><circle id="pfd" class="md" r="5"/>`;
  }
  const zone = (a) => (a < 1800 ? 'Foothill farms' : a < 2800 ? 'Rainforest' : a < 4000 ? 'Heath and moorland' : a < 5000 ? 'Alpine desert' : 'Arctic summit');
  const clk = (h) => { const m = Math.round((h % 24) * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const tip = (a) => (a > 5500 ? 'Each breath now holds about half the oxygen it would at sea level. Guides repeat "pole pole": tiny steps, steady pace.'
    : a > 4300 ? 'Most climbers feel the altitude here: headache, short breath, broken sleep. Drink 3 to 4 litres a day.'
      : a > 3200 ? 'Above the treeline the sun burns and nights drop below freezing.'
        : 'Humid forest and muddy trail. Walking slowly now saves energy for the summit.');
  function ui(force) {
    if (!D || (!started && !force)) return;
    const s = state(), day = Math.floor(s.hour / 24) + 1, a = Math.round(s.alt), it = s.it;
    const lt = light(s.hour, s.alt / 1000), temp = Math.round(28 - 6.5 * (s.alt / 1000 - 1) - 10 * (1 - lt.day)), o2 = Math.round(Math.exp(-s.alt / 8400) * 100);
    $('#sAlt').textContent = a.toLocaleString('en-US') + ' m'; $('#sZone').textContent = zone(a); $('#sTime').textContent = `Day ${day}, ${clk(s.hour)}`;
    $('#sTemp').textContent = (temp < 0 ? '−' : '') + Math.abs(temp) + ' °C'; $('#sO2').textContent = o2 + '% of sea level'; $('#sKm').textContent = `${s.km.toFixed(1)} of ${D.kmTot} km`;
    const key = started + it.type + (it.a || it.at) + (it.b || '') + day;
    if (key !== uiKey) {
      uiKey = key;
      if (!started) $('#cSub').textContent = `${D.days} days · ${D.kmTot} km`;
      else if (it.type === 'walk') {
        $('#cSub').textContent = `Day ${Math.floor(it.st / 24) + 1} of ${D.days} · ${WP[it.a][0]} to ${WP[it.b][0]}`;
        $('#nT').textContent = `Heading for ${WP[it.b][0]}, ${WP[it.b][3].toLocaleString('en-US')} m`;
        $('#nX').textContent = WP[it.b][4] + ` About ${it.km} km and ${it.hrs} hours of walking.`;
      } else {
        $('#cSub').textContent = `Day ${day} of ${D.days} · at ${WP[it.at][0]}`;
        $('#nT').textContent = `${WP[it.at][0]}, ${WP[it.at][3].toLocaleString('en-US')} m`;
        $('#nX').textContent = WP[it.at][4];
      }
      $('#nTip').textContent = tip(a);
      labs.forEach((l) => l.el.classList.toggle('next', started && !l.peak && l.w === (it.b || it.at)));
    }
    if (PX) { const m = pf.querySelector('#pfm'), dd = pf.querySelector('#pfd'); if (m) { const x = PX(s.km); m.setAttribute('x1', x); m.setAttribute('x2', x); dd.setAttribute('cx', x); dd.setAttribute('cy', PY(s.alt)); } }
    const sum = (it.type === 'rest' && it.at === 'uhu') || (it.a === 'uhu' && s.f < 0.3) || (it.b === 'uhu' && s.f > 0.9);
    $('#cSummit').classList.toggle('on', sum && started);
    return s;
  }
  const occl = (p) => { for (let i = 1; i < 10; i++) { tmp.lerpVectors(cam.position, p, i / 10); if (th(tmp.x, tmp.z) * EX > tmp.y + 0.015) return true; } return false; };

  // ---------- input ----------
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  root.querySelectorAll('[data-m]').forEach((b) => on(b, 'click', () => { if (b.dataset.m !== 'map' && !started) start(false); else setMode(b.dataset.m); }));
  on($('#cStart'), 'click', () => start(true));
  on($('#cChange'), 'click', () => { playing = false; setPlay(); started = false; uiKey = ''; hud(false); setMode('map'); });
  on($('#cPlay'), 'click', () => { if (T >= D.total) T = 0; playing = !playing; setPlay(); });
  on($('#cSpeed'), 'change', (e) => (speed = +e.target.value));
  on($('#cNext'), 'click', () => { const W = walks(), i = curWalk(); T = i + 1 < W.length ? W[i + 1].t0 : D.total; snap = true; setPlay(); });
  on($('#cPrev'), 'click', () => { const W = walks(), i = curWalk(); T = (T - W[i].t0 < 1.5 && i > 0) ? W[i - 1].t0 : W[i].t0; snap = true; setPlay(); });
  const profKm = (e) => { const r = pf.getBoundingClientRect(); return Math.min(D.kmTot, Math.max(0, (e.clientX - r.left - 46) / (r.width - 56) * D.kmTot)); };
  let pfDrag = false;
  on(pf, 'pointerdown', (e) => { pf.setPointerCapture(e.pointerId); pfDrag = true; seekKm(profKm(e)); });
  on(pf, 'pointermove', (e) => { if (pfDrag) seekKm(profKm(e)); });
  on(pf, 'pointerup', () => (pfDrag = false));
  on(cv, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  on(cv, 'pointermove', (e) => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    if (mode === 'map') { mapYaw -= dx * 0.005; mapPitch = Math.min(1.35, Math.max(0.12, mapPitch + dy * 0.004)); }
    else if (mode === 'follow') { fYaw -= dx * 0.006; fPitch = Math.min(1.3, Math.max(0.05, fPitch + dy * 0.004)); }
    else { eYaw -= dx * 0.004; ePitch = Math.min(0.8, Math.max(-0.6, ePitch - dy * 0.003)); }
  });
  on(cv, 'pointerup', () => (drag = null));
  on(cv, 'wheel', (e) => { e.preventDefault(); const f = Math.exp(e.deltaY * 0.001); if (mode === 'map') mapR = Math.min(70, Math.max(6, mapR * f)); else if (mode === 'follow') fDist = Math.min(4, Math.max(0.06, fDist * f)); }, { passive: false });
  on(window, 'keydown', (e) => {
    if (e.key === 'Escape') { onExit?.(); return; }
    if (!started || /SELECT|INPUT/.test(e.target.tagName)) return;
    if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#cPlay').click(); } else if (e.key === 'ArrowRight') $('#cNext').click(); else if (e.key === 'ArrowLeft') $('#cPrev').click();
  });
  function rs() { const w = root.clientWidth, h = root.clientHeight; if (!w) return; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 50; cam.updateProjectionMatrix(); }
  on(window, 'resize', rs);
  const pro = new ResizeObserver(drawProf); pro.observe(pf);

  // ---------- frame loop ----------
  function loop(now) {
    if (!run) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (playing && started) { T += dt * speed; if (T >= D.total) { T = D.total; playing = false; setPlay(); } }
    let s; if (started) s = ui(); else { state(); light(16.9, 4.5); s = null; }
    const walking = s && s.walking && playing;
    sdir.lerp(dir, 1 - Math.pow(0.08, dt)).normalize();
    const hy = Math.atan2(sdir.x, sdir.z);
    climbers.forEach((c, i) => { const back = i * 0.011, x = hp.x - sdir.x * back, z = hp.z - sdir.z * back; c.position.set(x, th(x, z) * EX + (walking ? Math.abs(Math.sin(now * 0.009 + i)) * 0.0012 : 0), z); c.rotation.y = hy; });
    beacon.position.set(hp.x, hp.y + 0.01, hp.z); beacon.material.opacity = mode === 'map' ? 1 : 0.5;
    lamp.position.copy(climbers[0].position); lamp.position.y += 0.02;
    lamp.target.position.set(hp.x + sdir.x * 0.25, th(hp.x + sdir.x * 0.25, hp.z + sdir.z * 0.25) * EX, hp.z + sdir.z * 0.25);
    if (mode === 'map' || !started) {
      if (!drag && !playing) mapYaw += dt * 0.035;
      dt3.set(0.5, 3.6, 1.5);
      dp.set(dt3.x + Math.sin(mapYaw) * Math.cos(mapPitch) * mapR, dt3.y + Math.sin(mapPitch) * mapR, dt3.z + Math.cos(mapYaw) * Math.cos(mapPitch) * mapR);
    } else if (mode === 'follow') {
      const y = hy + PI + fYaw;
      dp.set(hp.x + Math.sin(y) * Math.cos(fPitch) * fDist, hp.y + Math.sin(fPitch) * fDist + 0.01, hp.z + Math.cos(y) * Math.cos(fPitch) * fDist);
      dt3.set(hp.x, hp.y + 0.012, hp.z);
    } else {
      const y = hy + eYaw;
      dp.set(hp.x - sdir.x * 0.004, th(hp.x, hp.z) * EX + 0.018, hp.z - sdir.z * 0.004);
      dt3.set(dp.x + Math.sin(y) * Math.cos(ePitch), dp.y + Math.sin(ePitch), dp.z + Math.cos(y) * Math.cos(ePitch));
    }
    const kf = snap ? 1 : 1 - Math.pow(mode === 'map' ? 0.15 : 0.0008, dt); snap = false;
    cp.lerp(dp, kf); ct.lerp(dt3, kf);
    cp.y = Math.max(cp.y, th(cp.x, cp.z) * EX + (mode === 'eye' ? 0.012 : 0.025));
    cam.position.copy(cp); cam.lookAt(ct);
    sky.position.copy(cp); stars.position.copy(cp);
    const ca = s ? s.alt / 1000 : 4, mapish = mode === 'map' || !started, cb = mapish ? 0 : sst(1.9, 2.3, ca) * (1 - sst(2.85, 3.2, ca));
    fog.near = mapish ? 35 : 0.15 + 3 * (1 - cb); fog.far = mapish ? 160 : 90 * (1 - cb) + 1.8 * cb;
    clouds.forEach((cl, i) => { const u = cl.userData, a = u.a + now * 0.0000045 * (1 + (i % 3)); cl.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r + 1); cl.material.opacity = u.o * sst(0.3, 2.2, cl.position.distanceTo(cp)); });
    if (D) {
      const len = D.L[D.L.length - 1]; let walked = 0;
      if (started) { const it = state().it; walked = D.L[it.i0] + (it.type === 'walk' ? Math.min(1, (T - it.t0) / it.dur) * (D.L[it.i1] - D.L[it.i0]) : 0); }
      D.done.geometry.setDrawRange(0, Math.floor(walked / len * D.segs) * 5 * 6);
    }
    const W = root.clientWidth, H = root.clientHeight;
    labs.forEach((l) => {
      pv.copy(l.p).project(cam);
      let ok = pv.z < 1 && Math.abs(pv.x) < 1.05 && Math.abs(pv.y) < 1.05;
      if (ok && started && mode !== 'map') ok = l.p.distanceTo(cp) < (l.peak ? 20 : 7);
      if (ok) ok = !occl(l.p);
      l.el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) l.el.style.transform = `translate(${((pv.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-pv.y * 0.5 + 0.5) * H).toFixed(1)}px) translate(-50%,calc(-100% - 6px))`;
    });
    R.render(S, cam);
  }

  setMode('map'); select(ROUTES[route] ? route : 'lemosho'); rs();
  raf = requestAnimationFrame(loop);

  return () => {
    run = false; cancelAnimationFrame(raf); pro.disconnect(); off.forEach((f) => f());
    S.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    R.dispose();
  };
}
