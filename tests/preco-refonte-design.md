# Refonte de l'onglet « Préconisations » — Design (Phase 1)

> **But** : poser le modèle conceptuel complet **avant** d'écrire la moindre ligne de code. Tout point ambigu dans ce doc doit être levé avant la Phase 2 (moteur) et Phase 3 (UI).

---

## 1. Structure pédagogique — 3 leviers

L'onglet est organisé en **3 sections séquentielles**, dans cet ordre, qui correspondent aux 3 grandes familles fiscales :

### Levier 1 — Réduire la base imposable
**Mécanisme** : déduit du revenu imposable. Économie ≈ montant × TMI. Affecte aussi le plafond QF, la décote, le RFR si applicable.

| Dispositif | inputKey wiztax | Mode actuel | Note |
|---|---|---|---|
| PER | `per` | versement | Plafond indiv (10 % rev pro / plancher 4 710 / max 37 680) déjà appliqué moteur |
| Pensions alim versées | `pensionsAlim` | versement | Plafond 6 674 €/enfant majeur appliqué |
| CSG déductible | `csgDeductible` | versement | Aucun plafond |
| Autres charges | `autresCharges` | versement | Aucun plafond |
| Déficit foncier | `foncierReel` (négatif) | net foncier | Imputation RG plafonnée à 10 700 € |
| Amortissement Jeanbrun | `jeanbrunAmort` + `jeanbrunCategorie` | amortissement | Plafond 8/10/12 k selon cat. |

### Levier 2 — Réductions d'impôt
**Mécanisme** : viennent en déduction de l'IR (après barème). **Perdues si IR = 0**.
**Plafond** : 2 poches (10k normale + 8k majoration Girardin/SOFICA).

| Dispositif | inputKey actuel | Cat. niche | Mode actuel | Mode cible | Plafond versement |
|---|---|---|---|---|---|
| Pinel | `pinel` | 10k | RI déjà calculée | versement + durée | 300 000 € / 2 inv |
| Girardin PD | `girardinPD` | 18k (qp 44 %) | versement | versement + rendement | pas de cap propre |
| Girardin AG | `girardinAG` | 18k (qp 34 %) | versement | versement + rendement | pas de cap propre |
| SOFICA | `sofica` | 18k | RI déjà calculée | versement + taux 30/36/48 % | 18 000 € |
| FCPI JEI | `fcpiJei` | 10k | versement (× taux) | versement | 12 000 / 24 000 € |
| FCPI classique | `fcpi` | 10k | versement (× taux) | versement | 12 000 / 24 000 € |
| FIP Corse | `fipCorse` | 10k | versement (× taux) | versement | 12 000 / 24 000 € |
| IR-PME | `irPme` | 10k | versement (× taux) | versement | 50 000 / 100 000 € |
| GFI | `gfi` | 10k | versement (× taux) | versement | 50 000 / 100 000 € |
| Dons 7UD (75 %) | `dons7UD` | hors | versement | versement | 2 000 € à 75 %, surplus → 66 % |
| Dons 7UF (66 %) | `dons` | hors | versement | versement | 20 % du RNI |
| EHPAD | `ehpadFrais` | hors | versement | versement | 10 000 € × nbPers |
| Malraux | `malraux` | hors | RI déjà calculée | dépenses + zone 22/30 % | 100 000 €/an |
| Loc'Avantages | `locAvantages` | 10k | RI déjà calculée | dépenses + palier | 10 000 € dépenses |
| Cot. syndicales | `cotSyndicales` | hors | versement | versement | 1 % salaires/chom/pen |

> **Note** : « hors » signifie hors plafond niches (réduction conservée même si poche 1+2 saturée). Cas particulier : les dons sont une réduction « hors niches » mais avec leur propre cap RNI 20 %.

### Levier 3 — Crédits d'impôt
**Mécanisme** : viennent en déduction de l'IR. **Remboursés si IR = 0** (différence clé avec Levier 2).

| Dispositif | inputKey | Plafond | Taux |
|---|---|---|---|
| Emploi à domicile | `emploiDomicile` | 12 000 € (+ majo 15 k) | 50 % |
| Garde enfants < 6 ans | `gardeEnfants` | 3 500 € × nbEnfants | 50 % |
| Autres crédits | `autresCredits` | aucun | direct |

(Cotisations syndicales sont conceptuellement un crédit 66 %, mais classées par le moteur dans le bloc « réductions » `credSyndic`. À harmoniser ou à laisser tel — voir question ouverte plus bas.)

