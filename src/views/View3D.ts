// Three.js 3D Realistic Room & Insect Lamp Visualizer
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InsectSimulation, Insect } from '../simulation/InsectSimulation';

interface BugMeshRecord {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  legs?: THREE.Group[];
  bugRef: Insect;
}

interface VortexData {
  angles: Float32Array;
  radii: Float32Array;
  heights: Float32Array;
  speeds: Float32Array;
  count: number;
}

export class View3D {
  container: HTMLElement;
  sim: InsectSimulation;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;

  lampGroup!: THREE.Group;
  suspensionCord!: THREE.Mesh;
  uvMat!: THREE.MeshStandardMaterial;
  gridMat!: THREE.MeshStandardMaterial;
  gridMesh!: THREE.Mesh;
  uvCoreMesh!: THREE.Mesh;
  uvPointLight!: THREE.PointLight;
  fanRotor!: THREE.Group;
  catchTrayMesh!: THREE.Mesh;
  outerCageGroup!: THREE.Group;
  roomGroup!: THREE.Group;
  humanMesh!: THREE.Group;
  humanAura!: THREE.Mesh;
  ambientLight!: THREE.AmbientLight;
  ceilingLight!: THREE.PointLight;
  glassMat!: THREE.MeshBasicMaterial;
  glassMesh!: THREE.Mesh;
  moonLight!: THREE.DirectionalLight;
  sunLight!: THREE.DirectionalLight;
  thermalMat!: THREE.MeshStandardMaterial;

  bugMeshes: Map<string, BugMeshRecord> = new Map();

  vortexParticles: THREE.Points | null = null;
  vortexData: VortexData | null = null;
  sparkPoints: THREE.Points | null = null;
  dischargeLine: THREE.Line | null = null;

  cameraTargetPos: THREE.Vector3 | null = null;
  controlsTargetPos: THREE.Vector3 | null = null;
  isDayMode: boolean = false;

  private boundOnResize: () => void;

  constructor(container: HTMLElement, simulation: InsectSimulation) {
    this.container = container;
    this.sim = simulation;
    this.boundOnResize = () => this.onResize();

    this.init();
  }

