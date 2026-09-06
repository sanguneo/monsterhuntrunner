import * as THREE from 'three';

export type EffectKind = 'collect' | 'heal' | 'hit' | 'defeat' | 'blast' | 'land' | 'dash';
const puff = new THREE.IcosahedronGeometry(1, 1);
const ring = new THREE.RingGeometry(0.82, 1, 40);
const palette: Record<EffectKind, number> = {
  collect: 0xffdf83, heal: 0x90f4bf, hit: 0xffaa98, defeat: 0xcbb9ff,
  blast: 0xffe4a2, land: 0xe5d6bd, dash: 0x86ffe3,
};

/** A fixed pool: even continuous dash/collect feedback cannot grow GPU resources. */
export class Effects {
  readonly group = new THREE.Group();
  private cursor = 0;
  private readonly particles = Array.from({ length: 96 }, () => ({
    mesh: new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>(puff, new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })),
    velocity: new THREE.Vector3(),
    age: 0, life: 0, size: 0, ring: false,
  }));

  constructor(scene: THREE.Scene) {
    this.group.name = 'runner-effects';
    for (const particle of this.particles) {
      particle.mesh.visible = false;
      this.group.add(particle.mesh);
    }
    scene.add(this.group);
  }

  emit(kind: EffectKind, position: THREE.Vector3): void {
    const count = kind === 'blast' ? 1 : kind === 'dash' ? 2 : kind === 'defeat' ? 12 : 7;
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;
      p.age = 0;
      p.life = kind === 'blast' ? 0.5 : kind === 'dash' ? 0.3 : 0.55;
      p.ring = kind === 'blast';
      p.size = kind === 'defeat' ? 0.2 : kind === 'land' ? 0.13 : 0.09;
      const angle = i / count * Math.PI * 2;
      p.velocity.set(Math.cos(angle) * 1.8, kind === 'land' ? 0.7 : 2, Math.sin(angle) * 1.8);
      p.mesh.geometry = p.ring ? ring : puff;
      p.mesh.position.copy(position);
      p.mesh.position.y += kind === 'land' || p.ring ? 0.06 : 0.65;
      p.mesh.rotation.set(p.ring ? -Math.PI / 2 : angle, 0, 0);
      p.mesh.material.color.setHex(palette[kind]);
      p.mesh.material.opacity = 0.85;
      p.mesh.scale.setScalar(p.ring ? 0.4 : p.size);
      p.mesh.visible = true;
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      if (p.age >= p.life) { p.mesh.visible = false; continue; }
      const t = p.age / p.life;
      p.mesh.material.opacity = (1 - t) * 0.8;
      if (p.ring) {
        p.mesh.scale.setScalar(0.4 + (1 - (1 - t) ** 3) * 7);
      } else {
        p.velocity.y -= dt * 3;
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.scale.setScalar(p.size * (1 - t * 0.6));
        p.mesh.rotation.z += dt * 2;
      }
    }
  }

  clear(): void {
    for (const p of this.particles) p.mesh.visible = false;
    this.cursor = 0;
  }
}
