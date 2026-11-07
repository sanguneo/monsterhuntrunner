import * as THREE from 'three';
import { authoredSeaWitchFace } from './sea-witch-authored-face';
import { createAquaticFaceMaterial } from './sea-witch-face-surfaces';
import { SeaSkullKit } from './sea-skull-kit';
/** Exact evaluated authored face, no runtime rebuild or smoothing of split normals. */
export function addAuthoredSeaWitchFace(k: SeaSkullKit): void {
  for (const part of authoredSeaWitchFace) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(part.uv, 2));
    if (part.color.length && !part.name.includes('skin'))
      g.setAttribute('color', new THREE.Float32BufferAttribute(part.color, 3));
    g.translate(0, 2.62, 0);
    const color = part.name.includes('skin')
      ? 0x94bdb8
      : part.name.includes('sclera')
        ? 0xb8cbc0
        : part.name.includes('iris')
          ? 0x2e8590
          : part.name.includes('pupil')
            ? 0x123e4a
            : 0x5f8986;
    const mesh = k.mesh(
      g,
      color,
      [0, 0, 0],
      [1, 1, 1],
      k.group,
      part.name.includes('skin') || part.name.includes('lips') ? 'cloth' : 'eye',
    );
    mesh.name = part.name;
    if (part.name.includes('skin')) mesh.material = createAquaticFaceMaterial();
    else (mesh.material as THREE.MeshStandardMaterial).vertexColors = part.color.length > 0;
  }
}
