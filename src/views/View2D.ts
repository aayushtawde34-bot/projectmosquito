// High-Performance 2D Tactical & Scientific Visualizer (Top-Down & Cross-Section Views)
import { InsectSimulation } from '../simulation/InsectSimulation';

export class View2D {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  sim: InsectSimulation;

  mode: 'topdown' | 'side' = 'topdown';
  isDayMode: boolean = false;

  showVectorField: boolean = true;
  showThermalHeatmap: boolean = true;
  showVortexFlow: boolean = true;
  showInsectTrails: boolean = true;
  showRuler: boolean = true;

  dragTarget: 'lamp' | 'human' | null = null;
  isDragging: boolean = false;
  dragStartPos = { x: 0, y: 0 };

  trailHistory: Map<string, { x: number; y: number }[]> = new Map();

  private boundOnPointerDown: (e: MouseEvent) => void;
  private boundOnPointerMove: (e: MouseEvent) => void;
  private boundOnPointerUp: () => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;

  constructor(canvas: HTMLCanvasElement, simulation: InsectSimulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sim = simulation;

    this.boundOnPointerDown = (e: MouseEvent) => this.onPointerDown(e);
    this.boundOnPointerMove = (e: MouseEvent) => this.onPointerMove(e);
    this.boundOnPointerUp = () => this.onPointerUp();
    this.boundTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) this.onPointerDown(e.touches[0] as unknown as MouseEvent);
    };
    this.boundTouchMove = (e: TouchEvent) => {
      if (this.isDragging && e.touches.length > 0) {
        this.onPointerMove(e.touches[0] as unknown as MouseEvent);
        e.preventDefault();
      }
    };
    this.boundTouchEnd = () => this.onPointerUp();

    this.initEventListeners();
  }

  setDayNightMode(isDay: boolean) {
    this.isDayMode = isDay;
  }

  setMode(mode: 'topdown' | 'side') {
    if (mode === 'topdown' || mode === 'side') {
      this.mode = mode;
      this.trailHistory.clear();
    }
  }

  toggleLayer(layer: 'showVectorField' | 'showThermalHeatmap' | 'showVortexFlow' | 'showInsectTrails' | 'showRuler') {
    if (this[layer] !== undefined) {
      this[layer] = !this[layer];
    }
  }

  initEventListeners() {
    this.canvas.addEventListener('mousedown', this.boundOnPointerDown);
    window.addEventListener('mousemove', this.boundOnPointerMove);
    window.addEventListener('mouseup', this.boundOnPointerUp);

    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundTouchEnd);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.boundOnPointerDown);
    window.removeEventListener('mousemove', this.boundOnPointerMove);
    window.removeEventListener('mouseup', this.boundOnPointerUp);

    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);
  }

  worldToScreen(wx: number, wy: number, wz: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 50;
    const availW = w - padding * 2;
    const availH = h - padding * 2;

    if (this.mode === 'topdown') {
      const scaleX = availW / this.sim.room.width;
      const scaleY = availH / this.sim.room.length;
      const scale = Math.min(scaleX, scaleY);

      const sx = w / 2 + wx * scale;
      const sy = h / 2 + wz * scale;
      return { x: sx, y: sy, scale };
    } else {
      const scaleX = availW / this.sim.room.width;
      const scaleY = availH / this.sim.room.height;
      const scale = Math.min(scaleX, scaleY);

      const sx = w / 2 + wx * scale;
      const sy = h - padding - wy * scale;
      return { x: sx, y: sy, scale };
    }
  }

  screenToWorld(sx: number, sy: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 50;
    const availW = w - padding * 2;
    const availH = h - padding * 2;

    if (this.mode === 'topdown') {
      const scale = Math.min(availW / this.sim.room.width, availH / this.sim.room.length);
      const wx = (sx - w / 2) / scale;
      const wz = (sy - h / 2) / scale;
      return { x: wx, y: this.sim.lamp.y, z: wz };
    } else {
      const scale = Math.min(availW / this.sim.room.width, availH / this.sim.room.height);
      const wx = (sx - w / 2) / scale;
      const wy = (h - padding - sy) / scale;
      return { x: wx, y: wy, z: this.sim.lamp.z };
    }
  }

  onPointerDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const lampScreen = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const humanScreen = this.worldToScreen(this.sim.human.x, this.sim.human.y, this.sim.human.z);

    const distLamp = Math.hypot(sx - lampScreen.x, sy - lampScreen.y);
    const distHuman = Math.hypot(sx - humanScreen.x, sy - humanScreen.y);

    if (distLamp < 32) {
      this.dragTarget = 'lamp';
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    } else if (distHuman < 32 && this.sim.human.active) {
      this.dragTarget = 'human';
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onPointerMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    if (this.isDragging && this.dragTarget) {
      const worldPos = this.screenToWorld(sx, sy);
      const halfW = this.sim.room.width / 2 - 0.4;
      const halfL = this.sim.room.length / 2 - 0.4;

      if (this.dragTarget === 'lamp') {
        this.sim.lamp.x = Math.max(-halfW, Math.min(halfW, worldPos.x));
        if (this.mode === 'topdown') {
          this.sim.lamp.z = Math.max(-halfL, Math.min(halfL, worldPos.z));
        } else {
          this.sim.lamp.y = Math.max(0.6, Math.min(2.5, worldPos.y));
        }
      } else if (this.dragTarget === 'human') {
        this.sim.human.x = Math.max(-halfW, Math.min(halfW, worldPos.x));
        if (this.mode === 'topdown') {
          this.sim.human.z = Math.max(-halfL, Math.min(halfL, worldPos.z));
        } else {
          this.sim.human.y = Math.max(0.4, Math.min(1.8, worldPos.y));
        }
      }
    } else {
      const lampScreen = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
      const humanScreen = this.worldToScreen(this.sim.human.x, this.sim.human.y, this.sim.human.z);
      const distLamp = Math.hypot(sx - lampScreen.x, sy - lampScreen.y);
      const distHuman = Math.hypot(sx - humanScreen.x, sy - humanScreen.y);

      if (distLamp < 30 || (distHuman < 30 && this.sim.human.active)) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  onPointerUp() {
    this.isDragging = false;
    this.dragTarget = null;
    this.canvas.style.cursor = 'default';
  }

  render(timeNow: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0, 0, w, h);

    this.drawRoomGrid(ctx, w, h);

    if (this.showThermalHeatmap || this.showVectorField) {
      this.drawFieldGradients(ctx);
    }

    if (this.showVortexFlow && this.sim.lamp.trapType === 'suction') {
      this.drawVortexStreamlines(ctx, timeNow);
    }

    if (this.showRuler && this.sim.human.active) {
      this.drawDistanceRuler(ctx);
    }

    if (this.sim.human.active) {
      this.drawHumanHost(ctx, timeNow);
    }

    this.drawInsects(ctx);

    this.drawElectricDischarges(ctx);

    this.drawLamp(ctx, timeNow);

    this.drawHUD(ctx, h);
  }

  drawRoomGrid(ctx: CanvasRenderingContext2D, _w: number, _h: number) {
    const p1 = this.worldToScreen(-this.sim.room.width / 2, 0, -this.sim.room.length / 2);
    const p2 = this.worldToScreen(this.sim.room.width / 2, this.sim.room.height, this.sim.room.length / 2);

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (this.isDayMode) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      const sunGrad = ctx.createLinearGradient(minX, minY, maxX, maxY);
      sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
      sunGrad.addColorStop(0.5, 'rgba(240, 240, 138, 0.05)');
      sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    } else {
      ctx.fillStyle = '#0e1222';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = -Math.floor(this.sim.room.width / 2);
    const endX = Math.floor(this.sim.room.width / 2);

    for (let x = startX; x <= endX; x++) {
      const scr = this.worldToScreen(x, 0, 0);
      ctx.moveTo(scr.x, minY);
      ctx.lineTo(scr.x, maxY);
    }

    if (this.mode === 'topdown') {
      const startZ = -Math.floor(this.sim.room.length / 2);
      const endZ = Math.floor(this.sim.room.length / 2);
      for (let z = startZ; z <= endZ; z++) {
        const scr = this.worldToScreen(0, 0, z);
        ctx.moveTo(minX, scr.y);
        ctx.lineTo(maxX, scr.y);
      }
    } else {
      for (let y = 0; y <= 3; y++) {
        const scr = this.worldToScreen(0, y, 0);
        ctx.moveTo(minX, scr.y);
        ctx.lineTo(maxX, scr.y);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  }

  drawFieldGradients(ctx: CanvasRenderingContext2D) {
    const lampPos = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const wl = this.sim.getWavelengthData();
    const scale = lampPos.scale;

    if (this.showVectorField && this.sim.lamp.isOn) {
      const lureRadiusPixels = 4.5 * scale;
      const uvGrad = ctx.createRadialGradient(
        lampPos.x, lampPos.y, 8,
        lampPos.x, lampPos.y, lureRadiusPixels
      );

      const contrast = Math.max(0.12, 1.0 - this.sim.ambientLight * 0.8);
      const alphaPeak = 0.35 * (wl.attraction / 100) * contrast;

      uvGrad.addColorStop(0, `rgba(180, 100, 255, ${alphaPeak * 1.5})`);
      uvGrad.addColorStop(0.2, `rgba(140, 60, 240, ${alphaPeak * 0.9})`);
      uvGrad.addColorStop(0.6, `rgba(90, 40, 180, ${alphaPeak * 0.3})`);
      uvGrad.addColorStop(1, 'rgba(30, 20, 70, 0)');

      ctx.fillStyle = uvGrad;
      ctx.beginPath();
      ctx.arc(lampPos.x, lampPos.y, lureRadiusPixels, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(180, 130, 255, ${0.18 * contrast})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      for (let r = 0.6; r <= 3.2; r += 0.65) {
        ctx.beginPath();
        ctx.arc(lampPos.x, lampPos.y, r * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    if (this.showThermalHeatmap && this.sim.lamp.thermalActive) {
      const heatRadius = 1.6 * scale;
      const heatGrad = ctx.createRadialGradient(
        lampPos.x, lampPos.y, 4,
        lampPos.x, lampPos.y, heatRadius
      );
      heatGrad.addColorStop(0, 'rgba(255, 110, 40, 0.28)');
      heatGrad.addColorStop(0.5, 'rgba(240, 90, 20, 0.12)');
      heatGrad.addColorStop(1, 'rgba(220, 60, 10, 0)');

      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(lampPos.x, lampPos.y, heatRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawVortexStreamlines(ctx: CanvasRenderingContext2D, timeNow: number) {
    const lampPos = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const scale = lampPos.scale;
    const suctionR = this.sim.lamp.suctionRadius * scale;

    ctx.save();
    ctx.translate(lampPos.x, lampPos.y);

    const arms = 6;
    const t = (timeNow * 0.003) % (Math.PI * 2);

    for (let a = 0; a < arms; a++) {
      const baseAngle = (a / arms) * Math.PI * 2 + t;
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();

      for (let step = 0; step < 40; step++) {
        const factor = step / 40;
        const r = suctionR * (1 - factor);
        const theta = baseAngle + factor * 2.8;
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, suctionR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  drawDistanceRuler(ctx: CanvasRenderingContext2D) {
    const lampPos = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const humanPos = this.worldToScreen(this.sim.human.x, this.sim.human.y, this.sim.human.z);

    const dist = this.sim.getHumanDistance();
    const isRecommended = dist >= 3.0 && dist <= 5.0;

    ctx.strokeStyle = isRecommended ? 'rgba(52, 211, 153, 0.7)' : 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);

    ctx.beginPath();
    ctx.moveTo(lampPos.x, lampPos.y);
    ctx.lineTo(humanPos.x, humanPos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (lampPos.x + humanPos.x) / 2;
    const midY = (lampPos.y + humanPos.y) / 2;

    const label = `${dist.toFixed(1)}m ${isRecommended ? '✓ Optimal (3-5m)' : '⚠ Close (<3m)'}`;
    ctx.font = '11px "JetBrains Mono", monospace';
    const textW = ctx.measureText(label).width;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fillRect(midX - textW / 2 - 6, midY - 14, textW + 12, 20);
    ctx.strokeStyle = isRecommended ? '#10b981' : '#f59e0b';
    ctx.strokeRect(midX - textW / 2 - 6, midY - 14, textW + 12, 20);

    ctx.fillStyle = isRecommended ? '#34d399' : '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY - 4);
  }

  drawHumanHost(ctx: CanvasRenderingContext2D, timeNow: number) {
    const pos = this.worldToScreen(this.sim.human.x, this.sim.human.y, this.sim.human.z);
    const scale = pos.scale;

    const heatGrad = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, 1.2 * scale);
    heatGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
    heatGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.12)');
    heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const pulse = (Math.sin(timeNow * 0.005) + 1) * 0.5;
    ctx.strokeStyle = `rgba(244, 63, 94, ${0.8 - pulse * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Human Host (37°C)', pos.x, pos.y + 28);
  }

  drawInsects(ctx: CanvasRenderingContext2D) {
    for (const bug of this.sim.insects) {
      if (bug.state === 'trapped') continue;

      const scr = this.worldToScreen(bug.x, bug.y, bug.z);

      if (this.showInsectTrails && bug.state === 'flying') {
        let history = this.trailHistory.get(bug.id);
        if (!history) {
          history = [];
          this.trailHistory.set(bug.id, history);
        }
        history.push({ x: scr.x, y: scr.y });
        if (history.length > 8) history.shift();

        if (history.length > 2) {
          ctx.strokeStyle = bug.speciesDef.color + '44';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(history[0].x, history[0].y);
          for (let p = 1; p < history.length; p++) {
            ctx.lineTo(history[p].x, history[p].y);
          }
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(scr.x, scr.y);

      const heading = this.mode === 'topdown'
        ? Math.atan2(bug.vz, bug.vx)
        : Math.atan2(-bug.vy, bug.vx);

      ctx.rotate(heading);

      const size = 5 * bug.speciesDef.size;
      const wingFlap = Math.sin(bug.wingPhase) * 6;

      ctx.fillStyle = bug.speciesDef.color;

      if (bug.species === 'mosquito') {
        const mSize = size * 1.25;

        // Legs
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.moveTo(mSize * 0.2, -mSize * 0.3);
        ctx.lineTo(mSize * 0.8, -mSize * 1.2);
        ctx.lineTo(mSize * 1.4, -mSize * 1.6);
        ctx.moveTo(mSize * 0.2, mSize * 0.3);
        ctx.lineTo(mSize * 0.8, mSize * 1.2);
        ctx.lineTo(mSize * 1.4, mSize * 1.6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -mSize * 0.35);
        ctx.lineTo(-mSize * 0.4, -mSize * 1.8);
        ctx.lineTo(-mSize * 0.2, -mSize * 2.5);
        ctx.moveTo(0, mSize * 0.35);
        ctx.lineTo(-mSize * 0.4, mSize * 1.8);
        ctx.lineTo(-mSize * 0.2, mSize * 2.5);
        ctx.stroke();

        const legWave = Math.sin(bug.wingPhase * 0.2) * 2;
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(-mSize * 0.4, -mSize * 0.3);
        ctx.lineTo(-mSize * 1.5, -mSize * 1.5 + legWave);
        ctx.lineTo(-mSize * 3.2, -mSize * 2.0 + legWave);
        ctx.moveTo(-mSize * 0.4, mSize * 0.3);
        ctx.lineTo(-mSize * 1.5, mSize * 1.5 - legWave);
        ctx.lineTo(-mSize * 3.2, mSize * 2.0 - legWave);
        ctx.stroke();

        // Abdomen (striped)
        const segCount = 6;
        for (let s = 0; s < segCount; s++) {
          const segX = -mSize * 0.4 - s * (mSize * 0.38);
          const segW = mSize * 0.42 * (1 - s * 0.1);
          const segH = mSize * 0.36 * (1 - s * 0.12);

          ctx.fillStyle = (s % 2 === 1) ? '#e2e8f0' : '#1c1917';
          ctx.beginPath();
          ctx.ellipse(segX, 0, segW, segH, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Thorax
        ctx.fillStyle = '#262626';
        ctx.beginPath();
        ctx.ellipse(0, 0, mSize * 0.65, mSize * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-mSize * 0.3, -1, mSize * 0.6, 2);

        // Head
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(mSize * 0.65, 0, mSize * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(mSize * 0.72, -mSize * 0.16, mSize * 0.14, 0, Math.PI * 2);
        ctx.arc(mSize * 0.72, mSize * 0.16, mSize * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Proboscis
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mSize * 0.85, 0);
        ctx.lineTo(mSize * 2.6, 0);
        ctx.stroke();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(mSize * 0.75, -mSize * 0.1);
        ctx.lineTo(mSize * 1.8, -mSize * 0.7);
        ctx.moveTo(mSize * 0.75, mSize * 0.1);
        ctx.lineTo(mSize * 1.8, mSize * 0.7);
        ctx.stroke();

        // Wings
        ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
        ctx.lineWidth = 0.8;

        ctx.beginPath();
        ctx.ellipse(-mSize * 0.1, -mSize * 1.0 + wingFlap * 0.6, mSize * 1.4, mSize * 0.42, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(-mSize * 0.1, mSize * 1.0 - wingFlap * 0.6, mSize * 1.4, mSize * 0.42, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(-1, -size * 0.8 + wingFlap * 0.4, size * 0.7, size * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-1, size * 0.8 - wingFlap * 0.4, size * 0.7, size * 0.35, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawElectricDischarges(ctx: CanvasRenderingContext2D) {
    for (const disc of this.sim.activeDischarges) {
      const pStart = this.worldToScreen(disc.startX, disc.startY, disc.startZ);
      const pEnd = this.worldToScreen(disc.endX, disc.endY, disc.endZ);

      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);

      const steps = 4;
      for (let s = 1; s < steps; s++) {
        const factor = s / steps;
        const jx = pStart.x + (pEnd.x - pStart.x) * factor + (Math.random() - 0.5) * 16;
        const jy = pStart.y + (pEnd.y - pStart.y) * factor + (Math.random() - 0.5) * 16;
        ctx.lineTo(jx, jy);
      }
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();

      ctx.shadowBlur = 0;

      for (const sp of disc.sparks) {
        if (sp.life <= 0) continue;
        const pSpark = this.worldToScreen(sp.x, sp.y, sp.z);
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#e056fd';
        ctx.beginPath();
        ctx.arc(pSpark.x, pSpark.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawLamp(ctx: CanvasRenderingContext2D, timeNow: number) {
    const pos = this.worldToScreen(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const scale = pos.scale;
    const wl = this.sim.getWavelengthData();

    const lampR = this.sim.lamp.radius * scale;
    const gridR = this.sim.lamp.gridRadius * scale;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (this.mode === 'topdown') {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, lampR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      for (let a = 0; a < 16; a++) {
        const theta = (a / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(theta) * (lampR * 0.7), Math.sin(theta) * (lampR * 0.7));
        ctx.lineTo(Math.cos(theta) * lampR, Math.sin(theta) * lampR);
        ctx.stroke();
      }

      if (this.sim.lamp.trapType === 'zapper' || this.sim.lamp.trapType === 'solar') {
        ctx.strokeStyle = 'rgba(224, 86, 253, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, gridR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, gridR * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.sim.lamp.trapType === 'suction') {
        const bladeAngle = (timeNow * 0.015) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
        for (let b = 0; b < 5; b++) {
          const ba = bladeAngle + (b / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(ba) * (lampR * 0.45), Math.sin(ba) * (lampR * 0.45), 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (this.sim.lamp.isOn) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = wl.color;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, 0, lampR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      const lampH = 0.65 * scale;
      const lampHalfW = lampR;

      const ceilingScr = this.worldToScreen(this.sim.lamp.x, this.sim.room.height, this.sim.lamp.z);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -lampH / 2);
      ctx.lineTo(0, ceilingScr.y - pos.y);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-lampHalfW * 1.3, -lampH / 2);
      ctx.lineTo(lampHalfW * 1.3, -lampH / 2);
      ctx.lineTo(0, -lampH / 2 - 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      for (let s = -lampHalfW; s <= lampHalfW; s += 8) {
        ctx.beginPath();
        ctx.moveTo(s, -lampH / 2);
        ctx.lineTo(s, lampH / 2 - 16);
        ctx.stroke();
      }

      if (this.sim.lamp.isOn) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = wl.color;
        ctx.shadowBlur = 20;
        ctx.fillRect(-6, -lampH / 2 + 10, 12, lampH - 32);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-lampHalfW * 1.1, lampH / 2 - 16, lampHalfW * 2.2, 18);
      ctx.strokeRect(-lampHalfW * 1.1, lampH / 2 - 16, lampHalfW * 2.2, 18);

      const trappedCount = this.sim.stats.totalTrapped;
      if (trappedCount > 0) {
        ctx.fillStyle = '#94a3b8';
        const pileDots = Math.min(24, trappedCount);
        for (let d = 0; d < pileDots; d++) {
          const dx = (Math.random() - 0.5) * (lampHalfW * 1.8);
          const dy = lampH / 2 - 10 + (Math.random() - 0.5) * 6;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  drawHUD(ctx: CanvasRenderingContext2D, h: number) {
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const modeText = this.mode === 'topdown'
      ? '2D TOP-DOWN TACTICAL RADAR'
      : '2D SIDE ELEVATION CROSS-SECTION';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(16, 16, 260, 48);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.strokeRect(16, 16, 260, 48);

    ctx.fillStyle = '#a855f7';
    ctx.fillText(modeText, 26, 24);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Drag Lamp or Human to test 3-5m spacing`, 26, 42);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(16, h - 90, 310, 74);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.strokeRect(16, h - 90, 310, 74);

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('🦟 Target: Mosquitoes Only (Culicidae)', 26, h - 74);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('• 365nm UV Phototaxis (94% pull) & 37°C Thermal Mimicry', 26, h - 57);

    const envLabel = this.isDayMode
      ? '☀️ Day Mode: Sunlight washes UV contrast (Slide 11)'
      : '🌙 Night Mode: Maximum UV lure contrast & peak catch';
    ctx.fillStyle = this.isDayMode ? '#fde047' : '#38bdf8';
    ctx.fillText(envLabel, 26, h - 40);
  }
}
