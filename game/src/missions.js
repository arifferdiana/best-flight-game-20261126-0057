// The medicine run: three deliveries, each a chain of golden rings from
// the last dock to the next clinic, scored with time, smoothness and
// low-flying bonuses. Risk pays: thread the rock gap low for +250.
import * as THREE from 'three';
import { makeRing, DOCKS, GAP } from './world.js';
import { WATER_Y } from './plane.js';

const MISSIONS = [
  { island: 'Karang', dock: DOCKS.karang },
  { island: 'Bunga', dock: DOCKS.bunga },
  { island: 'Senja', dock: DOCKS.senja },
];

const PAR_SECONDS = 100;
const RING_SCORE = 100;
const DELIVERY_SCORE = 500;
const SMOOTH_LANDING_SCORE = 150;
const GAP_SCORE = 250;
const LOW_FLIGHT_PER_SECOND = 10;

export class MissionDirector {
  constructor(scene) {
    this.scene = scene;
    this.ringMeshes = [];
    this.ringPositions = [];
    this.ringsPassed = 0;
    this.missionIndex = 0;
    this.elapsed = 0;
    this.score = 0;
    this.deliveries = 0;
    this.gapClaimed = false;
    this.lowAccumulator = 0;
    this.lastLandingSmooth = true;
    this.events = [];
    this.fromDock = DOCKS.home;
  }

  get current() {
    return MISSIONS[this.missionIndex];
  }

  get isComplete() {
    return this.missionIndex >= MISSIONS.length;
  }

  get nextRing() {
    return this.ringPositions[this.ringsPassed] ?? null;
  }

  startRun() {
    this.score = 0;
    this.deliveries = 0;
    this.missionIndex = 0;
    this.fromDock = DOCKS.home;
    this.setupMission();
  }

  setupMission() {
    this.clearRings();
    this.ringsPassed = 0;
    this.elapsed = 0;
    this.gapClaimed = false;
    this.lowAccumulator = 0;
    const target = this.current.dock;
    const dx = target.x - this.fromDock.x;
    const dz = target.z - this.fromDock.z;
    const length = Math.hypot(dx, dz);
    const px = dz / length;
    const pz = -dx / length;
    const fractions = [0.3, 0.55, 0.8];
    const offsets = [46, -52, 40];
    const altitudes = [48, 68, 55];
    fractions.forEach((f, i) => {
      const x = this.fromDock.x + dx * f + px * offsets[i];
      const z = this.fromDock.z + dz * f + pz * offsets[i];
      const y = altitudes[i];
      const mesh = makeRing();
      mesh.position.set(x, y, z);
      mesh.userData.buoy.position.y = 0.7 - y;
      this.scene.add(mesh);
      this.ringMeshes.push(mesh);
      this.ringPositions.push(new THREE.Vector3(x, y, z));
    });
    this.events.push({ type: 'mission', island: this.current.island });
  }

  clearRings() {
    for (const mesh of this.ringMeshes) this.scene.remove(mesh);
    this.ringMeshes = [];
    this.ringPositions = [];
  }

  /** Called by the flight model when the floats touch water. */
  noteLanding(impactSpeed) {
    this.lastLandingSmooth = impactSpeed < 2.5;
  }

  update(dt, plane) {
    if (this.isComplete) return;
    this.elapsed += dt;

    // Rings: fly through the next one.
    const ring = this.nextRing;
    if (ring && plane.airborne) {
      const d = plane.pos.distanceTo(ring);
      if (d < 14) {
        this.ringsPassed += 1;
        this.score += RING_SCORE;
        this.events.push({ type: 'ring', n: this.ringsPassed, total: this.ringPositions.length });
      }
    }

    // The rock gap: thread it below 40 m, once per mission.
    if (!this.gapClaimed && plane.airborne && plane.pos.y < 40) {
      const d = Math.hypot(plane.pos.x - GAP.x, plane.pos.z - GAP.z);
      if (d < GAP.radius) {
        this.gapClaimed = true;
        this.score += GAP_SCORE;
        this.events.push({ type: 'gap' });
      }
    }

    // Low and fast over the water pays a trickle.
    if (plane.airborne && plane.pos.y - WATER_Y < 25 && plane.speed > 25) {
      this.lowAccumulator += dt;
      if (this.lowAccumulator >= 1) {
        this.lowAccumulator -= 1;
        this.score += LOW_FLIGHT_PER_SECOND;
        this.events.push({ type: 'low' });
      }
    } else {
      this.lowAccumulator = 0;
    }

    // Delivery: on the water, slow, inside the dock zone.
    const target = this.current.dock;
    const dockDistance = Math.hypot(plane.pos.x - target.x, plane.pos.z - target.z);
    if (!plane.airborne && dockDistance < 26 && plane.speed < 8) {
      const timeBonus = Math.min(200, Math.max(0, Math.round((PAR_SECONDS - this.elapsed) * 2)));
      let gained = DELIVERY_SCORE + timeBonus;
      let smooth = 0;
      if (this.lastLandingSmooth) {
        smooth = SMOOTH_LANDING_SCORE;
        gained += smooth;
      }
      this.score += gained;
      this.deliveries += 1;
      this.events.push({
        type: 'delivered', island: this.current.island, gained, timeBonus, smooth,
      });
      this.fromDock = target;
      this.missionIndex += 1;
      if (!this.isComplete) {
        this.setupMission();
      } else {
        this.clearRings();
      }
    }
  }

  /** Pulse the next ring so it reads as the target. */
  animate(elapsed) {
    this.ringMeshes.forEach((mesh, i) => {
      const active = i === this.ringsPassed;
      const scale = active
        ? 1 + Math.sin(elapsed * 3 + mesh.userData.pulse) * 0.07
        : 0.96;
      mesh.scale.setScalar(scale);
      mesh.rotation.y = elapsed * (active ? 0.5 : 0.12);
    });
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }
}
