import * as THREE from 'three';
import { memoryTarget, type Navigation } from './navigation';
/** Pooled local game geometry. The lattice is an explicitly fictional representation. */
export function createEncounterScene(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  root.add(new THREE.AmbientLight(0xa29176, 2));
  const key = new THREE.DirectionalLight(0xffe4b7, 4);
  key.position.set(-20, 30, 10);
  root.add(key);
  const material = new THREE.MeshStandardMaterial({
    color: 0x776b58,
    metalness: 0.7,
    roughness: 0.6,
  });
  const geometry = new THREE.BoxGeometry(3, 1, 5);
  const debris = new THREE.InstancedMesh(geometry, material, 6);
  root.add(debris);
  const dummy = new THREE.Object3D();
  const lines = new THREE.BufferGeometry();
  const positions = new Float32Array(32 * 2 * 3 * 28);
  lines.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xcda76a,
    transparent: true,
    opacity: 0.45,
  });
  const lattice = new THREE.LineSegments(lines, lineMaterial);
  lattice.frustumCulled = false;
  root.add(lattice);
  const gate = new THREE.Group();
  root.add(gate);
  const gateMaterial = new THREE.MeshBasicMaterial({ color: 0xffedbf });
  const gateGeometry = new THREE.TorusGeometry(5, 0.05, 4, 64);
  const ring = new THREE.Mesh(gateGeometry, gateMaterial);
  gate.add(ring);
  const backMaterial = new THREE.MeshBasicMaterial({
    color: 0xedd9b5,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
  });
  const backGeometry = new THREE.CircleGeometry(5, 64);
  const back = new THREE.Mesh(backGeometry, backMaterial);
  gate.add(back);
  const memories: THREE.CanvasTexture[] = [];
  const memoryGeometry = new THREE.PlaneGeometry(14, 8);
  const memoryMaterials = Array.from(
    { length: 6 },
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xcfc3ab,
        transparent: true,
        opacity: 0.72,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
  );
  const memoryPanels = memoryMaterials.map((mat) => {
    const mesh = new THREE.InstancedMesh(memoryGeometry, mat, 6);
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  });
  const clearMemories = () => {
    memories.forEach((t) => t.dispose());
    memories.length = 0;
    memoryMaterials.forEach((m) => {
      m.map = null;
      m.needsUpdate = true;
    });
  };
  const localCamera = new THREE.PerspectiveCamera(
    (2 * Math.atan(0.38) * 180) / Math.PI,
    1,
    0.1,
    600,
  );
  return {
    clearMemories,
    remember(
      sky: HTMLCanvasElement,
      ship: HTMLCanvasElement,
      properSeconds: number,
    ) {
      if (memories.length >= 6) return;
      const image = document.createElement('canvas');
      image.width = 512;
      image.height = 288;
      const context = image.getContext('2d');
      if (!context) return;
      context.fillStyle = '#000';
      context.fillRect(0, 0, 512, 288);
      const scale = Math.min(512 / window.innerWidth, 288 / window.innerHeight);
      const ox = (512 - window.innerWidth * scale) / 2,
        oy = (288 - window.innerHeight * scale) / 2;
      for (const source of [sky, ship]) {
        const rect = source.getBoundingClientRect();
        context.drawImage(
          source,
          ox + rect.left * scale,
          oy + rect.top * scale,
          rect.width * scale,
          rect.height * scale,
        );
      }
      context.fillStyle = '#c2b79f';
      context.font = '10px monospace';
      context.fillText('τ ' + Math.floor(properSeconds) + ' s', 16, 272);
      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      memoryMaterials[memories.length].map = texture;
      memoryMaterials[memories.length].needsUpdate = true;
      memories.push(texture);
    },
    draw(
      renderer: THREE.WebGLRenderer,
      nav: Navigation,
      aspect: number,
      onboard: boolean,
    ) {
      root.visible = true;
      localCamera.aspect = aspect;
      localCamera.updateProjectionMatrix();
      localCamera.position.set(
        nav.x,
        nav.y + (onboard ? 0 : 10),
        onboard ? 0 : 95,
      );
      localCamera.lookAt(nav.x, nav.y, onboard ? -100 : 0);
      nav.obstacles.forEach((o, i) => {
        dummy.position.set(o.x, o.y, o.z);
        dummy.rotation.set(i * 0.7 + nav.time * 0.07, i * 0.2, nav.time * 0.04);
        dummy.scale.setScalar(o.hit || o.z > 30 ? 0 : 1);
        dummy.updateMatrix();
        debris.setMatrixAt(i, dummy.matrix);
      });
      debris.instanceMatrix.needsUpdate = true;
      debris.frustumCulled = false;
      lattice.visible = gate.visible = nav.kind === 'memory';
      memoryPanels.forEach((panel, i) => {
        panel.visible = nav.kind === 'memory' && i < memories.length;
      });
      if (nav.kind === 'memory') {
        // 16 vertices / 32 edges of a 4D hypercube projected to 3D, repeated along the passage.
        const angle = nav.time * 0.025,
          c = Math.cos(angle),
          s = Math.sin(angle);
        let k = 0;
        for (let layer = 0; layer < 28; layer++) {
          const vertex = (i: number) => {
            const x = i & 1 ? 1 : -1,
              y = i & 2 ? 1 : -1,
              z = i & 4 ? 1 : -1,
              w = i & 8 ? 1 : -1;
            const rx = c * x - s * w,
              rw = s * x + c * w,
              p = 2.2 / (2.8 - rw);
            return [
              rx * p * 16,
              y * p * 13,
              z * p * 12 - ((((layer * 20 - nav.time * 7) % 560) + 560) % 560),
            ];
          };
          for (let v = 0; v < 16; v++)
            for (let bit = 0; bit < 4; bit++)
              if (!(v & (1 << bit))) {
                for (const q of [vertex(v), vertex(v | (1 << bit))])
                  for (const value of q) positions[k++] = value;
              }
        }
        lines.attributes.position.needsUpdate = true;
        memoryPanels.forEach((panel, i) => {
          for (let j = 0; j < 6; j++) {
            dummy.position.set(
              j % 2 ? -18 : 18,
              j % 3 === 0 ? 9 : -7,
              -20 - ((((j * 80 + i * 23 - nav.time * 7) % 480) + 480) % 480),
            );
            dummy.rotation.set(0, j % 2 ? 0.35 : -0.35, 0);
            dummy.scale.setScalar(1);
            dummy.updateMatrix();
            panel.setMatrixAt(j, dummy.matrix);
          }
          panel.instanceMatrix.needsUpdate = true;
        });
        const target = memoryTarget(nav.gates);
        gate.position.set(
          target.x,
          target.y,
          -Math.max(1, (10 + nav.gates * 9 - nav.time) * 13),
        );
      }
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(root, localCamera);
      renderer.autoClear = true;
      root.visible = false;
    },
    dispose() {
      clearMemories();
      memoryGeometry.dispose();
      memoryMaterials.forEach((m) => m.dispose());
      scene.remove(root);
      geometry.dispose();
      material.dispose();
      lines.dispose();
      lineMaterial.dispose();
      gateGeometry.dispose();
      gateMaterial.dispose();
      backGeometry.dispose();
      backMaterial.dispose();
    },
  };
}
