// Kopieert de benodigde familie-assets naar public/assets/familie/.
// Kopiëren i.p.v. linken zodat de build self-contained is en de tablet de
// bibliotheek niet nodig heeft. Bron is ../familie-assets (single source of
// truth); aanpassingen aan de gezinsleden gebeuren altijd dáár, nooit hier.
//
// Tafeldorp gebruikt:
//  - class 3: LimeZu-detailsprites 48px  (sprites8/<naam>/sheet_48.png)
//  - class 2: dialoogportretten 128px    (portraits/<naam>/*.png)
import { cpSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LIB = join(dirname(ROOT), 'familie-assets');
const DEST = join(ROOT, 'public', 'assets', 'familie');

const CHARACTERS = ['eleanor', 'ward', 'stephan', 'marjolein'];
// rol-varianten (ander hoedje, zelfde persoon): alleen een sheet, portret komt
// van het basis-gezinslid
const ROLLEN = [
  'stephan-bakker', 'stephan-molenaar', 'stephan-coach',
  'marjolein-juf', 'marjolein-bieb', 'ward-boer',
];

if (!existsSync(LIB)) {
  console.error(`Bibliotheek niet gevonden: ${LIB}`);
  process.exit(1);
}

let copied = 0;

for (const name of ROLLEN) {
  const sheet = join(LIB, 'sprites8', name, 'sheet_48.png');
  if (existsSync(sheet)) {
    const to = join(DEST, 'sprites8', name, 'sheet_48.png');
    mkdirSync(dirname(to), { recursive: true });
    cpSync(sheet, to);
    copied++;
  } else {
    console.warn(`Geen sheet_48.png voor ${name}`);
  }
}

for (const name of CHARACTERS) {
  const sheet = join(LIB, 'sprites8', name, 'sheet_48.png');
  if (existsSync(sheet)) {
    const to = join(DEST, 'sprites8', name, 'sheet_48.png');
    mkdirSync(dirname(to), { recursive: true });
    cpSync(sheet, to);
    copied++;
  } else {
    console.warn(`Geen sheet_48.png voor ${name}`);
  }

  const portraitDir = join(LIB, 'portraits', name);
  if (existsSync(portraitDir)) {
    for (const file of readdirSync(portraitDir).filter(
      (f) => f.endsWith('.png') && f !== 'sheet.png'
    )) {
      const to = join(DEST, 'portraits', name, file);
      mkdirSync(dirname(to), { recursive: true });
      cpSync(join(portraitDir, file), to);
      copied++;
    }
  } else {
    console.warn(`Geen portretten voor ${name}`);
  }
}

console.log(`${copied} bestanden gekopieerd naar ${DEST}`);
