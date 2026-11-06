/**
 * Vérifie l'installation : Node 20+, ffmpeg et ffprobe, sharp (dans SERIE_DATA), Codex si l'option d'images
 * « chatgpt » est choisie, et les clés du projet (testées en lecture : solde kie.ai, compte ElevenLabs).
 * Aucune valeur de clé affichée. Usage : node verifier.mjs [kie|chatgpt]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cle, PROJET } from "./cle.mjs";

const choixImages = process.argv[2] ?? "kie";
const ok = (b) => (b ? "OK" : "À FAIRE");
const cmd = (c, a) => { const r = spawnSync(c, a, { encoding: "utf8", shell: process.platform === "win32" }); return r.status === 0 ? (r.stdout || r.stderr).split("\n")[0].trim() : ""; };
let manque = 0;
const ligne = (nom, bon, detail) => { if (!bon) manque++; console.log(`${ok(bon).padEnd(8)} ${nom}${detail ? " — " + detail : ""}`); };

const v = Number(process.versions.node.split(".")[0]);
ligne("Node.js 20 ou plus", v >= 20, `version ${process.versions.node}`);
const ff = cmd("ffmpeg", ["-version"]);
ligne("ffmpeg", Boolean(ff), ff ? ff.slice(0, 40) : "à installer (https://ffmpeg.org, ou winget install Gyan.FFmpeg sous Windows)");
ligne("ffprobe", Boolean(cmd("ffprobe", ["-version"])), "");
const data = process.env.SERIE_DATA ?? "";
ligne("bibliothèque d'images sharp", Boolean(data) && fs.existsSync(path.join(data, "node_modules", "sharp")), data ? "" : "SERIE_DATA non transmis");
if (choixImages === "chatgpt") ligne("Codex (images par l'abonnement ChatGPT)", Boolean(cmd("codex", ["--version"])), "npm install -g @openai/codex, puis codex login");

ligne("fichier .env du projet", fs.existsSync(path.join(PROJET, ".env")), path.join(PROJET, ".env"));
const kie = cle("KIE_AI_API_KEY");
if (kie) {
  const d = await (await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: { Authorization: "Bearer " + kie } })).json().catch(() => ({}));
  ligne("clé kie.ai", d.code === 200, d.code === 200 ? `${d.data} crédits` : `refusée (${d.code ?? "réseau"})`);
} else ligne("clé kie.ai", false, "KIE_AI_API_KEY vide dans .env (https://kie.ai → API Key)");
const el = cle("ELEVENLABS_API_KEY");
if (el) {
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": el } }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  ligne("clé ElevenLabs", Boolean(r?.ok), r?.ok ? `forfait ${d.tier ?? "?"}, ${d.character_count ?? "?"}/${d.character_limit ?? "?"} caractères utilisés` : `refusée (${r?.status ?? "réseau"})`);
} else ligne("clé ElevenLabs", false, "ELEVENLABS_API_KEY vide dans .env (elevenlabs.io → Profile → API Keys)");
console.log(manque ? `\n${manque} point(s) à régler avant de commencer.` : "\nTout est prêt.");
process.exitCode = manque ? 1 : 0;
