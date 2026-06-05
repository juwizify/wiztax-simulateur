## Summary

Refonte interne du simulateur autour d'une **source éditoriale unique** (`LEVIERS_CATALOGUE`) qui alimente dynamiquement les form-rows du Simulateur, les cards de l'onglet Leviers et le pipeline des Préconisations. Sans changement visible côté UX, mais avec **plusieurs corrections fiscales LF 2026** et un **alignement strict** sur le comportement du simulateur officiel impots.gouv.fr.

49 commits — tous tests verts (75 dirigés + 100 oracle + 27 leviers = **202/202**) à chaque étape.

## Why

Au démarrage, l'application présentait quatre dettes :

1. **Sources éclatées** — chaque levier était dupliqué entre `index.html` (form-row), `preconisations.js` (catalogue) et `app.js` (handlers). Tout changement éditorial demandait 3 édits cohérentes — risque d'incohérence silencieuse.
2. **Sémantique incohérente** — pour SOFICA, FIP Corse, GFI, IR-PME, l'utilisateur saisissait l'investissement (cohérent avec sa pratique CGP), mais le moteur traitait la valeur comme une RI directe. Bug latent.
3. **Référentiel LF 2026 partiel** — FCPI classique encore présent (supprimé 21/02/2026), IR-PME modélisé en monobloc alors qu'il est passé à 7 sous-dispositifs (JEI, JEII, JEIR…).
4. **Liens officiels manquants ou faux** — sur les cards de l'onglet Leviers, les permalinks Légifrance/BOFiP collés sans vérification étaient majoritairement cassés (404) ou hors sujet.

## What's in this PR

### A. Architecture — source unique catalogue (≈ 35 % du diff)

- `LEVIERS_CATALOGUE` (`js/preconisations.js`) devient la **source éditoriale unique** pour 24 leviers fiscaux.
- Nouveau générateur `renderSimulateurFormRows(family)` qui produit dynamiquement les form-rows du Simulateur depuis le catalogue. Supporte input simple, input + select empilés (taux variable), sous-champs secondaires (PER plafond manuel, EHPAD nb personnes), cellule de droite custom (PER cap dynamique), visibilité conditionnelle mode simple / complet.
- 24 form-rows du Simulateur sont maintenant générées (vs 0 au début) ; 23 cards de l'onglet Leviers idem.
- Bouton dev **« Surligner catalogue »** : ceinture en magenta les 47 éléments alimentés par le catalogue (badge `catalogue:<id>`). Outil de visualisation interne pour reviewer l'unification.

### B. Corrections fiscales LF 2026 (≈ 25 % du diff)

- **FCPI classique retiré** du moteur, oracle, DOM Calcul détaillé. Note historique LF 2026 conservée pour mémoire.
- **IR-PME × 7 sous-dispositifs** modélisés avec plafonds annuels (50k/100k ou 75k/150k selon variante), plafond partagé JEI + FCPI-JEI, plafond pluri-annuel JEI + JEIR 50 000 € de RI cumulée 2024-2028.
- **Pinel** marqué « dispositif fermé » (LF 2024 art. 168), saisie réservée engagements existants, basculée en `.advanced`.

### C. Sémantique investissement unifiée (≈ 15 % du diff)

Tous les véhicules « cash sortant » (IR-PME, SOFICA, FIP Corse, GFI) suivent maintenant le même pattern : input = montant souscrit, moteur calcule `RI = min(invest, plafond annuel) × taux applicable`.

| Levier | Input | Taux | Plafond invest |
|---|---|---|---|
| IR-PME (× 7) | montant souscrit | 18 / 25 / 30 / 40 / 50 % | 50k/100k (75k/150k JEI) |
| SOFICA | souscription + `soficaTaux` | 30 / 36 / 48 % | min(18k, 25 % RNG) |
| FIP Corse | souscription | 30 % | 12k/24k |
| GFI | souscription | 18 % | 50k/100k |

### D. Sources officielles vérifiées (≈ 10 % du diff)

- **Audit WebFetch systématique** sur 60+ URLs candidates Légifrance/BOFiP/service-public.gouv.fr/impots.gouv.fr.
- **35 liens cliquables** confirmés valides + pertinents conservés dans le catalogue (vs 9 URLs initialement collées sans vérification dont la majorité cassées).
- Audit complet documenté dans [`tasks/audit-liens-officiels.md`](tasks/audit-liens-officiels.md).

### E. Tooltips pédagogiques (≈ 10 % du diff)

- **Jeanbrun** : pédagogie « déficit créé annuel », mécanique 1-2-3 vers déficit foncier, sigles PLS/PLAI décodés.
- **Malraux** : décodage SPR / PSMV / QAD en langage humain.
- **Tous les leviers migrés** : `info` du catalogue enrichi avec cases déclaration, plafonds, exemples chiffrés.

### F. Nettoyage code mort (≈ 5 % du diff)

- Mode `'taux'` retiré d'`appliquerPreconisations` après migration de ses derniers usagers.
- Doc des modes mise à jour.

## Behavior changes

### Pour l'utilisateur du Simulateur

