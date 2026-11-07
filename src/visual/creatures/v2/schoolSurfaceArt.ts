import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey, type SurfaceSample } from './SurfaceDetail';
const tau = Math.PI * 2;
const fract = (x: number) => x - Math.floor(x);
const wave = (x: number, n: number) => Math.sin(tau * x * n);
const mix = (a: readonly number[], b: readonly number[], t: number) =>
  a.map((x, i) => x * (1 - t) + b[i] * t) as [number, number, number];
const ink = [0.2, 0.135, 0.11] as const;
function paper(u: number, v: number): SurfaceSample {
  u = fract(u);
  v = fract(v);
  const fibre = wave(u + v * 0.07, 51) * wave(v, 43),
    age = (wave(u, 3) * wave(v, 2) + 1) * 0.5;
  const edge = Math.pow(Math.abs(v - 0.5) * 2, 12) * 0.08;
  let mark = 0;
  // Uneven compact handwritten strokes, not repeating full-width dashed rules.
  for (let row = 0; row < 5; row++) {
    const line = 0.14 + row * 0.052;
    for (let word = 0; word < 7; word++) {
      const left = 0.13 + word * 0.1 + 0.012 * Math.sin(row * 5 + word);
      const width = 0.035 + 0.017 * (0.5 + 0.5 * Math.sin(word * 7 + row));
      const t = (u - left) / width;
      const stroke = line + 0.009 * Math.sin(t * Math.PI * 3 + row) + 0.005 * t;
      if (t > 0 && t < 1 && Math.abs(v - stroke) < 0.003) mark = 0.67;
    }
  }
  const radius = Math.hypot(u - 0.5, v - 0.69);
  if (Math.abs(radius - 0.19) < 0.004 || Math.abs(radius - 0.163) < 0.0025) mark = 0.8;
  const segment = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(u - ax - t * dx, v - ay - t * dy);
  };
  if (
    Math.min(segment(0.5, 0.5, 0.335, 0.785), segment(0.335, 0.785, 0.665, 0.785), segment(0.665, 0.785, 0.5, 0.5)) <
    0.0035
  )
    mark = 0.85;
  if (Math.abs(u - 0.5) < 0.0025 && v > 0.47 && v < 0.91) mark = 0.6;
  const color = mix([0.79 + 0.04 * age - edge, 0.71 + 0.035 * age - edge, 0.55 + 0.03 * age - edge], ink, mark);
  return { color, height: 0.003 * fibre - 0.002 * mark, roughness: 0.88, metalness: 0, occlusion: 1 };
}
registerSurfaceSampler('paper/school-academic', paper, 256);
registerSurfaceSampler(
  'paper/school-flight',
  (u, v) => {
    const x = (u - 0.5) * 1.14,
      z = v * 1.04 - 0.68;
    const fibre = wave(u + v * 0.07, 51) * wave(v, 43),
      age = 0.5 + 0.5 * wave(u, 3) * wave(v, 2);
    let mark = 0;
    for (let row = 0; row < 7; row++) {
      const line = -0.31 + row * 0.064,
        wobble = 0.006 * Math.sin(Math.abs(x) * 240 + row * 2);
      if (
        Math.abs(x) > 0.09 &&
        Math.abs(x) < 0.39 &&
        Math.abs(z - line - wobble) < 0.0035 &&
        fract(Math.abs(x) * 66 + row * 0.3) > 0.17
      )
        mark = 0.82;
    }
    const outer = (0.57 * (z + 0.68)) / 0.97,
      wear = Math.max(0, 1 - Math.abs(outer - Math.abs(x)) / 0.018) * 0.045;
    return {
      color: mix([0.8 + 0.025 * age - wear, 0.73 + 0.025 * age - wear, 0.59 + 0.02 * age - wear], ink, mark),
      height: 0.002 * fibre - 0.002 * mark,
      roughness: 0.87,
      metalness: 0,
    };
  },
  256,
);

