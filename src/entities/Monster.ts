// ============================================================
// 일반 몬스터 — 월드별 데이터 정의(MonsterDef) 기반 (§7.2)
// Identity-specific cached visual templates; gameplay owns only transforms.
// ============================================================

import * as THREE from 'three';
import { laneX } from '../data/config';
import type { MonsterDef, MonsterBehavior } from '../data/worlds';
import { createMonsterModel } from '../visual/MonsterModels';

export class Monster {
  alive = true;
  hp: number;
  readonly contactDamage: number;
  readonly behavior: MonsterBehavior;
  readonly speed: number;
  readonly exp: number;
  readonly id: string;
  readonly mesh: THREE.Group;
  private body: THREE.Group;
  private t = Math.random() * Math.PI * 2;
  /** 보스 소환 잡몹 여부 */
  isMinion = false;

  constructor(
    def: MonsterDef,
    public lane: number,
    public z: number,
  ) {
    this.id = def.id;
    this.hp = def.hp;
    this.contactDamage = def.contact;
    this.behavior = def.behavior;
    this.speed = def.speed;
    this.exp = def.exp;

    this.mesh = new THREE.Group();
    this.body = createMonsterModel(def);
    this.mesh.add(this.body);
    this.mesh.name = def.id;

    this.mesh.position.set(laneX(lane), 0.8, z);
  }

  update(dt: number, playerZ: number): void {
    this.t += dt;
    if (this.z > playerZ + 1.2) {
      this.z -= this.speed * dt;
    }
    let x = laneX(this.lane);
    if (this.behavior === 'weave') {
      x += Math.sin(this.t * 4) * 0.9;
    }
    this.mesh.position.set(x, 0.8 + Math.sin(this.t * 3) * 0.12, this.z);
    // 위협적 흔들림 — 정적인 수집물과 모션으로도 구분
    this.body.rotation.z = Math.sin(this.t * 6) * 0.18;
    this.body.rotation.y = Math.sin(this.t * 2.5) * 0.3;
    this.body.scale.set(1 + Math.sin(this.t * 6) * 0.035, 1 - Math.sin(this.t * 6) * 0.035, 1);
  }

  /** @returns true면 사망 */
  takeDamage(d: number): boolean {
    this.hp -= d;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  get x(): number {
    return this.mesh.position.x;
  }
  get y(): number {
    return this.mesh.position.y;
  }
  get position(): THREE.Vector3 {
    return this.mesh.position;
  }
}
