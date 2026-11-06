---
name: episode
description: Créer un épisode d'une série animée du plugin serie-animee de bout en bout — vérifier que le sujet colle à la bible et n'a pas déjà été traité, écrire le dialogue et les panneaux, faire relire (accroche, rédaction), fabriquer la vidéo (voix, gestes, bouche, écran vivant, panneaux, sous-titres, couverture), la vérifier image par image, corriger jusqu'au propre. À utiliser dès que l'utilisateur demande un épisode, un reel, une vidéo avec ses personnages, un épisode d'actualité, ou de refaire ou corriger un épisode existant.
---

# Un épisode

Un épisode est une fiche de données de plus (`serie/episodes/<id>.json`), fabriquée par le moteur. Ne rien refaire de ce qui existe dans la bibliothèque.

## 0. Lire avant d'écrire (rien n'est inventé)
1. `serie/bible.md`, `serie/serie.json`, `serie/decisions.md`.
2. Les épisodes déjà écrits (`serie/episodes/*.json` : titres, sujets, émissions).
3. Les gestes disponibles du décor : `ls serie/scenes/<décor>/animations/` (et `parle/` pour savoir lesquels ont la bouche), les poses d'acolytes : `ls serie/acolytes/`, les sons : `ls serie/sons/`.

Puis vérifier le sujet demandé :
- **déjà traité** : le dire avec la date et l'émission ; proposer de ne pas le refaire, ou un angle vraiment différent ;
- **hors ligne éditoriale** (aucune émission ne colle) : le dire, demander s'il faut l'ajouter avant d'écrire ;
- **nouveau et cohérent** : continuer.

Ne jamais contredire la bible (âge, métier, lieu, caractère, tenue, rôle des acolytes).

## 1. Écrire
Suivre `../serie-animee/references/redaction.md` (accroche et levier, arc selon l'émission, anti-slop) et `../serie-animee/references/formats.md` (format exact). Partir de `${CLAUDE_PLUGIN_ROOT}/modele/episode-exemple.json`.
- Chaque réplique : qui parle (`q`), le texte (`t`), le geste (`clip`) **qui montre la personne qui parle** ; les acolytes présents et leur pose (`n`) ; un panneau (`pan`) ; un bruitage (`sfx`).
- Une suite de répliques sur le même geste donne un plan continu : c'est plus fluide que de changer de geste à chaque phrase.
- Durée visée : celle de l'émission (≈ 2,5 mots par seconde de voix, plus 0,3 s par réplique).
- Un seul appel au public, à la fin.

## 2. Faire relire le texte (avant de fabriquer, c'est gratuit)
Lancer en parallèle les agents **relecteur-accroche** et **relecteur-redaction** sur la fiche. Appliquer ce qui est fondé ; refuser tout chiffre ou résultat invérifiable. Montrer le dialogue final à l'utilisateur avant de fabriquer.

## 3. Fabriquer
```bash
SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/fabriquer.mjs" <id>
```
3 à 13 minutes (l'écran vivant est le plus long) : lancer en arrière-plan. La voix est en cache : refabriquer ne la repaie pas. Journal : `serie/fabrication.log`.

## 4. Vérifier, puis corriger en boucle
```bash
… node "${CLAUDE_PLUGIN_ROOT}/moteur/planche.mjs" <id>
```
Puis lancer l'agent **verificateur-video** sur `serie/sortie/<id>/` (planche de contrôle, couverture, panneaux, niveaux sonores). Contrôler soi-même chaque point relevé en extrayant l'image au bon instant :
```bash
ffmpeg -v error -ss <secondes> -i serie/sortie/<id>/video.mp4 -frames:v 1 serie/sortie/<id>/verif.jpg
```
Corriger la fiche, refabriquer, revérifier, jusqu'à ne garder que des limites connues (variations dans les clips eux-mêmes, bouche qui suit le rythme mais pas chaque syllabe).

## 5. Rendre à l'utilisateur
Chemin de `video.mp4` et `couverture.jpg`, durée, ce que les relectures ont relevé et ce qui a été corrigé, limites restantes, coût éventuel. **Rien n'est publié par ce plugin** : l'utilisateur regarde, valide, et publie lui-même.
