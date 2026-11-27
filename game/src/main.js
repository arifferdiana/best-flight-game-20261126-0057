// Nusa Seaplane — Island Medicine Run. Bootstrap, game loop, chase
// camera, state machine (menu → flying → complete / crashed / stranded)
// and the window.NUSA test hook used for screenshots and play-tests.
import * as THREE from 'three';
import { createWorld, DOCKS, ISLANDS } from './world.js';
import { Seaplane, WATER_Y } from './plane.js';
import { MissionDirector } from './missions.js';
import { Hud } from './hud.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';

const HOME = DOCKS.home;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-root').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 6000);

const world = createWorld(scene);
const plane = new Seaplane(scene);
const missions = new MissionDirector(scene);
const hud = new Hud();
const audio = new AudioEngine();
const input = new Input();

let state = 'menu'; // menu | flying | paused | complete | crashed | stranded
let runElapsed = 0;
let ringsTotal = 0;
let gapsTotal = 0;
let menuAngle = 0;

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  for (const name of ['menu', 'end', 'pause']) $(name).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}

function endGame(kind, title, text) {
  state = kind;
  audio.silence();
  hud.hide();
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  const minutes = Math.floor(runElapsed / 60);
  const seconds = Math.floor(runElapsed % 60).toString().padStart(2, '0');
  $('end-stats').innerHTML =
    `<div>Score <b>${missions.score}</b></div>` +
    `<div>Deliveries <b>${missions.deliveries} / 3</b></div>` +
    `<div>Rings flown <b>${ringsTotal}</b></div>` +
    `<div>Rock gaps threaded <b>${gapsTotal}</b></div>` +
    `<div>Flight time <b>${minutes}:${seconds}</b></div>` +
    `<div>Fuel left <b>${Math.round(plane.fuel)}%</b></div>` +
    `<div>Hull damage <b>${Math.round(plane.damage)}%</b></div>`;
  showScreen('end');
}

function startRun() {
  audio.ensure();
  missions.startRun();
  plane.reset(HOME.x, HOME.z, HOME.heading);
  plane.fuel = 100;
  plane.damage = 0;
  runElapsed = 0;
  ringsTotal = 0;
  gapsTotal = 0;
  state = 'flying';
  showScreen(null);
  hud.show();
  hud.showBanner(`DELIVERY 1 — PULAU ${missions.current.island.toUpperCase()}`, 2600);
  hud.setMessage('Full throttle (W), then pull up (↑) to take off');
}

function handleMissionEvent(event) {
  if (event.type === 'ring') {
    ringsTotal += 1;
    audio.blip();
    hud.setMessage(`RING ${event.n}/${event.total} — +100  ·  next ring ahead`);
  } else if (event.type === 'gap') {
    gapsTotal += 1;
    hud.showBanner('ROCK GAP! +250', 1800);
    audio.chime();
  } else if (event.type === 'low') {
    hud.setMessage('LOW & FAST +10/s — keep it under 25 m!');
  } else if (event.type === 'mission') {
    // No banner here: startRun already announces delivery 1, and after a
    // delivery the DELIVERED banner (shown just before this event in the
    // same frame) must not be overwritten by a second one.
  } else if (event.type === 'delivered') {
    audio.chime();
    plane.fuel = 100;
    plane.damage = Math.max(0, plane.damage - 20);
    const parts = [`DELIVERED TO PULAU ${event.island.toUpperCase()}! +${event.gained}`];
    if (event.smooth > 0) parts.push(`silky landing +${event.smooth}`);
    hud.showBanner(parts.join('  ·  '), 4000);
    if (missions.isComplete) {
      endGame(
        'complete',
        'MISSION COMPLETE',
        'All three clinics have their medicine. The islands thank you — and so do the pilots who fly after you.',
      );
    }
  }
}

function guidanceMessage() {
  if (plane.fuel < 25 && plane.fuel > 0) return 'LOW FUEL — finish this delivery and refuel at the dock';
  if (!plane.airborne && plane.speed < 2) return 'Full throttle (W), then pull up (↑) to take off';
  const ring = missions.nextRing;
  if (ring) {
    const d = Math.round(plane.pos.distanceTo(ring));
    return `RING ${missions.ringsPassed + 1}/3 — ${d} M  ·  Pulau ${missions.current.island}`;
  }
  return `LAND AT THE DOCK — Pulau ${missions.current.island}  ·  slow under 8 m/s`;
}

