# `core/` — Le moteur fiscal réutilisable

Ce dossier contient **tout ce dont tu as besoin pour intégrer le calcul d'impôt français dans ton produit**. Aucune dépendance externe (Node + browser vanilla). Aucun build, aucun bundler.

## Les 4 fichiers

| Fichier | Rôle | Quand le toucher |
|---|---|---|
| **`params.js`** | Source unique de vérité des paramètres fiscaux (barème, abattements, plafonds, PS). Chaque valeur est commentée avec sa source légale. | À chaque LF/LFSS (vérifier sources, bumper `lastVerified` dans `paramsRegistry.js`). |
| **`paramsRegistry.js`** | Méta-données éditoriales : organisation, libellés, URL des sources officielles, dates de vérif. Aucune valeur fiscale en dur — référence `PARAMS` via tokens `{{path|fmt}}`. | Quand tu veux changer la présentation des paramètres (onglet démo). |
| **`calculator.js`** | Moteur pur : fonction `calculerIR(input)` qui retourne l'objet `det` avec l'IR net + 250 clés détaillées. Pas de DOM, pas d'effet de bord. | Quand une règle de calcul évolue (étapes 1-11 documentées). |
| **`preconisations.js`** | Catalogue `LEVIERS_CATALOGUE` (PER, IR-PME, SOFICA, Girardin, etc.) + helpers `appliquerPreconisations()` / `avantageEstime()` / `checkPlafond()` / `computeWarnings()`. | Quand un nouveau dispositif fiscal apparaît, ou pour modifier le scoring d'un levier. |

## API publique

### `calculerIR(input)` — la fonction principale

```js
const { calculerIR } = require('./core/calculator.js');

const det = calculerIR({
  // --- situation familiale ---
  situation: 'celibataire',     // 'celibataire' | 'marie-pacse' | 'veuf' | 'divorce'
  nbEnfants: 0,
  gardeAlternee: 0,
  parentIsole: false,
  demiPartSupp: false,
  demiPartCas: 'L',             // 'L' | 'N' | 'P' | 'F' | 'W' | 'S' | 'G' (cf. cases 2042)

  // --- revenus du foyer (les principaux) ---
  sal1: 50000, sal2: 0,
  pen1: 0, pen2: 0,
  microFoncier: 0, foncierReel: 0,
  meubleClasse: 0, meubleNonClasse: 0, autresMeubles: 0,
  dividendes: 0, interets: 0, pv: 0,
  avProduits75: 0, avProduits128: 0,
  optionPFU: 'pfu',             // 'pfu' (12,8 % IR) ou 'bareme' (intégré au barème)
  autresRevenus: 0,

  // --- charges déductibles ---
  per: 0, pensionsAlim: 0, csgDeductible: 0,

  // --- réductions / crédits d'impôt ---
  dons: 0, dons7UD: 0,
  irPme: 0, irPmeEsus: 0, irPmeMH: 0, irPmeJei: 0, irPmeJeii: 0, irPmeJeir: 0,
  fcpiJei: 0, fipCorse: 0, gfi: 0, gfiZone: 'standard',
  malrauxTravaux: 0, malrauxZone: 'spr-non',
  locAvantagesDepenses: 0, locAvantagesPalier: 'loc1',
  sofica: 0, soficaTaux: '36',
  girardinPD: 0, girardinAG: 0,
  denormandie: 0, denormandieDuree: '9',
  jeanbrunAmort: 0, jeanbrunCategorie: 'intermediaire',
  emploiDomicile: 0, gardeEnfants: 0, cotSyndicales: 0,
  ehpadFrais: 0, ehpadNbPers: 1,
  fraisScolCollege: 0, fraisScolLycee: 0, fraisScolSup: 0,
});

console.log(det.impotNet);          // Montant final dû à l'État (€)
console.log(det.tmi);               // Tranche Marginale d'Imposition (0.11, 0.30, ...)
console.log(det.revenuReference);   // RFR utilisé pour CEHR, droits sociaux
```

**Liste exhaustive des champs d'input et leur sémantique** : voir [`tests/cases.js`](../tests/cases.js) qui exerce chaque cas, et la fonction `makeInput()` qui définit les valeurs par défaut.

**Robustesse défensive** : tout champ omis est traité comme `0` (ou la valeur par défaut documentée pour les `select`). Le moteur ne lance jamais d'exception sur un input partiel.

### Structure de retour `det`

L'objet `det` retourné contient **environ 250 clés** organisées en couches. Les principales :

