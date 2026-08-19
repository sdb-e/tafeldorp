import Phaser from 'phaser';
import { telSom, voltooiMissie } from '@/core/spel';
import { SKINS, ItemVorm } from '@/core/locaties';
import { ezelsbrug } from '@/core/hints';
import { Numpad } from '@/core/Numpad';
import { klik, goedGeluid, foutGeluid } from '@/core/geluid';

// Bestellingen-minigame, generiek over locatie-skins en twee invoer-modi:
// 'mc' (keuzeknoppen) als eerste ronde, 'numpad' (zelf typen) als slotronde.
// mc-ronde eindigt in de tafelbaas; numpad-ronde voltooit de missie.

export interface TerugNaar {
  scene: string;
  data: Record<string, unknown>;
}

interface MinigameData {
  locatie: string;
  tafel: number;
  invoer?: 'mc' | 'numpad';
  terug: TerugNaar;
}

const AANTAL = 10;

export class MinigameScene extends Phaser.Scene {
  private data_!: MinigameData;
  private invoer: 'mc' | 'numpad' = 'mc';
  private wachtrij: number[] = [];
  private goedGedaan = 0;
  private somTekst!: Phaser.GameObjects.Text;
  private somGroot!: Phaser.GameObjects.Text;
  private voortgangTekst!: Phaser.GameObjects.Text;
  private visueel!: Phaser.GameObjects.Container;
  private knoppen: Phaser.GameObjects.Container[] = [];
  private numpad?: Numpad;
  private huidige = 0;
  private foutenOpDeze = 0;
  private bezig = false;
  private hintPaneel?: Phaser.GameObjects.Container;

  constructor() {
    super('minigame');
  }

  init(data: MinigameData) {
    this.data_ = data;
    this.invoer = data.invoer ?? 'mc';
    const reeks = Phaser.Utils.Array.Shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    this.wachtrij = reeks.slice(0, AANTAL);
    this.goedGedaan = 0;
    this.numpad = undefined;
  }

  /** Midden van de visual-zone: bij numpad schuift alles naar links. */
  private get middenX(): number {
    return this.invoer === 'numpad' ? (this.scale.width - 400) / 2 : this.scale.width / 2 + 50;
  }

