import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { makeEarthMaterial } from "./shaders.js";

const base = import.meta.env.BASE_URL;
export const assetURL = (path) => `${base}${path}`;

function limitTexture(texture, maxSize) {
  const source = texture.image;
  if (Math.max(source.width, source.height) > maxSize) {
    const scale = maxSize / Math.max(source.width, source.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    canvas
      .getContext("2d")
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    texture.image = canvas;
    texture.needsUpdate = true;
  }
  texture.anisotropy = 4;
  return texture;
}

function centerAndScale(object, size) {
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const extent = bounds.getSize(new THREE.Vector3());
  object.position.sub(center);
  const wrapper = new THREE.Group();
  wrapper.add(object);
  wrapper.scale.setScalar(size / Math.max(extent.x, extent.y, extent.z));
  return wrapper;
}

export async function loadEarth() {
  const gltf = await new GLTFLoader().loadAsync(
    assetURL("models/earth/timeworx-world-4045.glb"),
  );
  const materials = [];
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const source = object.material;
    if (!source.map)
      throw new Error(
        "The Earth mesh is missing its embedded surface texture.",
      );
    limitTexture(source.map, 4096);
    object.material = makeEarthMaterial(source.map);
    materials.push(object.material);
    source.dispose();
  });
  const earth = centerAndScale(gltf.scene, 5.2);
  earth.name = "Uploaded Earth (stationary)";
  earth.rotation.y = 0.35;
  return { earth, materials };
}

export async function loadSun() {
  const gltf = await new GLTFLoader().loadAsync(assetURL("models/sun/sun.glb"));
  const disposed = new Set();
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const source = object.material;
    // The outer shell is a transmission material. A soft glow is added in the scene instead.
    if (/ref/i.test(object.name)) {
      object.visible = false;
      return;
    }
    const map = source.emissiveMap || source.map;
    if (!map) throw new Error("The sun mesh is missing its surface texture.");
    limitTexture(map, 1024);
    map.colorSpace = THREE.SRGBColorSpace;
    object.material = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    if (!disposed.has(source)) {
      disposed.add(source);
      source.dispose();
    }
  });
  const sun = centerAndScale(gltf.scene, 2.4);
  sun.name = "Sun";
  const mixer = new THREE.AnimationMixer(gltf.scene);
  if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
  return { sun, mixer };
}

function textureVariant(source, kind) {
  const canvas = document.createElement("canvas");
  canvas.width = source.image.width;
  canvas.height = source.image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source.image, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = kind === 1 ? "rgba(213,159,35,.55)" : "rgba(238,245,248,.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export async function loadSatelliteTemplate() {
  const loader = new THREE.TextureLoader();
  const parts = {
    Antenna: "antenna",
    Couro: "foil",
    Pinos: "pins",
    Placas: "panels",
    Satélite: "body",
  };
  const materials = {};
  await Promise.all(
    Object.entries(parts).map(async ([name, stem]) => {
      const [map, normalMap, roughnessMap] = await Promise.all(
        ["color", "normal", "roughness"].map(async (kind) => {
          const texture = await loader.loadAsync(
            assetURL(`models/satellite/textures/${stem}-${kind}.jpg`),
          );
          texture.colorSpace =
            kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          return limitTexture(texture, 1024);
        }),
      );
      const original = new THREE.MeshStandardMaterial({
        name,
        map,
        normalMap,
        roughnessMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.22,
        roughness: 0.75,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        fog: false,
        side: THREE.DoubleSide,
      });
      materials[name] = [original, original, original];
      if (name === "Satélite" || name === "Couro") {
        for (let index = 1; index <= 2; index++) {
          const variant = original.clone();
          variant.map = textureVariant(map, index);
          materials[name][index] = variant;
        }
      }
    }),
  );
  const object = await new OBJLoader().loadAsync(
    assetURL("models/satellite/satellite.obj"),
  );
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const name = mesh.material.name;
    if (!materials[name])
      throw new Error(`Unknown satellite material: ${name}`);
    mesh.material.dispose();
    mesh.userData.materialKey = name;
    mesh.material = materials[name][0];
  });
  const template = centerAndScale(object, 1.75);
  template.rotation.y = Math.PI / 2;
  return {
    create() {
      return template.clone(true);
    },
    setTexture(model, index) {
      model.traverse((mesh) => {
        if (mesh.isMesh)
          mesh.material = materials[mesh.userData.materialKey][index];
      });
    },
  };
}
