// Geluid via WebAudio (geen bestanden nodig): dialoog-gebrabbel per spreker,
// en korte feedback-jingles. AudioContext start pas na de eerste interactie
// (autoplay-regels van de browser).

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return undefined;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function toon(freq: number, duur: number, type: OscillatorType, volume: number, start = 0) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duur + 0.02);
}

// basistoon per gezinslid voor het gebrabbel
const STEMMEN: Record<string, number> = {
  stephan: 130, marjolein: 230, eleanor: 330, ward: 400,
};

/** Kort brabbel-bliepje tijdens de typewriter (Animal Crossing-stijl). */
export function brabbel(portretKey: string) {
  const naam = Object.keys(STEMMEN).find((n) => portretKey.includes(n)) ?? 'eleanor';
  const basis = STEMMEN[naam];
  const freq = basis * (0.85 + Math.random() * 0.4);
  toon(freq, 0.055, 'square', 0.025);
}

export function klik() {
  toon(520, 0.05, 'triangle', 0.05);
}

export function goedGeluid() {
  toon(520, 0.09, 'triangle', 0.06);
  toon(660, 0.09, 'triangle', 0.06, 0.08);
  toon(780, 0.14, 'triangle', 0.06, 0.16);
}

export function foutGeluid() {
  toon(180, 0.16, 'sawtooth', 0.045);
  toon(140, 0.2, 'sawtooth', 0.045, 0.12);
}

export function trefferGeluid() {
  toon(240, 0.06, 'square', 0.06);
  toon(160, 0.1, 'square', 0.05, 0.05);
}

export function fanfare() {
  const noten = [523, 659, 784, 1046];
  noten.forEach((f, i) => toon(f, 0.22, 'triangle', 0.07, i * 0.14));
  toon(1318, 0.4, 'triangle', 0.07, noten.length * 0.14);
}

// ---------- 16-bit menumuziek (chiptune-sequencer, geen bestanden) ----------
// Vrolijk dorpsdeuntje in C-groot: square-melodie, triangle-bas en een zachte
// hihat-tik. Loopt tot stopMuziek(); start pas na de eerste tik (autoplay).

const TEMPO = 112;
const ACHTSTE = 60 / TEMPO / 2;

// midi-nummers per achtste noot (0 = rust), 8 maten
const MELODIE = [
  72, 76, 79, 76, 72, 76, 79, 81,
  79, 76, 72, 76, 74, 77, 81, 77,
  74, 77, 81, 77, 74, 77, 81, 84,
  83, 81, 79, 77, 76, 74, 72, 0,
  72, 76, 79, 76, 72, 76, 79, 81,
  79, 76, 72, 76, 74, 77, 81, 77,
  84, 83, 81, 79, 77, 76, 74, 76,
  72, 0, 72, 74, 76, 79, 84, 0,
];
// baslijn per kwartnoot (4 per maat), 8 maten
const BAS = [
  48, 55, 48, 55, 43, 50, 43, 50, 41, 48, 41, 48, 43, 50, 43, 47,
  48, 55, 48, 55, 45, 52, 45, 52, 41, 48, 43, 50, 48, 43, 48, 0,
];

function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

let muziekTimer: ReturnType<typeof setInterval> | undefined;
let stap = 0;
let volgendeTijd = 0;

function hihat(c: AudioContext, t0: number) {
  const n = Math.round(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.value = 0.012;
  src.connect(gain).connect(c.destination);
  src.start(t0);
}

function plan(c: AudioContext, i: number, t0: number) {
  const m = MELODIE[i % MELODIE.length];
  if (m > 0) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = midiHz(m);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.028, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + ACHTSTE * 0.92);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + ACHTSTE);
  }
  if (i % 2 === 0) {
    const b = BAS[(i / 2) % BAS.length];
    if (b > 0) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiHz(b);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.05, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + ACHTSTE * 1.8);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + ACHTSTE * 2);
    }
  }
  if (i % 4 === 2) hihat(c, t0);
}

/** Start de menuloop; herstart niet als hij al loopt. */
export function startMuziek() {
  const c = audio();
  if (!c || muziekTimer) return;
  stap = 0;
  volgendeTijd = c.currentTime + 0.08;
  muziekTimer = setInterval(() => {
    const cc = audio();
    if (!cc) return;
    while (volgendeTijd < cc.currentTime + 0.18) {
      plan(cc, stap, volgendeTijd);
      stap += 1;
      volgendeTijd += ACHTSTE;
    }
  }, 40);
}

export function stopMuziek() {
  if (muziekTimer) {
    clearInterval(muziekTimer);
    muziekTimer = undefined;
  }
}
