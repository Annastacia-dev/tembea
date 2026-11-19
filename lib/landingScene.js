import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One continuous landscape the camera travels through as the page scrolls:
// Serengeti sunrise -> safari -> Kilimanjaro -> Zanzibar beach -> Stone Town at dusk -> harbour at night.
// 1 world unit = 10 m. x runs east, z runs south.
export const SCENES = [
  { k: 'hero', label: 'Serengeti sunrise' },
  { k: 'kili', label: 'Mountain' },
  { k: 'safari', label: 'Safari' },
  { k: 'zanzibar', label: 'Beach' },
  { k: 'combo', label: 'City' },
  { k: 'arc', label: 'Old town at twilight' },
  { k: 'book', label: 'Harbour at night' },
];

// Camera station per section: position, look target (pg/tg: y is height above ground),
// sun elevation/azimuth in degrees (azimuth 0 = east, 90 = south), sky haze, exposure, fog, screen offset for the card.
const ST = {
  hero: { p: [-1150, 8, 260], pg: 1, t: [-120, 210, -330], el: 3, az: -20, turb: 6, ray: 2.8, exp: 0.5, fog: '#e2ae8c', dens: 0.0004, off: 0 },
  safari: { p: [-756, 1.1, 14], pg: 1, t: [-722, 0.5, -16], tg: 1, el: 13, az: -12, turb: 5, ray: 2, exp: 0.34, fog: '#d6c4a4', dens: 0.0005, off: 0.15 },
  kili: { p: [-980, 190, 520], t: [-60, 260, -330], el: 50, az: 70, turb: 3, ray: 1.2, exp: 0.25, fog: '#c3d4e2', dens: 0.00028, off: 0.15 },
  zanzibar: { p: [604, 6, 10], t: [720, 1, -130], el: 35, az: 165, turb: 2.5, ray: 1.2, exp: 0.19, fog: '#bcd6e2', dens: 0.00022, off: 0.15 },
  combo: { p: [1015, 22, 400], t: [820, 2, 565], el: 2.5, az: 178, turb: 8, ray: 3, exp: 0.55, fog: '#e0956a', dens: 0.0006, off: 0.15 },
  arc: { p: [1030, 30, 380], t: [815, 2, 555], el: -3, az: 168, turb: 7, ray: 2.5, exp: 0.75, fog: '#5a4a5e', dens: 0.0006, off: 0.15 },
  book: { p: [1040, 36, 360], t: [810, 2, 545], el: -11, az: 160, turb: 6, ray: 2, exp: 0.9, fog: '#111a2c', dens: 0.0006, off: 0.12 },
};

