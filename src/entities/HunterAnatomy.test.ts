import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerModel, type PlayerPose } from './PlayerModel';

/** Root attachment is distinct from outer-cloth occlusion and floor support. */
describe('hunter inner pelvis / leg attachment', () => {
  it('contains both trimmed upper leg roots inside a closed pelvis in action and low underside views', () => {
    const hunter = new PlayerModel();
    const rig = hunter.group.getObjectByName('courier-pose')!;
    const pelvis = hunter.group.getObjectByName('continuous-inner-pelvis') as THREE.Mesh;
    expect(pelvis).toBeInstanceOf(THREE.Mesh);
    const legs: THREE.Mesh[] = [];
    hunter.group.traverse((node) => {
      if (node instanceof THREE.Mesh && node.name === 'continuous-bent-rabbit-leg') legs.push(node);
    });
    expect(legs).toHaveLength(2);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const probe = new THREE.Mesh(pelvis.geometry, material);
    probe.matrixAutoUpdate = false;
    // Weld coincident seams/poles only for topology inspection, not authored geometry.
    const positions = pelvis.geometry.getAttribute('position');
    const welded = new Map<string, number>();
    const ids = Array.from({ length: positions.count }, (_, i) => {
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].map((v) => Math.round(v * 1e6)).join(':');
      if (!welded.has(key)) welded.set(key, welded.size);
      return welded.get(key)!;
    });
    const index = pelvis.geometry.index;
    const edgeUses = new Map<string, number>();
    const count = index?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      const tri = [0, 1, 2].map((j) => ids[index ? index.getX(i + j) : i + j]);
      if (new Set(tri).size < 3) continue;
      for (const [a, b] of [
        [tri[0], tri[1]],
        [tri[1], tri[2]],
        [tri[2], tri[0]],
      ]) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
      }
    }
    expect(edgeUses.size).toBeGreaterThan(50);
    expect(
      [...edgeUses.values()].every((uses) => uses === 2),
      'pelvis is a genuinely closed two-manifold shell',
    ).toBe(true);
    const idle: PlayerPose = {
      running: false,
      airborne: false,
      sliding: false,
      dash: false,
      lateralVelocity: 0,
      verticalVelocity: 0,
      invulnerable: false,
      alive: true,
    };
    const cases: { name: string; t: number; pose: PlayerPose; pre?: { dt: number; pose: PlayerPose }[] }[] = [];
    for (const dash of [false, true])
      for (let frame = 0; frame < 24; frame++)
        cases.push({
          name: `${dash ? 'dash' : 'run'}-${frame}`,
          t: ((frame / 24) * Math.PI * 2) / (dash ? 23 : 16),
          pose: { ...idle, running: true, dash },
        });
    cases.push(
      { name: 'idle', t: 0, pose: idle },
      { name: 'slide', t: 0.16, pose: { ...idle, running: true, sliding: true } },
      { name: 'jump-rise', t: 0.16, pose: { ...idle, airborne: true, verticalVelocity: 3 } },
      { name: 'jump-fall', t: 0.16, pose: { ...idle, airborne: true, verticalVelocity: -3 } },
      { name: 'jump-apex', t: 0.16, pose: { ...idle, airborne: true, verticalVelocity: 0 } },
      {
        name: 'slide-entry',
        t: 0.016,
        pose: { ...idle, running: true, sliding: true },
        pre: [{ dt: 0.1, pose: { ...idle, running: true } }],
      },
      {
        name: 'slide-exit',
        t: 0.016,
        pose: { ...idle, running: true },
        pre: [{ dt: 0.16, pose: { ...idle, running: true, sliding: true } }],
      },
      {
        name: 'landing',
        t: 0.016,
        pose: { ...idle, running: true },
        pre: [{ dt: 0.16, pose: { ...idle, airborne: true, verticalVelocity: -3 } }],
      },
    );

    const directions = [
      new THREE.Vector3(1, 0.371, 0.217),
      new THREE.Vector3(-0.311, 1, 0.191),
      new THREE.Vector3(0.271, -0.413, 1),
      new THREE.Vector3(-1, -0.4, 1),
      new THREE.Vector3(1, -0.4, 1),
      new THREE.Vector3(0, -1, 0.3),
      new THREE.Vector3(-1, -0.4, -1),
      new THREE.Vector3(1, -0.4, -1),
    ].map((d) => d.normalize());
    const ray = new THREE.Raycaster();
    const failures: object[] = [],
      records: object[] = [];
    let checks = 0,
      minOverlap = Infinity;
    for (const sample of cases) {
      hunter.reset();
      for (const pre of sample.pre ?? []) hunter.update(pre.dt, pre.pose);
      hunter.update(sample.t, sample.pose);
      hunter.group.updateMatrixWorld(true);
      const inverse = rig.matrixWorld.clone().invert();
      probe.matrixWorld.copy(inverse).multiply(pelvis.matrixWorld);
      for (const leg of legs) {
        const p = leg.geometry.getAttribute('position'),
          matrix = inverse.clone().multiply(leg.matrixWorld);
        let rootSamples = 0;
        for (let i = 0; i < p.count; i++) {
          // Last cap and adjoining upper-root band, never the visible knee/shin.
          if (p.getY(i) < -0.11) continue;
          rootSamples++;
          const point = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix);
          for (const [view, direction] of directions.entries()) {
            checks++;
            ray.set(point, direction);
            ray.near = 1e-7;
            ray.far = 10;
            const distances = ray
              .intersectObject(probe, false)
              .map((h) => h.distance)
              .filter((d, j, a) => j === 0 || Math.abs(d - a[j - 1]) > 1e-5);
            const overlap = distances[0] ?? -Infinity;
            minOverlap = Math.min(minOverlap, overlap);
            // Odd parity establishes inside; positive exit distance establishes overlap.
            if ((distances.length % 2 !== 1 || overlap <= 0.003) && failures.length < 30)
              failures.push({
                pose: sample.name,
                leg: leg.parent!.name,
                vertex: i,
                view,
                point: point.toArray(),
                distances,
              });
            // A low camera must encounter the intended pelvis before the trimmed cap.
            if (direction.y < 0) {
              ray.set(point.clone().addScaledVector(direction, 4), direction.clone().negate());
              ray.near = 0;
              ray.far = 4;
              const hit = ray.intersectObject(probe, false)[0];
              if ((!hit || hit.distance >= 3.997) && failures.length < 30)
                failures.push({
                  pose: sample.name,
                  leg: leg.parent!.name,
                  vertex: i,
                  view,
                  reason: 'missing or insufficient underside root cover',
                });
            }
          }
        }
        expect(rootSamples, 'cap and adjacent authored ring are tested').toBeGreaterThan(10);
        records.push({ pose: sample.name, leg: leg.parent!.name, rootSamples });
      }
    }
    material.dispose();
    console.log(
      'HUNTER_ANATOMY_REPORT',
      JSON.stringify({
        scope: 'Sampled upper cap and adjacent root band only; not an exhaustive whole-body intersection proof',
        poses: cases,
        records,
        checks,
        minOverlap: Number.isFinite(minOverlap) ? minOverlap : null,
        requiredOverlap: 0.003,
        rootLocalYMin: -0.11,
        views: directions.map((d) => d.toArray()),
        failures,
        pixelReview: 'Required: contained caps alone do not prove natural garment drape',
      }),
    );
    expect(failures).toEqual([]);
  }, 60000);
});
