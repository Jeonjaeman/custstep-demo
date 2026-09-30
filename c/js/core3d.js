// CUST STEP · core3d.js
// Glass coffee bean for the hero. Loaded dynamically by main.js only on capable desktops.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Build a coffee-bean geometry: squashed ellipsoid with an S-shaped groove on its flat face. */
function beanGeometry() {
  const geo = new THREE.SphereGeometry(1, 128, 96);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // flatten the front a little so the groove sits on a calmer face
    let { x, y, z } = v;
    if (z > 0) z *= 0.82;
    // S-curve centre line of the crease
    const cx = 0.14 * Math.sin(y * 2.4);
    const d = x - cx;
    const along = Math.max(0, 1 - Math.pow(Math.abs(y) / 0.96, 4)); // fade near the tips
    const front = THREE.MathUtils.smoothstep(z, 0.05, 0.6);
    const groove = 0.26 * Math.exp(-(d * d) / 0.012) * along * front;
    z -= groove;
    // slight swelling of the two lobes
    x *= 1 + 0.04 * front * Math.exp(-(d * d) / 0.2);
    pos.setXYZ(i, x, y, z);
  }
  geo.scale(1, 1.45, 0.75);
  geo.computeVertexNormals();
  return geo;
}

/**
 * @param {HTMLElement} host  element the canvas is appended to
 * @param {{ zone?: Element, onReady?: () => void }} opts
 */
export function init(host, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  // opaque black clear: three.js swaps a transparent clear for grey in the transmission pass,
  // so we render on black and let CSS (mix-blend-mode: screen on .object) drop the black.
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  // lights: warm key, orange fill, lime rim
  const key = new THREE.PointLight(0xffffff, 26, 30, 2);
  key.position.set(3, 3.5, 4);
  const orange = new THREE.PointLight(0xff6a2e, 60, 30, 2);
  orange.position.set(-3.5, -1.5, 2.5);
  const rim = new THREE.PointLight(0xc9f24d, 34, 30, 2);
  rim.position.set(2.8, 1.2, -3.2);
  scene.add(key, orange, rim, new THREE.AmbientLight(0x2a1a10, 0.6));

  // backdrop lines for the glass to refract (thin laser strokes)
  const backdrop = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xff6a2e, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.01), lineMat);
    m.position.set(0, -1.2 + i * 0.6, -2.4);
    m.rotation.z = -0.35;
    backdrop.add(m);
  }
  scene.add(backdrop);

  const group = new THREE.Group();
  scene.add(group);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.08,
    transmission: 1,
    thickness: 1.2,
    ior: 1.45,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    attenuationColor: new THREE.Color(0xd9a05b),
    attenuationDistance: 2.8,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
    specularIntensity: 1,
    envMapIntensity: 1.7,
  });
  const bean = new THREE.Mesh(beanGeometry(), glass);
  group.add(bean);

  // inner ember
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x2a1204, emissive: 0xd9a05b, emissiveIntensity: 1.1, roughness: 0.6 })
  );
  core.scale.set(0.8, 1.5, 0.6);
  group.add(core);
  const coreLight = new THREE.PointLight(0xff8a3d, 8, 4, 2);
  group.add(coreLight);

  group.rotation.set(0.2, -0.5, -0.55);

  // sizing
  const resize = () => {
    const w = renderer.domElement.parentElement.clientWidth * 1.6 || 1;
    const h = renderer.domElement.parentElement.clientHeight * 1.6 || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // pointer follow (damped)
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  const onMove = (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  // run state: tab visible AND zone on screen
  let inView = true;
  let running = false;
  let raf = 0;
  const clock = new THREE.Clock();

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    cur.x += (target.x - cur.x) * Math.min(1, dt * 3);
    cur.y += (target.y - cur.y) * Math.min(1, dt * 3);
    bean.rotation.y += dt * 0.22;
    group.rotation.x = 0.2 + cur.y * 0.35 + Math.sin(t * 0.6) * 0.05;
    group.rotation.z = -0.55 + cur.x * 0.18;
    group.position.y = Math.sin(t * 0.8) * 0.06;
    core.rotation.y = bean.rotation.y;
    coreLight.intensity = 7 + Math.sin(t * 1.7) * 1.5;
    backdrop.position.x = -cur.x * 0.3;
    renderer.render(scene, camera);
  };
  const update = () => {
    const should = inView && !document.hidden;
    if (should && !running) { running = true; clock.getDelta(); frame(); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  };

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    update();
  }, { rootMargin: "0px" });
  io.observe(opts.zone || host);
  document.addEventListener("visibilitychange", update);

  // first frame, then reveal
  renderer.render(scene, camera);
  update();
  requestAnimationFrame(() => opts.onReady && opts.onReady());

  return {
    setVisible(v) { inView = v; update(); },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", update);
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
