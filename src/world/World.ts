import * as THREE from "three";
import type { RunnerItem, Settings } from "../types";

const C = {
  grass: 0x9bb377,
  grassDark: 0x78995b,
  cream: 0xf3e6c9,
  wall: 0xa64c37,
  roof: 0x8d3d30,
  green: 0x294d41,
  path: 0xe6cfaa,
  coral: 0xd86545,
  ink: 0x263c36,
  teal: 0x72a9a3,
  gold: 0xe9b64d,
};
const materials = new Map<number, THREE.MeshStandardMaterial>();
const material = (color: number) => {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      flatShading: true,
    });
    materials.set(color, m);
  }
  return m;
};
const boxGeo = new THREE.BoxGeometry();
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
) {
  const m = new THREE.Mesh(boxGeo, material(color));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// One shared, procedural running-bond texture. UVs keep bricks the same size
// on buildings of different dimensions, without adding individual brick meshes.
let brickMaterial: THREE.MeshStandardMaterial | undefined;
function brickBox(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  if (!brickMaterial) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#795348";
    ctx.fillRect(0, 0, 256, 256);
    const shades = ["#a54c38", "#b45740", "#994431", "#ad5039", "#a14a36"];
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        ctx.fillStyle = shades[(row * 7 + col + 10) % shades.length];
        ctx.fillRect(col * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    brickMaterial = new THREE.MeshStandardMaterial({ map, roughness: 1 });
  }
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv;
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  faces.forEach(([width, height], face) => {
    for (let i = face * 4; i < face * 4 + 4; i++)
      uv.setXY(i, (uv.getX(i) * width) / 4, (uv.getY(i) * height) / 4);
  });
  const mesh = new THREE.Mesh(geometry, brickMaterial);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  color: number,
) {
  const m = new THREE.Mesh(cylGeo, material(color));
  m.position.set(x, y, z);
  m.scale.set(radius, height, radius);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const icoGeo = new THREE.IcosahedronGeometry(1, 0);
function blob(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: number,
  color: number,
) {
  const m = new THREE.Mesh(icoGeo, material(color));
  m.position.set(x, y, z);
  m.scale.setScalar(scale);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const labelCache = new Map<string, THREE.MeshBasicMaterial>();
function label(
  parent: THREE.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  bg = "#294d41",
  fg = "#fff3d7",
) {
  const key = `${text}:${bg}:${fg}`;
  let mat = labelCache.get(key);
  if (!mat) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${text === "$1" ? 110 : text.length > 21 ? 24 : 35}px sans-serif`;
    ctx.fillText(text, 256, 67, 486);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    mat = new THREE.MeshBasicMaterial({ map: texture });
    labelCache.set(key, mat);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function tree(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  parent.add(g);
  cylinder(g, 0, 1.2, 0, 0.19, 2.4, 0x836748);
  blob(g, 0, 3.1, 0, 1.6, C.grassDark);
  blob(g, 0.8, 2.8, 0.2, 1.05, C.grass);
  blob(g, -0.65, 3.4, 0.1, 0.95, 0xa9bc75);
}
function building(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  height: number,
  name: string,
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  brickBox(g, 0, height / 2, 0, width, height, 4.2);
  box(g, 0, height + 0.12, 0, width + 0.5, 0.3, 4.7, C.roof);
  box(g, 0, 0.2, 2.45, width + 0.6, 0.4, 1, C.cream);
  box(g, 0, height * 0.55, 2.2, width + 0.15, 0.17, 0.3, C.cream);
  for (let i = -Math.floor(width / 3); i <= Math.floor(width / 3); i++) {
    for (let j = 0; j < 2; j++) {
      if (i === 0 && j === 0) continue;
      const wx = i * 1.4;
      const wy = 1.5 + j * (height * 0.46);
      box(g, wx, wy, 2.14, 0.9, 1.4, 0.1, C.ink);
      box(g, wx, wy, 2.22, 0.08, 1.45, 0.1, C.cream);
      box(g, wx, wy, 2.22, 0.98, 0.08, 0.1, C.cream);
      box(g, wx, wy - 0.8, 2.28, 1.2, 0.18, 0.45, C.roof);
    }
  }
  box(g, 0, 1.25, 2.18, 1.2, 2.5, 0.12, C.ink);
  label(g, name, 0, height - 0.8, 2.28, width * 0.77, 0.75);
  // Windows, trim, and masonry share a few instanced draw calls per building.
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...g.children])
    if (
      child instanceof THREE.Mesh &&
      child.geometry === boxGeo &&
      !Array.isArray(child.material)
    ) {
      const batch = batches.get(child.material) ?? [];
      batch.push(child);
      batches.set(child.material, batch);
    }
  for (const [mat, meshes] of batches) {
    const instances = new THREE.InstancedMesh(boxGeo, mat, meshes.length);
    meshes.forEach((mesh, i) => {
      mesh.updateMatrix();
      instances.setMatrixAt(i, mesh.matrix);
      g.remove(mesh);
    });
    instances.castShadow = true;
    instances.receiveShadow = true;
    instances.computeBoundingSphere();
    g.add(instances);
  }
  g.userData.building = true;
  return g;
}
export class Character {
  group = new THREE.Group();
  leftLeg = new THREE.Group();
  rightLeg = new THREE.Group();
  leftArm = new THREE.Group();
  rightArm = new THREE.Group();
  constructor(registrar = false) {
    const g = this.group;
    const suit = registrar ? C.ink : C.coral;
    box(g, 0, 1.35, 0, registrar ? 1.08 : 0.8, 1.13, 0.55, suit);
    box(g, 0, 1.65, 0.29, 0.3, 0.45, 0.025, C.cream);
    if (registrar) {
      const tie = box(g, 0, 1.42, 0.33, 0.13, 0.55, 0.06, C.coral);
      tie.rotation.z = -0.1;
    } else {
      box(g, 0, 1.35, -0.44, 0.67, 0.85, 0.4, C.gold);
      box(g, 0, 1.13, -0.67, 0.47, 0.32, 0.08, C.roof);
    }
    box(g, 0, 2.2, 0, 0.83, 0.82, 0.72, 0xc9956c);
    box(g, 0, 2.62, -0.05, 0.91, 0.22, 0.79, 0x343b31);
    box(g, -0.37, 2.4, -0.05, 0.17, 0.4, 0.77, 0x343b31);
    for (const x of [-0.19, 0.19]) {
      box(
        g,
        x,
        2.23,
        0.373,
        registrar ? 0.25 : 0.09,
        registrar ? 0.2 : 0.1,
        0.035,
        C.ink,
      );
      if (registrar) box(g, x, 2.24, 0.397, 0.15, 0.09, 0.02, 0xbcd0b1);
      const brow = box(g, x, 2.4, 0.38, 0.23, 0.05, 0.03, C.ink);
      brow.rotation.z = x < 0 ? -0.12 : 0.12;
    }
    box(g, 0, 2.12, 0.43, 0.12, 0.15, 0.18, 0xb7845c);
    box(g, 0, 1.99, 0.378, registrar ? 0.27 : 0.19, 0.045, 0.03, C.ink);
    for (const [part, x] of [
      [this.leftLeg, -0.23],
      [this.rightLeg, 0.23],
    ] as const) {
      part.position.set(x, 0.86, 0);
      g.add(part);
      box(part, 0, -0.35, 0, 0.29, 0.7, 0.34, C.ink);
      box(
        part,
        0,
        -0.72,
        0.08,
        0.36,
        0.2,
        0.56,
        registrar ? 0x182620 : C.cream,
      );
    }
    for (const [part, x] of [
      [this.leftArm, -0.61],
      [this.rightArm, 0.61],
    ] as const) {
      part.position.set(x, 1.77, 0);
      g.add(part);
      box(part, 0, -0.27, 0, 0.3, 0.65, 0.36, suit);
      box(part, 0, -0.65, 0, 0.26, 0.22, 0.3, 0xc9956c);
    }
    if (registrar) {
      this.rightArm.rotation.x = -0.7;
      cylinder(this.rightArm, 0, -0.6, 0.38, 0.18, 0.9, C.roof);
      box(this.rightArm, 0, -1.08, 0.38, 1.25, 0.26, 0.8, C.coral);
      box(this.rightArm, 0, -1.25, 0.38, 1.2, 0.09, 0.77, C.ink);
      this.leftArm.rotation.x = -0.8;
      for (let i = 0; i < 7; i++)
        box(
          this.leftArm,
          -0.05,
          -0.53 + i * 0.09,
          0.46,
          0.92,
          0.07,
          0.75,
          i % 2 ? C.cream : 0xfff7e5,
        );
    }
  }
  animate(t: number, run = false, slide = false, registrar = false) {
    const stride = run ? Math.sin(t * 12) * 0.75 : Math.sin(t * 2) * 0.045;
    this.leftLeg.rotation.x = stride;
    this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.x = registrar ? -0.8 : -stride * 0.8;
    this.rightArm.rotation.x = registrar
      ? -0.7 + Math.sin(t * 2) * 0.06
      : stride * 0.8;
    this.group.scale.y = THREE.MathUtils.lerp(
      this.group.scale.y,
      slide ? 0.46 : 1,
      0.24,
    );
  }
}
export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  menu = new THREE.Group();
  runner = new THREE.Group();
  office = new THREE.Group();
  student = new Character();
  registrar = new Character(true);
  menuStudent = new Character();
  menuRegistrar = new Character(true);
  officeRegistrar = new Character(true);
  deskStudent = new Character();
  envelope = new THREE.Group();
  papers: THREE.Mesh[] = [];
  props: THREE.Group[] = [];
  itemMeshes: THREE.Group[] = [];
  gates: THREE.Group[] = [];
  officePapers: THREE.Mesh[] = [];
  light: THREE.DirectionalLight;
  mode = "menu";
  time = 0;
  screenShake = 0;
  stampMotion = 0;
  worldDistance = 0;
  attachmentFlip = 0;
  private target = new THREE.Vector3();
  private zone = -1;
  private arches: THREE.Group[] = [];
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
  }[] = [];
  private shadow: THREE.Mesh;
  private marker: THREE.Mesh;
  constructor(
    private canvas: HTMLCanvasElement,
    private settings: () => Settings,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf2efdf, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff6de, 0x8c9f76, 2.6));
    this.light = new THREE.DirectionalLight(0xffe5b8, 3.2);
    this.light.position.set(-15, 28, 16);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    Object.assign(this.light.shadow.camera, {
      left: -28,
      right: 28,
      top: 28,
      bottom: -28,
      far: 85,
    });
    this.light.shadow.bias = -0.002;
    this.scene.add(this.light);
    this.scene.add(this.menu, this.runner, this.office);
    this.buildMenu();
    this.buildRunner();
    this.buildOffice();
    for (let i = 0; i < 24; i++) {
      const mesh = box(
        this.runner,
        0,
        0,
        0,
        0.13,
        0.035,
        0.22,
        i % 3 ? C.cream : 0x67b77b,
      );
      mesh.castShadow = false;
      mesh.visible = false;
      this.particles.push({ mesh, velocity: new THREE.Vector3(), life: 0 });
    }
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.67, 20),
      new THREE.MeshBasicMaterial({
        color: C.ink,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, 0.025, 4);
    this.runner.add(this.shadow);
    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.8, 3),
      material(C.gold),
    );
    this.marker.rotation.x = Math.PI;
    this.runner.add(this.marker);
    this.setMode("menu");
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  buildMenu() {
    const g = this.menu;
    box(g, 0, -0.66, 0, 27, 1.25, 22, 0xb3a182);
    box(g, 0, 0, 0, 27.2, 0.3, 22.2, C.grass);
    box(g, 0, 0.18, 1, 5.5, 0.12, 20, C.path);
    box(g, 0, 0.2, 4.2, 27, 0.12, 3.2, C.path);
    building(g, 0, -6.5, 13, 6.5, "ACADEMIC BLOCK");
    brickBox(g, 0, 7.2, -6.5, 4, 1.1, 4.4);
    const ped = new THREE.Mesh(
      new THREE.ConeGeometry(3.1, 1.4, 4),
      material(C.roof),
    );
    ped.rotation.y = Math.PI / 4;
    ped.position.set(0, 8.4, -6.5);
    g.add(ped);
    const clock = cylinder(g, 0, 7.1, -4.23, 0.47, 0.07, C.cream);
    clock.rotation.x = Math.PI / 2;
    box(g, 0, 7.23, -4.15, 0.045, 0.3, 0.03, C.ink);
    box(g, 0.12, 7.08, -4.15, 0.27, 0.045, 0.03, C.ink);
    for (const x of [-3, -1.6, 1.6, 3]) {
      cylinder(g, x, 1.8, -3.5, 0.19, 3.5, C.cream);
      box(g, x, 0.38, -3.5, 0.65, 0.2, 0.65, C.cream);
    }
    box(g, 0, 3.6, -3.55, 7.1, 0.28, 2, C.roof);
    building(g, -10, -5.8, 4, 3.6, "LIBRARY");
    for (const [x, z, s] of [
      [-9, 1, 1.2],
      [-10, 7, 1.2],
      [10, -7, 1.4],
      [10, 1, 1.15],
      [9, 8, 1],
      [-5, -8, 0.85],
      [5, -8, 0.9],
    ])
      tree(g, x, z, s);
    for (const x of [-5.5, 6]) {
      box(g, x, 0.6, 6, 2.6, 0.17, 0.65, C.roof);
      box(g, x, 1.08, 6.26, 2.6, 0.65, 0.12, C.roof);
      for (const dx of [-0.9, 0.9])
        box(g, x + dx, 0.3, 6, 0.14, 0.6, 0.6, C.ink);
    }
    for (const x of [-3.8, 3.8]) {
      cylinder(g, x, 1.8, 2.6, 0.09, 3.5, C.ink);
      blob(g, x, 3.65, 2.6, 0.32, C.cream);
    }
    box(g, 6, 1, -0.2, 0.15, 2, 0.15, C.ink);
    label(g, "RED HAVEN", 6, 2.1, -0.08, 3.5, 0.8);
    label(g, "EXAM WEEK: RED HELL", 6, 1.5, -0.08, 3.5, 0.4, "#8d3d30");
    this.menuStudent.group.position.set(-1.8, 0.3, 7);
    this.menuStudent.group.rotation.y = -0.45;
    this.menuStudent.group.scale.setScalar(1.4);
    g.add(this.menuStudent.group);
    this.menuRegistrar.group.position.set(3.1, 0.3, 2);
    this.menuRegistrar.group.rotation.y = 0.25;
    this.menuRegistrar.group.scale.setScalar(1.65);
    g.add(this.menuRegistrar.group);
    for (let i = 0; i < 10; i++) {
      const p = box(
        g,
        4 + Math.sin(i) * 2.1,
        2 + (i % 4),
        1 + Math.cos(i) * 2,
        0.65,
        0.035,
        0.9,
        0xfff7e8,
      );
      p.rotation.set(i * 0.7, i * 0.3, i * 0.4);
      this.papers.push(p);
    }
    label(
      g,
      "FINAL_v7.pdf",
      2.6,
      0.37,
      6,
      1.4,
      0.45,
      "#fff7e5",
      "#294d41",
    ).rotation.x = -Math.PI / 2;
    // Low-poly shrubs and flower patches establish scale without textures.
    for (let i = 0; i < 22; i++) {
      const x = (i % 2 ? -1 : 1) * (7 + (i % 4));
      const z = -9 + ((i * 3.7) % 19);
      blob(g, x, 0.35, z, 0.5, i % 3 ? C.grassDark : 0xd9bb70);
    }
  }
  buildRunner() {
    const g = this.runner;
    const ground = box(g, 0, -0.25, -32, 110, 0.4, 160, C.grass);
    ground.name = "ground";
    ground.material = material(C.grass).clone();
    box(g, 0, 0, -35, 10.4, 0.12, 155, C.path);
    for (const x of [-5.35, 5.35])
      box(g, x, 0.15, -35, 0.25, 0.35, 155, C.cream);
    for (let i = 0; i < 14; i++) {
      const row = new THREE.Group();
      row.position.z = -i * 8;
      g.add(row);
      this.props.push(row);
      for (const x of [-1.7, 1.7])
        box(row, x, 0.075, 0, 0.07, 0.02, 2.5, 0xf5e8cc);
      tree(row, -7.5 - (i % 3), 0, 0.75 + (i % 3) * 0.15);
      tree(row, 8 + (i % 2), -3, 0.9);
      if (i % 3 === 0) {
        building(
          row,
          -14,
          -4,
          8,
          5 + (i % 3),
          ["LIBRARY", "ACADEMIC BLOCK", "EXAM HALL", "REGISTRAR"][i % 4],
        );
        building(row, 15, -7, 9, 5, "RED HAVEN");
      }
      if (i % 2 === 0) {
        cylinder(row, 5.9, 1.7, 2, 0.07, 3.4, C.ink);
        blob(row, 5.9, 3.55, 2, 0.27, C.cream);
      }
    }
    for (let i = 0; i < 5; i++) {
      const arch = new THREE.Group();
      this.runner.add(arch);
      this.arches.push(arch);
      for (const x of [-5.8, 5.8]) {
        brickBox(arch, x, 2.7, 0, 0.65, 5.4, 0.7);
        box(arch, x, 0.25, 0, 1.1, 0.5, 1.1, C.wall);
      }
      box(arch, 0, 5.5, 0, 12.6, 0.65, 1.25, C.roof);
      arch.visible = false;
    }
    this.student.group.rotation.y = Math.PI;
    this.student.group.position.z = 4;
    g.add(this.student.group);
    this.registrar.group.position.set(0, 0, 7.5);
    this.registrar.group.rotation.y = Math.PI;
    this.registrar.group.scale.setScalar(1.6);
    g.add(this.registrar.group);
    for (let lane = 0; lane < 3; lane++) {
      const gate = new THREE.Group();
      gate.position.set((lane - 1) * 3.3, 0, -65);
      g.add(gate);
      this.gates.push(gate);
      for (const x of [-1.45, 1.45])
        box(gate, x, 1.65, 0, 0.18, 3.3, 0.2, C.ink);
      box(gate, 0, 3.35, 0, 3.1, 0.78, 0.2, C.ink);
      label(gate, ["301", "402", "302"][lane], 0, 3.35, 0.13, 2.7, 0.65);
      const pad = box(gate, 0, 0.09, 0, 3, 0.08, 4.4, C.gold);
      pad.name = "pad";
    }
  }
  buildOffice() {
    const g = this.office;
    box(g, 0, -0.4, 0, 19, 0.8, 15, C.path);
    for (let i = -8; i < 9; i += 2)
      box(g, i, 0.012, 0, 0.018, 0.02, 15, 0xc4b594);
    brickBox(g, 0, 3.1, -7, 19, 6.2, 0.3);
    brickBox(g, -9.3, 3.1, 0, 0.3, 6.2, 14);
    box(g, -5.8, 3.6, -6.8, 4.5, 3.1, 0.15, C.teal);
    for (const x of [-7.3, -5.8, -4.3])
      box(g, x, 3.6, -6.65, 0.14, 3.1, 0.2, C.cream);
    box(g, -5.8, 3.6, -6.6, 4.5, 0.14, 0.15, C.cream);
    label(g, "OFFICE OF THE REGISTRAR", 2, 4.7, -6.78, 6, 1).name =
      "office-sign";
    label(g, "UPR · STUDENT COMMON ROOM", 2, 4.7, -6.77, 6, 1).name =
      "student-sign";
    box(g, 1.2, 1.9, 0, 8.5, 0.45, 3.8, C.roof);
    for (const x of [-2.3, 4.7])
      for (const z of [-1.3, 1.3]) box(g, x, 0.9, z, 0.32, 1.8, 0.32, C.ink);
    box(g, 0, 2.8, -0.75, 2.1, 1.35, 0.13, C.ink);
    label(
      g,
      "PLEASE FIND ATTACHED.",
      0,
      2.8,
      -0.66,
      1.9,
      1.1,
      "#b7cba7",
      "#294d41",
    ).name = "office-screen";
    label(
      g,
      "UPR MAIL · 4 UNREAD",
      0,
      2.8,
      -0.65,
      1.9,
      1.1,
      "#b7cba7",
      "#294d41",
    ).name = "student-screen";
    box(g, 0, 2.17, -0.2, 2.2, 0.06, 0.95, C.ink);
    cylinder(g, -1.9, 2.39, 0.5, 0.26, 0.52, C.cream);
    cylinder(g, -1.9, 2.66, 0.5, 0.21, 0.02, 0x594535);
    this.officeRegistrar.group.position.set(2.4, 0.15, -2.9);
    this.officeRegistrar.group.scale.setScalar(1.35);
    g.add(this.officeRegistrar.group);
    box(g, 2.4, 1.55, -3.3, 1.5, 2.3, 0.35, C.green);
    this.deskStudent.group.position.set(0.2, 0.15, -2.5);
    this.deskStudent.group.scale.setScalar(1.3);
    g.add(this.deskStudent.group);
    const envelope = this.envelope;
    envelope.position.set(2.8, 4, 0.2);
    g.add(envelope);
    box(envelope, 0, 0, 0, 3.1, 2.1, 0.13, C.cream);
    const flap = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 1.45, 3),
      material(0xe3cf9d),
    );
    flap.rotation.z = Math.PI;
    flap.rotation.x = Math.PI / 2;
    flap.scale.z = 0.04;
    flap.position.set(0, 0.2, 0.13);
    envelope.add(flap);
    label(
      envelope,
      "PLEASE FIND ATTACHED.",
      0,
      -0.55,
      0.14,
      2.7,
      0.45,
      "#f3e6c9",
      "#294d41",
    );
    for (let i = 0; i < 22; i++) {
      const p = box(
        g,
        3.6 + Math.sin(i * 5) * 0.12,
        2.18 + i * 0.15,
        0.1,
        1.65,
        0.115,
        1.25,
        i % 3 ? 0xfff6df : C.gold,
      );
      p.rotation.y = Math.sin(i) * 0.07;
      this.officePapers.push(p);
    }
    label(g, "IN", 3.6, 2.4, 0.8, 0.55, 0.3);
    box(g, -6.4, 1.3, -3.6, 2.2, 2.6, 1.7, C.green);
    for (let i = 0; i < 3; i++) {
      box(g, -6.4, 0.5 + i * 0.8, -2.7, 1.9, 0.68, 0.07, C.teal);
      box(g, -6.4, 0.5 + i * 0.8, -2.61, 0.4, 0.07, 0.06, C.cream);
    }
    box(g, -6.4, 2.95, -3.6, 2.3, 0.7, 1.6, C.cream);
    box(g, -6.4, 3.3, -3.6, 1.7, 0.12, 1.3, C.ink);
    box(g, -6.4, 3.6, -3.9, 1, 0.65, 0.07, 0xfff6e6);
    tree(g, 7.5, -4.8, 0.6);
    label(
      g,
      "CLARITY IS OPTIONAL",
      5.8,
      2.9,
      -6.75,
      3.9,
      0.6,
      "#f4e5c4",
      "#a5523d",
    );
    for (let i = 0; i < 6; i++)
      box(
        g,
        -4.5 + i * 0.8,
        0.1,
        3 + Math.sin(i) * 0.4,
        0.7,
        0.025,
        0.9,
        C.cream,
      ).rotation.y = i;
  }
  createItem(kind: RunnerItem["kind"]) {
    const g = new THREE.Group();
    g.userData.kind = kind;
    this.runner.add(g);
    switch (kind) {
      case "stack":
        for (let i = 0; i < 6; i++)
          box(
            g,
            Math.sin(i) * 0.1,
            0.15 + i * 0.17,
            0,
            1.8,
            0.14,
            1.1,
            i % 2 ? C.cream : 0xfaf2db,
          );
        label(g, "FINAL.pdf", 0, 0.65, 0.57, 1.5, 0.45, "#fff3db", "#294d41");
        break;
      case "desk":
        box(g, 0, 0.9, 0, 2, 0.22, 1.2, C.roof);
        for (const x of [-0.8, 0.8]) box(g, x, 0.4, 0, 0.14, 0.8, 0.9, C.ink);
        break;
      case "bar":
        for (const x of [-1.25, 1.25]) box(g, x, 1.7, 0, 0.17, 3.4, 0.4, C.ink);
        box(g, 0, 2.3, 0, 2.7, 1.3, 0.4, C.coral);
        label(g, "DUCK · LOW CLEARANCE", 0, 2.3, 0.22, 2.5, 0.8);
        break;
      case "cabinet":
        box(g, 0, 1.5, 0, 1.8, 3, 1.2, C.green);
        for (let i = 0; i < 3; i++) {
          box(g, 0, 0.55 + i * 0.9, 0.63, 1.6, 0.75, 0.1, C.teal);
          box(g, 0, 0.55 + i * 0.9, 0.7, 0.45, 0.1, 0.1, C.cream);
        }
        break;
      case "stamp":
        box(g, 0, 0.5, 0, 2.4, 1, 1.6, C.coral);
        cylinder(g, 0, 1.6, 0, 0.3, 1.4, C.roof);
        break;
      case "token": {
        const bill = new THREE.Group();
        g.add(bill);
        box(bill, 0, 0, 0, 1.3, 0.65, 0.06, 0x286947);
        box(bill, 0, 0, 0, 1.16, 0.51, 0.075, 0xb9dab0);
        label(bill, "$1", 0, 0, 0.045, 0.95, 0.43, "#b9dab0", "#245d3e");
        label(
          bill,
          "$1",
          0,
          0,
          -0.045,
          0.95,
          0.43,
          "#b9dab0",
          "#245d3e",
        ).rotation.y = Math.PI;
        break;
      }
      default: {
        const color =
          kind === "shield" ? C.teal : kind === "coffee" ? C.coral : 0x9fa2c7;
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.62),
          material(color),
        );
        orb.position.y = 1.2;
        g.add(orb);
        label(
          g,
          {
            shield: "ADMIT",
            coffee: "COFFEE",
            screenshot: "LOCK",
            groupchat: "CHAT",
            compare: "COMPARE",
            read: "FOCUS",
          }[kind],
          0,
          2.05,
          0.1,
          1.8,
          0.44,
        );
      }
    }
    this.itemMeshes.push(g);
    return g;
  }
  resetItems() {
    for (const g of this.itemMeshes) g.visible = false;
  }
  syncItems(items: RunnerItem[]) {
    for (const g of this.itemMeshes) g.userData.used = false;
    for (const item of items) {
      if (!item.active) continue;
      let mesh = this.itemMeshes.find(
        (g) => g.userData.kind === item.kind && !g.userData.used,
      );
      mesh ??= this.createItem(item.kind);
      mesh.userData.used = true;
      mesh.visible = true;
      mesh.position.set((item.lane - 1) * 3.3, 0, item.z);
      if (
        [
          "token",
          "shield",
          "coffee",
          "screenshot",
          "groupchat",
          "compare",
          "read",
        ].includes(item.kind)
      ) {
        mesh.children[0].rotation.y = this.time * 2;
        mesh.children[0].position.y =
          1.3 + Math.sin(this.time * 3 + item.z) * 0.12;
      }
    }
    for (const g of this.itemMeshes) if (!g.userData.used) g.visible = false;
  }
  burst(x: number) {
    this.particles.forEach((p, i) => {
      p.life = 0.7 + (i % 5) * 0.12;
      p.mesh.visible = true;
      p.mesh.position.set(x, 1.3, 4);
      p.velocity.set(Math.sin(i * 2.4) * 3, 2 + (i % 4), Math.cos(i * 2.4) * 2);
    });
  }
  private setZone(zone: number) {
    if (this.zone === zone) return;
    this.zone = zone;
    const ground = this.runner.getObjectByName("ground") as THREE.Mesh<
      THREE.BoxGeometry,
      THREE.MeshStandardMaterial
    >;
    ground.material.color.setHex(
      [C.grass, 0xb3b784, 0x92aa75, 0xaebf84, 0xa7aa86, 0xc0b79c][zone],
    );
    this.props.forEach((p) =>
      p.children.forEach((c) => {
        if (c.userData.building) c.visible = zone !== 3;
      }),
    );
    this.arches.forEach((a) => {
      a.visible = zone === 1 || zone === 4 || zone === 5;
    });
  }
  setMode(mode: string) {
    this.canvas.setAttribute(
      "aria-label",
      mode === "menu"
        ? "Animated 3D university campus"
        : mode === "survival"
          ? "Three-lane campus runner"
          : "The Registrar’s 3D office",
    );
    this.mode = mode;
    this.camera.fov = 38;
    this.menu.visible = mode === "menu";
    this.runner.visible = mode === "survival";
    this.office.visible = mode !== "menu" && mode !== "survival";
    document.body.dataset.world =
      mode === "menu" ? "menu" : mode === "survival" ? "runner" : "office";
    this.officeRegistrar.group.visible = mode === "simulator";
    this.deskStudent.group.visible = mode === "inbox" || mode === "roulette";
    this.envelope.visible = mode === "roulette";
    for (const name of ["office-sign", "office-screen"])
      this.office.getObjectByName(name)!.visible = mode === "simulator";
    for (const name of ["student-sign", "student-screen"])
      this.office.getObjectByName(name)!.visible = mode !== "simulator";
    this.scene.fog =
      mode === "survival" ? new THREE.Fog(0xe8ead6, 42, 110) : null;
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }
  update(
    dt: number,
    state?: {
      x: number;
      jump: number;
      slide: boolean;
      speed: number;
      boss: boolean;
      gateZ: number;
      roomLane: number;
      shield: boolean;
      distance: number;
      boost: boolean;
    },
  ) {
    this.time += dt;
    const t = this.time;
    if (this.mode === "menu") {
      const compact = this.camera.aspect < 0.9;
      this.camera.position.set(
        compact ? 31 : 29,
        compact ? 29 : 25,
        compact ? 39 : 34,
      );
      this.target.set(0, 1.2, 0);
      this.menu.rotation.y = Math.sin(t * 0.1) * 0.025;
      this.menuStudent.animate(t);
      this.menuStudent.group.scale.y = 1.4;
      this.menuRegistrar.animate(t, false, false, true);
      this.menuRegistrar.group.scale.y = 1.65;
      this.menuRegistrar.group.position.y = 0.3 + Math.sin(t * 1.4) * 0.05;
      this.papers.forEach((p, i) => {
        p.position.y = 2.5 + (i % 4) + Math.sin(t * 0.8 + i) * 0.45;
        p.rotation.z = Math.sin(t * 0.65 + i) * 0.55;
      });
    } else if (this.mode === "survival" && state) {
      this.worldDistance = state.distance;
      this.setZone(Math.floor(state.distance / 500) % 6);
      this.arches.forEach((a, i) => {
        a.position.z =
          ((((this.worldDistance - i * 22) % 110) + 110) % 110) - 100;
      });
      this.particles.forEach((p) => {
        if (p.life <= 0) return;
        p.life -= dt;
        p.mesh.visible = p.life > 0;
        p.velocity.y -= dt * 7;
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.rotation.x += dt * 4;
        p.mesh.rotation.z += dt * 3;
      });
      this.props.forEach((p, i) => {
        p.position.z =
          ((((this.worldDistance - i * 8) % 112) + 112) % 112) - 100;
      });
      this.student.group.position.set(
        state.x,
        state.jump +
          0.13 +
          Math.abs(Math.sin(t * 12)) * (state.speed > 0 ? 0.055 : 0),
        4,
      );
      this.student.animate(t, state.speed > 0, state.slide);
      this.student.group.rotation.z = THREE.MathUtils.lerp(
        this.student.group.rotation.z,
        -state.x * 0.025,
        0.1,
      );
      this.shadow.position.x = state.x;
      this.shadow.scale.setScalar(1 - state.jump * 0.15);
      this.registrar.group.visible = state.boss;
      this.registrar.group.position.x = Math.sin(t * 0.5) * 3.3;
      this.registrar.animate(t, true, false, true);
      this.registrar.group.scale.y = 1.6;
      this.gates.forEach((g, i) => {
        g.position.z = state.gateZ;
        g.visible = state.gateZ > -100;
        (g.getObjectByName("pad") as THREE.Mesh).material = material(
          i === state.roomLane ? 0x98c578 : 0xc5b597,
        );
      });
      this.marker.visible = state.gateZ > -100 || state.shield;
      this.marker.position.set(
        (state.roomLane - 1) * 3.3,
        4.7 + Math.sin(t * 3) * 0.16,
        Math.max(-18, Math.min(-2, state.gateZ)),
      );
      const shake = this.settings().reducedShake ? 0 : this.screenShake;
      const narrow = this.camera.aspect < 0.8;
      this.camera.fov = THREE.MathUtils.lerp(
        this.camera.fov,
        (narrow ? 42 : 38) + (state.boost ? 2 : 0),
        0.07,
      );
      this.camera.updateProjectionMatrix();
      this.camera.position.set(
        state.x * 0.1 + Math.sin(t * 51) * shake,
        narrow ? 8.5 : 7.3,
        narrow ? 27 : 17.8,
      );
      this.target.set(state.x * 0.05, 1.5, -10);
      this.screenShake = Math.max(0, this.screenShake - dt * 1.4);
    } else {
      this.camera.position.set(19, 17, 24);
      this.target.set(-0.3, 1.5, -0.5);
      this.deskStudent.animate(t);
      this.deskStudent.group.scale.y = 1.3;
      this.envelope.position.y = 4.2 + Math.sin(t * 1.4) * 0.15;
      this.envelope.rotation.y = Math.sin(t * 0.7) * 0.1;
      this.attachmentFlip = Math.max(0, this.attachmentFlip - dt);
      this.envelope.rotation.x = Math.sin(this.attachmentFlip * 8) * 0.2;
      this.officeRegistrar.animate(t, false, false, true);
      this.officeRegistrar.group.scale.y = 1.35;
      if (this.stampMotion > 0) {
        this.stampMotion -= dt;
        this.officeRegistrar.rightArm.rotation.x =
          -0.7 - Math.sin(this.stampMotion * 8) * 0.9;
      }
    }
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }
  setStack(count: number) {
    this.officePapers.forEach((p, i) => {
      p.visible = i < Math.max(2, Math.min(22, count + 2));
    });
    this.stampMotion = 0.5;
  }
}
