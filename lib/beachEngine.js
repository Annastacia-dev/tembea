import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as ZNZ from './zanzibar';
import * as DIANI from './diani';

// An East African beach at walking scale. 1 unit = 1 m. x runs along the beach, z runs out to sea.
// place 'zanzibar': Nungwi, facing west, so the sun sets over the sea (+z).
// place 'diani': Diani facing east, so the sun rises over the sea; the Kongo River mouth and the
// coral platform with the African Map Pool at Tiwi lie to the north (+x).
export function createBeach(root, { stop: initial, onStop, onExit, place = 'zanzibar' }) {
  const isD = place === 'diani';
  const { STOPS, ORDER, fmtTime } = isD ? DIANI : ZNZ;
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
  const fogAir = new THREE.FogExp2(0xcfe3ee, 0.0006), fogSea = new THREE.FogExp2(0x0f6d78, 0.05);
  scene.fog = fogAir;
  const cam = new THREE.PerspectiveCamera(60, 1, 0.05, 9000);

  // ---------- noise ----------
  let seed = 11;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };

  // ---------- the coast ----------
  const zs = (x) => 16 * Math.sin(x * 0.006 + 0.4) + 7 * Math.sin(x * 0.017 + 1.3) + 0.00042 * x * x; // shoreline, curving into a bay
  const reefM = (x, d) => sst(140, 200, d) * sst(390, 330, d) * sst(560, 400, Math.abs(x));
  function hgt0(x, z) {
    const d = z - zs(x), n1 = fbm(x * 0.012, z * 0.012, 3), n2 = fbm(x * 0.07 + 5, z * 0.07, 2);
    if (d < 0) {
      let h = Math.min(2.1, -d * 0.075) + (n2 - 0.5) * 0.15 * sst(0, -10, d);
      h += sst(-28, -55, d) * (0.8 + (n1 - 0.5) * 2.2); // back-beach dunes
      h += sst(-60, -240, d) * (2.5 + n1 * 7); // coral-rag scrub inland
      return h;
    }
    let h = -Math.min(2.3, d * 0.032) - (n2 - 0.5) * 0.3 * sst(5, 30, d); // lagoon with sand ripples
    h -= sst(80, 200, d) * 5;
    h += reefM(x, d) * (fbm(x * 0.03 + 9, z * 0.03, 4) - 0.35) * 7.5; // coral heads
    h -= sst(370, 470, d) * 22; // reef drop-off
    return h;
  }
  // Diani: the Kongo River cuts the beach; north of it a raised coral platform holds a pool shaped like Africa
  const RX = (z) => 330 + 16 * Math.sin(z * 0.013 + 1);
  const PC = { x: 470, z: zs(470) + 24 };
  const AFR = [[-6, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [35, 24], [38, 18], [43, 12], [51, 12], [48, 5], [42, -1], [40, -10], [40, -16], [35, -24], [33, -28], [28, -33], [20, -35], [18, -32], [15, -27], [12, -17], [13, -12], [9, -1], [9, 4], [5, 6], [-2, 5], [-8, 4], [-13, 8], [-17, 14], [-17, 21], [-13, 28], [-10, 30]]
    .map(([lon, lat]) => [-(lon - 17) * 0.2, (lat - 1) * 0.2]); // about 14 m north to south, reading upright from the outcrop on the landward side
  function poolSD(px, pz) { // signed distance to the outline, negative inside
    let inside = false, md = 1e9;
    for (let i = 0, j = AFR.length - 1; i < AFR.length; j = i++) {
      const [xi, zi] = AFR[i], [xj, zj] = AFR[j];
      if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
      const ex = xj - xi, ez = zj - zi, t = Math.max(0, Math.min(1, ((px - xi) * ex + (pz - zi) * ez) / (ex * ex + ez * ez)));
      md = Math.min(md, Math.hypot(px - xi - ex * t, pz - zi - ez * t));
    }
    return inside ? -md : md;
  }
  const platM = (x, z) => { const px = x - PC.x, pz = z - PC.z; if (Math.abs(px) > 34 || Math.abs(pz) > 34) return 0; return sst(24, 19, Math.hypot(px, pz * 1.25) + (fbm(x * 0.15, z * 0.15, 3) - 0.5) * 7); };
  function hgt(x, z) {
    let h = hgt0(x, z);
    if (!isD) return h;
    const d = z - zs(x), rd = Math.abs(x - RX(z));
    const k = sst(36, 15, rd) * sst(45, 5, d);
    h += (Math.min(h, -1.7 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 0.3) - h) * k;
    const m = platM(x, z);
    if (m > 0) {
      let top = 0.32 + (fbm(x * 0.6 + 3, z * 0.6, 3) - 0.5) * 0.18 + (fbm(x * 2.1, z * 2.1, 2) - 0.5) * 0.06;
      if (m > 0.5) top -= 0.85 * sst(0.05, -0.45, poolSD(x - PC.x, z - PC.z));
      h += (top - h) * m;
      const kd = Math.hypot(x - PC.x + 4, z - PC.z + 15); // a low coral outcrop to look down from
      h += 3.2 * sst(5.5, 2.5, kd + (fbm(x * 0.5, z * 0.5, 2) - 0.5) * 2) * m;
    }
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
  const grainH = periodic(256, 16, 5, 0);
  const sandNormal = normalTex(grainH, 256, 4);
  const sandMap = (() => { const d = new Uint8Array(256 * 256 * 4); for (let i = 0; i < 65536; i++) { const v = Math.min(255, 226 + grainH[i] * 29); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } return dataTex(d, 256, true); })();
  const waveH = (() => {
    const size = 256, g = new Float32Array(size * size), W = [];
    for (let i = 0; i < 28; i++) W.push([Math.round((rnd() - 0.5) * 18) || 1, Math.round((rnd() - 0.5) * 18), rnd() * 6.28, 1 / (1 + i * 0.3)]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let s = 0; for (const [kx, ky, ph, a] of W) s += a * Math.sin(2 * PI * (kx * x + ky * y) / size + ph); g[y * size + x] = s; }
    return g;
  })();
  const waterNormals = normalTex(waveH, 256, 0.3);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

  // ---------- shader patches: caustics under water, palms swaying, fish tails ----------
  const U = { uTime: { value: 0 }, uCaust: { value: 1 }, uWaterY: { value: 0 } };
  const CAUSTIC = `
  float caustic(vec2 uv, float t){
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0; vec2 i = p; float c = 1.0;
    for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005))); }
    c /= 4.0; c = 1.17 - pow(c, 1.4); return clamp(pow(abs(c), 8.0), 0.0, 1.0);
  }
`;
  function patch(m, { caust, sway, wiggle } = {}) {
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      let vs = 'uniform float uTime;\nvarying vec3 vCW;\n' + s.vertexShader;
      let move = '';
      if (sway) move += `
        float ph = 0.0;
        #ifdef USE_INSTANCING
        ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        #endif
        float sw = ${sway.toFixed(5)} * position.y * position.y;
        transformed.x += sw * (sin(uTime * 0.9 + ph) + 0.4 * sin(uTime * 2.3 + ph * 1.7));
        transformed.z += sw * 0.6 * sin(uTime * 1.1 + ph * 1.3);
        transformed.y += 0.05 * sin(uTime * 3.1 + position.x * 1.7 + ph) * smoothstep(7.0, 9.0, position.y) * abs(position.x - 1.8);`;
      if (wiggle) move += `
        transformed.z += sin(uTime * 13.0 + float(gl_InstanceID) * 1.7) * 0.35 * max(0.0, -position.x - 0.03);`;
      vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + move);
      vs = vs.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 cw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        cw = instanceMatrix * cw;
        #endif
        vCW = (modelMatrix * cw).xyz;`);
      s.vertexShader = vs;
      if (caust) s.fragmentShader = 'uniform float uTime, uCaust, uWaterY;\nvarying vec3 vCW;\n' + CAUSTIC + s.fragmentShader.replace('#include <fog_fragment>', `
        float cd = uWaterY - vCW.y;
        if (cd > 0.0) {
          float cc = caustic(vCW.xz * 0.15, uTime * 0.45) + 0.6 * caustic(vCW.xz * 0.23 + 0.37, uTime * 0.35);
          gl_FragColor.rgb += gl_FragColor.rgb * cc * uCaust * 1.6 * smoothstep(0.0, 0.5, cd) * exp(-cd * 0.11);
        }
        #include <fog_fragment>`);
      else s.fragmentShader = 'varying vec3 vCW;\n' + s.fragmentShader;
    };
    m.customProgramCacheKey = () => `bz${caust ? 1 : 0}${sway || 0}${wiggle ? 1 : 0}`;
    return m;
  }

  // ---------- terrain ----------
  const TW = 1400, TD = 920, TX = 0, TZ = 190, SX = mobile ? 280 : 560, SZ = mobile ? 184 : 368;
  const C = {
    dry: new THREE.Color(0xf1e3c6), wet: new THREE.Color(0xcab894), back: new THREE.Color(0xdccdab), veg: new THREE.Color(0x5b6b32), veg2: new THREE.Color(0x857f48),
    floor: new THREE.Color(0xeee3c8), grass: new THREE.Color(0x6c7a48), reef: new THREE.Color(0x9a8660), deep: new THREE.Color(0x8b8676),
  };
  const cRock = new THREE.Color(0x8e8370), cAlgae = new THREE.Color(0x6f7656), cPool = new THREE.Color(0xd8cfae);
  function colorAt(x, z, h, c) {
    const d = z - zs(x), n = fbm(x * 0.05, z * 0.05, 2);
    if (isD) {
      const m = platM(x, z);
      if (m > 0.35) {
        c.copy(cRock).offsetHSL(0, 0, (fbm(x * 0.8, z * 0.8, 3) - 0.5) * 0.16).lerp(cAlgae, sst(0.15, 0.0, h) * 0.6);
        if (m > 0.5 && poolSD(x - PC.x, z - PC.z) < -0.25) c.copy(cPool).offsetHSL(0, 0, (n - 0.5) * 0.08);
        return c;
      }
    }
    if (d < 0) {
      c.copy(C.dry).offsetHSL(0, 0, (n - 0.5) * 0.04);
      c.lerp(C.wet, sst(0.7, 0.08, h));
      c.lerp(C.back, sst(-22, -34, d) * 0.7);
      c.lerp(n > 0.5 ? C.veg : C.veg2, sst(-36, -58, d));
    } else {
      c.copy(C.floor);
      c.lerp(C.grass, sst(0.55, 0.7, fbm(x * 0.02, z * 0.02, 3)) * sst(25, 70, d) * 0.85 * (1 - reefM(x, d)));
      c.lerp(C.reef, reefM(x, d) * sst(0.35, 0.7, fbm(x * 0.03 + 9, z * 0.03, 4)));
      c.lerp(C.deep, sst(360, 450, d));
    }
    return c;
  }
  function terrainMesh(w, dpt, cx, cz, sx, sz, drop) {
    const g = new THREE.PlaneGeometry(w, dpt, sx, sz); g.rotateX(-PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const x = p.getX(i), z = p.getZ(i), h = hgt(x, z); p.setY(i, h - drop); colorAt(x, z, h, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    return g;
  }
  sandMap.repeat.set(TW / 1.6, TD / 1.6); sandNormal.repeat.copy(sandMap.repeat);
  const groundMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, map: sandMap, normalMap: sandNormal, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.96 }), { caust: true });
  const terrain = new THREE.Mesh(terrainMesh(TW, TD, TX, TZ, SX, SZ, 0), groundMat);
  terrain.receiveShadow = true; scene.add(terrain);
  const farMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { caust: true });
  const far = new THREE.Mesh(terrainMesh(7000, 7000, 0, 1500, mobile ? 120 : 220, mobile ? 120 : 220, 0.6), farMat);
  scene.add(far);
  if (isD) { // the platform needs finer detail than the main terrain to show the pool's outline
    const pm = new THREE.Mesh(terrainMesh(66, 66, PC.x, PC.z, mobile ? 200 : 330, mobile ? 200 : 330, -0.02), groundMat);
    pm.receiveShadow = true; scene.add(pm);
  }

  // depth under the water surface, baked once (sqrt-encoded for precision at the shoreline)
  const DA = { x0: -1300, z0: -500, w: 2600, d: 2600 }, DS = mobile ? 384 : 640;
  const depthTex = (() => {
    const d = new Uint8Array(DS * DS * 4);
    for (let j = 0; j < DS; j++) for (let i = 0; i < DS; i++) {
      const x = DA.x0 + (i + 0.5) / DS * DA.w, z = DA.z0 + (j + 0.5) / DS * DA.d, dep = Math.min(30, Math.max(-1, -hgt(x, z)));
      d[(j * DS + i) * 4] = Math.round(Math.sqrt((dep + 1) / 31) * 255); d[(j * DS + i) * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(d, DS, DS); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
  })();

  // ---------- water ----------
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      tNormal: { value: waterNormals }, tDepth: { value: depthTex }, uArea: { value: new THREE.Vector4(DA.x0, DA.z0, DA.w, DA.d) },
      uTime: U.uTime, uSun: { value: new V3() }, uSunCol: { value: new THREE.Color() }, uMoon: { value: new V3() }, uMoonCol: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() },
      uFoam: { value: 1 }, uGain: { value: 1 }, uUnder: { value: new THREE.Color() },
    },
    vertexShader: `
      varying vec3 vW;
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D tNormal, tDepth; uniform vec4 uArea; uniform float uTime, uFoam, uGain;
      uniform vec3 uSun, uSunCol, uMoon, uMoonCol, uHor, uZen, uShallow, uDeep, uUnder;
      varying vec3 vW;
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      vec3 waveN(vec2 p){
        vec3 a = texture2D(tNormal, p * 0.06 + vec2(uTime * 0.016, uTime * 0.011)).xyz;
        vec3 b = texture2D(tNormal, p * 0.15 - vec2(uTime * 0.021, -uTime * 0.013)).xyz;
        vec3 c = texture2D(tNormal, p * 0.011 + vec2(uTime * 0.005, 0.0)).xyz;
        vec3 n = a + b + c * 1.4 - 1.7;
        return normalize(vec3(n.x, 2.6, n.y));
      }
      void main(){
        #include <logdepthbuf_fragment>
        vec2 uv = (vW.xz - uArea.xy) / uArea.zw;
        float e = texture2D(tDepth, clamp(uv, 0.0, 1.0)).r;
        float dep = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 30.0 : e * e * 31.0 - 1.0;
        vec3 V = normalize(cameraPosition - vW);
        float dist = length(cameraPosition - vW);
        vec3 N = waveN(vW.xz);
        N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(80.0, 900.0, dist) * 0.7));
        #ifdef MULT
          // pass 1: the water column filters the seabed (red goes first, then green)
          float L = max(dep, 0.0) * (0.5 + 0.5 / max(V.y, 0.1));
          vec3 Tm = exp(-vec3(0.34, 0.075, 0.06) * L);
          float ff = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          gl_FragColor = vec4(mix(Tm, vec3(1.0), ff), 1.0);
          return;
        #endif
        if (!gl_FrontFacing) {
          // seen from below: bright Snell's window overhead, mirror-dark beyond it
          float up = -V.y;
          float win = smoothstep(0.6, 0.74, up + (N.x + N.z) * 0.08);
          float rip = texture2D(tNormal, vW.xz * 0.09 + uTime * 0.03).x;
          vec3 col = mix(uUnder * 0.7, mix(uHor, uZen, 0.5) * 1.3, win) * (0.85 + 0.3 * rip);
          col += uSunCol * pow(max(dot(-V, uSun), 0.0), 120.0) * 4.0 * win;
          gl_FragColor = vec4(col * uGain, 1.0);
        } else {
          float fres = 0.02 + 0.6 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 Rf = reflect(-V, N); Rf.y = abs(Rf.y);
          vec3 sky = mix(uHor, uZen, pow(Rf.y, 0.45)) * 0.75;
          float sp = max(dot(Rf, uSun), 0.0), mp = max(dot(Rf, uMoon), 0.0);
          vec3 spec = uSunCol * (pow(sp, 900.0) * 7.0 + pow(sp, 90.0) * 0.07) + uMoonCol * (pow(mp, 300.0) * 6.0 + pow(mp, 30.0) * 0.2);
          vec3 body = mix(uShallow, uDeep, smoothstep(1.0, 12.0, dep));
          float wash = 0.12 * sin(uTime * 0.8 + vW.x * 0.07 + vW.z * 0.03) + 0.05 * sin(uTime * 1.9 + vW.x * 0.21);
          float shore = 1.0 - smoothstep(0.0, 0.22, dep + wash);
          float nf = texture2D(tNormal, vW.xz * 0.35 + vec2(uTime * 0.03, 0.0)).y;
          float foam = shore * smoothstep(0.35, 0.6, nf + shore * 0.5) * uFoam;
          float reefF = smoothstep(2.4, 1.6, dep) * smoothstep(300.0, 370.0, vW.z) * smoothstep(0.55, 0.75, nf) * 0.6;
          foam = max(foam, reefF * uFoam);
          vec3 col = mix(body, sky, fres) + spec;
          col = mix(col, uHor * 1.4 + 0.1, foam * 0.8);
          float a = 1.0 - exp(-0.16 * max(dep, 0.0) * (0.6 + 0.4 / max(V.y, 0.15)));
          a = max(a, fres * 0.85); a = max(a, foam);
          gl_FragColor = vec4(col * uGain, a);
        }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true, side: THREE.DoubleSide, fog: true, depthWrite: false,
  });
  const wu = waterMat.uniforms;
  const absorbMat = new THREE.ShaderMaterial({ uniforms: wu, vertexShader: waterMat.vertexShader, fragmentShader: waterMat.fragmentShader, defines: { MULT: 1 },
    transparent: true, fog: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor });
  const waterGeo = new THREE.PlaneGeometry(16000, 16000);
  const water = new THREE.Mesh(waterGeo, waterMat), absorb = new THREE.Mesh(waterGeo, absorbMat);
  water.rotation.x = absorb.rotation.x = -PI / 2; absorb.renderOrder = 1; water.renderOrder = 2; scene.add(absorb, water);

  // ---------- geometry helpers ----------
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
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx || 0, p.r || 0, p.rz || 0);
      dummy.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); if (p.c) m.setColorAt(i, p.c);
    });
    m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m;
  }
  const shade = (base, spread) => new THREE.Color(base).offsetHSL((rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.15, (rnd() - 0.5) * spread);
  const onShore = (x, d) => ({ x, z: zs(x) + d });

  // ---------- palms ----------
  const trunkGeo = (() => {
    const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0.25, 3, 0), new V3(0.9, 6, 0), new V3(1.8, 8.6, 0)]);
    const tub = 40, rad = 7, g = new THREE.TubeGeometry(curve, tub, 0.2, rad, false), p = g.attributes.position, col = new Float32Array(p.count * 3);
    const a = new THREE.Color(0x8a7a62), b = new THREE.Color(0x6d5f4b);
    for (let i = 0; i <= tub; i++) {
      const c = curve.getPointAt(i / tub), k = 1.25 - 0.55 * (i / tub) + (i < 3 ? 0.35 * (3 - i) / 3 : 0), cc = i % 2 ? a : b;
      for (let j = 0; j <= rad; j++) {
        const q = i * (rad + 1) + j; p.setXYZ(q, c.x + (p.getX(q) - c.x) * k, c.y + (p.getY(q) - c.y) * k, c.z + (p.getZ(q) - c.z) * k);
        col[q * 3] = cc.r; col[q * 3 + 1] = cc.g; col[q * 3 + 2] = cc.b;
      }
    }
    g.deleteAttribute('uv'); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const tr = g.toNonIndexed();
    const nuts = [0, 1, 2, 3, 4].map((i) => tint(new THREE.SphereGeometry(0.13, 8, 6).translate(1.8 + Math.cos(i * 1.3) * 0.22, 8.35, Math.sin(i * 1.3) * 0.22), 0x6d6a2c));
    return mergeGeometries([tr, ...nuts]);
  })();
  const frondTex = canvasTex(256, 64, (g) => {
    g.clearRect(0, 0, 256, 64); g.lineCap = 'round';
    for (let x = 6; x < 250; x += 3.2) {
      const t = x / 256, len = 28 * Math.sin(Math.min(1, t * 1.15) * PI) + 4, gr = 90 + rnd() * 50 | 0;
      g.strokeStyle = `rgb(${gr * 0.55 | 0},${gr},${gr * 0.42 | 0})`; g.lineWidth = 2.2 - t;
      g.beginPath(); g.moveTo(x, 32); g.lineTo(x + len * 0.55, 32 - len); g.stroke();
      g.beginPath(); g.moveTo(x, 32); g.lineTo(x + len * 0.55, 32 + len); g.stroke();
    }
    g.strokeStyle = '#8a8a4a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 32); g.lineTo(256, 32); g.stroke();
  });
  const crownGeo = (() => {
    const parts = [];
    for (let i = 0; i < 15; i++) {
      const len = 3.6 + rnd() * 1.4, f = new THREE.PlaneGeometry(len, 1.7, 14, 2); f.rotateX(-PI / 2); f.translate(len / 2, 0, 0);
      const p = f.attributes.position, droop = i > 10 ? 0.22 : 0.09 + rnd() * 0.05;
      for (let j = 0; j < p.count; j++) { const x = p.getX(j), z = p.getZ(j); p.setY(j, 0.55 * x - droop * x * x - Math.abs(z) * 0.45); }
      f.rotateY(i / 15 * PI * 2 + rnd() * 0.25); f.translate(1.8, 8.6, 0); f.computeVertexNormals(); parts.push(f);
    }
    return mergeGeometries(parts);
  })();
  const palms = [];
  for (let i = 0; palms.length < (mobile ? 220 : 420) && i < 40000; i++) {
    const x = -680 + rnd() * 1360, d = -14 - rnd() * 110, { z } = onShore(x, d);
    if (d > -24 && rnd() < 0.6) continue;
    if (hgt(x, z) < 1.4 || Math.abs(x + 45) < 14 && d > -30) continue;
    const s = 0.8 + rnd() * 0.45;
    palms.push({ x, y: hgt(x, z) - 0.1, z, r: -PI / 2 + (rnd() - 0.5) * 1.8 * (d > -40 ? 0.6 : 1.6), s, c: shade(0xffffff, 0.12) });
  }
  instanced(trunkGeo, patch(vmat(), { sway: 0.0035 }), palms, true);
  instanced(crownGeo, patch(new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, color: 0xd8e8c0 }), { sway: 0.0035 }), palms, true);

  // scrub, grass and rocks
  const bushGeo = tint(new THREE.IcosahedronGeometry(1, 1).scale(1, 0.65, 1).translate(0, 0.3, 0), 0xffffff);
  const bushes = [];
  for (let i = 0; bushes.length < (mobile ? 1400 : 3200) && i < 40000; i++) {
    const x = -700 + rnd() * 1400, d = -34 - rnd() * 240, { z } = onShore(x, d);
    if (z < TZ - TD / 2 + 4 || hgt(x, z) < 0.3) continue;
    bushes.push({ x, y: hgt(x, z), z, r: rnd() * 6, s: 0.6 + rnd() * 1.4 * sst(-34, -70, d), c: shade(rnd() < 0.5 ? 0x4f6a2c : 0x6f7a3a, 0.12) });
  }
  instanced(bushGeo, vmat(), bushes, true);
  const grassGeo = mergeGeometries([0, 1, 2, 3].map((i) => { const g = new THREE.ConeGeometry(0.015, 0.45, 3); g.translate(0, 0.22, 0); g.rotateZ((i - 1.5) * 0.25); g.rotateY(i * 1.7); return tint(g, 0xffffff); }));
  const grass = [];
  for (let i = 0; grass.length < (mobile ? 5000 : 14000) && i < 80000; i++) {
    const x = -260 + rnd() * 460, d = -24 - rnd() * 34, { z } = onShore(x, d);
    if (fbm(x * 0.08, z * 0.08, 2) < 0.45) continue;
    grass.push({ x, y: hgt(x, z), z, r: rnd() * 6, s: 0.6 + rnd() * 0.9, c: shade(0x9a9a5a, 0.15) });
  }
  instanced(grassGeo, vmat({ roughness: 1 }), grass, false);
  const rockGeo = tint(new THREE.DodecahedronGeometry(1, 1), 0xffffff);
  { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + hash(p.getX(i) * 3.1, p.getZ(i) * 2.7 + p.getY(i)) * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } rockGeo.computeVertexNormals(); }
  const rocks = [];
  for (let i = 0; i < 70; i++) { const x = (rnd() < 0.5 ? -1 : 1) * (300 + rnd() * 250), d = -6 + rnd() * 28, { z } = onShore(x, d); if (isD && (Math.hypot(x - PC.x, z - PC.z) < 40 || Math.abs(x - RX(z)) < 40)) continue; rocks.push({ x, y: hgt(x, z) - 0.2, z, r: rnd() * 6, s: 0.5 + rnd() * 1.6, c: shade(0x6d665a, 0.1) }); }
  instanced(rockGeo, patch(vmat(), { caust: true }), rocks, true);

  // ---------- the hotel: bandas, parasols, loungers, lanterns ----------
  const thatch = 0x8c7246, white = 0xefe8da;
  const hutGeo = mergeGeometries([
    tint(new THREE.CylinderGeometry(2.6, 2.7, 2.6, 18).translate(0, 1.3, 0), white),
    tint(new THREE.ConeGeometry(3.7, 3.1, 22, 3).translate(0, 4.05, 0), thatch),
    tint(new THREE.BoxGeometry(0.1, 2.0, 1.1).translate(2.62, 1.0, 0), 0x5a3f28),
    tint(new THREE.BoxGeometry(0.08, 0.9, 0.9).translate(1.55, 1.5, 2.05).rotateY(0.35), 0x2a2420),
  ]);
  const huts = [], lanternPos = [];
  for (let i = 0; i < 8; i++) {
    const x = -150 + i * 27 + (rnd() - 0.5) * 6, { z } = onShore(x, -46 - rnd() * 6), y = hgt(x, z);
    huts.push({ x, y: y - 0.1, z, r: -PI / 2 + (rnd() - 0.5) * 0.3 });
    lanternPos.push(x + 0.4, y + 2.1, z + 2.9);
  }
  instanced(hutGeo, vmat(), huts, true);
  const parasolGeo = mergeGeometries([
    tint(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 6).translate(0, 1.25, 0), 0x7a6040),
    tint(new THREE.ConeGeometry(1.75, 0.85, 18, 2).translate(0, 2.65, 0), thatch),
    tint(new THREE.BoxGeometry(0.7, 0.3, 1.9).translate(-0.75, 0.28, 0.4), 0xe9e2d2),
    tint(new THREE.BoxGeometry(0.7, 0.08, 0.7).translate(-0.75, 0.55, -0.3).rotateX(0), 0xe9e2d2),
    tint(new THREE.BoxGeometry(0.7, 0.3, 1.9).translate(0.75, 0.28, 0.4), 0xe9e2d2),
  ]);
  const parasols = [];
  for (let i = 0; i < 15; i++) { const x = -160 + i * 15 + (rnd() - 0.5) * 3, { z } = onShore(x, -17 - rnd() * 3); parasols.push({ x, y: hgt(x, z) - 0.05, z, r: (rnd() - 0.5) * 0.3 }); }
  instanced(parasolGeo, vmat(), parasols, true);
  for (let x = -170; x < 70; x += 9) { const { z } = onShore(x, -33); lanternPos.push(x, hgt(x, z) + 0.9, z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lanternPos, 3));
  const lanterns = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb466, size: 0.9, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  scene.add(lanterns);

  // ngalawa outrigger canoes
  const canoeGeo = (() => {
    const hull = new THREE.BoxGeometry(6, 0.55, 0.6, 16, 2, 2), p = hull.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 3, w = Math.pow(1 - u * u, 0.5); p.setZ(i, p.getZ(i) * w * (0.4 + 0.6 * (p.getY(i) + 0.275) / 0.55)); p.setY(i, p.getY(i) + 0.15 * u * u); }
    hull.computeVertexNormals();
    const fl = (z) => tint(new THREE.CapsuleGeometry(0.11, 2.2, 4, 8).rotateZ(PI / 2).translate(0.3, 0.05, z), 0x6b4a2e);
    const bar = (x) => tint(new THREE.CylinderGeometry(0.035, 0.035, 4.4, 5).rotateX(PI / 2).translate(x, 0.32, 0), 0x8a6a48);
    return mergeGeometries([tint(hull.translate(0, 0.27, 0), 0x6e4e30), fl(2.1), fl(-2.1), bar(-0.6), bar(1.1)]);
  })();
  const canoes = [];
  [[-70, -7], [-58, -8], [-22, -6.5], [12, -7.5], [44, -6]].forEach(([x, d]) => { const { z } = onShore(x, d); canoes.push({ x, y: hgt(x, z), z, r: PI / 2 + (rnd() - 0.5) * 0.5, rz: 0.05 }); });
  const floatCanoes = [[-110, 26], [20, 34], [80, 22]].map(([x, d]) => ({ ...onShore(x, d), r: rnd() * 6, ph: rnd() * 6 }));
  instanced(canoeGeo, vmat(), canoes, true);
  const floating = instanced(canoeGeo, vmat(), floatCanoes.map((b) => ({ ...b, y: 0 })), true);

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
    for (let i = 0; i < q.count; i++) {
      nrm.fromBufferAttribute(nn, i); const y = q.getY(i);
      cc.set(nrm.y > 0.8 && y > 1.0 ? 0x9a7a52 : y < 0.15 ? 0x2c241e : y > 1.1 ? 0xd8c8a0 : 0x6f4f32);
      col.push(cc.r, cc.g, cc.b);
    }
    g.deleteAttribute('uv'); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const parts = [g];
    const mastTop = new V3(0.2, 9.3, 0);
    parts.push(tint(new THREE.CylinderGeometry(0.08, 0.13, 8.4, 8).translate(0, 4.2, 0).rotateZ(-0.11).translate(1.1, 1.0, 0), 0x5a4030));
    if (sail) {
      const F = new V3(4.9, 2.3, 0.15), dir = mastTop.clone().sub(F).normalize(), P = mastTop.clone().addScaledVector(dir, 5.2), Cl = new V3(-4.0, 2.0, 0.15);
      const len = P.distanceTo(F), yard = new THREE.CylinderGeometry(0.06, 0.08, len + 0.6, 6);
      yard.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir)); yard.translate((F.x + P.x) / 2, (F.y + P.y) / 2, 0.1);
      parts.push(tint(yard, 0x5a4030));
      const n = 14, pos = [], cl = [], A = F, B = P, Cc = Cl;
      const pt = (i, j) => { const b1 = i / n, b2 = j / n, b0 = 1 - b1 - b2, bulge = 27 * b0 * b1 * b2; return new V3().addScaledVector(A, b0).addScaledVector(B, b1).addScaledVector(Cc, b2).add(new V3(0, 0, bulge * 1.1)); };
      const sc = new THREE.Color();
      for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
        const tri = [[i, j], [i + 1, j], [i, j + 1]]; if (j < n - i - 1) tri.push([i + 1, j], [i + 1, j + 1], [i, j + 1]);
        tri.forEach(([a, b]) => { const v = pt(a, b); pos.push(v.x, v.y, v.z); sc.set(0xefe4c8).multiplyScalar(0.9 + 0.1 * ((a + b) % 3 === 0 ? 0 : 1)); cl.push(sc.r, sc.g, sc.b); });
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); sg.computeVertexNormals();
      parts.push(sg);
      parts.push(tint(new THREE.CylinderGeometry(0.012, 0.012, Cl.distanceTo(new V3(-4.6, 1.3, 0)), 3).rotateZ(0.6).translate(-4.3, 1.65, 0.1), 0x3a3028));
    } else {
      parts.push(tint(new THREE.CylinderGeometry(0.07, 0.07, 9, 6).rotateZ(PI / 2 - 0.05).translate(0.4, 3.0, 0), 0x5a4030));
      parts.push(tint(new THREE.CylinderGeometry(0.22, 0.22, 8.6, 8).rotateZ(PI / 2 - 0.05).translate(0.4, 2.75, 0), 0xe2d6b8));
    }
    parts.push(tint(new THREE.BoxGeometry(0.9, 1.4, 0.08).translate(-5.15, 0.4, 0), 0x4a3828));
    return mergeGeometries(parts);
  }
  const anchored = [[-90, 95], [-30, 120], [40, 88], [110, 130], [-160, 140], [180, 110]].map(([x, d]) => ({ ...onShore(x, d), r: rnd() * 6, ph: rnd() * 6 }));
  const anchoredMesh = instanced(dhowGeo(false), vmat({ side: THREE.DoubleSide }), anchored.map((b) => ({ ...b, y: 0 })), true);
  const dhow = new THREE.Mesh(dhowGeo(true), vmat({ side: THREE.DoubleSide }));
  dhow.castShadow = true; dhow.receiveShadow = true; scene.add(dhow);
  const sailPath = (s) => { const a = s; return new V3(Math.sin(a) * 430, 0, 330 + Math.cos(a) * 115); };

  // ---------- the reef ----------
  const coralGeos = [
    (() => { const g = new THREE.IcosahedronGeometry(0.6, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i), k = 1 + 0.06 * Math.sin(v.x * 30) * Math.sin(v.z * 30) + 0.1 * (hash(v.x * 4, v.z * 4) - 0.5); p.setXYZ(i, v.x * k, Math.max(-0.1, v.y * k * 0.65), v.z * k); } g.computeVertexNormals(); return tint(g, 0xffffff); })(),
    (() => { const parts = []; const br = (o, d, l, r, lv) => { const c = new THREE.CylinderGeometry(r * 0.6, r, l, 5); c.translate(0, l / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d)); c.translate(o.x, o.y, o.z); parts.push(tint(c, 0xffffff)); if (lv < 3) for (let k = 0; k < 3; k++) { const nd = d.clone().add(new V3(rnd() - 0.5, rnd() * 0.3, rnd() - 0.5).multiplyScalar(1.3)).normalize(); br(o.clone().addScaledVector(d, l), nd, l * 0.72, r * 0.7, lv + 1); } }; br(new V3(), new V3(0, 1, 0), 0.35, 0.07, 0); return mergeGeometries(parts); })(),
    mergeGeometries([tint(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 7).translate(0, 0.25, 0), 0xffffff), tint(new THREE.CylinderGeometry(1.1, 0.95, 0.09, 20, 1).translate(0, 0.52, 0), 0xffffff)]),
    (() => { const g = new THREE.CircleGeometry(0.75, 18, 0, PI); g.translate(0, 0.05, 0); return tint(g, 0xffffff); })(),
    mergeGeometries([0, 1, 2, 3, 4, 5, 6].map((i) => tint(new THREE.ConeGeometry(0.06, 0.45, 5).translate(0, 0.22, 0).rotateZ((rnd() - 0.5) * 0.9).rotateY(i * 0.9).translate((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25), 0xffffff))),
  ];
  const coralCols = [[0xa8875a, 0x8f7a4a, 0x9a6f58, 0x7d8a5a], [0xc49a6c, 0x9a6a8a, 0xb58468, 0xd0b48c], [0x8a9a6a, 0x7a8a62, 0x9d9a78], [0x8a3a6a, 0x9a4a3a, 0x6a3a7a], [0xb88aa8, 0xd09a6a, 0x7aa08a, 0xc0b060]];
  const coralLists = coralGeos.map(() => []);
  for (let i = 0, n = 0; n < (mobile ? 1600 : 3800) && i < 120000; i++) {
    const near = rnd() < 0.45, x = near ? -60 + rnd() * 140 : -520 + rnd() * 1040, d = near ? 215 + rnd() * 80 : 140 + rnd() * 250, z = zs(x) + d, m = near ? 0.9 : reefM(x, d) * sst(0.32, 0.55, fbm(x * 0.03 + 9, z * 0.03, 4));
    if (rnd() > m * 1.2) continue;
    const t = [0, 0, 1, 1, 1, 2, 3, 4, 4][(rnd() * 9) | 0], cs = coralCols[t];
    coralLists[t].push({ x, y: hgt(x, z) - 0.08, z, r: rnd() * 6, s: (t === 0 ? 0.7 + rnd() * 1.6 : 0.6 + rnd() * 1.1), c: shade(cs[(rnd() * cs.length) | 0], 0.1) }); n++;
  }
  coralGeos.forEach((g, i) => instanced(g, patch(vmat({ side: i === 3 ? THREE.DoubleSide : THREE.FrontSide }), { caust: true }), coralLists[i], false));

  // fish schools
  const fishGeo = (() => {
    const body = new THREE.SphereGeometry(1, 10, 6); body.scale(0.15, 0.065, 0.028);
    const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, 0, -0.24, 0.06, 0, -0.24, -0.06, 0], 3)); tail.computeVertexNormals();
    return mergeGeometries([tint(body, 0xffffff), tint(tail, 0xffffff)]);
  })();
  const fishMat = patch(vmat({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0.1 }), { caust: true, wiggle: true });
  const schoolCols = [0xf2c230, 0x3a6fd0, 0xc8d0d4, 0xe07a30, 0x3aa48a, 0xf0e070, 0x5a8ac0];
  const schools = [], fishList = [];
  const NS = mobile ? 8 : 14, PER = mobile ? 20 : 30;
  for (let s = 0; s < NS; s++) {
    const cx = s < NS * 0.6 ? -40 + rnd() * 100 : -260 + rnd() * 520, d = s < NS * 0.6 ? 225 + rnd() * 60 : 190 + rnd() * 140, sch = { cx, cz: zs(cx) + d, ax: 6 + rnd() * 14, az: 4 + rnd() * 10, w: (0.04 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * 6, col: schoolCols[s % schoolCols.length], size: s % 4 === 1 ? 2.2 : 1, fish: [] };
    for (let i = 0; i < PER; i++) { sch.fish.push({ o: new V3((rnd() - 0.5) * 3, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 3), ph: rnd() * 6 }); fishList.push({ x: 0, y: -5, z: 0, s: sch.size * (0.8 + rnd() * 0.4), c: shade(sch.col, 0.08) }); }
    schools.push(sch);
  }
  const fish = instanced(fishGeo, fishMat, fishList, false);
  const fishScale = fishList.map((f) => f.s);

  // a green turtle
  const turtle = new THREE.Group(), flips = [];
  {
    const m = patch(vmat({ roughness: 0.7 }), { caust: true });
    const shell = new THREE.SphereGeometry(0.5, 20, 12); shell.scale(1.05, 0.32, 0.85);
    const plast = new THREE.SphereGeometry(0.48, 16, 8, 0, PI * 2, PI / 2, PI / 2); plast.scale(1, 0.15, 0.8);
    const head = new THREE.SphereGeometry(0.13, 10, 8); head.scale(1.4, 0.9, 1); head.translate(0.62, 0.02, 0);
    turtle.add(new THREE.Mesh(mergeGeometries([tint(shell, 0x5e4a2e), tint(plast, 0xd8c69a), tint(head, 0x6a6a48)]), m));
    [[0.25, 1], [0.25, -1], [-0.35, 1], [-0.35, -1]].forEach(([x, sd], i) => {
      const f = new THREE.SphereGeometry(1, 8, 6); f.scale(i < 2 ? 0.2 : 0.13, 0.035, i < 2 ? 0.42 : 0.2); f.translate(0, 0, sd * (i < 2 ? 0.38 : 0.18));
      const piv = new THREE.Mesh(tint(f, 0x6a6a48), m); piv.position.set(x, -0.02, sd * 0.32); piv.userData = { sd, front: i < 2 }; turtle.add(piv); flips.push(piv);
    });
    scene.add(turtle);
  }
  const turtleC = new V3(10, 0, zs(10) + 255);

  // Diani extras: the Kongo Mosque among baobabs, and a pod of bottlenose dolphins
  const dolphins = [];
  let dolphinMesh = null; const dC = new V3(10, 0, zs(10) + 255);
  if (isD) {
    const mx = RX(zs(380) - 40) + 46, mz = zs(mx) - 42, my = hgt(mx, mz);
    const coral = 0xb9ae98, dark = 0x2a2520, mosque = [
      tint(new THREE.BoxGeometry(14, 4.4, 9).translate(0, 2.0, 0), coral),
      tint(new THREE.BoxGeometry(14.6, 0.5, 9.6).translate(0, 4.45, 0), 0xa99e88),
      tint(new THREE.BoxGeometry(2.6, 3.4, 2.4).translate(-8.1, 1.5, 0), coral),
      tint(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 14).translate(-8.1, 3.35, 0), 0xa99e88),
    ];
    for (let i = 0; i < 5; i++) mosque.push(tint(new THREE.BoxGeometry(1.3, 2.3, 0.1).translate(-5 + i * 2.5, 1.4, 4.52), dark));
    const mosqueMesh = new THREE.Mesh(mergeGeometries(mosque), vmat({ roughness: 0.95 }));
    mosqueMesh.position.set(mx, my - 0.3, mz); mosqueMesh.rotation.y = 0.15; mosqueMesh.castShadow = mosqueMesh.receiveShadow = true; scene.add(mosqueMesh);
    const prof = [[2.4, 0], [2.6, 1], [2.4, 3], [2.0, 6], [1.4, 8], [0.9, 8.5]].map(([a, b]) => new THREE.Vector2(a, b));
    const bparts = [tint(new THREE.LatheGeometry(prof, 14), 0x8c7f6e)];
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, c = new THREE.CylinderGeometry(0.12, 0.35, 4, 5); c.translate(0, 2, 0); c.rotateZ(0.9); c.rotateY(a); c.translate(Math.cos(a) * 0.5, 8.2, -Math.sin(a) * 0.5); bparts.push(tint(c, 0x857867)); }
    instanced(mergeGeometries(bparts), vmat(), [[-16, -14], [19, -9], [6, -22], [-28, 4]].map(([dx, dz]) => ({ x: mx + dx, y: hgt(mx + dx, mz + dz) - 0.2, z: mz + dz, r: rnd() * 6, s: 0.9 + rnd() * 0.5 })), true);
    const body = new THREE.SphereGeometry(1, 18, 10); body.scale(1.25, 0.3, 0.3);
    const beak = new THREE.CylinderGeometry(0.05, 0.09, 0.35, 8).rotateZ(-PI / 2).translate(1.35, -0.04, 0);
    const finS = new THREE.Shape(); finS.moveTo(-0.15, 0); finS.lineTo(0.25, 0); finS.lineTo(-0.3, 0.35); finS.lineTo(-0.15, 0);
    const fin = new THREE.ShapeGeometry(finS).translate(0, 0.22, 0);
    const fluke = new THREE.SphereGeometry(1, 10, 4); fluke.scale(0.18, 0.03, 0.42); fluke.translate(-1.3, 0, 0);
    const pecs = [1, -1].map((sd) => { const g = new THREE.SphereGeometry(1, 8, 4); g.scale(0.22, 0.03, 0.12); g.rotateY(sd * 0.5); g.translate(0.45, -0.18, sd * 0.3); return g; });
    const dg = mergeGeometries([body, beak, fin, fluke, ...pecs].map((g) => tint(g, 0xffffff)));
    { const p = dg.attributes.position, c = dg.attributes.color, top = new THREE.Color(0x3c454e), belly = new THREE.Color(0xb9bec2), cc = new THREE.Color(); for (let i = 0; i < p.count; i++) { cc.copy(belly).lerp(top, sst(-0.12, 0.08, p.getY(i))); c.setXYZ(i, cc.r, cc.g, cc.b); } }
    for (let i = 0; i < 7; i++) dolphins.push({ r: 5 + i * 1.1 + rnd() * 1.5, ph: i * 0.42 + rnd() * 0.2, sp: 0.1 + rnd() * 0.015, dy: rnd() * 6, s: i === 6 ? 0.6 : 0.95 + rnd() * 0.15 });
    dolphinMesh = instanced(dg, patch(vmat({ roughness: 0.35, side: THREE.DoubleSide }), { caust: true }), dolphins.map(() => ({ x: 0, y: -10, z: 0 })), false);
  }

  // underwater extras: light shafts and drifting particles
  const shaftTex = canvasTex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256); });
  const shafts = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + rnd() * 2.5, 14), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fe8ff, opacity: 0, fog: false }));
    m.userData = { a: rnd() * 6.28, d: 3 + rnd() * 16, ph: rnd() * 6 }; m.visible = false; scene.add(m); shafts.push(m);
  }
  const snowN = 1400, snowG = new THREE.BufferGeometry(), snowP = new Float32Array(snowN * 3);
  for (let i = 0; i < snowN * 3; i++) snowP[i] = (rnd() - 0.5) * 30;
  snowG.setAttribute('position', new THREE.BufferAttribute(snowP, 3));
  const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xd8f0f0, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  snow.visible = false; snow.frustumCulled = false; scene.add(snow);

  // ---------- bonfire ----------
  const fireAt = onShore(-46, -22); fireAt.y = hgt(fireAt.x, fireAt.z);
  const fire = new THREE.Group(); fire.position.set(fireAt.x, fireAt.y, fireAt.z); scene.add(fire);
  fire.add(new THREE.Mesh(mergeGeometries([0, 1, 2, 3, 4].map((i) => tint(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6).rotateZ(PI / 2 - 0.35).translate(0.25, 0.25, 0).rotateY(i * 1.26), 0x3a2a1c))), vmat()));
  fire.add(new THREE.Mesh(tint(new THREE.TorusGeometry(0.75, 0.13, 6, 14).rotateX(PI / 2).translate(0, 0.05, 0), 0x77736a), vmat()));
  const flameTex = canvasTex(64, 128, (g) => { const gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.3, 'rgba(255,160,50,.85)'); gr.addColorStop(0.7, 'rgba(200,60,10,.25)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 80, 26, 48, 0, 0, PI * 2); g.fill(); });
  const flames = [0, 1, 2, 3, 4, 5].map((i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.userData = { ph: i * 1.7, ox: (rnd() - 0.5) * 0.4, oz: (rnd() - 0.5) * 0.4 }; fire.add(s); return s; });
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 28, 2); fireLight.position.set(0, 1.0, 0); fire.add(fireLight);

  // ---------- sky, stars, moon, light ----------
  const sky = new Sky(); sky.scale.setScalar(6000); scene.add(sky);
  const su = sky.material.uniforms;
  su.cloudCoverage.value = 0.3; su.cloudDensity.value = 0.4; su.cloudElevation.value = 0.5;
  const envScene = new THREE.Scene(), envSky = new Sky(); envSky.scale.setScalar(6000); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(R); let envRT = null, lastEnv = { h: -99, t: 0 };
  const starG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 4000; i++) { const u = rnd() * 0.97 + 0.03, t = rnd() * 6.283, rr = Math.sqrt(1 - u * u); sp.push(rr * Math.cos(t) * 5000, u * 5000, rr * Math.sin(t) * 5000); }
  // a band of extra stars for the Milky Way
  for (let i = 0; i < 5000; i++) { const a = rnd() * 6.283, w = (rnd() - 0.5) * 0.25 * (1 + rnd()), v = new V3(Math.cos(a), Math.sin(a) * 0.9 + w, Math.sin(a) * 0.3 + w).normalize(); if (v.y > 0.02) sp.push(v.x * 5000, v.y * 5000, v.z * 5000); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const moonDir = new V3(-0.3, 0.42, 0.86).normalize();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fffef5'); gr.addColorStop(0.28, '#f4f0e0'); gr.addColorStop(0.31, 'rgba(240,240,255,.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: false }));
  moon.scale.setScalar(260); scene.add(moon);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xe8dcc0, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 600 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const moonLight = new THREE.DirectionalLight(0x9db4e0, 0); moonLight.position.copy(moonDir).multiplyScalar(500); scene.add(moonLight);

  // ---------- post ----------
  let composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(R);
    composer.addPass(new RenderPass(scene, cam));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  }

  // ---------- sound: surf from filtered noise, off until asked ----------
  let ac = null, surf = null, lp = null;
  function sound(on) {
    if (on && !ac) {
      ac = new AudioContext();
      const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), dd = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; dd[i] = last * 3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; surf = ac.createGain(); surf.gain.value = 0;
      src.connect(lp).connect(surf).connect(ac.destination); src.start();
    } else if (!on && ac) { ac.close(); ac = surf = lp = null; }
  }

  // live tuning knobs (dev only)
  const T = { exp: 1, env: 1, gain: 1, sun: 1, fog: 1 };

  // ---------- state ----------
  const S = { k: STOPS[initial] ? initial : 'nungwi', started: false, auto: true, hours: 9, speed: 1, yaw: 0, pitch: 0, lookYaw: 0, lookPitch: 0, lastLook: 0 };
  if (process.env.NODE_ENV !== 'production') window.__beach = { T, S, R, sun, hemi, scene, wu, cam, dhow, get bloom() { return bloom; } };
  const P = new V3(), heading = { dir: 1 }, keys = new Set();
  let sailS = 0, walkPhase = 0, overviewA = 0;
  const mode = () => STOPS[S.k].mode;

  function enterStop(k) {
    S.k = k; const st = STOPS[k]; S.hours = st.time; S.auto = true; S.lookYaw = S.lookPitch = 0;
    if (isD && k === 'mappool') { P.set(PC.x - 4, 0, PC.z - 15); S.yaw = Math.atan2(PC.x - P.x, PC.z - P.z); S.pitch = -0.55; S.auto = false; }
    else if (isD && k === 'kongo') { const z = zs(330) - 6; P.set(RX(z) - 36, 0, z); const mx = RX(zs(380) - 40) + 46, mz = zs(mx) - 42; S.yaw = Math.atan2(mx - P.x, mz - P.z) - 0.45; S.pitch = 0.02; S.auto = false; }
    else if (isD && k === 'diani') { P.set(-120, 0, zs(-120) - 4); S.yaw = 0.7; S.pitch = 0.02; heading.dir = 1; }
    else if (st.mode === 'walk') {
      const x = k === 'night' ? -26 : -120; P.set(x, 0, zs(x) - (k === 'night' ? 11 : 4)); S.yaw = k === 'night' ? Math.atan2(fireAt.x - P.x, fireAt.z - P.z) + 0.5 : PI / 2 - 0.4; S.pitch = k === 'night' ? 0.05 : -0.05; heading.dir = 1;
      if (k === 'night') S.auto = false;
    } else if (st.mode === 'swim') { P.copy(turtleC).add(new V3(-40, -3, -6)); S.yaw = PI / 2; S.pitch = -0.2; }
    else { sailS = -1.62; S.yaw = 0; S.pitch = 0; }
    ui();
  }

  // ---------- UI ----------
  const pick = $('#zPick'), stopsEl = $('#zStops'), barStops = $('#zBarStops'), clock = $('#zClock');
  stopsEl.innerHTML = ORDER.map((k) => `<button data-s="${k}" aria-pressed="false"><b>${STOPS[k].name}</b><span>${STOPS[k].day} · ${fmtTime(STOPS[k].time)}</span></button>`).join('');
  barStops.innerHTML = ORDER.map((k) => `<button class="cbtn" data-s="${k}" aria-pressed="false">${STOPS[k].name}</button>`).join('');
  function detail() {
    const st = STOPS[S.k];
    $('#zDetail').innerHTML = `<p>${st.blurb}</p><dl><dt>Where</dt><dd>${st.where}</dd><dt>When</dt><dd>${st.day}, ${fmtTime(st.time)}</dd><dt>You</dt><dd>${st.what}</dd></dl>`;
  }
  function ui() {
    root.querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === S.k)));
    const st = STOPS[S.k];
    $('#zTitle').textContent = st.name;
    $('#zNT').textContent = `${st.day} · ${st.name}`; $('#zNX').textContent = st.note;
    $('#zNTip').textContent = st.mode === 'swim' ? 'Drag to look. W/S or the arrows swim where you look, Space and C rise and sink. Auto follows the turtle.'
      : st.mode === 'sail' ? 'Drag to look around the boat. The time runs faster on this cruise so you see the whole sunset.'
        : 'Drag to look. W/A/S/D or the arrows walk, Shift runs. You can wade out until the water reaches your chest.';
    $('#zAuto').setAttribute('aria-pressed', String(S.auto));
    $('#zAuto').textContent = st.mode === 'swim' ? 'Follow turtle' : st.mode === 'sail' ? 'Sailing' : 'Stroll';
    root.classList.toggle('z-swim', st.mode === 'swim');
    detail();
  }
  const hud = (on) => { ['#zStats', '#zNote', '#zBar', '#zPad'].forEach((s) => ($(s).hidden = !on)); pick.hidden = on; };
  function start() { S.started = true; hud(true); enterStop(S.k); onStop?.(S.k); }
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  on(stopsEl, 'click', (e) => { const b = e.target.closest('[data-s]'); if (b) { S.k = b.dataset.s; S.hours = STOPS[S.k].time; ui(); onStop?.(S.k); } });
  on(barStops, 'click', (e) => { const b = e.target.closest('[data-s]'); if (b) { enterStop(b.dataset.s); onStop?.(S.k); } });
  on($('#zStart'), 'click', start);
  on($('#zChange'), 'click', () => { S.started = false; hud(false); ui(); });
  const step = (n) => { const i = (ORDER.indexOf(S.k) + n + ORDER.length) % ORDER.length; enterStop(ORDER[i]); onStop?.(S.k); };
  on($('#zPrev'), 'click', () => step(-1)); on($('#zNext'), 'click', () => step(1));
  on($('#zAuto'), 'click', () => { S.auto = !S.auto; if (S.auto) S.lookYaw = S.lookPitch = 0; ui(); });
  on($('#zSound'), 'click', (e) => { const b = e.currentTarget, v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); sound(v); });
  on(clock, 'input', () => { S.hours = +clock.value; });
  // look by dragging
  let drag = null;
  on(canvas, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  on(canvas, 'pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.x) * 0.004, dy = (e.clientY - drag.y) * 0.004; drag = { x: e.clientX, y: e.clientY };
    if (S.auto || mode() === 'sail') { S.lookYaw -= dx; S.lookPitch = Math.max(-1.2, Math.min(1.2, S.lookPitch - dy)); S.lastLook = performance.now(); }
    else { S.yaw -= dx; S.pitch = Math.max(-1.35, Math.min(1.35, S.pitch - dy)); }
  });
  on(canvas, 'pointerup', () => { drag = null; }); on(canvas, 'pointercancel', () => { drag = null; });
  const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'u', KeyE: 'u', KeyC: 'd', KeyQ: 'd' };
  function takeOver() {
    if (!S.auto || mode() === 'sail') return;
    // carry the current view over so taking control doesn't jump
    const f = new V3(); cam.getWorldDirection(f); S.yaw = Math.atan2(f.x, f.z); S.pitch = Math.asin(Math.max(-1, Math.min(1, f.y)));
    S.auto = false; S.lookYaw = S.lookPitch = 0; ui();
  }
  on(window, 'keydown', (e) => {
    if (e.target.closest?.('input,select,textarea')) return;
    if (e.code === 'Escape') { onExit?.(); return; }
    if (!S.started) return;
    if (e.code === 'KeyP') { $('#zAuto').click(); return; }
    if (e.code === 'KeyN') { step(1); return; }
    const m = MOVE[e.code]; if (m) { e.preventDefault(); keys.add(m); if (e.shiftKey) keys.add('run'); takeOver(); }
    if (e.key === 'Shift') keys.add('run');
  });
  on(window, 'keyup', (e) => { const m = MOVE[e.code]; if (m) keys.delete(m); if (e.key === 'Shift') keys.delete('run'); });
  root.querySelectorAll('#zPad [data-k]').forEach((b) => {
    on(b, 'pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.k); takeOver(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => on(b, ev, () => keys.delete(b.dataset.k)));
  });

  // ---------- sizing ----------
  let W = 1, H = 1;
  function resize() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    R.setPixelRatio(pr); R.setSize(W, H, false);
    cam.aspect = W / H; cam.fov = W < H ? 72 : 60; cam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); bloom.setSize(W / 2, H / 2); }
  }
  on(window, 'resize', resize); resize();

  // ---------- sun and sky for a time of day ----------
  const sunDir = new V3(), tmpC = new THREE.Color(), cWarm = new THREE.Color(0xff9a50), cWhite = new THREE.Color(0xfff4e6);
  const skyDay = [new THREE.Color(0x9cc4e4), new THREE.Color(0x2f6cc0)], skySet = [new THREE.Color(0xf2a26a), new THREE.Color(0x52699a)], skyNight = [new THREE.Color(0x0a1424), new THREE.Color(0x02050c)];
  const seaTint = new THREE.Color(0.35, 0.85, 0.9), nightBg = new THREE.Color(0x060d1c);
  const shallowDay = new THREE.Color(0x24b8b0), deepDay = new THREE.Color(0x0a4878), underDay = new THREE.Color(0x10707e);
  function sunAt(h) { const a = PI * (h - 6.33) / 12.3; return sunDir.set(isD ? -0.2 : 0.22, Math.sin(a), (isD ? 1 : -1) * Math.cos(a)).normalize(); }
  function sunTimes() { return isD ? 'Sunrise 06:20 · sunset 18:35' : 'Sunrise 06:20 · sunset 18:44'; }

  // ---------- frame ----------
  const camT = new V3(), fwd = new V3(), right = new V3(), tmp = new V3(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
  const timer = new THREE.Timer(); let t = 0, raf = 0, slow = 0, frames = 0, statT = 0;
  const lookVec = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update(); const raw = timer.getDelta(), dt = Math.min(raw, 0.1), rdt = Math.min(raw, 1); if (!reduce) t += dt;
    U.uTime.value = t;
    const md = mode();
    if (S.started) {
      if (md === 'sail' && S.auto) S.hours += dt / 60 * 1.0;
      else if (S.auto) S.hours += dt / 60 * 0.2;
      if (S.hours > 23.9) S.hours = 23.9;
    }
    const h = S.hours;
    // decay look offsets back to the path after a pause in dragging
    if (S.auto && md !== 'sail' && performance.now() - S.lastLook > 2500) { const k = 1 - Math.pow(0.4, dt); S.lookYaw *= 1 - k; S.lookPitch *= 1 - k; }

    // --- camera by mode ---
    const run = keys.has('run');
    if (!S.started) {
      overviewA += dt * 0.03;
      cam.position.set(-40 + Math.sin(overviewA) * 170, 48, 40 + Math.cos(overviewA) * 120 + 60);
      camT.set(-30, 0, 40); cam.lookAt(camT);
    } else if (md === 'walk') {
      if (S.auto) {
        P.x += heading.dir * 1.1 * dt;
        if (P.x > (isD ? 280 : 380)) heading.dir = -1; if (P.x < -380) heading.dir = 1;
        const tz = zs(P.x) - 3.5; P.z += (tz - P.z) * (1 - Math.pow(0.3, rdt));
        const want = Math.atan2(heading.dir, zs(P.x + heading.dir) - zs(P.x)) + heading.dir * -0.35;
        let dy = want - S.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); S.yaw += dy * (1 - Math.pow(0.5, rdt));
        S.pitch += (-0.06 - S.pitch) * (1 - Math.pow(0.5, dt));
        walkPhase += dt * 1.1 * 1.9;
      } else {
        const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
        if (f || s) {
          const sp = (run ? 3.6 : 1.4) * dt, nx = P.x + (Math.sin(S.yaw) * f - Math.cos(S.yaw) * s) * sp, nz = P.z + (Math.cos(S.yaw) * f + Math.sin(S.yaw) * s) * sp;
          const ok = (x, z) => Math.abs(x) < 650 && z > TZ - TD / 2 + 10 && z - zs(x) > -200 && hgt(x, z) > -1.15;
          if (ok(nx, nz)) { P.x = nx; P.z = nz; } else if (ok(nx, P.z)) P.x = nx; else if (ok(P.x, nz)) P.z = nz;
          walkPhase += dt * (run ? 3.2 : 1.9);
        }
      }
      const g = hgt(P.x, P.z);
      P.y = g + 1.62 + Math.sin(walkPhase * PI) * 0.025;
      cam.position.copy(P);
      lookVec(S.yaw + S.lookYaw, S.pitch + S.lookPitch, fwd); cam.lookAt(camT.copy(P).add(fwd));
    } else if (md === 'swim') {
      if (S.auto) {
        const tp = turtle.position, tf = tmp.set(1, 0, 0).applyQuaternion(turtle.quaternion);
        const want = camT.copy(tp).addScaledVector(tf, -3.6).add(new V3(0, 1.0, 0)).addScaledVector(right.set(-tf.z, 0, tf.x), 1.3);
        P.lerp(want, 1 - Math.pow(0.3, rdt));
        const look = tmp.copy(tp).addScaledVector(tf, 1.5).sub(P).normalize();
        S.yaw = Math.atan2(look.x, look.z); S.pitch = Math.asin(look.y);
      } else {
        const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), u = (keys.has('u') ? 1 : 0) - (keys.has('d') ? 1 : 0);
        lookVec(S.yaw, S.pitch, fwd); right.set(-Math.cos(S.yaw), 0, Math.sin(S.yaw));
        const sp = (run ? 2.0 : 0.9) * dt;
        P.addScaledVector(fwd, f * sp).addScaledVector(right, s * sp); P.y += u * sp;
      }
      const d = P.z - zs(P.x);
      if (d < 50) P.z = zs(P.x) + 50; if (d > 440) P.z = zs(P.x) + 440; P.x = Math.max(-520, Math.min(520, P.x));
      P.y = Math.max(hgt(P.x, P.z) + 0.6, Math.min(0.3, P.y));
      cam.position.copy(P).add(tmp.set(0, Math.sin(t * 0.9) * 0.04, 0));
      lookVec(S.yaw + S.lookYaw, S.pitch + S.lookPitch, fwd); cam.lookAt(camT.copy(cam.position).add(fwd));
    } else {
      if (S.auto) sailS += dt * 2.6 / 330;
    }

    // dhow under sail
    {
      const p0 = sailPath(sailS), p1 = sailPath(sailS + 0.002), yaw = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
      dhow.position.set(p0.x, Math.sin(t * 1.1) * 0.12, p0.z);
      dhow.rotation.set(Math.sin(t * 0.8) * 0.05 - 0.06, yaw, Math.sin(t * 0.63) * 0.025);
      if (S.started && md === 'sail') {
        dhow.updateMatrixWorld();
        cam.position.copy(dhow.localToWorld(tmp.set(3.7, 2.75, -0.35))); // up on the bow
        sunAt(S.hours); lookVec(Math.atan2(sunDir.x, sunDir.z) + 0.45 + S.lookYaw, -0.1 + S.lookPitch, fwd); // the sunset, a little off the bow

        cam.lookAt(camT.copy(cam.position).add(fwd));
      }
    }

    // --- light for the hour ---
    sunAt(h);
    const elDeg = Math.asin(sunDir.y) * 180 / PI, day = sst(-4, 12, elDeg), night = sst(1, -10, elDeg), golden = sst(14, 2, elDeg) * sst(-5, 1, elDeg);
    const under = cam.position.y < 0;
    su.sunPosition.value.copy(sunDir); su.turbidity.value = 2.5 + 1.5 * golden; su.rayleigh.value = 1.1 + 1.0 * golden + 0.6 * night;
    su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.82; su.time.value = t;
    sky.position.copy(cam.position); stars.position.copy(cam.position);
    moon.position.copy(cam.position).addScaledVector(moonDir, 4500);
    R.toneMappingExposure = T.exp * (under ? 0.6 + 0.5 * night : 0.46 - 0.2 * golden + 0.6 * night);
    sun.color.copy(cWarm).lerp(cWhite, sst(3, 28, elDeg)); sun.intensity = T.sun * 3.2 * sst(-1, 10, elDeg);
    sun.target.position.copy(cam.position).addScaledVector(lookVec(S.yaw, 0, fwd), 15); sun.target.position.y = 0;
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 300);
    sun.castShadow = elDeg > 1;
    hemi.color.copy(skyNight[0]).lerp(skySet[0], golden * (1 - night)).lerp(skyDay[0], sst(10, 30, elDeg)); hemi.intensity = 0.12 + 0.7 * day + 0.25 * night; if (under) { sun.color.multiply(seaTint); sun.intensity *= 0.75; hemi.color.copy(underDay); }
    moonLight.intensity = 1.1 * night;
    scene.environmentIntensity = T.env * (0.05 + 0.25 * day);
    stars.material.opacity = 0.8 * night; stars.visible = moon.visible = !under && night > 0.01; moon.material.opacity = night;
    lanterns.material.opacity = sst(4, -3, elDeg);
    const fireOn = h > 18.6 ? sst(18.6, 19.0, h) : 0; fire.visible = fireOn > 0;
    if (fire.visible) {
      flames.forEach((s, i) => { const u = s.userData, f = 0.75 + 0.25 * Math.sin(t * 9 + u.ph) * Math.sin(t * 5.3 + u.ph * 2); s.scale.set(0.9 * f, 1.7 * f, 1); s.position.set(u.ox + Math.sin(t * 3 + u.ph) * 0.05, 0.8 * f, u.oz); s.material.opacity = fireOn; });
      fireLight.intensity = fireOn * (55 + 15 * Math.sin(t * 13) * Math.sin(t * 7.1));
    }
    if (bloom) { bloom.enabled = night > 0.05; bloom.strength = 0.45 * night; bloom.threshold = 1.2; } // bright sand and sky in daylight would veil everything

    // water colours
    const lightK = 0.06 + 0.94 * day;
    tmpC.copy(skyNight[0]).lerp(skySet[0], golden * (1 - night)).lerp(skyDay[0], sst(12, 30, elDeg)); wu.uHor.value.copy(tmpC);
    tmpC.copy(skyNight[1]).lerp(skySet[1], golden * (1 - night)).lerp(skyDay[1], sst(12, 30, elDeg)); wu.uZen.value.copy(tmpC);
    wu.uShallow.value.copy(shallowDay).multiplyScalar(lightK).lerp(cWarm, golden * 0.12);
    wu.uDeep.value.copy(deepDay).multiplyScalar(lightK);
    wu.uUnder.value.copy(underDay).multiplyScalar(lightK);
    wu.uSun.value.copy(sunDir); wu.uSunCol.value.copy(sun.color).multiplyScalar(sst(-2, 4, elDeg) * 1.4);
    wu.uMoon.value.copy(moonDir); wu.uMoonCol.value.setRGB(0.75, 0.8, 0.95).multiplyScalar(night * 0.9);
    wu.uFoam.value = 0.35 + 0.65 * lightK; wu.uGain.value = T.gain * 0.55 / R.toneMappingExposure;
    U.uCaust.value = sst(5, 25, elDeg);
    water.position.y = absorb.position.y = Math.sin(t * 0.55) * 0.035;
    U.uWaterY.value = water.position.y;

    // under the surface
    scene.fog = under ? fogSea : fogAir;
    if (under) { fogSea.color.copy(underDay).multiplyScalar(lightK * 0.9); fogSea.density = 0.075; scene.background = fogSea.color; }
    else { fogAir.color.copy(wu.uHor.value).lerp(cWhite, 0.25 * day).multiplyScalar(1 - 0.35 * golden); fogAir.density = T.fog * (0.0005 - 0.0002 * golden + 0.0004 * night); scene.background = night > 0.85 ? nightBg : null; }
    sky.visible = !under && night <= 0.85;
    root.classList.toggle('z-under', under);
    shafts.forEach((m) => {
      m.visible = under && day > 0.2; if (!m.visible) return;
      const u = m.userData; u.a += dt * 0.02;
      m.position.set(cam.position.x + Math.cos(u.a) * u.d, -6.8, cam.position.z + Math.sin(u.a) * u.d);
      m.rotation.set(0, Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z), sunDir.x * 0.4);
      m.material.opacity = 0.06 * day * (0.6 + 0.4 * Math.sin(t * 0.7 + u.ph));
    });
    snow.visible = under;
    if (under) {
      const a = snowG.attributes.position.array;
      for (let i = 0; i < snowN; i++) {
        for (let k = 0; k < 3; k++) { const c = cam.position.getComponent(k); a[i * 3 + k] = c + ((((a[i * 3 + k] - c + 15) % 30) + 30) % 30) - 15; }
        a[i * 3 + 1] -= dt * 0.03;
      }
      snowG.attributes.position.needsUpdate = true;
    }

    // --- life ---
    if (!reduce) {
      const nearReef = md === 'swim' || cam.position.y < 6 && Math.abs(cam.position.z - zs(cam.position.x) - 260) < 160;
      if (nearReef || !S.started) {
        let idx = 0;
        schools.forEach((sc) => {
          const a = t * sc.w + sc.ph, cx = sc.cx + Math.sin(a) * sc.ax, cz = sc.cz + Math.cos(a) * sc.az;
          const vx = Math.cos(a) * sc.ax * sc.w, vz = -Math.sin(a) * sc.az * sc.w, yawF = Math.atan2(-vz, vx);
          const floor = hgt(cx, cz);
          sc.fish.forEach((f) => {
            const x = cx + f.o.x + Math.sin(t * 0.7 + f.ph) * 0.3, z = cz + f.o.z + Math.cos(t * 0.6 + f.ph) * 0.3, y = Math.min(-1.0, Math.max(floor + 0.8, floor + 2.4 + f.o.y + Math.sin(t * 0.5 + f.ph) * 0.25));
            dummy.position.set(x, y, z); dummy.rotation.set(0, yawF + Math.sin(t * 1.3 + f.ph) * 0.18, 0); dummy.scale.setScalar(fishScale[idx]); dummy.updateMatrix(); fish.setMatrixAt(idx++, dummy.matrix);
          });
        });
        fish.instanceMatrix.needsUpdate = true;
        // the turtle cruises a slow loop over the reef
        const ta = t * 0.011, tx = turtleC.x + Math.sin(ta) * 38, tz = turtleC.z + Math.sin(ta * 2) * 16;
        const ty = Math.max(hgt(tx, tz) + 1.3, -4.2 + Math.sin(t * 0.13) * 1.2);
        const nx = turtleC.x + Math.sin(ta + 0.01) * 38, nz = turtleC.z + Math.sin((ta + 0.01) * 2) * 16;
        turtle.position.set(tx, turtle.position.y ? turtle.position.y + (ty - turtle.position.y) * (1 - Math.pow(0.5, rdt)) : ty, tz);
        turtle.rotation.set(Math.sin(t * 0.7) * 0.06, Math.atan2(-(nz - tz), nx - tx), Math.sin(t * 0.5) * 0.04);
        flips.forEach((f) => { const u = f.userData, s = Math.sin(t * (u.front ? 1.6 : 1.6) + (u.front ? 0 : 1.2)); f.rotation.set(u.sd * s * (u.front ? 0.55 : 0.25), u.front ? s * 0.3 * u.sd : 0, 0); });
      }
      if (dolphinMesh && (nearReef || !S.started || md === 'walk')) {
        dC.lerp(md === 'swim' ? cam.position : turtleC, 1 - Math.pow(0.6, rdt)); // the pod keeps company with a swimmer
        dolphins.forEach((dp, i) => {
          const a = t * dp.sp * 2.2 + dp.ph, x = dC.x + Math.cos(a) * dp.r, z = dC.z + Math.sin(a) * dp.r * 0.75;
          const y = -1.9 + Math.sin(t * 0.55 + dp.dy) * 1.5, vy = Math.cos(t * 0.55 + dp.dy) * 0.8;
          dummy.position.set(x, Math.min(y, -0.05), z); dummy.rotation.set(0, Math.atan2(-Math.cos(a) * 0.75, -Math.sin(a)), Math.atan2(vy, 3) + Math.sin(t * 3 + i) * 0.05);
          dummy.scale.setScalar(dp.s); dummy.updateMatrix(); dolphinMesh.setMatrixAt(i, dummy.matrix);
        });
        dolphinMesh.instanceMatrix.needsUpdate = true;
      }
      anchored.forEach((b, i) => { dummy.position.set(b.x, Math.sin(t * 1.2 + b.ph) * 0.08, b.z); dummy.rotation.set(Math.sin(t * 0.9 + b.ph) * 0.04, b.r + Math.sin(t * 0.05 + b.ph) * 0.2, Math.sin(t * 1.1 + b.ph) * 0.05); dummy.scale.setScalar(1); dummy.updateMatrix(); anchoredMesh.setMatrixAt(i, dummy.matrix); });
      anchoredMesh.instanceMatrix.needsUpdate = true;
      floatCanoes.forEach((b, i) => { dummy.position.set(b.x, -0.12 + Math.sin(t * 1.4 + b.ph) * 0.05, b.z); dummy.rotation.set(Math.sin(t * 1.1 + b.ph) * 0.04, b.r, Math.sin(t * 1.3 + b.ph) * 0.05); dummy.updateMatrix(); floating.setMatrixAt(i, dummy.matrix); });
      floating.instanceMatrix.needsUpdate = true;
    }

    // --- environment lighting (refreshed when the sun moves) ---
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
      statT = 0.25;
      $('#zTime').textContent = fmtTime(h); if (document.activeElement !== clock) clock.value = h.toFixed(2);
      $('#zClockL').textContent = fmtTime(h);
      $('#zAir').textContent = `${Math.round(26 + 5 * Math.max(0, Math.sin(PI * (h - 8) / 12)))} °C`;
      const g = hgt(cam.position.x, cam.position.z), depth = -cam.position.y;
      let where;
      if (md === 'sail') where = 'Under sail, about 5 knots';
      else if (md === 'swim') where = depth > 0.1 ? `${depth.toFixed(1)} m down, seabed at ${(-g).toFixed(1)} m` : 'Floating at the surface';
      else where = g < -0.05 ? `Wading, water ${(-g).toFixed(1)} m deep` : 'On the sand';
      $('#zWhere').textContent = where;
      $('#zSea').textContent = `${(27.5 - Math.max(0, depth) * 0.05).toFixed(1)} °C`;
      const uv = Math.max(0, Math.round(12.5 * Math.pow(Math.max(0, sunDir.y), 1.6)));
      $('#zUv').textContent = elDeg < 0 ? 'Night' : `UV ${uv}${uv >= 11 ? ', extreme' : uv >= 8 ? ', very high' : uv >= 6 ? ', high' : uv >= 3 ? ', moderate' : ', low'}`;
      $('#zSun').textContent = sunTimes();
      $('#zSub').textContent = `${STOPS[S.k].day} · ${fmtTime(h)}`;
    }

    if (composer) composer.render(); else R.render(scene, cam);
    frames++; if (dt > 0.034) slow++;
    if (frames === 120) { if (slow > 60 && pr > 1) { pr = Math.max(1, pr - 0.35); resize(); } frames = slow = 0; }
  }

  S.hours = STOPS[S.k].time; ui(); hud(false);
  frame();

  return () => {
    cancelAnimationFrame(raf); off.forEach((f) => f()); sound(false);
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    envRT?.dispose(); pmrem.dispose(); composer?.dispose(); R.dispose();
  };
}
