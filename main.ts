// Nusa Seaplane: Island Medicine Run — entry program.
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output. Node 22, standard library only.
//
// The program is deterministic: it walks game/ in sorted path order and
// copies file bytes only, so two runs write the same bytes.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const GAME_DIR = join(REPO_ROOT, 'game');
const SHOTS_DIR = join(REPO_ROOT, 'screenshots');

// The bounty gate's caps (RULES.txt): dossier text at most 160 KiB,
// 3-4 screenshots of at most 256 KiB each, game/ at most 993 files and
// 48 MiB, every game/ path at most 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
} as const;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

/** Every file under dir, as paths relative to dir, in code-unit order. */
function listFilesSorted(dir: string, base = ''): string[] {
  const found: string[] = [];
  const entries = readdirSync(join(dir, base), { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...listFilesSorted(dir, rel));
    } else if (entry.isFile()) {
      found.push(rel);
    } else {
      fail(`game/${rel} is not a plain file or directory`);
    }
  }
  return found;
}

function main(): void {
  if (!existsSync(join(GAME_DIR, 'index.html'))) {
    fail('game/index.html is missing');
  }
  const shots = readdirSync(SHOTS_DIR)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(SHOTS_DIR, name)).size;
    if (size > 262144) fail(`screenshots/${name} is ${size} bytes, over 256 KiB`);
  }

  mkdirSync(join(OUT_DIR, 'game'), { recursive: true });
  mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });

  const gameFiles = listFilesSorted(GAME_DIR);
  for (const rel of gameFiles) {
    const target = join(OUT_DIR, 'game', rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(GAME_DIR, rel), target);
  }
  for (const name of shots) {
    copyFileSync(join(SHOTS_DIR, name), join(OUT_DIR, 'screenshots', name));
  }

  const dossier = buildDossier(REPO_ROOT, DOSSIER_CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

  console.log(
    `wrote ${OUT_DIR}: ${gameFiles.length} game files, ` +
      `${shots.length} screenshots, dossier.json (${dossier.length} bytes)`,
  );
}

main();
