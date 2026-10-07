/**
 * Every DOM write that is not the WebGL canvas: scoreboard, overlays and the
 * transient feedback layer.
 *
 * Functions here read game state but never change it.
 */

import { FEEDBACK_MS } from '../config.js';
import { elements } from './dom.js';
import { BONUS_DURATION, MISS_LIMIT, STARTING_LIVES, STATUS } from '../core/game-core.js';
import { toPercentX, toPercentY } from '../core/world.js';

const SCORE_DIGITS = 4;
const SECTOR_DIGITS = 3;

const LAUNCH_ICON =
  '<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M3.5 20.5L17 7M9 7H17V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg></span>';

const STATUS_LABELS = {
  [STATUS.READY]: 'AWAITING LAUNCH',
  [STATUS.PLAYING]: 'MISSION IN PROGRESS',
  [STATUS.PAUSED]: 'MISSION PAUSED',
  [STATUS.OVER]: 'MISSION COMPLETE'
};

let noticeTimer;

const pad = (value, digits) => String(value).padStart(digits, '0');

function renderScoreboard(state) {
  elements.score.textContent = pad(state.score, SCORE_DIGITS);
  elements.speed.innerHTML = `${state.speed.toFixed(1)}<span>×</span>`;
  elements.sector.textContent = `SECTOR ${pad(state.sector, SECTOR_DIGITS)}`;
}

function renderLives(state) {
  elements.hearts.innerHTML = Array.from({ length: STARTING_LIVES }, (_, i) => {
    const spent = i >= state.lives ? 'dead-heart' : '';

    return `<span class="${spent}">♥</span>`;
  }).join(' ');
  elements.hearts.setAttribute('aria-label', `${state.lives} lives`);
  elements.livesCount.textContent = `${state.lives} / ${STARTING_LIVES}`;
}

function renderMisses(state) {
  elements.missCount.textContent = `${state.misses} / ${MISS_LIMIT}`;
  elements.missDots.setAttribute(
    'aria-label',
    `${state.misses} of ${MISS_LIMIT} planets missed`
  );

  [...elements.missDots.children].forEach((dot, i) =>
    dot.classList.toggle('active', i < state.misses)
  );
}

function renderBonus(state) {
  const active = state.bonus > 0;

  elements.bonusBanner.hidden = !active;
  elements.bonusTime.textContent = `${state.bonus.toFixed(1)}s`;
  elements.bonusProgress.style.width = `${(state.bonus / BONUS_DURATION) * 100}%`;
  elements.bonusLabel.textContent = active
    ? 'DOUBLE POINTS ACTIVE'
    : 'KEEP AN EYE OUT';
}

function renderPauseButton(state) {
  const paused = state.status === STATUS.PAUSED;

  elements.pause.disabled = ![STATUS.PLAYING, STATUS.PAUSED].includes(
    state.status
  );
  elements.pause.textContent = paused ? '▶' : 'Ⅱ';
  elements.pause.setAttribute(
    'aria-label',
    paused ? 'Resume game' : 'Pause game'
  );
}

function renderStatus(state) {
  elements.gameStatus.textContent = STATUS_LABELS[state.status];
  elements.arena.classList.toggle('playing', state.status === STATUS.PLAYING);
}

export function renderHud(state) {
  renderScoreboard(state);
  renderLives(state);
  renderMisses(state);
  renderBonus(state);
  renderPauseButton(state);
  renderStatus(state);
}

export function renderSoundButton(muted) {
  elements.soundLabel.textContent = muted ? 'Sound off' : 'Sound on';
  elements.sound.setAttribute(
    'aria-label',
    muted ? 'Turn sound on' : 'Turn sound off'
  );
  elements.sound.setAttribute('aria-pressed', String(!muted));
}

function showOverlay({ title, description, action, hint }) {
  elements.overlayTitle.innerHTML = title;
  elements.overlayDescription.innerHTML = description;
  elements.start.innerHTML = `${action} ${LAUNCH_ICON}`;
  elements.startHint.textContent = hint;
  elements.overlay.hidden = false;
}

export function hideOverlay() {
  elements.overlay.hidden = true;
}

export function showPauseOverlay() {
  showOverlay({
    title: 'COSMIC<br><em>TIME-OUT</em>',
    description: 'Take a breath.<br>Your universe can wait.',
    action: 'RESUME MISSION',
    hint: 'PRESS P TO RESUME'
  });
}

export function showGameOverOverlay({ score, destroyed }) {
  showOverlay({
    title: 'THAT WAS<br><em>COSMIC.</em>',
    description:
      `<strong>${score} POINTS</strong> · ${destroyed} PLANETS DESTROYED` +
      '<br>The universe is ready for round two.',
    action: 'PLAY AGAIN',
    hint: 'FIVE FRESH LIVES. ONE MORE MISSION.'
  });
}

/** Dead end: WebGL is unavailable, so the game can never start. */
export function showUnsupportedOverlay() {
  elements.overlayTitle.textContent = 'SPACE IS OFFLINE';
  elements.overlayDescription.textContent =
    'This game needs WebGL. Enable hardware acceleration or try another browser.';
  elements.start.hidden = true;
}

export function showContextLostOverlay(onReload) {
  elements.overlayDescription.textContent =
    'The graphics connection was interrupted. Reload the page to fly again.';
  elements.start.textContent = 'RELOAD GAME';
  elements.start.onclick = onReload;
}

export function showNotice(text) {
  elements.notice.textContent = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(clearNotice, FEEDBACK_MS.NOTICE);
}

export function clearNotice() {
  elements.notice.textContent = '';
}

export function showMissNotice() {
  showNotice(`${MISS_LIMIT} missed planets · −1 life`);
}

export function showEarthNotice() {
  showNotice('Earth is home. Let it pass.');
}

export function showBonusNotice() {
  showNotice(`Double points · ${BONUS_DURATION} seconds`);
}

export function showSectorNotice({ sector, speed }) {
  showNotice(`SECTOR ${pad(sector, SECTOR_DIGITS)} · ${speed.toFixed(1)}×`);
}

export function flashDamage() {
  elements.damage.classList.add('flash');
  setTimeout(
    () => elements.damage.classList.remove('flash'),
    FEEDBACK_MS.DAMAGE_FLASH
  );
}

/** Score popup that drifts up from where the player hit. */
export function showFloatingScore(text, x, y, { negative = false } = {}) {
  const popup = document.createElement('span');

  popup.className = `float-score${negative ? ' bad' : ''}`;
  popup.textContent = text;
  popup.style.left = toPercentX(x);
  popup.style.top = toPercentY(y);
  elements.floating.appendChild(popup);

  setTimeout(() => popup.remove(), FEEDBACK_MS.FLOATING_SCORE);
}

export function focusArena() {
  elements.arena.focus({ preventScroll: true });
}
