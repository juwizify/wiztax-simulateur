# WizTax — Simulateur d'Impôt sur le Revenu (France)

Moteur de calcul fiscal français (revenus 2025 / déclaration 2026) avec catalogue de leviers d'optimisation et démo web. Conçu pour être **intégré dans un produit SaaS**, pas pour être utilisé tel quel comme produit final.

- **Démo en ligne** : https://juwizify.github.io/wiztax-simulateur/
- **Repo** : https://github.com/juwizify/wiztax-simulateur
- **Mainteneur** : Wizify (julien@wizify.fr)
- **Statut** : moteur stable, 214 tests verts, paramètres LF 2026 / LFSS 2026 vérifiés au 2026-06-05.

---

## Le produit en 2 volets

WizTax est conçu pour alimenter **deux parcours utilisateurs** distincts via le même moteur fiscal :

1. **Lead-gen** — un CGP envoie à des prospects un lien vers le **mode simple** du Simulateur. Le particulier remplit un formulaire allégé (revenus principaux + dispositifs courants), obtient une simulation indicative de son IR, et le CGP capture le lead.
2. **Outil pro CGP** — le CGP récupère ensuite la saisie du prospect et la complète en **mode complet** (tous les régimes BIC/BNC, tous les dispositifs IR-PME / SOFICA / Malraux / Pinel / etc., préconisations détaillées, plafonnement des niches).

Architecture : **un seul questionnaire, deux niveaux d'exposition.** Le mode simple cache visuellement les champs avancés (classe CSS `.advanced`) et le moteur ignore leurs valeurs (cf. `getInputs()` dans `demo/app.js` : `if (mode-simple) { advanced fields → defaults }`).

**Pour le dev qui intègre dans son SaaS** : reproduis ce modèle si pertinent, ou expose uniquement le mode complet. Les valeurs neutres (0, palier par défaut) garantissent que tout champ omis donne un calcul cohérent.

---

## À qui s'adresse ce repo

**Tu es développeur et tu vas intégrer ce moteur dans un SaaS** : tu es au bon endroit. Tout ce qui te concerne est dans **`core/`**. Le reste est accessoire pour toi.

| Tu veux… | Va voir |
|---|---|
| Comprendre l'API du moteur | [`core/README.md`](core/README.md) |
| Voir les paramètres fiscaux (source unique de vérité) | [`core/params.js`](core/params.js) |
| Voir le moteur de calcul | [`core/calculator.js`](core/calculator.js) |
| Voir le catalogue des dispositifs fiscaux (PER, IR-PME, SOFICA, …) | [`core/preconisations.js`](core/preconisations.js) — constante `LEVIERS_CATALOGUE` |
| Voir des exemples d'usage concrets | [`tests/cases.js`](tests/cases.js) |
| Maintenir ou faire évoluer le code | [`CLAUDE.md`](CLAUDE.md) |

---

## Arborescence

```
wiztax-simulateur/
├── core/            ← LE MOTEUR — c'est ce que tu récupères
│   ├── params.js              · source unique des paramètres fiscaux
│   ├── paramsRegistry.js      · méta-données éditoriales (sources légales)
│   ├── calculator.js          · moteur pur : calculerIR(input) → det
│   └── preconisations.js      · catalogue leviers + warnings
│
├── demo/            ← La démo web — tu peux l'ignorer
│   ├── app.js                 · glue UI (lecture inputs, affichage)
│   ├── paramInject.js         · résolveur de tokens {{path|fmt}} au DOM
│   └── paramsTab.js           · générateur de l'onglet Paramètres
│
├── index.html       ← Démo (sert https://juwizify.github.io/...)
├── css/             ← Styles de la démo
│
├── tests/           ← 211 tests qui verrouillent le comportement attendu
│   ├── run.js         · 82 cas dirigés (situations réelles)
│   ├── run100.js      · 100 cas oracle aléatoires vs impots.gouv.fr
│   ├── run_leviers.js · 29 leviers du catalogue testés un par un
│   └── cases.js       · base des cas dirigés
│
├── CLAUDE.md        ← Notes mainteneur (conventions, décisions de design)
└── tasks/           ← Historique des PR et arbitrages fiscaux
```

---

## Comment intégrer dans ton SaaS

Le moteur est du JS vanilla (Node + browser). **Aucune dépendance NPM**, aucun build, aucun bundler. Trois options selon ton besoin :

### Option 1 — Copy-paste (le plus simple)

Copie les 4 fichiers de `core/` dans ton projet :

```bash
cp wiztax-simulateur/core/*.js mon-saas/server/wiztax/
```

Puis :

```js
const { PARAMS } = require('./wiztax/params.js');
const { calculerIR } = require('./wiztax/calculator.js');  // expose la fonction
const result = calculerIR({ situation: 'celibataire', sal1: 50000, ...});
```

(Voir [`core/README.md`](core/README.md) pour la signature précise et le schéma d'input.)

### Option 2 — Git submodule (suivre les évolutions)

```bash
git submodule add https://github.com/juwizify/wiztax-simulateur.git lib/wiztax
```

Tu pointes ensuite sur `lib/wiztax/core/*.js`. Pour mettre à jour : `git submodule update --remote lib/wiztax`.

### Option 3 — Fork (si tu veux divergencer)

Fork le repo, modifie ce qu'il te faut, et rebase sur notre main périodiquement.

---

## Garanties fiscales

Toutes les valeurs dans `core/params.js` sont **commentées avec leur source officielle** (BOFiP, service-public.gouv.fr, LF, LFSS) et une date `lastVerified` dans `core/paramsRegistry.js`. Notamment :

- **Barème IR 2026** : BOI-IR-LIQ-20-10 du 07/04/2026 (LF 2026 art. 4)
- **Prélèvements sociaux** : foncier nu **17,2 %** (art. 14 CGI maintenu), mobilier/LMNP **18,6 %** (LFSS 2026 art. 12, CSG portée à 10,6 %)
- **Plafond niches** : 10 000 € général, 18 000 € majoré (Girardin / SOFICA) — art. 200-0 A CGI
- **PER, dons, EHPAD, IR-PME, Malraux, Loc'Avantages, GFI, Jeanbrun…** : voir `core/params.js` et `core/preconisations.js`

Les **211 tests** verrouillent le comportement attendu, dont **100 cas oracle** validés indépendamment contre le simulateur impots.gouv.fr. Si un calcul change, un test casse.

---

## Lancer les tests

```bash
node tests/run.js           # 82 cas dirigés
node tests/run100.js        # 100 cas oracle aléatoires
node tests/run_leviers.js   # 29 leviers du catalogue
```

Tous doivent retourner **0 failed**. C'est le seul critère d'acceptation pour toute modification du moteur.

---

## Lancer la démo en local

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

Aucun build, aucun npm install — c'est du HTML/JS/CSS statique.

---

## Limites connues du moteur

- **Pas d'historique pluri-année** pour les dispositifs étalés (Pinel, Denormandie) : on saisit la RI annuelle. Pour le cumul, le SaaS doit gérer l'historique côté base.
- **Pas de gestion de la CDHR** (Contribution Différentielle Hauts Revenus, LF 2026 art. 23) : modélisation à venir.
- **PFNL bancaire 2CK** : saisie manuelle (le moteur ne devine pas le montant prélevé à la source — c'est le comportement du simulateur officiel).

---

## License & contact

Wizify — julien@wizify.fr
