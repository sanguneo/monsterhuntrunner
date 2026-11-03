import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SculptKit, loftGeometry } from './SculptKit';
import { bakeStaticModel, type Vec3, type Surface } from './ModelKit';

// Twelve authored silhouettes. Feet pivot at Y=0, faces towards -Z.
// Fresh material/geometry ownership on every call preserves encounter fading/disposal.
const ink = 0x30283f,
  cream = 0xf8e9cf,
  bone = 0xe1d3b5,
  gold = 0xd5ac68,
  silver = 0xa3bcc7;
function dot(k: SculptKit, c: number, p: Vec3, s: Vec3, surface: Surface = 'cloth'): THREE.Mesh {
  return k.sphere(c, p, s, k.group, 16, surface);
}
function curve(k: SculptKit, c: number, p: readonly Vec3[], r = 0.018, surface: Surface = 'cloth'): void {
  k.sweep(c, p, [r, r, r], undefined, undefined, surface, 16);
}
function panel(
  k: SculptKit,
  c: number,
  points: readonly (readonly [number, number])[],
  p: Vec3,
  depth = 0.035,
  surface: Surface = 'cloth',
): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  for (const v of points.slice(1)) s.lineTo(...v);
  s.closePath();
  return k.shape(c, s, depth, p, undefined, surface);
}
function head(k: SculptKit, c: number, y = 2.5, w = 0.51, h = 0.52, depth = 0.4): void {
  const mesh = k.loft(
    c,
    [
      [-1, 0, 0],
      [-0.88, 0.48, 0.53],
      [-0.55, 0.91, 0.87],
      [0, 1, 1],
      [0.6, 0.88, 0.86],
      [0.93, 0.5, 0.47],
      [1, 0, 0],
    ],
    [0, y, 0],
    undefined,
    'cloth',
    28,
    28,
  );
  mesh.scale.set(w, h, depth);
}
function face(k: SculptKit, y = 2.54, depth = 0.4, spacing = 0.2, scale = 1, angry = false): void {
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * spacing, y, -depth * 0.94);
    eye.rotation.y = -side * 0.22;
    k.group.add(eye);
    k.sphere(0xf4eee1, [0, 0, 0], [0.113 * scale, 0.15 * scale, 0.027], eye, 16, 'eye');
    k.sphere(0x79604c, [0.008 * side, 0, -0.023], [0.081 * scale, 0.113 * scale, 0.018], eye, 16, 'eye');
    k.sphere(ink, [0.01 * side, 0, -0.039], [0.049 * scale, 0.078 * scale, 0.012], eye, 16, 'eye');
    k.sphere(cream, [-0.025 * scale, 0.045 * scale, -0.05], [0.025 * scale, 0.032 * scale, 0.008], eye, 10, 'eye');
    dot(
      k,
      0xe3a4a4,
      [side * (spacing + 0.15 * scale), y - 0.14 * scale, -depth * 0.83],
      [0.073 * scale, 0.025 * scale, 0.013],
    );
    curve(
      k,
      ink,
      [
        [side * (spacing - 0.075), y + 0.2, -depth * 0.8],
        [side * spacing, y + (angry ? 0.18 : 0.22), -depth * 0.84],
        [side * (spacing + 0.075), y + 0.22, -depth * 0.77],
      ],
      0.014,
    );
  }
  curve(
    k,
    ink,
    [
      [-0.07, y - 0.2, -depth * 0.96],
      [0, y - 0.225, -depth * 0.98],
      [0.07, y - 0.2, -depth * 0.96],
    ],
    0.012,
  );
}
function hand(k: SculptKit, c: number, x: number, y: number, z: number): void {
  k.loft(
    c,
    [
      [-0.18, 0, 0],
      [-0.15, 0.09, 0.07],
      [-0.05, 0.13, 0.09],
      [0.09, 0.105, 0.085],
      [0.14, 0, 0],
    ],
    [x, y, z],
    undefined,
    'cloth',
    16,
    16,
  );
  for (const dx of [-0.035, 0.035])
    curve(
      k,
      new THREE.Color(c).multiplyScalar(0.73).getHex(),
      [
        [x + dx, y - 0.12, z - 0.076],
        [x + dx, y - 0.055, z - 0.088],
      ],
      0.005,
    );
}
/** Extrude arm rings directly from shoulder openings in the torso grid.
 * Shared boundary vertices produce a genuinely continuous shoulder surface. */
