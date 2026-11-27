import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* =====================================================================
 * Realistic scenery for the island world: sunset sky, reflective ocean,
 * sculpted island terrain with beaches, meadows and paths, vegetation,
 * rocks and wooden rope bridges. Everything is generated in code.
 * ===================================================================== */

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- noise ---------- */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Fractal noise in roughly [-0.5, 0.5]. */
export function fbm(x: number, y: number, oct = 4) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * (noise(x * f, y * f) - 0.5);
    f *= 2.03;
    amp *= 0.5;
  }
  return s * 1.6;
}
const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ---------- island shape ---------- */
export type Shape = { x: number; z: number; r: number; seed: number; p1: number; p2: number };
export const PLATEAU = 0.55;
export const SHORE = 0.937; // fraction of the radius where the beach meets the water

export function shapeR(s: Shape, a: number) {
  return s.r * (1 + 0.075 * Math.sin(3 * a + s.p1) + 0.04 * Math.sin(7 * a + s.p2) + 0.02 * Math.sin(13 * a + s.p1 * 2));
}

/** Terrain height (world y) of one island at a world position. Negative = under water. */
export function islandHeight(s: Shape, wx: number, wz: number) {
  const dx = wx - s.x;
  const dz = wz - s.z;
  const dist = Math.hypot(dx, dz);
  const R = shapeR(s, Math.atan2(dz, dx));
  const d = dist / R;
  let h: number;
  if (d < 0.7) h = PLATEAU;
  else if (d < 1) h = PLATEAU - 0.6 * smooth(0.7, 1, d);
  else h = -0.05 - Math.min(1, (d - 1) / 0.4) * 1.4;
  const meadow = 1 - smooth(0.5, 0.74, d);
  const plaza = smooth(1.6, 2.9, dist);
  h += fbm(wx * 0.2 + s.seed, wz * 0.2 - s.seed) * 0.6 * meadow * plaza;
  return h;
}

