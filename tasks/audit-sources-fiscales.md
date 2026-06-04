# Audit comparatif des 4 sources de vérité fiscale

Date : 2026-06-04
Branche : `wip/ajustements`
Contexte : refactor « source unique de vérité » sous grille Stripe-grade.

## Les 4 sources

1. **`js/params.js`** — objet `PARAMS` (constante autoritaire en théorie)
2. **Onglet « Paramètres fiscaux »** (`index.html` ~1252-1388) — exposition utilisateur des paramètres
3. **Onglet « Leviers fiscaux »** (`index.html` ~1389-1796) — descriptifs métier des dispositifs
4. **Onglet « Préconisations »** (`index.html` ~1095-1252) + `LEVIERS_CATALOGUE` dans `js/preconisations.js`

## Statistiques (sur 23 leviers × ~100 dimensions)

| Statut | % | Sens |
|---|---|---|
| ✓ IDENTIQUE | ~35 % | Cohérent entre toutes les sources |
| ⚠ DIVERGENT | ~15 % | Au moins 2 sources se contredisent (11 cas, 3 à impact moteur direct) |
| ◐ HARDCODÉ | ~20 % | La valeur existe dans PARAMS mais est ré-écrite ailleurs |
| ⊘ ABSENT | ~30 % | Dimension non couverte dans une ou plusieurs sources |

---

## A — Duplications pures à fusionner (◐ HARDCODÉ) — mécanique, sans arbitrage

Liste des valeurs déjà dans PARAMS mais ré-écrites en dur ailleurs. Toutes ces lignes doivent lire PARAMS au lieu de hardcoder.

