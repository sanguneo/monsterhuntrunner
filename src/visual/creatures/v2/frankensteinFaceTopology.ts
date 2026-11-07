import * as THREE from 'three';
import { authoredFrankensteinFace } from './generated/frankensteinFace';
import { ZLKit } from './zombieLabTools';
function floats(payload: string, count: number): Float32Array {
  const raw = atob(payload);
  if (raw.length !== count * 4) throw new Error('Authored face buffer byte count mismatch');
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    view = new DataView(bytes.buffer);
  return Float32Array.from({ length: count }, (_, i) => view.getFloat32(i * 4, true));
}
/** Exact evaluated Blender quad/orbital-loop topology. Never recompute normals after UV expansion. */
export function authorFrankensteinFace(k: ZLKit, skin: number): THREE.Mesh {
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: skin,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0,
  });
  skinMaterial.name = 'authored-quad-frankenstein-skin';
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
  });
  eyeMaterial.name = 'seated-sclera-iris-pupil-cornea';
  let shell: THREE.Mesh | undefined;
  for (const part of authoredFrankensteinFace) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(floats(part.position, part.count * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(floats(part.normal, part.count * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(floats(part.uv, part.count * 2), 2));
    const color = part.vertexColor
      ? floats(part.vertexColor, part.count * 3)
      : Float32Array.from({ length: part.count * 3 }, (_, i) => part.color[i % 3]);
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    const mesh = new THREE.Mesh(g, part.role === 'skin' ? skinMaterial : eyeMaterial);
    mesh.name = part.name;
    k.group.add(mesh);
    if (part.role === 'skin') shell = mesh;
  }
  if (!shell) throw new Error('Authored Frankenstein skin shell missing');
  return shell;
}
