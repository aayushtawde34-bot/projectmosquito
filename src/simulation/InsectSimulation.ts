// Insect Simulation Engine: Physics, Phototaxis, Thermotaxis, Vortex Suction, and High-Voltage Discharges
import { PRESENTATION_DATA, WavelengthInfo, TrapTypeInfo, InsectSpeciesInfo } from '../data/presentationData';
import { AudioEngine } from './AudioEngine';

export interface SparkParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export interface Discharge {
  id: string;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  life: number;
  sparks: SparkParticle[];
}

export interface Insect {
  id: string;
  species: string;
  speciesDef: InsectSpeciesInfo;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseSpeed: number;
  wingPhase: number;
  wingSpeed: number;
  state: 'flying' | 'zapped' | 'falling' | 'trapped';
  stateTimer: number;
  spiralAngle: number;
  spiralRadius: number;
  biteAttemptCooloff: number;
  mass: number;
}

export interface SimMetrics {
  activeFlying: number;
  totalTrapped: number;
  totalSpawned: number;
  efficiencyPercent: number;
  bitesPrevented: number;
  humanBites: number;
  speciesBreakdown: Record<string, number>;
  trapName: string;
  trapPower: string;
  trapSound: string;
  soundDb: number;
  humanDistance: string;
}

export type SimEventCallback = (eventType: string, data: any) => void;

export class InsectSimulation {
  audio: AudioEngine;

  room = {
    width: 5.6,   // X: -2.8 to 2.8
    length: 4.6,  // Z: -2.3 to 2.3
    height: 2.8   // Y: 0 to 2.8 (floor to ceiling)
  };

  lamp = {
    x: 0,
    y: 1.5, // 1.5m chest height (Slide 11 recommendation)
    z: 0,
    radius: 0.22,
    gridRadius: 0.25,
    suctionRadius: 0.75,
    trapType: 'zapper', // 'zapper' | 'suction' | 'sticky' | 'solar'
    wavelength: 365,   // 365 | 395 | 450 | 550 nm
    powerWatts: 20,
    voltage: 2400,     // Volts for zapper
    fanRpm: 2200,      // RPM for suction fan
    thermalActive: true,
    thermalTemp: 37,   // degrees C
    isOn: true
  };

  human = {
    active: true,
    x: 1.8,
    y: 0.9,
    z: 1.2,
    bodyTemp: 37.0, // degrees C
    breathCO2: 1.0,
    bitesCount: 0
  };

  isDayMode: boolean = false;
  ambientLight: number = 0.12;
  timeScale: number = 1.0;
  isPaused: boolean = false;

  insects: Insect[] = [];
  maxInsects: number = 80;
  targetInsects: number = 45;

  activeDischarges: Discharge[] = [];

  stats = {
    totalSpawned: 0,
    totalTrapped: 0,
    trappedBySpecies: {
      mosquito: 0,
      fruitfly: 0,
      housefly: 0,
      moth: 0
    } as Record<string, number>,
    bitesPrevented: 0,
    humanBites: 0,
    recentEvents: [] as any[],
    lastZapTime: 0
  };

  listeners: SimEventCallback[] = [];

  constructor(audioEngine: AudioEngine) {
    this.audio = audioEngine;
    this.resetSwarm();
  }

  addListener(fn: SimEventCallback) {
    this.listeners.push(fn);
  }

