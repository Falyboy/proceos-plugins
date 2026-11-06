// Lecture d'une clé dans <projet>/.env (projet = SERIE_PROJET, sinon dossier courant). Valeur jamais affichée.
// Indépendant de serie.json : l'installateur teste les clés avant que la série existe.
import fs from "node:fs";
import path from "node:path";
export const PROJET = path.resolve(process.env.SERIE_PROJET ?? process.cwd());
export function cle(nom) {
  const env = path.join(PROJET, ".env");
  if (!fs.existsSync(env)) return "";
  return (fs.readFileSync(env, "utf8").match(new RegExp(`^${nom}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}
