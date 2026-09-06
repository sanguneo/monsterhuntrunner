// ============================================================
// 플레이어 — 레인 이동 / 점프 / 슬라이드 / 성장 스탯 (§5, §10, §13.2)
// Simulation owns x/y/z; PlayerModel owns the interpolated presentation.
// ============================================================

import * as THREE from 'three';
import { CONFIG, laneX } from '../data/config';
import type { Action, BufferedAction, Input } from '../core/Input';
import { PlayerModel } from './PlayerModel';
import type { SoundId } from '../systems/Sound';

export class Player {
  // --- 위치/동작 상태 ---
  lane = CONFIG.lanes.startIndex;
  x = laneX(CONFIG.lanes.startIndex);
  y = 0;
  z = 0;
  private vy = 0;
  jumping = false;
  sliding = false;
  private slideTimer = 0;
  private lateralVelocity = 0;
  private lastGroundedAt = 0; // 코요테 타임용
  private queuedAction: BufferedAction | null = null;
  private readonly simulationPosition = new THREE.Vector3();
  private readonly previousPosition = new THREE.Vector3();

  // --- 전투/성장 스탯 ---
  hp = CONFIG.player.baseHp;
  maxHp = CONFIG.player.baseHp;
  attack = CONFIG.player.baseAttack;
  critChance = CONFIG.player.baseCrit;
  level = 1;
  exp = 0;
  expToNext = CONFIG.progression.expCurve(1);

  invulnTimer = 0;
  dashTimer = 0; // 무적 대시 잔여 시간
  alive = true;

  // --- view ---
  private readonly model = new PlayerModel();
  readonly group = this.model.group;
  private readonly shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x4c4059, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  onLand: (() => void) | null = null;
  /** 동작 성공 시 효과음 재생 훅 (Game이 SoundManager로 연결) */
  sfx: ((id: SoundId) => void) | null = null;

  constructor() {
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.name = 'courier-ground-shadow';
    this.group.add(this.shadow);
    this.syncRender();
  }

  equipCape(color: number): void { this.model.equipCape(color); }
  unequipCape(): void { this.model.unequipCape(); }
  equipHat(color: number): void { this.model.equipHat(color); }
  unequipHat(): void { this.model.unequipHat(); }
  get hasCape(): boolean { return this.model.hasCape; }
  get hasHat(): boolean { return this.model.hasHat; }

  get airborne(): boolean {
    return this.y > 0.01;
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0 || this.dashTimer > 0;
  }

  /** 레벨 반영 점프 초기 속도: 체공 0.7s 기준 v0 = |g|*T/2 */
  private jumpVelocity(): number {
    const base = (-CONFIG.run.gravity * CONFIG.run.jumpAirTime) / 2;
    return base * (1 + CONFIG.player.jumpBonusPerLevel * (this.level - 1));
  }

  /** 레벨 이동속도 보너스 배율 (§10.1) */
  get speedMult(): number {
    return 1 + CONFIG.player.moveBonusPerLevel * (this.level - 1);
  }

  update(dt: number, input: Input, allowControl: boolean): void {
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);

    if (allowControl) this.handleInput(input);
    else this.clearActions();

    // Retarget from the current position, with a distance-scaled duration.
    // Two quick inputs cannot cross two lanes at twice the intended speed.
    const delta = laneX(this.lane) - this.x;
    const travel = Math.min(Math.abs(delta), CONFIG.lanes.spacing / CONFIG.lanes.moveTime * dt);
    const movement = Math.sign(delta) * travel;
    this.x += movement;
    this.lateralVelocity = dt > 0 ? movement / dt : 0;