---

## 2. Algorithme paniers 10k + 8k

### Définitions
- **Poche 1** : 10 000 € accessible à **tous** les dispositifs cat. `niche10` et `niche18`.
- **Poche 2** : 8 000 € supplémentaires, **réservée** aux dispositifs cat. `niche18` (Girardin PD/AG × quote-part + SOFICA).
- **Quote-parts Girardin** : 44 % (plein droit) / 34 % (avec agrément). C'est ce pourcentage de la RI qui entre dans le panier (l'autre partie est « offerte » par la rétrocession).

### Pseudo-code

```
inputs : pour chaque ligne i, on a (montantRI_i, categorie_i ∈ {niche10, niche18, hors})
                                           où montantRI_i intègre déjà la quote-part Girardin

# Étape 1 — somme RI niche10 et niche18 (les "hors" sont mis de côté)
RI_10 = somme des montantRI_i avec categorie_i = niche10
RI_18 = somme des montantRI_i avec categorie_i = niche18

# Étape 2 — Tentative remplissage poche 1 (10 000 € max)
poche1_10 = min(RI_10, 10_000)
restePoche1 = 10_000 - poche1_10
poche1_18 = min(RI_18, restePoche1)

# Étape 3 — Surplus
surplus_10 = max(0, RI_10 - poche1_10)       # PERDU
surplus_18 = max(0, RI_18 - poche1_18)        # Tente poche 2

# Étape 4 — Poche 2 (réservée niche18, plafond 8 000)
poche2_18 = min(surplus_18, 8_000)
perdu_18 = max(0, surplus_18 - poche2_18)     # PERDU au-delà

# Étape 5 — RI retenue
RI_retenue = poche1_10 + poche1_18 + poche2_18
RI_perdue  = surplus_10 + perdu_18
RI_hors    = somme des montantRI_i avec categorie_i = hors  (toujours retenu, mais avec son propre cap éventuel)
```

### Tableau d'exemples vérifiables

| Scénario | RI niche10 (input) | RI niche18 (input) | Poche 1 | Poche 2 | Perdu | RI totale retenue |
|---|---|---|---|---|---|---|
| Pinel 8 000 + SOFICA 5 000 | 8 000 | 5 000 | 8 000 + 2 000 = 10 000 | 3 000 | 0 | 13 000 |
| Pinel 15 000 seul | 15 000 | 0 | 10 000 | 0 | 5 000 | 10 000 |
| Girardin (× 44 %) 12 000 seul | 0 | 12 000 | 10 000 | 2 000 | 0 | 12 000 |
| Pinel 8 000 + Girardin 11 000 | 8 000 | 11 000 | 8 000 + 2 000 = 10 000 | 8 000 | 1 000 | 18 000 |
| FCPI 10 000 + SOFICA 8 000 | 10 000 | 8 000 | 10 000 + 0 = 10 000 | 8 000 | 0 | 18 000 |
| FCPI 12 000 + SOFICA 8 000 | 12 000 | 8 000 | 10 000 + 0 = 10 000 | 8 000 | 2 000 | 18 000 |
| Pinel 3 000 + Girardin 20 000 | 3 000 | 20 000 | 3 000 + 7 000 = 10 000 | 8 000 | 5 000 | 18 000 |
| Pinel 0 + Girardin 25 000 | 0 | 25 000 | 10 000 | 8 000 | 7 000 | 18 000 |
| SOFICA 5 000 seul | 0 | 5 000 | 5 000 | 0 | 0 | 5 000 |
| Pinel 20 000 + SOFICA 0 | 20 000 | 0 | 10 000 | 0 | 10 000 | 10 000 |

> **À valider avec l'user** : est-ce que cette interprétation matche bien la règle officielle ? (Notamment l'idée que `niche18` doit « passer dans poche 1 d'abord ».)

---

## 3. Catalogue cible — structure d'objet `LEVIER`

Refonte de `LEVIERS_CATALOGUE` avec un schéma unifié et explicite, source de vérité unique côté code.

