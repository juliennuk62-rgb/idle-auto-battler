// SoundSystem — sons 8-bit via Web Audio API oscillators directs.
//
// Approche simple et fiable : un OscillatorNode par son, avec enveloppe de volume.
// Pas de lib externe, pas de paramètres obscurs. Si ça ne marche pas,
// c'est que l'AudioContext est bloqué par le navigateur (fix via user gesture).

let audioCtx = null;

/**
 * Beep simple : fréquence, durée, type d'onde, volume.
 * Crée un oscillator + gain envelope, le joue une fois, nettoie après.
 */
function beep({ freq = 440, duration = 0.1, type = 'square', volume = 0.15, slide = 0 }) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) {
      // Slide de fréquence (pour montée/descente)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, freq + slide),
        audioCtx.currentTime + duration
      );
    }

    // Enveloppe : attaque rapide, decay exponentiel
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silent fail
  }
}

/**
 * Joue plusieurs beeps en séquence (arpège, fanfare, etc.)
 */
function sequence(notes, interval = 0.05) {
  if (!audioCtx) return;
  notes.forEach((note, i) => {
    setTimeout(() => beep(note), i * interval * 1000);
  });
}

// ── Catalogue de sons ──────────────────────────────────────────────────────
// Chaque son est une fonction qui appelle beep() ou sequence() avec des params adaptés.

const SOUNDS = {
  // ── UI ──
  click:    () => beep({ freq: 800,  duration: 0.04, type: 'square', volume: 0.1 }),
  error:    () => beep({ freq: 150,  duration: 0.15, type: 'sawtooth', volume: 0.2 }),

  // ── Combat ──
  hit:      () => beep({ freq: 300,  duration: 0.08, type: 'square', volume: 0.12, slide: -200 }),
  crit:     () => beep({ freq: 180,  duration: 0.25, type: 'sawtooth', volume: 0.25, slide: -100 }),
  kill:     () => sequence([
    { freq: 600, duration: 0.06, type: 'square', volume: 0.15, slide: -400 },
    { freq: 200, duration: 0.15, type: 'triangle', volume: 0.12, slide: -150 },
  ], 0.06),
  bossSpawn: () => sequence([
    { freq: 80,  duration: 0.3, type: 'sawtooth', volume: 0.3, slide: -30 },
    { freq: 60,  duration: 0.5, type: 'sawtooth', volume: 0.25, slide: -20 },
  ], 0.2),
  bossDeath: () => sequence([
    { freq: 100, duration: 0.1, type: 'square', volume: 0.25 },
    { freq: 150, duration: 0.1, type: 'square', volume: 0.22 },
    { freq: 80,  duration: 0.4, type: 'sawtooth', volume: 0.3, slide: -50 },
  ], 0.08),

  // ── Progression ──
  levelUp:  () => sequence([
    { freq: 523, duration: 0.1, type: 'square', volume: 0.15 }, // Do
    { freq: 659, duration: 0.1, type: 'square', volume: 0.15 }, // Mi
    { freq: 784, duration: 0.1, type: 'square', volume: 0.18 }, // Sol
    { freq: 1047, duration: 0.2, type: 'square', volume: 0.2 }, // Do aigu
  ], 0.1),
  heal:     () => beep({ freq: 1200, duration: 0.15, type: 'sine', volume: 0.15, slide: 400 }),
  gold:     () => beep({ freq: 1500, duration: 0.05, type: 'square', volume: 0.1 }),
  xp:       () => beep({ freq: 900, duration: 0.08, type: 'triangle', volume: 0.12, slide: 300 }),

  // ── Gacha ──
  pullR:    () => beep({ freq: 500, duration: 0.08, type: 'square', volume: 0.12 }),
  pullSR:   () => sequence([
    { freq: 500, duration: 0.1, type: 'square', volume: 0.15 },
    { freq: 700, duration: 0.15, type: 'triangle', volume: 0.18 },
  ], 0.1),
  pullSSR:  () => sequence([
    { freq: 600, duration: 0.1, type: 'square', volume: 0.2 },
    { freq: 800, duration: 0.1, type: 'square', volume: 0.22 },
    { freq: 1000, duration: 0.2, type: 'triangle', volume: 0.25 },
    { freq: 1200, duration: 0.25, type: 'sine', volume: 0.22 },
  ], 0.08),
  pullUR:   () => sequence([
    { freq: 400, duration: 0.15, type: 'sawtooth', volume: 0.2 },
    { freq: 800, duration: 0.15, type: 'square', volume: 0.25 },
    { freq: 1200, duration: 0.2, type: 'triangle', volume: 0.28 },
    { freq: 1600, duration: 0.25, type: 'sine', volume: 0.3 },
    { freq: 2000, duration: 0.3, type: 'sine', volume: 0.25 },
  ], 0.12),
  pullMYTHIC: () => sequence([
    { freq: 200, duration: 0.2, type: 'sawtooth', volume: 0.3 },
    { freq: 400, duration: 0.2, type: 'sawtooth', volume: 0.3 },
    { freq: 800, duration: 0.2, type: 'square', volume: 0.3 },
    { freq: 1600, duration: 0.3, type: 'triangle', volume: 0.3 },
    { freq: 2400, duration: 0.4, type: 'sine', volume: 0.3 },
  ], 0.15),
  pityBreak: () => sequence([
    { freq: 300, duration: 0.1, type: 'square', volume: 0.15 },
    { freq: 600, duration: 0.1, type: 'square', volume: 0.2 },
    { freq: 900, duration: 0.2, type: 'triangle', volume: 0.25 },
    { freq: 1200, duration: 0.3, type: 'sine', volume: 0.25, slide: 200 },
  ], 0.1),

  // ── Loot ──
  lootCommon:  () => beep({ freq: 800, duration: 0.06, type: 'square', volume: 0.1 }),
  lootRare:    () => sequence([
    { freq: 700, duration: 0.08, type: 'square', volume: 0.12 },
    { freq: 1000, duration: 0.1, type: 'triangle', volume: 0.15 },
  ], 0.08),
  lootEpic:    () => sequence([
    { freq: 600, duration: 0.08, type: 'triangle', volume: 0.15 },
    { freq: 900, duration: 0.1, type: 'triangle', volume: 0.18 },
    { freq: 1200, duration: 0.15, type: 'sine', volume: 0.2 },
  ], 0.08),
  lootMythic:  () => sequence([
    { freq: 500, duration: 0.1, type: 'triangle', volume: 0.2 },
    { freq: 800, duration: 0.1, type: 'sine', volume: 0.22 },
    { freq: 1200, duration: 0.15, type: 'sine', volume: 0.25 },
    { freq: 1800, duration: 0.2, type: 'sine', volume: 0.25, slide: 300 },
  ], 0.1),

  // ── Events ──
  achievement: () => sequence([
    { freq: 659, duration: 0.08, type: 'square', volume: 0.15 }, // Mi
    { freq: 784, duration: 0.08, type: 'square', volume: 0.18 }, // Sol
    { freq: 1047, duration: 0.15, type: 'triangle', volume: 0.2 }, // Do aigu
  ], 0.1),
  wave:        () => beep({ freq: 600, duration: 0.1, type: 'square', volume: 0.15, slide: 200 }),
  prestige:    () => sequence([
    { freq: 200, duration: 0.1, type: 'sawtooth', volume: 0.2 },
    { freq: 400, duration: 0.1, type: 'square', volume: 0.22 },
    { freq: 800, duration: 0.2, type: 'triangle', volume: 0.25 },
    { freq: 1200, duration: 0.3, type: 'sine', volume: 0.25, slide: 400 },
  ], 0.12),

  menuOpen:    () => beep({ freq: 700, duration: 0.06, type: 'square', volume: 0.08 }),
  equip:       () => beep({ freq: 1000, duration: 0.08, type: 'triangle', volume: 0.12, slide: 200 }),
};

