/**
 * Voix d'une réplique par ElevenLabs avec l'horodatage de chaque caractère (pour les sous-titres mot à mot).
 * Cache : une réplique déjà produite (même voix, même texte) n'est jamais repayée.
 * Clé lue dans <projet>/.env (ELEVENLABS_API_KEY), jamais affichée.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PROD, cle } from "../config.mjs";

const CACHE = path.join(PROD, "cache-voix");
fs.mkdirSync(CACHE, { recursive: true });
const CLE = cle("ELEVENLABS_API_KEY");

// Découpe l'alignement par caractère en mots horodatés.
export function mots(al) {
  const res = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { res.push(cur); cur = null; } return; }
    if (!cur) cur = { mot: "", debut: al.character_start_times_seconds[i], fin: 0 };
    cur.mot += ch;
    cur.fin = al.character_end_times_seconds[i];
  });
  if (cur) res.push(cur);
  return res;
}

export async function voix(voiceId, texte) {
  const h = crypto.createHash("sha1").update(`${voiceId}|${texte}`).digest("hex").slice(0, 16);
  const mp3 = path.join(CACHE, `${h}.mp3`), js = path.join(CACHE, `${h}.json`);
  if (!fs.existsSync(mp3) || !fs.existsSync(js)) {
    // Clé demandée seulement si la voix n'est pas en cache : un épisode déjà dit se refabrique sans elle.
    if (!CLE) throw new Error("ELEVENLABS_API_KEY absente du .env du projet");
    let d = null;
    for (let essai = 1; essai <= 3 && !d; essai++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": CLE, "Content-Type": "application/json" },
        body: JSON.stringify({ text: texte, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 } }),
        signal: AbortSignal.timeout(120000),
      });
      if (r.ok) d = await r.json();
      else if (essai === 3) throw new Error(`voix refusée ${r.status} ${(await r.text()).slice(0, 150)}`);
      else await new Promise((ok) => setTimeout(ok, 3000 * essai));
    }
    fs.writeFileSync(mp3, Buffer.from(d.audio_base64, "base64"));
    fs.writeFileSync(js, JSON.stringify(d.alignment));
  }
  const al = JSON.parse(fs.readFileSync(js, "utf8"));
  const m = mots(al);
  const dur = al.character_end_times_seconds.at(-1) ?? 1;
  return { mp3, dur, mots: m };
}
