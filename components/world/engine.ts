import * as THREE from "three";
import { PLATEAU, SHORE, buildBridge, buildClouds, buildIsland, buildSky, buildWater, bridgeY, groundDetailTexture, islandHeight, rng, shapeR, wind, woodTexture, type Bridge, type Obstacle, type Shape } from "./terrain";

/* =====================================================================
 * 3D island world: a chain of islands joined by rope bridges on a sunset
 * ocean. A chubby 3D cat walks between them. Every island is one
 * section of the portfolio; arriving on it opens that section's details.
 * Plain three.js, no React: World.tsx drives it through the returned API.
 * ===================================================================== */

export type WorldIsland = { id: string; name: string; kind: string };

export type WorldOptions = {
  islands: WorldIsland[];
  coinsPerIsland: number;
  collected: string[];
  dark: boolean;
  catName: string;
  onIsland: (index: number | null) => void;
  onCoin: (id: string) => void;
  onSay: (text: string) => void;
  onPet: () => void;
};

export type WorldApi = {
  walkToIsland: (index: number) => void;
  setLabel: (index: number, el: HTMLElement | null) => void;
  setBubble: (el: HTMLElement | null) => void;
  setCollected: (ids: string[]) => void;
  setPaused: (p: boolean) => void;
  setKeysEnabled: (on: boolean) => void;
  pet: () => void;
  dispose: () => void;
};

