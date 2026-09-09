import * as THREE from 'three';
import { createCockpit } from './cockpit';
import { newCabinDynamics, stepCabin } from './cabin-dynamics';
import { panelAngles, type Navigation } from './navigation';
import type { SkyLight } from './sky-light';
import type { Perspective } from './probe';
export type PhysicalFrame = {
  dt: number;
  elapsed: number;
  clock: number;
  radius: number;
  navigation?: Navigation;
  light?: SkyLight;
  reset: number;
  separation: number;
  look?: number[];
};
export function createPhysicalScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  capsule: THREE.Group,
  carrier: THREE.Group,
  key: THREE.DirectionalLight,
  fill: THREE.DirectionalLight,
  ambient: THREE.AmbientLight,
) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const cockpit = createCockpit();
  root.add(cockpit.root);
  const lightProbe = new THREE.LightProbe();
  scene.add(lightProbe);
  const consoleLight = new THREE.PointLight(0xadbcad, 0.1, 3, 2);
  consoleLight.position.set(0, -0.5, -1.1);
  cockpit.root.add(consoleLight);
  const geometry = new THREE.BoxGeometry(2.8, 0.12, 1.7);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x817c6d,
    roughness: 0.5,
    metalness: 0.65,
  });
  const debris = new THREE.InstancedMesh(geometry, mat, 6);
  debris.frustumCulled = false;
  root.add(debris);
  const fragmentGeo = new THREE.BoxGeometry(0.14, 0.018, 0.22);
  const fragments = new THREE.InstancedMesh(fragmentGeo, mat, 72);
  fragments.frustumCulled = false;
  root.add(fragments);
  const body = new THREE.Quaternion(),
    dummy = new THREE.Object3D(),
    m3 = new THREE.Matrix3();
  const particles = Array.from({ length: 72 }, () => ({
    born: -100,
    origin: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  }));
  let dynamics = newCabinDynamics(),
    lastReset = -1,
    lastImpact = 0,
    current: PhysicalFrame | undefined;
  let normalScale = 1;
  const targetColor = new THREE.Color(),
    v = new THREE.Vector3();
  function prepare(mode: Perspective, frame: PhysicalFrame) {
    current = frame;
    if (frame.reset !== lastReset) {
      dynamics = newCabinDynamics();
      lastImpact = 0;
      particles.forEach((p) => (p.born = -100));
      lastReset = frame.reset;
    }
    const nav = frame.navigation,
      roll = nav?.roll ?? 0,
      acceleration =
        nav && !nav.complete && !nav.failed ? nav.acceleration : [0, 0];
    // Rotate proper acceleration into the attached cabin's axes.
    const c = Math.cos(roll),
      s = Math.sin(roll),
      local = [
        c * acceleration[0] + s * acceleration[1],
        -s * acceleration[0] + c * acceleration[1],
      ];
    const impact = nav?.impact;
    stepCabin(
      dynamics,
      frame.dt,
      local,
      impact
        ? {
            ...impact,
            deltaVelocity: [
              c * impact.deltaVelocity[0] + s * impact.deltaVelocity[1],
              -s * impact.deltaVelocity[0] + c * impact.deltaVelocity[1],
              impact.deltaVelocity[2],
            ],
          }
        : undefined,
    );
    body.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);
    const location = new THREE.Vector3(nav?.x ?? 0, nav?.y ?? 0, 0);
    cockpit.root.position.copy(location);
    cockpit.root.quaternion.copy(body);
    capsule.position.copy(location);
    capsule.quaternion
      .copy(body)
      .multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.4, -0.35)),
      );
    if (mode === 'onboard') {
      camera.position
        .set(dynamics.head[0], 0.1 + dynamics.head[1], 0.6)
        .applyQuaternion(body)
        .add(location);
      camera.quaternion
        .copy(body)
        .multiply(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              frame.look?.[1] ?? 0,
              frame.look?.[0] ?? 0,
              0,
              'YXZ',
            ),
          ),
        );
    } else {
      camera.position
        .copy(location)
        .add(
          new THREE.Vector3(
            mode === 'beside' ? 2.8 : 0,
            mode === 'beside' ? 1.6 : 0.1,
            mode === 'beside' ? 18 : 0.6,
          ),
        );
      camera.quaternion.identity();
    }
    m3.setFromMatrix4(
      new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion),
    );
    cockpit.update(
      frame.elapsed,
      frame.clock,
      frame.radius,
      nav?.fuel ?? 70,
      nav?.hull ?? 3,
      local,
      roll,
      dynamics.loose,
    );
    return m3.toArray();
  }
  function render(mode: Perspective, frame: PhysicalFrame, loaded: boolean) {
    root.visible = true;
    lightProbe.visible = true;
    cockpit.root.visible = mode === 'onboard';
    capsule.visible = mode === 'beside' && loaded;
    capsule.scale.setScalar(normalScale);
    const nav = frame.navigation;
    carrier.visible = frame.separation < 1e5 && mode !== 'optics';
    // Staged supported carrier; near-field coordinate separation only, not a solved escape orbit.
    carrier.position.set(-28, 14, -85 - Math.min(frame.separation, 1e7));
    carrier.rotation.set(0.2, -0.4, 0.12);
    ambient.intensity = 0.025;
    fill.intensity = 0.025;
    if (frame.light) {
      const blend = 1 - Math.exp(-Math.max(0, frame.dt) * 3);
      frame.light.coefficients.forEach((rgb, i) => {
        v.set(rgb[0], rgb[1], rgb[2]);
        lightProbe.sh.coefficients[i].lerp(v, blend);
      });
      const rgb = frame.light.color,
        max = Math.max(0.001, ...rgb);
      targetColor.setRGB(rgb[0] / max, rgb[1] / max, rgb[2] / max);
      key.color.lerp(targetColor, blend);
      key.intensity = THREE.MathUtils.lerp(
        key.intensity,
        Math.min(2, max * 0.15),
        blend,
      );
      v.set(
        ...(frame.light.direction as [number, number, number]),
      ).multiplyScalar(50);
      key.position.lerp(v, blend);
    }
    debris.visible =
      mode !== 'optics' && !!nav && nav.kind === 'exterior' && !nav.complete;
    nav?.obstacles.forEach((o, i) => {
      dummy.position.set(o.x, o.y, o.z);
      dummy.rotation.set(...panelAngles(i, nav.time));
      dummy.scale.setScalar(o.hit || o.z > 35 ? 0 : 1);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    });
    debris.instanceMatrix.needsUpdate = true;
    if (nav && nav.kind === 'exterior' && nav.impact.id !== lastImpact) {
      lastImpact = nav.impact.id;
      const offset = ((lastImpact - 1) % 3) * 24;
      for (let i = 0; i < 24; i++) {
        const p = particles[offset + i],
          a = i * 2.399963;
        p.born = frame.elapsed;
        p.origin.set(nav.x + nav.impact.x, nav.y + nav.impact.y, -2);
        // Secondary chips reuse geometry. Authored impact dispersion, no gravitational fire.
        p.velocity.set(
          Math.cos(a) * (1 + (i % 5)),
          Math.sin(a) * (1 + (i % 4)),
          3 + (i % 7),
        );
      }
    }
    particles.forEach((p, i) => {
      const age = frame.elapsed - p.born;
      dummy.position.copy(p.origin).addScaledVector(p.velocity, age);
      dummy.rotation.set(age * (0.5 + (i % 3)), i + age * 0.7, i * 0.7);
      dummy.scale.setScalar(age >= 0 && age < 8 ? 0.6 + (i % 4) * 0.3 : 0);
      dummy.updateMatrix();
      fragments.setMatrixAt(i, dummy.matrix);
    });
    fragments.instanceMatrix.needsUpdate = true;
    fragments.visible = mode !== 'optics';
  }
  return {
    prepare,
    render,
    normalizeAsset() {
      const size = new THREE.Box3()
        .setFromObject(capsule)
        .getSize(new THREE.Vector3());
      normalScale = 10 / Math.max(size.x, size.y, size.z);
    },
    hide() {
      root.visible = false;
      lightProbe.visible = false;
      capsule.scale.setScalar(1);
      key.intensity = 4.5;
      key.color.setHex(0xffdfaa);
      key.position.set(-5, 12, -15);
      fill.intensity = 0.9;
      ambient.intensity = 0.45;
    },
    get current() {
      return current;
    },
    dispose() {
      cockpit.dispose();
      geometry.dispose();
      fragmentGeo.dispose();
      mat.dispose();
      scene.remove(root, lightProbe);
    },
  };
}
