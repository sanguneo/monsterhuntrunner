// ============================================================
// 발사체 — 플레이어 자동사격 탄 / 적 투사체
// 적 탄은 보스별 색·모양 커스텀 (ball/rod/shard)
// ============================================================

import * as THREE from 'three';
import type { EnemyProjShape } from '../data/worlds';
import { loftGeometry } from '../visual/SculptKit';

const playerGeo = loftGeometry(
  [
    [-0.42, 0, 0],
    [-0.24, 0.045, 0.045],
    [-0.04, 0.11, 0.11],
    [0.13, 0.14, 0.14],
    [0.22, 0, 0],
  ],
  18,
  16,
).rotateX(Math.PI / 2);
const playerMat = new THREE.MeshStandardMaterial({
  color: 0x9ce6f4,
  emissive: 0x3baed3,
  emissiveIntensity: 0.7,
  roughness: 0.24,
});
const critMat = new THREE.MeshStandardMaterial({
  color: 0xffdf91,
  emissive: 0xe8aa42,
  emissiveIntensity: 0.8,
  roughness: 0.24,
});
const tailGeo = new THREE.TorusGeometry(0.12, 0.012, 6, 20);
const tailMat = new THREE.MeshBasicMaterial({ color: 0xd0ffee, transparent: true, opacity: 0.55, depthWrite: false });
const enemyGeos: Record<EnemyProjShape, THREE.BufferGeometry> = {
  ball: loftGeometry(
    [
      [-0.25, 0, 0],
      [-0.18, 0.18, 0.18],
      [0, 0.255, 0.255],
      [0.18, 0.18, 0.18],
      [0.25, 0, 0],
    ],
    16,
    16,
  ),
  rod: loftGeometry(
    [
      [-0.34, 0, 0],
      [-0.31, 0.075, 0.075],
      [0.28, 0.075, 0.075],
      [0.34, 0, 0],
    ],
    10,
    12,
  ),
  shard: loftGeometry(
    [
      [-0.32, 0, 0],
      [-0.04, 0.15, 0.15],
      [0.16, 0.11, 0.11],
      [0.34, 0, 0],
    ],
    3,
    5,
  ),
};
const enemyMatCache = new Map<number, THREE.MeshStandardMaterial>();
function enemyMaterial(color: number): THREE.MeshStandardMaterial {
  let m = enemyMatCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.28 });
    enemyMatCache.set(color, m);
  }
  return m;
}

export interface EnemyProjStyle {
  color?: number;
  shape?: EnemyProjShape;
}

export class Projectile {
  alive = true;
  readonly mesh: THREE.Mesh;
  private readonly spin: boolean;

  constructor(
    public owner: 'player' | 'enemy',
    public damage: number,
    position: THREE.Vector3,
    public velocity: THREE.Vector3,
    public isCrit = false,
    public life = 2.0,
    style: EnemyProjStyle = {},
  ) {
    if (owner === 'player') {
      this.mesh = new THREE.Mesh(playerGeo, isCrit ? critMat : playerMat);
      for (let i = 0; i < 2; i++) {
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.z = -0.11 - i * 0.16;
        tail.scale.setScalar(1 - i * 0.3);
        this.mesh.add(tail);
      }
      this.spin = false;
    } else {
      const shape = style.shape ?? 'rod';
      this.mesh = new THREE.Mesh(enemyGeos[shape], enemyMaterial(style.color ?? 0xffffff));
      if (shape === 'rod') this.mesh.rotation.x = Math.PI / 2;
      this.spin = true;
    }
    this.mesh.position.copy(position);
  }

  update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
    this.mesh.position.addScaledVector(this.velocity, dt);
    if (this.spin) {
      this.mesh.rotation.z += dt * 10;
      this.mesh.rotation.y += dt * 6;
    }
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }
}
