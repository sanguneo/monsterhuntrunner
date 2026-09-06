import * as THREE from 'three';
import { CONFIG } from '../data/config';
import { WORLDS } from '../data/worlds';
import type { WorldTheme } from '../data/worlds';
import { ModelKit, bakeStaticModel } from '../visual/ModelKit';
import type { Vec3 } from '../visual/ModelKit';

const CHUNK_LENGTH = 16;
// 128 m of absolute recycling covers the 80 m fog horizon, including resets.
const CHUNK_COUNT = 8;
const PERIOD = CHUNK_LENGTH * CHUNK_COUNT;
const INK = 0x101827;
const BONE = 0xcbbd9b;
const GOLD = 0x98743a;
const CYAN = 0x45d8df;
const VIOLET = 0xa780ed;

// Side-wall authoring coordinates: x runs along the corridor, -z faces the lane.
// Only freshly authored geometries enter bakeStaticModel; all clones share its result.
function block(kit: ModelKit, parent: THREE.Group, color: number, p: Vec3, size: Vec3): THREE.Mesh {
  return kit.box(color, p, size, parent, 0);
}

function pointedShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height * 0.62);
  shape.quadraticCurveTo(width * 0.4, height * 0.85, 0, height);
  shape.quadraticCurveTo(-width * 0.4, height * 0.85, -width / 2, height * 0.62);
  shape.closePath();
  return shape;
}

function school(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  block(kit, wall, theme.wallA, [0, 3, 0.25], [16, 6, 0.5]);
  block(kit, wall, theme.wallB, [0, 0.7, -0.08], [16, 1.4, 0.18]);
  for (const y of [0.15, 1.45, 5.7]) block(kit, wall, BONE, [0, y, -0.23], [16, 0.09, 0.12]);
  for (const x of [-5.7, 5.6]) {
    block(kit, wall, BONE, [x, 3.55, -0.13], [2.65, 3.3, 0.22]);
    block(kit, wall, 0x223b79, [x, 3.55, -0.26], [2.4, 3.05, 0.08]);
    // Night panes, moon disk and an irregular distant roofline behind mullions.
    kit.sphere(0x779bc8, [x + 0.55, 4.45, -0.32], [0.25, 0.25, 0.025], wall, 8, 'glow');
    for (let i = 0; i < 4; i++)
      block(kit, wall, INK, [x - 0.85 + i * 0.57, 2.28 + (i % 2) * 0.16, -0.34], [0.58, 0.5 + (i % 2) * 0.32, 0.03]);
    block(kit, wall, BONE, [x, 3.55, -0.39], [0.09, 3.1, 0.09]);
    for (const y of [2.75, 4.05]) block(kit, wall, BONE, [x, y, -0.39], [2.5, 0.09, 0.09]);
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.55 + i * 0.8;
    block(kit, wall, INK, [x, 1.65, -0.3], [0.79, 3.1, 0.45]);
    block(kit, wall, theme.wallB, [x, 1.65, -0.55], [0.71, 2.98, 0.08]);
    for (const y of [0.45, 0.58, 2.75, 2.88]) block(kit, wall, INK, [x, y, -0.6], [0.43, 0.045, 0.025]);
    block(kit, wall, BONE, [x + 0.22, 1.5, -0.66], [0.055, 0.27, 0.09]);
    block(kit, wall, BONE, [x, 2.45, -0.61], [0.22, 0.11, 0.025]);
  }
  // Open classroom recess and a slightly ajar door, not a house beside a road.
  block(kit, wall, BONE, [1.1, 2, -0.12], [2.25, 4, 0.28]);
  block(kit, wall, INK, [1.1, 1.9, -0.3], [1.97, 3.78, 0.08]);
  const door = new THREE.Group();
  door.position.set(0.18, 0, -0.4);
  door.rotation.y = -0.25;
  wall.add(door);
  block(kit, door, theme.wallB, [0.63, 1.88, 0], [1.25, 3.72, 0.13]);
  block(kit, door, 0x223b79, [0.63, 2.75, -0.08], [0.78, 0.85, 0.035]);
  block(kit, door, BONE, [1.05, 1.65, -0.14], [0.1, 0.12, 0.15]);
  block(kit, wall, BONE, [3.15, 2.65, -0.15], [1.6, 1.6, 0.2]);
  block(kit, wall, INK, [3.15, 2.65, -0.27], [1.42, 1.42, 0.04]);
  for (let i = 0; i < 3; i++) block(kit, wall, BONE, [3.02, 3.05 - i * 0.3, -0.3], [0.95 - i * 0.2, 0.035, 0.02]);
  for (const x of [-4.15, 4.25]) {
    block(kit, wall, INK, [x, 4.4, -0.25], [0.44, 0.7, 0.32]);
    kit.box(0xffce80, [x, 4.4, -0.45], [0.29, 0.43, 0.18], wall, 0, 'glow');
    block(kit, wall, BONE, [x, 4.8, -0.4], [0.65, 0.13, 0.6]);
  }
}

