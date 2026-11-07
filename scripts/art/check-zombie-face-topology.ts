import assert from 'node:assert/strict';
import { authorZombieQuadFace } from '../../src/visual/creatures/v2/zombieFaceTopology';
import { ZLKit } from '../../src/visual/creatures/v2/zombieLabTools';
for (const kind of ['zombie', 'giantZombie', 'zombieKing'] as const) {
  const k = new ZLKit();
  const mesh = authorZombieQuadFace(k, kind, 0x889966);
  const g = mesh.geometry,
    p = g.attributes.position,
    indices = g.index?.array ?? Uint32Array.from({ length: p.count }, (_, i) => i),
    edges = new Map<string, number>();
  const ids = new Map<string, number>(),
    keys: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map((x) => Math.round(x * 1e6)).join(',');
    if (!ids.has(k)) ids.set(k, ids.size);
    keys.push(ids.get(k)!);
  }
  let zero = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const t = [keys[indices[i]], keys[indices[i + 1]], keys[indices[i + 2]]];
    if (new Set(t).size < 3) zero++;
    for (let j = 0; j < 3; j++) {
      const a = t[j],
        b = t[(j + 1) % 3],
        k = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  console.log({
    vertices: p.count,
    triangles: indices.length / 3,
    zero,
    boundary: [...edges.values()].filter((n) => n === 1).length,
    nonmanifold: [...edges.values()].filter((n) => n > 2).length,
  });

  assert.equal(zero, 0);
  assert.equal([...edges.values()].filter((n) => n > 2).length, 0);
  assert.equal([...edges.values()].filter((n) => n === 1).length, 32);
  const graph = new Map<number, number[]>();
  for (const [key, count] of edges)
    if (count === 1) {
      const [a, b] = key.split(',').map(Number);
      graph.set(a, [...(graph.get(a) ?? []), b]);
      graph.set(b, [...(graph.get(b) ?? []), a]);
    }
  assert.ok([...graph.values()].every((n) => n.length === 2));
  let loops = 0;
  const seen = new Set<number>();
  for (const start of graph.keys())
    if (!seen.has(start)) {
      loops++;
      const queue = [start];
      while (queue.length) {
        const q = queue.pop()!;
        if (seen.has(q)) continue;
        seen.add(q);
        queue.push(...graph.get(q)!);
      }
    }
  assert.equal(loops, 2);
  console.log(
    'PASS: one closed outer cranium and exactly two intentional integrated orbital/lid aperture loops; no accidental boundary/nonmanifold edge',
  );
}
