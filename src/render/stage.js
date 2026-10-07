/**
 * Owns the WebGL renderer, the scene graph and the camera.
 *
 * Callers never see the `Scene` itself; they add and remove objects through
 * this module so lifetime management stays in one place.
 */

import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer
} from 'three';

import { INITIAL_WORLD_HEIGHT, STARFIELD, WORLD_WIDTH } from '../config.js';

const MAX_PIXEL_RATIO = 2;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 2000;
const CAMERA_DISTANCE = 1000;

let renderer;
let scene;
let camera;

function createStarfield() {
  const positions = [];
  const colors = [];

  for (let i = 0; i < STARFIELD.COUNT; i += 1) {
    positions.push(
      Math.random() * WORLD_WIDTH,
      Math.random() * STARFIELD.HEIGHT,
      STARFIELD.DEPTH
    );

    const color = new Color().setHSL(
      STARFIELD.HUE + Math.random() * STARFIELD.HUE_JITTER,
      STARFIELD.SATURATION,
      STARFIELD.LIGHTNESS + Math.random() * STARFIELD.LIGHTNESS_JITTER
    );
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  return new Points(
    geometry,
    new PointsMaterial({
      size: STARFIELD.SIZE,
      vertexColors: true,
      transparent: true,
      opacity: STARFIELD.OPACITY,
      sizeAttenuation: false
    })
  );
}

function createLights() {
  const sun = new DirectionalLight(0xffffff, 3);
  sun.position.set(-200, 600, 700);

  return [new AmbientLight(0xffffff, 1.6), sun];
}

/**
 * Creates the renderer and attaches its canvas to `host`.
 *
 * @throws if the browser cannot provide a WebGL context.
 */
export function createStage(host) {
  renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  camera = new OrthographicCamera(
    0,
    WORLD_WIDTH,
    INITIAL_WORLD_HEIGHT,
    0,
    CAMERA_NEAR,
    CAMERA_FAR
  );
  camera.position.z = CAMERA_DISTANCE;

  scene = new Scene();
  scene.add(...createLights(), createStarfield());
}

export function addToScene(object) {
  scene.add(object);
}

export function removeFromScene(object) {
  scene.remove(object);
}

/** Frees a throwaway object's GPU resources after removing it from the scene. */
export function disposeMesh(mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

export function resizeStage({ pixelWidth, pixelHeight, worldHeight }) {
  camera.left = 0;
  camera.right = WORLD_WIDTH;
  camera.top = worldHeight;
  camera.bottom = 0;
  camera.updateProjectionMatrix();
  renderer.setSize(pixelWidth, pixelHeight);
}

export function renderStage() {
  renderer.render(scene, camera);
}

export function onContextLost(handler) {
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    handler();
  });
}
