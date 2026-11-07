import * as THREE from 'three';
import { SeaSkullKit } from './sea-skull-kit';
import type { Vec3 } from '../../ModelKit';
/** Reference-specific layered aquatic tailoring; actual gameplay geometry, not export decoration. */
export function addAquaticRegalia(k: SeaSkullKit): void {
  k.closedLoft(
    0x123644,
    [
      [1.98, 0.025, 0.025, 0, -0.235],
      [2.055, 0.079, 0.06, 0, -0.265],
      [2.11, 0.072, 0.058, 0, -0.264],
      [2.17, 0.025, 0.025, 0, -0.22],
    ],
    10,
    10,
  ).name = 'supported-shell-clasp-foundation';
  k.closedLoft(
    0x123644,
    [
      [1.42, 0.232, 0.21],
      [1.46, 0.247, 0.21],
      [1.54, 0.25, 0.19],
      [1.58, 0.242, 0.18],
    ],
    8,
    12,
  ).name = 'wrapped-bodice-waistband';
  k.fanMembrane(
    0x123644,
    [0, 1.43, -0.205],
    [
      [-0.28, 1.92, -0.19],
      [-0.18, 2.03, -0.23],
      [0, 1.96, -0.255],
      [0.18, 2.03, -0.23],
      [0.28, 1.92, -0.19],
    ],
    [0, 0, -1],
    3,
    10,
  ).name = 'fitted-tidal-bodice';
  for (const side of [-1, 1]) {
    for (let layer = 0; layer < 3; layer++) {
      const span = 0.59 - layer * 0.105,
        top = 2.38 - layer * 0.075,
        z = -0.015 - layer * 0.018;
      k.fanMembrane(
        layer === 1 ? 0x417e8a : layer === 2 ? 0x92bbc2 : 0x2a6478,
        [side * 0.025, 2.075, -0.275 - layer * 0.016],
        [
          [side * 0.13, 2.25 - layer * 0.055, -0.12 - layer * 0.018],
          [side * (span * 0.72), top - 0.055, z - 0.035],
          [side * span, top, z],
          [side * (span * 0.81), 2.13 - layer * 0.04, -0.105 - layer * 0.018],
          [side * 0.16, 2.035 - layer * 0.025, -0.235 - layer * 0.018],
        ],
        [0, 0, -1],
        4,
        12,
      ).name = 'overlapping-aquatic-collar-fin';
    }
    k.fanMembrane(
      0x2a6478,
      [side * 0.025, 1.66, -0.215],
      [
        [side * 0.19, 1.76, -0.18],
        [side * 0.36, 1.49, -0.16],
        [side * 0.42, 1.31, -0.115],
        [side * 0.24, 1.38, -0.23],
        [side * 0.08, 1.46, -0.245],
      ],
      [0, 0, -1],
      3,
      8,
    ).name = 'layered-waist-fin';
  }
  // Six shell-like backing lobes surround the pearl, not a featureless round badge.
  for (let petal = 0; petal < 6; petal++) {
    const a = (petal * Math.PI) / 3,
      n = (r: number, t: number): Vec3 => [Math.sin(a + t) * r, 2.08 + Math.cos(a + t) * r, -0.322];
    k.blade(
      0xbba775,
      [n(0.055, -0.28), n(0.103, -0.21), n(0.125, 0), n(0.103, 0.21), n(0.055, 0.28)],
      [0, 0, -1],
      0.011,
      'metal',
    ).name = 'pearl-shell-setting';
  }
  for (const side of [-1, 1]) {
    const hand: Vec3 = side < 0 ? [-0.82, 1.66, -0.13] : [0.7, 2.02, -0.18];
    const [x, y, z] = hand;
    k.fanMembrane(
      0x417e8a,
      [x - side * 0.13, y + 0.025, z + 0.015],
      [
        [x - side * 0.02, y + 0.075, z - 0.01],
        [x + side * 0.065, y - 0.055, z - 0.025],
        [x + side * (side > 0 ? 0.22 : 0.09), y - (side > 0 ? 0.55 : 0.29), z + (side > 0 ? 0.08 : 0.035)],
        [x - side * 0.045, y - (side > 0 ? 0.44 : 0.24), z + 0.035],
        [x - side * 0.18, y - 0.12, z + 0.025],
      ],
      [0, 0, -1],
      4,
      8,
    ).name = 'flowing-fin-cuff';
  }
  // Branches visibly grow from the shaft and cradle the crescent shell.
  for (const side of [-1, 1]) {
    const branch: Vec3[] = [
      [-0.96, 2.55, -0.13],
      [-0.99 + side * 0.075, 2.74, -0.125],
      [-1.05 + side * 0.13, 2.9, -0.12],
      [-1.08 + side * 0.12, 3.015, -0.12],
    ];
    k.limb(0xac6350, branch, [0.027, 0.026, 0.018, 0.003], undefined, 12, 6, 'leather').name =
      'rooted-coral-crescent-mount';
    for (let fork = 0; fork < 2; fork++) {
      const root = branch[fork + 1];
      k.limb(
        0xac6350,
        [
          root,
          [root[0] + side * 0.08, root[1] + 0.055, root[2] - 0.018],
          [root[0] + side * 0.105, root[1] + 0.13, root[2] - 0.025],
        ],
        [0.015, 0.011, 0.001],
        undefined,
        7,
        5,
        'leather',
      ).name = 'coral-mount-fork';
    }
  }
  for (const part of k.group.children) {
    if (
      !(part instanceof THREE.Mesh) ||
      !['fitted-tidal-bodice', 'overlapping-aquatic-collar-fin', 'layered-waist-fin', 'flowing-fin-cuff'].includes(
        part.name,
      )
    )
      continue;
    const p = part.geometry.getAttribute('position'),
      uv = part.geometry.getAttribute('uv');
    const bow = part.name === 'overlapping-aquatic-collar-fin' ? 0.04 : 0.024;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, p.getZ(i) - bow * Math.sin(Math.PI * uv.getX(i)) * Math.sin(Math.PI * uv.getY(i)));
    part.geometry.computeVertexNormals();
  }
}
