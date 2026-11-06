# serie-animee

Plugin Claude Code de **Proceos** pour créer une série de vidéos verticales (Reels, Shorts, TikTok) en dessin animé, et la tenir dans le temps.

Claude vous pose les bonnes questions, vous montre des propositions en images, vous laisse choisir, puis fabrique chaque épisode : voix des personnages, gestes animés, bouche qui parle, panneaux d'explication, sous-titres mot à mot, couverture. Chaque vidéo est vérifiée image par image avant de vous être rendue. Le plugin ne publie rien : vous regardez, vous validez, vous publiez.

## Ce qu'il vous faut
- Claude Code.
- Un ordinateur Windows, macOS ou Linux, avec Node.js 20 ou plus et ffmpeg (le plugin vous guide pour les installer).
- Un compte **kie.ai** avec des crédits (gestes animés, bouches, et images si vous choisissez cette option).
- Un compte **ElevenLabs** (voix et sons ; un forfait payant est conseillé).
- Pour les images, au choix : kie.ai, ou votre abonnement **ChatGPT** par l'outil Codex.

## Combien ça coûte (mesuré en novembre 2026, à revérifier)
- Un geste animé de 5 secondes : environ 40 crédits kie.ai (720p).
- Une bouche qui parle sur un geste : environ 40 crédits kie.ai, une seule fois.
- Un décor complet (12 gestes, la moitié avec bouche) : de l'ordre de 700 crédits.
- Un épisode, une fois la bibliothèque faite : sa voix seulement, dans votre forfait ElevenLabs.

Claude annonce chaque dépense avant de la lancer et attend votre accord, puis vous donne le coût réellement mesuré.

## Installation
```
/plugin marketplace add Falyboy/proceos-plugins
/plugin install serie-animee@proceos
```
Le dépôt est privé : Proceos vous y invite après l'achat (compte GitHub nécessaire, et être connecté à GitHub sur votre ordinateur, par exemple avec `gh auth login`). Mise à jour : `/plugin marketplace update proceos`.

Puis, dans un dossier vide dédié à votre série, dites à Claude : « je veux créer une série animée ». Il commence par l'installation (skill `installer`), puis enchaîne.

## Les étapes
1. **installer** : outils, clés (que vous collez vous-même dans `.env`, jamais dans la conversation), vérification.
2. **nouvelle-serie** : questionnaire, style, personnages, décors, bible, réglages de la série.
3. **bibliotheque** : gestes, acolytes, sons, bouches, payés une fois.
4. **episode** : écriture, relectures, fabrication, vérification.

## Vos clés
Elles restent dans le fichier `.env` de votre projet. Le plugin ne les affiche jamais et ne les envoie qu'au service concerné (kie.ai, ElevenLabs).

## Auteur
Proceos — tody@proceos.io. Licence : usage réservé à l'acheteur, revente et diffusion interdites.
