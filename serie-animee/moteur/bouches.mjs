/**
 * Bibliothèque de bouches (≈ 40 crédits kie.ai par geste de 5 s, mesuré le 2026-11-06 : demander l’accord avant de lancer) : chaque geste d'une scène
 * existe en deux versions strictement alignées, image pour image, à 25 images/s :
 *   <scène>/clips25/<geste>.mp4  bouche telle que générée (fermée), copie à 25 images/s du clip d'origine ;
 *   <scène>/parle/<geste>.mp4    même geste, bouche animée par le lip-sync (payé une seule fois, jamais par épisode).
 * Au montage, la version « parle » n'est montrée que pendant les mots du personnage principal (« parleur » de serie.json) (outils/fond.mjs).
 * 25 images/s : c'est la cadence que rend le lip-sync ; la version fermée est à la même cadence pour que chaque image
 * corresponde. Relançable : un geste déjà présent n'est ni refait ni repayé (kie-lipsync.mjs saute les sorties valides).
 * Usage : node bouches.mjs <décor> [<décor> ...]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SCENES, SCENES_DIR, PERSOS, PARLEUR, PHRASE_BOUCHE } from "./config.mjs";
import { voix } from "./outils/voix.mjs";

const LIPSYNC = path.join(path.dirname(fileURLToPath(import.meta.url)), "kie", "lipsync.mjs");
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
const duree = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));

// Voix continue du personnage principal (silences retirés), assez longue pour couvrir un geste entier.
async function voixContinue(dossier, d) {
  const f = path.join(dossier, `voix-continue-${d.toFixed(2)}.mp3`);
  if (fs.existsSync(f)) return f;
  const v = await voix(PERSOS[PARLEUR].voix, PHRASE_BOUCHE);
  ff(["-i", v.mp3, "-af", "silenceremove=stop_periods=-1:stop_duration=0.08:stop_threshold=-40dB", "-t", d.toFixed(2), "-c:a", "libmp3lame", "-b:a", "192k", f]);
  if (duree(f) < d - 0.05) throw new Error(`voix continue trop courte : ${duree(f).toFixed(2)} s pour ${d.toFixed(2)} s`);
  return f;
}

// Une tâche refusée par kie.ai (« server busy », état « fail », non facturée : solde inchangé constaté le 2026-11-06)
// est retirée pour pouvoir être relancée. Une tâche en cours ou réussie n'est jamais retirée.
function oublierSiRefusee(sortie) {
  const tache = sortie + ".tache", trace = path.join(path.dirname(sortie), "trace.log");
  if (fs.existsSync(sortie) || !fs.existsSync(tache) || !fs.existsSync(trace)) return;
  const id = fs.readFileSync(tache, "utf8").trim();
  // Seul un refus de kie.ai (état « fail ») est oublié. Un échec de téléchargement ou un fichier illisible concerne
  // une génération RÉUSSIE et payée : la tâche est gardée pour reprendre le téléchargement sans repayer (Codex, tour 2).
  const refus = (l) => l.includes("[ÉCHEC") && l.includes(id) && !/téléchargement|illisible/.test(l);
  if (/^[0-9a-f]{16,}$/i.test(id) && fs.readFileSync(trace, "utf8").split("\n").some(refus)) fs.rmSync(tache);
}

function lipsync(video, audio, sortie) {
  oublierSiRefusee(sortie);
  return new Promise((ok) => {
    const p = spawn(process.execPath, [LIPSYNC, video, audio, sortie, "basic"], { stdio: "inherit" });
    p.on("close", (code) => ok({ sortie, code }));
  });
}

for (const scene of process.argv.slice(2)) {
  const dosClips = path.join(SCENES_DIR, SCENES[scene].clips);
  const d25 = path.join(dosClips, "..", "clips25"), dParle = path.join(dosClips, "..", "parle");
  fs.mkdirSync(d25, { recursive: true }); fs.mkdirSync(dParle, { recursive: true });
  const travaux = [];
  for (const f of fs.readdirSync(dosClips).filter((x) => x.endsWith(".mp4"))) {
    const c25 = path.join(d25, f);
    if (!fs.existsSync(c25)) ff(["-i", path.join(dosClips, f), "-vf", "fps=25", "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", c25]);
    travaux.push({ c25, audio: await voixContinue(d25, duree(c25)), sortie: path.join(dParle, f) });
  }
  // Quatre lip-syncs à la fois au plus.
  for (let i = 0; i < travaux.length; i += 4) {
    const res = await Promise.all(travaux.slice(i, i + 4).map((t) => lipsync(t.c25, t.audio, t.sortie)));
    for (const r of res) if (r.code !== 0) { console.log(`ÉCHEC ou attente : ${r.sortie} (code ${r.code})`); process.exitCode = 1; }
  }
  console.log(`${scene} : ${fs.readdirSync(dParle).filter((x) => x.endsWith(".mp4") && !x.includes("partiel")).length}/${travaux.length} gestes avec bouche animée`);
}
