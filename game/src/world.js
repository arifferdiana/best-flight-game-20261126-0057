// The archipelago: dawn sky, turquoise sea, low-poly green islands with
// clinic huts and wooden docks, drifting clouds, golden route rings.
import * as THREE from 'three';

// Islands the game flies between. height is the cone peak above the sea;
// the hill's slope at distance d from the centre is height*(1-d/radius).
export const ISLANDS = [
  { name: 'Beranda', x: 0, z: 0, radius: 85, height: 34, home: true },
  { name: 'Karang', x: -350, z: -300, radius: 70, height: 28, clinic: true },
  { name: 'Bunga', x: 300, z: -450, radius: 75, height: 30, clinic: true },
  { name: 'Senja', x: -150, z: -700, radius: 65, height: 26, clinic: true },
  { name: 'Batu', x: 450, z: 120, radius: 45, height: 18 },
  { name: 'Daun', x: -520, z: -120, radius: 50, height: 20 },
  { name: 'Pasir', x: 160, z: 280, radius: 40, height: 12 },
  { name: 'Lumba', x: -260, z: 380, radius: 55, height: 16 },
];

// Water landing zones: the dock of each island, out on the water.
export const DOCKS = {
  home: { x: 0, z: 108, heading: Math.PI },
  karang: { x: -262, z: -300, heading: -Math.PI / 2 },
  bunga: { x: 208, z: -450, heading: Math.PI / 2 },
  senja: { x: -150, z: -788, heading: 0 },
};

// The low gap between two rocks: fly through under 40 m for a bonus.
export const GAP = { x: 110, z: -140, radius: 14 };

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0.0, '#16224f');
  gradient.addColorStop(0.35, '#5b3f7d');
  gradient.addColorStop(0.62, '#c65f6e');
  gradient.addColorStop(0.8, '#ff9a5c');
  gradient.addColorStop(1.0, '#ffd9a0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1f8ea6';
  ctx.fillRect(0, 0, 256, 256);
  // Soft lighter streaks, like sun on small waves.
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 6 + Math.random() * 22;
    const h = 1.5 + Math.random() * 2.5;
    ctx.fillStyle = `rgba(255, 235, 190, ${0.03 + Math.random() * 0.09})`;
    ctx.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(6, 60, 80, ${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(x, y, 4 + Math.random() * 14, 1.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 28);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeTree(scale = 1) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x43a047, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 5, 6), trunkMat);
  trunk.position.y = 2.5;
  tree.add(trunk);
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(3.2, 7, 5), leafMat);
  c1.position.y = 6.4;
  c1.scale.y = 0.85;
  tree.add(c1);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(2.2, 7, 5), leafMat2);
  c2.position.set(1.4, 8.2, 0.6);
  tree.add(c2);
  tree.scale.setScalar(scale);
  return tree;
}

function makeClinicHut() {
  const hut = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e6 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc0392b, flatShading: true });
  const crossMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(11, 6, 8), wallMat);
  walls.position.y = 3;
  hut.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 4.5, 4), roofMat);
  roof.position.y = 8.2;
  roof.rotation.y = Math.PI / 4;
  hut.add(roof);
  // Red cross sign on the roof front.
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.3), crossMat);
  crossV.position.set(0, 6.4, 4.2);
  hut.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.3), crossMat);
  crossH.position.set(0, 6.4, 4.2);
  hut.add(crossH);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a3220 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.3), doorMat);
  door.position.set(0, 1.8, 4.1);
  hut.add(door);
  return hut;
}

function makeDock() {
  const dock = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8d6e4a });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x6b4f33 });
  const buoyMat = new THREE.MeshLambertMaterial({ color: 0xff7f2a, emissive: 0x903400 });
  // Planks out over the water, 26 m long.
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.6), i % 2 ? woodMat : woodDark);
    plank.position.set(0, 1.1, -11 + i * 2.8);
    dock.add(plank);
  }
  for (const [x, z] of [[-2, -10], [2, -10], [-2, 10], [2, 10], [-2, 0], [2, 0]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.6, 6), woodDark);
    post.position.set(x, 0.4, z);
    dock.add(post);
  }
  // Guide buoys at the dock mouth.
  for (const x of [-9, 9]) {
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), buoyMat);
    buoy.position.set(x, 0.7, 13);
    dock.add(buoy);
  }
  return dock;
}

function makeWindsock() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const sockMat = new THREE.MeshLambertMaterial({ color: 0xff8c1a, emissive: 0x803a00 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
  pole.position.y = 3.5;
  group.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 8), sockMat);
  sock.rotation.z = Math.PI / 2;
  sock.position.set(1.8, 6.6, 0);
  group.add(sock);
  return group;
}

/** A golden route ring, floating over the water. Pulses via userData. */
export function makeRing() {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshBasicMaterial({ color: 0xffc93c });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff9a1f, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 1.1, 10, 42), goldMat);
  group.add(ring);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(12, 2.6, 10, 42), glowMat);
  group.add(glow);
  const buoyMat = new THREE.MeshLambertMaterial({ color: 0xff7f2a, emissive: 0x903400 });
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), buoyMat);
  buoy.position.y = 0.7;
  group.add(buoy);
  group.userData.buoy = buoy;
  group.userData.pulse = Math.random() * Math.PI * 2;
  return group;
}