```js
const LEVIER = {
  id: 'per',                         // identifiant interne
  levier: 1,                         // 1 = base imposable, 2 = réduction, 3 = crédit
  label: 'PER (Plan d\'Épargne Retraite)',

  // Mode de saisie
  mode: 'versement',                 // 'versement' | 'versement-parametre' | 'depenses' | 'amortissement'
  inputKey: 'per',                   // champ wiztax sur lequel on additionne
  inputUnit: 'EUR',                  // unité affichée

  // Calcul de la RI (Levier 2 seulement)
  ri: {
    taux: null,                      // taux fixe, ou null si dépend d'un paramètre
    paramRef: null,                  // ex: 'duree' pour Pinel, 'zone' pour Malraux
    plafondVersement: null,          // single ; null = pas de cap
    plafondVersementCouple: null,    // couple ; null = pas de différenciation
  },

  // Plafonnement niches
  panier: 'niche10',                 // 'niche10' | 'niche18' | 'hors'
  quotePart: 1.0,                    // 1.0 par défaut, 0.44 Girardin PD, 0.34 Girardin AG

  // Budget jauge
  budget: 'cash',                    // 'cash' | 'exclu' (financé crédit / amortissement)

  // Texte explicatif
  info: '…',
};
```

### Avantages vs ancien catalogue
- **Un seul mode** au lieu de 4 (`versement-direct` / `taux` / `taux-variable` / `jeanbrun`). Le paramètre optionnel devient une vraie 1ʳᵉ classe via `paramRef`.
- **Plafonds individuels** dans la donnée et plus dans un `if/else` éparpillé.
- **Quote-part Girardin** dans la donnée et plus en hardcodé.

---

## 4. `params.js` — plafonds à centraliser

Section nouvelle à ajouter dans `PARAMS.plafonds` (ou un sous-objet `plafondsDispositifs`) :

```js
plafondsDispositifs: {
  pinel:        { versement: 300000, taux: { '6': 0.12, '9': 0.18, '12': 0.21 } },
  sofica:       { versement: 18000,  taux: { '30': 0.30, '36': 0.36, '48': 0.48 } },
  fcpiJei:      { versement: 12000,  versementCouple: 24000, taux: 0.30 },
  fcpiClassique:{ versement: 12000,  versementCouple: 24000, taux: 0.18 },
  fipCorse:     { versement: 12000,  versementCouple: 24000, taux: 0.30 },
  irPme:        { versement: 50000,  versementCouple: 100000, taux: 0.25 },
  gfi:          { versement: 50000,  versementCouple: 100000, taux: 0.18 },
  malraux:      { depensesParAn: 100000, taux: { 'spr-non': 0.22, 'spr-oui': 0.30 } },
  locAvantages: { depenses: 10000, taux: { 'loc1': 0.15, 'loc2': 0.35, 'loc3': 0.65 } },
  // Pas de plafond propre pour Girardin (cap via panier majoré)
  // PER, pensions alim, EHPAD, emploi dom, garde enfants : déjà dans P.plafonds
},
```

Sources réglementaires à valider (LF 2024 / LF 2026, BOI-IR-RICI-…) — à compléter dans une dernière passe avant Phase 2.

---

## 5. Maquette texte de l'UI

