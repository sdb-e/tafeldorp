import Phaser from 'phaser';
import { Direction } from '@/core/sprites';
import { Dialog, DialogLine } from '@/core/Dialog';
import { huidigeMissie, isBehaald, voltooiMissie, LOCATIE_TAFEL, MISSIE_LABEL, besttijd } from '@/core/spel';
import { SKINS, NPC_PLEK, introDialoog, klaarDialoog } from '@/core/locaties';
import { toonKeuze, keuzeOpen } from '@/core/Keuze';

// Binnenlocatie: ingerichte kamer met deurmat-uitgang, en waar van toepassing
// een NPC (gezinslid) die de missie geeft of de minigame start.

const SNELHEID = 190;
const PRAAT_AFSTAND = 130;

interface KamerData {
  wereld: [number, number];
  spawn: [number, number];
  mat: [number, number, number, number];
  boven: boolean;
  collisions: [number, number, number, number][];
}

function npcSprite(kamerId: string): string | undefined {
  if (kamerId === 'thuis') return 'marjolein';
  return SKINS[kamerId]?.npcSprite;
}

export class InteriorScene extends Phaser.Scene {
  private speler!: Phaser.Physics.Arcade.Sprite;
  private npc?: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private richting: Direction = 'up';
  private doel?: Phaser.Math.Vector2;
  private kamerId!: string;
  private terug!: [number, number];
  private mat!: Phaser.Geom.Rectangle;
  private klaar = false;
  private binnenSinds = 0;
  private dialog!: Dialog;
  private hint?: Phaser.GameObjects.Text;

  constructor() {
    super('interior');
  }

  init(data: { id: string; terug: [number, number] }) {
    this.kamerId = data.id;
    this.terug = data.terug;
  }

