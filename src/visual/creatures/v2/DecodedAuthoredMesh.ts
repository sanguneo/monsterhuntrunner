/** Lossless Float32 storage for authored geometry. No quantization or render-only data. */
export interface PackedAuthoredMesh {
  name: string;
  position: readonly [number, number];
  normal: readonly [number, number];
  uv: readonly [number, number];
  color: readonly [number, number];
}
export function decodeAuthoredMeshes(packed: { data: string; parts: readonly PackedAuthoredMesh[] }) {
  const binary = atob(packed.data);
  if (binary.length % 4) throw new Error('Invalid authored Float32 payload alignment');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  let values = new Float32Array(bytes.buffer);
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) {
    const view = new DataView(bytes.buffer);
    values = Float32Array.from({ length: bytes.length / 4 }, (_, i) => view.getFloat32(i * 4, true));
  }
  const field = ([offset, length]: readonly [number, number]) => {
    if (
      !Number.isInteger(offset) ||
      !Number.isInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > values.length
    )
      throw new Error('Invalid authored Float32 field bounds');
    return values.subarray(offset, offset + length);
  };
  return packed.parts.map((part) => {
    const position = field(part.position),
      normal = field(part.normal),
      uv = field(part.uv),
      color = field(part.color);
    if (
      position.length % 9 ||
      normal.length !== position.length ||
      uv.length * 3 !== position.length * 2 ||
      (color.length && color.length !== position.length)
    )
      throw new Error(`Invalid authored mesh attribute lengths: ${part.name}`);
    return { name: part.name, position, normal, uv, color };
  });
}