function makeIsland(def) {
  const island = new THREE.Group();
  island.position.set(def.x, 0, def.z);
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xe8d29a, flatShading: true });
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x3d8b40, flatShading: true });
  const hillMat2 = new THREE.MeshLambertMaterial({ color: 0x2f7a33, flatShading: true });
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(def.radius * 0.92, def.radius, 5, 18), sandMat);
  sand.position.y = 0.5;
  island.add(sand);
  const hill = new THREE.Mesh(new THREE.ConeGeometry(def.radius * 0.62, def.height, 9), hillMat);
  hill.position.y = 3 + def.height / 2;
  island.add(hill);
  const hill2 = new THREE.Mesh(new THREE.ConeGeometry(def.radius * 0.38, def.height * 0.6, 8), hillMat2);
  hill2.position.set(def.radius * 0.3, 3 + def.height * 0.3, -def.radius * 0.25);
  island.add(hill2);
  // Trees around the shore, never on the peak.
  const treeCount = Math.max(4, Math.floor(def.radius / 9));
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + def.x * 0.01;
    const r = def.radius * (0.55 + ((i * 37) % 10) / 40);
    const tree = makeTree(0.9 + ((i * 53) % 10) / 18);
    tree.position.set(Math.cos(angle) * r, 2.5, Math.sin(angle) * r);
    island.add(tree);
  }
  if (def.clinic) {
    const hut = makeClinicHut();
    hut.position.set(def.radius * 0.32, 2.5, def.radius * 0.28);
    hut.rotation.y = -0.6;
    island.add(hut);
    const sock = makeWindsock();
    sock.position.set(def.radius * 0.55, 2.5, -def.radius * 0.3);
    island.add(sock);
  }
  if (def.home) {
    const sock = makeWindsock();
    sock.position.set(def.radius * 0.5, 2.5, def.radius * 0.4);
    island.add(sock);
    // A couple of beach huts at home base.
    for (const [x, z] of [[-28, 34], [30, 30]]) {
      const hut = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6),
        new THREE.MeshLambertMaterial({ color: 0xf0e2c8 }));
      walls.position.y = 2.25;
      hut.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3.4, 4),
        new THREE.MeshLambertMaterial({ color: 0x8a5a2b, flatShading: true }));
      roof.position.y = 6.1;
      roof.rotation.y = Math.PI / 4;
      hut.add(roof);
      hut.position.set(x, 2.5, z);
      island.add(hut);
    }
  }
  return island;
}

function makeClouds(scene) {
  const clouds = [];
  // Unlit: dawn clouds stay bright cream against the purple sky.
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2e0, transparent: true, opacity: 0.85 });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0xffd9c0, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 15; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + (i % 3);
    for (let j = 0; j < puffs; j++) {
      const r = 9 + ((i * 7 + j * 13) % 12);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), j % 2 ? mat : mat2);
      puff.position.set(j * 11 - puffs * 5, (j % 2) * 3, ((j * 5) % 9) - 4);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(-1100 + ((i * 173) % 2200), 120 + ((i * 41) % 90), -1100 + ((i * 271) % 2200));
    cloud.userData.speed = 1.2 + (i % 4) * 0.5;
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

export function createWorld(scene) {
  scene.fog = new THREE.Fog(0xf2a06e, 500, 2400);

  // Dawn sky dome.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Low dawn sun: a glowing disc plus warm directional light.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(70, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
  );
  sun.position.set(-1500, 150, -1900);
  sun.lookAt(0, 150, 0);
  scene.add(sun);
  const sunLight = new THREE.DirectionalLight(0xffb36b, 1.9);
  sunLight.position.set(-600, 220, -800);
  scene.add(sunLight);
  const hemi = new THREE.HemisphereLight(0x9fc0e0, 0x1a5a6a, 0.85);
  scene.add(hemi);

  // Turquoise sea.
  const seaTex = seaTexture();
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(5200, 5200),
    new THREE.MeshLambertMaterial({ map: seaTex, color: 0xffffff }),
  );
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  for (const def of ISLANDS) scene.add(makeIsland(def));

  // Docks: rotated so the planks point out to sea from the shore.
  const dockAngles = { home: 0, karang: Math.PI / 2, bunga: -Math.PI / 2, senja: Math.PI };
  const dockPositions = { home: [0, 88], karang: [-282, -300], bunga: [222, -450], senja: [-150, -768] };
  for (const [key, [x, z]] of Object.entries(dockPositions)) {
    const dock = makeDock();
    dock.position.set(x, 0, z);
    dock.rotation.y = dockAngles[key];
    scene.add(dock);
  }

  // The gap: two grey rocks to thread between, low over the water.
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6b7280, flatShading: true });
  for (const dx of [-16, 16]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(9, 0), rockMat);
    rock.position.set(GAP.x + dx, 6, GAP.z);
    rock.scale.y = 1.6;
    scene.add(rock);
  }

  const clouds = makeClouds(scene);

  return {
    seaTexture: seaTex,
    clouds,
    update(dt, elapsed) {
      seaTex.offset.x = (elapsed * 0.004) % 1;
      seaTex.offset.y = (elapsed * 0.0025) % 1;
      for (const cloud of clouds) {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 1200) cloud.position.x = -1200;
      }
    },
  };
}
