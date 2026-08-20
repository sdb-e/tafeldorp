// Per locatie: de minigame-skin (context, eenheden, visual) en de NPC met
// dialogen. De tafel per locatie staat in spel.ts (LOCATIE_TAFEL).

import { DialogLine } from '@/core/Dialog';

export type ItemVorm =
  | 'brood' | 'potlood' | 'meel' | 'bal' | 'fles' | 'ring' | 'ei' | 'boek' | 'kegel';

export interface Skin {
  titel: string;
  npcSprite: string; // gezinslid of dorpsfiguur (zie sprites.ts)
  npcNaam: string;
  npcPortret: string; // portret-key zonder prefix, bv 'stephan-neutraal'
  containerEv: string;
  containerMv: string;
  itemMv: string;
  vorm: ItemVorm;
  kolommen: number; // items per rij binnen een container
  containerKleur: number;
  containerRand: number;
}

export const SKINS: Record<string, Skin> = {
  bakkerij: {
    titel: 'Bakkerij: bestellingen!', npcSprite: 'stephan-bakker', npcNaam: 'Bakker papa',
    npcPortret: 'stephan-neutraal', containerEv: 'zakje', containerMv: 'zakjes',
    itemMv: 'broodjes', vorm: 'brood', kolommen: 3,
    containerKleur: 0xd9b98a, containerRand: 0x9a7440,
  },
  school: {
    titel: 'School: potloden tellen!', npcSprite: 'marjolein-juf', npcNaam: 'Juf mama',
    npcPortret: 'marjolein-neutraal', containerEv: 'doosje', containerMv: 'doosjes',
    itemMv: 'potloden', vorm: 'potlood', kolommen: 5,
    containerKleur: 0xa8c8e8, containerRand: 0x54749a,
  },
  molen: {
    titel: 'Molen: meel scheppen!', npcSprite: 'stephan-molenaar', npcNaam: 'Molenaar papa',
    npcPortret: 'stephan-blij', containerEv: 'zak', containerMv: 'zakken',
    itemMv: 'scheppen meel', vorm: 'meel', kolommen: 5,
    containerKleur: 0xe8e0d0, containerRand: 0x9a8f78,
  },
  speeltuin: {
    titel: 'Speeltuin: ballen rapen!', npcSprite: 'ward', npcNaam: 'Ward',
    npcPortret: 'ward-blij', containerEv: 'mand', containerMv: 'manden',
    itemMv: 'ballen', vorm: 'bal', kolommen: 3,
    containerKleur: 0xc8a878, containerRand: 0x8a6a40,
  },
  supermarkt: {
    titel: 'Supermarkt: kratten vullen!', npcSprite: 'kees', npcNaam: 'Kruidenier Kees',
    npcPortret: 'kees-neutraal', containerEv: 'krat', containerMv: 'kratten',
    itemMv: 'flessen', vorm: 'fles', kolommen: 4,
    containerKleur: 0xd08850, containerRand: 0x8a5020,
  },
  zwembad: {
    titel: 'Zwembad: duikringen!', npcSprite: 'bas', npcNaam: 'Badmeester Bas',
    npcPortret: 'bas-neutraal', containerEv: 'rek', containerMv: 'rekken',
    itemMv: 'duikringen', vorm: 'ring', kolommen: 3,
    containerKleur: 0x90c8e0, containerRand: 0x4880a8,
  },
  boerderij: {
    titel: 'Boerderij: eieren rapen!', npcSprite: 'ward-boer', npcNaam: 'Boer Ward',
    npcPortret: 'ward-denkend', containerEv: 'doos', containerMv: 'dozen',
    itemMv: 'eieren', vorm: 'ei', kolommen: 4,
    containerKleur: 0xc0a068, containerRand: 0x806838,
  },
  bieb: {
    titel: 'Bibliotheek: boeken sorteren!', npcSprite: 'marjolein-bieb', npcNaam: 'Mama',
    npcPortret: 'marjolein-denkend', containerEv: 'plank', containerMv: 'planken',
    itemMv: 'boeken', vorm: 'boek', kolommen: 4,
    containerKleur: 0xb08858, containerRand: 0x705028,
  },
  sporthal: {
    titel: 'Sporthal: kegels klaarzetten!', npcSprite: 'stephan-coach', npcNaam: 'Coach papa',
    npcPortret: 'stephan-lach', containerEv: 'rij', containerMv: 'rijen',
    itemMv: 'kegels', vorm: 'kegel', kolommen: 3,
    containerKleur: 0xc8c8c8, containerRand: 0x787878,
  },
};

interface NpcPlek {
  tx: number;
  ty: number;
}

// waar de NPC in de kamer staat (tile-coordinaten)
export const NPC_PLEK: Record<string, NpcPlek> = {
  thuis: { tx: 3.2, ty: 5.6 },
  bakkerij: { tx: 4.6, ty: 4.8 },
  school: { tx: 3, ty: 6.4 },
  molen: { tx: 6.5, ty: 5.4 },
  supermarkt: { tx: 2.2, ty: 5.5 },
  boerderij: { tx: 7, ty: 5.2 },
  bieb: { tx: 13.6, ty: 4.6 },
  sporthal: { tx: 9, ty: 6.2 },
};

