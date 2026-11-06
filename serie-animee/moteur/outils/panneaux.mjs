/**
 * Dessine un panneau d'explication (moitié haute de l'image, 1080 x 960) : bandeau de l'émission, titre, et l'appareil
 * de la scène (ordinateur, téléphone, tablette) avec son contenu (liste, images, schéma, consigne, page de site, échange).
 */
import { createRequire } from "node:module";
import { SHARP, EMISSIONS } from "../config.mjs";
const sharp = createRequire(SHARP)("sharp");

const F = "Segoe UI, Arial, sans-serif";
const ENCRE = "#2B2B2B";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Zone d'écran de chaque appareil : [x, y, largeur, hauteur].
const ECRANS = { ordi: [125, 260, 830, 560], telephone: [355, 250, 370, 650], tablette: [175, 255, 730, 640] };

function cadre(app) {
  const [x, y, w, h] = ECRANS[app];
  if (app === "ordi") return `<rect x="${x - 30}" y="${y - 30}" width="${w + 60}" height="${h + 60}" rx="26" fill="#161616" stroke="#3a3a3a" stroke-width="5"/><path d="M${x - 80} ${y + h + 34} H${x + w + 80} L${x + w + 45} ${y + h + 74} H${x - 45} Z" fill="#2A2A2A"/>`;
  if (app === "telephone") return `<rect x="${x - 22}" y="${y - 26}" width="${w + 44}" height="${h + 52}" rx="52" fill="#161616" stroke="#3a3a3a" stroke-width="5"/><rect x="${x + w / 2 - 50}" y="${y - 14}" width="100" height="20" rx="10" fill="#161616"/>`;
  return `<rect x="${x - 30}" y="${y - 30}" width="${w + 60}" height="${h + 60}" rx="38" fill="#161616" stroke="#3a3a3a" stroke-width="5"/>`;
}

// Coupe un texte en lignes selon la largeur disponible (largeur moyenne d'un caractère ≈ 0,55 × taille).
function couper(texte, largeur, taille) {
  const max = Math.max(8, Math.floor(largeur / (taille * 0.55)));
  const lignes = [];
  let l = "";
  // Coupe aux seules espaces ordinaires : l'espace insécable garde « ! » et « » » collés au mot d'avant.
  for (const mot of String(texte).split(/[ \t\n]+/)) {
    if ((l + " " + mot).trim().length > max) { if (l) lignes.push(l); l = mot; } else l = (l + " " + mot).trim();
  }
  if (l) lignes.push(l);
  return lignes;
}
const texteSvg = (x, y, lignes, taille, couleur = ENCRE, gras = false, ancre = "start") =>
  lignes.map((l, i) => `<text x="${x}" y="${y + i * taille * 1.25}" font-family="${F}" font-size="${taille}" ${gras ? 'font-weight="700"' : ""} fill="${couleur}" text-anchor="${ancre}">${esc(l)}</text>`).join("");

// Cases d'un panneau « images » (2 colonnes), en pixels du panneau 1080 x 960.
export function cases(p, app) {
  const [x, y, w, h] = ECRANS[app];
  const ix = x + 26, iw = w - 52;
  const n = p.images.length, col = 2, rang = Math.ceil(n / col);
  const cw = (iw - 20) / col, chh = (h - 70) / rang - 44;
  return p.images.map((_, i) => ({ x: ix + (i % col) * (cw + 20), y: y + 30 + Math.floor(i / col) * (chh + 44), w: cw, h: chh }));
}

