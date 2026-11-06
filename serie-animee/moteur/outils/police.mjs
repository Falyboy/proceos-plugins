// Télécharge la police Fredoka (Google Fonts, licence SIL OFL) dans serie/polices/ pour les sous-titres. Relançable.
import fs from "node:fs";
import path from "node:path";
import { PROD } from "../config.mjs";
const DOS = path.join(PROD, "polices");
fs.mkdirSync(DOS, { recursive: true });
const f = path.join(DOS, "Fredoka.ttf");
if (fs.existsSync(f)) { console.log("police déjà là"); process.exit(0); }
const r = await fetch("https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka%5Bwdth%2Cwght%5D.ttf", { redirect: "follow", signal: AbortSignal.timeout(60000) });
if (!r.ok) { console.log("échec du téléchargement de la police", r.status); process.exit(1); }
fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
console.log("police écrite", fs.statSync(f).size, "octets");
