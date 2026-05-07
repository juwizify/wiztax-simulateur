# Bugs détectés via la grille de validation manuelle

Fichier de tracking des écarts entre wiztax-simulateur et impots.gouv.fr identifiés au fil des cas de [`manual-validation-cases.md`](manual-validation-cases.md).

Format : un bug = une section. Statut : `Open` / `Fix proposé` / `Corrigé`.

---

## #1 — PER : plafond de déduction calculé au niveau foyer au lieu d'individuel

**Statut** : Open
**Détecté sur** : Cas 2 (couple marié, salaires 42 000 € + 31 000 €)
**Sévérité** : impacte tous les couples qui versent sur PER.

### Symptôme observé
Le wiztax affiche un plafond déductible de **7 300 €** pour le foyer.
Le plafond correct devrait être **9 420 €** : aucun des deux conjoints n'atteint individuellement 4 710 € de plafond proportionnel (10 % × 42 000 = 4 200 ; 10 % × 31 000 = 3 100), donc chacun se retrouve au plancher de 4 710 €. La somme est 4 710 + 4 710 = **9 420 €**.

### Cause dans le code
[`js/calculator.js:170-181`](../js/calculator.js#L170)

```js
const revenuPro = input.sal1 + input.sal2 + …   // bloc unique foyer
det.perCap = …
  : (revenuPro > 0
      ? Math.max(P.plafonds.perPlancher, Math.min(revenuPro * P.plafonds.perTaux, P.plafonds.perMaxSalarie))
      : P.plafonds.perPlancher);
```

Le plafond est calculé sur la **somme des revenus pro du foyer**, avec un seul plancher 4 710 €. Conséquence : pour le cas 2, `73 000 × 10 % = 7 300 €` > plancher, donc le résultat est 7 300 €. Le plancher individuel des deux conjoints est perdu.

### Règle fiscale (rappel)
Article 163 quatervicies CGI — chaque membre du foyer fiscal calcule **son propre** plafond :
- Plafond individuel = `max(plancher, min(revenu_pro_perso × 10 %, max_salarié))`
- Plancher = 10 % du PASS N-1 (4 710 € pour 2025)
- En cas de mutualisation entre conjoints (case spécifique sur la déclaration), les plafonds individuels s'additionnent.

### Fix proposé
Calculer `perCap1` et `perCap2` séparément à partir des revenus pro de chaque déclarant, puis sommer (mutualisation considérée par défaut, comme la déclaration en ligne).

```js
const revenuPro1 = input.sal1 + input.bncMicro1 + input.bncReel1 + … ;
const revenuPro2 = input.sal2 + input.bncMicro2 + input.bncReel2 + … ;
const perCap1 = Math.max(P.plafonds.perPlancher, Math.min(revenuPro1 * P.plafonds.perTaux, P.plafonds.perMaxSalarie));
const perCap2 = isCouple
  ? Math.max(P.plafonds.perPlancher, Math.min(revenuPro2 * P.plafonds.perTaux, P.plafonds.perMaxSalarie))
  : 0;
det.perCap = perCap1 + perCap2;
```

À vérifier : composition exacte de `revenuPro` (faut-il inclure les pensions ? les heures sup exonérées ?). Re-lire la définition « revenus d'activité » de l'art. 163 quatervicies.

### Fichiers à modifier
- `js/calculator.js` (étape PER)
- `tests/cases.js` ou `tests/run.js` — ajouter un cas dirigé reproduisant exactement le scénario du Cas 2

---

## #2 — PS sur dividendes & intérêts exclus à tort de l'impôt à payer

**Statut** : Corrigé (commit suivant) — à valider en navigateur sur le Cas 7
**Détecté sur** : Cas 7 (investisseur PFU)
**Sévérité** : élevée — touche tous les cas avec dividendes ou intérêts. Sous-estime systématiquement l'impôt à payer.

### Symptôme observé
Cas 7 — Décalage de **1 711 €** côté wiztax sur le total impôt à payer vs simulateur officiel impots.gouv :
- (8 000 dividendes + 1 200 intérêts) × 18,6 % = **1 711,20 €**
- Le wiztax ne les inclut nulle part dans `det.impotNet`.
- Le simulateur officiel les inclut bien dans le total à payer (PV mobilière comptée à 18,6 % côté wiztax = OK, écart isolé sur dividendes + intérêts).

### Cause dans le code
[`js/calculator.js:300-309`](../js/calculator.js#L300) classe les PS en deux catégories :

```js
// PS prélevés à la source (info uniquement, n'entrent pas dans l'impôt dû)
det.psDividendes = input.dividendes * P.ps.mobilier;
det.psInterets   = (input.interets || 0) * P.ps.mobilier;
det.psAV         = avProduits * P.ps.foncier;
det.psSource     = det.psDividendes + det.psInterets + det.psAV;
// PS recouvrés via avis (intégrés à l'impôt à payer)
det.psPV = input.pv * P.ps.mobilier;
det.psFoncier = …;
det.psRole    = det.psPV + det.psFoncier;
```

Et [`calculator.js:444`](../js/calculator.js#L444) n'injecte dans `impotNet` que `psRole` (PV + foncier). Donc `psDividendes` et `psInterets` n'entrent **jamais** dans l'impôt calculé.

Le commentaire d'en-tête de l'étape 7 et le `CLAUDE.md` du projet documentent ce choix explicitement : « EXCLUS de l'avis IR ». **Le choix est faux pour les dividendes/intérêts.**

### Règle fiscale réelle (revenus 2025, déclaration 2026)
- L'**AV > 8 ans** (cas 5) : le PFNL prélevé à la source par l'assureur (IR + PS) est **automatiquement imputé** par le simulateur officiel via le mécanisme d'abattement. L'utilisateur ne saisit rien d'autre que le brut.
- Les **dividendes (2DC) et intérêts (2TR)** : le PFNL prélevé par la banque n'est **PAS auto-imputé**. L'utilisateur doit le saisir **manuellement en case 2CK** — et **2CK ne couvre que la part IR (12,8 %)**, pas la part PS (17,2 %, ou 18,6 % LFSS 2026 selon scope). La part PS est donc bien **due** côté impôt et apparaît dans le total à payer.

→ Le wiztax a appliqué la logique AV à tort sur les RCM. Le 2CK que l'utilisateur saisit dans `pfnlVerse` couvre déjà la restitution IR ; les PS doivent en plus passer dans `psRole`.

### Fix proposé
Reclasser `psDividendes` et `psInterets` du panier `psSource` vers le panier `psRole` :

```js
// PS prélevés à la source mais NON imputés automatiquement par le simulateur
// officiel (≠ AV) : bien dus côté impôt à payer.
det.psPV       = input.pv * P.ps.mobilier;
det.psFoncier  = …;
det.psDividendes = input.dividendes * P.ps.mobilier;
det.psInterets   = (input.interets || 0) * P.ps.mobilier;
det.psRole = det.psPV + det.psFoncier + det.psDividendes + det.psInterets;

// AV : seul cas où les PS sont effectivement libératoires côté avis IR
det.psAV    = avProduits * P.ps.foncier;
det.psSource = det.psAV;     // info uniquement
```

Conserver l'AV (`psAV`) en `psSource` (le wiztax était correct sur ce cas).

### Vérification après fix (Cas 7)
- `psRole` = 15 000 × 18,6 % (PV) + 8 000 × 18,6 % (div) + 1 200 × 18,6 % (int) = 2 790 + 1 488 + 223,2 = **4 501,20 €**
- Doit matcher la ligne « Prélèvements sociaux » du simulateur officiel.

### À corriger en parallèle
- Libellés UI [`js/app.js:220-225`](../js/app.js#L220) : déplacer « PS dividendes » et « PS intérêts » du sous-total source vers le sous-total avis IR.
- `CLAUDE.md` du projet, section « Mode de recouvrement des prélèvements sociaux » : la doc actuelle dit l'inverse de la réalité fiscale, à réécrire après fix.
- `tests/cases.js` : ajuster les valeurs attendues sur tous les cas avec dividendes/intérêts.

### Question latérale (à trancher séparément)
Le wiztax applique 18,6 % aux PS mobilier (`P.ps.mobilier = 0.186`) — taux LFSS 2026. Le simulateur officiel impots.gouv utilisé pour la confrontation applique aussi 18,6 % selon l'observation utilisateur (à vérifier — les revenus 2025 devraient en théorie rester à 17,2 %, mais il est possible que le simulateur officiel applique déjà 18,6 % par anticipation). **Pour l'instant on garde 18,6 % puisque les deux moteurs s'accordent dessus.** Si on veut clarifier le scope (revenus 2025 vs 2026), c'est un sujet à part.

---

## #3 — PS foncier / LMNP à 17,2 % au lieu de 18,6 %

**Statut** : Corrigé (commit `e39d7f1`) — à valider en navigateur sur le Cas 9
**Détecté sur** : Cas 9 (LMNP)
**Sévérité** : tous les cas avec foncier nu, micro-foncier, LMNP.

### Symptôme observé
PS foncier / LMNP affichées à 17,2 % côté wiztax alors que le simulateur officiel impots.gouv applique 18,6 % (cohérent avec le taux mobilier post-CFA LFSS 2026).

### Cause
[`js/params.js:57-62`](../js/params.js#L57) : `P.ps.foncier = 0.172` était utilisé à la fois pour les revenus fonciers/LMNP **et** pour les produits AV. Or :
- AV > 8 ans : non concernée par la CFA — **17,2 %** correct.
- Foncier / LMNP : la CFA s'applique — **18,6 %**.

### Fix appliqué
- Nouveau paramètre `P.ps.av = 0.172`.
- `P.ps.foncier` passe à **0.186**.
- `calculator.js` : `det.psAV = avProduits * P.ps.av`.
- UI app.js : libellé `PS foncier (18,6 %)`.
- 4 expected ajustés dans `tests/cases.js`. 51/51 + 100/100 + 21/21 verts.

### Note de mapping (Cas 9, à part)
Sur le simulateur officiel on saisit **une seule fois** chaque recette LMNP (5NG / 5NH / 5NI). Les cases « base PS » 5NJ/5NK/5NL n'apparaissent que sur la déclaration finale 2042 C PRO et ne doivent pas être saisies dans le simulateur (sinon doublement d'assiette).

---

## #4 — À investiguer : PS LMNP/foncier calculées sur le NET au lieu du BRUT

**Statut** : Open (non confirmé)
**Détecté en relisant** : [`js/calculator.js:306`](../js/calculator.js#L306)

### Hypothèse
`det.psFoncier = Math.max(0, revenusFonciersNets) * P.ps.foncier;` applique les PS sur les montants **nets après abattement** (`meubleClasseNet`, `meubleNonClasseNet`, `autresMeublesNet` — abattements 50 / 30 / 50 %).

Or fiscalement les PS LMNP non-pro doivent être calculées sur les recettes **brutes** (cases 5NJ/5NK/5NL = même montant que 5NG/5NH/5NI). Sur le simulateur officiel impots.gouv, les PS sont calculées sur le brut.

### Impact attendu
Sur Cas 9 (18 000 classé + 9 500 non classé) :
- wiztax actuel : (9 000 + 6 650) × 18,6 % = **2 911 €**
- impots.gouv : (18 000 + 9 500) × 18,6 % = **5 115 €**
- Écart = **2 204 €**

À confirmer en lançant le Cas 9 sur les deux moteurs après le fix bug #3.

### Si confirmé, fix
Calculer `psFoncier` sur les recettes brutes plutôt que sur les nets. Conserver le micro-foncier nu sur le net (où abattement 30 % et PS sur revenu net me paraît être la règle — à revérifier avec une source officielle).

