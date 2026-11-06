---
name: installer
description: Installer et vérifier tout ce dont le plugin serie-animee a besoin sur la machine de l'utilisateur — Node.js, ffmpeg, la bibliothèque d'images sharp, Codex si les images passent par ChatGPT, le fichier .env et les clés kie.ai et ElevenLabs (testées sans jamais être affichées). À utiliser au premier lancement du plugin, quand un script du moteur échoue sur une dépendance manquante (« ffmpeg introuvable », « Cannot find module sharp », « SERIE_DATA absent », clé refusée), ou quand l'utilisateur demande « qu'est-ce qu'il me faut pour commencer ».
---

# Installer le plugin

But : qu'à la fin, `verifier.mjs` réponde « Tout est prêt. ». Avancer point par point, dire à l'utilisateur ce qui se passe en langage simple, ne jamais lui demander de coller une clé dans la conversation.

## 1. Le dossier du projet
Demander où la série vivra (un dossier vide dédié est le plus simple). Tout se lance depuis ce dossier.

## 2. Le choix des images
Demander, avec `AskUserQuestion` :
- **kie.ai** : les images (personnages, décors, poses) passent par la même clé que les animations. Payant au crédit, aucun abonnement de plus.
- **ChatGPT (par Codex)** : les images passent par l'abonnement ChatGPT de l'utilisateur, via l'outil Codex en ligne de commande. Pas de crédit en plus, mais il faut Codex installé et connecté.

Noter le choix dans `serie/decisions.md` (créer `serie/` si besoin).

## 3. Les outils
Vérifier, puis installer ce qui manque en expliquant chaque commande avant de la lancer :
- **Node.js 20 ou plus** : `node --version`. Sinon : https://nodejs.org (version LTS) ; sous Windows `winget install OpenJS.NodeJS.LTS`, sous macOS `brew install node`.
- **ffmpeg et ffprobe** : `ffmpeg -version`. Sinon : Windows `winget install Gyan.FFmpeg`, macOS `brew install ffmpeg`, Linux `sudo apt install ffmpeg`. Rouvrir le terminal après l'installation.
- **sharp** (dans le dossier de données du plugin, pas dans le projet) :
  ```bash
  npm install --prefix "${CLAUDE_PLUGIN_DATA}" sharp@^0.33.5
  ```
- **Codex** (seulement si l'option ChatGPT est choisie) : `npm install -g @openai/codex`, puis `codex login` (l'utilisateur se connecte lui-même dans son navigateur).

## 4. Les clés
1. Copier le modèle : `cp "${CLAUDE_PLUGIN_ROOT}/modele/env.exemple" .env` (ne jamais écraser un `.env` existant : vérifier d'abord).
2. Si le projet est un dépôt git, ajouter `.env` au `.gitignore`.
3. Expliquer à l'utilisateur où trouver chaque clé, et lui demander de **l'ouvrir lui-même** dans son éditeur pour la coller après le `=` :
   - `KIE_AI_API_KEY` : https://kie.ai → API Key (recharger quelques dollars de crédits : un décor complet en coûte quelques-uns).
   - `ELEVENLABS_API_KEY` : https://elevenlabs.io → Profile → API Keys (un forfait payant est conseillé : voix et sons consomment des caractères).
4. Ne jamais afficher, lire à voix haute ni recopier une clé. Les scripts la lisent dans `.env` et ne l'impriment jamais.

## 5. Vérifier
```bash
SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/verifier.mjs" kie      # ou chatgpt
```
Le script teste chaque outil et chaque clé (solde kie.ai, compte ElevenLabs) et liste ce qui reste « À FAIRE ». Recommencer jusqu'à « Tout est prêt. ».

Puis la police des sous-titres (gratuite, licence libre) :
```bash
SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/outils/police.mjs"
```
Ce script a besoin de `serie/serie.json` : s'il n'existe pas encore, le lancer à la fin du skill **nouvelle-serie**.

## 6. Enchaîner
Dire ce qui est installé, le solde kie.ai lu, et proposer le skill **nouvelle-serie**.