function connectedSleeves(k: SculptKit, cloth: number, y: number, width: number, thickness: number): [Vec3, Vec3] {
  const torso = [...k.group.children]
    .reverse()
    .find(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial &&
        o.material.color.getHex() === cloth &&
        o.geometry.getAttribute('position').count % 29 === 0 &&
        o.geometry.getAttribute('position').count > 800,
    );
  if (!torso) throw new Error(`Missing authored torso grid for ${k.group.name}`);
  const geometry = torso.geometry,
    sides = 28,
    rowSize = sides + 1;
  const source = geometry.getAttribute('position'),
    sourceUV = geometry.getAttribute('uv');
  const positions = Array.from(source.array),
    uv = Array.from(sourceUV.array),
    indices: number[] = [];
  const rows = source.count / rowSize - 1;
  const rowAt = (height: number) => {
    let best = 1;
    for (let r = 1; r < rows; r++)
      if (Math.abs(source.getY(r * rowSize) - height) < Math.abs(source.getY(best * rowSize) - height)) best = r;
    return best;
  };
  const low = rowAt(y - 0.12),
    high = Math.max(low + 2, Math.min(rows - 1, rowAt(y + 0.14)));
  const openings = [
    { side: 1, from: 5, to: 9 },
    { side: -1, from: 19, to: 23 },
  ];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < sides; col++) {
      if (row >= low && row < high && openings.some((o) => col >= o.from && col < o.to)) continue;
      const a = row * rowSize + col,
        b = a + rowSize;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const wrists: Vec3[] = [];
  for (const opening of openings) {
    const { side, from, to } = opening,
      boundary: number[] = [];
    for (let i = from; i <= to; i++) boundary.push(low * rowSize + i);
    for (let j = low + 1; j <= high; j++) boundary.push(j * rowSize + to);
    for (let i = to - 1; i >= from; i--) boundary.push(high * rowSize + i);
    for (let j = high - 1; j > low; j--) boundary.push(j * rowSize + from);
    const center = new THREE.Vector3();
    for (const index of boundary) center.add(new THREE.Vector3().fromBufferAttribute(source, index));
    center.divideScalar(boundary.length);
    const id = k.group.name;
    const expressive = (id === 'dracula' || id === 'seaWitch' || id === 'skullKing') && side === 1;
    const wrist: Vec3 = [
      side * (width + (expressive ? 0.18 : 0.22)),
      y - (expressive ? 0.38 : 0.52) + (side === 1 ? 0.025 : -0.025),
      expressive ? -0.24 : -0.12,
    ];
    const path = new THREE.CatmullRomCurve3(
      [
        center,
        new THREE.Vector3(side * (width + 0.08), y - 0.04, 0.005),
        new THREE.Vector3(side * (width + 0.24), y - 0.29, -0.075),
        new THREE.Vector3(...wrist),
      ],
      false,
      'centripetal',
    );
    const steps = 14,
      frames = path.computeFrenetFrames(steps, false),
      angles = boundary.map((index) => {
        const d = new THREE.Vector3().fromBufferAttribute(source, index).sub(center);
        return Math.atan2(d.dot(frames.binormals[0]), d.dot(frames.normals[0]));
      });
    let previous = boundary;
    for (let ring = 1; ring <= steps; ring++) {
      const t = ring / steps,
        c = path.getPointAt(t),
        radius = thickness * (1 - 0.3 * t),
        current: number[] = [];
      for (let i = 0; i < boundary.length; i++) {
        const angle = angles[i];
        const p = c
          .clone()
          .addScaledVector(frames.normals[ring], Math.cos(angle) * radius)
          .addScaledVector(frames.binormals[ring], Math.sin(angle) * radius * 0.9);
        if (ring === 1) {
          const start = new THREE.Vector3().fromBufferAttribute(source, boundary[i]);
          const shift = c.clone().sub(center);
          p.lerp(start.add(shift), 0.35);
        }
        current.push(positions.length / 3);
        positions.push(p.x, p.y, p.z);
        uv.push(i / boundary.length, t);
      }
      for (let i = 0; i < boundary.length; i++) {
        const next = (i + 1) % boundary.length;
        indices.push(previous[i], previous[next], current[i], previous[next], current[next], current[i]);
      }
      previous = current;
    }
    // Close sleeve cuffs: the skin wrist overlaps this cap, never an exposed tube.
    const cap = positions.length / 3;
    positions.push(...wrist);
    uv.push(0.5, 1);
    for (let i = 0; i < previous.length; i++) indices.push(previous[i], previous[(i + 1) % previous.length], cap);
    wrists.push(wrist);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  torso.geometry = merged;
  geometry.dispose();
  return wrists as [Vec3, Vec3];
}
function arms(k: SculptKit, cloth: number, skin: number, y = 1.75, width = 0.51, thickness = 0.16): void {
  const wrists = connectedSleeves(k, cloth, y, width, thickness);
  k.group.userData.grips = {};
  for (const wrist of wrists) {
    const side = Math.sign(wrist[0]);
    const direction = new THREE.Vector3(...wrist)
      .sub(new THREE.Vector3(side * (width + 0.24), y - 0.29, -0.075))
      .normalize();
    k.group.userData.grips[side] = new THREE.Vector3(...wrist).addScaledVector(direction, 0.09).toArray();
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
    const firstHandPart = k.group.children.length;
    hand(k, skin, wrist[0], wrist[1] - 0.09, wrist[2]);
    for (const part of k.group.children.slice(firstHandPart)) {
      part.position
        .sub(new THREE.Vector3(...wrist))
        .applyQuaternion(rotation)
        .add(new THREE.Vector3(...wrist));
      part.quaternion.premultiply(rotation);
    }
    if (k.group.name !== 'werewolfChief') {
      const cuff = k.torus(cream, wrist, thickness * 0.72, 0.013);
      cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    }
  }
}
function boots(k: SculptKit, c: number, spread = 0.29): void {
  for (const side of [-1, 1]) {
    k.loft(
      c,
      [
        [0.04, 0, 0, 0, -0.08],
        [0.07, 0.16, 0.24, 0, -0.08],
        [0.18, 0.17, 0.25, 0, -0.08],
        [0.35, 0.13, 0.14],
        [0.62, 0.12, 0.12],
        [0.67, 0, 0],
      ],
      [side * spread, 0, 0],
      undefined,
      'leather',
      22,
      20,
    );
    curve(
      k,
      cream,
      [
        [side * spread - 0.09, 0.22, -0.25],
        [side * spread, 0.24, -0.28],
        [side * spread + 0.09, 0.22, -0.25],
      ],
      0.012,
    );
  }
}
function tunic(k: SculptKit, c: number, wide = 0.5, top = 1.99): void {
  k.loft(
    c,
    [
      [0.45, 0, 0],
      [0.48, wide * 0.81, 0.29],
      [0.7, wide, 0.35],
      [1.18, wide * 0.82, 0.31],
      [1.7, wide * 0.97, 0.31],
      [top, wide * 0.57, 0.22],
      [top + 0.06, 0, 0],
    ],
    undefined,
    undefined,
    'cloth',
    30,
    28,
  );
}
function robe(k: SculptKit, c: number, top = 2.04, bottom = 0.12, wide = 0.65): void {
  const g = loftGeometry(
    [
      [bottom, 0, 0],
      [bottom + 0.025, wide * 0.9, wide * 0.74],
      [bottom + 0.15, wide, wide * 0.79],
      [0.75, wide * 0.9, 0.43],
      [1.3, 0.43, 0.34],
      [1.75, 0.47, 0.31],
      [top, 0.31, 0.23],
      [top + 0.05, 0, 0],
    ],
    32,
    28,
  );
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i),
      a = Math.atan2(p.getX(i), p.getZ(i));
    const f = 1 + Math.cos(a * 8) * 0.018 * Math.max(0, 1 - y / top);
    p.setX(i, p.getX(i) * f);
    p.setZ(i, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  k.mesh(g, c);
}
function cape(k: SculptKit, c: number, top = 2.07, width = 0.78, bat = false): void {
  const points: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const nx = 24,
    ny = 20;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const v = j / ny,
        u = i / nx,
        hem = bat ? 0.12 * Math.abs(Math.sin(u * Math.PI * 5)) : 0.035 * Math.cos(u * Math.PI * 6);
      points.push(
        (u - 0.5) * 2 * (0.32 + (width - 0.32) * Math.sin((v * Math.PI) / 2)),
        top - v * (top - 0.18) - hem * v ** 8,
        0.27 + 0.25 * Math.sin(v * Math.PI * 0.85) + 0.06 * Math.cos(u * Math.PI * 6) * v,
      );
      uv.push(u, v);
      if (i < nx && j < ny) {
        const a = j * (nx + 1) + i,
          b = a + nx + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.mesh(g, c);
  k.material(c).side = THREE.DoubleSide;
}
function crown(k: SculptKit, y: number, r = 0.4, c = gold): void {
  const n = 56,
    verts: number[] = [],
    indices: number[] = [];
  for (let ring = 0; ring < 4; ring++)
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        outer = ring % 2 === 0,
        high = ring >= 2;
      const rad = r + (outer ? 0.025 : -0.025);
      const h = high ? 0.12 + 0.16 * Math.pow((Math.cos(a * 7) + 1) / 2, 3) : 0;
      verts.push(Math.sin(a) * rad, y + h, Math.cos(a) * rad);
    }
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i,
        b = a + n + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.mesh(g, c, undefined, undefined, undefined, 'metal');
  k.material(c, 'metal').side = THREE.DoubleSide;
  for (const a of [-0.7, 0, 0.7])
    dot(k, 0xaa8bc9, [Math.sin(a) * r, y + 0.075, -Math.cos(a) * (r + 0.025)], [0.035, 0.045, 0.015], 'eye');
}
function staff(k: SculptKit, x: number, c: number, skull = false): void {
  const firstPart = k.group.children.length;
  curve(
    k,
    gold,
    [
      [x, 0.16, -0.12],
      [x, 1.3, -0.12],
      [x, 2.55, -0.12],
    ],
    0.035,
    'metal',
  );
  if (skull) skullHead(k, 2.68, 0.42, x);
  else {
    const ring = k.torus(gold, [x, 2.68, -0.12], 0.18, 0.025, undefined, 'metal');
    ring.rotation.z = 0.2;
    dot(k, c, [x, 2.68, -0.12], [0.1, 0.15, 0.08], 'eye');
  }
  const grip = k.group.userData.grips[1] as Vec3;
  for (const part of k.group.children.slice(firstPart))
    part.position.add(new THREE.Vector3(grip[0] - x, 0, grip[2] + 0.12));
}
function seam(k: SculptKit, x: number, y: number, z: number, w = 0.22): void {
  curve(
    k,
    0x596251,
    [
      [x - w / 2, y, z],
      [x + w / 2, y + 0.025, z],
    ],
    0.008,
  );
  for (let i = 0; i < 4; i++)
    curve(
      k,
      cream,
      [
        [x - w * 0.35 + i * w * 0.23, y - 0.025, z - 0.006],
        [x - w * 0.35 + i * w * 0.23 + 0.015, y + 0.04, z - 0.006],
      ],
      0.006,
    );
}
function skullHead(k: SculptKit, y = 2.52, s = 1, x = 0): void {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.scale.setScalar(s);
  k.group.add(g);
  k.loft(
    bone,
    [
      [-0.44, 0, 0],
      [-0.4, 0.22, 0.2],
      [-0.22, 0.35, 0.27],
      [0.08, 0.5, 0.35],
      [0.33, 0.43, 0.31],
      [0.46, 0.25, 0.2],
      [0.5, 0, 0],
    ],
    [0, 0, 0],
    g,
    'cloth',
    26,
    28,
  );
  for (const side of [-1, 1]) {
    k.sphere(ink, [side * 0.18, 0.035, -0.326], [0.13, 0.15, 0.02], g, 20);
    k.sphere(0xbcb1d7, [side * 0.18, 0.025, -0.349], [0.038, 0.06, 0.012], g, 12, 'eye');
  }
  k.sphere(ink, [0, -0.16, -0.285], [0.04, 0.035, 0.013], g, 12);
  for (const dx of [-0.1, 0, 0.1]) k.box(ink, [dx, -0.335, -0.224], [0.014, 0.09, 0.012], g, 0.004);
}
function collar(k: SculptKit, c: number, y = 1.98): void {
  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(side * 0.06, 0);
    s.bezierCurveTo(side * 0.25, 0.04, side * 0.5, 0.35, side * 0.64, 0.58);
    s.quadraticCurveTo(side * 0.77, 0.12, side * 0.39, -0.12);
    s.closePath();
    k.shape(c, s, 0.045, [0, y, 0.03]);
  }
}
const builders: Record<string, (k: SculptKit) => void> = {
  ghostTeacher(k) {
    robe(k, 0x7f91b6, 2, 0.15, 0.57);
    arms(k, 0x7f91b6, 0xd9e6df, 1.75, 0.45);
    head(k, 0xd9e6df, 2.5, 0.5, 0.51, 0.37);
    face(k, 2.54, 0.37);
    // One sculpted swept forelock instead of a row of white balls.
    k.sweep(
      0xecf0dd,
      [
        [-0.44, 2.82, 0.02],
        [-0.25, 3.02, -0.02],
        [0.13, 3.02, -0.03],
        [0.4, 2.88, 0],
      ],
      [0, 0.12, 0.11, 0],
      [0, 0.085, 0.09, 0],
    );
    for (const side of [-1, 1]) {
      k.torus(gold, [side * 0.2, 2.53, -0.385], 0.16, 0.015, undefined, 'metal');
      panel(
        k,
        cream,
        [
          [0, 0],
          [side * 0.23, -0.06],
          [side * 0.13, -0.23],
        ],
        [side * 0.04, 2.02, -0.26],
      );
    }
    curve(
      k,
      gold,
      [
        [-0.04, 2.54, -0.406],
        [0, 2.56, -0.414],
        [0.04, 2.54, -0.406],
      ],
      0.012,
      'metal',
    );
    panel(
      k,
      0xbc86a0,
      [
        [-0.06, 0],
        [0.06, 0],
        [0.045, -0.34],
        [0, -0.39],
        [-0.045, -0.34],
      ],
      [0, 1.94, -0.336],
    );
    for (const y of [1.33, 1.07, 0.81]) dot(k, gold, [0.04, y, -0.37], [0.025, 0.025, 0.013], 'metal');
    k.box(0xad8157, [0.83, 1.68, 0.24], [0.77, 1.02, 0.08], undefined, 0.05, 'leather');
    k.box(0x315954, [0.83, 1.68, 0.185], [0.66, 0.9, 0.025], undefined, 0.025);
    curve(
      k,
      cream,
      [
        [0.59, 1.81, 0.158],
        [0.71, 1.92, 0.158],
        [0.85, 1.8, 0.158],
      ],
      0.012,
    );
    k.torus(cream, [1, 1.87, 0.158], 0.075, 0.01);
    for (const y of [1.62, 1.48])
      curve(
        k,
        cream,
        [
          [0.58, y, 0.158],
          [1.07, y, 0.158],
        ],
        0.009,
      );
    // Short classroom chalk threaded through the actual posed hand.
    const grip = k.group.userData.grips[-1] as Vec3;
    curve(
      k,
      cream,
      [
        [grip[0] + 0.04, grip[1] - 0.03, grip[2] + 0.04],
        [grip[0] - 0.08, grip[1] + 0.035, grip[2] - 0.09],
        [grip[0] - 0.22, grip[1] + 0.1, grip[2] - 0.23],
      ],
      0.03,
    );
  },
  ghostGirl(k) {
    // Continuous curtain of hair, with the uniform and face inset in front.
    k.loft(
      0x493c5b,
      [
        [0.32, 0, 0],
        [0.4, 0.62, 0.35],
        [1, 0.58, 0.4],
        [2, 0.54, 0.4],
        [2.7, 0.58, 0.4],
        [3.02, 0.42, 0.32],
        [3.14, 0, 0],
      ],
      [0, 0, 0.27],
      undefined,
      'cloth',
      36,
      28,
    );
    robe(k, 0x526583, 1.99, 0.31, 0.49);
    arms(k, 0x526583, 0xe0d8d7, 1.76, 0.4);
    head(k, 0xe0d8d7, 2.53, 0.43, 0.45, 0.36);
    face(k, 2.54, 0.36, 0.17, 0.9);
    for (const side of [-1, 1]) {
      k.sweep(
        0x493c5b,
        [
          [side * 0.17, 3.02, 0.14],
          [side * 0.36, 2.98, -0.18],
          [side * 0.44, 2.55, -0.17],
          [side * 0.42, 1.95, -0.13],
          [side * 0.6, 0.6, 0.03],
        ],
        [0.11, 0.105, 0.085, 0.02],
        [0.12, 0.095, 0.08, 0.015],
      );
      panel(
        k,
        cream,
        [
          [0, 0],
          [side * 0.28, -0.035],
          [side * 0.16, -0.18],
        ],
        [side * 0.02, 2.02, -0.28],
      );
    }
    k.sweep(
      0x493c5b,
      [
        [-0.4, 2.87, -0.25],
        [-0.12, 2.97, -0.34],
        [0.23, 2.9, -0.31],
        [0.42, 2.75, -0.23],
      ],
      [0, 0.13, 0.12, 0],
      [0, 0.06, 0.07, 0],
    );
    panel(
      k,
      0xba7b93,
      [
        [-0.14, 0.06],
        [0, 0],
        [0.14, 0.06],
        [0.1, -0.1],
        [0, -0.04],
        [-0.1, -0.1],
      ],
      [0, 1.9, -0.35],
    );
  },
  giantZombie(k) {
    boots(k, 0x5f4b59, 0.45);
    // The slow tank has a low, broad weight-bearing silhouette, not Frankenstein's coat.
    k.loft(
      0x7c6b89,
      [
        [0.4, 0, 0],
        [0.45, 0.5, 0.35],
        [0.7, 0.72, 0.45],
        [1.15, 0.8, 0.49],
        [1.65, 0.72, 0.42],
        [1.97, 0.4, 0.29],
        [2.04, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      30,
      28,
    );
    arms(k, 0x7c6b89, 0xa6ba87, 1.76, 0.69, 0.2);
    head(k, 0xa6ba87, 2.56, 0.62, 0.5, 0.43);
    face(k, 2.62, 0.43, 0.24, 1.05);
    k.sweep(
      0x65735e,
      [
        [-0.42, 2.94, 0.05],
        [-0.15, 3.09, 0],
        [0.2, 3.03, -0.02],
        [0.43, 2.99, 0.03],
      ],
      [0, 0.085, 0.075, 0],
      [0, 0.05, 0.055, 0],
    );
    seam(k, -0.24, 2.83, -0.347, 0.25);
    seam(k, 0.26, 2.31, -0.36, 0.22);
    for (const side of [-1, 1])
      panel(
        k,
        0x9c8b9e,
        [
          [0, 0.1],
          [side * 0.25, 0],
          [side * 0.13, -0.35],
        ],
        [side * 0.04, 1.99, -0.34],
      );
    k.box(0x526a5a, [0.2, 1.05, -0.49], [0.27, 0.33, 0.035], undefined, 0.025);
    seam(k, 0.2, 1.07, -0.515, 0.2);
  },
  zombieKing(k) {
    boots(k, 0x635267, 0.32);
    tunic(k, 0x746382, 0.56, 2.02);
    cape(k, 0x885c75, 2.02, 0.78);
    arms(k, 0x746382, 0xa7bb88, 1.8, 0.53);
    head(k, 0xa7bb88, 2.53, 0.54, 0.49, 0.4);
    face(k, 2.56, 0.4, 0.21, 1, true);
    crown(k, 2.93, 0.37);
    collar(k, 0xc2ad91, 1.95);
    seam(k, -0.25, 2.75, -0.34);
    curve(
      k,
      gold,
      [
        [-0.35, 1.88, -0.29],
        [0, 1.59, -0.4],
        [0.35, 1.88, -0.29],
      ],
      0.022,
      'metal',
    );
    dot(k, 0xa088c7, [0, 1.59, -0.42], [0.08, 0.1, 0.03], 'eye');
    for (const y of [0.85, 1.1, 1.35]) dot(k, gold, [0, y, -0.35], [0.03, 0.03, 0.015], 'metal');
  },
  lightningGolem(k) {
    boots(k, 0x587b8f, 0.33);
    k.loft(
      0x5c879c,
      [
        [0.45, 0, 0],
        [0.51, 0.4, 0.31],
        [1, 0.54, 0.38],
        [1.62, 0.58, 0.37],
        [1.95, 0.4, 0.29],
        [2.02, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
      30,
      28,
    );
    arms(k, 0x5c879c, 0xa8c8cc, 1.8, 0.55);
    k.loft(
      0x88b8c2,
      [
        [2.01, 0, 0],
        [2.08, 0.35, 0.29],
        [2.37, 0.46, 0.36],
        [2.71, 0.42, 0.33],
        [2.85, 0.27, 0.25],
        [2.89, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
    );
    k.box(ink, [0, 2.45, -0.348], [0.67, 0.25, 0.045], undefined, 0.06);
    for (const side of [-1, 1]) dot(k, 0xa9f1df, [side * 0.16, 2.46, -0.38], [0.065, 0.08, 0.013], 'glow');
    for (const side of [-1, 1]) {
      curve(
        k,
        gold,
        [
          [side * 0.3, 2.73, 0],
          [side * 0.38, 3.04, 0],
          [side * 0.26, 3.15, 0],
        ],
        0.034,
        'metal',
      );
      for (let i = 0; i < 4; i++) {
        const t = k.torus(silver, [side * 0.35, 2.9 + i * 0.045, 0], 0.075, 0.012, undefined, 'metal');
        t.rotation.x = Math.PI / 2;
      }
    }
    k.torus(gold, [0, 1.43, -0.386], 0.21, 0.028, undefined, 'metal');
    panel(
      k,
      0x9ce6dc,
      [
        [-0.04, 0.18],
        [0.09, 0.18],
        [0.01, 0.02],
        [0.1, 0.02],
        [-0.08, -0.18],
        [-0.02, -0.02],
        [-0.1, -0.02],
      ],
      [0, 1.43, -0.425],
      0.025,
      'glow',
    );
  },
  frankenstein(k) {
    boots(k, 0x4e4a60, 0.31);
    tunic(k, 0x655d79, 0.54, 1.97);
    arms(k, 0x655d79, 0xabc39a, 1.78, 0.52);
    k.loft(
      0xabc39a,
      [
        [2.02, 0, 0],
        [2.09, 0.3, 0.25],
        [2.3, 0.47, 0.35],
        [2.73, 0.48, 0.35],
        [2.94, 0.4, 0.3],
        [2.97, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      30,
      28,
    );
    face(k, 2.53, 0.35, 0.2, 0.95);
    k.loft(
      0x3f3d53,
      [
        [2.84, 0.43, 0.32],
        [2.96, 0.43, 0.32],
        [3.01, 0.34, 0.25],
        [3.02, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      12,
      28,
    );
    for (const side of [-1, 1]) {
      k.cylinder(silver, [side * 0.45, 2.15, 0], 0.095, 0.095, 0.19, undefined, 16, 'metal').rotation.z = Math.PI / 2;
      panel(
        k,
        0x918292,
        [
          [0, 0.08],
          [side * 0.24, 0],
          [side * 0.12, -0.3],
        ],
        [side * 0.035, 1.96, -0.31],
      );
    }
    seam(k, 0.12, 2.77, -0.339, 0.4);
    seam(k, -0.2, 2.27, -0.304, 0.2);
    for (const y of [1.6, 1.32, 1.04]) dot(k, gold, [0.02, y, -0.35], [0.026, 0.026, 0.014], 'metal');
    curve(
      k,
      0xb6d8a8,
      [
        [-0.31, 1.67, -0.3],
        [-0.25, 1.28, -0.37],
        [0.22, 1.06, -0.36],
      ],
      0.022,
    );
  },
  kraken(k) {
    // One smooth mantle, eight individual continuous tentacles flowing from its base.
    k.loft(
      0x9e79b8,
      [
        [0.57, 0, 0],
        [0.62, 0.52, 0.44],
        [0.78, 0.62, 0.52],
        [1.06, 0.58, 0.48],
        [1.55, 0.68, 0.56],
        [2.2, 0.66, 0.55],
        [2.72, 0.45, 0.38],
        [2.94, 0.15, 0.13],
        [2.97, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      38,
      32,
    );
    face(k, 1.91, 0.55, 0.27, 1.3);
    k.torus(0xd0a0bf, [0, 1.54, -0.548], 0.095, 0.025);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        x = Math.sin(a),
        z = Math.cos(a);
      k.sweep(
        0x9e79b8,
        [
          [x * 0.12, 1.3, z * 0.1],
          [x * 0.44, 0.76, z * 0.37],
          [x * 0.7, 0.43, z * 0.59],
          [x * 1.12, 0.2, z * 0.85],
          [x * 1.31, 0.37, z * 0.88],
          [x * 1.24, 0.57, z * 0.79],
        ],
        [0.22, 0.2, 0.15, 0.08, 0.01],
        undefined,
        undefined,
        'cloth',
        30,
      );
      for (let j = 0; j < 3; j++)
        dot(
          k,
          0xd4b1d5,
          [x * (0.68 + j * 0.16), 0.28 + j * 0.015, z * (0.56 + j * 0.1)],
          [0.075 - j * 0.012, 0.026, 0.07 - j * 0.01],
        );
    }
    for (const side of [-1, 1]) dot(k, 0xc3a2d3, [side * 0.4, 2.51, -0.31], [0.06, 0.04, 0.018]);
  },
  seaWitch(k) {
    robe(k, 0x548c9c, 2.02, 0.12, 0.7);
    arms(k, 0x548c9c, 0xb5d6ce, 1.78, 0.45);
    head(k, 0xb5d6ce, 2.5, 0.47, 0.49, 0.37);
    face(k, 2.54, 0.37, 0.18, 0.95);
    // Swept seaweed hair is one flowing profile on each side, not pearl-sized lumps.
    for (const side of [-1, 1])
      k.sweep(
        0x627ba1,
        [
          [side * 0.17, 2.95, 0.02],
          [side * 0.47, 2.68, 0.06],
          [side * 0.48, 2.2, 0.08],
          [side * 0.62, 1.81, 0.1],
        ],
        [0.16, 0.15, 0.11, 0],
        [0.12, 0.13, 0.09, 0],
      );
    crown(k, 2.91, 0.34, 0xddab94);
    for (const side of [-1, 1]) {
      k.sweep(
        0xddab94,
        [
          [side * 0.2, 2.94, 0],
          [side * 0.28, 3.22, 0],
          [side * 0.24, 3.39, 0],
        ],
        [0.035, 0.028, 0],
        undefined,
        undefined,
        'cloth',
        18,
      );
      k.sweep(
        0xddab94,
        [
          [side * 0.26, 3.11, 0],
          [side * 0.4, 3.22, 0],
          [side * 0.43, 3.29, 0],
        ],
        [0.025, 0.02, 0],
        undefined,
        undefined,
        'cloth',
        12,
      );
      dot(k, cream, [side * 0.28, 3.2, -0.025], [0.055, 0.055, 0.04], 'eye');
    }
    curve(
      k,
      cream,
      [
        [-0.3, 1.98, -0.25],
        [0, 1.78, -0.37],
        [0.3, 1.98, -0.25],
      ],
      0.025,
    );
    dot(k, 0xaaa4d5, [0, 1.78, -0.4], [0.075, 0.1, 0.025], 'eye');
    staff(k, 0.98, 0x8ce4db);
    for (const side of [-1, 1])
      curve(
        k,
        0x98c1c3,
        [
          [side * 0.2, 1.37, -0.32],
          [side * 0.35, 0.8, -0.41],
          [side * 0.5, 0.25, -0.4],
        ],
        0.012,
      );
  },
  werewolfChief(k) {
    for (const side of [-1, 1]) {
      k.loft(
        0x827383,
        [
          [0.04, 0, 0, 0, -0.08],
          [0.08, 0.14, 0.23, 0, -0.08],
          [0.21, 0.14, 0.23, 0, -0.06],
          [0.37, 0.09, 0.1, 0, 0.05],
          [0.61, 0.14, 0.13],
          [0.7, 0, 0],
        ],
        [side * 0.27, 0, 0],
        undefined,
        'cloth',
        22,
        20,
      );
      for (const dx of [-0.06, 0, 0.06])
        k.sweep(
          cream,
          [
            [side * 0.27 + dx, 0.11, -0.23],
            [side * 0.27 + dx, 0.08, -0.3],
          ],
          [0.025, 0],
          undefined,
          undefined,
          'cloth',
          10,
        );
    }
    k.loft(
      0x827383,
      [
        [0.48, 0, 0],
        [0.52, 0.29, 0.25],
        [0.93, 0.36, 0.29],
        [1.4, 0.44, 0.32],
        [1.78, 0.53, 0.32],
        [2.02, 0.29, 0.23],
        [2.08, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      30,
      28,
    );
    const ruff = new THREE.Shape();
    ruff.moveTo(-0.26, 0.28);
    ruff.bezierCurveTo(-0.4, 0.12, -0.29, -0.06, -0.14, -0.15);
    ruff.lineTo(0, -0.34);
    ruff.lineTo(0.14, -0.15);
    ruff.bezierCurveTo(0.29, -0.06, 0.4, 0.12, 0.26, 0.28);
    ruff.quadraticCurveTo(0, 0.12, -0.26, 0.28);
    k.shape(0xcbbab1, ruff, 0.025, [0, 1.55, -0.327]);
    arms(k, 0x827383, 0xa99b9b, 1.8, 0.52);
    // Forehead and muzzle are one stretched/offset ring surface, avoiding a glued-on snout.
    const muzzle = k.loft(
      0x958696,
      [
        [2.02, 0, 0],
        [2.09, 0.25, 0.23, 0, -0.14],
        [2.25, 0.34, 0.31, 0, -0.25],
        [2.43, 0.42, 0.38, 0, -0.15],
        [2.64, 0.48, 0.37, 0, -0.03],
        [2.83, 0.4, 0.3],
        [3, 0.2, 0.16],
        [3.03, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      32,
      28,
    );
    const positions = muzzle.geometry.getAttribute('position');
    const shades: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i),
        y = positions.getY(i);
      const blend = THREE.MathUtils.smoothstep(-z, 0.31, 0.49) * (1 - THREE.MathUtils.smoothstep(y, 2.39, 2.55));
      const color = new THREE.Color(0x958696).lerp(new THREE.Color(0xd7c7b6), blend);
      shades.push(color.r, color.g, color.b);
    }
    muzzle.geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    const furMaterial = k.material(0x958696).clone();
    furMaterial.color.setHex(0xffffff);
    furMaterial.vertexColors = true;
    muzzle.material = furMaterial;
    face(k, 2.62, 0.42, 0.22, 1, true);
    dot(k, ink, [0, 2.33, -0.59], [0.11, 0.075, 0.03], 'eye');
    for (const side of [-1, 1]) {
      k.sweep(
        0x827383,
        [
          [side * 0.27, 2.8, 0.02],
          [side * 0.36, 3.01, 0.025],
          [side * 0.43, 3.17, 0.035],
        ],
        [0.19, 0.13, 0],
        [0.095, 0.06, 0],
      );
      k.sweep(
        0xcfb6b4,
        [
          [side * 0.29, 2.89, -0.066],
          [side * 0.36, 3.02, -0.04],
          [side * 0.42, 3.1, -0.015],
        ],
        [0.065, 0.045, 0],
        [0.015, 0.014, 0],
      );
      for (const dx of [-0.055, 0, 0.055])
        k.sweep(
          cream,
          [
            [side * 0.76 + dx, 1.04, -0.14],
            [side * 0.76 + dx, 0.94, -0.2],
          ],
          [0.022, 0],
          undefined,
          undefined,
          'cloth',
          10,
        );
    }
    k.sweep(
      0x827383,
      [
        [0, 0.69, 0.24],
        [0.24, 0.6, 0.55],
        [0.37, 0.76, 0.73],
        [0.31, 0.97, 0.67],
      ],
      [0.16, 0.13, 0.08, 0],
    );
    curve(
      k,
      cream,
      [
        [-0.08, 2.2, -0.525],
        [0, 2.17, -0.52],
        [0.08, 2.2, -0.525],
      ],
      0.015,
    );
  },
  dracula(k) {
    boots(k, 0x443d54, 0.27);
    tunic(k, 0x514661, 0.43, 2);
    cape(k, 0x8e526d, 2.12, 0.8, true);
    arms(k, 0x514661, 0xe1d7db, 1.76, 0.43);
    head(k, 0xe1d7db, 2.5, 0.47, 0.48, 0.36);
    face(k, 2.5, 0.36, 0.18, 0.94);
    collar(k, 0x9f637e, 1.98);
    k.loft(
      0x40374f,
      [
        [2.78, 0.43, 0.31],
        [2.98, 0.32, 0.24],
        [3.04, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      16,
      28,
    );
    panel(
      k,
      0x40374f,
      [
        [-0.37, 0.12],
        [-0.12, 0.18],
        [0, 0.01],
        [0.12, 0.18],
        [0.37, 0.12],
        [0.26, 0.22],
        [-0.26, 0.22],
      ],
      [0, 2.73, -0.3],
      0.06,
    );
    for (const side of [-1, 1]) {
      panel(
        k,
        cream,
        [
          [0, 0.08],
          [side * 0.22, 0.02],
          [side * 0.1, -0.15],
        ],
        [side * 0.03, 2.01, -0.27],
      );
      k.sweep(
        cream,
        [
          [side * 0.055, 2.31, -0.363],
          [side * 0.055, 2.24, -0.36],
        ],
        [0.022, 0],
        undefined,
        undefined,
        'cloth',
        10,
      );
    }
    panel(
      k,
      0xac6b85,
      [
        [-0.15, 0.08],
        [0, 0],
        [0.15, 0.08],
        [0.11, -0.08],
        [0, -0.03],
        [-0.11, -0.08],
      ],
      [0, 1.87, -0.34],
    );
    dot(k, gold, [0, 1.87, -0.39], [0.03, 0.04, 0.015], 'metal');
    for (const y of [1.55, 1.33, 1.11]) dot(k, gold, [0.025, y, -0.34], [0.023, 0.026, 0.015], 'metal');
  },
  skeletonKnight(k) {
    boots(k, 0x71899d, 0.28);
    tunic(k, 0x71899d, 0.47, 1.99);
    cape(k, 0x67758f, 1.96, 0.67);
    arms(k, 0x71899d, bone, 1.76, 0.46);
    skullHead(k, 2.5, 1.02);
    // Single fitted cuirass: raised ribs are shallow chased metal, not bulbous armor spheres.
    for (const y of [1.65, 1.43, 1.21])
      curve(
        k,
        silver,
        [
          [-0.35, y + 0.04, -0.26],
          [0, y - 0.03, -0.37],
          [0.35, y + 0.04, -0.26],
        ],
        0.023,
        'metal',
      );
    k.loft(
      0x71899d,
      [
        [2.84, 0.43, 0.3],
        [2.94, 0.41, 0.3],
        [3.06, 0.24, 0.2],
        [3.11, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
      16,
      28,
    );
    panel(
      k,
      0xa281a7,
      [
        [-0.06, 0],
        [-0.07, 0.24],
        [0, 0.36],
        [0.07, 0.24],
        [0.06, 0],
      ],
      [0, 3.01, 0],
      0.19,
    );
    const firstShieldPart = k.group.children.length;
    const shield = new THREE.Shape();
    shield.moveTo(-0.29, 0.39);
    shield.quadraticCurveTo(0, 0.54, 0.29, 0.39);
    shield.lineTo(0.25, -0.2);
    shield.quadraticCurveTo(0.16, -0.39, 0, -0.5);
    shield.quadraticCurveTo(-0.16, -0.39, -0.25, -0.2);
    shield.closePath();
    k.shape(gold, shield, 0.07, [-0.81, 1.29, -0.3], undefined, 'metal');
    const inner = k.shape(0x61798f, shield, 0.02, [-0.81, 1.3, -0.33], undefined, 'metal');
    inner.scale.set(0.85, 0.85, 1);
    k.box(silver, [-0.81, 1.3, -0.36], [0.055, 0.63, 0.02], undefined, 0.014, 'metal');
    k.box(silver, [-0.81, 1.39, -0.37], [0.37, 0.055, 0.02], undefined, 0.014, 'metal');
    const shieldGrip = k.group.userData.grips[-1] as Vec3;
    for (const part of k.group.children.slice(firstShieldPart))
      part.position.add(new THREE.Vector3(shieldGrip[0] + 0.81, shieldGrip[1] - 1.2, shieldGrip[2] + 0.2));
    const firstSwordPart = k.group.children.length;
    k.sweep(
      silver,
      [
        [0.83, 0.78, -0.12],
        [0.83, 2.56, -0.12],
        [0.83, 2.92, -0.12],
      ],
      [0.032, 0.04, 0],
      [0.018, 0.022, 0],
      undefined,
      'metal',
      24,
    );
    k.box(gold, [0.83, 1.08, -0.12], [0.27, 0.05, 0.08], undefined, 0.015, 'metal');
    const swordGrip = k.group.userData.grips[1] as Vec3;
    for (const part of k.group.children.slice(firstSwordPart))
      part.position.add(new THREE.Vector3(swordGrip[0] - 0.83, 0, swordGrip[2] + 0.12));
  },
  skullKing(k) {
    robe(k, 0x7b5f92, 2.03, 0.12, 0.65);
    cape(k, 0x665078, 2.09, 0.82);
    arms(k, 0x7b5f92, bone, 1.77, 0.45);
    skullHead(k, 2.51, 1.05);
    crown(k, 2.95, 0.39);
    staff(k, 1.02, 0xab91d1, true);
    collar(k, 0xb8a78c, 1.95);
    for (const side of [-1, 1])
      curve(
        k,
        gold,
        [
          [side * 0.2, 1.94, -0.28],
          [side * 0.25, 1.2, -0.35],
          [side * 0.5, 0.24, -0.38],
        ],
        0.025,
        'metal',
      );
    for (const y of [1.7, 1.53, 1.36])
      curve(
        k,
        bone,
        [
          [-0.23, y + 0.025, -0.29],
          [0, y - 0.04, -0.36],
          [0.23, y + 0.025, -0.29],
        ],
        0.025,
      );
    dot(k, 0xb39acc, [0, 1.94, -0.36], [0.075, 0.1, 0.035], 'eye');
  },
};
export function createBossModel(id: string): THREE.Group {
  const build = builders[id];
  if (!build) throw new Error(`Unknown boss model: ${id}`);
  const kit = new SculptKit();
  kit.group.name = id;
  build(kit);
  const model = bakeStaticModel(kit.group);
  // Relaxed, asymmetric rest poses retain feet/attack pivots, while avoiding a rigid toy stance.
  const tilts: Record<string, number> = {
    ghostTeacher: -0.055,
    ghostGirl: 0.045,
    giantZombie: -0.025,
    zombieKing: 0.04,
    lightningGolem: -0.02,
    frankenstein: 0.03,
    seaWitch: -0.055,
    werewolfChief: 0.04,
    dracula: -0.045,
    skeletonKnight: 0.025,
    skullKing: -0.035,
  };
  const tilt = tilts[id] ?? 0;
  if (tilt)
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const positions = o.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        const upper = THREE.MathUtils.smoothstep(y, 1.8, 2.4),
          angle = tilt * upper;
        const dx = x,
          dy = y - 2.02;
        x = dx * Math.cos(angle) - dy * Math.sin(angle);
        y = 2.02 + dx * Math.sin(angle) + dy * Math.cos(angle);
        x += Math.sin(Math.max(0, Math.min(1, y / 3.2)) * Math.PI) * tilt * 1.4;
        z +=
          0.035 * Math.sin((y * Math.PI) / 2) +
          (x > 0 ? 0.045 : -0.045) * (1 - THREE.MathUtils.smoothstep(y, 0.35, 0.85));
        positions.setXYZ(i, x, y, z);
      }
      const old = o.geometry;
      old.deleteAttribute('normal');
      o.geometry = mergeVertices(old, 1e-5);
      o.geometry.computeVertexNormals();
      old.dispose();
      o.geometry.computeBoundingBox();
      o.geometry.computeBoundingSphere();
    });
  return model;
}
