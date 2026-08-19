import Phaser from 'phaser';
import {
  telSom, voltooiMissie, geefTicket, heeftTicket, leaderboard, zetLeaderboard,
  zwaksteTafels, locatieVanTafel, MISSIE_LABEL,
} from '@/core/spel';
import { Numpad } from '@/core/Numpad';
import { trefferGeluid, foutGeluid, fanfare, goedGeluid } from '@/core/geluid';
import { TerugNaar } from '@/scenes/MinigameScene';

// De finale in de Kerk: de rode draak, 20 kale sommen (elke tafel exact 2x),
// numpad, 3 hartjes. In missie-modus is de klok verborgen (tijd achteraf);
// in record-modus (herhaalruns) zichtbaar. Altijd een score, ook bij verlies,
// plus een oefen-suggestie op basis van de foutenstatistieken.

interface FinaleData {
  modus: 'missie' | 'record';
  terug: TerugNaar;
}

const HARTEN = 3;

export class FinaleScene extends Phaser.Scene {
  private data_!: FinaleData;
  private sommen: [number, number][] = [];
  private index = 0;
  private treffers = 0;
  private harten = HARTEN;
  private foutSommen: string[] = [];
  private baas!: Phaser.GameObjects.Container;
  private baasSprite!: Phaser.GameObjects.Image;
  private hpBalk!: Phaser.GameObjects.Rectangle;
  private hartIcons: Phaser.GameObjects.Image[] = [];
  private somGroot!: Phaser.GameObjects.Text;
  private klokTekst?: Phaser.GameObjects.Text;
  private numpad!: Numpad;
  private start = 0;
  private klaar_ = false;

  constructor() {
    super('finale');
  }

  init(data: FinaleData) {
    this.data_ = data;
    const alle: [number, number][] = [];
    for (let t = 1; t <= 10; t++) {
      const a1 = Phaser.Math.Between(2, 10);
      const a2 = Phaser.Math.Between(2, 10);
      alle.push([a1, t]);
      alle.push([t, a2]);
    }
    this.sommen = Phaser.Utils.Array.Shuffle(alle);
    this.index = 0;
    this.treffers = 0;
    this.harten = HARTEN;
    this.foutSommen = [];
    this.klaar_ = false;
    this.hartIcons = [];
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1c1430).setOrigin(0);
    this.add.ellipse(width / 2 - 120, height - 90, width * 0.75, 120, 0x2c2244);

