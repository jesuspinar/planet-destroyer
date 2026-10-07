/**
 * Short-lived particle bursts left behind by destroyed entities.
 *
 * Each burst owns its geometry and material, so it is disposed of as soon as
 * it fades out.
 */

import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

import { BURST, prefersReducedMotion } from '../config.js';
import { ALIEN } from '../core/game-core.js';
import { highlightColor } from './planet-mesh.js';
import { addToScene, disposeMesh } from './stage.js';
import { toSceneY } from '../core/world.js';

const COORDS_PER_POINT = 3;
const VELOCITY_COMPONENTS = 2;

const bursts = [];

const particleCount = () =>
  prefersReducedMotion ? BURST.REDUCED_MOTION_PARTICLES : BURST.PARTICLES;

const burstColor = type =>
  type === ALIEN ? BURST.ALIEN_COLOR : highlightColor(type);

export function spawnBurst({ type, x, y }) {
  const count = particleCount();
  const positions = new Float32Array(count * COORDS_PER_POINT);
  const velocities = new Float32Array(count * VELOCITY_COMPONENTS);

  for (let i = 0; i < count; i += 1) {
    positions.set([x, toSceneY(y), BURST.DEPTH], i * COORDS_PER_POINT);

    const angle = Math.random() * Math.PI * 2;
    const speed = BURST.MIN_SPEED + Math.random() * BURST.SPEED_JITTER;

    velocities.set(
      [Math.cos(angle) * speed, Math.sin(angle) * speed],
      i * VELOCITY_COMPONENTS
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(positions, COORDS_PER_POINT)
  );

  const mesh = new Points(
    geometry,
    new PointsMaterial({
      color: burstColor(type),
      size: BURST.PARTICLE_SIZE,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      sizeAttenuation: false
    })
  );

  addToScene(mesh);
  bursts.push({ mesh, velocities, age: 0 });
}

function advanceParticles(burst, dt) {
  const position = burst.mesh.geometry.attributes.position;
  const drag = Math.exp(-dt * BURST.DRAG);

  for (let i = 0; i < position.count; i += 1) {
    const v = i * VELOCITY_COMPONENTS;
    const p = i * COORDS_PER_POINT;

    burst.velocities[v] *= drag;
    burst.velocities[v + 1] -= dt * BURST.GRAVITY;
    position.array[p] += burst.velocities[v] * dt;
    position.array[p + 1] += burst.velocities[v + 1] * dt;
  }

  position.needsUpdate = true;
}

export function updateBursts(dt) {
  for (const burst of [...bursts]) {
    burst.age += dt;
    advanceParticles(burst, dt);
    burst.mesh.material.opacity = Math.max(0, 1 - burst.age / BURST.LIFETIME);

    if (burst.age > BURST.LIFETIME) {
      disposeMesh(burst.mesh);
      bursts.splice(bursts.indexOf(burst), 1);
    }
  }
}

export function clearBursts() {
  for (const burst of bursts) {
    disposeMesh(burst.mesh);
  }

  bursts.length = 0;
}

/** Keeps live particles inside the arena after a resize. */
export function scaleBurstHeights(factor) {
  for (const burst of bursts) {
    const position = burst.mesh.geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      position.array[i * COORDS_PER_POINT + 1] *= factor;
    }

    position.needsUpdate = true;
  }
}