function village(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  for (const x of [-4.2, 3.5]) {
    block(kit, wall, theme.wallA, [x, 1.7, 0.6], [5.8, 3.4, 0.7]);
    const gable = new THREE.Shape();
    gable.moveTo(-2.9, 0);
    gable.lineTo(-0.2, 2.1);
    gable.lineTo(1.1, 0.9);
    gable.lineTo(1.5, 1.2);
    gable.lineTo(2.9, 0);
    gable.closePath();
    kit.shape(theme.wallB, gable, 0.45, [x, 3.4, 0.2], wall);
    for (const offset of [-1.55, 1.25]) {
      block(kit, wall, INK, [x + offset, 2.05, 0.18], [1.25, 1.65, 0.08]);
      const board = block(kit, wall, 0x564635, [x + offset, 2.05, 0.05], [1.55, 0.19, 0.15]);
      board.rotation.z = offset * 0.23;
      block(kit, wall, theme.wallB, [x + offset, 1.16, -0.04], [1.55, 0.17, 0.3]);
    }
    block(kit, wall, INK, [x, 1.2, 0.18], [0.88, 2.4, 0.08]);
    for (const dx of [-2.65, 2.65]) block(kit, wall, 0x564635, [x + dx, 1.8, 0.08], [0.2, 3.6, 0.24]);
    kit.tube(
      INK,
      [
        [x + 0.4, 3.4, 0.13],
        [x + 0.7, 2.9, 0.13],
        [x + 0.4, 2.6, 0.13],
        [x + 0.8, 2.2, 0.13],
      ],
      0.035,
      wall,
    );
  }
  const fence = new THREE.Group();
  fence.position.set(-4.4, 0, -1);
  fence.rotation.z = -0.14;
  wall.add(fence);
  for (let i = 0; i < 6; i++) {
    const height = i === 3 ? 0.72 : 1.45 + (i % 2) * 0.18;
    block(kit, fence, 0x564635, [i * 0.52, height / 2, 0], [0.18, height, 0.16]);
  }
  for (const y of [0.45, 1.05]) block(kit, fence, 0x564635, [1.3, y, 0.12], [3.1, 0.12, 0.12]);
  for (const x of [0.4, 1.6]) {
    const stone = new THREE.Group();
    stone.position.set(x, 0, -1.1);
    stone.rotation.z = x * 0.1;
    wall.add(stone);
    block(kit, stone, theme.wallB, [0, 0.52, 0], [0.72, 1.04, 0.28]);
    kit.sphere(theme.wallB, [0, 1.02, 0], [0.36, 0.35, 0.14], stone, 8);
    block(kit, stone, INK, [0, 0.78, -0.16], [0.06, 0.35, 0.025]);
    block(kit, stone, INK, [0, 0.84, -0.16], [0.3, 0.05, 0.025]);
  }
  kit.tube(
    0x564635,
    [
      [6.4, 0, -0.8],
      [6.15, 1.5, -0.7],
      [6.6, 2.8, -0.5],
      [6.25, 4.7, -0.3],
    ],
    0.19,
    wall,
  );
  for (const direction of [-1, 1]) {
    kit.tube(
      0x564635,
      [
        [6.3, 2, -0.6],
        [6.3 + direction * 0.7, 2.8, -0.6],
        [6.3 + direction * 1.1, 3.9, -0.4],
      ],
      0.085,
      wall,
    );
    kit.tube(
      0x564635,
      [
        [6.3 + direction * 0.65, 2.8, -0.6],
        [6.3 + direction * 1.3, 3, -0.6],
        [6.3 + direction * 1.5, 3.5, -0.5],
      ],
      0.045,
      wall,
    );
  }
  for (const x of [-0.65, 3]) {
    kit.sphere(0xa76028, [x, 0.38, -1.12], [0.45, 0.36, 0.36], wall, 8);
    for (const dx of [-0.21, 0, 0.21]) kit.sphere(0xa76028, [x + dx, 0.38, -1.28], [0.14, 0.34, 0.23], wall, 8);
    kit.cylinder(0x564635, [x, 0.79, -1.12], 0.055, 0.075, 0.19, wall, 6);
    for (const dx of [-0.16, 0.16]) kit.box(0xe3bd65, [x + dx, 0.44, -1.49], [0.1, 0.1, 0.035], wall, 0, 'glow');
    block(kit, wall, INK, [x, 0.25, -1.48], [0.2, 0.07, 0.04]);
  }
}

