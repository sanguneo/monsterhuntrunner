import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CameraController } from './Camera';

afterEach(() => vi.restoreAllMocks());
describe('camera base and transient shake', () => {
  it('has no residual displacement after a shake expires', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const clean = new CameraController(1);
    const shaken = new CameraController(1);
    clean.mode = shaken.mode = 'follow';
    const player = new THREE.Vector3();
    shaken.shake(1, 0.1);
    for (let i = 0; i < 7; i++) {
      clean.update(1 / 60, player, null);
      shaken.update(1 / 60, player, null);
    }
    expect(shaken.camera.position.distanceTo(clean.camera.position)).toBeLessThan(1e-12);
  });
  it('decays its shake envelope and resets immediately on relocation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const camera = new CameraController(1);
    camera.mode = 'follow';
    const player = new THREE.Vector3(0, 0, 100);
    camera.reset(player, null);
    camera.shake(1, 1);
    camera.update(0.1, player, null);
    const early = Math.abs(camera.camera.position.x);
    camera.update(0.5, player, null);
    expect(Math.abs(camera.camera.position.x)).toBeLessThan(early);
    camera.reset(new THREE.Vector3(), null);
    expect(camera.camera.position.toArray()).toEqual([0, 4, -7]);
    camera.update(1 / 60, new THREE.Vector3(), null);
    expect(camera.camera.position.toArray()).toEqual([0, 4, -7]);
  });
});
