export const TARGETS = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune'
];

export const PLANET_POINTS = {
  Mercury: 70,
  Mars: 60,
  Venus: 50,
  Neptune: 40,
  Uranus: 35,
  Saturn: 25,
  Jupiter: 15
};

export function newGame() {
  return {
    score: 0,
    lives: 5,
    misses: 0,
    speed: 1,
    sector: 1,
    bonus: 0,
    elapsed: 0,
    destroyed: 0,
    status: 'ready'
  };
}

export function planetSpawnInterval(speed, random = Math.random()) {
  return (1.2 + random * .35) / (1.1 * speed);
}

export function shoot(state, type) {
  if (state.status !== 'playing') {
    return {
      points: 0
    };
  }

  if (type === 'Earth') {
    state.bonus = 0;
    state.misses = 0;
    state.lives = Math.max(0, state.lives - 1);

    if (!state.lives) {
      state.status = 'over';
    }

    return {
      points: 0,
      damage: true
    };
  }

  if (type === 'Alien') {
    state.bonus = 10;

    return {
      points: 0,
      bonus: true
    };
  }

  if (!TARGETS.includes(type)) {
    return {
      points: 0
    };
  }

  const basePoints = PLANET_POINTS[type];
  const points = state.bonus > 0
    ? basePoints * 2
    : basePoints;

  state.score += points;
  state.destroyed++;
  state.sector = 1 + Math.floor(state.score / 250);
  state.speed = 1 + (state.sector - 1) * .1;

  return {
    points
  };
}

export function miss(state, type) {
  if (
    state.status !== 'playing' ||
    !TARGETS.includes(type)
  ) {
    return false;
  }

  state.misses++;

  if (state.misses === 3) {
    state.misses = 0;
    state.lives = Math.max(0, state.lives - 1);

    if (!state.lives) {
      state.status = 'over';
    }

    return true;
  }

  return false;
}

export function tick(state, dt) {
  if (state.status !== 'playing') {
    return;
  }

  state.elapsed += dt;
  state.bonus = Math.max(0, state.bonus - dt);
}
