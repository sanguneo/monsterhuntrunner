import * as THREE from 'three';
import { CONFIG } from '../data/config';
import { WORLDS } from '../data/worlds';
import type { WorldTheme } from '../data/worlds';

const orb = new THREE.SphereGeometry(1, 12, 9);
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 8);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);

/** Recycled storybook dioramas stay outside the playable three-lane path. */
export class Environment {
  private readonly floor: THREE.Mesh;
  private readonly shoulders: THREE.Mesh;
  private readonly dashes: THREE.Mesh[] = [];
  private readonly chunks: THREE.Group[] = [];
  private readonly motifs: THREE.Group[][] = [];
  private readonly floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  private readonly foliage = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  private readonly architecture = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  private readonly trim = new THREE.MeshStandardMaterial({ color: 0xffe5b9, roughness: 0.85 });
  private readonly trunk = new THREE.MeshStandardMaterial({ color: 0x987c68, roughness: 0.9 });
  private readonly glow = new THREE.MeshBasicMaterial({ color: 0xffe5a4 });
  private readonly accent = new THREE.MeshStandardMaterial({ color: 0x8eddd3, roughness: 0.6 });
  private readonly dark = new THREE.MeshStandardMaterial({ color: 0x58677d, roughness: 0.85 });

  constructor(scene: THREE.Scene) {
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 240), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.025;
    this.floor.name = 'courier-path';
    scene.add(this.floor);
    this.shoulders = new THREE.Mesh(new THREE.PlaneGeometry(90, 240), this.foliage);
    this.shoulders.rotation.x = -Math.PI / 2;
    this.shoulders.position.y = -0.07;
    scene.add(this.shoulders);
    const dashGeo = new THREE.BoxGeometry(0.065, 0.012, 1.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffedcf, transparent: true, opacity: 0.6 });
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 40; i++) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.position.set((side * 2 - 1) * CONFIG.lanes.spacing / 2, 0, i * 4);
        scene.add(dash);
        this.dashes.push(dash);
      }
    }
    for (let i = 0; i < 14; i++) {
      const chunk = new THREE.Group();
      chunk.name = `storybook-verge-${i}`;
      const variants = Array.from({ length: 6 }, () => new THREE.Group());
      for (const side of [-1, 1]) {
        const x = side * 5.7;
        // Soft hedges and trees give the corridor depth without tall blank walls.
        this.mesh(chunk, orb, this.foliage, [x, 0.35, 0], [1.5, 0.65, 2]);
        this.mesh(chunk, cylinder, this.trunk, [x + side * 1.1, 1.1, 2], [0.17, 2.2, 0.17]);
        this.mesh(chunk, orb, this.foliage, [x + side * 1.1, 2.65, 2], [1.25, 1.4, 1.2]);
        this.mesh(chunk, orb, this.foliage, [x + side * 1.6, 3.25, 2], [0.8, 0.9, 0.8]);
        // Warm lantern at the road edge, with a low curb instead of a wall.
        this.mesh(chunk, box, this.architecture, [side * 4, 0.14, 0], [0.18, 0.28, 10]);
        this.mesh(chunk, cylinder, this.trunk, [side * 4.45, 1.15, -2], [0.075, 2.3, 0.075]);
        this.mesh(chunk, orb, this.glow, [side * 4.45, 2.34, -2], [0.22, 0.29, 0.22]);
        this.mesh(chunk, cone, this.trim, [side * 4.45, 2.66, -2], [0.34, 0.18, 0.34]);
        // Tiny flower clusters punctuate the edges.
        for (let f = 0; f < 3; f++) {
          this.mesh(chunk, orb, f % 2 ? this.accent : this.trim,
            [side * (4.5 + f * 0.18), 0.15, 1 + f * 0.3], [0.13, 0.13, 0.13]);
        }
        const px = side * 7.7;
        // School: little schoolhouses, windows and book-shaped gate posts.
        this.mesh(variants[0], box, this.architecture, [px, 1.3, -2], [2.3, 2.6, 2.1]);
        this.mesh(variants[0], cone, this.trim, [px, 3.1, -2], [1.9, 1.1, 1.7]).rotation.y = Math.PI / 4;
        for (const wx of [-0.55, 0.55]) {
          this.mesh(variants[0], box, this.glow, [px + wx, 1.7, -3.08], [0.5, 0.65, 0.06]);
        }
        // Village: rounded headstones and friendly pumpkin lanterns.
        this.mesh(variants[1], box, this.dark, [px, 0.6, -2], [1, 1.2, 0.4]);
        this.mesh(variants[1], orb, this.dark, [px, 1.16, -2], [0.5, 0.45, 0.2]);
        this.mesh(variants[1], orb, this.trim, [px - side, 0.35, -2.8], [0.45, 0.35, 0.4]);
        this.mesh(variants[1], cylinder, this.trunk, [px - side, 0.72, -2.8], [0.08, 0.18, 0.08]);
        // Laboratory: luminous specimen jars with brass collars.
        this.mesh(variants[2], cylinder, this.architecture, [px, 0.2, -2], [0.8, 0.4, 0.8]);
        this.mesh(variants[2], cylinder, this.accent, [px, 1.4, -2], [0.55, 2, 0.55]);
        this.mesh(variants[2], orb, this.glow, [px, 1.45, -2.25], [0.28, 0.45, 0.28]);
        this.mesh(variants[2], cylinder, this.trim, [px, 2.45, -2], [0.75, 0.18, 0.75]);
        // Sea: branching candy coral and pearl bubbles.
        for (let branch = 0; branch < 3; branch++) {
          this.mesh(variants[3], cylinder, this.accent, [px + (branch - 1) * 0.4, 0.7, -2], [0.14, 1.4 + branch * 0.3, 0.14]).rotation.z = (branch - 1) * 0.35;
          this.mesh(variants[3], orb, this.trim, [px + (branch - 1) * 0.65, 1.5 + branch * 0.25, -2], [0.25, 0.25, 0.25]);
        }
        // Castle: round turrets with conical roofs and warm arrow windows.
        this.mesh(variants[4], cylinder, this.architecture, [px, 1.9, -2], [0.9, 3.8, 0.9]);
        this.mesh(variants[4], cone, this.dark, [px, 4.4, -2], [1.15, 1.4, 1.15]);
        this.mesh(variants[4], box, this.glow, [px, 2.3, -2.91], [0.25, 0.8, 0.04]);
        // Skull kingdom: soft ivory skulls rather than anonymous pillars.
        this.mesh(variants[5], orb, this.trim, [px, 1.2, -2], [0.9, 0.95, 0.65]);
        this.mesh(variants[5], box, this.trim, [px, 0.48, -2.15], [1.1, 0.45, 0.8]);
        for (const eye of [-0.3, 0.3]) this.mesh(variants[5], orb, this.dark, [px + eye, 1.25, -2.6], [0.22, 0.28, 0.09]);
      }
      chunk.add(...variants);
      this.motifs.push(variants);
      this.chunks.push(chunk);
      scene.add(chunk);
    }
    this.setTheme(WORLDS[0].theme);
    this.update(0);
  }

  private mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    position: [number, number, number], scale: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  setTheme(theme: WorldTheme): void {
    this.floorMat.color.setHex(theme.floor).lerp(new THREE.Color(0xffe8c9), 0.38);
    this.foliage.color.setHex(theme.wallA).lerp(new THREE.Color(0x8ebfa8), 0.55);
    this.architecture.color.setHex(theme.wallB).lerp(new THREE.Color(0xc6cadf), 0.55);
    const themeIndex = Math.max(0, WORLDS.findIndex((world) => world.theme === theme));
    for (const variants of this.motifs) variants.forEach((variant, i) => { variant.visible = i === themeIndex; });
  }

  update(playerZ: number): void {
    this.floor.position.z = this.shoulders.position.z = playerZ + 80;
    this.dashes.forEach((dash, i) => {
      const origin = (i % 40) * 4;
      dash.position.z = origin + Math.floor((playerZ + 20 - origin) / 160) * 160 + 160 - 40;
    });
    this.chunks.forEach((chunk, i) => {
      const origin = i * 10;
      chunk.position.z = origin + Math.floor((playerZ + 20 - origin) / 140) * 140 + 140 - 40;
    });
  }
}
