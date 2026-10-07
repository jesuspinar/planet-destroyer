/**
 * Entry point: owns the game state, the frame loop and the input wiring.
 *
 * Responsibilities are delegated outwards — rules to `game-core`, pixels to
 * `stage`/`entities`/`effects`, DOM to `hud` — so this module only has to say
 * what happens when, not how.
 */

import * as audio from './platform/audio.js';
import { ATTRACT_LAYOUT, LOOP, prefersReducedMotion } from './config.js';
import { elements } from './ui/dom.js';
import {
  clearBursts,
  scaleBurstHeights,
  spawnBurst,
  updateBursts
} from './render/effects.js';
import {
  clearEntities,
  driftEntity,
  fallEntity,
  findEntityAt,
  hasLeftArena,
  listEntities,
  removeEntity,
  rescaleEntities,
  spawnEntity
} from './systems/entities.js';
import { createFullscreenController } from './ui/fullscreen.js';
import { STATUS, miss, newGame, shoot, tick } from './core/game-core.js';
import * as hud from './ui/hud.js';
import { registerModelContextTools } from './platform/model-context.js';
import { advanceSpawner, resetSpawner, retimeForSpeed } from './systems/spawner.js';
import {
  createStage,
  onContextLost,
  renderStage,
  resizeStage
} from './render/stage.js';
import {
  getWorldHeight,
  setWorldHeight,
  worldHeightFor,
  worldWidth
} from './core/world.js';

const TEXT_INPUTS = 'input,textarea,select,[contenteditable="true"]';

let state = newGame();
let lastFrameTime = 0;
let lastHudTime = 0;
let stepAccumulator = 0;
let stageReady = false;

const fullscreen = createFullscreenController({ onNotice: hud.showNotice });

/* -------------------------------------------------------------- lifecycle */

function startGame() {
  if (!stageReady) {
    return;
  }

  if (state.status === STATUS.PAUSED) {
    resumeGame();
    return;
  }

  state = { ...newGame(), status: STATUS.PLAYING };
  stepAccumulator = 0;
  resetSpawner();
  clearEntities();
  clearBursts();
  hud.hideOverlay();
  hud.clearNotice();
  hud.renderHud(state);
  hud.focusArena();
  audio.playSound('launch');
}

function pauseGame() {
  if (state.status !== STATUS.PLAYING) {
    return;
  }

  state.status = STATUS.PAUSED;
  hud.showPauseOverlay();
  hud.renderHud(state);
}

function resumeGame() {
  if (state.status !== STATUS.PAUSED) {
    return;
  }

  state.status = STATUS.PLAYING;
  stepAccumulator = 0;
  hud.hideOverlay();
  hud.renderHud(state);
  hud.focusArena();
}

function togglePause() {
  if (state.status === STATUS.PLAYING) {
    pauseGame();
  } else {
    resumeGame();
  }
}

function endGame() {
  state.status = STATUS.OVER;
  hud.showGameOverOverlay(state);
  hud.renderHud(state);
  audio.playSound('gameOver');
}

/** Rejects a model-context start request while a game is already running. */
function startGameFromTool() {
  if (![STATUS.READY, STATUS.OVER].includes(state.status)) {
    throw new Error('A game is already in progress.');
  }

  startGame();
}

/* ------------------------------------------------------------- simulation */

function reportDamage() {
  hud.flashDamage();
  audio.playSound('damage');
}

function retireEntity(entity) {
  if (miss(state, entity.type)) {
    reportDamage();
    hud.showMissNotice();
  }

  removeEntity(entity);
}

function simulate(dt) {
  tick(state, dt);
  advanceSpawner(dt, state.speed);

  for (const entity of listEntities()) {
    fallEntity(entity, dt, state.speed);

    if (!hasLeftArena(entity)) {
      continue;
    }

    retireEntity(entity);

    if (state.status === STATUS.OVER) {
      endGame();
      break;
    }
  }
}

/** Runs the simulation on a fixed step so physics stays frame-rate agnostic. */
function runFixedSteps(dt) {
  stepAccumulator += dt;

  while (stepAccumulator >= LOOP.FIXED_STEP) {
    simulate(LOOP.FIXED_STEP);
    stepAccumulator -= LOOP.FIXED_STEP;

    if (state.status !== STATUS.PLAYING) {
      stepAccumulator = 0;
      break;
    }
  }
}

