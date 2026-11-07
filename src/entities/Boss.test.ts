import { loadAllCreatureWorlds } from '../visual/CreatureRegistry';
await loadAllCreatureWorlds();
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Boss } from './Boss';
import { Game } from '../core/Game';
import { Player } from './Player';
import { WORLDS } from '../data/worlds';

describe('chase lock warning', () => {
  it('keeps the locked lane visible and fixed until the strike', () => {
    const scene = new THREE.Scene();
    const player = new Player();
    const game: Game = Object.assign(Object.create(Game.prototype), {
      scene, player, sound: { play: vi.fn() }, cameraCtl: { shake: vi.fn() },
      hud: { setShade: vi.fn() }, damagePlayer: vi.fn(),
    });
    const boss = new Boss({
      ...WORLDS[0].midBoss,
      patterns: { chase: { type: 'chase', telegraph: 0.2, lockTime: 0.35, damage: 10 } },
      phases: [{ from: 1, queue: ['chase'], gap: 0 }],
    }, game, 12);
    // Advance the real intro -> gap -> telegraph -> active state machine.
    for (let i = 0; i < 180 && boss.state !== 'active'; i++) boss.update(1 / 60);
    expect(boss.state).toBe('active');
    const marker = scene.children.find((node) => node.visible);
    expect(marker).toBeDefined();
    const x = marker?.position.x;
    player.lane = 0;
    boss.update(0.1);
    expect(marker?.visible).toBe(true);
    expect(marker?.position.x).toBe(x);
    boss.update(0.3);
    expect(marker?.visible).toBe(false);
    boss.dispose();
    expect(scene.children).toHaveLength(0);
  });
});


describe('authored boss silhouette outline', () => {
  it('follows the body gesture during stagger without sharing owned geometry', () => {
    const scene = new THREE.Scene();
    const game: Game = Object.assign(Object.create(Game.prototype), {
      scene, player: new Player(), sound: { play: vi.fn() },
      cameraCtl: { shake: vi.fn() }, hud: { setShade: vi.fn() },
    });
    const boss = new Boss(WORLDS[0].midBoss, game, 12);
    const body = boss.group.children.find((node) => node instanceof THREE.Group)!;
    const outline = boss.group.children.find((node) => node instanceof THREE.Mesh) as THREE.Mesh;
    boss.state = 'stagger';
    for (const dt of [0.1, 0.16, 0.24]) {
      boss.update(dt);
      expect(outline.visible).toBe(true);
      expect(Math.abs(body.rotation.z)).toBeGreaterThan(0.001);
      expect(outline.quaternion.equals(body.quaternion)).toBe(true);
    }
    body.traverse((node) => {
      if (node instanceof THREE.Mesh) expect(outline.geometry).not.toBe(node.geometry);
    });
    const dispose = vi.spyOn(outline.geometry, 'dispose');
    boss.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(0);
  });
});
