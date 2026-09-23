import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderer
} from 'three';
import {
  TARGETS,
  newGame,
  shoot,
  miss,
  tick,
  planetSpawnInterval
} from './game-core.js';
const $ = id => document.getElementById(id);
const arena = $('arena');
const host = $('canvas-host');
let state = newGame();
let entities = [];
let effects = [];
let nextSpawn = .35;
let nextAlien = 15;
let spawnIndex = 0;
let lastTime = 0;
let lastHudTime = 0;
let accumulator = 0;
let muted = true;
let audioCtx = null;
let noticeTimer;
let worldWidth = 600;
let worldHeight = 550;
let renderer;
let scene;
let camera;
let stars;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const palette = { Mercury: ['#918b90', '#c7c3bc'], Venus: ['#d18b46', '#f1d49b'], Earth: ['#2469b7', '#6fac84'], Mars: ['#853a32', '#ed8657'], Jupiter: ['#a16b55', '#ecd2aa'], Saturn: ['#a28a60', '#edddb0'], Uranus: ['#338b9b', '#94dedc'], Neptune: ['#25479e', '#7094e6'] };
const sphereGeometry = new SphereGeometry(1, 48, 32);
const vertexShader = `
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  gl_Position =
    projectionMatrix *
    modelViewMatrix *
    vec4(position, 1.0);
}
`;
const fragmentShader = `
uniform vec3 colorA;
uniform vec3 colorB;
uniform float kind;

varying vec3 vNormal;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(
    sin(dot(p, vec2(127.1, 311.7))) *
    43758.5453
  );
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  f = f * f * (3. - 2. * f);

  return mix(
    mix(
      hash(i),
      hash(i + vec2(1, 0)),
      f.x
    ),
    mix(
      hash(i + vec2(0, 1)),
      hash(i + vec2(1, 1)),
      f.x
    ),
    f.y
  );
}

float fbm(vec2 p) {
  return
    noise(p) * .5 +
    noise(p * 2.1) * .25 +
    noise(p * 4.3) * .125 +
    noise(p * 8.2) * .0625;
}

void main() {
  vec2 uv = vUv;

  float n =
    fbm(uv * vec2(15., 9.));

  vec3 c =
    mix(colorA, colorB, n);

  if (kind == 1.) {
    float bands =
      sin(
        uv.y * 90. +
        fbm(uv * 10.) * 6.
      );

    c = mix(
      colorA,
      colorB,
      smoothstep(-.8, .6, bands) * .8 + .1
    );

    c *= .83 + n * .45;
  }

  if (kind == 2.) {
    float land =
      fbm(uv * vec2(9., 6.));

    c = mix(
      colorA,
      colorB,
      smoothstep(.47, .51, land)
    );

    float clouds =
      fbm(
        uv * vec2(14., 12.) +
        vec2(23., 7.)
      );

    c = mix(
      c,
      vec3(.87, .93, .95),
      smoothstep(.6, .73, clouds) * .87
    );

    c = mix(
      c,
      vec3(.83, .93, .96),
      smoothstep(
        .43,
        .5,
        abs(uv.y - .5)
      ) * .8
    );
  }

  if (kind == 3.) {
    c = mix(
      colorA,
      colorB,
      .35 + .4 * sin(uv.y * 55. + n * 5.)
    );
  }

  float light = max(
    dot(
      normalize(vNormal),
      normalize(vec3(-.65, .75, 1.))
    ),
    0.
  );

  float rim =
    pow(
      1. - max(vNormal.z, 0.),
      3.
    );

  c *= .18 + light * .95;
  c += colorB * rim * .16;

  gl_FragColor = vec4(c, 1.);
}
`;
const materials = {};
for (const [name,
  colors] of Object.entries(palette)) {
  materials[name] = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      colorA: {
        value: new Color(colors[0])
      },
      colorB: {
        value: new Color(colors[1])
      },
      kind: {
        value: name === 'Earth'
          ? 2
          : ['Jupiter', 'Saturn'].includes(name)
            ? 1
            : ['Venus', 'Uranus', 'Neptune'].includes(name)
              ? 3
              : 0
      }
    }
  })
}
const ringMaterial = new MeshBasicMaterial({ color: 0xc4b49b, side: DoubleSide, transparent: true, opacity: .65 });
const ringGeometry = new RingGeometry(1.3, 1.9, 64);
const alienBodyMaterial = new MeshStandardMaterial({ color: 0xa8d476, metalness: .7, roughness: .25 });
const alienDomeMaterial = new MeshStandardMaterial({ color: 0xcaff93, emissive: 0x72a942, emissiveIntensity: .45, metalness: .3, roughness: .3 });
function makePlanet(type, radius) {
  const group = new Group();
  if (type === 'Alien') {
    const body = new Mesh(sphereGeometry, alienBodyMaterial);
    body
      .scale
      .set(radius * 1.3, radius * .32, radius * .65);
    group.add(body);
    const dome = new Mesh(sphereGeometry, alienDomeMaterial);
    dome
      .scale
      .set(radius * .65, radius * .55, radius * .5);
    dome.position.y = radius * .24;
    group.add(dome);
    for (let i = 0; i < 5; i += 1) {
      const lamp = new Mesh(sphereGeometry, alienDomeMaterial);
      lamp
        .scale
        .setScalar(radius * .075);
      lamp
        .position
        .set((i - 2) * radius * .4, -radius * .08, radius * .6);
      group.add(lamp)
    }
  } else {
    const body = new Mesh(sphereGeometry, materials[type]);
    body
      .scale
      .setScalar(radius);
    body.rotation.z = .18;
    group.add(body);
    if (type === 'Saturn') {
      const ring = new Mesh(ringGeometry, ringMaterial);
      ring
        .scale
        .setScalar(radius);
      ring
        .rotation
        .set(1.18, .22, -.36);
      group.add(ring)
    }
  }
  scene.add(group);
  return group
}
function spawn(type, x, y, demo = false, radius) {
  radius ??= type === 'Jupiter'
    ? 36
    : type === 'Saturn'
      ? 30
      : type === 'Alien'
        ? 23
        : type === 'Mercury'
          ? 22
          : 28;
  const mesh = makePlanet(type, radius);
  const label = document.createElement('span');
  label.className = 'planet-label' + (type === 'Earth'
    ? ' earth'
    : type === 'Alien'
      ? ' alien'
      : '');
  label.textContent = type === 'Earth'
    ? 'EARTH · DANGER'
    : type === 'Alien'
      ? 'ALIEN · 2×'
      : type;
  $('floating').appendChild(label);
  const entity = {
    type,
    x,
    y,
    baseY: y,
    radius,
    mesh,
    label,
    demo,
    rotation: Math.random() * 6,
    age: Math.random() * 5
  };
  entities.push(entity);
  positionEntity(entity);
  return entity
}
function positionEntity(e) {
  e
    .mesh
    .position
    .set(e.x, worldHeight - e.y, 0);
  e.label.style.left = (e.x / worldWidth * 100) + '%';
  e.label.style.top = ((e.y + e.radius + 17) / worldHeight * 100) + '%'
}
function removeEntity(e) {
  scene.remove(e.mesh);
  e
    .label
    .remove();
  const i = entities.indexOf(e);
  if (i >= 0) {
    entities.splice(i, 1)
  }
}
function clearEntities() {
  for (const e of [...entities]) {
    removeEntity(e)
  }
  for (const e of effects) {
    scene.remove(e.mesh);
    e
      .mesh
      .geometry
      .dispose();
    e
      .mesh
      .material
      .dispose()
  }
  effects = []
}
function demo() {
  clearEntities();
  spawn('Jupiter', 98, worldHeight * .2, true, 43);
  spawn('Saturn', 490, worldHeight * .17, true, 31);
  spawn('Mars', 53, worldHeight * .59, true, 23);
  spawn('Neptune', 537, worldHeight * .53, true, 26);
  spawn('Earth', 434, worldHeight * .8, true, 31);
  spawn('Venus', 162, worldHeight * .86, true, 25)
}
function resize() {
  const rect = arena.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return
  }
  const previousHeight = worldHeight;
  worldHeight = worldWidth * rect.height / rect.width;
  camera.left = 0;
  camera.right = worldWidth;
  camera.top = worldHeight;
  camera.bottom = 0;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
  if (state.status === 'ready') {
    demo()
  } else {
    for (const e of entities) {
      e.y = (e.y + e.radius) / (previousHeight + 2 * e.radius) * (worldHeight + 2 * e.radius) - e.radius;
      positionEntity(e)
    }
    for (const fx of effects) {
      const p = fx.mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        p.array[i * 3 + 1] *= worldHeight / previousHeight
      }
      p.needsUpdate = true
    }
  }
}
function initialize() {
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  } catch (error) {
    $('overlay-title').textContent = 'SPACE IS OFFLINE';
    $('overlay-description').textContent = 'This game needs WebGL. Enable hardware acceleration or try another browser.';
    $('start').hidden = true;
    console.error(error);
    return
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer
    .domElement
    .setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  scene = new Scene();
  camera = new OrthographicCamera(0, 600, 600, 0, .1, 2000);
  camera.position.z = 1000;
  scene.add(new AmbientLight(0xffffff, 1.6));
  const light = new DirectionalLight(0xffffff, 3);
  light
    .position
    .set(-200, 600, 700);
  scene.add(light);
  const vertices = [];
  const colors = [];
  for (let i = 0; i < 240; i += 1) {
    vertices.push(Math.random() * 600, Math.random() * 1800, -100);
    const c = new Color().setHSL(.58 + Math.random() * .13, .3, .25 + Math.random() * .5);
    colors.push(c.r, c.g, c.b)
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  starGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  stars = new Points(starGeometry, new PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: .8, sizeAttenuation: false }));
  scene.add(stars);
  resize();
  new ResizeObserver(resize).observe(arena);
  updateUI();
  requestAnimationFrame(frame);
  renderer
    .domElement
    .addEventListener('webglcontextlost', event => {
      event.preventDefault();
      if (state.status === 'playing') {
        pause()
      }
      $('overlay-description').textContent = 'The graphics connection was interrupted. Reload the page to fly again.';
      $('start').textContent = 'RELOAD GAME';
      $('start').onclick = () => location.reload()
    })
}
function updateUI() {
  $('score').textContent = String(state.score).padStart(4, '0');
  $('speed').innerHTML = state
    .speed
    .toFixed(1) + '<span>×</span>';
  $('sector').textContent = 'SECTOR ' + String(state.sector).padStart(3, '0');
  $('hearts').innerHTML = Array.from({
    length: 5
  }, (_, i) => `<span class="${i >= state.lives
    ? 'dead-heart'
    : ''}">♥</span>`).join(' ');
  $('hearts').setAttribute('aria-label', `${state.lives} lives`);
  $('lives-count').textContent = state.lives + ' / 5';
  $('miss-count').textContent = state.misses + ' / 3';
  $('miss-dots').setAttribute('aria-label', `${state.misses} of 3 planets missed`);
  [...$('miss-dots').children].forEach((el, i) => el.classList.toggle('active', i < state.misses));
  $('bonus-banner').hidden = state.bonus <= 0;
  $('bonus-time').textContent = state
    .bonus
    .toFixed(1) + 's';
  $('bonus-progress').style.width = (state.bonus * 10) + '%';
  $('bonus-label').textContent = state.bonus > 0
    ? 'DOUBLE POINTS ACTIVE'
    : 'KEEP AN EYE OUT';
  $('pause').disabled = !['playing', 'paused'].includes(state.status);
  $('pause').textContent = state.status === 'paused'
    ? '▶'
    : 'Ⅱ';
  $('pause').setAttribute('aria-label', state.status === 'paused'
    ? 'Resume game'
    : 'Pause game');
  $('game-status').textContent = {
    ready: 'AWAITING LAUNCH',
    playing: 'MISSION IN PROGRESS',
    paused: 'MISSION PAUSED',
    over: 'MISSION COMPLETE'
  }[state.status];
  arena
    .classList
    .toggle('playing', state.status === 'playing')
}
function start() {
  if (!renderer) {
    return
  }
  if (state.status === 'paused') {
    resume();
    return
  }
  state = {
    ...newGame(),
    status: 'playing'
  };
  nextSpawn = .2;
  nextAlien = 12 + Math.random() * 6;
  spawnIndex = 0;
  accumulator = 0;
  clearEntities();
  $('overlay').hidden = true;
  $('notice').textContent = '';
  updateUI();
  arena.focus({ preventScroll: true });
  tone(220, .12)
}
function pause() {
  if (state.status !== 'playing') {
    return
  }
  state.status = 'paused';
  $('overlay-title').innerHTML = 'COSMIC<br><em>TIME-OUT</em>';
  $('overlay-description').innerHTML = 'Take a breath.<br>Your universe can wait.';
  $('start').innerHTML = 'RESUME MISSION <span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M3.5 20.5L17 7M9 7H17V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg></span>';
  $('start-hint').textContent = 'PRESS P TO RESUME';
  $('overlay').hidden = false;
  updateUI()
}
function resume() {
  if (state.status !== 'paused') {
    return
  }
  state.status = 'playing';
  $('overlay').hidden = true;
  accumulator = 0;
  updateUI();
  arena.focus({ preventScroll: true })
}
function end() {
  state.status = 'over';
  $('overlay-title').innerHTML = 'THAT WAS<br><em>COSMIC.</em>';
  $('overlay-description').innerHTML = `<strong>${state.score} POINTS</strong> · ${state.destroyed} PLANETS DESTROYED<br>The universe is ready for round two.`;
  $('start').innerHTML = 'PLAY AGAIN <span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M3.5 20.5L17 7M9 7H17V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg></span>';
  $('start-hint').textContent = 'FIVE FRESH LIVES. ONE MORE MISSION.';
  $('overlay').hidden = false;
  updateUI();
  tone(100, .35, 'sawtooth')
}
function togglePause() {
  if (state.status === 'playing') {
    pause()
  } else if (state.status === 'paused') {
    resume()
  }
}
function notice(text) {
  $('notice').textContent = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('notice').textContent = '', 1700)
}
function hurt() {
  const damage = $('damage');
  damage
    .classList
    .add('flash');
  setTimeout(() => damage.classList.remove('flash'), 220);
  tone(90, .18, 'sawtooth')
}
function floatText(text, x, y, bad = false) {
  const el = document.createElement('span');
  el.className = 'float-score' + (bad
    ? ' bad'
    : '');
  el.textContent = text;
  el.style.left = (x / worldWidth * 100) + '%';
  el.style.top = (y / worldHeight * 100) + '%';
  $('floating').appendChild(el);
  setTimeout(() => el.remove(), 850)
}
function burst(e) {
  const count = reducedMotion
    ? 10
    : 32;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = e.x;
    positions[i * 3 + 1] = worldHeight - e.y;
    positions[i * 3 + 2] = 20;
    const a = Math.random() * Math.PI * 2;
    const v = 35 + Math.random() * 130;
    velocities.push(Math.cos(a) * v, Math.sin(a) * v)
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  const m = new PointsMaterial({
    color: e.type === 'Alien'
      ? 0xd6ff70
      : palette[e.type][1],
    size: 3,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    sizeAttenuation: false
  });
  const mesh = new Points(g, m);
  scene.add(mesh);
  effects.push({ mesh, velocities, age: 0 })
}
function step(dt) {
  tick(state, dt);
  nextSpawn -= dt;
  nextAlien -= dt;
  while (nextSpawn <= 0) {
    let type = spawnIndex > 0 && Math.random() < .09
      ? 'Earth'
      : TARGETS[spawnIndex % TARGETS.length];
    spawnIndex += 1;
    let x = 60 + Math.random() * (worldWidth - 120);
    for (let attempt = 0; attempt < 6 && entities.some(e => e.y < 100 && Math.abs(e.x - x) < 95); attempt += 1) {
      x = 60 + Math.random() * (worldWidth - 120)
    }
    spawn(type, x, -60);
    nextSpawn += planetSpawnInterval(state.speed)
  }
  if (nextAlien <= 0) {
    spawn('Alien', 60 + Math.random() * (worldWidth - 120), -50);
    nextAlien = 15 + Math.random() * 9
  }
  for (const e of [...entities]) {
    e.age += dt;
    e.y += dt * 48 * state.speed * (e.type === 'Alien'
      ? .85
      : 1);
    e.mesh.rotation.y += dt * .18;
    positionEntity(e);
    if (e.y - e.radius > worldHeight) {
      const lost = miss(state, e.type);
      if (lost) {
        hurt();
        notice('3 missed planets · −1 life')
      }
      removeEntity(e);
      if (state.status === 'over') {
        end();
        break
      }
    }
  }
}
function frame(now) {
  const dt = lastTime
    ? Math.min((now - lastTime) / 1000, .1)
    : 0;
  lastTime = now;
  if (state.status === 'playing') {
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      step(1 / 120);
      accumulator -= 1 / 120;
      if (state.status !== 'playing') {
        accumulator = 0;
        break
      }
    }
    if (now - lastHudTime > 80) {
      updateUI();
      lastHudTime = now
    }
  } else if (state.status === 'ready' && !reducedMotion) {
    for (const e of entities) {
      e.age += dt;
      e.y = e.baseY + Math.sin(e.age * .5) * 5;
      e.mesh.rotation.y += dt * .1;
      positionEntity(e)
    }
  }
  if (state.status !== 'paused') {
    for (const fx of [...effects]) {
      fx.age += dt;
      const p = fx.mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        fx.velocities[i * 2] *= Math.exp(-dt * 1.2);
        fx.velocities[i * 2 + 1] -= dt * 65;
        p.array[i * 3] += fx.velocities[i * 2] * dt;
        p.array[i * 3 + 1] += fx.velocities[i * 2 + 1] * dt
      }
      p.needsUpdate = true;
      fx.mesh.material.opacity = Math.max(0, 1 - fx.age / .7);
      if (fx.age > .7) {
        scene.remove(fx.mesh);
        fx
          .mesh
          .geometry
          .dispose();
        fx
          .mesh
          .material
          .dispose();
        effects.splice(effects.indexOf(fx), 1)
      }
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame)
}
function fire(event) {
  if (state.status !== 'playing' || event.target.closest('button')) {
    return
  }
  const r = arena.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width * worldWidth;
  const y = (event.clientY - r.top) / r.height * worldHeight;
  const e = [...entities]
    .reverse()
    .find(e => Math.hypot(x - e.x, y - e.y) <= e.radius * (e.type === 'Alien'
      ? 1.4
      : 1.12));
  if (!e) {
    tone(130, .045);
    return
  }
  const oldSpeed = state.speed;
  const result = shoot(state, e.type);
  burst(e);
  removeEntity(e);
  if (result.damage) {
    hurt();
    floatText('−1 LIFE', x, y, true);
    notice('Earth is home. Let it pass.')
  } else if (result.bonus) {
    floatText('2× POINTS', x, y);
    notice('Double points · 10 seconds');
    tone(660, .15);
    setTimeout(() => tone(880, .18), 90)
  } else {
    floatText('+' + result.points, x, y);
    tone(370 + Math.random() * 180, .065, 'triangle');
    if (state.speed > oldSpeed) {
      nextSpawn *= oldSpeed / state.speed;
      notice('SECTOR ' + String(state.sector).padStart(3, '0') + ' · ' + state.speed.toFixed(1) + '×')
    }
  }
  updateUI();
  if (state.status === 'over') {
    end()
  }
}
function tone(frequency, duration, type = 'sine') {
  if (muted) {
    return
  }
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx
        .resume()
        .catch(() => { })
    }
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o
      .frequency
      .setValueAtTime(frequency, audioCtx.currentTime);
    o
      .frequency
      .exponentialRampToValueAtTime(Math.max(40, frequency * .5), audioCtx.currentTime + duration);
    g
      .gain
      .setValueAtTime(.065, audioCtx.currentTime);
    g
      .gain
      .exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duration)
  } catch {
    muted = true;
    updateSound()
  }
}
function updateSound() {
  $('sound-label').textContent = muted
    ? 'Sound off'
    : 'Sound on';
  $('sound').setAttribute('aria-label', muted
    ? 'Turn sound on'
    : 'Turn sound off');
  $('sound').setAttribute('aria-pressed', String(!muted))
}
function toggleSound() {
  muted = !muted;
  updateSound();
  if (!muted) {
    tone(440, .1)
  }
}
const gameShell = $('game-shell');
let fullscreenPending = false;
let windowMode = false;
function nativeFullscreen() {
  return (document.fullscreenElement || document.webkitFullscreenElement)
}
function syncFullscreen() {
  if (nativeFullscreen() === gameShell) {
    windowMode = false
  }
  const active = nativeFullscreen() === gameShell || windowMode;
  gameShell
    .classList
    .toggle('fullscreen-layout', active);
  gameShell
    .classList
    .toggle('window-fullscreen', windowMode);
  document
    .body
    .classList
    .toggle('game-expanded', active);
  $('fullscreen').setAttribute('aria-pressed', String(active));
  $('fullscreen').setAttribute('aria-label', active
    ? 'Exit fullscreen'
    : 'Enter fullscreen');
  $('fullscreen').title = active
    ? 'Exit fullscreen (F or Esc)'
    : 'Fullscreen (F)';
  $('fullscreen-label').textContent = active
    ? 'Exit fullscreen'
    : 'Fullscreen'
}
async function toggleFullscreen() {
  if (fullscreenPending) {
    return
  }
  fullscreenPending = true;
  try {
    if (windowMode) {
      windowMode = false;
      syncFullscreen()
    } else if (nativeFullscreen() === gameShell) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        await exit.call(document)
      }
      syncFullscreen()
    } else {
      const request = gameShell.requestFullscreen || gameShell.webkitRequestFullscreen;
      if (request) {
        try {
          await request.call(gameShell)
        } catch {
          windowMode = true
        }
      } else {
        windowMode = true
      }
      syncFullscreen()
    }
  } catch { notice('Use Escape or your browser’s fullscreen control to exit.') } finally {
    fullscreenPending = false
  }
}
$('fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('webkitfullscreenchange', syncFullscreen);
gameShell.addEventListener('webkitfullscreenerror', () => {
  windowMode = true;
  syncFullscreen()
});
$('start').addEventListener('click', start);
$('pause').addEventListener('click', togglePause);
$('sound').addEventListener('click', toggleSound);
arena.addEventListener('pointerdown', fire);
$('help').addEventListener('click', () => {
  if (state.status === 'playing') {
    pause()
  }
  $('help-dialog').showModal()
});
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('help-ready').addEventListener('click', () => $('help-dialog').close());
document.addEventListener('keydown', e => {
  if (e.repeat || $('help-dialog').open || e.ctrlKey || e.metaKey || e.altKey || e.target.closest
    ?.('input,textarea,select,[contenteditable="true"]')) {
    return
  }
  const key = e
    .key
    .toLowerCase();
  if (key === 'f') {
    e.preventDefault();
    void toggleFullscreen()
  }
  if (key === 'escape' && windowMode) {
    e.preventDefault();
    windowMode = false;
    syncFullscreen()
  }
  if (key === 'p') {
    e.preventDefault();
    togglePause()
  }
  if (key === 'm') {
    toggleSound()
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'playing') {
    pause()
  }
});
if (document.modelContext
  ?.registerTool) {
  for (const tool of [
    {
      name: 'get_game_state',
      description: 'Read the current Planet Destroyer score, lives, bonus time, speed and game statu' +
        's.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true
      },
      execute: () => ({
        ...state
      })
    }, {
      name: 'start_game',
      description: 'Start a new Planet Destroyer game from the ready or game-over screen. Does not i' +
        'nterrupt an active game.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      execute: () => {
        if (!['ready', 'over'].includes(state.status)) {
          throw new Error('A game is already in progress.')
        }
        start();
        return {
          ...state
        }
      }
    }
  ]) {
    try {
      Promise
        .resolve(document.modelContext.registerTool(tool))
        .catch(() => { })
    } catch { }
  }
}
initialize();
