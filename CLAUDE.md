# WizTax — Simulateur IR

## Contexte
Simulateur d'impôt sur le revenu français (revenus 2025, déclaration 2026).
Page web statique en HTML/CSS/JS vanilla, hébergée sur GitHub Pages.
Destinée à être intégrée dans un vrai logiciel par un développeur.

**Priorité absolue : justesse des calculs, traçabilité, pas l'UI.**

## Liens
- GitHub : https://github.com/wizify/wiztax-simulateur
- GitHub Pages : https://wizify.github.io/wiztax-simulateur/
- Google Sheet original : https://docs.google.com/spreadsheets/d/1_0rPgviPknM7q37ouvSVIbcXNTeHo__Ys8-4EtG0Wfs/edit

## Structure
- `js/params.js` — **source unique de vérité** des paramètres fiscaux + helpers
  de format `formatPct`/`formatEur`/`formatNum`. NE JAMAIS modifier une valeur
  sans avoir vérifié la source officielle et mis à jour `lastVerified` dans
  `paramsRegistry.js`.
- `js/paramsRegistry.js` — **registre éditorial** : organisation de l'onglet
  Paramètres fiscaux, libellés, sources officielles (URL + référence légale).
  Les VALEURS sont lues depuis PARAMS via les tokens `{{path|fmt}}` — aucun
  chiffre fiscal hardcodé dans ce fichier.
- `js/paramInject.js` — résolveur des tokens `{{path|fmt}}` au DOM ready.
  Aucun nombre fiscal ne doit apparaître en dur dans le HTML / data-tip ;
  toujours passer par un token (ex. `{{ps.foncierNu|pct}}` → « 17,2 % »).
- `js/paramsTab.js` — générateur dynamique des cards de l'onglet Paramètres
  fiscaux depuis `paramsRegistry.js`. L'HTML statique a disparu.
- `js/calculator.js` — moteur de calcul pur (étapes 1 à 11), pas de DOM ici
- `js/preconisations.js` — **catalogue unique des leviers fiscaux** (`LEVIERS_CATALOGUE`).
  Source éditoriale unique consommée par : `renderLeviersOnglet()` (cards onglet
  Leviers fiscaux) + `renderSimulateurFormRows(targetEl, family)` (form-rows
  Simulateur). Tout enrichissement (label, taux, plafond, tooltip, liens, params)
  passe par le catalogue, jamais en HTML statique.
- `js/app.js` — lecture des inputs, affichage des résultats, navigation onglets
- `css/styles.css` — design system + composants. **Banque centrale** : avant
  d'inventer une nouvelle classe, ouvrir l'en-tête du fichier (inventaire
  des composants) et utiliser/étendre l'existant. Spec : `tasks/design-system-spec.md`.
- `index.html` — structure HTML complète avec les 5 onglets
  (Simulateur [toggle mode simple/complet], Calcul détaillé, Préconisations,
  Paramètres fiscaux, Leviers fiscaux). Cf. tasks/option3-fusion-onglets.md
  pour le refactor du Simulateur unique (anciens Simplifié + Complet fusionnés).
  Les form-rows IR-PME / SOFICA / FIP Corse / GFI / Malraux / Loc'Avantages
  sont **générées dynamiquement** depuis `LEVIERS_CATALOGUE` (post-D3.6) ;
  conteneurs `<div id="simXxx"></div>` pour chaque `family`.

## Sémantique des leviers fiscaux (post-D3.x)

Tous les véhicules « cash sortant » du Simulateur utilisent désormais la
**sémantique investissement** : l'utilisateur saisit le montant souscrit (cash),
et le moteur calcule la RI = invest retenu × taux applicable.

| Levier | Input | Taux | Plafond invest |
|---|---|---|---|
| IR-PME (7 variantes) | montant souscrit | 18/25/30/40/50 % selon variante | 50k/100k (75k/150k pour JEI) |
| SOFICA | montant souscrit + soficaTaux | 30/36/48 % | min(18k, 25 % RNG) |
| FIP Corse | montant souscrit | 30 % | 12k/24k |
| GFI | montant souscrit | 18 % | 50k/100k |
| Malraux | travaux + malrauxZone | 22/30 % | 100k/an |
| Loc'Avantages | dépenses + locAvantagesPalier | 15/35/65 % | 10k/an |

FCPI classique : **retiré au 21/02/2026** (LF 2026 / loi 2026-103). Pinel :
**fermé au 31/12/2024** (LF 2024 art. 168) — saisie réservée aux engagements
existants en `.advanced`. Cf. `tasks/audit-liens-officiels.md` pour le statut
des sources officielles.

