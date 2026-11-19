import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MOMENTS, ORDER, fmtTime } from './safari';

// A stretch of East African savanna at walking scale. 1 unit = 1 m. East is +x, north is -z.
// Baobab woodland in the west (Tarangire), open plains with the migration in the middle,
// a river the herds cross, granite kopjes with lions, and a tented camp.
export function createSafari(root, { moment: initial, onMoment, onExit }) {
  const $ = (s) => root.querySelector(s);
  const canvas = $('#zv');
  const mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V3 = THREE.Vector3, PI = Math.PI;

  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  R.setPixelRatio(pr);
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0xd8c4a0, 0.0007);
  scene.fog = fog;
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 12000);

  // ---------- noise ----------
  let seed = 23;
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
  const zr = (x) => 150 + 50 * Math.sin(x * 0.005 + 0.6) + 20 * Math.sin(x * 0.013); // the river
  const WATER = -1.8;
  const KOPJES = [{ x: 320, z: -110, r: 38, h: 13 }, { x: 470, z: -330, r: 26, h: 8 }, { x: -130, z: -660, r: 34, h: 11 }, { x: 760, z: 320, r: 30, h: 10 }];
  const CAMP = new V3(420, 0, -250);
  function hgt(x, z) {
    let h = 4 + (fbm(x * 0.0022, z * 0.0022, 4) - 0.5) * 22 + (fbm(x * 0.013 + 3, z * 0.013, 3) - 0.5) * 2.5;
    const dr = Math.abs(z - zr(x));
    const bed = -3.6 * sst(19, 5, dr) + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 0.6;
    h = h + (bed - h) * sst(80, 22, dr); // a flat floodplain, then the channel
    for (const k of KOPJES) { const d2 = (x - k.x) ** 2 + (z - k.z) ** 2; h += k.h * Math.exp(-d2 / (k.r * k.r)); }
    h += (0.8 - h) * sst(30, 12, Math.hypot(x - CAMP.x, z - CAMP.z)) * 0.0; // camp sits on whatever is there
    return h;
  }

  // ---------- textures ----------
  function periodic(size, freq, oct, sd) {
    const g = new Float32Array(size * size);
    const pn = (x, y, p) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const H = (a, b) => hash(((a % p) + p) % p + sd, ((b % p) + p) % p);
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
  const dataTex = (d, size, srgb) => {
    const t = new THREE.DataTexture(d, size, size); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
  };
  function normalTex(hf, size, k) {
    const d = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = (i, j) => hf[((j + size) % size) * size + ((i + size) % size)];
      const nx = (h(x - 1, y) - h(x + 1, y)) * k, ny = (h(x, y - 1) - h(x, y + 1)) * k, l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    return dataTex(d, size);
  }
  const grainH = periodic(256, 12, 5, 0);
  const soilNormal = normalTex(grainH, 256, 3);
  const soilMap = (() => { const d = new Uint8Array(256 * 256 * 4); for (let i = 0; i < 65536; i++) { const v = Math.min(255, 200 + grainH[i] * 55); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } return dataTex(d, 256, true); })();
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

  // ---------- terrain ----------
  const TW = 2600, TD = 2400, TX = 0, TZ = -100, SX = mobile ? 260 : 520, SZ = mobile ? 240 : 480;
  const C = {
    grass: new THREE.Color(0xbfa35e), grass2: new THREE.Color(0xa08a4c), green: new THREE.Color(0x7d7f44), soil: new THREE.Color(0x9a6c48),
    wood: new THREE.Color(0x9a8a58), mud: new THREE.Color(0x6a5642), rock: new THREE.Color(0x8b8276),
  };
  function colorAt(x, z, h, nrmY, c) {
    const n = fbm(x * 0.01, z * 0.01, 3), n2 = fbm(x * 0.04 + 7, z * 0.04, 2);
    c.copy(C.grass).lerp(C.grass2, n2);
    c.lerp(C.green, sst(0.55, 0.75, n) * 0.6);
    c.lerp(C.wood, sst(-380, -520, x) * 0.6);
    c.lerp(C.soil, sst(0.66, 0.78, n2) * 0.5);
    const dr = Math.abs(z - zr(x)); c.lerp(C.mud, sst(26, 14, dr));
    for (const k of KOPJES) c.lerp(C.rock, sst(k.r * 0.9, k.r * 0.45, Math.hypot(x - k.x, z - k.z)) * 0.8);
    c.lerp(C.rock, sst(0.92, 0.8, nrmY) * 0.6);
    return c;
  }
  function terrainGeo(w, d, cx, cz, sx, sz, drop) {
    const g = new THREE.PlaneGeometry(w, d, sx, sz); g.rotateX(-PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position, n = p.count;
    for (let i = 0; i < n; i++) p.setY(i, hgt(p.getX(i), p.getZ(i)) - drop);
    g.computeVertexNormals();
    const nm = g.attributes.normal, col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { colorAt(p.getX(i), p.getZ(i), p.getY(i), nm.getY(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  soilMap.repeat.set(TW / 4, TD / 4); soilNormal.repeat.copy(soilMap.repeat);
  const tgeo = terrainGeo(TW, TD, TX, TZ, SX, SZ, 0);
  const terrain = new THREE.Mesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: soilMap, normalMap: soilNormal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.97 }));
  terrain.receiveShadow = true; scene.add(terrain);
  scene.add(new THREE.Mesh(terrainGeo(11000, 11000, 0, -100, mobile ? 110 : 200, mobile ? 110 : 200, 0.8), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  // heights as a texture, so grass can sit on the ground entirely on the GPU
  const heightTex = (() => {
    const p = tgeo.attributes.position, w = SX + 1, h = SZ + 1, d = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = THREE.DataUtils.toHalfFloat(p.getY(i));
    const t = new THREE.DataTexture(d, w, h, THREE.RedFormat, THREE.HalfFloatType); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
  })();

  // the river
  const riverGeo = (() => {
    const pos = [], idx = []; let n = 0;
    for (let x = -1400; x <= 1400; x += 6) { const z = zr(x); pos.push(x, WATER, z - 24, x, WATER, z + 24); if (n) idx.push(n * 2 - 2, n * 2, n * 2 - 1, n * 2 - 1, n * 2, n * 2 + 1); n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const riverNormal = normalTex((() => { const s = 128, g = new Float32Array(s * s); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) g[y * s + x] = Math.sin(2 * PI * (x * 3 + y) / s) + 0.5 * Math.sin(2 * PI * (x * -5 + y * 7) / s) + 0.3 * Math.sin(2 * PI * (x * 11 - y * 4) / s); return g; })(), 128, 0.25);
  riverNormal.repeat.set(0.08, 0.08);
  const river = new THREE.Mesh(riverGeo, new THREE.MeshStandardMaterial({ color: 0x5a5034, roughness: 0.12, metalness: 0.0, normalMap: riverNormal, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.92 }));
  river.receiveShadow = true; scene.add(river);
  // world-space uv for the ripples so they can scroll
  { const p = riverGeo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); } riverGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }

  // ---------- geometry helpers ----------
  const U = { uTime: { value: 0 } };
  const part = (g, hex, leg = 0, hip = 0) => {
    g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
    const cc = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3), l = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; l[i * 2] = leg; l[i * 2 + 1] = hip; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('leg', new THREE.BufferAttribute(l, 2)); return g;
  };
  const tint = (g, hex) => part(g, hex);
  const ell = (rx, ry, rz, x, y, z, ws = 10, hs = 7) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz).translate(x, y, z);
  const limb = (r0, r1, a, b, seg = 5) => { const d = new V3().subVectors(b, a), g = new THREE.CylinderGeometry(r1, r0, d.length(), seg); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; };
  const vmat = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9 }, o));
  const dummy = new THREE.Object3D();
  function instanced(geo, mat, list, cast) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx || 0, p.r || 0, p.rz || 0);
      dummy.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); if (p.c) m.setColorAt(i, p.c);
    });
    m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m;
  }
  const shade = (base, spread) => new THREE.Color(base).offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * spread);
  const at = (x, z, o) => Object.assign({ x, y: hgt(x, z), z, r: rnd() * 6.28 }, o);
  const onKopje = (x, z) => KOPJES.some((k) => Math.hypot(x - k.x, z - k.z) < k.r * 0.9);
  const nearRiver = (x, z) => Math.abs(z - zr(x)) < 24;

  // swaying vegetation / walking animals, both done in the vertex shader
  function sway(m, amt) {
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = U.uTime;
      s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = 0.0;
        #ifdef USE_INSTANCING
        ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        #endif
        float sw = ${amt.toFixed(5)} * position.y * position.y;
        transformed.x += sw * (sin(uTime * 0.8 + ph) + 0.4 * sin(uTime * 2.1 + ph));
        transformed.z += sw * 0.5 * sin(uTime * 1.0 + ph * 1.3);`);
    };
    m.customProgramCacheKey = () => 'sway' + amt;
    return m;
  }
  function animalMat(step, bob, o) {
    const u = { uWalk: { value: 1 }, uStep: { value: step }, uBob: { value: bob } };
    const m = vmat(Object.assign({ roughness: 0.85 }, o));
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U, u);
      s.vertexShader = 'attribute vec2 leg;\nuniform float uTime, uWalk, uStep, uBob;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float iph = 0.0;
        #ifdef USE_INSTANCING
        iph = instanceMatrix[3].x * 0.71 + instanceMatrix[3].z * 0.37;
        #endif
        float cyc = uTime * uStep + iph;
        if (leg.x != 0.0) {
          float ph = cyc + (leg.x > 0.0 ? 0.0 : 3.14159);
          float k = clamp((leg.y - position.y) / leg.y, 0.0, 1.0);
          transformed.x += sin(ph) * uWalk * 0.3 * leg.y * k;
          transformed.y += max(0.0, cos(ph)) * uWalk * 0.05 * leg.y * k;
        } else {
          transformed.y += uWalk * uBob * sin(cyc * 2.0);
          // grazing animals dip their heads now and then
          float g = (1.0 - uWalk) * smoothstep(0.55, 0.95, sin(uTime * 0.35 + iph * 3.0));
          transformed.y -= g * max(0.0, position.x - uBob * 30.0) * 0.55;
        }`);
    };
    m.customProgramCacheKey = () => 'animal';
    m.userData.u = u;
    return m;
  }

  // ---------- trees, bush, rocks, termite mounds ----------
  const acaciaGeo = (() => {
    const p = [], brown = 0x4a3a2c;
    p.push(part(limb(0.18, 0.12, new V3(0, 0, 0), new V3(0.2, 3.2, 0), 6), brown));
    p.push(part(limb(0.1, 0.06, new V3(0.2, 3.0, 0), new V3(1.6, 4.6, 0.3), 5), brown));
    p.push(part(limb(0.1, 0.06, new V3(0.2, 3.0, 0), new V3(-1.3, 4.5, -0.6), 5), brown));
    p.push(part(limb(0.08, 0.05, new V3(0.2, 3.2, 0), new V3(0.4, 4.8, 1.4), 5), brown));
    [[0, 0, 3.4], [1.9, 0.4, 2.2], [-1.6, -0.7, 2.3], [0.5, 1.7, 2.0], [-0.3, -1.8, 1.9]].forEach(([x, z, r]) => p.push(part(ell(r, 0.55, r * 0.9, x, 5.0 + rnd() * 0.3, z, 14, 6), 0x5f6a2e)));
    return mergeGeometries(p);
  })();
  const baobabGeo = (() => {
    const prof = [[3.2, 0], [3.5, 1], [3.3, 3], [2.9, 6], [2.4, 8.5], [1.6, 10], [1.1, 10.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const trunk = new THREE.LatheGeometry(prof, 18); { const q = trunk.attributes.position; for (let i = 0; i < q.count; i++) { const a = Math.atan2(q.getZ(i), q.getX(i)), k = 1 + 0.08 * Math.sin(a * 7) + 0.05 * Math.sin(a * 13 + q.getY(i)); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k); } }
    const p = [part(trunk, 0x8c7f6e)];
    for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + rnd() * 0.4, s = new V3(Math.cos(a) * 0.8, 10.2, Math.sin(a) * 0.8), e = s.clone().add(new V3(Math.cos(a) * (2.5 + rnd() * 2), 1.5 + rnd() * 2, Math.sin(a) * (2.5 + rnd() * 2))); p.push(part(limb(0.45, 0.2, s, e, 6), 0x857867)); p.push(part(limb(0.18, 0.06, e, e.clone().add(new V3((rnd() - 0.5) * 2, 1.2, (rnd() - 0.5) * 2)), 4), 0x7d7060)); }
    return mergeGeometries(p);
  })();
  const trees = [], baobabs = [];
  for (let i = 0; trees.length < (mobile ? 900 : 2000) && i < 60000; i++) {
    const x = -1250 + rnd() * 2500, z = -1250 + rnd() * 2300, wood = sst(-300, -600, x);
    if (onKopje(x, z) || nearRiver(x, z) || Math.hypot(x - CAMP.x, z - CAMP.z) < 28) continue;
    if (rnd() > 0.25 + 0.6 * wood + 0.4 * sst(60, 30, Math.abs(z - zr(x))) || fbm(x * 0.006, z * 0.006, 2) < 0.45 - 0.2 * wood) continue;
    trees.push(at(x, z, { s: 0.7 + rnd() * 0.6, c: shade(0xffffff, 0.15) }));
  }
  for (let i = 0; baobabs.length < 70 && i < 9000; i++) { const x = -1250 + rnd() * 820, z = -800 + rnd() * 900; if (!nearRiver(x, z)) baobabs.push(at(x, z, { y: hgt(x, z) - 0.3, s: 0.8 + rnd() * 0.5, c: shade(0xffffff, 0.12) })); }
  instanced(acaciaGeo, sway(vmat(), 0.0012), trees, true);
  instanced(baobabGeo, vmat(), baobabs, true);
  const bushGeo = part(new THREE.IcosahedronGeometry(1, 1).scale(1.1, 0.7, 1.1).translate(0, 0.45, 0), 0xffffff);
  const bushes = [];
  for (let i = 0; bushes.length < (mobile ? 1800 : 4200) && i < 60000; i++) { const x = -1250 + rnd() * 2500, z = -1250 + rnd() * 2300; if (!onKopje(x, z) && !nearRiver(x, z) && fbm(x * 0.01 + 4, z * 0.01, 2) > 0.5) bushes.push(at(x, z, { s: 0.4 + rnd() * 1.1, c: shade(rnd() < 0.5 ? 0x5d6431 : 0x7a7240, 0.12) })); }
  instanced(bushGeo, vmat(), bushes, false);
  const boulderGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 3), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const v = new V3().fromBufferAttribute(q, i), k = 0.85 + fbm(v.x * 1.5 + 3, v.z * 1.5 + v.y, 3) * 0.3; q.setXYZ(i, v.x * k, v.y * k * 0.75, v.z * k); } g.computeVertexNormals(); return part(g, 0xffffff); })();
  const boulders = [];
  KOPJES.forEach((k) => { for (let i = 0; i < 34; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * k.r * 0.8, x = k.x + Math.cos(a) * d, z = k.z + Math.sin(a) * d, s = 2 + rnd() * 6 * (1 - d / k.r); boulders.push(at(x, z, { y: hgt(x, z) - s * 0.3, s, c: shade(rnd() < 0.3 ? 0x9a8f80 : 0x7f776c, 0.12) })); } });
  instanced(boulderGeo, vmat({ roughness: 0.95 }), boulders, true);
  const moundGeo = part(new THREE.ConeGeometry(1.1, 2.6, 9, 3).translate(0, 1.2, 0), 0xffffff);
  { const q = moundGeo.attributes.position; for (let i = 0; i < q.count; i++) { const y = q.getY(i), k = 1 + 0.25 * Math.sin(q.getX(i) * 5 + y * 3); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k); } moundGeo.computeVertexNormals(); }
  const mounds = [];
  for (let i = 0; mounds.length < 160 && i < 4000; i++) { const x = -1200 + rnd() * 2400, z = -1200 + rnd() * 2200; if (!nearRiver(x, z) && !onKopje(x, z)) mounds.push(at(x, z, { y: hgt(x, z) - 0.2, s: 0.6 + rnd() * 0.9, c: shade(0x9a6a48, 0.1) })); }
  instanced(moundGeo, vmat(), mounds, true);

  // ---------- grass that follows the camera (placed and bent on the GPU) ----------
  const GT = 80;
  const grassGeo = (() => {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const h = 0.45 + rnd() * 0.5, g = new THREE.PlaneGeometry(0.035, h, 1, 3); g.translate(0, h / 2, 0);
      const q = g.attributes.position; for (let j = 0; j < q.count; j++) { const y = q.getY(j) / h; q.setX(j, q.getX(j) * (1 - y * 0.9)); q.setZ(j, y * y * 0.12); }
      g.rotateY(i * 1.26 + rnd()); g.translate((rnd() - 0.5) * 0.15, 0, (rnd() - 0.5) * 0.15);
      const gg = g.toNonIndexed(); gg.deleteAttribute('uv'); const cl = new Float32Array(gg.attributes.position.count * 3), lo = new THREE.Color(0x6e5a30), hi = new THREE.Color(0xd8bc78), cc = new THREE.Color();
      for (let j = 0; j < gg.attributes.position.count; j++) { cc.copy(lo).lerp(hi, Math.min(1, gg.attributes.position.getY(j) / h * 1.2)); cl[j * 3] = cc.r; cl[j * 3 + 1] = cc.g; cl[j * 3 + 2] = cc.b; }
      gg.setAttribute('color', new THREE.BufferAttribute(cl, 3)); gg.computeVertexNormals(); parts.push(gg);
    }
    return mergeGeometries(parts);
  })();
  const GU = { uCam: { value: new THREE.Vector2() }, tH: { value: heightTex }, uHA: { value: new THREE.Vector4(TX - TW / 2, TZ - TD / 2, TW, TD) }, uRes: { value: new THREE.Vector2(SX, SZ) }, uOn: { value: 1 } };
  const grassMat = vmat({ side: THREE.DoubleSide, roughness: 1 });
  grassMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U, GU);
    s.vertexShader = 'uniform float uTime, uOn; uniform vec2 uCam, uRes; uniform vec4 uHA; uniform sampler2D tH;\n' + s.vertexShader.replace('#include <begin_vertex>', `
      vec3 base = instanceMatrix[3].xyz;
      float r1 = fract(sin(dot(base.xz, vec2(12.9898, 78.233))) * 43758.5453), r2 = fract(r1 * 91.7);
      vec2 w = mod(base.xz - uCam + ${GT / 2}.0, ${GT}.0) - ${GT / 2}.0 + uCam;
      float d = length(w - uCam), fade = 1.0 - smoothstep(${GT / 2 - 12}.0, ${GT / 2}.0, d);
      vec2 tuv = (w - uHA.xy) / uHA.zw; tuv = (tuv * uRes + 0.5) / (uRes + 1.0);
      float hy = texture2D(tH, tuv).r;
      float patchy = smoothstep(0.25, 0.6, fract(sin(dot(floor(w / 7.0), vec2(4.1, 7.3))) * 917.1));
      float camp = smoothstep(24.0, 34.0, length(w - vec2(${CAMP.x.toFixed(1)}, ${CAMP.z.toFixed(1)})));
      float sc = (0.6 + r2 * 0.9) * fade * uOn * (0.45 + 0.75 * patchy) * mix(0.18, 1.0, camp) * smoothstep(-1.2, -0.6, hy);
      float a = r1 * 6.2831, ca = cos(a), sa = sin(a);
      vec3 transformed = position * sc; transformed.xz = mat2(ca, -sa, sa, ca) * transformed.xz;
      float wv = sin(uTime * 1.5 + w.x * 0.13 + w.y * 0.09) * 0.6 + sin(uTime * 2.6 + w.x * 0.37) * 0.25;
      transformed.x += wv * 0.18 * transformed.y * transformed.y;
      transformed += vec3(w.x - base.x, hy - base.y - 0.03, w.y - base.z);
      #ifdef USE_COLOR
      vColor.rgb *= 0.82 + 0.35 * r2;
      #endif`);
  };
  grassMat.customProgramCacheKey = () => 'grassfield';
  const GN = mobile ? 26000 : 70000;
  const grassField = instanced(grassGeo, grassMat, Array.from({ length: GN }, () => ({ x: (rnd() - 0.5) * GT, y: 0, z: (rnd() - 0.5) * GT })), false);
  grassField.frustumCulled = false;

  // ---------- animals ----------
  const quad = (o) => { // a four-legged animal along +x; o: body, neck, head, legs, colours
    const p = [];
    p.push(part(ell(o.bl, o.bh, o.bw, 0, o.hip + o.bh * 0.55, 0, 12, 8), o.col));
    if (o.hump) p.push(part(ell(o.hump, o.hump * 0.9, o.bw * 0.95, o.bl * 0.45, o.hip + o.bh * 0.9, 0, 10, 7), o.col2 || o.col));
    p.push(part(limb(o.nr, o.nr * 0.75, new V3(o.bl * 0.7, o.hip + o.bh * 0.8, 0), o.neck), o.col2 || o.col));
    p.push(part(ell(o.hl, o.hh, o.hw, o.neck.x + o.hl * 0.6, o.neck.y - o.hh * 0.3, 0, 9, 6).rotateZ(0).translate(0, 0, 0), o.colH || o.col));
    const lx = o.bl * 0.62, lz = o.bw * 0.55;
    [[lx, lz, 1], [lx, -lz, -1], [-lx, lz, -1], [-lx, -lz, 1]].forEach(([x, z, s]) => p.push(part(limb(o.lr, o.lr * 0.7, new V3(x, o.hip + 0.05, z), new V3(x, 0, z), 5), o.colL || o.col, s, o.hip + 0.05)));
    p.push(part(limb(0.02, 0.015, new V3(-o.bl * 0.95, o.hip + o.bh * 0.8, 0), new V3(-o.bl * 1.15, o.hip * 0.55, 0), 4), o.col2 || o.col));
    if (o.extra) o.extra(p);
    return mergeGeometries(p);
  };
  const triColor = (g, fn) => { const q = g.attributes.position, c = g.attributes.color, l = g.attributes.leg, cc = new THREE.Color(); for (let i = 0; i < q.count; i += 3) { if (l.getX(i) !== 0 && fn.legs === false) continue; const x = (q.getX(i) + q.getX(i + 1) + q.getX(i + 2)) / 3, y = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3, z = (q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3; if (fn(x, y, z, cc)) for (let k = 0; k < 3; k++) c.setXYZ(i + k, cc.r, cc.g, cc.b); } return g; };
  const wildeGeo = quad({ bl: 0.85, bh: 0.42, bw: 0.3, hip: 0.82, hump: 0.4, col: 0x55504a, col2: 0x3e3a36, colH: 0x2e2b28, neck: new V3(1.15, 1.25, 0), nr: 0.16, hl: 0.3, hh: 0.14, hw: 0.12, lr: 0.05,
    extra: (p) => { p.push(part(limb(0.03, 0.01, new V3(1.3, 1.3, 0.08), new V3(1.35, 1.45, 0.22), 4), 0x2a2622)); p.push(part(limb(0.03, 0.01, new V3(1.3, 1.3, -0.08), new V3(1.35, 1.45, -0.22), 4), 0x2a2622)); p.push(part(ell(0.25, 0.08, 0.06, 1.2, 0.95, 0, 6, 4), 0x24211e)); } });
  const zebraGeo = triColor(quad({ bl: 0.85, bh: 0.45, bw: 0.32, hip: 0.8, col: 0xeeeae2, neck: new V3(1.1, 1.35, 0), nr: 0.17, hl: 0.3, hh: 0.14, hw: 0.12, lr: 0.05,
    extra: (p) => p.push(part(ell(0.35, 0.06, 0.05, 0.95, 1.4, 0, 6, 4).rotateZ(-0.5).translate(0.6, 0.5, 0), 0x222222)) }),
    (x, y, z, c) => { c.set(Math.sin(x * 16 + y * 6 + Math.abs(z) * 2) > 0.1 ? 0x1f1d1b : 0xf1ede4); return true; });
  const elephantGeo = quad({ bl: 1.55, bh: 1.1, bw: 0.95, hip: 1.6, col: 0x7a736c, neck: new V3(1.75, 2.75, 0), nr: 0.7, hl: 0.75, hh: 0.7, hw: 0.6, lr: 0.32,
    extra: (p) => {
      const c = new THREE.CatmullRomCurve3([new V3(2.5, 2.4, 0), new V3(2.85, 1.6, 0), new V3(2.9, 0.7, 0), new V3(3.1, 0.25, 0)]); p.push(part(new THREE.TubeGeometry(c, 10, 0.17, 6), 0x736c65));
      [1, -1].forEach((s) => { p.push(part(ell(0.12, 0.85, 0.75, 1.95, 2.5, s * 0.62, 8, 6), 0x6e675f)); p.push(part(limb(0.07, 0.03, new V3(2.55, 2.0, s * 0.25), new V3(3.15, 1.85, s * 0.35), 5), 0xece3d0)); });
    } });
  const giraffeGeo = triColor(quad({ bl: 0.95, bh: 0.5, bw: 0.4, hip: 1.95, col: 0xd0a060, neck: new V3(1.55, 4.75, 0), nr: 0.2, hl: 0.35, hh: 0.15, hw: 0.13, lr: 0.07,
    extra: (p) => { p.push(part(limb(0.03, 0.02, new V3(1.6, 4.85, 0.06), new V3(1.55, 5.1, 0.07), 4), 0x5a3a1e)); p.push(part(limb(0.03, 0.02, new V3(1.6, 4.85, -0.06), new V3(1.55, 5.1, -0.07), 4), 0x5a3a1e)); } }),
    (x, y, z, c) => { const n = Math.abs(Math.sin(x * 7.1) * Math.sin(y * 6.3) * Math.sin(z * 9.7 + x)); c.set(n > 0.18 ? 0x7a4a26 : 0xe2c08a); return y > 0.3; });
  const impalaGeo = triColor(quad({ bl: 0.55, bh: 0.26, bw: 0.18, hip: 0.6, col: 0xb47a4a, neck: new V3(0.75, 1.05, 0), nr: 0.07, hl: 0.17, hh: 0.08, hw: 0.07, lr: 0.025,
    extra: (p) => { [1, -1].forEach((s) => p.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0.85, 1.1, s * 0.04), new V3(0.8, 1.35, s * 0.12), new V3(0.88, 1.55, s * 0.06)]), 6, 0.012, 4), 0x2a2420))); } }),
    (x, y, z, c) => { if (y < 0.72 && y > 0.6) { c.set(0xf2ece0); return true; } return false; });
  const lionGeo = mergeGeometries([ // lying down
    part(ell(0.9, 0.32, 0.38, 0, 0.32, 0, 12, 8), 0xb88a4e), part(ell(0.42, 0.45, 0.42, 0.85, 0.62, 0, 10, 8), 0x7a5228),
    part(ell(0.28, 0.24, 0.24, 1.05, 0.62, 0, 9, 7), 0xc0935a), part(ell(0.3, 0.1, 0.12, 1.15, 0.12, 0.2, 6, 4), 0xb88a4e), part(ell(0.3, 0.1, 0.12, 1.15, 0.12, -0.2, 6, 4), 0xb88a4e),
    part(limb(0.04, 0.03, new V3(-0.85, 0.35, 0), new V3(-1.6, 0.1, 0.3), 4), 0xa47a44),
  ]);
  const hippoGeo = part(ell(1.6, 0.6, 0.85, 0, 0, 0, 12, 6), 0x6e5f5a);
  const blobGeo = new THREE.CircleGeometry(1, 12).rotateX(-PI / 2);
  const blobTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  { const uv = blobGeo.attributes.uv; } // circle keeps its uvs for the soft shadow texture

  // the migration: a living column streaming north across the river
  const NW = mobile ? 900 : 2600, NZ = mobile ? 120 : 320, NG = mobile ? 300 : 700;
  const colX = (z) => 40 + 70 * Math.sin(z * 0.004);
  const colW = (z) => 22 + 120 * sst(30, 260, Math.abs(z - zr(colX(z))));
  const LEN = 1500;
  const herd = [];
  for (let i = 0; i < NW + NZ; i++) herd.push({ s0: rnd() * LEN, o: (rnd() + rnd() + rnd() - 1.5) / 1.5, v: 1.3 + rnd() * 0.5, sc: 0.9 + rnd() * 0.2, zebra: i >= NW });
  const wildeMat = animalMat(5.2, 0.012), zebraMat = animalMat(5.0, 0.012);
  const wildeMesh = instanced(wildeGeo, wildeMat, herd.filter((h) => !h.zebra).map(() => ({ x: 0, y: -100, z: 0 })), false);
  const zebraMesh = instanced(zebraGeo, zebraMat, herd.filter((h) => h.zebra).map(() => ({ x: 0, y: -100, z: 0 })), false);
  const grazers = [];
  for (let i = 0; grazers.length < NG && i < 20000; i++) { const x = colX(0) + (rnd() - 0.5) * 700, z = -650 + rnd() * 1200; if (!nearRiver(x, z) && !onKopje(x, z)) grazers.push(at(x, z, { s: 0.9 + rnd() * 0.2, zebra: rnd() < 0.2 })); }
  const gzMat = animalMat(0, 0.012), gzZMat = animalMat(0, 0.012); gzMat.userData.u.uWalk.value = 0; gzZMat.userData.u.uWalk.value = 0;
  instanced(wildeGeo, gzMat, grazers.filter((g) => !g.zebra), false);
  instanced(zebraGeo, gzZMat, grazers.filter((g) => g.zebra), false);
  const blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), NW + NZ + NG);
  blobs.frustumCulled = false; scene.add(blobs);
  grazers.forEach((g, i) => { dummy.position.set(g.x, g.y + 0.08, g.z); dummy.rotation.set(0, g.r, 0); dummy.scale.set(1.1, 1, 0.5); dummy.updateMatrix(); blobs.setMatrixAt(NW + NZ + i, dummy.matrix); });

  // elephants among the baobabs, giraffes by the acacias, impala, lions on the kopje, hippos in the river
  const EL = new V3(-720, 0, -300), GI = new V3(-250, 0, -470);
  const eleList = Array.from({ length: 13 }, (_, i) => ({ a: i * 0.09 + rnd() * 0.04, off: (rnd() - 0.5) * 14, s: i < 3 ? 0.55 + rnd() * 0.1 : 0.85 + rnd() * 0.25 }));
  const eleMat = animalMat(1.5, 0.02);
  const eleMesh = instanced(elephantGeo, eleMat, eleList.map(() => ({ x: 0, y: 0, z: 0 })), true);
  const girList = Array.from({ length: 9 }, () => ({ a: rnd() * 6.28, rad: 15 + rnd() * 40, sp: (0.008 + rnd() * 0.01) * (rnd() < 0.5 ? -1 : 1), s: 0.85 + rnd() * 0.25 }));
  const girMat = animalMat(1.4, 0.02);
  const girMesh = instanced(giraffeGeo, girMat, girList.map(() => ({ x: 0, y: 0, z: 0 })), true);
  const impMat = animalMat(0, 0.01); impMat.userData.u.uWalk.value = 0;
  const impala = []; for (let i = 0; i < 60; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 45; impala.push(at(150 + Math.cos(a) * d, -380 + Math.sin(a) * d, { s: 0.9 + rnd() * 0.2 })); }
  instanced(impalaGeo, impMat, impala, true);
  const lions = [[312, -104, 0.4], [326, -112, 2.5], [318, -96, 1.2], [306, -116, 4], [331, -100, 5.2]].map(([x, z, r], i) => ({ x, z, r, s: i === 0 ? 1.15 : 0.85 + rnd() * 0.15 }));
  lions.forEach((l) => { l.y = hgt(l.x, l.z); boulders.forEach((b) => { const d = Math.hypot(l.x - b.x, l.z - b.z); if (d < b.s * 0.7) l.y = Math.max(l.y, b.y + b.s * 0.75 * Math.sqrt(Math.max(0, 1 - (d / b.s) ** 2))); }); });
  const lionMesh = instanced(lionGeo, vmat({ roughness: 0.85 }), lions, true);
  const hippos = Array.from({ length: 10 }, (_, i) => { const x = -230 + i * 12 + rnd() * 6, z = zr(x) + (rnd() - 0.5) * 14; return { x, z, r: rnd() * 6, ph: rnd() * 6 }; });
  const hippoMesh = instanced(hippoGeo, vmat({ roughness: 0.4 }), hippos.map((h) => ({ ...h, y: WATER })), false);
  // vultures riding a thermal
  const vultureGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.1, 0.15); s.lineTo(0.2, 0.35); s.lineTo(0, 0.6); s.lineTo(-0.2, 0.35); s.lineTo(-1.1, 0.15); s.lineTo(0, 0); return part(new THREE.ShapeGeometry(s).rotateX(-PI / 2), 0x2a2522); })();
  const vultures = Array.from({ length: 11 }, () => ({ a: rnd() * 6.28, rad: 20 + rnd() * 50, h: 120 + rnd() * 90, sp: 0.12 + rnd() * 0.08 }));
  const vulMesh = instanced(vultureGeo, vmat({ side: THREE.DoubleSide }), vultures.map(() => ({ x: 0, y: 0, z: 0 })), false);

  // ---------- the game-drive track ----------
  const trackPts = [[-820, -360], [-720, -220], [-600, -260], [-470, -400], [-300, -500], [-170, -420], [-20, -300], [120, -200], [250, -40], [170, 70], [70, 110], [-60, 100], [-200, 60], [-120, -60], [60, -80], [260, -170], [420, -190], [480, -300], [380, -400], [220, -470], [20, -600], [-250, -720], [-560, -640], [-800, -520]];
  const track = new THREE.CatmullRomCurve3(trackPts.map(([x, z]) => new V3(x, 0, z)), true, 'centripetal');
  const TL = track.getLength();
  const ruts = canvasTex(64, 128, (g) => { g.fillStyle = 'rgba(132,96,64,.95)'; g.fillRect(6, 0, 18, 128); g.fillRect(40, 0, 18, 128); g.fillStyle = 'rgba(150,120,70,.35)'; g.fillRect(24, 0, 16, 128); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${90 + rnd() * 60 | 0},${70 + rnd() * 40 | 0},${40 + rnd() * 30 | 0},.5)`; g.fillRect(rnd() * 64, rnd() * 128, 2, 2); } });
  ruts.wrapT = THREE.RepeatWrapping;
  {
    const pos = [], uv = [], idx = [], N = Math.round(TL / 2); const tan = new V3();
    for (let i = 0; i <= N; i++) { const u = i / N, p = track.getPointAt(u); track.getTangentAt(u, tan); const nx = -tan.z, nz = tan.x, l = Math.hypot(nx, nz) || 1;
      for (const s of [-1.7, 1.7]) { const x = p.x + nx / l * s, z = p.z + nz / l * s; pos.push(x, hgt(x, z) + 0.12, z); uv.push(s < 0 ? 0 : 1, u * TL / 5); }
      if (i) { const a = i * 2 - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: ruts, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true; scene.add(m);
  }
  const nearestU = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i < 1500; i++) { const p = track.getPointAt(i / 1500), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i / 1500; } } return best; };
  const SIGHT = [
    { name: 'Elephant family', p: () => eleCenter, r: 75, note: 'A matriarch leads this family; the calves stay close to her legs.' },
    { name: 'Giraffes browsing', p: () => GI, r: 80, note: 'Giraffes feed on acacia leaves, working round the thorns with long, tough tongues.' },
    { name: 'Lions on the kopje', p: () => new V3(318, 0, -106), r: 80, note: 'Lions spend most of the day resting. Kopjes give them shade, a lookout and a breeze.' },
    { name: 'The river crossing', p: () => new V3(colX(zr(40)), 0, zr(40)), r: 110, note: 'Wildebeest bunch on the bank, then go all at once. Zebra often cross first.' },
    { name: 'Impala herd', p: () => new V3(150, 0, -380), r: 70, note: 'Impala graze in herds, with males keeping watch at the edges.' },
    { name: 'Hippo pool', p: () => new V3(-175, 0, zr(-175)), r: 70, note: 'Hippos spend the day in water to keep cool and come out to graze at night.' },
  ];
  SIGHT.forEach((s) => (s.done = false));

  // ---------- the Land Cruiser ----------
  function cruiserGeo() {
    const p = [], olive = 0x67684a, dark = 0x202020;
    p.push(tint(new THREE.BoxGeometry(3.2, 1.15, 1.9).translate(-0.4, 1.25, 0), olive));
    p.push(tint(new THREE.BoxGeometry(1.4, 0.85, 1.85).translate(1.85, 1.1, 0), olive));
    p.push(tint(new THREE.BoxGeometry(0.35, 0.7, 1.7).translate(1.2, 1.95, 0).rotateZ(0), 0x2c3236));
    p.push(tint(new THREE.BoxGeometry(3.3, 0.5, 0.25).translate(-0.4, 2.12, 0.85), olive)); p.push(tint(new THREE.BoxGeometry(3.3, 0.5, 0.25).translate(-0.4, 2.12, -0.85), olive)); p.push(tint(new THREE.BoxGeometry(0.25, 0.5, 1.94).translate(-1.95, 2.12, 0), olive));
    [[-1.95, 0.93], [-1.95, -0.93], [1.1, 0.93], [1.1, -0.93], [-0.4, 0.93], [-0.4, -0.93]].forEach(([x, z]) => p.push(tint(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 5).translate(x, 2.8, z), 0x3a3a34)));
    p.push(tint(new THREE.BoxGeometry(3.4, 0.08, 2.1).translate(-0.4, 3.7, 0), 0xc8b890));
    [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]].forEach(([x, z]) => p.push(tint(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateX(PI / 2).translate(x, 0.42, z), dark)));
    p.push(tint(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14).rotateZ(PI / 2).translate(-2.15, 1.2, 0), dark));
    p.push(tint(new THREE.BoxGeometry(0.15, 0.25, 1.9).translate(2.6, 0.9, 0), 0x333333));
    return mergeGeometries(p);
  }
  const cgeo = cruiserGeo();
  const cruiser = new THREE.Mesh(cgeo, vmat({ roughness: 0.6 })); cruiser.castShadow = true; cruiser.rotation.order = 'YZX'; scene.add(cruiser);
  const parked = new THREE.Mesh(cgeo, vmat({ roughness: 0.6 })); parked.position.set(CAMP.x - 22, hgt(CAMP.x - 22, CAMP.z + 8), CAMP.z + 8); parked.rotation.y = 0.6; parked.castShadow = true; scene.add(parked);

  // ---------- balloons ----------
  function balloonGeo(cA, cB) {
    const prof = [[1.1, 0], [2.8, 1.6], [5.2, 4.6], [7.1, 8.2], [7.7, 11], [7.3, 14], [5.8, 16.8], [3.2, 18.8], [0.01, 19.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const env = new THREE.LatheGeometry(prof, 24).toNonIndexed(); env.deleteAttribute('uv'); env.translate(0, 4.4, 0);
    const q = env.attributes.position, col = new Float32Array(q.count * 3), a = new THREE.Color(cA), b = new THREE.Color(cB);
    for (let i = 0; i < q.count; i += 3) { const ang = Math.atan2((q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3, (q.getX(i) + q.getX(i + 1) + q.getX(i + 2)) / 3), c = Math.floor((ang + PI) / (2 * PI) * 24) % 2 ? a : b; for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; } }
    env.setAttribute('color', new THREE.BufferAttribute(col, 3)); env.setAttribute('leg', new THREE.BufferAttribute(new Float32Array(q.count * 2), 2)); env.computeVertexNormals();
    const p = [env, tint(new THREE.BoxGeometry(1.8, 0.08, 1.8).translate(0, 0.04, 0), 0x6e5232)];
    [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].forEach(([x, z]) => p.push(tint(new THREE.BoxGeometry(x ? 0.06 : 1.8, 1.1, z ? 0.06 : 1.8).translate(x, 0.55, z), 0x8a6a40)));
    [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].forEach(([x, z]) => p.push(tint(new THREE.BoxGeometry(x ? 0.12 : 1.9, 0.1, z ? 0.12 : 1.9).translate(x, 1.12, z), 0x3a2a1e)));
    [[0.85, 0.85], [-0.85, 0.85], [0.85, -0.85], [-0.85, -0.85]].forEach(([x, z]) => p.push(tint(limb(0.015, 0.015, new V3(x, 1.1, z), new V3(x * 1.3, 4.5, z * 1.3), 3), 0x444444)));
    p.push(tint(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 10).translate(0, 3.4, 0), 0x777777));
    return mergeGeometries(p);
  }
  const balloon = new THREE.Mesh(balloonGeo(0xe0b030, 0xc03a28), vmat({ side: THREE.DoubleSide, roughness: 0.8 })); balloon.castShadow = true; scene.add(balloon);
  const others = [[0x2c6ab0, 0xf2f0e8, 90, 40, 30], [0x2e8a4a, 0xe8c040, -120, 70, 60], [0xd05a20, 0x3a3a3a, 40, -160, 90]].map(([a, b, dx, dz, dy]) => { const m = new THREE.Mesh(balloonGeo(a, b), vmat({ side: THREE.DoubleSide, roughness: 0.8 })); m.userData = { dx, dz, dy }; scene.add(m); return m; });
  const flameTex = canvasTex(64, 128, (g) => { const gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.3, 'rgba(255,160,50,.85)'); gr.addColorStop(0.7, 'rgba(200,60,10,.25)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 80, 26, 48, 0, 0, PI * 2); g.fill(); });
  const burner = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); burner.scale.set(0.9, 2.2, 1); burner.position.set(0, 4.6, 0); balloon.add(burner);
  const burnLight = new THREE.PointLight(0xffa040, 0, 30, 2); burnLight.position.set(0, 5.5, 0); balloon.add(burnLight);

  // ---------- the camp ----------
  CAMP.y = hgt(CAMP.x, CAMP.z);
  const tentGeo = mergeGeometries([
    tint(new THREE.BoxGeometry(5.2, 0.3, 4.6).translate(0, 0.15, 0), 0x6a4a30),
    tint(new THREE.BoxGeometry(3.8, 2.0, 3.4).translate(0, 1.3, -0.3), 0xbca97f),
    tint(new THREE.CylinderGeometry(0.01, 3.0, 1.1, 4, 1).rotateY(PI / 4).scale(1.35, 1, 1.1).translate(0, 2.85, -0.3), 0x8a7f62),
    tint(new THREE.BoxGeometry(3.9, 0.06, 1.4).translate(0, 2.25, 1.8).rotateX(0), 0x8a7f62),
    tint(new THREE.BoxGeometry(1.0, 1.7, 0.04).translate(0, 1.15, 1.41), 0x3a3022),
    ...[[1.9, 2.4], [-1.9, 2.4]].map(([x, z]) => tint(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 5).translate(x, 1.2, z), 0x5a4030)),
  ]);
  const tents = [], lampPos = [];
  for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.5, x = CAMP.x + Math.cos(a) * 20, z = CAMP.z + Math.sin(a) * 20, r = Math.atan2(-(CAMP.z - z), CAMP.x - x) - PI / 2; tents.push({ x, y: hgt(x, z), z, r: -Math.atan2(CAMP.z - z, CAMP.x - x) + PI / 2 }); lampPos.push(x + (CAMP.x - x) * 0.13, hgt(x, z) + 1.9, z + (CAMP.z - z) * 0.13); }
  instanced(tentGeo, vmat({ roughness: 0.95 }), tents, true);
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, x = CAMP.x + Math.cos(a) * 11, z = CAMP.z + Math.sin(a) * 11; lampPos.push(x, hgt(x, z) + 0.6, z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  const lamps = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb466, size: 0.8, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); scene.add(lamps);
  const fire = new THREE.Group(); fire.position.copy(CAMP); scene.add(fire);
  fire.add(new THREE.Mesh(mergeGeometries([0, 1, 2, 3, 4].map((i) => tint(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6).rotateZ(PI / 2 - 0.35).translate(0.25, 0.25, 0).rotateY(i * 1.26), 0x3a2a1c))), vmat()));
  fire.add(new THREE.Mesh(tint(new THREE.TorusGeometry(0.8, 0.14, 6, 14).rotateX(PI / 2).translate(0, 0.05, 0), 0x6f675c), vmat()));
  const flames = [0, 1, 2, 3, 4, 5].map((i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.userData = { ph: i * 1.7, ox: (rnd() - 0.5) * 0.4, oz: (rnd() - 0.5) * 0.4 }; fire.add(s); return s; });
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 35, 2); fireLight.position.set(0, 1.0, 0); fire.add(fireLight);
  // eyeshine at the edge of the light
  const eyes = Array.from({ length: 7 }, () => { const a = rnd() * 6.28, d = 34 + rnd() * 40; return { x: CAMP.x + Math.cos(a) * d, z: CAMP.z + Math.sin(a) * d, a, ph: rnd() * 20, h: 0.55 + rnd() * 0.25 }; });
  const eyeG = new THREE.BufferGeometry(), eyeP = new Float32Array(eyes.length * 6), eyeC = new Float32Array(eyes.length * 6);
  eyes.forEach((e, i) => { const tx = -Math.sin(e.a) * 0.11, tz = Math.cos(e.a) * 0.11, y = hgt(e.x, e.z) + e.h; eyeP.set([e.x + tx, y, e.z + tz, e.x - tx, y, e.z - tz], i * 6); });
  eyeG.setAttribute('position', new THREE.BufferAttribute(eyeP, 3)); eyeG.setAttribute('color', new THREE.BufferAttribute(eyeC, 3));
  const eyeMesh = new THREE.Points(eyeG, new THREE.PointsMaterial({ size: 0.16, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(eyeMesh);

  // ---------- sky, stars, moon, light ----------
  const sky = new Sky(); sky.scale.setScalar(8000); scene.add(sky);
  const su = sky.material.uniforms;
  su.cloudCoverage.value = 0.28; su.cloudDensity.value = 0.35; su.cloudElevation.value = 0.5;
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(8000); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(R); let envRT = null, lastEnv = { h: -99, t: 0 };
  const starG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 4000; i++) { const u = rnd() * 0.97 + 0.03, t = rnd() * 6.283, rr = Math.sqrt(1 - u * u); sp.push(rr * Math.cos(t) * 6000, u * 6000, rr * Math.sin(t) * 6000); }
  for (let i = 0; i < 5000; i++) { const a = rnd() * 6.283, w = (rnd() - 0.5) * 0.25 * (1 + rnd()), v = new V3(Math.cos(a) * 0.3 + w, Math.sin(a) * 0.9 + w, Math.cos(a)).normalize(); if (v.y > 0.02) sp.push(v.x * 6000, v.y * 6000, v.z * 6000); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
  const moonDir = new V3(0.5, 0.5, 0.7).normalize();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fffef5'); gr.addColorStop(0.28, '#f4f0e0'); gr.addColorStop(0.31, 'rgba(240,240,255,.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: false }));
  moon.scale.setScalar(330); scene.add(moon);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xb09a6a, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 800 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const moonLight = new THREE.DirectionalLight(0x9db4e0, 0); moonLight.position.copy(moonDir).multiplyScalar(500); scene.add(moonLight);

  let composer = null, bloom = null;
  if (!mobile) { composer = new EffectComposer(R); composer.addPass(new RenderPass(scene, cam)); bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass()); }

  // ---------- sound: wind, crickets at night, engine, burner; off until asked ----------
  let ac = null, A = null;
  function sound(on) {
    if (on && !ac) {
      ac = new AudioContext();
      const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), dd = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; dd[i] = last * 3 + w * 0.05; }
      const src = () => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 3); return s; };
      const chain = (s, ...nodes) => nodes.reduce((a, n) => { a.connect(n); return n; }, s);
      const filt = (type, f, q = 1) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
      const gain = (v) => { const g = ac.createGain(); g.gain.value = v; return g; };
      A = { wind: gain(0), crick: gain(0), eng: gain(0), burn: gain(0) };
      chain(src(), filt('lowpass', 420), A.wind, ac.destination);
      const am = gain(0); const osc = ac.createOscillator(); osc.frequency.value = 27; osc.connect(am.gain); osc.start();
      chain(src(), filt('bandpass', 4600, 9), am, A.crick, ac.destination);
      const eo = ac.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 42; eo.start(); A.eo = eo; chain(eo, filt('lowpass', 180), A.eng, ac.destination);
      chain(src(), filt('lowpass', 380), A.burn, ac.destination);
    } else if (!on && ac) { ac.close(); ac = A = null; }
  }

  // ---------- state ----------
  const T = { env: 1 };
  const S = { k: MOMENTS[initial] ? initial : 'migration', started: false, auto: true, hours: 8, yaw: 0, pitch: 0, lookYaw: 0, lookPitch: 0, lastLook: 0 };
  const P = new V3(), keys = new Set();
  const car = { u: 0, x: 0, z: 0, yaw: 0, speed: 0, stopT: 0, sight: null, autoLook: 0 };
  const fly = { t: 0, x: 0, z: 0, y: 80 };
  let walkA = 0, overviewA = 0, eleCenter = EL.clone();
  const mode = () => MOMENTS[S.k].mode;
  function enter(k) {
    S.k = k; const m = MOMENTS[k]; S.hours = m.time; S.auto = true; S.lookYaw = S.lookPitch = 0; car.stopT = 0; car.sight = null; SIGHT.forEach((s) => (s.done = false));
    if (m.mode === 'drive') {
      car.u = k === 'tarangire' ? (nearestU(EL.x, EL.z) - 140 / TL + 1) % 1 : (nearestU(60, 110) - 160 / TL + 1) % 1;
      const p = track.getPointAt(car.u), tg = track.getTangentAt(car.u); car.x = p.x; car.z = p.z; car.yaw = Math.atan2(tg.x, tg.z); car.speed = 0;
    } else if (m.mode === 'fly') { fly.t = 0; fly.x = -260; fly.z = 420; fly.y = hgt(-260, 420) + 60; }
    else { walkA = 0.4; P.set(CAMP.x + 9, 0, CAMP.z); S.yaw = -PI / 2; S.pitch = -0.04; }
    root.classList.toggle('z-swim', m.mode === 'fly');
    ui();
  }

  // ---------- UI ----------
  const pick = $('#zPick'), list = $('#zStops'), bar = $('#zBarStops'), clock = $('#zClock');
  list.innerHTML = ORDER.map((k) => `<button data-s="${k}" aria-pressed="false"><b>${MOMENTS[k].name}</b><span>${MOMENTS[k].day} · ${fmtTime(MOMENTS[k].time)}</span></button>`).join('');
  bar.innerHTML = ORDER.map((k) => `<button class="cbtn" data-s="${k}" aria-pressed="false">${MOMENTS[k].name}</button>`).join('');
  function ui() {
    root.querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === S.k)));
    const m = MOMENTS[S.k];
    $('#zTitle').textContent = m.name;
    $('#zDetail').innerHTML = `<p>${m.blurb}</p><dl><dt>Where</dt><dd>${m.where}</dd><dt>When</dt><dd>${m.day}, ${fmtTime(m.time)}</dd><dt>You</dt><dd>${m.what}</dd></dl>`;
    note();
    $('#zAuto').setAttribute('aria-pressed', String(S.auto));
    $('#zAuto').textContent = m.mode === 'drive' ? 'Guide drives' : m.mode === 'fly' ? 'Drifting' : 'Stroll';
  }
  function note() {
    const m = MOMENTS[S.k], s = car.stopT > 0 && car.sight;
    $('#zNT').textContent = s ? s.name : `${m.day} · ${m.name}`; $('#zNX').textContent = s ? s.note : m.note;
    $('#zNTip').textContent = m.mode === 'drive' ? 'Drag to look. Your guide stops at sightings; W/S and A/D take the wheel yourself (the car can’t cross the river).'
      : m.mode === 'fly' ? 'Drag to look over the edge of the basket. Space and C climb and sink; the burner roars when you climb.'
        : 'Drag to look. W/A/S/D or the arrows walk around camp; the askari won’t let you past the lanterns.';
  }
  const hud = (on) => { ['#zStats', '#zNote', '#zBar', '#zPad'].forEach((s) => ($(s).hidden = !on)); pick.hidden = on; };
  function start() { S.started = true; hud(true); enter(S.k); onMoment?.(S.k); }
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  on(list, 'click', (e) => { const b = e.target.closest('[data-s]'); if (b) { S.k = b.dataset.s; S.hours = MOMENTS[S.k].time; ui(); onMoment?.(S.k); } });
  on(bar, 'click', (e) => { const b = e.target.closest('[data-s]'); if (b) { enter(b.dataset.s); onMoment?.(S.k); } });
  on($('#zStart'), 'click', start);
  on($('#zChange'), 'click', () => { S.started = false; hud(false); ui(); });
  const step = (n) => { enter(ORDER[(ORDER.indexOf(S.k) + n + ORDER.length) % ORDER.length]); onMoment?.(S.k); };
  on($('#zPrev'), 'click', () => step(-1)); on($('#zNext'), 'click', () => step(1));
  on($('#zAuto'), 'click', () => {
    S.auto = !S.auto; if (S.auto) { S.lookYaw = S.lookPitch = 0; if (mode() === 'drive') { car.u = nearestU(car.x, car.z); car.stopT = 0; } }
    ui();
  });
  on($('#zSound'), 'click', (e) => { const b = e.currentTarget, v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); sound(v); });
  on(clock, 'input', () => { S.hours = +clock.value; });
  let drag = null;
  on(canvas, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  on(canvas, 'pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.x) * 0.004, dy = (e.clientY - drag.y) * 0.004; drag = { x: e.clientX, y: e.clientY };
    if (mode() === 'walk' && !S.auto) { S.yaw -= dx; S.pitch = Math.max(-1.35, Math.min(1.35, S.pitch - dy)); }
    else { S.lookYaw -= dx; S.lookPitch = Math.max(-1.3, Math.min(1.2, S.lookPitch - dy)); S.lastLook = performance.now(); }
  });
  on(canvas, 'pointerup', () => { drag = null; }); on(canvas, 'pointercancel', () => { drag = null; });
  const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'u', KeyE: 'u', KeyC: 'd', KeyQ: 'd' };
  function takeOver(m) {
    if (!S.auto) return;
    if (mode() === 'fly') return; // in the balloon only height is yours
    if (mode() === 'walk') { const f = new V3(); cam.getWorldDirection(f); S.yaw = Math.atan2(f.x, f.z); S.pitch = Math.asin(Math.max(-1, Math.min(1, f.y))); }
    if (mode() === 'drive') { car.stopT = 0; car.sight = null; }
    if (m === 'u' || m === 'd') return;
    S.auto = false; S.lookYaw = S.lookPitch = 0; ui();
  }
  on(window, 'keydown', (e) => {
    if (e.target.closest?.('input,select,textarea')) return;
    if (e.code === 'Escape') { onExit?.(); return; }
    if (!S.started) return;
    if (e.code === 'KeyP') { $('#zAuto').click(); return; }
    if (e.code === 'KeyN') { step(1); return; }
    const m = MOVE[e.code]; if (m) { e.preventDefault(); keys.add(m); takeOver(m); }
    if (e.key === 'Shift') keys.add('run');
  });
  on(window, 'keyup', (e) => { const m = MOVE[e.code]; if (m) keys.delete(m); if (e.key === 'Shift') keys.delete('run'); });
  root.querySelectorAll('#zPad [data-k]').forEach((b) => {
    on(b, 'pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.k); takeOver(b.dataset.k); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => on(b, ev, () => keys.delete(b.dataset.k)));
  });

  let W = 1, H = 1;
  function resize() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    R.setPixelRatio(pr); R.setSize(W, H, false);
    cam.aspect = W / H; cam.fov = W < H ? 72 : 60; cam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); bloom.setSize(W / 2, H / 2); }
  }
  on(window, 'resize', resize); resize();

  // ---------- sun ----------
  const sunDir = new V3(), tmpC = new THREE.Color(), cWarm = new THREE.Color(0xff9a50), cWhite = new THREE.Color(0xfff4e6);
  const fogDay = new THREE.Color(0xd9c9a6), fogSet = new THREE.Color(0xd8905c), fogNight = new THREE.Color(0x0a1220), nightBg = new THREE.Color(0x060d1c);
  const skyDay = new THREE.Color(0xbcd4e6), skySet = new THREE.Color(0xe8a070), skyNight = new THREE.Color(0x0a1424);
  function sunAt(h) { const a = PI * (h - 6.58) / 12.25; return sunDir.set(Math.cos(a), Math.sin(a), 0.22).normalize(); } // rises in the east (+x)

  // ---------- frame ----------
  const camT = new V3(), fwd = new V3(), tmp = new V3(), tmp2 = new V3();
  const timer = new THREE.Timer(); let t = 0, raf = 0, slow = 0, frames = 0, statT = 0, burnT = 0;
  const lookVec = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update(); const raw = timer.getDelta(), dt = Math.min(raw, 0.1), rdt = Math.min(raw, 1); if (!reduce) t += dt;
    U.uTime.value = t;
    const md = mode();
    if (S.started && S.auto) S.hours = Math.min(23.9, S.hours + dt / 60 * (md === 'fly' ? 0.6 : 0.2));
    const h = S.hours;
    if (S.auto && performance.now() - S.lastLook > 3000) { const k = 1 - Math.pow(0.4, rdt); S.lookYaw *= 1 - k; S.lookPitch *= 1 - k; }
    const run = keys.has('run');

    // --- the vehicle ---
    if (md === 'drive' && S.started) {
      if (S.auto) {
        if (car.stopT > 0) { car.stopT -= dt; if (car.stopT <= 0) { car.sight = null; note(); } }
        const target = car.stopT > 0 ? 0 : 5.5; car.speed += (target - car.speed) * (1 - Math.pow(0.35, rdt));
        car.u = (car.u + car.speed * dt / TL) % 1;
        const p = track.getPointAt(car.u), tg = track.getTangentAt(car.u); car.x = p.x; car.z = p.z;
        car.yaw += wrap(Math.atan2(tg.x, tg.z) - car.yaw) * (1 - Math.pow(0.05, rdt));
        for (const s of SIGHT) {
          const sp = s.p(), d = Math.hypot(sp.x - car.x, sp.z - car.z);
          if (!s.done && d < s.r && car.stopT <= 0) { s.done = true; car.sight = s; car.stopT = 24; note(); }
          if (s.done && d > s.r * 2.5) s.done = false;
        }
        const want = car.stopT > 0 && car.sight ? wrap(Math.atan2(car.sight.p().x - car.x, car.sight.p().z - car.z) - car.yaw) : 0;
        car.autoLook += wrap(want - car.autoLook) * (1 - Math.pow(0.3, rdt));
      } else {
        const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), st = (keys.has('l') ? 1 : 0) - (keys.has('r') ? 1 : 0);
        car.speed += f * dt * (run ? 4 : 2.5); car.speed *= 1 - dt * 0.4; car.speed = Math.max(-3, Math.min(run ? 14 : 9, car.speed));
        car.yaw += st * dt * 0.7 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 3);
        const nx = car.x + Math.sin(car.yaw) * car.speed * dt, nz = car.z + Math.cos(car.yaw) * car.speed * dt;
        if (Math.abs(nx) < 1250 && nz > -1300 && nz < 1050 && hgt(nx, nz) > -1.0) { car.x = nx; car.z = nz; } else car.speed *= -0.2;
        car.autoLook *= 1 - (1 - Math.pow(0.3, rdt));
      }
    }
    {
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), hf = hgt(car.x + fx * 1.4, car.z + fz * 1.4), hb = hgt(car.x - fx * 1.4, car.z - fz * 1.4), hl = hgt(car.x - fz * 0.9, car.z + fx * 0.9), hr = hgt(car.x + fz * 0.9, car.z - fx * 0.9);
      cruiser.position.set(car.x, (hf + hb + hl + hr) / 4 + Math.sin(t * 9) * 0.012 * Math.min(1, Math.abs(car.speed) / 4), car.z);
      cruiser.rotation.set(Math.atan2(hl - hr, 1.8) * 0.8, car.yaw - PI / 2, Math.atan2(hf - hb, 2.8));
      cruiser.visible = md === 'drive' || !S.started;
    }

    // --- camera ---
    if (!S.started) {
      overviewA += dt * 0.025;
      cam.position.set(60 + Math.sin(overviewA) * 300, 90, 60 + Math.cos(overviewA) * 300); camT.set(60, 4, 60); cam.lookAt(camT);
    } else if (md === 'drive') {
      cruiser.updateMatrixWorld(); cam.position.copy(cruiser.localToWorld(tmp.set(-0.3, 2.9, 0)));
      lookVec(car.yaw + car.autoLook + S.lookYaw, -0.04 + S.lookPitch, fwd); cam.lookAt(camT.copy(cam.position).add(fwd));
    } else if (md === 'fly') {
      const wind = tmp2.set(2.0, 0, -1.3);
      if (S.auto || true) { fly.t += dt; fly.x += wind.x * dt; fly.z += wind.z * dt; }
      const g = hgt(fly.x, fly.z), u = (keys.has('u') ? 1 : 0) - (keys.has('d') ? 1 : 0);
      if (u) fly.y += u * dt * 2.2; else if (S.auto) fly.y += ((g + 70 + 60 * (0.5 + 0.5 * Math.sin(fly.t * 0.02 - 1.2))) - fly.y) * dt * 0.05;
      fly.y = Math.max(g + 8, Math.min(g + 320, fly.y));
      if (fly.x > 1100 || fly.z < -1150) { fly.x = -260; fly.z = 420; }
      burnT -= dt; if (u > 0 || (S.auto && (fly.t % 15) < 2.2)) burnT = 0.3;
      balloon.position.set(fly.x, fly.y, fly.z); balloon.rotation.y = fly.t * 0.01;
      cam.position.set(fly.x + 0.35, fly.y + 1.6, fly.z + 0.3);
      lookVec(Math.atan2(sunDir.x, sunDir.z) - 0.55 + S.lookYaw, -0.3 + S.lookPitch, fwd); cam.lookAt(camT.copy(cam.position).add(fwd));
    } else {
      if (S.auto) {
        walkA += dt * 0.06; P.set(CAMP.x + Math.cos(walkA) * 10, 0, CAMP.z + Math.sin(walkA) * 10);
        S.yaw = Math.atan2(-Math.sin(walkA), Math.cos(walkA)) * 0 + Math.atan2(Math.cos(walkA) * -1, Math.sin(walkA)) + 0.9 * Math.sin(t * 0.05);
        S.pitch = 0.02;
      } else {
        const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
        if (f || s) { const spd = (run ? 3 : 1.3) * dt; P.x += (Math.sin(S.yaw) * f - Math.cos(S.yaw) * s) * spd; P.z += (Math.cos(S.yaw) * f + Math.sin(S.yaw) * s) * spd; }
        const dx = P.x - CAMP.x, dz = P.z - CAMP.z, d = Math.hypot(dx, dz); if (d > 30) { P.x = CAMP.x + dx / d * 30; P.z = CAMP.z + dz / d * 30; }
        if (d < 1.6) { P.x = CAMP.x + dx / (d || 1) * 1.6; P.z = CAMP.z + dz / (d || 1) * 1.6; }
      }
      P.y = hgt(P.x, P.z) + 1.65; cam.position.copy(P);
      lookVec(S.yaw + S.lookYaw, S.pitch + S.lookPitch, fwd); cam.lookAt(camT.copy(P).add(fwd));
    }
    balloon.visible = md === 'fly' || !S.started;
    others.forEach((o) => { const u = o.userData; o.visible = balloon.visible; o.position.set(fly.x + u.dx + Math.sin(t * 0.05 + u.dx) * 10, Math.max(hgt(fly.x + u.dx, fly.z + u.dz) + 30, fly.y + u.dy * Math.sin(t * 0.03 + u.dz)), fly.z + u.dz); });
    burner.visible = burnT > 0; burnLight.intensity = burnT > 0 ? 60 : 0;
    if (!S.started) { balloon.position.set(-120, hgt(-120, 160) + 140, 160); }

    // --- light ---
    sunAt(h);
    const elDeg = Math.asin(sunDir.y) * 180 / PI, day = sst(-4, 12, elDeg), night = sst(1, -10, elDeg), golden = sst(16, 2, elDeg) * sst(-5, 1, elDeg);
    su.sunPosition.value.copy(sunDir); su.turbidity.value = 3 + 2 * golden; su.rayleigh.value = 1.2 + 1.0 * golden + 0.6 * night;
    su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.82; su.time.value = t;
    sky.position.copy(cam.position); stars.position.copy(cam.position); moon.position.copy(cam.position).addScaledVector(moonDir, 5500);
    R.toneMappingExposure = 0.46 + 0.3 * golden + 0.6 * night;
    sun.color.copy(cWarm).lerp(cWhite, sst(3, 28, elDeg)); sun.intensity = 3.2 * sst(-1, 10, elDeg);
    sun.target.position.copy(cam.position).addScaledVector(lookVec(md === 'drive' ? car.yaw : S.yaw, 0, fwd), md === 'fly' ? 40 : 25); sun.target.position.y = hgt(sun.target.position.x, sun.target.position.z);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 400); sun.castShadow = elDeg > 1;
    tmpC.copy(skyNight).lerp(skySet, golden * (1 - night)).lerp(skyDay, sst(12, 30, elDeg)); hemi.color.copy(tmpC);
    hemi.intensity = 0.3 + 0.55 * day + 0.25 * night; moonLight.intensity = 1.0 * night;
    scene.environmentIntensity = T.env * (0.05 + 0.2 * day);
    stars.material.opacity = 0.8 * night; stars.visible = moon.visible = night > 0.01; moon.material.opacity = night;
    sky.visible = night <= 0.85; scene.background = night > 0.85 ? nightBg : null;
    fog.color.copy(fogNight).lerp(fogSet, golden * (1 - night)).lerp(fogDay, sst(12, 30, elDeg)); fog.density = 0.00055 + 0.00025 * golden + 0.0004 * night;
    lamps.material.opacity = sst(4, -3, elDeg);
    const fireOn = h > 18.5 ? sst(18.5, 18.9, h) : 0; fire.visible = fireOn > 0;
    if (fire.visible) {
      flames.forEach((s) => { const u = s.userData, f = 0.75 + 0.25 * Math.sin(t * 9 + u.ph) * Math.sin(t * 5.3 + u.ph * 2); s.scale.set(0.95 * f, 1.8 * f, 1); s.position.set(u.ox + Math.sin(t * 3 + u.ph) * 0.05, 0.85 * f, u.oz); s.material.opacity = fireOn; });
      fireLight.intensity = fireOn * (60 + 15 * Math.sin(t * 13) * Math.sin(t * 7.1));
    }
    eyeMesh.visible = night > 0.5;
    if (eyeMesh.visible) { eyes.forEach((e, i) => { const blink = Math.sin(t * 0.4 + e.ph) > -0.3 && (t + e.ph) % 7 > 0.25 ? 1 : 0, v = blink * night; for (let k = 0; k < 2; k++) eyeC.set([0.75 * v, 1.0 * v, 0.55 * v], i * 6 + k * 3); }); eyeG.attributes.color.needsUpdate = true; }
    if (bloom) { bloom.enabled = night > 0.05; bloom.strength = 0.45 * night; bloom.threshold = 1.2; } // the daytime sky is far over any threshold; bloom only for fire and lamps
    riverNormal.offset.set(t * 0.02, t * 0.05);
    river.material.color.setRGB(0.1, 0.085, 0.05).multiplyScalar(0.3 + 0.7 * day);
    GU.uCam.value.set(cam.position.x, cam.position.z); GU.uOn.value = cam.position.y - hgt(cam.position.x, cam.position.z) < 25 ? 1 : 0;

    // --- life ---
    if (!reduce) {
      let wi = 0, zi = 0;
      herd.forEach((a, i) => {
        const s = (a.s0 + t * a.v) % LEN, z = 700 - s, cx = colX(z), w = colW(z);
        let x = cx + a.o * w, y = hgt(x, z);
        const swim = y < WATER - 0.3; if (swim) y = WATER - 0.72 * a.sc;
        const dz = -1, dx = (colX(z - 1) - cx), r = Math.atan2(-dz, dx) + Math.sin(t * 0.3 + i) * 0.12;
        dummy.position.set(x, y, z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(a.sc); dummy.updateMatrix();
        (a.zebra ? zebraMesh : wildeMesh).setMatrixAt(a.zebra ? zi++ : wi++, dummy.matrix);
        dummy.position.y = swim ? -100 : y + 0.08; dummy.scale.set(1.1 * a.sc, 1, 0.5 * a.sc); dummy.updateMatrix(); blobs.setMatrixAt(i, dummy.matrix);
      });
      wildeMesh.instanceMatrix.needsUpdate = zebraMesh.instanceMatrix.needsUpdate = blobs.instanceMatrix.needsUpdate = true;
      const ea = t * 0.004;
      eleCenter.set(EL.x + Math.cos(ea) * 70, 0, EL.z + Math.sin(ea) * 45);
      eleList.forEach((e, i) => {
        const a = ea - e.a, x = EL.x + Math.cos(a) * (70 + e.off), z = EL.z + Math.sin(a) * (45 + e.off * 0.6), r = Math.atan2(-(Math.cos(a) * 45), -Math.sin(a) * 70);
        dummy.position.set(x, hgt(x, z), z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(e.s); dummy.updateMatrix(); eleMesh.setMatrixAt(i, dummy.matrix);
      });
      eleMesh.instanceMatrix.needsUpdate = true;
      girList.forEach((g, i) => {
        const a = g.a + t * g.sp, x = GI.x + Math.cos(a) * g.rad, z = GI.z + Math.sin(a) * g.rad, r = Math.atan2(-Math.cos(a) * Math.sign(g.sp), -Math.sin(a) * Math.sign(g.sp));
        dummy.position.set(x, hgt(x, z), z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(g.s); dummy.updateMatrix(); girMesh.setMatrixAt(i, dummy.matrix);
      });
      girMesh.instanceMatrix.needsUpdate = true;
      lions.forEach((l, i) => { dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(0, l.r, 0); dummy.scale.set(l.s, l.s * (1 + 0.025 * Math.sin(t * 1.4 + i)), l.s); dummy.updateMatrix(); lionMesh.setMatrixAt(i, dummy.matrix); });
      lionMesh.instanceMatrix.needsUpdate = true;
      hippos.forEach((p, i) => { dummy.position.set(p.x, WATER - 0.35 + Math.sin(t * 0.4 + p.ph) * 0.12, p.z); dummy.rotation.set(0, p.r + Math.sin(t * 0.05 + p.ph) * 0.3, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); hippoMesh.setMatrixAt(i, dummy.matrix); });
      hippoMesh.instanceMatrix.needsUpdate = true;
      vultures.forEach((v, i) => { const a = v.a + t * v.sp; dummy.position.set(250 + Math.cos(a) * v.rad, v.h + Math.sin(t * 0.2 + i) * 6, 40 + Math.sin(a) * v.rad); dummy.rotation.set(0, -a, 0.35); dummy.scale.setScalar(1.4); dummy.updateMatrix(); vulMesh.setMatrixAt(i, dummy.matrix); });
      vulMesh.instanceMatrix.needsUpdate = true;
    }

    // --- sound levels ---
    if (A) {
      A.wind.gain.value = (md === 'fly' ? 0.03 : 0.08) * (0.6 + 0.4 * Math.sin(t * 0.3)) * (1 - 0.6 * night);
      A.crick.gain.value = 0.05 * night;
      A.eng.gain.value = md === 'drive' && S.started ? 0.03 + 0.05 * Math.min(1, Math.abs(car.speed) / 8) : 0; A.eo.frequency.value = 38 + Math.abs(car.speed) * 4;
      A.burn.gain.value = burnT > 0 ? 0.5 : 0;
    }

    // --- environment light ---
    const now = performance.now();
    if (Math.abs(h - lastEnv.h) > 0.05 && now - lastEnv.t > 200) {
      const eu = envSky.material.uniforms; ['sunPosition', 'turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach((n) => { if (eu[n].value.copy) eu[n].value.copy(su[n].value); else eu[n].value = su[n].value; });
      eu.cloudCoverage.value = 0;
      const rt = pmrem.fromScene(envScene); envRT?.dispose(); envRT = rt; scene.environment = rt.texture;
      lastEnv = { h, t: now };
    }

    // --- readouts ---
    statT -= dt;
    if (S.started && statT <= 0) {
      statT = 0.4;
      $('#zTime').textContent = fmtTime(h); if (document.activeElement !== clock) clock.value = h.toFixed(2); $('#zClockL').textContent = fmtTime(h);
      $('#zAir').textContent = `${Math.round(15 + 13 * Math.max(0, Math.sin(PI * (h - 6.5) / 16)))} °C`;
      let where;
      if (md === 'drive') where = car.stopT > 0 && car.sight ? `Stopped: ${car.sight.name.toLowerCase()}` : `Driving, ${Math.round(Math.abs(car.speed) * 3.6)} km/h`;
      else if (md === 'fly') where = `${Math.round(fly.y - hgt(fly.x, fly.z))} m above the plains`;
      else where = 'In camp';
      $('#zWhere').textContent = where;
      let n = 0; const cx = cam.position.x, cz = cam.position.z, R2 = (md === 'fly' ? 450 : 260) ** 2;
      herd.forEach((a) => { const s = (a.s0 + t * a.v) % LEN, z = 700 - s, x = colX(z) + a.o * colW(z); if ((x - cx) ** 2 + (z - cz) ** 2 < R2) n++; });
      grazers.forEach((g) => { if ((g.x - cx) ** 2 + (g.z - cz) ** 2 < R2) n++; });
      eleList.forEach(() => { if ((eleCenter.x - cx) ** 2 + (eleCenter.z - cz) ** 2 < R2) n++; });
      $('#zAnimals').textContent = n > 0 ? `${n.toLocaleString('en-US')} within ${md === 'fly' ? 450 : 260} m` : 'None in sight';
      const uv = Math.max(0, Math.round(12 * Math.pow(Math.max(0, sunDir.y), 1.6)));
      $('#zUv').textContent = elDeg < 0 ? 'Night' : `UV ${uv}${uv >= 11 ? ', extreme' : uv >= 8 ? ', very high' : uv >= 6 ? ', high' : uv >= 3 ? ', moderate' : ', low'}`;
      $('#zSun').textContent = 'Sunrise 06:35 · sunset 18:50';
      $('#zSub').textContent = `${MOMENTS[S.k].day} · ${fmtTime(h)}`;
    }

    if (composer) composer.render(); else R.render(scene, cam);
    frames++; if (dt > 0.034) slow++;
    if (frames === 120) { if (slow > 60 && pr > 1) { pr = Math.max(1, pr - 0.35); resize(); } frames = slow = 0; }
  }

  if (process.env.NODE_ENV !== 'production') window.__safari = { S, T, bloom, car, fly, R, scene, cam, frame: () => { cancelAnimationFrame(raf); frame(); } };
  S.hours = MOMENTS[S.k].time; ui(); hud(false);
  frame();

  return () => {
    cancelAnimationFrame(raf); off.forEach((f) => f()); sound(false);
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    envRT?.dispose(); pmrem.dispose(); composer?.dispose(); R.dispose();
  };
}
