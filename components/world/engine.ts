import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* =====================================================================
 * 3D island world: a chain of floating islands joined by rope bridges on a
 * pastel ocean. A chubby 3D cat walks between them. Every island is one
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

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRASS_Y = 0.42;
const SAND_Y = 0.2;

type IslandGeo = { x: number; z: number; r: number; color: THREE.Color; crystal: THREE.Object3D; glow: THREE.Sprite };
type Bridge = { ax: number; az: number; bx: number; bz: number; half: number };

function gradientTexture(stops: [number, string][], w = 4, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => lg.addColorStop(o, col));
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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
 * Scenery
 * ===================================================================== */
function jitterCylinder(geo: THREE.CylinderGeometry, r: () => number, amount: number, keepTop: boolean) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const top = (geo.parameters.height ?? 1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (keepTop && y >= top - 1e-3) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + (Math.sin(a * 3 + y) * 0.5 + Math.sin(a * 7.3) * 0.3 + (r() - 0.5) * 0.4) * amount;
    pos.setXYZ(i, x * k, y + (r() - 0.5) * amount * 0.6, z * k);
  }
  geo.computeVertexNormals();
}

function vertexGradient(geo: THREE.BufferGeometry, top: THREE.Color, bottom: THREE.Color, y0: number, y1: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1);
    c.copy(bottom).lerp(top, k);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
}

