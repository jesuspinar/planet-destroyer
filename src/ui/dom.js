/**
 * Single place where the module graph touches `index.html`.
 *
 * The entry script is a deferred ES module, so the document is already parsed
 * by the time these lookups run.
 */

const byId = id => document.getElementById(id);

export const elements = Object.freeze({
  gameShell: byId('game-shell'),
  arena: byId('arena'),
  canvasHost: byId('canvas-host'),
  floating: byId('floating'),
  damage: byId('damage'),
  notice: byId('notice'),

  score: byId('score'),
  speed: byId('speed'),
  sector: byId('sector'),
  gameStatus: byId('game-status'),
  hearts: byId('hearts'),
  livesCount: byId('lives-count'),
  missCount: byId('miss-count'),
  missDots: byId('miss-dots'),

  bonusBanner: byId('bonus-banner'),
  bonusLabel: byId('bonus-label'),
  bonusTime: byId('bonus-time'),
  bonusProgress: byId('bonus-progress'),

  overlay: byId('overlay'),
  overlayTitle: byId('overlay-title'),
  overlayDescription: byId('overlay-description'),
  start: byId('start'),
  startHint: byId('start-hint'),

  pause: byId('pause'),
  sound: byId('sound'),
  soundLabel: byId('sound-label'),
  fullscreen: byId('fullscreen'),
  fullscreenLabel: byId('fullscreen-label'),

  help: byId('help'),
  helpDialog: byId('help-dialog'),
  closeHelp: byId('close-help'),
  helpReady: byId('help-ready')
});
