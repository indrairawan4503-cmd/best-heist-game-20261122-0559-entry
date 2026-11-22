// Synthesized sounds for The Last Train — Web Audio only, no audio files.
// A soft click for loot, a low alarm pulse while spotted, a bright chime for
// the cracked vault, a thud for being caught, a whistle for the getaway.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(frequency, duration, type, gainValue, slideTo) {
    const ctx = ensure();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    loot() {
      tone(880, 0.12, 'sine', 0.12);
      setTimeout(() => tone(1318, 0.14, 'sine', 0.1), 70);
    },
    smoke() {
      tone(220, 0.3, 'triangle', 0.08, 110);
    },
    decoy() {
      tone(1568, 0.08, 'square', 0.05);
    },
    crack() {
      tone(523, 0.15, 'sine', 0.12);
      setTimeout(() => tone(659, 0.15, 'sine', 0.12), 120);
      setTimeout(() => tone(784, 0.3, 'sine', 0.14), 240);
    },
    alarm() {
      tone(440, 0.18, 'sawtooth', 0.05, 330);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.12, 98);
    },
    win() {
      tone(523, 0.18, 'sine', 0.12);
      setTimeout(() => tone(659, 0.18, 'sine', 0.12), 150);
      setTimeout(() => tone(784, 0.18, 'sine', 0.12), 300);
      setTimeout(() => tone(1046, 0.4, 'sine', 0.14), 450);
    },
  };
}
