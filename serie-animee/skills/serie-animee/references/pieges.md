# Pannes déjà rencontrées et leur solution

Toutes sont déjà traitées par le moteur. Les connaître évite de « réparer » ce qui marche.

| Symptôme | Cause | Solution (dans le moteur) |
|---|---|---|
| Le personnage se tourne puis « saute » au plan suivant | chaque réplique prenait un passage au hasard du clip | plans en aller-retour qui partent et reviennent à la pose de base ; un plan par suite de répliques au même geste |
| Flash à chaque raccord | la 1re image d'un clip Seedance est l'image de départ exacte, plus claire | chaque plan démarre à la 4e image |
| La bouche ne bouge pas | les gestes sont générés bouche fermée | bibliothèque de bouches (lip-sync une fois par geste), montrée seulement pendant les mots |
| L'écran du décor reste vide pendant qu'elle tape | rien n'y était dessiné | écran vivant (`ecran` du décor) : zone retrouvée image par image par sa couleur, conversation écrite mot à mot |
| Image en retard sur la voix en fin d'épisode | durées non multiples d'une image | durées arrondies à 1/30 s, segments en nombre d'images exact |
| Sous-titres superposés | fin du dernier mot non bornée | chaque sous-titre s'arrête quand le suivant commence |
| Sous-titre sur le visage (plan serré) | ligne fixe | `stPanneau` par décor, police réduite |
| Visages coupés sur la grille du profil | couverture recadrée au centre | image descendue, titre placé selon `titreCouv`, contrôle dans le rectangle 3:4 |
| Son qui sature | pic trop haut | limiteur à −1,5 dB |
| Guillemet ou « ! » seul sur une ligne de panneau | coupe sur les espaces insécables | coupe seulement sur les espaces ordinaires |
| kie.ai « The server is busy » pendant des heures | serveur saturé | refus non facturés ; relancer toutes les 10 min ; fabriquer avec ce qui existe |
| Réplique d'un personnage sur un geste où un autre parle | mauvais `clip` | le geste montre toujours la personne qui parle |
| Tenue ou objets qui changent d'une image à l'autre | consignes d'image différentes | tenue canonique recopiée mot pour mot, image de base unique par décor |

Limites qui restent (à dire, pas à cacher) : petites variations à l'intérieur des clips générés (motif d'un mur, teinte de peau), bouche qui suit le rythme de la voix mais pas chaque syllabe.
