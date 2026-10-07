/**
 * The logical coordinate space shared by the 3D scene and the HTML overlays.
 *
 * World coordinates run from `(0, 0)` at the top-left of the arena to
 * `(WORLD_WIDTH, worldHeight)` at the bottom-right, so "y grows downwards"
 * like the DOM. Three.js wants the opposite, hence `toSceneY`.
 */

import { INITIAL_WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';

let worldHeight = INITIAL_WORLD_HEIGHT;

export const worldWidth = WORLD_WIDTH;

export function getWorldHeight() {
  return worldHeight;
}

export function setWorldHeight(height) {
  worldHeight = height;
}

/** World height matching the arena's pixel aspect ratio. */
export function worldHeightFor(pixelWidth, pixelHeight) {
  return (WORLD_WIDTH * pixelHeight) / pixelWidth;
}

export function toSceneY(y) {
  return worldHeight - y;
}

export function toPercentX(x) {
  return `${(x / WORLD_WIDTH) * 100}%`;
}

export function toPercentY(y) {
  return `${(y / worldHeight) * 100}%`;
}