// Cadre du choix animé : un rectangle orange à la taille d'une case.
export async function cadreChoix(p, app) {
  const c = cases(p, app)[0];
  const w = Math.round(c.w + 16), h = Math.round(c.h + 16);
  return sharp(Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="14" fill="none" stroke="#FF6500" stroke-width="8"/></svg>`)).png().toBuffer();
}

export async function panneau(p, emission, numero, app) {
  const [x, y, w, h] = ECRANS[app];
  const em = EMISSIONS[emission];
  const badge = `${em.nom} · ÉP. ${numero}`;
  const bw = badge.length * 19 + 60;
  let corps = "";
  const images = [];
  const pad = 26, ix = x + pad, iw = w - 2 * pad;
  let cy = y + pad + 30;
  const t = app === "telephone" ? 30 : 34;
  if (p.type === "liste") {
    for (const [txt, etat] of p.items) {
      const ic = etat === "ok" ? ["✓", "#1F9D55"] : etat === "non" ? ["✗", "#D64545"] : ["•", "#FF6500"];
      const lignes = couper(txt, iw - 60, t);
      corps += `<text x="${ix}" y="${cy}" font-family="${F}" font-size="${t + 4}" font-weight="700" fill="${ic[1]}">${ic[0]}</text>` + texteSvg(ix + 50, cy, lignes, t, ENCRE, true);
      cy += lignes.length * t * 1.25 + 22;
    }
  } else if (p.type === "prompt") {
    const lignes = couper(p.texte, iw - 50, t);
    corps += `<rect x="${ix}" y="${cy - t}" width="${iw}" height="${lignes.length * t * 1.3 + 40}" rx="18" fill="#fff" stroke="#FF6500" stroke-width="5"/>` + texteSvg(ix + 24, cy + 12, lignes, t, ENCRE, false);
  } else if (p.type === "schema") {
    const n = p.etapes.length, bh = Math.min(96, (h - 70) / n - 34);
    p.etapes.forEach((e, i) => {
      const by = y + 40 + i * (bh + 34);
      corps += `<rect x="${ix + 20}" y="${by}" width="${iw - 40}" height="${bh}" rx="16" fill="${i === n - 1 ? "#FFE8D6" : "#fff"}" stroke="${ENCRE}" stroke-width="4"/>` + texteSvg(x + w / 2, by + bh / 2 + t * 0.35, couper(e, iw - 80, t).slice(0, 1), t, ENCRE, true, "middle");
      if (i < n - 1) corps += `<path d="M${x + w / 2} ${by + bh + 4} V${by + bh + 28}" stroke="#FF6500" stroke-width="6"/><path d="M${x + w / 2 - 12} ${by + bh + 18} L${x + w / 2} ${by + bh + 31} L${x + w / 2 + 12} ${by + bh + 18}" fill="none" stroke="#FF6500" stroke-width="6"/>`;
    });
  } else if (p.type === "site") {
    corps += texteSvg(ix, cy, [p.titre], t + 4, ENCRE, true);
    cy += 40;
    const cit = couper(p.citation, iw - 50, t - 2);
    const ch = cit.length * (t - 2) * 1.3 + 80;
    corps += `<rect x="${ix}" y="${cy}" width="${iw}" height="${ch}" rx="16" fill="#fff" stroke="#DDD" stroke-width="3"/>` + texteSvg(ix + 22, cy + 46, cit, t - 2, ENCRE);
    const ay = cy + 46 + cit.length * (t - 2) * 1.3 + 8;
    corps += texteSvg(ix + 22, ay, [p.auteur], t - 2, p.barre ? "#B23B3B" : ENCRE, true);
    if (p.barre) corps += `<path d="M${ix + 16} ${ay - 10} H${ix + 22 + p.auteur.length * (t - 2) * 0.52}" stroke="#D64545" stroke-width="7" stroke-linecap="round"/>`;
    if (p.tag) corps += `<rect x="${ix}" y="${cy + ch + 24}" width="${p.tag.length * t * 0.55 + 40}" height="${t + 22}" rx="${(t + 22) / 2}" fill="#FFE1DC"/>` + texteSvg(ix + 20, cy + ch + 24 + t + 2, [p.tag], t - 2, "#B23B3B", true);
  } else if (p.type === "chat") {
    for (const [de, txt] of p.bulles) {
      const lignes = couper(txt, iw - 90, t - 2);
      const bh = lignes.length * (t - 2) * 1.3 + 56;
      const gauche = de === (p.gauche ?? p.bulles[0][0]);
      const bx = gauche ? ix : ix + 60;
      corps += `<rect x="${bx}" y="${cy - 10}" width="${iw - 60}" height="${bh}" rx="20" fill="${gauche ? "#FFE3CC" : "#DCEBFF"}"/>` + texteSvg(bx + 20, cy + 22, [de], t - 8, gauche ? "#B8621B" : "#1E5FA8", true) + texteSvg(bx + 20, cy + 22 + t, lignes, t - 2, ENCRE);
      cy += bh + 24;
    }
  } else if (p.type === "images") {
    cases(p, app).forEach((c, i) => {
      images.push({ f: p.images[i][0], x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w), h: Math.round(c.h) });
      corps += texteSvg(c.x + c.w / 2, c.y + c.h + 32, [p.images[i][1]], t - 6, ENCRE, true, "middle");
      // Choix animé (p.choix) : le cadre est posé au montage, il hésite puis se fixe ; sinon il est dessiné ici.
      if (p.entoure === i && !p.choix) corps += `<rect x="${c.x - 8}" y="${c.y - 8}" width="${c.w + 16}" height="${c.h + 16}" rx="14" fill="none" stroke="#FF6500" stroke-width="8"/>`;
    });
  } else if (p.type === "image") {
    images.push({ f: p.f, x: ix, y: y + 20, w: iw, h: h - 40 });
    if (p.cercle) {
      // Le cercle se place en proportion de l'image réellement affichée (centrée, sans déformation), pas de l'écran.
      const { width: lw, height: lh } = await sharp(p.f).metadata();
      const k = Math.min(iw / lw, (h - 40) / lh), rw = lw * k, rh = lh * k, rx = ix + (iw - rw) / 2, ry = y + 20 + (h - 40 - rh) / 2;
      corps += `<circle cx="${rx + rw * p.cercle.x}" cy="${ry + rh * p.cercle.y}" r="${rw * p.cercle.r}" fill="none" stroke="#D64545" stroke-width="9"/>`;
    }
  }
  const fond = `<svg width="1080" height="960" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="960" fill="#0A0A0A"/><rect y="952" width="1080" height="8" fill="#FF6500"/>
    <rect x="${540 - bw / 2}" y="36" width="${bw}" height="52" rx="26" fill="${em.couleur}"/>
    <text x="540" y="72" text-anchor="middle" font-family="${F}" font-size="28" font-weight="800" fill="#0A0A0A" letter-spacing="2">${esc(badge)}</text>
    <text x="540" y="160" text-anchor="middle" font-family="${F}" font-size="46" font-weight="800" fill="#FFFFFF">${esc(p.titre ?? "")}</text>
    ${cadre(app)}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#FBF7F0"/></svg>`;
  const couches = [];
  for (const im of images) couches.push({ input: await sharp(im.f).resize(im.w, im.h, { fit: "contain", background: "#FBF7F0" }).toBuffer(), left: im.x, top: im.y });
  couches.push({ input: Buffer.from(`<svg width="1080" height="960" xmlns="http://www.w3.org/2000/svg">${corps}</svg>`), left: 0, top: 0 });
  return sharp(Buffer.from(fond)).composite(couches).png().toBuffer();
}
