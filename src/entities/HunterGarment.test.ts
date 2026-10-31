import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerModel, type PlayerPose } from './PlayerModel';

/** Actual triangle occlusion, not bounding-box containment or draw-order assumptions. */
describe('hunter cloth / leg coverage', () => {
  it('keeps hidden thighs behind clothing and avoids cloth-edge intersections across gait', () => {
    const hunter = new PlayerModel();
    const rig = hunter.group.getObjectByName('courier-pose')!;
    const garment = hunter.group.getObjectByName('hunter-garment-shell')!;
    const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const cloth: THREE.Mesh[] = [];
    const sources: THREE.Mesh[] = [];
    garment.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !['hunter-shirt-shell', 'hunter-coat-shell'].includes(node.name)) return;
      sources.push(node);
      const probe = new THREE.Mesh(node.geometry, probeMaterial);
      probe.matrixAutoUpdate = false;
      cloth.push(probe);
    });
    expect(cloth.length).toBe(2);
    const legs: THREE.Mesh[] = [];
    hunter.group.traverse((node) => {
      if (node instanceof THREE.Mesh && node.name === 'continuous-bent-rabbit-leg') legs.push(node);
    });
    expect(legs.length).toBe(2);
    const pelvis = hunter.group.getObjectByName('continuous-inner-pelvis') as THREE.Mesh;
    expect(pelvis).toBeInstanceOf(THREE.Mesh);
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
    // Hem values are authored garment extents, not thresholds fitted to a failed sample.
    // Front shirt lip=.620, rear coat hem=.585, side coat hem=.620. A .010 band
    // excludes the open hem boundary itself; hidden thigh must have .010 cloth clearance.
    const views = [
      { name: 'front', d: new THREE.Vector3(0, 0, 1), hem: 0.62 },
      { name: 'rear', d: new THREE.Vector3(0, 0, -1), hem: 0.585 },
      { name: 'left', d: new THREE.Vector3(-1, 0, 0), hem: 0.62 },
      { name: 'right', d: new THREE.Vector3(1, 0, 0), hem: 0.62 },
    ];
    // Diagonal and elevated cameras catch bulges hidden by cardinal projections.
    // The curved coat hem is .620 + .035*cos(angle); .655 is its analytic
    // upper bound. Mixed views test only above that curve, not an invented flat hem.
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        for (const elevation of [0, 0.4])
          views.push({
            name: `diagonal-${x}-${z}-${elevation}`,
            d: new THREE.Vector3(x, elevation, z).normalize(),
            hem: 0.655,
          });
    const ray = new THREE.Raycaster();
    let samples = 0,
      minClearance = Infinity,
      seamRayRetries = 0,
      edgeChecks = 0,
      reverseEdgeChecks = 0,
      minCoveredSamplesPerLeg = Infinity,
      minVisibleLegVertices = Infinity;
    const perLegViewCounts: object[] = [];
    const unclassifiedDiagonalSamples = new Map<string, number>();
    const worstByView = new Map<string, { clearance: number; pose: string; protectedBody: string; point: number[] }>();
    const coverageFailures: object[] = [],
      edgeCrossings: object[] = [];
    const rigidGeometrySnapshots = [pelvis, ...sources].map((mesh) =>
      Array.from(mesh.geometry.getAttribute('position').array),
    );
    let rigidClothMatrices: number[][] | undefined;
    let rigidPelvisRelativeMatrix: number[] | undefined;
    let rigidPelvisPoseChecks = 0;
    for (const sample of cases) {
      hunter.reset();
      for (const pre of sample.pre ?? []) hunter.update(pre.dt, pre.pose);
      hunter.update(sample.t, sample.pose);
      hunter.group.updateMatrixWorld(true);
      const inverse = rig.matrixWorld.clone().invert();
      cloth.forEach((probe, i) => probe.matrixWorld.copy(inverse).multiply(sources[i].matrixWorld));
      const currentClothMatrices = cloth.map((mesh) => [...mesh.matrixWorld.elements]);
      if (rigidClothMatrices) {
        currentClothMatrices.forEach((matrix, m) =>
          matrix.forEach((v, i) => expect(Math.abs(v - rigidClothMatrices![m][i])).toBeLessThan(1e-12)),
        );
      } else rigidClothMatrices = currentClothMatrices;
      [pelvis, ...sources].forEach((mesh, i) =>
        expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(rigidGeometrySnapshots[i]),
      );
      const pelvisRelative = inverse.clone().multiply(pelvis.matrixWorld).elements;
      if (rigidPelvisRelativeMatrix) {
        for (let i = 0; i < 16; i++)
          expect(Math.abs(pelvisRelative[i] - rigidPelvisRelativeMatrix[i])).toBeLessThan(1e-12);
      } else rigidPelvisRelativeMatrix = [...pelvisRelative];
      rigidPelvisPoseChecks++;
      // Pelvis and garment are rigid in the same rig. Check the exact same relative
      // geometry once, while asserting this invariant for every animation pose.
      for (const leg of rigidPelvisPoseChecks === 1 ? [...legs, pelvis] : legs) {
        const geometry = leg.geometry,
          p = geometry.getAttribute('position'),
          matrix = inverse.clone().multiply(leg.matrixWorld);
        const points = Array.from({ length: p.count }, (_, i) =>
          new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(matrix),
        );
        const coveragePoints = [...points];
        const faces = geometry.index!;
        for (let i = 0; i < faces.count; i += 3) {
          const a = points[faces.getX(i)],
            b = points[faces.getX(i + 1)],
            c = points[faces.getX(i + 2)];
          coveragePoints.push(
            a.clone().add(b).add(c).divideScalar(3),
            a.clone().add(b).multiplyScalar(0.5),
            b.clone().add(c).multiplyScalar(0.5),
            c.clone().add(a).multiplyScalar(0.5),
          );
        }
        let visibleLegVertices = 0;
        for (const point of points)
          if (point.y > 0.35 && point.y < 0.6) {
            ray.set(point.clone().add(new THREE.Vector3(0, 0, 4)), new THREE.Vector3(0, 0, -1));
            ray.near = 0;
            ray.far = 8;
            const hit = ray.intersectObjects(cloth, false)[0];
            if (!hit || hit.distance >= 4 - 0.001) visibleLegVertices++;
          }
        if (leg !== pelvis) minVisibleLegVertices = Math.min(minVisibleLegVertices, visibleLegVertices);
        const coveredByView = new Map(views.map((view) => [view.name, 0]));
        // Shared triangle midpoints and pole/seam vertices are identical samples;
        // deduplicate them without removing any distinct authored location.
        const uniqueCoveragePoints = [
          ...new Map(coveragePoints.map((point) => [point.toArray().join(','), point])).values(),
        ];
        for (const [vertex, point] of uniqueCoveragePoints.entries())
          for (const view of views) {
            if (point.y <= view.hem + 0.01) {
              if (view.name.startsWith('diagonal') && point.y > 0.62)
                unclassifiedDiagonalSamples.set(view.name, (unclassifiedDiagonalSamples.get(view.name) ?? 0) + 1);
              continue;
            }
            samples++;
            coveredByView.set(view.name, coveredByView.get(view.name)! + 1);
            ray.set(point.clone().addScaledVector(view.d, 4), view.d.clone().negate());
            ray.near = 0;
            ray.far = 8;
            let hit = ray.intersectObjects(cloth, false)[0];
            // The authored shirt front UV seam lies at x=0. Only that proven
            // coincident seam gets symmetric 2e-6 probes; both must agree and cover
            // the sample. An opening or disagreement retains the original failure.
            if ((!hit || hit.distance > 3.99) && view.name === 'front' && Math.abs(point.x) < 1e-10) {
              const origin = point.clone().addScaledVector(view.d, 4);
              const neighbors: THREE.Intersection[] = [];
              for (const sign of [-1, 1]) {
                seamRayRetries++;
                ray.set(origin.clone().add(new THREE.Vector3(sign * 0.000002, 0, 0)), view.d.clone().negate());
                const adjacent = ray.intersectObjects(cloth, false)[0];
                if (adjacent && adjacent.distance <= 3.99) neighbors.push(adjacent);
              }
              if (neighbors.length === 2 && Math.abs(neighbors[0].distance - neighbors[1].distance) < 0.00001)
                hit = neighbors[0].distance > neighbors[1].distance ? neighbors[0] : neighbors[1];
            }
            const clearance = hit ? 4 - hit.distance : -Infinity;
            minClearance = Math.min(minClearance, clearance);
            if (clearance < (worstByView.get(view.name)?.clearance ?? Infinity))
              worstByView.set(view.name, {
                clearance,
                pose: sample.name,
                protectedBody: leg === pelvis ? pelvis.name : leg.parent!.name,
                point: point.toArray(),
              });
            if (clearance < 0.01 && coverageFailures.length < 20)
              coverageFailures.push({ pose: sample.name, view: view.name, vertex, point: point.toArray(), clearance });
          }
        perLegViewCounts.push({
          pose: sample.name,
          protectedBody: leg === pelvis ? pelvis.name : leg.parent!.name,
          counts: Object.fromEntries(coveredByView),
        });
        // Some poses legitimately have no remaining topology above a particular
        // hem. Require coverage per leg, and retain per-view counts for audit.
        minCoveredSamplesPerLeg = Math.min(
          minCoveredSamplesPerLeg,
          [...coveredByView.values()].reduce((a, b) => a + b, 0),
        );
        // Reverse direction closes the case where a cloth edge crosses a leg face
        // without any leg edge crossing the cloth triangle. Ignore only the actual
        // open-hem transition region, not the protected upper-thigh region.
        const legProbe = new THREE.Mesh(geometry, probeMaterial);
        legProbe.matrixAutoUpdate = false;
        legProbe.matrixWorld.copy(matrix);
        for (const clothProbe of cloth) {
          const cp = clothProbe.geometry.getAttribute('position');
          const ci = clothProbe.geometry.index!;
          const clothEdges = new Set<string>();
          for (let i = 0; i < ci.count; i += 3)
            for (const [a, b] of [
              [ci.getX(i), ci.getX(i + 1)],
              [ci.getX(i + 1), ci.getX(i + 2)],
              [ci.getX(i + 2), ci.getX(i)],
            ]) {
              const key = a < b ? `${a}:${b}` : `${b}:${a}`;
              if (clothEdges.has(key)) continue;
              clothEdges.add(key);
              const start = new THREE.Vector3().fromBufferAttribute(cp, a).applyMatrix4(clothProbe.matrixWorld);
              const end = new THREE.Vector3().fromBufferAttribute(cp, b).applyMatrix4(clothProbe.matrixWorld);
              if (Math.max(start.y, end.y) <= 0.63) continue;
              const delta = end.clone().sub(start),
                length = delta.length();
              if (length < 0.0001) continue;
              reverseEdgeChecks++;
              delta.divideScalar(length);
              ray.set(start.clone().addScaledVector(delta, 0.00005), delta);
              ray.near = 0;
              ray.far = length - 0.0001;
              const hit = ray.intersectObject(legProbe, false).find((hit) => hit.point.y > 0.63);
              if (hit && edgeCrossings.length < 20)
                edgeCrossings.push({
                  pose: sample.name,
                  direction: 'cloth-to-leg',
                  edge: [a, b],
                  point: hit.point.toArray(),
                });
            }
        }
        const index = geometry.index!,
          edges = new Set<string>();
        for (let i = 0; i < index.count; i += 3)
          for (const [a, b] of [
            [index.getX(i), index.getX(i + 1)],
            [index.getX(i + 1), index.getX(i + 2)],
            [index.getX(i + 2), index.getX(i)],
          ]) {
            const key = a < b ? `${a}:${b}` : `${b}:${a}`;
            if (edges.has(key)) continue;
            edges.add(key);
            const start = points[a],
              end = points[b];
            if (Math.max(start.y, end.y) < 0.585) continue;
            const delta = end.clone().sub(start),
              length = delta.length();
            if (length < 0.0001) continue;
            edgeChecks++;
            delta.divideScalar(length);
            ray.set(start.clone().addScaledVector(delta, 0.00005), delta);
            ray.near = 0;
            ray.far = length - 0.0001;
            if (ray.intersectObjects(cloth, false).length && edgeCrossings.length < 20)
              edgeCrossings.push({ pose: sample.name, edge: [a, b], start: start.toArray(), end: end.toArray() });
          }
      }
    }
    probeMaterial.dispose();
    const report = {
      status: coverageFailures.length || edgeCrossings.length ? 'failed' : 'numerical-pass-pixels-pending',
      poses: cases,
      poseCount: cases.length,
      samples,
      edgeChecks,
      minClearance,
      seamRayRetries,
      rayEdgeNumericalTolerance: 0.000002,
      reverseEdgeChecks,
      rigidPelvisPoseChecks,
      pelvisCoverageScope:
        'One unique rigid pelvis/cloth configuration; relative matrix invariant asserted across all poses',
      minCoveredSamplesPerLeg,
      perLegViewCounts,
      worstByView: Object.fromEntries(worstByView),
      unclassifiedDiagonalHemBand: {
        status: 'visual-review-required-not-an-occlusion-pass',
        authoredVariableHemY: [0.62, 0.655],
        excludedUpperYIncludingTransition: 0.665,
        sampleCountsByView: Object.fromEntries(unclassifiedDiagonalSamples),
      },
      minVisibleLegVertices,
      hemTransitionBand: 0.01,
      requiredClothClearance: 0.01,
      views: views.map((v) => ({ name: v.name, direction: v.d.toArray(), hem: v.hem })),
      coverageFailures,
      edgeCrossings,
      renderMapping: {
        idle: 'hunter-review-{front,side,rear,three-quarter}.png',
        slide: 'hunter-pose-slide{,-rear}.png',
        'run-at-0.16': 'hunter-pose-run{,-rear}.png',
      },
    };
    console.log('HUNTER_GARMENT_REPORT', JSON.stringify(report));
    expect(samples).toBeGreaterThan(100);
    expect(reverseEdgeChecks).toBeGreaterThan(100);
    expect(minCoveredSamplesPerLeg).toBeGreaterThan(0);
    expect(minVisibleLegVertices).toBeGreaterThanOrEqual(6);
    expect(coverageFailures).toEqual([]);
    expect(edgeCrossings).toEqual([]);
  }, 120000);
});
