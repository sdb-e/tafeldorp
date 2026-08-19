// Spelvoortgang: missie-ketting en som-statistieken, bewaard in localStorage.

const SLEUTEL = 'tafeldorp-voortgang';

// Volgorde van de missies (makkelijk eerst, zie docs/ontwerp.md)
export const MISSIE_VOLGORDE = [
  'thuis', 'bakkerij', 'school', 'molen', 'speeltuin', 'supermarkt',
  'zwembad', 'boerderij', 'bieb', 'sporthal', 'kerk',
] as const;

export const LOCATIE_TAFEL: Record<string, number> = {
  thuis: 1, bakkerij: 2, school: 5, molen: 10, speeltuin: 3, supermarkt: 4,
  zwembad: 6, boerderij: 7, bieb: 8, sporthal: 9,
};

export const MISSIE_LABEL: Record<string, string> = {
  thuis: 'Ga naar mama (thuis)',
  bakkerij: 'Help papa in de Bakkerij',
  school: 'Ga naar de School',
  molen: 'Ga naar de Molen',
  speeltuin: 'Ga naar de Speeltuin',
  supermarkt: 'Ga naar de Supermarkt',
  zwembad: 'Ga naar het Zwembad',
  boerderij: 'Ga naar de Boerderij',
  bieb: 'Ga naar de Bibliotheek',
  sporthal: 'Ga naar de Sporthal',
  kerk: 'Naar de Kerk: de eindbaas!',
};

interface Voortgang {
  stap: number; // index in MISSIE_VOLGORDE van de huidige missie
  behaald: string[];
  sommen: Record<string, { goed: number; fout: number }>;
  besttijden: Record<number, number>; // tafel -> ms
  ticket: boolean;
  leaderboard: { naam: string; ms: number }[];
}

function laad(): Voortgang {
  const leeg: Voortgang = {
    stap: 0, behaald: [], sommen: {}, besttijden: {}, ticket: false, leaderboard: [],
  };
  try {
    const raw = localStorage.getItem(SLEUTEL);
    if (raw) return { ...leeg, ...(JSON.parse(raw) as Partial<Voortgang>) };
  } catch {
    /* verse start */
  }
  return leeg;
}

let staat = laad();

function bewaar() {
  localStorage.setItem(SLEUTEL, JSON.stringify(staat));
}

export function huidigeMissie(): string {
  return MISSIE_VOLGORDE[Math.min(staat.stap, MISSIE_VOLGORDE.length - 1)];
}

export function isBehaald(locatie: string): boolean {
  return staat.behaald.includes(locatie);
}

export function voltooiMissie(locatie: string) {
  if (!staat.behaald.includes(locatie)) staat.behaald.push(locatie);
  if (MISSIE_VOLGORDE[staat.stap] === locatie) staat.stap += 1;
  bewaar();
}

export function telSom(som: string, goed: boolean) {
  const s = staat.sommen[som] ?? { goed: 0, fout: 0 };
  if (goed) s.goed += 1;
  else s.fout += 1;
  staat.sommen[som] = s;
  bewaar();
}

export function resetVoortgang() {
  staat = { stap: 0, behaald: [], sommen: {}, besttijden: {}, ticket: false, leaderboard: [] };
  bewaar();
}

export function besttijd(tafel: number): number | undefined {
  return staat.besttijden[tafel];
}

/** Slaat de tijd op als die een record is; geeft terug of het een record was. */
export function zetBesttijd(tafel: number, ms: number): boolean {
  const oud = staat.besttijden[tafel];
  if (oud === undefined || ms < oud) {
    staat.besttijden[tafel] = ms;
    bewaar();
    return true;
  }
  return false;
}

export function heeftTicket(): boolean {
  return staat.ticket;
}

export function geefTicket() {
  staat.ticket = true;
  bewaar();
}

export function leaderboard(): { naam: string; ms: number }[] {
  return [...staat.leaderboard].sort((a, b) => a.ms - b.ms).slice(0, 5);
}

/** Voegt een finale-tijd toe; geeft de positie terug (0-4) of -1 buiten top 5. */
export function zetLeaderboard(naam: string, ms: number): number {
  staat.leaderboard.push({ naam, ms });
  staat.leaderboard.sort((a, b) => a.ms - b.ms);
  staat.leaderboard = staat.leaderboard.slice(0, 5);
  bewaar();
  return staat.leaderboard.findIndex((e) => e.naam === naam && e.ms === ms);
}

/** Tafels gesorteerd op foutratio (minimaal 4 pogingen), slechtste eerst. */
export function zwaksteTafels(maxN = 2): number[] {
  const per: Record<number, { goed: number; fout: number }> = {};
  for (const [som, s] of Object.entries(staat.sommen)) {
    const t = parseInt(som.split('x')[1], 10);
    if (!per[t]) per[t] = { goed: 0, fout: 0 };
    per[t].goed += s.goed;
    per[t].fout += s.fout;
  }
  return Object.entries(per)
    .filter(([, s]) => s.goed + s.fout >= 4 && s.fout > 0)
    .sort((a, b) => b[1].fout / (b[1].goed + b[1].fout) - a[1].fout / (a[1].goed + a[1].fout))
    .slice(0, maxN)
    .map(([t]) => parseInt(t, 10));
}

/** Locatie die bij een tafel hoort (voor oefen-suggesties). */
export function locatieVanTafel(tafel: number): string | undefined {
  return Object.entries(LOCATIE_TAFEL).find(([, t]) => t === tafel)?.[0];
}