/* ---------- palette ---------- */
const KIND_COLOR: Record<string, string> = {
  home: "#f4a6cd",
  about: "#cda7d3",
  work: "#8099fb",
  experience: "#b9a3f5",
  skills: "#7fb8f5",
  credentials: "#f39ab1",
  contact: "#a6bbff",
  custom: "#d9a3e8",
};

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, "rgba(255,255,255,0.9)");
  rg.addColorStop(0.25, "rgba(255,255,255,0.45)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Orange tabby fur: stripes across the back, cream belly. */
function tabbyTexture(stripes: number, stripeBottom: number, belly: boolean) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const base = g.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, "#f0883a");
  base.addColorStop(0.5, "#f7a254");
  base.addColorStop(1, "#fbc58a");
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 256);
  const r = rng(stripes * 31 + 7);
  g.strokeStyle = "rgba(196, 92, 24, 0.75)";
  g.lineCap = "round";
  for (let k = 0; k < stripes; k++) {
    const x0 = (k + 0.5) * (512 / stripes) + (r() - 0.5) * 10;
    g.lineWidth = 9 + r() * 7;
    g.beginPath();
    g.moveTo(x0, 4);
    for (let y = 4; y <= stripeBottom; y += 12) g.lineTo(x0 + Math.sin(y * 0.08 + k) * 6, y);
    g.stroke();
  }
  if (belly) {
    const bg = g.createLinearGradient(0, 150, 0, 200);
    bg.addColorStop(0, "rgba(255, 241, 222, 0)");
    bg.addColorStop(1, "rgba(255, 241, 222, 1)");
    g.fillStyle = bg;
    g.fillRect(0, 150, 512, 106);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* =====================================================================
 * The cat
 * ===================================================================== */
type Cat = {
  root: THREE.Group;
  update: (dt: number, t: number, speed: number, turn: number) => void;
  hop: () => void;
};

function buildCat(): Cat {
  const root = new THREE.Group();
  const furTex = tabbyTexture(14, 120, true);
  const headTex = tabbyTexture(9, 70, false);
  const fur = new THREE.MeshPhysicalMaterial({ map: furTex, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color("#ffd9b3"), sheenRoughness: 0.55 });
  const furHead = new THREE.MeshPhysicalMaterial({ map: headTex, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color("#ffd9b3"), sheenRoughness: 0.55 });
  const orange = new THREE.MeshPhysicalMaterial({ color: "#f39646", roughness: 0.85, sheen: 1, sheenColor: new THREE.Color("#ffd2a6"), sheenRoughness: 0.6 });
  const cream = new THREE.MeshPhysicalMaterial({ color: "#fff0dc", roughness: 0.9, sheen: 0.8, sheenColor: new THREE.Color("#ffffff") });
  const pink = new THREE.MeshStandardMaterial({ color: "#f28fa8", roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: "#1c1530", roughness: 0.15, metalness: 0.1 });
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const gold = new THREE.MeshStandardMaterial({ color: "#ffd166", metalness: 0.85, roughness: 0.25, emissive: "#6b4a00", emissiveIntensity: 0.2 });
  const collarMat = new THREE.MeshStandardMaterial({ color: "#ec7fb5", roughness: 0.5 });

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, pos: [number, number, number], scale?: [number, number, number]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  // torso carries everything except the legs, so it can bob and lean
  const torso = new THREE.Group();
  root.add(torso);
  const body = mesh(new THREE.SphereGeometry(0.5, 40, 28), fur, torso, [0, 0.62, 0], [1.12, 0.7, 0.82]);
  body.rotation.y = Math.PI / 2; // texture seam hidden under the chest fluff; local x is now the long axis
  mesh(new THREE.SphereGeometry(0.3, 24, 16), cream, torso, [0, 0.66, 0.42], [0.95, 0.9, 0.7]); // chest fluff

  /* head */
  const head = new THREE.Group();
  head.position.set(0, 0.88, 0.42);
  torso.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.38, 36, 26), furHead, head, [0, 0.14, 0.13], [1, 0.96, 1.12]);
  skull.rotation.y = -Math.PI / 2; // texture seam at the back of the head
  mesh(new THREE.SphereGeometry(0.13, 20, 14), cream, head, [-0.085, 0.03, 0.44]);
  mesh(new THREE.SphereGeometry(0.13, 20, 14), cream, head, [0.085, 0.03, 0.44]);
  mesh(new THREE.SphereGeometry(0.09, 16, 12), cream, head, [0, -0.04, 0.41]);
  mesh(new THREE.SphereGeometry(0.045, 14, 10), pink, head, [0, 0.1, 0.5], [1.35, 0.8, 0.8]);
  const cheekMat = new THREE.MeshBasicMaterial({ color: "#ff9fb8", transparent: true, opacity: 0.45 });
  mesh(new THREE.SphereGeometry(0.06, 12, 8), cheekMat, head, [-0.25, 0.04, 0.33], [1, 0.6, 0.4]);
  mesh(new THREE.SphereGeometry(0.06, 12, 8), cheekMat, head, [0.25, 0.04, 0.33], [1, 0.6, 0.4]);
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.2, 0);
  head.add(eyes);
  for (const sx of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.072, 20, 14), dark, eyes, [sx * 0.15, 0, 0.42], [1, 1.15, 0.7]);
    mesh(new THREE.SphereGeometry(0.024, 10, 8), white, eyes, [sx * 0.15 + 0.022, 0.03, 0.47]);
  }
  const ears: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.2, 0.44, 0.08);
    ear.rotation.z = -sx * 0.3;
    head.add(ear);
    mesh(new THREE.ConeGeometry(0.13, 0.26, 18), orange, ear, [0, 0.1, 0]);
    mesh(new THREE.ConeGeometry(0.075, 0.16, 14), pink, ear, [0, 0.08, 0.05]);
    ears.push(ear);
  }
  // whiskers
  const wpts: number[] = [];
  for (const sx of [-1, 1])
    for (const dy of [-0.02, 0.03]) wpts.push(sx * 0.12, 0.04 + dy, 0.46, sx * 0.48, 0.07 + dy * 2.5, 0.42);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wpts, 3));
  head.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: "#fff8f0", transparent: true, opacity: 0.85 })));

  /* collar and bell */
  const collar = mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 40), collarMat, torso, [0, 0.83, 0.38]);
  collar.rotation.x = 1.15;
  const bell = mesh(new THREE.SphereGeometry(0.06, 14, 10), gold, torso, [0, 0.64, 0.58]);

  /* legs: pivot at the hip */
  const legs: THREE.Group[] = [];
  const hips: [number, number, number][] = [
    [-0.2, 0.46, 0.34], // front left
    [0.2, 0.46, 0.34], // front right
    [-0.22, 0.46, -0.34], // back left
    [0.22, 0.46, -0.34], // back right
  ];
  for (const h of hips) {
    const leg = new THREE.Group();
    leg.position.set(...h);
    root.add(leg);
    mesh(new THREE.CapsuleGeometry(0.105, 0.24, 6, 14), orange, leg, [0, -0.2, 0]);
    mesh(new THREE.SphereGeometry(0.12, 16, 12), cream, leg, [0, -0.41, 0.03], [1, 0.62, 1.25]);
    legs.push(leg);
  }

  /* tail: a chain of segments that sways like a real tail */
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = torso;
  const SEG = 14;
  for (let i = 0; i < SEG; i++) {
    const g = new THREE.Group();
    if (i === 0) g.position.set(0, 0.74, -0.56);
    else g.position.set(0, 0, -0.078);
    g.rotation.x = i === 0 ? 0.95 : i > 8 ? -0.12 : 0.012;
    parent.add(g);
    const r = 0.084 - i * 0.0022;
    mesh(new THREE.SphereGeometry(r, 16, 12), i >= SEG - 2 ? cream : orange, g, [0, 0, -0.04], [1, 1, 1.35]);
    tail.push(g);
    parent = g;
  }

  /* animation state */
  let phase = 0;
  let blinkAt = 2;
  let earAt = 4;
  let lookAt = 3;
  let lookYaw = 0;
  let lookTarget = 0;
  let hopT = -1;
  let lean = 0;

  const update = (dt: number, t: number, speed: number, turn: number) => {
    const s = Math.min(1, speed / 2.6); // 0 idle … 1 full walk
    phase += dt * (3.2 + speed * 2.6);
    const sw = Math.sin(phase);
    const cw = Math.cos(phase);

    // diagonal gait: front-left with back-right, front-right with back-left
    const swing = 0.62 * s;
    legs[0].rotation.x = sw * swing;
    legs[3].rotation.x = sw * swing;
    legs[1].rotation.x = -sw * swing;
    legs[2].rotation.x = -sw * swing;
    // paws lift a little on the forward swing
    legs[0].position.y = 0.46 + Math.max(0, cw) * 0.05 * s;
    legs[3].position.y = 0.46 + Math.max(0, cw) * 0.05 * s;
    legs[1].position.y = 0.46 + Math.max(0, -cw) * 0.05 * s;
    legs[2].position.y = 0.46 + Math.max(0, -cw) * 0.05 * s;

    // torso: step bob, side sway, breathing when idle, lean into turns
    lean += (THREE.MathUtils.clamp(-turn * 0.12, -0.18, 0.18) - lean) * Math.min(1, dt * 6);
    let hopY = 0;
    if (hopT >= 0) {
      hopT += dt;
      const k = hopT / 0.42;
      if (k >= 1) hopT = -1;
      else hopY = Math.sin(k * Math.PI) * 0.35;
    }
    torso.position.y = Math.abs(sw) * 0.045 * s + hopY;
    torso.rotation.z = sw * 0.035 * s + lean;
    torso.rotation.x = -0.03 * s;
    const breathe = 1 + Math.sin(t * 2.3) * 0.018 * (1 - s);
    body.scale.set(1.12, 0.7 * breathe, 0.82 * (1 + (breathe - 1) * 0.6));
    legs.forEach((l) => (l.position.y += hopY));

    // head: nods with each step, looks around when idle
    if (t > lookAt) {
      lookTarget = s > 0.2 ? 0 : (Math.random() - 0.5) * 1.1;
      lookAt = t + 2 + Math.random() * 3;
    }
    lookYaw += ((s > 0.2 ? -turn * 0.25 : lookTarget) - lookYaw) * Math.min(1, dt * 3);
    head.rotation.y = lookYaw;
    head.rotation.x = Math.sin(phase * 2) * 0.04 * s + Math.sin(t * 0.7) * 0.03 * (1 - s);
    head.position.y = 0.88 + Math.abs(cw) * 0.02 * s;

    // blink
    if (t > blinkAt) blinkAt = t + 2.5 + Math.random() * 3;
    const bk = blinkAt - t;
    eyes.scale.y = bk < 0.12 ? 0.12 : 1;
    // ear twitch
    if (t > earAt) earAt = t + 3 + Math.random() * 5;
    const ek = earAt - t;
    ears[1].rotation.x = ek < 0.25 ? Math.sin(ek * 40) * 0.25 : 0;

    // tail: a travelling wave, livelier when walking
    const amp = 0.16 + s * 0.12;
    tail.forEach((g, i) => {
      g.rotation.y = Math.sin(t * (1.6 + s * 2.4) - i * 0.32) * amp * (0.35 + i * 0.05);
    });
    tail[0].rotation.x = 0.95 - s * 0.25 + Math.sin(t * 1.3) * 0.05;

    bell.position.x = Math.sin(phase * 2) * 0.012 * s;
  };

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = false;
  });
  return { root, update, hop: () => (hopT = 0) };
}

