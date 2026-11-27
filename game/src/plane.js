// The seaplane: built from primitives, and the arcade flight model that
// flies it — throttle, pitch, bank, rudder, water takeoffs and landings.
import * as THREE from 'three';

export const WATER_Y = 0.6; // float line when the plane sits on the sea
const TAKEOFF_SPEED = 24; // m/s
const MAX_SPEED = 58; // m/s at full throttle
const METERS_TO_FEET = 3.28084;
const MS_TO_KNOTS = 1.94384;

export function buildPlaneMesh() {
  const plane = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xf7f4ec });
  const teal = new THREE.MeshLambertMaterial({ color: 0x0e7c86 });
  const orange = new THREE.MeshLambertMaterial({ color: 0xff7f2a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x14324a });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c4d6e, emissive: 0x0a2a44 });

  // Fuselage: cylinder along Z, nose cone, tail taper.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.85, 6.4, 12), white);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.2;
  plane.add(fuselage);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), white);
  nose.position.z = 3.4;
  nose.scale.set(1, 1, 1.15);
  plane.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.55, 12), teal);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = 1.1;
  plane.add(stripe);
  // Cockpit windows, lit.
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.9), glass);
  windshield.position.set(0, 0.75, 2.5);
  windshield.rotation.x = -0.35;
  plane.add(windshield);
  for (const x of [-0.95, 0.95]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.6), glass);
    window.position.set(x, 0.55, 1.4);
    plane.add(window);
  }

  // Main wing + struts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.28, 2.1), white);
  wing.position.set(0, 1.15, 0.6);
  plane.add(wing);
  for (const x of [-5.5, 5.5]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.1), orange);
    tip.position.set(x, 1.15, 0.6);
    plane.add(tip);
  }
  for (const x of [-1.6, 1.6]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), dark);
    strut.position.set(x, 0.45, 0.6);
    strut.rotation.z = x > 0 ? 0.5 : -0.5;
    plane.add(strut);
  }

  // Tail: horizontal stabilizer + vertical fin.
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 1.1), white);
  tailplane.position.set(0, 0.55, -3.1);
  plane.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 1.4), teal);
  fin.position.set(0, 1.15, -3.1);
  fin.rotation.x = 0.25;
  plane.add(fin);

  // Floats on struts.
  for (const x of [-1.5, 1.5]) {
    const float = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 4.6, 10), orange);
    body.rotation.x = Math.PI / 2;
    float.add(body);
    const tipF = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6), orange);
    tipF.position.z = 2.3;
    float.add(tipF);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.9), dark);
    step.position.set(0, -0.35, 0.4);
    float.add(step);
    float.position.set(x, -1.25, 0.4);
    plane.add(float);
    for (const z of [-0.5, 1.2]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), dark);
      strut.position.set(x, -0.7, z);
      plane.add(strut);
    }
  }

  // Propeller: spinner + two blades, spins around Z.
  const prop = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 10), teal);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.4;
  prop.add(spinner);
  // One vertical blade box reads as a two-blade propeller.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.9, 0.08), dark);
  prop.add(blade);
  prop.position.set(0, 0, 4.55);
  plane.add(prop);

  // Nav lights: red left, green right, white tail — always lit.
  const lightMat = (color) => new THREE.MeshBasicMaterial({ color });
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), lightMat(0xff2a2a));
  navL.position.set(-5.7, 1.15, 0.6);
  plane.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), lightMat(0x2aff5a));
  navR.position.set(5.7, 1.15, 0.6);
  plane.add(navR);
  const navT = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), lightMat(0xffffff));
  navT.position.set(0, 0.6, -3.6);
  plane.add(navT);

  plane.userData.propeller = prop;
  return plane;
}

/** Arcade flight model for a floatplane. */
export class Seaplane {
  constructor(scene) {
    this.mesh = buildPlaneMesh();
    scene.add(this.mesh);
    this.reset(0, 108, Math.PI);
    this.fuel = 100;
    this.damage = 0;
    this.verticalSpeed = 0;
    this.lastImpact = 0;
  }

  /** Place the plane on the water at a dock, facing its heading. */
  reset(x, z, heading) {
    this.pos = new THREE.Vector3(x, WATER_Y, z);
    this.heading = heading;
    this.pitch = 0;
    this.roll = 0;
    this.speed = 0;
    this.throttle = 0;
    this.airborne = false;
    this.verticalSpeed = 0;
    this.syncMesh(0);
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
  }

