import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import type { CapeStyle, HatStyle } from '../data/worlds';

interface RewardModel {
  readonly group: THREE.Group;
  readonly tint: THREE.MeshStandardMaterial;
}

function cape(style: CapeStyle): RewardModel {
  const kit = new ModelKit(1.35);
  const color = style === 'ghost' ? 0xcfe8ff : 0x7f1d1d;
  const positions: number[] = [];
  const indices: number[] = [];
  const columns = 16;
  const rows = 12;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const scallop = style === 'ghost' ? Math.cos(u * Math.PI * 8) * 0.045 : Math.abs(Math.cos(u * Math.PI * 6)) * 0.11;
      positions.push((u - 0.5) * (0.36 + v * 0.67), -v * 0.85 - scallop * v ** 5,
        -0.025 - v * 0.13 + Math.sin(u * Math.PI * 8) * v * 0.02);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      }
    }
  }
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cloth.setIndex(indices);
  cloth.computeVertexNormals();
  kit.mesh(cloth, color);
  const tint = kit.material(color);
  tint.side = THREE.DoubleSide;
  if (style === 'ghost') {
    tint.transparent = true;
    tint.opacity = 0.78;
    tint.depthWrite = false;
    for (const side of [-1, 1]) {
      kit.sphere(0x416984, [side * 0.095, -0.43, -0.13], [0.044, 0.065, 0.013], kit.group, 10);
      kit.tube(0xf2fbff, [[side * 0.17, -0.04, -0.035], [side * 0.27, -0.35, -0.09],
        [side * 0.48, -0.79, -0.16]], 0.012);
    }
  } else {
    for (const side of [-1, 1]) {
      const collar = new THREE.Shape();
      collar.moveTo(0, 0);
      collar.lineTo(side * 0.34, 0.29);
      collar.quadraticCurveTo(side * 0.45, 0.02, side * 0.35, -0.12);
      collar.lineTo(0, -0.16);
      collar.closePath();
      kit.shape(0x322439, collar, 0.045, [0, 0, -0.035]);
      kit.tube(0xcb8c76, [[side * 0.17, -0.06, -0.065], [side * 0.29, -0.42, -0.105],
        [side * 0.48, -0.83, -0.17]], 0.009);
    }
    kit.sphere(0xe7b962, [0, -0.075, 0.03], [0.055, 0.055, 0.025], kit.group, 10, 'metal');
  }
  kit.group.name = `reward-cape-${style}`;
  return { group: kit.group, tint };
}

function hat(style: HatStyle): RewardModel {
  const kit = new ModelKit(1.35);
  const color = { patchwork: 0x3f6212, lightning: 0xfde047, coral: 0x22d3ee, bone: 0xe7e5e4 }[style];
  const surface = style === 'lightning' ? 'metal' : 'cloth';
  switch (style) {
    case 'patchwork': {
      kit.lathe(color, [[0, 0.33], [0.1, 0.35], [0.23, 0.24], [0.29, 0.06], [0.31, 0.02]], [0, 0, 0]);
      const brim = kit.cylinder(color, [0, 0.02, 0.025], 0.4, 0.42, 0.045, kit.group, 14);
      brim.scale.z = 0.86;
      kit.box(0xae8c67, [0.09, 0.15, 0.255], [0.16, 0.13, 0.025], kit.group, 0.015);
      for (let i = 0; i < 4; i++) kit.box(0xffd89c, [0.035 + i * 0.036, 0.218, 0.273],
        [0.008, 0.028, 0.01], kit.group, 0);
      kit.tube(0x715b4b, [[-0.19, 0.3, 0.03], [-0.07, 0.34, 0.12], [0.08, 0.31, 0.19]], 0.012);
      break;
    }
    case 'lightning': {
      kit.mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        color, [0, 0.025, 0], [0.33, 0.28, 0.31], kit.group, 'metal');
      const rim = kit.torus(0xd2a348, [0, 0.03, 0], 0.32, 0.025, kit.group, 'metal');
      rim.rotation.x = Math.PI / 2;
      const bolt = new THREE.Shape();
      bolt.moveTo(-0.035, 0.18);
      bolt.lineTo(0.1, 0.49); bolt.lineTo(0.015, 0.43); bolt.lineTo(0.07, 0.63);
      bolt.lineTo(-0.13, 0.34); bolt.lineTo(-0.035, 0.36); bolt.closePath();
      kit.shape(0xb2f6f4, bolt, 0.055, [0, 0, -0.028], kit.group, 'glow');
      for (const side of [-1, 1]) {
        kit.box(0x9d864c, [side * 0.31, 0.025, 0], [0.075, 0.17, 0.2], kit.group, 0.025, 'metal');
        kit.sphere(0xdbf8fa, [side * 0.35, 0.06, 0.025], [0.026, 0.026, 0.026], kit.group, 8, 'metal');
      }
      break;
    }
    case 'coral': {
      const band = kit.torus(color, [0, 0.04, 0], 0.29, 0.036);
      band.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 4 - 0.5) * Math.PI;
        const x = Math.sin(angle) * 0.27;
        const z = Math.cos(angle) * 0.27;
        const height = 0.24 + (2 - Math.abs(i - 2)) * 0.07;
        kit.tube(color, [[x, 0.04, z], [x * 1.15, height * 0.55, z],
          [x * 0.8, height, z]], 0.025);
        kit.tube(color, [[x * 1.1, height * 0.5, z], [x + 0.075, height * 0.8, z]], 0.017);
        kit.sphere(0xffe9cf, [x * 0.8, height + 0.02, z], [0.05, 0.05, 0.05], kit.group, 10, 'eye');
      }
      break;
    }
    case 'bone': {
      const band = kit.torus(0xc59d55, [0, 0.035, 0], 0.29, 0.035, kit.group, 'metal');
      band.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2;
        const x = Math.sin(angle) * 0.27;
        const z = Math.cos(angle) * 0.27;
        kit.cylinder(color, [x, 0.15, z], 0.022, 0.03, 0.22);
        for (const side of [-1, 1]) kit.sphere(color, [x + side * 0.02, 0.27, z],
          [0.03, 0.04, 0.03], kit.group, 8);
      }
      kit.sphere(color, [0, 0.15, 0.3], [0.11, 0.1, 0.055], kit.group, 14);
      for (const side of [-1, 1]) kit.sphere(0x44334e, [side * 0.039, 0.16, 0.352],
        [0.026, 0.03, 0.012], kit.group, 8);
      for (let i = -1; i <= 1; i++) kit.box(color, [i * 0.035, 0.072, 0.32],
        [0.026, 0.045, 0.04], kit.group, 0.006);
      kit.sphere(0xb996ee, [0, 0.31, 0.25], [0.047, 0.065, 0.035], kit.group, 8, 'eye');
      break;
    }
  }
  kit.group.name = `reward-hat-${style}`;
  return { group: kit.group, tint: kit.material(color, surface) };
}

export function createRewardModels(): {
  capes: Record<CapeStyle, RewardModel>;
  hats: Record<HatStyle, RewardModel>;
} {
  return {
    capes: { ghost: cape('ghost'), vampire: cape('vampire') },
    hats: { patchwork: hat('patchwork'), lightning: hat('lightning'), coral: hat('coral'), bone: hat('bone') },
  };
}