| Levier | Valeur | Source PARAMS | Sites en dur à corriger |
|---|---|---|---|
| Déficit foncier | cap 10 700 € | `PARAMS.plafonds.deficitFoncierMax` | `preconisations.js:64,435` |
| Jeanbrun | plafonds 8k/10k/12k € | `PARAMS.plafonds.jeanbrunPlafond{Inter,Social,TresSoc}` | `preconisations.js:75-77` |
| Dons 7UD | seuil 2 000 € | `PARAMS.plafonds.dons75Plafond` | `preconisations.js:344` |
| Dons | plafond 20 % RNI | `PARAMS.plafonds.donsPlafondRNI` | `preconisations.js:391` · `calculator.js:342` (ok lit déjà) |
| Emploi à domicile | cap 12 000 € | `PARAMS.plafonds.emploiDomMax` | `preconisations.js:348,408` |
| Garde d'enfants | cap 3 500 € / enfant | `PARAMS.plafonds.gardeEnfantsMax` | `preconisations.js:418` |
| EHPAD | taux 25 % et cap 10 000 €/pers | `PARAMS.plafonds.ehpadTaux`, `ehpadPlafondParPers` | `preconisations.js:346,399` |
| Cotisations syndicales | taux 66 %, plafond 1 % | `PARAMS.plafonds.cotSyndicales{Taux,PlafondPct}` | `preconisations.js:347,426` |
| Niches | plafonds 10 k / 18 k € | `PARAMS.niches.plafond{,Majore}` | `index.html:1233,1238,1241` (HTML statique — à dynamiser via app.js au load) |
| AV ≤ 8 ans | taux IR 7,5 % | **À AJOUTER** dans PARAMS (n'existe nulle part) | `calculator.js:295,297` |
| AV > 8 ans | taux IR 12,8 % | `PARAMS.ps.pfuIr` existe (mais pour mobilier) | `calculator.js:295` |
| SOFICA | plafond assiette 25 % RNG | **À AJOUTER** dans PARAMS | `calculator.js:388` |

→ Tout ça est mécanique : centraliser, faire lire PARAMS partout, tests verts. Pas d'arbitrage requis.

---

## B — Divergences réelles ⚠ — arbitrage requis

### B.1 — Bugs de calcul actuels (impact direct sur la justesse de l'IR)

| # | Levier | Divergence | Proposition d'arbitrage |
|---|---|---|---|
| **B.1.1** | **PS revenus fonciers** | `params.js:60` dit `foncier: 0.186` (18,6 %) — `index.html:1310` affiche 17,2 % en groupant foncier+AV — le **CLAUDE.md projet est aussi obsolète** sur ce point | LFSS 2026 art. 12 a passé le foncier à 18,6 %. **PARAMS et moteur ont raison**. Corriger l'onglet HTML + CLAUDE.md projet (scinder la ligne). |
| **B.1.2** | **IR-PME — taux** | `params.js:113` et préco : **25 %** appliqué uniformément · onglet Leviers (`index.html:1585`) : « 18 % base / 25 à 50 % majoré (ESUS, JEI) » · commentaire préco : « taux boost 2024-2025 » → suggère que 25 % était temporaire | **À vérifier sur BOFiP**. Si en 2026 le taux de base est revenu à 18 %, le moteur sur-estime la RI pour PME classiques. Si 25 % perdure, l'onglet Leviers est incorrect. **Toi à arbitrer**. |
| **B.1.3** | **Loc'Avantages — plafond d'assiette** | `params.js:129` dit `depensesMax: 10000`, appliqué par `calculator.js:432` · `index.html:1566` affirme « Pas de plafond d'assiette spécifique » | **À vérifier sur BOFiP art. 199 tricies**. Probablement le plafond existe (10 000 € soumis au plafond global niches), l'onglet Leviers serait alors la source à corriger. |
| **B.1.4** | **Loc'Avantages — intermédiation locative** | Onglet Leviers : Loc 1 = 15 %/20 %, Loc 2 = 35 %/40 % (avec/sans intermédiation) · PARAMS + moteur : seulement 15 %, 35 % | Si la dimension « intermédiation » existe légalement, le moteur sous-estime. Ajouter un input `locAvIntermediation: bool` et 2 taux dans PARAMS. **Toi à arbitrer**. |
| **B.1.5** | **GFI — taux zone éligible 25 %** | PARAMS et préco : 18 % unique · onglet Leviers : « 18 % (jusqu'à 25 % selon zone) » | À vérifier sur BOFiP art. 199 decies H. Si 25 % perdure pour 2026, ajouter à PARAMS. **Toi à arbitrer**. |
| **B.1.6** | **Emploi à domicile — plafond majoré 15 000 €** | Info préco mentionne « 12 000 € (15 000 € avec majoration enfants) » · PARAMS et moteur : cap unique 12 000 € | Le plafond majoré existe légalement (art. 199 sexdecies). Le moteur sous-estime le crédit pour foyers avec enfants. **À ajouter à PARAMS et au moteur**. |
| **B.1.7** | **Déficit foncier doublé 21 400 €/an** | Onglet Leviers : « Plafond doublé pour rénovation énergétique DPE E/F/G — 21 400 €/an jusqu'au 31 déc. 2027 (LF 2026) » · Absent de PARAMS, moteur, préco | Si en vigueur, **à ajouter**. Vérifier LF 2026 article. **Toi à arbitrer**. |

### B.2 — Dispositifs documentés mais pas modélisés

| # | Dispositif | État |
|---|---|---|
| **B.2.1** | **Denormandie** | Fiche complète onglet Leviers (`index.html:1443-1456`) · absent calculator + préco. À ajouter au moteur OU étiqueter « non simulé » dans la fiche. |
| **B.2.2** | **Monuments Historiques** | Fiche complète onglet Leviers (`index.html:1526-1541`) · absent calculator + préco. Idem. |
| **B.2.3** | **FCPI classique** | Toujours accepté en calcul (`calculator.js:393,418,442`) · onglet Leviers déclare « Supprimé au 21/02/2026 » · absent du catalogue préco. Soit ajouter un garde « pas de RI sur souscriptions ≥ 21/02/2026 », soit conserver pour rétro-compat avec note explicite. |
| **B.2.4** | **SOFICA — taux 48 %** | Présent PARAMS + préco · absent onglet Leviers (qui n'affiche que 30 %/36 %). Compléter la fiche levier. |
| **B.2.5** | **Pinel** | `input.pinel` lu par le moteur, niche10 sans cap V1 (fermé fin 2024) · absent onglet Leviers + catalogue préco. Préco indique le calcul est INCORRECT pour Pinel (`preconisations.js:13-18`). À traiter : soit retirer du moteur, soit reconnaître + cap correct. |

### B.3 — Coquilles éditoriales / libellés

| # | Coquille | Correction |
|---|---|---|
| **B.3.1** | Déficit foncier : `index.html:1511` dit « Art. 156 II CGI » | Doit être « Art. 156-I-3° CGI » (156-II = pensions alimentaires) |
| **B.3.2** | Libellé PER divergent dans 3 sources (« PER — plafond de déduction » / « PER — Plan d'Épargne Retraite » / « PER (Plan d'Épargne Retraite) ») | Harmoniser sur **une seule formulation** lisible par PARAMS via une clé `label` |
| **B.3.3** | Libellé Jeanbrun divergent dans 3 sources | Idem |
| **B.3.4** | Libellé Déficit foncier divergent | Idem |
| **B.3.5** | Libellé Cot. syndicales divergent | Idem |

---

## C — Sources / références manquantes (⊘)

- **AV > 8 ans** : aucune référence CGI exposée (art. 125-0 A présent en commentaire `params.js:51` seulement)
- **Jeanbrun** : art. 47 LF 2026 absent de params + onglet Paramètres
- **GFI, FCPI JEI, FIP Corse** : sources CGI absentes onglet Paramètres + préco
- **Malraux** : plafond pluriannuel 400 000 €/4 ans absent de PARAMS + moteur
- **EHPAD, Garde enfants, Emploi domicile, Frais scolarité, Pensions alimentaires, Cot. syndicales** : pas de fiche dédiée dans l'onglet Leviers
- **SOFICA** : pas de ligne dans l'onglet Paramètres
- **Barème, CEHR** : pas de fiche dans l'onglet Leviers (acceptable car ce ne sont pas des dispositifs de réduction)

---

## Cible architecturale (après refactor complet)

```
PARAMS (js/params.js)
  └── { plafonds, niches, ps, barème, dispositifs: { per, dons, sofica, ..., libelles: {...} } }
       ▲                                                    ▲
       │ lit                                                │ lit
       │                                                    │
   calculator.js              LEVIERS_CATALOGUE      onglet Paramètres HTML     onglet Leviers HTML
                              (preconisations.js)    (généré via app.js)        (généré via app.js)
```

Plus aucune valeur fiscale en dur dans `app.js`, `preconisations.js`, ni les onglets HTML. Tout transite par PARAMS, qui devient l'**unique** source de vérité. Une mise à jour de barème = 1 fichier touché.

---

## Plan d'attaque proposé

**Pré-requis** : Phase 1 (unification `getInputs` / `getInputsSimple`) — indépendante, peut passer avant ou après.

**Phase 2a — Mécanique (◐)** : centraliser dans PARAMS les valeurs hardcodées identifiées dans la section A. ~12 fusions. Tests verts à chaque commit.

**Phase 2b — Bugs de calcul (⚠ B.1)** : arbitrer ensemble les 7 cas qui impactent la justesse de l'IR. Corriger source par source, ajouter test dirigé pour chaque cas corrigé.

**Phase 2c — Dispositifs non modélisés (⚠ B.2)** : décider lesquels modéliser maintenant, lesquels étiqueter « informatif uniquement ».

**Phase 2d — Coquilles (⚠ B.3)** : harmonisation des libellés via un `dispositifs.{id}.label` central dans PARAMS.

**Phase 2e — Compléments (⊘)** : ajouter les sources CGI manquantes + fiches leviers manquantes (EHPAD, garde, etc.).
