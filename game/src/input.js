// Keyboard input: one place that knows which keys are held.
// ArrowUp climbs, ArrowDown descends, arrows left/right bank and turn,
// W/S throttle, A/D rudder, Space water brake, R reset, P pause, M mute.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  /** True once for the frame after the key went down. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  /** -1..1 pitch input: +1 climbs. */
  pitch() {
    let value = 0;
    if (this.down('ArrowUp')) value += 1;
    if (this.down('ArrowDown')) value -= 1;
    return value;
  }

  /** -1..1 roll input: +1 banks right. */
  roll() {
    let value = 0;
    if (this.down('ArrowRight')) value += 1;
    if (this.down('ArrowLeft')) value -= 1;
    return value;
  }

  /** -1..1 rudder input: +1 yaws right. */
  rudder() {
    let value = 0;
    if (this.down('KeyD')) value += 1;
    if (this.down('KeyA')) value -= 1;
    return value;
  }

  throttleDelta() {
    let value = 0;
    if (this.down('KeyW')) value += 1;
    if (this.down('KeyS')) value -= 1;
    return value;
  }

  brake() {
    return this.down('Space');
  }
}
