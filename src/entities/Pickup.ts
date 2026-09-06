// ============================================================
// 수집 아이템 — 동전/보석/회복 (§11)
// view: 회전 다면체 프리미티브 (§3.1)
// ============================================================

import * as THREE from 'three';
import { laneX } from '../data/config';

export type PickupType = 'coin' | 'gem' | 'heal';

const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0x7a5500, metalness: 0.6, roughness: 0.3 });
const gemGeo = new THREE.OctahedronGeometry(0.36);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x3de1ff, emissive: 0x0a4d66, metalness: 0.3, roughness: 0.2 });
const healGeo = new THREE.CapsuleGeometry(0.23, 0.23, 6, 14);
const healMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x14532d });
const coinRim = new THREE.TorusGeometry(0.245, 0.025, 6, 20);
const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.13, 12);
const crossGeo = new THREE.BoxGeometry(1, 1, 1);
const reliefMat = new THREE.MeshStandardMaterial({ color: 0xffeda8, metalness: 0.35, roughness: 0.4 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfff2d9, roughness: 0.65 });

export class Pickup {
  alive = true;
  /** 플레이어가 실제로 획득했는지 (despawn과 구분 — 튜토리얼 성공 판정용) */
  collected = false;
  readonly mesh: THREE.Mesh;
  readonly baseY: number;
  private t = Math.random() * Math.PI * 2;

  constructor(
    public type: PickupType,
    public lane: number,
    public z: number,
    y = 0.8,
  ) {
    this.baseY = y;
    if (type === 'coin') this.mesh = new THREE.Mesh(coinGeo, coinMat);
    else if (type === 'gem') this.mesh = new THREE.Mesh(gemGeo, gemMat);
    else this.mesh = new THREE.Mesh(healGeo, healMat);
    if (type === 'coin') this.mesh.rotation.x = Math.PI / 2;
    this.mesh.name = `pickup-${type}`;
    if (type === 'coin') {
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(coinRim, reliefMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = side * 0.047;
        const stamp = new THREE.Mesh(gemGeo, reliefMat);
        stamp.scale.set(0.3, 0.045, 0.4);
        stamp.position.y = side * 0.052;
        this.mesh.add(rim, stamp);
      }
    } else if (type === 'heal') {
      const cap = new THREE.Mesh(capGeo, whiteMat);
      cap.position.y = 0.37;
      const vertical = new THREE.Mesh(crossGeo, whiteMat);
      vertical.scale.set(0.08, 0.28, 0.04);
      vertical.position.z = -0.23;
      const horizontal = new THREE.Mesh(crossGeo, whiteMat);
      horizontal.scale.set(0.24, 0.08, 0.04);
      horizontal.position.z = -0.235;
      this.mesh.add(cap, vertical, horizontal);
    } else {
      const core = new THREE.Mesh(gemGeo, whiteMat);
      core.scale.setScalar(0.43);
      this.mesh.add(core);
    }
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