registerSurfaceSampler('wornLeather/school-book', (u, v) => {
  u = fract(u);
  v = fract(v);
  const grain = wave(u, 37) * wave(v, 43);
  const cracks = [
    [
      [0.18, 0.94],
      [0.25, 0.84],
      [0.22, 0.74],
      [0.29, 0.67],
    ],
    [
      [0.74, 0.91],
      [0.69, 0.83],
      [0.77, 0.75],
    ],
    [
      [0.12, 0.29],
      [0.22, 0.34],
      [0.29, 0.28],
      [0.34, 0.36],
    ],
    [
      [0.84, 0.12],
      [0.76, 0.23],
      [0.81, 0.34],
    ],
    [
      [0.24, 0.84],
      [0.34, 0.87],
    ],
    [
      [0.77, 0.75],
      [0.86, 0.72],
    ],
  ];
  let distance = 1;
  for (const path of cracks)
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1],
        [bx, by] = path[i],
        dx = bx - ax,
        dy = by - ay;
      const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
      distance = Math.min(distance, Math.hypot(u - ax - t * dx, v - ay - t * dy));
    }
  const cut = Math.exp(-((distance / 0.004) ** 2)),
    scuff = Math.exp(-(((distance - 0.009) / 0.004) ** 2));
  const edge = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5));
  const wear = Math.max(0, (edge - 0.43) / 0.07) * 0.035;
  return {
    color: [
      0.145 + 0.012 * grain - 0.065 * cut + 0.045 * scuff + wear,
      0.085 + 0.008 * grain - 0.035 * cut + 0.03 * scuff + wear * 0.7,
      0.175 + 0.015 * grain - 0.07 * cut + 0.035 * scuff + wear,
    ],
    height: 0.003 * grain - 0.045 * cut + 0.005 * scuff,
    roughness: 0.67 + 0.08 * cut + 0.04 * grain,
    metalness: 0,
    occlusion: 1 - 0.15 * cut,
  };
});
registerSurfaceSampler('agedGold/school-brass', (u, v) => {
  const age = (wave(u, 3) * wave(v, 5) + 1) * 0.5,
    etch = Math.pow(Math.max(0, wave(u + v * 0.15, 32)), 12);
  return {
    color: mix([0.3, 0.25, 0.14], [0.76, 0.58, 0.26], 0.45 + 0.55 * age),
    height: -0.003 * etch,
    roughness: 0.31 + 0.2 * (1 - age),
    metalness: 0.72 + 0.2 * age,
    occlusion: 1,
  };
});
registerSurfaceSampler('wood/school-pencil', (u, v) => {
  const grain = wave(u + 0.002 * wave(v, 2), 38);
  return {
    color: [0.66 + 0.05 * grain, 0.47 + 0.05 * grain, 0.28 + 0.035 * grain],
    height: 0.0008 * grain,
    roughness: 0.68,
    metalness: 0,
  };
});
registerSurfaceSampler('lacquer/school-pencil', (u, v) => {
  const scratch = Math.pow(Math.max(0, wave(u + 0.008 * wave(v, 5), 19)), 24) * (0.5 + 0.5 * wave(v, 2));
  // Directional fractured lacquer branches lead into the carved eye band.
  const paths = [
    [
      [0.46, 0.31],
      [0.475, 0.245],
      [0.462, 0.19],
      [0.49, 0.09],
    ],
    [
      [0.55, 0.31],
      [0.53, 0.255],
      [0.555, 0.22],
      [0.54, 0.16],
    ],
    [
      [0.475, 0.245],
      [0.44, 0.21],
    ],
    [
      [0.53, 0.255],
      [0.5, 0.23],
    ],
  ];
  let distance = 1;
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1],
        [bx, by] = path[i],
        dx = bx - ax,
        dy = by - ay;
      const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
      distance = Math.min(distance, Math.hypot(u - ax - t * dx, v - ay - t * dy));
    }
  const crack = Math.exp(-((distance / 0.004) ** 2)),
    chip = Math.exp(-(((distance - 0.007) / 0.004) ** 2));
  const base = mix([0.88, 0.58, 0.09], [0.57, 0.39, 0.2], scratch * 0.55);
  const worn = mix(base, [0.67, 0.49, 0.29], chip * 0.7);
  return {
    color: mix(worn, [0.13, 0.08, 0.055], crack * 0.9),
    height: -0.007 * scratch - 0.035 * crack,
    roughness: 0.27 + 0.25 * scratch + 0.32 * crack + 0.15 * chip,
    metalness: 0,
  };
});
registerSurfaceSampler('brushedMetal/school-ferrule', (u, v) => {
  const brushed = wave(v, 55),
    ring = Math.pow(Math.max(0, wave(v, 7)), 20);
  return {
    color: [0.42 - 0.09 * ring, 0.44 - 0.09 * ring, 0.48 - 0.09 * ring],
    height: 0.002 * brushed - 0.008 * ring,
    roughness: 0.32 + 0.06 * brushed,
    metalness: 0.9,
  };
});
registerSurfaceSampler('brocade/school-academic', (u, v) => {
  u = fract(u);
  v = fract(v);
  const x = fract(u * 3) - 0.5,
    y = fract(v * 5) - 0.5;
  const diamond = Math.exp(-Math.pow((Math.abs(x) + Math.abs(y) - 0.33) / 0.024, 2));
  const stem = Math.exp(-Math.pow(x / 0.018, 2)) * Math.exp(-Math.pow(y / 0.3, 8));
  const thread = Math.max(diamond, stem) * 0.4;
  return {
    color: mix([0.065, 0.07, 0.06], [0.53, 0.4, 0.18], thread),
    height: 0.022 * thread + 0.003 * wave(u, 48) * wave(v, 48),
    roughness: 0.75 - 0.3 * thread,
    metalness: 0.5 * thread,
  };
});
registerSurfaceSampler('velvet/school-coat', (u, v) => ({
  color: [0.065 + 0.005 * wave(v, 7), 0.09 + 0.005 * wave(v, 7), 0.075],
  height: 0.004 * wave(u, 48) * wave(v, 48),
  roughness: 0.8,
  metalness: 0,
}));
registerSurfaceSampler('velvet/school-uniform', (u, v) => ({
  color: [0.075, 0.075, 0.1 + 0.008 * wave(v, 5)],
  height: 0.004 * wave(u, 48) * wave(v, 48),
  roughness: 0.82,
  metalness: 0,
}));
for (const silver of [false, true])
  registerSurfaceSampler(silver ? 'hair/school-silver' : 'hair/school-dark', (u, v) => {
    const strand = wave(u + 0.005 * wave(v, 3), 40),
      shade = 0.5 + 0.5 * strand;
    return {
      color: silver
        ? [0.66 + 0.05 * shade, 0.66 + 0.05 * shade, 0.65 + 0.05 * shade]
        : [0.055 + 0.006 * shade + 0.012 * v, 0.032 + 0.004 * shade, 0.08 + 0.008 * shade + 0.045 * v],
      height: 0.003 * strand,
      roughness: 0.61 - 0.04 * shade,
      metalness: 0,
    };
  });

