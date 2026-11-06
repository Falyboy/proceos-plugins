/**
 * Lip-sync kie.ai (volcengine/video-to-video-lip-sync, ≈ 4 crédits par seconde d'audio mesurés le 2026-11-06) : la
 * bouche de la vidéo suit l'audio, gestes et cadrage inchangés. Clé : <projet>/.env (KIE_AI_API_KEY), jamais affichée. Payant (≈ 40 crédits par geste de 5 s, mesuré le 2026-11-06) : accord de l’utilisateur avant.
 * Garde-fous contre le double paiement (relecture Codex du 2026-11-06) :
 *  - verrou exclusif par sortie (<sortie>.verrou) : deux lancements simultanés ne créent jamais deux tâches ;
 *  - <sortie>.tache écrit « EN-COURS » AVANT la création, puis l'identifiant : si la réponse se perd, la relance
 *    refuse de recréer (à réconcilier à la main dans l'historique kie.ai) ;
 *  - téléchargement vérifié (HTTP ok, vidéo lisible par ffprobe) dans un fichier temporaire, puis renommé.
 * Codes de sortie : 0 vidéo présente, 1 échec, 2 tâche encore en cours (relancer pour reprendre sans repayer).
 * Usage : node kie/lipsync.mjs <video.mp4> <voix.mp3|wav> <sortie.mp4> [lite|basic]
 */
import fs from "node:fs";
import path from "node:path";
import { cle } from "../cle.mjs";
import { spawnSync } from "node:child_process";

const API = "https://api.kie.ai/api/v1";
const ENVOIS = ["https://kieai.redpandaai.co/api/file-stream-upload", `${API}/file-stream-upload`];
const TYPES = { ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav" };

const [video, audio, sortie, mode = "basic"] = process.argv.slice(2);
if (!sortie) { console.log("Usage : node kie/lipsync.mjs <video.mp4> <voix.mp3> <sortie.mp4> [lite|basic]"); process.exit(1); }
const tracer = (l) => { console.log(l); fs.appendFileSync(path.join(path.dirname(sortie), "trace.log"), `${new Date().toISOString()} ${l}\n`); };
// Valide = durée lisible et décodage intégral sans erreur (un MP4 tronqué passe ffprobe mais pas le décodage).
const videoValide = (f) => {
  if (!fs.existsSync(f) || fs.statSync(f).size < 10000) return false;
  const d = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout);
  if (!(d > 0.5)) return false;
  const dec = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-f", "null", "-"], { encoding: "utf8" });
  return dec.status === 0 && !dec.stderr.trim();
};
const ecrireAtomique = (f, txt) => { fs.writeFileSync(f + ".tmp", txt); fs.renameSync(f + ".tmp", f); };

if (videoValide(sortie)) { tracer(`[deja la] ${path.basename(sortie)}`); process.exit(0); }
const VERROU = sortie + ".verrou", TACHE = sortie + ".tache";
// Verrou exclusif ; un verrou laissé par un processus mort (arrêt forcé) est repris, la tâche notée est conservée.
const vivant = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
try { fs.writeFileSync(VERROU, String(process.pid), { flag: "wx" }); }
catch {
  const pid = Number(fs.readFileSync(VERROU, "utf8"));
  if (pid && vivant(pid)) { console.log(`Déjà en cours pour ${path.basename(sortie)} (processus ${pid}). Rien lancé.`); process.exit(2); }
  ecrireAtomique(VERROU, String(process.pid));
}
process.on("exit", () => fs.rmSync(VERROU, { force: true }));

const CLE = cle("KIE_AI_API_KEY");
if (!CLE) { console.log("KIE_AI_API_KEY absente, rien envoyé, rien facturé."); process.exit(1); }
const appel = async (methode, url, corps) => {
  const r = await fetch(url, { method: methode, headers: { Authorization: "Bearer " + CLE, "Content-Type": "application/json" }, ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(60000) });
  const d = await r.json();
  if (d.code !== 200) throw new Error(`${d.code} ${d.msg ?? ""}`.slice(0, 200));
  return d.data;
};

async function envoyer(fichier) {
  const nom = path.basename(fichier);
  for (const url of ENVOIS) {
    const form = new FormData();
    form.append("file", new Blob([fs.readFileSync(fichier)], { type: TYPES[path.extname(fichier)] ?? "application/octet-stream" }), nom);
    form.append("uploadPath", "proceos-reels");
    form.append("fileName", nom);
    try {
      const d = await (await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + CLE }, body: form, signal: AbortSignal.timeout(300000) })).json();
      if (d.data?.downloadUrl) return d.data.downloadUrl;
      tracer(`[envoi refusé] ${nom} : ${d.code ?? ""} ${d.msg ?? ""}`.slice(0, 200));
    } catch (e) { tracer(`[envoi en erreur] ${nom} : ${e.message}`.slice(0, 200)); }
  }
  throw new Error(`envoi impossible : ${nom}`);
}

let id = fs.existsSync(TACHE) ? fs.readFileSync(TACHE, "utf8").trim() : "";
if (fs.existsSync(TACHE) && !/^[0-9a-f]{16,}$/i.test(id) && id !== "EN-COURS") id = "EN-COURS"; // vide ou illisible : on bloque
if (id === "EN-COURS") { tracer(`[BLOQUÉ ] ${path.basename(sortie)} : une création a pu être facturée sans réponse. Vérifier l'historique kie.ai, puis écrire l'identifiant dans ${path.basename(TACHE)} ou supprimer ce fichier.`); process.exit(1); }
tracer(`Solde avant : ${await appel("GET", `${API}/chat/credit`)} crédits`);
if (!id) {
  const v = await envoyer(video), a = await envoyer(audio);
  ecrireAtomique(TACHE, "EN-COURS");
  ({ taskId: id } = await appel("POST", `${API}/jobs/createTask`, { model: "volcengine/video-to-video-lip-sync", input: { mode, video_url: v, audio_url: a, separate_vocal: false, open_scenedet: false, ...(mode === "lite" ? { align_audio: true } : {}) } }));
  ecrireAtomique(TACHE, id);
  tracer(`[lancé  ] ${path.basename(sortie)} (${mode}, tâche ${id})`);
} else tracer(`[reprise] ${path.basename(sortie)} (tâche ${id})`);

let code = 2;
for (let i = 0; i < 180 && code === 2; i++) {
  await new Promise((r) => setTimeout(r, 10000));
  const d = await appel("GET", `${API}/jobs/recordInfo?taskId=${id}`);
  if (d.state === "success") {
    const url = JSON.parse(d.resultJson).resultUrls[0];
    const r = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!r.ok) { tracer(`[ÉCHEC  ] téléchargement HTTP ${r.status} (tâche ${id}, relancer pour réessayer)`); code = 1; break; }
    const tmp = sortie + ".partiel.mp4";
    fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    if (!videoValide(tmp)) { tracer(`[ÉCHEC  ] fichier reçu illisible (tâche ${id})`); fs.rmSync(tmp, { force: true }); code = 1; break; }
    fs.renameSync(tmp, sortie);
    tracer(`[écrit  ] ${path.basename(sortie)}`);
    code = 0;
  } else if (d.state === "fail") { tracer(`[ÉCHEC  ] ${d.failCode ?? ""} ${d.failMsg ?? ""} (tâche ${id})`); code = 1; }
}
if (code === 2) tracer(`[attente] ${path.basename(sortie)} toujours en cours (tâche ${id}) : relancer pour reprendre sans repayer`);
tracer(`Solde après : ${await appel("GET", `${API}/chat/credit`)} crédits`);
process.exitCode = code;
