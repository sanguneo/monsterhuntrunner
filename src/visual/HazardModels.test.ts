import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createHazardModel } from './HazardModels';

describe('hazard semantic rebuild', () => {
  it('keeps each pit flush and dark despite directional lighting, with six distinct edges', () => {
    const signatures = new Set<string>();
    for (let world = 0; world < 6; world++) {
      const pit = createHazardModel('PIT', world);
      const box = new THREE.Box3().setFromObject(pit);
      expect(box.max.y).toBeLessThan(0.055);
      let darkOpening = false;
      const vertices: number[] = [];
      pit.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        vertices.push(...o.geometry.getAttribute('position').array);
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        darkOpening ||= materials.some((m) => m instanceof THREE.MeshBasicMaterial && m.color.getHex() === 0x020308);
      });
      expect(darkOpening).toBe(true);
      signatures.add(JSON.stringify(vertices));
    }
    expect(signatures.size).toBe(6);
  });
  it('shares immutable baked resources for all twenty-four pooled variants', () => {
    for (let world = 0; world < 6; world++)
      for (const type of ['LOW', 'HIGH', 'PIT', 'BLOCK'] as const) {
        const a = createHazardModel(type, world),
          b = createHazardModel(type, world);
        expect(a).not.toBe(b);
        expect((a.children[0] as THREE.Mesh).geometry).toBe((b.children[0] as THREE.Mesh).geometry);
        expect((a.children[0] as THREE.Mesh).material).toBe((b.children[0] as THREE.Mesh).material);
      }
  });
});
