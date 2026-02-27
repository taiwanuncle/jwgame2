/**
 * SFX — Sound effects using Web Audio API oscillator synthesis.
 * No external audio files needed. All sounds are generated procedurally.
 * Respects localStorage sfx_enabled setting.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  // Recreate if closed or missing
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Keep AudioContext alive on user interaction
function resumeOnInteraction() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}
window.addEventListener("click", resumeOnInteraction);
window.addEventListener("touchstart", resumeOnInteraction);

function isSfxEnabled(): boolean {
  try {
    return localStorage.getItem("sfx_enabled") !== "false";
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean) {
  try {
    localStorage.setItem("sfx_enabled", String(enabled));
  } catch { /* */ }
}

export function getSfxEnabled(): boolean {
  return isSfxEnabled();
}

// Helper: play a tone
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  delay = 0,
) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// Helper: play noise burst (for card sounds)
function playNoise(duration: number, volume = 0.08, delay = 0) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
  source.stop(ctx.currentTime + delay + duration);
}

/** Card flip sound — short snap */
export function playCardFlip() {
  playNoise(0.08, 0.12);
  playTone(800, 0.06, "square", 0.04);
}

/** Card deal sound — softer flip */
export function playCardDeal() {
  playNoise(0.06, 0.08);
  playTone(600, 0.05, "sine", 0.03);
}

/** My turn notification — gentle ascending chime */
export function playMyTurn() {
  playTone(523, 0.15, "sine", 0.12);        // C5
  playTone(659, 0.15, "sine", 0.12, 0.12);  // E5
  playTone(784, 0.2, "sine", 0.15, 0.24);   // G5
}

/** Thank you button — cheerful ding */
export function playThankYou() {
  playTone(880, 0.12, "sine", 0.15);         // A5
  playTone(1109, 0.12, "sine", 0.15, 0.08);  // C#6
  playTone(1319, 0.25, "sine", 0.12, 0.16);  // E6
}

/** Card swap — whoosh + tap */
export function playSwap() {
  playNoise(0.1, 0.1);
  playTone(400, 0.08, "triangle", 0.08);
  playTone(600, 0.1, "triangle", 0.08, 0.08);
}

/** Discard — soft thud */
export function playDiscard() {
  playTone(200, 0.12, "sine", 0.1);
  playNoise(0.06, 0.06, 0.02);
}

/** Round end — descending resolution */
export function playRoundEnd() {
  playTone(784, 0.2, "sine", 0.12);        // G5
  playTone(659, 0.2, "sine", 0.12, 0.15);  // E5
  playTone(523, 0.3, "sine", 0.15, 0.3);   // C5
  playTone(523, 0.4, "triangle", 0.06, 0.3); // harmony
}

/** Game over — fanfare */
export function playGameOver() {
  playTone(523, 0.15, "sine", 0.12);         // C5
  playTone(659, 0.15, "sine", 0.12, 0.12);   // E5
  playTone(784, 0.15, "sine", 0.12, 0.24);   // G5
  playTone(1047, 0.4, "sine", 0.15, 0.36);   // C6
  playTone(784, 0.4, "triangle", 0.06, 0.36); // harmony
}

/** Pair match — satisfying sparkle */
export function playPairMatch() {
  playTone(880, 0.1, "sine", 0.12);          // A5
  playTone(1175, 0.1, "sine", 0.12, 0.06);   // D6
  playTone(1397, 0.2, "sine", 0.10, 0.12);   // F#6
  playTone(1760, 0.3, "sine", 0.08, 0.18);   // A6 (octave resolution)
}

/** Straight bonus — dramatic flourish */
export function playStraight() {
  playTone(523, 0.1, "triangle", 0.12);       // C5
  playTone(587, 0.1, "triangle", 0.12, 0.07); // D5
  playTone(659, 0.1, "triangle", 0.12, 0.14); // E5
  playTone(698, 0.1, "triangle", 0.12, 0.21); // F5
  playTone(784, 0.12, "sine", 0.14, 0.28);    // G5 (sustain)
  playTone(1047, 0.35, "sine", 0.10, 0.35);   // C6 (resolve)
}

/** Multiplier round alert — impactful boom */
export function playMultiplierAlert() {
  playTone(220, 0.2, "sine", 0.15);           // A3 (bass)
  playTone(440, 0.15, "triangle", 0.12, 0.05);// A4
  playTone(880, 0.25, "sine", 0.10, 0.15);    // A5 (octave rise)
  playNoise(0.08, 0.1, 0.1);                  // impact
}

/** Button click — subtle tick */
export function playClick() {
  playTone(1000, 0.04, "square", 0.05);
}

/** Timer warning (<=5s) — urgent beep */
export function playTimerWarning() {
  playTone(880, 0.08, "square", 0.1);
  playTone(880, 0.08, "square", 0.1, 0.12);
}