/* ---------- textures ---------- */
function canvasTex(size: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fine speckle so grass and sand don't look flat. Multiplied with vertex colours. */
export function groundDetailTexture() {
  return canvasTex(256, (g) => {
    const img = g.createImageData(256, 256);
    const r = rng(5);
    for (let i = 0; i < 256 * 256; i++) {
      const x = i % 256;
      const y = (i / 256) | 0;
      const v = 205 + noise(x * 0.09, y * 0.09) * 30 + r() * 26;
      img.data.set([v, v, v, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    // a few blade strokes
    g.strokeStyle = "rgba(255,255,255,0.18)";
    for (let k = 0; k < 600; k++) {
      const x = r() * 256;
      const y = r() * 256;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
      g.stroke();
    }
  });
}

export function woodTexture() {
  return canvasTex(256, (g) => {
    g.fillStyle = "#9a7150";
    g.fillRect(0, 0, 256, 256);
    const r = rng(11);
    for (let y = 0; y < 256; y += 2) {
      const n = noise(0, y * 0.05) * 0.5 + r() * 0.25;
      g.fillStyle = `rgba(${70 + n * 60}, ${45 + n * 40}, ${28 + n * 25}, 0.35)`;
      g.fillRect(0, y, 256, 1 + r() * 2);
    }
    for (let k = 0; k < 5; k++) {
      g.fillStyle = "rgba(60,38,22,0.45)";
      g.beginPath();
      g.ellipse(r() * 256, r() * 256, 4 + r() * 4, 2 + r() * 2, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Tileable ripple normal map for the ocean (no image files needed). */
function waterNormals() {
  const N = 256;
  const h = new Float32Array(N * N);
  const waves: [number, number, number, number][] = [];
  const r = rng(3);
  for (let i = 0; i < 26; i++) waves.push([Math.round((r() - 0.5) * 24), Math.round((r() - 0.5) * 24), r() * Math.PI * 2, 0.4 + r()]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let v = 0;
      for (const [fx, fy, ph, a] of waves) v += (Math.sin(((fx * x + fy * y) / N) * Math.PI * 2 + ph) * a) / (1 + Math.hypot(fx, fy) * 0.15);
      h[y * N + x] = v;
    }
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const hx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
      const hy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
      const n = new THREE.Vector3(-hx * 0.35, -hy * 0.35, 1).normalize();
      data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], (y * N + x) * 4);
    }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/* ---------- sky + environment lighting ---------- */
export function buildSky(scene: THREE.Scene, renderer: THREE.WebGLRenderer, dark: boolean) {
  const params = dark
    ? { turbidity: 10, rayleigh: 3, mie: 0.007, g: 0.86, elevation: 3.2, azimuth: 200 }
    : { turbidity: 8, rayleigh: 2.6, mie: 0.006, g: 0.86, elevation: 7.5, azimuth: 200 };
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - params.elevation), THREE.MathUtils.degToRad(params.azimuth));
  const make = () => {
    const sky = new Sky();
    sky.scale.setScalar(4500);
    const u = sky.material.uniforms;
    u.turbidity.value = params.turbidity;
    u.rayleigh.value = params.rayleigh;
    u.mieCoefficient.value = params.mie;
    u.mieDirectionalG.value = params.g;
    u.sunPosition.value.copy(sunDir);
    return sky;
  };
  const sky = make();
  scene.add(sky);
  // light the world from the same sky
  const envScene = new THREE.Scene();
  envScene.add(make());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = dark ? 0.9 : 0.75;
  return { sky, env, sunDir };
}

/* ---------- ocean ---------- */
export function buildWater(scene: THREE.Scene, sunDir: THREE.Vector3, dark: boolean, small: boolean) {
  const water = new Water(new THREE.PlaneGeometry(2400, 2400), {
    textureWidth: small ? 256 : 512,
    textureHeight: small ? 256 : 512,
    waterNormals: waterNormals(),
    sunDirection: sunDir.clone(),
    sunColor: dark ? 0xffb3a7 : 0xfff0e0,
    waterColor: dark ? 0x1a2f55 : 0x1d6b86,
    distortionScale: 2.4,
    fog: true,
    alpha: 1,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 1.4;
  water.receiveShadow = true;
  scene.add(water);
  return water;
}

/** Turquoise shallows and a foam line that follow the island's coastline. */
function coastStrip(s: Shape, d0: number, d1: number, c0: [number, number, number, number], c1: [number, number, number, number], y: number) {
  const segs = 160;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segs; j++) {
    const a = (j / segs) * Math.PI * 2;
    const R = shapeR(s, a);
    for (const [d, c] of [
      [d0, c0],
      [d1, c1],
    ] as const) {
      pos.push(Math.cos(a) * R * d, y, Math.sin(a) * R * d);
      col.push(...c);
    }
    if (j < segs) {
      const k = j * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  const m = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, fog: true })
  );
  m.renderOrder = 2;
  return m;
}

/* ---------- vegetation ---------- */
const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

function jitter(geo: THREE.BufferGeometry, r: () => number, amt: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  // keep shared vertices together by jittering per position
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let o = seen.get(key);
    if (!o) {
      o = [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt];
      seen.set(key, o);
    }
    p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

function shadowAll(o: THREE.Object3D) {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
}

function palm(r: () => number) {
  const g = new THREE.Group();
  const bark = [mat("#8b6d4c"), mat("#76593c")];
  let parent: THREE.Object3D = g;
  const lean = (r() - 0.5) * 0.12 + 0.07;
  for (let k = 0; k < 8; k++) {
    const s = new THREE.Group();
    s.position.y = k === 0 ? 0 : 0.36;
    s.rotation.z = k === 0 ? lean : lean * 0.9;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - k * 0.006, 0.125 - k * 0.006, 0.38, 9), bark[k % 2]);
    seg.position.y = 0.19;
    s.add(seg);
    parent.add(s);
    parent = s;
  }
  const top = new THREE.Group();
  top.position.y = 0.4;
  parent.add(top);
  const leafMat = [mat("#3f8a3a", { side: THREE.DoubleSide, roughness: 0.75 }), mat("#4f9c3f", { side: THREE.DoubleSide, roughness: 0.75 })];
  const fronds = 9;
  for (let k = 0; k < fronds; k++) {
    const geo = new THREE.PlaneGeometry(0.46, 1.9, 2, 10);
    geo.translate(0, 0.95, 0);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 1.9;
      const x = p.getX(i) * (1 - y * 0.75) * (Math.abs(p.getX(i)) > 0.01 ? 1 : 1);
      p.setXYZ(i, x, p.getY(i), -y * y * 1.1 + Math.abs(x) * 0.25);
    }
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, leafMat[k % 2]);
    f.rotation.order = "YXZ";
    f.rotation.y = (k / fronds) * Math.PI * 2 + r() * 0.3;
    f.rotation.x = 0.65 + r() * 0.35;
    top.add(f);
  }
  const nut = mat("#5c3f22");
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), nut);
    c.position.set(Math.cos(k * 2.1) * 0.12, -0.05, Math.sin(k * 2.1) * 0.12);
    top.add(c);
  }
  return shadowAll(g);
}