/* =====================================================================
 * World
 * ===================================================================== */
export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): WorldApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.dark ? 0.95 : 0.9;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  const scene = new THREE.Scene();
  const { env, sunDir } = buildSky(scene, renderer, opts.dark);
  scene.fog = new THREE.Fog(opts.dark ? "#3d3556" : "#d9c2c4", 70, 300);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 12000);

  // light: sky fill plus a low golden sun that casts shadows near the cat
  scene.add(new THREE.HemisphereLight(opts.dark ? "#a3a8f0" : "#a9c8ff", opts.dark ? "#4a3a55" : "#6e5c45", opts.dark ? 1.15 : 1.1));
  const sun = new THREE.DirectionalLight(opts.dark ? "#ffad94" : "#ffd6ae", opts.dark ? 2.6 : 3.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -20;
  sun.shadow.camera.right = sun.shadow.camera.top = 20;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  // keep the sun low (long evening shadows) but high enough to light the islands
  const sunOffset = new THREE.Vector3(sunDir.x, Math.max(sunDir.y, 0.32), sunDir.z).normalize().multiplyScalar(45);

  /* ocean */
  const ocean = buildWater(scene, sunDir, opts.dark, small);

  /* islands along a gentle zig-zag, each with its own coastline */
  const glowTex = glowTexture();
  const detailTex = groundDetailTexture();
  const woodTex = woodTexture();
  const N = opts.islands.length;
  const shapes: Shape[] = opts.islands.map((isl, i) => {
    const r = rng(i * 977 + 5);
    return {
      x: i * 15 - ((N - 1) * 15) / 2,
      z: (i % 2 === 0 ? -1 : 1) * 4.8 + Math.sin(i * 1.7) * 1.6,
      r: isl.kind === "home" ? 6.6 : 5.6,
      seed: i * 13.37 + 2,
      p1: r() * 6.28,
      p2: r() * 6.28,
    };
  });
  const centers = shapes;
  const bridges: Bridge[] = [];
  for (let i = 0; i < N - 1; i++) {
    const a = shapes[i];
    const b = shapes[i + 1];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / d;
    const uz = (b.z - a.z) / d;
    const ra = shapeR(a, Math.atan2(uz, ux)) * 0.82;
    const rb = shapeR(b, Math.atan2(-uz, -ux)) * 0.82;
    bridges.push({ ax: a.x + ux * ra, az: a.z + uz * ra, bx: b.x - ux * rb, bz: b.z - uz * rb, half: 0.72 });
  }
  const crystalGeos: Record<string, () => THREE.BufferGeometry> = {
    home: () => new THREE.OctahedronGeometry(0.55, 0),
    about: () => new THREE.IcosahedronGeometry(0.5, 0),
    work: () => new THREE.OctahedronGeometry(0.5, 0).scale(0.8, 1.35, 0.8),
    experience: () => new THREE.DodecahedronGeometry(0.5, 0),
    skills: () => new THREE.TetrahedronGeometry(0.6, 0),
    credentials: () => new THREE.OctahedronGeometry(0.52, 0),
    contact: () => new THREE.TorusGeometry(0.42, 0.13, 12, 32),
  };
  const obstacles: Obstacle[] = [];
  const islands = opts.islands.map((isl, i) => {
    const anchors: { x: number; z: number }[] = [];
    if (i > 0) anchors.push({ x: bridges[i - 1].bx, z: bridges[i - 1].bz });
    if (i < N - 1) anchors.push({ x: bridges[i].ax, z: bridges[i].az });
    const built = buildIsland(
      scene,
      shapes[i],
      KIND_COLOR[isl.kind] ?? KIND_COLOR.custom,
      (crystalGeos[isl.kind] ?? (() => new THREE.IcosahedronGeometry(0.5, 0)))(),
      glowTex,
      detailTex,
      anchors,
      opts.dark
    );
    obstacles.push(...built.obstacles);
    return built;
  });
  bridges.forEach((b) => buildBridge(scene, b, woodTex));

  /* clouds */
  const clouds = buildClouds(scene, opts.dark);

  /* fireflies at dusk */
  const SP = opts.dark ? 220 : 0;
  const spPos = new Float32Array(SP * 3);
  const spBase: number[] = [];
  const cr = rng(42);
  for (let i = 0; i < SP; i++) {
    const s = shapes[i % N];
    const a = cr() * Math.PI * 2;
    const d = cr() * s.r * 0.8;
    const x = s.x + Math.cos(a) * d;
    const z = s.z + Math.sin(a) * d;
    const y = 0.9 + cr() * 2.6;
    spPos.set([x, y, z], i * 3);
    spBase.push(x, y, z, cr() * 6);
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const sparkles = new THREE.Points(
    spGeo,
    new THREE.PointsMaterial({ size: 0.22, map: glowTex, color: "#f6ff9a", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 })
  );
  if (SP) scene.add(sparkles);

  /* coins */
  type CoinObj = { id: string; mesh: THREE.Mesh; x: number; z: number; y: number; got: boolean; fly: number };
  const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 32);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({ color: "#ffd24d", metalness: 0.75, roughness: 0.2, emissive: "#c88a00", emissiveIntensity: 0.45, envMapIntensity: 1.6 });
  const coins: CoinObj[] = [];
  const collected = new Set(opts.collected);
  const per = Math.max(1, Math.min(12, Math.round(opts.coinsPerIsland) || 1));
  opts.islands.forEach((isl, i) => {
    const c = centers[i];
    for (let j = 0; j < per; j++) {
      // a free spot on the meadow, not inside a tree
      let a = (j / per) * Math.PI * 2 + i * 0.7;
      let d = c.r * 0.52;
      for (let k = 0; k < 12; k++) {
        const tx = c.x + Math.cos(a) * d;
        const tz = c.z + Math.sin(a) * d;
        if (obstacles.every((o) => Math.hypot(o.x - tx, o.z - tz) > o.r + 0.5)) break;
        a += 0.21;
        d = c.r * (0.4 + (k % 3) * 0.08);
      }
      const id = `${isl.id}-${j}`;
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      const x = c.x + Math.cos(a) * d;
      const z = c.z + Math.sin(a) * d;
      const y = Math.max(0.3, islandHeight(c, x, z)) + 0.6;
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.visible = !collected.has(id);
      scene.add(mesh);
      coins.push({ id, mesh, x, z, y, got: collected.has(id), fly: -1 });
    }
  });

  /* cat */
  const cat = buildCat();
  scene.add(cat.root);
  const pos = new THREE.Vector3(centers[0].x, PLATEAU, centers[0].z + 2.6);
  let heading = Math.PI; // facing the camera at first
  let speed = 0;
  let turnRate = 0;
  cat.root.position.copy(pos);
  cat.root.rotation.y = heading;

  /* ---------- walking surface ---------- */
  const segDist = (px: number, pz: number, b: Bridge) => {
    const vx = b.bx - b.ax;
    const vz = b.bz - b.az;
    const l2 = vx * vx + vz * vz;
    const t = THREE.MathUtils.clamp(((px - b.ax) * vx + (pz - b.az) * vz) / l2, 0, 1);
    return { d: Math.hypot(px - (b.ax + vx * t), pz - (b.az + vz * t)), t };
  };
  const islandAt = (x: number, z: number, margin = 0.35) => {
    for (let i = 0; i < N; i++) {
      const c = centers[i];
      const dx = x - c.x;
      const dz = z - c.z;
      if (Math.hypot(dx, dz) < shapeR(c, Math.atan2(dz, dx)) * SHORE - margin) return i;
    }
    return -1;
  };
  const walkable = (x: number, z: number) => {
    let ok = false;
    for (let i = 0; i < N; i++) {
      const c = centers[i];
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > c.r * 1.3) continue;
      if (d < 1.15) return false; // the pedestal
      if (islandHeight(c, x, z) > 0.12) ok = true;
    }
    if (!ok) ok = bridges.some((b) => segDist(x, z, b).d < b.half);
    if (!ok) return false;
    return obstacles.every((o) => Math.hypot(o.x - x, o.z - z) > o.r);
  };
  const groundY = (x: number, z: number) => {
    let y = -9;
    for (let i = 0; i < N; i++) {
      const c = centers[i];
      if (Math.hypot(x - c.x, z - c.z) < c.r * 1.3) y = Math.max(y, islandHeight(c, x, z));
    }
    for (const b of bridges) {
      const s = segDist(x, z, b);
      if (s.d < b.half + 0.2) y = Math.max(y, bridgeY(s.t) + 0.02);
    }
    return Math.max(0.05, y);
  };

  /* ---------- path planning: islands form a chain joined by bridges ---------- */
  let path: THREE.Vector2[] = [];
  let pathIsland: number | null = null;
  const nearestIsland = (x: number, z: number) => {
    let best = 0;
    let bd = Infinity;
    centers.forEach((c, i) => {
      const d = Math.hypot(x - c.x, z - c.z) - c.r;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  /** Add a waypoint, stepping around pedestals, trees and big rocks on the way. */
  const blockers: Obstacle[] = [...centers.map((c) => ({ x: c.x, z: c.z, r: 1.15 })), ...obstacles];
  const pushAround = (list: THREE.Vector2[], from: THREE.Vector2, to: THREE.Vector2) => {
    const vx = to.x - from.x;
    const vz = to.y - from.y;
    const l2 = vx * vx + vz * vz || 1;
    const l = Math.sqrt(l2);
    const hits: { t: number; p: THREE.Vector2 }[] = [];
    for (const o of blockers) {
      const t = ((o.x - from.x) * vx + (o.z - from.y) * vz) / l2;
      if (t <= 0.02 || t >= 0.98) continue;
      const px = from.x + vx * t;
      const pz = from.y + vz * t;
      if (Math.hypot(px - o.x, pz - o.z) >= o.r + 0.35) continue;
      let nx = -vz / l;
      let nz = vx / l;
      if ((px - o.x) * nx + (pz - o.z) * nz < 0) {
        nx = -nx;
        nz = -nz;
      }
      const k = o.r + (o.r > 1 ? 0.95 : 0.55);
      hits.push({ t, p: new THREE.Vector2(o.x + nx * k, o.z + nz * k) });
    }
    hits.sort((a, b) => a.t - b.t).forEach((h) => list.push(h.p));
    list.push(to);
  };
  const planTo = (goal: THREE.Vector2, goalIsland: number) => {
    const out: THREE.Vector2[] = [];
    let from = new THREE.Vector2(pos.x, pos.z);
    const hop = (p: THREE.Vector2) => {
      pushAround(out, from, p);
      from = p;
    };
    let cur = islandAt(pos.x, pos.z, 0);
    if (cur < 0) {
      // On a bridge: finish crossing it toward the goal first.
      let k = -1;
      let bd = Infinity;
      bridges.forEach((b, i) => {
        const d = segDist(pos.x, pos.z, b).d;
        if (d < bd) {
          bd = d;
          k = i;
        }
      });
      if (k >= 0 && bd < bridges[k].half + 0.5) {
        const b = bridges[k];
        if (goalIsland > k) {
          hop(new THREE.Vector2(b.bx, b.bz));
          cur = k + 1;
        } else {
          hop(new THREE.Vector2(b.ax, b.az));
          cur = k;
        }
      } else cur = nearestIsland(pos.x, pos.z);
    }
    while (cur !== goalIsland) {
      const next = goalIsland > cur ? cur + 1 : cur - 1;
      const b = bridges[Math.min(cur, next)];
      const fwd = goalIsland > cur;
      hop(fwd ? new THREE.Vector2(b.ax, b.az) : new THREE.Vector2(b.bx, b.bz));
      hop(fwd ? new THREE.Vector2(b.bx, b.bz) : new THREE.Vector2(b.ax, b.az));
      cur = next;
    }
    hop(goal);
    path = out;
    pathIsland = goalIsland;
  };
  const islandFront = (i: number) => {
    const c = centers[i];
    // stand in front of the crystal, on the side facing the camera
    return new THREE.Vector2(c.x, c.z + 2.2);
  };

  /* ---------- input ---------- */
  const keys = new Set<string>();
  let keysEnabled = true;
  const KEYMAP: Record<string, string> = { ArrowUp: "f", KeyW: "f", ArrowDown: "b", KeyS: "b", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
  const typing = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (!k || !keysEnabled || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
    e.preventDefault();
    keys.add(k);
    path = [];
    pathIsland = null;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (k) keys.delete(k);
  };
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // camera orbit (drag) + zoom (wheel); a short press without dragging = walk there
  let yaw = 0;
  let dist = 15;
  let pitch = 0.62;
  let down: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null;
  let dragged = false;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const clickables = [ocean, ...scene.children.filter((o) => o !== ocean)];
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, yaw, pitch, id: e.pointerId };
    dragged = false;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 6) dragged = true;
    if (dragged) {
      yaw = down.yaw - dx * 0.006;
      pitch = THREE.MathUtils.clamp(down.pitch + dy * 0.004, 0.25, 1.15);
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!down) return;
    canvas.releasePointerCapture(down.id);
    const wasDrag = dragged;
    down = null;
    if (wasDrag) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster
      .intersectObjects(clickables, true)
      .find((h) => !(h.object as THREE.Sprite).isSprite && !(h.object as THREE.Points).isPoints && !(h.object as THREE.Line).isLine);
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && o !== cat.root) o = o.parent;
    if (o) {
      cat.hop();
      opts.onPet();
      return;
    }
    const p = hit.point;
    if (hit.object === ocean || !walkable(p.x, p.z)) {
      const isl = islandAt(p.x, p.z, -0.6);
      if (isl >= 0) planTo(islandFront(isl), isl);
      else opts.onSay("Meow! I can't swim 🌊");
      return;
    }
    const target = islandAt(p.x, p.z, 0);
    planTo(new THREE.Vector2(p.x, p.z), target >= 0 ? target : nearestIsland(p.x, p.z));
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.012, 7, 30);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---------- overlay elements (island labels, speech bubble) ---------- */
  const labels: (HTMLElement | null)[] = [];
  let bubble: HTMLElement | null = null;
  const v3 = new THREE.Vector3();
  let W = 1;
  let H = 1;
  const resize = () => {
    const parent = canvas.parentElement;
    W = parent?.clientWidth || window.innerWidth;
    H = parent?.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W < 700 ? 55 : 42;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  const place = (el: HTMLElement | null, x: number, y: number, z: number, fadeFrom = 60) => {
    if (!el) return;
    v3.set(x, y, z).project(camera);
    const behind = v3.z > 1;
    const d = camera.position.distanceTo(new THREE.Vector3(x, y, z));
    const o = behind ? 0 : THREE.MathUtils.clamp(1 - (d - fadeFrom) / 25, 0, 1);
    el.style.opacity = String(o);
    el.style.visibility = o < 0.02 ? "hidden" : "visible";
    el.style.transform = `translate3d(${((v3.x + 1) / 2) * W}px, ${((1 - v3.y) / 2) * H}px, 0) translate(-50%, -100%)`;
  };

  /* ---------- main loop ---------- */
  const timer = new THREE.Timer();
  let paused = false;
  let raf = 0;
  let introT = 0;
  const started = performance.now();
  let lastIsland: number | null = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3(pos.x, 1, pos.z);
  const overview = new THREE.Vector3(0, 55, 60);
  camera.position.copy(overview);
  camera.lookAt(0, 0, 0);
  const tmp = new THREE.Vector3();

  const frame = () => {
    raf = requestAnimationFrame(frame);
    timer.update();
    if (paused) return;
    const dt = Math.min(0.1, timer.getDelta());
    const t = timer.getElapsed();

    /* movement */
    let want = new THREE.Vector2();
    let maxSpeed = 2.6;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (keys.size) {
      const f = (keys.has("f") ? 1 : 0) - (keys.has("b") ? 1 : 0);
      const s = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0);
      want.set(fx * f - fz * s, fz * f + fx * s);
      if (want.lengthSq() > 0) want.normalize();
      maxSpeed = 2.9;
    } else if (path.length) {
      const wp = path[0];
      const dx = wp.x - pos.x;
      const dz = wp.y - pos.z;
      const d = Math.hypot(dx, dz);
      const last = path.length === 1;
      if (d < (last ? 0.12 : 0.45)) {
        path.shift();
      } else {
        want.set(dx / d, dz / d);
        if (last) maxSpeed = Math.max(0.6, Math.min(2.6, d * 1.6)); // slow down to arrive
      }
    }

    // turn smoothly toward the wanted direction, then walk forward
    const moving = want.lengthSq() > 0;
    if (moving) {
      const target = Math.atan2(want.x, want.y);
      let diff = target - heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const step = THREE.MathUtils.clamp(diff, -dt * 5.5, dt * 5.5);
      heading += step;
      turnRate = step / dt;
      const facingOk = Math.cos(diff);
      speed += (maxSpeed * Math.max(0.15, facingOk) - speed) * Math.min(1, dt * 4);
    } else {
      speed += (0 - speed) * Math.min(1, dt * 6);
      turnRate *= 0.8;
      if (speed < 0.02) speed = 0;
    }
    if (speed > 0) {
      const nx = pos.x + Math.sin(heading) * speed * dt;
      const nz = pos.z + Math.cos(heading) * speed * dt;
      if (walkable(nx, nz)) {
        pos.x = nx;
        pos.z = nz;
      } else if (walkable(nx, pos.z)) pos.x = nx;
      else if (walkable(pos.x, nz)) pos.z = nz;
      else speed *= 0.5;
    }
    pos.y += (groundY(pos.x, pos.z) - pos.y) * Math.min(1, dt * 12);
    cat.root.position.copy(pos);
    cat.root.rotation.y = heading;
    cat.update(dt, t, speed, turnRate);

    /* arrival on an island */
    const on = islandAt(pos.x, pos.z, 0.9);
    if (on !== lastIsland && (on >= 0 || islandAt(pos.x, pos.z, -0.3) < 0)) {
      lastIsland = on >= 0 ? on : null;
      if (on >= 0 && (pathIsland === null || pathIsland === on || !path.length)) opts.onIsland(on);
      else if (on < 0) opts.onIsland(null);
    }
    if (!path.length && pathIsland !== null) pathIsland = null;

    /* coins */
    for (const c of coins) {
      if (c.got) {
        if (c.fly >= 0) {
          c.fly += dt;
          const k = c.fly / 0.55;
          c.mesh.position.y = c.y + k * 1.6;
          c.mesh.scale.setScalar(Math.max(0.01, 1 - k));
          c.mesh.rotation.y += dt * 20;
          if (k >= 1) {
            c.fly = -1;
            c.mesh.visible = false;
          }
        }
        continue;
      }
      c.mesh.rotation.y = t * 2.4 + c.x;
      c.mesh.position.y = c.y + Math.sin(t * 2 + c.x) * 0.12;
      if (Math.hypot(c.x - pos.x, c.z - pos.z) < 0.75) {
        c.got = true;
        c.fly = 0;
        cat.hop();
        opts.onCoin(c.id);
      }
    }

    /* scenery motion */
    ocean.material.uniforms.time.value += dt * 0.55;
    wind.value = t;
    islands.forEach((isl, i) => {
      isl.crystal.rotation.y = t * 0.8 + i;
      isl.crystal.position.y = PLATEAU + 1.75 + Math.sin(t * 1.6 + i) * 0.15;
      isl.glow.position.y = isl.crystal.position.y;
      const near = lastIsland === i;
      const gm = isl.glow.material as THREE.SpriteMaterial;
      gm.opacity += ((near ? 0.95 : opts.dark ? 0.6 : 0.35) - gm.opacity) * Math.min(1, dt * 3);
      const gs = (near ? 3.8 : 2.8) + Math.sin(t * 2 + i) * 0.2;
      isl.glow.scale.set(gs, gs, 1);
      const fm = isl.foam.material as THREE.MeshBasicMaterial;
      fm.opacity = 0.65 + Math.sin(t * 1.3 + i) * 0.3;
    });
    clouds.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 380) c.position.x = -380;
    });
    if (SP) {
      const sp = spGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SP; i++) {
        const ph = spBase[i * 4 + 3];
        sp.setXYZ(i, spBase[i * 4] + Math.sin(t * 0.4 + ph) * 0.6, spBase[i * 4 + 1] + Math.sin(t * 0.7 + ph * 2) * 0.4, spBase[i * 4 + 2] + Math.cos(t * 0.35 + ph) * 0.6);
      }
      sp.needsUpdate = true;
      (sparkles.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(t * 3) * 0.3;
    }

    /* camera: cinematic fly-in, then a smooth third-person follow */
    introT = Math.min(1, (performance.now() - started) / 2800);
    const ease = 1 - Math.pow(1 - introT, 3);
    tmp.set(pos.x + Math.sin(yaw) * dist * Math.cos(pitch), pos.y + dist * Math.sin(pitch) + 0.6, pos.z + Math.cos(yaw) * dist * Math.cos(pitch));
    camPos.copy(overview).lerp(tmp, ease);
    if (introT >= 1) camera.position.lerp(tmp, Math.min(1, dt * 4));
    else camera.position.copy(camPos);
    camLook.lerp(tmp.set(pos.x, pos.y + 0.9, pos.z), Math.min(1, dt * (introT >= 1 ? 5 : 2)));
    camera.lookAt(camLook);

    sun.position.set(pos.x + sunOffset.x, sunOffset.y, pos.z + sunOffset.z);
    sun.target.position.set(pos.x, 0, pos.z);

    /* overlays */
    labels.forEach((el, i) => place(el, centers[i].x, 5.1, centers[i].z));
    place(bubble, pos.x, pos.y + 2.0, pos.z, 200);

    renderer.render(scene, camera);
  };
  frame();

  return {
    walkToIsland(i) {
      if (i < 0 || i >= N) return;
      keys.clear();
      planTo(islandFront(i), i);
    },
    setLabel(i, el) {
      labels[i] = el;
    },
    setBubble(el) {
      bubble = el;
    },
    setCollected(ids) {
      const s = new Set(ids);
      coins.forEach((c) => {
        const got = s.has(c.id);
        if (got === c.got) return;
        c.got = got;
        c.fly = -1;
        c.mesh.visible = !got;
        c.mesh.scale.setScalar(1);
      });
    },
    setPaused(p) {
      paused = p;
      if (p) keys.clear();
    },
    setKeysEnabled(on) {
      keysEnabled = on;
      if (!on) keys.clear();
    },
    pet() {
      cat.hop();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mat) => {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        });
      });
      env.dispose();
      detailTex.dispose();
      woodTex.dispose();
      glowTex.dispose();
      renderer.dispose();
    },
  };
}
