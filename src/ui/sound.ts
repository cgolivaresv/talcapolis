/**
 * Sonidos opcionales, sintetizados con Web Audio (sin archivos). Empiezan desactivados y solo
 * suenan después de que la persona los active (los navegadores exigen un gesto para iniciar el audio).
 */
export type SoundName = 'dice' | 'step' | 'buy' | 'rent' | 'card' | 'win';

const KEY = 'talcapolis:sound';
let ctx: AudioContext | null = null;
let enabled = false;

export function loadSoundPreference(): boolean {
  try {
    enabled = localStorage.getItem(KEY) === 'on';
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* sin almacenamiento: la preferencia vale solo para esta sesión */
  }
  if (on) audio();
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  switch (name) {
    case 'dice':
      for (let k = 0; k < 6; k++) tone(c, 180 + Math.random() * 160, k * 0.07, 0.05, 'square', 0.04);
      break;
    case 'step':
      tone(c, 520, 0, 0.04, 'triangle', 0.05);
      break;
    case 'buy':
      tone(c, 523, 0, 0.12, 'triangle');
      tone(c, 784, 0.1, 0.2, 'triangle');
      break;
    case 'rent':
      tone(c, 330, 0, 0.14, 'sawtooth', 0.05);
      tone(c, 220, 0.12, 0.22, 'sawtooth', 0.05);
      break;
    case 'card':
      tone(c, 660, 0, 0.08, 'sine');
      tone(c, 880, 0.07, 0.14, 'sine');
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, k) => tone(c, f, k * 0.12, 0.25, 'triangle'));
      break;
  }
}

/** Sonido que corresponde a una línea del historial, si corresponde alguno. */
export function soundForLog(line: string): SoundName | null {
  if (/gana Talcapolis/.test(line)) return 'win';
  if (/saca una tarjeta|casilla de acción/.test(line)) return 'card';
  if (/de arriendo|quiebra|fianza/.test(line)) return 'rent';
  if (/ compra |cobra|cierran/.test(line)) return 'buy';
  return null;
}
