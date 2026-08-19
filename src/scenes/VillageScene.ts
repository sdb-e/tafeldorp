import Phaser from 'phaser';
import { Direction } from '@/core/sprites';
import { Dialog } from '@/core/Dialog';
import { huidigeMissie, isBehaald, MISSIE_LABEL, LOCATIE_TAFEL, besttijd } from '@/core/spel';
import { SKINS, introDialoog } from '@/core/locaties';
import { toonKeuze, keuzeOpen } from '@/core/Keuze';

// Het dorp: gerenderde kaart in twee lagen met botsingen en deurzones.
// Locaties zijn missie-gestuurd: alleen thuis, behaalde locaties en de
// huidige missie-locatie zijn open.

const SNELHEID = 200;

interface KaartData {
  wereld: [number, number];
  spawn: [number, number];
  collisions: [number, number, number, number][];
  locaties: {
    naam: string;
    tafel: number | string | null;
    binnen: string | null;
    deur: [number, number, number, number];
    bordpos: [number, number];
  }[];
  voorgronden?: { file: string; x: number; y: number }[];
}

export class VillageScene extends Phaser.Scene {
  private speler!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private richting: Direction = 'down';
  private doel?: Phaser.Math.Vector2;
  private labels: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private spawnOverride?: [number, number];
  private kaart!: KaartData;
  private wisselt = false;
  private melding?: Phaser.GameObjects.Text;
  private meldingTot = 0;
  private dialog!: Dialog;
  private missieTekst?: Phaser.GameObjects.Text;
  private missieDoel?: Phaser.Math.Vector2;
  private pijl?: Phaser.GameObjects.Text;

  constructor() {
    super('village');
  }

  init(data: { spawn?: [number, number] }) {
    this.spawnOverride = data?.spawn;
  }