    // 점프 물리
    if (this.jumping) {
      this.vy += CONFIG.run.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.jumping = false;
        this.onLand?.();
      }
    }
    if (!this.airborne) this.lastGroundedAt = performance.now() / 1000;

    // 슬라이드 타이머
    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.sliding = false;
    }

    if (this.queuedAction && performance.now() / 1000 - this.queuedAction.time > CONFIG.accessibility.inputBuffer) {
      this.clearActions();
    }
    if (this.queuedAction && allowControl && !this.jumping && !this.airborne) {
      const action = this.queuedAction.action;
      this.clearActions();
      this.tryAction(action);
    }
  }

  clearActions(): void {
    this.queuedAction = null;
  }

  private handleInput(input: Input): void {
    let entry: BufferedAction | null;
    while ((entry = input.consumeEntry(['left', 'right', 'jump', 'slide'])) !== null) {
      const vertical = entry.action === 'jump' || entry.action === 'slide';
      if (vertical) this.clearActions();
      if (!this.tryAction(entry.action) && vertical) this.queuedAction = entry;
    }
  }

  /** @returns 실행 성공 여부 */
  tryAction(action: Action): boolean {
    switch (action) {
      case 'left':
        if (this.lane <= 0) return true; // 벽: 무시하되 큐에 남기지 않음
        this.startLaneMove(this.lane - 1);
        return true;
      case 'right':
        if (this.lane >= CONFIG.lanes.count - 1) return true;
        this.startLaneMove(this.lane + 1);
        return true;
      case 'jump': {
        const coyote = performance.now() / 1000 - this.lastGroundedAt <= CONFIG.accessibility.coyoteTime;
        if (!this.jumping && (!this.airborne || coyote)) {
          this.jumping = true;
          this.sliding = false;
          this.vy = this.jumpVelocity();
          this.y = Math.max(this.y, 0.001);
          this.sfx?.('jump');
          return true;
        }
        return false;
      }
      case 'slide':
        if (!this.jumping && !this.airborne) {
          this.sliding = true;
          this.slideTimer = CONFIG.run.slideDuration;
          this.sfx?.('slide');
          return true;
        }
        // 공중 슬라이드 입력 → 빠른 낙하 + 착지 시 큐 실행
        this.vy = Math.min(this.vy, -14);
        return false;
      default:
        return true;
    }
  }

  private startLaneMove(target: number): void {
    this.lane = target;
    this.sfx?.('laneMove');
  }

  takeDamage(amount: number): boolean {
    if (!this.alive || this.invulnerable) return false;
    this.hp -= amount;
    this.invulnTimer = CONFIG.run.hitInvuln;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  resetForRun(): void {
    this.hp = CONFIG.player.baseHp;
    this.maxHp = CONFIG.player.baseHp;
    this.attack = CONFIG.player.baseAttack;
    this.critChance = CONFIG.player.baseCrit;
    this.level = 1;
    this.exp = 0;
    this.expToNext = CONFIG.progression.expCurve(1);
    this.lane = CONFIG.lanes.startIndex;
    this.x = laneX(this.lane);
    this.lateralVelocity = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.jumping = false;
    this.sliding = false;
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.clearActions();
    this.slideTimer = 0;
    this.lastGroundedAt = performance.now() / 1000;
    this.alive = true;
    this.model.reset();
    this.syncRender();
  }

  /** Called by Game BEFORE advancing z or any other simulation coordinate. */
  beginStep(): void {
    this.previousPosition.copy(this.position);
  }

  /** Teleports/reset/revive must synchronize both ends of interpolation. */
  syncRender(): void {
    this.previousPosition.copy(this.position);
    this.group.position.copy(this.position);
  }

  render(dt: number, alpha: number, running: boolean): void {
    this.group.position.lerpVectors(this.previousPosition, this.position, alpha);
    this.shadow.position.y = -this.group.position.y + 0.008;
    const shadowScale = 1 / (1 + this.group.position.y * 0.25);
    this.shadow.scale.set(shadowScale, shadowScale * 0.72, 1);
    this.shadow.material.opacity = 0.2 / (1 + this.group.position.y * 0.3);
    this.model.update(dt, {
      running, airborne: this.jumping || this.airborne, sliding: this.sliding,
      lateralVelocity: this.lateralVelocity, verticalVelocity: this.vy,
      dash: this.dashTimer > 0, invulnerable: this.invulnerable, alive: this.alive,
    });
  }

  get position(): THREE.Vector3 {
    return this.simulationPosition.set(this.x, this.y, this.z);
  }
}