const chalkGlyphs: Record<string, number[][][]> = {
  x: [
    [
      [0, 0],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 0],
    ],
  ],
  y: [
    [
      [0, 1],
      [0.5, 0.5],
      [1, 1],
    ],
    [
      [0.5, 0.5],
      [0.5, 0],
    ],
  ],
  '2': [
    [
      [0, 0.8],
      [0.3, 1],
      [0.8, 1],
      [1, 0.7],
      [0, 0],
      [1, 0],
    ],
  ],
  '1': [
    [
      [0.15, 0.7],
      [0.5, 1],
      [0.5, 0],
    ],
    [
      [0.1, 0],
      [0.9, 0],
    ],
  ],
  '+': [
    [
      [0, 0.5],
      [1, 0.5],
    ],
    [
      [0.5, 0],
      [0.5, 1],
    ],
  ],
  '=': [
    [
      [0, 0.35],
      [1, 0.35],
    ],
    [
      [0, 0.7],
      [1, 0.7],
    ],
  ],
  m: [
    [
      [0, 0],
      [0, 1],
      [0.5, 0.45],
      [1, 1],
      [1, 0],
    ],
  ],
};
const chalkStrokes: number[][] = [];
for (const [text, x, y] of [
  ['x2+y2', 0.06, 0.77],
  ['y=mx', 0.72, 0.77],
  ['x+y=1', 0.06, 0.12],
  ['x=2', 0.75, 0.15],
] as const) {
  [...text].forEach((letter, index) => {
    for (const polyline of chalkGlyphs[letter])
      for (let j = 0; j < polyline.length - 1; j++) {
        const a = polyline[j],
          b = polyline[j + 1],
          sup = letter === '2';
        chalkStrokes.push([
          x + index * 0.047 + a[0] * 0.029,
          y + (sup ? 0.045 : 0) + a[1] * (sup ? 0.04 : 0.075),
          x + index * 0.047 + b[0] * 0.029,
          y + (sup ? 0.045 : 0) + b[1] * (sup ? 0.04 : 0.075),
        ]);
      }
  });
}
registerSurfaceSampler('paper/school-blackboard', (u, v) => {
  let distance = 10;
  for (const [ax, ay, bx, by] of chalkStrokes) {
    const dx = bx - ax,
      dy = by - ay,
      t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(u - ax - t * dx, v - ay - t * dy));
  }
  const chalk = Math.max(0, 1 - distance / 0.0045) * 0.64;
  const erased = 0.018 * (0.5 + 0.5 * wave(u + v * 0.13, 7)) * Math.exp(-(((v - 0.32) / 0.13) ** 2));
  return {
    color: mix([0.055 + erased, 0.105 + erased, 0.085 + erased], [0.72, 0.75, 0.66], chalk),
    height: 0.001 * chalk,
    roughness: 0.94,
    metalness: 0,
  };
});