function p(sprite: string, expressie: string) {
  return `portret-${sprite}-${expressie}`;
}

/** Intro-dialoog per locatie (voordat de minigame start). */
export function introDialoog(locatie: string, tafel: number): DialogLine[] {
  const s = SKINS[locatie];
  const basis: Record<string, DialogLine[]> = {
    bakkerij: [
      { spreker: 'Bakker papa', portret: p('stephan', 'verrast'), tekst: 'Eleanor! Wat fijn dat je er bent, de bestellingen stromen binnen!' },
      { spreker: 'Bakker papa', portret: p('stephan', 'neutraal'), tekst: 'Alle broodjes zitten in zakjes van 2. Drie zakjes? Dan reken je 3 keer 2!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: 'Kom maar op met die bestellingen!' },
    ],
    school: [
      { spreker: 'Juf mama', portret: p('marjolein', 'lach'), tekst: 'Welkom in de klas, Eleanor! Vandaag delen wij potloden uit.' },
      { spreker: 'Juf mama', portret: p('marjolein', 'neutraal'), tekst: 'In elk doosje zitten 5 potloden. Vier doosjes is dus 4 keer 5!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: 'De tafel van 5, die ga ik leren!' },
    ],
    molen: [
      { spreker: 'Molenaar papa', portret: p('stephan', 'blij'), tekst: 'Kijk eens wie we daar hebben! De molen draait op volle toeren.' },
      { spreker: 'Molenaar papa', portret: p('stephan', 'neutraal'), tekst: 'In elke meelzak gaan 10 scheppen. De tafel van 10 is lekker makkelijk: er komt gewoon een nul achter!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'verrast'), tekst: 'Oooh, dat is een handig trucje!' },
    ],
    speeltuin: [
      { spreker: 'Ward', portret: p('ward', 'blij'), tekst: 'Eleanor! Alle ballen liggen door de hele speeltuin!' },
      { spreker: 'Ward', portret: p('ward', 'denkend'), tekst: 'Er passen 3 ballen in een mand. Help je mee tellen? Dat is de tafel van 3!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: 'Samen opruimen, samen tellen!' },
    ],
    supermarkt: [
      { spreker: 'Kruidenier Kees', portret: p('kees', 'neutraal'), tekst: 'Welkom in mijn winkel, Eleanor! Help je mee vakken vullen?' },
      { spreker: 'Kruidenier Kees', portret: p('kees', 'neutraal'), tekst: 'In elk krat passen 4 flessen. Vijf kratten is 5 keer 4!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: 'De tafel van 4, daar gaan we!' },
    ],
    zwembad: [
      { spreker: 'Badmeester Bas', portret: p('bas', 'neutraal'), tekst: 'Ho ho, niet rennen! Het zwembad gaat bijna open en alle duikringen moeten in de rekken.' },
      { spreker: 'Badmeester Bas', portret: p('bas', 'neutraal'), tekst: 'In elk rek passen 6 ringen. Twee rekken? 2 keer 6!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: 'En daarna duiken!' },
    ],
    boerderij: [
      { spreker: 'Boer Ward', portret: p('ward', 'denkend'), tekst: 'Pssst, Eleanor... de kippen hebben SUPER veel eieren gelegd.' },
      { spreker: 'Boer Ward', portret: p('ward', 'blij'), tekst: 'In elke doos passen 7 eieren. Drie dozen is 3 keer 7. Niet laten vallen he!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'verrast'), tekst: 'De tafel van 7... die is best moeilijk. Maar ik kan het!' },
    ],
    bieb: [
      { spreker: 'Mama', portret: p('marjolein', 'denkend'), tekst: 'Ssst... welkom in de bibliotheek. Alle boeken moeten terug in de kasten.' },
      { spreker: 'Mama', portret: p('marjolein', 'neutraal'), tekst: 'Op elke plank passen 8 boeken. Twee planken is 2 keer 8.' },
      { spreker: 'Eleanor', portret: p('eleanor', 'blij'), tekst: '(fluisterend) De tafel van 8, komt goed!' },
    ],
    sporthal: [
      { spreker: 'Coach papa', portret: p('stephan', 'lach'), tekst: 'Daar is mijn sportkampioen! We zetten kegels klaar voor de wedstrijd.' },
      { spreker: 'Coach papa', portret: p('stephan', 'neutraal'), tekst: 'Elke rij krijgt 9 kegels. De tafel van 9 is de laatste, daarna ben je klaar voor de eindbaas!' },
      { spreker: 'Eleanor', portret: p('eleanor', 'verrast'), tekst: 'De laatste tafel... en dan de Kerk!' },
    ],
  };
  return basis[locatie] ?? [
    { spreker: s?.npcNaam ?? '???', portret: p('eleanor', 'neutraal'), tekst: `Help je mee met de tafel van ${tafel}?` },
  ];
}

/** Dialoog nadat de locatie behaald is. */
export function klaarDialoog(locatie: string, volgendLabel: string): DialogLine[] {
  const s = SKINS[locatie];
  const naam = s?.npcNaam ?? 'Papa';
  const portret = s ? `portret-${s.npcPortret}` : p('stephan', 'blij');
  return [
    { spreker: naam, portret, tekst: `Super gedaan! Volgende missie: ${volgendLabel.toLowerCase()}.` },
  ];
}
