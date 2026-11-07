import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SculptKit, loftGeometry, sweepGeometry, type Ring } from '../../SculptKit';
import type { Surface, Vec3 } from '../../ModelKit';

/** Closed caps are rebuilt with matching POSITION/NORMAL/UV counts. */
export function closeRings(g: THREE.BufferGeometry, sides: number): THREE.BufferGeometry {
  const p = g.getAttribute('position'),
    uv = g.getAttribute('uv');
  const positions = Array.from(p.array),
    tex = Array.from(uv.array),
    indices = Array.from(g.index!.array);
  const last = p.count - sides - 1;
  for (const [start, reverse] of [
    [0, true],
    [last, false],
  ] as const) {
    const c = new THREE.Vector3();
    for (let i = 0; i < sides; i++) c.add(new THREE.Vector3().fromBufferAttribute(p, start + i));
    c.divideScalar(sides);
    const center = positions.length / 3;
    positions.push(...c.toArray());
    tex.push(0.5, 0.5);
    const capStart = positions.length / 3;
    for (let i = 0; i <= sides; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, start + i);
      positions.push(...v.toArray());
      const angle = (i / sides) * Math.PI * 2;
      tex.push(0.5 + 0.49 * Math.cos(angle), 0.5 + 0.49 * Math.sin(angle));
    }
    for (let i = 0; i < sides; i++)
      indices.push(...(reverse ? [center, capStart + i + 1, capStart + i] : [center, capStart + i, capStart + i + 1]));
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
  g.setIndex(indices);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

export class SeaSkullKit extends SculptKit {
  closedLoft(color: number, profile: readonly Ring[], rings = 24, sides = 20, surface: Surface = 'cloth'): THREE.Mesh {
    return this.mesh(
      closeRings(loftGeometry(profile, rings, sides), sides),
      color,
      [0, 0, 0],
      [1, 1, 1],
      this.group,
      surface,
    );
  }
  limb(
    color: number,
    points: readonly Vec3[],
    widths: readonly number[],
    depths = widths,
    steps = 18,
    sides = 10,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    return this.mesh(
      closeRings(sweepGeometry(points, widths, depths, steps, sides), sides),
      color,
      [0, 0, 0],
      [1, 1, 1],
      this.group,
      surface,
    );
  }
  /** Broad vane fixed to the anatomical wing plane; avoids mirrored sweep-frame edge-on feathers. */
  planarFeather(
    color: number,
    points: readonly Vec3[],
    widths: readonly number[],
    depths: readonly number[],
    steps = 12,
    sides = 8,
  ): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    const pos: number[] = [],
      uv: number[] = [],
      ix: number[] = [];
    for (let row = 0; row <= steps; row++) {
      const t = row / steps,
        c = curve.getPointAt(t),
        tan = curve.getTangentAt(t),
        axis = new THREE.Vector3(tan.y, -tan.x, 0).normalize();
      const f = t * (widths.length - 1),
        j = Math.min(widths.length - 2, Math.floor(f)),
        blend = f - j,
        w = THREE.MathUtils.lerp(widths[j], widths[j + 1], blend),
        d = THREE.MathUtils.lerp(depths[j], depths[j + 1], blend);
      for (let col = 0; col <= sides; col++) {
        const a = (col / sides) * Math.PI * 2,
          p = c.clone().addScaledVector(axis, Math.cos(a) * w);
        p.z += Math.sin(a) * d;
        pos.push(...p.toArray());
        uv.push(0.5 + 0.5 * Math.cos(a), t);
      }
      if (row < steps)
        for (let col = 0; col < sides; col++) {
          const a = row * (sides + 1) + col,
            b = a + sides + 1;
          ix.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    const closed = closeRings(g, sides),
      index = closed.index!;
    // This fixed-plane frame has opposite ring handedness to SculptKit's transported frame.
    for (let i = ix.length; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    closed.computeVertexNormals();
    return this.mesh(closed, color);
  }
  /** Closed, gently bowed radial fin membrane with a smooth authored outer contour. */
  fanMembrane(color: number, root: Vec3, edge: readonly Vec3[], normal: Vec3, rows = 5, columns = 10): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(
      edge.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    const r = new THREE.Vector3(...root),
      n = new THREE.Vector3(...normal).normalize();
    const pos: number[] = [],
      uv: number[] = [],
      ix: number[] = [];
    for (const side of [-1, 1]) {
      pos.push(
        ...r
          .clone()
          .addScaledVector(n, side * 0.002)
          .toArray(),
      );
      uv.push(0.5, 0);
      for (let row = 1; row <= rows; row++)
        for (let col = 0; col <= columns; col++) {
          const t = row / rows,
            p = r.clone().lerp(curve.getPointAt(col / columns), t);
          const bow = 0.015 * Math.sin(Math.PI * t) * Math.sin((Math.PI * col) / columns);
          p.addScaledVector(n, bow + side * (0.001 + 0.003 * Math.sin(Math.PI * t)));
          pos.push(...p.toArray());
          uv.push(col / columns, t);
        }
    }
    const count = 1 + rows * (columns + 1),
      at = (side: number, row: number, col: number) =>
        side * count + (row === 0 ? 0 : 1 + (row - 1) * (columns + 1) + col);
    for (let side = 0; side < 2; side++) {
      const tri = (a: number, b: number, c: number) => ix.push(...(side ? [a, c, b] : [a, b, c]));
      for (let col = 0; col < columns; col++) tri(at(side, 0, 0), at(side, 1, col), at(side, 1, col + 1));
      for (let row = 1; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          tri(at(side, row, col), at(side, row + 1, col), at(side, row + 1, col + 1));
          tri(at(side, row, col), at(side, row + 1, col + 1), at(side, row, col + 1));
        }
    }
    const rim = [
      at(0, 0, 0),
      ...Array.from({ length: rows }, (_, i) => at(0, i + 1, 0)),
      ...Array.from({ length: columns }, (_, i) => at(0, rows, i + 1)),
      ...Array.from({ length: rows - 1 }, (_, i) => at(0, rows - 1 - i, columns)),
    ];
    for (let i = 0; i < rim.length; i++) {
      const a = rim[i],
        b = rim[(i + 1) % rim.length];
      ix.push(a, b + count, b, a, a + count, b + count);
    }
    let volume = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const a = new THREE.Vector3().fromArray(pos, ix[i] * 3),
        b = new THREE.Vector3().fromArray(pos, ix[i + 1] * 3),
        c = new THREE.Vector3().fromArray(pos, ix[i + 2] * 3);
      volume += a.dot(b.cross(c)) / 6;
    }
    if (Math.abs(volume) < 1e-8) throw new Error('Degenerate authored fin membrane');
    if (volume < 0) for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return this.mesh(g, color);
  }
  /** A shaped solid blade with a convex central ridge, not an unlit flat triangle. */
  blade(
    color: number,
    outline: readonly Vec3[],
    normal: Vec3,
    thickness: number,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    const center = new THREE.Vector3();
    for (const p of outline) center.add(new THREE.Vector3(...p));
    center.divideScalar(outline.length);
    const n = new THREE.Vector3(...normal).normalize(),
      vertices: number[] = [],
      indices: number[] = [];
    vertices.push(
      ...center.clone().addScaledVector(n, thickness).toArray(),
      ...center.clone().addScaledVector(n, -thickness).toArray(),
    );
    for (const p of outline) vertices.push(...p);
    for (let i = 0; i < outline.length; i++) {
      const a = 2 + i,
        b = 2 + ((i + 1) % outline.length);
      indices.push(0, a, b, 1, b, a);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const axisU = new THREE.Vector3(...outline[0]).sub(center);
    axisU.addScaledVector(n, -axisU.dot(n)).normalize();
    const axisV = n.clone().cross(axisU).normalize(),
      coords: number[] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      const d = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]).sub(center);
      coords.push(d.dot(axisU), d.dot(axisV));
    }
    const us = coords.filter((_, i) => i % 2 === 0),
      vs = coords.filter((_, i) => i % 2 === 1),
      umin = Math.min(...us),
      vmin = Math.min(...vs),
      urange = Math.max(...us) - umin || 1,
      vrange = Math.max(...vs) - vmin || 1;
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        coords.map((v, i) => (i % 2 ? (v - vmin) / vrange : (v - umin) / urange)),
        2,
      ),
    );

    g.setIndex(indices);
    g.computeVertexNormals();
    const mesh = this.mesh(g, color, [0, 0, 0], [1, 1, 1], this.group, surface);
    (mesh.material as THREE.Material).side = THREE.DoubleSide;
    return mesh;
  }
  /** Every facial polygon vertex is projected to its target body; missing hits are errors. */
  patch(
    body: THREE.Mesh,
    color: number,
    outline: readonly [number, number][],
    axis: 'x' | 'z',
    side = 1,
    offset = 0.004,
    surface: Surface = 'cloth',
    subdivisions = 1,
    relief = 0,
  ): THREE.Mesh {
    body.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const points: Vec3[] = [];
    const surfaceUV: number[] = [];
    const center: [number, number] = [0, 0];
    for (const p of outline) {
      center[0] += p[0] / outline.length;
      center[1] += p[1] / outline.length;
    }
    const samples: [number, number][] = [];
    const bulges: number[] = [];
    const indices: number[] = [];
    for (let edge = 0; edge < outline.length; edge++) {
      const a = outline[edge],
        b = outline[(edge + 1) % outline.length],
        rows: number[][] = [];
      for (let row = 0; row <= subdivisions; row++) {
        rows[row] = [];
        for (let col = 0; col <= row; col++) {
          const u = (row - col) / subdivisions,
            v = col / subdivisions;
          rows[row].push(samples.length);
          bulges.push(Math.pow(Math.max(0, 1 - u - v), 1.3) * relief);
          samples.push([center[0] * (1 - u - v) + a[0] * u + b[0] * v, center[1] * (1 - u - v) + a[1] * u + b[1] * v]);
        }
      }
      for (let row = 0; row < subdivisions; row++)
        for (let col = 0; col <= row; col++) {
          indices.push(rows[row][col], rows[row + 1][col], rows[row + 1][col + 1]);
          if (col < row) indices.push(rows[row][col], rows[row + 1][col + 1], rows[row][col + 1]);
        }
    }
    for (const [sampleIndex, p] of samples.entries()) {
      ray.set(
        axis === 'x' ? new THREE.Vector3(side * 8, p[1], p[0]) : new THREE.Vector3(p[0], p[1], side * 8),
        axis === 'x' ? new THREE.Vector3(-side, 0, 0) : new THREE.Vector3(0, 0, -side),
      );
      const hit = ray.intersectObject(body, false)[0];
      if (!hit?.face) throw new Error(`Missing projected ${axis} face at ${p}`);
      if (!hit.uv) throw new Error(`Projected ${axis} surface has no authored UV`);
      surfaceUV.push(hit.uv.x, hit.uv.y);
      const normal = hit.face.normal.clone().transformDirection(body.matrixWorld);
      points.push(
        hit.point
          .clone()
          .addScaledVector(normal, offset + bulges[sampleIndex])
          .toArray() as [number, number, number],
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(surfaceUV, 2));
    g.setIndex(indices);
    const smooth = mergeVertices(g, 1e-6);
    smooth.computeVertexNormals();
    g.dispose();
    const m = this.mesh(smooth, color, [0, 0, 0], [1, 1, 1], this.group, surface);
    (m.material as THREE.Material).side = THREE.DoubleSide;
    m.name = 'surface-projected-feature';
    return m;
  }
}
