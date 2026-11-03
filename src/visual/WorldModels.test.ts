import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WORLDS } from '../data/worlds';
import { buildWorldTemplate } from './WorldModels';

describe('authored architectural kits', () => {
  it('gives every documented world distinct finite geometry inside a per-module budget', () => {
    const silhouettes = new Set<string>();
    for (const [index, world] of WORLDS.entries()) {
      const model = buildWorldTemplate(world.theme, index);
      let triangles = 0;
      let draws = 0;
      const signature: number[] = [];
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        draws++;
        const p = object.geometry.getAttribute('position') as THREE.BufferAttribute;
        const n = object.geometry.getAttribute('normal') as THREE.BufferAttribute;
        triangles += (object.geometry.index?.count ?? p.count) / 3;
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
        expect(object.castShadow).toBe(true);
        expect(object.receiveShadow).toBe(true);
        signature.push(p.count, ...Array.from(p.array).slice(0, 36));
      });
      expect(triangles).toBeLessThanOrEqual(7499);
      expect(draws).toBeLessThanOrEqual(19);
      silhouettes.add(JSON.stringify(signature));
    }
    expect(silhouettes.size).toBe(6);
  });
});
