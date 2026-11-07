import * as THREE from 'three';
import { authoredSchoolFace as girl } from './generated/schoolGirlFace';
import { authoredSchoolFace as teacher } from './generated/schoolTeacherFace';
import { createSurfaceMaterial } from './SurfaceDetail';

/** Editable Blender topology: original teacher; CC0-derived anatomical girl (see THIRD_PARTY_ART_SOURCES). Exact runtime surfaces. */
export function buildSchoolAuthoredFace(identity: 'girl' | 'teacher'): THREE.Mesh[] {
  const skin = createSurfaceMaterial('spectralSkin', { color: 0xa99cab, roughness: 0.9, normalStrength: 0.025 });
  skin.vertexColors = true;
  const sclera = new THREE.MeshStandardMaterial({ color: 0xa79ca7, roughness: 0.45 });
  const iris = new THREE.MeshStandardMaterial({ color: identity === 'girl' ? 0x55406c : 0x534837, roughness: 0.3 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x18151e, roughness: 0.35 });
  const brow = new THREE.MeshStandardMaterial({ color: identity === 'girl' ? 0x403347 : 0x77717a, roughness: 0.85 });
  return (identity === 'girl' ? girl : teacher).map((part) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uv, 2));
    const material = /school-iris/.test(part.name)
      ? iris
      : /school-pupil/.test(part.name)
        ? pupil
        : /sclera/.test(part.name)
          ? sclera
          : /brow/.test(part.name)
            ? brow
            : skin;
    if (material === skin)
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(
          part.color.length
            ? part.color
            : Float32Array.from({ length: part.position.length }, (_, i) => [0.95, 0.9, 0.89][i % 3]),
          3,
        ),
      );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `authored-${identity}-${part.name}`;
    mesh.userData.authoredSchoolFace = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
}
