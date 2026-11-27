// The lit instruments: altitude, speed, heading, vertical speed, fuel,
// damage, score, a scrolling compass strip and an attitude ball — all DOM
// and canvas, so they stay crisp over the 3D view.
export class Hud {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      alt: document.getElementById('hud-alt'),
      spd: document.getElementById('hud-spd'),
      hdg: document.getElementById('hud-hdg'),
      vs: document.getElementById('hud-vs'),
      score: document.getElementById('hud-score'),
      delivery: document.getElementById('hud-delivery'),
      fuel: document.getElementById('hud-fuel-fill'),
      damage: document.getElementById('hud-damage-fill'),
      thr: document.getElementById('hud-thr'),
      thrFill: document.getElementById('throttle-fill'),
      message: document.getElementById('message-line'),
      banner: document.getElementById('banner'),
    };
    this.compass = document.getElementById('compass');
    this.compassCtx = this.compass.getContext('2d');
    this.attitude = document.getElementById('attitude');
    this.attitudeCtx = this.attitude.getContext('2d');
    this.last = {};
    this.bannerTimer = null;
  }

  show() {
    this.el.hud.classList.remove('hidden');
  }

  hide() {
    this.el.hud.classList.add('hidden');
  }

  setText(key, value) {
    if (this.last[key] !== value) {
      this.last[key] = value;
      this.el[key].textContent = value;
    }
  }

  setMessage(text) {
    if (this.last.message !== text) {
      this.last.message = text;
      this.el.message.textContent = text;
    }
  }

  showBanner(text, ms = 2200) {
    this.el.banner.textContent = text;
    this.el.banner.classList.remove('hidden');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.el.banner.classList.add('hidden');
    }, ms);
  }

  update(state) {
    this.setText('alt', String(Math.round(state.alt)));
    this.setText('spd', String(Math.round(state.spd)));
    this.setText('hdg', `${String(Math.round(state.hdg) % 360).padStart(3, '0')}°`);
    const vs = Math.round(state.vs);
    this.setText('vs', `${vs >= 0 ? '+' : ''}${vs}`);
    this.setText('score', String(state.score));
    this.setText('delivery', `${state.deliveries}/3`);
    this.setText('thr', `${Math.round(state.throttle * 100)}%`);
    const fuelPct = Math.max(0, Math.min(100, state.fuel));
    const fuelKey = `fuel${Math.round(fuelPct)}`;
    if (this.last.fuel !== fuelKey) {
      this.last.fuel = fuelKey;
      this.el.fuel.style.width = `${fuelPct}%`;
      this.el.fuel.style.background = fuelPct < 25
        ? 'linear-gradient(90deg, #ff5a4e, #ff9a3d)'
        : 'linear-gradient(90deg, #ffb347, #ffe08a)';
    }
    const dmgPct = Math.max(0, Math.min(100, state.damage));
    const dmgKey = `dmg${Math.round(dmgPct)}`;
    if (this.last.dmg !== dmgKey) {
      this.last.dmg = dmgKey;
      this.el.damage.style.width = `${dmgPct}%`;
    }
    const thrKey = `thr${Math.round(state.throttle * 100)}`;
    if (this.last.thrFill !== thrKey) {
      this.last.thrFill = thrKey;
      this.el.thrFill.style.width = `${Math.round(state.throttle * 100)}%`;
    }
    this.drawCompass(state.hdg);
    this.drawAttitude(state.pitch, state.roll);
  }

  drawCompass(headingDeg) {
    const ctx = this.compassCtx;
    const w = this.compass.width;
    const h = this.compass.height;
    ctx.clearRect(0, 0, w, h);
    const pxPerDeg = 3;
    const cx = w / 2;
    ctx.font = 'bold 13px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Ticks and labels for +-60 degrees around the heading.
    for (let d = -60; d <= 60; d += 5) {
      const deg = ((Math.round(headingDeg) + d) % 360 + 360) % 360;
      const x = cx + d * pxPerDeg;
      const major = deg % 30 === 0;
      const cardinal = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg];
      ctx.strokeStyle = major ? '#ffe9b0' : 'rgba(255, 233, 176, 0.45)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, major ? 6 : 12);
      ctx.lineTo(x, 20);
      ctx.stroke();
      if (cardinal) {
        ctx.fillStyle = '#ffd97a';
        ctx.fillText(cardinal, x, 28);
      } else if (major) {
        ctx.fillStyle = 'rgba(234, 246, 255, 0.85)';
        ctx.fillText(String(deg / 10), x, 28);
      }
    }
    // Centre caret.
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath();
    ctx.moveTo(cx - 6, 0);
    ctx.lineTo(cx + 6, 0);
    ctx.lineTo(cx, 6);
    ctx.closePath();
    ctx.fill();
  }

  drawAttitude(pitch, roll) {
    const ctx = this.attitudeCtx;
    const size = this.attitude.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // Sky and ground, rotated by roll and shifted by pitch.
    ctx.translate(cx, cy);
    ctx.rotate(-roll);
    const pitchPx = THREE_PITCH_SCALE * pitch;
    ctx.translate(0, pitchPx);
    ctx.fillStyle = '#3d8fd1';
    ctx.fillRect(-r - 4, -r - 4 - 120, (r + 4) * 2, r + 4 + 120);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-r - 4, 0, (r + 4) * 2, r + 4 + 120);
    // Horizon line.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r - 4, 0);
    ctx.lineTo(r + 4, 0);
    ctx.stroke();
    // Pitch ladder ticks.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    for (const deg of [-20, -10, 10, 20]) {
      const y = -deg * 1.2;
      const half = deg % 20 === 0 ? 16 : 9;
      ctx.beginPath();
      ctx.moveTo(-half, y);
      ctx.lineTo(half, y);
      ctx.stroke();
    }
    ctx.restore();
    // Fixed aircraft symbol.
    ctx.strokeStyle = '#ffd97a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 190, 90, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// Pixels of attitude shift per radian of pitch.
const THREE_PITCH_SCALE = 60;