| Clé | Sémantique |
|---|---|
| `det.impotNet` | **Impôt net dû** (après réductions, crédits, décote, CEHR). C'est ce que ton SaaS affiche au client. |
| `det.impotBrut` | Impôt avant réductions/crédits, à partir du barème + QF. |
| `det.revenuBrutGlobal` | RBG (somme catégorielle nette d'abattements). |
| `det.revenuNetImposable` | RNI (RBG − charges déductibles : PER, pensions alim, CSG ded, déficit foncier). |
| `det.revenuReference` | RFR utilisé pour CEHR, droits sociaux (boursiers, etc.). |
| `det.tmi` | Tranche marginale d'imposition (0, 0.11, 0.30, 0.41, 0.45). |
| `det.parts` / `det.partsBase` | Nombre de parts (total et de base sans demi-parts supp). |
| `det.quotientFamilial` | RNI / parts. |
| `det.decote` | Décote appliquée. |
| `det.cehr` | Contribution exceptionnelle hauts revenus. |
| `det.perCap` | Plafond PER applicable (calculé automatiquement). |
| `det.psFoncierNu` / `det.psLMNP` | PS catégorie foncier nu (17,2 %) / LMNP (18,6 %). |
| `det.psRole` | PS dus via l'avis IR (mobilier + foncier + LMNP). |
| `det.psSource` | PS prélevés à la source (AV) — INFO, pas additionné à `impotNet`. |
| `det.totalPS` | `psRole + psSource` — pour affichage de la charge fiscale totale. |
| `det.nichesUtilisees` / `det.nichesPerdues` | Total RI dans le panier niches / surplus tronqué. |
| `det.capExcedents` | `{ sofica, fipCorse, gfi, malraux, locAvantages, irPme, ... }` — surplus tronqués par cap individuel (info UI). |
| `det.redXxx` | Détail de chaque réduction (`det.redIrPme`, `det.redSofica`, `det.redMalraux`, etc.). |
| `det.deficitFoncierImputable` / `det.deficitFoncierSurplus` | Déficit foncier imputé sur revenu global (cap 10 700 €/an). |

Pour la liste exhaustive et les invariants : `grep "det\." core/calculator.js`.

### `PARAMS` — la source de vérité fiscale

```js
const { PARAMS } = require('./core/params.js');

PARAMS.bareme;                    // les 5 tranches du barème
PARAMS.abat.sal;                  // { taux: 0.10, min: 509, max: 14555 }
PARAMS.ps.foncierNu;              // 0.172 (LFSS 2026 — maintenu)
PARAMS.ps.lmnp;                   // 0.186 (LFSS 2026 — relevé)
PARAMS.niches.plafond;            // 10000
PARAMS.plafondsDispositifs.irPme; // { versementMax, versementMaxCouple, taux }
```

**Override d'un paramètre** (cas rare, par exemple pour simuler une nouvelle LF avant publication officielle) : modifie `PARAMS` directement avant d'appeler `calculerIR()`. Comme c'est un objet global, le changement persiste pour les appels suivants — restaure-le si nécessaire.

### `LEVIERS_CATALOGUE` — le catalogue des dispositifs

```js
const { LEVIERS_CATALOGUE } = require('./core/preconisations.js');

LEVIERS_CATALOGUE.forEach(lev => {
  console.log(lev.id, lev.label, lev.cat);
  // ex: 'per' 'PER — Plan d'Épargne Retraite' 'hors'
});
```

Chaque levier expose : `id`, `family`, `label`, `cat` (`hors` / `niche10` / `niche18` / `foncier`), `mode` (`'versement-direct'` / `'taux-libre'` / `'deficit-foncier'` / `'jeanbrun'`), `inputKey` (la clé `input` correspondante), `info` (tooltip riche), `meta` (taux/plafonds), et plus.

### `appliquerPreconisations(input, precos)` — simuler un scénario

```js
const { appliquerPreconisations } = require('./core/preconisations.js');

const inputAvant = { situation: 'celibataire', sal1: 50000 };
const detAvant = calculerIR(inputAvant);

const precos = [{ leverId: 'per', montant: 5000 }];
const inputApres = appliquerPreconisations(inputAvant, precos);
const detApres = calculerIR(inputApres);

console.log(detAvant.impotNet - detApres.impotNet); // gain fiscal
```

### `computeWarnings(det)` — détecter les dépassements

```js
const { computeWarnings } = require('./core/preconisations.js');
const warnings = computeWarnings(det);
// [{ type: 'panier-niches', level: 'warning', message: '...', amount: 3000 }, ...]
```

## Tests = spec implicite

Les fichiers [`tests/run.js`](../tests/run.js), [`tests/run100.js`](../tests/run100.js), [`tests/run_leviers.js`](../tests/run_leviers.js) couvrent **85 cas dirigés + 100 cas oracle + 29 leviers = 214 cas verts**. Si tu modifies quoi que ce soit dans `core/`, ces tests doivent rester verts. Inversement, si tu te demandes « est-ce que le moteur gère le cas X ? », cherche-le dans ces fichiers — il y est probablement.

## Mode simple vs mode complet (côté démo)

La démo expose **un seul questionnaire avec deux niveaux** (cf. README racine pour le modèle produit). Côté moteur, cela ne change rien — `calculerIR(input)` traite n'importe quel input valide. C'est la **démo (`demo/app.js` + classe CSS `.advanced` dans `index.html` + flag `inSimpleMode` dans `LEVIERS_CATALOGUE`)** qui filtre.

### Champs exposés en mode simple (lead-gen prospect)

| Section | Champs | Couvre |
|---|---|---|
| **Situation** | `situation`, `nbEnfants`, `gardeAlternee`, `parentIsole` | Cas familiaux courants |
| **Revenus** | `sal1`/`sal2`, `pen1`/`pen2`, `bncMicro1`/`bncMicro2`, `bicVentes1`/`bicServices1`, `dividendes` | Salaire, retraite, libéral, commerçant, artisan, dividendes (PFU forcé) |
| **Charges** | `per`, `deficitFoncier`, `jeanbrunAmort`, `pensionsAlim`, `csgDeductible`, `autresCharges` | Épargne retraite, déficit foncier (incl. Jeanbrun), pensions alim |
| **RI / CI** | `dons` (7UF), `emploiDomicile`, `gardeEnfants`, `autresReductions`, `autresReductionsImmo`, `autresCredits` | Dons, emploi domicile, garde enfants, fourre-tout mobilier/immo |

### Champs accessibles uniquement en mode complet

- Sélecteur `optionPFU` (barème vs PFU) — PFU forcé par défaut en simple
- `microFoncier`, `foncierReel`, `meubleClasse`, `meubleNonClasse`, `autresMeubles` (LMNP, micro-foncier)
- `bncReel1`/`bncReel2`, `bicReel1`/`bicReel2`
- `pensInvalidite`, `pensAlimRecue`, `allocChomage`, `heuresSupExo`, `fraisReels`
- `interets`, `pv`, `avProduits75`, `avProduits128`, `pfnlVerse`
- Tous les dispositifs précis : SOFICA, Pinel, Denormandie, IR-PME (toutes variantes), Malraux, Loc'Avantages, GFI, FIP Corse, Girardin, déficit foncier précis vs Jeanbrun précis, EHPAD, dons 7UD (Coluche 75 %), frais scolaires, cotisations syndicales

### Fourre-tout mode simple — sémantique « RI directe »

`autresReductions` (mobilier) et `autresReductionsImmo` (immobilier) acceptent **le montant de la RI annuelle déjà calculé**, pas le montant investi. Inverse de la sémantique mode complet où le moteur calcule (invest × taux). Logique : en lead-gen, on ne demande pas au prospect de connaître les paramètres exacts (taux SOFICA selon engagement, durée Denormandie, etc.).

Côté moteur : les deux sont sommés dans `det.redAutres` (catch-all, hors plafond niches individuel — entrent dans le panier 10 k).

### Pour l'intégrateur SaaS

Tu n'es **pas obligé de reproduire** le double parcours. Le moteur accepte n'importe quel sous-ensemble d'inputs (les champs omis sont traités comme 0 / valeur neutre). Tu peux exposer ton propre formulaire avec ta propre granularité. Le contrat est :

- Tout champ de l'input schema (cf. `calculerIR(input)` ci-dessus) est **optionnel**, traité comme 0 si absent.
- Les select (situation, optionPFU, gfiZone, etc.) ont une valeur par défaut documentée dans `defaultInputs()` (`demo/app.js`).

## Conventions importantes

- **Aucun nombre fiscal en dur** dans le reste du code (HTML, tooltips, libellés). Tout passe par `PARAMS` directement, ou via les tokens `{{path|fmt}}` résolus par `demo/paramInject.js` côté UI.
- **`calculator.js` est pur** : pas de DOM, pas de `console.log`, pas d'I/O. Tu peux l'embarquer dans un Worker, un job serveur, un test unitaire — il ne fera que calculer.
- **Une source de vérité par fait** : si tu vois un chiffre répété dans le code, c'est probablement un bug latent à signaler.

## Limites connues

- **Pas de gestion pluri-année native** pour Pinel/Denormandie (saisir la RI annuelle, l'historique est de la responsabilité du SaaS).
- **CDHR (LF 2026 art. 23)** non modélisée.
- **PFNL bancaire 2CK** : saisie manuelle obligatoire (cohérent avec le simulateur officiel).

Si tu rencontres un cas non couvert ou un calcul qui te semble divergent du simulateur impots.gouv.fr, ouvre une issue avec l'input minimal qui reproduit. Les tests oracle (`tests/run100.js`) seront étendus pour le verrouiller.