- **Aucun changement de calcul à inputs identiques** sur les leviers non migrés.
- Les **saisies SOFICA / FIP Corse / GFI** ne sont plus interprétées comme des RI directes mais comme des investissements. ⚠️ Migration silencieuse — si un dev a sauvegardé des cas en base avec l'ancienne sémantique, ils donneront des résultats différents après merge. Les tests dirigés couvrent les deux sémantiques explicitement.
- **Pinel** passe en `.advanced` avec tooltip dédié « dispositif fermé ».

### Pour le développeur / intégrateur

- Toute évolution éditoriale (libellé, plafond, tooltip, lien officiel) se fait désormais à **1 seul endroit** : l'entrée correspondante dans `LEVIERS_CATALOGUE`.
- Bouton dev « Surligner catalogue » pour visualisation rapide de l'unification.

### Pour le moteur fiscal

- **PFNL 2CK** : pas d'auto-imputation, conforme au comportement du simulateur officiel impots.gouv.fr. L'utilisateur saisit explicitement `input.pfnlVerse` (case 2CK). `det.pfnl2CKAuto` exposé en INFO uniquement.

## Risk & rollback

### Identifié et traité

- **PFNL 2CK auto-imputation** : tentée en milieu de PR, identifiée comme casse-comportement pour le cas dispense de prélèvement (RFR sous seuil → 2CK = 0), **annulée explicitement** (`revert(D3.14)`). État final identique au comportement pré-session. Rationale documenté dans `js/calculator.js` et `CLAUDE.md`.

### À surveiller

- **Sémantique SOFICA / FIP / GFI** : si un intégrateur a déjà des cas types avec ancienne sémantique RI directe, les valeurs vont diverger. Mitigation : commits D3.2, D3.3 décrivent précisément l'ancien et le nouveau comportement, tests dirigés couvrent les deux semantics.
- **FCPI classique** : champ `fcpi` retiré du moteur. Tout intégrateur passant `input.fcpi` verra son saisie ignorée silencieusement. Cohérent avec le retrait LF 2026 / loi 2026-103.

### Rollback plan

- Revert simple commit par commit (chaque Dxx est atomique et passe tous les tests indépendamment).
- Aucune migration de données — `wiztax-simulateur` est stateless (calculs en mémoire).
- Aucune dépendance externe ajoutée.

## Test plan

### Tests automatisés (déjà verts à chaque commit)
- [x] `node tests/run.js` — 75/75 cas dirigés fiscaux
- [x] `node tests/run100.js` — 100/100 oracle vs moteur sur cas aléatoires
- [x] `node tests/run_leviers.js` — 27/27 leviers catalogue + pipeline préconisations

### Validation manuelle suggérée (à faire post-review)

**6 cas types pour comparaison contre impots.gouv.fr** (revenus 2025, déclaration 2026) :

1. Célibataire, salaire 35 000 € (baseline)
2. Couple, 2 enfants, salaires 45k + 35k
3. TMI 41 %, salaire 110k + dividendes 5k au PFU (vérifier la non-imputation 2CK)
4. Salaire 60k + foncier réel -8k (déficit foncier RG cappé)
5. Salaire 80k + IR-PME 10k investis + don 7UF 1 500 €
6. Couple + 1 enfant : salaires 120k + 80k + PER 15k + emploi à domicile 8k + IR-PME JEI 30k + SOFICA 8k @48 %

**Écart toléré** : ≤ 1 € sur l'impôt net. Au-delà, regarder les détails (décote borderline, plafonnement QF, arrondis).

### Validation visuelle (Preview MCP exécuté en cours de session)
- [x] 5 onglets vivants, contenu OK
- [x] Mode toggle simple/complet préservé
- [x] 24 form-rows Simulateur générées sans régression
- [x] Bouton « Surligner catalogue » fonctionne
- [x] PER plafond dynamique `per-cap-live` mis à jour correctement
- [x] EHPAD multiplie bien le plafond par nbPers

## Reviewer guide

**Si tu n'as que 15 min**, regarde :
1. `js/preconisations.js` — la fonction `renderSimulateurFormRows()` (vers la fin du fichier) et 2-3 entrées du catalogue (`per`, `sofica`, `irPmeJei`).
2. `js/calculator.js` — la zone IR-PME (5 sous-fonctions versXxx + plafonds partagés/pluri-annuels) et la zone PFNL 2CK.
3. `tasks/audit-liens-officiels.md` — méthode + résultats.

**Si tu as 1 h** : ajoute la lecture des commits par groupes (commits préfixés `F*` = architecture catalogue, `D3.*` = migrations levier par levier).

**Si tu veux tout** : `git log --oneline main..HEAD | tac` et tu remontes commit par commit — chacun est atomique, indépendamment testable.

## Hors scope (suivi)

- CI GitHub Actions qui lance les 3 tests à chaque push (anti-régression) — à ajouter dans un commit suivant
- Validation contre impots.gouv.fr sur les 6 cas ci-dessus (utilisateur)
- Arbitrages BOFiP P1 : GFI taux 25 % zone éligible, Malraux cumul 4 ans, Loc'Av intermédiation 20/40 %
- Composantes structurelles (sal, foncier, mobilier, AV…) restent en form-row hardcodée — non concernées par la source unique catalogue (ce ne sont pas des leviers fiscaux)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
