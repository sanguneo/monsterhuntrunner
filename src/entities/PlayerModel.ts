import * as THREE from 'three';
import { SculptKit, loftGeometry } from '../visual/SculptKit';
import { bakeStaticModel } from '../visual/ModelKit';
import { createRewardModels } from '../visual/RewardModels';
import type { CapeStyle, HatStyle } from '../data/worlds';

/** +Z is forward; the chase camera sees the hunter's back from -Z. */
export type PlayerPose = {
  readonly running: boolean;
  readonly airborne: boolean;
  readonly sliding: boolean;
  readonly lateralVelocity: number;
  readonly verticalVelocity: number;
  readonly dash: boolean;
  readonly invulnerable: boolean;
  readonly alive: boolean;
};
/** Explicit visual road-contact datum (carpet height); collision root remains at player Y=0. */
export const HUNTER_ROAD_CONTACT_Y = -0.017;
const colors = { fur: 0xd69a61, cream: 0xffedce, mint: 0x70d5b7, coat: 0x356c6d, dark: 0x352c38, pink: 0xedaca3 };

/** Paint regions on an existing continuous surface; colors never add anatomical lumps. */
function paint(geometry: THREE.BufferGeometry, colorAt: (x: number, y: number, z: number) => THREE.Color): void {
  const p = geometry.getAttribute('position'),
    values: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const c = colorAt(p.getX(i), p.getY(i), p.getZ(i));
    values.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
}
function normalizeFinalNormals(geometry: THREE.BufferGeometry): void {
  const normals = geometry.getAttribute('normal'),
    positions = geometry.getAttribute('position');
  const normal = new THREE.Vector3();
  for (let i = 0; i < normals.count; i++) {
    normal.fromBufferAttribute(normals, i);
    if (normal.lengthSq() < 1e-12) normal.fromBufferAttribute(positions, i);
    if (normal.lengthSq() < 1e-12) normal.set(0, 1, 0);
    normal.normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
}
function paintedMesh(geometry: THREE.BufferGeometry, name: string, parent: THREE.Group, roughness = 0.75): THREE.Mesh {
  normalizeFinalNormals(geometry);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness }));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function surfaceGrid(
  point: (u: number, v: number) => readonly [number, number, number],
  columns: number,
  rows: number,
): THREE.BufferGeometry {
  const p: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      p.push(...point(i / columns, j / rows));
      uv.push(i / columns, j / rows);
      if (j < rows && i < columns) {
        const a = j * (columns + 1) + i,
          b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Close both tiny end rings of an authored loft with explicit triangle fans. */
function closeLoftCaps(geometry: THREE.BufferGeometry, rings: number, sides: number): void {
  const p = geometry.getAttribute('position'),
    positions = Array.from(p.array),
    uv = Array.from(geometry.getAttribute('uv').array),
    indices = Array.from(geometry.index!.array);
  for (const end of [0, rings]) {
    const start = end * (sides + 1),
      center = new THREE.Vector3();
    for (let i = 0; i < sides; i++)
      center.add(new THREE.Vector3(p.getX(start + i), p.getY(start + i), p.getZ(start + i)));
    center.divideScalar(sides);
    const vertex = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    uv.push(0.5, end === 0 ? 0 : 1);
    for (let i = 0; i < sides; i++)
      indices.push(...(end === 0 ? [vertex, start + i + 1, start + i] : [vertex, start + i, start + i + 1]));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  // Topology now has two extra fan centers: rebuild, do not reuse the shorter normal buffer.
  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal'),
    normal = new THREE.Vector3();
  for (let j = 0; j <= rings; j++) {
    const a = j * (sides + 1),
      b = a + sides;
    normal
      .set(normals.getX(a) + normals.getX(b), normals.getY(a) + normals.getY(b), normals.getZ(a) + normals.getZ(b))
      .normalize();
    normals.setXYZ(a, normal.x, normal.y, normal.z);
    normals.setXYZ(b, normal.x, normal.y, normal.z);
  }
}

/** Sculpted rabbit hunter. Articulated roots and reward sockets are gameplay-compatible. */
export class PlayerModel {
  readonly group = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly eyes: THREE.Group[] = [];
  private readonly ears: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly feet: THREE.Group[] = [];
  private readonly scarf = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly cape = new THREE.Group();
  private readonly hat = new THREE.Group();
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly rewards = createRewardModels();
  private time = 0;
  private landing = 0;
  private wasAirborne = false;
  private readonly soleSamples: { leg: THREE.Group; mesh: THREE.Mesh; vertices: Float32Array }[] = [];
  private readonly soleMatrix = new THREE.Matrix4();
  private readonly solePoint = new THREE.Vector3();
  private readonly footRestPositions: THREE.Vector3[] = [];
  private readonly slideHipPivot = new THREE.Vector3(0, -0.095, -0.1);
  private readonly slidePivotOffset = new THREE.Vector3();

  constructor() {
    this.group.name = 'rabbit-hunter';
    this.rig.name = 'courier-pose';
    this.group.add(this.rig);
    const k = new SculptKit();
    const body = new THREE.Group();
    body.name = 'tailored-hunter-coat';
    // Soft shirt and open coat: three-dimensional drape rather than a rigid tunic block.
    const shirt = k.loft(
      colors.cream,
      [
        [0.62, 0.26, 0.215],
        [0.645, 0.265, 0.22],
        [0.7, 0.255, 0.205],
        [0.84, 0.245, 0.19],
        [1.06, 0.225, 0.17],
        [1.24, 0.19, 0.15],
        [1.3, 0, 0],
      ],
      undefined,
      body,
      'cloth',
      16,
      18,
    );
    // Only the front shirt panel can be seen through the open coat; omit hidden
    // back faces so moving upper legs cannot intersect a redundant inner shell.
    const shirtPosition = shirt.geometry.getAttribute('position'),
      shirtIndex = shirt.geometry.index!;
    const shirtFaces: number[] = [];
    for (let i = 0; i < shirtIndex.count; i += 3) {
      const triangle = [shirtIndex.getX(i), shirtIndex.getX(i + 1), shirtIndex.getX(i + 2)];
      if (triangle.every((j) => shirtPosition.getZ(j) >= -1e-6)) shirtFaces.push(...triangle);
    }
    shirt.geometry.setIndex(shirtFaces);
    const coatPosition = (u: number, v: number): readonly [number, number, number] => {
      const opening = 0.42 + 0.25 * v;
      const a = opening + u * (Math.PI * 2 - opening * 2);
      const r = 0.26 - 0.035 * Math.sin(v * Math.PI) + 0.115 * v * v;
      const depth = 0.185 - 0.012 * Math.sin(v * Math.PI) + 0.07 * v * v;
      return [
        Math.sin(a) * r,
        1.35 - v * 0.73 - 0.13 * Math.abs(Math.sin(a)) * (1 - v) ** 4 + 0.035 * Math.cos(a) * v ** 4,
        Math.cos(a) * depth - 0.018 + Math.sin(a * 3) * 0.008 * Math.sin(v * Math.PI),
      ];
    };
    const coat = k.mesh(surfaceGrid(coatPosition, 24, 12), colors.coat, undefined, undefined, body);
    (coat.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    coat.name = 'flowing-open-front-coat';
    for (const side of [-1, 1]) {
      k.sweep(
        0x78a99b,
        Array.from({ length: 15 }, (_, i) => {
          const p = coatPosition(side < 0 ? 1 : 0, i / 14);
          return [p[0], p[1], p[2] + 0.005] as const;
        }),
        [0.007, 0.007, 0.006],
        undefined,
        body,
        'cloth',
        22,
      );
      k.sweep(
        0x285858,
        [
          [side * 0.245, 0.86, 0.12],
          [side * 0.275, 0.81, 0.12],
          [side * 0.29, 0.76, 0.115],
        ],
        [0.004, 0.006, 0.004],
        undefined,
        body,
        'cloth',
        12,
      );
    }
    // The hood drapes from the shoulders and has a genuinely hollow collar opening.
    const collar = k.mesh(
      surfaceGrid(
        (u, v) => {
          const a = u * Math.PI * 2,
            back = (1 - Math.cos(a)) / 2;
          const radius = 0.14 + v * 0.13;
          return [Math.sin(a) * radius, 1.32 - v * (0.045 + 0.1 * back), Math.cos(a) * (0.105 + v * 0.095) - v * 0.03];
        },
        28,
        7,
      ),
      colors.coat,
      undefined,
      undefined,
      body,
    );
    (collar.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    // A single rounded folded cloth volume, not a lifted planar flap.
    k.loft(
      colors.coat,
      [
        [1.1, 0, 0, 0, -0.25],
        [1.14, 0.12, 0.035, 0, -0.27],
        [1.2, 0.185, 0.052, 0, -0.275],
        [1.27, 0.19, 0.055, 0, -0.24],
        [1.32, 0.14, 0.045, 0, -0.19],
        [1.34, 0, 0, 0, -0.16],
      ],
      undefined,
      body,
      'cloth',
      16,
      20,
    ).name = 'soft-folded-hood-volume';
    k.sweep(
      0x81aa9b,
      [
        [-0.2, 1.27, 0.13],
        [-0.1, 1.24, 0.18],
        [0, 1.2, 0.205],
        [0.11, 1.25, 0.17],
        [0.2, 1.27, 0.13],
      ],
      [0.012, 0.012, 0.012, 0.012, 0.012],
      undefined,
      body,
      'cloth',
      24,
    );
    // Flat leather strap follows the torso; pouch and backpack are separate useful equipment.
    k.sweep(
      0x986746,
      [
        [-0.23, 1.26, 0.15],
        [-0.11, 1.12, 0.185],
        [0.05, 0.96, 0.21],
        [0.27, 0.77, 0.13],
      ],
      [0.027, 0.027, 0.027, 0.027],
      [0.009, 0.009, 0.009, 0.009],
      body,
      'leather',
      24,
    );
    k.box(0xe0b778, [-0.04, 1.04, 0.225], [0.075, 0.085, 0.012], body, 0.012, 'metal').rotation.z = 0.59;
    k.box(0x8a5c40, [0, 1.01, -0.3], [0.36, 0.39, 0.19], body, 0.08, 'leather');
    const flap = new THREE.Shape();
    flap.moveTo(-0.17, 0.11);
    flap.quadraticCurveTo(0, 0.16, 0.17, 0.11);
    flap.lineTo(0.16, -0.065);
    flap.quadraticCurveTo(0, -0.15, -0.16, -0.065);
    flap.closePath();
    k.shape(0xa6754e, flap, 0.018, [0, 1.085, -0.415], body);
    k.box(0x714b36, [0, 0.965, -0.43], [0.055, 0.16, 0.018], body, 0.01, 'leather');
    k.torus(0xd6ac6e, [0, 0.925, -0.446], 0.035, 0.008, body, 'metal');
    k.box(0x986746, [0.315, 0.76, 0.055], [0.18, 0.25, 0.15], body, 0.05, 'leather').rotation.z = -0.1;
    k.box(0xb78858, [0.315, 0.83, 0.14], [0.18, 0.105, 0.018], body, 0.025, 'leather').rotation.z = -0.1;
    k.sphere(0xdcb475, [0.32, 0.785, 0.16], [0.017, 0.019, 0.006], body, 10, 'metal');
    k.torus(0xdab37a, [0, 1.205, 0.225], 0.043, 0.009, body, 'metal');
    k.sphere(0xb8c5a4, [0, 1.205, 0.234], [0.03, 0.032, 0.009], body, 12, 'eye');
    k.loft(
      colors.cream,
      [
        [1.22, 0, 0],
        [1.28, 0.12, 0.11],
        [1.39, 0.105, 0.095],
        [1.47, 0, 0],
      ],
      undefined,
      body,
      'cloth',
      10,
      12,
    );
    const clothingShell = new THREE.Group();
    clothingShell.name = 'hunter-garment-shell';
    shirt.name = 'hunter-shirt-shell';
    coat.name = 'hunter-coat-shell';
    clothingShell.add(shirt, coat);
    this.rig.add(clothingShell, bakeStaticModel(body));

    // Contained continuous pelvis joins both articulated thigh roots beneath the hem.
    // It is a single smooth body shell, not visible spherical joint pads.
    const pelvis = k.loft(
      colors.fur,
      [
        [0.56, 0, 0, 0, -0.05],
        [0.585, 0.22, 0.12, 0, -0.05],
        [0.62, 0.24, 0.18, 0, -0.05],
        [0.67, 0.255, 0.175, 0, -0.05],
        [0.72, 0.255, 0.175, 0, -0.05],
        [0.78, 0.2, 0.14, 0, -0.045],
        [0.83, 0, 0, 0, -0.04],
      ],
      undefined,
      this.rig,
      'cloth',
      14,
      16,
    );
    pelvis.name = 'continuous-inner-pelvis';
    closeLoftCaps(pelvis.geometry, 14, 16);

    this.head.position.set(0, 1.72, 0.025);
    this.head.name = 'hunter-head-pivot';
    this.rig.add(this.head);
    const headGeo = new THREE.SphereGeometry(1, 32, 24);
    const hp = headGeo.getAttribute('position');
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i),
        y = hp.getY(i),
        z = hp.getZ(i);
      const cheeks = 0.065 * Math.exp(-(((y + 0.28) / 0.48) ** 2));
      const muzzle = 0.115 * Math.max(0, z) ** 5 * Math.exp(-(((y + 0.34) / 0.43) ** 2));
      hp.setXYZ(i, x * (0.425 + cheeks), y * 0.395, z * 0.335 + muzzle);
    }
    headGeo.computeVertexNormals();
    paint(headGeo, (x, y, z) => {
      const muzzle =
        (1 - THREE.MathUtils.smoothstep((x / 0.375) ** 2 + ((y + 0.13) / 0.19) ** 2, 0.8, 1.2)) *
        THREE.MathUtils.smoothstep(z, 0.16, 0.28);
      const eyeMask =
        Math.exp(-(((Math.abs(x) - 0.19) / 0.115) ** 2) - ((y - 0.055) / 0.14) ** 2) *
        THREE.MathUtils.smoothstep(z, 0.18, 0.29) *
        0.32;
      return new THREE.Color(colors.fur).lerp(new THREE.Color(colors.cream), Math.max(muzzle, eyeMask));
    });
    paintedMesh(headGeo, 'continuous-head-and-muzzle', this.head);
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.185, 0.055, 0.315);
      eye.rotation.y = side * 0.28;
      eye.name = `hunter-eye-${side}`;
      k.sphere(0xffefd9, [0, 0, 0], [0.096, 0.104, 0.02], eye, 14, 'eye');
      k.sphere(0x8e552f, [-side * 0.012, -0.006, 0.014], [0.083, 0.088, 0.01], eye, 14, 'eye');
      k.sphere(0x2b2025, [-side * 0.014, -0.004, 0.022], [0.046, 0.062, 0.006], eye, 14, 'eye');
      k.sphere(0xffefd9, [-0.022, 0.028, 0.028], [0.017, 0.02, 0.003], eye, 10, 'eye');
      k.sweep(
        0x795139,
        [
          [-0.09, 0.035, 0.006],
          [-0.055, 0.066, 0.012],
          [0.015, 0.074, 0.006],
          [0.085, 0.045, 0.008],
        ],
        [0.004, 0.012, 0.012, 0.004],
        undefined,
        eye,
        'cloth',
        18,
      );
      this.head.add(eye);
      this.eyes.push(eye);
      k.sweep(
        0x9c653e,
        [
          [side * 0.11, 0.205, 0.258],
          [side * 0.18, 0.227 + (side < 0 ? 0.006 : 0), 0.254],
          [side * 0.265, 0.205, 0.23],
        ],
        [0.004, 0.017, 0.004],
        undefined,
        this.head,
        'cloth',
        16,
      ).name = 'embedded-brow';
      const ear = new THREE.Group();
      ear.name = `hunter-ear-${side}`;
      const eg =
        side < 0
          ? loftGeometry(
              [
                [0, 0, 0],
                [0.08, 0.075, 0.04],
                [0.33, 0.145, 0.062, -0.025],
                [0.65, 0.13, 0.055, -0.065],
                [0.83, 0.06, 0.03, -0.09],
                [0.89, 0, 0, -0.1],
              ],
              22,
              16,
            )
          : (() => {
              const path = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.055, 0.25, 0),
                new THREE.Vector3(0.24, 0.43, 0),
                new THREE.Vector3(0.43, 0.39, 0.015),
                new THREE.Vector3(0.55, 0.19, 0.035),
              ]);
              const geometry = surfaceGrid(
                (u, v) => {
                  const c = path.getPointAt(v),
                    tangent = path.getTangentAt(v);
                  const width = (0.055 + 0.095 * Math.sin(Math.PI * v)) * Math.sqrt(Math.min(1, (1 - v) * 5));
                  const a = u * Math.PI * 2;
                  return [
                    c.x - tangent.y * Math.cos(a) * width,
                    c.y + tangent.x * Math.cos(a) * width,
                    c.z + Math.sin(a) * (0.035 + 0.018 * Math.sin(Math.PI * v)) * Math.min(1, (1 - v) * 7),
                  ];
                },
                14,
                24,
              );
              const indices = geometry.index!;
              for (let i = 0; i < indices.count; i += 3) {
                const b = indices.getX(i + 1);
                indices.setX(i + 1, indices.getX(i + 2));
                indices.setX(i + 2, b);
              }
              geometry.computeVertexNormals();
              return geometry;
            })();
      paint(eg, (x, y, z) => {
        const inner = THREE.MathUtils.smoothstep(z, 0.016, 0.043) * THREE.MathUtils.smoothstep(y, 0.07, 0.18);
        return new THREE.Color(colors.fur).lerp(new THREE.Color(0xde9c89), inner * 0.88);
      });
      paintedMesh(eg, 'continuous-ear-with-inset-color', ear);
      ear.position.set(side * 0.265, 0.29, -0.025);
      this.head.add(ear);
      this.ears.push(ear);

      const arm = new THREE.Group();
      arm.name = `hunter-arm-${side}`;
      const sleeve = k.loft(
        colors.coat,
        [
          [-0.31, 0, 0, side * 0.08],
          [-0.29, 0.078, 0.078, side * 0.08],
          [-0.21, 0.085, 0.082, side * 0.065],
          [-0.08, 0.105, 0.095, side * 0.04],
          [0.035, 0.095, 0.09, side * 0.005],
          [0.09, 0, 0, -side * 0.025],
        ],
        undefined,
        arm,
        'cloth',
        16,
        14,
      );
      sleeve.name = 'soft-dropped-shoulder-sleeve';
      const cuff = k.loft(
        colors.cream,
        [
          [-0.045, 0.076, 0.077],
          [-0.035, 0.09, 0.089],
          [0.028, 0.087, 0.086],
          [0.045, 0.076, 0.077],
        ],
        [side * 0.08, -0.265, 0],
        arm,
        'cloth',
        8,
        14,
      );
      cuff.rotation.z = side * 0.2;
      const ag = loftGeometry(
        [
          [-0.72, 0, 0, -side * 0.035, side < 0 ? 0.19 : 0.095],
          [-0.695, 0.044, 0.028, -side * 0.035, side < 0 ? 0.19 : 0.095],
          [-0.64, 0.065, 0.04, -side * 0.03, side < 0 ? 0.18 : 0.085],
          [-0.57, 0.05, 0.038, -side * 0.015, side < 0 ? 0.15 : 0.067],
          [-0.44, 0.06, 0.048, side * 0.025, side < 0 ? 0.08 : 0.025],
          [-0.3, 0.075, 0.063],
          [-0.24, 0, 0],
        ],
        18,
        14,
      );
      const ap = ag.getAttribute('position');
      for (let i = 0; i < ap.count; i++) {
        const x = ap.getX(i),
          y = ap.getY(i),
          z = ap.getZ(i);
        const thumb = Math.exp(-(((y + 0.605) / 0.047) ** 2)) * Math.max(0, (-side * x) / 0.065) ** 3 * 0.018;
        ap.setX(i, x + side * 0.08 - side * thumb);
        if (y < -0.66) ap.setY(i, y - 0.006 * Math.cos((x / 0.055) * Math.PI * 3));
        void z;
      }
      ag.computeVertexNormals();
      paint(ag, (_x, y) =>
        new THREE.Color(colors.fur).lerp(new THREE.Color(0xe4b47d), THREE.MathUtils.smoothstep(-y, 0.45, 0.72) * 0.25),
      );
      paintedMesh(ag, 'continuous-forearm-and-hand', arm);
      arm.position.set(side * 0.21, side < 0 ? 1.18 : 1.2, 0);
      this.rig.add(arm);
      this.arms.push(arm);

      const leg = new THREE.Group();
      leg.name = `hunter-foot-${side}`;
      k.loft(
        colors.fur,
        [
          [-0.45, 0, 0, 0, -0.01],
          [-0.39, 0.065, 0.07, 0, -0.025],
          [-0.28, 0.072, 0.082, 0, 0.018],
          [-0.21, 0.07, 0.075, 0, -0.02],
          [-0.14, 0.05, 0.045, 0, -0.075],
          [-0.095, 0, 0, 0, -0.1],
        ],
        undefined,
        leg,
        'cloth',
        16,
        14,
      ).name = 'continuous-bent-rabbit-leg';
      const boot = loftGeometry(
        [
          [-0.7, 0, 0, 0, 0.045],
          [-0.686, 0.11, 0.17, 0, 0.045],
          [-0.63, 0.12, 0.18, 0, 0.05],
          [-0.54, 0.105, 0.14, 0, 0.035],
          [-0.43, 0.085, 0.085, 0, -0.01],
          [-0.37, 0.085, 0.082, 0, -0.01],
          [-0.34, 0, 0, 0, -0.01],
        ],
        18,
        16,
      );
      paint(boot, (_x, y) => new THREE.Color(y < -0.655 ? 0x644936 : 0x956543));
      const bootMesh = paintedMesh(boot, 'single-tailored-boot-shell', leg, 0.64);
      this.soleSamples.push({ leg, mesh: bootMesh, vertices: new Float32Array(boot.getAttribute('position').array) });
      k.loft(
        0x815638,
        [
          [-0.45, 0.088, 0.09, 0, -0.01],
          [-0.43, 0.098, 0.095, 0, -0.01],
          [-0.36, 0.097, 0.09, 0, -0.01],
          [-0.345, 0.087, 0.083, 0, -0.01],
        ],
        undefined,
        leg,
        'leather',
        6,
        14,
      );
      k.sweep(
        0xbd9569,
        [
          [-0.085, -0.6, 0.12],
          [0, -0.57, 0.185],
          [0.085, -0.6, 0.12],
        ],
        [0.003, 0.003, 0.003],
        undefined,
        leg,
        'leather',
        14,
      );
      k.sphere(0xcaa26d, [side * 0.098, -0.415, 0.005], [0.011, 0.018, 0.018], leg, 10, 'metal');
      leg.position.set(side * 0.18, side < 0 ? 0.76 : 0.735, side < 0 ? 0.075 : -0.025);
      this.rig.add(leg);
      this.feet.push(leg);
      this.footRestPositions.push(leg.position.clone());
    }
    const nose = new THREE.Shape();
    nose.moveTo(-0.058, 0.018);
    nose.quadraticCurveTo(0, 0.04, 0.058, 0.018);
    nose.quadraticCurveTo(0.04, -0.018, 0, -0.04);
    nose.quadraticCurveTo(-0.04, -0.018, -0.058, 0.018);
    const noseMesh = k.shape(0xda927e, nose, 0.02, [0, -0.095, 0.431], this.head);
    noseMesh.name = 'conforming-rabbit-nose';
    const smileStart = this.head.children.length;
    k.sweep(
      0x9a6750,
      [
        [0, -0.13, 0.435],
        [0, -0.165, 0.429],
      ],
      [0.005, 0.004],
      undefined,
      this.head,
      'cloth',
      8,
    );
    for (const side of [-1, 1])
      k.sweep(
        0x9a6750,
        [
          [0, -0.165, 0.429],
          [side * 0.055, -0.19, 0.418],
          [side * 0.105, -0.16, 0.405],
        ],
        [0.004, 0.006, 0.003],
        undefined,
        this.head,
        'cloth',
        14,
      );
    // Conform mouth strokes to the continuous muzzle, avoiding floating dark seams.
    // Analytic projection uses the same head surface as the vertex authoring above.
    // This avoids thousands of construction-time triangle raycasts on low-end devices.
    const faceHit = (x: number, y: number) => {
      const yn = y / 0.395,
        xn = x / (0.425 + 0.065 * Math.exp(-(((yn + 0.28) / 0.48) ** 2)));
      const residual = 1 - xn * xn - yn * yn;
      if (residual < 0) return undefined;
      const zn = Math.sqrt(residual);
      return { point: { z: zn * 0.335 + 0.115 * zn ** 5 * Math.exp(-(((yn + 0.34) / 0.43) ** 2)) } };
    };
    // Bend every eye layer and eyelid around the face, rather than attaching flat buttons.
    for (const eye of this.eyes) {
      eye.updateMatrix();
      for (const mesh of eye.children)
        if (mesh instanceof THREE.Mesh) {
          mesh.updateMatrix();
          const matrix = eye.matrix.clone().multiply(mesh.matrix),
            inverse = matrix.clone().invert();
          const p = mesh.geometry.getAttribute('position');
          for (let i = 0; i < p.count; i++) {
            const eyeLocal = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(mesh.matrix);
            // Upper opening is gently lidded, not a fully exposed staring disc.
            eyeLocal.y = Math.min(eyeLocal.y, 0.025 + 0.05 * Math.sqrt(Math.max(0, 1 - (eyeLocal.x / 0.096) ** 2)));
            const point = eyeLocal.clone().applyMatrix4(eye.matrix);
            const hit = faceHit(point.x, point.y);
            if (hit) {
              point.z = hit.point.z + eyeLocal.z * 0.6 + 0.002;
              point.applyMatrix4(inverse);
              p.setXYZ(i, point.x, point.y, point.z);
            }
          }
          mesh.geometry.computeVertexNormals();
        }
    }
    for (const mesh of [noseMesh, ...this.head.children.filter((n) => n.name === 'embedded-brow')])
      if (mesh instanceof THREE.Mesh) {
        mesh.updateMatrix();
        const inverse = mesh.matrix.clone().invert();
        const p = mesh.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
          const localZ = p.getZ(i),
            point = new THREE.Vector3(p.getX(i), p.getY(i), localZ).applyMatrix4(mesh.matrix);
          const hit = faceHit(point.x, point.y);
          if (hit) {
            point.z = hit.point.z + (mesh === noseMesh ? Math.max(0, localZ) + 0.001 : 0.006);
            point.applyMatrix4(inverse);
            p.setXYZ(i, point.x, point.y, point.z);
          }
        }
        mesh.geometry.computeVertexNormals();
        if (mesh !== noseMesh) mesh.name = '';
      }
    for (const stroke of this.head.children.slice(smileStart))
      if (stroke instanceof THREE.Mesh) {
        const positions = stroke.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          const hit = faceHit(positions.getX(i), positions.getY(i));
          if (hit) positions.setZ(i, hit.point.z + 0.004);
        }
        stroke.geometry.computeVertexNormals();
      }
    this.scarf.position.set(0, 1.25, -0.18);
    this.scarf.name = 'hood-follow-through';
    this.rig.add(this.scarf);
    this.tail.position.set(0, 0.665, -0.235);
    this.tail.name = 'short-rabbit-tail';
    k.loft(
      colors.cream,
      [
        [-0.105, 0, 0],
        [-0.075, 0.09, 0.09],
        [0, 0.12, 0.12],
        [0.09, 0.08, 0.085],
        [0.12, 0, 0],
      ],
      [0, 0, -0.075],
      this.tail,
      'cloth',
      14,
      16,
    );
    this.rig.add(this.tail);
    this.cape.position.set(0, 1.3, -0.24);
    this.cape.name = 'cape-socket';
    for (const model of Object.values(this.rewards.capes)) {
      model.group.visible = false;
      this.cape.add(model.group);
    }
    this.rig.add(this.cape);
    this.hat.position.set(0, 0.34, 0);
    this.hat.name = 'hat-socket';
    for (const model of Object.values(this.rewards.hats)) {
      model.group.visible = false;
      this.hat.add(model.group);
    }
    this.head.add(this.hat);
    this.cape.visible = false;
    this.hat.visible = false;
    // Batch trim/details within each moving part without merging separate rig parts.
    for (const part of [this.head, ...this.eyes, ...this.arms, ...this.feet]) {
      const details = new THREE.Group();
      for (const child of [...part.children]) if (child instanceof THREE.Mesh && !child.name) details.add(child);
      part.add(bakeStaticModel(details));
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) normalizeFinalNormals(o.geometry);
      if (o instanceof THREE.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m instanceof THREE.MeshStandardMaterial && !Array.from(this.materials.values()).includes(m))
            this.materials.set(this.materials.size, m);
    });
    this.reset();
  }

  equipCape(color: number, style: CapeStyle = 'ghost'): void {
    for (const [key, model] of Object.entries(this.rewards.capes)) model.group.visible = key === style;
    this.rewards.capes[style].tint.color.setHex(color);
    this.cape.visible = true;
  }
  unequipCape(): void {
    this.cape.visible = false;
  }
  equipHat(color: number, style: HatStyle = 'patchwork'): void {
    for (const [key, model] of Object.entries(this.rewards.hats)) model.group.visible = key === style;
    this.rewards.hats[style].tint.color.setHex(color);
    this.hat.visible = true;
  }
  unequipHat(): void {
    this.hat.visible = false;
  }
  get hasCape(): boolean {
    return this.cape.visible;
  }
  get hasHat(): boolean {
    return this.hat.visible;
  }

  /** Allocation-free grounded support using cached actual boot vertices, not loose AABBs. */
  private groundSoles(onlyPreventPenetration = false): void {
    this.rig.updateMatrix();
    let minimum = Infinity;
    for (const { leg, mesh, vertices } of this.soleSamples) {
      leg.updateMatrix();
      mesh.updateMatrix();
      this.soleMatrix.multiplyMatrices(this.rig.matrix, leg.matrix).multiply(mesh.matrix);
      for (let i = 0; i < vertices.length; i += 3) {
        this.solePoint.set(vertices[i], vertices[i + 1], vertices[i + 2]).applyMatrix4(this.soleMatrix);
        minimum = Math.min(minimum, this.solePoint.y);
      }
    }
    const correction = HUNTER_ROAD_CONTACT_Y - minimum;
    this.rig.position.y += onlyPreventPenetration ? Math.max(0, correction) : correction;
    this.rig.updateMatrix();
  }

  reset(): void {
    this.time = 0;
    this.landing = 0;
    this.wasAirborne = false;
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.rig.scale.setScalar(0.68);
    this.head.rotation.set(0, -0.05, -0.055);
    for (const limb of [...this.arms, ...this.feet, ...this.ears]) limb.rotation.set(0, 0, 0);
    this.arms.forEach((arm, i) => arm.rotation.set(i === 0 ? -0.15 : 0.03, 0, (i === 0 ? -1 : 1) * 0.22));
    this.feet.forEach((leg, i) => leg.rotation.set(i === 0 ? 0.13 : -0.03, (i === 0 ? -1 : 1) * 0.14, 0));
    this.feet.forEach((leg, i) => leg.position.copy(this.footRestPositions[i]));
    this.cape.scale.setScalar(1);
    this.cape.rotation.set(0, 0, 0);
    this.groundSoles();
    for (const material of this.materials.values()) material.emissive.setHex(0);
  }

  update(dt: number, pose: PlayerPose): void {
    this.time += dt;
    if (this.wasAirborne && !pose.airborne) this.landing = 1;
    this.wasAirborne = pose.airborne;
    this.landing = Math.max(0, this.landing - dt * 6);
    const blend = 1 - Math.exp(-22 * dt);
    const stride = Math.sin(this.time * (pose.dash ? 23 : 16));
    const gait = pose.running && !pose.airborne && !pose.sliding && pose.alive;
    const squash = this.landing * 0.12;
    const sx = pose.sliding ? 0.57 : 0.68 + squash;
    const sy = pose.sliding ? 0.57 : 0.68 - squash + (pose.airborne ? 0.035 : 0);
    this.rig.scale.x += (sx - this.rig.scale.x) * blend;
    // Clearance is immediate: the visual must agree with the slide hitbox.
    this.rig.scale.y = pose.sliding ? sy : this.rig.scale.y + (sy - this.rig.scale.y) * blend;
    this.rig.scale.z += ((pose.sliding ? 0.57 : 0.68 + squash) - this.rig.scale.z) * blend;
    this.rig.position.y = pose.sliding ? 0.28 : gait ? Math.abs(stride) * 0.045 : Math.sin(this.time * 3) * 0.012;
    const lean = THREE.MathUtils.clamp(-pose.lateralVelocity * 0.018, -0.24, 0.24);
    this.rig.rotation.z += (lean - this.rig.rotation.z) * blend;
    this.rig.rotation.x = pose.sliding
      ? -Math.PI * 0.42
      : this.rig.rotation.x + ((pose.airborne ? -pose.verticalVelocity * 0.014 : 0.04) - this.rig.rotation.x) * blend;
    this.head.rotation.y = Math.sin(this.time * (gait ? 2 : 1.4)) * (gait ? 0.06 : 0.25);
    this.head.rotation.z = -0.055 + Math.sin(this.time * 2.4) * 0.025;
    const blinkPhase = this.time % 4.6;
    const blink = blinkPhase > 4.4 ? Math.max(0.08, Math.abs(blinkPhase - 4.5) * 10) : 1;
    for (const eye of this.eyes) eye.scale.y = blink;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.feet[i].rotation.x = pose.sliding
        ? Math.PI * 0.42 - 0.2
        : gait
          ? stride * side * 0.5
          : pose.airborne
            ? -0.35
            : 0;
      this.feet[i].position.copy(this.footRestPositions[i]);
      if (pose.sliding) {
        this.slidePivotOffset.copy(this.slideHipPivot).applyQuaternion(this.feet[i].quaternion);
        this.feet[i].position.add(this.slideHipPivot).sub(this.slidePivotOffset);
      }
      this.arms[i].rotation.x = gait ? -stride * side * 0.65 : pose.airborne ? -0.6 : -0.1;
      this.arms[i].rotation.z = side * (pose.airborne ? -0.18 : 0.18);
      this.ears[i].rotation.x = -0.08 + Math.sin(this.time * 8 + i) * 0.07 - (pose.dash ? 0.3 : 0);
      this.ears[i].rotation.z = -side * 0.14 + Math.sin(this.time * 5 + i) * 0.025;
    }
    if (!pose.airborne) this.groundSoles(pose.running && !pose.sliding);
    this.scarf.rotation.x = Math.sin(this.time * 10) * 0.14 + (pose.dash ? 0.6 : 0.1);
    // Cloth unfolds with the torso, not abruptly when the gameplay slide flag ends.
    const foldedCape = THREE.MathUtils.smoothstep(-this.rig.rotation.x, 0.35, 0.9);
    this.cape.scale.set(1, 1 - 0.1 * foldedCape, 1 - 0.1 * foldedCape);
    this.cape.rotation.x = THREE.MathUtils.lerp(Math.sin(this.time * 8) * 0.12 + 0.15, -0.12, foldedCape);
    this.tail.rotation.y = Math.sin(this.time * 7) * 0.2;
    const pulse = pose.invulnerable ? 0.2 + Math.sin(this.time * 30) * 0.1 : 0;
    for (const material of this.materials.values()) {
      material.emissive.setRGB(pulse, pose.dash ? 0.16 : pulse * 0.35, pose.dash ? 0.12 : pulse * 0.15);
    }
  }
}