function laboratory(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  for (let i = 0; i < 4; i++) {
    const x = -6 + i * 4;
    block(kit, wall, theme.wallA, [x, 2.9, 0.3], [3.9, 5.8, 0.5]);
    block(kit, wall, theme.wallB, [x, 2.6, -0.01], [3.45, 4.45, 0.15]);
    for (const dx of [-1.5, 1.5])
      for (const y of [0.7, 4.5]) kit.box(GOLD, [x + dx, y, -0.12], [0.12, 0.12, 0.07], wall, 0, 'metal');
    for (let vent = 0; vent < 4; vent++) block(kit, wall, INK, [x, 4.1 + vent * 0.15, -0.12], [1.5, 0.045, 0.03]);
  }
  for (const y of [5, 5.4])
    kit.tube(
      GOLD,
      [
        [-8, y, -0.25],
        [-3, y, -0.25],
        [-2.5, y - 0.5, -0.25],
        [8, y - 0.5, -0.25],
      ],
      0.11,
      wall,
      'metal',
    );
  for (const x of [-5.4, 5.4]) {
    kit.cylinder(theme.wallB, [x, 0.26, -0.75], 0.72, 0.85, 0.52, wall, 10);
    kit.cylinder(CYAN, [x, 1.65, -0.75], 0.43, 0.43, 2.25, wall, 10, 'glow');
    for (const y of [0.6, 2.7]) kit.cylinder(GOLD, [x, y, -0.75], 0.58, 0.58, 0.18, wall, 10, 'metal');
    for (const dx of [-0.48, 0.48]) kit.cylinder(theme.wallB, [x + dx, 1.65, -0.78], 0.045, 0.045, 2.2, wall, 6);
    block(kit, wall, INK, [x, 3.35, -0.18], [1.3, 0.75, 0.2]);
    kit.box(CYAN, [x - 0.3, 3.35, -0.3], [0.32, 0.33, 0.03], wall, 0, 'glow');
    for (let i = 0; i < 3; i++)
      block(kit, wall, GOLD, [x + 0.18 + i * 0.15, 3.25, -0.31], [0.055, 0.12 + i * 0.08, 0.025]);
  }
  kit.cylinder(theme.wallB, [0, 0.35, -0.8], 0.8, 0.95, 0.7, wall, 10);
  kit.cylinder(INK, [0, 1.6, -0.8], 0.22, 0.3, 2.1, wall, 8);
  for (let ring = 0; ring < 4; ring++) {
    const coil = kit.torus(GOLD, [0, 0.95 + ring * 0.48, -0.8], 0.52 - ring * 0.055, 0.065, wall, 'metal');
    coil.rotation.x = Math.PI / 2;
  }
  kit.sphere(CYAN, [0, 2.9, -0.8], [0.32, 0.28, 0.32], wall, 10, 'glow');
  kit.tube(
    CYAN,
    [
      [0, 3.1, -0.8],
      [0.38, 3.45, -0.7],
      [0.15, 3.75, -0.6],
      [0.7, 4, -0.4],
    ],
    0.027,
    wall,
    'glow',
  );
  for (const x of [-2.7, 2.7]) {
    kit.torus(GOLD, [x, 2.55, -0.22], 0.43, 0.075, wall, 'metal');
    kit.sphere(BONE, [x, 2.55, -0.19], [0.37, 0.37, 0.04], wall, 10);
    const needle = block(kit, wall, INK, [x + 0.08, 2.65, -0.26], [0.045, 0.29, 0.035]);
    needle.rotation.z = -0.6;
    kit.tube(
      GOLD,
      [
        [x, 2.1, -0.2],
        [x, 1.1, -0.3],
        [x + 0.4, 0.6, -0.4],
        [x + 0.4, 0.1, -0.4],
      ],
      0.09,
      wall,
      'metal',
    );
  }
}

