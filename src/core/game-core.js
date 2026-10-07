/**
 * Pure game rules: scoring, lives, bonuses and progression.
 *
 * Nothing here touches the DOM, Three.js or timers, so the rules can be
 * exercised on their own. Every function takes the mutable `state` object
 * produced by `newGame()`.
 */

export const EARTH = 'Earth';
export const ALIEN = 'Alien';

/** Planets worth points. Earth and aliens are handled separately. */
export const TARGETS = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune'
];

/** Smaller, faster-looking planets are worth more. */
export const PLANET_POINTS = {
  Mercury: 70,
  Mars: 60,
  Venus: 50,
  Neptune: 40,
  Uranus: 35,
  Saturn: 25,
  Jupiter: 15
};

export const STATUS = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over'
});

export const STARTING_LIVES = 5;
export const MISS_LIMIT = 3;
export const BONUS_DURATION = 10;
export const BONUS_MULTIPLIER = 2;
export const POINTS_PER_SECTOR = 250;
export const SPEED_PER_SECTOR = 0.1;

const BASE_SPAWN_INTERVAL = 1.2;
const SPAWN_INTERVAL_JITTER = 0.35;
const SPAWN_RATE = 1.1;

export function newGame() {
  return {
    score: 0,
    lives: STARTING_LIVES,
    misses: 0,
    speed: 1,
    sector: 1,
    bonus: 0,
    elapsed: 0,
    destroyed: 0,
    status: STATUS.READY
  };
}

export function isTarget(type) {
  return TARGETS.includes(type);
}

/**
 * Seconds until the next planet drops.
 *
 * The interval shrinks in proportion to `speed`, so planets always fall the
 * same distance apart however fast the sector moves.
 */
export function planetSpawnInterval(speed, random = Math.random()) {
  return (
    (BASE_SPAWN_INTERVAL + random * SPAWN_INTERVAL_JITTER) / (SPAWN_RATE * speed)
  );
}

const noHit = () => ({ points: 0, damage: false, bonus: false });

function loseLife(state) {
  state.lives = Math.max(0, state.lives - 1);

  if (!state.lives) {
    state.status = STATUS.OVER;
  }
}

/** Earth is home: it costs a life and wipes the bonus and the miss streak. */
function shootEarth(state) {
  state.bonus = 0;
  state.misses = 0;
  loseLife(state);

  return { points: 0, damage: true, bonus: false };
}

/** Aliens grant double points, and a second alien refreshes the timer. */
function shootAlien(state) {
  state.bonus = BONUS_DURATION;

  return { points: 0, damage: false, bonus: true };
}

function shootTarget(state, type) {
  const multiplier = state.bonus > 0 ? BONUS_MULTIPLIER : 1;
  const points = PLANET_POINTS[type] * multiplier;

  state.score += points;
  state.destroyed += 1;
  state.sector = 1 + Math.floor(state.score / POINTS_PER_SECTOR);
  state.speed = 1 + (state.sector - 1) * SPEED_PER_SECTOR;

  return { points, damage: false, bonus: false };
}

const SPECIAL_SHOTS = {
  [EARTH]: shootEarth,
  [ALIEN]: shootAlien
};

/**
 * Resolves a hit on `type`.
 *
 * @returns `{ points, damage, bonus }` describing what the player earned.
 */
export function shoot(state, type) {
  if (state.status !== STATUS.PLAYING) {
    return noHit();
  }

  const special = SPECIAL_SHOTS[type];

  if (special) {
    return special(state);
  }

  return isTarget(type) ? shootTarget(state, type) : noHit();
}

/**
 * Records a target planet leaving the arena untouched.
 *
 * @returns `true` when this miss cost a life.
 */
export function miss(state, type) {
  if (state.status !== STATUS.PLAYING || !isTarget(type)) {
    return false;
  }

  state.misses += 1;

  if (state.misses < MISS_LIMIT) {
    return false;
  }

  state.misses = 0;
  loseLife(state);

  return true;
}

/** Advances the clock and runs down the double-points bonus. */
export function tick(state, dt) {
  if (state.status !== STATUS.PLAYING) {
    return;
  }

  state.elapsed += dt;
  state.bonus = Math.max(0, state.bonus - dt);
}
