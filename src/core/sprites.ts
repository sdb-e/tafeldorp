// Layout van de familie-assets class 3 sheets (LimeZu, 48x96 per frame).
// Kind-sheets zijn 1152x384; volwassen sheets zijn de volledige LimeZu-layout
// (2781x1968) waarvan de linksboven-hoek identiek is aan de kind-layout.
// De volle breedte deelt niet door 48, dus we laden de sheet als losse image
// en definiëren de frames zelf op pixelposities:
//   rij 0 (y=0):   4 statische frames (rechts, omhoog, links, omlaag)
//   rij 1 (y=96):  idle, 6 frames per richting (rechts, omhoog, links, omlaag)
//   rij 2 (y=192): walk, 6 frames per richting
//   rij 3 (y=288): sleep, 6 frames
export const FRAME_W = 48;
export const FRAME_H = 96;

export type Direction = 'right' | 'up' | 'left' | 'down';
export const DIR_INDEX: Record<Direction, number> = {
  right: 0,
  up: 1,
  left: 2,
  down: 3,
};

export const FAMILIE = ['eleanor', 'ward', 'stephan', 'marjolein'] as const;
export type FamilieNaam = (typeof FAMILIE)[number];

// Rol-varianten van het gezin (ander hoedje, zelfde persoon en portret) plus
// twee dorpsfiguren (LimeZu premades). Besluit 19 aug 2026, docs/ontwerp.md.
export const FAMILIE_ROLLEN = [
  'stephan-bakker', 'stephan-molenaar', 'stephan-coach',
  'marjolein-juf', 'marjolein-bieb', 'ward-boer',
] as const;
export const DORPSFIGUREN = ['kees', 'bas'] as const;

/** Definieert frames en idle/walk-animaties voor een personage (eenmalig per game). */
export function registerFamilielid(scene: Phaser.Scene, naam: string) {
  const tex = scene.textures.get(naam);
  for (const dir of Object.keys(DIR_INDEX) as Direction[]) {
    const d = DIR_INDEX[dir];
    tex.add(`static-${dir}`, 0, d * FRAME_W, 0, FRAME_W, FRAME_H);
    for (let i = 0; i < 6; i++) {
      tex.add(`idle-${dir}-${i}`, 0, (d * 6 + i) * FRAME_W, FRAME_H, FRAME_W, FRAME_H);
      tex.add(`walk-${dir}-${i}`, 0, (d * 6 + i) * FRAME_W, FRAME_H * 2, FRAME_W, FRAME_H);
    }
    if (!scene.anims.exists(`${naam}-idle-${dir}`)) {
      scene.anims.create({
        key: `${naam}-idle-${dir}`,
        frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: naam, frame: `idle-${dir}-${i}` })),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(`${naam}-walk-${dir}`)) {
      scene.anims.create({
        key: `${naam}-walk-${dir}`,
        frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: naam, frame: `walk-${dir}-${i}` })),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}
