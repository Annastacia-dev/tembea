import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLACES, fmtTime } from './towns';

// An old Swahili stone town at walking scale. 1 unit = 1 m.
// The town lies at z < 0 on a low shelf GY above the sea; the waterfront runs along x and the sea is at +z.
// Stone Town faces west (sunset over the sea), Mombasa's Old Town faces east (sunrise over the sea).
export function createTown(root, { place, moment: initial, onMoment, onExit }) {
  const PL = PLACES[place], MOMENTS = PL.moments, ORDER = PL.order, isM = place === 'mombasa';
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
  const fog = new THREE.FogExp2(0xd8d0c0, 0.0018);
  scene.fog = fog;
  const cam = new THREE.PerspectiveCamera(62, 1, 0.1, 9000);

  // ---------- noise ----------
  let seed = isM ? 41 : 17;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

  // ---------- textures ----------
  const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const speckle = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { const v = 150 + rnd() * 105 | 0; g.fillStyle = `rgba(${v},${v * 0.96 | 0},${v * 0.9 | 0},${a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } };
  const plaster = (g, w, h) => {
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h); speckle(g, w, h, w * h / 30, 0.35);
    for (let i = 0; i < w / 40; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,60,45,.0)'); gr.addColorStop(1, `rgba(70,60,45,${0.08 + rnd() * 0.12})`); g.fillStyle = gr; g.fillRect(x, rnd() * h * 0.5, 6 + rnd() * 30, h); } // rain streaks
    for (let i = 0; i < w / 60; i++) { g.fillStyle = `rgba(140,120,95,${0.1 + rnd() * 0.15})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 30, 5 + rnd() * 18, 0, 0, PI * 2); g.fill(); } // flaking patches
  };
  const shutter = () => ['#2f5a5a', '#5a3a24', '#3a4a5a', '#6a4a2a', '#2c4a3a', '#7a2a1e'][(rnd() * 6) | 0];
  // upper storeys: 16 m by one 3.4 m storey, four window bays
  const upperTex = canvasTex(1024, 256, (g, w, h) => {
    plaster(g, w, h);
    for (let b = 0; b < 4; b++) {
      const cx = b * 256 + 128, kind = b % 4;
      if (kind === 3 && rnd() < 0.5) continue;
      const ww = 62 + rnd() * 16, wh = 118; const x0 = cx - ww / 2, y0 = 56;
      g.fillStyle = 'rgba(120,105,85,.35)'; g.fillRect(x0 - 10, y0 - 14, ww + 20, wh + 22); // stone surround
      g.fillStyle = '#e3dccd'; g.fillRect(x0 - 6, y0 - 10, ww + 12, 8);
      g.fillStyle = '#16120f'; g.fillRect(x0, y0, ww, wh);
      if (kind === 1) { g.fillStyle = '#16120f'; g.beginPath(); g.arc(cx, y0, ww / 2, PI, 0); g.fill(); }
      g.fillStyle = shutter(); const open = rnd() < 0.5;
      if (open) { g.fillRect(x0 - ww * 0.42, y0, ww * 0.4, wh); g.fillRect(x0 + ww * 1.02, y0, ww * 0.4, wh); }
      else { g.fillRect(x0 + 3, y0 + 3, ww / 2 - 4, wh - 6); g.fillRect(cx + 1, y0 + 3, ww / 2 - 4, wh - 6); }
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let y = y0 + 12; y < y0 + wh; y += 10) { g.beginPath(); g.moveTo(open ? x0 - ww * 0.42 : x0 + 3, y); g.lineTo(open ? x0 - 2 : x0 + ww - 3, y); g.stroke(); }
      g.fillStyle = '#d9d1c0'; g.fillRect(x0 - 8, y0 + wh, ww + 16, 7); // sill
    }
  });
  const upperGlow = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let b = 0; b < 4; b++) if (rnd() < 0.45) { const cx = b * 256 + 128; g.fillStyle = `hsl(${30 + rnd() * 12},90%,${45 + rnd() * 20}%)`; g.fillRect(cx - 30, 60, 60, 110); }
  });
  // ground floor: 16 m by 3.8 m, doors and shopfronts
  const groundTex = canvasTex(1024, 256, (g, w, h) => {
    plaster(g, w, h);
    g.fillStyle = 'rgba(80,70,55,.55)'; g.fillRect(0, h - 34, w, 34); // damp base
    for (let b = 0; b < 4; b++) {
      const cx = b * 256 + 128, k = rnd();
      if (k < 0.35) { g.fillStyle = '#1a1612'; g.fillRect(cx - 70, 70, 140, h - 70); g.fillStyle = '#8a8a86'; for (let y = 74; y < 150; y += 6) g.fillRect(cx - 68, y, 136, 3); } // shop with a half-raised shutter
      else if (k < 0.65) { g.fillStyle = '#16120f'; g.fillRect(cx - 24, 90, 48, 60); g.fillStyle = shutter(); g.fillRect(cx - 22, 92, 20, 56); g.fillRect(cx + 2, 92, 20, 56); }
      else { g.fillStyle = '#e1dacb'; g.fillRect(cx - 80, h - 40, 160, 12); } // a stone baraza bench
    }
  });
  const pavingTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a99c86'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) for (let x = -(y % 44) / 2; x < w; x += 34) { const v = 150 + rnd() * 50 | 0; g.fillStyle = `rgb(${v},${v * 0.93 | 0},${v * 0.82 | 0})`; g.fillRect(x + 2, y + 2, 30, 18); }
    speckle(g, w, h, 2000, 0.25);
  });
  const stoneTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d0c3ad'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, 0.4); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(90,75,55,.18)'; g.fillRect(0, y, w, 2); } });
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const waterN = (() => {
    const s = 128, d = new Uint8Array(s * s * 4), hf = (x, y) => Math.sin(2 * PI * (x * 3 + y) / s) + 0.6 * Math.sin(2 * PI * (x * -5 + y * 7) / s) + 0.35 * Math.sin(2 * PI * (x * 11 - y * 4) / s) + 0.2 * Math.sin(2 * PI * (x * 2 + y * 13) / s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const nx = (hf(x - 1, y) - hf(x + 1, y)) * 0.35, ny = (hf(x, y - 1) - hf(x, y + 1)) * 0.35, l = Math.hypot(nx, ny, 1), i = (y * s + x) * 4; d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    const t = new THREE.DataTexture(d, s, s); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
  })();

  // ---------- helpers ----------
  const tint = (g, hex) => {
    g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
    const cc = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const vmat = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9 }, o));
  const dummy = new THREE.Object3D();
  function instanced(geo, mat, list, cast) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
    list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx || 0, p.r || 0, 0); dummy.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (p.c) m.setColorAt(i, p.c); });
    m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m;
  }

  // ---------- the waterfront and the lanes ----------
  const GY = 1.2; // the town's ground level above the sea
  const shoreZ = (x) => 18 + 3 * Math.sin(x * 0.021 + 0.5) + 1.5 * Math.sin(x * 0.063);
  const wig = (l, s) => 1.6 * Math.sin(s * 0.06 + l.ph) + 0.8 * Math.sin(s * 0.17 + l.ph * 2);
  const LX = [], LZ = [];
  for (let x = -175; x < 165; x += 20 + rnd() * 12) LX.push({ c: x, w: 2.4 + rnd() * 1.6, ph: rnd() * 6 });
  LZ.push({ c: -9, w: 8, ph: 0, main: true });
  for (let z = -9; z > -235;) { z -= 19 + rnd() * 12; LZ.push({ c: z, w: 2.4 + rnd() * 1.6, ph: rnd() * 6 }); }
  const laneX = (l, z) => l.c + wig(l, z), laneZ = (l, x) => l.c + (l.main ? 0 : wig(l, x));
  const OLDFORT = { x0: -122, x1: -78, z0: -60, z1: -14 }, PALACE = { x0: 44, x1: 84, z0: -42, z1: -14 };
  const FJ = { x: 96, z: -30 };
  const reserved = (x, z) => isM ? Math.abs(x - FJ.x) < 46 && Math.abs(z - FJ.z) < 46
    : (x > OLDFORT.x0 - 3 && x < OLDFORT.x1 + 3 && z > OLDFORT.z0 - 3 && z < OLDFORT.z1 + 3) || (x > PALACE.x0 - 3 && x < PALACE.x1 + 3 && z > PALACE.z0 - 3 && z < PALACE.z1 + 3);

  // walkable grid at 0.5 m
  const OX = -230, OZ = -290, OW = 920, OD = 760, OCC = new Uint8Array(OW * OD);
  const cell = (x, z) => { const i = Math.floor((x - OX) * 2), j = Math.floor((z - OZ) * 2); return i < 0 || j < 0 || i >= OW || j >= OD ? -1 : j * OW + i; };
  const block = (x0, x1, z0, z1) => { for (let z = z0; z < z1; z += 0.5) for (let x = x0; x < x1; x += 0.5) { const c = cell(x, z); if (c >= 0) OCC[c] = 1; } };
  const free = (x, z) => { const c = cell(x, z); return c >= 0 && !OCC[c] && z < shoreZ(x) - 0.8; };

  // ---------- houses: walls in two bands (ground floor and the storeys above), flat or tin roofs ----------
  const B = { g: { p: [], uv: [], c: [] }, u: { p: [], uv: [], c: [] }, roof: { p: [], c: [] } };
  const quad = (arr, a, b, c, d, uvs, col) => { // a b c d counter-clockwise seen from outside
    arr.p.push(...a, ...b, ...c, ...a, ...c, ...d);
    if (uvs) arr.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]);
    for (let i = 0; i < 6; i++) arr.c.push(col.r, col.g, col.b);
  };
  const doorSpots = [], balconySpots = [], lampPos = [], houses = [];
  const WALLC = isM ? [0xf1ece2, 0xe8dcc4, 0xd9c49e, 0xcfd6d4, 0xe2cfa8, 0xbfc9c4, 0xeee4d2] : [0xefeae0, 0xe6dccb, 0xd8c8aa, 0xcfc8bb, 0xc8bba4, 0xe9e2d4];
  function wall(x0, z0, x1, z1, y0, y1, col, outside) { // a vertical wall from (x0,z0) to (x1,z1), outward normal to the right of travel
    const len = Math.hypot(x1 - x0, z1 - z0), s0 = (Math.abs(x1 - x0) > Math.abs(z1 - z0) ? Math.min(x0, x1) : Math.min(z0, z1)) * 0, u0 = (x0 + z0) / 16, u1 = u0 + len / 16;
    const gTop = Math.min(y1, GY + 3.8);
    quad(B.g, [x0, y0, z0], [x1, y0, z1], [x1, gTop, z1], [x0, gTop, z0], [[u0, 0], [u1, 0], [u1, (gTop - y0) / 3.8], [u0, (gTop - y0) / 3.8]], col);
    if (y1 > gTop + 0.01) quad(B.u, [x0, gTop, z0], [x1, gTop, z1], [x1, y1, z1], [x0, y1, z0], [[u0, 0], [u1, 0], [u1, (y1 - gTop) / 3.4], [u0, (y1 - gTop) / 3.4]], col);
    if (!outside) return;
    const nx = -(z1 - z0) / len, nz = (x1 - x0) / len, r = Math.atan2(nx, nz);
    for (let s = 2.2; s < len - 1.5; s += 4) {
      const px = x0 + (x1 - x0) * s / len, pz = z0 + (z1 - z0) * s / len, k = rnd();
      if (k < (isM ? 0.16 : 0.22)) doorSpots.push({ x: px + nx * 0.04, y: GY, z: pz + nz * 0.04, r, arch: rnd() < 0.5 });
      for (let y = GY + 3.8 + 0.15; y < y1 - 2.4; y += 3.4) if (rnd() < (isM ? 0.2 : 0.07)) balconySpots.push({ x: px, y, z: pz, r });
      if (rnd() < 0.09) lampPos.push(px + nx * 0.5, GY + 3.3, pz + nz * 0.5);
    }
  }
  function house(x0, x1, z0, z1, storeys, out, opts = {}) {
    if (x1 - x0 < 2.5 || z1 - z0 < 2.5) return;
    const col = new THREE.Color(WALLC[(rnd() * WALLC.length) | 0]).multiplyScalar(0.88 + rnd() * 0.16);
    const H = GY + 3.8 + (storeys - 1) * 3.4, tin = !opts.flat && rnd() < (isM ? 0.25 : 0.4), top = tin ? H : H + 0.55;
    wall(x0, z1, x1, z1, GY, top, col, out.s); // south side (+z) faces the sea
    wall(x1, z1, x1, z0, GY, top, col, out.e);
    wall(x1, z0, x0, z0, GY, top, col, out.n);
    wall(x0, z0, x0, z1, GY, top, col, out.w);
    if (tin) {
      const rc = new THREE.Color().setHSL(0.04 + rnd() * 0.04, 0.35 + rnd() * 0.25, 0.22 + rnd() * 0.18), alongX = x1 - x0 > z1 - z0, rh = 1.1;
      if (alongX) { const zm = (z0 + z1) / 2; quad(B.roof, [x0 - 0.3, H, z1 + 0.3], [x1 + 0.3, H, z1 + 0.3], [x1 + 0.3, H + rh, zm], [x0 - 0.3, H + rh, zm], null, rc); quad(B.roof, [x1 + 0.3, H, z0 - 0.3], [x0 - 0.3, H, z0 - 0.3], [x0 - 0.3, H + rh, zm], [x1 + 0.3, H + rh, zm], null, rc.clone().multiplyScalar(0.8));
        B.roof.p.push(x0, H, z1, x0, H + rh, zm, x0, H, z0, x1, H, z0, x1, H + rh, zm, x1, H, z1); for (let i = 0; i < 6; i++) B.roof.c.push(col.r * 0.9, col.g * 0.9, col.b * 0.9); }
      else { const xm = (x0 + x1) / 2; quad(B.roof, [x1 + 0.3, H, z1 + 0.3], [x1 + 0.3, H, z0 - 0.3], [xm, H + rh, z0 - 0.3], [xm, H + rh, z1 + 0.3], null, rc); quad(B.roof, [x0 - 0.3, H, z0 - 0.3], [x0 - 0.3, H, z1 + 0.3], [xm, H + rh, z1 + 0.3], [xm, H + rh, z0 - 0.3], null, rc.clone().multiplyScalar(0.8));
        B.roof.p.push(x0, H, z0, xm, H + rh, z0, x1, H, z0, x1, H, z1, xm, H + rh, z1, x0, H, z1); for (let i = 0; i < 6; i++) B.roof.c.push(col.r * 0.9, col.g * 0.9, col.b * 0.9); }
    } else {
      const rc = new THREE.Color(0xbdb4a4).multiplyScalar(0.85 + rnd() * 0.2);
      quad(B.roof, [x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], null, rc);
      // the inside of the parapet
      const ic = col.clone().multiplyScalar(0.85);
      quad(B.roof, [x1, H, z1], [x0, H, z1], [x0, top, z1], [x1, top, z1], null, ic); quad(B.roof, [x0, H, z0], [x1, H, z0], [x1, top, z0], [x0, top, z0], null, ic);
      quad(B.roof, [x1, H, z0], [x1, H, z1], [x1, top, z1], [x1, top, z0], null, ic); quad(B.roof, [x0, H, z1], [x0, H, z0], [x0, top, z0], [x0, top, z1], null, ic);
    }
    block(x0, x1, z0, z1);
    houses.push({ x0, x1, z0, z1, H, flat: !tin });
  }
  // fill each block between lanes with houses of different heights
  const minaretAt = [];
  for (let i = 0; i < LX.length - 1; i++) for (let j = 0; j < LZ.length - 1; j++) {
    const A = LX[i], Bx = LX[i + 1], N = LZ[j + 1], S = LZ[j];
    const bx0 = A.c + A.w / 2 + 1.6, bx1 = Bx.c - Bx.w / 2 - 1.6, bz0 = N.c + N.w / 2 + 1.6, bz1 = S.c - S.w / 2 - 1.6;
    const nx = Math.max(1, Math.round((bx1 - bx0) / (6 + rnd() * 3))), nz = Math.max(1, Math.round((bz1 - bz0) / (6 + rnd() * 3)));
    const xs = [bx0], zs = [bz0];
    for (let a = 1; a < nx; a++) xs.push(bx0 + (bx1 - bx0) * (a + (rnd() - 0.5) * 0.4) / nx); xs.push(bx1);
    for (let b = 1; b < nz; b++) zs.push(bz0 + (bz1 - bz0) * (b + (rnd() - 0.5) * 0.4) / nz); zs.push(bz1);
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const cx = (xs[a] + xs[a + 1]) / 2, cz = (zs[b] + zs[b + 1]) / 2;
      if (reserved(cx, cz)) continue;
      const out = { w: a === 0, e: a === nx - 1, n: b === 0, s: b === nz - 1 };
      const inner = !(out.w || out.e || out.n || out.s);
      if (inner && rnd() < 0.25) continue; // a courtyard
      // edges on a lane follow its curve, with a little setback now and then
      const x0 = out.w ? laneX(A, cz) + A.w / 2 + rnd() * 0.3 : xs[a], x1 = out.e ? laneX(Bx, cz) - Bx.w / 2 - rnd() * 0.3 : xs[a + 1];
      const z0 = out.n ? laneZ(N, cx) + N.w / 2 + rnd() * 0.3 : zs[b], z1 = out.s ? laneZ(S, cx) - S.w / 2 - rnd() * 0.3 : zs[b + 1];
      const q = rnd(), storeys = q < 0.1 ? 5 : q < 0.45 ? 4 : q < 0.85 ? 3 : 2;
      if (rnd() < 0.012 && !inner && x1 - x0 > 6.5 && z1 - z0 > 6.5) { minaretAt.push({ x: cx, z: cz, w: x1 - x0 - 0.4, d: z1 - z0 - 0.4 }); continue; }
      house(x0, x1, z0, z1, storeys, out);
    }
  }
  const mkGeo = (arr, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr.p, 3)); if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(arr.c, 3)); g.computeVertexNormals(); return g; };
  const wallG = new THREE.Mesh(mkGeo(B.g, true), vmat({ map: groundTex, roughness: 0.95 }));
  const wallMatU = vmat({ map: upperTex, emissiveMap: upperGlow, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.95, side: THREE.DoubleSide });
  const wallU = new THREE.Mesh(mkGeo(B.u, true), wallMatU);
  const roofs = new THREE.Mesh(mkGeo(B.roof, false), vmat({ roughness: 0.85, metalness: 0.15, side: THREE.DoubleSide }));
  [wallG, wallU, roofs].forEach((m) => { m.castShadow = m.receiveShadow = true; scene.add(m); });

  // carved doors, balconies, minarets
  const doorGeo = (arch) => {
    const p = [tint(new THREE.BoxGeometry(1.9, 0.42, 0.2).translate(0, 2.78, 0.1), 0x6a4528), tint(new THREE.BoxGeometry(0.22, 2.6, 0.18).translate(-0.86, 1.3, 0.09), 0x5a3a22), tint(new THREE.BoxGeometry(0.22, 2.6, 0.18).translate(0.86, 1.3, 0.09), 0x5a3a22),
      tint(new THREE.BoxGeometry(1.5, 2.55, 0.06).translate(0, 1.28, 0.03), 0x3e2615), tint(new THREE.BoxGeometry(0.1, 2.55, 0.1).translate(0, 1.28, 0.06), 0x5a3a22)];
    if (arch) {
      p.push(tint(new THREE.CircleGeometry(0.95, 16, 0, PI).translate(0, 2.99, 0.2), 0x6a4528));
      for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) [-1, 1].forEach((sd) => p.push(tint(new THREE.SphereGeometry(0.04, 6, 4).translate(sd * (0.2 + b * 0.18), 0.5 + a * 0.55, 0.08), 0xc9a44a)));
    } else p.push(tint(new THREE.BoxGeometry(1.7, 0.12, 0.24).translate(0, 3.05, 0.12), 0x4a2e1a));
    return mergeGeometries(p);
  };
  instanced(doorGeo(false), vmat({ roughness: 0.6, metalness: 0.1 }), doorSpots.filter((d) => !d.arch), false);
  instanced(doorGeo(true), vmat({ roughness: 0.55, metalness: 0.25 }), doorSpots.filter((d) => d.arch), false);
  const balcGeo = mergeGeometries([
    tint(new THREE.BoxGeometry(2.6, 0.12, 0.85).translate(0, 0, 0.42), 0x5a3a22), tint(new THREE.BoxGeometry(2.6, 1.0, 0.05).translate(0, 0.56, 0.83), 0x6a4a2c),
    tint(new THREE.BoxGeometry(0.05, 1.0, 0.85).translate(-1.28, 0.56, 0.42), 0x6a4a2c), tint(new THREE.BoxGeometry(0.05, 1.0, 0.85).translate(1.28, 0.56, 0.42), 0x6a4a2c),
    tint(new THREE.BoxGeometry(2.9, 0.07, 1.05).rotateX(0.2).translate(0, 2.45, 0.5), 0x4a3020),
    ...[-1.25, 1.25].map((x) => tint(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5).translate(x, 1.2, 0.82), 0x5a3a22)),
  ]);
  instanced(balcGeo, vmat({ roughness: 0.8 }), balconySpots, true);
  const minGeo = mergeGeometries([
    tint(new THREE.CylinderGeometry(1.5, 1.7, 18, 12).translate(0, 9, 0), 0xefe9dc), tint(new THREE.CylinderGeometry(2.1, 2.1, 0.4, 12).translate(0, 16, 0), 0xe0d6c4),
    tint(new THREE.CylinderGeometry(1.1, 1.3, 4, 12).translate(0, 20, 0), 0xefe9dc), tint(new THREE.ConeGeometry(1.25, 2.6, 12).translate(0, 23.3, 0), isM ? 0x3a7a5a : 0xe8e0d0),
  ]);
  // each minaret rises from a small mosque that fills its plot, squared to the lanes
  instanced(minGeo, vmat(), minaretAt.map((m) => ({ x: m.x, y: GY + 6, z: m.z, s: 0.85 })), true);
  instanced(tint(new THREE.BoxGeometry(1, 6, 1).translate(0, 3, 0), 0xe2d9c6), vmat({ roughness: 0.95 }), minaretAt.map((m) => ({ x: m.x, y: GY, z: m.z, sx: m.w, sz: m.d })), true);
  minaretAt.forEach((m) => block(m.x - m.w / 2, m.x + m.w / 2, m.z - m.d / 2, m.z + m.d / 2));

  // ---------- ground, seawall, sea ----------
  const groundGeo = (() => { const g = new THREE.PlaneGeometry(520, 1, 260, 1); g.rotateX(-PI / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) < 0 ? -340 : shoreZ(x); p.setZ(i, z); p.setY(i, GY); uv.setXY(i, x / 6, z / 6); } g.computeVertexNormals(); return g; })();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.95, color: 0xd8cfbf }));
  ground.receiveShadow = true; scene.add(ground);
  const seawallGeo = (() => { const g = new THREE.PlaneGeometry(520, GY + 2.2, 260, 1); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, shoreZ(x)); p.setY(i, p.getY(i) + (GY - 2.2) / 2 + 0.25); uv.setXY(i, x / 4, p.getY(i) / 4); } g.computeVertexNormals(); return g; })();
  scene.add(new THREE.Mesh(seawallGeo, new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, color: 0x9a8f7c })));
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-PI / 2).translate(0, GY - 0.6, -2300), new THREE.MeshStandardMaterial({ color: 0x6f6a4a, roughness: 1 }))); // the island beyond the town
  waterN.repeat.set(400, 400);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0x0f4a52, roughness: 0.08, metalness: 0.1, normalMap: waterN, normalScale: new THREE.Vector2(0.45, 0.45) }));
  sea.position.y = 0; scene.add(sea);
  // waterfront lamps
  for (let x = -200; x < 200; x += 9) lampPos.push(x, GY + 3.4, shoreZ(x) - 1.2);

  // ---------- landmarks ----------
  const fortMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, color: isM ? 0xc28f63 : 0xa88768, emissive: 0xffb070, emissiveIntensity: 0 });
  const forodhani = { stalls: [], group: new THREE.Group() };
  if (!isM) {
    // the Old Fort: thick walls and round towers
    const { x0, x1, z0, z1 } = OLDFORT, h = 10, t = 2.6, fp = [];
    fp.push(new THREE.BoxGeometry(x1 - x0, h, t).translate((x0 + x1) / 2, GY + h / 2, z0 + t / 2), new THREE.BoxGeometry(x1 - x0, h, t).translate((x0 + x1) / 2, GY + h / 2, z1 - t / 2));
    fp.push(new THREE.BoxGeometry(t, h, z1 - z0).translate(x0 + t / 2, GY + h / 2, (z0 + z1) / 2), new THREE.BoxGeometry(t, h, z1 - z0).translate(x1 - t / 2, GY + h / 2, (z0 + z1) / 2));
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([x, z]) => fp.push(new THREE.CylinderGeometry(4, 4.4, h + 2.5, 20).translate(x, GY + (h + 2.5) / 2, z)));
    for (let x = x0 + 1; x < x1; x += 2.2) [z0 + 0.6, z1 - 0.6].forEach((z) => fp.push(new THREE.BoxGeometry(1.1, 1.1, 1.0).translate(x, GY + h + 0.55, z)));
    for (let z = z0 + 1; z < z1; z += 2.2) [x0 + 0.6, x1 - 0.6].forEach((x) => fp.push(new THREE.BoxGeometry(1.0, 1.1, 1.1).translate(x, GY + h + 0.55, z)));
    const fort = new THREE.Mesh(mergeGeometries(fp.map((g) => { g = g.toNonIndexed(); g.deleteAttribute('uv'); return g; })), fortMat);
    // world-space uvs so the stone texture tiles evenly
    { const q = fort.geometry.attributes.position, n = fort.geometry.attributes.normal, uv = new Float32Array(q.count * 2); fort.geometry.computeVertexNormals(); for (let i = 0; i < q.count; i++) { const sx = Math.abs(n.getX(i)) > 0.5 ? q.getZ(i) : q.getX(i); uv[i * 2] = sx / 4; uv[i * 2 + 1] = q.getY(i) / 4; } fort.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
    fort.castShadow = fort.receiveShadow = true; scene.add(fort);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 0.3).translate((x0 + x1) / 2, GY + 2.2, z1 + 0.05), new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 1 })));
    block(x0 - 4.5, x1 + 4.5, z0 - 4.5, z1 + 4.5);
    // a white palace with deep verandas on the waterfront
    const P = PALACE, pc = [];
    pc.push(tint(new THREE.BoxGeometry(P.x1 - P.x0 - 8, 15, P.z1 - P.z0 - 8).translate((P.x0 + P.x1) / 2, GY + 7.5, (P.z0 + P.z1) / 2), 0xf1eee6));
    for (let f = 0; f < 4; f++) pc.push(tint(new THREE.BoxGeometry(P.x1 - P.x0, 0.5, P.z1 - P.z0).translate((P.x0 + P.x1) / 2, GY + f * 5 + (f === 3 ? -0.25 : 0), (P.z0 + P.z1) / 2), 0xe8e2d6));
    for (let f = 0; f < 3; f++) for (let x = P.x0 + 0.5; x <= P.x1 - 0.5; x += 3.3) [P.z0 + 0.5, P.z1 - 0.5].forEach((z) => pc.push(tint(new THREE.CylinderGeometry(0.28, 0.3, 4.5, 8).translate(x, GY + f * 5 + 2.5, z), 0xf4f1ea)));
    for (let f = 0; f < 3; f++) for (let z = P.z0 + 3.8; z <= P.z1 - 3.8; z += 3.3) [P.x0 + 0.5, P.x1 - 0.5].forEach((x) => pc.push(tint(new THREE.CylinderGeometry(0.28, 0.3, 4.5, 8).translate(x, GY + f * 5 + 2.5, z), 0xf4f1ea)));
    pc.push(tint(new THREE.BoxGeometry(6, 12, 6).translate((P.x0 + P.x1) / 2, GY + 21, P.z1 - 6), 0xf1eee6), tint(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 20).rotateX(PI / 2).translate((P.x0 + P.x1) / 2, GY + 24, P.z1 - 2.9), 0x2a2a2a));
    const palace = new THREE.Mesh(mergeGeometries(pc), vmat({ roughness: 0.8 })); palace.castShadow = palace.receiveShadow = true; scene.add(palace);
    block(P.x0, P.x1, P.z0, P.z1);
    // Forodhani: lawns, trees and, after dark, the food stalls
    const lawn = new THREE.Shape(); lawn.moveTo(-74, -4); lawn.lineTo(40, -4); lawn.lineTo(40, 13); lawn.lineTo(-74, 13); lawn.lineTo(-74, -4);
    [[-60, 1], [-20, 1], [18, 1]].forEach(([x, z]) => { const hp = new THREE.Path(); hp.moveTo(x, z); hp.lineTo(x + 30, z); hp.lineTo(x + 30, z + 9); hp.lineTo(x, z + 9); hp.lineTo(x, z); });
    const lawns = [[-70, -3, -34, 2], [-30, -3, 6, 2], [10, -3, 38, 2]].map(([a, b, c, d]) => new THREE.PlaneGeometry(c - a, d - b).rotateX(-PI / 2).translate((a + c) / 2, GY + 0.03, (b + d) / 2));
    scene.add(new THREE.Mesh(mergeGeometries(lawns), new THREE.MeshStandardMaterial({ color: 0x56703a, roughness: 1 })));
    const treeGeo = mergeGeometries([tint(new THREE.CylinderGeometry(0.25, 0.4, 4, 7).translate(0, 2, 0), 0x5a4a3a), ...[[0, 5.5, 0, 3], [1.8, 5, 0.8, 2.2], [-1.6, 5.2, -0.6, 2.4], [0.4, 6.4, -1.4, 2]].map(([x, y, z, r]) => tint(new THREE.IcosahedronGeometry(r, 1).scale(1, 0.7, 1).translate(x, y, z), 0x3f5a2a))]);
    const trees = []; for (let x = -68; x < 36; x += 8 + rnd() * 5) trees.push({ x, y: GY, z: -1 + rnd() * 2, r: rnd() * 6, s: 0.8 + rnd() * 0.4 });
    instanced(treeGeo, vmat(), trees, true);
    const stallGeo = mergeGeometries([
      tint(new THREE.BoxGeometry(2.2, 0.85, 1.1).translate(0, 0.43, 0), 0xf2efe6), tint(new THREE.BoxGeometry(2.3, 0.04, 1.2).translate(0, 0.88, 0), 0xd84a2a),
      ...[[-1.05, -0.5], [1.05, -0.5], [-1.05, 0.5], [1.05, 0.5]].map(([x, z]) => tint(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 4).translate(x, 1.1, z), 0x777777)),
      tint(new THREE.BoxGeometry(2.4, 0.05, 1.4).translate(0, 2.2, 0), 0xe8e0c8),
      ...[0, 1, 2, 3, 4, 5].map((i) => tint(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5).rotateZ(PI / 2).translate(-0.4 + (i % 3) * 0.4, 0.93, -0.2 + (i > 2 ? 0.25 : 0)), [0x8a4a2a, 0xc0b090, 0x6a3a2a][i % 3])),
    ]);
    const coalGeo = new THREE.BoxGeometry(1.0, 0.12, 0.5).translate(0, 0.95, 0.25);
    [-0.2, 9.8].forEach((z, row) => { for (let x = -66; x < 34; x += 6.5) { forodhani.stalls.push({ x: x + rnd() * 1.2, y: GY, z: z + (rnd() - 0.5) * 0.6 + 3, r: row ? PI : 0 }); } });
    forodhani.mesh = instanced(stallGeo, vmat({ roughness: 0.7 }), forodhani.stalls, true);
    forodhani.coals = instanced(coalGeo, new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: 0xff5a18, emissiveIntensity: 2.5, roughness: 1 }), forodhani.stalls, false);
    forodhani.stalls.forEach((s) => { block(s.x - 1.3, s.x + 1.3, s.z - 0.8, s.z + 0.8); lampPos.push(s.x, s.y + 2.05, s.z); });
    trees.forEach((t) => block(t.x - 0.5, t.x + 0.5, t.z - 0.5, t.z + 0.5));
  } else {
    // Fort Jesus: a square fort with an arrow-shaped bastion at each corner
    const pts = [];
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
      if (sx === sy) pts.push([sx * 30, sy * 22], [sx * 42, sy * 42], [sx * 22, sy * 30]); else pts.push([sx * 22, sy * 30], [sx * 42, sy * 42], [sx * 30, sy * 22]);
    });
    const outline = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
    const yard = new THREE.Path([[-24, -24], [24, -24], [24, 24], [-24, 24]].map(([a, b]) => new THREE.Vector2(a, b)));
    outline.holes.push(yard);
    const fg = new THREE.ExtrudeGeometry(outline, { depth: 13, bevelEnabled: false }); fg.rotateX(-PI / 2); fg.translate(FJ.x, GY, FJ.z);
    { const q = fg.attributes.position, uv = fg.attributes.uv; for (let i = 0; i < q.count; i++) uv.setXY(i, (q.getX(i) + q.getZ(i)) / 4, q.getY(i) / 4); }
    const parapet = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))); parapet.holes.push(new THREE.Path(pts.map(([a, b]) => new THREE.Vector2(a * 0.975, b * 0.975)).reverse()));
    const pg = new THREE.ExtrudeGeometry(parapet, { depth: 1.0, bevelEnabled: false }); pg.rotateX(-PI / 2); pg.translate(FJ.x, GY + 13, FJ.z);
    const inner = new THREE.Shape([[-24.2, -24.2], [24.2, -24.2], [24.2, 24.2], [-24.2, 24.2]].map(([a, b]) => new THREE.Vector2(a, b))); inner.holes.push(new THREE.Path([[-23.6, -23.6], [-23.6, 23.6], [23.6, 23.6], [23.6, -23.6]].map(([a, b]) => new THREE.Vector2(a, b))));
    const ig = new THREE.ExtrudeGeometry(inner, { depth: 1.0, bevelEnabled: false }); ig.rotateX(-PI / 2); ig.translate(FJ.x, GY + 13, FJ.z);
    const fort = new THREE.Mesh(mergeGeometries([fg, pg, ig].map((g) => g.index ? g.toNonIndexed() : g)), fortMat);
    fort.castShadow = fort.receiveShadow = true; scene.add(fort);
    // buildings in the courtyard and the gate
    const yb = mergeGeometries([tint(new THREE.BoxGeometry(30, 6, 9).translate(FJ.x - 4, GY + 3, FJ.z - 14), 0xe6dccb), tint(new THREE.BoxGeometry(10, 5, 14).translate(FJ.x + 14, GY + 2.5, FJ.z + 6), 0xd8c8aa), tint(new THREE.BoxGeometry(5, 6.5, 0.4).translate(FJ.x, GY + 3.2, FJ.z - 30.1), 0x15110d)]);
    const ym = new THREE.Mesh(yb, vmat()); ym.castShadow = ym.receiveShadow = true; scene.add(ym);
    const shape2d = pts; // block the whole fort footprint
    for (let z = FJ.z - 43; z < FJ.z + 43; z += 0.5) for (let x = FJ.x - 43; x < FJ.x + 43; x += 0.5) {
      let ins = false; const px = x - FJ.x, py = -(z - FJ.z);
      for (let a = 0, b = shape2d.length - 1; a < shape2d.length; b = a++) { const [xa, ya] = shape2d[a], [xb, yb2] = shape2d[b]; if ((ya > py) !== (yb2 > py) && px < (xb - xa) * (py - ya) / (yb2 - ya) + xa) ins = !ins; }
      if (ins) { const c = cell(x, z); if (c >= 0) OCC[c] = 1; }
    }
    for (let x = -200; x < 200; x += 14) lampPos.push(x, GY + 0.5, shoreZ(x) - 0.4);
  }

  // ---------- dhows ----------
  function dhowGeo(sail) {
    const hull = new THREE.BoxGeometry(10, 1.8, 3, 28, 6, 8), p = hull.attributes.position, nrm = new V3(), col = [];
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / 5, v = (p.getY(i) + 0.9) / 1.8;
      const w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), u > 0 ? 2.2 : 4)), 0.55);
      p.setZ(i, p.getZ(i) * w * (0.22 + 0.78 * Math.pow(v, 0.7)));
      p.setY(i, p.getY(i) + 0.6 * Math.max(0, u) ** 2 * v + 0.3 * Math.max(0, -u) ** 2 * v + (1 - v) * 0.45 * u * u + 0.35);
    }
    hull.computeVertexNormals();
    const g = hull.toNonIndexed(), q = g.attributes.position, nn = g.attributes.normal, cc = new THREE.Color();
    for (let i = 0; i < q.count; i++) { nrm.fromBufferAttribute(nn, i); const y = q.getY(i); cc.set(nrm.y > 0.8 && y > 1.0 ? 0x9a7a52 : y < 0.15 ? 0x2c241e : y > 1.1 ? 0xd8c8a0 : 0x6f4f32); col.push(cc.r, cc.g, cc.b); }
    g.deleteAttribute('uv'); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const parts = [g, tint(new THREE.CylinderGeometry(0.08, 0.13, 8.4, 8).translate(0, 4.2, 0).rotateZ(-0.11).translate(1.1, 1.0, 0), 0x5a4030)];
    parts.push(tint(new THREE.CylinderGeometry(0.07, 0.07, 9, 6).rotateZ(PI / 2 - 0.05).translate(0.4, sail ? 6.2 : 3.0, 0), 0x5a4030));
    parts.push(tint(new THREE.CylinderGeometry(0.22, 0.22, 8.6, 8).rotateZ(PI / 2 - 0.05).translate(0.4, sail ? 5.95 : 2.75, 0), 0xe2d6b8));
    if (sail) { // an awning over the deck for dinner, and lanterns
      parts.push(tint(new THREE.BoxGeometry(5.5, 0.06, 2.6).translate(-1.6, 3.1, 0), 0xe8dcc0));
      [[-4, 1.1], [-4, -1.1], [0.8, 1.1], [0.8, -1.1]].forEach(([x, z]) => parts.push(tint(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5).translate(x, 2.15, z), 0x5a4030)));
      parts.push(tint(new THREE.BoxGeometry(3.2, 0.7, 1.0).translate(-1.6, 1.55, 0), 0xf2efe6));
    }
    parts.push(tint(new THREE.BoxGeometry(0.9, 1.4, 0.08).translate(-5.15, 0.4, 0), 0x4a3828));
    return mergeGeometries(parts);
  }
  const moored = (isM ? [[-70, 26], [-55, 30], [-40, 24], [-22, 32], [-8, 27], [10, 34], [-90, 36], [30, 45]] : [[-150, 40], [-110, 55], [-60, 70], [-10, 48], [50, 62], [100, 45], [150, 70], [20, 110], [-80, 120]])
    .map(([x, dz]) => ({ x, z: shoreZ(x) + dz, r: rnd() * 6, ph: rnd() * 6 }));
  const mooredMesh = instanced(dhowGeo(false), vmat({ side: THREE.DoubleSide }), moored.map((b) => ({ ...b, y: 0 })), true);
  const dhow = new THREE.Mesh(dhowGeo(true), vmat({ side: THREE.DoubleSide })); dhow.castShadow = true; scene.add(dhow);
  const sailPath = (s) => new V3(30 + Math.sin(s) * 150, 0, shoreZ(30) + 70 + Math.cos(s) * 34);
  const deckLamps = [[-4, 2.9, 1.1], [-4, 2.9, -1.1], [0.8, 2.9, 1.1], [0.8, 2.9, -1.1]].map(([x, y, z]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb466, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.position.set(x, y, z); s.scale.setScalar(0.7); dhow.add(s); return s; });
  const deckLight = new THREE.PointLight(0xffa860, 0, 14, 2); deckLight.position.set(-1.6, 2.8, 0); dhow.add(deckLight);

  // ---------- the rooftop terrace (Stone Town) and the bastion lookout (Mombasa) ----------
  let roofAt = null;
  if (!isM) {
    let best = null, bd = 1e9;
    houses.forEach((h) => { if (!h.flat) return; const cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2, d = Math.hypot(cx - 6, cz + 24) - (h.H - GY) * 0.6; if (d < bd && h.z1 < -10) { bd = d; best = h; } });
    if (best) {
      roofAt = new V3((best.x0 + best.x1) / 2, best.H, best.z1 - 1.6);
      const furn = mergeGeometries([
        tint(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14).translate(0, 0.72, 0), 0x6a4a2a), tint(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 5).translate(0, 0.36, 0), 0x3a2a1a),
        ...[[-0.75, 0], [0.75, 0]].map(([x, z]) => tint(new THREE.BoxGeometry(0.5, 0.45, 0.5).translate(x, 0.23, z), 0x8a5a3a)),
      ]);
      instanced(furn, vmat(), [[-2.5, 0], [1.8, -0.6], [-0.4, -3]].map(([dx, dz]) => ({ x: roofAt.x + dx, y: best.H, z: roofAt.z + dz - 0.6, r: rnd() * 6 })), true);
      for (let i = 0; i < 6; i++) lampPos.push(best.x0 + (best.x1 - best.x0) * (i + 0.5) / 6, best.H + 0.75, best.z1 - 0.2);
    }
  }
  const lookout = isM ? new V3(FJ.x + 35, GY + 13, FJ.z + 35) : null;

  // street and stall lamps
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  const lamps = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb466, size: 0.9, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  scene.add(lamps);
  const marketLights = isM ? [] : [-50, -15, 20].map((x) => { const l = new THREE.PointLight(0xffa860, 0, 26, 2); l.position.set(x, GY + 3.2, 5); scene.add(l); return l; });
  const smokeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(220,220,220,.5)'); gr.addColorStop(1, 'rgba(220,220,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const smoke = isM ? [] : forodhani.stalls.filter((_, i) => i % 2 === 0).map((s, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { s, ph: rnd() * 6 }; scene.add(sp); return sp; });

  // ---------- walking routes ----------
  function laneLoop(i0, i1, j0, j1) {
    const pts = [], step = 3;
    const along = (l, a, b, fn) => { const n = Math.ceil(Math.abs(b - a) / step); for (let k = 0; k < n; k++) { const s = a + (b - a) * k / n; pts.push(fn(l, s)); } };
    const x0 = LX[i0].c, x1 = LX[i1].c, z0 = LZ[j0].c, z1 = LZ[j1].c;
    along(LZ[j0], x0, x1, (l, x) => new V3(x, 0, laneZ(l, x)));
    along(LX[i1], z0, z1, (l, z) => new V3(laneX(l, z), 0, z));
    along(LZ[j1], x1, x0, (l, x) => new V3(x, 0, laneZ(l, x)));
    along(LX[i0], z1, z0, (l, z) => new V3(laneX(l, z), 0, z));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }
  const mid = Math.floor(LX.length / 2);
  const routes = {
    lanes: laneLoop(mid - 2, mid + 1, 1, 3),
    oldtown: laneLoop(Math.max(0, mid - 4), mid - 1, 1, 3),
    forodhani: new THREE.CatmullRomCurve3([[-58, 4.6], [-20, 5.2], [28, 4.6], [33, 12.5], [-20, 14.5], [-62, 12.5]].map(([x, z]) => new V3(x, 0, z)), true, 'centripetal'),
  };
  const routeLen = {}; Object.keys(routes).forEach((k) => (routeLen[k] = routes[k].getLength()));

  // ---------- sky, stars, moon, light ----------
  const sky = new Sky(); sky.scale.setScalar(6000); scene.add(sky);
  const su = sky.material.uniforms; su.cloudCoverage.value = 0.3; su.cloudDensity.value = 0.4; su.cloudElevation.value = 0.5;
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(6000); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(R); let envRT = null, lastEnv = { h: -99, t: 0 };
  const starG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 3500; i++) { const u = rnd() * 0.97 + 0.03, t = rnd() * 6.283, rr = Math.sqrt(1 - u * u); sp.push(rr * Math.cos(t) * 5000, u * 5000, rr * Math.sin(t) * 5000); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
  const moonDir = new V3(-0.4, 0.45, 0.8).normalize();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fffef5'); gr.addColorStop(0.28, '#f4f0e0'); gr.addColorStop(0.31, 'rgba(240,240,255,.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: false }));
  moon.scale.setScalar(260); scene.add(moon);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xc8b898, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 700 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  const moonLight = new THREE.DirectionalLight(0x9db4e0, 0); moonLight.position.copy(moonDir).multiplyScalar(500); scene.add(moonLight);
  let composer = null, bloom = null;
  if (!mobile) { composer = new EffectComposer(R); composer.addPass(new RenderPass(scene, cam)); bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass()); }

  // ---------- sound: sea and wind, off until asked ----------
  let ac = null, bed = null;
  function sound(on) {
    if (on && !ac) {
      ac = new AudioContext();
      const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), dd = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; dd[i] = last * 3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      bed = ac.createGain(); bed.gain.value = 0; src.connect(lp).connect(bed).connect(ac.destination); src.start();
    } else if (!on && ac) { ac.close(); ac = bed = null; }
  }

  // ---------- state ----------
  const S = { k: MOMENTS[initial] ? initial : ORDER[0], started: false, auto: true, hours: 10, yaw: 0, pitch: 0, lookYaw: 0, lookPitch: 0, lastLook: 0 };
  const P = new V3(), keys = new Set();
  let walkU = 0, sailS = 0, overviewA = 0;
  const mode = () => MOMENTS[S.k].mode;
  if (process.env.NODE_ENV !== 'production') window.__town = { S, R, scene, cam, THREE, get bloom() { return bloom; } };
  function enter(k) {
    S.k = k; const m = MOMENTS[k]; S.hours = m.time; S.auto = true; S.lookYaw = S.lookPitch = 0;
    if (m.mode === 'walk') { walkU = 0; const p = routes[k].getPointAt(0); P.set(p.x, 0, p.z); }
    else if (m.mode === 'view') {
      if (isM) { P.copy(lookout); S.yaw = PI / 4; S.pitch = -0.08; } else { P.copy(roofAt || new V3(0, GY + 14, -20)); S.yaw = 0.1; S.pitch = -0.05; }
    } else { sailS = -0.6; }
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
    $('#zNT').textContent = `${m.day} · ${m.name}`; $('#zNX').textContent = m.note;
    $('#zNTip').textContent = m.mode === 'walk' ? 'Drag to look. W/A/S/D or the arrows walk the lanes yourself, Shift walks faster.'
      : m.mode === 'sail' ? 'Drag to look around the deck. Time runs a little faster on the water.' : 'Drag to look around.';
    $('#zAuto').setAttribute('aria-pressed', String(S.auto));
    $('#zAuto').textContent = m.mode === 'walk' ? 'Guided walk' : m.mode === 'sail' ? 'Cruising' : 'Look around';
    root.classList.toggle('z-noWalk', m.mode !== 'walk');
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
  on($('#zAuto'), 'click', () => { S.auto = !S.auto; if (S.auto) { S.lookYaw = S.lookPitch = 0; if (mode() === 'walk') walkU = nearestU(P); } ui(); });
  on($('#zSound'), 'click', (e) => { const b = e.currentTarget, v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); sound(v); });
  on(clock, 'input', () => { S.hours = +clock.value; });
  const nearestU = (p) => { const r = routes[S.k]; let best = 0, bd = 1e9; for (let i = 0; i < 400; i++) { const q = r.getPointAt(i / 400), d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = i / 400; } } return best; };
  let drag = null;
  on(canvas, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  on(canvas, 'pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.x) * 0.004, dy = (e.clientY - drag.y) * 0.004; drag = { x: e.clientX, y: e.clientY };
    if (mode() === 'walk' && !S.auto) { S.yaw -= dx; S.pitch = Math.max(-1.3, Math.min(1.3, S.pitch - dy)); }
    else { S.lookYaw -= dx; S.lookPitch = Math.max(-1.2, Math.min(1.2, S.lookPitch - dy)); S.lastLook = performance.now(); }
  });
  on(canvas, 'pointerup', () => { drag = null; }); on(canvas, 'pointercancel', () => { drag = null; });
  const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  function takeOver() {
    if (!S.auto || mode() !== 'walk') return;
    const f = new V3(); cam.getWorldDirection(f); S.yaw = Math.atan2(f.x, f.z); S.pitch = Math.asin(Math.max(-1, Math.min(1, f.y)));
    S.auto = false; S.lookYaw = S.lookPitch = 0; ui();
  }
  on(window, 'keydown', (e) => {
    if (e.target.closest?.('input,select,textarea')) return;
    if (e.code === 'Escape') { onExit?.(); return; }
    if (!S.started) return;
    if (e.code === 'KeyP') { $('#zAuto').click(); return; }
    if (e.code === 'KeyN') { step(1); return; }
    const m = MOVE[e.code]; if (m) { e.preventDefault(); keys.add(m); takeOver(); }
    if (e.key === 'Shift') keys.add('run');
  });
  on(window, 'keyup', (e) => { const m = MOVE[e.code]; if (m) keys.delete(m); if (e.key === 'Shift') keys.delete('run'); });
  root.querySelectorAll('#zPad [data-k]').forEach((b) => {
    on(b, 'pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.k); takeOver(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => on(b, ev, () => keys.delete(b.dataset.k)));
  });

  let W = 1, H = 1;
  function resize() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    R.setPixelRatio(pr); R.setSize(W, H, false);
    cam.aspect = W / H; cam.fov = W < H ? 74 : 62; cam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); bloom.setSize(W / 2, H / 2); }
  }
  on(window, 'resize', resize); resize();

  // ---------- sun ----------
  const sunDir = new V3(), cWarm = new THREE.Color(0xff9a50), cWhite = new THREE.Color(0xfff4e6), tmpC = new THREE.Color();
  const skyDay = new THREE.Color(0xbcd4e6), skySet = new THREE.Color(0xe8a070), skyNight = new THREE.Color(0x0a1424), nightBg = new THREE.Color(0x060d1c);
  const fogDay = new THREE.Color(0xdcd6c8), fogSet = new THREE.Color(0xd8956a), fogNight = new THREE.Color(0x0b1322);
  const seaDay = new THREE.Color(0x0f4a52);
  function sunAt(h) { const a = PI * (h - 6.33) / 12.35; return sunDir.set(0.22, Math.sin(a), (PL.seaWest ? -1 : 1) * Math.cos(a)).normalize(); }

  // ---------- frame ----------
  const camT = new V3(), fwd = new V3(), tmp = new V3();
  const timer = new THREE.Timer(); let t = 0, raf = 0, slow = 0, frames = 0, statT = 0;
  const lookVec = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update(); const raw = timer.getDelta(), dt = Math.min(raw, 0.1), rdt = Math.min(raw, 1); if (!reduce) t += dt;
    const md = mode();
    if (S.started && S.auto) S.hours = Math.min(23.9, S.hours + dt / 60 * (md === 'sail' ? 0.5 : md === 'view' ? 0.6 : 0.2));
    const h = S.hours;
    if (S.auto && performance.now() - S.lastLook > 3000) { const k = 1 - Math.pow(0.4, rdt); S.lookYaw *= 1 - k; S.lookPitch *= 1 - k; }
    const run = keys.has('run');

    if (!S.started) {
      overviewA += dt * 0.03;
      cam.position.set(Math.sin(overviewA) * 190, 85, -70 + Math.cos(overviewA) * 190 + 40); camT.set(0, GY, -60); cam.lookAt(camT);
    } else if (md === 'walk') {
      if (S.auto) {
        const r = routes[S.k]; walkU = (walkU + 1.05 * dt / routeLen[S.k]) % 1;
        const p = r.getPointAt(walkU), ahead = r.getPointAt((walkU + 4 / routeLen[S.k]) % 1);
        P.x += (p.x - P.x) * (1 - Math.pow(0.2, rdt)); P.z += (p.z - P.z) * (1 - Math.pow(0.2, rdt));
        const want = Math.atan2(ahead.x - P.x, ahead.z - P.z) + 0.35 * Math.sin(t * 0.11);
        S.yaw += wrap(want - S.yaw) * (1 - Math.pow(0.3, rdt)); S.pitch += (0.06 - S.pitch) * (1 - Math.pow(0.5, rdt));
      } else {
        const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
        if (f || s) {
          const spd = (run ? 3.2 : 1.4) * dt, nx = P.x + (Math.sin(S.yaw) * f - Math.cos(S.yaw) * s) * spd, nz = P.z + (Math.cos(S.yaw) * f + Math.sin(S.yaw) * s) * spd;
          const ok = (x, z) => free(x, z) && free(x + 0.3, z) && free(x - 0.3, z) && free(x, z + 0.3) && free(x, z - 0.3);
          if (ok(nx, nz)) { P.x = nx; P.z = nz; } else if (ok(nx, P.z)) P.x = nx; else if (ok(P.x, nz)) P.z = nz;
        }
      }
      P.y = GY + 1.62; cam.position.copy(P);
      lookVec(S.yaw + S.lookYaw, S.pitch + S.lookPitch, fwd); cam.lookAt(camT.copy(P).add(fwd));
    } else if (md === 'view') {
      cam.position.set(P.x, P.y + 1.62, P.z);
      lookVec(S.yaw + 0.5 * Math.sin(t * 0.04) * (S.auto ? 1 : 0) + S.lookYaw, S.pitch + S.lookPitch, fwd); cam.lookAt(camT.copy(cam.position).add(fwd));
    }
    // the dinner dhow
    {
      if (S.started && md === 'sail' && S.auto) sailS += dt * 2.0 / 150;
      const p0 = sailPath(sailS), p1 = sailPath(sailS + 0.003), yaw = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
      dhow.position.set(p0.x, Math.sin(t * 1.1) * 0.1, p0.z); dhow.rotation.set(Math.sin(t * 0.8) * 0.04, yaw, Math.sin(t * 0.63) * 0.02);
      if (S.started && md === 'sail') {
        dhow.updateMatrixWorld(); cam.position.copy(dhow.localToWorld(tmp.set(2.3, 2.15, 0.75)));
        const town = Math.atan2(40 - cam.position.x, -40 - cam.position.z);
        lookVec(town + S.lookYaw, -0.02 + S.lookPitch, fwd); cam.lookAt(camT.copy(cam.position).add(fwd));
      }
    }
    if (!reduce) { moored.forEach((b, i) => { dummy.position.set(b.x, Math.sin(t * 1.2 + b.ph) * 0.08, b.z); dummy.rotation.set(Math.sin(t * 0.9 + b.ph) * 0.04, b.r + Math.sin(t * 0.05 + b.ph) * 0.2, Math.sin(t * 1.1 + b.ph) * 0.05); dummy.scale.setScalar(1); dummy.updateMatrix(); mooredMesh.setMatrixAt(i, dummy.matrix); }); mooredMesh.instanceMatrix.needsUpdate = true; }

    // --- light ---
    sunAt(h);
    const elDeg = Math.asin(sunDir.y) * 180 / PI, day = sst(-4, 12, elDeg), night = sst(1, -10, elDeg), golden = sst(16, 2, elDeg) * sst(-5, 1, elDeg);
    su.sunPosition.value.copy(sunDir); su.turbidity.value = 3 + 2 * golden; su.rayleigh.value = 1.2 + 1.0 * golden + 0.6 * night;
    su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.82; su.time.value = t;
    sky.position.copy(cam.position); stars.position.copy(cam.position); moon.position.copy(cam.position).addScaledVector(moonDir, 4500);
    R.toneMappingExposure = 0.46 + 0.3 * golden + 0.6 * night;
    sun.color.copy(cWarm).lerp(cWhite, sst(3, 28, elDeg)); sun.intensity = 3.2 * sst(-1, 10, elDeg);
    sun.target.position.copy(cam.position).addScaledVector(lookVec(S.yaw, 0, fwd), md === 'walk' ? 18 : 40); sun.target.position.y = GY;
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 400); sun.castShadow = elDeg > 1;
    tmpC.copy(skyNight).lerp(skySet, golden * (1 - night)).lerp(skyDay, sst(12, 30, elDeg)); hemi.color.copy(tmpC);
    hemi.intensity = 0.3 + 0.55 * day + 0.25 * night; moonLight.intensity = 1.0 * night;
    scene.environmentIntensity = 0.05 + 0.2 * day;
    stars.material.opacity = 0.8 * night; stars.visible = moon.visible = night > 0.01; moon.material.opacity = night;
    sky.visible = night <= 0.85; scene.background = night > 0.85 ? nightBg : null;
    fog.color.copy(fogNight).lerp(fogSet, golden * (1 - night)).lerp(fogDay, sst(12, 30, elDeg)); fog.density = (md === 'walk' ? 0.0025 : 0.0011) + 0.0004 * golden;
    const dusk = sst(3, -4, elDeg);
    lamps.material.opacity = dusk; wallMatU.emissiveIntensity = 0.9 * dusk; fortMat.emissiveIntensity = isM ? 0.22 * dusk : 0.08 * dusk;
    sea.material.color.copy(seaDay).multiplyScalar(0.25 + 0.75 * day); sea.material.emissive.setRGB(0.012, 0.03, 0.05).multiplyScalar(night);
    waterN.offset.set(t * 0.004, t * 0.006);
    deckLamps.forEach((s) => (s.material.opacity = dusk)); deckLight.intensity = 30 * dusk;
    if (!isM) {
      const market = h > 16.5 ? 1 : 0; forodhani.mesh.visible = forodhani.coals.visible = market > 0;
      marketLights.forEach((l, i) => (l.intensity = 40 * dusk * market * (0.9 + 0.1 * Math.sin(t * 7 + i))));
      smoke.forEach((sp, i) => { const u = sp.userData, k = ((t * 0.25 + u.ph) % 1); sp.visible = market > 0; sp.position.set(u.s.x + Math.sin(t * 0.5 + u.ph) * 0.3, u.s.y + 1.1 + k * 3, u.s.z + 0.25); sp.scale.setScalar(0.6 + k * 2.2); sp.material.opacity = 0.35 * (1 - k) * market; });
    }
    if (bloom) { bloom.enabled = night > 0.05; bloom.strength = 0.5 * night; bloom.threshold = 1.2; }
    if (bed) bed.gain.value = md === 'sail' ? 0.12 : 0.05;

    const now = performance.now();
    if (Math.abs(h - lastEnv.h) > 0.05 && now - lastEnv.t > 200) {
      const eu = envSky.material.uniforms; ['sunPosition', 'turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach((n) => { if (eu[n].value.copy) eu[n].value.copy(su[n].value); else eu[n].value = su[n].value; });
      eu.cloudCoverage.value = 0; const rt = pmrem.fromScene(envScene); envRT?.dispose(); envRT = rt; scene.environment = rt.texture; lastEnv = { h, t: now };
    }

    statT -= dt;
    if (S.started && statT <= 0) {
      statT = 0.4;
      $('#zTime').textContent = fmtTime(h); if (document.activeElement !== clock) clock.value = h.toFixed(2); $('#zClockL').textContent = fmtTime(h);
      $('#zAir').textContent = `${Math.round(25 + 6 * Math.max(0, Math.sin(PI * (h - 8) / 12)))} °C`;
      let where;
      if (md === 'sail') where = 'Aboard a dhow, about 4 knots';
      else if (md === 'view') where = isM ? 'On a bastion, 13 m up' : 'On a rooftop terrace';
      else if (!isM && cam.position.z > -5) where = 'In Forodhani Gardens';
      else { let w = 99; LX.forEach((l) => { const d = Math.abs(cam.position.x - laneX(l, cam.position.z)); if (d < 3) w = Math.min(w, l.w); }); LZ.forEach((l) => { const d = Math.abs(cam.position.z - laneZ(l, cam.position.x)); if (d < 3) w = Math.min(w, l.w); }); where = w < 99 ? `In a lane ${w.toFixed(1)} m wide` : 'In the old town'; }
      $('#zWhere').textContent = where;
      $('#zSea').textContent = '27 °C';
      const uv = Math.max(0, Math.round(12 * Math.pow(Math.max(0, sunDir.y), 1.6)));
      $('#zUv').textContent = elDeg < 0 ? 'Night' : `UV ${uv}${uv >= 11 ? ', extreme' : uv >= 8 ? ', very high' : uv >= 6 ? ', high' : uv >= 3 ? ', moderate' : ', low'}`;
      $('#zSun').textContent = 'Sunrise 06:20 · sunset 18:40';
      $('#zSub').textContent = `${MOMENTS[S.k].day} · ${fmtTime(h)}`;
    }

    if (composer) composer.render(); else R.render(scene, cam);
    frames++; if (dt > 0.034) slow++;
    if (frames === 120) { if (slow > 60 && pr > 1) { pr = Math.max(1, pr - 0.35); resize(); } frames = slow = 0; }
  }

  S.hours = MOMENTS[S.k].time; ui(); hud(false);
  frame();

  return () => {
    cancelAnimationFrame(raf); off.forEach((f) => f()); sound(false);
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    envRT?.dispose(); pmrem.dispose(); composer?.dispose(); R.dispose();
  };
}