function frame(now) {
  const elapsed = (now - lastFrameTime) / 1000;
  const dt = lastFrameTime ? Math.min(elapsed, LOOP.MAX_FRAME_DELTA) : 0;

  lastFrameTime = now;

  if (state.status === STATUS.PLAYING) {
    runFixedSteps(dt);

    if (now - lastHudTime > LOOP.HUD_REFRESH_MS) {
      hud.renderHud(state);
      lastHudTime = now;
    }
  } else if (state.status === STATUS.READY && !prefersReducedMotion) {
    for (const entity of listEntities()) {
      driftEntity(entity, dt);
    }
  }

  if (state.status !== STATUS.PAUSED) {
    updateBursts(dt);
  }

  renderStage();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ input */

function reportShot(result, { x, y, previousSpeed }) {
  if (result.damage) {
    reportDamage();
    hud.showFloatingScore('−1 LIFE', x, y, { negative: true });
    hud.showEarthNotice();
    return;
  }

  if (result.bonus) {
    hud.showFloatingScore('2× POINTS', x, y);
    hud.showBonusNotice();
    audio.playBonusChime();
    return;
  }

  hud.showFloatingScore(`+${result.points}`, x, y);
  audio.playDestroySound();

  if (state.speed > previousSpeed) {
    retimeForSpeed(previousSpeed, state.speed);
    hud.showSectorNotice(state);
  }
}

function toWorldPoint({ clientX, clientY }) {
  const rect = elements.arena.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * worldWidth,
    y: ((clientY - rect.top) / rect.height) * getWorldHeight()
  };
}

function fire(event) {
  if (state.status !== STATUS.PLAYING || event.target.closest('button')) {
    return;
  }

  const { x, y } = toWorldPoint(event);
  const entity = findEntityAt(x, y);

  if (!entity) {
    audio.playSound('emptyShot');
    return;
  }

  const previousSpeed = state.speed;
  const result = shoot(state, entity.type);

  spawnBurst(entity);
  removeEntity(entity);
  reportShot(result, { x, y, previousSpeed });
  hud.renderHud(state);

  if (state.status === STATUS.OVER) {
    endGame();
  }
}

const KEY_BINDINGS = {
  f: event => {
    event.preventDefault();
    void fullscreen.toggle();
  },
  p: event => {
    event.preventDefault();
    togglePause();
  },
  m: () => audio.toggleMute(),
  escape: event => {
    if (!fullscreen.isWindowMode()) {
      return;
    }

    event.preventDefault();
    fullscreen.exitWindowMode();
  }
};

function handleKeydown(event) {
  const chord = event.ctrlKey || event.metaKey || event.altKey;
  const typing = event.target.closest?.(TEXT_INPUTS);

  if (event.repeat || chord || typing || elements.helpDialog.open) {
    return;
  }

  KEY_BINDINGS[event.key.toLowerCase()]?.(event);
}

function openHelp() {
  pauseGame();
  elements.helpDialog.showModal();
}

const closeHelp = () => elements.helpDialog.close();

function wireControls() {
  elements.start.addEventListener('click', startGame);
  elements.pause.addEventListener('click', togglePause);
  elements.sound.addEventListener('click', audio.toggleMute);
  elements.arena.addEventListener('pointerdown', fire);
  elements.help.addEventListener('click', openHelp);
  elements.closeHelp.addEventListener('click', closeHelp);
  elements.helpReady.addEventListener('click', closeHelp);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseGame();
    }
  });
}

/* ------------------------------------------------------------ arena setup */

function showAttractScreen() {
  clearEntities();
  clearBursts();

  for (const { type, x, heightFraction, radius } of ATTRACT_LAYOUT) {
    spawnEntity({ type, x, y: getWorldHeight() * heightFraction, radius });
  }
}

/** Re-derives the world height from the arena box and keeps content in place. */
function resize() {
  const { width, height } = elements.arena.getBoundingClientRect();

  if (!width || !height) {
    return;
  }

  const previousHeight = getWorldHeight();

  setWorldHeight(worldHeightFor(width, height));
  resizeStage({
    pixelWidth: width,
    pixelHeight: height,
    worldHeight: getWorldHeight()
  });

  if (state.status === STATUS.READY) {
    showAttractScreen();
    return;
  }

  rescaleEntities(previousHeight);
  scaleBurstHeights(getWorldHeight() / previousHeight);
}

function handleContextLost() {
  pauseGame();
  hud.showContextLostOverlay(() => location.reload());
}

function boot() {
  audio.watchMute(hud.renderSoundButton);
  wireControls();
  registerModelContextTools({
    getState: () => state,
    startGame: startGameFromTool
  });

  try {
    createStage(elements.canvasHost);
  } catch (error) {
    console.error(error);
    hud.showUnsupportedOverlay();
    return;
  }

  stageReady = true;
  onContextLost(handleContextLost);
  resize();
  new ResizeObserver(resize).observe(elements.arena);
  hud.renderHud(state);
  requestAnimationFrame(frame);
}

boot();
