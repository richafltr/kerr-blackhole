import * as THREE from 'three';
// Original procedural game assets. Metres, local Euclidean mesh layer.
export function createVessels() {
  const hull = new THREE.MeshStandardMaterial({
    color: 0xb8b6a8,
    roughness: 0.76,
    metalness: 0.28,
  });
  const shadow = new THREE.MeshStandardMaterial({
    color: 0x252726,
    roughness: 0.65,
    metalness: 0.48,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x60615b,
    roughness: 0.5,
    metalness: 0.7,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd696,
    emissive: 0xe1aa57,
    emissiveIntensity: 1.5,
  });
  const engine = new THREE.MeshStandardMaterial({
    color: 0x273238,
    metalness: 0.75,
    roughness: 0.4,
  });
  const throat = new THREE.MeshStandardMaterial({
    color: 0x081219,
    emissive: 0x69b9e8,
    emissiveIntensity: 0.45,
  });
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const box = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const carrier = new THREE.Group();
  // Twelve habitable modules around a 54-metre wheel; internal spokes and a docking hub.
  mesh(carrier, new THREE.TorusGeometry(23, 0.45, 6, 96), metal);
  mesh(carrier, new THREE.TorusGeometry(25, 0.22, 6, 96), shadow);
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6,
      habitat = new THREE.Group();
    habitat.position.set(Math.cos(angle) * 24, Math.sin(angle) * 24, 0);
    habitat.rotation.z = angle;
    carrier.add(habitat);
    box(habitat, 5.5, 7, 5, hull);
    box(habitat, 5.65, 0.3, 5.12, shadow, 0, -2.5);
    box(habitat, 5.65, 0.3, 5.12, shadow, 0, 2.5);
    box(habitat, 3.5, 4.4, 0.12, metal, 0, 0, 2.56);
    for (let j = 0; j < 4; j++)
      box(habitat, 2.8, 0.12, 0.14, shadow, 0, -1.5 + j, 2.65);
    box(habitat, 0.2, 0.55, 0.15, lamp, 1.9, 0, 2.65);
    // Recessed radiators, service rails and four engine bells on alternate drive modules.
    box(habitat, 0.16, 5.6, 0.2, metal, -2.5, 0, 2.6);
    box(habitat, 0.16, 5.6, 0.2, metal, 2.5, 0, 2.6);
    for (let rib = 0; rib < 6; rib++) {
      box(habitat, 0.15, 4.2, 0.2, hull, -1.65 + rib * 0.65, 0, -2.6);
    }
    if (i % 3 === 0) {
      box(habitat, 4.6, 5, 0.2, shadow, 0, 0, 2.8);
      for (const x of [-1.05, 1.05])
        for (const y of [-1.2, 1.2]) {
          const bell = mesh(
            habitat,
            new THREE.CylinderGeometry(0.94, 0.53, 1.1, 16, 1, true),
            engine,
            x,
            y,
            3.35,
          );
          bell.rotation.x = Math.PI / 2;
          mesh(
            habitat,
            new THREE.TorusGeometry(0.94, 0.08, 6, 16),
            metal,
            x,
            y,
            3.9,
          );
          mesh(habitat, new THREE.CircleGeometry(0.64, 16), throat, x, y, 2.92);
        }

      const spoke = box(
        carrier,
        23,
        0.45,
        0.45,
        metal,
        Math.cos(angle) * 11.5,
        Math.sin(angle) * 11.5,
      );
      spoke.rotation.z = angle;
    }
  }
  const hub = mesh(carrier, new THREE.CylinderGeometry(2.8, 2.8, 7, 12), hull);
  hub.rotation.x = Math.PI / 2;
  mesh(carrier, new THREE.TorusGeometry(2.4, 0.25, 6, 24), shadow, 0, 0, 3.6);
  return {
    carrier,
    dispose() {
      geometries.forEach((g) => g.dispose());
      [hull, shadow, metal, lamp, engine, throat].forEach((m) => m.dispose());
    },
  };
}
