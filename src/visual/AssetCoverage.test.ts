import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WORLDS } from '../data/worlds';
import { createMonsterModel } from './MonsterModels';
import { createHazardModel } from './HazardModels';
import { createCollectibleModel } from './CollectibleModels';
import { createAttackWall, createWaveGeometry } from './AttackModels';
import { Obstacle, applyObstacleTheme } from '../entities/Obstacle';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
function inspect(object: THREE.Object3D): { triangles: number; draws: number } {
  let triangles = 0,
    draws = 0;
  object.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    draws++;
    const p = o.geometry.getAttribute('position'),
      n = o.geometry.getAttribute('normal');
    expect(p.count).toBeGreaterThan(0);
    expect(n.count).toBe(p.count);
    expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < n.count; i++) {
      const length = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
      if (Math.abs(length - 1) > 1e-5) throw new Error(`Non-unit authored normal: ${length}`);
    }
    triangles += (o.geometry.index?.count ?? p.count) / 3;
  });
  return { triangles, draws };
}
describe('complete authored visual coverage', () => {
  it('authors every normal species with finite compact geometry and immutable color-specific templates', () => {
    const fingerprints = new Set<string>();
    for (const def of WORLDS.flatMap((w) => w.monsters)) {
      const model = createMonsterModel(def);
      const report = inspect(model);
      expect(report.triangles).toBeLessThanOrEqual(6000);
      expect(report.draws).toBeLessThanOrEqual(12);
      const box = new THREE.Box3().setFromObject(model);
      expect(box.min.y).toBeGreaterThan(-0.7);
      expect(box.max.y).toBeLessThan(0.8);
      const vertexData: number[] = [];
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) vertexData.push(...o.geometry.getAttribute('position').array);
      });
      fingerprints.add(JSON.stringify(vertexData));
      const copy = createMonsterModel(def);
      expect((copy.children[0] as THREE.Mesh).geometry).toBe((model.children[0] as THREE.Mesh).geometry);
      expect(createMonsterModel({ ...def, color: 0xff00ff })).not.toBe(model);
    }
    expect(fingerprints.size).toBe(18);
  });
  it('grounds walking species without moving gameplay collision roots', () => {
    for (const def of WORLDS.flatMap((w) => w.monsters).filter((d) =>
      ['zombie', 'zombieDog', 'wireGolem', 'wolf', 'boneGolem', 'skeletonSoldier'].includes(d.id),
    )) {
      const monster = new Monster(def, 1, 0);
      expect(monster.mesh.position.y).toBe(0.8);
      expect(new THREE.Box3().setFromObject(monster.mesh).min.y).toBeCloseTo(0, 5);
      for (let i = 0; i < 12; i++) {
        monster.update(0.1, 0);
        const min = new THREE.Box3().setFromObject(monster.mesh).min.y;
        expect(min).toBeGreaterThan(-0.08);
        expect(min).toBeLessThan(0.1);
      }
    }
  });
  it('covers every world hazard and preserves height/width collision communication', () => {
    for (const [i, w] of WORLDS.entries()) {
      applyObstacleTheme(w.theme);
      for (const type of ['LOW', 'HIGH', 'PIT', 'BLOCK'] as const) {
        const model = createHazardModel(type, i);
        const report = inspect(model);
        expect(report.triangles).toBeLessThan(9000);
        const bounds = new THREE.Box3().setFromObject(model);
        expect(bounds.min.x).toBeGreaterThanOrEqual(-1.04);
        expect(bounds.max.x).toBeLessThanOrEqual(1.04);
        if (type === 'LOW') expect(bounds.max.y).toBeLessThanOrEqual(0.81);
        if (type === 'BLOCK') expect(bounds.max.y).toBeGreaterThan(2.8);
        if (type === 'PIT') expect(bounds.max.y).toBeLessThan(0.08);
        const obstacle = new Obstacle(type, 1, 0);
        const player = new Player();
        player.z = 0;
        player.y = 0;
        if (type === 'HIGH') {
          player.sliding = true;
          expect(obstacle.collides(player)).toBe(false);
          player.sliding = false;
          expect(obstacle.collides(player)).toBe(true);
        } else expect(obstacle.collides(player)).toBe(true);
      }
    }
  });
  it('authors all collectibles and each documented wall signature with reusable resources', () => {
    for (const type of ['coin', 'gem', 'heal'] as const)
      expect(inspect(createCollectibleModel(type)).triangles).toBeLessThan(6000);
    const keys = new Set<string>();
    for (const id of ['ghostGirl', 'zombieKing', 'kraken', 'dracula', 'skeletonKnight']) {
      const model = createAttackWall(id, 0xaa77bb);
      const report = inspect(model);
      expect(report.triangles).toBeLessThan(12000);
      keys.add(
        JSON.stringify(
          model.children.map((o) => Array.from((o as THREE.Mesh).geometry.getAttribute('position').array)),
        ),
      );
      const copy = createAttackWall(id, 0xaa77bb);
      expect((copy.children[0] as THREE.Mesh).geometry).toBe((model.children[0] as THREE.Mesh).geometry);
    }
    expect(keys.size).toBe(5);
    const wave = createWaveGeometry(7.5);
    wave.computeBoundingBox();
    expect(wave.boundingBox!.max.y).toBeLessThan(0.4);
    wave.dispose();
  });
});
