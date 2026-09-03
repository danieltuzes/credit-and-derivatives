// Copy the files tsup does not build into `dist/`, preserving the tree:
//   - `.mjs` remark / rehype adapters (hand-written ESM, imported by the
//     compiled core through relative `./x.mjs` specifiers and by the course's
//     `astro.config.mjs`)
// `.astro`, `.tsx`, `.css`, and `content-config.ts` are published from `src/`
// (see `package.json` `publishConfig.exports`), so they are not copied here.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(pkgRoot, 'src');
const distRoot = join(pkgRoot, 'dist');

/** @param {string} dir @param {RegExp} match */
function* walk(dir, match) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path, match);
    else if (entry.isFile() && match.test(entry.name)) yield path;
  }
}

let count = 0;
for (const file of walk(srcRoot, /\.mjs$/)) {
  const target = join(distRoot, relative(srcRoot, file));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(file, target);
  count += 1;
}
console.log(`copy-assets: ${count} .mjs file(s) -> dist/`);
