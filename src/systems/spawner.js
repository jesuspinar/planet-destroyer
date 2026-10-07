/**
 * Decides what drops into the arena and when.
 *
 * Target planets cycle in order so every planet shows up, with the occasional
 * Earth thrown in; aliens arrive on their own slower timer.
 */

import { SPAWN } from '../config.js';
import { isEntryLaneBusy, spawnEntity } from './entities.js';
import { ALIEN, EARTH, TARGETS, planetSpawnInterval } from '../core/game-core.js';
import { worldWidth } from '../core/world.js';

let planetCountdown = 0;
let alienCountdown = 0;
let planetsSpawned = 0;

export function resetSpawner() {
  planetCountdown = SPAWN.FIRST_PLANET_DELAY;
  alienCountdown =
    SPAWN.FIRST_ALIEN_DELAY + Math.random() * SPAWN.FIRST_ALIEN_JITTER;
  planetsSpawned = 0;
}

const randomColumn = () =>
  SPAWN.EDGE_MARGIN + Math.random() * (worldWidth - 2 * SPAWN.EDGE_MARGIN);

/** Retries a few times to avoid dropping a planet onto a fresh neighbour. */
function freeColumn() {
  let x = randomColumn();

  for (
    let attempt = 0;
    attempt < SPAWN.PLACEMENT_ATTEMPTS && isEntryLaneBusy(x);
    attempt += 1
  ) {
    x = randomColumn();
  }

  return x;
}

/** The first drop is never Earth, so the player always scores something. */
function nextPlanetType() {
  const earthDue =
    planetsSpawned > 0 && Math.random() < SPAWN.EARTH_CHANCE;
  const type = earthDue ? EARTH : TARGETS[planetsSpawned % TARGETS.length];

  planetsSpawned += 1;

  return type;
}

export function advanceSpawner(dt, speed) {
  planetCountdown -= dt;
  alienCountdown -= dt;

  while (planetCountdown <= 0) {
    spawnEntity({
      type: nextPlanetType(),
      x: freeColumn(),
      y: SPAWN.PLANET_Y
    });
    planetCountdown += planetSpawnInterval(speed);
  }

  if (alienCountdown <= 0) {
    spawnEntity({ type: ALIEN, x: randomColumn(), y: SPAWN.ALIEN_Y });
    alienCountdown = SPAWN.ALIEN_DELAY + Math.random() * SPAWN.ALIEN_JITTER;
  }
}

/**
 * Rescales the pending countdown when the sector speeds up, keeping the
 * on-screen gap between planets constant across the change.
 */
export function retimeForSpeed(previousSpeed, speed) {
  planetCountdown *= previousSpeed / speed;
}
