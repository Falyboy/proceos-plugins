# Formats lus par le moteur

Image finale : 1080 × 1920, 30 images/s. Coordonnées en pixels sur cette image.

## serie/serie.json

| Champ | Obligatoire | Rôle |
|---|---|---|
| `personnages` | oui | `{ "<lettre>": { "nom": "ALICE", "voix": "<id voix ElevenLabs>", "couleur": "#FFFFFF" } }`. La lettre sert dans les épisodes (`q`). `nom` s'affiche au-dessus du sous-titre, dans `couleur`. |
| `parleur` | non | Lettre du personnage principal (bouche animée, bulles à droite sur l'écran vivant). Défaut : le premier personnage. |
| `phraseBouche` | non | Phrase naturelle (≈ 10 s) dite par le personnage principal pour fabriquer ses bouches. |
| `acolytes` | non | `{ "<lettre>": { "sprite": "bip" } }` : personnages posés par-dessus la scène, images `serie/acolytes/<sprite>-<pose>.png`. |
| `motActif` | non | Couleur du mot prononcé dans les sous-titres. Défaut `#FFE14D`. |
| `emissions` | oui | `{ "<lettre>": { "nom": "MON ÉMISSION", "couleur": "#FF6500" } }` : bandeau et couverture. |
| `decors` | oui | Un objet par décor, voir ci-dessous. |
| `bruitages` | non | `{ "pop": "sons/pop.mp3" }`. Défaut : chaque `serie/sons/<nom>.mp3` hors ambiances. |

### Un décor (`decors.<nom>`)

| Champ | Rôle |
|---|---|
| `appareil` | Cadre du panneau d'explication : `ordi`, `telephone` ou `tablette`. |
| `acolytes` | Places des acolytes : `{ "<lettre>": { "x": centre, "y": pieds, "h": hauteur } }`. |
| `clips` | Dossier des gestes, relatif à `serie/scenes/`. Défaut `<décor>/animations`. |
| `ambiance` | Fichier d'ambiance relatif à `serie/`. Défaut `sons/ambiance-<décor>.mp3` (sinon silence). |
| `ambianceConsigne` | Description en anglais de l'ambiance, utilisée par `sons.mjs`. |
| `titreCouv` | `"haut"` quand les visages sont au milieu du plan : le titre de la couverture passe en haut. |
| `stPanneau` | Plans serrés : y du haut des sous-titres quand un panneau est ouvert (police réduite), pour ne pas couvrir le visage. |
| `ecran` | Écran vivant : `{ "couleur": [r, g, b], "depart": [x, y] }`, couleur unie de l'écran du décor et un point dedans. La conversation s'y écrit mot à mot ; seuls les pixels de cette couleur sont repeints, la tête reste devant. |

## serie/episodes/<id>.json

| Champ | Rôle |
|---|---|
| `id` | `AAAA-MM-JJ-sujet`, aussi nom du dossier de sortie. |
| `date` | Texte libre (date et heure de publication prévues). |
| `emission`, `numero` | Lettre de l'émission, numéro de l'épisode dans l'émission (bandeau, couverture). |
| `scene` | Nom du décor. |
| `titre` | Deux lignes de couverture : `["Ligne 1", "ligne 2"]`. |
| `couverture` | `{ "clip": "<geste>", "t": <seconde> }` : image du geste prise pour la couverture. |
| `panneaux` | `{ "<id>": { "type": …, "titre": … } }`, voir ci-dessous. |
| `lignes` | Répliques dans l'ordre. |

### Une réplique
`{ "q": "A", "t": "Texte dit.", "clip": "tape", "n": { "B": "joie" }, "pan": "etapes", "sfx": "pop" }`
- `q` : qui parle ; `t` : le texte (sous-titres mot à mot, voix) ; `clip` : nom du geste (fichier `<clip>.mp4`).
- `n` : acolytes visibles et leur pose ; celui qui parle flotte plus fort. Absent : aucun acolyte.
- `pan` : panneau ouvert pendant la réplique ; plusieurs répliques de suite avec le même `pan` le gardent ouvert.
- `sfx` : bruitage au début de la réplique.

### Les panneaux
| `type` | Champs |
|---|---|
| `liste` | `items: [["texte", null \| "ok" \| "non"], …]` (puce, coche verte, croix rouge) |
| `prompt` | `texte` : une consigne affichée dans un cadre |
| `schema` | `etapes: ["…", "…"]` : boîtes reliées par des flèches |
| `site` | `titre`, `citation`, `auteur`, `barre` (auteur barré), `tag` |
| `chat` | `bulles: [["QUI", "texte"], …]`, `gauche` (qui est à gauche, défaut le premier) |
| `images` | `images: [["chemin.png", "légende"], …]` (2 à 4), `entoure` (indice), `choix: true` (un cadre hésite d'une case à l'autre puis se pose sur `entoure`) |
| `image` | `f` (chemin), `cercle: { x, y, r }` en proportions de l'image |
