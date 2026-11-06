/**
 * Fait vivre l'écran du décor : la conversation s'y écrit mot à mot, au rythme des voix.
 * L'écran bouge avec les zooms des clips : il est retrouvé à chaque image par sa couleur crème (remplissage depuis
 * un point de départ suivi d'une image à l'autre). Seuls les pixels crème sont repeints : la tête du personnage, quand
 * elle passe devant, reste devant. Entrée : <dos>/fond.mp4 ; sortie : <dos>/fond-ecran.mp4.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { SHARP, PERSOS, PARLEUR } from "../config.mjs";
const sharp = createRequire(SHARP)("sharp");

const W = 1080, H = 1920, IPS = 30, PAS = 4;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Bulles : le personnage principal à droite (orange), les autres à gauche (clair).
const bulle = (q) => (q === PARLEUR ? ["#FF6500", "#FFFFFF"] : ["#EEE8DE", "#2B2B2B"]);

function couper(txt, max) {
  const res = []; let l = "";
  for (const m of txt.split(/ +/)) { if ((l + " " + m).trim().length > max) { if (l) res.push(l); l = m; } else l = (l + " " + m).trim(); }
  if (l) res.push(l);
  return res;
}

// Image de l'application de discussion (CW x CH) : les dernières bulles, la plus récente en bas.
async function etat(bulles, CW, CH) {
  const t = 24, lh = 30, pad = 14;
  let y = CH - 12, corps = "";
  for (const b of [...bulles].reverse()) {
    const lignes = couper(b.txt, 30);
    const bh = lignes.length * lh + (b.q === PARLEUR ? 18 : 40);
    y -= bh + 10;
    if (y < 44) break;
    const [fondB, encre] = bulle(b.q);
    const bw = Math.min(CW - 90, Math.max(...lignes.map((l) => l.length)) * t * 0.52 + 2 * pad);
    const x = b.q === PARLEUR ? CW - bw - 16 : 16;
    corps += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="16" fill="${fondB}"/>`;
    let ty = y + (b.q === PARLEUR ? 30 : 52);
    if (b.q !== PARLEUR) corps += `<text x="${x + pad}" y="${y + 22}" font-family="Segoe UI, Arial" font-size="15" font-weight="800" fill="${encre}" opacity=".7">${esc(PERSOS[b.q].nom)}</text>`;
    for (const l of lignes) { corps += `<text x="${x + pad}" y="${ty}" font-family="Segoe UI, Arial" font-size="${t}" fill="${encre}">${esc(l)}</text>`; ty += lh; }
  }
  const svg = `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="${CW}" height="${CH}" fill="#FFFDF8"/>
    <rect width="${CW}" height="38" fill="#F1ECE3"/><text x="16" y="26" font-family="Segoe UI, Arial" font-size="17" font-weight="700" fill="#6B5E50">Discussion</text>${corps}</svg>`;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

// Les états successifs de l'écran : un par mot prononcé (tous les personnages de la série).
async function etats(lignes, CW, CH) {
  const res = [{ t: 0, img: await etat([], CW, CH) }];
  const faites = [];
  for (const l of lignes) {
    if (!PERSOS[l.q]) continue;
    for (let k = 0; k < l.mots.length; k++) {
      const txt = l.mots.slice(0, k + 1).map((m) => m.mot).join(" ");
      res.push({ t: l.debut + l.mots[k].debut, img: await etat([...faites, { q: l.q, txt }], CW, CH) });
    }
    faites.push({ q: l.q, txt: l.mots.map((m) => m.mot).join(" ") });
  }
  return res;
}

// Pixel de l'écran ? (couleur crème du décor, tolérance pour la compression)
const creme = (b, i, c) => Math.abs(b[i] - c[0]) < 14 && Math.abs(b[i + 1] - c[1]) < 16 && Math.abs(b[i + 2] - c[2]) < 24;

// Remplissage sur une grille réduite (pas de 4 px) depuis un point de départ : boîte de la zone crème connexe.
function boite(f, depart, c) {
  const gw = W / PAS, gh = H / PAS, vu = new Uint8Array(gw * gh);
  const ok = (gx, gy) => gx >= 0 && gy >= 0 && gx < gw && gy < gh && creme(f, (gy * PAS * W + gx * PAS) * 3, c);
  let [sx, sy] = [Math.round(depart[0] / PAS), Math.round(depart[1] / PAS)];
  // Si le point de départ n'est plus crème (zoom), on cherche autour.
  if (!ok(sx, sy)) {
    let trouve = false;
    for (let r = 1; r < 70 && !trouve; r++) for (let dy = -r; dy <= r && !trouve; dy++) for (let dx = -r; dx <= r; dx++) if (ok(sx + dx, sy + dy)) { sx += dx; sy += dy; trouve = true; break; }
    if (!trouve) return null;
  }
  const pile = [[sx, sy]]; vu[sy * gw + sx] = 1;
  let x0 = sx, x1 = sx, y0 = sy, y1 = sy, n = 0;
  while (pile.length) {
    const [x, y] = pile.pop(); n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = ny * gw + nx;
      if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !vu[k] && ok(nx, ny)) { vu[k] = 1; pile.push([nx, ny]); }
    }
  }
  if (n < 200) return null;
  // Couleur moyenne de la zone trouvée : sert de référence pour l'image suivante (le ton dérive un peu dans un clip).
  const moy = [0, 0, 0]; let m = 0;
  for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) if (vu[y * gw + x]) { const i = (y * PAS * W + x * PAS) * 3; moy[0] += f[i]; moy[1] += f[i + 1]; moy[2] += f[i + 2]; m++; }
  return { x0: x0 * PAS, y0: y0 * PAS, x1: x1 * PAS + PAS - 1, y1: y1 * PAS + PAS - 1, couleur: moy.map((v) => Math.round(v / m)) };
}

export async function ecran(dos, lignes, config, attendues) {
  let c = config.couleur;
  const entree = path.join(dos, "fond.mp4"), sortie = path.join(dos, "fond-ecran.mp4");
  // Journaux d'erreur de ffmpeg vers la console : un tube jamais lu finirait par bloquer le processus.
  const dec = spawn("ffmpeg", ["-v", "error", "-i", entree, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { stdio: ["ignore", "pipe", "inherit"] });
  const enc = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(IPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", sortie], { stdio: ["pipe", "ignore", "inherit"] });
  const fini = new Promise((ok, ko) => enc.on("close", (code) => (code ? ko(new Error(`encodage écran : code ${code}`)) : ok())));
  const decode = new Promise((ok) => dec.on("close", ok));
  const T = W * H * 3;
  let tampon = Buffer.alloc(0), image = 0, depart = config.depart, ratio = null, liste = null, CW = 0, CH = 0, iEtat = 0, perdues = 0;
  for await (const morceau of dec.stdout) {
    tampon = tampon.length ? Buffer.concat([tampon, morceau]) : morceau;
    while (tampon.length >= T) {
      const f = Buffer.from(tampon.subarray(0, T));
      tampon = tampon.subarray(T);
      const b = boite(f, depart, c);
      if (b) {
        if (!ratio) { ratio = (b.x1 - b.x0) / (b.y1 - b.y0); CW = 640; CH = Math.round(640 / ratio); liste = await etats(lignes, CW, CH); }
        // Largeur mesurée ; hauteur déduite du rapport de l'image de départ (le bas peut être caché par le personnage).
        const w = b.x1 - b.x0 + 1, h = Math.round(w / ratio);
        const t = image / IPS;
        while (iEtat + 1 < liste.length && liste[iEtat + 1].t <= t) iEtat++;
        const img = liste[iEtat].img;
        for (let y = b.y0; y < Math.min(H, b.y0 + h); y++) {
          const sy = Math.min(CH - 1, Math.floor(((y - b.y0) / h) * CH));
          for (let x = b.x0; x <= b.x1; x++) {
            const i = (y * W + x) * 3;
            if (!creme(f, i, c)) continue;
            const j = (sy * CW + Math.min(CW - 1, Math.floor(((x - b.x0) / w) * CW))) * 3;
            f[i] = img[j]; f[i + 1] = img[j + 1]; f[i + 2] = img[j + 2];
          }
        }
        depart = [(b.x0 + b.x1) / 2, b.y0 + h * 0.25];
        c = b.couleur;
      } else { perdues++; c = config.couleur; } // on garde le dernier point connu : l'écran n'a pas pu aller loin
      if (!enc.stdin.write(f)) await new Promise((r) => enc.stdin.once("drain", r));
      image++;
    }
  }
  enc.stdin.end();
  const codeDec = await decode;
  await fini;
  if (codeDec !== 0 || tampon.length || image !== attendues) throw new Error(`écran : décodage ${codeDec}, ${image} images sur ${attendues}, reliquat ${tampon.length}`);
  return { sortie, images: image, perdues };
}