  removeListener(fn: SimEventCallback) {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  notifyListeners(eventType: string, data: any) {
    for (const fn of this.listeners) {
      fn(eventType, data);
    }
  }

  getWavelengthData(): WavelengthInfo {
    return PRESENTATION_DATA.wavelengths.find(w => w.nm === this.lamp.wavelength) || PRESENTATION_DATA.wavelengths[0];
  }

  getTrapData(): TrapTypeInfo {
    return PRESENTATION_DATA.trapTypes[this.lamp.trapType] || PRESENTATION_DATA.trapTypes.zapper;
  }

  setTrapType(type: string) {
    if (PRESENTATION_DATA.trapTypes[type]) {
      this.lamp.trapType = type;
      if (this.audio) {
        this.audio.setFanActive(type === 'suction', 0.4);
      }
      this.notifyListeners('trapTypeChanged', type);
    }
  }

  setWavelength(nm: number) {
    this.lamp.wavelength = Number(nm);
    this.notifyListeners('wavelengthChanged', nm);
  }

  setAmbientLight(val: number) {
    this.ambientLight = Math.max(0, Math.min(1, Number(val)));
  }

  setDayNightMode(isDay: boolean) {
    this.isDayMode = isDay;
    this.ambientLight = isDay ? 0.85 : 0.12;
    this.notifyListeners('dayNightChanged', isDay);
  }

  setLampHeight(y: number) {
    this.lamp.y = Math.max(0.6, Math.min(2.4, Number(y)));
  }

  setHumanDistance(dist: number) {
    const angle = 0.55;
    this.human.x = this.lamp.x + Math.cos(angle) * dist;
    this.human.z = this.lamp.z + Math.sin(angle) * dist;
  }

  getHumanDistance(): number {
    const dx = this.human.x - this.lamp.x;
    const dz = this.human.z - this.lamp.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  resetSwarm(count = this.targetInsects) {
    this.insects = [];
    this.activeDischarges = [];
    this.spawnSwarm(count);
  }

  clearCatchTray() {
    this.stats.totalTrapped = 0;
    this.stats.trappedBySpecies = { mosquito: 0, fruitfly: 0, housefly: 0, moth: 0 };
    this.insects = this.insects.filter(bug => bug.state === 'flying');
    this.notifyListeners('trayCleaned', null);
  }

  spawnSwarm(count: number) {
    for (let i = 0; i < count; i++) {
      this.spawnInsect();
    }
  }

  spawnInsect(): Insect {
    const speciesId = 'mosquito';
    const speciesDef = PRESENTATION_DATA.insectSpecies.find(s => s.id === 'mosquito') || {
      id: 'mosquito',
      name: 'Mosquitoes (Culicidae)',
      share: 100,
      color: '#a855f7',
      speed: 1.35,
      size: 1.0,
      thermalAffinity: 0.95,
      lightAffinity: 0.92,
      erraticness: 0.8,
      desc: 'Target human body warmth (37°C) & CO2, lured off-course by 365nm UV lamp.'
    };

    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0.4 + Math.random() * 2.2, z = 0;
    const halfW = this.room.width / 2 - 0.2;
    const halfL = this.room.length / 2 - 0.2;

    if (edge === 0) { x = -halfW; z = (Math.random() * 2 - 1) * halfL; }
    else if (edge === 1) { x = halfW; z = (Math.random() * 2 - 1) * halfL; }
    else if (edge === 2) { x = (Math.random() * 2 - 1) * halfW; z = -halfL; }
    else { x = (Math.random() * 2 - 1) * halfW; z = halfL; }

    const speed = speciesDef.speed * (0.8 + Math.random() * 0.4);
    const angle = Math.random() * Math.PI * 2;

    const bug: Insect = {
      id: Math.random().toString(36).substring(2, 11),
      species: speciesId,
      speciesDef: speciesDef,
      x: x,
      y: y,
      z: z,
      vx: Math.cos(angle) * speed * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      vz: Math.sin(angle) * speed * 0.3,
      baseSpeed: speed,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 36,
      state: 'flying',
      stateTimer: 0,
      spiralAngle: Math.random() * Math.PI * 2,
      spiralRadius: 2.0,
      biteAttemptCooloff: 0,
      mass: 0.3
    };

    this.insects.push(bug);
    this.stats.totalSpawned++;
    return bug;
  }

  update(dt: number) {
    if (this.isPaused) return;

    const scaledDt = Math.min(0.05, dt * this.timeScale);

    this.insects = this.insects.filter(b => b.species === 'mosquito');

    const activeFlying = this.insects.filter(b => b.state === 'flying').length;
    if (activeFlying < this.targetInsects && Math.random() < 0.08) {
      this.spawnInsect();
    }

    this.updateDischarges(scaledDt);

    const wavelengthData = this.getWavelengthData();
    const wavelengthFactor = wavelengthData.attraction / 100;

    const lightContrast = Math.max(0.08, 1.0 - this.ambientLight * 0.85);
    const effectiveLampPull = wavelengthFactor * lightContrast * (this.lamp.isOn ? 1.0 : 0.05);

    let closestDistToLamp = 999;

    for (let i = 0; i < this.insects.length; i++) {
      const bug = this.insects[i];

      if (bug.state === 'trapped') {
        continue;
      }

      if (bug.state === 'falling') {
        bug.vy -= 9.8 * scaledDt * 0.5;
        bug.x += bug.vx * scaledDt * 0.3;
        bug.y += bug.vy * scaledDt;
        bug.z += bug.vz * scaledDt * 0.3;

        const trayTop = this.lamp.y - 0.35;
        const distToLampCenter = Math.hypot(bug.x - this.lamp.x, bug.z - this.lamp.z);

        if (distToLampCenter < this.lamp.radius * 1.3 && Math.abs(bug.y - trayTop) < 0.08) {
          bug.y = trayTop;
          bug.vy = 0;
          bug.state = 'trapped';
        } else if (bug.y <= 0.05) {
          bug.y = 0.05;
          bug.vy = 0;
          bug.state = 'trapped';
        }
        continue;
      }

      if (bug.state === 'zapped') {
        bug.stateTimer -= scaledDt;
        if (bug.stateTimer <= 0) {
          bug.state = 'falling';
          bug.vy = -0.5;
        }
        continue;
      }

      // FLYING STATE:
      bug.wingPhase += bug.wingSpeed * scaledDt * 10;
      if (bug.biteAttemptCooloff > 0) bug.biteAttemptCooloff -= scaledDt;

      const dxLamp = this.lamp.x - bug.x;
      const dyLamp = this.lamp.y - bug.y;
      const dzLamp = this.lamp.z - bug.z;
      const distLamp = Math.sqrt(dxLamp * dxLamp + dyLamp * dyLamp + dzLamp * dzLamp) || 0.01;

      if (distLamp < closestDistToLamp) closestDistToLamp = distLamp;

      let dxHuman = 0, dyHuman = 0, dzHuman = 0, distHuman = 999;
      if (this.human.active) {
        dxHuman = this.human.x - bug.x;
        dyHuman = this.human.y - bug.y;
        dzHuman = this.human.z - bug.z;
        distHuman = Math.sqrt(dxHuman * dxHuman + dyHuman * dyHuman + dzHuman * dzHuman) || 0.01;
      }

      let fx = 0, fy = 0, fz = 0;

      // 1. Phototaxis Force toward UV Lamp
      const phototaxisStrength = (effectiveLampPull * bug.speciesDef.lightAffinity * 2.8) / (distLamp * 0.6 + 0.4);
      fx += (dxLamp / distLamp) * phototaxisStrength;
      fy += (dyLamp / distLamp) * phototaxisStrength * 0.7;
      fz += (dzLamp / distLamp) * phototaxisStrength;

      // 2. Thermotaxis & CO2 Plume (Human vs Lamp Thermal Ring)
      if (this.lamp.thermalActive && distLamp < 2.5) {
        const thermalPull = (bug.speciesDef.thermalAffinity * 1.2) / (distLamp + 0.3);
        fx += (dxLamp / distLamp) * thermalPull;
        fy += (dyLamp / distLamp) * thermalPull;
        fz += (dzLamp / distLamp) * thermalPull;
      }

      if (this.human.active) {
        const humanAttraction = (bug.speciesDef.thermalAffinity * 1.8) / (distHuman * 0.7 + 0.5);

        if (distHuman < distLamp * 0.7 || effectiveLampPull < 0.4) {
          fx += (dxHuman / distHuman) * humanAttraction;
          fy += (dyHuman / distHuman) * humanAttraction * 0.5;
          fz += (dzHuman / distHuman) * humanAttraction;
        }

        if (distHuman < 0.28 && bug.biteAttemptCooloff <= 0) {
          this.stats.humanBites++;
          bug.biteAttemptCooloff = 4.0;
          fx -= (dxHuman / distHuman) * 3.0;
          fz -= (dzHuman / distHuman) * 3.0;
          this.notifyListeners('humanBite', { species: bug.species });
        }
      }

      // 3. Erratic biological Brownian motion & flight cruising
      const erratic = bug.speciesDef.erraticness;
      fx += (Math.random() - 0.5) * erratic * 2.2;
      fy += (Math.random() - 0.5) * erratic * 1.6;
      fz += (Math.random() - 0.5) * erratic * 2.2;

      // Mosquito Hovering & Bobbing
      fy += Math.sin(bug.wingPhase * 0.18) * 1.6;
      if (Math.sin(bug.wingPhase * 0.05) > 0.7) {
        bug.vx *= 0.88;
        bug.vz *= 0.88;
      }

      const idealHeight = 1.4 + Math.sin(bug.wingPhase * 0.1) * 0.3;
      fy += (idealHeight - bug.y) * 0.4;

      // 4. Trap Specific Capture Zone Mechanics
      const horizDistToLamp = Math.hypot(dxLamp, dzLamp);
      const vertDistToLamp = Math.abs(dyLamp);

      if (this.lamp.trapType === 'zapper' || this.lamp.trapType === 'solar') {
        if (horizDistToLamp <= this.lamp.gridRadius && vertDistToLamp <= 0.25) {
          this.triggerZap(bug);
          continue;
        }
      } else if (this.lamp.trapType === 'suction') {
        if (distLamp < this.lamp.suctionRadius) {
          const suctionNorm = 1.0 - distLamp / this.lamp.suctionRadius;
          const vortexPower = suctionNorm * suctionNorm * 7.5;

          const swirlX = -dzLamp / (horizDistToLamp + 0.05);
          const swirlZ = dxLamp / (horizDistToLamp + 0.05);

          fx += (dxLamp * 2.0 + swirlX * 3.0) * vortexPower;
          fy += (-4.5 + dyLamp * 1.5) * vortexPower;
          fz += (dzLamp * 2.0 + swirlZ * 3.0) * vortexPower;

          if (horizDistToLamp < 0.16 && vertDistToLamp < 0.22) {
            this.triggerSuctionCapture(bug);
            continue;
          }
        }
      } else if (this.lamp.trapType === 'sticky') {
        if (horizDistToLamp <= this.lamp.radius * 0.95 && bug.y <= this.lamp.y - 0.22 && bug.y >= this.lamp.y - 0.34) {
          this.triggerStickyCapture(bug);
          continue;
        }
      }

      // Room boundary containment
      const halfW = this.room.width / 2;
      const halfL = this.room.length / 2;
      const margin = 0.3;

      if (bug.x < -halfW + margin) fx += 4.0;
      if (bug.x > halfW - margin) fx -= 4.0;
      if (bug.z < -halfL + margin) fz += 4.0;
      if (bug.z > halfL - margin) fz -= 4.0;
      if (bug.y < 0.2) fy += 5.0;
      if (bug.y > this.room.height - 0.2) fy -= 4.0;

      const accelX = fx / bug.mass;
      const accelY = fy / bug.mass;
      const accelZ = fz / bug.mass;

      bug.vx += accelX * scaledDt;
      bug.vy += accelY * scaledDt;
      bug.vz += accelZ * scaledDt;

      const currentSpeed = Math.sqrt(bug.vx * bug.vx + bug.vy * bug.vy + bug.vz * bug.vz) || 0.01;
      const maxSpeed = bug.baseSpeed * (this.lamp.trapType === 'suction' && distLamp < this.lamp.suctionRadius ? 3.5 : 1.8);
      if (currentSpeed > maxSpeed) {
        const factor = maxSpeed / currentSpeed;
        bug.vx *= factor;
        bug.vy *= factor;
        bug.vz *= factor;
      }

      bug.vx *= 0.96;
      bug.vy *= 0.96;
      bug.vz *= 0.96;

      bug.x += bug.vx * scaledDt;
      bug.y += bug.vy * scaledDt;
      bug.z += bug.vz * scaledDt;
    }

    if (this.audio) {
      this.audio.updateProximityBuzz(closestDistToLamp, activeFlying);
    }

    if (this.insects.length > 250) {
      const trapped = this.insects.filter(b => b.state === 'trapped');
      if (trapped.length > 100) {
        this.insects = this.insects.filter((b, idx) => b.state !== 'trapped' || idx % 2 === 0);
      }
    }
  }

  triggerZap(bug: Insect) {
    bug.state = 'zapped';
    bug.stateTimer = 0.08;
    this.stats.totalTrapped++;
    this.stats.trappedBySpecies[bug.species] = (this.stats.trappedBySpecies[bug.species] || 0) + 1;
    this.stats.bitesPrevented++;
    this.stats.lastZapTime = performance.now();

    const angle = Math.atan2(bug.z - this.lamp.z, bug.x - this.lamp.x);
    const gridX = this.lamp.x + Math.cos(angle) * (this.lamp.gridRadius * 0.9);
    const gridY = Math.max(this.lamp.y - 0.2, Math.min(this.lamp.y + 0.2, bug.y));
    const gridZ = this.lamp.z + Math.sin(angle) * (this.lamp.gridRadius * 0.9);

    const sparks: SparkParticle[] = [];
    const sparkCount = 8 + Math.floor(Math.random() * 8);
    for (let s = 0; s < sparkCount; s++) {
      sparks.push({
        x: bug.x,
        y: bug.y,
        z: bug.z,
        vx: (Math.random() - 0.5) * 3.5,
        vy: (Math.random() * 2 + 0.5),
        vz: (Math.random() - 0.5) * 3.5,
        life: 0.25 + Math.random() * 0.25
      });
    }

    this.activeDischarges.push({
      id: Math.random().toString(),
      startX: gridX,
      startY: gridY,
      startZ: gridZ,
      endX: bug.x,
      endY: bug.y,
      endZ: bug.z,
      life: 0.12,
      sparks: sparks
    });

    if (this.audio) {
      this.audio.playZap(this.lamp.trapType === 'solar' ? 0.6 : 1.0);
    }

    this.notifyListeners('zap', {
      bug: bug,
      pos: { x: bug.x, y: bug.y, z: bug.z }
    });
  }

  triggerSuctionCapture(bug: Insect) {
    bug.state = 'trapped';
    bug.x = this.lamp.x + (Math.random() - 0.5) * 0.15;
    bug.y = this.lamp.y - 0.32;
    bug.z = this.lamp.z + (Math.random() - 0.5) * 0.15;
    bug.vx = 0;
    bug.vy = 0;
    bug.vz = 0;

    this.stats.totalTrapped++;
    this.stats.trappedBySpecies[bug.species] = (this.stats.trappedBySpecies[bug.species] || 0) + 1;
    this.stats.bitesPrevented++;

    if (this.audio) {
      this.audio.playSuctionCapture();
    }

    this.notifyListeners('suctionCapture', { bug });
  }

  triggerStickyCapture(bug: Insect) {
    bug.state = 'trapped';
    bug.y = this.lamp.y - 0.30;
    bug.vx = 0;
    bug.vy = 0;
    bug.vz = 0;

    this.stats.totalTrapped++;
    this.stats.trappedBySpecies[bug.species] = (this.stats.trappedBySpecies[bug.species] || 0) + 1;
    this.stats.bitesPrevented++;

    if (this.audio) {
      this.audio.playGlueCapture();
    }

    this.notifyListeners('stickyCapture', { bug });
  }

  updateDischarges(dt: number) {
    for (let i = this.activeDischarges.length - 1; i >= 0; i--) {
      const disc = this.activeDischarges[i];
      disc.life -= dt;

      for (const sp of disc.sparks) {
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.z += sp.vz * dt;
        sp.vy -= 9.8 * dt;
        sp.life -= dt;
      }

      if (disc.life <= 0 && disc.sparks.every(s => s.life <= 0)) {
        this.activeDischarges.splice(i, 1);
      }
    }
  }

  getMetrics(): SimMetrics {
    const active = this.insects.filter(b => b.state === 'flying').length;
    const total = this.stats.totalSpawned;
    const trapped = this.stats.totalTrapped;
    const efficiency = total > 0 ? Math.round((trapped / total) * 100) : 0;
    const trapData = this.getTrapData();

    return {
      activeFlying: active,
      totalTrapped: trapped,
      totalSpawned: total,
      efficiencyPercent: efficiency,
      bitesPrevented: this.stats.bitesPrevented,
      humanBites: this.stats.humanBites,
      speciesBreakdown: { ...this.stats.trappedBySpecies },
      trapName: trapData.name,
      trapPower: trapData.power,
      trapSound: trapData.sound,
      soundDb: trapData.soundValue,
      humanDistance: this.getHumanDistance().toFixed(1)
    };
  }
}
