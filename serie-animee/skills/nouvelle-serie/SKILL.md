---
name: nouvelle-serie
description: Créer une nouvelle série animée avec le plugin serie-animee — questionnaire de départ (public, ton, personnages, acolytes, décors, émissions, format, rythme, budget), choix du style et des personnages en images, bible de la série, puis écriture de serie/serie.json. À utiliser quand l'utilisateur veut lancer une série, inventer ses personnages ou ses décors, changer le style visuel, ajouter une émission ou un décor, ou quand le projet n'a pas encore de serie/serie.json.
---

# Nouvelle série

Rien ne se fabrique avant que la série soit cadrée. Poser les questions de `references/questions.md` **une famille à la fois** (`AskUserQuestion` pour les choix fermés), noter chaque réponse dans `serie/decisions.md` avec la date. Ne pas inventer à la place de l'utilisateur : proposer 2 à 4 options concrètes, il choisit.

## 1. Cadrer (questionnaire)
Familles A à G de `references/questions.md` : public et intention, personnages, style, décors et émissions, format, sujets et rythme, limites et budget.

## 2. Fixer le look, toujours en images
Ordre : style → personnage principal → acolytes → décors. À chaque étape, produire une planche de 3-4 propositions, la montrer (lire l'image avec l'outil Read), attendre le choix.

**Images, selon l'option choisie à l'installation** (`serie/decisions.md`) :
- **kie** : écrire une liste JSON puis lancer `kie/images.mjs` (payant : annoncer le nombre d'images et demander l'accord).
  ```json
  { "sortie": ".", "images": [
    { "nom": "style-2d-trait-net", "consigne": "…", "format": "9:16" },
    { "nom": "fiche-alice", "consigne": "…", "references": ["style-2d-trait-net.png"] } ] }
  ```
  ```bash
  SERIE_DATA="${CLAUDE_PLUGIN_DATA}" SERIE_PROJET="$PWD" node "${CLAUDE_PLUGIN_ROOT}/moteur/kie/images.mjs" serie/images/liste.json
  ```
  `sortie` et `references` sont relatifs au dossier du fichier de liste (ici `serie/images/`). Une image déjà présente n'est pas refaite ni repayée.
- **chatgpt** : une image par appel à Codex, dans le dossier `serie/images` :
  ```bash
  codex exec --skip-git-repo-check --sandbox workspace-write -C serie/images "Crée l'image fiche-alice.png (format vertical 9:16) : <consigne>. Regarde d'abord style-2d-trait-net.png avec l'outil de lecture d'image et garde exactement ce style."
  ```
  Ne jamais envoyer `.env` ni de données privées à Codex.

Règles qui ont évité les plus gros reproches en production :
- **Tenue canonique** : une fois le personnage choisi, décrire sa tenue en une phrase précise (vêtements, couleurs, accessoires, côté de la montre…) et la recopier mot pour mot dans **chaque** consigne d'image suivante. Joindre la fiche du personnage en référence.
- **Décor de base** : une image par décor, avec le personnage dedans, cadrage vertical 9:16, visage dans le rectangle central (la grille du profil coupe en 3:4). Tous les gestes du décor partiront de cette image : c'est ce qui rend les raccords invisibles.
- **Pas de mascotte de marque ni de logo**, même retouchés : les acolytes (IA, animal, objet…) sont des personnages originaux.
- Un âge, un lieu de vie et un métier cohérents avec le public visé (une chambre « d'ado » pour une adulte freelance a été refusée).

## 3. La bible
Écrire `serie/bible.md` : chaque personnage (âge, métier, caractère, tenue canonique, ce qu'il ne dit jamais), chaque émission (sujet, décor, durée, arc), les règles de ton, l'appel à l'action autorisé, ce qui est interdit. Elle sert de garde-fou à chaque épisode : en cas de doute, la bible gagne.

## 4. serie.json
Partir de `${CLAUDE_PLUGIN_ROOT}/modele/serie.json` et suivre `../serie-animee/references/formats.md`.
- **Voix** : l'utilisateur écoute des voix dans la bibliothèque ElevenLabs (https://elevenlabs.io → Voices) et donne l'identifiant de celle qu'il retient pour chaque personnage. Faire écouter un essai avant de valider (une réplique type, par `outils/voix.mjs` via un petit appel, ou dans l'interface ElevenLabs).
- **Couleurs** : une par personnage (nom au-dessus du sous-titre), une par émission (bandeau), la couleur du mot prononcé (`motActif`) qui tranche sur toutes les scènes.
- **Places des acolytes** (`decors.<décor>.acolytes`) : en pixels sur l'image 1080 × 1920, `x` centre horizontal, `y` pieds, `h` hauteur. Les relever sur l'image de base avec une grille, et vérifier sur une image composée avant de valider.
- `phraseBouche` : une phrase naturelle de 10 secondes, dans la langue et le ton du personnage principal.

Puis lancer `outils/police.mjs` (voir skill **installer**, étape 5) et proposer le skill **bibliotheque**.
