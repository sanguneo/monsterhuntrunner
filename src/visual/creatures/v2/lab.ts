import { buildFrankensteinFidelity } from './frankensteinFidelity';
import { applyLabRuntimeMaterials } from './labRuntimeMaterials';
import { mechanicalBody, articulatedFinger } from './labMechanicalGeometry';
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { Vec3 } from '../../ModelKit';
import { ZLKit, fitCreature, frontSurface, skinPanel } from './zombieLabTools';
const L = {
  steel: 0x536674,
  edge: 0x9ca9aa,
  dark: 0x202b32,
  rubber: 0x303637,
  cyan: 0x40d1e2,
  yellow: 0xc7a642,
  ceramic: 0xd5dedb,
  skin: 0x788a5d,
  leather: 0x252f37,
};
function ring(k: ZLKit, name: string, p: Vec3, r: number, t: number, color: number, axis: Vec3 = [0, 0, 1]): void {
  const m = k.torus(color, p, r, t, k.group, color === L.cyan ? 'glow' : 'metal');
  m.name = name;
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...axis).normalize());
}
function core(k: ZLKit, p: Vec3, r: number): void {
  ring(k, 'core-armored-bezel', p, r, 0.035, L.edge);
  ring(k, 'cyan-conductor-ring', [p[0], p[1], p[2] - 0.015], r * 0.8, 0.018, L.cyan);
  const m = k.cylinder(L.dark, p, r * 0.69, r * 0.69, 0.028, k.group, 18, 'metal');
  m.rotation.x = Math.PI / 2;
  m.name = 'recessed-core-face';
}
function braid(k: ZLKit, points: Vec3[], radius: number, steps = 13): void {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = path.computeFrenetFrames(steps, false);
  for (let strand = 0; strand < 3; strand++) {
    const pts: Vec3[] = [];
    for (let i = 0; i <= steps; i++) {
      const c = path.getPointAt(i / steps),
        a = (i / steps) * Math.PI * 2.2 + (strand * Math.PI * 2) / 3;
      c.addScaledVector(frames.normals[i], Math.cos(a) * radius * 0.55).addScaledVector(
        frames.binormals[i],
        Math.sin(a) * radius * 0.55,
      );
      pts.push(c.toArray() as [number, number, number]);
    }
    k.curve(
      'three-strand-insulated-cable-muscle',
      strand === 1 ? L.yellow : L.rubber,
      pts,
      [radius * 0.46, radius * 0.46],
      undefined,
      steps,
      6,
      'leather',
    );
  }
}
function gauntlet(k: ZLKit, p: Vec3, size: number, open = false): void {
  mechanicalBody(
    k,
    'tapered-integrated-metal-palm',
    L.steel,
    [
      [p[1] - 0.14 * size, 0.1 * size, 0.1 * size, p[0], p[2]],
      [p[1], 0.18 * size, 0.14 * size, p[0], p[2]],
      [p[1] + 0.13 * size, 0.14 * size, 0.11 * size, p[0], p[2]],
    ],
    6,
    8,
  );
  for (let i = 0; i < 4; i++) {
    const x = p[0] + (i - 1.5) * 0.08 * size;
    const pts: Vec3[] = open
      ? [
          [x, p[1], p[2] - 0.08 * size],
          [x + (i - 1.5) * 0.05 * size, p[1] - 0.2 * size, p[2] - 0.15 * size],
          [x + (i - 1.5) * 0.075 * size, p[1] - 0.32 * size, p[2] - 0.1 * size],
        ]
      : [
          [x, p[1], p[2] - 0.1 * size],
          [x, p[1] - 0.13 * size, p[2] - 0.23 * size],
          [x, p[1] - 0.16 * size, p[2] - 0.055 * size],
        ];
    articulatedFinger(k, pts, 0.036 * size, 0.029 * size, L.steel, L.dark);
  }
  k.curve(
    'mechanical-thumb',
    L.edge,
    [
      [p[0] - 0.13 * size, p[1] + 0.06 * size, p[2]],
      [p[0] - 0.23 * size, p[1] - 0.04 * size, p[2] - 0.07 * size],
      [p[0] - 0.19 * size, p[1] - 0.16 * size, p[2] - 0.15 * size],
    ],
    [0.055 * size, 0.05 * size, 0.025 * size],
    undefined,
    6,
    6,
    'metal',
  );
}
function steelFoot(k: ZLKit, x: number, z: number, size = 1): void {
  const shell = k.body(
    'single-armored-boot-shell',
    L.steel,
    [
      [0, 0.14 * size, 0.23 * size, x, z - 0.08],
      [0.045 * size, 0.2 * size, 0.26 * size, x, z - 0.09],
      [0.16 * size, 0.18 * size, 0.2 * size, x, z - 0.03],
      [0.33 * size, 0.1 * size, 0.12 * size, x, z + 0.02],
    ],
    8,
    12,
    'metal',
  );
  skinPanel(
    k,
    shell,
    [
      [x - 0.12 * size, 0.08 * size],
      [x + 0.12 * size, 0.08 * size],
      [x + 0.1 * size, 0.19 * size],
      [x - 0.1 * size, 0.19 * size],
    ],
    L.edge,
    'surface-fitted-boot-toe-armor',
    3,
    'metal',
    false,
    0.009,
  );
}
function sensor(k: ZLKit, y: number, z: number, width: number): void {
  k.plate(
    'focused-sensor-dark-recess',
    L.dark,
    [
      [-width, y + 0.025, z],
      [width, y + 0.025, z],
      [width * 0.78, y - 0.055, z - 0.025],
      [-width * 0.78, y - 0.055, z - 0.025],
    ],
    0.14,
    'metal',
  );
  k.plate(
    'single-cyan-sensor-slit',
    L.cyan,
    [
      [-width * 0.8, y + 0.008, z - 0.021],
      [width * 0.8, y + 0.008, z - 0.021],
      [width * 0.56, y - 0.018, z - 0.04],
      [-width * 0.56, y - 0.018, z - 0.04],
    ],
    0.007,
    'glow',
  );
}
function wireGolem(): THREE.Group {
  const k = new ZLKit(0.82);
  k.group.name = 'wireGolem';
  const trunk = mechanicalBody(
    k,
    'wire-golem-single-armored-trunk',
    L.steel,
    [
      [0.49, 0.21, 0.17],
      [0.66, 0.27, 0.22],
      [0.94, 0.37, 0.23],
      [1.14, 0.4, 0.24],
      [1.25, 0.26, 0.18],
    ],
    10,
    24,
  );
  k.part(
    'recessed-compact-head',
    L.steel,
    new ConvexGeometry(
      [
        [-0.13, 1.18, -0.12],
        [0.13, 1.18, -0.12],
        [-0.14, 1.31, -0.13],
        [0.14, 1.31, -0.13],
        [-0.09, 1.35, 0.02],
        [0.09, 1.35, 0.02],
        [-0.12, 1.2, 0.11],
        [0.12, 1.2, 0.11],
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    'metal',
  );
  sensor(k, 1.29, -0.16, 0.12);
  core(k, [0, 0.99, -0.255], 0.15);
  for (const side of [-1, 1]) {
    skinPanel(
      k,
      trunk,
      [
        [side * 0.06, 1.18],
        [side * 0.22, 1.18],
        [side * 0.32, 1.09],
        [side * 0.24, 0.84],
        [side * 0.12, 0.79],
      ],
      L.edge,
      'segmented-armored-chest-shell',
      3,
      'metal',
      false,
    );
    const p = frontSurface(trunk, side * 0.2, 0.86, 0.066);
    k.sphere(L.yellow, p, [0.018, 0.035, 0.009], k.group, 6, 'metal').name = 'functional-chest-identification-mark';
  }

  for (const side of [-1, 1]) {
    braid(
      k,
      [
        [side * 0.29, 1.17, 0],
        [side * 0.53, 1.01, 0],
        [side * 0.6, 0.7, -0.09],
        [side * 0.63, 0.43, -0.13],
      ],
      0.16,
    );
    ring(k, 'shoulder-armored-cable-socket', [side * 0.36, 1.15, 0], 0.19, 0.04, L.steel, [side, 0, 0]);
    ring(k, 'wrist-cable-socket', [side * 0.63, 0.47, -0.13], 0.13, 0.035, L.steel, [0, 1, 0]);
    gauntlet(k, [side * 0.63, 0.29, -0.13], 0.8);
    k.curve(
      'short-loaded-metal-leg',
      L.steel,
      [
        [side * 0.21, 0.65, 0],
        [side * 0.28, 0.43, 0.04],
        [side * 0.31, 0.24, 0],
      ],
      [0.14, 0.13, 0.1],
      undefined,
      9,
      10,
      'metal',
    );
    ring(k, 'knee-functional-hinge', [side * 0.3, 0.42, -0.1], 0.075, 0.02, L.dark);
    steelFoot(k, side * 0.31, 0, 0.9);
    k.plate(
      'yellow-shoulder-identification-band',
      L.yellow,
      [
        [side * 0.26, 1.28, -0.16],
        [side * 0.34, 1.28, -0.16],
        [side * 0.43, 1.11, -0.17],
        [side * 0.35, 1.11, -0.17],
      ],
      0.02,
      'metal',
    );
  }
  k.curve(
    'unbroken-back-insulated-loop',
    L.rubber,
    [
      [-0.32, 1.17, 0.12],
      [-0.31, 1.56, 0.12],
      [0, 1.67, 0.12],
      [0.31, 1.56, 0.12],
      [0.32, 1.17, 0.12],
    ],
    [0.055, 0.055, 0.055, 0.055, 0.055],
    undefined,
    18,
    8,
    'leather',
  );
  return fitCreature(k.group, false, 1.3);
}
function sparkBot(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'sparkBot';
  const chest = mechanicalBody(
    k,
    'aerodynamic-wedge-chest',
    L.steel,
    [
      [0.56, 0.09, 0.09, 0, 0.05],
      [0.77, 0.18, 0.12, 0, 0.02],
      [0.97, 0.23, 0.15, 0, -0.02],
      [1.07, 0.14, 0.12, 0, -0.07],
    ],
    12,
    12,
  );
  k.part(
    'swept-ridged-metal-helmet',
    L.steel,
    new ConvexGeometry(
      [
        [-0.07, 1.2, -0.29],
        [0.07, 1.2, -0.29],
        [-0.07, 1.21, -0.04],
        [0.07, 1.21, -0.04],
        [-0.14, 1.18, -0.15],
        [0.14, 1.18, -0.15],
        [-0.15, 1.1, -0.31],
        [0.15, 1.1, -0.31],
        [0, 1.13, -0.33],
        [-0.1, 1.06, 0.01],
        [0.1, 1.06, 0.01],
        [0, 1.055, -0.29],
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    'metal',
  );
  for (const side of [-1, 1])
    skinPanel(
      k,
      chest,
      [
        [side * 0.035, 0.99],
        [side * 0.16, 0.96],
        [side * 0.13, 0.82],
        [side * 0.045, 0.69],
      ],
      L.edge,
      'runner-swept-chest-armor',
      4,
      'metal',
      false,
    );
  sensor(k, 1.13, -0.33, 0.13);
  for (const side of [-1, 1]) {
    const z = side < 0 ? -0.21 : 0.21;
    k.curve(
      'spring-running-thigh',
      L.steel,
      [
        [side * 0.11, 0.64, 0.02],
        [side * 0.19, 0.46, z],
        [side * 0.19, 0.37, z],
      ],
      [0.075, 0.085, 0.06],
      undefined,
      9,
      8,
      'metal',
    );
    const knee = k.cylinder(L.dark, [side * 0.19, 0.39, z], 0.052, 0.052, 0.15, k.group, 12, 'metal');
    knee.rotation.z = Math.PI / 2;
    knee.name = 'runner-solid-knee-axle';
    const thighShell = mechanicalBody(
      k,
      'runner-separated-thigh-shell',
      L.steel,
      [
        [-0.13, 0.045, 0.05],
        [-0.09, 0.085, 0.075],
        [0.08, 0.075, 0.07],
        [0.12, 0.04, 0.045],
      ],
      6,
      12,
    );
    thighShell.position.set(side * 0.16, 0.51, z * 0.65);
    thighShell.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(side * 0.08, -0.18, z - 0.02).normalize(),
    );
    k.curve(
      'long-swept-runner-shin',
      L.steel,
      [
        [side * 0.19, 0.39, z],
        [side * 0.22, 0.18, -z * 0.5],
        [side * 0.24, 0.075, -z * 0.6],
      ],
      [0.05, 0.045, 0.025],
      undefined,
      8,
      7,
      'metal',
    );
    mechanicalBody(
      k,
      'seated-runner-heel-and-ankle',
      L.steel,
      [
        [0.012, 0.075, 0.065, side * 0.24, -z * 0.6 + 0.015],
        [0.055, 0.073, 0.075, side * 0.24, -z * 0.6 + 0.015],
        [0.095, 0.037, 0.04, side * 0.24, -z * 0.6 + 0.015],
      ],
      4,
      8,
    );
    const ankle = k.cylinder(L.dark, [side * 0.24, 0.085, -z * 0.6], 0.032, 0.032, 0.12, k.group, 8, 'metal');
    ankle.rotation.z = Math.PI / 2;
    ankle.name = 'visible-runner-ankle-hinge';
    for (let toe = 0; toe < 2; toe++) {
      const x = side * 0.24 + (toe - 0.5) * 0.065,
        z0 = -z * 0.6;
      k.part(
        'articulated-broad-split-runner-toe',
        L.steel,
        new ConvexGeometry(
          [
            [x - 0.023, 0.08, z0 + 0.015],
            [x + 0.023, 0.08, z0 + 0.015],
            [x - 0.03, 0.047, z0 - 0.13],
            [x + 0.03, 0.047, z0 - 0.13],
            [x - 0.028, 0.012, z0 - 0.13],
            [x + 0.028, 0.012, z0 - 0.13],
            [x - 0.023, 0.02, z0 + 0.015],
            [x + 0.023, 0.02, z0 + 0.015],
          ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
        ),
        'metal',
      );
    }
    k.curve(
      'slim-trailing-arm',
      L.steel,
      [
        [side * 0.2, 0.99, 0.03],
        [side * 0.31, 0.81, 0.1],
        [side * 0.4, 0.68, side < 0 ? -0.1 : 0.23],
      ],
      [0.055, 0.044, 0.025],
      undefined,
      10,
      7,
      'metal',
    );
    ring(k, 'arm-hinge', [side * 0.31, 0.81, 0.07], 0.038, 0.012, L.edge);
    gauntlet(k, [side * 0.4, 0.655, side < 0 ? -0.1 : 0.23], 0.3, side > 0);
    k.curve(
      'swept-fork-electrical-contact',
      L.dark,
      [
        [side * 0.13, 1.0, 0.13],
        [side * 0.22, 1.32, 0.1],
        [side * 0.26, 1.48, 0.04],
      ],
      [0.035, 0.03, 0.025],
      undefined,
      8,
      6,
      'metal',
    );
    k.curve(
      'fork-yellow-contact-tip',
      L.yellow,
      [
        [side * 0.24, 1.39, 0.07],
        [side * 0.26, 1.48, 0.04],
      ],
      [0.031, 0.025],
      undefined,
      3,
      6,
      'metal',
    );
  }
  k.curve(
    'visible-contact-arc',
    L.cyan,
    [
      [-0.25, 1.43, 0.05],
      [-0.13, 1.45, 0.03],
      [-0.04, 1.4, 0.05],
      [0.04, 1.46, 0.04],
      [0.13, 1.4, 0.05],
      [0.25, 1.43, 0.05],
    ],
    [0.009, 0.009, 0.009, 0.009, 0.009, 0.009],
    undefined,
    10,
    4,
    'glow',
  );
  k.group.rotation.x = -0.18;
  return fitCreature(k.group, false, 1.28);
}
function drone(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'drone';
  k.part(
    'low-faceted-aerodynamic-drone-hull',
    L.steel,
    new ConvexGeometry(
      [
        [0, 0.17, 0.04],
        [-0.22, 0.08, 0.14],
        [0.22, 0.08, 0.14],
        [-0.19, 0.03, -0.21],
        [0.19, 0.03, -0.21],
        [0, 0.045, -0.32],
        [-0.15, -0.08, 0.1],
        [0.15, -0.08, 0.1],
        [0, -0.075, -0.23],
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    'metal',
  );
  for (const side of [-1, 1])
    k.plate(
      'drone-top-faceted-shell-panel',
      L.edge,
      [
        [side * 0.03, 0.171, 0.03],
        [side * 0.18, 0.09, 0.12],
        [side * 0.15, 0.055, -0.18],
        [side * 0.035, 0.115, -0.12],
      ],
      0.008,
      'metal',
    );
  sensor(k, 0.045, -0.335, 0.12);
  k.curve(
    'drone-recessed-hull-access-seam',
    L.dark,
    [
      [0, 0.174, 0.03],
      [0, 0.123, -0.12],
      [0, 0.052, -0.275],
    ],
    [0.007, 0.007, 0.005],
    undefined,
    8,
    4,
    'metal',
  );
  for (const side of [-1, 1]) {
    k.box(L.dark, [side * 0.49, 0.052, 0.03], [0.028, 0.018, 0.47], k.group, 0.005, 'metal').name =
      'rotor-underplane-cross-brace';
    k.curve(
      'rotor-structural-pylon',
      L.steel,
      [
        [side * 0.15, 0.04, 0],
        [side * 0.35, 0.08, 0.03],
        [side * 0.49, 0.09, 0.03],
      ],
      [0.055, 0.055, 0.055],
      undefined,
      6,
      8,
      'metal',
    );
    const guard = k.part(
      'closed-thick-annular-rotor-guard',
      L.steel,
      new THREE.LatheGeometry(
        [
          [0.225, -0.045],
          [0.255, -0.045],
          [0.255, 0.045],
          [0.225, 0.045],
          [0.225, -0.045],
        ].map((p) => new THREE.Vector2(...(p as [number, number]))),
        24,
      ),
      'metal',
    );
    guard.position.set(side * 0.49, 0.09, 0.03);
    k.plate(
      'rotor-guard-yellow-identification',
      L.yellow,
      [
        [side * 0.49 - 0.055, 0.065, -0.231],
        [side * 0.49 + 0.055, 0.065, -0.231],
        [side * 0.49 + 0.055, 0.12, -0.231],
        [side * 0.49 - 0.055, 0.12, -0.231],
      ],
      0.005,
      'metal',
    );
    ring(k, 'rotor-cyan-edge', [side * 0.49, 0.137, 0.03], 0.24, 0.009, L.cyan, [0, 1, 0]);
    k.cylinder(L.dark, [side * 0.49, 0.09, 0.03], 0.045, 0.045, 0.07, k.group, 10, 'metal').name =
      'propeller-motor-hub';
    for (let blade = 0; blade < 3; blade++) {
      const a = (blade * Math.PI * 2) / 3;
      const pts: Vec3[] = [
        [side * 0.49, 0.11, 0.03],
        [side * 0.49 + Math.cos(a) * 0.19, 0.11, 0.03 + Math.sin(a) * 0.19],
        [side * 0.49 + Math.cos(a + 0.26) * 0.19, 0.11, 0.03 + Math.sin(a + 0.26) * 0.19],
        [side * 0.49 + Math.cos(a + 0.4) * 0.05, 0.11, 0.03 + Math.sin(a + 0.4) * 0.05],
      ];
      k.plate('actual-rotor-propeller-blade', L.dark, pts, 0.008, 'metal');
    }
    k.curve(
      'landing-skid-u-brace',
      L.dark,
      [
        [side * 0.12, -0.04, -0.1],
        [side * 0.18, -0.2, -0.1],
        [side * 0.18, -0.2, 0.14],
        [side * 0.12, -0.04, 0.14],
      ],
      [0.02, 0.02, 0.02, 0.02],
      undefined,
      10,
      6,
      'metal',
    );
  }
  return fitCreature(k.group, false, 0.6);
}
function lightningGolem(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'lightningGolem';
  const chest = mechanicalBody(
    k,
    'tall-tapered-conductor-torso',
    L.steel,
    [
      [0.93, 0.21, 0.18],
      [1.3, 0.29, 0.23],
      [1.83, 0.47, 0.3],
      [2.18, 0.61, 0.31],
      [2.37, 0.42, 0.23],
    ],
    16,
    24,
  );
  k.part(
    'angular-vertical-strike-helmet',
    L.steel,
    new ConvexGeometry(
      [
        [-0.18, 2.56, -0.12],
        [0.18, 2.56, -0.12],
        [0, 2.67, -0.01],
        [-0.19, 2.44, -0.25],
        [0.19, 2.44, -0.25],
        [0, 2.34, -0.22],
        [-0.16, 2.31, 0.06],
        [0.16, 2.31, 0.06],
        [-0.17, 2.52, 0.12],
        [0.17, 2.52, 0.12],
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    'metal',
  );
  k.plate(
    'vertical-strike-mask-recess',
    L.dark,
    [
      [-0.13, 2.55, -0.2],
      [0.13, 2.55, -0.2],
      [0.14, 2.42, -0.27],
      [0, 2.33, -0.25],
      [-0.14, 2.42, -0.27],
    ],
    0.016,
    'metal',
  );
  k.plate(
    'vertical-strike-cyan-face-mark',
    L.cyan,
    [
      [-0.025, 2.53, -0.225],
      [0.025, 2.53, -0.225],
      [0.02, 2.39, -0.28],
      [0, 2.35, -0.275],
      [-0.02, 2.39, -0.28],
    ],
    0.008,
    'glow',
  );
  skinPanel(
    k,
    chest,
    [
      [-0.055, 2.2],
      [0.055, 2.2],
      [0.045, 1.35],
      [0, 1.2],
      [-0.045, 1.35],
    ],
    L.cyan,
    'surface-fit-vertical-cyan-core',
    7,
    'glow',
    false,
  );
  for (const side of [-1, 1])
    skinPanel(
      k,
      chest,
      [
        [side * 0.1, 2.22],
        [side * 0.43, 2.21],
        [side * 0.47, 2.08],
        [side * 0.23, 1.48],
        [side * 0.09, 1.29],
      ],
      L.edge,
      'large-articulated-thunder-chest-plate',
      6,
      'metal',
      false,
    );
  for (const side of [-1, 1]) {
    k.curve(
      'long-storm-titan-thigh',
      L.steel,
      [
        [side * 0.18, 1.08, 0],
        [side * 0.32, 0.77, 0.04],
        [side * 0.38, 0.56, 0.03],
      ],
      [0.18, 0.19, 0.13],
      undefined,
      13,
      12,
      'metal',
    );
    ring(k, 'titan-knee-hinge', [side * 0.38, 0.59, -0.12], 0.1, 0.025, L.dark);
    k.body(
      'long-integrated-flared-shin',
      L.steel,
      [
        [0.18, 0.19, 0.17, side * 0.45, -0.03],
        [0.36, 0.16, 0.14, side * 0.43, 0.02],
        [0.63, 0.1, 0.11, side * 0.38, 0.03],
      ],
      12,
      12,
      'metal',
    );
    steelFoot(k, side * 0.45, -0.04, 1.2);
    const hand: Vec3 = [side * 1.0, side < 0 ? 0.53 : 1.05, -0.2];
    const armStart = k.group.children.length;
    k.curve(
      'titan-integrated-arm-plate',
      L.dark,
      [
        [side * 0.48, 2.22, 0],
        [side * 0.78, 2.06, -0.02],
        [side * 0.88, 1.64, -0.07],
        [hand[0] * 0.98, hand[1] + 0.22, hand[2] + 0.025],
        hand,
      ],
      [0.17, 0.18, 0.075, 0.16, 0.105],
      undefined,
      20,
      12,
      'metal',
    );
    const shoulder = mechanicalBody(
      k,
      'curved-fitted-shoulder-armor',
      L.steel,
      [
        [-0.17, 0.19, 0.2],
        [-0.1, 0.27, 0.24],
        [0.12, 0.27, 0.24],
        [0.19, 0.19, 0.18],
      ],
      8,
      16,
    );
    shoulder.position.set(side * 0.65, 2.13, -0.01);
    shoulder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(side * 0.88, -0.47, -0.05).normalize(),
    );
    const armPath = new THREE.CatmullRomCurve3(
      [
        [side * 0.48, 2.22, 0],
        [side * 0.78, 2.06, -0.02],
        [side * 0.88, 1.64, -0.07],
        [hand[0] * 0.98, hand[1] + 0.22, hand[2] + 0.025],
        hand,
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    const casingCenter = armPath.getPointAt(0.79),
      casingAxis = armPath.getTangentAt(0.79);
    const casing = k.body(
      'beveled-articulated-forearm-casing',
      L.steel,
      [
        [-0.24, 0.13, 0.12],
        [-0.18, 0.2, 0.18],
        [0.16, 0.22, 0.19],
        [0.24, 0.145, 0.13],
      ],
      6,
      8,
      'metal',
    );
    casing.position.copy(casingCenter);
    casing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), casingAxis);
    const axle = k.cylinder(L.steel, [side * 0.88, 1.64, -0.16], 0.105, 0.105, 0.22, k.group, 12, 'metal');
    axle.rotation.x = Math.PI / 2;
    axle.name = 'seated-mechanical-elbow-axle';
    for (let i = 0; i < 3; i++) {
      const t = 0.59 + i * 0.09,
        center = armPath.getPointAt(t),
        axis = armPath.getTangentAt(t);
      ring(
        k,
        'seated-white-ceramic-arm-insulator',
        center.toArray() as Vec3,
        0.23,
        0.035,
        L.ceramic,
        axis.toArray() as Vec3,
      );
    }
    gauntlet(k, hand, 1.1, side < 0);
    const arm = new THREE.Group(),
      pivot = new THREE.Vector3(side * 0.48, 2.22, 0);
    arm.name = 'complete-posed-storm-arm-assembly';
    for (const part of k.group.children.slice(armStart)) {
      arm.add(part);
      part.position.sub(pivot);
    }
    arm.position.copy(pivot);
    arm.rotation.set(side < 0 ? 0.45 : -0.1, 0, side < 0 ? -0.08 : 0.04);
    k.group.add(arm);

    k.curve(
      'swept-tesla-tower-support',
      L.steel,
      [
        [side * 0.48, 2.18, 0.1],
        [side * 0.57, 2.54, 0.11],
        [side * 0.61, 2.95, 0.12],
      ],
      [0.13, 0.1, 0.075],
      undefined,
      14,
      10,
      'metal',
    );
    for (let i = 0; i < 4; i++) {
      ring(
        k,
        'large-coil-insulator-disc',
        [side * (0.56 + i * 0.013), 2.52 + i * 0.12, 0.11],
        0.14 - i * 0.013,
        0.028,
        L.ceramic,
        [0, 1, 0],
      );
      ring(
        k,
        'cyan-coil-winding',
        [side * (0.56 + i * 0.013), 2.55 + i * 0.12, 0.11],
        0.105 - i * 0.01,
        0.016,
        L.cyan,
        [0, 1, 0],
      );
    }
    k.plate(
      'large-yellow-shin-marking',
      L.yellow,
      [
        [side * 0.45 - 0.08, 0.25, -0.21],
        [side * 0.45 + 0.08, 0.25, -0.21],
        [side * 0.4 + 0.06, 0.48, -0.13],
        [side * 0.4 - 0.025, 0.48, -0.13],
      ],
      0.015,
      'metal',
    );
  }
  k.curve(
    'controlled-tower-lightning-arc',
    L.yellow,
    [
      [-0.6, 2.97, 0.12],
      [-0.37, 3.01, 0.12],
      [-0.17, 2.95, 0.12],
      [0.03, 3.04, 0.12],
      [0.25, 2.96, 0.12],
      [0.6, 2.97, 0.12],
    ],
    [0.018, 0.018, 0.018, 0.018, 0.018, 0.018],
    undefined,
    12,
    5,
    'glow',
  );
  return fitCreature(k.group, true, 3.22);
}
export function buildLabMonster(id: string, _color: number): THREE.Group | undefined {
  const group =
    id === 'wireGolem' ? wireGolem() : id === 'sparkBot' ? sparkBot() : id === 'drone' ? drone() : undefined;
  if (group) applyLabRuntimeMaterials(group, id);
  return group;
}
export function buildLabBoss(id: string): THREE.Group | undefined {
  const group =
    id === 'lightningGolem' ? lightningGolem() : id === 'frankenstein' ? buildFrankensteinFidelity() : undefined;
  if (group) applyLabRuntimeMaterials(group, id);
  return group;
}
