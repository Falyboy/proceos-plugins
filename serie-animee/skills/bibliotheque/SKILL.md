---
name: bibliotheque
description: Construire la bibliothèque d'une série animée (plugin serie-animee), payée une seule fois et réutilisée par tous les épisodes — gestes animés de 5 s par décor (kie.ai Seedance), acolytes détourés une pose par émotion, sons et ambiances (ElevenLabs), bouches qui parlent (lip-sync une fois par geste). À utiliser après nouvelle-serie, quand l'utilisateur veut un nouveau geste, un nouveau décor, une nouvelle émotion d'acolyte, des bruitages, ou que la bouche du personnage ne bouge pas.
---

# Bibliothèque de la série

Tout ce qui est ici coûte de l'argent une fois, puis ne coûte plus rien. Pour chaque lot payant : annoncer le nombre d'éléments, le prix unitaire mesuré et le total, **attendre l'accord**, lancer, puis donner le coût mesuré (solde avant/après dans `trace.log`). Les scripts sautent ce qui existe déjà : un relancement ne repaie rien.

Commande type (depuis le projet) :
```bash
SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/<script>" …
```

## 1. Gestes animés, par décor
Lister avec l'utilisateur 8 à 15 gestes par décor (voir `nouvelle-serie/references/questions.md`, famille D). Puis écrire `serie/scenes/<décor>/animations/liste.json` :

```json
{ "sortie": "serie/scenes/bureau/animations", "clips": [
  { "nom": "tape", "modele": "seedance-mini", "image": "serie/images/decor-bureau.png", "resolution": "720p", "duree": 5,
    "consigne": "Animate this 2D cartoon image as one continuous shot. Fixed camera: the desk and the room do not move. Alice at her desk: she types fast on the keyboard, focused, small head movements. Keep exactly the same style, same character, same clothes, same room, same objects at the same places. Anatomically correct body and hands. Natural lively animation with blinking and breathing. No text, no new characters, no cut." } ] }
```
- **Toujours la même image de départ** pour tous les gestes d'un décor : c'est ce qui rend les raccords invisibles.
- Consigne = phrase commune (style, caméra fixe, pièce identique, anatomie, pas de texte ni de coupe) + le geste. Les acolytes ne sont **pas** dans ces clips : ils sont posés par-dessus au montage.
- Coût : Seedance 2 mini ≈ 8 crédits/s en 720p (≈ 40 par geste de 5 s), ≈ 4 en 480p. `modele` : `seedance-mini` (défaut conseillé), `seedance-2-5`, `kling-flash`.

```bash
… node "${CLAUDE_PLUGIN_ROOT}/moteur/kie/clips.mjs" serie/scenes/bureau/animations/liste.json
```
Regarder chaque clip (extraire 4 images avec ffmpeg et les lire) : un clip qui change la pièce, la tenue ou déforme une main se refait (supprimer le fichier, relancer : seul lui est repayé).

## 2. Acolytes, une pose par émotion
Générer chaque pose sur **fond blanc uni** (option d'images choisie : `kie/images.mjs` ou Codex), même personnage, même taille, en pied, nommée `<sprite>-<pose>.png` (ex. `bip-joie.png`). Puis détourer :
```bash
… node "${CLAUDE_PLUGIN_ROOT}/moteur/detourer.mjs" serie/images/acolytes-bruts serie/acolytes
```
Seul le blanc relié aux bords devient transparent (les blancs des yeux restent). Vérifier une pose composée sur le décor avant de valider les places de `serie.json`.

## 3. Sons
Bruitages courants (pop, ding, erreur, boing, badum, criquets, gloups, whoosh, tada, idee, notif) et une ambiance par décor (consigne `ambianceConsigne` de chaque décor dans `serie.json`) :
```bash
… node "${CLAUDE_PLUGIN_ROOT}/moteur/sons.mjs"
```
Consomme des caractères du forfait ElevenLabs. Faire écouter l'ambiance : trop présente, elle couvre la voix ; refaire en supprimant le fichier.

## 4. Bouches qui parlent
Les gestes sont générés bouche fermée. Pour que le personnage principal parle, chaque geste existe en deux versions alignées image pour image : `clips25/` (bouche fermée) et `parle/` (lip-sync, payé une seule fois). Au montage, la version « parle » n'apparaît que pendant ses mots.
- Coût mesuré : ≈ 40 crédits kie.ai par geste de 5 s. Ne le faire que pour les gestes où le visage se voit bien.
```bash
… node "${CLAUDE_PLUGIN_ROOT}/moteur/bouches.mjs" bureau
```
Un refus « The server is busy » n'est pas facturé : relancer plus tard (10 min d'écart), le script ne refait que ce qui manque. Le lip-sync suit le rythme de la voix, pas chaque syllabe : le dire.

## 5. Bilan
Tableau par décor : gestes, gestes avec bouche, acolytes, sons ; coût mesuré total ; ce qui manque. Puis proposer le skill **episode**.
