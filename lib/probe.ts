import * as THREE from 'three';
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
  scene.add(vessels.probe, vessels.carrier);
  let width = 0,
    height = 0;
  return {
    render(mode: Perspective, separationM = 0) {
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
      vessels.probe.visible = !wide;
      vessels.probe.position.set(-1, -2, 0);
      vessels.probe.rotation.set(0.12, -0.5, -0.28);
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
      vessels.dispose();
      renderer.dispose();
    },
  };
}