function buildIsland(scene: THREE.Scene, x: number, z: number, radius: number, kind: string, seed: number, glowTex: THREE.Texture, avoid: number[]): IslandGeo {
  const r = rng(seed);
  const tint = new THREE.Color(KIND_COLOR[kind] ?? KIND_COLOR.custom);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);

  // rocky underside: lavender stone fading to warm sand near the top
  const rock = new THREE.CylinderGeometry(radius * 0.98, radius * 0.42, 4.2, 48, 6);
  jitterCylinder(rock, r, 0.14, true);
  vertexGradient(rock, new THREE.Color("#f2d3c4"), new THREE.Color("#6f5a8a"), -2.1, 2.1);
  const rockMesh = new THREE.Mesh(rock, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  rockMesh.position.y = SAND_Y - 2.1;
  rockMesh.receiveShadow = true;
  g.add(rockMesh);

  // beach
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.99, 0.12, 48), new THREE.MeshStandardMaterial({ color: "#f8dccd", roughness: 1 }));
  sand.position.y = SAND_Y - 0.06;
  sand.receiveShadow = true;
  g.add(sand);

  // meadow: sage grass with a soft tint of the island colour
  const grassR = radius * 0.84;
  const grassGeo = new THREE.CylinderGeometry(grassR, grassR * 1.04, 0.24, 48, 1);
  const grassCol = new THREE.Color("#7fcf8e").lerp(tint, 0.18);
  vertexGradient(grassGeo, grassCol, grassCol.clone().multiplyScalar(0.82), -0.12, 0.12);
  const grass = new THREE.Mesh(grassGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: grassCol, emissiveIntensity: 0.08 }));
  grass.position.y = GRASS_Y - 0.12;
  grass.receiveShadow = true;
  g.add(grass);

  // foam ring on the water
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.95, radius * 1.28, 64),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.28, depthWrite: false })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.04;
  foam.userData.foam = true;
  g.add(foam);

  // landmark: stone pedestal with a floating crystal in the island colour
  const stone = new THREE.MeshStandardMaterial({ color: "#efe6f5", roughness: 0.7, flatShading: true });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.5, 8), stone);
  ped.position.y = GRASS_Y + 0.25;
  ped.castShadow = ped.receiveShadow = true;
  g.add(ped);
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 8), stone);
  ped2.position.y = GRASS_Y + 0.65;
  ped2.castShadow = true;
  g.add(ped2);
  const shapes: Record<string, THREE.BufferGeometry> = {
    home: new THREE.OctahedronGeometry(0.55, 0),
    about: new THREE.IcosahedronGeometry(0.5, 0),
    work: new THREE.OctahedronGeometry(0.5, 0),
    experience: new THREE.DodecahedronGeometry(0.5, 0),
    skills: new THREE.TetrahedronGeometry(0.6, 0),
    credentials: new THREE.OctahedronGeometry(0.52, 0),
    contact: new THREE.TorusGeometry(0.42, 0.13, 12, 32),
  };
  const crystal = new THREE.Mesh(
    shapes[kind] ?? new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.MeshPhysicalMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.15, clearcoat: 1, flatShading: true })
  );
  if (kind === "work") crystal.scale.set(0.8, 1.35, 0.8);
  crystal.position.y = GRASS_Y + 1.75;
  crystal.castShadow = true;
  g.add(crystal);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: tint, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(3.4, 3.4, 1);
  glow.position.y = GRASS_Y + 1.75;
  g.add(glow);

  // trees, rocks and flowers, kept clear of the centre and the bridges
  const okSpot = (a: number, d: number) => {
    if (d < 1.9) return false;
    return avoid.every((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > 0.42 || d < 1.2);
  };
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#8c6470", roughness: 0.9 });
  const sakura = [new THREE.MeshStandardMaterial({ color: "#f7b8d3", roughness: 0.8, flatShading: true }), new THREE.MeshStandardMaterial({ color: "#f29dc4", roughness: 0.8, flatShading: true })];
  const pine = [new THREE.MeshStandardMaterial({ color: "#8a9cf0", roughness: 0.85, flatShading: true }), new THREE.MeshStandardMaterial({ color: "#7486e3", roughness: 0.85, flatShading: true })];
  const rockMat = new THREE.MeshStandardMaterial({ color: "#bcaecf", roughness: 0.9, flatShading: true });
  const trees = 4 + Math.floor(radius * 0.8);
  for (let n = 0, tries = 0; n < trees && tries < 80; tries++) {
    const a = r() * Math.PI * 2;
    const d = 1.9 + r() * (grassR - 2.4);
    if (!okSpot(a, d)) continue;
    n++;
    const tx = Math.cos(a) * d;
    const tz = Math.sin(a) * d;
    const tree = new THREE.Group();
    tree.position.set(tx, GRASS_Y, tz);
    const sc = 0.75 + r() * 0.55;
    tree.scale.setScalar(sc);
    tree.rotation.y = r() * Math.PI;
    if (r() < 0.55) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 1.3, 7), trunkMat);
      trunk.position.y = 0.65;
      trunk.rotation.z = (r() - 0.5) * 0.2;
      trunk.castShadow = true;
      tree.add(trunk);
      for (let k = 0; k < 4; k++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + r() * 0.2, 1), sakura[k % 2]);
        b.position.set((r() - 0.5) * 0.7, 1.45 + r() * 0.4, (r() - 0.5) * 0.7);
        b.castShadow = true;
        tree.add(b);
      }
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), trunkMat);
      trunk.position.y = 0.3;
      trunk.castShadow = true;
      tree.add(trunk);
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.62 - k * 0.15, 0.85, 7), pine[k % 2]);
        c.position.y = 0.75 + k * 0.45;
        c.castShadow = true;
        tree.add(c);
      }
    }
    tree.userData.sway = r() * 6;
    g.add(tree);
  }
  for (let k = 0; k < 4; k++) {
    const a = r() * Math.PI * 2;
    const d = grassR + (radius - grassR) * 0.5;
    if (!okSpot(a, d)) continue;
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + r() * 0.25, 0), rockMat);
    rk.position.set(Math.cos(a) * d, SAND_Y + 0.08, Math.sin(a) * d);
    rk.rotation.set(r() * 3, r() * 3, r() * 3);
    rk.castShadow = rk.receiveShadow = true;
    g.add(rk);
  }
  const flowerCols = ["#ffffff", "#ffd1e6", "#c9d6ff", "#ffe9a8", "#e8c8f5"];
  const flowerGeo = new THREE.SphereGeometry(0.07, 6, 4);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 40);
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < 40; k++) {
    const a = r() * Math.PI * 2;
    const d = 1.3 + r() * (grassR - 1.5);
    m4.makeTranslation(Math.cos(a) * d, GRASS_Y + 0.05, Math.sin(a) * d);
    flowers.setMatrixAt(k, m4);
    flowers.setColorAt(k, new THREE.Color(flowerCols[k % flowerCols.length]));
  }
  g.add(flowers);

  return { x, z, r: radius, color: tint, crystal, glow };
}

