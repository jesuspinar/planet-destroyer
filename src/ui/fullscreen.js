/**
 * Fullscreen toggle with a CSS-only fallback.
 *
 * When the Fullscreen API is missing or refuses the request (common inside
 * iframes), the shell expands to fill the viewport instead — "window mode".
 */

import { elements } from './dom.js';

const nativeTarget = () =>
  document.fullscreenElement || document.webkitFullscreenElement;

export function createFullscreenController({ onNotice }) {
  const shell = elements.gameShell;

  let windowMode = false;
  let pending = false;

  const isNative = () => nativeTarget() === shell;

  function render() {
    // Leaving window mode is implicit once the browser grants real fullscreen.
    if (isNative()) {
      windowMode = false;
    }

    const active = isNative() || windowMode;

    shell.classList.toggle('fullscreen-layout', active);
    shell.classList.toggle('window-fullscreen', windowMode);
    document.body.classList.toggle('game-expanded', active);

    elements.fullscreen.setAttribute('aria-pressed', String(active));
    elements.fullscreen.setAttribute(
      'aria-label',
      active ? 'Exit fullscreen' : 'Enter fullscreen'
    );
    elements.fullscreen.title = active
      ? 'Exit fullscreen (F or Esc)'
      : 'Fullscreen (F)';
    elements.fullscreenLabel.textContent = active
      ? 'Exit fullscreen'
      : 'Fullscreen';
  }

  async function exitNative() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;

    if (exit) {
      await exit.call(document);
    }
  }

  async function enterNative() {
    const request = shell.requestFullscreen || shell.webkitRequestFullscreen;

    if (!request) {
      windowMode = true;
      return;
    }

    try {
      await request.call(shell);
    } catch {
      windowMode = true;
    }
  }

  async function toggle() {
    if (pending) {
      return;
    }

    pending = true;

    try {
      if (windowMode) {
        windowMode = false;
      } else if (isNative()) {
        await exitNative();
      } else {
        await enterNative();
      }

      render();
    } catch {
      onNotice('Use Escape or your browser’s fullscreen control to exit.');
    } finally {
      pending = false;
    }
  }

  function exitWindowMode() {
    windowMode = false;
    render();
  }

  elements.fullscreen.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', render);
  document.addEventListener('webkitfullscreenchange', render);
  shell.addEventListener('webkitfullscreenerror', () => {
    windowMode = true;
    render();
  });

  return {
    toggle,
    exitWindowMode,
    isWindowMode: () => windowMode
  };
}
