import * as THREE from 'three';
/** One closed scalp surface with short swept lock ridges and a shaped hairline. */
export function croppedZombieHair(worker: boolean, head: THREE.Mesh): THREE.BufferGeometry {
  head.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const sides = worker ? 18 : 24,
    rings = worker ? 4 : 7;
  const p: number[] = [0, 3.055, 0.02],
    uv: number[] = [0.5, 0.5],
    indices: number[] = [];
  const locks = [
    [-0.155, -0.055, 0.067, 0.08, 0.075],
    [-0.035, -0.09, 0.07, 0.095, 0.065],
    [0.1, -0.025, 0.072, 0.095, 0.09],
    [0.185, 0.075, 0.065, 0.07, 0.065],
    [-0.08, 0.12, 0.095, 0.075, 0.07],
  ];
  for (let j = 1; j <= rings; j++)
    for (let i = 0; i < sides; i++) {
      const r = j / rings,
        a = (i / sides) * Math.PI * 2,
        edge = 2.84 - 0.01 * Math.cos(a) + 0.005 * Math.sin(a * 5 + 0.4);
      const radial = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      ray.set(new THREE.Vector3(radial.x, edge, radial.z), radial.clone().negate());
      const hit = ray.intersectObject(head, false)[0];
      if (!hit) throw new Error('Authored scalp hairline ray missed cranium');
      const seated = hit.point.clone().addScaledVector(radial, 0.008),
        x = seated.x * r,
        z = seated.z * r;
      let peak = 0;
      for (const [cx, cz, wx, wz, h] of locks)
        peak = Math.max(peak, h * Math.max(0, 1 - Math.abs(x - cx) / wx - Math.abs(z - cz) / wz));
      peak *= Math.min(1, (1 - r) * 3);
      const y = edge + (3.04 - edge) * (1 - r ** 3) + peak;
      p.push(x, y, z + peak * 0.35);
      uv.push(x / 0.58 + 0.5, z / 0.51 + 0.5);
      const q = 1 + (j - 1) * sides + i,
        next = 1 + (j - 1) * sides + ((i + 1) % sides);
      if (j === 1) indices.push(0, next, q);
      else {
        const prev = q - sides,
          pnext = next - sides;
        indices.push(prev, pnext, q, pnext, next, q);
      }
    }
  const base = p.length / 3;
  p.push(0, 2.8, 0);
  uv.push(0.5, 0.5);
  for (let i = 0; i < sides; i++)
    indices.push(base, 1 + (rings - 1) * sides + i, 1 + (rings - 1) * sides + ((i + 1) % sides));
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
