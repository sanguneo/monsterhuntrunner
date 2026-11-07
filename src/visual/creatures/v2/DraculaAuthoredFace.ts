import * as THREE from 'three';
import { authoredDraculaFace } from './generated/draculaFaceV4';
/** Exact Blender-authored topology; no runtime/offline shape divergence. */
export function buildAuthoredDraculaFace(): THREE.Mesh[] {
  return authoredDraculaFace.map((part) => {
    const geometry = new THREE.BufferGeometry();
    geometry.userData.authoredFace = true;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uv, 2));
    if (part.color.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(part.color, 3));
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, side: THREE.FrontSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    return mesh;
  });
}
