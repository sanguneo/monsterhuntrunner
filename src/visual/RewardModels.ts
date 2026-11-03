import * as THREE from 'three';
import { SculptKit, loftGeometry } from './SculptKit';
import { bakeStaticModel } from './ModelKit';
import type { CapeStyle, HatStyle } from '../data/worlds';

interface RewardModel {
  readonly group: THREE.Group;
  readonly tint: THREE.MeshStandardMaterial;
}
const ivory = 0xffecd0,
  gold = 0xd9b06c,
  ink = 0x3d3249;

/** A fitted double-sided cloth surface with sewn-in folds, not a cone or stacked blobs. */
function clothGeometry(vampire: boolean): THREE.BufferGeometry {
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const rows = 18,
    cols = 24;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const v = j / rows,
        u = i / cols;
      const scallop = vampire ? Math.abs(Math.sin(u * Math.PI * 3)) * 0.12 : Math.cos(u * Math.PI * 8) * 0.027;
      p.push(
        (u - 0.5) * (0.44 + 0.78 * Math.sin(v * Math.PI * 0.55)),
        -v * 0.78 + scallop * v ** 7,
        -0.025 -
          0.3 * v -
          (0.19 * Math.sin(v * Math.PI) + 0.12 * (1 - Math.exp(-v * 20)) * Math.exp(-v * 3)) -
          0.045 * Math.cos((u - 0.5) * Math.PI) * Math.sin(v * Math.PI) +
          Math.sin(u * Math.PI * 6) * 0.018 * v,
      );
      uv.push(u, v);
      if (j < rows && i < cols) {
        const a = j * (cols + 1) + i,
          b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function cape(style: CapeStyle): RewardModel {
  const k = new SculptKit(),
    vampire = style === 'vampire',
    color = vampire ? 0x7f1d1d : 0xcfe8ff;
  k.mesh(clothGeometry(vampire), color);
  const tint = k.material(color);
  tint.side = THREE.DoubleSide;
  tint.roughness = vampire ? 0.79 : 0.58;
  if (!vampire) {
    tint.transparent = true;
    tint.opacity = 0.73;
    tint.depthWrite = false;
  }
  for (const side of [-1, 1]) {
    k.sweep(
      vampire ? gold : ivory,
      Array.from({ length: 13 }, (_, i) => {
        const v = i / 12;
        return [
          (side * (0.44 + 0.78 * Math.sin(v * Math.PI * 0.55))) / 2,
          -v * 0.78 + (vampire ? 0 : 0.027) * v ** 7,
          -0.028 - 0.3 * v - (0.19 * Math.sin(v * Math.PI) + 0.12 * (1 - Math.exp(-v * 20)) * Math.exp(-v * 3)),
        ] as const;
      }),
      [0.007, 0.007, 0.006],
      undefined,
      undefined,
      'cloth',
      16,
    );
    if (vampire) {
      const collar = new THREE.Shape();
      collar.moveTo(side * 0.06, -0.06);
      collar.bezierCurveTo(side * 0.2, 0.01, side * 0.22, 0.24, side * 0.31, 0.28);
      collar.bezierCurveTo(side * 0.36, 0.09, side * 0.32, -0.04, side * 0.24, -0.14);
      collar.closePath();
      k.shape(0x3b293c, collar, 0.026, [0, 0, -0.015]);
      k.sweep(
        0xbc7e7d,
        [
          [side * 0.075, -0.045, -0.023],
          [side * 0.21, 0.085, -0.023],
          [side * 0.3, 0.26, -0.023],
        ],
        [0.005, 0.007, 0.003],
        undefined,
        undefined,
        'cloth',
        14,
      );
    }
  }
  if (vampire) {
    k.sphere(gold, [0, -0.055, 0.027], [0.039, 0.045, 0.013], undefined, 12, 'metal');
    k.sphere(0xa05c80, [0, -0.055, 0.04], [0.022, 0.026, 0.008], undefined, 12, 'eye');
  } else {
    // Embroidered spectral face lies flush on the fabric, readable from the chase camera.
    for (const side of [-1, 1]) k.sphere(0x658caa, [side * 0.065, -0.39, -0.309], [0.024, 0.039, 0.005], undefined, 12);
    k.sphere(0x7799b3, [0, -0.48, -0.337], [0.021, 0.026, 0.004], undefined, 12);
    for (const side of [-1, 1])
      k.sweep(
        ivory,
        [
          [side * 0.13, -0.56, -0.35],
          [side * 0.18, -0.62, -0.351],
          [side * 0.12, -0.68, -0.346],
        ],
        [0.004, 0.006, 0.002],
        undefined,
        undefined,
        'cloth',
        12,
      );
  }
  k.group.name = `reward-cape-${style}`;
  return { group: bakeStaticModel(k.group), tint };
}

/** Elliptical bands deliberately fit between the rabbit's ears. */
function band(k: SculptKit, c: number, y: number, surface: 'cloth' | 'metal' = 'metal'): void {
  const ring = k.torus(c, [0, y, 0], 0.245, 0.018, undefined, surface);
  ring.rotation.x = Math.PI / 2;
  ring.scale.x = 0.8;
}
function brimGeometry(): THREE.BufferGeometry {
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const rings = 4,
    sides = 48;
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        t = j / rings,
        r = 0.16 + t * 0.14;
      const torn = Math.max(0, Math.sin(a * 7 + 0.3)) ** 12 * 0.028 * t ** 3;
      p.push(
        Math.sin(a) * (r - torn) * 0.82,
        0.018 + Math.sin(a * 3) * 0.012 * t + Math.sin(a) * 0.025 * t,
        Math.cos(a) * (r - torn),
      );
      uv.push(i / sides, t);
      if (j < rings && i < sides) {
        const n = j * (sides + 1) + i;
        idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function hat(style: HatStyle): RewardModel {
  const k = new SculptKit(),
    color = { patchwork: 0x3f6212, lightning: 0xfde047, coral: 0x22d3ee, bone: 0xe7e5e4 }[style];
  const surface = style === 'lightning' ? 'metal' : 'cloth';
  const tint = k.material(color, surface);
  if (style === 'patchwork') {
    const g = loftGeometry(
      [
        [0.015, 0.21, 0.26],
        [0.08, 0.2, 0.245],
        [0.2, 0.16, 0.2, 0.025],
        [0.29, 0.1, 0.13, 0.05],
        [0.34, 0, 0, 0.06],
      ],
      18,
      24,
    );
    k.mesh(g, color);
    k.mesh(brimGeometry(), color);
    tint.side = THREE.DoubleSide;
    k.sweep(
      0x6f5748,
      [
        [-0.15, 0.09, 0.16],
        [0, 0.075, 0.255],
        [0.15, 0.08, 0.16],
      ],
      [0.012, 0.012, 0.012],
      undefined,
      undefined,
      'leather',
      18,
    );
    k.box(0xb2926c, [0.06, 0.17, 0.224], [0.105, 0.095, 0.012], undefined, 0.015).rotation.z = 0.18;
    for (let i = 0; i < 3; i++)
      k.sweep(
        ivory,
        [
          [0.015 + i * 0.032, 0.21, 0.239],
          [0.018 + i * 0.032, 0.23, 0.23],
        ],
        [0.003, 0.003],
        undefined,
        undefined,
        'cloth',
        6,
      );
    k.sweep(
      0x274626,
      [
        [-0.12, 0.19, 0.16],
        [-0.04, 0.29, 0.13],
        [0.05, 0.32, 0.07],
      ],
      [0.004, 0.005, 0.003],
      undefined,
      undefined,
      'cloth',
      12,
    );
  } else if (style === 'lightning') {
    k.loft(
      color,
      [
        [0.015, 0.21, 0.265],
        [0.09, 0.21, 0.26],
        [0.22, 0.16, 0.205],
        [0.3, 0.07, 0.09],
        [0.32, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
      20,
      24,
    );
    band(k, 0xb68e43, 0.025);
    const bolt = new THREE.Shape();
    bolt.moveTo(0.025, 0.12);
    bolt.lineTo(-0.075, 0.27);
    bolt.lineTo(-0.012, 0.27);
    bolt.lineTo(-0.035, 0.45);
    bolt.lineTo(0.1, 0.23);
    bolt.lineTo(0.035, 0.23);
    bolt.closePath();
    k.shape(0xc7f4e8, bolt, 0.025, [0, 0, 0.255], undefined, 'glow');
    for (const side of [-1, 1]) {
      k.box(0x967b45, [side * 0.215, 0.025, 0.02], [0.045, 0.12, 0.13], undefined, 0.018, 'metal');
      k.sphere(ivory, [side * 0.24, 0.04, 0.06], [0.012, 0.014, 0.015], undefined, 10, 'metal');
    }
    k.sweep(
      0xe6bc61,
      [
        [0, 0.05, -0.266],
        [0, 0.24, -0.16],
        [0, 0.315, 0],
        [0, 0.24, 0.16],
      ],
      [0.009, 0.009, 0.009, 0.009],
      undefined,
      undefined,
      'metal',
      20,
    );
  } else if (style === 'coral') {
    band(k, color, 0.035, 'cloth');
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * Math.PI,
        x = Math.sin(a) * 0.19,
        z = Math.cos(a) * 0.245,
        h = 0.21 + (2 - Math.abs(i - 2)) * 0.045;
      k.sweep(
        color,
        [
          [x, 0.035, z],
          [x * 1.04, h * 0.5, z],
          [x * 0.9, h, z - 0.015],
        ],
        [0.019, 0.018, 0.008],
        undefined,
        undefined,
        'cloth',
        16,
      );
      k.sweep(
        color,
        [
          [x * 1.02, h * 0.45, z],
          [x + 0.045, h * 0.7, z + 0.01],
          [x + 0.045, h * 0.86, z],
        ],
        [0.014, 0.012, 0],
        undefined,
        undefined,
        'cloth',
        12,
      );
      k.sphere(ivory, [x * 0.9, h + 0.016, z - 0.015], [0.027, 0.029, 0.026], undefined, 12, 'eye');
    }
    k.sphere(0xb4eee1, [0, 0.135, 0.26], [0.044, 0.054, 0.015], undefined, 16, 'eye');
  } else {
    band(k, gold, 0.025);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2,
        x = Math.sin(a) * 0.19,
        z = Math.cos(a) * 0.245;
      k.loft(
        color,
        [
          [0.025, 0.022, 0.022],
          [0.14, 0.019, 0.019],
          [0.22, 0.035, 0.025],
          [0.25, 0.025, 0.02],
          [0.26, 0, 0],
        ],
        [x, 0, z],
        undefined,
        'cloth',
        12,
        12,
      );
    }
    // One continuous skull cameo, with inset dark sockets instead of spherical cheek pieces.
    k.loft(
      color,
      [
        [0.045, 0, 0],
        [0.07, 0.058, 0.023],
        [0.12, 0.075, 0.032],
        [0.2, 0.074, 0.033],
        [0.245, 0.045, 0.025],
        [0.26, 0, 0],
      ],
      [0, 0, 0.25],
      undefined,
      'cloth',
      18,
      20,
    );
    for (const side of [-1, 1]) k.sphere(ink, [side * 0.027, 0.165, 0.285], [0.018, 0.024, 0.006], undefined, 12);
    for (const x of [-0.025, 0, 0.025]) k.box(0x897d79, [x, 0.09, 0.274], [0.004, 0.035, 0.008], undefined, 0.002);
    k.sphere(0xae8acc, [0, 0.29, 0.22], [0.032, 0.044, 0.018], undefined, 12, 'eye');
  }
  k.group.name = `reward-hat-${style}`;
  return { group: bakeStaticModel(k.group), tint };
}
export function createRewardModels(): { capes: Record<CapeStyle, RewardModel>; hats: Record<HatStyle, RewardModel> } {
  return {
    capes: { ghost: cape('ghost'), vampire: cape('vampire') },
    hats: { patchwork: hat('patchwork'), lightning: hat('lightning'), coral: hat('coral'), bone: hat('bone') },
  };
}
