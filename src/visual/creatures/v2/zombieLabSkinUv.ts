import * as THREE from 'three';
/** Geometry-specific offline atlas payload. No file/network access in model construction. */
export interface OfflineSkinUv {
  geometrySha256: string;
  geometryFnv32: number;
  vertexCount: number;
  uvSha256: string;
  tangentSha256: string;
  uvBase64: string;
  tangentBase64: string;
}
function decodeFloats(base64: string, count: number): Float32Array {
  const text = atob(base64);
  if (text.length !== count * 4) throw new Error('Offline skin atlas byte count mismatch');
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return Float32Array.from({ length: count }, (_, i) => view.getFloat32(i * 4, true));
}
export function skinGeometryFnv32(geometry: THREE.BufferGeometry): number {
  let hash = 0x811c9dc5;
  for (const key of ['position', 'normal']) {
    const attribute = geometry.getAttribute(key);
    if (!attribute || !(attribute.array instanceof Float32Array))
      throw new Error('Offline skin atlas needs Float32 position/normal');
    const bytes = new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash;
}
/** Fail closed on stale geometry. SHA256 is additionally verified by the offline packaging/test step. */
export function attachOfflineSkinUv(geometry: THREE.BufferGeometry, atlas: OfflineSkinUv): void {
  const count = geometry.getAttribute('position')?.count;
  if (geometry.index || count !== atlas.vertexCount || skinGeometryFnv32(geometry) !== atlas.geometryFnv32)
    throw new Error('Stale offline skin UV atlas: regenerate unwrap/bake for this exact authored geometry');
  const uv = decodeFloats(atlas.uvBase64, count * 2),
    tangent = decodeFloats(atlas.tangentBase64, count * 4);
  if (!uv.every((v) => Number.isFinite(v) && v >= -0.0001 && v <= 1.0001) || !tangent.every(Number.isFinite))
    throw new Error('Invalid offline skin UV/tangent values');
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('tangent', new THREE.BufferAttribute(tangent, 4));
  geometry.userData.skinAtlasGeometrySha256 = atlas.geometrySha256;
  geometry.userData.skinAtlasUvSha256 = atlas.uvSha256;
  geometry.userData.skinAtlasTangentSha256 = atlas.tangentSha256;
}
