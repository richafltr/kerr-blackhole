import { createPhysicalScene, type PhysicalFrame } from './physical-scene';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createVessels } from './vessels';
import { createEncounterScene } from './encounter-scene';
import type { Navigation } from './navigation';
export type CinematicFrame = {
  shot: 'title' | 'black' | 'scale' | 'carrier' | 'probe' | 'cabin';
  progress: number;
};
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
  const ambient = new THREE.AmbientLight(0xb9b4a1, 0.45);
  scene.add(ambient);
  const encounter = createEncounterScene(scene);
  const vessels = createVessels();
  scene.add(vessels.carrier);
  const capsule = new THREE.Group(),
    detail = new THREE.Group();
  capsule.add(detail);
  scene.add(capsule);
  const physical = createPhysicalScene(
    scene,
    camera,
    capsule,
    vessels.carrier,
    key,
    fill,
    ambient,
  );
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
      physical.normalizeAsset();
      loaded = true;
      if (disposed) disposeAsset();
    })
    .catch((error: unknown) => {
      assetError = error;
    });
  let width = 0,
    height = 0;
  return {
    prepare: physical.prepare,
    remember: (sky: HTMLCanvasElement, properSeconds: number) =>
      encounter.remember(sky, canvas, properSeconds),
    clearMemories: encounter.clearMemories,
    render(
      mode: Perspective,
      separationM = 0,
      cinematic?: CinematicFrame,
      navigation?: Navigation,
      physicalFrame?: PhysicalFrame,
    ) {
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
      if (
        !cinematic &&
        physicalFrame &&
        physicalFrame.navigation?.kind !== 'memory'
      ) {
        physical.render(mode, physicalFrame, loaded);
        renderer.render(scene, camera);
        return;
      }
      physical.hide();
      if (
        navigation?.kind === 'memory' ||
        (mode !== 'beside' && mode !== 'wide')
      ) {
        if (navigation)
          encounter.draw(renderer, navigation, camera.aspect, true);
        return;
      }
      const wide = mode === 'wide';
      camera.position.set(0, wide ? 0 : 10, wide ? 180 : 95);
      camera.lookAt(0, 0, 0);
      capsule.visible = !wide && loaded;
      capsule.position.set(0, 0, 0);
      capsule.rotation.set(0.2, -0.4, -0.35 + (navigation?.flash ?? 0) * 0.12);
      vessels.carrier.visible = wide || separationM < 1000;
      // Carrier is a local staging asset, not a second relativistic observer or escape worldline.
      vessels.carrier.position.set(
        wide ? -45 : 40,
        wide ? 170 : -100,
        wide ? -800 : -500 - Math.min(separationM, 1000),
      );
      vessels.carrier.rotation.set(0.24, -0.35, 0.3);
      if (cinematic) {
        const { shot, progress: p } = cinematic;
        if (shot === 'black' || shot === 'cabin') return;
        // Editorial staging of nearby meshes; this is not a simulated camera worldline.
        camera.position.set(0, 0, 180);
        camera.lookAt(0, 0, 0);
        capsule.visible = shot === 'probe' && loaded;
        vessels.carrier.visible = true;
        vessels.carrier.position.set(-200 + p * 7, 65 - p * 2, -850);
        vessels.carrier.rotation.set(0.28, -0.4, 0.3 + p * 0.04);
        if (shot === 'carrier') {
          vessels.carrier.position.set(-35 + p * 4, 4, -35 - p * 16);
          vessels.carrier.rotation.set(0.4, -0.5, 0.38 + p * 0.07);
        } else if (shot === 'probe') {
          camera.position.set(0, 3, 48 + p * 3);
          camera.lookAt(0, 0, 0);
          capsule.position.set(-8 + p * 0.8, -1, 0);
          capsule.rotation.set(0.2, -0.4 + p * 0.06, -0.35);
          vessels.carrier.position.set(-35, 85, -450);
        }
      }
      renderer.render(scene, camera);
      if (navigation)
        encounter.draw(renderer, navigation, camera.aspect, false);
    },
    dispose() {
      disposed = true;
      disposeAsset();
      physical.dispose();
      vessels.dispose();
      encounter.dispose();
      renderer.dispose();
    },
  };
}