```
┌──────────────────────────────────────────────────────────────────────┐
│  BARRE DE SYNTHÈSE                                                   │
│                                                                      │
│  Impôt actuel : 6 000 €                                              │
│  ███████████████████████████████░░░░░░░░░░░░░░░ -800 € à rembourser │
│  └─ L1 PER ─┘ └─ L2 Réductions ─┘ └─ L3 Crédits ─┘                  │
│   1 500 €      3 300 €              2 000 €                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ LEVIER 1 — Réduire la base imposable                  Impôt : 4 500 €│
├──────────────────────────────────────────────────────────────────────┤
│ [+] PER                                                              │
│     Versement : 5 000 €    Plafond : 4 710 €  ⚠ 290 € hors plafond  │
│     → Économie estimée : 1 500 € (TMI 30 %)                          │
│ [+] Pensions alim versées                                            │
│     Versement : 0 €                                                  │
│ [+ Ajouter un dispositif Levier 1]                                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ LEVIER 2 — Réductions d'impôt                         Impôt : 1 200 €│
├──────────────────────────────────────────────────────────────────────┤
│ Poche 1 (10 000 €) : ████████░░ 7 000 € / 10 000 €                  │
│ Poche 2 (+8 000 €) : ░░░░░░░░░░     0 € /  8 000 €                  │
├──────────────────────────────────────────────────────────────────────┤
│ [+] Pinel — Engagement 9 ans (18 %)                                  │
│     Investissement : 200 000 €    RI annuelle : 4 000 €              │
│     → Retenu (poche 1) : 4 000 €                                     │
│ [+] Dons d'intérêt général                                           │
│     Versement : 5 000 €                                              │
│     → Retenu : 3 300 € (réduction 66 %)                              │
│ ⚠ Tu effaces déjà 3 300 € — il te reste 1 200 € d'impôt à effacer.   │
│ [+ Ajouter une réduction d'impôt]                                    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ LEVIER 3 — Crédits d'impôt (remboursés même si IR = 0)               │
├──────────────────────────────────────────────────────────────────────┤
│ [+] Emploi à domicile                                                │
│     Dépenses : 4 000 €    Crédit : 2 000 € (50 %)                    │
│     ✅ Impôt à 0 : ces 2 000 € te sont remboursés.                   │
│ [+ Ajouter un crédit d'impôt]                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Éléments UI obligatoires
- Barre synthèse segmentée par levier (couleur par levier).
- Pour chaque ligne : badge « retenu » vs « hors plafond » + montant correspondant.
- Pour Levier 2 : 2 jauges (poche 1 et poche 2) toujours visibles.
- Warnings inline en jaune/orange (cap individuel dépassé) et bleu (surdimensionnement).
- État pédagogique vert/rouge sur le crédit selon impôt à 0 ou pas.

---

## 6. Garde-fous (`computeWarnings`)

Fonction appelée à chaque modification d'une préconisation, renvoie une liste de warnings :

```js
{
  type: 'cap-indiv' | 'panier-niches' | 'surdimensionnement' | 'cap-rni' | 'budget-cash',
  level: 'info' | 'warning' | 'error',
  leverId: 'pinel',                       // null si global
  message: 'Versement 200 k€ excède le plafond 300 k€ Pinel.',
  amount: 70_000,                         // montant concerné (perdu, dépassé, etc.)
}
```

Triggers :
- **cap-indiv** : input × taux > plafond RI → on retient le plafond, on signale le delta.
- **panier-niches** : RI niche10 + niche18 dépasse 10k / 18k → on signale ce qui passe en perte.
- **surdimensionnement** : total réductions L2 (retenu) > impôt avant L2 → signale le « perdu utile ».
- **cap-rni** : dons > 20 % RNI → signale le delta.
- **budget-cash** : total versements cat. cash > budget annuel saisi → simple info, pas d'erreur.

---

## 7. Questions ouvertes (à trancher avant Phase 2)

1. **Cotisations syndicales** : conceptuellement crédit 66 %, mais classé en bloc « réductions » dans le moteur (`credSyndic`). On le déplace en Levier 3 ou on le laisse à part ?

2. **Bascule versement pour Girardin PD/AG** : le wiztax demande aujourd'hui le « versement » (qui produit une RI > versement par effet de levier). On garde le mode « versement + rendement » qui existe dans le catalogue actuel ?

3. **Pinel étalement multi-annuel** : on garde le calcul « RI annuelle » pour la simulation année courante, ou on simule la RI étalée sur N années ? Le moteur calcule pour 1 année — on ne va pas casser ça en Phase 2. La maquette montre « RI annuelle ».

4. **Loc'Avantages mode « dépenses »** : aujourd'hui input = RI. On bascule en input = « dépenses + palier » ? OK ; à confirmer.

5. **Malraux** : input actuel = RI déjà calculée. On bascule en « dépenses + zone » ? Note : le mode 'taux-variable' existe déjà au catalogue mais inputKey = `malraux` qui dans le moteur est traité comme RI directe. Donc le catalogue est déjà à moitié migré.

6. **Levier 2 « hors panier niches »** : les dons, EHPAD, cot. syndicales, Malraux ne sont pas dans le panier niches. Visuellement dans Levier 2, ils ne tombent pas sous les jauges de poche 1/2. Comment on les présente — section séparée intra-Levier 2 ou simplement chip « hors plafond niches » ?

---

## 8. Ce qui reste à compléter dans ce doc

- [ ] Tableau réglementaire complet avec références BOI/CGI précises par dispositif.
- [ ] Cas d'usage end-to-end : « foyer X, budget Y, l'outil propose telle ventilation ».
- [ ] Identification précise des couleurs UI (chartes accessibilité contrastes).
- [ ] Schéma de transition d'état des préconisations (création / édition / suppression / persistance).

## 9. Démarrage Phase 2 (post-validation de ce doc)

Une fois ce doc validé en revue avec l'user :
1. Ajouter le bloc `plafondsDispositifs` à `params.js`.
2. Refonte étape 10 de `calculator.js` (algo 2 poches).
3. Appliquer caps individuels sur `det.redXXX`.
4. Ajouter cas dirigés couvrant chaque exemple du tableau §2.
5. Tests verts → bascule input investissement.