## Paramètres fiscaux vérifiés (sources officielles)
- Barème : 11 600 / 29 579 / 84 577 / 181 917 à 0% / 11% / 30% / 41% / 45%
  Source : BOI-IR-LIQ-20-10 du 07/04/2026
- QF plafond : 1 807 €/demi-part, parent isolé 1er enfant 4 262 €
  Source : BOI-IR-LIQ-20-20-20 du 07/04/2026
- Décote : célibataire 897 € (seuil 1 982 €), couple 1 483 € (seuil 3 277 €), taux 45,25 %
  Source : BOI-IR-LIQ-20-20-30 du 07/04/2026
- PS — Source : [service-public.gouv.fr/F2329](https://www.service-public.gouv.fr/particuliers/vosdroits/F2329) (vérifié 2026-06-05) · LFSS 2026 art. 12
  * **18,6 %** mobilier (dividendes/intérêts/PV mobilières) — hausse CSG +1,4 pt
  * **18,6 %** LMNP (BIC art. 35 CGI) — hausse CSG +1,4 pt, rétroactif 01/01/2025
  * **17,2 %** foncier nu (art. 14 CGI) — **maintenu**, pas concerné par la hausse
  * **17,2 %** AV > 8 ans, PV immobilières — maintenus
  * Composition 17,2 % : CSG 9,2 + CRDS 0,5 + Solidarité 7,5
  * Composition 18,6 % : CSG 10,6 + CRDS 0,5 + Solidarité 7,5
  ⚠ Erreur historique : avant PR-I, `ps.foncier` était à 18,6 % en supposant
  une CFA LFSS 2026. La source officielle (vérifiée 06/2026) infirme : seul
  le LMNP a basculé à 18,6 %, le foncier nu reste à 17,2 %. Clés actuelles :
  `ps.foncierNu` et `ps.lmnp` séparées.
- PFU : 12,8 % IR + 18,6 % PS = 31,4 % total
- Niches : 10 000 € général, 18 000 € majoré (Girardin/Sofica)
- Girardin plein droit : 44 % dans le plafond (rétrocession 56%) — art. 200-0 A, 4° CGI
- Girardin avec agrément : 34 % dans le plafond (rétrocession 66%) — art. 200-0 A, 4° CGI

## Mode de recouvrement des prélèvements sociaux
Source : service-public.gouv.fr/F2329, BOI-RPPM, comparaison simulateur officiel impots.gouv.fr.

Deux flux distincts dans le calculator (`calculator.js` étape 7) :

**PS prélevés à la source ET libératoires** (déjà acquittés, EXCLUS de l'avis IR) :
- Produits AV > 8 ans — `det.psAV`
  → Le PFNL bancaire (IR + PS) est imputé automatiquement par le simulateur
    officiel via le mécanisme d'abattement. L'utilisateur ne saisit que le brut.
→ Exposé dans `det.psSource` à titre informatif.

**PS recouvrés via avis IR** (à payer en sus avec l'IR) :
- Dividendes — `det.psDividendes`
- Intérêts — `det.psInterets`
  → Pour les RCM, la banque prélève bien IR + PS à la source, mais le
    simulateur officiel n'auto-impute rien : l'utilisateur doit saisir
    l'acompte IR manuellement en case **2CK** — et 2CK ne couvre **que la
    part IR** (12,8 %). La part PS reste donc due via l'avis IR.
- Plus-values mobilières — `det.psPV`
- Revenus fonciers nu + LMNP — `det.psFoncier` = `det.psFoncierNu + det.psLMNP`
  → **Assiettes PS catégorielles distinctes ET taux distincts** :
    * `det.psFoncierNu` = `(microFoncierNet + foncierReel) × P.ps.foncierNu`
      où `P.ps.foncierNu = 17,2 %` (taux maintenu LFSS 2026 — pas concerné
      par la hausse CSG). Foncier nu = catégorie « revenus fonciers »,
      art. 14 CGI. `foncierReel = max(0, input.foncierReel - jeanbrunAmort)`
      (partie bénéfice uniquement).
    * `det.psLMNP` = `(meubleClasseNet + meubleNonClasseNet + autresMeublesNet) × P.ps.lmnp`
      où `P.ps.lmnp = 18,6 %` (LFSS 2026 art. 12 — CSG portée à 10,6 %).
      LMNP = catégorie BIC, art. 35 CGI.
  → Aucune assiette ne reçoit la composante négative (déficit). Cf. section
    « Déficit foncier — charge pure » plus bas.
→ Somme dans `det.psRole` ; **seul `psRole` entre dans `det.impotNet`**.

`det.totalPS = psSource + psRole` est conservé pour afficher la charge fiscale globale,
mais ne doit jamais être additionné à l'IR (sinon double comptage).

## Déficit foncier — charge pure sur revenu global (modèle PER)
Choix de design « préconisation simple » (cf. justification ci-dessous) :
le champ `input.foncierReel` se sépare en deux branches sémantiques à
l'étape 1 du `calculator.js` :

| `input.foncierReel - jeanbrunAmort` | Sortie moteur | Effet |
|---|---|---|
| **≥ 0** (revenu foncier réel) | `det.foncierReel = ce montant` | Entre dans RBG + assiette PS catégorie foncier nu (art. 14 CGI), 18,6 %. |
| **< 0** (déficit foncier saisi en préconisation) | `det.foncierReel = 0` ; `det.deficitFoncierImputable = min(-fonc, 10 700)` | **Charge pure** déduite du revenu net imposable à l'étape 2 (parallèle au PER). **Aucun effet PS** sur aucune catégorie. **N'affecte pas** les revenus fonciers/LMNP positifs existants. |

Cap : 10 700 €/an partagé avec amortissement Jeanbrun (art. 156-I-3° CGI).
`det.deficitFoncierSurplus` expose l'excédent au-delà du cap pour
l'affichage du warning (UI ne signale pas une erreur silencieuse).

**Justification du choix design** :
1. Sur la déclaration officielle (impots.gouv.fr), un foyer ne peut pas
   à la fois être en régime micro-foncier ET déclarer un déficit foncier
   réel — les deux régimes sont mutuellement exclusifs. La question d'un
   déficit qui « absorberait » des revenus micro positifs ne se pose donc
   pas en pratique.
2. En contexte **préconisation**, recommander à un client d'investir dans
   un dispositif générant du déficit foncier ne doit pas mécaniquement
   modifier la fiscalité de son patrimoine immobilier déjà en place. Le
   simulateur quantifie l'effet IR pur de la préconisation, à parité avec
   les autres charges déductibles (PER, pensions alim, CSG déductible).
3. Conforme à BOI-RFPI-BASE-30-20 §220 : « L'imputation éventuelle des
   dépenses sur le revenu global produit uniquement un effet en matière
   d'impôt sur le revenu et, le cas échéant, de CEHR. Les prélèvements
   sociaux ne sont économisés qu'à proportion des revenus fonciers
   effacés. » Ici aucun revenu foncier n'est effacé par la préconisation,
   donc aucun PS n'est économisé.

Le RFR (étape 11) est ajusté en miroir : `- det.deficitFoncierImputable`
pour refléter l'effet sur l'assiette CEHR (art. 1417-III CGI).

## Crédits d'impôt automatiques (acomptes prélevés à la source)
- **PFNL AV** (`det.pfnlAV` = `av75 × 7,5 % + av128 × 12,8 %`) : auto-imputé.
  Le différentiel `pfnlAV − irAV` est restitué (ex : 4 600 × 7,5 % = 345 € pour single).
  Auto-imputable car prélevé sans possibilité de dispense.
- **PFNL mobilier 2CK** (acompte 12,8 % sur dividendes/intérêts prélevé par la banque) :
  **Saisie manuelle via `input.pfnlVerse`** — choix de design délibéré, conforme
  au comportement du simulateur officiel impots.gouv.fr (l'utilisateur saisit
  explicitement la case 2CK, l'outil ne devine pas). Couvre proprement le cas
  dispense de prélèvement (RFR < 25/50k intérêts, < 50/75k dividendes → banque
  ne prélève rien → aucun 2CK à créditer → l'utilisateur laisse pfnlVerse vide).
  `det.pfnl2CKAuto` exposé en INFO (jamais consommé par le calcul) pour qu'une
  future UI puisse suggérer le montant à l'utilisateur sans l'appliquer.

## Règles importantes
- Ne jamais modifier un paramètre fiscal sans vérifier sur BOFiP ou brochure IR officielle
- Les abattements salaires/BNC/pensions ont des gardes si le revenu = 0 (évite les négatifs)
- Le Google Sheet (SimulateurIR_v2.gs) et cette page doivent rester cohérents
- Tests : `node tests/run.js` (cas dirigés) + `tests/run100.js` (oracle vs calc) + `tests/run_leviers.js` (catalogue préconisations)

## Workflow Git
- Remote : git@github.com:wizify/wiztax-simulateur.git
- SSH configuré (clé ~/.ssh/github_wizify)
- **Ne pas pusher directement sur `main`** : d'autres devs travaillent sur le repo (cf. branche `gsn`).
- Workflow : créer une branche feature locale, commiter, pousser la branche, ouvrir une PR.
- `main` est mis à jour uniquement via PR mergée.
