import Phaser from 'phaser';
import { telSom } from '@/core/spel';
import { TerugNaar } from '@/scenes/MinigameScene';
import { klik, trefferGeluid, foutGeluid, fanfare } from '@/core/geluid';

// De tafelbaas: battle met levens. Goed antwoord = jouw treffer (baas -1 HP),
// fout = hartje kwijt. Kale sommen binnen de tafel van de locatie.
// Verliezen is zacht: gewoon opnieuw proberen, niets kwijt.

interface BattleData {
  locatie: string;
  tafel: number;
  terug: TerugNaar;
}

const BAAS_HP = 5;
const HARTEN = 3;

export class BattleScene extends Phaser.Scene {
  private data_!: BattleData;
  private baasHp = BAAS_HP;
  private harten = HARTEN;
  private baas!: Phaser.GameObjects.Container;
  private hpBlokjes: Phaser.GameObjects.Rectangle[] = [];
  private hartIcons: Phaser.GameObjects.Image[] = [];
  private somGroot!: Phaser.GameObjects.Text;
  private knoppen: Phaser.GameObjects.Container[] = [];
  private huidigeA = 0;
  private vorigeA = 0;
  private bezig = false;

  constructor() {
    super('battle');
  }

  init(data: BattleData) {
    this.data_ = data;
    this.baasHp = BAAS_HP;
    this.harten = HARTEN;
    this.bezig = false;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x2c2440).setOrigin(0);
    // vloerlicht
    this.add.ellipse(width / 2, height - 90, width * 0.8, 120, 0x3c3358);