  init() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c16);
    this.scene.fog = new THREE.FogExp2(0x0a0c16, 0.08);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50);
    this.camera.position.set(0, 2.2, 4.2);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 1.4, 0);

    // 5. Build 3D Environment & Lamp Model
    this.buildRoomEnvironment();
    this.buildLampModel();
    this.buildHumanModel();
    this.buildSuctionVortexParticles();
    this.buildDischargeRenderer();

    // 6. Handle Window Resizing
    window.addEventListener('resize', this.boundOnResize);
  }

  destroy() {
    window.removeEventListener('resize', this.boundOnResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  buildRoomEnvironment() {
    this.roomGroup = new THREE.Group();
    const rw = this.sim.room.width;
    const rl = this.sim.room.length;
    const rh = this.sim.room.height;

    this.ambientLight = new THREE.AmbientLight(0x2d3748, 0.4);
    this.roomGroup.add(this.ambientLight);

    this.ceilingLight = new THREE.PointLight(0xfff3e0, 0.2, 10);
    this.ceilingLight.position.set(0, rh - 0.1, 0);
    this.roomGroup.add(this.ceilingLight);

    const floorGeo = new THREE.PlaneGeometry(rw, rl);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.6,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    const backWallGeo = new THREE.PlaneGeometry(rw, rh);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x141a2e,
      roughness: 0.8
    });
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, rh / 2, -rl / 2);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    const leftWallGeo = new THREE.PlaneGeometry(rl, rh);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-rw / 2, rh / 2, 0);
    this.roomGroup.add(leftWall);

    const winGeo = new THREE.BoxGeometry(0.05, 1.4, 2.0);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const winFrame = new THREE.Mesh(winGeo, winMat);
    winFrame.position.set(-rw / 2 + 0.03, 1.6, 0);
    this.roomGroup.add(winFrame);

    const glassGeo = new THREE.PlaneGeometry(1.8, 1.2);
    this.glassMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    this.glassMesh = new THREE.Mesh(glassGeo, this.glassMat);
    this.glassMesh.rotation.y = Math.PI / 2;
    this.glassMesh.position.set(-rw / 2 + 0.06, 1.6, 0);
    this.roomGroup.add(this.glassMesh);

    this.moonLight = new THREE.DirectionalLight(0x60a5fa, 0.45);
    this.moonLight.position.set(-5, 4, 0);
    this.roomGroup.add(this.moonLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 0.0);
    this.sunLight.position.set(-5, 6, 2);
    this.sunLight.castShadow = true;
    this.roomGroup.add(this.sunLight);

    const tableGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(1.8, 0.3, 1.2);
    table.castShadow = true;
    table.receiveShadow = true;
    this.roomGroup.add(table);

    this.scene.add(this.roomGroup);
  }

  setDayNightMode(isDay: boolean) {
    this.isDayMode = isDay;
    if (isDay) {
      this.scene.background = new THREE.Color(0x93c5fd);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color = new THREE.Color(0xdbeafe);
      if (this.glassMat) this.glassMat.color = new THREE.Color(0xbae6fd);
      if (this.sunLight) this.sunLight.intensity = 2.4;
      if (this.moonLight) this.moonLight.intensity = 0.0;
      if (this.ambientLight) {
        this.ambientLight.color = new THREE.Color(0xfef3c7);
        this.ambientLight.intensity = 0.95;
      }
      if (this.ceilingLight) this.ceilingLight.intensity = 0.75;
      this.sim.setAmbientLight(0.85);
    } else {
      this.scene.background = new THREE.Color(0x0a0c16);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color = new THREE.Color(0x0a0c16);
      if (this.glassMat) this.glassMat.color = new THREE.Color(0x0f172a);
      if (this.sunLight) this.sunLight.intensity = 0.0;
      if (this.moonLight) this.moonLight.intensity = 0.45;
      if (this.ambientLight) {
        this.ambientLight.color = new THREE.Color(0x2d3748);
        this.ambientLight.intensity = 0.22;
      }
      if (this.ceilingLight) this.ceilingLight.intensity = 0.15;
      this.sim.setAmbientLight(0.12);
    }
  }

  buildLampModel() {
    this.lampGroup = new THREE.Group();
    const wl = this.sim.getWavelengthData();

    const cordGeo = new THREE.CylinderGeometry(0.006, 0.006, 2.0, 8);
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    this.suspensionCord = new THREE.Mesh(cordGeo, cordMat);
    this.suspensionCord.position.set(0, 1.0, 0);
    this.lampGroup.add(this.suspensionCord);

    const ringGeo = new THREE.TorusGeometry(0.04, 0.008, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.34, 0);
    this.lampGroup.add(ring);

    const hoodGeo = new THREE.ConeGeometry(0.28, 0.14, 32);
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.4,
      roughness: 0.4
    });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.26, 0);
    hood.castShadow = true;
    this.lampGroup.add(hood);

    const uvGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.38, 24);
    this.uvMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(wl.color),
      emissiveIntensity: 2.2,
      roughness: 0.2
    });
    this.uvCoreMesh = new THREE.Mesh(uvGeo, this.uvMat);
    this.uvCoreMesh.position.set(0, 0, 0);
    this.lampGroup.add(this.uvCoreMesh);

    this.uvPointLight = new THREE.PointLight(new THREE.Color(wl.color), 2.5, 6.0, 1.5);
    this.uvPointLight.position.set(0, 0, 0);
    this.uvPointLight.castShadow = true;
    this.lampGroup.add(this.uvPointLight);

    const gridPoints: THREE.Vector3[] = [];
    const coils = 14;
    const gridRadius = this.sim.lamp.gridRadius * 0.92;
    const height = 0.36;

    for (let c = 0; c <= 250; c++) {
      const t = c / 250;
      const angle = t * Math.PI * 2 * coils;
      const x = Math.cos(angle) * gridRadius;
      const z = Math.sin(angle) * gridRadius;
      const y = -height / 2 + t * height;
      gridPoints.push(new THREE.Vector3(x, y, z));
    }
    const gridCurve = new THREE.CatmullRomCurve3(gridPoints);
    const gridTubeGeo = new THREE.TubeGeometry(gridCurve, 200, 0.0035, 6, false);
    this.gridMat = new THREE.MeshStandardMaterial({
      color: 0xe056fd,
      emissive: 0x9333ea,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2
    });
    this.gridMesh = new THREE.Mesh(gridTubeGeo, this.gridMat);
    this.lampGroup.add(this.gridMesh);

    this.outerCageGroup = new THREE.Group();
    const cageRadius = this.sim.lamp.radius;
    const barCount = 28;
    const barGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.42, 6);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.7, roughness: 0.5 });

    for (let b = 0; b < barCount; b++) {
      const angle = (b / barCount) * Math.PI * 2;
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(Math.cos(angle) * cageRadius, 0, Math.sin(angle) * cageRadius);
      this.outerCageGroup.add(bar);
    }
    this.lampGroup.add(this.outerCageGroup);

    this.fanRotor = new THREE.Group();
    const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    this.fanRotor.add(hub);

    const bladeGeo = new THREE.BoxGeometry(0.08, 0.004, 0.025);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5 });
    for (let bl = 0; bl < 5; bl++) {
      const bAngle = (bl / 5) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(Math.cos(bAngle) * 0.06, 0, Math.sin(bAngle) * 0.06);
      blade.rotation.y = -bAngle;
      blade.rotation.x = 0.35;
      this.fanRotor.add(blade);
    }
    this.fanRotor.position.set(0, -0.15, 0);
    this.lampGroup.add(this.fanRotor);

    const trayGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.09, 32);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.3,
      roughness: 0.6
    });
    this.catchTrayMesh = new THREE.Mesh(trayGeo, trayMat);
    this.catchTrayMesh.position.set(0, -0.25, 0);
    this.catchTrayMesh.castShadow = true;
    this.lampGroup.add(this.catchTrayMesh);

    const thermGeo = new THREE.TorusGeometry(0.18, 0.008, 8, 32);
    this.thermalMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.5
    });
    const thermRing = new THREE.Mesh(thermGeo, this.thermalMat);
    thermRing.rotation.x = Math.PI / 2;
    thermRing.position.set(0, 0.18, 0);
    this.lampGroup.add(thermRing);

    this.lampGroup.position.set(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    this.scene.add(this.lampGroup);
  }

  buildHumanModel() {
    this.humanMesh = new THREE.Group();

    const torsoGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.5, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.8 });
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.set(0, 0.65, 0);
    this.humanMesh.add(torso);

    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.0, 0);
    this.humanMesh.add(head);

    const auraGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });
    this.humanAura = new THREE.Mesh(auraGeo, auraMat);
    this.humanAura.position.set(0, 0.8, 0);
    this.humanMesh.add(this.humanAura);

    this.humanMesh.position.set(this.sim.human.x, 0, this.sim.human.z);
    this.scene.add(this.humanMesh);
  }

  buildSuctionVortexParticles() {
    const pCount = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    const speeds = new Float32Array(pCount);
    const angles = new Float32Array(pCount);
    const radii = new Float32Array(pCount);
    const heights = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = 0.05 + Math.random() * 0.7;
      heights[i] = -0.2 + Math.random() * 0.6;
      speeds[i] = 1.0 + Math.random() * 2.0;

      pos[i * 3] = Math.cos(angles[i]) * radii[i];
      pos[i * 3 + 1] = heights[i];
      pos[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.vortexData = { angles, radii, heights, speeds, count: pCount };

    const mat = new THREE.PointsMaterial({
      color: 0x00f5ff,
      size: 0.024,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.vortexParticles = new THREE.Points(geo, mat);
    this.vortexParticles.visible = false;
    this.lampGroup.add(this.vortexParticles);
  }

  buildDischargeRenderer() {
    const maxLinePoints = 8;
    const lineGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(maxLinePoints * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f5ff,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85
    });
    this.dischargeLine = new THREE.Line(lineGeo, lineMat);
    this.dischargeLine.visible = false;
    this.scene.add(this.dischargeLine);

    const sparkCount = 40;
    const sparkGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sparkGeo.setDrawRange(0, 0);

    const sparkMat = new THREE.PointsMaterial({
      color: 0x00f5ff,
      size: 0.035,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    this.sparkPoints.visible = false;
    this.scene.add(this.sparkPoints);
  }

  createInsectMesh(bug: Insect): BugMeshRecord {
    return this.buildMosquitoMesh(bug);
  }

  buildMosquitoMesh(bug: Insect): BugMeshRecord {
    const group = new THREE.Group();
    const size = 0.052 * bug.speciesDef.size;

    const darkChitinMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.4,
      metalness: 0.3
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.1,
      metalness: 0.8
    });

    const proboscisMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.3,
      metalness: 0.4
    });

    const stripeLightMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5
    });

    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.5,
      metalness: 0.2
    });

    // 1. Thorax
    const thoraxGeo = new THREE.SphereGeometry(size * 0.65, 12, 10);
    thoraxGeo.scale(1.0, 1.3, 1.4);
    const thorax = new THREE.Mesh(thoraxGeo, darkChitinMat);
    thorax.position.set(0, size * 0.4, 0);
    group.add(thorax);

    const stripeGeo = new THREE.BoxGeometry(size * 0.12, size * 0.04, size * 1.2);
    const dorsalStripe = new THREE.Mesh(stripeGeo, stripeLightMat);
    dorsalStripe.position.set(0, size * 1.1, 0);
    group.add(dorsalStripe);

    // 2. Head & Eyes
    const headGeo = new THREE.SphereGeometry(size * 0.4, 10, 10);
    const head = new THREE.Mesh(headGeo, darkChitinMat);
    head.position.set(0, size * 0.35, size * 1.05);
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(size * 0.2, 8, 8);
    eyeGeo.scale(1.2, 1.3, 1.0);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-size * 0.28, size * 0.45, size * 1.15);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(size * 0.28, size * 0.45, size * 1.15);
    group.add(rightEye);

    // 3. Proboscis
    const probGeo = new THREE.CylinderGeometry(size * 0.03, size * 0.008, size * 2.8, 6);
    const proboscis = new THREE.Mesh(probGeo, proboscisMat);
    proboscis.rotation.x = Math.PI / 2 + 0.28;
    proboscis.position.set(0, size * 0.12, size * 2.3);
    group.add(proboscis);

    const palpGeo = new THREE.CylinderGeometry(size * 0.015, size * 0.01, size * 1.0, 4);
    const leftPalp = new THREE.Mesh(palpGeo, proboscisMat);
    leftPalp.rotation.x = Math.PI / 2 + 0.15;
    leftPalp.rotation.y = -0.15;
    leftPalp.position.set(-size * 0.1, size * 0.25, size * 1.5);
    group.add(leftPalp);

    const rightPalp = new THREE.Mesh(palpGeo, proboscisMat);
    rightPalp.rotation.x = Math.PI / 2 + 0.15;
    rightPalp.rotation.y = 0.15;
    rightPalp.position.set(size * 0.1, size * 0.25, size * 1.5);
    group.add(rightPalp);

    const antGeo = new THREE.CylinderGeometry(size * 0.012, size * 0.005, size * 1.4, 4);
    const leftAntenna = new THREE.Mesh(antGeo, legMat);
    leftAntenna.rotation.x = Math.PI / 2 - 0.35;
    leftAntenna.rotation.y = -0.55;
    leftAntenna.position.set(-size * 0.18, size * 0.6, size * 1.4);
    group.add(leftAntenna);

    const rightAntenna = new THREE.Mesh(antGeo, legMat);
    rightAntenna.rotation.x = Math.PI / 2 - 0.35;
    rightAntenna.rotation.y = 0.55;
    rightAntenna.position.set(size * 0.18, size * 0.6, size * 1.4);
    group.add(rightAntenna);

    // 4. Abdomen
    const abdomenGroup = new THREE.Group();
    const segCount = 6;
    for (let s = 0; s < segCount; s++) {
      const segT = s / (segCount - 1);
      const segRadius = (size * 0.42) * (1.0 - segT * 0.55);
      const segLength = size * 0.48;
      const segGeo = new THREE.CylinderGeometry(segRadius * 0.88, segRadius, segLength, 8);
      const isStripe = s % 2 === 1;
      const segMesh = new THREE.Mesh(segGeo, isStripe ? stripeLightMat : darkChitinMat);
      segMesh.rotation.x = Math.PI / 2;
      segMesh.position.set(0, 0, -s * segLength);
      abdomenGroup.add(segMesh);
    }
    abdomenGroup.position.set(0, size * 0.25, -size * 0.6);
    abdomenGroup.rotation.x = -0.38;
    group.add(abdomenGroup);

    // 5. Legs
    const legs: THREE.Group[] = [];
    const buildLeg = (femurLen: number, tibiaLen: number, tarsusLen: number, baseAngles: { x: number; y: number; z: number }, side: number) => {
      const legGroup = new THREE.Group();
      
      const femurGeo = new THREE.CylinderGeometry(size * 0.024, size * 0.018, femurLen, 5);
      const femur = new THREE.Mesh(femurGeo, legMat);
      femur.position.y = femurLen / 2;

      const knee = new THREE.Group();
      knee.position.y = femurLen;

      const tibiaGeo = new THREE.CylinderGeometry(size * 0.018, size * 0.012, tibiaLen, 5);
      const tibia = new THREE.Mesh(tibiaGeo, legMat);
      tibia.position.y = -tibiaLen / 2;
      tibia.rotation.z = side * 0.75;
      knee.add(tibia);

      const tarsusGeo = new THREE.CylinderGeometry(size * 0.012, size * 0.006, tarsusLen, 5);
      const tarsus = new THREE.Mesh(tarsusGeo, legMat);
      tarsus.position.set(0, -tibiaLen, 0);
      tarsus.rotation.x = 0.55;
      knee.add(tarsus);

      legGroup.add(femur);
      legGroup.add(knee);
      legGroup.rotation.set(baseAngles.x, baseAngles.y, baseAngles.z);
      return legGroup;
    };

    const legF_L = buildLeg(size * 1.5, size * 1.8, size * 1.4, { x: 0.35, y: -0.45, z: 0.6 }, 1);
    legF_L.position.set(-size * 0.45, size * 0.1, size * 0.5);
    group.add(legF_L);

    const legF_R = buildLeg(size * 1.5, size * 1.8, size * 1.4, { x: 0.35, y: 0.45, z: -0.6 }, -1);
    legF_R.position.set(size * 0.45, size * 0.1, size * 0.5);
    group.add(legF_R);

    const legM_L = buildLeg(size * 1.8, size * 2.2, size * 1.6, { x: -0.15, y: -0.85, z: 0.8 }, 1);
    legM_L.position.set(-size * 0.5, size * 0.05, 0);
    group.add(legM_L);

    const legM_R = buildLeg(size * 1.8, size * 2.2, size * 1.6, { x: -0.15, y: 0.85, z: -0.8 }, -1);
    legM_R.position.set(size * 0.5, size * 0.05, 0);
    group.add(legM_R);

    const legH_L = buildLeg(size * 2.8, size * 3.4, size * 2.2, { x: -0.75, y: -0.3, z: 0.5 }, 1);
    legH_L.position.set(-size * 0.45, size * 0.15, -size * 0.4);
    group.add(legH_L);

    const legH_R = buildLeg(size * 2.8, size * 3.4, size * 2.2, { x: -0.75, y: 0.3, z: -0.5 }, -1);
    legH_R.position.set(size * 0.45, size * 0.15, -size * 0.4);
    group.add(legH_R);

    legs.push(legF_L, legF_R, legM_L, legM_R, legH_L, legH_R);

    // 6. Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-size * 0.45, size * 0.8);
    wingShape.bezierCurveTo(-size * 0.7, size * 2.0, -size * 0.4, size * 3.2, 0, size * 3.5);
    wingShape.bezierCurveTo(size * 0.35, size * 2.4, size * 0.3, size * 1.2, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-size * 0.35, size * 0.95, -size * 0.1);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.z = -0.35;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(size * 0.35, size * 0.95, -size * 0.1);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.z = 0.35;
    rightWing.scale.x = -1;
    group.add(rightWing);

    this.scene.add(group);
    return { group, leftWing, rightWing, legs, bugRef: bug };
  }

  setCameraPreset(preset: string) {
    const lampPos = this.sim.lamp;
    if (preset === 'orbit') {
      this.cameraTargetPos = new THREE.Vector3(0, 2.2, 4.2);
      this.controlsTargetPos = new THREE.Vector3(0, 1.4, 0);
    } else if (preset === 'closeup') {
      this.cameraTargetPos = new THREE.Vector3(lampPos.x + 0.6, lampPos.y + 0.1, lampPos.z + 0.9);
      this.controlsTargetPos = new THREE.Vector3(lampPos.x, lampPos.y, lampPos.z);
    } else if (preset === 'human_pov') {
      this.cameraTargetPos = new THREE.Vector3(this.sim.human.x, 1.1, this.sim.human.z);
      this.controlsTargetPos = new THREE.Vector3(lampPos.x, lampPos.y, lampPos.z);
    } else if (preset === 'topdown') {
      this.cameraTargetPos = new THREE.Vector3(0, 5.2, 0.01);
      this.controlsTargetPos = new THREE.Vector3(0, 0, 0);
    }
  }

  update(dt: number, timeNow: number) {
    if (this.cameraTargetPos && this.controlsTargetPos) {
      this.camera.position.lerp(this.cameraTargetPos, 0.08);
      this.controls.target.lerp(this.controlsTargetPos, 0.08);
      if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.02) {
        this.cameraTargetPos = null;
        this.controlsTargetPos = null;
      }
    }
    this.controls.update();

    this.lampGroup.position.set(this.sim.lamp.x, this.sim.lamp.y, this.sim.lamp.z);
    const cordLength = (this.sim.room.height - this.sim.lamp.y);
    this.suspensionCord.scale.set(1, cordLength / 2, 1);
    this.suspensionCord.position.set(0, cordLength / 2 + 0.28, 0);

    const wl = this.sim.getWavelengthData();
    const wlColor = new THREE.Color(wl.color);
    if (this.uvMat) {
      this.uvMat.emissive.copy(wlColor);
      this.uvMat.emissiveIntensity = this.sim.lamp.isOn ? 2.5 : 0.05;
    }
    if (this.uvPointLight) {
      this.uvPointLight.color.copy(wlColor);
      this.uvPointLight.intensity = this.sim.lamp.isOn ? 3.0 : 0.0;
    }

    const isZapper = this.sim.lamp.trapType === 'zapper' || this.sim.lamp.trapType === 'solar';
    const isSuction = this.sim.lamp.trapType === 'suction';

    if (this.gridMat) {
      this.gridMat.emissiveIntensity = isZapper ? 0.6 + Math.sin(timeNow * 0.01) * 0.2 : 0.05;
      this.gridMesh.visible = isZapper;
    }

    if (this.fanRotor) {
      this.fanRotor.visible = isSuction;
      if (isSuction) {
        this.fanRotor.rotation.y += dt * 35;
      }
    }

    if (this.vortexParticles && this.vortexData) {
      this.vortexParticles.visible = isSuction;
      if (isSuction) {
        const positions = this.vortexParticles.geometry.attributes.position.array as Float32Array;
        const d = this.vortexData;
        for (let i = 0; i < d.count; i++) {
          d.angles[i] += dt * d.speeds[i] * 5.0;
          d.radii[i] -= dt * 0.22;
          d.heights[i] -= dt * 0.35;

          if (d.radii[i] <= 0.04 || d.heights[i] <= -0.22) {
            d.radii[i] = 0.65 + Math.random() * 0.2;
            d.heights[i] = 0.35 + Math.random() * 0.2;
          }

          positions[i * 3] = Math.cos(d.angles[i]) * d.radii[i];
          positions[i * 3 + 1] = d.heights[i];
          positions[i * 3 + 2] = Math.sin(d.angles[i]) * d.radii[i];
        }
        this.vortexParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    const ambientVal = this.sim.ambientLight;
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.15 + ambientVal * 0.7;
    }
    if (this.ceilingLight) {
      this.ceilingLight.intensity = ambientVal * 1.8;
    }

    if (this.humanMesh) {
      this.humanMesh.position.set(this.sim.human.x, 0, this.sim.human.z);
      this.humanMesh.visible = this.sim.human.active;
      if (this.humanAura) {
        const s = 1.0 + Math.sin(timeNow * 0.005) * 0.1;
        this.humanAura.scale.set(s, s, s);
      }
    }

    const activeBugIds = new Set<string>();
    for (const bug of this.sim.insects) {
      activeBugIds.add(bug.id);

      let bugView = this.bugMeshes.get(bug.id);
      if (!bugView) {
        bugView = this.createInsectMesh(bug);
        this.bugMeshes.set(bug.id, bugView);
      }

      if (bug.state === 'trapped') {
        bugView.group.visible = false;
        continue;
      }
      bugView.group.visible = true;

      bugView.group.position.set(bug.x, bug.y, bug.z);

      if (Math.hypot(bug.vx, bug.vy, bug.vz) > 0.01) {
        const target = new THREE.Vector3(bug.x + bug.vx, bug.y + bug.vy, bug.z + bug.vz);
        bugView.group.lookAt(target);
      }

      const wingAngle = Math.sin(bug.wingPhase) * 1.15;
      bugView.leftWing.rotation.z = -0.35 + wingAngle * 0.45;
      bugView.leftWing.rotation.y = wingAngle * 0.25;
      bugView.rightWing.rotation.z = 0.35 - wingAngle * 0.45;
      bugView.rightWing.rotation.y = -wingAngle * 0.25;

      if (bugView.legs) {
        const legSway = Math.sin(timeNow * 0.012 + (bug.wingPhase * 0.1)) * 0.06;
        if (bugView.legs[4]) bugView.legs[4].rotation.x = -0.75 + legSway;
        if (bugView.legs[5]) bugView.legs[5].rotation.x = -0.75 - legSway;
      }
    }

    for (const [id, bugView] of this.bugMeshes.entries()) {
      if (!activeBugIds.has(id)) {
        this.scene.remove(bugView.group);
        this.bugMeshes.delete(id);
      }
    }

    const activeDischarges = this.sim.activeDischarges;
    if (activeDischarges.length > 0 && this.dischargeLine && this.sparkPoints) {
      const disc = activeDischarges[0];
      const posAttr = this.dischargeLine.geometry.attributes.position as THREE.BufferAttribute;
      const pts = 8;
      for (let p = 0; p < pts; p++) {
        const frac = p / (pts - 1);
        const jx = disc.startX + (disc.endX - disc.startX) * frac + (p > 0 && p < pts - 1 ? (Math.random() - 0.5) * 0.04 : 0);
        const jy = disc.startY + (disc.endY - disc.startY) * frac + (p > 0 && p < pts - 1 ? (Math.random() - 0.5) * 0.04 : 0);
        const jz = disc.startZ + (disc.endZ - disc.startZ) * frac + (p > 0 && p < pts - 1 ? (Math.random() - 0.5) * 0.04 : 0);
        posAttr.setXYZ(p, jx, jy, jz);
      }
      posAttr.needsUpdate = true;
      this.dischargeLine.geometry.setDrawRange(0, pts);
      this.dischargeLine.visible = true;

      const sAttr = this.sparkPoints.geometry.attributes.position as THREE.BufferAttribute;
      let sIdx = 0;
      for (const sp of disc.sparks) {
        if (sIdx >= 35) break;
        sAttr.setXYZ(sIdx++, sp.x, sp.y, sp.z);
      }
      sAttr.needsUpdate = true;
      this.sparkPoints.geometry.setDrawRange(0, sIdx);
      this.sparkPoints.visible = sIdx > 0;
    } else {
      if (this.dischargeLine) {
        this.dischargeLine.visible = false;
        this.dischargeLine.geometry.setDrawRange(0, 0);
      }
      if (this.sparkPoints) {
        this.sparkPoints.visible = false;
        this.sparkPoints.geometry.setDrawRange(0, 0);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
