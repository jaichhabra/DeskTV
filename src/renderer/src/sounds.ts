/**
 * Soft navigation sounds, as SundarTV's (and Apple TV's): a short tick when focus moves, a fuller one to open.
 * Synthesized, so there are no files; the audio context starts on the first key, as browsers require.
 */
let ctx: AudioContext | null = null;
let enabled = true;
let last = 0;

export function setSounds(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
  f.type = 'lowpass';
  f.frequency.value = 3200;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Focus moved. Held arrows repeat fast; the ticks thin out so they don't buzz. */
export function tick(): void {
  const now = performance.now();
  if (now - last < 45) return;
  last = now;
  blip(1850, 0.035, 0.05, 'triangle');
}

export function select(): void {
  blip(900, 0.09, 0.08, 'sine');
}

export function bump(): void {
  blip(220, 0.06, 0.05, 'sine');
}
