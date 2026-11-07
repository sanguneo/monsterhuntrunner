import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { authoredSchoolFace as girl } from './creatures/v2/generated/schoolGirlFace';
import { authoredSchoolFace as teacher } from './creatures/v2/generated/schoolTeacherFace';

/** Evaluated-geometry clearance only; never a substitute for expression/reference pixel review. */
describe('authored school orbital geometry', () => {
  for (const [identity, parts] of [['teacher', teacher]] as const)
    it(`${identity} keeps evaluated upper/lower eyelid skin outside the actual eye globes`, () => {
      const skin = parts.find((p) => p.name === 'authored-school-face');
      expect(skin).toBeDefined();
      const xs = 1,
        ys = 1;
      const cy = 2.94 - 0.19,
        cz = -0.095 - 0.025;
      const positions = skin!.position;
      let samples = 0,
        minimum = Infinity;
      for (let i = 0; i < positions.length; i += 9) {
        const v = [0, 3, 6].map((j) => new THREE.Vector3(positions[i + j], positions[i + j + 1], positions[i + j + 2]));
        const probes = [
          ...v,
          ...v.map((p, j) =>
            p
              .clone()
              .add(v[(j + 1) % 3])
              .multiplyScalar(0.5),
          ),
          v[0]
            .clone()
            .add(v[1])
            .add(v[2])
            .multiplyScalar(1 / 3),
        ];
        for (const p of probes) {
          const side = p.x >= 0 ? 1 : -1,
            rx = 0.039 * xs,
            ry = 0.031 * ys,
            r2 = ((p.x - side * 0.075 * xs) / rx) ** 2 + ((p.y - cy) / ry) ** 2;
          if (r2 >= 0.999 || p.z >= cz + 0.02) continue;
          minimum = Math.min(minimum, cz - 0.039 * Math.sqrt(1 - r2) - p.z);
          samples++;
        }
      }
      expect(samples).toBeGreaterThan(1000);
      expect(minimum).toBeGreaterThan(0.001);
    });
});

/** The CC0-derived girl has anatomical inner socket faces, not the teacher's analytic ellipsoid lids.
 * Test actual exposed optical layers and deliberate upper-lid occlusion, not a false all-skin sphere inequality. */
describe('anatomical specter optical surfaces', () => {
  function mesh(name: string) {
    const part = girl.find((p) => p.name === name)!;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    const result = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    result.updateMatrixWorld();
    return result;
  }
  for (const side of ['l', 'r'])
    it(`${side} iris/pupil remain clear of actual surfaces and readable beneath the lid`, () => {
      const skin = mesh('authored-school-face');
      const iris = mesh('school-iris-' + side),
        pupil = mesh('school-pupil-' + side);
      const globe = mesh('authored-almond-sclera-' + side);
      for (const [part, underlying] of [
        [iris, globe],
        [pupil, iris],
      ]) {
        const positions = part.geometry.getAttribute('position');
        let samples = 0,
          visible = 0,
          clearance = Infinity;
        for (let i = 0; i < positions.count; i += 3) {
          const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(positions, i + j));
          const probes = [
            ...v,
            ...v.map((p, j) =>
              p
                .clone()
                .add(v[(j + 1) % 3])
                .multiplyScalar(0.5),
            ),
            v[0]
              .clone()
              .add(v[1])
              .add(v[2])
              .multiplyScalar(1 / 3),
          ];
          for (const p of probes) {
            const ray = new THREE.Raycaster(new THREE.Vector3(p.x, p.y, -1), new THREE.Vector3(0, 0, 1));
            const under = ray.intersectObject(underlying, false)[0];
            expect(under).toBeDefined();
            clearance = Math.min(clearance, under.point.z - p.z);
            const occlusion = ray.intersectObject(skin, false)[0];
            if (!occlusion || occlusion.point.z > p.z) visible++;
            samples++;
          }
        }
        expect(clearance).toBeGreaterThan(0.00039); // Authored0.4mm gap, Float32 allowance10microns.
        expect(samples).toBeGreaterThan(100);
        expect(visible / samples).toBeGreaterThan(part === pupil ? 0.99 : 0.65);
        if (part === iris) expect(visible / samples).toBeLessThan(0.9); // Actual upper-lid coverage, not staring discs.
      }
      for (const object of [skin, iris, pupil, globe]) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
});
