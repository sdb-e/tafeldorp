import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { VillageScene } from '@/scenes/VillageScene';
import { InteriorScene } from '@/scenes/InteriorScene';
import { MinigameScene } from '@/scenes/MinigameScene';
import { BattleScene } from '@/scenes/BattleScene';
import { TijdritScene } from '@/scenes/TijdritScene';
import { FinaleScene } from '@/scenes/FinaleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 800,
  },
  physics: {
    default: 'arcade',
  },
  scene: [BootScene, MenuScene, VillageScene, InteriorScene, MinigameScene, BattleScene, TijdritScene, FinaleScene],
});

// Debug-handvat voor dev tools; doet in productie geen kwaad.
(window as unknown as { game: Phaser.Game }).game = game;
