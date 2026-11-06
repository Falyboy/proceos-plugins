/**
 * Configuration d'une série, lue dans le projet de l'utilisateur (jamais écrite en dur dans le plugin) :
 *   <projet>/serie/serie.json  personnages, voix, couleurs, émissions, décors, acolytes, bruitages ;
 *   <projet>/.env             clés de l'utilisateur (KIE_AI_API_KEY, ELEVENLABS_API_KEY), jamais affichées.
 * Le dossier du projet est SERIE_PROJET, sinon le dossier courant. Les dépendances (sharp) sont dans
 * SERIE_DATA/node_modules (installées par le skill « installer » dans ${CLAUDE_PLUGIN_DATA}).
 * Les modules de montage ne lisent la série que par ces exports.
 */
import fs from "node:fs";
import path from "node:path";

import { PROJET } from "./cle.mjs";
export { PROJET };
export const REELS = path.join(PROJET, "serie");
export const PROD = REELS;
export const SCENES_DIR = path.join(REELS, "scenes");
export const SPRITES = path.join(REELS, "acolytes");
export const SONS = path.join(REELS, "sons");
const DATA = process.env.SERIE_DATA ?? path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
export const SHARP = path.join(DATA, "package.json");

const fichier = path.join(REELS, "serie.json");
if (!fs.existsSync(fichier)) throw new Error(`serie.json introuvable dans ${REELS} : lancer d'abord le skill « nouvelle-serie »`);
const S = JSON.parse(fs.readFileSync(fichier, "utf8"));

// Chemin d'un fichier de la série : absolu tel quel, sinon relatif au dossier serie/.
export const chemin = (p) => (!p ? p : path.isAbsolute(p) ? p : path.join(REELS, p));

export const PERSOS = S.personnages;                 // { L: { nom, voix, couleur }, … }
export const PARLEUR = S.parleur ?? Object.keys(S.personnages)[0]; // personnage dont la bouche est animée
export const ACOLYTES = S.acolytes ?? {};            // { C: { sprite: "nuage-abricot" }, … } : sprites posés par-dessus
export const MOT_ACTIF = S.motActif ?? "#FFE14D";
// Phrase dite par le personnage principal pour fabriquer ses bouches (bouches.mjs) : sa langue et son ton.
export const PHRASE_BOUCHE = S.phraseBouche ?? "Alors aujourd'hui, je te montre comment je travaille. Franchement, ça a tout changé dans mes journées, et je t'explique pourquoi.";
export const EMISSIONS = S.emissions;                // { t: { nom, couleur }, … }
// Par défaut : clips dans scenes/<décor>/animations, ambiance dans sons/ambiance-<décor>.mp3 (écrite par sons.mjs).
export const SCENES = Object.fromEntries(Object.entries(S.decors).map(([k, d]) => [k, { ...d, clips: d.clips ?? `${k}/animations`, ambiance: chemin(d.ambiance ?? `sons/ambiance-${k}.mp3`) }]));
// Bruitages : ceux de serie.json, sinon chaque sons/<nom>.mp3 (hors ambiances), appelé par son nom dans « sfx ».
const sonsAuto = () => fs.existsSync(SONS) ? Object.fromEntries(fs.readdirSync(SONS).filter((f) => f.endsWith(".mp3") && !f.startsWith("ambiance-")).map((f) => [f.slice(0, -4), `sons/${f}`])) : {};
export const SFX = Object.fromEntries(Object.entries(S.bruitages ?? sonsAuto()).map(([k, v]) => [k, chemin(v)]));

export { cle } from "./cle.mjs";