function sea(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  // Cavern openings are cut by rock silhouettes, with no span over the camera.
  for (const x of [-6, -1, 5.7]) {
    kit.sphere(theme.wallA, [x, 2.8, 0.8], [1.55, 3.4, 1.2], wall, 7);
    kit.sphere(theme.wallB, [x - 0.35, 5.5, 0.5], [2.2, 1.35, 1.35], wall, 7);
    kit.sphere(theme.wallB, [x + 0.45, 0.5, -0.3], [1.4, 0.7, 0.95], wall, 7);
  }
  block(kit, wall, theme.wallA, [0, 5.95, 1.3], [16, 0.8, 0.7]);
  for (const x of [-3.6, 3.1]) {
    const coral = x < 0 ? 0xbc637f : 0x479fbc;
    kit.tube(
      coral,
      [
        [x, 0, -0.9],
        [x - 0.12, 0.8, -0.85],
        [x + 0.15, 1.5, -0.8],
        [x, 2.25, -0.7],
      ],
      0.12,
      wall,
    );
    for (const direction of [-1, 1]) {
      kit.tube(
        coral,
        [
          [x, 0.65, -0.85],
          [x + direction * 0.6, 1.1, -0.85],
          [x + direction * 0.8, 1.9, -0.7],
        ],
        0.08,
        wall,
      );
      kit.tube(
        coral,
        [
          [x + direction * 0.5, 1.05, -0.85],
          [x + direction * 1, 1.3, -0.75],
          [x + direction * 1.15, 1.65, -0.7],
        ],
        0.045,
        wall,
      );
    }
  }
  // Fan shell, radiating ridges and an illuminated pearl in the cupped opening.
  const shell = new THREE.Shape();
  shell.moveTo(0, 0);
  for (let i = 0; i <= 8; i++) {
    const angle = (Math.PI * i) / 8;
    shell.lineTo(Math.cos(angle) * (i % 2 ? 0.9 : 1), 0.35 + Math.sin(angle) * 0.9);
  }
  shell.closePath();
  kit.shape(BONE, shell, 0.12, [0.6, 0.2, -1.04], wall);
  for (let i = 1; i < 6; i++) {
    const angle = (Math.PI * i) / 6;
    kit.tube(
      0x479fbc,
      [
        [0.6, 0.22, -1.1],
        [0.6 + Math.cos(angle) * 0.45, 0.6 + Math.sin(angle) * 0.25, -1.1],
        [0.6 + Math.cos(angle) * 0.85, 0.55 + Math.sin(angle) * 0.75, -1.1],
      ],
      0.022,
      wall,
    );
  }
  kit.sphere(BONE, [0.6, 0.42, -1.28], [0.3, 0.3, 0.3], wall, 10, 'glow');
  for (let i = 0; i < 4; i++) {
    const x = 2;
    // Opaque low-poly rim + tiny glint avoids transparency sorting and overdraw.
    kit.torus(CYAN, [x + Math.sin(i * 2) * 0.22, 1.1 + i * 0.86, -0.95], 0.11 + i * 0.035, 0.016, wall, 'glow');
    kit.sphere(
      BONE,
      [x + Math.sin(i * 2) * 0.22 - 0.05, 1.15 + i * 0.86, -0.96],
      [0.035, 0.035, 0.02],
      wall,
      6,
      'glow',
    );
  }
}

