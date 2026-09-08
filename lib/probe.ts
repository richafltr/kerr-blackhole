import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export type Perspective = 'onboard' | 'beside' | 'wide' | 'optics';
const APOLLO_MATERIALS = new Set([
  'blinn11SG',
  'blinn14SG',
  'blinn4SG',
  'blinn13SG',
  'apollohorns_blin',
  'apollohorns_bli1',
]);
export function createProbeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(
      (2 * Math.atan(0.38) * 180) / Math.PI,
      1,
      0.1,
      200,
    );
  camera.position.set(0, 1, 34);
  camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffe5c0, 4);
  key.position.set(8, 10, -4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8ba4c0, 1.2);
  fill.position.set(-5, 2, 12);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xaeb9c3, 0.7));
  const vehicle = new THREE.Group(),
    capsule = new THREE.Group(),
    carrier = new THREE.Group();
  vehicle.add(capsule, carrier);
  vehicle.rotation.set(0.2, -0.4, -0.35);
  vehicle.position.set(-1, -1, 0);
  scene.add(vehicle);
  let disposed = false,
    loadError: unknown,
    loaded = false,
    lastWidth = 0,
    lastHeight = 0;
  const geometries: THREE.BufferGeometry[] = [],
    materials = new Set<THREE.Material>();
  const cleanupMaterial = (material: THREE.Material) => {
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) value.dispose();
    material.dispose();
  };
  const loading = new GLTFLoader()
    .loadAsync('/assets/apollo-soyuz.glb')
    .then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
        geometries.push(geometry);
        const material = node.material as THREE.Material;
        materials.add(material);
        const mesh = new THREE.Mesh(geometry, material);
        (APOLLO_MATERIALS.has(material.name) ? capsule : carrier).add(mesh);
      });
      // NASA's model units are retained; the capsule/service section is ~11.8 m long.
      const box = new THREE.Box3().setFromObject(capsule),
        center = box.getCenter(new THREE.Vector3());
      capsule.position.copy(center).multiplyScalar(-1);
      carrier.position.copy(capsule.position);
      loaded = true;
      if (disposed) {
        geometries.forEach((g) => g.dispose());
        materials.forEach(cleanupMaterial);
      }
    })
    .catch((e: unknown) => {
      loadError = e;
    });
  void loading;
  return {
    render(mode: Perspective, separationM = 0) {
      if (loadError)
        throw new Error(
          `Spacecraft asset failed to load: ${loadError instanceof Error ? loadError.message : 'unknown asset error'}`,
        );
      if (renderer.getContext().isContextLost())
        throw new Error('Spacecraft GPU context was lost. Reload.');
      const rect = canvas.getBoundingClientRect(),
        w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      if (w !== lastWidth || h !== lastHeight) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        lastWidth = w;
        lastHeight = h;
      }
      renderer.clear();
      if (mode !== 'beside' || !loaded) return;
      // Nearby carrier only. Once distant, no invented remotely lensed spacecraft image is drawn.
      carrier.visible = separationM < 80;
      carrier.position.z = capsule.position.z + separationM;
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach(cleanupMaterial);
      renderer.dispose();
    },
  };
}
