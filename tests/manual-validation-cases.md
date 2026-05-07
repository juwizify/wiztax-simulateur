# Cas de validation manuelle — wiztax-simulateur vs simulateur impots.gouv.fr

**But** : confronter le moteur wiztax au simulateur officiel des impôts pour la déclaration 2026 sur revenus 2025.

**Mode d'emploi**
1. Pour chaque cas, ouvrir simultanément :
   - Le wiztax-simulateur (onglet **Simulateur** complet — `index.html`).
   - Le simulateur officiel : <https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/index.htm> (déclaration sur revenus 2025).
2. Saisir les valeurs dans les deux outils via le tableau.
3. Reporter les résultats dans le bloc « Résultats » et noter l'écart.
4. Si écart > 5 € → noter dans la colonne **Notes** et flagger le cas.

**Conventions**
- Colonne **Case impôts.gouv** = case du formulaire 2042 (et annexes 2044/2074/2042-RICI). Sur le simulateur officiel, ces cases sont accessibles via les pages thématiques (état civil, traitements, revenus mobiliers, charges, réductions/crédits).
- Colonne **Champ wiztax** = `id` HTML de l'input (utile pour vérifier en console / debug).
- Aucune valeur d'impôt « attendue » n'est calculée ici : c'est volontaire — on compare deux moteurs sur les mêmes inputs.

---

## Rappel des cases « foyer » (page état civil 2042)

| Donnée | Case |
|---|---|
| Marié·e | **A** |
| Pacsé·e | **B** |
| Célibataire | **C** |
| Divorcé·e / séparé·e | **D** |
| Veuf·ve | **E** |
| Enfants à charge exclusive | **F** (= nombre) |
| Enfants en résidence alternée | **H** (= nombre) |
| Enfants invalides à charge | **G** (= nombre) |
| Enfants invalides résidence alternée | **I** (= nombre) |
| Parent isolé | **T** (case à cocher) |
| Conjoint invalide | **P** |
| Vous êtes invalide | **L** |
| Anciens combattants > 74 ans | **W** / **S** |

---

## Cas 1 — Célibataire au SMIC (zéro impôt + décote)

**But** : vérifier la décote et le seuil de non-imposition.

**Foyer** : célibataire (case C), 0 enfant.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire net imposable | 21 600 € | **1AJ** | `sal1` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

---

## Cas 2 — Couple marié, 2 enfants, classe moyenne

**But** : foyer standard avec mix crédits d'impôt (garde + emploi à domicile + dons).

**Foyer** : marié·e (case A), 2 enfants à charge (case **F = 2**) → 3 parts.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire déclarant 1 | 42 000 € | **1AJ** | `sal1` |
| Salaire déclarant 2 | 31 000 € | **1BJ** | `sal2` |
| Garde enfant < 6 ans (un seul enfant concerné) | 2 200 € | **7GA** (1er enfant) | `gardeEnfants` |
| Emploi salarié à domicile (femme de ménage) | 1 500 € | **7DB** | `emploiDomicile` |
| Dons d'intérêt général (Croix-Rouge) | 200 € | **7UF** | `dons` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

---

## Cas 3 — Famille nombreuse, 5 enfants (plafonnement QF)

**But** : déclencher le plafonnement du quotient familial (avantage parts > 1 807 €/demi-part).

**Foyer** : marié·e (case A), 5 enfants à charge (case **F = 5**) → 5 parts (2 + 0,5 × 2 + 1 × 3).

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire déclarant 1 | 90 000 € | **1AJ** | `sal1` |
| Salaire déclarant 2 | 45 000 € | **1BJ** | `sal2` |
| Nb enfants au collège | 2 | **7EA** | `fraisScolCollege` |
| Nb enfants au lycée | 1 | **7EC** | `fraisScolLycee` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

→ **À vérifier spécifiquement** : ligne « Plafonnement QF » dans wiztax doit afficher un montant > 0.

---

## Cas 4 — Parent isolé avec 2 enfants

**But** : majoration parent isolé (+ 0,5 part au 1er enfant) et plafond QF spécifique (4 262 €).

**Foyer** : divorcé·e (case D), parent isolé (case **T cochée**), 2 enfants à charge (case **F = 2**) → 2,5 parts.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire | 36 000 € | **1AJ** | `sal1` |
| Pension alimentaire reçue (ex-conjoint) | 4 800 € | **1AO** | `pensAlimRecue1` |
| Garde enfant < 6 ans | 1 200 € | **7GA** (1er enfant) | `gardeEnfants` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

---

## Cas 5 — Retraité veuf avec assurance-vie > 8 ans

**But** : abattement 10 % pensions, fiscalité préférentielle AV (taux 7,5 % + abattement 4 600 €).

