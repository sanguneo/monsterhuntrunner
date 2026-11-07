import { seaWitchCrown } from './sea-witch-fitted-crown';
import * as THREE from 'three';
import type { Vec3 } from '../../ModelKit';
import { SeaSkullKit } from './sea-skull-kit';
import { createAuthoredKrakenGeometry, krakenAuthoredEyeSockets } from './kraken-authored-geometry';
import { createKrakenBakedMaterial } from './kraken-baked-surfaces';
import { dressSeaCreature } from './sea-surface-art';
import { addAquaticRegalia } from './sea-witch-regalia';
import { createAuthoredFishBody, fishEyeSockets } from './sea-authored-fish-geometry';
import { addAuthoredSeaWitchFace } from './sea-witch-face-model';

/** Corneal pigmentation follows the same curved ellipsoid, not a flat pupil disk. */
function fishIrisGeometry(
  rx: number,
  ry: number,
  rz: number,
  width: number,
  height: number,
  axis: 'front' | number,
): THREE.BufferGeometry {
  const p: number[] = [],
    n: number[] = [],
    uv: number[] = [],
    ix: number[] = [];
  const sides = 16,
    rings = 3;
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        r = j / rings,
        u = Math.cos(a) * width * r,
        v = Math.sin(a) * height * r;
      const y = v;
      let x: number, z: number;
      if (axis === 'front') {
        x = u;
        z = -rz * Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx) - (y * y) / (ry * ry))) - 0.0007;
      } else {
        z = u;
        x = axis * (rx * Math.sqrt(Math.max(0, 1 - (z * z) / (rz * rz) - (y * y) / (ry * ry))) + 0.0007);
      }
      p.push(x, y, z);
      const normal = new THREE.Vector3(x / (rx * rx), y / (ry * ry), z / (rz * rz)).normalize();
      n.push(...normal.toArray());
      uv.push(0.5 + 0.5 * Math.cos(a) * r, 0.5 + 0.5 * Math.sin(a) * r);
      if (j < rings && i < sides) {
        const q = j * (sides + 1) + i,
          b = q + sides + 1;
        ix.push(...(j === 0 ? [q, b, b + 1] : [q, b, b + 1, q, b + 1, q + 1]));
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  for (let i = 0; i < ix.length; i += 3) {
    const a = new THREE.Vector3().fromArray(p, ix[i] * 3),
      b = new THREE.Vector3().fromArray(p, ix[i + 1] * 3),
      c = new THREE.Vector3().fromArray(p, ix[i + 2] * 3),
      no = new THREE.Vector3().fromArray(n, ix[i] * 3);
    if (b.sub(a).cross(c.sub(a)).dot(no) < 0) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
  }
  g.setIndex(ix);
  return g;
}

function shark(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-sharkFin';
  const [g, oral] = createAuthoredFishBody('sharkFin');
  const oralMesh = k.mesh(oral, 0x241a22);
  oralMesh.name = 'true-shark-orbital-oral-branchial-cavities';
  const body = k.mesh(g, 0x315a78);
  body.name = 'shark-continuous-hydrodynamic-body';
  const belly = g.clone(),
    bp = belly.getAttribute('position'),
    bi = belly.index!,
    ids: number[] = [];
  for (let i = 0; i < bi.count; i += 3) {
    const a = bi.getX(i),
      b = bi.getX(i + 1),
      c = bi.getX(i + 2);
    if ((bp.getY(a) + bp.getY(b) + bp.getY(c)) / 3 < -0.035) ids.push(a, b, c);
  }
  belly.setIndex(ids);
  k.mesh(belly, 0xcbd9d6).name = 'conformed-shark-countershade';
  k.blade(
    0x284b68,
    [
      [0, 0.12, -0.1],
      [0, 0.47, 0.08],
      [0, 0.28, 0.13],
      [0, 0.12, 0.32],
    ],
    [1, 0, 0],
    0.025,
  ).name = 'swept-dorsal-fin';
  k.blade(
    0x355e77,
    [
      [0, 0.04, 0.59],
      [0, 0.39, 0.86],
      [0, 0.42, 1.01],
      [0, 0.14, 0.88],
      [0, 0.0, 0.75],
      [0, -0.29, 0.94],
      [0, -0.24, 0.77],
      [0, -0.04, 0.6],
    ],
    [1, 0, 0],
    0.018,
  ).name = 'crescent-caudal-fin';
  for (const side of [-1, 1]) {
    const p: Vec3[] = [
      [side * 0.14, -0.035, -0.22],
      [side * 0.57, -0.16, 0.2],
      [side * 0.4, -0.13, 0.23],
      [side * 0.13, -0.085, 0.09],
    ];
    k.blade(0x406c84, p, [0, 1, 0], 0.018).name = 'swept-pectoral-fin';
    k.blade(
      0x476b7b,
      [
        [side * 0.075, -0.075, 0.32],
        [side * 0.21, -0.16, 0.48],
        [side * 0.08, -0.1, 0.49],
      ],
      [0, 1, 0],
      0.009,
    );
    const socket = fishEyeSockets('sharkFin')[side < 0 ? 0 : 1];
    const globe = k.sphere(
      0xbba55c,
      [socket[0] - side * 0.04, socket[1], socket[2]],
      [0.041, 0.028, 0.05],
      k.group,
      16,
      'eye',
    );
    globe.name = 'seated-curved-shark-eye';
    k.mesh(
      fishIrisGeometry(0.041, 0.028, 0.05, 0.012, 0.019, side),
      0x101c22,
      [socket[0] - side * 0.04, socket[1], socket[2]],
      [1, 1, 1],
      k.group,
      'eye',
    ).name = 'shark-curved-corneal-pupil';
    for (let j = 0; j < 6; j++) {
      const z = -0.57 + j * 0.043;
      const ray = new THREE.Raycaster(new THREE.Vector3(side * 2, -0.004, z), new THREE.Vector3(-side, 0, 0));
      const hit = ray.intersectObject(body, false)[0];
      if (!hit) throw Error('Missing authored upper jaw support');
      const x = hit.point.x * 0.9;
      const roofRay = new THREE.Raycaster(new THREE.Vector3(x, -0.06, z), new THREE.Vector3(0, 1, 0));
      const roof = roofRay.intersectObject(oralMesh, false).find((h) => h.point.y > -0.059 && h.point.y < 0.015);
      if (!roof) throw Error(`Missing actual oral roof for tooth ${side}:${j}`);
      const rootY = roof.point.y + 0.004;
      k.limb(
        0xe7e3cd,
        [
          [x, rootY, z],
          [x + side * 0.002, rootY - 0.015, z + 0.003],
          [x - side * 0.002, rootY - 0.032, z + 0.007],
        ],
        [0.013, 0.009, 0.001],
        undefined,
        3,
        5,
      ).name = 'rooted-shark-upper-tooth';
    }
    for (let i = 0; i < 3; i++)
      k.limb(
        0x64859b,
        [
          [side * 0.18, -0.045, -0.13 + i * 0.04],
          [side * 0.34, -0.11, 0.05 + i * 0.04],
          [side * (0.48 - i * 0.03), -0.145, 0.17 + i * 0.01],
        ],
        [0.0015, 0.003, 0.001],
        undefined,
        6,
        5,
      );
  }
  const shaded = new Set(Array.from({ length: ids.length / 3 }, (_, i) => ids.slice(i * 3, i * 3 + 3).join(',')));
  const keep: number[] = [];
  for (let t = 0; t < bi.count; t += 3) {
    const a = bi.getX(t),
      b = bi.getX(t + 1),
      c = bi.getX(t + 2);
    if (!shaded.has([a, b, c].join(','))) keep.push(a, b, c);
  }
  g.setIndex(keep);
  return k.group;
}

