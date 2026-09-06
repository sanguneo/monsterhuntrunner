import * as THREE from 'three';

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
const sphere = new THREE.SphereGeometry(1, 16, 12);
const colors = { fur: 0xd69a61, cream: 0xffedce, mint: 0x70d5b7, dark: 0x352c38, pink: 0xedaca3 };
type Color = keyof typeof colors;

/** Render-only plush courier. All attachments share the slide hierarchy. */
export class PlayerModel {
  readonly group = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly ears: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly feet: THREE.Group[] = [];
  private readonly scarf = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly cape = new THREE.Group();
  private readonly hat = new THREE.Group();
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly capeMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  private readonly hatMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  private time = 0;
  private landing = 0;
  private wasAirborne = false;

  constructor() {
    this.group.name = 'woodland-courier';
    this.rig.name = 'courier-pose';
    this.group.add(this.rig);
    this.part(this.rig, 'fur', [0, 0.77, 0], [0.43, 0.54, 0.33]);
    this.part(this.rig, 'cream', [0, 0.8, 0.28], [0.31, 0.38, 0.1]);
    this.head.position.set(0, 1.43, 0.03);
    this.rig.add(this.head);
    this.part(this.head, 'fur', [0, 0, 0], [0.54, 0.46, 0.43]);
    this.part(this.head, 'cream', [0, -0.15, 0.32], [0.36, 0.23, 0.2]);
    this.part(this.head, 'dark', [0, -0.08, 0.515], [0.095, 0.065, 0.055]);
    for (const side of [-1, 1]) {
      this.part(this.head, 'dark', [side * 0.23, 0.055, 0.38], [0.072, 0.096, 0.048]);
      this.part(this.head, 'cream', [side * 0.22, 0.089, 0.42], [0.022, 0.028, 0.014]);
      this.part(this.head, 'pink', [side * 0.35, -0.12, 0.345], [0.09, 0.048, 0.038]);
      const ear = new THREE.Group();
      ear.position.set(side * 0.34, 0.27, -0.025);
      this.part(ear, 'fur', [0, 0.29, 0], [0.19, 0.43, 0.15]);
      this.part(ear, 'pink', [0, 0.3, 0.12], [0.105, 0.29, 0.042]);
      this.part(ear, 'cream', [0, 0.54, -0.025], [0.145, 0.16, 0.12]);
      this.head.add(ear); this.ears.push(ear);
      const arm = new THREE.Group();
      arm.position.set(side * 0.4, 1, 0);
      this.part(arm, 'fur', [side * 0.03, -0.17, 0], [0.15, 0.28, 0.15]);
      this.part(arm, 'cream', [side * 0.03, -0.36, 0.03], [0.16, 0.16, 0.17]);
      this.rig.add(arm); this.arms.push(arm);
      const foot = new THREE.Group();
      foot.position.set(side * 0.23, 0.3, 0);
      this.part(foot, 'fur', [0, -0.08, 0], [0.18, 0.23, 0.19]);
      this.part(foot, 'cream', [0, -0.18, 0.12], [0.21, 0.13, 0.28]);
      this.rig.add(foot); this.feet.push(foot);
    }
    this.part(this.rig, 'mint', [0, 1.15, 0], [0.47, 0.105, 0.36]);
    this.scarf.position.set(-0.2, 1.13, -0.31);
    for (const side of [-1, 1]) {
      this.part(this.scarf, 'mint', [side * 0.1, -0.22, -0.13], [0.09, 0.3, 0.035]).rotation.set(0.6, 0, side * 0.2);
    }
    this.rig.add(this.scarf);
    this.part(this.rig, 'dark', [0.1, 0.85, -0.31], [0.055, 0.43, 0.04]).rotation.z = -0.6;
    this.part(this.rig, 'fur', [0.35, 0.63, -0.31], [0.27, 0.27, 0.17]);
    this.part(this.rig, 'cream', [0.35, 0.72, -0.46], [0.22, 0.13, 0.045]);
    this.part(this.rig, 'mint', [0.35, 0.67, -0.505], [0.052, 0.06, 0.023]);
    this.tail.position.set(-0.15, 0.5, -0.27);
    this.part(this.tail, 'fur', [0, 0.05, -0.24], [0.24, 0.22, 0.38]);
    this.part(this.tail, 'cream', [0, 0.07, -0.48], [0.19, 0.18, 0.18]);
    this.rig.add(this.tail);
    this.cape.position.set(0, 1.12, -0.32);
    this.part(this.cape, this.capeMat, [0, -0.4, -0.1], [0.46, 0.49, 0.075]);
    this.rig.add(this.cape);
    this.hat.position.set(0, 0.38, 0);
    this.part(this.hat, this.hatMat, [0, 0.08, 0], [0.3, 0.17, 0.29]);
    this.part(this.hat, this.hatMat, [0, 0, 0.06], [0.4, 0.055, 0.35]);
    this.part(this.hat, 'mint', [0, 0.23, 0], [0.075, 0.08, 0.075]);
    this.head.add(this.hat);
    this.cape.visible = false; this.hat.visible = false;
    this.reset();
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

  equipCape(color: number): void { this.capeMat.color.setHex(color); this.cape.visible = true; }
  unequipCape(): void { this.cape.visible = false; }
  equipHat(color: number): void { this.hatMat.color.setHex(color); this.hat.visible = true; }
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
