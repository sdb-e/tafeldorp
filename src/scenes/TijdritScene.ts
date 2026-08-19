import Phaser from 'phaser';
import { telSom, besttijd, zetBesttijd } from '@/core/spel';
import { Numpad } from '@/core/Numpad';
import { goedGeluid, foutGeluid, fanfare } from '@/core/geluid';
import { TerugNaar } from '@/scenes/MinigameScene';

// Tijdrit per tafel: alle 20 sommen (1..10 keer t, links- en rechtsom) zo snel
// mogelijk, met numpad. Fout = dezelfde som blijft staan (kost vanzelf tijd).
// De samenstelling is altijd gelijk, dus tijden zijn eerlijk te vergelijken.

interface TijdritData {
  tafel: number;
  terug: TerugNaar;
}

export class TijdritScene extends Phaser.Scene {
  private data_!: TijdritData;
  private sommen: [number, number][] = [];
  private index = 0;
  private somGroot!: Phaser.GameObjects.Text;
  private klokTekst!: Phaser.GameObjects.Text;
  private voortgang!: Phaser.GameObjects.Text;
  private numpad!: Numpad;
  private start = 0;
  private klaar_ = false;

  constructor() {
    super('tijdrit');
  }

  init(data: TijdritData) {
    this.data_ = data;
    const t = data.tafel;
    const alle: [number, number][] = [];
    for (let a = 1; a <= 10; a++) {
      alle.push([a, t]);
      alle.push([t, a]);
    }
    this.sommen = Phaser.Utils.Array.Shuffle(alle);
    this.index = 0;
    this.klaar_ = false;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0xefe3c8).setOrigin(0);
    this.add.nineslice(width / 2, 48, 'ui-naamplaat', undefined, width - 32, 76, 16, 16, 14, 14);
    this.add
      .text(width / 2, 48, `Tijdrit: tafel van ${this.data_.tafel}!`, {
        fontFamily: 'sans-serif', fontSize: '38px', color: '#f5edda', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.klokTekst = this.add
      .text(width - 52, 48, '0.0', {
        fontFamily: 'sans-serif', fontSize: '34px', color: '#ffd94a', fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);
    this.voortgang = this.add
      .text(52, 48, '1/20', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#f5edda',
      })
      .setOrigin(0, 0.5);

    const record = besttijd(this.data_.tafel);
    this.add
      .text(width / 2 - 200, 150, record ? `Jouw record: ${(record / 1000).toFixed(1)} s` : 'Nog geen record. Zet er een!', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#8a6a2a',
      })
      .setOrigin(0.5);

    this.somGroot = this.add
      .text(width / 2 - 200, height / 2 - 40, '', {
        fontFamily: 'sans-serif', fontSize: '84px', color: '#b5541e', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.numpad = new Numpad(
      this,
      width - 210,
      height - 420,
      (inv) => this.toonSom(inv),
      (waarde) => this.beoordeel(waarde)
    );

    this.start = this.time.now;
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.toonSom('');
  }

  private toonSom(invoer: string) {
    if (this.klaar_) return;
    const [a, b] = this.sommen[this.index];
    this.somGroot.setText(`${a} × ${b} = ${invoer || '_'}`);
  }

  private beoordeel(waarde: number) {
    if (this.klaar_) return;
    const [a, b] = this.sommen[this.index];
    const som = a <= b ? `${a}x${b}` : `${b}x${a}`;
    if (waarde === a * b) {
      telSom(som, true);
      goedGeluid();
      this.index += 1;
      if (this.index >= this.sommen.length) {
        this.finish();
        return;
      }
      this.voortgang.setText(`${this.index + 1}/20`);
      this.toonSom('');
    } else {
      telSom(som, false);
      foutGeluid();
      this.tweens.add({ targets: this.somGroot, x: this.somGroot.x + 10, duration: 55, yoyo: true, repeat: 3 });
      this.toonSom('');
    }
  }

  private finish() {
    this.klaar_ = true;
    this.numpad.zetActief(false);
    const ms = this.time.now - this.start;
    const record = zetBesttijd(this.data_.tafel, ms);
    if (record) fanfare();
    else goedGeluid();
    const { width, height } = this.scale;
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 720, 340, 24, 24, 24, 24);
    const t = this.add
      .text(0, -95, record ? 'NIEUW RECORD!' : 'Tijdrit klaar!', {
        fontFamily: 'sans-serif', fontSize: '46px',
        color: record ? '#b5541e' : '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const tijd = this.add
      .text(0, -20, `${(ms / 1000).toFixed(1)} seconden`, {
        fontFamily: 'sans-serif', fontSize: '54px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const oud = besttijd(this.data_.tafel);
    const sub = this.add
      .text(0, 55, record ? 'Kan jij dit nog sneller?' : `Record blijft ${((oud ?? ms) / 1000).toFixed(1)} s. Nog een keer?`, {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#8a6a2a',
      })
      .setOrigin(0.5);
    const verder = this.add
      .text(0, 118, 'tik om terug te gaan', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#9a7440',
      })
      .setOrigin(0.5);
    paneel.add([r, t, tijd, sub, verder]);
    if (record) {
      this.tweens.add({ targets: t, scale: 1.12, duration: 380, yoyo: true, repeat: -1 });
    }
    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(this.data_.terug.scene, this.data_.terug.data);
      });
    });
  }

  update() {
    if (!this.klaar_) {
      this.klokTekst.setText(`${((this.time.now - this.start) / 1000).toFixed(1)}`);
    }
  }
}
