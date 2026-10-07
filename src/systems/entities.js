/**
 * The falling planets, Earth and alien saucers.
 *
 * An entity pairs a Three.js group with the HTML label floating under it, and
 * this module keeps the two in sync for its whole lifetime.
 */

import {
  DEFAULT_PLANET_RADIUS,
  HIT_SCALE,
  LABEL_GAP,
  MOTION,
  PLANET_RADII,
  SPAWN
} from '../config.js';
import { elements } from '../ui/dom.js';
import { ALIEN, EARTH } from '../core/game-core.js';
import { createEntityMesh } from '../render/planet-mesh.js';
import { addToScene, removeFromScene } from '../render/stage.js';
import { getWorldHeight, toPercentX, toPercentY, toSceneY } from '../core/world.js';

const LABEL_TEXT = {
  [EARTH]: 'EARTH · DANGER',
  [ALIEN]: 'ALIEN · 2×'
};

const LABEL_MODIFIER = {
  [EARTH]: ' earth',
  [ALIEN]: ' alien'
};

const IDLE_PHASE_SPREAD = 5;

const entities = [];

export function radiusFor(type) {
  return PLANET_RADII[type] ?? DEFAULT_PLANET_RADIUS;
}

function createLabel(type) {
  const label = document.createElement('span');
  label.className = `planet-label${LABEL_MODIFIER[type] ?? ''}`;
  label.textContent = LABEL_TEXT[type] ?? type;
  elements.floating.appendChild(label);

  return label;
}

/** Moves an entity's mesh and label to match its world position. */
export function positionEntity(entity) {
  entity.mesh.position.set(entity.x, toSceneY(entity.y), 0);
  entity.label.style.left = toPercentX(entity.x);
  entity.label.style.top = toPercentY(entity.y + entity.radius + LABEL_GAP);
}

export function spawnEntity({ type, x, y, radius = radiusFor(type) }) {
  const mesh = createEntityMesh(type, radius);
  addToScene(mesh);

  const entity = {
    type,
    x,
    y,
    baseY: y,
    radius,
    mesh,
    label: createLabel(type),
    age: Math.random() * IDLE_PHASE_SPREAD
  };

  entities.push(entity);
  positionEntity(entity);

  return entity;
}

export function removeEntity(entity) {
  removeFromScene(entity.mesh);
  entity.label.remove();

  const index = entities.indexOf(entity);

  if (index >= 0) {
    entities.splice(index, 1);
  }
}

export function clearEntities() {
  for (const entity of [...entities]) {
    removeEntity(entity);
  }
}

/** Snapshot of the live list, safe to iterate while entities are removed. */
export function listEntities() {
  return [...entities];
}

/** Falls one simulation step, spinning as it goes. */
export function fallEntity(entity, dt, speed) {
  const drag = entity.type === ALIEN ? MOTION.ALIEN_FALL_FACTOR : 1;

  entity.age += dt;
  entity.y += dt * MOTION.FALL_SPEED * speed * drag;
  entity.mesh.rotation.y += dt * MOTION.SPIN_PLAYING;
  positionEntity(entity);
}

/** Gentle bobbing used by the attract screen. */
export function driftEntity(entity, dt) {
  entity.age += dt;
  entity.y =
    entity.baseY + Math.sin(entity.age * MOTION.BOB_SPEED) * MOTION.BOB_AMPLITUDE;
  entity.mesh.rotation.y += dt * MOTION.SPIN_IDLE;
  positionEntity(entity);
}

export function hasLeftArena(entity) {
  return entity.y - entity.radius > getWorldHeight();
}

/** Top-most entity under a world-space point, if any. */
export function findEntityAt(x, y) {
  return listEntities()
    .reverse()
    .find(entity => {
      const scale = entity.type === ALIEN ? HIT_SCALE.ALIEN : HIT_SCALE.PLANET;

      return Math.hypot(x - entity.x, y - entity.y) <= entity.radius * scale;
    });
}

/** True when a fresh spawn at `x` would overlap one that just entered. */
export function isEntryLaneBusy(x) {
  return entities.some(
    entity =>
      entity.y < SPAWN.TOP_ZONE_DEPTH &&
      Math.abs(entity.x - x) < SPAWN.MIN_HORIZONTAL_GAP
  );
}

/**
 * Keeps entities at the same relative height after the arena is resized, so
 * nothing teleports past the bottom edge.
 */
export function rescaleEntities(previousHeight) {
  const worldHeight = getWorldHeight();

  for (const entity of entities) {
    const span = 2 * entity.radius;
    const progress = (entity.y + entity.radius) / (previousHeight + span);

    entity.y = progress * (worldHeight + span) - entity.radius;
    positionEntity(entity);
  }
}
