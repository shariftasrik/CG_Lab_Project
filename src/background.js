import * as THREE from "three";

function canvasMap(draw, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext("2d"), size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
export function orbitTexture() {
  const map = canvasMap((ctx, size) => {
    ctx.fillStyle = "#8cacb8";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size * 0.8, size);
  }, 64);
  map.wrapS = THREE.RepeatWrapping;
  map.repeat.set(50, 1);
  return map;
}
export function makeBackground(scene) {
  const backdrop = new THREE.Group();
  const starMap = canvasMap((ctx, size) => {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, "#fff");
    g.addColorStop(0.1, "#bbd8ed");
    g.addColorStop(1, "rgba(90,120,160,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }, 32);
  const positions = [];
  let seed = 57;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1300; i++)
    positions.push(
      (random() - 0.5) * 600,
      (random() - 0.5) * 400,
      -90 - random() * 220,
    );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: starMap,
      color: "#b8d4e8",
      size: 0.4,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  scene.add(stars);

  scene.add(backdrop);
  return backdrop;
}