class SoundSystemImpl {
  constructor() {
    this._enabled = true;
    this._volume = 1.0;  // multiplicateur global 0-1
    this._initialized = false;
  }

  /** Crée l'AudioContext (nécessite un user gesture préalable sur mobile). */
  init() {
    if (this._initialized) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        console.warn('[SoundSystem] Web Audio non disponible dans ce navigateur');
        this._enabled = false;
        return;
      }
      audioCtx = new Ctx();
      // Resume si le contexte démarre en suspended (Chrome/Safari policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      this._initialized = true;
    } catch (e) {
      console.warn('[SoundSystem] Init failed :', e.message);
      this._enabled = false;
    }
  }

  /** Joue un son par son nom. Auto-init si possible. */
  play(name) {
    if (!this._enabled) return;
    if (!this._initialized) {
      this.init();
      if (!this._initialized) return;
    }
    // Resume si suspendu
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const fn = SOUNDS[name];
    if (typeof fn !== 'function') return;
    try {
      fn();
    } catch (e) {
      // Silent fail
    }
  }

  /** Test manuel depuis la console : window.SoundSystem.test() */
  test() {
    this.init();
    console.log('[SoundSystem] State:', {
      enabled: this._enabled,
      initialized: this._initialized,
      audioCtxState: audioCtx?.state,
      audioCtxExists: !!audioCtx,
    });
    if (this._initialized) {
      this.play('hit');
      setTimeout(() => this.play('kill'), 200);
      setTimeout(() => this.play('levelUp'), 500);
    }
  }

  toggle() { this._enabled = !this._enabled; return this._enabled; }
  isEnabled() { return this._enabled; }
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }
  getVolume() { return this._volume; }
}

export const SoundSystem = new SoundSystemImpl();
