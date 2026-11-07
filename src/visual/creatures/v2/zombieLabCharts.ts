import * as THREE from 'three';
/** Explicit per-face dominant-plane charts for hard plates lacking an authored sweep/loft chart.
 * Triangles retain exact positions/normals. No collapsed zero-UV fallback. */
export function authorHardSurfaceCharts(mesh: THREE.Mesh): void {
  if (mesh.geometry.getAttribute('uv')) return;
  const old = mesh.geometry,
    g = old.index ? old.toNonIndexed() : old.clone(),
    p = g.getAttribute('position'),
    uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i),
      b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
      c = new THREE.Vector3().fromBufferAttribute(p, i + 2),
      n = b.clone().sub(a).cross(c.clone().sub(a));
    const omit =
        Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 0 : Math.abs(n.y) > Math.abs(n.z) ? 1 : 2,
      axes = [0, 1, 2].filter((k) => k !== omit);
    for (let j = 0; j < 3; j++) {
      const q = new THREE.Vector3().fromBufferAttribute(p, i + j);
      uv[(i + j) * 2] = q.getComponent(axes[0]);
      uv[(i + j) * 2 + 1] = q.getComponent(axes[1]);
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  mesh.geometry = g;
  old.dispose();
}
/** A coherent panel-wide paint chart, so a diagonal hazard stripe does not restart on every triangle. */
export function authorFrontPanelCharts(mesh: THREE.Mesh): void {
  const old = mesh.geometry,
    g = old.index ? old.toNonIndexed() : old.clone();
  g.computeBoundingBox();
  const box = g.boundingBox!,
    size = box.getSize(new THREE.Vector3()),
    p = g.getAttribute('position'),
    uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i),
      b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
      c = new THREE.Vector3().fromBufferAttribute(p, i + 2),
      n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    for (let j = 0; j < 3; j++) {
      const x = p.getX(i + j),
        y = p.getY(i + j),
        z = p.getZ(i + j);
      uv[(i + j) * 2] =
        Math.abs(n.z) > 0.35
          ? (x - box.min.x) / Math.max(0.0001, size.x)
          : 0.78 + ((z - box.min.z) / Math.max(0.0001, size.z)) * 0.15;
      uv[(i + j) * 2 + 1] = (y - box.min.y) / Math.max(0.0001, size.y);
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  mesh.geometry = g;
  old.dispose();
}
