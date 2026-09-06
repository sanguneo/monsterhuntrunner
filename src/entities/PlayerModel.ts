import * as THREE from 'three';
import { ModelKit } from '../visual/ModelKit';
import { createRewardModels } from '../visual/RewardModels';
import type { CapeStyle, HatStyle } from '../data/worlds';

/** +Z is forward; the chase camera sees the courier's back from -Z. */
export type PlayerPose = {
  readonly running: boolean;
  readonly airborne: boolean;
  readonly sliding: boolean;
  readonly lateralVelocity: number;
  readonly verticalVelocity: number;
  readonly dash: boolean;
  readonly invulnerable: boolean;
  readonly alive: boolean;
};
const sphere = new THREE.SphereGeometry(1, 20, 14);
const colors = { fur: 0xd69a61, cream: 0xffedce, mint: 0x70d5b7, dark: 0x352c38, pink: 0xedaca3 };
type Color = keyof typeof colors;

/** Render-only plush courier. All attachments share the slide hierarchy. */
export class PlayerModel {
  readonly group = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly eyes: THREE.Group[] = [];
  private readonly detail = new ModelKit(1.35);
  private readonly ears: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly feet: THREE.Group[] = [];
  private readonly scarf = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly cape = new THREE.Group();
  private readonly hat = new THREE.Group();
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly rewards = createRewardModels();
  private time = 0;
  private landing = 0;
  private wasAirborne = false;

