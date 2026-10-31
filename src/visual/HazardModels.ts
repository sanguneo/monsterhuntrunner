import * as THREE from 'three';
import { WORLDS } from '../data/worlds';
import type { ObstacleType } from '../entities/Obstacle';
import { SculptKit } from './SculptKit';
import { bakeStaticModel } from './ModelKit';

const templates = new Map<string, THREE.Group>();
const cream = 0xe9d6ac,
  iron = 0x526575;
/** Visuals use absolute ground-relative coordinates; collision dimensions stay in Obstacle. */
export function createHazardModel(type: ObstacleType, world: number): THREE.Group {
  const key = `${world}:${type}`;
  const cached = templates.get(key);
  if (cached) return cached.clone(true);
  const k = new SculptKit(),
    theme = WORLDS[world].theme;
  const c = type === 'LOW' ? theme.obsLow : type === 'HIGH' ? theme.obsHigh : theme.obsBlock;
  const box = (color: number, x: number, y: number, z: number, w: number, h: number, d: number) =>
    k.box(color, [x, y, z], [w, h, d], undefined, Math.min(0.045, h / 5), 'leather');
  // Curves are deliberately tapered; no sphere-stack joints or recolored sign fallback.
  const curve = (color: number, pts: [number, number, number][], radii: number[], steps = 16) =>
    k.sweep(color, pts, radii, undefined, undefined, 'cloth', steps);
  const bone = (x1: number, y1: number, x2: number, y2: number, z = 0) => {
    curve(
      cream,
      [
        [x1, y1, z],
        [x1 * 0.65 + x2 * 0.35, y1 * 0.65 + y2 * 0.35 + 0.035, z],
        [x1 * 0.35 + x2 * 0.65, y1 * 0.35 + y2 * 0.65 + 0.035, z],
        [x2, y2, z],
      ],
      [0.1, 0.065, 0.065, 0.1],
    );
  };
  const coral = (x: number, y: number, height: number, color: number, lean = 0.12) => {
    curve(
      color,
      [
        [x, y, 0],
        [x + lean * 0.2, y + height * 0.35, 0],
        [x + lean, y + height * 0.76, 0.015],
        [x + lean * 0.8, y + height, 0],
      ],
      [0.11, 0.105, 0.1, 0.095, 0.09, 0.085, 0.08, 0.075, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04, 0],
    );
    for (const level of [0.25, 0.52])
      for (const side of [-1, 1])
        curve(
          color,
          [
            [x + lean * 0.2, y + height * level, 0],
            [x + side * 0.25, y + height * (level + 0.12), -0.02],
            [x + side * 0.32, y + height * (level + 0.27), 0],
          ],
          [0.065, 0.063, 0.06, 0.057, 0.054, 0.051, 0.048, 0.045, 0.04, 0],
          12,
        );
  };
  if (type === 'PIT') {
    // The continuous runner floor cannot be excavated per pooled obstacle. An opaque
    // depth-painted opening sits 2mm above it; concentric inward-darkening facets
    // communicate a recess without a raised tray or z-fighting. Not a physical cutout.
    const edgeColors = [0x777a8a, 0x736459, 0x536d76, 0x6d9495, 0x827386, 0xa79b84];
    const points: [number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      const square = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const irregular = world === 2 ? 1 : 1 - 0.035 * (1 + Math.sin(i * 2.31 + world));
      points.push([Math.cos(a) * square * 0.94 * irregular, Math.sin(a) * square * 1.19 * irregular]);
    }
    for (let band = 0; band < 4; band++) {
      const outer = 1 - band * 0.075,
        inner = outer - 0.075;
      const vertices: number[] = [],
        indices: number[] = [];
      for (const [x, z] of points)
        vertices.push(x * outer, 0.005 + band * 0.001, z * outer, x * inner, 0.006 + band * 0.001, z * inner);
      for (let i = 0; i < 24; i++) {
        const a = i * 2,
          b = ((i + 1) % 24) * 2;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      const color = new THREE.Color(edgeColors[world]).multiplyScalar([0.8, 0.38, 0.16, 0.055][band]);
      const m = k.mesh(g, color.getHex());
      m.material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    }
    const opening = new THREE.Shape();
    points.forEach(([x, z], i) => (i ? opening.lineTo(x * 0.8, -z * 0.8) : opening.moveTo(x * 0.8, -z * 0.8)));
    opening.closePath();
    const dark = k.mesh(new THREE.ShapeGeometry(opening), 0x020308, [0, 0.003, 0]);
    dark.rotation.x = -Math.PI / 2;
    dark.material = new THREE.MeshBasicMaterial({ color: 0x020308, side: THREE.DoubleSide });
    // Broken tile ends / soil cracks / service hatch teeth / shells / gothic masonry / bone fragments.
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 0.63;
        if (world === 3)
          curve(
            0xa4c5bf,
            [
              [side * 0.88, 0.018, z - 0.09],
              [side * 0.94, 0.025, z],
              [side * 0.89, 0.018, z + 0.09],
            ],
            [0.018, 0.025, 0.01],
            8,
          );
        else if (world === 5)
          curve(
            cream,
            [
              [side * 0.88, 0.017, z - 0.12],
              [side * 0.91, 0.02, z],
              [side * 0.9, 0.017, z + 0.13],
            ],
            [0.022, 0.014, 0.022],
            8,
          );
        else box(edgeColors[world], side * 0.9, 0.012, z, 0.07, 0.016, world === 2 ? 0.18 : 0.29);
      }
  } else if (type === 'LOW') {
    if (world === 0) {
      // An overturned classroom desk, clear 0.8 m hurdle silhouette.
      box(c, 0, 0.57, 0, 1.65, 0.19, 0.59);
      box(cream, 0, 0.68, 0, 1.72, 0.065, 0.6);
      for (const x of [-0.68, 0.68]) box(iron, x, 0.28, 0, 0.075, 0.56, 0.42);
      for (const x of [-0.4, 0.05, 0.45]) box(x === 0.05 ? 0xd8b676 : 0x7e738a, x, 0.75, 0, 0.32, 0.08, 0.35);
    } else if (world === 1) {
      for (const x of [-0.68, -0.34, 0, 0.34, 0.68]) box(c, x, 0.36, 0, 0.21, 0.72, 0.16);
      for (const y of [0.18, 0.53]) {
        const b = box(cream, 0, y, -0.12, 1.68, 0.1, 0.1);
        b.rotation.z = 0.025;
      }
    } else if (world === 2) {
      box(iron, 0, 0.22, 0, 1.7, 0.44, 0.56);
      box(c, 0, 0.5, 0, 1.55, 0.18, 0.52);
      for (const x of [-0.65, 0, 0.65])
        k.sweep(
          c,
          [
            [x, 0.48, 0],
            [x, 0.65, 0],
            [x + 0.12, 0.69, 0.08],
          ],
          [0.09, 0.09, 0.07],
          undefined,
          undefined,
          'metal',
          12,
        );
      for (const x of [-0.45, 0, 0.45]) box(cream, x, 0.25, -0.29, 0.17, 0.055, 0.02);
    } else if (world === 3) {
      // Three branching colonies, not a row of isolated teeth.
      for (const [x, h, lean] of [
        [-0.52, 0.64, 0.11],
        [0, 0.77, -0.08],
        [0.52, 0.66, -0.12],
      ])
        coral(x, 0.01, h, c, lean);
    } else if (world === 4) {
      box(c, 0, 0.32, 0, 1.64, 0.64, 0.55);
      box(cream, 0, 0.67, 0, 1.7, 0.07, 0.58);
      for (const x of [-0.66, 0.66]) box(iron, x, 0.34, -0.29, 0.09, 0.59, 0.04);
      k.torus(cream, [0, 0.39, -0.3], 0.12, 0.02, undefined, 'metal');
    } else {
      // Fallen ribs and crossed long bones, with no suitcase-like foundation box.
      bone(-0.75, 0.12, 0.74, 0.55, -0.06);
      bone(-0.72, 0.54, 0.72, 0.12, 0.07);
      for (const x of [-0.6, 0, 0.6])
        curve(
          cream,
          [
            [x - 0.17, 0.03, 0.04],
            [x - 0.2, 0.38, 0.02],
            [x, 0.72, 0],
            [x + 0.2, 0.38, 0.02],
            [x + 0.17, 0.03, 0.04],
          ],
          [0.04, 0.055, 0.065, 0.055, 0.04],
        );
    }
  } else if (type === 'HIGH') {
    if (world === 0) {
      // Fabric school pennant: bowed hem, folds and hanging rope, not rigid signage.
      const g = new THREE.PlaneGeometry(1.76, 1.02, 16, 8),
        p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i);
        p.setXYZ(i, x, y + 1.63 + 0.07 * Math.cos(x * 5) * (0.51 - y), 0.055 * Math.sin(x * 12));
      }
      g.computeVertexNormals();
      k.mesh(g, c).material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide });
      curve(
        cream,
        [
          [-0.9, 2.19, 0],
          [0, 2.12, 0],
          [0.9, 2.19, 0],
        ],
        [0.025, 0.025, 0.025],
      );
      for (const x of [-0.62, -0.31, 0, 0.31, 0.62]) {
        const flag = new THREE.Shape();
        flag.moveTo(-0.1, 0);
        flag.lineTo(0.1, 0);
        flag.lineTo(0, -0.17);
        flag.closePath();
        k.shape(cream, flag, 0.015, [x, 1.28, -0.065]);
      }
    } else if (world === 1) {
      // Fallen timber lintel: bowed beam and diagonal weathered braces.
      curve(
        0x766049,
        [
          [-0.88, 1.35, 0],
          [-0.4, 1.3, 0],
          [0.35, 1.37, 0],
          [0.88, 1.43, 0],
        ],
        [0.16, 0.15, 0.14, 0.13],
      );
      for (const side of [-1, 1]) {
        const post = box(0x766049, side * 0.85, 0.69, 0, 0.12, 1.38, 0.22);
        post.rotation.z = side * 0.035;
        curve(
          cream,
          [
            [side * 0.84, 0.92, 0.02],
            [side * 0.68, 1.65, 0.02],
            [side * 0.6, 2.15, 0.02],
          ],
          [0.07, 0.065, 0.035],
        );
      }
      for (const x of [-0.55, -0.18, 0.22, 0.6]) {
        const b = box(0x766049, x, 1.76, 0.045, 0.28, 0.7, 0.15);
        b.rotation.z = x * 0.13;
      }
    } else if (world === 2) {
      // Industrial bent duct with a deliberately continuous low horizontal pipe.
      curve(
        c,
        [
          [-0.8, 0, 0],
          [-0.8, 1.12, 0],
          [-0.64, 1.2, 0],
          [0.64, 1.2, 0],
          [0.8, 1.12, 0],
          [0.8, 0, 0],
        ],
        [0.1, 0.13, 0.14, 0.14, 0.13, 0.1],
        28,
      );
      for (const x of [-0.5, 0.5]) {
        k.torus(cream, [x, 1.2, 0], 0.16, 0.025, undefined, 'metal').rotation.y = Math.PI / 2;
        curve(
          iron,
          [
            [x, 1.2, 0],
            [x, 1.92, 0],
            [x * 0.7, 2.12, 0],
          ],
          [0.07, 0.07, 0.07],
        );
      }
      curve(
        iron,
        [
          [0, 1.2, 0],
          [0, 1.45, -0.08],
          [0, 1.71, -0.11],
        ],
        [0.055, 0.045, 0.04],
      );
      k.torus(cream, [0, 1.71, -0.13], 0.19, 0.025, undefined, 'metal');
      for (const a of [0, Math.PI / 2]) {
        const spoke = box(cream, 0, 1.71, -0.13, 0.34, 0.025, 0.025);
        spoke.rotation.z = a;
      }
    } else if (world === 3) {
      // Living branching coral arch; lowest span deliberately marks slide clearance.
      for (const side of [-1, 1]) {
        curve(
          c,
          [
            [side * 0.88, 0.02, 0],
            [side * 0.83, 0.75, 0],
            [side * 0.68, 1.35, 0],
            [side * 0.3, 1.5, 0],
            [0, 1.48, 0],
          ],
          [0.09, 0.11, 0.13, 0.11, 0.1],
        );
        curve(
          c,
          [
            [side * 0.68, 1.35, 0],
            [side * 0.72, 1.8, 0.02],
            [side * 0.54, 2.17, 0],
          ],
          [0.1, 0.07, 0],
        );
        curve(
          0xdba7b8,
          [
            [side * 0.71, 1.65, 0],
            [side * 0.38, 1.82, 0],
            [side * 0.25, 2.03, 0],
          ],
          [0.055, 0.04, 0],
        );
      }
      curve(
        c,
        [
          [-0.68, 1.36, 0],
          [0, 1.17, 0],
          [0.68, 1.36, 0],
        ],
        [0.1, 0.1, 0.1],
      );
    } else if (world === 4) {
      // Suspended wrought chandelier: chain, sweeping arms, wax cups and candles.
      curve(
        iron,
        [
          [0, 2.2, 0],
          [0, 1.85, 0],
          [0, 1.23, 0],
        ],
        [0.035, 0.035, 0.055],
      );
      for (const side of [-1, 1])
        curve(
          iron,
          [
            [0, 1.3, 0],
            [side * 0.4, 1.13, 0],
            [side * 0.8, 1.4, 0],
            [side * 0.82, 1.65, 0],
          ],
          [0.065, 0.055, 0.045, 0.03],
        );
      for (const x of [-0.78, -0.4, 0, 0.4, 0.78]) {
        const y = 1.48 + Math.abs(x) * 0.14;
        if (Math.abs(x) === 0.4)
          curve(
            iron,
            [
              [0, 1.3, 0],
              [x * 0.65, 1.25, 0],
              [x, y, 0],
            ],
            [0.045, 0.04, 0.03],
          );
        k.loft(
          cream,
          [
            [0, 0.08, 0.07],
            [0.05, 0.07, 0.065],
            [0.3, 0.055, 0.05],
            [0.31, 0.05, 0.05],
          ],
          [x, y, 0],
          undefined,
          'cloth',
          6,
          10,
        );
        k.sphere(0xffd293, [x, y + 0.38, 0], [0.035, 0.085, 0.025], undefined, 10, 'glow');
      }
    } else {
      // Rib-vault gate with curved long-bone lintel, never a purple rectangular sign.
      for (const side of [-1, 1])
        curve(
          cream,
          [
            [side * 0.88, 0.02, 0],
            [side * 0.87, 0.85, 0],
            [side * 0.72, 1.54, 0],
            [side * 0.3, 1.95, 0],
            [0, 2.17, 0],
          ],
          [0.07, 0.08, 0.09, 0.075, 0.035],
        );
      bone(-0.84, 1.17, 0.84, 1.17);
      for (const x of [-0.5, 0, 0.5])
        curve(
          cream,
          [
            [x, 1.22, 0],
            [x * 0.92, 1.52, 0],
            [x * 0.7, 1.85, 0],
          ],
          [0.045, 0.04, 0.02],
        );
    }
  } else {
    if (world === 0) {
      box(iron, 0, 1.5, 0, 1.86, 3, 0.78);
      box(c, 0, 1.5, -0.41, 1.7, 2.83, 0.07);
      for (const y of [0.4, 0.51, 2.48, 2.59]) box(iron, 0, y, -0.46, 1.22, 0.035, 0.02);
      box(cream, 0.6, 1.5, -0.48, 0.07, 0.27, 0.05);
      box(cream, 0, 2.15, -0.46, 0.4, 0.18, 0.025);
    } else if (world === 1) {
      for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) box(c, x, 1.5, 0, 0.27, 3, 0.55);
      for (const y of [0.55, 1.5, 2.45]) {
        const plank = box(cream, 0, y, -0.32, 1.84, 0.16, 0.12);
        plank.rotation.z = 0.08;
      }
    } else if (world === 2) {
      box(iron, 0, 1.5, 0, 1.85, 3, 0.75);
      box(c, 0, 1.5, -0.4, 1.6, 2.74, 0.06);
      for (const x of [-0.5, 0, 0.5]) {
        box(iron, x, 1.4, -0.46, 0.24, 1.8, 0.06);
        box(0x8fd5ca, x, 1.4, -0.5, 0.055, 1.48, 0.025);
      }
      box(cream, 0, 2.65, -0.46, 0.6, 0.13, 0.025);
    } else if (world === 3) {
      // Tall branching reef fans fill the lane; a low continuous reef foot prevents
      // empty lower gaps from falsely suggesting this is an overhead hazard.
      k.loft(
        c,
        [
          [0, 0.87, 0.34],
          [0.2, 0.88, 0.35],
          [0.65, 0.76, 0.3],
          [0.85, 0.55, 0.23],
          [0.95, 0, 0],
        ],
        undefined,
        undefined,
        'cloth',
        10,
        16,
      );
      for (const [x, h, lean] of [
        [-0.52, 2.6, 0.12],
        [0, 3, -0.06],
        [0.52, 2.72, -0.1],
      ])
        coral(x, 0.02, h, 0x568e8f, lean);
      for (const [x, h, lean] of [
        [-0.3, 1.8, -0.12],
        [0.32, 2.05, 0.1],
      ])
        coral(x, 0.05, h, 0xd7abae, lean);
    } else if (world === 4) {
      // Pointed gothic tracery over a solid stone gate; pointed silhouette is legible
      // before the fine inset detail. Avoid generic brick wall with applied cross.
      const arch = new THREE.Shape();
      arch.moveTo(-0.92, 0);
      arch.lineTo(-0.92, 2.14);
      arch.bezierCurveTo(-0.9, 2.5, -0.42, 2.75, 0, 3);
      arch.bezierCurveTo(0.42, 2.75, 0.9, 2.5, 0.92, 2.14);
      arch.lineTo(0.92, 0);
      arch.closePath();
      k.shape(c, arch, 0.7, [0, 0, -0.35]);
      for (const side of [-1, 1])
        curve(
          cream,
          [
            [side * 0.76, 0.12, -0.39],
            [side * 0.76, 2.1, -0.39],
            [side * 0.45, 2.55, -0.39],
            [0, 2.83, -0.39],
          ],
          [0.045, 0.045, 0.04, 0.02],
        );
      curve(
        iron,
        [
          [0, 0.1, -0.4],
          [0, 1.5, -0.4],
          [0, 2.78, -0.4],
        ],
        [0.035, 0.035, 0.025],
      );
      for (const y of [0.55, 1.15, 1.75])
        curve(
          iron,
          [
            [-0.72, y, -0.4],
            [0, y + 0.08, -0.4],
            [0.72, y, -0.4],
          ],
          [0.025, 0.025, 0.025],
        );
    } else {
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 2; col++) box(c, (col - 0.5) * 0.91, 0.3 + row * 0.6, 0, 0.87, 0.56, 0.72);
      // Skull relief actually reads as skull: cranium, eye cavities and short jaw.
      k.loft(
        cream,
        [
          [0, 0.22, 0.1],
          [0.18, 0.29, 0.12],
          [0.45, 0.38, 0.16],
          [0.7, 0.3, 0.13],
          [0.78, 0, 0],
        ],
        [0, 1.45, -0.42],
        undefined,
        'cloth',
        12,
        16,
      );
      for (const x of [-0.14, 0.14]) k.sphere(0x322b42, [x, 1.88, -0.575], [0.09, 0.12, 0.018], undefined, 12);
      for (const x of [-0.15, 0, 0.15]) box(cream, x, 1.48, -0.46, 0.1, 0.17, 0.12);
      bone(-0.63, 0.4, 0.63, 1.18, -0.4);
      bone(-0.63, 1.18, 0.63, 0.4, -0.4);
    }
  }

  k.group.name = `${WORLDS[world].id}-${type.toLowerCase()}`;
  const result = bakeStaticModel(k.group);
  templates.set(key, result);
  return result.clone(true);
}
