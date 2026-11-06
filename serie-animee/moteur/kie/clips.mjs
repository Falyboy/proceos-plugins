/**
 * Clips animés kie.ai pour la bibliothèque de la série (payant : accord de l’utilisateur avant chaque lancement).
 * Lit une liste de clips (JSON), envoie l’image de départ, lance la génération,
 * attend, télécharge. Payant : saute tout clip déjà présent ; chaque tâche lancée est notée dans taches.json du dossier
 * de sortie pour être récupérée sans être repayée. Solde relevé avant et après, trace datée dans trace.log.
 * Clé : <projet>/.env (KIE_AI_API_KEY), jamais affichée.
 * Usage : node kie/clips.mjs <liste.json>
 *   liste.json : { "sortie": "<dossier>", "clips": [ { "nom", "modele", "image", "fin"?, "consigne", "resolution", "duree" } ] }
 *   modele : seedance-mini | seedance-2-5 | kling-flash
 */
import fs from "node:fs";
import path from "node:path";
import { cle } from "../cle.mjs";

const API = "https://api.kie.ai/api/v1";
const ENVOIS = ["https://kieai.redpandaai.co/api/file-stream-upload", `${API}/file-stream-upload`];
const MODELES = { "seedance-mini": "bytedance/seedance-2-mini", "seedance-2-5": "bytedance/seedance-2-5", "kling-flash": "kling-4.0/flash-keyframe-to-video" };

const liste = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const SORTIE = liste.sortie;
const TACHES = path.join(SORTIE, "taches.json");
const CLE = cle("KIE_AI_API_KEY");
if (!CLE) { console.log("KIE_AI_API_KEY absente, rien envoyé, rien facturé."); process.exit(1); }
fs.mkdirSync(SORTIE, { recursive: true });
// Verrou : un seul lancement à la fois sur un même dossier, sinon chaque clip absent serait payé deux fois.
// Limite connue (relecture Codex du 2026-11-06) : si kie.ai facture une tâche mais que sa réponse se perd avant
// l'écriture de taches.json, une relance la repaie (un clip au plus).
const VERROU = path.join(SORTIE, "lancement.verrou");
try { fs.writeFileSync(VERROU, String(process.pid), { flag: "wx" }); }
catch { console.log(`Un lancement tourne déjà (${VERROU}). Rien lancé. Supprimer ce fichier si aucun lancement n'est en cours.`); process.exit(1); }
process.on("exit", () => fs.rmSync(VERROU, { force: true }));
const tracer = (l) => { console.log(l); fs.appendFileSync(path.join(SORTIE, "trace.log"), `${new Date().toISOString()} ${l}\n`); };
const appel = async (methode, url, corps) => {
  const r = await fetch(url, { method: methode, headers: { Authorization: "Bearer " + CLE, "Content-Type": "application/json" }, ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(60000) });
  const d = await r.json();
  if (d.code !== 200) throw new Error(`${d.code} ${d.msg ?? ""}`.slice(0, 200));
  return d.data;
};
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const lireTaches = () => (fs.existsSync(TACHES) ? JSON.parse(fs.readFileSync(TACHES, "utf8")) : {});
const noterTache = (nom, id) => fs.writeFileSync(TACHES, JSON.stringify({ ...lireTaches(), [nom]: id }, null, 1));

async function envoyer(fichier) {
  const nom = path.basename(fichier);
  for (const url of ENVOIS) {
    const form = new FormData();
    form.append("file", new Blob([fs.readFileSync(fichier)], { type: "image/png" }), nom);
    form.append("uploadPath", "proceos-reels");
    form.append("fileName", nom);
    try {
      const d = await (await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + CLE }, body: form, signal: AbortSignal.timeout(120000) })).json();
      if (d.data?.downloadUrl) return d.data.downloadUrl;
      tracer(`[envoi refusé] ${nom} : ${d.code ?? ""} ${d.msg ?? ""}`.slice(0, 200));
    } catch (e) { tracer(`[envoi en erreur] ${nom} : ${e.message}`.slice(0, 200)); }
  }
  throw new Error(`envoi impossible : ${nom}`);
}

function entree(c, debut, fin) {
  const base = { prompt: c.consigne, first_frame_url: debut, duration: c.duree ?? 5 };
  if (c.modele === "kling-flash") return { ...base, resolution: "720p", aspect_ratio: "9:16" };
  // Seedance 2.5 refuse « 9:16 » avec une image de départ (erreur 422 du 2026-11-06) : « adaptive » suit le format de l'image.
  const format = c.modele === "seedance-2-5" ? "adaptive" : "9:16";
  return { ...base, ...(fin ? { last_frame_url: fin } : {}), resolution: c.resolution ?? "720p", aspect_ratio: format, generate_audio: false };
}

async function produire(c) {
  const cible = path.join(SORTIE, c.nom + ".mp4");
  if (fs.existsSync(cible)) return tracer(`[deja la] ${c.nom}`);
  let id = lireTaches()[c.nom];
  if (!id) {
    const debut = await envoyer(c.image);
    const fin = c.fin ? await envoyer(c.fin) : null;
    ({ taskId: id } = await appel("POST", `${API}/jobs/createTask`, { model: MODELES[c.modele], input: entree(c, debut, fin) }));
    noterTache(c.nom, id);
    tracer(`[lancé  ] ${c.nom} (${c.modele}, ${c.resolution ?? "720p"}, ${c.duree ?? 5} s)`);
  } else tracer(`[reprise] ${c.nom}`);
  for (let i = 0; i < 120; i++) {
    await attendre(10000);
    const d = await appel("GET", `${API}/jobs/recordInfo?taskId=${id}`);
    if (d.state === "success") {
      const url = JSON.parse(d.resultJson).resultUrls[0];
      fs.writeFileSync(cible, Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(300000) })).arrayBuffer()));
      return tracer(`[écrit  ] ${c.nom}.mp4`);
    }
    if (d.state === "fail") throw new Error(`${d.failCode ?? ""} ${d.failMsg ?? "échec"}`);
  }
  throw new Error(`délai dépassé, tâche ${id} à reprendre`);
}

tracer(`Solde avant : ${await appel("GET", `${API}/chat/credit`)} crédits`);
// Quatre générations à la fois au plus (évite le refus « trop de requêtes » de kie.ai sur une longue liste).
for (let i = 0; i < liste.clips.length; i += 4) {
  const lot = liste.clips.slice(i, i + 4);
  const res = await Promise.allSettled(lot.map(produire));
  res.forEach((r, j) => r.status === "rejected" && tracer(`[ÉCHEC  ] ${lot[j].nom} : ${r.reason.message}`));
}
tracer(`Solde après : ${await appel("GET", `${API}/chat/credit`)} crédits`);
