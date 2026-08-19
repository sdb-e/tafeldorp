// Touch-numpad (0-9, wis, OK) in UI-pack-stijl. Gedeeld door de numpad-ronde,
// de tijdrit en de finale. Roept bijAntwoord aan zodra OK wordt getikt.
import Phaser from 'phaser';
import { klik } from '@/core/geluid';

const KNOP_B = 108;
const KNOP_H = 82;
const MARGE = 12;

export class Numpad {
  private scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  private invoer = '';
  private bijWijziging: (invoer: string) => void;
  private bijAntwoord: (waarde: number) => void;
  private actief = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bijWijziging: (invoer: string) => void,
    bijAntwoord: (waarde: number) => void
  ) {
    this.scene = scene;
    this.bijWijziging = bijWijziging;
    this.bijAntwoord = bijAntwoord;
    this.container = scene.add.container(x, y);
    const layout: (string | number)[][] = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['wis', 0, 'ok'],
    ];
    layout.forEach((rij, ry) => {
      rij.forEach((label, rx) => {
        const kx = (rx - 1) * (KNOP_B + MARGE);
        const ky = ry * (KNOP_H + MARGE);
        const c = scene.add.container(kx, ky);
        const vlak = scene.add.nineslice(0, 0, 'ui-knop', undefined, KNOP_B, KNOP_H, 12, 12, 12, 14);
        const isOk = label === 'ok';
        const isWis = label === 'wis';
        const tekst = scene.add
          .text(0, -4, isOk ? 'OK' : isWis ? '⌫' : `${label}`, {
            fontFamily: 'sans-serif', fontSize: isOk ? '34px' : '38px',
            color: isOk ? '#2a6a2a' : isWis ? '#8a2f2f' : '#4a3218', fontStyle: 'bold',
          })
          .setOrigin(0.5);
        c.add([vlak, tekst]);
        c.setSize(KNOP_B, KNOP_H);
        c.setInteractive({ useHandCursor: true });
        c.on('pointerdown', () => {
          if (!this.actief) return;
          klik();
          vlak.setTexture('ui-knop-ingedrukt');
          scene.time.delayedCall(110, () => vlak.setTexture('ui-knop'));
          this.druk(label);
        });
        this.container.add(c);
      });
    });
  }

  private druk(label: string | number) {
    if (label === 'wis') {
      this.invoer = this.invoer.slice(0, -1);
    } else if (label === 'ok') {
      if (this.invoer.length === 0) return;
      const waarde = parseInt(this.invoer, 10);
      this.invoer = '';
      this.bijWijziging(this.invoer);
      this.bijAntwoord(waarde);
      return;
    } else if (this.invoer.length < 3) {
      this.invoer += `${label}`;
    }
    this.bijWijziging(this.invoer);
  }

  wis() {
    this.invoer = '';
    this.bijWijziging('');
  }

  zetActief(actief: boolean) {
    this.actief = actief;
  }

  destroy() {
    this.container.destroy();
  }
}