function updateFlying(dt) {
  runElapsed += dt;

  if (input.wasPressed('KeyP')) {
    state = 'paused';
    audio.silence();
    showScreen('pause');
    return;
  }
  if (input.wasPressed('KeyM')) {
    audio.setMuted(!audio.muted);
    hud.setMessage(audio.muted ? 'Sound off (M to turn back on)' : 'Sound on');
  }
  if (input.wasPressed('KeyR') && plane.fuel > 0) {
    const dock = missions.fromDock;
    plane.reset(dock.x, dock.z, dock.heading);
    hud.setMessage('Back at the last dock — throttle up and go again');
    return;
  }

  const event = plane.update(dt, input, ISLANDS);
  if (event === 'takeoff') {
    audio.splash();
    hud.setMessage('Airborne! Follow the golden rings');
  } else if (event === 'touchdown') {
    audio.splash();
    missions.noteLanding(plane.lastImpact);
  } else if (event === 'hard') {
    audio.thud();
    missions.noteLanding(plane.lastImpact);
    hud.showBanner(`HARD LANDING! +25 DAMAGE`, 2000);
  } else if (event === 'crash') {
    audio.thud();
    endGame(
      'crashed',
      'CRASHED',
      'The hull could not take that one. The clinics are still waiting — fly again, and give the islands a little more room.',
    );
    return;
  }

  missions.update(dt, plane);
  for (const missionEvent of missions.drainEvents()) handleMissionEvent(missionEvent);
  if (state !== 'flying') return;

  // Stranded: out of fuel on the water, nowhere near a dock.
  if (plane.fuel <= 0 && !plane.airborne && plane.speed < 1) {
    const dock = missions.current.dock;
    const d = Math.hypot(plane.pos.x - dock.x, plane.pos.z - dock.z);
    if (d > 30) {
      endGame(
        'stranded',
        'OUT OF FUEL',
        'The tank is dry and the nearest dock is too far to drift to. A fishing boat tows you home — the medicine will have to wait for the next run.',
      );
      return;
    }
  }

  audio.update(plane.throttle, plane.speed, plane.airborne);
  hud.update({
    alt: plane.altitudeFeet,
    spd: plane.knots,
    hdg: ((-plane.heading * 180) / Math.PI % 360 + 360) % 360,
    vs: plane.verticalSpeedFpm,
    score: missions.score,
    deliveries: missions.deliveries,
    fuel: plane.fuel,
    damage: plane.damage,
    throttle: plane.throttle,
    pitch: plane.pitch,
    roll: plane.roll,
  });
  hud.setMessage(guidanceMessage());
}

function updateCamera(dt, elapsed) {
  if (state === 'menu') {
    menuAngle += dt * 0.05;
    const radius = 240;
    camera.position.set(
      Math.cos(menuAngle) * radius,
      72,
      Math.sin(menuAngle) * radius,
    );
    camera.lookAt(0, 12, 0);
    return;
  }
  // Chase view: behind and above the plane, eased, never fighting it.
  const forward = plane.forward;
  const desired = new THREE.Vector3(
    plane.pos.x - forward.x * 15,
    plane.pos.y + 5.5,
    plane.pos.z - forward.z * 15,
  );
  const k = 1 - Math.exp(-5 * dt);
  camera.position.lerp(desired, k);
  const look = new THREE.Vector3(
    plane.pos.x + forward.x * 22,
    plane.pos.y + 1.5,
    plane.pos.z + forward.z * 22,
  );
  camera.lookAt(look);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  world.update(dt, elapsed);
  missions.animate(elapsed);

  if (state === 'flying') {
    updateFlying(dt);
  } else if (state === 'paused') {
    if (input.wasPressed('KeyP')) {
      state = 'flying';
      showScreen(null);
    }
  } else if (state === 'menu') {
    if (input.wasPressed('Enter')) startRun();
  } else if (state === 'complete' || state === 'crashed' || state === 'stranded') {
    if (input.wasPressed('Enter')) startRun();
  }

  updateCamera(dt, elapsed);
  renderer.render(scene, camera);
  input.endFrame();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

$('btn-start').addEventListener('click', startRun);
$('btn-restart').addEventListener('click', startRun);
$('btn-resume').addEventListener('click', () => {
  state = 'flying';
  showScreen(null);
});

// Test hook: drives the game into real states for screenshots and
// headless play-tests. Not a cheat for players — it only exists so the
// maker can verify the game end to end.
window.NUSA = {
  version: '1.0.0',
  state: () => state,
  start: startRun,
  score: () => missions.score,
  deliveries: () => missions.deliveries,
  ringsPassed: () => missions.ringsPassed,
  nextRing: () => {
    const r = missions.nextRing;
    return r ? { x: r.x, y: r.y, z: r.z } : null;
  },
  rings: () => missions.ringPositions.map((r) => ({ x: r.x, y: r.y, z: r.z })),
  plane: () => ({
    x: plane.pos.x, y: plane.pos.y, z: plane.pos.z,
    speed: plane.speed, fuel: plane.fuel, damage: plane.damage,
    airborne: plane.airborne, throttle: plane.throttle,
  }),
  setThrottle: (v) => { plane.throttle = v; },
  setFuel: (v) => { plane.fuel = v; },
  teleport: (x, y, z, heading) => {
    plane.pos.set(x, y, z);
    if (heading !== undefined) plane.heading = heading;
    plane.speed = 0;
    plane.verticalSpeed = 0;
    plane.airborne = y > WATER_Y + 1;
  },
  flyTo: (x, y, z) => {
    plane.pos.set(x, y, z);
    plane.airborne = true;
    plane.speed = 35;
    plane.throttle = 0.7;
  },
  skipToDock: () => {
    missions.ringsPassed = missions.ringPositions.length;
    const dock = missions.current.dock;
    // Face the island so the dock and clinic show behind the plane.
    plane.reset(dock.x, dock.z, dock.heading + Math.PI);
    plane.fuel = 60;
  },
  snapCamera: () => {
    updateCamera(10, clock.elapsedTime);
  },
  finishNow: () => {
    missions.score = 2450;
    missions.deliveries = 3;
    missions.missionIndex = 3;
    endGame(
      'complete',
      'MISSION COMPLETE',
      'All three clinics have their medicine. The islands thank you — and so do the pilots who fly after you.',
    );
  },
};

plane.reset(HOME.x, HOME.z, HOME.heading);
showScreen('menu');
loop();
