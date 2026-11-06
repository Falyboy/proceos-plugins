/**
 * Sous-titres au format ASS : le mot prononcé passe en jaune (couleur motActif de serie.json), les autres restent blancs,
 * le nom du personnage au-dessus dans sa couleur. Une ligne d'événement par mot, de son début au mot suivant.
 * Place : bas de l'image en temps normal ; sur la ligne de séparation quand le panneau est ouvert.
 */
import { PERSOS, MOT_ACTIF, SCENES } from "../config.mjs";

const ass = (hex) => { const h = hex.replace("#", ""); return `&H${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`; };
const temps = (s) => { const t = Math.max(0, s); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = (t % 60).toFixed(2).padStart(5, "0"); return `${h}:${String(m).padStart(2, "0")}:${sec}`; };
const nettoie = (s) => s.replace(/[{}\\]/g, "");

// Coupe une réplique en morceaux de 7 mots au plus, affichés sur deux lignes (4 + 3).
function morceaux(brut) {
  // Ponctuation détachée (« : », « ? », « ! » précédés d'une espace en français) : rattachée au mot d'avant.
  const mots = [];
  for (const m of brut) {
    if (/^[:;!?»….,]+$/.test(m.mot) && mots.length) mots[mots.length - 1] = { ...mots.at(-1), mot: `${mots.at(-1).mot} ${m.mot}`, fin: m.fin };
    else mots.push(m);
  }
  const res = [];
  for (let i = 0; i < mots.length; i += 7) res.push(mots.slice(i, i + 7));
  return res;
}

export function fichierAss(lignes, scene) {
  const tete = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: S,Fredoka,62,&HFFFFFF&,&HFFFFFF&,&H000000&,&H00000000&,1,0,0,0,100,100,0,0,1,7,0,2,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const bas = SCENES[scene]?.stPanneau;
  const ev = [];
  for (const l of lignes) {
    const p = PERSOS[l.q];
    // Plans serrés (stPanneau) : bloc plus petit, juste sous la jointure, pour ne toucher ni le panneau ni le visage.
    const pos = !l.pan ? "{\\an2\\pos(540,1470)}" : bas ? `{\\an8\\pos(540,${bas})}` : "{\\an8\\pos(540,985)}";
    const [tNom, tTxt] = l.pan && bas ? [26, 50] : [32, 62];
    for (const groupe of morceaux(l.mots)) {
      groupe.forEach((w, k) => {
        const debut = l.debut + w.debut;
        const fin = k < groupe.length - 1 ? l.debut + groupe[k + 1].debut : l.debut + w.fin + 0.25;
        const texte = groupe.map((m, j) => `${j === 4 ? "\\N" : j ? " " : ""}${j === k ? `{\\c${ass(MOT_ACTIF)}}` : "{\\c&HFFFFFF&}"}${nettoie(m.mot)}`).join("");
        ev.push({ debut, fin, txt: `${pos}{\\fs${tNom}\\c${ass(p.couleur)}}${p.nom}\\N{\\fs${tTxt}}${texte}` });
      });
    }
  }
  // Un seul bloc à l'écran : chaque événement s'arrête au plus tard quand le suivant commence.
  ev.sort((a, b) => a.debut - b.debut);
  ev.forEach((e, i) => { if (i < ev.length - 1) e.fin = Math.min(e.fin, ev[i + 1].debut); });
  return tete + ev.filter((e) => e.fin > e.debut).map((e) => `Dialogue: 0,${temps(e.debut)},${temps(e.fin)},S,,0,0,0,,${e.txt}`).join("\n") + "\n";
}
