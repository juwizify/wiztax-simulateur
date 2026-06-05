# Option 3 — Fusion des onglets Simulateur simplifié / complet

Date : 2026-06-04
Branche : `wip/ajustements`
Issue racine : `tasks/audit-sources-fiscales.md` — Axe A (deux DOM séparés sans sync)

## Cause racine adressée

Aujourd'hui, le simulateur a deux onglets de saisie distincts (`#simplifie` et
`#simulateur`) qui maintiennent chacun leur propre set d'inputs DOM (préfixe
`s-` vs sans préfixe). Conséquences :

- L'onglet Préconisations lit le DOM Complet (`getInputs()`) ; une saisie
  utilisateur dans Simplifié n'est jamais propagée au Complet → les
  préconisations calculent sur un input vide → bug perçu « le fix B.1.6
  emploi-domicile ne marche pas » (cf. capture user du 2026-06-04 :
  cap 12 000 € alors que l'utilisateur avait saisi 2 enfants en Simplifié).
- L'onglet Simplifié a un agrégat `s-sal` (total foyer) écrit dans `sal1`
  avec `sal2=0` → bug silencieux pour les couples : l'abattement 10 % est
  capé à 14 555 € au lieu de 14 555 × 2, ce qui sur-estime l'IR.
- Toute évolution future doit penser au maintien des deux sets de champs et
  de leurs sync potentiels — dette structurelle permanente.

## Choix de design validés

- **Un seul formulaire DOM** (tous les inputs natifs du moteur, IDs sans
  préfixe), affiché via une « vue » contrôlée par un toggle.
- **Toggle « Mode simple / Mode complet »** persisté en `localStorage`.
  Mode simple = défaut au premier chargement (cohérent avec le comportement
  actuel : onglet simplifié actif).
- **Mode simple** = même périmètre de champs que l'onglet Simplifié actuel
  (lead magnet pour particuliers, sans agrégat — saisie séparée sal1/sal2).
  Pas de relabeling conditionnel selon le mode.
- **Champs `.advanced`** = cachés en mode simple ET **ignorés dans le
  calcul** (lus comme 0 / valeur neutre par `getInputs`). Leurs valeurs DOM
  sont conservées si l'utilisateur revient en mode complet.

## Architecture cible

```
┌─ Onglet « Simulateur » (unique) ───────────────────┐
│ ┌──────────────────────────────────────────────┐   │
│ │ Toggle [● Mode simple  ○ Mode complet]       │   │
│ │   → toggle ajoute body.mode-simple / .complet│   │
│ │   → persiste localStorage 'wiztax.mode'      │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « A — Situation personnelle »        │   │
│ │   • situation, nbEnfants, gardeAlternee,     │   │
│ │     parentIsole (toujours visibles)          │   │
│ │   • demiPartSupp + demiPartCas (.advanced)   │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « B — Revenus »                      │   │
│ │   • sal1 (toujours), sal2 (toujours)         │   │
│ │   • alloc chômage 1/2 (.advanced)            │   │
│ │   • frais réels 1/2 (.advanced)              │   │
│ │   • heures sup exo 1/2 (.advanced)           │   │
│ │   • pen1/2 (.advanced)                       │   │
│ │   • pensions invalidité (.advanced)          │   │
│ │   • pensions alim reçues (.advanced)         │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « C — BNC » (toujours visible)       │   │
│ │   • bncMicro1 (toujours), bncMicro2 (.adv)   │   │
│ │   • bncReel1/2 (.advanced)                   │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « D — Foncier » (.advanced-section)  │   │
│ │   tout caché en mode simple                  │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « E — Meublé » (.advanced-section)   │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « F — Jeanbrun » (.advanced-section) │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « G — Mobilier »                     │   │
│ │   • dividendes (toujours), optionPFU (tjrs)  │   │
│ │   • intérêts, PV (.advanced)                 │   │
│ │   • AV détaillé 75/128, pfnlVerse (.adv)     │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « H — Charges déductibles »          │   │
│ │   • per (toujours), pensionsAlim (toujours), │   │
│ │     nbBeneficiairesPA (toujours),            │   │
│ │     csgDeductible (toujours)                 │   │
│ │   • perPlafondManuel, autresCharges (.adv)   │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « I — Réductions »                   │   │
│ │   • dons (toujours), pinel (toujours),       │   │
│ │     sofica (toujours)                        │   │
│ │   • dons7UD, girardinPD/AG, fcpi/JEI,        │   │
│ │     fipCorse, gfi, irPme, malraux,           │   │
│ │     locAvantages, autresReductions (.adv)    │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Section « J — Crédits d'impôt »              │   │
│ │   • emploiDomicile (toujours),               │   │
│ │     gardeEnfants (toujours)                  │   │
│ │   • cotSyndicales, fraisScol*, ehpadFrais,   │   │
│ │     autresCredits (.advanced)                │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

Note : la structure visuelle finale est celle de l'onglet « Simulateur
complet » actuel. Le toggle n'est qu'une **vue filtrée** : les sections
restent dans leur ordre, certaines disparaissent en mode simple.

## Champs visibles en mode simple (validation contractuelle)

Liste exhaustive (= ce que voyait l'utilisateur du Simplifié actuel) :
`situation`, `nbEnfants`, `gardeAlternee`, `parentIsole`, `sal1`, `sal2`
(si situation = couple), `bncMicro1`, `dividendes`, `optionPFU`, `per`,
`pensionsAlim`, `nbBeneficiairesPA`, `csgDeductible`, `dons`,
`emploiDomicile`, `gardeEnfants`, `pinel`, `sofica`.

Différence avec le Simplifié actuel : on **gagne** `sal2` (visible si
couple — corrige le bug d'abattement) et on **perd** l'agrégat `s-sal`
(remplacé par sal1+sal2 distincts).

Note sur la visibilité conditionnelle de `sal2` : indépendante du toggle
mode-simple / mode-complet. C'est une logique métier (situation = couple
ou pas) gérée séparément — `sal2` n'est PAS marqué `.advanced`. Si une
logique existante cache déjà `sal2` selon `situation`, elle reste en
vigueur. Sinon, à introduire dans une phase ultérieure (hors scope C1-C5).

## Périmètre de calcul

```js
function getInputs() {
  const simple = document.body.classList.contains('mode-simple');
  const d = defaultInputs();
  const all = readDomInputs();  // lit tous les inputs natifs comme aujourd'hui
  if (!simple) return all;

  // Mode simple : force les champs .advanced à leur valeur neutre.
  // L'utilisateur garde ses saisies DOM (valeurs préservées pour rebascule
  // en complet), mais le moteur calcule comme si ces champs étaient vides.
  const out = { ...all };
  for (const id of advancedFieldIds()) {
    out[id] = d[id];  // valeur neutre de defaultInputs()
  }
  return out;
}
```

`advancedFieldIds()` lit les éléments DOM marqués `.advanced` et
`.advanced-section .form-row` puis dérive leurs IDs. Pas de liste
hardcodée — la source de vérité est le markup.

## Phases d'implémentation

### Phase C1 — Toggle et infrastructure mode (1 commit)

**Fichiers** : `index.html`, `css/styles.css`, `js/app.js`

- HTML : ajout du toggle en haut de l'onglet `#simulateur` (avant les sections)
  ```html
  <div class="mode-toggle" role="radiogroup" aria-label="Mode de saisie">
    <button type="button" class="mode-btn" data-mode="simple">Mode simple</button>
    <button type="button" class="mode-btn" data-mode="complet">Mode complet</button>
  </div>
  ```
- CSS : style du toggle + `body.mode-simple .advanced { display: none; }` (la classe `.advanced` ne sera utilisée qu'à partir de C2)
- JS : helper `getMode()` lit `localStorage.getItem('wiztax.mode') || 'simple'`. Helper `setMode(m)` met à jour `body.classList`, `localStorage`, et appelle `recalculer()`. Listeners sur les boutons.
- **À cette étape, aucun champ n'est encore marqué `.advanced` → le mode n'a aucun effet visible**. C'est intentionnel pour découpler l'infra des contenus.

### Phase C2 — Marquer `.advanced-section` et `.advanced-field` (1 commit)

**Fichiers** : `index.html` uniquement

- Ajouter `class="advanced"` (ou ajouter à `class` existant) sur :
  - Sections complètes : foncier (D), meublé (E), Jeanbrun (F)
  - Lignes individuelles (`.form-row`) dans les sections gardées : champs listés dans l'architecture cible
- Convention : `.advanced` est la classe unique (couvre lignes et sections, via la règle CSS `body.mode-simple .advanced { display: none }`)
- **À cette étape, le mode simple cache visuellement les champs avancés. Le moteur les lit toujours.**

### Phase C3 — `getInputs` filtre selon le mode (1 commit)

**Fichiers** : `js/app.js`

- Modifier `getInputs()` pour, en mode simple, écraser les champs `.advanced` par les valeurs de `defaultInputs()`.
- Méthode de détection des champs avancés : parcourir `document.querySelectorAll('#simulateur .advanced input[id], #simulateur .advanced select[id]')` et dériver les IDs. (NB : l'`#simulateur` ID actuel sera renommé en C4 ; pour C3, on le conserve.)
- Ajouter un cas de test ciblé : avec un foyer mode-simple qui a un `foncierReel` saisi en DOM, vérifier que `det.psFoncier === 0`.

### Phase C4 — Supprimer onglet Simplifié + `s-*` (1 commit)

**Fichiers** : `index.html`, `js/app.js`, `css/styles.css`

- HTML : supprimer le tab-button `data-tab="simplifie"` et le `<div id="simplifie">` complet (lignes 29-229 actuelles). Renommer le tab-button « Simulateur complet » en simplement « Simulateur ».
- JS : supprimer `getInputsSimple()`, `updateResultsSimple()`, et le branchement qui les appelle quand `#simplifie` est actif.
- CSS : supprimer les styles `s-*` si certains existent. Repérer via `grep "s-" css/styles.css`.

### Phase C5 — Mise à jour doc + finitions (1 commit)

**Fichiers** : `CLAUDE.md` projet, éventuellement `js/preconisations.js` pour cohérence d'onglets

- Mettre à jour CLAUDE.md projet : 6 onglets → 5, retrait de la mention « Simulateur simplifié ».
- Mettre à jour `tasks/audit-sources-fiscales.md` ou ajouter une note de résolution Axe A.

## Test strategy

Entre chaque commit :
- `node tests/run.js && node tests/run100.js && node tests/run_leviers.js` — 194/194
- Test visuel localhost :
  - C1 : toggle visible, alterne `body.mode-simple` ↔ `body.mode-complet`, persiste après reload
  - C2 : mode simple cache les sections/lignes attendues, mode complet montre tout
  - C3 : foncierReel saisi en complet, bascule en simple → `det.psFoncier == 0` et l'IR baisse en conséquence
  - C4 : plus d'onglet « Simulateur simplifié » dans la nav, le simulateur fonctionne en simple ET complet
  - C5 : doc à jour

## Validation Stripe-grade (Principe par principe)

- ✓ **#1 Source unique** : un seul DOM, plus de duplication s-X / X.
- ✓ **#2 Factorisation** : `getInputsSimple` supprimé.
- ✓ **#3 Solve by deletion** : suppression nette de ~200 LOC HTML + ~40 LOC JS.
- ✓ **#4 Root cause** : adresse la vraie cause des bugs perçus (input non transmis entre onglets), pas un patch sync.
- ✓ **#5 Documentation** : spec présent, commits expliquent le pourquoi.
- ✓ **#6 Précision** : corrige le bug silencieux d'abattement 10 % sur couples
  en mode simple.