/** Reuse a small model-local material palette; all texture artwork is shared immutable cache data. */
export function dressSchoolCreature(group: THREE.Group, id: string): void {
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const surface = (key: SurfaceKey, color = 0xffffff, normalStrength = 0.3) => {
    const cacheKey = key + ':' + color;
    let mat = cache.get(cacheKey);
    if (!mat) {
      mat = createSurfaceMaterial(key, {
        color,
        normalStrength,
        sheen: key.startsWith('velvet') ? 0.035 : 0,
        sheenColor: key === 'velvet/school-coat' ? 0x32493b : 0x383547,
      });
      cache.set(cacheKey, mat);
    }
    return mat;
  };
  const flat = (key: string, color: number, glow = 0) => {
    let mat = cache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, emissive: color, emissiveIntensity: glow });
      cache.set(key, mat);
    }
    return mat;
  };
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material) || o.userData.authoredSchoolFace) return;
    const old = o.material as THREE.MeshStandardMaterial,
      c = old.color.getHex();
    let material: THREE.MeshStandardMaterial | undefined;
    if (o.name === 'recessed-ink-eye-socket') material = flat('ink-eye-socket', 0x211524);
    else if (o.name.startsWith('focused-eye'))
      material = flat(
        'eyes',
        id === 'ghostTeacher' ? 0x322933 : id === 'ghostGirl' ? 0x704b91 : 0xe5ac45,
        id === 'ghostTeacher' ? 0 : 0.18,
      );
    else if ([0xa48547, 0xd6b56b, 0x8c7753, 0xb99b57, 0x7e745c].includes(c))
      material = surface('agedGold/school-brass');
    else if ([0xd8cdb3, 0xe5dcc7, 0xc4b89e, 0xe4dfd5].includes(c))
      material = surface(id === 'paperGhost' ? 'paper/school-flight' : 'paper/school-academic', 0xffffff, 0.16);
    else if (c === 0xe9b342) material = surface('lacquer/school-pencil');
    else if (c === 0xc4a57b) material = surface('wood/school-pencil');
    else if ([0x8e929b, 0x555760].includes(c)) material = surface('brushedMetal/school-ferrule');
    else if ([0x302438, 0x151720, 0x423047].includes(c))
      material = surface(
        id === 'bookGhost' ? 'wornLeather/school-book' : 'brocade/school-academic',
        0xffffff,
        id === 'bookGhost' ? 0.6 : 0.3,
      );
    else if (c === 0x25403a) material = surface('paper/school-blackboard', 0xffffff, 0.1);
    else if (c === 0x27312f) material = surface('velvet/school-coat');
    else if ([0x242934, 0x30313e, 0x30303a].includes(c)) material = surface('velvet/school-uniform');
    else if ([0x242034, 0x534264].includes(c)) material = surface('hair/school-dark');
    else if ([0xd6d3cf, 0xb3b2b1, 0xc7c6c5].includes(c)) material = surface('hair/school-silver');
    else if ([0xbcb7bc, 0xa99cab].includes(c)) material = surface('spectralSkin', 0xa99cab, 0.05);
    else if ([0xd1cbc0, 0xd4cec7].includes(c)) material = surface('ivoryLinen', 0xc6bda6, 0.16);
    else if (c === 0x69518e) material = flat('spectral-wisp', 0x57417b, 0.12);
    if (!material) return;
    if (old.side === THREE.DoubleSide) material.side = THREE.DoubleSide;
    if (material.map && !o.geometry.getAttribute('uv'))
      throw new Error(`School textured surface missing authored UV: ${o.name}`);
    o.material = material;
  });
}
