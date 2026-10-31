import * as THREE from 'three';
import { WORLDS, type WorldTheme } from '../data/worlds';
import { buildWorldTemplate } from '../visual/WorldModels';

const CHUNK_LENGTH = 16;
const CHUNK_COUNT = 8;
const PERIOD = CHUNK_LENGTH * CHUNK_COUNT;

/** Six cached architectural sets; relocation and switching only mutate existing objects. */
export class Environment {
  private readonly floor: THREE.Mesh;
  private readonly shoulders: THREE.Mesh;
  private readonly chunks: THREE.Group[] = [];
  private readonly motifs: THREE.Group[][] = [];
  private readonly floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  private readonly shoulderMat = new THREE.MeshStandardMaterial({ roughness: 1 });

  constructor(scene: THREE.Scene) {
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 240), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.025;
    this.floor.name = 'courier-path';
    this.floor.receiveShadow = true;
    scene.add(this.floor);
    this.shoulders = new THREE.Mesh(new THREE.PlaneGeometry(90, 240), this.shoulderMat);
    this.shoulders.rotation.x = -Math.PI / 2;
    this.shoulders.position.y = -0.07;
    this.shoulders.receiveShadow = true;
    scene.add(this.shoulders);
    const templates = WORLDS.map((world, index) => buildWorldTemplate(world.theme, index));
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const chunk = new THREE.Group();
      chunk.name = `environment-chunk-${i}`;
      const variants = templates.map((template) => template.clone());
      chunk.add(...variants);
      this.motifs.push(variants);
      this.chunks.push(chunk);
      scene.add(chunk);
    }
    this.setTheme(WORLDS[0].theme);
    this.update(0);
  }

  setTheme(theme: WorldTheme): void {
    this.floorMat.color.setHex(theme.floor);
    this.shoulderMat.color.setHex(theme.wallA);
    const themeIndex = Math.max(
      0,
      WORLDS.findIndex((world) => world.theme === theme),
    );
    for (const variants of this.motifs) {
      for (let i = 0; i < variants.length; i++) variants[i].visible = i === themeIndex;
    }
  }

  update(playerZ: number): void {
    this.floor.position.z = this.shoulders.position.z = playerZ + 80;
    for (let i = 0; i < this.chunks.length; i++) {
      const origin = i * CHUNK_LENGTH;
      this.chunks[i].position.z = origin + Math.floor((playerZ + 20 - origin) / PERIOD) * PERIOD + PERIOD - 40;
    }
  }
}
