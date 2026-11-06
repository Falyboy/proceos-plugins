/**
 * Fabrique un ou plusieurs épisodes de bout en bout : voix horodatées, panneaux, segments animés, montage final,
 * couverture, planche de contrôle (8 images) et texte de l'épisode. Sortie : serie/sortie/<id>/.
 * Relançable : les voix sont en cache (jamais repayées), les fichiers de sortie sont réécrits.
 * Usage : node fabriquer.mjs <id> [<id> ...]   ou   node fabriquer.mjs tous
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PROD, PERSOS, SCENES } from "./config.mjs";
import { voix } from "./outils/voix.mjs";
import { panneau, cases, cadreChoix } from "./outils/panneaux.mjs";
import { fichierAss } from "./outils/soustitres.mjs";
import { segment, assembler } from "./outils/montage.mjs";
import { couverture, bandeau } from "./outils/couverture.mjs";
import { fond } from "./outils/fond.mjs";
import { ecran } from "./outils/ecran.mjs";

// Épisodes : un fichier JSON par épisode dans serie/episodes/ (écrits par le skill « episode »), triés par nom.
const DOS_EP = path.join(PROD, "episodes");
const TOUS = fs.existsSync(DOS_EP) ? fs.readdirSync(DOS_EP).filter((x) => x.endsWith(".json")).sort().map((x) => JSON.parse(fs.readFileSync(path.join(DOS_EP, x), "utf8"))) : [];
const LOG = path.join(PROD, "fabrication.log");
const trace = (m) => { const l = `${new Date().toISOString()} ${m}`; console.log(l); fs.appendFileSync(LOG, l + "\n"); };

async function fabriquer(ep) {
  const dos = path.join(PROD, "sortie", ep.id);
  fs.mkdirSync(dos, { recursive: true });
  trace(`début ${ep.id}`);
  // 1. Voix et minutage. Chaque réplique occupe une plage [debut, debut + duree] ; sa voix démarre à voixA
  //    (0,3 s après le début pour la première, 0,05 s pour les autres) ; 0,3 s de respiration après chaque réplique,
  //    0,9 s après la dernière. Les mots sont horodatés par rapport au début de la plage.
  let t = 0;
  const lignes = [];
  for (const [i, l] of ep.lignes.entries()) {
    const v = await voix(PERSOS[l.q].voix, l.t);
    const avance = i === 0 ? 0.3 : 0.05;
    // Arrondie à l'image (30 par seconde) : les segments vidéo ont un nombre entier d'images, sans quoi l'écart
    // entre image et voix s'accumule d'une réplique à l'autre (0,26 s mesurés en fin d'épisode).
    const duree = Math.round((avance + v.dur + (i === ep.lignes.length - 1 ? 0.9 : 0.3)) * 30) / 30;
    const mots = v.mots.map((m) => ({ ...m, debut: m.debut + avance, fin: m.fin + avance }));
    lignes.push({ ...l, mp3: v.mp3, mots, debut: t, duree, voixA: t + avance });
    t += duree;
  }
  const total = t;
  // 2. Panneaux, bandeau, sous-titres.
  const png = {}, choix = {};
  const app = SCENES[ep.scene].appareil;
  for (const [id, p] of Object.entries(ep.panneaux ?? {})) {
    png[id] = path.join(dos, `panneau-${id}.png`);
    fs.writeFileSync(png[id], await panneau(p, ep.emission, ep.numero, app));
    if (p.choix) {
      const f = path.join(dos, `choix-${id}.png`);
      fs.writeFileSync(f, await cadreChoix(p, app));
      choix[id] = { png: f, positions: cases(p, app), entoure: p.entoure };
    }
  }
  const bd = path.join(dos, "bandeau.png");
  fs.writeFileSync(bd, await bandeau(ep.emission, ep.numero));
  fs.writeFileSync(path.join(dos, "sous-titres.ass"), fichierAss(lignes, ep.scene));
  // 3. Piste de fond (plans en aller-retour), écran vivant si le décor en a un, segments, puis montage final.
  let fondVideo = fond(dos, lignes, ep.scene);
  if (SCENES[ep.scene].ecran) {
    const r = await ecran(dos, lignes, SCENES[ep.scene].ecran, Math.round(total * 30));
    fondVideo = r.sortie;
    trace(`écran ${ep.id} : ${r.images} images, écran introuvable sur ${r.perdues}`);
  }
  lignes.forEach((l, i) => segment(dos, i, l, ep.scene, fondVideo));
  assembler(dos, ep, lignes, total, png, bd, choix);
  // 4. Couverture, planche de contrôle, texte.
  await couverture(dos, ep);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "video.mp4", "-vf", `fps=8/${total.toFixed(2)},scale=270:-1,tile=8x1`, "-frames:v", "1", "controle.jpg"], { cwd: dos });
  fs.writeFileSync(path.join(dos, "texte.txt"), ep.lignes.map((l, i) => `${i + 1}. ${PERSOS[l.q].nom} : ${l.t}`).join("\n"));
  trace(`fin ${ep.id} : ${total.toFixed(1)} s, ${ep.lignes.length} répliques`);
}

const ids = process.argv.slice(2);
const cibles = ids[0] === "tous" ? TOUS : TOUS.filter((e) => ids.includes(e.id));
if (!cibles.length) { console.log("Épisodes disponibles :\n" + TOUS.map((e) => e.id).join("\n")); process.exit(1); }
for (const ep of cibles) {
  try { await fabriquer(ep); } catch (e) { trace(`ÉCHEC ${ep.id} : ${e.message.slice(0, 300)}`); process.exitCode = 1; }
}
