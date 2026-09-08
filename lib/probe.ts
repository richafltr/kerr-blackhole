import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createVessels } from './vessels';
export type Perspective = 'onboard' | 'beside' | 'wide' | 'optics';
export function createProbeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(
      (2 * Math.atan(0.38) * 180) / Math.PI,
      1,
      0.1,
      2000,
    );
  const key = new THREE.DirectionalLight(0xffdfaa, 4.5);
  key.position.set(-5, 12, -15);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9d8de, 0.9);
  fill.position.set(8, 8, 20);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xb9b4a1, 0.45));
  const vessels = createVessels();
  scene.add(vessels.carrier);
  const capsule = new THREE.Group(),
    detail = new THREE.Group();
  capsule.add(detail);
  scene.add(capsule);
  const capsuleMaterials = new Set([
    'blinn11SG',
    'blinn14SG',
    'blinn4SG',
    'blinn13SG',
    'apollohorns_blin',
    'apollohorns_bli1',
  ]);
  const geometryResources = new Set<THREE.BufferGeometry>(),
    materialResources = new Set<THREE.Material>(),
    textureResources = new Set<THREE.Texture>();
  let disposed = false,
    loaded = false,
    assetError: unknown;
  const disposeAsset = () => {
    geometryResources.forEach((g) => g.dispose());
    textureResources.forEach((t) => t.dispose());
    materialResources.forEach((m) => m.dispose());
  };
  void new GLTFLoader()
    .loadAsync('/assets/apollo-soyuz.glb')
    .then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        geometryResources.add(node.geometry);
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        materials.forEach((material) => {
          materialResources.add(material);
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) textureResources.add(value);
          });
        });
        if (!materials.some((m) => capsuleMaterials.has(m.name))) return;
        const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
        geometryResources.add(geometry);
        detail.add(new THREE.Mesh(geometry, node.material));
      });
      detail.position
        .copy(
          new THREE.Box3().setFromObject(detail).getCenter(new THREE.Vector3()),
        )
        .multiplyScalar(-1);
      loaded = true;
      if (disposed) disposeAsset();
    })
    .catch((error: unknown) => {
      assetError = error;
    });
  let width = 0,
    height = 0;
  return {
    render(mode: Perspective, separationM = 0) {
      if (assetError)
        throw new Error(
          'Spacecraft asset could not be loaded. Reload to retry.',
        );
      if (renderer.getContext().isContextLost())
        throw new Error('Spacecraft GPU context was lost. Reload.');
      const rect = canvas.getBoundingClientRect(),
        w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      if (w !== width || h !== height) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        width = w;
        height = h;
      }
      renderer.clear();
      if (mode !== 'beside' && mode !== 'wide') return;
      const wide = mode === 'wide';
      camera.position.set(0, wide ? 0 : 10, wide ? 180 : 30);
      camera.lookAt(0, 0, 0);
      capsule.visible = !wide && loaded;
      capsule.position.set(-1, -1, 0);
      capsule.rotation.set(0.2, -0.4, -0.35);
      vessels.carrier.visible = wide || separationM < 1000;
      // Carrier is a local staging asset, not a second relativistic observer or escape worldline.
      vessels.carrier.position.set(
        wide ? -45 : 40,
        wide ? 170 : -100,
        wide ? -800 : -500 - Math.min(separationM, 1000),
      );
      vessels.carrier.rotation.set(0.24, -0.35, 0.3);
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      disposeAsset();
      vessels.dispose();
      renderer.dispose();
    },
  };
}