  create() {
    const kamer = this.cache.json.get(`kamer-${this.kamerId}`) as KamerData;
    const [wb, hb] = kamer.wereld;

    this.add.image(0, 0, `kamer-${this.kamerId}-onder`).setOrigin(0).setDepth(-100);
    if (kamer.boven) {
      this.add.image(0, 0, `kamer-${this.kamerId}-boven`).setOrigin(0).setDepth(10000);
    }

    this.physics.world.setBounds(0, 0, wb, hb);
    const muren = this.physics.add.staticGroup();
    for (const [x, y, w, h] of kamer.collisions) {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(r, true);
      muren.add(r);
    }

    this.mat = new Phaser.Geom.Rectangle(...kamer.mat);

    this.speler = this.physics.add
      .sprite(kamer.spawn[0], kamer.spawn[1], 'eleanor')
      .setCollideWorldBounds(true);
    this.speler.body!.setSize(26, 18).setOffset(11, 74);
    this.richting = 'up';
    this.speler.play('eleanor-idle-up');
    this.physics.add.collider(this.speler, muren);

    const plek = NPC_PLEK[this.kamerId];
    const sprite = npcSprite(this.kamerId);
    if (plek && sprite) {
      this.npc = this.physics.add
        .sprite(plek.tx * 48, plek.ty * 48, sprite)
        .setImmovable(true);
      this.npc.body!.setSize(26, 18).setOffset(11, 74);
      this.npc.play(`${sprite}-idle-down`);
      this.physics.add.collider(this.speler, this.npc);
      this.hint = this.add
        .text(this.npc.x, this.npc.y - 96, 'tik om te praten', {
          fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff',
          backgroundColor: '#00000088', padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(11000)
        .setVisible(false);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, Math.max(wb, cam.width / 1.5), Math.max(hb, cam.height / 1.5));
    cam.setZoom(1.5);
    cam.centerOn(wb / 2, hb / 2);
    if (wb * 1.5 > cam.width || hb * 1.5 > cam.height) {
      cam.startFollow(this.speler, true, 0.15, 0.15);
    }
    cam.fadeIn(250, 0, 0, 0);

    this.dialog = new Dialog(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.opTik(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !this.dialog.open && !keuzeOpen(this)) this.doel = new Phaser.Math.Vector2(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => (this.doel = undefined));
    this.klaar = false;
    this.doel = undefined;
    this.binnenSinds = this.time.now;

    // de kerk is de finale-arena: de draak wacht
    if (this.kamerId === 'kerk') {
      this.time.delayedCall(700, () => this.kerkFlow());
    }
  }

  private kerkFlow() {
    if (this.klaar || this.dialog.open) return;
    const naarFinale = (modus: 'missie' | 'record') => {
      this.klaar = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('finale', {
          modus,
          terug: { scene: 'village', data: { spawn: this.terug } },
        });
      });
    };
    if (!isBehaald('kerk')) {
      this.dialog.start([
        { spreker: 'Tafeldraak', portret: 'baas-kerk', tekst: 'GRRRAAAH! Wie durft mijn kerk te betreden?!' },
        { spreker: 'Tafeldraak', portret: 'baas-kerk', tekst: 'Twintig sommen, ALLE tafels door elkaar... en deze keer typ je zelf. Versla mij en het Gouden Ticket is van jou!' },
        { spreker: 'Eleanor', portret: 'portret-eleanor-verrast', tekst: 'Ik heb alle tafels geoefend. Kom maar op, draak!' },
      ], () => naarFinale('missie'));
    } else {
      toonKeuze(
        this,
        'De draak wil een rematch voor het arcade-bord. Klok loopt mee!',
        'Kom maar op!', 'Nu even niet',
        () => naarFinale('record')
      );
    }
  }

  private opTik(p: Phaser.Input.Pointer) {
    if (keuzeOpen(this)) return;
    if (this.dialog.open) {
      this.dialog.tik();
      return;
    }
    if (this.npc) {
      const opNpc =
        Phaser.Math.Distance.Between(p.worldX, p.worldY, this.npc.x, this.npc.y) < 70;
      const dichtbij =
        Phaser.Math.Distance.Between(this.speler.x, this.speler.y, this.npc.x, this.npc.y) <
        PRAAT_AFSTAND;
      if (opNpc && dichtbij) {
        this.doel = undefined;
        this.speler.setVelocity(0);
        this.startGesprek();
        return;
      }
    }
    this.doel = new Phaser.Math.Vector2(p.worldX, p.worldY);
  }

  private startGesprek() {
    const missie = huidigeMissie();
    if (this.kamerId === 'thuis') {
      if (missie === 'thuis') {
        const lines: DialogLine[] = [
          { spreker: 'Mama', portret: 'portret-marjolein-lach', tekst: 'Ha lieverd! Papa is vandaag bakker en het is veel te druk in de bakkerij.' },
          { spreker: 'Mama', portret: 'portret-marjolein-denkend', tekst: 'Ga jij hem helpen met de bestellingen? De bakkerij is links van het plein.' },
          { spreker: 'Eleanor', portret: 'portret-eleanor-blij', tekst: 'Ik ga meteen! Broodjes tellen kan ik heel goed!' },
        ];
        this.dialog.start(lines, () => voltooiMissie('thuis'));
      } else {
        this.dialog.start([
          { spreker: 'Mama', portret: 'portret-marjolein-lach', tekst: `Goed bezig! Je moest naar de ${missie}, weet je nog?` },
        ]);
      }
      return;
    }
    const skin = SKINS[this.kamerId];
    if (!skin) return;
    if (isBehaald(this.kamerId)) {
      const tafel = LOCATIE_TAFEL[this.kamerId];
      this.dialog.start(klaarDialoog(this.kamerId, MISSIE_LABEL[missie] ?? missie), () => {
        const record = besttijd(tafel);
        toonKeuze(
          this,
          record
            ? `Tijdrit van de tafel van ${tafel}? Jouw record: ${(record / 1000).toFixed(1)} s.`
            : `Wil je de tijdrit van de tafel van ${tafel} proberen? 20 sommen, zo snel mogelijk!`,
          'Ja, tijdrit!', 'Straks',
          () => {
            this.klaar = true;
            this.cameras.main.fadeOut(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('tijdrit', {
                tafel,
                terug: { scene: 'interior', data: { id: this.kamerId, terug: this.terug } },
              });
            });
          }
        );
      });
      return;
    }
    if (missie === this.kamerId) {
      this.dialog.start(introDialoog(this.kamerId, LOCATIE_TAFEL[this.kamerId]), () => {
        this.klaar = true;
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('minigame', {
            locatie: this.kamerId,
            tafel: LOCATIE_TAFEL[this.kamerId],
            terug: { scene: 'interior', data: { id: this.kamerId, terug: this.terug } },
          });
        });
      });
      return;
    }
    this.dialog.start([
      {
        spreker: skin.npcNaam,
        portret: `portret-${skin.npcPortret}`,
        tekst: `Ha Eleanor! Jouw missie is nu: ${(MISSIE_LABEL[missie] ?? missie).toLowerCase()}.`,
      },
    ]);
  }

  update() {
    if (this.klaar) return;
    if (keuzeOpen(this)) {
      this.speler.setVelocity(0);
      return;
    }
    if (this.dialog.open) {
      this.speler.setVelocity(0);
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;
    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;

    if (vx === 0 && vy === 0 && this.doel) {
      const dx = this.doel.x - this.speler.x;
      const dy = this.doel.y - this.speler.y;
      if (Math.hypot(dx, dy) > 10) {
        vx = dx;
        vy = dy;
      } else {
        this.doel = undefined;
      }
    }

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.length() > 0) {
      v.normalize().scale(SNELHEID);
      this.speler.setVelocity(v.x, v.y);
      this.richting =
        Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : v.y > 0 ? 'down' : 'up';
      this.speler.play(`eleanor-walk-${this.richting}`, true);
    } else {
      this.speler.setVelocity(0);
      this.speler.play(`eleanor-idle-${this.richting}`, true);
    }
    this.speler.setDepth(this.speler.y);
    if (this.npc) {
      this.npc.setDepth(this.npc.y);
      this.hint?.setVisible(
        Phaser.Math.Distance.Between(this.speler.x, this.speler.y, this.npc.x, this.npc.y) <
          PRAAT_AFSTAND
      );
    }

    const voet = new Phaser.Math.Vector2(this.speler.x, this.speler.y + 40);
    if (this.time.now - this.binnenSinds > 500 && this.mat.contains(voet.x, voet.y)) {
      this.klaar = true;
      this.speler.setVelocity(0);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('village', { spawn: this.terug });
      });
    }
  }
}
