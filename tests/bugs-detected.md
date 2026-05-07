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

## (Suivants à compléter au fil des cas)
