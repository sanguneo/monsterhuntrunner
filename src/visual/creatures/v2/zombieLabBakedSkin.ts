import * as THREE from 'three';
import { attachOfflineSkinUv, type OfflineSkinUv } from './zombieLabSkinUv';
import { registerSharedCreatureTexture } from './SurfaceDetail';
export interface BakedSkinPayload {
  atlas: OfflineSkinUv;
  size: number;
  maps: Record<'basecolor' | 'normal' | 'orm', { rgbaBase64: string; sha256: string }>;
}
type SkinMaps = Record<'basecolor' | 'normal' | 'orm', THREE.DataTexture>;
const cache = new Map<string, SkinMaps>();
function skinMaps(data: BakedSkinPayload): SkinMaps {
  const key =
    data.atlas.geometrySha256 +
    Object.values(data.maps)
      .map((m) => m.sha256)
      .join('');
  const old = cache.get(key);
  if (old) return old;
  const result = {} as SkinMaps;
  for (const kind of ['basecolor', 'normal', 'orm'] as const) {
    const bytes = Uint8Array.from(atob(data.maps[kind].rgbaBase64), (c) => c.charCodeAt(0));
    if (bytes.length !== data.size * data.size * 4) throw new Error('Invalid baked skin RGBA size');
    const map = new THREE.DataTexture(bytes, data.size, data.size, THREE.RGBAFormat, THREE.UnsignedByteType);
    map.colorSpace = kind === 'basecolor' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.flipY = false;
    map.generateMipmaps = true;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.needsUpdate = true;
    map.name = 'authored-skin-' + kind;
    map.addEventListener('dispose', () => cache.delete(key));
    result[kind] = registerSharedCreatureTexture(map);
  }
  cache.set(key, result);
  return result;
}
export function applyBakedSkin(mesh: THREE.Mesh, data: BakedSkinPayload): void {
  attachOfflineSkinUv(mesh.geometry, data.atlas);
  const maps = skinMaps(data);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: maps.basecolor,
    normalMap: maps.normal,
    aoMap: maps.orm,
    roughnessMap: maps.orm,
    metalnessMap: maps.orm,
    roughness: 1,
    metalness: 1,
    aoMapIntensity: 0.35,
  });
  mat.name = 'anatomical-skin-offline-atlas';
  mat.userData.sharedImmutableMaps = true;
  // Original material may be shared with head/fingers; retain its owner-managed lifecycle.
  mesh.material = mat;
}