function leafyTree(r: () => number, blossom: boolean) {
  const g = new THREE.Group();
  const bark = mat(blossom ? "#5b4136" : "#6b4f3a");
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 1.5, 8), bark);
  trunk.position.y = 0.75;
  g.add(trunk);
  for (const s of [-1, 1]) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 6), bark);
    br.position.set(s * 0.18, 1.35, 0);
    br.rotation.z = -s * 0.7;
    g.add(br);
  }
  const greens = blossom ? ["#f3bfd2", "#eaa5bf", "#f7d3e0"] : ["#4f8f3f", "#5e9f47", "#3f7a35", "#6aa84f"];
  const blobs = 6 + Math.floor(r() * 3);
  for (let k = 0; k < blobs; k++) {
    const geo = jitter(new THREE.IcosahedronGeometry(0.5 + r() * 0.28, 2), r, 0.12);
    const b = new THREE.Mesh(geo, mat(greens[k % greens.length], { roughness: 0.85 }));
    const a = (k / blobs) * Math.PI * 2;
    const rr = k === 0 ? 0 : 0.45 + r() * 0.2;
    b.position.set(Math.cos(a) * rr, 1.85 + r() * 0.45 + (k === 0 ? 0.35 : 0), Math.sin(a) * rr);
    g.add(b);
  }
  return shadowAll(g);
}

function conifer(r: () => number) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.7, 7), mat("#5a4232"));
  trunk.position.y = 0.35;
  g.add(trunk);
  const greens = [mat("#2f6b3f"), mat("#3a7a48"), mat("#2a5f39")];
  for (let k = 0; k < 4; k++) {
    const c = new THREE.Mesh(jitter(new THREE.ConeGeometry(0.75 - k * 0.15, 0.9, 9, 2), r, 0.06), greens[k % 3]);
    c.position.y = 0.75 + k * 0.42;
    g.add(c);
  }
  return shadowAll(g);
}

function bush(r: () => number) {
  const g = new THREE.Group();
  const cols = ["#4c8a3c", "#5a9a45", "#3f7a33"];
  for (let k = 0; k < 3; k++) {
    const b = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(0.22 + r() * 0.12, 1), r, 0.05), mat(cols[k]));
    b.position.set((r() - 0.5) * 0.4, 0.15 + r() * 0.08, (r() - 0.5) * 0.4);
    g.add(b);
  }
  return shadowAll(g);
}

function rock(r: () => number, size: number) {
  const geo = jitter(new THREE.DodecahedronGeometry(size, 1), r, size * 0.35);
  geo.scale(1, 0.65, 1);
  const tone = ["#8d877f", "#9e978c", "#7c766e"][Math.floor(r() * 3)];
  const m = new THREE.Mesh(geo, mat(tone, { flatShading: true }));
  m.rotation.y = r() * Math.PI;
  return shadowAll(m);
}

