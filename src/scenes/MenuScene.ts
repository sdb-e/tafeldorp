import Phaser from 'phaser';
import { besttijd, heeftTicket, leaderboard } from '@/core/spel';
import { klik, startMuziek, stopMuziek } from '@/core/geluid';

// Startmenu: de dorpskaart als achtergrond, 16-bit muziekje, en drie ingangen:
// het verhaal (dorp), de tijdritten (per tafel plus de draak) en de records.
// Zo kan een speler die de missies heeft uitgespeeld direct trainen.

export class MenuScene extends Phaser.Scene {
  private paneel?: Phaser.GameObjects.Container;

  constructor() {
    super('menu');
  }

  create() {
    const { width, height } = this.scale;

    // dorpskaart als achtergrond, ingezoomd met een donkere waas
    const bg = this.add.image(width / 2, height / 2 - 260, 'kaart-onder');
    const schaal = Math.max(width / bg.width, height / bg.height) * 2.1;
    bg.setScale(schaal);
    this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.45).setOrigin(0);

    // titel
    const titel = this.add
      .text(width / 2, 150, 'TAFELDORP', {
        fontFamily: 'sans-serif', fontSize: '96px', color: '#ffd94a', fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#5a3d1e', 14)
      .setShadow(0, 6, '#00000088', 8);
    this.add
      .text(width / 2, 224, 'leer de keersommen in je eigen dorp', {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#f5edda',
      })
      .setOrigin(0.5)
      .setStroke('#1a1a2e', 6);
    this.tweens.add({ targets: titel, y: 158, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.knop(width / 2, 380, 'Het dorp in!', 0x2a6a2a, () => {
      stopMuziek();
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('village'));
    });
    this.knop(width / 2, 500, 'Tijdrit', 0xb5541e, () => this.toonTijdritten());
    this.knop(width / 2, 620, 'Records', 0x54749a, () => this.toonRecords());

    this.add
      .text(width / 2, height - 34, 'voor Eleanor', {
        fontFamily: 'sans-serif', fontSize: '20px', color: '#c8c0e0',
      })
      .setOrigin(0.5);

    // muziek mag pas na de eerste interactie van de browser
    startMuziek();
    this.input.once('pointerdown', () => startMuziek());
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private knop(x: number, y: number, tekst: string, kleur: number, actie: () => void, breedte = 380) {
    const c = this.add.container(x, y);
    const vlak = this.add.nineslice(0, 0, 'ui-knop', undefined, breedte, 92, 12, 12, 12, 14);
    const t = this.add
      .text(0, -5, tekst, {
        fontFamily: 'sans-serif', fontSize: '36px', color: `#${kleur.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([vlak, t]);
    c.setSize(breedte, 92);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      klik();
      startMuziek();
      // een tick uitstellen zodat dezelfde pointerdown niet doorlekt naar
      // knoppen die de actie zelf aanmaakt (paneel onder de vinger)
      this.time.delayedCall(0, actie);
    });
    return c;
  }

  private sluitPaneel() {
    this.paneel?.destroy();
    this.paneel = undefined;
  }

  /** Paneel met tijdrit-knoppen: alle tafels vrij, de draak na het Gouden Ticket. */
  private toonTijdritten() {
    this.sluitPaneel();
    const { width, height } = this.scale;
    const p = this.add.container(width / 2, height / 2).setDepth(100);
    this.paneel = p;
    const vlak = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 1000, 620, 24, 24, 24, 24);
    const titel = this.add
      .text(0, -260, 'Tijdrit: kies je tafel', {
        fontFamily: 'sans-serif', fontSize: '38px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    p.add([vlak, titel]);

    for (let t = 1; t <= 10; t++) {
      const kol = (t - 1) % 5;
      const rij = Math.floor((t - 1) / 5);
      const x = -360 + kol * 180;
      const y = -140 + rij * 170;
      const knop = this.add.container(x, y);
      const kv = this.add.nineslice(0, 0, 'ui-knop', undefined, 150, 110, 12, 12, 12, 14);
      const kt = this.add
        .text(0, -22, `${t}`, {
          fontFamily: 'sans-serif', fontSize: '44px', color: '#b5541e', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const record = besttijd(t);
      const rt = this.add
        .text(0, 22, record ? `${(record / 1000).toFixed(1)} s` : '—', {
          fontFamily: 'sans-serif', fontSize: '22px', color: '#8a6a2a',
        })
        .setOrigin(0.5);
      knop.add([kv, kt, rt]);
      knop.setSize(150, 110);
      knop.setInteractive({ useHandCursor: true });
      knop.on('pointerdown', () => {
        klik();
        stopMuziek();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('tijdrit', { tafel: t, terug: { scene: 'menu', data: {} } });
        });
      });
      p.add(knop);
    }

    // de draak: alle tafels door elkaar, unlocked na het Gouden Ticket
    const open = heeftTicket();
    const draak = this.add.container(0, 178);
    const dv = this.add.nineslice(0, 0, 'ui-knop', undefined, 420, 96, 12, 12, 12, 14);
    const dt = this.add
      .text(0, -5, open ? 'De Tafeldraak!' : 'De Tafeldraak (versla hem eerst)', {
        fontFamily: 'sans-serif', fontSize: open ? '32px' : '22px',
        color: open ? '#8a2f2f' : '#9a8f78', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    draak.add([dv, dt]);
    if (open) {
      draak.setSize(420, 96);
      draak.setInteractive({ useHandCursor: true });
      draak.on('pointerdown', () => {
        klik();
        stopMuziek();
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('finale', { modus: 'record', terug: { scene: 'menu', data: {} } });
        });
      });
    } else {
      dv.setAlpha(0.6);
    }
    p.add(draak);

    this.terugKnop(p, 0, 270);
  }

  /** Paneel met alle records: besttijd per tafel en de draak-top-5. */
  private toonRecords() {
    this.sluitPaneel();
    const { width, height } = this.scale;
    const p = this.add.container(width / 2, height / 2).setDepth(100);
    this.paneel = p;
    const vlak = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 1000, 620, 24, 24, 24, 24);
    const titel = this.add
      .text(0, -260, 'Records', {
        fontFamily: 'sans-serif', fontSize: '38px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    p.add([vlak, titel]);

    const kop1 = this.add
      .text(-420, -195, 'Tijdrit per tafel', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#8a6a2a', fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    p.add(kop1);
    for (let t = 1; t <= 10; t++) {
      const kol = t <= 5 ? 0 : 1;
      const rij = (t - 1) % 5;
      const record = besttijd(t);
      const regel = this.add
        .text(-420 + kol * 240, -140 + rij * 58,
          `tafel ${String(t).padStart(2, ' ')}   ${record ? `${(record / 1000).toFixed(1)} s` : '—'}`, {
            fontFamily: 'monospace', fontSize: '26px', color: record ? '#4a3218' : '#9a8f78',
          })
        .setOrigin(0, 0.5);
      p.add(regel);
    }

    const kop2 = this.add
      .text(140, -195, '★ De Tafeldraak ★', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#8a2f2f', fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    p.add(kop2);
    const top = leaderboard();
    if (top.length === 0) {
      p.add(this.add
        .text(140, -130, 'Nog niemand heeft\nde draak verslagen...', {
          fontFamily: 'sans-serif', fontSize: '24px', color: '#9a8f78',
        })
        .setOrigin(0, 0.5));
    }
    top.forEach((e, i) => {
      p.add(this.add
        .text(140, -140 + i * 58, `${i + 1}.  ${e.naam}   ${(e.ms / 1000).toFixed(1)} s`, {
          fontFamily: 'monospace', fontSize: '28px',
          color: i === 0 ? '#b5541e' : '#4a3218',
        })
        .setOrigin(0, 0.5));
    });

    this.terugKnop(p, 0, 270);
  }

  private terugKnop(p: Phaser.GameObjects.Container, x: number, y: number) {
    const knop = this.add.container(x, y);
    const kv = this.add.nineslice(0, 0, 'ui-knop', undefined, 220, 80, 12, 12, 12, 14);
    const kt = this.add
      .text(0, -4, 'Terug', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    knop.add([kv, kt]);
    knop.setSize(220, 80);
    knop.setInteractive({ useHandCursor: true });
    knop.on('pointerdown', (
      _p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      klik();
      this.time.delayedCall(0, () => this.sluitPaneel());
    });
    p.add(knop);
  }
}
