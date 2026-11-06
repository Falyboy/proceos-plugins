/**
 * Couverture d'un épisode (1080 x 1920, essentiel dans le rectangle central 3:4) et bandeau de l'émission affiché
 * pendant la dernière réplique. Mise en page de la bible : bandeau coloré + numéro, titre en deux lignes.
 */
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { SHARP, EMISSIONS, SCENES, SCENES_DIR } from "../config.mjs";
const sharp = createRequire(SHARP)("sharp");

const F = "Segoe UI, Arial, sans-serif";
// Texte noir sur une couleur d'émission claire, blanc sur une foncée (luminance perçue).
const clair = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function bandeau(emission, numero) {
  const em = EMISSIONS[emission];
  const t = `${em.nom} · ÉP. ${numero}`;
  const w = t.length * 21 + 70;
  const svg = `<svg width="1080" height="120" xmlns="http://www.w3.org/2000/svg"><rect x="${540 - w / 2}" y="20" width="${w}" height="66" rx="33" fill="${em.couleur}" stroke="#0A0A0A" stroke-width="4"/><text x="540" y="64" text-anchor="middle" font-family="${F}" font-size="32" font-weight="800" fill="${emission === "m" ? "#FFFFFF" : "#0A0A0A"}" letter-spacing="2">${esc(t)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function couverture(dos, ep) {
  const sc = SCENES[ep.scene];
  const img = path.join(dos, "_image-couverture.png");
  // La grille du profil montre le rectangle central 3:4 (y 240 à 1680) : l'image descend de 240 px pour que les
  // visages, souvent en haut du plan, y restent. Le haut libéré reçoit la même image floutée.
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(ep.couverture.t), "-i", path.join(SCENES_DIR, sc.clips, `${ep.couverture.clip}.mp4`), "-frames:v", "1", "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,split[a][b];[a]boxblur=24[f];[f][b]overlay=0:240", img]);
  const em = EMISSIONS[ep.emission];
  const bandeauTxt = `${em.nom} · ÉP. ${ep.numero}`;
  const [l1, l2] = ep.titre;
  // Largeur utile 960 px ; un caractère gras de cette police occupe environ 0,6 fois la taille.
  const taille = (s) => Math.min(112, Math.floor(960 / (s.length * 0.6)));
  // Bloc titre en bas du carré 3:4, ou en haut quand les visages sont au milieu du plan (bureau, coworking).
  const haut = sc.titreCouv === "haut";
  const yb = haut ? 440 : 1160, y1 = yb + 190, y2 = y1 + taille(l2) + 20;
  const degrade = haut
    ? `<stop offset="0.12" stop-color="#000" stop-opacity=".8"/><stop offset="0.42" stop-color="#000" stop-opacity="0"/>`
    : `<stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity=".8"/>`;
  const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${degrade}</linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#g)"/>
    <rect x="60" y="${yb}" width="${bandeauTxt.length * 25 + 60}" height="76" rx="14" fill="${em.couleur}"/>
    <text x="90" y="${yb + 52}" font-family="${F}" font-size="40" font-weight="800" fill="${clair(em.couleur) ? "#0A0A0A" : "#FFFFFF"}" letter-spacing="2">${esc(bandeauTxt)}</text>
    <text x="60" y="${y1}" font-family="${F}" font-size="${taille(l1)}" font-weight="900" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="10" paint-order="stroke">${esc(l1)}</text>
    <text x="60" y="${y2}" font-family="${F}" font-size="${taille(l2)}" font-weight="900" fill="${em.couleur}" stroke="#0A0A0A" stroke-width="10" paint-order="stroke">${esc(l2)}</text>
  </svg>`;
  const sortie = path.join(dos, "couverture.jpg");
  await sharp(img).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).jpeg({ quality: 90 }).toFile(sortie);
  return sortie;
}
