/**
 * Tiny Web Audio blip synthesiser.
 *
 * The context is created lazily on the first unmuted sound, which keeps
 * browsers from blocking it before the player has interacted with the page.
 * Any failure mutes the game permanently rather than throwing into the game
 * loop.
 */

const GAIN = 0.065;
const SILENCE = 0.001;
const MIN_SWEEP_FREQUENCY = 40;

const SOUNDS = {
  launch: { frequency: 220, duration: 0.12 },
  gameOver: { frequency: 100, duration: 0.35, type: 'sawtooth' },
  damage: { frequency: 90, duration: 0.18, type: 'sawtooth' },
  emptyShot: { frequency: 130, duration: 0.045 },
  soundOn: { frequency: 440, duration: 0.1 },
  bonusLow: { frequency: 660, duration: 0.15 },
  bonusHigh: { frequency: 880, duration: 0.18 }
};

const DESTROY_SOUND = {
  frequency: 370,
  frequencyJitter: 180,
  duration: 0.065,
  type: 'triangle'
};

const BONUS_CHIME_GAP_MS = 90;

let muted = true;
let context = null;
let onMuteChange = () => {};

export function isMuted() {
  return muted;
}

/** Registers the listener notified whenever the mute state changes. */
export function watchMute(listener) {
  onMuteChange = listener;
  listener(muted);
}

function play({ frequency, duration, type = 'sine' }) {
  if (muted) {
    return;
  }

  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();

    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }

    const { currentTime } = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(MIN_SWEEP_FREQUENCY, frequency * 0.5),
      currentTime + duration
    );

    gain.gain.setValueAtTime(GAIN, currentTime);
    gain.gain.exponentialRampToValueAtTime(SILENCE, currentTime + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(currentTime + duration);
  } catch {
    muted = true;
    onMuteChange(muted);
  }
}

export function playSound(name) {
  play(SOUNDS[name]);
}

/** Pitch-randomised blip so rapid-fire hits do not sound mechanical. */
export function playDestroySound() {
  play({
    ...DESTROY_SOUND,
    frequency:
      DESTROY_SOUND.frequency + Math.random() * DESTROY_SOUND.frequencyJitter
  });
}

export function playBonusChime() {
  playSound('bonusLow');
  setTimeout(() => playSound('bonusHigh'), BONUS_CHIME_GAP_MS);
}

export function toggleMute() {
  muted = !muted;
  onMuteChange(muted);

  if (!muted) {
    playSound('soundOn');
  }
}