    this.add.nineslice(width / 2, 46, 'ui-naamplaat', undefined, 620, 70, 16, 16, 14, 14);
    this.add
      .text(width / 2, 46, 'DE GROTE TAFELDRAAK', {
        fontFamily: 'sans-serif', fontSize: '34px', color: '#ffd94a', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    if (this.data_.modus === 'record') {
      this.klokTekst = this.add
        .text(width - 44, 46, '0.0', {
          fontFamily: 'sans-serif', fontSize: '34px', color: '#ffd94a', fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
    }

    // draak
    this.baas = this.add.container(width / 2 - 120, 260);
    this.baasSprite = this.add.image(0, 0, 'baas-kerk');
    const schaal = Math.max(2, Math.round(260 / this.baasSprite.height));
    this.baasSprite.setScale(schaal);
    this.baas.add(this.baasSprite);
    this.tweens.add({ targets: this.baas, y: 274, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // draak-HP als balk (20 treffers)
    this.add.rectangle(width / 2 - 120, 118, 424, 26, 0x0e0a1c).setStrokeStyle(3, 0x504470);
    this.hpBalk = this.add.rectangle(width / 2 - 120 - 210, 118, 420, 20, 0xd85050).setOrigin(0, 0.5);

    const el = this.add.sprite(130, height - 150, 'eleanor');
    el.play('eleanor-idle-up');
    el.setScale(1.6);
    for (let i = 0; i < HARTEN; i++) {
      this.hartIcons.push(this.add.image(96 + i * 54, height - 250, 'ui-hart').setScale(0.85));
    }

    this.somGroot = this.add
      .text(width / 2 - 120, height - 230, '', {
        fontFamily: 'sans-serif', fontSize: '76px', color: '#ffd94a', fontStyle: 'bold',
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
    this.cameras.main.fadeIn(350, 0, 0, 0);
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
      trefferGeluid();
      this.treffers += 1;
      this.hpBalk.width = 420 * (1 - this.treffers / this.sommen.length);
      this.baasSprite.setTintFill(0xffffff);
      this.time.delayedCall(120, () => this.baasSprite.clearTint());
      this.tweens.add({ targets: this.baas, x: this.baas.x + 12, duration: 55, yoyo: true, repeat: 2 });
      this.index += 1;
      if (this.index >= this.sommen.length) {
        this.gewonnen();
        return;
      }
      this.toonSom('');
    } else {
      telSom(som, false);
      foutGeluid();
      this.foutSommen.push(`${a} × ${b} = ${a * b}`);
      this.harten -= 1;
      if (this.hartIcons[this.harten]) {
        this.tweens.add({
          targets: this.hartIcons[this.harten], alpha: 0.25, scale: 0.55, duration: 300,
        });
      }
      this.cameras.main.shake(220, 0.009);
      // de gemiste som komt verderop terug
      this.sommen.push([a, b]);
      this.sommen.splice(this.index, 1);
      if (this.harten <= 0) {
        this.verloren();
        return;
      }
      this.toonSom('');
    }
  }

  private suggestie(): string {
    const zwak = zwaksteTafels(1);
    if (zwak.length === 0) return '';
    const t = zwak[0];
    const loc = locatieVanTafel(t);
    const plek = loc ? (MISSIE_LABEL[loc] ?? loc).replace('Ga naar ', '').replace('Help papa in ', '') : '';
    return `Tip: oefen de tafel van ${t} met de tijdrit${plek ? ` bij ${plek.toLowerCase()}` : ''}!`;
  }

  private gewonnen() {
    this.klaar_ = true;
    this.numpad.zetActief(false);
    const ms = this.time.now - this.start;
    fanfare();
    this.tweens.add({ targets: this.baas, y: this.baas.y + 600, alpha: 0, duration: 1100, ease: 'Quad.In' });
    const eersteKeer = !heeftTicket();
    voltooiMissie('kerk');
    if (eersteKeer) {
      geefTicket();
      this.time.delayedCall(900, () => this.toonTicket(ms));
    } else {
      this.time.delayedCall(900, () => this.vraagInitialen(ms));
    }
  }

  /** Het GOUDEN TICKET bij de allereerste overwinning. */
  private toonTicket(ms: number) {
    const { width, height } = this.scale;
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 780, 420, 24, 24, 24, 24);
    const t = this.add
      .text(0, -150, 'DE DRAAK IS VERSLAGEN!', {
        fontFamily: 'sans-serif', fontSize: '42px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    // het ticket
    const ticket = this.add.container(0, -10);
    const tr = this.add.rectangle(0, 0, 520, 150, 0xffd94a).setStrokeStyle(6, 0x8a6a10);
    const tr2 = this.add.rectangle(0, 0, 500, 130, 0xffe98a).setStrokeStyle(3, 0xc09a20);
    const tt = this.add
      .text(0, -30, 'GOUDEN TICKET', {
        fontFamily: 'sans-serif', fontSize: '36px', color: '#8a5a10', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const ts = this.add
      .text(0, 22, 'Papa bouwt een game naar JOUW keuze!', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#6a4a10',
      })
      .setOrigin(0.5);
    ticket.add([tr, tr2, tt, ts]);
    ticket.setScale(0);
    const tijd = this.add
      .text(0, 118, `Jouw tijd: ${(ms / 1000).toFixed(1)} seconden`, {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#8a6a2a',
      })
      .setOrigin(0.5);
    const verder = this.add
      .text(0, 168, 'tik om je naam op het bord te zetten', {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#9a7440',
      })
      .setOrigin(0.5);
    paneel.add([r, t, ticket, tijd, verder]);
    this.tweens.add({ targets: ticket, scale: 1, angle: 360, duration: 700, delay: 250, ease: 'Back.Out' });
    this.input.once('pointerdown', () => {
      paneel.destroy();
      this.vraagInitialen(ms);
    });
  }

  /** Arcade-initialen (3 letters) voor het leaderboard. */
  private vraagInitialen(ms: number) {
    const { width, height } = this.scale;
    const letters = ['E', 'L', 'E'];
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 640, 420, 24, 24, 24, 24);
    const t = this.add
      .text(0, -160, `Tijd: ${(ms / 1000).toFixed(1)} s — wie ben jij?`, {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    paneel.add([r, t]);
    const letterTeksten: Phaser.GameObjects.Text[] = [];
    [0, 1, 2].forEach((i) => {
      const x = -120 + i * 120;
      const lt = this.add
        .text(x, -20, letters[i], {
          fontFamily: 'monospace', fontSize: '72px', color: '#b5541e', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      letterTeksten.push(lt);
      const maakPijl = (dy: number, delta: number, symbool: string) => {
        const p = this.add
          .text(x, -20 + dy, symbool, { fontSize: '34px', color: '#8a6a2a' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        p.on('pointerdown', () => {
          const code = (letters[i].charCodeAt(0) - 65 + delta + 26) % 26;
          letters[i] = String.fromCharCode(65 + code);
          lt.setText(letters[i]);
        });
        paneel.add(p);
      };
      maakPijl(-70, 1, '▲');
      maakPijl(70, -1, '▼');
      paneel.add(lt);
    });
    const ok = this.add.container(0, 130);
    const okVlak = this.add.nineslice(0, 0, 'ui-knop', undefined, 220, 86, 12, 12, 12, 14);
    const okT = this.add
      .text(0, -4, 'OK', { fontFamily: 'sans-serif', fontSize: '34px', color: '#2a6a2a', fontStyle: 'bold' })
      .setOrigin(0.5);
    ok.add([okVlak, okT]);
    ok.setSize(220, 86);
    ok.setInteractive({ useHandCursor: true });
    ok.once('pointerdown', () => {
      const positie = zetLeaderboard(letters.join(''), ms);
      paneel.destroy();
      this.toonLeaderboard(positie === 0);
    });
    paneel.add(ok);
  }

  /** Ouderwets arcade-bord. */
  private toonLeaderboard(record: boolean) {
    const { width, height } = this.scale;
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.rectangle(0, 0, 620, 480, 0x0e0a1c).setStrokeStyle(8, 0xffd94a);
    const titel = this.add
      .text(0, -190, '★ KERK-ARCADE ★', {
        fontFamily: 'monospace', fontSize: '38px', color: '#ffd94a', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    paneel.add([r, titel]);
    if (record) {
      const nieuw = this.add
        .text(0, -140, 'NEW HIGH SCORE!', {
          fontFamily: 'monospace', fontSize: '26px', color: '#ff6a6a', fontStyle: 'bold',
        })
        .setOrigin(0.5);
      paneel.add(nieuw);
      this.tweens.add({ targets: nieuw, alpha: 0.15, duration: 350, yoyo: true, repeat: -1 });
    }
    leaderboard().forEach((e, i) => {
      const regel = this.add
        .text(-220, -80 + i * 52, `${i + 1}.  ${e.naam}   ${(e.ms / 1000).toFixed(1)} s`, {
          fontFamily: 'monospace', fontSize: '32px',
          color: i === 0 ? '#ffd94a' : '#d8d0f0',
        })
        .setOrigin(0, 0.5);
      paneel.add(regel);
    });
    const verder = this.add
      .text(0, 200, 'tik om terug naar het dorp te gaan', {
        fontFamily: 'monospace', fontSize: '20px', color: '#9a90c0',
      })
      .setOrigin(0.5);
    paneel.add(verder);
    this.input.once('pointerdown', () => this.terug());
  }

  private verloren() {
    this.klaar_ = true;
    this.numpad.zetActief(false);
    const { width, height } = this.scale;
    const paneel = this.add.container(width / 2, height / 2);
    const r = this.add.nineslice(0, 0, 'ui-paneel-hout', undefined, 760, 420, 24, 24, 24, 24);
    const t = this.add
      .text(0, -150, `Score: ${this.treffers} van de 20!`, {
        fontFamily: 'sans-serif', fontSize: '44px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, -85, 'De draak lacht... maar jij komt terug, toch?', {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#8a6a2a',
      })
      .setOrigin(0.5);
    const fouten = this.add
      .text(0, -5, this.foutSommen.length ? `Deze gingen mis:\n${this.foutSommen.slice(0, 3).join('   ')}` : '', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#8a2f2f', align: 'center',
      })
      .setOrigin(0.5);
    const tip = this.add
      .text(0, 85, this.suggestie(), {
        fontFamily: 'sans-serif', fontSize: '25px', color: '#2a6a2a', fontStyle: 'bold',
        align: 'center', wordWrap: { width: 680 },
      })
      .setOrigin(0.5);
    const verder = this.add
      .text(0, 160, 'tik om terug naar het dorp te gaan', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#9a7440',
      })
      .setOrigin(0.5);
    paneel.add([r, t, sub, fouten, tip, verder]);
    this.input.once('pointerdown', () => this.terug());
  }

  private terug() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.data_.terug.scene, this.data_.terug.data);
    });
  }

  update() {
    if (!this.klaar_ && this.klokTekst) {
      this.klokTekst.setText(`${((this.time.now - this.start) / 1000).toFixed(1)}`);
    }
  }
}