function kraken(useAuthored = true): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-kraken';
  const authored = useAuthored ? k.mesh(createAuthoredKrakenGeometry(), 0x44235f) : undefined;
  if (authored) {
    authored.name = 'kraken-watertight-authored-anatomy';
    (authored.material as THREE.Material).dispose();
    authored.material = createKrakenBakedMaterial();
    authored.updateMatrixWorld(true);
  }
  if (!authored) {
    const mantle = k.closedLoft(
      0x44235f,
      [
        [0.26, 0.38, 0.28, 0, 0.02],
        [0.56, 0.57, 0.39, 0, 0.04],
        [0.94, 0.56, 0.42, 0, 0.04],
        [1.24, 0.42, 0.36, 0, 0.03],
        [1.55, 0.48, 0.4, 0, 0.09],
        [1.87, 0.51, 0.38, 0, 0.18],
        [2.16, 0.4, 0.29, 0, 0.28],
        [2.42, 0.23, 0.17, -0.04, 0.31],
        [2.67, 0.015, 0.025, -0.2, 0.26],
      ],
      64,
      64,
    );
    mantle.name = 'kraken-continuous-mantle-head-root-mass';
    // Anatomical crest folds are in the mantle itself: no pasted relief surface.
    const mp = mantle.geometry.getAttribute('position');
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i),
        y = mp.getY(i),
        z = mp.getZ(i);
      if (y < 1.05 || z > 0.08) continue;
      const front = Math.min(1, Math.max(0, (0.08 - z) / 0.18)),
        t = Math.max(0, Math.min(1, (y - 1.1) / 1.5));
      const crest =
        Math.sin(Math.PI * t) *
        (0.15 * Math.exp((-x * x) / 0.0035) + 0.14 * Math.exp(-((Math.abs(x) - (0.13 + 0.23 * t)) ** 2) / 0.0045));
      const orbitY = 1.3 + Math.abs(x) * 0.13;
      const brow = 0.12 * Math.exp(-((Math.abs(x) - 0.27) ** 2 / 0.027 + (y - orbitY) ** 2 / 0.007));
      mp.setZ(i, z - front * (crest + brow));
    }
    mantle.geometry.deleteAttribute('normal');
    mantle.geometry.computeVertexNormals();
    // Broad continuous mantle membranes, not a pair of tubular devil horns.
    for (const side of [-1, 1])
      k.closedLoft(
        0x44235f,
        [
          [1.13, 0.035, 0.08, side * 0.3, 0.06],
          [1.44, 0.21, 0.15, side * 0.39, 0.12],
          [1.7, 0.29, 0.15, side * 0.51, 0.2],
          [1.94, 0.22, 0.1, side * 0.65, 0.26],
          [2.08, 0.16, 0.07, side * 0.76, 0.27],
          [2.17, 0.07, 0.035, side * 0.88, 0.2],
          [2.19, 0.01, 0.012, side * 0.97, 0.1],
        ],
        32,
        24,
      ).name = 'kraken-broad-anatomical-crest-flange';
  }
  // Eight independently rooted limbs: alternating barrier lifts and grounded bracing arcs.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      dx = Math.sin(a),
      dz = Math.cos(a),
      raise = i === 1 || i === 7 ? 1.7 : i === 2 || i === 6 ? 1.05 : i === 3 || i === 5 ? 0.64 : 0.36;
    let points: Vec3[] = [
      [dx * 0.1, 1.1, dz * 0.09],
      [dx * 0.38, 0.76, dz * 0.34],
      [dx * 0.73, 0.38, dz * 0.63],
      [dx * 1.02, 0.28 + raise * 0.23, dz * 0.76],
      [dx * 1.12, 0.3 + raise * 0.65, dz * 0.75],
      [dx * 1.05, 0.34 + raise * 0.93, dz * 0.67],
      [dx * 0.88, 0.34 + raise, dz * 0.54],
      [dx * 0.76, 0.31 + raise * 0.88, dz * 0.47],
      [dx * 0.82, 0.29 + raise * 0.75, dz * 0.43],
    ];
    // Foreground arms brace and curl across the floor, rather than all rising as petals.
    if (i === 3 || i === 5) {
      const side = i === 3 ? 1 : -1;
      points = [
        [side * 0.1, 1.1, -0.09],
        [side * 0.36, 0.76, -0.34],
        [side * 0.73, 0.35, -0.63],
        [side * 1.02, 0.23, -0.75],
        [side * 1.14, 0.25, -0.62],
        [side * 1.08, 0.38, -0.48],
        [side * 0.91, 0.44, -0.52],
        [side * 0.84, 0.34, -0.65],
        [side * 0.92, 0.25, -0.71],
      ];
    }
    if (i === 4)
      points = [
        [0, 1.1, -0.09],
        [-0.1, 0.76, -0.34],
        [-0.24, 0.36, -0.64],
        [0.02, 0.23, -0.82],
        [0.29, 0.25, -0.8],
        [0.4, 0.38, -0.68],
        [0.3, 0.43, -0.59],
        [0.19, 0.34, -0.65],
        [0.25, 0.25, -0.73],
      ];
    const widths = [0.26, 0.36, 0.31, 0.265, 0.215, 0.16, 0.1, 0.048, 0.004];
    if (!authored) {
      const arm = k.limb(i % 2 ? 0x51316f : 0x44235f, points, widths, undefined, 42, 10);
      arm.name = `kraken-rooted-tentacle-${i + 1}`;
    }
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    for (let j = 0; j < (i % 4 === 0 ? 3 : 5); j++)
      for (const row of i % 2 || i === 4 ? [-1, 1] : [0]) {
        const t = i % 4 === 0 ? 0.48 + j * 0.14 : 0.44 + j * 0.075,
          center = curve.getPointAt(t),
          tangent = curve.getTangentAt(t).normalize();
        const facing = i % 2 ? new THREE.Vector3(0, -0.2, -1) : new THREE.Vector3(dx, -0.1, dz);
        let n = facing.clone().addScaledVector(tangent, -facing.dot(tangent));
        if (n.lengthSq() < 0.01) n = new THREE.Vector3(1, 0, 0).cross(tangent);
        n.normalize().applyAxisAngle(tangent, row * 0.28);
        const fi = t * (widths.length - 1),
          idx = Math.min(widths.length - 2, Math.floor(fi)),
          f = fi - idx;
        const radius = widths[idx] + (widths[idx + 1] - widths[idx]) * (f * f * (3 - 2 * f));
        const socket = center.clone().addScaledVector(n, radius);
        if (authored) {
          const ray = new THREE.Raycaster(socket.clone().addScaledVector(n, 0.5), n.clone().negate());
          const hit = ray
            .intersectObject(authored, false)
            .sort((a, b) => a.point.distanceToSquared(socket) - b.point.distanceToSquared(socket))[0];
          if (!hit?.face || hit.point.distanceTo(socket) > 0.12)
            throw new Error(
              `Unseated kraken cup ${i}:${j}:${row} distance=${hit?.point.distanceTo(socket)} center=${center.toArray()} socket=${socket.toArray()}`,
            );
          socket.copy(hit.point);
          n.copy(hit.face.normal).transformDirection(authored.matrixWorld).normalize();
        }
        // A flared bowl grows from a buried narrow foot; its dark inset is recessed below the lip.
        const r = radius * (row ? 0.31 : 0.43),
          profile = [
            new THREE.Vector2(r * 0.48, -r * 0.28),
            new THREE.Vector2(r * 0.9, 0),
            new THREE.Vector2(r, r * 0.34),
            new THREE.Vector2(r * 0.73, r * 0.42),
            new THREE.Vector2(r * 0.52, r * 0.08),
            new THREE.Vector2(0, r * 0.04),
          ];
        const cup = k.mesh(
          new THREE.LatheGeometry(profile, 12),
          0xa47db4,
          socket.toArray() as [number, number, number],
        );
        cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        cup.name = 'rooted-concave-suction-cup';
        const inset = k.mesh(
          new THREE.CircleGeometry(r * 0.48, 12),
          0x402748,
          socket
            .clone()
            .addScaledVector(n, r * 0.06)
            .toArray() as [number, number, number],
        );
        inset.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        inset.name = 'recessed-sucker-bowl';
      }
  }
  let krakenIrisMaterial: THREE.MeshStandardMaterial | undefined;
  if (authored)
    for (const [index, socket] of krakenAuthoredEyeSockets.entries()) {
      const side = index === 0 ? -1 : 1;
      const eye = k.sphere(
        0xe7aa3c,
        [socket[0], socket[1], socket[2] + 0.05],
        [0.122, 0.063, 0.079],
        k.group,
        20,
        'eye',
      );
      eye.rotation.z = side * 0.2;
      eye.name = 'seated-kraken-curved-golden-lens';
      // Amber belongs to the forward iris, not the entire lateral globe.
      // Continuous existing geometry stays seated; socket-facing scleral tissue is purple.
      const eyePosition = eye.geometry.getAttribute('position');
      const irisColors: number[] = [];
      const socketColor = new THREE.Color(0x52365c),
        irisColor = new THREE.Color(0xe7aa3c);
      for (let i = 0; i < eyePosition.count; i++) {
        const facing = -eyePosition.getZ(i); // SphereGeometry uses unit local coordinates.
        const blend = THREE.MathUtils.smoothstep(facing, 0.2, 0.78);
        const color = socketColor.clone().lerp(irisColor, blend);
        irisColors.push(color.r, color.g, color.b);
      }
      eye.geometry.setAttribute('color', new THREE.Float32BufferAttribute(irisColors, 3));
      if (!krakenIrisMaterial) {
        krakenIrisMaterial = (eye.material as THREE.MeshStandardMaterial).clone();
        krakenIrisMaterial.color.set(0xffffff);
        krakenIrisMaterial.vertexColors = true;
      }
      eye.material = krakenIrisMaterial;

      const pupil = k.sphere(
        0x1b1223,
        [socket[0], socket[1], socket[2] - 0.029],
        [0.017, 0.046, 0.009],
        k.group,
        12,
        'eye',
      );
      pupil.rotation.z = side * 0.2;
      pupil.name = 'kraken-vertical-slit-pupil';
    }

  if (authored) {
    const removedMaterials = new Set<THREE.Material>();
    for (const child of [...k.group.children])
      if (
        child instanceof THREE.Mesh &&
        (child.name.startsWith('kraken-continuous-mantle') ||
          child.name.startsWith('kraken-rooted-tentacle-') ||
          child.name.startsWith('kraken-broad-anatomical-crest'))
      ) {
        k.group.remove(child);
        child.geometry.dispose();
        for (const mat of Array.isArray(child.material) ? child.material : [child.material]) removedMaterials.add(mat);
      }
    for (const child of k.group.children)
      if (child instanceof THREE.Mesh)
        for (const mat of Array.isArray(child.material) ? child.material : [child.material])
          removedMaterials.delete(mat);
    for (const mat of removedMaterials) mat.dispose();
    // Approved species-specific low, broad octopus envelope; gameplay collision data is unchanged.
    k.group.scale.set(1.05, 0.82, 1.05);
    k.group.position.y = -new THREE.Box3().setFromObject(k.group).min.y + 0.001;
  } else k.group.position.y = -0.037; // Authored tentacle support contact; gameplay root is unchanged.
  return k.group;
}