    this.add.nineslice(width / 2, 46, 'ui-naamplaat', undefined, 560, 70, 16, 16, 14, 14);
    this.add
      .text(width / 2, 46, `De Tafelbaas van ${this.data_.tafel}!`, {
        fontFamily: 'sans-serif', fontSize: '34px', color: '#f5edda', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.maakBaas(width / 2, 250);

    // baas-HP
    for (let i = 0; i < BAAS_HP; i++) {
      const b = this.add
        .rectangle(width / 2 - (BAAS_HP * 46) / 2 + 23 + i * 46, 118, 40, 20, 0x7fc46a)
        .setStrokeStyle(3, 0x2c2440);
      this.hpBlokjes.push(b);
    }

    // Eleanor + harten
    const el = this.add.sprite(150, height - 150, 'eleanor');
    el.play('eleanor-idle-up');
    el.setScale(1.6);
    for (let i = 0; i < HARTEN; i++) {
      this.hartIcons.push(this.add.image(110 + i * 52, height - 250, 'ui-hart').setScale(0.9));
    }

    this.somGroot = this.add
      .text(width / 2 + 80, height - 260, '', {
        fontFamily: 'sans-serif', fontSize: '64px', color: '#ffd94a', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.volgendeSom();
  }

  private baasSprite!: Phaser.GameObjects.Image;

  private maakBaas(x: number, y: number) {
    this.baas = this.add.container(x, y);
    const key = `baas-${this.data_.locatie}`;
    this.baasSprite = this.add.image(0, 0, key);
    // pixel-strak opschalen naar ongeveer 230px hoog (gehele factor)
    const schaal = Math.max(2, Math.round(230 / this.baasSprite.height));
    this.baasSprite.setScale(schaal);
    const voetY = (this.baasSprite.height * schaal) / 2;
    const badge = this.add.circle(0, voetY + 34, 32, 0xffd94a).setStrokeStyle(4, 0x8a6a10);
    const nr = this.add
      .text(0, voetY + 34, `${this.data_.tafel}`, {
        fontFamily: 'sans-serif', fontSize: '38px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.baas.add([this.baasSprite, badge, nr]);
    this.tweens.add({ targets: this.baas, y: y + 14, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private volgendeSom() {
    this.knoppen.forEach((k) => k.destroy());
    this.knoppen = [];
    let a = Phaser.Math.Between(1, 10);
    while (a === this.vorigeA) a = Phaser.Math.Between(1, 10);
    this.vorigeA = a;
    this.huidigeA = a;
    this.somGroot.setText(`${a} × ${this.data_.tafel} = ?`);
    this.maakKnoppen(a * this.data_.tafel);
    this.bezig = false;
  }

  private maakKnoppen(antwoord: number) {
    const { width, height } = this.scale;
    const opties = new Set<number>([antwoord]);
    const kandidaten = [antwoord - this.data_.tafel, antwoord + this.data_.tafel,
      antwoord - 2, antwoord + 2, antwoord - 1, antwoord + 1];
    for (const k of kandidaten) {
      if (opties.size >= 4) break;
      if (k > 0 && !opties.has(k)) opties.add(k);
    }
    const lijst = Phaser.Utils.Array.Shuffle([...opties]);
    const knopB = 170;
    const startX = width / 2 - (lijst.length * (knopB + 26) - 26) / 2 + knopB / 2;
    lijst.forEach((waarde, i) => {
      const c = this.add.container(startX + i * (knopB + 26), height - 110);
      const r = this.add.nineslice(0, 0, 'ui-knop', undefined, knopB, 112, 12, 12, 12, 14);
      const t = this.add
        .text(0, -6, `${waarde}`, {
          fontFamily: 'sans-serif', fontSize: '50px', color: '#4a3218', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      c.add([r, t]);
      c.setSize(knopB, 112);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        klik();
        this.antwoord(waarde, antwoord, c);
      });
      this.knoppen.push(c);
    });
  }

  private antwoord(gekozen: number, juist: number, knop: Phaser.GameObjects.Container) {
    if (this.bezig) return;
    const som = `${this.huidigeA}x${this.data_.tafel}`;
    const vlak = knop.list[0] as Phaser.GameObjects.NineSlice;
    if (gekozen === juist) {
      this.bezig = true;
      telSom(som, true);
      trefferGeluid();
      this.baasHp -= 1;
      vlak.setTexture('ui-knop-ingedrukt');
      // treffer: baas schudt en flitst wit
      this.tweens.add({ targets: this.baas, x: this.baas.x + 14, duration: 60, yoyo: true, repeat: 3 });
      this.baasSprite.setTintFill(0xffffff);
      this.time.delayedCall(120, () => this.baasSprite.clearTint());
      this.time.delayedCall(240, () => this.baasSprite.setTintFill(0xffffff));
      this.time.delayedCall(360, () => this.baasSprite.clearTint());
      if (this.baasHp >= 0 && this.hpBlokjes[this.baasHp]) {
        this.hpBlokjes[this.baasHp].setFillStyle(0x55486a);
      }
      this.time.delayedCall(650, () => {
        if (this.baasHp <= 0) this.gewonnen();
        else this.volgendeSom();
      });
    } else {
      telSom(som, false);
      foutGeluid();
      this.bezig = true;
      this.harten -= 1;
      vlak.setTint(0xe08a8a);
      if (this.hartIcons[this.harten]) {
        const h = this.hartIcons[this.harten];
        this.tweens.add({ targets: h, alpha: 0.25, scale: 0.6, duration: 300 });
      }
      this.cameras.main.shake(200, 0.008);
      this.time.delayedCall(650, () => {
        vlak.clearTint();
        if (this.harten <= 0) this.verloren();
        else {
          // zelfde som blijft staan: nog een kans
          this.bezig = false;
        }
      });
    }
  }

  private gewonnen() {
    fanfare();
    const { width, height } = this.scale;
    this.tweens.add({ targets: this.baas, y: this.baas.y + 500, alpha: 0, duration: 900, ease: 'Quad.In' });
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 720, 340, 24, 24, 24, 24);
    const t = this.add
      .text(0, -90, 'Tafelbaas verslagen!', {
        fontFamily: 'sans-serif', fontSize: '46px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const munt = this.add.image(0, -10, 'ui-munt').setScale(0);
    const sub = this.add
      .text(0, 70, 'Nog één stap: 10 bestellingen, maar nu typ jij de antwoorden!', {
        fontFamily: 'sans-serif', fontSize: '25px', color: '#8a6a2a',
        align: 'center', wordWrap: { width: 640 },
      })
      .setOrigin(0.5);
    const verder = this.add
      .text(0, 126, 'tik om verder te gaan', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#9a7440',
      })
      .setOrigin(0.5);
    paneel.add([r, t, munt, sub, verder]);
    this.tweens.add({ targets: munt, scale: 1.3, duration: 420, delay: 300, ease: 'Back.Out' });
    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('minigame', {
          locatie: this.data_.locatie,
          tafel: this.data_.tafel,
          invoer: 'numpad',
          terug: this.data_.terug,
        });
      });
    });
  }

  private verloren() {
    const { width, height } = this.scale;
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 700, 280, 24, 24, 24, 24);
    const t = this.add
      .text(0, -50, 'Bijna!', {
        fontFamily: 'sans-serif', fontSize: '46px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, 20, 'De tafelbaas lacht... probeer het nog een keer!', {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#8a6a2a',
      })
      .setOrigin(0.5);
    const verder = this.add
      .text(0, 85, 'tik om opnieuw te proberen', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#9a7440',
      })
      .setOrigin(0.5);
    paneel.add([r, t, sub, verder]);
    this.input.once('pointerdown', () => {
      this.scene.restart(this.data_);
    });
  }

  private terug() {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.data_.terug.scene, this.data_.terug.data);
    });
  }
}
