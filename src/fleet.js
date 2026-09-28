import * as THREE from "three";

export const MAX_SATELLITES = 24;
const TAU = Math.PI * 2;
const catalog = [
  ["Padma", "Bangladesh", "Delta Space Lab", "Earth observation"],
  ["Aster", "Japan", "Aster Research", "Climate imaging"],
  ["Aurora", "Canada", "Northern Orbit Lab", "Communications"],
  ["Saffron", "India", "Saffron Space Lab", "Navigation research"],
  ["Lumen", "Germany", "Lumen Aerospace", "Atmosphere sensing"],
  ["Atlas", "United States", "Atlas Research", "Weather monitoring"],
  ["Cedar", "United Kingdom", "Cedar Space Lab", "Ocean monitoring"],
  ["Orion", "Brazil", "Orion Research", "Forest mapping"],
];
const colors = [
  "#80dfd2",
  "#9cb4ff",
  "#efc28a",
  "#d3a2ed",
  "#a6d89d",
  "#ed9ba3",
];

// Rotate a circular orbit about X (inclination), then about Y (ascending node).
export function orbitPosition(
  angle,
  radius,
  inclination,
  node,
  out = new THREE.Vector3(),
) {
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle) * Math.sin(inclination);
  const z = radius * Math.sin(angle) * Math.cos(inclination);
  return out.set(
    x * Math.cos(node) + z * Math.sin(node),
    y,
    -x * Math.sin(node) + z * Math.cos(node),
  );
}

export class SatelliteFleet {
  constructor(scene, template, orbitTexture) {
    this.scene = scene;
    this.template = template;
    this.orbitTexture = orbitTexture;
    this.items = [];
    this.nextId = 1;
    this.textureIndex = 0;
    this.showOrbits = true;
  }
  add() {
    if (this.items.length >= MAX_SATELLITES) return null;
    let slot = 0;
    while (this.items.some((item) => item.slot === slot)) slot++;
    const serial = this.nextId++;
    const row = catalog[slot % catalog.length];
    const degrees = 18 + ((slot * 23) % 132);
    const radius = 4.5 + slot * 0.18;
    const inclination = THREE.MathUtils.degToRad(degrees);
    const node = slot * 0.71;
    const angularSpeed = 0.09 + (slot % 7) * 0.011;
    const root = new THREE.Group();
    const model = this.template.create();
    root.add(model);
    const item = {
      id: serial,
      slot,
      root,
      model,
      radius,
      inclination,
      node,
      angularSpeed,
      spinSpeed: 0.13 + (slot % 5) * 0.04,
      angle: (slot * 1.75 + 0.3) % TAU,
      name: `${row[0]}-${String(serial).padStart(2, "0")}`,
      country: row[1],
      agency: row[2],
      mission: row[3],
      altitude: 450 + slot * 135,
      signal: 92 + (slot % 8),
      launch: `202${3 + (slot % 4)}-${String(1 + (slot % 12)).padStart(2, "0")}-15`,
      color: colors[slot % colors.length],
    };
    model.traverse((mesh) => {
      if (mesh.isMesh) mesh.userData.satelliteId = serial;
    });
    this.template.setTexture(model, this.textureIndex);
    // Torus begins in XY, matching this inclined circular orbit after rotation.
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.y = node;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.008, 4, 160),
      new THREE.MeshBasicMaterial({
        map: this.orbitTexture,
        color: item.color,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2 - inclination;
    orbitPlane.add(ring);
    orbitPlane.visible = this.showOrbits;
    item.orbit = orbitPlane;
    orbitPosition(item.angle, radius, inclination, node, root.position);
    this.scene.add(root, orbitPlane);
    this.items.push(item);
    return item;
  }
  remove(id = this.items.at(-1)?.id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = this.items.splice(index, 1);
    this.scene.remove(item.root, item.orbit);
    item.orbit.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    // Satellite geometries/textures/materials are shared. Do NOT dispose them here.
    return item;
  }
  update(dt, speed) {
    for (const item of this.items) {
      item.angle = (item.angle + item.angularSpeed * dt * speed) % TAU;
      orbitPosition(
        item.angle,
        item.radius,
        item.inclination,
        item.node,
        item.root.position,
      );
      item.model.rotation.y += item.spinSpeed * dt * speed;
    }
  }
  setTexture(index) {
    this.textureIndex = index;
    for (const item of this.items) this.template.setTexture(item.model, index);
  }
  setOrbits(visible) {
    this.showOrbits = visible;
    for (const item of this.items) item.orbit.visible = visible;
  }
  reset() {
    while (this.items.length) this.remove();
    this.nextId = 1;
    this.textureIndex = 0;
    for (let i = 0; i < 4; i++) this.add();
  }
}