function buildBridge(scene: THREE.Scene, b: Bridge) {
  const dx = b.bx - b.ax;
  const dz = b.bz - b.az;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const g = new THREE.Group();
  g.position.set(b.ax, 0, b.az);
  g.rotation.y = ang;
  scene.add(g);
  const wood = [new THREE.MeshStandardMaterial({ color: "#c2917e", roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: "#b07f70", roughness: 0.9 })];
  const n = Math.ceil(len / 0.42);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.34), wood[i % 2]);
    p.position.set(0, bridgeY(t) - 0.05, t * len);
    p.rotation.x = -Math.cos(t * Math.PI) * 0.12;
    p.castShadow = p.receiveShadow = true;
    g.add(p);
  }
  // rope posts and ropes
  const postMat = new THREE.MeshStandardMaterial({ color: "#8c6470", roughness: 0.9 });
  const ropeMat = new THREE.LineBasicMaterial({ color: "#f3dfe9" });
  for (const sx of [-0.85, 0.85]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.75, 6), postMat);
      post.position.set(sx, bridgeY(t) + 0.3, t * len);
      post.castShadow = true;
      g.add(post);
    }
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector3(sx, bridgeY(t) + 0.62 - Math.sin(((t * 3) % 1) * Math.PI) * 0.12, t * len));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
  }
}