function puffer(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-pufferfish';
  const [g, oral] = createAuthoredFishBody('pufferfish');
  const body = k.mesh(g, 0xc97926);
  k.mesh(oral, 0x633a24).name = 'true-puffer-orbital-oral-cavities';
  body.name = 'armored-inflated-puffer-body';
  const belly = g.clone(),
    p = belly.getAttribute('position'),
    ix = belly.index!,
    indices: number[] = [];
  for (let i = 0; i < ix.count; i += 3) {
    const a = ix.getX(i),
      b = ix.getX(i + 1),
      c = ix.getX(i + 2);
    if ((p.getY(a) + p.getY(b) + p.getY(c)) / 3 < -0.06) indices.push(a, b, c);
  }
  belly.setIndex(indices);
  k.mesh(belly, 0xdac597);
  for (const [lat, count] of [
    [-0.58, 8],
    [0, 11],
    [0.55, 8],
  ] as const)
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count + lat * 0.7,
        point = new THREE.Vector3(
          Math.cos(lat) * Math.sin(a) * 0.38,
          Math.sin(lat) * 0.32,
          Math.cos(lat) * Math.cos(a) * 0.43,
        );
      if (point.z < -0.27 && Math.abs(point.x) < 0.25) continue;
      const normal = new THREE.Vector3(
        point.x / (0.38 * 0.38),
        point.y / (0.32 * 0.32),
        point.z / (0.43 * 0.43),
      ).normalize();
      k.limb(
        0xe7d4aa,
        [
          point.clone().addScaledVector(normal, -0.012).toArray() as [number, number, number],
          point.clone().addScaledVector(normal, 0.05).toArray() as [number, number, number],
          point.clone().addScaledVector(normal, 0.17).toArray() as [number, number, number],
        ],
        [0.043, 0.035, 0],
        undefined,
        4,
        7,
      ).name = 'rooted-puffer-spine';
    }
  for (const side of [-1, 1]) {
    const socket = fishEyeSockets('pufferfish')[side < 0 ? 0 : 1];
    const globe = k.sphere(
      0xa8864e,
      [socket[0], socket[1] + 0.015, socket[2] + 0.06],
      [0.06, 0.035, 0.038],
      k.group,
      16,
      'eye',
    );
    globe.rotation.z = side * 0.24;
    globe.name = 'seated-curved-puffer-eye';
    const iris = k.mesh(
      fishIrisGeometry(0.06, 0.035, 0.038, 0.02, 0.022, 'front'),
      0x211c1c,
      [socket[0], socket[1] + 0.015, socket[2] + 0.06],
      [1, 1, 1],
      k.group,
      'eye',
    );
    iris.rotation.z = side * 0.24;
    iris.name = 'puffer-curved-corneal-pupil';
    k.fanMembrane(
      0x9c531f,
      [side * 0.32, -0.02, 0.03],
      [
        [side * 0.48, 0.16, 0.15],
        [side * 0.6, 0.12, 0.18],
        [side * 0.61, -0.02, 0.22],
        [side * 0.5, -0.13, 0.18],
      ],
      [0, 0, -1],
    ).name = 'swept-puffer-fin';
    for (let i = 0; i < 3; i++)
      k.limb(
        0xe1aa55,
        [
          [side * 0.33, 0.01 - i * 0.022, 0.01],
          [side * 0.54, 0.1 - i * 0.06, 0.12],
        ],
        [0.004, 0.002],
        undefined,
        6,
        5,
      );
  }
  for (const side of [-1, 0, 1])
    k.patch(
      body,
      0xdac597,
      [
        [side * 0.13 - 0.065, -0.075],
        [side * 0.13 + 0.055, -0.08],
        [side * 0.13 + 0.07, -0.16],
        [side * 0.13 + 0.035, -0.245],
        [side * 0.13 - 0.055, -0.22],
        [side * 0.13 - 0.075, -0.145],
      ],
      'z',
      -1,
      0.005,
      'cloth',
      4,
      0.03,
    ).name = 'overlapping-belly-armor-plate';
  k.limb(
    0xdcc697,
    [
      [-0.057, -0.05, -0.43],
      [-0.032, -0.031, -0.447],
      [0, -0.025, -0.452],
      [0.032, -0.031, -0.447],
      [0.057, -0.05, -0.43],
    ],
    [0.002, 0.009, 0.012, 0.009, 0.002],
    undefined,
    9,
    7,
  ).name = 'downturned-puffer-upper-lip';
  k.fanMembrane(
    0xa75b25,
    [0, 0, 0.36],
    [
      [0, 0.23, 0.58],
      [0, 0.24, 0.7],
      [0, 0.02, 0.67],
      [0, -0.2, 0.68],
      [0, -0.18, 0.57],
    ],
    [1, 0, 0],
  ).name = 'puffer-fanned-tail';
  for (let i = 0; i < 3; i++)
    k.limb(
      0xd9a04f,
      [
        [0, 0.01, 0.37],
        [0, 0.2 - i * 0.17, 0.62],
      ],
      [0.006, 0.002],
      undefined,
      6,
      5,
    );
  const shaded = new Set(
    Array.from({ length: indices.length / 3 }, (_, i) => indices.slice(i * 3, i * 3 + 3).join(',')),
  );
  const keep: number[] = [];
  for (let t = 0; t < ix.count; t += 3) {
    const a = ix.getX(t),
      b = ix.getX(t + 1),
      c = ix.getX(t + 2);
    if (!shaded.has([a, b, c].join(','))) keep.push(a, b, c);
  }
  g.setIndex(keep);
  return k.group;
}
function jelly(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-jellyfish';
  const body = k.closedLoft(
    0x9a5caa,
    [
      [-0.08, 0.31, 0.28],
      [0.0, 0.35, 0.31],
      [0.13, 0.32, 0.28],
      [0.25, 0.2, 0.17],
      [0.3, 0.045, 0.04],
      [0.31, 0.001, 0.001],
    ],
    21,
    24,
  );
  body.name = 'jelly-bell';
  // One translucent outer membrane encloses opaque bell anatomy, not nested sorted shells.
  const innerBell = k.closedLoft(
    0x683d86,
    [
      [-0.045, 0.14, 0.125],
      [0.02, 0.18, 0.15],
      [0.09, 0.14, 0.12],
      [0.13, 0.09, 0.08],
      [0.15, 0.012, 0.01],
    ],
    10,
    16,
  );
  innerBell.name = 'opaque-jelly-inner-bell';
  for (let vein = 0; vein < 8; vein++) {
    const a = (vein * Math.PI) / 4;
    k.limb(
      0x84d5df,
      vein % 2 === 0
        ? [
            [Math.sin(a) * 0.018, 0.27, Math.cos(a) * 0.018],
            [Math.sin(a + 0.12) * 0.14, 0.21, Math.cos(a + 0.12) * 0.125],
            [Math.sin(a - 0.1) * 0.245, 0.1, Math.cos(a - 0.1) * 0.205],
            [Math.sin(a + 0.08) * 0.26, 0.005, Math.cos(a + 0.08) * 0.225],
            [Math.sin(a) * 0.16, -0.044, Math.cos(a) * 0.145],
          ]
        : [
            [Math.sin(a - Math.PI / 4 + 0.12) * 0.14, 0.21, Math.cos(a - Math.PI / 4 + 0.12) * 0.125],
            [Math.sin(a - 0.38) * 0.2, 0.17, Math.cos(a - 0.38) * 0.17],
            [Math.sin(a - 0.15) * 0.255, 0.09, Math.cos(a - 0.15) * 0.22],
            [Math.sin(a + 0.1) * 0.27, 0.005, Math.cos(a + 0.1) * 0.23],
            [Math.sin(a + 0.2) * 0.17, -0.044, Math.cos(a + 0.2) * 0.15],
          ],
      [0.002, 0.005, 0.006, 0.004, 0.002],
      undefined,
      12,
      5,
      'glow',
    ).name = 'internal-luminous-bell-vein';
  }
  const rimPoints: Vec3[] = Array.from({ length: 17 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return [Math.sin(a) * 0.313, -0.065 + 0.012 * Math.cos(a * 8), Math.cos(a) * 0.28] as Vec3;
  });
  k.limb(
    0x8255a1,
    rimPoints,
    Array.from({ length: 17 }, () => 0.012),
    undefined,
    32,
    7,
  ).name = 'attached-scalloped-bell-rim';
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7,
      x = Math.sin(a) * 0.18,
      z = Math.cos(a) * 0.17;
    k.limb(
      i % 2 ? 0x8255a1 : 0xa46ab1,
      [
        [x, -0.05, z],
        [x + 0.06 * Math.cos(a), -0.22, z + 0.035],
        [x - 0.07 * Math.cos(a), -0.4, z - 0.035],
        [x + 0.1 * Math.cos(a), -0.56, z + 0.05],
      ],
      [0.035, 0.045, 0.025, 0.002],
      [0.012, 0.014, 0.01, 0.001],
      20,
      7,
    ).name = 'flowing-jelly-tentacle';
  }
  for (const side of [-1, 1]) {
    k.patch(
      innerBell,
      0xb19acc,
      [
        [side * 0.043, 0.045],
        [side * 0.135, 0.088],
        [side * 0.142, 0.065],
        [side * 0.115, 0.026],
        [side * 0.075, 0.025],
      ],
      'z',
      -1,
      -0.002,
      'eye',
      4,
      0.018,
    ).name = 'curved-internal-jelly-lens';
    const ex = side * 0.095,
      ey = 0.047;
    const ray = new THREE.Raycaster(new THREE.Vector3(ex, ey, -2), new THREE.Vector3(0, 0, 1));
    const support = ray.intersectObject(innerBell, false)[0];
    if (!support) throw Error('Missing jelly internal lens support');
    k.sphere(0x38214a, [ex, ey, support.point.z - 0.016], [0.008, 0.017, 0.004], k.group, 8, 'eye').name =
      'jelly-deep-violet-pupil';
    k.patch(
      innerBell,
      0x683d86,
      [
        [side * 0.035, 0.055],
        [side * 0.085, 0.1],
        [side * 0.12, 0.095],
        [side * 0.135, 0.084],
        [side * 0.085, 0.067],
      ],
      'z',
      -1,
      -0.002,
      'cloth',
      3,
      0.03,
    ).name = 'integrated-jelly-orbital-roof';
    k.limb(
      0x7cc1df,
      [
        [side * 0.25, -0.06, 0.02],
        [side * 0.4, -0.24, 0.03],
        [side * 0.37, -0.43, 0.1],
        [side * 0.43, -0.5, 0.06],
      ],
      [0.008, 0.008, 0.005, 0.001],
      undefined,
      22,
      6,
      'glow',
    );
  }
  return k.group;
}
function witchHand(k: SeaSkullKit, center: Vec3, side: number): void {
  const [x, y, z] = center;
  if (side < 0) {
    k.limb(
      0x94bdb8,
      [
        [x + 0.04, y + 0.03, z + 0.02],
        [x - 0.025, y - 0.05, z + 0.015],
      ],
      [0.035, 0.034],
      [0.023, 0.022],
      8,
      8,
    );
    for (let i = 0; i < 4; i++)
      k.limb(
        0x94bdb8,
        [
          [x + 0.02, y + (i - 1.5) * 0.025, z + 0.015],
          [x - 0.055, y + (i - 1.5) * 0.025, z + 0.01],
          [x - 0.06, y + (i - 1.5) * 0.025, z - 0.055],
          [x - 0.015, y + (i - 1.5) * 0.025, z - 0.06],
        ],
        [0.013, 0.014, 0.012, 0.006],
        undefined,
        10,
        7,
      );
    k.limb(
      0x94bdb8,
      [
        [x + 0.03, y + 0.035, z - 0.005],
        [x - 0.015, y - 0.02, z - 0.07],
        [x - 0.04, y - 0.03, z - 0.035],
      ],
      [0.018, 0.014, 0.006],
      undefined,
      10,
      7,
    );
    return;
  }
  k.limb(
    0x94bdb8,
    [
      [x - side * 0.06, y - 0.025, z],
      [x + side * 0.02, y + 0.035, z - 0.025],
    ],
    [0.045, 0.04],
    [0.024, 0.02],
    8,
    8,
  );
  for (let i = 0; i < 4; i++)
    k.limb(
      0x94bdb8,
      [
        [x + side * 0.015, y + 0.02 + (i - 1.5) * 0.018, z - 0.018],
        [x + side * (0.09 + i * 0.012), y + 0.06 + (i - 1.5) * 0.027, z - 0.03],
        [x + side * (0.11 + i * 0.012), y + 0.1 + (i - 1.5) * 0.025, z - 0.04],
      ],
      [0.013, 0.01, 0.003],
      undefined,
      8,
      6,
    );
  k.limb(
    0x94bdb8,
    [
      [x - side * 0.025, y - 0.015, z],
      [x + side * 0.04, y - 0.055, z - 0.035],
    ],
    [0.018, 0.006],
    undefined,
    6,
    6,
  );
}
function seaWitch(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-seaWitch';
  const gown = k.closedLoft(
    0x234b5d,
    [
      [0.02, 0.22, 0.16, 0, 0.06],
      [0.14, 0.66, 0.37, 0, 0.08],
      [0.42, 0.62, 0.34, 0, 0.08],
      [0.9, 0.39, 0.26, 0, 0.05],
      [1.42, 0.23, 0.17],
      [1.84, 0.3, 0.2],
      [2.1, 0.36, 0.22],
      [2.25, 0.15, 0.11],
    ],
    18,
    20,
  );
  gown.name = 'continuous-tidal-gown';
  const gp = gown.geometry.getAttribute('position');
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i),
      y = gp.getY(i),
      z = gp.getZ(i),
      a = Math.atan2(x, z),
      fold = (1 - Math.min(1, y / 1.6)) * 0.055 * Math.cos(a * 7);
    gp.setXYZ(i, x + Math.sin(a) * fold, y, z + Math.cos(a) * fold);
  }
  gown.geometry.deleteAttribute('normal');
  gown.geometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    k.closedLoft(
      0x376f7b,
      [
        [0.05, 0.015, 0.015, side > 0 ? 0.83 : side * 0.53, side > 0 ? 0.43 : 0.17],
        [0.24, side > 0 ? 0.14 : 0.2, side > 0 ? 0.028 : 0.05, side > 0 ? 1.05 : side * 0.61, side > 0 ? 0.33 : 0.12],
        [0.75, side > 0 ? 0.27 : 0.17, side > 0 ? 0.035 : 0.06, side > 0 ? 0.72 : side * 0.47, side > 0 ? 0.12 : 0.07],
        [1.4, side > 0 ? 0.16 : 0.105, 0.03, side > 0 ? 0.42 : side * 0.25, side > 0 ? 0.025 : -0.03],
        [1.94, 0.09, 0.025, side * 0.2, -0.1],
        [2.13, 0.03, 0.015, side * 0.13, -0.13],
      ],
      18,
      10,
    ).name = 'broad-wave-drape';
    k.limb(
      0x7eb3b7,
      [
        [side > 0 ? 0.83 : side * 0.53, 0.06, side > 0 ? 0.415 : 0.12],
        [side > 0 ? 1.185 : side * 0.79, 0.24, side > 0 ? 0.315 : 0.07],
        [side > 0 ? 0.98 : side * 0.61, 0.76, side > 0 ? 0.1 : 0.01],
        [side > 0 ? 0.57 : side * 0.34, 1.4, side > 0 ? 0.014 : -0.09],
        [side * 0.25, 1.94, -0.16],
      ],
      [0.006, 0.016, 0.014, 0.012, 0.005],
      undefined,
      18,
      6,
    ).name = 'tidal-drape-edge-binding';
  }
  k.limb(
    0x94bdb8,
    [
      [0, 2.15, 0.015],
      [0, 2.4, 0.005],
    ],
    [0.1, 0.07],
    undefined,
    12,
    8,
  ).name = 'attached-neck-under-collar';
  for (const side of [-1, 0, 1]) {
    k.closedLoft(
      side === 0 ? 0x376f7b : 0x2d5d70,
      [
        [0.06, 0.012, 0.008, side * 0.55, -0.31],
        [0.2, 0.045, 0.014, side * 0.48, -0.32],
        [0.56, 0.085, 0.018, side * 0.34, -0.29],
        [1.08, 0.12, 0.018, side * 0.21, -0.24],
        [1.55, 0.11, 0.016, side * 0.12, -0.19],
        [1.84, 0.038, 0.012, side * 0.075, -0.185],
        [1.98, 0.008, 0.006, side * 0.04, -0.17],
      ],
      17,
      8,
    ).name = 'overlapping-long-aquatic-gown-panel';
  }
  for (const side of [-1, 1])
    k.closedLoft(
      side > 0 ? 0x92bbc2 : 0x376f7b,
      [
        [side > 0 ? 0.14 : 0.3, 0.01, 0.008, side > 0 ? 1.0 : side * 0.79, side > 0 ? 0.2 : 0.12],
        [0.48, 0.16, side > 0 ? 0.012 : 0.022, side > 0 ? 0.78 : side * 0.69, side > 0 ? 0.17 : 0.12],
        [0.82, 0.15, side > 0 ? 0.014 : 0.022, side > 0 ? 0.6 : side * 0.5, 0.1],
        [1.25, 0.11, side > 0 ? 0.014 : 0.02, side > 0 ? 0.36 : side * 0.32, 0.035],
        [1.68, 0.035, 0.014, side * 0.22, 0.035],
      ],
      16,
      8,
    ).name = 'swept-hip-fin-panel';
  const headStart = k.group.children.length;
  addAuthoredSeaWitchFace(k);
  const crownGeometry = new THREE.BufferGeometry();
  crownGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seaWitchCrown.position, 3));
  crownGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(seaWitchCrown.normal, 3));
  crownGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(seaWitchCrown.uv, 2));
  const hairCap = k.mesh(crownGeometry, 0x1c3c4d);
  hairCap.name = 'coherent-swept-hair-cap';
  for (const side of [-1, 1]) {
    for (let lock = 0; lock < 3; lock++)
      k.limb(
        0x1c3c4d,
        [
          [side * 0.12, 2.78 - lock * 0.06, 0.07],
          [side * (side > 0 ? 0.29 : 0.23), 2.68 - lock * 0.085, 0.16],
          [side * (side > 0 ? 0.49 - lock * 0.025 : 0.34 + lock * 0.035), 2.58 - lock * 0.14, 0.25],
          [side * (side > 0 ? 0.65 - lock * 0.04 : 0.4 + lock * 0.025), 2.4 - lock * 0.11 + (side > 0 ? 0.07 : 0), 0.4],
          [
            side * (side > 0 ? 0.69 - lock * 0.055 : 0.41 + lock * 0.025),
            2.22 - lock * 0.15 + (side > 0 ? 0.11 : 0),
            0.48,
          ],
        ],
        [0.065, lock === 0 ? 0.115 : 0.065, lock === 0 ? 0.12 : 0.06, lock === 0 ? 0.075 : 0.04, 0.002],
        [0.045, 0.055, 0.05, 0.035, 0.001],
        17,
        8,
      ).name = 'layered-swept-hair-lock';
  }

  k.limb(
    0x1c3c4d,
    [
      [0, 2.79, 0.11],
      [0.05, 2.57, 0.23],
      [0.17, 2.32, 0.28],
      [0.36, 2.16, 0.31],
    ],
    [0.13, 0.12, 0.1, 0.01],
    [0.055, 0.06, 0.05, 0.002],
    18,
    10,
  );

  for (const [x, top] of [
    [-0.15, 3.16],
    [0, 3.32],
    [0.15, 3.16],
  ]) {
    k.limb(
      0xac6350,
      [
        [x, 2.79, 0.01],
        [x * 1.3, 2.98, 0.015],
        [x * 0.8, top, 0.015],
      ],
      [0.025, 0.023, 0.002],
      undefined,
      15,
      7,
    ).name = 'coral-crown-prong';
    for (const sign of [-1, 1])
      k.limb(
        0xac6350,
        [
          [x * 1.25, 2.99, 0.015],
          [x * 1.25 + sign * 0.065, 3.06, 0.018],
          [x * 1.25 + sign * 0.08, 3.12, 0.02],
        ],
        [0.014, 0.01, 0.001],
        undefined,
        9,
        6,
      );
  }
  k.sphere(0xd9e0cf, [0, 2.94, -0.075], [0.055, 0.07, 0.04], k.group, 12, 'eye');
  for (const part of k.group.children.slice(headStart)) part.position.y -= 0.08;
  k.torus(0xbba775, [0, 2.08, -0.34], 0.075, 0.016);
  k.sphere(0xd9e0cf, [0, 2.08, -0.355], [0.049, 0.049, 0.029], k.group, 12, 'eye');
  for (const [side, hand] of [
    [-1, [-0.82, 1.66, -0.13]],
    [1, [0.7, 2.02, -0.18]],
  ] as const) {
    k.limb(
      0x234b5d,
      [
        [side * 0.31, 2.09, 0.01],
        [side * 0.48, 1.89, -0.01],
        [hand[0] - side * 0.08, hand[1], hand[2]],
      ],
      [0.1, 0.11, 0.065],
      [0.08, 0.07, 0.05],
      20,
      12,
    );
    witchHand(k, hand, side);
  }
  k.limb(
    0x9d5543,
    [
      [-0.91, 0.08, -0.13],
      [-0.83, 1.66, -0.13],
      [-0.98, 2.77, -0.13],
    ],
    [0.034, 0.03, 0.026],
    undefined,
    24,
    9,
    'leather',
  );
  k.limb(
    0xe0d7ba,
    [
      [-0.97, 2.75, -0.13],
      [-1.16, 2.89, -0.13],
      [-1.2, 3.07, -0.13],
      [-1.08, 3.2, -0.13],
    ],
    [0.06, 0.08, 0.045, 0.002],
    undefined,
    22,
    10,
  ).name = 'crescent-shell-staff-head';
  k.limb(
    0x84d5df,
    [
      [0.81, 2.16, -0.18],
      [1.05, 2.13, -0.16],
      [1.19, 2.28, -0.14],
      [1.07, 2.45, -0.12],
      [0.89, 2.42, -0.14],
      [0.94, 2.32, -0.16],
    ],
    [0.006, 0.027, 0.03, 0.025, 0.015, 0.002],
    [0.004, 0.012, 0.015, 0.011, 0.006, 0.001],
    26,
    8,
    'glow',
  ).name = 'controlled-vortex-ribbon';
  addAquaticRegalia(k);
  // One coherent current carries layered hem and its bindings together; roots stay at the waist.
  for (const part of k.group.children) {
    if (
      !(part instanceof THREE.Mesh) ||
      ![
        'continuous-tidal-gown',
        'broad-wave-drape',
        'overlapping-long-aquatic-gown-panel',
        'swept-hip-fin-panel',
        'tidal-drape-edge-binding',
        'layered-waist-fin',
      ].includes(part.name)
    )
      continue;
    const p = part.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        weight = Math.max(0, 1 - y / 1.65),
        a = 0.11 * weight;
      p.setXYZ(
        i,
        x * Math.cos(a) + z * Math.sin(a) + 0.22 * weight * weight,
        y,
        z * Math.cos(a) - x * Math.sin(a) + 0.045 * weight * weight,
      );
    }
    part.geometry.computeVertexNormals();
  }
  return k.group;
}

export function buildSeaMonster(id: string, _color: number): THREE.Group | undefined {
  if (id === 'sharkFin') return dressSeaCreature(shark());
  if (id === 'pufferfish') return dressSeaCreature(puffer());
  if (id === 'jellyfish') return dressSeaCreature(jelly());
  return undefined;
}
export function buildSeaBoss(id: string): THREE.Group | undefined {
  if (id === 'kraken') return kraken();
  if (id === 'seaWitch') return dressSeaCreature(seaWitch());
  return undefined;
}

/** Offline Blender authoring input; runtime builder contract remains unchanged. */
export function buildKrakenAuthoringSource(): THREE.Group {
  const root = kraken(false);
  root.position.set(0, 0, 0);
  return root;
}