  constructor() {
    this.group.name = 'rabbit-hunter';
    this.rig.name = 'courier-pose';
    this.group.add(this.rig);
    this.part(this.rig, 'fur', [0, 0.77, 0], [0.43, 0.54, 0.33]);
    this.part(this.rig, 'cream', [0, 0.8, 0.28], [0.31, 0.38, 0.1]);
    this.head.position.set(0, 1.43, 0.03);
    this.rig.add(this.head);
    const headShell = this.part(this.head, 'fur', [0, 0, 0], [0.54, 0.46, 0.43]);
    const sculpt = new THREE.SphereGeometry(1, 32, 24);
    const vertices = sculpt.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i);
      vertices.setX(i, vertices.getX(i) * (1 + Math.max(0, -y) * 0.13));
      if (y > 0.65) vertices.setY(i, 0.65 + (y - 0.65) * 0.8);
    }
    sculpt.computeVertexNormals();
    headShell.geometry = sculpt;
    this.part(this.head, 'cream', [0, -0.15, 0.32], [0.36, 0.23, 0.2]);
    this.part(this.head, 'dark', [0, -0.08, 0.515], [0.095, 0.065, 0.055]);
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.23, 0.055, 0.38);
      this.detail.sphere(0x76503e, [0, 0, -0.015], [0.087, 0.112, 0.047], eye, 16);
      this.detail.sphere(0x291f2c, [0, 0, 0.012], [0.07, 0.092, 0.045], eye, 16, 'eye');
      this.detail.sphere(0xfff8e7, [-0.02, 0.038, 0.049], [0.024, 0.03, 0.012], eye, 8, 'eye');
      this.detail.sphere(0xcbdcdd, [0.027, -0.03, 0.05], [0.011, 0.013, 0.008], eye, 8);
      this.head.add(eye);
      this.eyes.push(eye);
      this.detail.tube(0xa76e43, [[side * 0.14, 0.2, 0.36], [side * 0.22, 0.24, 0.37],
        [side * 0.3, 0.2, 0.335]], 0.015, this.head);
      this.part(this.head, 'pink', [side * 0.35, -0.12, 0.345], [0.09, 0.048, 0.038]);
      const ear = new THREE.Group();
      ear.position.set(side * 0.34, 0.27, -0.025);
      const profile = new THREE.SplineCurve([
        new THREE.Vector2(0, 0), new THREE.Vector2(0.08, 0.05),
        new THREE.Vector2(0.16, 0.25), new THREE.Vector2(0.16, 0.46),
        new THREE.Vector2(0.1, 0.67), new THREE.Vector2(0, 0.79),
      ]).getPoints(28);
      this.detail.mesh(new THREE.LatheGeometry(profile, 32), colors.fur,
        [0, 0, 0], [1, 1, 0.65], ear);
      this.detail.sphere(0xe9aa9f, [0, 0.38, 0.09], [0.095, 0.275, 0.032], ear, 20);
      this.detail.tube(0xf9d2bb, [[-0.08, 0.18, 0.096], [-0.1, 0.38, 0.1],
        [-0.04, 0.59, 0.095]], 0.011, ear);
      this.head.add(ear); this.ears.push(ear);
      const arm = new THREE.Group();
      arm.position.set(side * 0.4, 1, 0);
      this.part(arm, 'fur', [side * 0.03, -0.17, 0], [0.15, 0.28, 0.15]);
      this.part(arm, 'cream', [side * 0.03, -0.36, 0.03], [0.16, 0.16, 0.17]);
      for (const finger of [-0.05, 0.04]) {
        this.detail.tube(0xcaa582, [[finger, -0.4, 0.172], [finger, -0.34, 0.182]], 0.008, arm);
      }
      this.rig.add(arm); this.arms.push(arm);
      const foot = new THREE.Group();
      foot.position.set(side * 0.23, 0.3, 0);
      this.part(foot, 'fur', [0, -0.08, 0], [0.18, 0.23, 0.19]);
      this.detail.box(0x514250, [0, -0.225, 0.095], [0.41, 0.095, 0.52], foot, 0.04, 'leather');
      this.detail.sphere(0x98684b, [0, -0.115, 0.08], [0.19, 0.17, 0.26], foot, 16, 'leather');
      this.detail.sphere(0xbb9168, [0, -0.15, 0.22], [0.18, 0.12, 0.15], foot, 12, 'leather');
      const cuff = this.detail.torus(0xd6b888, [0, 0.015, 0], 0.16, 0.024, foot);
      cuff.rotation.x = Math.PI / 2;
      for (const z of [0.09, 0.16]) this.detail.tube(0xffdfae,
        [[-0.095, 0.015, z], [0, 0.035, z + 0.025], [0.095, 0.015, z]], 0.012, foot);
      this.detail.box(0xd6b888, [0, -0.08, -0.18], [0.06, 0.13, 0.025], foot, 0.01);
      this.rig.add(foot); this.feet.push(foot);
    }
    this.part(this.rig, 'mint', [0, 1.15, 0], [0.47, 0.105, 0.36]);
    this.scarf.position.set(-0.2, 1.13, -0.31);
    for (const side of [-1, 1]) {
      const ribbon = new THREE.Shape();
      ribbon.moveTo(-0.075, 0);
      ribbon.lineTo(0.085, 0);
      ribbon.quadraticCurveTo(0.11, -0.2, 0.06, -0.5);
      ribbon.lineTo(-0.015, -0.44);
      ribbon.lineTo(-0.075, -0.52);
      ribbon.quadraticCurveTo(-0.035, -0.2, -0.075, 0);
      this.detail.shape(colors.mint, ribbon, 0.024, [side * 0.1, 0, -0.04], this.scarf)
        .rotation.set(0.55, 0, side * 0.18);
    }
    this.rig.add(this.scarf);
    this.addHunterDetails();
    this.tail.position.set(-0.15, 0.5, -0.27);
    this.part(this.tail, 'fur', [0, 0.05, -0.24], [0.24, 0.22, 0.38]);
    this.part(this.tail, 'cream', [0, 0.07, -0.48], [0.19, 0.18, 0.18]);
    this.rig.add(this.tail);
    this.cape.position.set(0, 1.12, -0.32);
    for (const model of Object.values(this.rewards.capes)) {
      model.group.visible = false;
      this.cape.add(model.group);
    }
    this.rig.add(this.cape);
    this.hat.position.set(0, 0.38, 0);
    for (const model of Object.values(this.rewards.hats)) {
      model.group.visible = false;
      this.hat.add(model.group);
    }
    this.head.add(this.hat);
    this.cape.visible = false; this.hat.visible = false;
    this.reset();
  }

  private addHunterDetails(): void {
    const k = this.detail;
    const coat = new THREE.LatheGeometry([
      new THREE.Vector2(0.3, 0.4), new THREE.Vector2(0.4, 0.52),
      new THREE.Vector2(0.43, 0.78), new THREE.Vector2(0.36, 1.05),
    ], 20, 0.48, Math.PI * 2 - 0.96);
    k.mesh(coat, 0x315f63, [0, 0, 0], [1, 1, 0.82], this.rig);
    for (const side of [-1, 1]) {
      k.tube(0x9dd5bc, [[side * 0.15, 0.42, 0.225], [side * 0.19, 0.68, 0.315],
        [side * 0.17, 1.045, 0.26]], 0.014, this.rig);
      k.box(0x467979, [side * 0.27, 0.63, 0.21], [0.17, 0.18, 0.09], this.rig, 0.025);
      k.sphere(0xdfbc6c, [side * 0.27, 0.69, 0.26], [0.023, 0.023, 0.013], this.rig, 8, 'metal');
    }
    k.tube(0x6e493a, [[-0.26, 1.05, 0.28], [0, 0.84, 0.37], [0.3, 0.55, 0.21]],
      0.035, this.rig, 'leather');
    k.tube(0x6e493a, [[-0.27, 1.05, -0.24], [0, 0.86, -0.37], [0.32, 0.56, -0.28]],
      0.038, this.rig, 'leather');
    k.box(0x81513d, [0.32, 0.65, -0.34], [0.43, 0.43, 0.28], this.rig, 0.07, 'leather');
    k.box(0xb78051, [0.32, 0.77, -0.495], [0.43, 0.19, 0.05], this.rig, 0.025, 'leather');
    k.box(0xe3bd70, [0.32, 0.68, -0.535], [0.105, 0.105, 0.025], this.rig, 0.02, 'metal');
    k.box(0x634838, [0.32, 0.68, -0.55], [0.05, 0.055, 0.012], this.rig, 0.005);
    for (let stitch = 0; stitch < 6; stitch++) {
      k.box(0xe2bd87, [0.16 + stitch * 0.064, 0.82, -0.526], [0.025, 0.008, 0.008], this.rig, 0);
    }
    const compass = k.torus(0xe4bc65, [-0.22, 1.13, 0.32], 0.064, 0.013, this.rig, 'metal');
    compass.rotation.y = -0.2;
    k.sphere(0x7ae4d0, [-0.22, 1.13, 0.325], [0.046, 0.046, 0.017], this.rig, 12, 'glow');
    k.tube(0x795044, [[0, -0.13, 0.505], [0, -0.22, 0.51]], 0.01, this.head);
    for (const side of [-1, 1]) {
      k.tube(0x795044, [[0, -0.22, 0.51], [side * 0.07, -0.25, 0.505],
        [side * 0.13, -0.21, 0.475]], 0.009, this.head);
      for (let i = 0; i < 2; i++) {
        k.sphere(0xaa7d59, [side * (0.19 + i * 0.06), -0.145, 0.482 - i * 0.035],
          [0.011, 0.011, 0.006], this.head, 6);
      }
    }
  }

  private part(
    parent: THREE.Object3D,
    color: Color | THREE.MeshStandardMaterial,
    position: [number, number, number],
    scale: [number, number, number],
  ): THREE.Mesh {
    let material: THREE.MeshStandardMaterial;
    if (typeof color === 'string') {
      const hex = colors[color];
      const cached = this.materials.get(hex);
      material = cached ?? new THREE.MeshStandardMaterial({ color: hex, roughness: 0.78 });
      if (!cached) this.materials.set(hex, material);
    } else {
      material = color;
    }
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  equipCape(color: number, style: CapeStyle = 'ghost'): void {
    for (const [key, model] of Object.entries(this.rewards.capes)) model.group.visible = key === style;
    this.rewards.capes[style].tint.color.setHex(color);
    this.cape.visible = true;
  }
  unequipCape(): void { this.cape.visible = false; }
  equipHat(color: number, style: HatStyle = 'patchwork'): void {
    for (const [key, model] of Object.entries(this.rewards.hats)) model.group.visible = key === style;
    this.rewards.hats[style].tint.color.setHex(color);
    this.hat.visible = true;
  }
  unequipHat(): void { this.hat.visible = false; }
  get hasCape(): boolean { return this.cape.visible; }
  get hasHat(): boolean { return this.hat.visible; }

  reset(): void {
    this.time = 0;
    this.landing = 0;
    this.wasAirborne = false;
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.rig.scale.setScalar(0.75);
    this.head.rotation.set(0, 0, 0);
    for (const limb of [...this.arms, ...this.feet, ...this.ears]) limb.rotation.set(0, 0, 0);
    for (const material of this.materials.values()) material.emissive.setHex(0);
  }

  update(dt: number, pose: PlayerPose): void {
    this.time += dt;
    if (this.wasAirborne && !pose.airborne) this.landing = 1;
    this.wasAirborne = pose.airborne;
    this.landing = Math.max(0, this.landing - dt * 6);
    const blend = 1 - Math.exp(-22 * dt);
    const stride = Math.sin(this.time * (pose.dash ? 23 : 16));
    const gait = pose.running && !pose.airborne && !pose.sliding && pose.alive;
    const squash = this.landing * 0.12;
    const sx = pose.sliding ? 0.62 : 0.75 + squash;
    const sy = pose.sliding ? 0.62 : 0.75 - squash + (pose.airborne ? 0.035 : 0);
    this.rig.scale.x += (sx - this.rig.scale.x) * blend;
    // Clearance is immediate: the visual must agree with the slide hitbox.
    this.rig.scale.y = pose.sliding ? sy : this.rig.scale.y + (sy - this.rig.scale.y) * blend;
    this.rig.scale.z += ((pose.sliding ? 0.62 : 0.75 + squash) - this.rig.scale.z) * blend;
    this.rig.position.y = pose.sliding ? 0.36 : gait ? Math.abs(stride) * 0.045 : Math.sin(this.time * 3) * 0.012;
    const lean = THREE.MathUtils.clamp(-pose.lateralVelocity * 0.018, -0.24, 0.24);
    this.rig.rotation.z += (lean - this.rig.rotation.z) * blend;
    this.rig.rotation.x = pose.sliding ? Math.PI / 2 :
      this.rig.rotation.x + ((pose.airborne ? -pose.verticalVelocity * 0.014 : 0.04) - this.rig.rotation.x) * blend;
    this.head.rotation.y = Math.sin(this.time * (gait ? 2 : 1.4)) * (gait ? 0.06 : 0.25);
    this.head.rotation.z = Math.sin(this.time * 2.4) * 0.035;
    const blinkPhase = this.time % 4.6;
    const blink = blinkPhase > 4.4 ? Math.max(0.08, Math.abs(blinkPhase - 4.5) * 10) : 1;
    for (const eye of this.eyes) eye.scale.y = blink;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.feet[i].rotation.x = gait ? stride * side * 0.65 : pose.airborne ? -0.35 : 0;
      this.arms[i].rotation.x = gait ? -stride * side * 0.65 : pose.airborne ? -0.6 : -0.1;
      this.arms[i].rotation.z = side * (pose.airborne ? -0.45 : -0.12);
      this.ears[i].rotation.x = -0.08 + Math.sin(this.time * 8 + i) * 0.07 - (pose.dash ? 0.3 : 0);
      this.ears[i].rotation.z = side * 0.18 + Math.sin(this.time * 5 + i) * 0.04;
    }
    this.scarf.rotation.x = Math.sin(this.time * 10) * 0.14 + (pose.dash ? 0.6 : 0.1);
    this.cape.rotation.x = Math.sin(this.time * 8) * 0.12 + 0.15;
    this.tail.rotation.y = Math.sin(this.time * 7) * 0.2;
    const pulse = pose.invulnerable ? 0.2 + Math.sin(this.time * 30) * 0.1 : 0;
    for (const material of this.materials.values()) {
      material.emissive.setRGB(pulse, pose.dash ? 0.16 : pulse * 0.35, pose.dash ? 0.12 : pulse * 0.15);
    }
  }
}
