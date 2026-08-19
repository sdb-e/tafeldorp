import Phaser from 'phaser';
import { DORPSFIGUREN, FAMILIE, FAMILIE_ROLLEN, registerFamilielid } from '@/core/sprites';

// Portretten die fase 1 nodig heeft; groeit mee met de dialogen.
const PORTRETTEN: Record<string, string[]> = {
  marjolein: ['neutraal', 'lach', 'denkend'],
  eleanor: ['neutraal', 'blij', 'verrast'],
  stephan: ['neutraal', 'blij', 'lach', 'verrast'],
  ward: ['neutraal', 'blij', 'denkend'],
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Tafeldorp laden...', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    for (const naam of [...FAMILIE, ...FAMILIE_ROLLEN]) {
      this.load.image(naam, `assets/familie/sprites8/${naam}/sheet_48.png`);
    }
    for (const naam of DORPSFIGUREN) {
      this.load.image(naam, `assets/dorp/${naam}/sheet_48.png`);
      this.load.image(`portret-${naam}-neutraal`, `assets/dorp/${naam}/portret.png`);
    }
    this.load.image('kaart-onder', 'assets/kaart/kaart_onder.png');
    this.load.image('kaart-boven', 'assets/kaart/kaart_boven.png');
    this.load.json('kaart', 'assets/kaart/kaart.json');
    this.load.json('interieur-index', 'assets/interieur/index.json');
    for (const ui of ['paneel-hout', 'paneel-rond', 'knop', 'knop-ingedrukt',
      'hart', 'ster', 'check', 'kruis', 'munt', 'naamplaat']) {
      this.load.image(`ui-${ui}`, `assets/ui/${ui}.png`);
    }
    for (const b of ['bakkerij', 'school', 'molen', 'speeltuin', 'supermarkt',
      'zwembad', 'boerderij', 'bieb', 'sporthal', 'kerk']) {
      this.load.image(`baas-${b}`, `assets/battlers/${b}.png`);
    }
    for (const [naam, expressies] of Object.entries(PORTRETTEN)) {
      for (const exp of expressies) {
        this.load.image(`portret-${naam}-${exp}`, `assets/familie/portraits/${naam}/${exp}.png`);
      }
    }
  }

  create() {
    for (const naam of [...FAMILIE, ...FAMILIE_ROLLEN, ...DORPSFIGUREN]) {
      registerFamilielid(this, naam);
    }

    // tweede laadronde: de kamers uit de interieur-index en kaart-voorgronden
    const kaart = this.cache.json.get('kaart') as
      | { voorgronden?: { file: string }[] }
      | undefined;
    for (const vg of kaart?.voorgronden ?? []) {
      this.load.image(`vg-${vg.file}`, `assets/kaart/${vg.file}`);
    }
    const idx = this.cache.json.get('interieur-index') as { kamers: string[] } | undefined;
    for (const kid of idx?.kamers ?? []) {
      this.load.image(`kamer-${kid}-onder`, `assets/interieur/${kid}_onder.png`);
      this.load.json(`kamer-${kid}`, `assets/interieur/${kid}.json`);
    }
    this.load.once('complete', () => {
      // boven-lagen bestaan niet voor elke kamer; apart laden na de json's
      const metBoven = (idx?.kamers ?? []).filter(
        (kid) => (this.cache.json.get(`kamer-${kid}`) as { boven: boolean }).boven
      );
      for (const kid of metBoven) {
        this.load.image(`kamer-${kid}-boven`, `assets/interieur/${kid}_boven.png`);
      }
      this.load.once('complete', () => this.scene.start('menu'));
      this.load.start();
    });
    this.load.start();
  }
}