  get knots() {
    return this.speed * MS_TO_KNOTS;
  }

  get altitudeFeet() {
    return Math.max(0, this.pos.y - WATER_Y) * METERS_TO_FEET;
  }

  get verticalSpeedFpm() {
    return this.verticalSpeed * METERS_TO_FEET * 60;
  }

  syncMesh(dt) {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.pitch, this.heading, this.roll, 'YXZ');
    const prop = this.mesh.userData.propeller;
    if (prop) prop.rotation.z -= dt * (4 + this.throttle * 26);
  }

  /**
   * One physics step. Returns an event string when something notable
   * happened: 'takeoff' | 'touchdown' | 'hard' | 'crash' | null.
   */
  update(dt, input, colliders) {
    const pitchIn = input.pitch();
    const rollIn = input.roll();
    const rudderIn = input.rudder();
    this.throttle = THREE.MathUtils.clamp(
      this.throttle + input.throttleDelta() * dt * 0.55, 0, 1,
    );
    if (input.brake() && !this.airborne) {
      this.speed = Math.max(0, this.speed - 26 * dt);
    }

    // Thrust vs drag: on water the floats drag hard, so full throttle
    // is needed to reach takeoff speed.
    let targetSpeed = this.throttle * MAX_SPEED;
    if (!this.airborne) targetSpeed *= 0.55;
    this.speed += (targetSpeed - this.speed) * Math.min(1, 0.55 * dt);

    if (this.airborne) {
      // Pitch: stick back climbs, stick forward descends; the plane
      // gently levels itself when the stick is centred.
      this.pitch = THREE.MathUtils.clamp(this.pitch + pitchIn * 0.85 * dt, -0.5, 0.62);
      if (pitchIn === 0) this.pitch *= Math.max(0, 1 - 0.55 * dt);
      // Roll: bank, and the bank turns the heading.
      this.roll = THREE.MathUtils.clamp(this.roll + rollIn * 1.7 * dt, -1.05, 1.05);
      if (rollIn === 0) this.roll *= Math.max(0, 1 - 0.9 * dt);
      this.heading -= this.roll * 0.62 * dt * (0.45 + this.speed / 60);
      this.heading -= rudderIn * 0.22 * dt;
      this.verticalSpeed = Math.sin(this.pitch) * this.speed;
      this.pos.y += this.verticalSpeed * dt;
    } else {
      // On the water: level, steer slowly with bank/rudder.
      this.pitch *= Math.max(0, 1 - 4 * dt);
      this.roll *= Math.max(0, 1 - 4 * dt);
      this.heading -= (rollIn * 0.35 + rudderIn * 0.3) * dt;
      this.verticalSpeed = 0;
      this.pos.y = WATER_Y;
      if (this.speed > TAKEOFF_SPEED && pitchIn > 0) {
        this.airborne = true;
        this.pitch = 0.12;
        return 'takeoff';
      }
    }

    // Move forward.
    const forward = this.forward;
    this.pos.x += forward.x * this.speed * dt;
    this.pos.z += forward.z * this.speed * dt;

    // Fuel: throttle burns it; empty means gliding only.
    if (this.throttle > 0) {
      this.fuel = Math.max(0, this.fuel - this.throttle * 0.85 * dt);
      if (this.fuel === 0) this.throttle = 0;
    }

    // Terrain collision: islands are cones; below the slope is a crash.
    if (this.airborne) {
      for (const island of colliders) {
        const dx = this.pos.x - island.x;
        const dz = this.pos.z - island.z;
        const d = Math.hypot(dx, dz);
        if (d < island.radius) {
          const slope = island.height * (1 - d / island.radius) + 2;
          if (this.pos.y < slope) {
            this.damage = 100;
            return 'crash';
          }
        }
      }
    }

    // Water contact.
    if (this.airborne && this.pos.y <= WATER_Y) {
      const impact = Math.abs(this.verticalSpeed);
      this.lastImpact = impact;
      this.pos.y = WATER_Y;
      this.verticalSpeed = 0;
      this.airborne = false;
      this.pitch = 0;
      this.roll = 0;
      if (impact > 5) {
        this.damage = Math.min(100, this.damage + 25);
        this.speed *= 0.4;
        if (this.damage >= 100) return 'crash';
        return 'hard';
      }
      return 'touchdown';
    }

    this.syncMesh(dt);
    return null;
  }
}
