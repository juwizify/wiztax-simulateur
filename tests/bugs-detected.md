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

## #2 — PS mobilier à 18,6 % (LFSS 2026) appliqué sur des revenus 2025

**Statut** : Open
**Détecté sur** : Cas 7 (investisseur PFU)
**Sévérité** : impacte tous les cas avec dividendes / intérêts / PV mobilières.

### Symptôme observé
Décalage sur la ligne « PS dus via avis IR » entre wiztax et le simulateur officiel impots.gouv (déclaration 2026, revenus 2025).

Sur le Cas 7 (PV mobilières 15 000 €) :
- wiztax : 15 000 × 18,6 % = 2 790 €
- impots.gouv : 15 000 × 17,2 % = 2 580 €
- **Écart = 210 €**

L'écart se retrouve aussi sur la ligne info « PS dividendes » et « PS intérêts » (annotées 18,6 % par le wiztax, contre 17,2 % côté banque/IFU pour les revenus 2025).

### Cause dans le code
[`js/params.js:57-62`](../js/params.js#L57)

```js
ps: {
  mobilier: 0.186,  // dividendes, intérêts, PV mob — CSG 10.6% + CRDS 0.5% + sol. 7.5%
  foncier:  0.172,  // foncier, PV immo, AV — CSG 9.2% + CRDS 0.5% + sol. 7.5%
  …
}
```

Le commentaire fait référence à la **CFA introduite par la LFSS 2026** (CSG sur revenus du capital portée de 9,2 % à 10,6 %). Cette mesure s'applique aux revenus perçus à compter du 1er janvier 2026, **pas aux revenus 2025**.

### Incohérence de scope du simulateur
- `CLAUDE.md` ligne 4 : « Simulateur d'impôt sur le revenu français (revenus 2025, déclaration 2026) »
- `js/params.js` ligne 2 : « Projection sur Revenus 2026 (Déclaration 2027) »

Le barème progressif (11 600 / 29 579 / 84 577 / 181 917) correspond à la **LF 2026 sur revenus 2025** (cohérent avec le CLAUDE.md). Seul le taux PS mobilier est anachronique.

### Règle fiscale (rappel — revenus 2025)
| Type de revenu | Taux PS |
|---|---|
| Dividendes, intérêts, PV mobilières | **17,2 %** (CSG 9,2 + CRDS 0,5 + sol. 7,5) |
| Revenus fonciers, AV > 8 ans | **17,2 %** |

Pour les revenus 2026, la LFSS 2026 portera la CSG à 10,6 % via la CFA → 18,6 % sur les revenus du capital. Le wiztax devra alors basculer.

### Fix proposé
Décision à prendre d'abord : **quel millésime simule-t-on ?**

**Option A** — Aligner sur revenus 2025 (cohérent avec CLAUDE.md et la confrontation impots.gouv en cours) :

```js
ps: {
  mobilier: 0.172,   // revenus 2025 — pas encore de CFA
  foncier:  0.172,
  …
}
```

Et corriger l'en-tête de `params.js` (« Projection sur Revenus 2025 (Déclaration 2026) »).

**Option B** — Aligner sur revenus 2026 (garder 18,6 %), mettre à jour le `CLAUDE.md` et le `index.html` pour annoncer clairement le millésime, et accepter qu'on ne pourra plus comparer au simulateur officiel impots.gouv 2026 (qui calcule 2025).

**Option C** — Paramétrable : ajouter un sélecteur d'année fiscale dans l'UI, avec deux jeux de paramètres. Plus lourd, à reporter.

### Fichiers à modifier
- `js/params.js` (taux + en-tête)
- `js/app.js:220-225` (mention « 18,6 % » dans les libellés détail PS)
- `CLAUDE.md` (clarifier le millésime)
- `tests/cases.js` — ajuster les valeurs attendues

