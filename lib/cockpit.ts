import * as THREE from 'three';
/** Near-field cockpit in metres. Original geometry, no static foreground image. */
export function createCockpit() {
  const root = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({
    color: 0x131a1c,
    metalness: 0.45,
    roughness: 0.65,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: 0x777b75,
    metalness: 0.18,
    roughness: 0.7,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x555951,
    metalness: 0.75,
    roughness: 0.33,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x050708,
    roughness: 0.95,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: 0x86857a,
    roughness: 0.95,
  });
  const glow = new THREE.MeshBasicMaterial({ color: 0xcdbb87 });
  const geo: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [dark, paint, metal, rubber, cloth, glow];
  function box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) {
    const g = new THREE.BoxGeometry(w, h, d);
    geo.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function rod(
    a: number[],
    b: number[],
    radius: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start);
    const g = new THREE.CylinderGeometry(radius, radius, delta.length(), 8);
    geo.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    parent.add(mesh);
    return mesh;
  }
  // A broad unobstructed window, framed by load-bearing members and layered seals.
  const corners = [
    [-1.7, -0.72, -2.35],
    [-1.08, 1.03, -2.35],
    [1.08, 1.03, -2.35],
    [1.7, -0.72, -2.35],
  ];
  for (let i = 0; i < 4; i++) {
    rod(corners[i], corners[(i + 1) % 4], 0.075, paint);
    const a = corners[i].map((v, j) => (j === 2 ? v + 0.025 : v * 0.967)),
      b = corners[(i + 1) % 4].map((v, j) => (j === 2 ? v + 0.025 : v * 0.967));
    rod(a, b, 0.021, rubber);
    rod(
      corners[i].map((v, j) => (j === 2 ? v + 0.16 : v * 1.1)),
      corners[(i + 1) % 4].map((v, j) => (j === 2 ? v + 0.16 : v * 1.1)),
      0.025,
      metal,
    );
  }
  box(4, 0.46, 0.9, dark, 0, 1.35, -2.1);
  for (const side of [-1, 1]) {
    const wall = box(0.58, 2.2, 2.5, dark, side * 1.87, 0, -1.4);
    wall.rotation.z = side * 0.13;
    rod([side * 1.65, -0.65, -2.22], [side * 1.75, -0.4, 0.2], 0.035, metal);
    // Cable conduits, service strips, and fasteners supply stable nearby scale cues.
    for (let i = 0; i < 3; i++)
      rod(
        [side * (1.64 + i * 0.055), -0.52, -2.1],
        [side * (1.5 + i * 0.055), 0.9, -2.05],
        0.009,
        rubber,
      );
    for (let i = 0; i < 9; i++)
      box(
        0.018,
        0.018,
        0.018,
        metal,
        side * (1.68 - i * 0.061),
        -0.63 + i * 0.185,
        -2.245,
      );
  }
  const consoleRoot = new THREE.Group();
  root.add(consoleRoot);
  consoleRoot.position.set(0, -0.68, -2.1);
  consoleRoot.rotation.x = -0.24;
  box(3.6, 0.68, 0.43, dark, 0, 0, 0, consoleRoot);
  box(3.64, 0.028, 0.51, metal, 0, 0.34, 0, consoleRoot);
  box(3.64, 0.028, 0.51, metal, 0, -0.34, 0, consoleRoot);
  // Only functional flight instruments; one reused canvas upload at 5 Hz.
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = 1024;
  displayCanvas.height = 256;
  const ctx = displayCanvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(displayCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const displayMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  mats.push(displayMat);
  const displayGeo = new THREE.PlaneGeometry(1.68, 0.42);
  geo.push(displayGeo);
  const display = new THREE.Mesh(displayGeo, displayMat);
  display.position.set(0, 0.035, 0.225);
  consoleRoot.add(display);
  const stick = new THREE.Group();
  stick.position.set(0.57, -0.74, -1.36);
  root.add(stick);
  rod([0, 0, 0], [0, 0.3, -0.07], 0.027, rubber, stick);
  box(0.12, 0.065, 0.07, dark, 0, 0.31, -0.07, stick);
  box(0.014, 0.014, 0.008, glow, 0, 0.34, -0.032, stick);
  for (const side of [-1, 1]) {
    for (let col = 0; col < 4; col++)
      for (let row = 0; row < 3; row++) {
        const x = side * (1 + col * 0.12),
          y = 0.17 - row * 0.13;
        box(0.06, 0.075, 0.018, rubber, x, y, 0.23, consoleRoot);
        box(0.008, 0.036, 0.025, metal, x, y, 0.25, consoleRoot);
        if (row === 0)
          box(0.02, 0.009, 0.004, glow, x, y + 0.048, 0.246, consoleRoot);
      }
    // Seated pilot: rounded sleeves, knees, gloves and harness. No simulated biological injury.
    const kneeGeo = new THREE.SphereGeometry(0.24, 20, 12);
    geo.push(kneeGeo);
    const knee = new THREE.Mesh(kneeGeo, cloth);
    knee.scale.set(0.8, 1, 1.8);
    knee.position.set(side * 0.34, -1.18, -0.28);
    root.add(knee);
  }
  const hands: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hand = new THREE.Group();
    hand.position.set(side * 0.57, -0.5, -1.35);
    root.add(hand);
    hands.push(hand);
    rod([side * 0.1, -0.55, 0.4], [0, -0.06, 0.03], 0.09, cloth, hand);
    const palmGeo = new THREE.SphereGeometry(0.083, 16, 10);
    geo.push(palmGeo);
    const palm = new THREE.Mesh(palmGeo, cloth);
    palm.scale.set(0.8, 1.1, 0.58);
    hand.add(palm);
    for (let i = 0; i < 4; i++)
      rod(
        [-0.042 + i * 0.027, -0.005, -0.018],
        [-0.041 + i * 0.027, 0.09, -0.024],
        0.014,
        cloth,
        hand,
      );
    rod(
      [side * 0.055, -0.04, 0],
      [side * 0.09, 0.024, -0.01],
      0.022,
      rubber,
      hand,
    );
    rod([-0.08, -0.12, 0], [0.08, -0.12, 0], 0.015, rubber, hand);
  }
  // A tethered washer demonstrates local acceleration without fictitious gravity pull.
  const looseGeo = new THREE.TorusGeometry(0.027, 0.007, 8, 20);
  geo.push(looseGeo);
  const loose = new THREE.Mesh(looseGeo, metal);
  loose.position.set(-0.62, -0.03, -1.08);
  root.add(loose);
  const tetherGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.78, 0.7, -1.3),
    loose.position,
  ]);
  geo.push(tetherGeo);
  const tetherMat = new THREE.LineBasicMaterial({
    color: 0x807d6c,
    transparent: true,
    opacity: 0.5,
  });
  mats.push(tetherMat);
  const tether = new THREE.Line(tetherGeo, tetherMat);
  root.add(tether);
  let lastDisplay = -Infinity;
  return {
    root,
    hands,
    stick,
    loose,
    update(
      time: number,
      clock: number,
      radius: number,
      fuel: number,
      hull: number,
      thrust: number[],
      roll: number,
      loosePosition: number[],
    ) {
      loose.position.set(
        -0.62 + loosePosition[0],
        -0.03 + loosePosition[1],
        -1.08,
      );
      loose.rotation.set(0, 0.3, roll);
      const attribute = tetherGeo.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      attribute.setXYZ(1, loose.position.x, loose.position.y, loose.position.z);
      attribute.needsUpdate = true;
      stick.rotation.z = -thrust[0] * 0.07;
      stick.rotation.x = thrust[1] * 0.05;
      hands[1].rotation.z = stick.rotation.z;
      hands[1].rotation.x = stick.rotation.x;
      if (time - lastDisplay < 0.2) return;
      lastDisplay = time;
      ctx.fillStyle = '#060c0d';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#3d514b';
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 9, 1006, 238);
      ctx.fillStyle = '#aab9a1';
      ctx.font = '18px monospace';
      ctx.fillText('VESPER  /  LOCAL FRAME', 35, 45);
      ctx.fillText('RCS', 715, 45);
      ctx.font = '42px monospace';
      ctx.fillStyle = '#e0cf9c';
      const seconds = Math.floor(clock);
      ctx.fillText(
        [
          Math.floor(seconds / 3600),
          Math.floor(seconds / 60) % 60,
          seconds % 60,
        ]
          .map((v) => String(v).padStart(2, '0'))
          .join(':'),
        35,
        111,
      );
      ctx.font = '22px monospace';
      ctx.fillStyle = '#9ba99e';
      ctx.fillText(radius.toFixed(2) + ' M', 35, 157);
      ctx.fillText(fuel.toFixed(1) + ' m/s', 35, 205);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < hull ? '#9da888' : '#5a1f12';
        ctx.fillRect(318 + i * 35, 189, 23, 10);
      }
      ctx.strokeStyle = '#6a7c6f';
      ctx.beginPath();
      ctx.arc(542, 126, 74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(542, 126);
      ctx.rotate(-roll);
      ctx.strokeStyle = '#dbc492';
      ctx.beginPath();
      ctx.moveTo(-63, 0);
      ctx.lineTo(-13, 0);
      ctx.moveTo(13, 0);
      ctx.lineTo(63, 0);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = '#22332e';
        ctx.fillRect(716, 84 + i * 56, 237, 14);
        ctx.fillStyle = '#cdb67d';
        ctx.fillRect(834, 84 + i * 56, thrust[i] * 65, 14);
      }
      ctx.font = '18px monospace';
      ctx.fillStyle = '#aab9a1';
      ctx.fillText('Q / E   ROLL', 716, 210);
      texture.needsUpdate = true;
    },
    dispose() {
      geo.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texture.dispose();
    },
  };
}
