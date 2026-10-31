// ============================================================
// 수집 아이템 — 동전/보석/회복 (§11)
// view: 회전 다면체 프리미티브 (§3.1)
// ============================================================

import * as THREE from 'three';
import { laneX } from '../data/config';
import { createCollectibleModel } from '../visual/CollectibleModels';

export type PickupType = 'coin' | 'gem' | 'heal';

export class Pickup {
  alive = true;
  /** 플레이어가 실제로 획득했는지 (despawn과 구분 — 튜토리얼 성공 판정용) */
  collected = false;
  readonly mesh: THREE.Group;
  readonly baseY: number;
  private t = Math.random() * Math.PI * 2;

  constructor(
    public type: PickupType,
    public lane: number,
    public z: number,
    y = 0.8,
  ) {
    this.baseY = y;
    this.mesh = createCollectibleModel(type);
    this.mesh.position.set(laneX(lane), y, z);
  }

  update(dt: number): void {
    this.t += dt;
    this.mesh.rotation.y += dt * 2.4;
    this.mesh.position.y = this.baseY + Math.sin(this.t * 3) * 0.08;
  }

  get x(): number {
    return this.mesh.position.x;
  }
  get y(): number {
    return this.mesh.position.y;
  }
}