function bridgeY(t: number) {
  return SAND_Y + 0.1 + Math.sin(t * Math.PI) * 0.35;
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
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps pastel colours saturated
  renderer.toneMappingExposure = opts.dark ? 0.95 : 1.05;

  const scene = new THREE.Scene();
  const sky = opts.dark
    ? gradientTexture([
        [0, "#1b1846"],
        [0.45, "#4d3470"],
        [0.75, "#a0609a"],
        [1, "#e7a3c4"],
      ])
    : gradientTexture([
        [0, "#86a7ff"],
        [0.45, "#b9a9ec"],
        [0.75, "#efb5d6"],
        [1, "#ffd9e8"],
      ]);
  scene.background = sky;
  // soft studio reflections so gold, crystals and fur catch the light
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = opts.dark ? 0.45 : 0.6;
  pmrem.dispose();
  scene.fog = new THREE.Fog(opts.dark ? "#6a4683" : "#efc0dc", 45, 150);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

  // light: soft sky/ground fill plus a warm sun that casts shadows near the cat
  scene.add(new THREE.HemisphereLight(opts.dark ? "#d4dbff" : "#e3e9ff", opts.dark ? "#8a6a90" : "#ffd3e4", opts.dark ? 0.85 : 1.0));
  const sun = new THREE.DirectionalLight(opts.dark ? "#ffe0f0" : "#fff4f2", opts.dark ? 2.1 : 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -22;
  sun.shadow.camera.right = sun.shadow.camera.top = 22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /* ocean */
  const oceanGeo = new THREE.PlaneGeometry(360, 360, 150, 150);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanBase = Float32Array.from((oceanGeo.attributes.position as THREE.BufferAttribute).array as Float32Array);
  const ocean = new THREE.Mesh(
    oceanGeo,
    new THREE.MeshStandardMaterial({ color: opts.dark ? "#6f7fe0" : "#93abfc", roughness: 0.22, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.93 })
  );
  ocean.receiveShadow = true;
  ocean.userData.ocean = true;
  scene.add(ocean);

  /* islands along a gentle zig-zag */
  const glowTex = glowTexture();
  const N = opts.islands.length;
  const centers = opts.islands.map((isl, i) => ({
    x: i * 15 - ((N - 1) * 15) / 2,
    z: (i % 2 === 0 ? -1 : 1) * 4.8 + Math.sin(i * 1.7) * 1.6,
    r: isl.kind === "home" ? 6.4 : 5.4,
  }));
  const bridges: Bridge[] = [];
  for (let i = 0; i < N - 1; i++) {
    const a = centers[i];
    const b = centers[i + 1];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / d;
    const uz = (b.z - a.z) / d;
    bridges.push({ ax: a.x + ux * (a.r - 0.7), az: a.z + uz * (a.r - 0.7), bx: b.x - ux * (b.r - 0.7), bz: b.z - uz * (b.r - 0.7), half: 0.72 });
  }
  const islands: IslandGeo[] = opts.islands.map((isl, i) => {
    const c = centers[i];
    const avoid: number[] = [];
    if (i > 0) avoid.push(Math.atan2(centers[i - 1].z - c.z, centers[i - 1].x - c.x));
    if (i < N - 1) avoid.push(Math.atan2(centers[i + 1].z - c.z, centers[i + 1].x - c.x));
    return buildIsland(scene, c.x, c.z, c.r, isl.kind, i * 131 + 17, glowTex, avoid);
  });
  bridges.forEach((b) => buildBridge(scene, b));

  /* clouds */
  const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: opts.dark ? 0.55 : 0.92 });
  const clouds: THREE.Group[] = [];
  const cr = rng(99);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + cr() * 1.4, 1), cloudMat);
      s.position.set(k * 1.6 - 3.2 + cr(), cr() * 0.8, cr() * 1.5);
      s.scale.y = 0.6;
      c.add(s);
    }
    c.position.set((cr() - 0.5) * 220, 16 + cr() * 12, -40 - cr() * 60);
    c.userData.speed = 0.4 + cr() * 0.8;
    scene.add(c);
    clouds.push(c);
  }

  /* floating sparkles */
  const SP = 260;
  const spPos = new Float32Array(SP * 3);
  const spCol = new Float32Array(SP * 3);
  const spBase: number[] = [];
  const pal = ["#ffd1e6", "#c9d6ff", "#e8c8f5", "#ffffff"].map((c) => new THREE.Color(c));
  for (let i = 0; i < SP; i++) {
    const x = (cr() - 0.5) * (N * 15 + 30);
    const y = 0.8 + cr() * 7;
    const z = (cr() - 0.5) * 40;
    spPos.set([x, y, z], i * 3);
    spBase.push(x, y, z, cr() * 6);
    const col = pal[i % pal.length];
    spCol.set([col.r, col.g, col.b], i * 3);
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
  const sparkles = new THREE.Points(
    spGeo,
    new THREE.PointsMaterial({ size: 0.16, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })
  );
  scene.add(sparkles);

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
      const a = (j / per) * Math.PI * 2 + i * 0.7;
      const d = c.r * 0.55;
      const id = `${isl.id}-${j}`;
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      const x = c.x + Math.cos(a) * d;
      const z = c.z + Math.sin(a) * d;
      mesh.position.set(x, GRASS_Y + 0.6, z);
      mesh.castShadow = true;
      mesh.visible = !collected.has(id);
      scene.add(mesh);
      coins.push({ id, mesh, x, z, y: GRASS_Y + 0.6, got: collected.has(id), fly: -1 });
    }
  });

  /* cat */
  const cat = buildCat();
  scene.add(cat.root);
  const pos = new THREE.Vector3(centers[0].x, GRASS_Y, centers[0].z + 2.6);
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
      if (Math.hypot(x - c.x, z - c.z) < c.r - margin) return i;
    }
    return -1;
  };
  const walkable = (x: number, z: number) => {
    for (let i = 0; i < N; i++) {
      const c = centers[i];
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < 1.15) return false; // the pedestal
      if (d < c.r - 0.45) return true;
    }
    return bridges.some((b) => segDist(x, z, b).d < b.half);
  };
  const groundY = (x: number, z: number) => {
    let y = -1;
    for (let i = 0; i < N; i++) {
      const c = centers[i];
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) {
        const gr = c.r * 0.84;
        y = Math.max(y, d < gr - 0.3 ? GRASS_Y : d < gr + 0.2 ? THREE.MathUtils.lerp(GRASS_Y, SAND_Y, (d - gr + 0.3) / 0.5) : SAND_Y);
      }
    }
    for (const b of bridges) {
      const s = segDist(x, z, b);
      if (s.d < b.half + 0.2) y = Math.max(y, bridgeY(s.t) + 0.02);
    }
    return y < 0 ? SAND_Y : y;
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
  /** Add a waypoint, stepping around the pedestal in the middle of an island. */
  const pushAround = (list: THREE.Vector2[], from: THREE.Vector2, to: THREE.Vector2) => {
    for (const c of centers) {
      const vx = to.x - from.x;
      const vz = to.y - from.y;
      const l2 = vx * vx + vz * vz || 1;
      const t = THREE.MathUtils.clamp(((c.x - from.x) * vx + (c.z - from.y) * vz) / l2, 0, 1);
      const px = from.x + vx * t;
      const pz = from.y + vz * t;
      const d = Math.hypot(px - c.x, pz - c.z);
      if (d < 1.6 && t > 0.02 && t < 0.98) {
        const l = Math.sqrt(l2);
        let nx = -vz / l;
        let nz = vx / l;
        if ((px - c.x) * nx + (pz - c.z) * nz < 0) {
          nx = -nx;
          nz = -nz;
        }
        list.push(new THREE.Vector2(c.x + nx * 2.1, c.z + nz * 2.1));
      }
    }
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
    const arr = (oceanGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = oceanBase[i];
      const z = oceanBase[i + 2];
      arr[i + 1] = Math.sin(x * 0.16 + t * 0.9) * 0.22 + Math.cos(z * 0.21 + t * 1.15) * 0.18 + Math.sin((x + z) * 0.4 + t * 1.7) * 0.06 - 0.12;
    }
    (oceanGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    islands.forEach((isl, i) => {
      isl.crystal.rotation.y = t * 0.8 + i;
      isl.crystal.position.y = GRASS_Y + 1.75 + Math.sin(t * 1.6 + i) * 0.15;
      isl.glow.position.y = isl.crystal.position.y;
      const near = lastIsland === i;
      const gm = isl.glow.material as THREE.SpriteMaterial;
      gm.opacity += ((near ? 1 : 0.55) - gm.opacity) * Math.min(1, dt * 3);
      const gs = (near ? 4.2 : 3.2) + Math.sin(t * 2 + i) * 0.2;
      isl.glow.scale.set(gs, gs, 1);
    });
    scene.traverse((o) => {
      if (o.userData.foam) o.scale.setScalar(1 + Math.sin(t * 1.2 + o.parent!.position.x) * 0.025);
      else if (o.userData.sway !== undefined) o.rotation.z = Math.sin(t * 1.1 + o.userData.sway) * 0.025;
    });
    clouds.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 130) c.position.x = -130;
    });
    const sp = spGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < SP; i++) {
      sp.setY(i, spBase[i * 4 + 1] + Math.sin(t * 0.6 + spBase[i * 4 + 3]) * 0.6);
      sp.setX(i, spBase[i * 4] + Math.sin(t * 0.3 + spBase[i * 4 + 3]) * 0.4);
    }
    sp.needsUpdate = true;

    /* camera: cinematic fly-in, then a smooth third-person follow */
    introT = Math.min(1, (performance.now() - started) / 2800);
    const ease = 1 - Math.pow(1 - introT, 3);
    tmp.set(pos.x + Math.sin(yaw) * dist * Math.cos(pitch), pos.y + dist * Math.sin(pitch) + 0.6, pos.z + Math.cos(yaw) * dist * Math.cos(pitch));
    camPos.copy(overview).lerp(tmp, ease);
    if (introT >= 1) camera.position.lerp(tmp, Math.min(1, dt * 4));
    else camera.position.copy(camPos);
    camLook.lerp(tmp.set(pos.x, pos.y + 0.9, pos.z), Math.min(1, dt * (introT >= 1 ? 5 : 2)));
    camera.lookAt(camLook);

    sun.position.set(pos.x + 14, 26, pos.z + 10);
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
      sky.dispose();
      envTex.dispose();
      glowTex.dispose();
      renderer.dispose();
    },
  };
}
