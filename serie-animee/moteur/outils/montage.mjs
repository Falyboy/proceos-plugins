/**
 * Montage d'un épisode avec FFmpeg : un segment par réplique (clip animé de la scène + nuages posés par-dessus),
 * assemblage, puis passe finale (scène qui descend et panneau qui s'ouvre, bandeau de l'émission sur la dernière
 * réplique, sous-titres mot à mot, voix, ambiance et bruitages).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SCENES, SPRITES, SFX, PROD, ACOLYTES } from "../config.mjs";

const ff = (args, cwd) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { cwd, stdio: ["ignore", "ignore", "pipe"], maxBuffer: 64 * 1024 * 1024 });

// Un segment : la piste de fond (plans en aller-retour, écran vivant) sur la durée de la réplique, nuages par-dessus.
export function segment(dos, i, l, scene, fondVideo) {
  const sc = SCENES[scene];
  // Coupe une demi-image avant le début : « 2/30 s » arrondi à 0,0667 ferait sauter l'image visée.
  const args = ["-ss", Math.max(0, l.debut - 1 / 60).toFixed(4), "-i", fondVideo];
  let filtre = "[0:v]setsar=1[v0]";
  let k = 0;
  for (const [qui, pose] of Object.entries(l.n ?? {})) {
    const pos = (sc.acolytes ?? sc.nuages)?.[qui];
    const f = path.join(SPRITES, `${ACOLYTES[qui]?.sprite ?? qui}-${pose}.png`);
    if (!pos || !fs.existsSync(f)) continue;
    k++;
    args.push("-loop", "1", "-i", f);
    const parle = l.q === qui;
    const amp = parle ? 10 : 4, freq = parle ? 2.6 : 1.1;
    filtre += `;[${k}:v]scale=-1:${pos.h},format=rgba[c${k}];[v${k - 1}][c${k}]overlay=x='${pos.x}-overlay_w/2':y='${pos.y}-overlay_h+${amp}*sin(2*PI*${freq}*t)':shortest=0[v${k}]`;
  }
  const sortie = path.join(dos, `seg-${String(i).padStart(2, "0")}.mp4`);
  ff([...args, "-filter_complex", filtre, "-map", `[v${k}]`, "-frames:v", String(Math.round(l.duree * 30)), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30", sortie]);
  return sortie;
}

// Fenêtres d'ouverture du panneau : répliques consécutives qui portent le même panneau.
export function fenetres(lignes) {
  const res = [];
  for (const l of lignes) {
    const der = res.at(-1);
    if (l.pan && der && der.id === l.pan && Math.abs(der.fin - l.debut) < 0.05) der.fin = l.debut + l.duree;
    else if (l.pan) res.push({ id: l.pan, debut: l.debut, fin: l.debut + l.duree });
  }
  return res;
}

// choix : { [id du panneau]: { png (cadre), positions (cases), entoure (case retenue) } } pour les choix animés.
export function assembler(dos, ep, lignes, total, panneauxPng, bandeauPng, choix) {
  fs.writeFileSync(path.join(dos, "segments.txt"), lignes.map((_, i) => `file 'seg-${String(i).padStart(2, "0")}.mp4'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", "segments.txt", "-c", "copy", "base.mp4"], dos);

  const fen = fenetres(lignes);
  const args = ["-i", "base.mp4"];
  let n = 1, v = "[0:v]", f = [];
  if (fen.length) {
    const quand = fen.map((w) => `between(t,${w.debut.toFixed(2)},${w.fin.toFixed(2)})`).join("+");
    f.push(`[0:v]split=2[base][cop];[cop]crop=1080:960:0:480[bande];[base][bande]overlay=0:960:enable='${quand}',drawbox=x=0:y=0:w=1080:h=960:color=black:t=fill:enable='${quand}'[vb]`);
    // Le haut est noirci pendant que le panneau glisse : sinon le décor apparaît deux fois (haut d'origine + bande).
    v = "[vb]";
  }
  fen.forEach((w, j) => {
    args.push("-loop", "1", "-i", panneauxPng[w.id]);
    const A = w.debut.toFixed(2), B = w.fin.toFixed(2);
    const y = `if(lt(t,${A}+0.35),-960+960*(t-${A})/0.35,if(gt(t,${B}-0.3),-960*(t-(${B}-0.3))/0.3,0))`;
    let pan = `[${n}:v]`; n++;
    const ch = choix?.[w.id];
    if (ch) {
      // Le cadre saute d'une case à l'autre (0,3 s par saut), puis se pose sur le choix 1,4 s avant la fermeture.
      args.push("-loop", "1", "-i", ch.png);
      const ordre = [0, 1, 3, 2].filter((k) => k < ch.positions.length);
      // Pose bornée avant la fermeture (0,35 s) ; 12 sauts au plus (expression ffmpeg de profondeur bornée) ;
      // fenêtre trop courte : aucun saut, le cadre est posé d'emblée sur le choix.
      const debut = w.debut + 0.45, pose = Math.min(w.fin - 0.35, Math.max(debut + 0.6, w.fin - 1.4));
      const sauts = Math.max(0, Math.min(12, Math.floor((pose - debut) / 0.3)));
      const iFin = ordre.indexOf(ch.entoure);
      const suite = Array.from({ length: sauts }, (_, s) => ordre[(((iFin - (sauts - s)) % ordre.length) + ordre.length) % ordre.length]);
      const expr = (axe) => suite.reduceRight((acc, k, s) => `if(lt(t,${(debut + (s + 1) * 0.3).toFixed(2)}),${Math.round(ch.positions[k][axe] - 8)},${acc})`, String(Math.round(ch.positions[ch.entoure][axe] - 8)));
      f.push(`${pan}[${n}:v]overlay=x='${expr("x")}':y='${expr("y")}':enable='gte(t,${debut.toFixed(2)})'[pc${j}]`);
      pan = `[pc${j}]`; n++;
    }
    f.push(`${v}${pan}overlay=x=0:y='${y}':enable='between(t,${A},${B})':shortest=1[vp${j}]`);
    v = `[vp${j}]`;
  });
  const der = lignes.at(-1);
  args.push("-loop", "1", "-i", bandeauPng);
  // Dernière réplique sur un panneau ouvert : son en-tête porte déjà l'émission, le bandeau le recouvrirait (test du 2026-11-06).
  const quandBd = der.pan ? "0" : `between(t,${der.debut.toFixed(2)},${total.toFixed(2)})`;
  f.push(`${v}[${n}:v]overlay=0:110:enable='${quandBd}':shortest=1[vbd]`);
  n++;
  const polices = path.relative(dos, path.join(PROD, "polices")).replace(/\\/g, "/");
  f.push(`[vbd]subtitles=sous-titres.ass:fontsdir='${polices}'[vout]`);

  // Audio : voix, ambiance du lieu, bruitages (début de réplique) et glissement du panneau.
  const pistes = [];
  for (const l of lignes) { args.push("-i", l.mp3); pistes.push({ idx: n++, t: l.voixA, vol: 1 }); }
  // Sans ambiance fabriquée (sons.mjs), un silence la remplace : l'épisode se fabrique quand même.
  const ambF = SCENES[ep.scene].ambiance;
  if (ambF && fs.existsSync(ambF)) args.push("-stream_loop", "-1", "-i", ambF);
  else args.push("-f", "lavfi", "-t", total.toFixed(2), "-i", "anullsrc=r=44100:cl=stereo");
  const amb = n++;
  for (const l of lignes) if (l.sfx && SFX[l.sfx] && fs.existsSync(SFX[l.sfx])) { args.push("-i", SFX[l.sfx]); pistes.push({ idx: n++, t: l.debut, vol: 0.55 }); }
  for (const w of fen) if (fs.existsSync(SFX.whoosh)) { args.push("-i", SFX.whoosh); pistes.push({ idx: n++, t: w.debut, vol: 0.5 }); }
  const a = pistes.map((p, i) => `[${p.idx}:a]volume=${p.vol},adelay=${Math.round(p.t * 1000)}|${Math.round(p.t * 1000)}[a${i}]`);
  a.push(`[${amb}:a]volume=0.13,atrim=0:${total.toFixed(2)}[amb]`);
  a.push(`${pistes.map((_, i) => `[a${i}]`).join("")}[amb]amix=inputs=${pistes.length + 1}:normalize=0:duration=longest,atrim=0:${total.toFixed(2)},alimiter=limit=0.84:level=false[aout]`);
  ff([...args, "-filter_complex", [...f, ...a].join(";"), "-map", "[vout]", "-map", "[aout]", "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "video.mp4"], dos);
  return path.join(dos, "video.mp4");
}