  create() {
    const { width, height } = this.scale;
    const skin = SKINS[this.data_.locatie];
    this.add.rectangle(0, 0, width, height, 0xf6e7cf).setOrigin(0);
    this.add.nineslice(width / 2, 48, 'ui-naamplaat', undefined, width - 32, 76, 16, 16, 14, 14);
    const titel = this.invoer === 'numpad' ? `${skin.titel.split(':')[0]}: nu zelf typen!` : skin.titel;
    this.add
      .text(width / 2, 48, titel, {
        fontFamily: 'sans-serif', fontSize: '38px', color: '#f5edda', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.voortgangTekst = this.add
      .text(width - 52, 48, '', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#f5edda',
      })
      .setOrigin(1, 0.5);

    this.add.nineslice(120, 176, 'ui-paneel-rond', undefined, 132, 132, 16, 16, 16, 16);
    this.add.image(120, 176, `portret-${skin.npcPortret}`).setDisplaySize(104, 104);

    this.somTekst = this.add
      .text(this.middenX, 148, '', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#4a3218',
        align: 'center', wordWrap: { width: width - 420 },
      })
      .setOrigin(0.5);
    this.somGroot = this.add
      .text(this.middenX, 218, '', {
        fontFamily: 'sans-serif', fontSize: '54px', color: '#b5541e', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (this.invoer === 'numpad') {
      this.numpad = new Numpad(
        this,
        width - 210,
        height - 420,
        (inv) => this.somGroot.setText(`${this.huidige} × ${this.data_.tafel} = ${inv || '_'}`),
        (waarde) => this.beoordeel(waarde)
      );
    }

    this.visueel = this.add.container(0, 0);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.volgende();
  }

  private volgende() {
    this.knoppen.forEach((k) => k.destroy());
    this.knoppen = [];
    this.visueel.removeAll(true);
    this.hintPaneel?.destroy();
    this.hintPaneel = undefined;
    if (this.goedGedaan >= AANTAL) {
      this.klaar();
      return;
    }
    const skin = SKINS[this.data_.locatie];
    this.huidige = this.wachtrij[0];
    this.foutenOpDeze = 0;
    this.voortgangTekst.setText(`${this.goedGedaan}/${AANTAL}`);
    const a = this.huidige;
    const t = this.data_.tafel;
    this.somTekst.setText(
      `Bestelling: ${a} ${a === 1 ? skin.containerEv : skin.containerMv} met ${t} ${skin.itemMv}.`
    );
    this.somGroot.setText(this.invoer === 'numpad' ? `${a} × ${t} = _` : `${a} × ${t} = ?`);
    this.numpad?.wis();
    this.tekenContainers(a, t);
    if (this.invoer === 'mc') this.maakKnoppen(a * t);
    this.bezig = false;
  }

  /** Containers met items: de som in beeld, meteen de telhulp. */
  private tekenContainers(aantal: number, per: number) {
    const skin = SKINS[this.data_.locatie];
    const zakB = this.invoer === 'numpad' ? 104 : 122;
    const stap = zakB + 14;
    const perRij = Math.min(aantal, 5);
    const rijen = Math.ceil(aantal / perRij);
    const startY = 312;
    for (let i = 0; i < aantal; i++) {
      const rij = Math.floor(i / perRij);
      const inRij = rij === rijen - 1 ? aantal - perRij * (rijen - 1) : perRij;
      const startX = this.middenX - (inRij * stap - 14) / 2 + zakB / 2;
      const x = startX + (i % perRij) * stap;
      const y = startY + rij * (zakB - 8);
      const zak = this.add.container(x, y);
      zak.setScale(zakB / 122);
      const g = this.add.graphics();
      g.fillStyle(skin.containerKleur, 1).fillRoundedRect(-61, -44, 122, 92, 12);
      g.lineStyle(4, skin.containerRand).strokeRoundedRect(-61, -44, 122, 92, 12);
      zak.add(g);
      for (let b = 0; b < per; b++) {
        const k = skin.kolommen;
        const rijenIn = Math.ceil(per / k);
        const inDezeRij = Math.min(k, per - Math.floor(b / k) * k);
        const celB = Math.min(34, 106 / k);
        const bx = -((inDezeRij - 1) * celB) / 2 + (b % k) * celB;
        const by = -20 + Math.floor(b / k) * (64 / rijenIn);
        const item = this.add.graphics();
        this.tekenItem(item, skin.vorm, bx, by, b);
        zak.add(item);
      }
      this.visueel.add(zak);
    }
  }

  private tekenItem(g: Phaser.GameObjects.Graphics, vorm: ItemVorm, x: number, y: number, i: number) {
    const kleuren = [0xd85050, 0x5080d8, 0xe8c040, 0x50b060];
    switch (vorm) {
      case 'brood':
        g.fillStyle(0xdda45f, 1).fillEllipse(x, y, 28, 19);
        g.fillStyle(0xf0c489, 1).fillEllipse(x - 3, y - 4, 18, 8);
        g.lineStyle(2, 0xa8763c).strokeEllipse(x, y, 28, 19);
        break;
      case 'potlood':
        g.fillStyle(kleuren[i % 4], 1).fillRect(x - 4, y - 16, 8, 26);
        g.fillStyle(0xf0d0a0, 1).fillTriangle(x - 4, y + 10, x + 4, y + 10, x, y + 20);
        g.lineStyle(2, 0x604020).strokeRect(x - 4, y - 16, 8, 26);
        break;
      case 'meel':
        g.fillStyle(0xf5eede, 1).fillCircle(x, y, 9);
        g.fillStyle(0xdccfb0, 1).fillCircle(x + 2, y + 2, 4);
        g.lineStyle(2, 0xa89878).strokeCircle(x, y, 9);
        break;
      case 'bal':
        g.fillStyle(kleuren[i % 4], 1).fillCircle(x, y, 13);
        g.fillStyle(0xffffff, 0.55).fillCircle(x - 4, y - 4, 4);
        g.lineStyle(2, 0x404040).strokeCircle(x, y, 13);
        break;
      case 'fles':
        g.fillStyle(0x70b8a8, 1).fillRect(x - 6, y - 10, 12, 26);
        g.fillStyle(0x486858, 1).fillRect(x - 3, y - 16, 6, 7);
        g.lineStyle(2, 0x385848).strokeRect(x - 6, y - 10, 12, 26);
        break;
      case 'ring':
        g.lineStyle(7, kleuren[i % 4]).strokeCircle(x, y, 11);
        g.lineStyle(2, 0x404040).strokeCircle(x, y, 15);
        g.lineStyle(2, 0x404040).strokeCircle(x, y, 7);
        break;
      case 'ei':
        g.fillStyle(0xfaf4e6, 1).fillEllipse(x, y, 15, 20);
        g.lineStyle(2, 0xb0a080).strokeEllipse(x, y, 15, 20);
        break;
      case 'boek':
        g.fillStyle(kleuren[i % 4], 1).fillRect(x - 6, y - 14, 12, 26);
        g.fillStyle(0xffffff, 1).fillRect(x - 6, y - 14, 3, 26);
        g.lineStyle(2, 0x303030).strokeRect(x - 6, y - 14, 12, 26);
        break;
      case 'kegel':
        g.fillStyle(0xe88030, 1).fillTriangle(x - 9, y + 12, x + 9, y + 12, x, y - 12);
        g.fillStyle(0xffffff, 1).fillRect(x - 5, y + 1, 10, 4);
        g.lineStyle(2, 0x904810).strokeTriangle(x - 9, y + 12, x + 9, y + 12, x, y - 12);
        break;
    }
  }

  private maakKnoppen(antwoord: number) {
    const { width, height } = this.scale;
    const opties = new Set<number>([antwoord]);
    const kandidaten = [antwoord - 2, antwoord + 2, antwoord - this.data_.tafel,
      antwoord + this.data_.tafel, antwoord - 1, antwoord + 1];
    for (const k of kandidaten) {
      if (opties.size >= 4) break;
      if (k > 0 && !opties.has(k)) opties.add(k);
    }
    const lijst = Phaser.Utils.Array.Shuffle([...opties]);
    const knopB = 170;
    const startX = width / 2 - (lijst.length * (knopB + 26) - 26) / 2 + knopB / 2;
    lijst.forEach((waarde, i) => {
      const x = startX + i * (knopB + 26);
      const y = height - 120;
      const c = this.add.container(x, y);
      const r = this.add.nineslice(0, 0, 'ui-knop', undefined, knopB, 116, 12, 12, 12, 14);
      const t = this.add
        .text(0, -6, `${waarde}`, {
          fontFamily: 'sans-serif', fontSize: '52px', color: '#4a3218', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      c.add([r, t]);
      c.setSize(knopB, 116);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        klik();
        this.beoordeel(waarde, c);
      });
      this.knoppen.push(c);
    });
  }

  private beoordeel(gekozen: number, knop?: Phaser.GameObjects.Container) {
    if (this.bezig) return;
    const juist = this.huidige * this.data_.tafel;
    const som = `${this.huidige}x${this.data_.tafel}`;
    const vlak = knop?.list[0] as Phaser.GameObjects.NineSlice | undefined;
    if (gekozen === juist) {
      this.bezig = true;
      telSom(som, true);
      goedGeluid();
      this.goedGedaan += 1;
      this.wachtrij.shift();
      vlak?.setTexture('ui-knop-ingedrukt');
      this.somGroot.setText(`${this.huidige} × ${this.data_.tafel} = ${juist}`);
      this.somGroot.setColor('#2a8a2a');
      const check = this.add
        .image(this.middenX + this.somGroot.width / 2 + 46, 218, 'ui-check')
        .setScale(1.4);
      this.tweens.add({ targets: check, scale: 1.9, alpha: 0, duration: 650, delay: 220 });
      this.time.delayedCall(600, () => {
        check.destroy();
        this.somGroot.setColor('#b5541e');
        this.volgende();
      });
    } else {
      telSom(som, false);
      foutGeluid();
      this.foutenOpDeze += 1;
      vlak?.setTint(0xe08a8a);
      if (knop) {
        this.tweens.add({ targets: knop, x: knop.x + 8, duration: 55, yoyo: true, repeat: 3 });
      } else {
        this.tweens.add({ targets: this.somGroot, x: this.somGroot.x + 8, duration: 55, yoyo: true, repeat: 3 });
        this.somGroot.setText(`${this.huidige} × ${this.data_.tafel} = _`);
      }
      if (this.foutenOpDeze === 1) {
        this.wachtrij.push(this.huidige);
        this.toonHint();
      }
      if (this.foutenOpDeze >= 2) {
        this.visueel.list.forEach((zak, i) => {
          const doel = zak as Phaser.GameObjects.Container;
          this.tweens.add({
            targets: doel, scale: doel.scale * 1.15, duration: 220, yoyo: true, delay: i * 260,
          });
        });
      }
      this.time.delayedCall(450, () => vlak?.clearTint());
    }
  }

  /** Ezelsbruggetje van de NPC na een fout antwoord. */
  private toonHint() {
    if (this.hintPaneel) return;
    const { width, height } = this.scale;
    const skin = SKINS[this.data_.locatie];
    const tekst = `${skin.npcNaam}: ${ezelsbrug(this.huidige, this.data_.tafel)}`;
    const maxB = this.invoer === 'numpad' ? width - 520 : width - 320;
    this.hintPaneel = this.add.container(
      this.invoer === 'numpad' ? this.middenX : width / 2,
      height - 245
    );
    const t = this.add
      .text(0, 0, tekst, {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#4a3218',
        align: 'center', wordWrap: { width: maxB },
      })
      .setOrigin(0.5);
    const p = this.add.nineslice(0, 0, 'ui-paneel-rond', undefined,
      t.width + 70, t.height + 44, 16, 16, 16, 16);
    const lamp = this.add
      .text(-p.width / 2 + 30, 0, '💡', { fontSize: '28px' })
      .setOrigin(0.5);
    this.hintPaneel.add([p, t, lamp]);
    this.hintPaneel.setScale(0);
    this.tweens.add({ targets: this.hintPaneel, scale: 1, duration: 260, ease: 'Back.Out' });
  }

  private klaar() {
    const { width, height } = this.scale;
    this.somTekst.setText('');
    this.somGroot.setText('');
    this.numpad?.zetActief(false);
    this.voortgangTekst.setText(`${AANTAL}/${AANTAL}`);
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 700, 300, 24, 24, 24, 24);
    if (this.invoer === 'mc') {
      const t = this.add
        .text(0, -60, 'Alle bestellingen klaar!', {
          fontFamily: 'sans-serif', fontSize: '44px', color: '#4a3218', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(0, 10, 'Maar wacht... daar is de TAFELBAAS!', {
          fontFamily: 'sans-serif', fontSize: '30px', color: '#8a2f2f', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const verder = this.add
        .text(0, 90, 'tik om de baas uit te dagen', {
          fontFamily: 'sans-serif', fontSize: '26px', color: '#9a7440',
        })
        .setOrigin(0.5);
      paneel.add([r, t, sub, verder]);
      this.input.once('pointerdown', () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('battle', {
            locatie: this.data_.locatie,
            tafel: this.data_.tafel,
            terug: this.data_.terug,
          });
        });
      });
    } else {
      voltooiMissie(this.data_.locatie);
      const t = this.add
        .text(0, -70, 'Missie volbracht!', {
          fontFamily: 'sans-serif', fontSize: '46px', color: '#4a3218', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const verder = this.add
        .text(0, 92, 'tik om verder te gaan', {
          fontFamily: 'sans-serif', fontSize: '26px', color: '#9a7440',
        })
        .setOrigin(0.5);
      paneel.add([r, t, verder]);
      [-90, 0, 90].forEach((dx, i) => {
        const ster = this.add.image(dx, 5, 'ui-ster').setScale(0).setAngle(-12 + i * 12);
        paneel.add(ster);
        this.tweens.add({ targets: ster, scale: 1.25, duration: 320, delay: 250 + i * 260, ease: 'Back.Out' });
      });
      this.input.once('pointerdown', () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(this.data_.terug.scene, this.data_.terug.data);
        });
      });
    }
  }
}
