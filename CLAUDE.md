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
- `js/params.js` — tous les paramètres fiscaux (ne pas modifier sans source officielle)
- `js/calculator.js` — moteur de calcul pur (étapes 1 à 11), pas de DOM ici
- `js/app.js` — lecture des inputs, affichage des résultats, navigation onglets
- `css/styles.css` — mise en forme
- `index.html` — structure HTML complète avec les 3 onglets

## Paramètres fiscaux vérifiés (sources officielles)
- Barème : 11 600 / 29 579 / 84 577 / 181 917 à 0% / 11% / 30% / 41% / 45%
  Source : BOI-IR-LIQ-20-10 du 07/04/2026
- QF plafond : 1 807 €/demi-part, parent isolé 1er enfant 4 262 €
  Source : BOI-IR-LIQ-20-20-20 du 07/04/2026
- Décote : célibataire 897 € (seuil 1 982 €), couple 1 483 € (seuil 3 277 €), taux 45,25 %
  Source : BOI-IR-LIQ-20-20-30 du 07/04/2026
- PS : 18,6 % mobilier (dividendes/PV), 17,2 % foncier — Source : LFSS 2026 art. 12
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
- Revenus fonciers (nu, meublé, micro-foncier) — `det.psFoncier`
→ Somme dans `det.psRole` ; **seul `psRole` entre dans `det.impotNet`**.

`det.totalPS = psSource + psRole` est conservé pour afficher la charge fiscale globale,
mais ne doit jamais être additionné à l'IR (sinon double comptage).

## Crédits d'impôt automatiques (acomptes prélevés à la source)
- **PFNL AV** (`det.pfnlAV` = `av75 × 7,5 % + av128 × 12,8 %`) : auto-imputé.
  Le différentiel `pfnlAV − irAV` est restitué (ex : 4 600 × 7,5 % = 345 € pour single).
- **PFNL mobilier 2CK** (acompte 12,8 % sur dividendes/intérêts prélevé par la banque) :
  **PAS auto-imputé aujourd'hui** — l'utilisateur doit le saisir manuellement via `input.pfnlVerse`.
  Limitation connue : usage normal ⇒ surestimation de l'IR si l'utilisateur saisit
  les dividendes/intérêts sans saisir aussi le 2CK correspondant.
  Symétrie possible avec `pfnlAV` : auto-calculer `(div + int) × 0,128` et l'imputer.

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
