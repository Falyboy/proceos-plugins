/**
 * Piste de fond d'un épisode : un plan par suite de répliques qui gardent le même geste. Chaque plan est joué en
 * aller-retour (le geste, puis le geste à l'envers) : il commence et finit sur la première image du clip, qui est la
 * même pour tous les clips d'une scène. Les raccords entre plans tombent donc sur une image identique, sans saut.
 * Bouche (bouches.mjs) : si un geste a sa version « parle », la piste est construite deux fois, plans identiques
 * image pour image, et la version « parle » n'est montrée que pendant les mots du personnage principal.
 * Sortie : <dos>/fond.mp4 (1080 x 1920, 30 images/s, nombre d'images exact).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SCENES, SCENES_DIR, PARLEUR } from "../config.mjs";

const IPS = 30;
const ff = (args, cwd) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { cwd, stdio: ["ignore", "ignore", "pipe"], maxBuffer: 64 * 1024 * 1024 });

// Regroupe les répliques consécutives au même geste. Durées en images entières.
export function plans(lignes) {
  const res = [];
  for (const l of lignes) {
    const n = Math.round(l.duree * IPS);
    const der = res.at(-1);
    if (der && der.clip === l.clip) der.images += n;
    else res.push({ clip: l.clip, images: n });
  }
  return res;
}

// Source d'un geste : version « parle » si demandée et disponible ; sinon la copie à 25 images/s (même cadence que
// « parle », pour que les deux versions s'alignent image pour image) ; à défaut, le clip d'origine.
function source(scene, clip, variante) {
  const base = path.join(SCENES_DIR, SCENES[scene].clips);
  const parle = path.join(base, "..", "parle", `${clip}.mp4`), c25 = path.join(base, "..", "clips25", `${clip}.mp4`);
  if (variante === "parle" && fs.existsSync(parle)) return parle;
  if (fs.existsSync(c25)) return c25;
  // Pas de repli sur l'original (24 images/s) quand une version « parle » (25 images/s) existe : désalignement.
  if (fs.existsSync(parle)) throw new Error(`copie à 25 images/s absente pour ${clip} : relancer bouches.mjs`);
  const orig = path.join(base, `${clip}.mp4`);
  if (!fs.existsSync(orig)) throw new Error(`clip absent : ${orig}`);
  return orig;
}
const aParle = (scene, clip) => fs.existsSync(path.join(SCENES_DIR, SCENES[scene].clips, "..", "parle", `${clip}.mp4`));

// Un plan de N images : C cycles aller-retour de 2H images chacun (H ≤ 145). Le clip démarre à sa 4e image : la
// toute première (image de départ exacte) est plus claire que les suivantes et ferait un flash à chaque raccord.
function plan(dos, j, p, scene, variante) {
  const clip = source(scene, p.clip, variante);
  const C = Math.max(1, Math.ceil(p.images / 290)); // aller ≤ 145 images : il en reste 146 après la coupe
  // Cycles complets (2HC ≤ N), puis l'image de départ répétée pour atteindre N : le plan finit toujours au départ.
  const H = Math.max(1, Math.floor(p.images / (2 * C)));
  const reste = Math.max(0, p.images - 2 * H * C);
  const f = `[0:v]trim=start_frame=4,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${IPS},setsar=1,trim=end_frame=${H},setpts=PTS-STARTPTS,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,loop=loop=${C - 1}:size=${2 * H}:start=0,setpts=N/${IPS}/TB,tpad=stop=${reste}:stop_mode=clone[v]`;
  const sortie = path.join(dos, `plan-${variante}-${String(j).padStart(2, "0")}.mp4`);
  ff(["-i", clip, "-filter_complex", f, "-map", "[v]", "-frames:v", String(p.images), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(IPS), sortie]);
  return sortie;
}

function piste(dos, ps, scene, variante) {
  const fichiers = ps.map((p, j) => plan(dos, j, p, scene, variante));
  const liste = `plans-${variante}.txt`, sortie = `fond-${variante}.mp4`;
  fs.writeFileSync(path.join(dos, liste), fichiers.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", liste, "-c", "copy", sortie], dos);
  return sortie;
}

// Intervalles où le personnage principal prononce un mot (silences de moins de 0,15 s fondus) : la bouche y bouge.
function motsParleur(lignes) {
  const iv = [];
  for (const l of lignes) if (l.q === PARLEUR) for (const m of l.mots) {
    const a = l.debut + m.debut, b = l.debut + m.fin, der = iv.at(-1);
    if (der && a - der[1] < 0.15) der[1] = Math.max(der[1], b); else iv.push([a, b]);
  }
  return iv;
}

export function fond(dos, lignes, scene) {
  const ps = plans(lignes);
  const ferme = piste(dos, ps, scene, "ferme");
  const iv = motsParleur(lignes);
  if (!iv.length || !ps.some((p) => aParle(scene, p.clip))) { fs.copyFileSync(path.join(dos, ferme), path.join(dos, "fond.mp4")); return path.join(dos, "fond.mp4"); }
  const parle = piste(dos, ps, scene, "parle");
  const quand = iv.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+");
  // Nombre d'images imposé : sans lui, la fusion ajoutait une image en fin de piste (1 722 au lieu de 1 721).
  const N = ps.reduce((s, p) => s + p.images, 0);
  ff(["-i", ferme, "-i", parle, "-filter_complex", `[0:v][1:v]overlay=0:0:shortest=1:enable='${quand}'[v]`, "-map", "[v]", "-frames:v", String(N), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(IPS), "fond.mp4"], dos);
  return path.join(dos, "fond.mp4");
}