**Foyer** : veuf (case E), 0 enfant → 1 part.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Pension de retraite | 28 000 € | **1AS** | `pen1` |
| Produits AV > 8 ans, PFL 7,5 % prélevé à la source (encours < 150 k€) | 6 000 € | **2DH** | `avProduits75` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

→ **À vérifier** : sur impots.gouv, l'abattement de 4 600 € (célibataire/veuf) sur les produits AV s'applique automatiquement. Le wiztax doit l'appliquer aussi.

---

## Cas 6 — Profession libérale BNC réel + PER massif

**But** : régime déclaratif contrôlé, déductibilité PER, majoration non-AGA.

**Foyer** : marié·e (case A), 1 enfant à charge (case **F = 1**) → 2,5 parts.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| BNC réel déclarant 1 (adhérent OGA/AGA) | 95 000 € | **5QC** | `bncReel1` |
| Salaire déclarant 2 | 38 000 € | **1BJ** | `sal2` |
| Versement PER déclarant 1 | 8 500 € | **6NS** | `per` |
| Pension alimentaire versée (parents âgés, 1 bénéf.) | 6 000 € | **6GU** | `pensionsAlim` (et `nbBeneficiairesPA` = 1) |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

→ **Si le contribuable n'est PAS adhérent OGA/AGA**, utiliser **5QI** au lieu de 5QC sur impots.gouv (majoration de 25 % du bénéfice). Le wiztax ne semble pas distinguer — à signaler si écart.

---

## Cas 7 — Investisseur boursier (PFU complet)

**But** : tester le PFU 12,8 % + PS 18,6 %, plus-values mobilières, AV taux 12,8 %.

**Foyer** : célibataire (case C), 0 enfant → 1 part.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire | 65 000 € | **1AJ** | `sal1` |
| Dividendes bruts | 8 000 € | **2DC** | `dividendes` |
| Intérêts (livrets fiscalisés, CAT) | 1 200 € | **2TR** | `interets` |
| Plus-values mobilières (PEA hors, comptes-titres) | 15 000 € | **3VG** | `pv` |
| Produits AV PFL 12,8 % prélevé à la source : <br>• contrat < 8 ans <br>• ou contrat > 8 ans avec encours > 150 k€ | 4 000 € | **2VV** (< 8 ans) <br>**2BH** (> 8 ans, encours > 150 k€) | `avProduits128` |
| Acompte 12,8 % déjà prélevé par la banque sur div + intérêts (PFNL) | 1 178 € *(= (8 000 + 1 200) × 12,8 %)* | **2CK** | `pfnlVerse` |
| Option PFU | Activée (PFU) | (case **2OP** *non cochée*) | `optionPFU` = "PFU" |

**Note 2CK** : on suppose que la banque a appliqué le PFNL forfaitaire de 12,8 % sur dividendes + intérêts. La case 2CK doit être saisie identique des deux côtés (1 178 €) pour que la comparaison soit valide.

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

→ **À vérifier** : ligne « IR mobilier (PFU) » + ligne « PS dus via avis IR » distinctes dans wiztax. Sur impots.gouv, le détail apparaît dans la synthèse.

---

## Cas 8 — Bailleur foncier réel avec déficit imputable

**But** : tester l'imputation du déficit foncier sur revenu global (plafond 10 700 €).

**Foyer** : marié·e (case A), 1 enfant (case **F = 1**) → 2,5 parts.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire déclarant 1 | 45 000 € | **1AJ** | `sal1` |
| Salaire déclarant 2 | 33 000 € | **1BJ** | `sal2` |
| Foncier réel — résultat net après charges et travaux | **− 8 500 €** | **4BC** (déficit imputable RG) | `foncierReel` (saisir `-8500`) |

**Note 4BC** : sur le simulateur impots.gouv, la 2044 ne s'ouvre pas par défaut. Tu peux soit :
- Saisir directement la case **4BC** = 8 500 (montant positif du déficit) si tu veux bypasser la 2044 ;
- Soit remplir une 2044 complète (loyers bruts, charges, intérêts) — plus réaliste mais plus lourd.

Pour comparer **uniquement le moteur fiscal**, l'option **4BC directe** est suffisante.

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

---

## Cas 9 — LMNP : meublé tourisme classé + meublé non classé

**But** : tester les abattements micro-BIC LF 2025 (50 % classé / 30 % non classé) — souvent buggés dans les simulateurs.

