import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerModel, HUNTER_ROAD_CONTACT_Y, type PlayerPose } from './PlayerModel';
import { REWARD_ITEMS } from '../data/worlds';

const ROAD_BASE_Y = -0.025;
const TOLERANCE = 0.0001;
function exactBounds(model: PlayerModel) {
  model.group.updateMatrixWorld(true);
  let min = Infinity,
    max = -Infinity,
    sole = Infinity;
  let minimumNode = '';
  const vertex = new THREE.Vector3();
  model.group.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const count = node.geometry.getAttribute('position').count;
    for (let i = 0; i < count; i++) {
      node.getVertexPosition(i, vertex).applyMatrix4(node.matrixWorld);
      if (vertex.y < min) {
        min = vertex.y;
        minimumNode = node.name || node.parent?.name || 'batched detail';
      }
      max = Math.max(max, vertex.y);
      if (node.name === 'single-tailored-boot-shell') sole = Math.min(sole, vertex.y);
    }
  });
  return { min, max, sole, minimumNode };
}
function transformSnapshot(model: PlayerModel) {
  model.group.updateMatrixWorld(true);
  return ['courier-pose', 'hunter-foot--1', 'hunter-foot-1', 'cape-socket'].map((name) =>
    model.group.getObjectByName(name)!.matrix.toArray(),
  );
}
describe('hunter grounded support and transitions', () => {
  it('supports slide soles and never puts visible geometry through the fixed road across all eight gear combinations', () => {
    expect(HUNTER_ROAD_CONTACT_Y).toBe(-0.017);
    const hunter = new PlayerModel();
    hunter.group.position.set(1.25, 0, -2.5);
    const root = hunter.group.position.toArray();
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
    const run = { ...idle, running: true };
    const slide = { ...run, sliding: true };
    const hats = Object.values(REWARD_ITEMS).filter((i) => i.slot === 'hat'),
      capes = Object.values(REWARD_ITEMS).filter((i) => i.slot === 'cape');
    expect(hats.length).toBe(4);
    expect(capes.length).toBe(2);
    let combinations = 0;
    const records: object[] = [],
      failures: object[] = [];
    let worstFloor = Infinity,
      maxSupportError = 0,
      maxSlideHeight = -Infinity;
    for (const hat of hats)
      for (const cape of capes) {
        if (hat.slot !== 'hat' || cape.slot !== 'cape') continue;
        hunter.reset();
        hunter.equipHat(hat.color, hat.appearance);
        hunter.equipCape(cape.color, cape.appearance);
        combinations++;
        const gear = `${hat.appearance}+${cape.appearance}`;
        const check = (phase: string, needsSupport: boolean, sliding: boolean) => {
          const bounds = exactBounds(hunter);
          worstFloor = Math.min(worstFloor, bounds.min);
          if (needsSupport) maxSupportError = Math.max(maxSupportError, Math.abs(bounds.sole - HUNTER_ROAD_CONTACT_Y));
          if (sliding) maxSlideHeight = Math.max(maxSlideHeight, bounds.max);
          const record = { gear, phase, ...bounds };
          records.push(record);
          if (
            bounds.min < ROAD_BASE_Y - TOLERANCE ||
            (needsSupport && Math.abs(bounds.sole - HUNTER_ROAD_CONTACT_Y) > TOLERANCE) ||
            (sliding && bounds.max >= 1.05)
          )
            failures.push(record);
          expect(hunter.group.position.toArray()).toEqual(root);
        };
        check('reset', true, false);
        const baseline = transformSnapshot(hunter);
        for (let repeat = 0; repeat < 3; repeat++) {
          hunter.update(0.1, run);
          check(`run-before-${repeat}`, false, false);
          hunter.update(0.016, slide);
          check(`slide-entry-${repeat}`, true, true);
          for (let frame = 0; frame < 12; frame++) {
            hunter.update(0.016, slide);
            check(`slide-hold-${repeat}-${frame}`, true, true);
          }
          for (let frame = 0; frame < 20; frame++) {
            hunter.update(0.016, { ...run, lateralVelocity: Math.sin(frame / 4) * 4 });
            check(`slide-exit-${repeat}-${frame}`, false, false);
          }
          hunter.update(0.1, { ...idle, airborne: true, verticalVelocity: -3 });
          hunter.update(0.016, run);
          check(`landing-${repeat}`, false, false);
          hunter.reset();
          check(`reset-after-${repeat}`, true, false);
          const reset = transformSnapshot(hunter);
          for (let i = 0; i < baseline.length; i++)
            for (let j = 0; j < 16; j++) expect(Math.abs(reset[i][j] - baseline[i][j])).toBeLessThan(1e-10);
        }
      }
    expect(combinations).toBe(8);
    hunter.unequipHat();
    hunter.unequipCape();
    hunter.reset();
    for (const [phase, dt, pose, support] of [
      ['reset', 0, idle, true],
      ['slide-entry', 0.016, slide, true],
      ['slide-hold', 0.16, slide, true],
      ['slide-exit', 0.016, run, false],
      ['exit-recovery', 0.1, run, false],
    ] as const) {
      hunter.update(dt, pose);
      const bounds = exactBounds(hunter);
      records.push({ gear: 'bare', phase, ...bounds });
      if (
        bounds.min < ROAD_BASE_Y - TOLERANCE ||
        (support && Math.abs(bounds.sole - HUNTER_ROAD_CONTACT_Y) > TOLERANCE)
      )
        failures.push({ gear: 'bare', phase, ...bounds });
      expect(hunter.group.position.toArray()).toEqual(root);
    }
    hunter.reset();
    hunter.group.position.y = 1;
    hunter.update(0.1, { ...idle, airborne: true, verticalVelocity: 3 });
    const airborne = exactBounds(hunter);
    expect(hunter.group.position.toArray()).toEqual([root[0], 1, root[2]]);
    expect(hunter.group.getObjectByName('courier-pose')!.position.y).toBeCloseTo(Math.sin(0.3) * 0.012, 10);
    expect(airborne.sole).toBeGreaterThan(1 + HUNTER_ROAD_CONTACT_Y + 0.01);
    const report = {
      roadBaseY: ROAD_BASE_Y,
      soleContactY: HUNTER_ROAD_CONTACT_Y,
      tolerance: TOLERANCE,
      gearCombinations: combinations,
      bareStates: 5,
      airborneRootY: 1,
      airborneBounds: airborne,
      records,
      worstFloor,
      maxSupportError,
      maxSlideHeight,
      failures,
      scope:
        'Exact visible mesh vertices; idle/slide sole support, grounded entry/exit/landing floor clearance. Airborne/gait flight is not forcibly pinned; collision root stays unchanged.',
    };
    console.log('HUNTER_GROUND_REPORT', JSON.stringify(report));
    expect(failures).toEqual([]);
  }, 60000);
});
