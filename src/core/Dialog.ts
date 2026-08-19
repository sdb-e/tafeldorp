// Stardew-achtige dialoogbox in Modern UI-stijl: houtframe-paneel, portret
// van het gezinslid in een eigen kader, naamplaat en typewriter-tekst met
// gebrabbel per spreker. Tik om verder te gaan; laatste tik sluit (onClose).
import Phaser from 'phaser';
import { brabbel } from '@/core/geluid';

export interface DialogLine {
  spreker: string; // weergavenaam, bijv. "Mama"
  portret: string; // texture key, bijv. "portret-marjolein-lach"
  tekst: string;
}

const BOX_H = 230;
const MARGE = 20;
const TYPE_MS = 25;
const PORTRET_VAK = 180;

export class Dialog {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private tekstObj?: Phaser.GameObjects.Text;
  private portretObj?: Phaser.GameObjects.Image;
  private naamObj?: Phaser.GameObjects.Text;
  private naamPlaat?: Phaser.GameObjects.NineSlice;
  private verderObj?: Phaser.GameObjects.Text;
  private lines: DialogLine[] = [];
  private index = 0;
  private volleTekst = '';
  private typeEvent?: Phaser.Time.TimerEvent;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get open(): boolean {
    return this.container !== undefined;
  }

  start(lines: DialogLine[], onClose?: () => void) {
    if (this.open || lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.bouwBox();
    this.toonRegel();
  }

  /** Tik-afhandeling: eerst typewriter afmaken, dan volgende regel, dan sluiten. */
  tik() {
    if (!this.open) return;
    if (this.typeEvent && this.tekstObj!.text.length < this.volleTekst.length) {
      this.typeEvent.remove();
      this.tekstObj!.setText(this.volleTekst);
      this.verderObj!.setVisible(true);
      return;
    }
    this.index++;
    if (this.index < this.lines.length) {
      this.toonRegel();
    } else {
      this.sluit();
    }
  }

  private bouwBox() {
    const { width, height } = this.scene.scale;
    const boxW = width - MARGE * 2;
    const y = height - BOX_H - MARGE;
    // camera-zoom compenseren zodat de box altijd schermvullend onderin staat
    const z = this.scene.cameras.main.zoom;
    const px = width / 2 + (MARGE - width / 2) / z;
    const py = height / 2 + (y - height / 2) / z;

    const paneel = this.scene.add
      .nineslice(0, 0, 'ui-paneel-hout', undefined, boxW, BOX_H, 24, 24, 24, 24)
      .setOrigin(0);

    const portretKader = this.scene.add
      .nineslice(26, (BOX_H - PORTRET_VAK) / 2 + 8, 'ui-paneel-rond', undefined,
        PORTRET_VAK, PORTRET_VAK, 16, 16, 16, 16)
      .setOrigin(0);
    this.portretObj = this.scene.add
      .image(26 + PORTRET_VAK / 2, (BOX_H - PORTRET_VAK) / 2 + 8 + PORTRET_VAK / 2, '')
      .setDisplaySize(PORTRET_VAK - 36, PORTRET_VAK - 36);

    this.naamPlaat = this.scene.add
      .nineslice(30, -16, 'ui-naamplaat', undefined, 190, 44, 16, 16, 14, 14)
      .setOrigin(0);
    this.naamObj = this.scene.add.text(125, 6, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f5edda',
    }).setOrigin(0.5);

    this.tekstObj = this.scene.add.text(230, 46, '', {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#3b2a15',
      wordWrap: { width: boxW - 280 },
      lineSpacing: 8,
    });
    this.verderObj = this.scene.add
      .text(boxW - 38, BOX_H - 40, '▼', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#8a5a2b',
      })
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.scene.tweens.add({
      targets: this.verderObj,
      y: '+=6',
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.container = this.scene.add
      .container(px, py, [
        paneel,
        portretKader,
        this.portretObj,
        this.naamPlaat,
        this.naamObj,
        this.tekstObj,
        this.verderObj,
      ])
      .setDepth(20000)
      .setScale(1 / z)
      .setScrollFactor(0);
  }

  private toonRegel() {
    const regel = this.lines[this.index];
    this.portretObj!.setTexture(regel.portret);
    this.portretObj!.setDisplaySize(PORTRET_VAK - 36, PORTRET_VAK - 36);
    this.naamObj!.setText(regel.spreker);
    this.volleTekst = regel.tekst;
    this.tekstObj!.setText('');
    this.verderObj!.setVisible(false);
    let i = 0;
    this.typeEvent?.remove();
    this.typeEvent = this.scene.time.addEvent({
      delay: TYPE_MS,
      repeat: this.volleTekst.length - 1,
      callback: () => {
        i++;
        this.tekstObj!.setText(this.volleTekst.slice(0, i));
        // gebrabbel: om de twee letters een bliepje in de stem van de spreker
        if (i % 2 === 0 && this.volleTekst[i - 1] !== ' ') brabbel(regel.portret);
        if (i >= this.volleTekst.length) this.verderObj!.setVisible(true);
      },
    });
  }

  private sluit() {
    this.typeEvent?.remove();
    this.container?.destroy();
    this.container = undefined;
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }
}
