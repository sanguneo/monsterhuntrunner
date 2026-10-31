// ============================================================
// 장애물 — LOW/HIGH/PIT/BLOCK (§6.1)
// view-logic 분리: 프리미티브 박스/벽, 추후 모델 교체 가능.
// ============================================================

import * as THREE from 'three';
import { createHazardModel } from '../visual/HazardModels';
import { WORLDS } from '../data/worlds';
import { CONFIG, laneX } from '../data/config';
import type { Player } from './Player';

export type ObstacleType = 'LOW' | 'HIGH' | 'PIT' | 'BLOCK';

let activeWorld = 0;
/** Select immutable world-specific geometry rather than recoloring all live instances. */
export function applyObstacleTheme(colors: { obsLow: number; obsHigh: number; obsBlock: number }): void {
  const index = WORLDS.findIndex(
    (w) =>
      w.theme.obsLow === colors.obsLow && w.theme.obsHigh === colors.obsHigh && w.theme.obsBlock === colors.obsBlock,
  );
  activeWorld = Math.max(0, index);
}

export class Obstacle {
  alive = true;
  /** 충돌 데미지 중복 방지 */
  hitDone = false;
  readonly mesh: THREE.Group;
  readonly zLen: number;

  constructor(
    public type: ObstacleType,
    public lane: number,
    public z: number,
  ) {
    this.mesh = createHazardModel(type, activeWorld);
    this.mesh.position.set(laneX(lane), 0, z);
    this.mesh.name = `hazard-${type.toLowerCase()}`;
    this.zLen = type === 'PIT' ? 2.4 : type === 'BLOCK' ? 0.8 : 0.6;
  }

  /** 플레이어 피격 판정 (히트박스 80% 축소 적용 — §13.2) */
  collides(player: Player): boolean {
    const scale = CONFIG.accessibility.hitboxScale;
    const halfW = 0.45 * scale;
    const px = player.x;
    const pz = player.z;
    const py = player.y;
    const pHeight = (player.sliding ? 0.8 : 1.6) * scale;

    if (Math.abs(px - laneX(this.lane)) > 0.85 + halfW) return false;
    if (Math.abs(pz - this.z) > this.zLen / 2 + 0.4 * scale) return false;

    switch (this.type) {
      case 'LOW':
        return py < 0.8; // 발이 허들 위를 못 넘으면 충돌
      case 'HIGH':
        return py + pHeight > 1.05; // 슬라이드(0.64)면 통과, 서있거나 점프 중이면 충돌
      case 'PIT':
        return py <= 0.05; // 지면에 있으면 추락 데미지
      case 'BLOCK':
        return py < 2.6; // 점프로 못 넘는 전체 벽
    }
  }

  get damage(): number {
    return CONFIG.obstacles.damage[this.type];
  }
}