  create() {
    const kaart = this.cache.json.get('kaart') as KaartData;
    this.kaart = kaart;
    this.wisselt = false;
    this.doel = undefined;
    const [wb, hb] = kaart.wereld;

    this.add.image(0, 0, 'kaart-onder').setOrigin(0).setDepth(-100);
    this.add.image(0, 0, 'kaart-boven').setOrigin(0).setDepth(10000);
    // voorgrond-stroken (balustrades): eigen y-diepte zodat de speler er
    // correct achter of voor kan staan
    for (const vg of kaart.voorgronden ?? []) {
      if (this.textures.exists(`vg-${vg.file}`)) {
        const strip = this.add.image(vg.x, vg.y, `vg-${vg.file}`).setOrigin(0);
        strip.setDepth(vg.y + strip.height);
      }
    }

    this.physics.world.setBounds(0, 0, wb, hb);
    const muren = this.physics.add.staticGroup();
    for (const [x, y, w, h] of kaart.collisions) {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(r, true);
      muren.add(r);
    }

    // ?debug in de URL: botsingsvakken (rood) en deurzones (blauw) tonen
    if (new URLSearchParams(location.search).has('debug')) {
      const g = this.add.graphics().setDepth(20000);
      g.lineStyle(2, 0xff4040, 0.9);
      for (const [x, y, w, h] of kaart.collisions) g.strokeRect(x, y, w, h);
      g.lineStyle(2, 0x40a0ff, 0.9);
      for (const loc of kaart.locaties) {
        const [x, y, w, h] = loc.deur;
        g.strokeRect(x, y, w, h);
      }
    }

    this.labels = [];
    for (const loc of kaart.locaties) {
      const label =
        loc.tafel && typeof loc.tafel === 'number' ? `${loc.naam}  [${loc.tafel}]` : loc.naam;
      const t = this.add
        .text(loc.bordpos[0], loc.bordpos[1] + 8, label, {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#fff8e8',
          backgroundColor: '#5a3d1eee',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5, 0)
        .setDepth(5000)
        .setAlpha(0);
      this.labels.push({ t, x: loc.bordpos[0], y: loc.bordpos[1] });
    }

    const spawn = this.spawnOverride ?? kaart.spawn;
    this.speler = this.physics.add
      .sprite(spawn[0], spawn[1], 'eleanor')
      .setCollideWorldBounds(true);
    this.speler.body!.setSize(26, 18).setOffset(11, 74);
    this.speler.play('eleanor-idle-down');
    this.physics.add.collider(this.speler, muren);

    this.cameras.main.setBounds(0, 0, wb, hb);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.startFollow(this.speler, true, 0.12, 0.12);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    this.melding = this.add
      .text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#fff8e8',
        backgroundColor: '#8a2f2fee',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5, 1)
      .setDepth(12000)
      .setVisible(false);

    // missie-HUD: bordje linksboven met het huidige doel (zoom-gecompenseerd)
    const z = this.cameras.main.zoom;
    const hudX = this.scale.width / 2 + (16 - this.scale.width / 2) / z;
    const hudY = this.scale.height / 2 + (16 - this.scale.height / 2) / z;
    const hud = this.add.container(hudX, hudY).setScrollFactor(0).setDepth(15000).setScale(1 / z);
    const hudPlaat = this.add
      .nineslice(0, 0, 'ui-naamplaat', undefined, 460, 56, 16, 16, 14, 14)
      .setOrigin(0);
    const hudSter = this.add.image(34, 28, 'ui-ster').setScale(0.62);
    this.missieTekst = this.add
      .text(62, 28, '', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#f5edda', fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    hud.add([hudPlaat, hudSter, this.missieTekst]);

    // menu-knop rechtsboven (zelfde zoom-compensatie als het missie-bord)
    const menuX = this.scale.width / 2 + (this.scale.width - 16 - this.scale.width / 2) / z;
    const menuKnop = this.add
      .container(menuX, hudY)
      .setScrollFactor(0)
      .setDepth(15000)
      .setScale(1 / z);
    const menuVlak = this.add
      .nineslice(0, 0, 'ui-knop', undefined, 150, 56, 12, 12, 12, 14)
      .setOrigin(1, 0);
    const menuTekst = this.add
      .text(-75, 24, 'menu', {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#4a3218', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    menuKnop.add([menuVlak, menuTekst]);
    menuKnop.setSize(150, 56);
    menuKnop.setInteractive(
      new Phaser.Geom.Rectangle(-150, 0, 150, 56),
      Phaser.Geom.Rectangle.Contains
    );
    menuKnop.on('pointerdown', (
      _p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('menu'));
    });

    // richtingspijl naar de missie-locatie
    this.pijl = this.add
      .text(0, 0, '➤', { fontSize: '34px', color: '#ffd94a' })
      .setOrigin(0.5)
      .setDepth(15000)
      .setStroke('#5a3d1e', 6)
      .setVisible(false);
    this.werkMissieDoelBij();

    this.dialog = new Dialog(this);
    // verse start: korte intro zodat je weet waar je heen moet
    if (huidigeMissie() === 'thuis' && !this.spawnOverride && !this.registry.get('introGetoond')) {
      this.registry.set('introGetoond', true);
      this.time.delayedCall(400, () => {
        this.dialog.start([
          {
            spreker: 'Eleanor',
            portret: 'portret-eleanor-verrast',
            tekst: 'Wat een mooie dag in Tafeldorp! Ik ga eerst even naar mama, thuis. Daar staat de pijl!',
          },
        ]);
      });
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (keuzeOpen(this)) return;
      if (this.dialog.open) {
        this.dialog.tik();
        return;
      }
      this.doel = new Phaser.Math.Vector2(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !keuzeOpen(this)) this.doel = new Phaser.Math.Vector2(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => (this.doel = undefined));
  }

  private werkMissieDoelBij() {
    if (isBehaald('kerk')) {
      this.missieTekst?.setText('Ticket binnen! Verbeter je records!');
      this.missieDoel = undefined;
      return;
    }
    const missie = huidigeMissie();
    this.missieTekst?.setText(MISSIE_LABEL[missie] ?? missie);
    const loc = this.kaart.locaties.find(
      (l) => l.binnen === missie || l.naam.toLowerCase() === missie
    );
    this.missieDoel = loc
      ? new Phaser.Math.Vector2(loc.deur[0] + loc.deur[2] / 2, loc.deur[1] + loc.deur[3])
      : undefined;
  }

  private toonMelding(tekst: string) {
    if (!this.melding) return;
    this.melding.setText(tekst).setPosition(this.speler.x, this.speler.y - 90).setVisible(true);
    this.meldingTot = this.time.now + 1600;
  }

  update() {
    if (keuzeOpen(this)) {
      this.speler.setVelocity(0);
      return;
    }
    if (this.dialog?.open) {
      this.speler.setVelocity(0);
      this.speler.play(`eleanor-idle-${this.richting}`, true);
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
      if (Math.hypot(dx, dy) > 12) {
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

    for (const l of this.labels) {
      const d = Phaser.Math.Distance.Between(this.speler.x, this.speler.y, l.x, l.y);
      l.t.setAlpha(Phaser.Math.Linear(l.t.alpha, d < 150 ? 1 : 0, 0.2));
    }

    if (this.melding?.visible && this.time.now > this.meldingTot) {
      this.melding.setVisible(false);
    }

    // richtingspijl: cirkelt om Eleanor en wijst naar het missie-doel
    if (this.pijl && this.missieDoel) {
      const afstand = Phaser.Math.Distance.Between(
        this.speler.x, this.speler.y, this.missieDoel.x, this.missieDoel.y
      );
      if (afstand > 350) {
        const hoek = Phaser.Math.Angle.Between(
          this.speler.x, this.speler.y, this.missieDoel.x, this.missieDoel.y
        );
        this.pijl
          .setVisible(true)
          .setPosition(this.speler.x + Math.cos(hoek) * 90, this.speler.y + Math.sin(hoek) * 90)
          .setRotation(hoek);
      } else {
        this.pijl.setVisible(false);
      }
    }

    if (!this.wisselt) {
      const vxp = this.speler.x;
      const vyp = this.speler.y + 40;
      for (const loc of this.kaart.locaties) {
        const buitenId = loc.naam.toLowerCase();
        const isBuitenGame = !loc.binnen && SKINS[buitenId] !== undefined;
        if (!loc.binnen && !isBuitenGame) continue;
        if (loc.binnen && !this.cache.json.exists(`kamer-${loc.binnen}`)) continue;
        const [dx, dy, dw, dh] = loc.deur;
        if (vxp >= dx && vxp <= dx + dw && vyp >= dy && vyp <= dy + dh) {
          const missie = huidigeMissie();
          const id = loc.binnen ?? buitenId;
          const open =
            id === 'thuis' || id === missie || isBehaald(id) || isBehaald('kerk');
          if (!open) {
            if (!this.melding?.visible) {
              const doelNaam = MISSIE_LABEL[missie] ?? missie;
              this.toonMelding(`Eerst deze missie: ${doelNaam.toLowerCase()}!`);
            }
            break;
          }
          this.wisselt = true;
          this.speler.setVelocity(0);
          this.doel = undefined;
          if (loc.binnen) {
            const terug: [number, number] = [dx + dw / 2, dy + dh + 40];
            this.cameras.main.fadeOut(200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('interior', { id: loc.binnen, terug });
            });
          } else if (isBehaald(buitenId)) {
            // behaalde buiten-locatie: tijdrit aanbieden
            const spawn: [number, number] = [dx + dw / 2, dy + dh + 40];
            const tafel = LOCATIE_TAFEL[buitenId];
            const record = besttijd(tafel);
            this.speler.setPosition(spawn[0], spawn[1]);
            toonKeuze(
              this,
              record
                ? `Tijdrit van de tafel van ${tafel}? Jouw record: ${(record / 1000).toFixed(1)} s.`
                : `Tijdrit van de tafel van ${tafel} proberen? 20 sommen, zo snel mogelijk!`,
              'Ja, tijdrit!', 'Straks',
              () => {
                this.cameras.main.fadeOut(200, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                  this.scene.start('tijdrit', {
                    tafel,
                    terug: { scene: 'village', data: { spawn } },
                  });
                });
              },
              () => (this.wisselt = false)
            );
          } else {
            // buiten-minigame (speeltuin, zwembad): intro-dialoog en dan spelen
            const spawn: [number, number] = [dx + dw / 2, dy + dh + 40];
            this.dialog.start(introDialoog(buitenId, LOCATIE_TAFEL[buitenId]), () => {
              this.cameras.main.fadeOut(200, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('minigame', {
                  locatie: buitenId,
                  tafel: LOCATIE_TAFEL[buitenId],
                  invoer: 'mc',
                  terug: { scene: 'village', data: { spawn } },
                });
              });
            });
          }
          break;
        }
      }
    }
  }
}
