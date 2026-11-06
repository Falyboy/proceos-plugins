// Affiche le solde de crédits kie.ai de l'utilisateur. Clé : <projet>/.env (KIE_AI_API_KEY), jamais affichée.
import { cle } from "../cle.mjs";
const CLE = cle("KIE_AI_API_KEY");
if (!CLE) { console.log("KIE_AI_API_KEY absente du .env du projet"); process.exit(1); }
const d = await (await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: { Authorization: "Bearer " + CLE } })).json();
console.log(d.code === 200 ? `Solde kie.ai : ${d.data} crédits` : `Erreur ${d.code} ${d.msg ?? ""}`);
if (d.code !== 200) process.exitCode = 1;
