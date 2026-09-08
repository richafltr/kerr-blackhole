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
  const window = new THREE.MeshStandardMaterial({
    color: 0x0b1417,
    roughness: 0.16,
    metalness: 0.82,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0x9c7545,
    roughness: 0.65,
    metalness: 0.6,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd696,
    emissive: 0xe1aa57,
    emissiveIntensity: 1.5,
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
    if (i % 3 === 0) {
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
  const probe = new THREE.Group();
  // Broad, faceted lifting-body capsule with a chamfered nose and panel seams.
  const outline = new THREE.Shape();
  outline.moveTo(-2.8, -5);
  outline.lineTo(2.8, -5);
  outline.lineTo(3.4, 1.8);
  outline.lineTo(1.9, 5);
  outline.lineTo(-1.9, 5);
  outline.lineTo(-3.4, 1.8);
  outline.closePath();
  const body = mesh(
    probe,
    new THREE.ExtrudeGeometry(outline, {
      depth: 1.5,
      bevelEnabled: true,
      bevelSize: 0.35,
      bevelThickness: 0.35,
      bevelSegments: 1,
      steps: 1,
    }),
    hull,
  );
  body.rotation.x = -Math.PI / 2;
  box(probe, 5.5, 0.35, 7.8, shadow, 0, -0.15, -0.5);
  const cockpit = box(probe, 3.5, 0.65, 2.8, shadow, 0, 1.8, -2.8);
  cockpit.rotation.x = 0.18;
  for (const side of [-1, 1]) {
    const glass = box(probe, 1.45, 0.07, 2.3, window, side * 0.88, 2.17, -2.75);
    glass.rotation.x = 0.18;
    for (let j = 0; j < 7; j++)
      box(probe, 0.035, 0.045, 0.95, metal, side * 2.7, 1.88, -1.2 + j * 0.7);
    box(probe, 0.6, 0.4, 2.2, gold, side * 2.7, 0.9, 3.4);
    const nozzle = mesh(
      probe,
      new THREE.CylinderGeometry(0.6, 0.8, 1.1, 12, 1, true),
      shadow,
      side * 1.7,
      0.75,
      5.2,
    );
    nozzle.rotation.x = Math.PI / 2;
    mesh(
      probe,
      new THREE.TorusGeometry(0.73, 0.1, 6, 16),
      metal,
      side * 1.7,
      0.75,
      5.75,
    );
    box(probe, 0.15, 0.15, 0.5, lamp, side * 3.1, 0.6, -2.4);
    for (let j = 0; j < 8; j++)
      box(probe, 1.4, 0.035, 0.06, metal, side * 1.6, 1.87, 0.2 + j * 0.5);
  }
  box(probe, 0.12, 0.05, 7, metal, 0, 1.89, 0.3);
  for (let j = 0; j < 4; j++)
    box(probe, 4.8, 0.04, 0.055, shadow, 0, 1.9, j * 1.2);
  return {
    probe,
    carrier,
    dispose() {
      geometries.forEach((g) => g.dispose());
      [hull, shadow, metal, window, gold, lamp].forEach((m) => m.dispose());
    },
  };
}