export function createLanding({ canvas, sections, onScene }) {
  const mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V3 = THREE.Vector3, PI = Math.PI;

  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  R.setPixelRatio(pr);
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 0.5;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0xe2ae8c, 0.00055);
  scene.fog = fog;
  const cam = new THREE.PerspectiveCamera(45, 1, 0.5, 20000);

  // ---------- noise ----------
  let seed = 7;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };

  // ---------- the land ----------
  const MK = { x: 0, z: -350 }; // Kilimanjaro
  const coastX = (x, z) => x + 45 * Math.sin(z * 0.0035) + (fbm(x * 0.006 + 3, z * 0.006, 3) - 0.5) * 60;
  const cityMask = (x, z) => { const e = ((x - 800) / 210) ** 2 + ((z - 540) / 170) ** 2; return sst(1.1, 0.8, e); };
  function hgt(x, z) {
    let h = 14 + (fbm(x * 0.004, z * 0.004, 4) - 0.5) * 22 + (fbm(x * 0.02 + 7, z * 0.02, 3) - 0.5) * 3;
    const dx = x - MK.x, dz = z - MK.z, r = Math.hypot(dx, dz);
    h += 470 * Math.min(1, 1.22 * Math.pow(sst(1000, 0, r), 2.4)); // broad, flat-topped Kibo
    const rg = 1 - Math.abs(2 * fbm(x * 0.006 + 11, z * 0.006, 4) - 1);
    h += (rg - 0.55) * 70 * sst(120, 380, r) * sst(1000, 620, r); // ridges and valleys on the flanks
    h -= 18 * sst(70, 30, Math.hypot(dx + 10, dz + 20)); // Kibo crater
    const ang = Math.atan2(dz, dx);
    h += Math.sin(ang * 26 + fbm(x * 0.01, z * 0.01, 3) * 6) * 10 * sst(150, 450, r) * sst(1000, 500, r); // gullies
    const rw = Math.hypot(x - 260, z + 260);
    h += 170 * Math.exp(-(rw * rw) / 8100) * (0.6 + 0.8 * fbm(x * 0.03, z * 0.03, 4)); // Mawenzi
    const xc = coastX(x, z);
    const plain = sst(600, 420, xc);
    h = h * plain + (3 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.6) * (1 - plain); // coastal plain and dunes
    const land = sst(660, 590, xc);
    h = h * land - 28 * (1 - land); // sea floor
    const m = cityMask(x, z);
    return h * (1 - m) + (3.6 + fbm(x * 0.02, z * 0.02, 2) * 1.2) * m;
  }

  // ---------- procedural textures ----------
  function periodicHeight(size, freq, oct) {
    const g = new Float32Array(size * size);
    const pn = (x, y, p) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const H = (a, b) => hash(((a % p) + p) % p, ((b % p) + p) % p);
      const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0, a = 0.5, f = freq;
      for (let o = 0; o < oct; o++) { s += a * pn(x / size * f, y / size * f, f); f *= 2; a *= 0.5; }
      g[y * size + x] = s;
    }
    return g;
  }
  function normalTex(hf, size, strength) {
    const d = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = (i, j) => hf[((j + size) % size) * size + ((i + size) % size)];
      const nx = (h(x - 1, y) - h(x + 1, y)) * strength, ny = (h(x, y - 1) - h(x, y + 1)) * strength, l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    const t = new THREE.DataTexture(d, size, size);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }
  function waveHeights(size) { // tileable ripples for the sea
    const g = new Float32Array(size * size), W = [];
    for (let i = 0; i < 24; i++) W.push([Math.round((rnd() - 0.5) * 16) || 1, Math.round((rnd() - 0.5) * 16), rnd() * 6.28, 1 / (1 + i * 0.35)]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let s = 0; for (const [kx, ky, ph, a] of W) s += a * Math.sin(2 * PI * (kx * x + ky * y) / size + ph); g[y * size + x] = s; }
    return g;
  }
  const detailH = periodicHeight(256, 8, 5);
  const detailNormal = normalTex(detailH, 256, 6);
  const detailMap = (() => {
    const d = new Uint8Array(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) { const v = 200 + detailH[i] * 55; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.min(255, v); d[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(d, 256, 256); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  })();
  const waterNormals = normalTex(waveHeights(256), 256, 0.35);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const cloudTex = canvasTex(256, 128, (g) => {
    for (let i = 0; i < 40; i++) {
      const x = 50 + rnd() * 156, y = 48 + rnd() * 40, r = Math.min(16 + rnd() * 34, x - 2, 254 - x, y - 2, 126 - y), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
  });

  // ---------- terrain mesh ----------
  const TW = 3400, TD = 2600, TX = -50, TZ = 60, SX = mobile ? 260 : 440, SZ = mobile ? 200 : 340;
  const tg = new THREE.PlaneGeometry(TW, TD, SX, SZ);
  tg.rotateX(-PI / 2); tg.translate(TX, 0, TZ);
  const tp = tg.attributes.position, N = tp.count;
  for (let i = 0; i < N; i++) tp.setY(i, hgt(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  const P = (h) => new THREE.Color(h);
  const C = {
    grassA: P(0xb39a5c), grassB: P(0x8e8a4e), dirt: P(0x9c7b52), forest: P(0x34502c), moor: P(0x7b7853), rock: P(0x6b625a), rock2: P(0x4f4842),
    snow: P(0xf2f4f7), lush: P(0x4c7a35), sand: P(0xe6d5ad), wet: P(0xbca47c), shallow: P(0xd2c49a), deep: P(0x2c5a5a), city: P(0xa59e92),
  };
  const nm = tg.attributes.normal, col = new Float32Array(N * 3), c = new THREE.Color(), k = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = tp.getX(i), z = tp.getZ(i), h = tp.getY(i), ny = nm.getY(i), xc = coastX(x, z), r = Math.hypot(x - MK.x, z - MK.z);
    const n1 = fbm(x * 0.01 + 50, z * 0.01, 3), n2 = fbm(x * 0.03, z * 0.03 + 9, 3);
    c.copy(C.grassA).lerp(C.grassB, n1); c.lerp(C.dirt, sst(0.6, 0.75, n2) * 0.6);
    const mt = sst(1000, 800, r);
    c.lerp(C.forest, mt * sst(105, 135, h) * (1 - sst(225, 265, h)));
    c.lerp(C.moor, mt * sst(235, 275, h));
    c.lerp(k.copy(C.rock).lerp(C.rock2, n2), Math.max(mt * sst(315, 360, h), sst(0.8, 0.6, ny) * 0.8));
    c.lerp(C.snow, sst(418, 440, h + (n2 - 0.5) * 30) * sst(0.5, 0.75, ny));
    c.lerp(C.lush, sst(380, 520, xc) * (1 - sst(565, 588, xc)));
    c.lerp(C.sand, sst(570, 592, xc) * sst(9, 5, h));
    c.lerp(C.wet, sst(1.6, 0.6, h));
    if (h < 0) c.copy(C.shallow).lerp(C.deep, sst(0, -18, h));
    c.lerp(C.city, sst(0.65, 0.85, cityMask(x, z)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  detailMap.repeat.set(TW / 12, TD / 12); detailNormal.repeat.copy(detailMap.repeat);
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: detailMap, normalMap: detailNormal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.95 }));
  terrain.receiveShadow = true;
  scene.add(terrain);
  const farLand = new THREE.Mesh(new THREE.PlaneGeometry(20000, 40000), new THREE.MeshStandardMaterial({ color: 0x9c8c58, roughness: 1 }));
  farLand.rotation.x = -PI / 2; farLand.position.set(300 - 10000, 2, 0); scene.add(farLand);

  // ---------- sea ----------
  const sunDir = new V3(1, 0.1, 0);
  const water = new Water(new THREE.PlaneGeometry(20000, 20000), {
    textureWidth: mobile ? 256 : 512, textureHeight: mobile ? 256 : 512, waterNormals, sunDirection: sunDir.clone(),
    sunColor: 0xffffff, waterColor: 0x0f6f78, distortionScale: 3.2, fog: true, alpha: 0.86,
  });
  water.rotation.x = -PI / 2;
  water.material.transparent = true;
  water.material.uniforms.size.value = 4;
  scene.add(water);

  // ---------- geometry helpers ----------
  const tint = (g, hex) => {
    g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
    const cc = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const vmat = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9 }, o));
  const dummy = new THREE.Object3D();
  function instanced(geo, mat, list, cast) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.r || 0, 0);
      dummy.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); if (p.c) m.setColorAt(i, p.c);
    });
    m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m;
  }
  const at = (x, z, extra) => Object.assign({ x, y: hgt(x, z), z, r: rnd() * 6.28 }, extra);
  const shade = (base, spread) => new THREE.Color(base).offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * spread);

  // acacia
  const acacia = (() => {
    const p = [];
    const tr = new THREE.CylinderGeometry(0.05, 0.09, 0.9, 6); tr.translate(0, 0.45, 0); p.push(tint(tr, 0x4b3a2a));
    const b1 = new THREE.CylinderGeometry(0.025, 0.04, 0.55, 5); b1.rotateZ(0.7); b1.translate(0.17, 0.98, 0); p.push(tint(b1, 0x4b3a2a));
    const b2 = new THREE.CylinderGeometry(0.025, 0.04, 0.5, 5); b2.rotateZ(-0.6); b2.translate(-0.14, 0.96, 0.05); p.push(tint(b2, 0x4b3a2a));
    [[0, 0, 0.62], [0.32, 0.06, 0.4], [-0.3, -0.08, 0.42], [0.05, 0.3, 0.38]].forEach(([dx, dz, r]) => { const s = new THREE.SphereGeometry(r, 14, 6); s.scale(1, 0.22, 1); s.translate(dx, 1.22, dz); p.push(tint(s, 0x56662f)); });
    return mergeGeometries(p);
  })();
  const savanna = (x, z) => coastX(x, z) < 380 && Math.hypot(x - MK.x, z - MK.z) > 850;
  const camSafari = new V3(-756, 0, 14), camHero = new V3(-1150, 0, 260);
  const trees = [];
  for (let i = 0; trees.length < (mobile ? 1100 : 2600) && i < 60000; i++) {
    const x = -1600 + rnd() * 1500, z = -900 + rnd() * 1600;
    if (!savanna(x, z) || fbm(x * 0.008, z * 0.008, 2) < 0.48 || rnd() < 0.5) continue;
    trees.push(at(x, z, { s: 0.7 + rnd() * 0.5, c: shade(0xffffff, 0.15) }));
  }
  for (let i = 0; i < 260; i++) { const a = rnd() * 6.28, d = 30 + rnd() * 160, x = -722 + Math.cos(a) * d, z = -16 + Math.sin(a) * d; if (Math.hypot(x - camSafari.x, z - camSafari.z) > 25) trees.push(at(x, z, { s: 0.7 + rnd() * 0.5, c: shade(0xffffff, 0.15) })); }
  instanced(acacia, vmat(), trees, true);

  // bushes and grass
  const bushGeo = tint(new THREE.IcosahedronGeometry(0.22, 1).scale(1, 0.6, 1).translate(0, 0.08, 0), 0x5e6a33);
  const bushes = [];
  for (let i = 0; bushes.length < (mobile ? 2500 : 6000) && i < 50000; i++) { const x = -1600 + rnd() * 1700, z = -900 + rnd() * 1600; if (savanna(x, z)) bushes.push(at(x, z, { s: 0.6 + rnd(), c: shade(0xffffff, 0.2) })); }
  instanced(bushGeo, vmat(), bushes, false);
  const grassGeo = mergeGeometries([0, 1, 2].map((i) => { const g = new THREE.ConeGeometry(0.012, 0.16, 3); g.translate(0, 0.08, 0); g.rotateZ((i - 1) * 0.3); g.rotateY(i * 2.1); return tint(g, 0xc9ad6a); }));
  const grass = [];
  const tufts = (cx, cz, rad, n) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; grass.push(at(x, z, { s: 0.7 + rnd() * 0.8, c: shade(0xffffff, 0.25) })); } };
  tufts(-740, -5, 110, mobile ? 6000 : 18000); tufts(camHero.x + 60, camHero.z - 30, 160, mobile ? 4000 : 12000);
  const grassMesh = instanced(grassGeo, vmat({ roughness: 1 }), grass, false);

  // animals near the safari viewpoint
  const giraffeGeo = (() => {
    const p = [], sk = 0xc8964f;
    const b = new THREE.SphereGeometry(0.16, 12, 8); b.scale(1.4, 0.8, 0.7); b.translate(0, 0.42, 0); p.push(tint(b, sk));
    const n = new THREE.CylinderGeometry(0.03, 0.05, 0.44, 7); n.rotateZ(-0.45); n.translate(0.2, 0.66, 0); p.push(tint(n, sk));
    const hd = new THREE.SphereGeometry(0.05, 8, 6); hd.scale(1.6, 0.8, 0.8); hd.translate(0.32, 0.87, 0); p.push(tint(hd, sk));
    [[0.13, 0.06], [0.13, -0.06], [-0.14, 0.06], [-0.14, -0.06]].forEach(([x, z]) => { const l = new THREE.CylinderGeometry(0.015, 0.02, 0.36, 5); l.translate(x, 0.18, z); p.push(tint(l, 0xb98a4c)); });
    return mergeGeometries(p);
  })();
  const elephantGeo = (() => {
    const p = [], sk = 0x6d6762;
    const b = new THREE.SphereGeometry(0.2, 14, 10); b.scale(1.3, 1, 0.9); b.translate(0, 0.42, 0); p.push(tint(b, sk));
    const hd = new THREE.SphereGeometry(0.13, 12, 8); hd.translate(0.27, 0.47, 0); p.push(tint(hd, sk));
    [-1, 1].forEach((s) => { const e = new THREE.SphereGeometry(0.12, 10, 8); e.scale(0.25, 1, 1); e.translate(0.22, 0.48, s * 0.12); p.push(tint(e, 0x635d58)); });
    const tr = new THREE.CylinderGeometry(0.025, 0.05, 0.32, 7); tr.rotateZ(0.2); tr.translate(0.38, 0.3, 0); p.push(tint(tr, sk));
    [[0.14, 0.09], [0.14, -0.09], [-0.14, 0.09], [-0.14, -0.09]].forEach(([x, z]) => { const l = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8); l.translate(x, 0.15, z); p.push(tint(l, sk)); });
    return mergeGeometries(p);
  })();
  const herd = [
    ...[[-741, -1], [-735, -7], [-746, -11], [-729, -3], [-752, -19]].map(([x, z]) => ({ geo: 'g', x, z, s: 0.65 + rnd() * 0.15 })),
    ...[[-724, -21], [-717, -13], [-713, -26], [-730, -29], [-709, -18], [-721, -34]].map(([x, z]) => ({ geo: 'e', x, z, s: 0.5 + rnd() * 0.12 })),
  ].map((a) => ({ ...a, r: -0.6 + (rnd() - 0.5) * 0.8, ph: rnd() * 6 }));
  const giraffes = instanced(giraffeGeo, vmat(), herd.filter((a) => a.geo === 'g').map((a) => at(a.x, a.z, { s: a.s, r: a.r })), true);
  const elephants = instanced(elephantGeo, vmat(), herd.filter((a) => a.geo === 'e').map((a) => at(a.x, a.z, { s: a.s, r: a.r })), true);

  // mountain forest belt
  const forestGeo = mergeGeometries([
    tint(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 5).translate(0, 0.2, 0), 0x3d2e22),
    tint(new THREE.SphereGeometry(0.35, 10, 7).scale(1, 1.3, 1).translate(0, 0.7, 0), 0x2f4a27),
  ]);
  const forest = [];
  for (let i = 0; forest.length < (mobile ? 2000 : 5000) && i < 80000; i++) {
    const a = rnd() * 6.28, d = 380 + rnd() * 600, x = MK.x + Math.cos(a) * d, z = MK.z + Math.sin(a) * d, h = hgt(x, z);
    if (h > 115 && h < 245 && coastX(x, z) < 420) forest.push({ x, y: h, z, r: rnd() * 6.28, s: 2 + rnd() * 2, c: shade(0xffffff, 0.2) });
  }
  instanced(forestGeo, vmat(), forest, true);

  // palms along the beach and city waterfront
  const palmGeo = (() => {
    const p = [], curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0.08, 0.7, 0), new V3(0.28, 1.4, 0), new V3(0.5, 1.9, 0)]);
    p.push(tint(new THREE.TubeGeometry(curve, 10, 0.05, 6), 0x8a7458));
    const top = curve.getPoint(1);
    for (let i = 0; i < 9; i++) {
      const f = new THREE.PlaneGeometry(1.1, 0.24, 8, 1); f.rotateX(-PI / 2); f.translate(0.55, 0, 0);
      const fp = f.attributes.position;
      for (let j = 0; j < fp.count; j++) { const x = fp.getX(j); fp.setZ(j, fp.getZ(j) * (1 - x / 1.25)); fp.setY(j, 0.25 * x - 0.55 * x * x); }
      f.rotateY(i / 9 * PI * 2 + rnd() * 0.3); f.translate(top.x, top.y, top.z); f.computeVertexNormals(); p.push(tint(f, 0x3f7a35));
    }
    return mergeGeometries(p);
  })();
  const palms = [];
  for (let i = 0; palms.length < (mobile ? 260 : 520) && i < 60000; i++) {
    const x = 520 + rnd() * 420, z = -700 + rnd() * 1450, xc = coastX(x, z), h = hgt(x, z), m = cityMask(x, z);
    if ((xc > 540 && xc < 594 && h > 1.6) || (m > 0.45 && m < 0.7 && h > 1.4)) palms.push({ x, y: h, z, r: rnd() * 6.28, s: 0.8 + rnd() * 0.5 });
  }
  instanced(palmGeo, vmat({ side: THREE.DoubleSide }), palms, true);

  // dhows on the water
  const dhowGeo = (() => {
    const hull = new THREE.SphereGeometry(0.5, 14, 6, 0, PI * 2, PI / 2, PI / 2); hull.scale(1.4, 0.35, 0.45); hull.translate(0, 0.12, 0);
    const mast = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4); mast.translate(0, 0.8, 0);
    const sh = new THREE.Shape(); sh.moveTo(-0.6, 0.25); sh.lineTo(0.7, 0.3); sh.lineTo(-0.1, 1.6); sh.lineTo(-0.6, 0.25);
    return mergeGeometries([tint(hull, 0x6b4a2e), tint(mast, 0x4a3828), tint(new THREE.ShapeGeometry(sh), 0xf1e6cc)]);
  })();
  const boats = [[650, -120], [672, -60], [640, -170], [700, -10], [735, 360], [720, 395], [760, 340], [690, 300], [880, 330], [940, 390]].map(([x, z]) => ({ x, z, r: rnd() * 6.28, ph: rnd() * 6 }));
  const dhows = instanced(dhowGeo, vmat({ side: THREE.DoubleSide }), boats.map((b) => ({ ...b, y: 0, s: 1 })), true);

  // ---------- Stone Town ----------
  const facade = canvasTex(64, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#4a4038'; for (let r = 0; r < 6; r++) for (let q = 0; q < 4; q++) g.fillRect(6 + q * 15, 18 + r * 18, 8, 10); });
  const litTex = () => canvasTex(64, 128, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128); for (let r = 0; r < 6; r++) for (let q = 0; q < 4; q++) if (rnd() < 0.42) { g.fillStyle = `hsl(${32 + rnd() * 12},95%,${55 + rnd() * 20}%)`; g.fillRect(6 + q * 15, 18 + r * 18, 8, 10); } });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
  { const uv = boxGeo.attributes.uv; for (let i = 8; i < 16; i++) uv.setXY(i, 0.02, 0.98); } // roofs sample a plain corner
  const cityMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ map: facade, emissiveMap: litTex(), emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.9 }));
  const blocks = [[], [], []], lightsPos = [];
  const rot = 0.3, cr = Math.cos(rot), sr = Math.sin(rot), walls = [0xefe9dc, 0xe6d6b8, 0xd8bf92, 0xcfc8bb, 0xbfb3a0, 0xf4efe6];
  for (let gx = -90; gx <= 90; gx++) for (let gz = -75; gz <= 75; gz++) {
    const lx = gx * 2.6, lz = gz * 2.6, x = 800 + lx * cr - lz * sr, z = 540 + lx * sr + lz * cr, m = cityMask(x, z);
    if (m < 0.72) continue;
    // winding alleys instead of a grid: streets follow a noisy offset
    const sx = (gx + 200 + Math.round(Math.sin(gz * 0.37) * 1.6)) % 7, sz = (gz + 200 + Math.round(Math.sin(gx * 0.29) * 1.6)) % 7;
    if (sx === 0 || sz === 0) { if (rnd() < 0.18) lightsPos.push(x, hgt(x, z) + 0.6, z); continue; }
    if (rnd() < 0.1) continue; // courtyards
    const w = 1.2 + rnd() * 1.6, d = 1.2 + rnd() * 1.6, q = rnd(), hh = q < 0.05 ? 2.3 + rnd() * 1 : q < 0.35 ? 1.5 + rnd() * 0.7 : 0.6 + rnd() * 0.9;
    blocks[(rnd() * 3) | 0].push({ x: x + (rnd() - 0.5) * 0.9, y: hgt(x, z) - 0.2, z: z + (rnd() - 0.5) * 0.9, r: -rot + (rnd() - 0.5) * 0.3, sx: w, sy: hh, sz: d, c: new THREE.Color(walls[(rnd() * walls.length) | 0]).multiplyScalar(0.85 + rnd() * 0.2) });
  }
  blocks.forEach((b, i) => instanced(boxGeo, cityMats[i], b, true));
  for (let a = 0; a < 6.28; a += 0.018) { // waterfront promenade lamps
    const x = 800 + Math.cos(a) * 210 * 0.93, z = 540 + Math.sin(a) * 170 * 0.93;
    if (cityMask(x, z) > 0.2 && hgt(x, z) > 1) lightsPos.push(x, hgt(x, z) + 0.6, z);
  }
  const landmark = mergeGeometries([
    tint(new THREE.CylinderGeometry(0.18, 0.24, 3.6, 10).translate(0, 1.8, 0), 0xf3eee4),
    tint(new THREE.ConeGeometry(0.22, 0.7, 10).translate(0, 3.95, 0), 0xe2d6bf),
    tint(new THREE.SphereGeometry(0.9, 18, 8, 0, PI * 2, 0, PI / 2).translate(1.2, 1.4, 0), 0xf3eee4),
    tint(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 18).translate(1.2, 0.7, 0), 0xe9e1d2),
  ]);
  instanced(landmark, vmat(), [[760, 500], [830, 470], [810, 590], [740, 560], [870, 540]].map(([x, z]) => ({ x, y: hgt(x, z), z, r: rnd() * 6, s: 1.2 })), true);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lightsPos, 3));
  const lamps = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffc070, size: 1.1, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  scene.add(lamps);

  // ---------- clouds around the mountain ----------
  const clouds = [];
  for (let i = 0; i < (mobile ? 30 : 60); i++) {
    const a = rnd() * 6.28, d = 480 + rnd() * 520, m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.75 });
    const s = new THREE.Sprite(m), sc = 140 + rnd() * 160; s.scale.set(sc, sc * 0.4, 1);
    s.position.set(MK.x + Math.cos(a) * d, 165 + rnd() * 70, MK.z + Math.sin(a) * d); s.userData = { a, d, y: s.position.y, sp: (rnd() - 0.5) * 0.004 };
    scene.add(s); clouds.push(s);
  }

  // ---------- sky, stars, light ----------
  const sky = new Sky(); sky.scale.setScalar(15000); scene.add(sky);
  const su = sky.material.uniforms;
  su.cloudCoverage.value = 0.32; su.cloudDensity.value = 0.35; su.cloudElevation.value = 0.55;
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(15000); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(R); let envRT = null, lastEnv = { el: 999, az: 999, t: 0 };
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 2500; i++) { const u = rnd() * 0.95 + 0.05, t = rnd() * 6.283, rr = Math.sqrt(1 - u * u); sp.push(rr * Math.cos(t) * 6000, u * 6000, rr * Math.sin(t) * 6000); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x6b5a40, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 1, far: 900 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x8fa8d8, 0); moon.position.set(-300, 800, 500); scene.add(moon);

  // ---------- post ----------
  let composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(R);
    composer.addPass(new RenderPass(scene, cam));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- stations ----------
  const secs = [...sections];
  const views = secs.map((s) => {
    const v = ST[s.dataset.k] || ST.hero;
    const p = new V3(...v.p), t = new V3(...v.t);
    if (v.pg) p.y += hgt(p.x, p.z);
    if (v.tg) t.y += hgt(t.x, t.z);
    return { ...v, P: p, T: t, F: new THREE.Color(v.fog) };
  });
  const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  function station() {
    const mid = scrollY + innerHeight / 2, cs = secs.map((s) => s.offsetTop + s.offsetHeight / 2);
    if (mid <= cs[0]) return [0, 0, 0];
    let i = 0; while (i < cs.length - 2 && mid > cs[i + 1]) i++;
    return [i, Math.min(i + 1, cs.length - 1), ss(0.2, 0.8, (mid - cs[i]) / (cs[i + 1] - cs[i]))];
  }

  // ---------- sizing ----------
  let W = 1, H = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    R.setPixelRatio(pr); R.setSize(W, H, false);
    cam.aspect = W / H; cam.fov = W < H ? 60 : 45; cam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); bloom.setSize(W / 2, H / 2); }
  }
  addEventListener('resize', resize); resize();
  let mx = 0, my = 0;
  const onMove = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onMove);

  // ---------- frame ----------
  const cur = { p: views[0].P.clone(), t: views[0].T.clone() }, des = { p: new V3(), t: new V3() }, fwd = new V3();
  const fogC = new THREE.Color(), warm = new THREE.Color(0xffa060), white = new THREE.Color(0xfff2e2), wDay = new THREE.Color(0x0f6f78), wNight = new THREE.Color(0x06141c);
  const timer = new THREE.Timer(); let t = 0, raf = 0, lastScene = -1, slow = 0, frames = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update(); const raw = timer.getDelta(), dt = Math.min(raw, 0.1); if (!reduce) t += dt;
    const [a, b, f] = station(), A = views[a], B = views[b], prog = a + f;
    const L = (k) => A[k] + (B[k] - A[k]) * f;
    des.p.lerpVectors(A.P, B.P, f); des.t.lerpVectors(A.T, B.T, f);
    des.p.x += mx * 6; des.p.y -= my * 3;
    const k = reduce ? 1 : 1 - Math.pow(0.03, Math.min(raw, 1));
    cur.p.lerp(des.p, k); cur.t.lerp(des.t, k);
    cur.p.y = Math.max(cur.p.y, hgt(cur.p.x, cur.p.z) + 2, 2);
    cam.position.copy(cur.p); cam.lookAt(cur.t);
    const off = W < 760 ? 0 : L('off');
    if (off > 0.001) cam.setViewOffset(W, H, -off * W, 0, W, H); else cam.clearViewOffset();

    // sun and sky
    const el = L('el') * PI / 180, az = L('az') * PI / 180;
    sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    su.sunPosition.value.copy(sunDir); su.turbidity.value = L('turb'); su.rayleigh.value = L('ray');
    su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.85; su.time.value = t;
    sky.position.copy(cam.position); stars.position.copy(cam.position);
    const elDeg = el * 180 / PI, day = sst(-4, 14, elDeg), night = sst(2, -8, elDeg);
    R.toneMappingExposure = L('exp');
    fogC.copy(A.F).lerp(B.F, f); fog.color.copy(fogC); fog.density = L('dens');
    sun.color.copy(warm).lerp(white, sst(2, 30, elDeg)); sun.intensity = 3.2 * sst(-1, 12, elDeg);
    fwd.subVectors(cur.t, cur.p).setY(0).normalize();
    sun.target.position.copy(cur.p).addScaledVector(fwd, 150); sun.target.position.y = hgt(sun.target.position.x, sun.target.position.z);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 450);
    hemi.color.copy(fogC).lerp(white, 0.4 * day); hemi.intensity = 0.25 + 0.55 * day;
    moon.intensity = 0.5 * night;
    scene.environmentIntensity = 0.2 + 0.8 * day;
    stars.material.opacity = night;
    lamps.material.opacity = sst(8, -2, elDeg);
    cityMats.forEach((m) => (m.emissiveIntensity = 2.6 * sst(6, -4, elDeg)));
    if (bloom) { bloom.strength = 0.25 + 0.6 * night; bloom.threshold = 0.9 - 0.2 * night; }
    const now = performance.now();
    if ((Math.abs(elDeg - lastEnv.el) > 0.6 || Math.abs(az - lastEnv.az) > 0.05) && now - lastEnv.t > 150) {
      const eu = envSky.material.uniforms; ['sunPosition', 'turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach((n) => { if (eu[n].value.copy) eu[n].value.copy(su[n].value); else eu[n].value = su[n].value; });
      eu.cloudCoverage.value = 0;
      const rt = pmrem.fromScene(envScene); envRT?.dispose(); envRT = rt; scene.environment = rt.texture;
      lastEnv = { el: elDeg, az, t: now };
    }

    // water
    water.visible = prog > 1.4;
    if (water.visible) {
      const wu = water.material.uniforms;
      wu.time.value = t * 0.6; wu.sunDirection.value.copy(sunDir); wu.sunColor.value.copy(sun.color).multiplyScalar(0.6 + 0.4 * day);
      wu.waterColor.value.copy(wDay).lerp(wNight, night);
    }
    grassMesh.visible = prog < 1.6; giraffes.visible = elephants.visible = prog < 2.2;

    // life
    if (!reduce && prog < 2.2) {
      herd.forEach((h, i) => {
        h.x += Math.cos(h.r) * dt * 0.05; h.z -= Math.sin(h.r) * dt * 0.05;
        dummy.position.set(h.x, hgt(h.x, h.z), h.z); dummy.rotation.set(0, h.r, Math.sin(t * 0.8 + h.ph) * 0.02); dummy.scale.setScalar(h.s); dummy.updateMatrix();
        const mesh = h.geo === 'g' ? giraffes : elephants, idx = herd.filter((q, j) => q.geo === h.geo && j < i).length;
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      giraffes.instanceMatrix.needsUpdate = elephants.instanceMatrix.needsUpdate = true;
    }
    if (!reduce && prog > 1.4) {
      boats.forEach((b, i) => { dummy.position.set(b.x, Math.sin(t * 1.3 + b.ph) * 0.05, b.z); dummy.rotation.set(Math.sin(t * 0.9 + b.ph) * 0.05, b.r, Math.sin(t * 1.1 + b.ph) * 0.06); dummy.scale.setScalar(1); dummy.updateMatrix(); dhows.setMatrixAt(i, dummy.matrix); });
      dhows.instanceMatrix.needsUpdate = true;
    }
    clouds.forEach((s) => { const u = s.userData; if (!reduce) u.a += u.sp * dt; s.position.set(MK.x + Math.cos(u.a) * u.d, u.y, MK.z + Math.sin(u.a) * u.d); s.material.color.copy(fogC).lerp(white, 0.5 * day).multiplyScalar(0.35 + 0.65 * day); });

    const sceneIdx = f < 0.5 ? a : b;
    if (sceneIdx !== lastScene) { lastScene = sceneIdx; onScene?.(sceneIdx); }

    if (composer) composer.render(); else R.render(scene, cam);

    // keep it smooth on slower machines
    frames++; if (dt > 0.034) slow++;
    if (frames === 120) { if (slow > 60 && pr > 1) { pr = Math.max(1, pr - 0.35); resize(); } frames = slow = 0; }
  }
  frame();

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize); removeEventListener('pointermove', onMove);
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); }); });
    envRT?.dispose(); pmrem.dispose(); composer?.dispose(); water.material.dispose(); R.dispose();
  };
}
