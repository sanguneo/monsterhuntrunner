import * as THREE from 'three';
import { SculptKit } from './SculptKit';
import { bakeStaticModel } from './ModelKit';
import type { PickupType } from '../entities/Pickup';
const templates = new Map<PickupType, THREE.Group>();
const gold = 0xe5b65d,
  light = 0xffedb9;
function heart(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.11);
  s.bezierCurveTo(-0.25, 0.06, -0.13, 0.21, 0, 0.11);
  s.bezierCurveTo(0.13, 0.21, 0.25, 0.06, 0, -0.11);
  return s;
}
export function createCollectibleModel(type: PickupType): THREE.Group {
  const cache = templates.get(type);
  if (cache) return cache.clone(true);
  const k = new SculptKit();
  k.group.name = `pickup-${type}`;
  if (type === 'coin') {
    const disc = k.cylinder(gold, [0, 0, 0], 0.29, 0.29, 0.075, undefined, 32, 'metal');
    disc.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      k.torus(light, [0, 0, side * 0.039], 0.25, 0.013, undefined, 'metal');
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          r = i % 2 ? 0.075 : 0.155;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      k.shape(light, s, 0.009, [0, 0, side * 0.04], undefined, 'metal');
    }
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const edge = k.box(
        light,
        [Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0],
        [0.012, 0.035, 0.06],
        undefined,
        0.003,
        'metal',
      );
      edge.rotation.z = a;
    }
  } else if (type === 'gem') {
    const gem = k.loft(
      0x64d7e4,
      [
        [-0.32, 0, 0],
        [-0.03, 0.26, 0.26],
        [0.18, 0.23, 0.23],
        [0.27, 0.11, 0.11],
        [0.27, 0, 0],
      ],
      undefined,
      undefined,
      'eye',
      4,
      8,
    );
    // Facets are intentional gemstone planes, unlike organic anatomy.
    gem.geometry = gem.geometry.toNonIndexed();
    gem.geometry.computeVertexNormals();
    k.torus(gold, [0, -0.02, 0], 0.255, 0.012, undefined, 'metal').rotation.x = Math.PI / 2;
    const sparkle = k.shape(light, heart(), 0.008, [0.14, 0.12, -0.2], undefined, 'eye');
    sparkle.scale.set(0.17, 0.17, 0.17);
  } else {
    k.loft(
      0x81c9ac,
      [
        [-0.33, 0, 0],
        [-0.31, 0.13, 0.12],
        [-0.2, 0.23, 0.19],
        [0.08, 0.22, 0.18],
        [0.2, 0.1, 0.09],
        [0.27, 0.09, 0.08],
        [0.28, 0, 0],
      ],
      undefined,
      undefined,
      'eye',
      24,
      24,
    );
    k.loft(
      0xc39b70,
      [
        [0.23, 0, 0],
        [0.24, 0.11, 0.1],
        [0.35, 0.105, 0.095],
        [0.37, 0.075, 0.07],
        [0.38, 0, 0],
      ],
      undefined,
      undefined,
      'leather',
      12,
      16,
    );
    k.torus(light, [0, 0.22, 0], 0.107, 0.012, undefined, 'metal').rotation.x = Math.PI / 2;
    k.shape(light, heart(), 0.012, [0, -0.045, -0.19]);
  }
  const result = bakeStaticModel(k.group);
  templates.set(type, result);
  return result.clone(true);
}
