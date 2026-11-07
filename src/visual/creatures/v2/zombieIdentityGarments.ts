import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { ZLKit, skinPanel, frontSurface } from './zombieLabTools';
/** A single thick surface with capped opening/armhole edges; UVs follow actual tailored panels. */
function thickSurface(p: number[], uv: number[], indices: number[], thickness: number): THREE.BufferGeometry {
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  const original = g;
  g = mergeVertices(g, 1e-6);
  original.dispose();
  p = Array.from(g.attributes.position.array);
  uv = Array.from(g.attributes.uv.array);
  indices = Array.from(g.index!.array);
  g.computeVertexNormals();
  const n = g.attributes.normal,
    count = p.length / 3,
    positions = [...p],
    tex = [...uv],
    idx = [...indices],
    edges = new Map<string, [number, number, number]>();
  for (let i = 0; i < count; i++) {
    positions.push(
      p[i * 3] - n.getX(i) * thickness,
      p[i * 3 + 1] - n.getY(i) * thickness,
      p[i * 3 + 2] - n.getZ(i) * thickness,
    );
    tex.push(uv[i * 2], uv[i * 2 + 1]);
  }
  for (let i = 0; i < indices.length; i += 3) {
    idx.push(indices[i + 2] + count, indices[i + 1] + count, indices[i] + count);
    for (let j = 0; j < 3; j++) {
      const a = indices[i + j],
        b = indices[i + ((j + 1) % 3)],
        key = a < b ? `${a},${b}` : `${b},${a}`,
        old = edges.get(key);
      edges.set(key, [a, b, (old?.[2] ?? 0) + 1]);
    }
  }
  for (const [a, b, c] of edges.values()) if (c === 1) idx.push(a, a + count, b, b, a + count, b + count);
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
  g.setIndex(idx);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}
