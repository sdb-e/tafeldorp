// Klein ja/nee-keuzepaneel in UI-stijl (zoom-gecompenseerd, zoals Dialog).
// Klikken wordt in schermcoordinaten afgehandeld: hit-areas op children van
// een geschaalde scrollFactor-0 container werken niet betrouwbaar in Phaser.
import Phaser from 'phaser';
import { klik } from '@/core/geluid';

export function keuzeOpen(scene: Phaser.Scene): boolean {
  return Boolean((scene as unknown as { __keuzeOpen?: boolean }).__keuzeOpen);
}

export function toonKeuze(
  scene: Phaser.Scene,
  vraag: string,
  jaTekst: string,
  neeTekst: string,
  onJa: () => void,
  onNee?: () => void
) {
  const { width, height } = scene.scale;
  const z = scene.cameras.main.zoom;
  const sc = scene as unknown as { __keuzeOpen?: boolean };
  sc.__keuzeOpen = true;
  const container = scene.add
    .container(width / 2, height / 2)
    .setDepth(21000)
    .setScale(1 / z)
    .setScrollFactor(0);
  const vraagTekst = scene.add
    .text(0, -60, vraag, {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#4a3218', fontStyle: 'bold',
      align: 'center', wordWrap: { width: 560 },
    })
    .setOrigin(0.5);
  const paneel = scene.add.nineslice(0, 0, 'ui-paneel-hout', undefined,
    Math.max(640, vraagTekst.width + 80), 280, 24, 24, 24, 24);
  container.add([paneel, vraagTekst]);

  const knoppen: { vlak: Phaser.GameObjects.NineSlice }[] = [];
  const maakKnop = (x: number, tekst: string, kleur: string) => {
    const c = scene.add.container(x, 60);
    const vlak = scene.add.nineslice(0, 0, 'ui-knop', undefined, 230, 92, 12, 12, 12, 14);
    const t = scene.add
      .text(0, -4, tekst, {
        fontFamily: 'sans-serif', fontSize: '30px', color: kleur, fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([vlak, t]);
    container.add(c);
    knoppen.push({ vlak });
  };
  maakKnop(-135, jaTekst, '#2a6a2a');
  maakKnop(135, neeTekst, '#8a2f2f');

  // schermposities: container staat op schermcentrum met schaal 1/z onder
  // zoom z, dus lokale coordinaten zijn 1-op-1 schermafstanden tot het centrum
  const inKnop = (p: Phaser.Input.Pointer, knopX: number) =>
    Math.abs(p.x - (width / 2 + knopX)) < 115 && Math.abs(p.y - (height / 2 + 60)) < 46;

  const handler = (p: Phaser.Input.Pointer) => {
    const ja = inKnop(p, -135);
    const nee = inKnop(p, 135);
    if (!ja && !nee) return; // buiten de knoppen: paneel blijft staan
    klik();
    scene.input.off('pointerdown', handler);
    const vlak = knoppen[ja ? 0 : 1].vlak;
    vlak.setTexture('ui-knop-ingedrukt');
    scene.time.delayedCall(120, () => {
      container.destroy();
      sc.__keuzeOpen = false;
      if (ja) onJa();
      else onNee?.();
    });
  };
  // na de huidige tik registreren, anders vangt dit paneel de openings-tik
  scene.time.delayedCall(80, () => scene.input.on('pointerdown', handler));
}
