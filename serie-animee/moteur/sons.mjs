/**
 * Sons de la série par le générateur d'effets sonores d'ElevenLabs (clé de l'utilisateur, <projet>/.env
 * ELEVENLABS_API_KEY, jamais affichée) : bruitages courants + une ambiance par décor (décrite dans serie.json,
 * champ decors.<décor>.ambianceConsigne). Fichiers dans serie/sons/ ; un son déjà présent n'est pas refait.
 * Usage : node sons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { REELS } from "./config.mjs";
import { cle } from "./cle.mjs";

const CLE = cle("ELEVENLABS_API_KEY");
if (!CLE) { console.log("ELEVENLABS_API_KEY absente du .env du projet"); process.exit(1); }
const S = JSON.parse(fs.readFileSync(path.join(REELS, "serie.json"), "utf8"));
const DOS = path.join(REELS, "sons");
fs.mkdirSync(DOS, { recursive: true });

const SONS = [
  ["pop", "short cute cartoon pop sound, a small character appearing", 0.6],
  ["ding", "short pleasant bright notification ding, success", 1],
  ["erreur", "short soft cartoon error buzz, wrong answer, not harsh", 0.8],
  ["boing", "short cartoon bounce boing, light and cute", 0.8],
  ["badum", "short drum rimshot ba dum tss after a joke", 1.2],
  ["criquets", "awkward silence with crickets chirping, short comedic", 2],
  ["gloups", "short cartoon gulp swallow, embarrassed", 0.8],
  ["whoosh", "soft quick whoosh, a panel sliding in", 0.6],
  ["tada", "short cheerful cartoon ta-da fanfare", 1.5],
  ["idee", "short bright magical sparkle, a light bulb idea", 1],
  ["notif", "soft phone notification chime", 0.8],
  ...Object.entries(S.decors).map(([k, d]) => [`ambiance-${k}`, d.ambianceConsigne ?? "calm room tone, very soft, no music, no voices", 15]),
];

for (const [nom, texte, duree] of SONS) {
  const f = path.join(DOS, `${nom}.mp3`);
  if (fs.existsSync(f)) { console.log(`[déjà là] ${nom}`); continue; }
  const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST", headers: { "xi-api-key": CLE, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texte, duration_seconds: duree, prompt_influence: 0.5 }), signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) { console.log(`[refusé] ${nom} : ${r.status} ${(await r.text()).slice(0, 120)}`); process.exitCode = 1; continue; }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  console.log(`[écrit] ${nom}.mp3`);
}
