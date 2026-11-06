/**
 * Détoure un acolyte dessiné sur fond blanc uni : seul le blanc relié aux bords devient transparent (remplissage
 * depuis les bords), donc les zones blanches entourées d'un contour (yeux, chaussures) restent. Recadre au plus juste.
 * Usage : node detourer.mjs <entrée.png> <sortie.png>   (ou un dossier d'entrée et un dossier de sortie)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { SHARP } from "./config.mjs";
const sharp = createRequire(SHARP)("sharp");

async function detourer(entree, sortie) {
  const { data, info } = await sharp(entree).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const blanc = (i) => data[i] > 215 && data[i + 1] > 215 && data[i + 2] > 215;
  const vu = new Uint8Array(w * h);
  const pile = [];
  for (let x = 0; x < w; x++) pile.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pile.push(y * w, y * w + w - 1);
  while (pile.length) {
    const p = pile.pop();
    if (vu[p] || !blanc(p * 4)) continue;
    vu[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) pile.push(p - 1);
    if (x < w - 1) pile.push(p + 1);
    if (y > 0) pile.push(p - w);
    if (y < h - 1) pile.push(p + w);
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim().png().toFile(sortie);
  console.log(`détouré : ${path.basename(sortie)}`);
}

const [entree, sortie] = process.argv.slice(2);
if (fs.statSync(entree).isDirectory()) {
  fs.mkdirSync(sortie, { recursive: true });
  for (const f of fs.readdirSync(entree).filter((x) => /\.png$/i.test(x))) await detourer(path.join(entree, f), path.join(sortie, f));
} else await detourer(entree, sortie);
