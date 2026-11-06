---
name: serie-animee
description: Point d'entrée du plugin serie-animee. Créer une série de reels verticaux en dessin animé (personnage récurrent, décors fixes, acolytes, voix, lèvres animées, panneaux d'explication, sous-titres mot à mot, couverture) et la tenir dans le temps, épisode après épisode. À utiliser dès que l'utilisateur veut lancer une chaîne ou une série de vidéos animées, créer des personnages ou des décors pour des reels ou des shorts, faire parler un personnage dessiné, ajouter un épisode, ou demande « par où commencer » avec ce plugin — même sans prononcer le mot « série ». Oriente vers le bon skill (installer, nouvelle-serie, bibliotheque, episode).
---

# Série animée : la méthode

Ce plugin reprend une méthode éprouvée en production (une série de 13 épisodes fabriquée et publiée en novembre 2026) : un personnage principal, 1 à 5 décors fixes, des acolytes posés par-dessus la scène, des émissions à thème, et un moteur de montage qui réutilise une bibliothèque payée une seule fois.

Deux principes tiennent tout le reste. Les dire à l'utilisateur dès le début :

1. **L'utilisateur décide, Claude propose.** Chaque choix visuel (style, personnages, décors, tenue, sous-titres, couverture) se montre en images avant d'être retenu. On n'avance qu'avec un choix explicite. Chaque décision est notée dans `serie/decisions.md` avec sa date et n'est plus rediscutée sans raison nouvelle.
2. **Payer une fois, réutiliser toujours.** Gestes animés, bouches qui parlent, sons et acolytes se fabriquent une fois par décor et servent à tous les épisodes. Un épisode nouveau ne coûte ensuite que sa voix.

## Où en est l'utilisateur ?

Regarder le dossier courant (le projet de l'utilisateur), puis aller au bon skill :

| Ce qu'on trouve | Étape suivante |
|---|---|
| Rien, ou `node`/`ffmpeg` absents, ou pas de `.env` | skill **installer** |
| Installation faite, pas de `serie/serie.json` | skill **nouvelle-serie** (questionnaire, look, bible) |
| `serie.json` présent, `serie/scenes/<décor>/animations/` vide ou absent | skill **bibliotheque** (images, gestes, acolytes, sons, bouches) |
| Bibliothèque en place | skill **episode** (écrire, relire, fabriquer, vérifier) |

## Arborescence du projet de l'utilisateur

```
<projet>/
  .env                      clés de l'utilisateur (jamais lues à voix haute, jamais copiées ailleurs)
  serie/
    serie.json              personnages, voix, couleurs, émissions, décors, places des acolytes
    bible.md                qui sont les personnages, ce qu'ils disent et ne disent jamais
    decisions.md            décisions datées
    images/                 planches de style, fiches personnages, images de base des décors
    scenes/<décor>/animations/<geste>.mp4   gestes de 5 s (puis clips25/ et parle/ pour les bouches)
    acolytes/<sprite>-<pose>.png            acolytes détourés, une image par émotion
    sons/                   bruitages et ambiances
    polices/                police des sous-titres
    episodes/<id>.json      un fichier par épisode
    sortie/<id>/            video.mp4, couverture.jpg, controle.jpg, texte.txt
```

## Lancer un script du moteur

Toujours depuis le dossier du projet, avec ces deux variables (le moteur est dans le plugin, les dépendances dans son dossier de données) :

```bash
SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/<script>.mjs" <arguments>
```

Sous PowerShell : `$env:SERIE_DATA="${CLAUDE_PLUGIN_DATA}"; $env:SERIE_PROJET=(Get-Location).Path; node "${CLAUDE_PLUGIN_ROOT}/moteur/<script>.mjs" <arguments>`.

## Ce qui coûte de l'argent (accord de l'utilisateur avant chaque lancement)

| Service | Usage | Coût mesuré (nov. 2026, à revérifier) |
|---|---|---|
| kie.ai, Seedance 2 mini | gestes de 5 s | ≈ 8 crédits/s en 720p, ≈ 4 en 480p |
| kie.ai, lip-sync vidéo | bouche qui parle, une fois par geste | ≈ 40 crédits par geste de 5 s |
| kie.ai, nano-banana | images (option « kie ») | voir le tarif kie.ai du jour |
| ElevenLabs | voix des répliques, sons | dans le forfait de l'utilisateur |
| ChatGPT par Codex | images (option « chatgpt ») | dans l'abonnement de l'utilisateur |

Chiffrer avant (nombre × prix), demander l'accord, lancer, puis donner le coût **mesuré** (solde avant/après, noté par les scripts dans `trace.log`). Un refus « server busy » de kie.ai n'est pas facturé.

## Références
- `references/formats.md` : le format exact de `serie.json` et d'un épisode (à lire avant d'en écrire un).
- `references/pieges.md` : les pannes déjà rencontrées et leur solution, déjà codée dans le moteur.
- `references/redaction.md` : accroches, arcs, anti-slop, grille de relecture.
- Modèles prêts à copier : `${CLAUDE_PLUGIN_ROOT}/modele/` (`serie.json`, `episode-exemple.json`, `env.exemple`).

## Toujours dire à l'utilisateur
Le coût mesuré après chaque dépense, ce qui a été vérifié et comment, ce qui ne l'a pas été. Un chiffre lu dans une vidéo ou un blog est une hypothèse, pas un fait.