**Foyer** : célibataire (case C), 0 enfant → 1 part.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire | 52 000 € | **1AJ** | `sal1` |
| Loyers bruts meublé tourisme classé (gîte) | 18 000 € | **5NG** | `meubleClasse` |
| Loyers bruts meublé tourisme non classé (Airbnb urbain) | 9 500 € | **5NH** | `meubleNonClasse` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | Notes |
|---|---|---|---|---|
| wiztax | … | … | … | |
| impots.gouv | … | … | … | |

→ **À vérifier** : revenu net après abattement = (18 000 − 50 % ×18 000) + (9 500 − 30 % ×9 500) = 9 000 + 6 650 = **15 650 €** ajoutés au RBG.

→ **Sur le simulateur impots.gouv** : ne saisir qu'**une seule fois** chaque recette (5NG ou 5NH). Les cases « base PS » 5NJ/5NK/5NL n'existent que sur la déclaration finale 2042 C PRO ; le simulateur applique automatiquement les PS si tu indiques bien que tu es LMNP non-pro non affilié SSI.

→ **Note** : si tu veux tester un *vrai* LMNP année (locataire principal, abat 50 %, plafond 77 700 €), la case officielle est **5NI**. Le wiztax ne dispose pas de champ dédié — on peut le saisir dans `meubleClasse` (mêmes paramètres) en sachant que le mapping côté impots.gouv change. Hors scope cas 9.

---

## Cas 10 — Très haut revenu : CEHR + niches plafonnées (cas extrême)

**But** : déclencher la CEHR (> 250 k€ célib / 500 k€ couple), tester plafonnement global des niches (10 000 € + 18 000 € majoré), PFU + PV.

**Foyer** : marié·e (case A), 1 enfant (case **F = 1**) → 2,5 parts.

| Donnée | Valeur | Case impôts.gouv | Champ wiztax |
|---|---|---|---|
| Salaire déclarant 1 | 350 000 € | **1AJ** | `sal1` |
| BNC réel déclarant 2 (AGA) | 180 000 € | **5RC** | `bncReel2` |
| Dividendes bruts | 50 000 € | **2DC** | `dividendes` |
| Plus-values mobilières | 30 000 € | **3VG** | `pv` |
| Produits AV > 8 ans, PFL 7,5 % prélevé à la source | 9 200 € | **2DH** | `avProduits75` |
| Option PFU | Activée | (2OP *non cochée*) | `optionPFU` = "PFU" |
| Versement PER | 30 000 € | **6NS** | `per` |
| **Réductions / crédits (niches)** | | | |
| Girardin industriel plein droit | 12 000 € | **7UY** | `girardinPD` |
| SOFICA | 6 000 € | **7GN** | `sofica` |
| Pinel (engagement en cours) | 4 500 € | **7QI** (ou 7QA selon durée/année) | `pinel` |
| Emploi à domicile | 8 000 € | **7DB** | `emploiDomicile` |
| Dons d'intérêt général | 1 500 € | **7UF** | `dons` |
| Groupements forestiers | 2 500 € | **7UN** | `gfi` |

**Résultats à comparer**

| Source | Parts | Impôt net | TMI | CEHR | Niches utilisées | Notes |
|---|---|---|---|---|---|---|
| wiztax | … | … | … | … | … | |
| impots.gouv | … | … | … | … | … | |

→ **À vérifier explicitement** :
- Ligne « CEHR hauts revenus » > 0 dans wiztax.
- Plafonnement niches : Girardin + SOFICA dans le panier majoré 18 k€, le reste dans le panier 10 k€. La ligne « Niches utilisées / plafond » doit montrer la saturation.
- Plafonnement QF déclenché.

---

## Synthèse des écarts

À remplir après les 10 tests pour repérer les patterns.

| Cas | Écart impôt net (wiztax − impots.gouv) | Mécanisme suspect |
|---|---|---|
| 1 | … | |
| 2 | … | |
| 3 | … | |
| 4 | … | |
| 5 | … | |
| 6 | … | |
| 7 | … | |
| 8 | … | |
| 9 | … | |
| 10 | … | |

---

## Notes méthodo

- **Désactiver le PAS / impôt déjà prélevé** sur impots.gouv : sur le simulateur officiel, la « simulation simplifiée » et la « simulation complète » donnent des chiffres équivalents, mais la complète permet de saisir toutes les cases ci-dessus. Préférer la **complète**.
- **Heures supplémentaires exonérées** (1GH/1HH), **pensions d'invalidité** (1AZ/1BZ), **CSG déductible** (6DE) ne sont pas couvertes par les 10 cas — à ajouter si on veut élargir.
- **Régime réel BNC sans AGA** : sur impots.gouv, cases **5QI / 5RI / 5SI** (avec majoration 25 %). Le wiztax ne distingue pas → écart attendu de +25 % sur la base BNC si le test est fait en non-AGA.
