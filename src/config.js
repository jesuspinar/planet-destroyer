/**
 * Presentation and tuning constants.
 *
 * Gameplay rules live in `core/game-core.js`; everything here only affects
 * how the game looks, sounds and feels.
 */

/** Logical play-field width. The height follows the arena aspect ratio. */
export const WORLD_WIDTH = 600;
export const INITIAL_WORLD_HEIGHT = 550;

/** `[shadow, highlight]` surface colours, keyed by entity type. */
export const PLANET_COLORS = {
  Mercury: ['#918b90', '#c7c3bc'],
  Venus: ['#d18b46', '#f1d49b'],
  Earth: ['#2469b7', '#6fac84'],
  Mars: ['#853a32', '#ed8657'],
  Jupiter: ['#a16b55', '#ecd2aa'],
  Saturn: ['#a28a60', '#edddb0'],
  Uranus: ['#338b9b', '#94dedc'],
  Neptune: ['#25479e', '#7094e6']
};

/** Surface styles understood by the planet fragment shader. */
export const SURFACE = {
  ROCKY: 0,
  BANDED: 1,
  TERRESTRIAL: 2,
  STRIPED: 3
};

export const PLANET_SURFACES = {
  Earth: SURFACE.TERRESTRIAL,
  Jupiter: SURFACE.BANDED,
  Saturn: SURFACE.BANDED,
  Venus: SURFACE.STRIPED,
  Uranus: SURFACE.STRIPED,
  Neptune: SURFACE.STRIPED
};

export const PLANET_RADII = {
  Jupiter: 36,
  Saturn: 30,
  Mercury: 22,
  Alien: 23
};

export const DEFAULT_PLANET_RADIUS = 28;

/** Distance in world units between a planet and its floating name tag. */
export const LABEL_GAP = 17;

/**
 * Decorative planets shown on the title screen. `heightFraction` is a share of
 * the world height, so the arrangement survives any arena shape.
 */
export const ATTRACT_LAYOUT = [
  { type: 'Jupiter', x: 98, heightFraction: 0.2, radius: 43 },
  { type: 'Saturn', x: 490, heightFraction: 0.17, radius: 31 },
  { type: 'Mars', x: 53, heightFraction: 0.59, radius: 23 },
  { type: 'Neptune', x: 537, heightFraction: 0.53, radius: 26 },
  { type: 'Earth', x: 434, heightFraction: 0.8, radius: 31 },
  { type: 'Venus', x: 162, heightFraction: 0.86, radius: 25 }
];

export const SPAWN = {
  FIRST_PLANET_DELAY: 0.2,
  FIRST_ALIEN_DELAY: 12,
  FIRST_ALIEN_JITTER: 6,
  ALIEN_DELAY: 15,
  ALIEN_JITTER: 9,
  EARTH_CHANCE: 0.09,
  EDGE_MARGIN: 60,
  MIN_HORIZONTAL_GAP: 95,
  TOP_ZONE_DEPTH: 100,
  PLACEMENT_ATTEMPTS: 6,
  PLANET_Y: -60,
  ALIEN_Y: -50
};

export const MOTION = {
  FALL_SPEED: 48,
  ALIEN_FALL_FACTOR: 0.85,
  SPIN_PLAYING: 0.18,
  SPIN_IDLE: 0.1,
  BOB_SPEED: 0.5,
  BOB_AMPLITUDE: 5
};

export const LOOP = {
  FIXED_STEP: 1 / 120,
  MAX_FRAME_DELTA: 0.1,
  HUD_REFRESH_MS: 80
};

/** Generous click targets: aliens are smaller, so they forgive more. */
export const HIT_SCALE = {
  ALIEN: 1.4,
  PLANET: 1.12
};

export const BURST = {
  PARTICLES: 32,
  REDUCED_MOTION_PARTICLES: 10,
  MIN_SPEED: 35,
  SPEED_JITTER: 130,
  PARTICLE_SIZE: 3,
  DEPTH: 20,
  LIFETIME: 0.7,
  DRAG: 1.2,
  GRAVITY: 65,
  ALIEN_COLOR: 0xd6ff70
};

export const STARFIELD = {
  COUNT: 240,
  HEIGHT: 1800,
  DEPTH: -100,
  SIZE: 1.4,
  OPACITY: 0.8,
  HUE: 0.58,
  HUE_JITTER: 0.13,
  SATURATION: 0.3,
  LIGHTNESS: 0.25,
  LIGHTNESS_JITTER: 0.5
};

export const FEEDBACK_MS = {
  NOTICE: 1700,
  DAMAGE_FLASH: 220,
  FLOATING_SCORE: 850
};

export const prefersReducedMotion = matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