function castle(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  block(kit, wall, theme.wallA, [0, 3.25, 0.35], [16, 6.5, 0.7]);
  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    block(kit, wall, theme.wallB, [x, 3.25, -0.2], [0.5, 6.5, 0.8]);
    for (const y of [0.25, 4.8, 6.25]) block(kit, wall, GOLD, [x, y, -0.28], [0.75, 0.18, 0.94]);
  }
  for (const x of [-5, 5]) {
    kit.shape(theme.wallB, pointedShape(3.2, 4.75), 0.2, [x, 1.05, -0.22], wall);
    kit.shape(INK, pointedShape(2.8, 4.4), 0.1, [x, 1.18, -0.34], wall);
    kit.shape(0x744591, pointedShape(2.38, 4.02), 0.08, [x, 1.3, -0.45], wall, 'glow');
    kit.shape(0x973d57, pointedShape(0.85, 3.4), 0.07, [x, 1.4, -0.55], wall, 'glow');
    for (const dx of [-0.47, 0.47]) block(kit, wall, GOLD, [x + dx, 2.9, -0.59], [0.075, 3, 0.07]);
    for (const y of [2.15, 3.2, 4.2]) block(kit, wall, GOLD, [x, y, -0.59], [2.25 - (y > 4 ? 0.5 : 0), 0.075, 0.07]);
    kit.torus(GOLD, [x, 4.2, -0.63], 0.38, 0.045, wall, 'metal');
  }
  for (const x of [-1.25, 1.25]) {
    const banner = new THREE.Shape();
    banner.moveTo(-0.6, 0);
    banner.lineTo(0, -0.45);
    banner.lineTo(0.6, 0);
    banner.lineTo(0.6, 2.8);
    banner.lineTo(-0.6, 2.8);
    banner.closePath();
    kit.shape(0x973d57, banner, 0.055, [x, 2.5, -0.42], wall);
    block(kit, wall, GOLD, [x, 5.37, -0.46], [1.5, 0.1, 0.14]);
    block(kit, wall, GOLD, [x, 4.05, -0.51], [0.055, 1.8, 0.04]);
    const diamond = block(kit, wall, GOLD, [x, 4.05, -0.55], [0.34, 0.34, 0.04]);
    diamond.rotation.z = Math.PI / 4;
  }
  for (const x of [-3, 3]) {
    kit.tube(
      GOLD,
      [
        [x, 2.7, -0.45],
        [x, 2.4, -1],
        [x, 2.7, -1.25],
      ],
      0.075,
      wall,
      'metal',
    );
    for (const dx of [-0.23, 0.23]) {
      kit.cylinder(BONE, [x + dx, 2.96, -1.2], 0.075, 0.075, 0.55, wall, 7);
      kit.sphere(0xffce80, [x + dx, 3.36, -1.2], [0.075, 0.18, 0.075], wall, 7, 'glow');
    }
    block(kit, wall, GOLD, [x, 2.65, -1.2], [0.72, 0.09, 0.28]);
  }
}

function skullKingdom(kit: ModelKit, wall: THREE.Group, theme: WorldTheme): void {
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 8; col++) {
      block(
        kit,
        wall,
        (row + col) % 3 ? theme.wallA : theme.wallB,
        [-7 + col * 2 + (row % 2) * 0.35, 0.61 + row * 1.23, 0.25],
        [1.92, 1.15, 0.5],
      );
    }
  for (const x of [-6, -3.5, 3.5, 6]) {
    // Rib buttresses curve inward only within the shoulder, never across the track.
    kit.tube(
      BONE,
      [
        [x, 0.15, -0.35],
        [x, 1.8, -0.7],
        [x, 3.8, -0.85],
        [x, 5.4, -0.55],
        [x, 6.4, 0.1],
      ],
      0.17,
      wall,
    );
    kit.sphere(BONE, [x, 0.32, -0.4], [0.29, 0.34, 0.29], wall, 8);
    block(kit, wall, GOLD, [x, 0.16, -0.35], [0.75, 0.3, 0.8]);
  }
  block(kit, wall, 0x694389, [0, 3.2, -0.08], [3.7, 5.9, 0.2]);
  for (const x of [-1.8, 1.8]) block(kit, wall, GOLD, [x, 3.2, -0.23], [0.09, 5.9, 0.1]);
  kit.sphere(BONE, [0, 3.6, -0.45], [1, 1.05, 0.42], wall, 10);
  block(kit, wall, BONE, [0, 2.8, -0.55], [1.18, 0.52, 0.55]);
  for (const x of [-0.38, 0.38]) kit.sphere(INK, [x, 3.64, -0.83], [0.28, 0.32, 0.09], wall, 8);
  const nose = new THREE.Shape();
  nose.moveTo(0, 0.2);
  nose.lineTo(-0.13, -0.1);
  nose.lineTo(0.13, -0.1);
  nose.closePath();
  kit.shape(INK, nose, 0.025, [0, 3.18, -0.88], wall);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) block(kit, wall, INK, [x, 2.65, -0.85], [0.055, 0.25, 0.035]);
  block(kit, wall, GOLD, [0, 4.45, -0.62], [1.75, 0.22, 0.45]);
  for (const x of [-0.65, 0, 0.65]) {
    kit.cylinder(GOLD, [x, 4.8, -0.62], 0.02, 0.2, 0.6, wall, 4);
    kit.sphere(VIOLET, [x, 4.62, -0.86], [0.09, 0.12, 0.055], wall, 7, 'glow');
  }
  for (const x of [-2.3, 2.3]) {
    block(kit, wall, theme.wallB, [x, 0.4, -0.95], [0.9, 0.8, 0.9]);
    kit.lathe(
      GOLD,
      [
        [0.22, 0],
        [0.3, 0.13],
        [0.18, 0.8],
        [0.48, 1],
        [0.55, 1.24],
        [0.4, 1.3],
      ],
      [x, 0.8, -0.95],
      wall,
      'metal',
    );
    for (const dx of [-0.18, 0, 0.18])
      kit.sphere(
        VIOLET,
        [x + dx, 2.25 + (dx === 0 ? 0.14 : 0), -0.95],
        [0.13, dx === 0 ? 0.48 : 0.3, 0.14],
        wall,
        7,
        'glow',
      );
  }
}

