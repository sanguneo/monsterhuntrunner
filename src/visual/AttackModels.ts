import * as THREE from 'three';
import { SculptKit } from './SculptKit';
import { bakeStaticModel } from './ModelKit';
const cache = new Map<string, THREE.Group>();
/** Shared immutable wall templates; removing an attack must not dispose their resources. */
export function createAttackWall(id: string, color: number): THREE.Group {
  const key = `${id}:${color}`;
  const prior = cache.get(key);
  if (prior) return prior.clone(true);
  const k = new SculptKit();
  if (id === 'ghostGirl') {
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.23;
      k.sweep(
        color,
        [
          [x, 0, 0],
          [x - 0.08, 1, 0.04],
          [x + 0.08, 2.3, 0],
          [x * 0.9, 3.15, -0.1],
        ],
        [0.13, 0.14, 0.13, 0.02],
        undefined,
        undefined,
        'cloth',
        18,
      );
    }
  } else if (id === 'zombieKing') {
    k.loft(
      color,
      [
        [0, 0.83, 0.36],
        [0.2, 0.83, 0.36],
        [2.55, 0.78, 0.34],
        [2.95, 0.53, 0.32],
        [3.18, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      18,
      16,
    );
    k.box(0xc4c1b0, [0, 1.9, -0.36], [0.12, 0.9, 0.025], undefined, 0.02);
    k.box(0xc4c1b0, [0, 2.1, -0.37], [0.6, 0.1, 0.025], undefined, 0.02);
    k.box(0x655968, [0, 0.7, -0.37], [0.8, 0.06, 0.025], undefined, 0.02);
  } else if (id === 'kraken') {
    for (const x of [-0.56, 0, 0.56]) {
      k.sweep(
        color,
        [
          [x, 0, 0.02],
          [x * 0.85, 0.8, 0.04],
          [x + 0.12, 2, 0],
          [x - 0.12, 2.85, -0.05],
          [x - 0.26, 3.12, -0.12],
        ],
        [0.24, 0.22, 0.17, 0.1, 0],
        undefined,
        undefined,
        'cloth',
        24,
      );
      for (let i = 0; i < 4; i++) {
        const hit = k.surfacePoint([x + 0.025, 0.45 + i * 0.5, -0.4]);
        const cup = k.torus(0xd4aac8, [hit.point.x, hit.point.y, hit.point.z], 0.05, 0.011);
        cup.position.addScaledVector(hit.normal, 0.008);
        cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hit.normal);
        cup.userData.facialDetail = true;
      }
    }
  } else if (id === 'dracula') {
    for (let row = 0; row < 5; row++)
      for (const side of [-1, 1]) {
        const s = new THREE.Shape();
        s.moveTo(-0.36, 0.04);
        s.quadraticCurveTo(-0.18, 0.26, 0, 0.05);
        s.quadraticCurveTo(0.18, 0.26, 0.36, 0.04);
        s.lineTo(0.31, -0.12);
        s.quadraticCurveTo(0.14, 0.02, 0.1, -0.17);
        s.lineTo(0, -0.08);
        s.lineTo(-0.1, -0.17);
        s.quadraticCurveTo(-0.14, 0.02, -0.31, -0.12);
        s.closePath();
        const m = k.shape(color, s, 0.035, [side * 0.4, 0.25 + row * 0.59, (row % 2) * 0.12]);
        m.rotation.z = side * 0.15;
      }
  } else {
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) {
      k.sweep(
        color,
        [
          [x, 0, 0],
          [x * 0.96, 1.6, 0],
          [x, 3.15, 0],
        ],
        [0.09, 0.075, 0.09],
        undefined,
        undefined,
        'cloth',
        12,
      );
      for (const y of [0.1, 3.05])
        k.loft(
          color,
          [
            [y - 0.1, 0, 0],
            [y - 0.07, 0.12, 0.12],
            [y + 0.07, 0.12, 0.12],
            [y + 0.1, 0, 0],
          ],
          [x, 0, 0],
          undefined,
          'cloth',
          8,
          10,
        );
    }
    for (const y of [0.5, 2.5])
      k.sweep(
        color,
        [
          [-0.85, y, 0],
          [0, y + 0.06, 0],
          [0.85, y, 0],
        ],
        [0.065, 0.065, 0.065],
        undefined,
        undefined,
        'cloth',
        12,
      );
  }
  k.group.position.y = -1.6;
  k.group.name = `attack-wall-${id}`;
  const result = bakeStaticModel(k.group);
  cache.set(key, result);
  return result.clone(true);
}
export function createWaveGeometry(width: number): THREE.BufferGeometry {
  // A curling cross-section across the lane, rather than a flat colored bar.
  const s = new THREE.Shape();
  s.moveTo(-0.43, -0.25);
  s.lineTo(0.42, -0.25);
  s.bezierCurveTo(0.35, -0.08, 0.22, 0.06, 0.05, 0.2);
  s.bezierCurveTo(-0.12, 0.36, -0.34, 0.3, -0.36, 0.16);
  s.bezierCurveTo(-0.38, 0.06, -0.21, 0.025, -0.16, 0.13);
  s.bezierCurveTo(-0.19, 0.11, -0.21, 0.16, -0.18, 0.18);
  s.bezierCurveTo(-0.1, 0.21, -0.07, 0.13, -0.12, 0.055);
  s.bezierCurveTo(-0.24, -0.07, -0.36, -0.12, -0.43, -0.25);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    steps: 1,
    curveSegments: 12,
  })
    .rotateY(Math.PI / 2)
    .translate(-width / 2, 0, 0);
}

/** Bordered lane decal with directional chevrons; warnings remain readable through the art. */
export function createTelegraphGeometry(): THREE.BufferGeometry {
  const outline = new THREE.Shape();
  outline.moveTo(-0.9, -5);
  outline.lineTo(0.9, -5);
  outline.lineTo(0.9, 5);
  outline.lineTo(-0.9, 5);
  outline.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.78, -4.86);
  hole.lineTo(-0.78, 4.86);
  hole.lineTo(0.78, 4.86);
  hole.lineTo(0.78, -4.86);
  hole.closePath();
  outline.holes.push(hole);
  const shapes = [outline];
  for (const y of [-3.8, -1.9, 0, 1.9, 3.8]) {
    const s = new THREE.Shape();
    s.moveTo(-0.55, y - 0.3);
    s.lineTo(0, y + 0.15);
    s.lineTo(0.55, y - 0.3);
    s.lineTo(0.55, y - 0.1);
    s.lineTo(0, y + 0.35);
    s.lineTo(-0.55, y - 0.1);
    s.closePath();
    shapes.push(s);
  }
  return new THREE.ShapeGeometry(shapes);
}
