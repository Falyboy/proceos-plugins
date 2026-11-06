/**
 * Images de la série par kie.ai (option « kie » du choix d'images) : personnages, décors, poses.
 *  - sans référence : google/nano-banana (texte vers image) ;
 *  - avec références (fiches personnages, décor de base) : google/nano-banana-edit, pour garder les mêmes traits.
 * Doc kie.ai lue le 2026-11-06. Payant : saute une image déjà présente, note chaque tâche dans taches.json du dossier de
 * sortie (reprise sans repayer), verrou contre deux lancements, solde avant/après dans trace.log.
 * Clé : <projet>/.env (KIE_AI_API_KEY), jamais affichée.
 * Usage : node images.mjs <liste.json>
 *   liste.json : { "sortie": "<dossier>", "images": [ { "nom", "consigne", "references"?: [chemins], "format"?: "9:16" } ] }
 */
import fs from "node:fs";
import path from "node:path";
import { cle } from "../cle.mjs";

const API = "https://api.kie.ai/api/v1";
const ENVOIS = ["https://kieai.redpandaai.co/api/file-stream-upload", `${API}/file-stream-upload`];
const liste = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const SORTIE = path.resolve(path.dirname(process.argv[2]), liste.sortie);
const TACHES = path.join(SORTIE, "taches.json");
const CLE = cle("KIE_AI_API_KEY");
if (!CLE) { console.log("KIE_AI_API_KEY absente du .env du projet : rien envoyé, rien facturé."); process.exit(1); }
fs.mkdirSync(SORTIE, { recursive: true });
const VERROU = path.join(SORTIE, "lancement.verrou");
try { fs.writeFileSync(VERROU, String(process.pid), { flag: "wx" }); }
catch { console.log(`Un lancement tourne déjà (${VERROU}). Rien lancé. Si aucun ne tourne (arrêt brutal), supprimer ce fichier puis relancer.`); process.exit(1); }
process.on("exit", () => fs.rmSync(VERROU, { force: true }));
const tracer = (l) => { console.log(l); fs.appendFileSync(path.join(SORTIE, "trace.log"), `${new Date().toISOString()} ${l}\n`); };
const appel = async (methode, url, corps) => {
  const r = await fetch(url, { method: methode, headers: { Authorization: "Bearer " + CLE, "Content-Type": "application/json" }, ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(60000) });
  const d = await r.json();
  if (d.code !== 200) throw new Error(`${d.code} ${d.msg ?? ""}`.slice(0, 200));
  return d.data;
};
const lireTaches = () => (fs.existsSync(TACHES) ? JSON.parse(fs.readFileSync(TACHES, "utf8")) : {});
const noterTache = (nom, id) => fs.writeFileSync(TACHES, JSON.stringify({ ...lireTaches(), [nom]: id }, null, 1));

async function envoyer(fichier) {
  const nom = path.basename(fichier);
  const type = /\.jpe?g$/i.test(nom) ? "image/jpeg" : "image/png";
  for (const url of ENVOIS) {
    const form = new FormData();
    form.append("file", new Blob([fs.readFileSync(fichier)], { type }), nom);
    form.append("uploadPath", "serie-animee");
    form.append("fileName", nom);
    try {
      const d = await (await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + CLE }, body: form, signal: AbortSignal.timeout(120000) })).json();
      if (d.data?.downloadUrl) return d.data.downloadUrl;
    } catch {}
  }
  throw new Error(`envoi impossible : ${nom}`);
}

async function produire(im) {
  const cible = path.join(SORTIE, `${im.nom}.png`);
  if (fs.existsSync(cible)) return tracer(`[deja la] ${im.nom}`);
  let id = lireTaches()[im.nom];
  if (!id) {
    const refs = [];
    for (const r of im.references ?? []) refs.push(await envoyer(path.resolve(path.dirname(process.argv[2]), r)));
    const input = { prompt: im.consigne, output_format: "png", aspect_ratio: im.format ?? "9:16", ...(refs.length ? { image_urls: refs } : {}) };
    noterTache(im.nom, "EN-COURS");
    ({ taskId: id } = await appel("POST", `${API}/jobs/createTask`, { model: refs.length ? "google/nano-banana-edit" : "google/nano-banana", input }));
    noterTache(im.nom, id);
    tracer(`[lancé  ] ${im.nom} (${refs.length} référence(s))`);
  } else if (id === "EN-COURS") return tracer(`[BLOQUÉ ] ${im.nom} : création peut-être facturée sans réponse ; vérifier l'historique kie.ai puis corriger taches.json`);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const d = await appel("GET", `${API}/jobs/recordInfo?taskId=${id}`);
    if (d.state === "success") {
      const r = await fetch(JSON.parse(d.resultJson).resultUrls[0], { signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error(`téléchargement HTTP ${r.status}`);
      fs.writeFileSync(cible, Buffer.from(await r.arrayBuffer()));
      return tracer(`[écrit  ] ${im.nom}.png`);
    }
    if (d.state === "fail") throw new Error(`${d.failCode ?? ""} ${d.failMsg ?? "échec"}`);
  }
  throw new Error(`délai dépassé, tâche ${id} à reprendre`);
}

tracer(`Solde avant : ${await appel("GET", `${API}/chat/credit`)} crédits`);
for (let i = 0; i < liste.images.length; i += 4) {
  const lot = liste.images.slice(i, i + 4);
  const res = await Promise.allSettled(lot.map(produire));
  res.forEach((r, j) => { if (r.status === "rejected") { tracer(`[ÉCHEC  ] ${lot[j].nom} : ${r.reason.message}`); process.exitCode = 1; } });
}
tracer(`Solde après : ${await appel("GET", `${API}/chat/credit`)} crédits`);