const AUTHORS = [school, village, laboratory, sea, castle, skullKingdom] as const;
const EDGE_COLORS = [0x779bc8, 0xe3bd65, CYAN, CYAN, 0xffce80, VIOLET] as const;

function buildTemplate(theme: WorldTheme, index: number): THREE.Group {
  const kit = new ModelKit();
  kit.group.name = `environment-${WORLDS[index].id}`;
  for (const side of [-1, 1]) {
    const wall = new THREE.Group();
    wall.position.x = side * 6.15;
    wall.rotation.y = (side * Math.PI) / 2;
    kit.group.add(wall);
    AUTHORS[index](kit, wall, theme);
    block(kit, kit.group, theme.wallB, [side * 4.03, 0.11, 0], [0.18, 0.22, CHUNK_LENGTH]);
    kit.box(EDGE_COLORS[index], [side * 3.94, 0.08, 0], [0.045, 0.035, CHUNK_LENGTH], kit.group, 0, 'glow');
    for (let i = 0; i < 4; i++) {
      block(kit, kit.group, theme.wallB, [(side * CONFIG.lanes.spacing) / 2, 0.006, -6 + i * 4], [0.045, 0.012, 0.95]);
      // Inlaid perimeter slabs / drain slots / sediment marks, below foot level.
      block(kit, kit.group, theme.wallB, [side * 3.65, 0.003, -6 + i * 4], [0.35, 0.008, index === 2 ? 1.4 : 0.06]);
    }
  }
  for (let i = 0; i < 4; i++) block(kit, kit.group, theme.wallB, [0, -0.014, -8 + i * 4], [7.8, 0.008, 0.028]);
  return bakeStaticModel(kit.group);
}

/** Six cached architectural sets; relocation and switching only mutate existing objects. */
export class Environment {
  private readonly floor: THREE.Mesh;
  private readonly shoulders: THREE.Mesh;
  private readonly chunks: THREE.Group[] = [];
  private readonly motifs: THREE.Group[][] = [];
  private readonly floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  private readonly shoulderMat = new THREE.MeshStandardMaterial({ roughness: 1 });

  constructor(scene: THREE.Scene) {
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 240), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.025;
    this.floor.name = 'courier-path';
    scene.add(this.floor);
    this.shoulders = new THREE.Mesh(new THREE.PlaneGeometry(90, 240), this.shoulderMat);
    this.shoulders.rotation.x = -Math.PI / 2;
    this.shoulders.position.y = -0.07;
    scene.add(this.shoulders);
    const templates = WORLDS.map((world, index) => buildTemplate(world.theme, index));
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const chunk = new THREE.Group();
      chunk.name = `environment-chunk-${i}`;
      const variants = templates.map((template) => template.clone());
      chunk.add(...variants);
      this.motifs.push(variants);
      this.chunks.push(chunk);
      scene.add(chunk);
    }
    this.setTheme(WORLDS[0].theme);
    this.update(0);
  }

  setTheme(theme: WorldTheme): void {
    this.floorMat.color.setHex(theme.floor);
    this.shoulderMat.color.setHex(theme.wallA);
    const themeIndex = Math.max(
      0,
      WORLDS.findIndex((world) => world.theme === theme),
    );
    for (const variants of this.motifs) {
      for (let i = 0; i < variants.length; i++) variants[i].visible = i === themeIndex;
    }
  }

  update(playerZ: number): void {
    this.floor.position.z = this.shoulders.position.z = playerZ + 80;
    for (let i = 0; i < this.chunks.length; i++) {
      const origin = i * CHUNK_LENGTH;
      this.chunks[i].position.z = origin + Math.floor((playerZ + 20 - origin) / PERIOD) * PERIOD + PERIOD - 40;
    }
  }
}