export function authorRaggedWrapVest(k: ZLKit, body: THREE.Mesh, worker: boolean, giant = false): void {
  const source = body.geometry.attributes.position,
    surface = new THREE.BufferGeometry().setAttribute('position', source.clone()),
    welded = mergeVertices(surface, 1e-6),
    normalLookup = new Map<string, THREE.Vector3>(),
    p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  welded.computeVertexNormals();
  const wp = welded.attributes.position,
    wn = welded.attributes.normal;
  const key = (x: number, y: number, z: number) => `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
  for (let i = 0; i < wp.count; i++)
    normalLookup.set(key(wp.getX(i), wp.getY(i), wp.getZ(i)), new THREE.Vector3().fromBufferAttribute(wn, i));
  const triangles: THREE.Triangle[] = [];
  for (let i = 0; i < source.count; i += 3)
    triangles.push(
      new THREE.Triangle(
        new THREE.Vector3().fromBufferAttribute(source, i),
        new THREE.Vector3().fromBufferAttribute(source, i + 1),
        new THREE.Vector3().fromBufferAttribute(source, i + 2),
      ),
    );
  const projected = new Map<string, THREE.Vector3>();
  let outerOffset = 0.05,
    targetClearance = 0.032;
  function clearPoint(v: { p: THREE.Vector3; n: THREE.Vector3 }): THREE.Vector3 {
    const cacheKey = `${targetClearance}:` + key(v.p.x, v.p.y, v.p.z);
    const cached = projected.get(cacheKey);
    if (cached) return cached;
    const q = v.p.clone().addScaledVector(v.n, outerOffset),
      near = new THREE.Vector3(),
      bestPoint = new THREE.Vector3(),
      normal = new THREE.Vector3();
    for (let step = 0; step < 12; step++) {
      let best = Infinity,
        chosen: THREE.Triangle | undefined;
      for (const t of triangles) {
        t.closestPointToPoint(q, near);
        const d = q.distanceToSquared(near);
        if (d < best) {
          best = d;
          bestPoint.copy(near);
          chosen = t;
        }
      }
      chosen!.getNormal(normal);
      const signed = q.clone().sub(bestPoint).dot(normal) < 0 ? -Math.sqrt(best) : Math.sqrt(best);
      if (signed >= targetClearance - 0.001) break;
      q.addScaledVector(normal, targetClearance - signed);
    }
    projected.set(cacheKey, q);
    return q;
  }
  type Vertex = { p: THREE.Vector3; n: THREE.Vector3 };
  function clip(poly: Vertex[], distance: (p: THREE.Vector3) => number): Vertex[] {
    const result: Vertex[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length],
        da = distance(a.p),
        db = distance(b.p);
      if (da >= 0) result.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        result.push({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize() });
      }
    }
    return result;
  }
  function append(poly: Vertex[]): void {
    if (poly.length < 3) return;
    const start = p.length / 3;
    for (const v of poly) {
      const q = clearPoint(v);
      p.push(q.x, q.y, q.z);
      uv.push(Math.atan2(v.p.x, -v.p.z) / (Math.PI * 2) + 0.5, (v.p.y - 1) / 1.3);
    }
    for (let j = 1; j < poly.length - 1; j++) idx.push(start, start + j, start + j + 1);
  }
  // Clip actual body triangles into tailored front/back panels. Whole-triangle selection
  // produces huge sawtooth openings at mobile LOD; clipping retains the underlying surface.
  for (let i = 0; i < source.count; i += 3) {
    let poly: Vertex[] = [0, 1, 2].map((j) => {
      const q = new THREE.Vector3().fromBufferAttribute(source, i + j);
      return { p: q, n: normalLookup.get(key(q.x, q.y, q.z))!.clone() };
    });
    poly = clip(poly, (q) => q.y - (1.04 + 0.025 * Math.sin(q.x * 13 + q.z * 8)));
    poly = clip(poly, (q) => 2.48 - q.y);
    poly = clip(poly, (q) => {
      const t = Math.max(0, Math.min(1, (q.y - 1.93) / 0.4));
      return 0.55 + 0.19 * t * t * (3 - 2 * t) - Math.abs(q.x);
    });
    append(clip(poly, (q) => q.z));
    const front = clip(poly, (q) => -q.z);
    for (const sign of [-1, 1])
      append(clip(front, (q) => sign * q.x - ((giant ? 0.3 : 0.17) + Math.max(0, q.y - 1.95) * 0.65)));
  }
  k.part('wraparound-ragged-vest-with-real-armholes', 0x4c3528, thickSurface(p, uv, idx, 0.018), 'leather');
  p.length = 0;
  uv.length = 0;
  idx.length = 0;
  outerOffset = 0.035;
  targetClearance = 0.022;
  for (let i = 0; i < source.count; i += 3) {
    let poly: Vertex[] = [0, 1, 2].map((j) => {
      const q = new THREE.Vector3().fromBufferAttribute(source, i + j);
      return { p: q, n: normalLookup.get(key(q.x, q.y, q.z))!.clone() };
    });
    poly = clip(poly, (q) => q.y - 1.015);
    poly = clip(poly, (q) => 1.96 + Math.abs(q.x) * 0.45 - q.y);
    poly = clip(poly, (q) => (giant ? 0.34 : 0.215) - Math.abs(q.x));
    poly = clip(poly, (q) => -q.z - 0.12);
    append(poly);
  }
  k.part('fitted-layered-dark-undershirt', giant ? 0x30261c : 0x232b25, thickSurface(p, uv, idx, 0.008), 'cloth');
  if (worker || giant) {
    const name = 'frayed-shoulder-underlayer';
    skinPanel(
      k,
      body,
      [
        [-0.51, 2.16],
        [-0.66, 2.16],
        [-0.72, 1.99],
        [-0.6, 1.97],
        [-0.54, 2.03],
      ],
      0x876343,
      name,
      2,
      'cloth',
      false,
      0.04,
      true,
    );
    const mesh = k.group.getObjectByName(name) as THREE.Mesh,
      old = mesh.geometry,
      positions = old.attributes.position,
      chart: number[] = [];
    for (let i = 0; i < positions.count; i++) chart.push(positions.getX(i) * 2, positions.getY(i));
    mesh.geometry = thickSurface(Array.from(positions.array), chart, Array.from(old.index!.array), 0.008);
    old.dispose();
    (mesh.material as THREE.Material).side = THREE.FrontSide;
  }
  surface.dispose();
  welded.dispose();
}
export function authorRoyalCape(k: ZLKit): void {
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    rows = 8,
    cols = 20;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const t = j / rows,
        u = (i / cols) * 2 - 1,
        blend = Math.min(1, t * 3),
        topX = Math.sin(u * Math.PI * 0.46) * 0.64;
      const x = topX * (1 - blend) + (u * (0.7 + 0.36 * t) + t * 0.23) * blend;
      const y =
        2.34 -
        t * 1.6 -
        0.08 * Math.abs(u) * (1 - t) +
        0.17 * u * t +
        Math.pow(t, 4) * (0.1 * Math.cos(u * Math.PI * 2.2 + 0.4) + 0.055 * u);
      const z =
        0.05 +
        0.31 * Math.cos((u * Math.PI) / 2) * (1 - t) +
        0.12 * t +
        0.7 * t * t +
        0.18 * Math.pow(Math.sin(t * Math.PI), 2) +
        0.25 * Math.sin(u * Math.PI * 2.5 + 0.35 * t) * Math.sin((Math.min(1, t * 2.5) * Math.PI) / 2) +
        0.13 * u * t;
      p.push(x, y, z);
      uv.push(i / cols, t);
      if (j < rows && i < cols) {
        const q = j * (cols + 1) + i;
        idx.push(q, q + 1, q + cols + 1, q + 1, q + cols + 2, q + cols + 1);
      }
    }
  k.part('continuous-broad-fold-royal-mantle', 0x284a3d, thickSurface(p, uv, idx, 0.016), 'cloth');
}

export function authorFoldedMantleCollar(k: ZLKit): void {
  for (let layer = 0; layer < 2; layer++) {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.63, 2.24, 0.06),
      new THREE.Vector3(-0.39, 2.25, -0.32),
      new THREE.Vector3(0.04, 2.09 - layer * 0.06, -0.43 - layer * 0.015),
      new THREE.Vector3(0.48, 2.34, -0.17),
      new THREE.Vector3(0.6, 2.26, 0.06),
    ]);
    const p: number[] = [],
      uv: number[] = [],
      idx: number[] = [],
      rows = 24,
      cols = 4;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const t = j / rows,
          u = i / cols,
          c = path.getPoint(t),
          fold = Math.sin(u * Math.PI * 2) * 0.025;
        p.push(
          c.x,
          c.y + (u - 0.5) * (0.2 - layer * 0.035) * (1 - 0.55 * Math.pow(Math.abs(2 * t - 1), 6)),
          c.z - fold,
        );
        uv.push(t * 2, u);
        if (j < rows && i < cols) {
          const q = j * (cols + 1) + i;
          idx.push(q, q + 1, q + cols + 1, q + 1, q + cols + 2, q + cols + 1);
        }
      }
    k.part('layered-draped-green-mantle-collar', 0x284a3d, thickSurface(p, uv, idx, 0.018), 'cloth');
  }
}
export function authorGravePauldron(k: ZLKit): void {
  const us = [0, 0.12, 0.22, 0.43, 0.47, 0.53, 0.57, 0.78, 0.88, 1],
    vs = [0, 0.12, 0.22, 0.44, 0.48, 0.56, 0.6, 0.78, 0.88, 1],
    p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j < vs.length; j++)
    for (let i = 0; i < us.length; i++) {
      const u = us[i],
        v = vs[j],
        a = (u - 0.5) * 2.2,
        cross =
          (u >= 0.47 && u <= 0.53 && v >= 0.22 && v <= 0.78) || (v >= 0.48 && v <= 0.56 && u >= 0.22 && u <= 0.78),
        r = 0.42 - (cross ? 0.018 : 0),
        chip = (i === 1 || i === 8) && j === vs.length - 1 ? 0.035 : 0;
      p.push(
        0 - 0.69 + Math.sin(a) * r,
        1.75 + v * 0.65 + Math.sin(u * Math.PI) * 0.13 - chip,
        -0.03 - Math.cos(a) * r,
      );
      uv.push(u, v);
      if (j < vs.length - 1 && i < us.length - 1) {
        const q = j * us.length + i;
        idx.push(q, q + us.length, q + 1, q + 1, q + us.length, q + us.length + 1);
      }
    }
  const geometry = thickSurface(p, uv, idx, 0.1),
    chart = geometry.attributes.uv,
    colors: number[] = [];
  for (let i = 0; i < chart.count; i++) {
    const u = chart.getX(i),
      v = chart.getY(i),
      cross =
        (u >= 0.469 && u <= 0.531 && v >= 0.219 && v <= 0.781) ||
        (v >= 0.479 && v <= 0.561 && u >= 0.219 && u <= 0.781);
    const value = cross ? 0.43 : 1;
    colors.push(value, value, value);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const slab = k.part('thick-curved-engraved-gravestone-pauldron', 0x777a71, geometry, 'metal');
  (slab.material as THREE.MeshStandardMaterial).vertexColors = true;
}
export function leanRoyalCharge(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const upper = new THREE.Group();
  upper.name = 'royal-forward-charge-upper-body';
  const chosen = group.children.filter(
    (o) =>
      !/continuous-trouser-leg|fitted-heavy-boot|boot-sole-seam|fitted-wide-leather-boot-strap|open-metal-boot-buckle/.test(
        o.name,
      ),
  );
  for (const o of chosen) {
    upper.add(o);
    o.position.y -= 1.15;
  }
  upper.position.y = 1.15;
  upper.rotation.set(-0.14, 0, -0.07);
  group.add(upper);
}

export function leanWorkerHunch(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const upper = new THREE.Group();
  upper.name = 'worker-hunched-upper-body';
  for (const o of [...group.children]) {
    if (
      /continuous-trouser-leg|fitted-heavy-boot|boot-sole-seam|fitted-wide-leather-boot-strap|open-metal-boot-buckle/.test(
        o.name,
      )
    )
      continue;
    upper.add(o);
    o.position.y -= 1.1;
  }
  upper.position.y = 1.1;
  upper.rotation.set(-0.13, 0.035, 0.025);
  group.add(upper);
}

export function authorRaggedShoulderLayers(k: ZLKit, body: THREE.Mesh, worker: boolean): void {
  for (const side of [-1, 1]) {
    const outline: [number, number][] = [
      [side * 0.37, 2.25],
      [side * 0.57, 2.28],
      [side * 0.74, 2.18],
      [side * 0.84, 2.05],
      [side * 0.76, 2.08],
      [side * 0.78, 1.99],
      [side * 0.61, 2.08],
      [side * 0.43, 2.12],
    ];
    const name = `ragged-wrapped-shoulder-cloth-${side}`;
    skinPanel(k, body, outline, 0x4c3528, name, worker ? 2 : 4, 'leather', false, 0.05, true);
    const mesh = k.group.getObjectByName(name) as THREE.Mesh,
      g = mesh.geometry,
      p = g.attributes.position,
      uv: number[] = [];
    for (let i = 0; i < p.count; i++) uv.push(p.getX(i) * 2, p.getY(i));
    mesh.geometry = thickSurface(Array.from(p.array), uv, Array.from(g.index!.array), 0.016);
    g.dispose();
  }
}

export function authorSeatedBootStraps(k: ZLKit, boot: THREE.Mesh, x: number, worker: boolean): void {
  for (const y of worker ? [0.265] : [0.19, 0.32]) {
    const cols = 8,
      p: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let j = 0; j <= 1; j++)
      for (let i = 0; i <= cols; i++) {
        const px = x + (i / cols - 0.5) * 0.3,
          py = y + (j - 0.5) * 0.055,
          q = frontSurface(boot, px, py, 0.018);
        p.push(...q);
        uv.push(i / cols, j);
        if (j === 0 && i < cols) {
          const a = i;
          idx.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
        }
      }
    k.part('fitted-wide-leather-boot-strap', 0x876343, thickSurface(p, uv, idx, 0.012), 'leather');
    const center = frontSurface(boot, x + 0.035, y, 0.03),
      ring = k.part(
        'open-metal-boot-buckle',
        0xa68742,
        new THREE.TorusGeometry(0.037, 0.007, 4, worker ? 8 : 10),
        'metal',
      );
    ring.position.set(...center);
    ring.scale.y = 0.78;
  }
}
