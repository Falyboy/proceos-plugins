/**
 * Planche de contrôle d'un épisode fabriqué, pour la vérification visuelle (agent « verificateur-video ») :
 * 8 images régulières en grille 4 x 2 (planche-revue.jpg), niveaux sonores (pic, moyen), durée.
 * Usage : node planche.mjs <id épisode>   (épisode dans serie/sortie/<id>/video.mp4)
 */
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { PROD } from "./config.mjs";

const id = process.argv[2];
const dos = path.join(PROD, "sortie", id);
const video = path.join(dos, "video.mp4");
const duree = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }));
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-vf", `fps=8/${duree.toFixed(2)},scale=540:-1,tile=4x2`, "-frames:v", "1", "planche-revue.jpg"], { cwd: dos });
const r = spawnSync("ffmpeg", ["-hide_banner", "-i", video, "-af", "volumedetect", "-vn", "-f", "null", "-"], { encoding: "utf8" });
const g = (k) => Number((r.stderr.match(new RegExp(`${k}: (-?[\\d.]+) dB`)) || [])[1]);
console.log(JSON.stringify({ planche: path.join(dos, "planche-revue.jpg"), couverture: path.join(dos, "couverture.jpg"), duree: Number(duree.toFixed(1)), sonMoyen: g("mean_volume"), sonPic: g("max_volume") }));