/** Wind-swayed grass tufts (one instanced mesh per island). */
let grassGeoCache: THREE.BufferGeometry | null = null;
function grassGeometry() {
  if (grassGeoCache) return grassGeoCache;
  const blades: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const b = new THREE.ConeGeometry(0.03, 0.34 + (k % 2) * 0.1, 3, 1);
    b.translate(0, 0.17, 0);
    b.rotateZ((k - 2) * 0.18);
    b.rotateY(k * 1.3);
    b.translate((k - 2) * 0.035, 0, ((k * 7) % 3) * 0.03 - 0.03);
    blades.push(b);
  }
  grassGeoCache = mergeGeometries(blades)!;
  return grassGeoCache;
}

export const wind = { value: 0 };
function windMaterial(color: string) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
       #else
         float ph = 0.0;
       #endif
       transformed.x += sin(uWind * 2.0 + ph) * 0.07 * position.y * 3.0;
       transformed.z += cos(uWind * 1.6 + ph) * 0.04 * position.y * 3.0;`
    );
  };
  return m;
}

/* ---------- island ---------- */
export type Obstacle = { x: number; z: number; r: number };
export type BuiltIsland = { crystal: THREE.Object3D; glow: THREE.Sprite; foam: THREE.Mesh; obstacles: Obstacle[] };

export function buildIsland(
  scene: THREE.Scene,
  s: Shape,
  crystalColor: string,
  crystalGeo: THREE.BufferGeometry,
  glowTex: THREE.Texture,
  detail: THREE.Texture,
  anchors: { x: number; z: number }[],
  dark: boolean
): BuiltIsland {
  const r = rng(s.seed * 7 + 3);
  const g = new THREE.Group();
  g.position.set(s.x, 0, s.z);
  scene.add(g);

  /* terrain mesh: a polar grid sculpted by islandHeight */
  const NR = 64;
  const NS = 140;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k <= NR; k++) {
    const d = (k / NR) * 1.42;
    for (let j = 0; j <= NS; j++) {
      const a = (j / NS) * Math.PI * 2;
      const R = shapeR(s, a);
      const lx = Math.cos(a) * R * d;
      const lz = Math.sin(a) * R * d;
      pos.push(lx, islandHeight(s, s.x + lx, s.z + lz), lz);
      uv.push((s.x + lx) * 0.45, (s.z + lz) * 0.45);
    }
  }
  for (let k = 0; k < NR; k++)
    for (let j = 0; j < NS; j++) {
      const a = k * (NS + 1) + j;
      const b = a + NS + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1); // counter-clockwise from above
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // colour by height, slope, noise, paths and the plaza
  const P = geo.attributes.position as THREE.BufferAttribute;
  const Nn = geo.attributes.normal as THREE.BufferAttribute;
  const cols = new Float32Array(P.count * 3);
  const C = (h: string) => new THREE.Color(h);
  const wetSand = C("#b59d74");
  const deep = C("#7d6c52");
  const sand = C("#e6d2a6");
  const sand2 = C("#d9c193");
  const grassA = C("#5f9f45");
  const grassB = C("#4b8a37");
  const grassC = C("#86b553");
  const dirt = C("#8b6c49");
  const rockC = C("#857e74");
  const plazaC = C("#bdb3a3");
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  const pathDist = (x: number, z: number) => {
    let best = Infinity;
    for (const an of anchors) {
      const ax = an.x - s.x;
      const az = an.z - s.z;
      const l2 = ax * ax + az * az;
      const t = THREE.MathUtils.clamp((x * ax + z * az) / l2, 0, 1);
      const w = 0.55 + Math.sin(t * 9 + s.seed) * 0.06;
      best = Math.min(best, Math.hypot(x - ax * t, z - az * t) / w);
    }
    return best;
  };
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i);
    const y = P.getY(i);
    const z = P.getZ(i);
    const wx = s.x + x;
    const wz = s.z + z;
    const n1 = noise(wx * 0.35, wz * 0.35);
    const n2 = noise(wx * 0.9 + 40, wz * 0.9);
    if (y < -0.03) c.copy(wetSand).lerp(deep, THREE.MathUtils.clamp(-y / 1.2, 0, 1));
    else if (y < 0.1) c.copy(wetSand).lerp(sand2, smooth(-0.03, 0.1, y));
    else if (y < 0.3) c.copy(sand2).lerp(sand, n1);
    else {
      c.copy(grassB).lerp(grassA, n1);
      if (n2 > 0.6) c.lerp(grassC, (n2 - 0.6) * 1.6);
      c.lerp(tmp.copy(sand), 1 - smooth(0.3, 0.46, y));
      if (n2 < 0.18 && y > 0.4) c.lerp(dirt, (0.18 - n2) * 3);
      const dist = Math.hypot(x, z);
      if (dist < 2.15) c.lerp(plazaC, 1 - smooth(1.75, 2.15, dist));
      else {
        const pd = pathDist(x, z);
        if (pd < 1) c.lerp(dirt, (1 - smooth(0.6, 1, pd)) * 0.85);
      }
    }
    const slope = 1 - Nn.getY(i);
    if (slope > 0.12 && y > -0.1) c.lerp(rockC, smooth(0.12, 0.3, slope));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.95 }));
  terrain.receiveShadow = true;
  terrain.userData.terrain = true;
  g.add(terrain);

  /* coastline: turquoise shallows + foam */
  g.add(coastStrip(s, SHORE - 0.005, 1.55, [0.36, 0.82, 0.78, dark ? 0.35 : 0.55], [0.2, 0.55, 0.65, 0], 0.025));
  const foam = coastStrip(s, SHORE - 0.012, SHORE + 0.05, [1, 1, 1, 0.85], [1, 1, 1, 0], 0.035);
  g.add(foam);

  /* stone plaza with the floating crystal */
  const stone = new THREE.MeshStandardMaterial({ color: "#d6cec2", roughness: 0.85, map: detail });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.98, 0.45, 10), stone);
  ped.position.y = PLATEAU + 0.2;
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.32, 10), stone);
  ped2.position.y = PLATEAU + 0.58;
  g.add(shadowAll(ped), shadowAll(ped2));
  const col = new THREE.Color(crystalColor);
  const crystal = new THREE.Mesh(
    crystalGeo,
    new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: dark ? 0.9 : 0.4, roughness: 0.08, metalness: 0.05, clearcoat: 1, flatShading: true, transmission: 0.25, thickness: 0.6 })
  );
  crystal.position.y = PLATEAU + 1.75;
  crystal.castShadow = true;
  g.add(crystal);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(3, 3, 1);
  glow.position.y = crystal.position.y;
  g.add(glow);

  /* vegetation, kept off the bridges' paths and the front viewing spot */
  const obstacles: Obstacle[] = [];
  const avoidA = anchors.map((an) => Math.atan2(an.z - s.z, an.x - s.x));
  avoidA.push(Math.PI / 2); // in front of the crystal, toward the camera
  const clear = (a: number, dist: number, rad: number) => {
    if (dist < 2.4) return false;
    if (avoidA.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.38 + 0.8 / Math.max(1, dist))) return false;
    const lx = Math.cos(a) * dist;
    const lz = Math.sin(a) * dist;
    return obstacles.every((o) => Math.hypot(o.x - (s.x + lx), o.z - (s.z + lz)) > o.r + rad + 0.25);
  };
  const place = (o: THREE.Object3D, a: number, d: number, rad: number, scale: number) => {
    const lx = Math.cos(a) * d;
    const lz = Math.sin(a) * d;
    o.position.set(lx, islandHeight(s, s.x + lx, s.z + lz) - 0.03, lz);
    o.scale.multiplyScalar(scale);
    o.rotation.y += r() * Math.PI * 2;
    g.add(o);
    if (rad > 0) obstacles.push({ x: s.x + lx, z: s.z + lz, r: rad * Math.min(1.2, scale) });
  };
  const tryPlace = (make: () => THREE.Object3D, n: number, dMin: number, dMax: number, rad: number, sMin: number, sMax: number) => {
    for (let k = 0, tries = 0; k < n && tries < 60; tries++) {
      const a = r() * Math.PI * 2;
      const R = shapeR(s, a);
      const d = (dMin + r() * (dMax - dMin)) * R;
      if (!clear(a, d, rad)) continue;
      place(make(), a, d, rad, sMin + r() * (sMax - sMin));
      k++;
    }
  };
  tryPlace(() => palm(r), 2 + Math.floor(r() * 3), 0.66, 0.8, 0.3, 0.62, 0.85);
  tryPlace(() => leafyTree(r, false), 2 + Math.floor(r() * 3), 0.42, 0.66, 0.5, 0.8, 1.1);
  tryPlace(() => conifer(r), 1 + Math.floor(r() * 2), 0.45, 0.66, 0.45, 0.85, 1.2);
  tryPlace(() => leafyTree(r, true), r() < 0.6 ? 1 : 0, 0.45, 0.62, 0.5, 0.8, 1);
  tryPlace(() => bush(r), 6, 0.35, 0.74, 0, 0.8, 1.3);
  for (let k = 0; k < 7; k++) {
    const a = r() * Math.PI * 2;
    if (!clear(a, 3, 0)) continue;
    const R = shapeR(s, a);
    const d = (0.86 + r() * 0.16) * R;
    const size = 0.18 + r() * 0.32;
    const rk = rock(r, size);
    const lx = Math.cos(a) * d;
    const lz = Math.sin(a) * d;
    rk.position.set(lx, Math.max(-0.15, islandHeight(s, s.x + lx, s.z + lz)) + size * 0.2, lz);
    g.add(rk);
    if (size > 0.3) obstacles.push({ x: s.x + lx, z: s.z + lz, r: size + 0.1 });
  }

  /* grass tufts + wildflowers */
  const tufts = new THREE.InstancedMesh(grassGeometry(), windMaterial("#ffffff"), 340);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 70);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const tuftCols = ["#5f9f45", "#4b8a37", "#7fb04f", "#6aa84f"].map((h) => new THREE.Color(h));
  const flowerCols = ["#ffffff", "#fff2a8", "#f6b7cf", "#c7b8f0", "#ffd0a8"].map((h) => new THREE.Color(h));
  let ti = 0;
  let fi = 0;
  for (let tries = 0; tries < 2400 && (ti < 340 || fi < 70); tries++) {
    const a = r() * Math.PI * 2;
    const R = shapeR(s, a);
    const d = (0.12 + r() * 0.62) * R;
    const lx = Math.cos(a) * d;
    const lz = Math.sin(a) * d;
    if (Math.hypot(lx, lz) < 2.2) continue;
    const y = islandHeight(s, s.x + lx, s.z + lz);
    if (y < 0.4) continue;
    if (obstacles.some((o) => Math.hypot(o.x - s.x - lx, o.z - s.z - lz) < o.r * 0.6)) continue;
    if (ti < 340) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
      const k = 0.45 + r() * 0.45;
      sc.set(k, k * (0.7 + r() * 0.4), k);
      m4.compose(new THREE.Vector3(lx, y - 0.02, lz), q, sc);
      tufts.setMatrixAt(ti, m4);
      tufts.setColorAt(ti, tuftCols[ti % tuftCols.length]);
      ti++;
    } else if (fi < 70) {
      m4.makeTranslation(lx, y + 0.12, lz);
      flowers.setMatrixAt(fi, m4);
      flowers.setColorAt(fi, flowerCols[fi % flowerCols.length]);
      fi++;
    }
  }
  tufts.count = ti;
  flowers.count = fi;
  tufts.receiveShadow = true;
  g.add(tufts, flowers);

  return { crystal, glow, foam, obstacles };
}

/* ---------- bridges ---------- */
export type Bridge = { ax: number; az: number; bx: number; bz: number; half: number };
export function bridgeY(t: number) {
  return 0.32 + Math.sin(t * Math.PI) * 0.4;
}

export function buildBridge(scene: THREE.Scene, b: Bridge, wood: THREE.Texture) {
  const dx = b.bx - b.ax;
  const dz = b.bz - b.az;
  const len = Math.hypot(dx, dz);
  const g = new THREE.Group();
  g.position.set(b.ax, 0, b.az);
  g.rotation.y = Math.atan2(dx, dz);
  scene.add(g);
  const r = rng(Math.round(len * 100));
  const plankGeo = new THREE.BoxGeometry(1.7, 0.08, 0.3);
  const n = Math.ceil(len / 0.36);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const tone = new THREE.Color("#ffffff").multiplyScalar(0.82 + r() * 0.25);
    const p = new THREE.Mesh(plankGeo, new THREE.MeshStandardMaterial({ map: wood, color: tone, roughness: 0.9 }));
    p.position.set((r() - 0.5) * 0.06, bridgeY(t) - 0.04, t * len);
    p.rotation.set(-Math.cos(t * Math.PI) * 0.14, (r() - 0.5) * 0.05, (r() - 0.5) * 0.03);
    g.add(p);
  }
  // stringers under the planks
  const beamMat = new THREE.MeshStandardMaterial({ map: wood, color: "#8a7060", roughness: 0.9 });
  for (const sx of [-0.62, 0.62]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(sx, bridgeY(i / 20) - 0.12, (i / 20) * len));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 6), beamMat));
  }
  // posts and thick rope rails that sag between posts
  const postMat = new THREE.MeshStandardMaterial({ map: wood, color: "#7a5e48", roughness: 0.9 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: "#c9b28a", roughness: 1 });
  const posts = 4;
  for (const sx of [-0.86, 0.86]) {
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.25, 7), postMat);
      post.position.set(sx, bridgeY(t) + 0.15, t * len);
      g.add(post);
    }
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const seg = (t * posts) % 1;
      pts.push(new THREE.Vector3(sx, bridgeY(t) + 0.72 - Math.sin(seg * Math.PI) * 0.13, t * len));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.028, 6), ropeMat));
  }
  shadowAll(g);
}

/* ---------- clouds: soft billboard puffs lit by the sunset ---------- */
function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = rng(77);
  for (let k = 0; k < 26; k++) {
    const x = 128 + (r() - 0.5) * 110;
    const y = 140 + (r() - 0.5) * 60 - Math.abs(x - 128) * 0.15;
    const rad = 34 + r() * 44;
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, "rgba(255,255,255,0.55)");
    rg.addColorStop(0.6, "rgba(255,255,255,0.22)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  // shade the underside a little
  const sh = g.createLinearGradient(0, 90, 0, 230);
  sh.addColorStop(0, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(120,100,140,0.35)");
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = sh;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildClouds(scene: THREE.Scene, dark: boolean) {
  const tex = puffTexture();
  const out: THREE.Group[] = [];
  const r = rng(99);
  const tints = dark ? ["#b9a3d1", "#d7a6c6", "#9f95cf"] : ["#ffffff", "#ffe6ea", "#fff1e2"];
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Group();
    const puffs = 4 + Math.floor(r() * 4);
    for (let k = 0; k < puffs; k++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: tints[k % tints.length], transparent: true, depthWrite: false, opacity: dark ? 0.55 : 0.9, fog: true });
      const sp = new THREE.Sprite(m);
      const w = 22 + r() * 26;
      sp.scale.set(w, w * 0.55, 1);
      sp.position.set((k - puffs / 2) * 11 + r() * 6, r() * 4, r() * 6);
      c.add(sp);
    }
    const a = r() * Math.PI * 2;
    const d = 160 + r() * 220;
    c.position.set(Math.cos(a) * d, 30 + r() * 40, Math.sin(a) * d - 60);
    c.userData.speed = 0.6 + r() * 1.2;
    scene.add(c);
    out.push(c);
  }
  return out;
}
