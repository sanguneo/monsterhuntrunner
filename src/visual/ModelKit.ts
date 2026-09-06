import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = readonly [number, number, number];
export type Surface = 'cloth' | 'leather' | 'metal' | 'glow' | 'eye';

/** Small authoring toolkit; callers own the resulting model and its resources. */
export class ModelKit {
  readonly group = new THREE.Group();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();

  // Actors opt into denser curved surfaces; repeated scenery keeps its budget.
  constructor(private readonly density = 1) {}

  material(color: number, surface: Surface = 'cloth'): THREE.MeshStandardMaterial {
    const key = `${color}:${surface}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: surface === 'metal' ? 0.32 : surface === 'eye' ? 0.18 : surface === 'leather' ? 0.62 : 0.88,
        metalness: surface === 'metal' ? 0.55 : 0,
        emissive: surface === 'glow' ? color : 0,
        emissiveIntensity: surface === 'glow' ? 1.5 : 0,
      });
      this.materials.set(key, material);
    }
    return material;
  }

  mesh(geometry: THREE.BufferGeometry, color: number, position: Vec3 = [0, 0, 0],
    scale: Vec3 = [1, 1, 1], parent: THREE.Object3D = this.group, surface: Surface = 'cloth'): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color, surface));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  sphere(color: number, position: Vec3, scale: Vec3, parent = this.group, segments = 12, surface: Surface = 'cloth'): THREE.Mesh {
    const radial = Math.ceil(segments * this.density);
    return this.mesh(new THREE.SphereGeometry(1, radial, Math.max(6, Math.floor(radial * 0.66))),
      color, position, scale, parent, surface);
  }

  box(color: number, position: Vec3, size: Vec3, parent = this.group, bevel = 0.04, surface: Surface = 'cloth'): THREE.Mesh {
    const geometry = bevel > 0
      ? new RoundedBoxGeometry(size[0], size[1], size[2], Math.ceil(this.density), Math.min(bevel, ...size.map(v => v / 3)))
      : new THREE.BoxGeometry(...size);
    return this.mesh(geometry, color, position, [1, 1, 1], parent, surface);
  }

  cylinder(color: number, position: Vec3, radiusTop: number, radiusBottom: number, height: number,
    parent = this.group, segments = 12, surface: Surface = 'cloth'): THREE.Mesh {
    const radial = segments <= 6 ? segments : Math.ceil(segments * this.density);
    return this.mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial),
      color, position, [1, 1, 1], parent, surface);
  }

  tube(color: number, points: readonly Vec3[], radius: number, parent = this.group, surface: Surface = 'cloth'): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return this.mesh(new THREE.TubeGeometry(curve, Math.ceil(Math.max(8, points.length * 3) * this.density),
      radius, Math.ceil(5 * this.density), false),
      color, [0, 0, 0], [1, 1, 1], parent, surface);
  }

  torus(color: number, position: Vec3, radius: number, thickness: number,
    parent = this.group, surface: Surface = 'cloth', arc = Math.PI * 2): THREE.Mesh {
    return this.mesh(new THREE.TorusGeometry(radius, thickness, Math.ceil(5 * this.density), Math.ceil(20 * this.density), arc),
      color, position, [1, 1, 1], parent, surface);
  }

  lathe(color: number, profile: readonly (readonly [number, number])[], position: Vec3,
    parent = this.group, surface: Surface = 'cloth'): THREE.Mesh {
    return this.mesh(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), Math.ceil(20 * this.density)),
      color, position, [1, 1, 1], parent, surface);
  }

  shape(color: number, outline: THREE.Shape, depth: number, position: Vec3,
    parent = this.group, surface: Surface = 'cloth'): THREE.Mesh {
    return this.mesh(new THREE.ExtrudeGeometry(outline, {
      depth, bevelEnabled: true, bevelSegments: Math.ceil(this.density), steps: 1,
      bevelSize: Math.min(depth * 0.2, 0.025), bevelThickness: Math.min(depth * 0.2, 0.025),
      curveSegments: Math.ceil(8 * this.density),
    }), color, position, [1, 1, 1], parent, surface);
  }
}

/** Batch a newly authored static template by material before cloning it. */
export function bakeStaticModel(source: THREE.Group): THREE.Group {
  source.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals = new Set<THREE.BufferGeometry>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    if (!geometry.getAttribute('uv')) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(
        new Float32Array(geometry.getAttribute('position').count * 2), 2));
    }
    const group = batches.get(object.material) ?? [];
    group.push(geometry);
    batches.set(object.material, group);
    originals.add(object.geometry);
  });
  const result = new THREE.Group();
  result.name = source.name;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error('Authored model contains incompatible geometry attributes');
    result.add(new THREE.Mesh(merged, material));
    geometries.forEach(geometry => geometry.dispose());
  }
  originals.forEach(geometry => geometry.dispose());
  return result;
}
