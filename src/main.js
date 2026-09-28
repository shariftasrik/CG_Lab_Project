import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadEarth, loadSatelliteTemplate, loadSun } from "./assets.js";
import { SatelliteFleet, MAX_SATELLITES } from "./fleet.js";
import { makeBackground, orbitTexture } from "./background.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#scene");
const state = {
  paused: false,
  speed: 1,
  earthSpeed: 1,
  selectedId: null,
  hoverId: null,
  showLabels: true,
};
let renderer;

async function start() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();

  scene.background = new THREE.Color("#060d17");

  scene.fog = new THREE.Fog("#060d17", 65, 260);

  const camera = new THREE.PerspectiveCamera(
    43,
    innerWidth / innerHeight,
    0.1,
    650,
  );
  const controls = new OrbitControls(camera, canvas);
  controls.enableRotate = true;
  controls.rotateSpeed = 0.7;

  controls.enablePan = false;

  controls.enableDamping = true;

  controls.minDistance = 10;
  controls.maxDistance = 45;
  controls.target.set(0, 0, 0);

  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

  function projection() {
    const mobile = innerWidth <= 760;
    camera.fov = mobile ? 62 : 43;
    camera.aspect = innerWidth / innerHeight;
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      mobile ? 0 : -Math.min(155, innerWidth * 0.12),
      mobile ? Math.min(105, innerHeight * 0.13) : 0,
      innerWidth,
      innerHeight,
    );
    camera.updateProjectionMatrix();
  }
  function resetZoom() {
    // Finish any leftover drag so damping cannot carry the camera away
    // from this starting view.
    const damping = controls.dampingFactor;
    controls.dampingFactor = 1;
    controls.update();
    camera.position.set(0, 7.3, 21);
    controls.target.set(0, 0, 0);
    controls.dampingFactor = 0;
    controls.update();
    controls.dampingFactor = damping;
  }
  resetZoom();
  projection();
  const SUN_RADIUS = 11;
  const DEFAULT_AZIMUTH = 1.97;
  const DEFAULT_ELEVATION = 0.55;
  let azimuth = DEFAULT_AZIMUTH;
  let elevation = DEFAULT_ELEVATION;
  const sunDirection = new THREE.Vector3(1, 0.4, 0.4).normalize();
  const sunLight = new THREE.DirectionalLight("#fff2df", 5.2);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight, sunLight.target, new THREE.AmbientLight("#9eb6d0", 0.34));
  const background = makeBackground(scene);

  const [earthAsset, template, sunAsset] = await Promise.all([
    loadEarth(),
    loadSatelliteTemplate(),
    loadSun(),
  ]);
  const { earth, materials: earthMaterials } = earthAsset;
  scene.add(earth);
  const { sun, mixer: sunMixer } = sunAsset;
  const sunBody = new THREE.Group();
  sunBody.name = "Movable sun";
  sunBody.add(sun);
  sunBody.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.48, 32, 24),
      new THREE.MeshBasicMaterial({
        color: "#ffb15a",
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    ),
  );
  const sunPick = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 16, 12),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  sunPick.name = "sun-pick";
  sunBody.add(sunPick);
  scene.add(sunBody);
  function placeSun() {
    const cosEl = Math.cos(elevation);
    sunBody.position.set(
      SUN_RADIUS * cosEl * Math.sin(azimuth),
      SUN_RADIUS * Math.sin(elevation),
      SUN_RADIUS * cosEl * Math.cos(azimuth),
    );
    sunLight.position.copy(sunBody.position);
    sunDirection.copy(sunBody.position).normalize();
  }
  placeSun();
  const fleet = new SatelliteFleet(scene, template, orbitTexture());
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  const projected = new THREE.Vector3();
  const tempDirection = new THREE.Vector3();
  const earthSphere = new THREE.Sphere(new THREE.Vector3(), 2.6);
  const hit = new THREE.Vector3();
  const sunInView = new THREE.Vector3();
  const labels = new Map();
  let pointerOnCanvas = false;
  let draggingSun = false;
  let suppressClick = false;
  let dragX = 0;
  let dragY = 0;
  let pointerClient = { x: innerWidth / 2, y: innerHeight / 2 };
  let infoId = null,
    infoStamp = 0,
    hoverFrame = 0;

  function visibleToCamera(item) {
    tempDirection.subVectors(item.root.position, camera.position).normalize();
    const ray = new THREE.Ray(camera.position, tempDirection);
    const point = ray.intersectSphere(earthSphere, hit);
    return (
      !point ||
      camera.position.distanceTo(point) >=
        camera.position.distanceTo(item.root.position) - 0.2
    );
  }
  function projectItem(item) {
    projected.copy(item.root.position).project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * innerWidth,
      y: (-0.5 * projected.y + 0.5) * innerHeight,
      z: projected.z,
    };
  }
  function select(id) {
    state.selectedId = id;
    state.hoverId = null;
    updateActive();
    showInfo(true);
  }
  function updateActive() {
    document.querySelectorAll("[data-satellite]").forEach((el) => {
      const active = Number(el.dataset.satellite) === state.selectedId;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", String(active));
    });
  }
  function rebuildUI() {
    $("#count").value = String(fleet.items.length);
    $("#add").disabled = fleet.items.length >= MAX_SATELLITES;
    $("#remove").disabled = fleet.items.length === 0;
    $("#fleet-list").replaceChildren();
    $("#satellite-labels").replaceChildren();
    labels.clear();
    for (const item of fleet.items) {
      const button = document.createElement("button");
      button.className = "fleet-row";
      button.dataset.satellite = String(item.id);
      button.innerHTML = `<i style="background:${item.color}"></i><span>${item.name}<small>${item.country}</small></span><span class="orbit-id">${String(item.slot + 1).padStart(2, "0")}</span>`;
      button.addEventListener("click", () => select(item.id));
      $("#fleet-list").append(button);
      const label = document.createElement("button");
      label.className = "satellite-label";
      label.dataset.satellite = String(item.id);
      label.textContent = item.name;
      label.hidden = true;
      label.setAttribute(
        "aria-label",
        `${item.name}, ${item.country}. Show details.`,
      );
      label.addEventListener("pointerenter", () => {
        pointerOnCanvas = false;
        state.hoverId = item.id;
        showInfo(true);
      });
      label.addEventListener("pointerleave", () => {
        state.hoverId = null;
        showInfo(true);
      });
      label.addEventListener("click", () => select(item.id));
      $("#satellite-labels").append(label);
      labels.set(item.id, label);
    }
    if (!fleet.items.length)
      $("#fleet-list").textContent = "No satellites. Use + to add one.";
    updateActive();
    showInfo(true);
  }
  function showInfo(force = false) {
    const item = fleet.items.find(
      (entry) => entry.id === (state.hoverId ?? state.selectedId),
    );
    if (!item) {
      $("#info").hidden = true;
      infoId = null;
      return;
    }
    const now = performance.now();
    if (force || item.id !== infoId || now - infoStamp > 180) {
      $("#info").hidden = false;
      $("#info-name").textContent = item.name;
      $("#info-country").textContent = item.country;
      $("#info-type").textContent =
        (state.selectedId === item.id ? "PINNED SATELLITE" : "SATELLITE") +
        " / DEMO DATA";
      const moving = state.paused ? 0 : state.speed;
      const rows = [
        ["Mission", item.mission],
        ["Operator (fictional)", item.agency],
        [
          "Rotation speed",
          `${THREE.MathUtils.radToDeg(item.spinSpeed * moving).toFixed(1)} deg/s`,
        ],
        [
          "Orbital speed",
          `${THREE.MathUtils.radToDeg(item.angularSpeed * moving).toFixed(1)} deg/s`,
        ],
        [
          "Orbit period",
          state.paused
            ? "Paused"
            : `${((Math.PI * 2) / (item.angularSpeed * state.speed)).toFixed(1)} sim seconds`,
        ],
        [
          "Inclination",
          `${Math.round(THREE.MathUtils.radToDeg(item.inclination))} degrees`,
        ],
        ["Altitude (demo)", `${item.altitude} km`],
        ["Signal (demo)", `${item.signal}%`],
        ["Launch date (demo)", item.launch],
        ["Status", state.paused ? "Orbit paused" : "Operational"],
      ];
      $("#telemetry").replaceChildren(
        ...rows.map(([key, value]) => {
          const div = document.createElement("div"),
            dt = document.createElement("dt"),
            dd = document.createElement("dd");
          dt.textContent = key;
          dd.textContent = value;
          div.append(dt, dd);
          return div;
        }),
      );
      infoId = item.id;
      infoStamp = now;
    }
    // Put a pinned card at the right edge; a hover card beside the pointer.
    const card = $("#info");
    const width = card.offsetWidth,
      height = card.offsetHeight;
    const desiredX =
      state.selectedId === item.id
        ? innerWidth - width - 24
        : pointerClient.x + 22;
    const desiredY = state.selectedId === item.id ? 165 : pointerClient.y + 18;
    card.style.left = `${Math.max(10, Math.min(desiredX, innerWidth - width - 10))}px`;
    card.style.top = `${Math.max(80, Math.min(desiredY, innerHeight - height - 12))}px`;
  }
  function setPaused(value) {
    state.paused = value;
    $("#pause").textContent = value ? "Resume orbits" : "Pause orbits";
    $("#status").textContent = value ? "SIMULATION PAUSED" : "SIMULATION LIVE";
    showInfo(true);
  }
  function add() {
    fleet.add();
    rebuildUI();
  }
  function remove() {
    const id = state.selectedId ?? fleet.items.at(-1)?.id;
    fleet.remove(id);
    if (state.selectedId === id) state.selectedId = null;
    state.hoverId = null;
    rebuildUI();
  }
  function reset() {
    state.selectedId = null;
    state.hoverId = null;
    state.speed = 1;
    state.earthSpeed = 1;
    $("#speed").value = "1";
    $("#speed-value").value = "1.0x";
    $("#texture").value = "0";

    $("#earth-speed").value = "1";
    $("#earth-speed-value").value = "1.0x";

    earth.rotation.y = 0.35;
    azimuth = DEFAULT_AZIMUTH;
    elevation = DEFAULT_ELEVATION;
    placeSun();

    fleet.reset();
    setPaused(false);
    resetZoom();
    rebuildUI();
  }
  $("#add").addEventListener("click", add);
  $("#remove").addEventListener("click", remove);
  $("#pause").addEventListener("click", () => setPaused(!state.paused));
  $("#reset").addEventListener("click", reset);
  $("#close-info").addEventListener("click", () => {
    select(null);
    state.hoverId = null;
    showInfo(true);
  });
  $("#speed").addEventListener("input", (event) => {
    state.speed = Number(event.target.value);
    $("#speed-value").value = state.speed.toFixed(1) + "x";
    showInfo(true);
  });
  $("#texture").addEventListener("change", (event) =>
    fleet.setTexture(Number(event.target.value)),
  );
  $("#show-orbits").addEventListener("change", (event) =>
    fleet.setOrbits(event.target.checked),
  );
  $("#show-labels").addEventListener("change", (event) => {
    state.showLabels = event.target.checked;
  });

  // Earth speed control
  $("#earth-speed").addEventListener("input", (event) => {
    state.earthSpeed = Number(event.target.value);

    $("#earth-speed-value").value = state.earthSpeed.toFixed(1) + "x";
  });

  function setPointer(event) {
    pointerClient = { x: event.clientX, y: event.clientY };
    pointer.set(
      (event.clientX / innerWidth) * 2 - 1,
      (-event.clientY / innerHeight) * 2 + 1,
    );
  }
  function pointerHitsSun() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      [sunBody, earth, ...fleet.items.map((item) => item.root)],
      true,
    );
    let object = hits[0]?.object;
    while (object) {
      if (object === sunBody) return true;
      object = object.parent;
    }
    return false;
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      setPointer(event);
      if (!pointerHitsSun()) return;
      draggingSun = true;
      suppressClick = true;
      dragX = event.clientX;
      dragY = event.clientY;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    },
    true,
  );
  function stopSunDrag(event) {
    if (!draggingSun) return;
    draggingSun = false;
    controls.enabled = true;
    if (canvas.hasPointerCapture?.(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener("pointerup", stopSunDrag);
  canvas.addEventListener("pointercancel", stopSunDrag);
  canvas.addEventListener("pointermove", (event) => {
    pointerOnCanvas = true;
    setPointer(event);
    if (!draggingSun) return;
    const dx = event.clientX - dragX;
    const dy = event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    azimuth -= dx * 0.0055;
    elevation = THREE.MathUtils.clamp(elevation - dy * 0.0045, -1.15, 1.15);
    placeSun();
  });
  canvas.addEventListener("pointerleave", () => {
    pointerOnCanvas = false;
    state.hoverId = null;
    showInfo(true);
  });
  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      [earth, ...fleet.items.map((item) => item.root)],
      true,
    );
    if (hits.length) return hits[0].object.userData.satelliteId ?? null;
    // A small screen-space tolerance makes tiny satellites easier to hover.
    let best = null,
      distance = 19;
    for (const item of fleet.items) {
      if (!visibleToCamera(item)) continue;
      const screen = projectItem(item);
      const d = Math.hypot(
        screen.x - pointerClient.x,
        screen.y - pointerClient.y,
      );
      if (screen.z > -1 && screen.z < 1 && d < distance) {
        best = item.id;
        distance = d;
      }
    }
    return best;
  }
  canvas.addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setPointer(event);
    select(pick());
  });
  window.addEventListener("keydown", (event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button,input,select,a,textarea")
    )
      return;
    const movesSun = event.code.startsWith("Arrow");
    if (event.repeat && !movesSun) return;
    switch (event.code) {
      case "Equal":
      case "NumpadAdd":
        event.preventDefault();
        add();
        break;
      case "Minus":
      case "NumpadSubtract":
        event.preventDefault();
        remove();
        break;
      case "Space":
        event.preventDefault();
        setPaused(!state.paused);
        break;
      case "KeyR":
        reset();
        break;
      case "KeyT":
        fleet.setTexture((fleet.textureIndex + 1) % 3);
        $("#texture").value = String(fleet.textureIndex);
        break;
      case "Escape":
        select(null);
        break;
      case "ArrowLeft":
        event.preventDefault();
        azimuth -= 0.05;
        placeSun();
        break;
      case "ArrowRight":
        event.preventDefault();
        azimuth += 0.05;
        placeSun();
        break;
      case "ArrowUp":
        event.preventDefault();
        elevation = THREE.MathUtils.clamp(elevation + 0.04, -1.15, 1.15);
        placeSun();
        break;
      case "ArrowDown":
        event.preventDefault();
        elevation = THREE.MathUtils.clamp(elevation - 0.04, -1.15, 1.15);
        placeSun();
        break;
    }
  });
  window.addEventListener("resize", () => {
    projection();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight);
    showInfo(true);
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    $("#error").hidden = false;
    $("#error").textContent =
      "Graphics context lost. Reload this page to restart.";
  });
  await document.fonts.load('12px "Orbit UI"');
  $("#loading").hidden = true;
  $("#controls").disabled = false;
  reset();

  let previous = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;

    if (!state.paused) {
      fleet.update(dt, state.speed);

      earth.rotation.y += 0.1 * dt * state.earthSpeed;
    }
    sunMixer.update(dt);

    controls.update();
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    sunLight.position.copy(sunBody.position);
    sunDirection.copy(sunBody.position).normalize();
    sunInView.copy(sunDirection).transformDirection(camera.matrixWorldInverse);
    for (const material of earthMaterials)
      material.uniforms.uSunDirection.value.copy(sunInView);
    for (const item of fleet.items) {
      const label = labels.get(item.id);
      const screen = projectItem(item);
      const inFrame =
        screen.z > -1 &&
        screen.z < 1 &&
        screen.x > 8 &&
        screen.x < innerWidth - 8 &&
        screen.y > 75 &&
        screen.y < innerHeight - 55;
      label.hidden = !state.showLabels || !inFrame || !visibleToCamera(item);
      if (!label.hidden) {
        label.style.left = `${screen.x}px`;
        label.style.top = `${screen.y}px`;
      }
    }
    if (draggingSun) canvas.style.cursor = "grabbing";
    else if (pointerOnCanvas && ++hoverFrame % 3 === 0) {
      const overSun = pointerHitsSun();
      state.hoverId = overSun ? null : pick();
      canvas.style.cursor = overSun ? "grab" : state.hoverId ? "pointer" : "default";
    }
    showInfo();
    renderer.render(scene, camera);
    // if (++frames && now - fpsStart > 1000) {
    //   $("#fps").textContent = String(
    //     Math.round((frames * 1000) / (now - fpsStart)),
    //   );
    //   frames = 0;
    //   fpsStart = now;
    // }
  });

  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("debug")
  ) {
    window.__orbitDebug = () => ({
      earthPosition: earth.position.toArray(),
      earthRotation: earth.rotation.toArray(),
      camera: camera.position.toArray(),
      sun: sunBody.position.toArray(),
      count: fleet.items.length,
      selectedId: state.selectedId,
      hoverId: state.hoverId,
      earthOpaque: earthMaterials.every(
        (m) => !m.transparent && m.opacity === 1 && m.depthWrite,
      ),
      satellites: fleet.items.map((item) => {
        let opaque = true;
        item.model.traverse((mesh) => {
          if (
            mesh.isMesh &&
            (mesh.material.transparent ||
              mesh.material.opacity !== 1 ||
              !mesh.material.depthWrite)
          )
            opaque = false;
        });
        return {
          id: item.id,
          name: item.name,
          country: item.country,
          radius: item.radius,
          inclination: item.inclination,
          position: item.root.position.toArray(),
          screen: projectItem(item),
          visible: visibleToCamera(item),
          opaque,
        };
      }),
      textureIndex: fleet.textureIndex,
      orbitsVisible: fleet.showOrbits,
      backgroundVisible: background.visible,
      fontLoaded: document.fonts.check('12px "Orbit UI"'),
    });
  }
}
start().catch((error) => {
  console.error(error);
  $("#loading").hidden = true;
  $("#error").hidden = false;
  $("#error").textContent =
    "Could not load the scene. Run it with npm run dev, keep the public folder intact, and use a WebGL2-capable browser. Details: " +
    error.message;
});
