import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildDraculaBoss } from './dracula';
import { buildAuthoredDraculaFace } from './DraculaAuthoredFace';

/** Specific geometric regressions only; these do not establish visual quality. */
describe('castle anatomical preservation', () => {
  it('poses the chief nose and jaw rigidly rather than flattening them with the body hunch field', () => {
    const model = buildDraculaBoss('werewolfChief')!;
    model.updateMatrixWorld(true);
    const nose = model.getObjectByName('canine-nose-leather');
    const jaw = model.getObjectByName('connected-lower-jaw');
    expect(nose).toBeDefined();
    expect(jaw).toBeDefined();
    const noseHeight = new THREE.Box3().setFromObject(nose!).getSize(new THREE.Vector3()).y;
    const jawHeight = new THREE.Box3().setFromObject(jaw!).getSize(new THREE.Vector3()).y;
    expect(noseHeight).toBeGreaterThan(0.07);
    expect(noseHeight).toBeLessThan(0.09);
    expect(jawHeight).toBeGreaterThan(0.085);
    expect(jawHeight).toBeLessThan(0.11);
  });

  it('keeps each chief visible amber aperture continuous without skull islands', () => {
    const model = buildDraculaBoss('werewolfChief')!;
    model.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    const eyes = meshes.filter((o) => o.name === 'werewolf-amber-eye');
    expect(eyes).toHaveLength(2);
    for (const eye of eyes) {
      const center = new THREE.Box3().setFromObject(eye).getCenter(new THREE.Vector3());
      let visible = 0;
      for (let y = center.y - 0.012; y <= center.y + 0.012; y += 0.0015) {
        const row: string[] = [];
        for (let x = center.x - 0.04; x <= center.x + 0.04; x += 0.0015) {
          const ray = new THREE.Raycaster(new THREE.Vector3(x, y, -5), new THREE.Vector3(0, 0, 1));
          const name = ray.intersectObjects(meshes, false)[0]?.object.name ?? '';
          const lens = name === 'werewolf-amber-eye' || name === 'werewolf-pupil';
          row.push(lens ? 'E' : name.includes('skull') ? 'S' : 'L');
          if (lens) visible++;
        }
        const first = row.indexOf('E'),
          last = row.lastIndexOf('E');
        if (first >= 0) expect(row.slice(first, last + 1).includes('S')).toBe(false);
      }
      expect(visible).toBeGreaterThan(80);
    }
  });

  it('keeps authored irises circular and pupils visible through the unposed anatomical apertures', () => {
    const meshes = buildAuthoredDraculaFace();
    for (const mesh of meshes) mesh.updateMatrixWorld(true);
    for (const side of ['r', 'l']) {
      const iris = meshes.find((mesh) => mesh.name === `ruby-eye-${side}`)!;
      const pupil = meshes.find((mesh) => mesh.name === `pupil-${side}`)!;
      expect(iris).toBeDefined();
      expect(pupil).toBeDefined();
      const irisSize = new THREE.Box3().setFromObject(iris).getSize(new THREE.Vector3());
      expect(Math.abs(irisSize.x - irisSize.y)).toBeLessThan(0.00001);
      const center = new THREE.Box3().setFromObject(pupil).getCenter(new THREE.Vector3());
      const ray = new THREE.Raycaster(new THREE.Vector3(center.x, center.y, -3), new THREE.Vector3(0, 0, 1));
      expect(ray.intersectObjects(meshes, false)[0]?.object.name).toBe(`pupil-${side}`);
    }
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
});
