import * as THREE from 'three';

// Homepage scene: three floating islands, camera flies between them as the page scrolls.
// Returns a cleanup function.
export function createIslands({ canvas, sky, pins, sections }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V3 = THREE.Vector3, PI = Math.PI;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8875b, 26, 70);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a4660, 0.85 * PI));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.05 * PI);
  sun.position.set(12, 22, 10);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9 }, o || {}));
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const h = (a, b, c, k) => { const n = Math.sin(a * 12.99 + b * 78.23 + c * 37.72 + k) * 43758.55; return n - Math.floor(n) - 0.5; };
  function jitter(g, a) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + h(x, y, z, 1) * a, y + h(x, y, z, 2) * a * 0.6, z + h(x, y, z, 3) * a); }
    g.computeVertexNormals(); return g;
  }
  const anim = [];
  function island(top, c) {
    const g = new THREE.Group(); g.position.copy(c); g.userData.y = c.y;
    g.add(mesh(jitter(new THREE.CylinderGeometry(3.2, 0.5, 3, 9, 3), 0.4), M(0x6b4a36), 0, -1.67, 0));
    g.add(mesh(new THREE.CylinderGeometry(3.3, 3.2, 0.35, 9), M(top)));
    scene.add(g); return g;
  }
  const C = { safari: new V3(-8, 0, 2), kili: new V3(0, 0.4, -6), zanzibar: new V3(8, 0, 2) };

  // Safari island
  const saf = island(0xd9a443, C.safari);
  function acacia(x, z, s) {
    const t = new THREE.Group(); t.position.set(x, 0.17, z); t.scale.setScalar(s);
    t.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 5), M(0x4a3222), 0, 0.6, 0));
    t.add(mesh(new THREE.CylinderGeometry(0.95, 0.6, 0.24, 7), M(0x5f7a2e), 0, 1.28, 0));
    return t;
  }
  [[-1.6, -1, 1], [1.2, -1.7, 0.8], [-0.4, 1.9, 0.7], [2.1, 0.9, 0.6]].forEach((a) => saf.add(acacia(...a)));
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 0.8 + (i * 37 % 22) / 10; saf.add(mesh(new THREE.ConeGeometry(0.07, 0.28, 4), M(0xb88a2e), Math.cos(a) * r, 0.3, Math.sin(a) * r)); }
  saf.add(mesh(new THREE.DodecahedronGeometry(0.5), M(0x8a8178), -2.2, 0.3, 0.9));
  saf.add(mesh(new THREE.DodecahedronGeometry(0.32), M(0x9a9188), -1.8, 0.25, 1.4));
  function giraffe(x, z, ry, s) {
    const g = new THREE.Group(), sk = M(0xe8b04f), dk = M(0x6b3f1d);
    g.position.set(x, 0.17, z); g.rotation.y = ry; g.scale.setScalar(s);
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.36, 0.3), sk, 0, 0.95, 0));
    [[-0.27, -0.1], [0.27, -0.1], [-0.27, 0.1], [0.27, 0.1]].forEach(([a, b]) => g.add(mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), sk, a, 0.4, b)));
    [[-0.15, 0.16], [0.12, 0.16], [0, -0.16]].forEach(([a, b]) => g.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), dk, a, 1, b)));
    const n = new THREE.Group(); n.position.set(0.3, 1.05, 0); n.rotation.z = -0.35;
    n.add(mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), sk, 0, 0.45, 0));
    n.add(mesh(new THREE.BoxGeometry(0.34, 0.14, 0.14), sk, 0.1, 0.93, 0));
    n.add(mesh(new THREE.BoxGeometry(0.035, 0.12, 0.035), dk, -0.02, 1.05, 0.04));
    n.add(mesh(new THREE.BoxGeometry(0.035, 0.12, 0.035), dk, -0.02, 1.05, -0.04));
    g.add(n); saf.add(g); return n;
  }
  const necks = [giraffe(0.3, 0.2, 0.4, 1), giraffe(-0.9, -0.3, -2.4, 0.75)];
  anim.push((t) => necks.forEach((n, i) => (n.rotation.z = -0.35 + Math.sin(t * 1.2 + i * 2) * 0.12)));
  const bal = new THREE.Group(); bal.position.set(1.8, 3.4, -0.8);
  const env = mesh(new THREE.SphereGeometry(0.55, 10, 8), M(0xd94f2b), 0, 0.35, 0); env.scale.y = 1.15; bal.add(env);
  const skirt = mesh(new THREE.ConeGeometry(0.42, 0.5, 10, 1, true), M(0xf2c14e), 0, -0.25, 0); skirt.rotation.x = PI; bal.add(skirt);
  bal.add(mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), M(0x6b4a36), 0, -0.68, 0));
  saf.add(bal);
  anim.push((t) => { bal.position.y = 3.4 + Math.sin(t * 0.7) * 0.3; bal.rotation.y = t * 0.2; });

  // Kilimanjaro island
  const kil = island(0x6f8a5a, C.kili);
  kil.add(mesh(jitter(new THREE.ConeGeometry(2.5, 4.8, 9, 3), 0.18), M(0x7d7a80), 0, 2.4, 0));
  kil.add(mesh(new THREE.ConeGeometry(1.08, 2, 9), M(0xf6f8fb), 0, 3.82, 0));
  kil.add(mesh(jitter(new THREE.ConeGeometry(1.2, 2.4, 7, 2), 0.1), M(0x8a8790), 1.9, 1.2, 1.3));
  kil.add(mesh(new THREE.ConeGeometry(0.42, 0.85, 7), M(0xf6f8fb), 1.9, 2.0, 1.3));
  function pine(x, z, s) {
    const p = new THREE.Group(); p.position.set(x, 0.17, z); p.scale.setScalar(s);
    p.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5), M(0x4a3222), 0, 0.15, 0));
    [0, 1, 2].forEach((i) => p.add(mesh(new THREE.ConeGeometry(0.42 - i * 0.11, 0.5, 6), M(0x2f5a3f), 0, 0.45 + i * 0.28, 0)));
    return p;
  }
  for (let i = 0; i < 11; i++) { const a = i * 0.62 + 2.2, r = 2.6 + (i % 3) * 0.18; kil.add(pine(Math.cos(a) * r, Math.sin(a) * r, 0.8 + (i % 4) * 0.12)); }
  kil.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), M(0x333333), 0, 5, 0));
  const flag = mesh(new THREE.PlaneGeometry(0.3, 0.18), M(0xd4451a, { side: THREE.DoubleSide }), 0.15, 5.15, 0);
  kil.add(flag);
  anim.push((t) => (flag.rotation.y = Math.sin(t * 3) * 0.4));
  const clouds = new THREE.Group(); kil.add(clouds);
  const cm = M(0xffffff, { roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Group(), a = i / 4 * PI * 2;
    c.position.set(Math.cos(a) * 3.6, 2.6 + (i % 2) * 0.9, Math.sin(a) * 3.6);
    [[0, 0, 0, 0.5], [0.45, -0.08, 0, 0.38], [-0.45, -0.1, 0.1, 0.34], [0.15, 0.18, 0.1, 0.36]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cm); s.position.set(x, y, z); c.add(s); });
    clouds.add(c);
  }
  anim.push((t) => (clouds.rotation.y = t * 0.08));

  // Zanzibar atoll
  const zan = island(0x178f9a, C.zanzibar);
  zan.add(mesh(jitter(new THREE.CylinderGeometry(2, 2.25, 0.42, 11), 0.06), M(0xf1dca6), 0, 0.2, 0));
  const water = new THREE.Mesh(new THREE.RingGeometry(1.95, 3.3, 48, 5), new THREE.MeshStandardMaterial({ color: 0x35d0c8, transparent: true, opacity: 0.82, flatShading: true, roughness: 0.25, metalness: 0.1 }));
  water.rotation.x = -PI / 2; water.position.y = 0.24; water.receiveShadow = true; zan.add(water);
  const wp = water.geometry.attributes.position, wb = Float32Array.from(wp.array);
  anim.push((t) => {
    for (let i = 0; i < wp.count; i++) { const x = wb[i * 3], y = wb[i * 3 + 1]; wp.setZ(i, Math.sin(x * 2.2 + t * 1.6) * 0.05 + Math.cos(y * 2.6 + t * 1.3) * 0.04); }
    wp.needsUpdate = true; water.geometry.computeVertexNormals();
  });
  function palm(x, z, ry) {
    const p = new THREE.Group(); p.position.set(x, 0.4, z); p.rotation.y = ry;
    let y = 0, xo = 0;
    for (let i = 0; i < 6; i++) { const s = mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.36, 5), M(0x8a6a44), xo, y + 0.18, 0); s.rotation.z = -i * 0.07; p.add(s); y += 0.33; xo += i * 0.026; }
    const cr = new THREE.Group(); cr.position.set(xo, y, 0);
    for (let i = 0; i < 7; i++) { const hh = new THREE.Group(); hh.rotation.y = i / 7 * PI * 2; const l = mesh(new THREE.BoxGeometry(0.9, 0.03, 0.22), M(0x2f8f4e), 0.42, -0.12, 0); l.rotation.z = -0.42; hh.add(l); cr.add(hh); }
    [0, 2, 4].forEach((i) => cr.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), M(0x5a3d22), Math.cos(i) * 0.1, -0.1, Math.sin(i) * 0.1)));
    p.add(cr); zan.add(p); return cr;
  }
  const crowns = [palm(-0.8, -0.4, 0.3), palm(0.5, -0.9, 2.2), palm(0.2, 0.9, 4)];
  anim.push((t) => crowns.forEach((c, i) => (c.rotation.z = Math.sin(t * 1.1 + i) * 0.06)));
  const umb = new THREE.Group(); umb.position.set(-0.6, 0.4, 1.1);
  umb.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), M(0xeeeeee), 0, 0.35, 0));
  umb.add(mesh(new THREE.ConeGeometry(0.45, 0.2, 8), M(0xd4451a), 0, 0.72, 0));
  zan.add(umb);
  zan.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), M(0xffffff), -0.2, 0.43, 1.25));
  const boat = new THREE.Group();
  const hull = mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.9, 6), M(0x7a4a26)); hull.rotation.z = PI / 2; hull.scale.z = 0.6; boat.add(hull);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.55, 0); sh.lineTo(-0.1, 0.85); sh.lineTo(0, 0);
  boat.add(mesh(new THREE.ShapeGeometry(sh), M(0xfff7e6, { side: THREE.DoubleSide }), -0.2, 0.1, 0));
  zan.add(boat);
  anim.push((t) => { const a = t * 0.18; boat.position.set(Math.cos(a) * 2.65, 0.33 + Math.sin(t * 2) * 0.04, Math.sin(a) * 2.65); boat.rotation.y = -a; boat.rotation.x = Math.sin(t * 2) * 0.08; });

  // dust
  const pg = new THREE.BufferGeometry(), pts = [];
  for (let i = 0; i < 500; i++) pts.push((Math.random() - 0.5) * 90, Math.random() * 40 - 6, (Math.random() - 0.5) * 90);
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.6, fog: false }));
  scene.add(dust);
  [saf, kil, zan].forEach((g, i) => anim.push((t) => (g.position.y = g.userData.y + Math.sin(t * 0.6 + i * 2) * 0.15)));

  // camera stations per section
  const SKY = { hero: ['#0f1b33', '#e8875b'], safari: ['#b8502a', '#ffd08a'], kili: ['#16314f', '#d7e8f2'], zanzibar: ['#0b6f86', '#c6f1e6'], combo: ['#1a1f3d', '#f19a68'], book: ['#0f1b33', '#e8875b'] };
  let VIEWS;
  function views() {
    const m = innerWidth < 760, v = (x, y, z) => new V3(x, y, z);
    const isl = (c, dy = 0) => (m
      ? { p: c.clone().add(v(2.6, 4.6 + dy, 11.5 + dy)), t: c.clone().add(v(0, -1.2 + dy * 0.8, 0)) }
      : { p: c.clone().add(v(3.8, 3.6 + dy, 8.8 + dy)), t: c.clone().add(v(-2.7, 1.4 + dy * 0.6, 0)) });
    VIEWS = {
      hero: m ? { p: v(0, 15, 38), t: v(0, -2.5, -1) } : { p: v(0, 10, 25), t: v(0, 0.5, -1) },
      safari: isl(C.safari), kili: isl(C.kili, 1.4), zanzibar: isl(C.zanzibar),
      combo: m ? { p: v(0, 30, 24), t: v(0, -3.5, -2) } : { p: v(-2, 21, 16), t: v(-4.5, 0, -1) },
      book: m ? { p: v(-2, 12, 32), t: v(0, -2.5, 0) } : { p: v(11, 7, 19), t: v(5.5, 1, -1) },
    };
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); views(); }
  addEventListener('resize', resize); resize();

  const secs = [...sections], pinEls = [...pins.children];
  const cur = { p: VIEWS.hero.p.clone(), t: VIEWS.hero.t.clone() }, des = { p: new V3(), t: new V3() };
  const ca = new THREE.Color(), cb = new THREE.Color(), c2 = new THREE.Color(), c3 = new THREE.Color();
  let mx = 0, my = 0;
  const onMove = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onMove);
  const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  function station() {
    const mid = scrollY + innerHeight / 2, cs = secs.map((s) => s.offsetTop + s.offsetHeight / 2);
    if (mid <= cs[0]) return [0, 0, 0];
    let i = 0; while (i < cs.length - 2 && mid > cs[i + 1]) i++;
    return [i, Math.min(i + 1, cs.length - 1), ss(0.25, 0.75, (mid - cs[i]) / (cs[i + 1] - cs[i]))];
  }
  const clock = new THREE.Clock(); let t = 0, raf = 0; const tmp = new V3();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05); if (!reduce) t += dt;
    const [a, b, f] = station(), A = secs[a].dataset.k, B = secs[b].dataset.k;
    des.p.copy(VIEWS[A].p).lerp(VIEWS[B].p, f); des.t.copy(VIEWS[A].t).lerp(VIEWS[B].t, f);
    des.p.x += mx * 1.2; des.p.y -= my * 0.8;
    const k = reduce ? 1 : 1 - Math.pow(0.02, dt);
    cur.p.lerp(des.p, k); cur.t.lerp(des.t, k);
    camera.position.copy(cur.p); camera.lookAt(cur.t);
    ca.set(SKY[A][0]).lerp(cb.set(SKY[B][0]), f); c2.set(SKY[A][1]).lerp(c3.set(SKY[B][1]), f);
    sky.style.background = `linear-gradient(${ca.getStyle()},${c2.getStyle()} 85%)`;
    scene.fog.color.copy(c2);
    anim.forEach((fn) => fn(t)); dust.rotation.y = t * 0.01;
    const o = Math.max(0, 1 - scrollY / (innerHeight * 0.4));
    pins.style.opacity = o; pins.style.visibility = o < 0.05 ? 'hidden' : 'visible';
    if (o > 0) pinEls.forEach((p) => {
      const g = C[p.dataset.i];
      tmp.set(g.x, g.y + (p.dataset.i === 'kili' ? 6.2 : 4.4), g.z).project(camera);
      p.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px,${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,calc(-100% - 8px))`;
    });
    renderer.render(scene, camera);
  }
  frame();

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onMove);
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    renderer.dispose();
  };
}
