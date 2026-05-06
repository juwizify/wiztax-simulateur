/**
 * Cas de test pour le moteur de calcul.
 * Chaque cas : { name, input, expected }
 *   - input : objet complet attendu par calculerIR()
 *   - expected : { impotNet, revenuReference, tmi } (au minimum)
 *   - tolérance par défaut : ±1 € sur impotNet et revenuReference, exact sur tmi
 *
 * Ajout d'un cas : utiliser makeInput({ ...overrides }) pour ne renseigner
 * que les champs significatifs ; tous les autres sont à 0 / valeur neutre.
 */

function makeInput(overrides = {}) {
  return {
    // Situation
    situation: 'celibataire',
    nbEnfants: 0,
    gardeAlternee: 0,
    parentIsole: false,
    demiPartSupp: false,
    demiPartCas: 'L',

    // Revenus salaires/pensions
    sal1: 0, sal2: 0,
    allocChomage1: 0, allocChomage2: 0,
    fraisReels1: 0, fraisReels2: 0,
    heuresSupExo1: 0, heuresSupExo2: 0,
    pen1: 0, pen2: 0,
    pensInvalidite1: 0, pensInvalidite2: 0,
    pensAlimRecue1: 0, pensAlimRecue2: 0,

    // BNC
    bncMicro1: 0, bncMicro2: 0,
    bncReel1: 0,  bncReel2: 0,

    // Foncier
    microFoncier: 0,
    foncierReel: 0,

    // Meublé
    meubleClasse: 0,
    meubleNonClasse: 0,

    // Mobilier
    dividendes: 0,
    interets: 0,
    pv: 0,
    avProduits75: 0,
    avProduits128: 0,
    pfnlVerse: 0,
    optionPFU: 'pfu',

    // Autres revenus
    autresRevenus: 0,

    // Charges déductibles
    per: 0,
    pensionsAlim: 0,
    nbBeneficiairesPA: 0,
    csgDeductible: 0,
    autresCharges: 0,

    // Réductions d'impôt
    dons: 0,
    pinel: 0,
    girardinPD: 0,
    girardinAG: 0,
    fcpi: 0,
    sofica: 0,
    autresReductions: 0,

    // Crédits d'impôt
    emploiDomicile: 0,
    gardeEnfants: 0,
    autresCredits: 0,

    ...overrides,
  };
}

const CASES = [
  // -------------------------------------------------------------------
  // BASELINE — état actuel du simulateur, garde-fou non-régression
  // -------------------------------------------------------------------
  {
    name: 'Baseline : célibataire 1 part, salaire 40 000 €',
    input: makeInput({ sal1: 40000 }),
    // Calcul attendu :
    //   abat 10% : min(509, 40000*0.10, 14555) = 4000
    //   salaireNet = 36000 — RBG = 36000 — RNI = 36000
    //   QF = 36000 / 1 = 36000
    //   tranche 1 (0-11600) : 0
    //   tranche 2 (11600-29579) : 17979 × 0.11 = 1977.69
    //   tranche 3 (29579-36000) : 6421 × 0.30 = 1926.30
    //   impôt par part = 3903.99 → arrondi 3904
    //   Pas de QF supp, pas de décote (3904 > seuil 1982), pas de PFU/PS
    //   RFR = 40000 (salaire brut, charges = 0)
    expected: {
      impotNet: 3904,
      revenuReference: 40000,
      tmi: 0.30,
    },
  },

  // -------------------------------------------------------------------
  // Situation 'divorce-separe' : doit donner exactement le même résultat
  // qu'un célibataire à inputs égaux (1 part, seuils single).
  // -------------------------------------------------------------------
  {
    name: 'Divorcé/séparé 1 part, salaire 40 000 € → identique célibataire',
    input: makeInput({ situation: 'divorce-separe', sal1: 40000 }),
    expected: {
      impotNet: 3904,
      revenuReference: 40000,
      tmi: 0.30,
    },
  },

  // -------------------------------------------------------------------
  // Demi-part supplémentaire — selon le cas L/N/P/F/W/S/G
  // Tous appliqués sur célibataire 40 000 € pour comparer les plafonds
  // -------------------------------------------------------------------
  // Cas L (vieux parent isolé) — plafond 1 079 €
  // Validé contre simulateur officiel impots.gouv.fr : 2 825 €
  {
    name: 'Demi-part supp cas L (plafond 1 079 €), célib 40 000 €',
    input: makeInput({ sal1: 40000, demiPartSupp: true, demiPartCas: 'L' }),
    // avantage QF = 1858, plafond = 1079, supplément = 779 → impôt = 2046 + 779 = 2825
    expected: { impotNet: 2825, revenuReference: 40000, tmi: 0.30 },
  },

  // Cas N/P/F/W/S — plafond standard 1 807 € (testé via P, identique pour les 4 autres)
  {
    name: 'Demi-part supp cas P (plafond 1 807 €), célib 40 000 €',
    input: makeInput({ sal1: 40000, demiPartSupp: true, demiPartCas: 'P' }),
    // avantage QF = 1858, plafond = 1807, supplément = 51 → impôt = 2046 + 51 = 2097
    expected: { impotNet: 2097, revenuReference: 40000, tmi: 0.30 },
  },

  // Cas G (veuve de guerre) — déplafonné
  {
    name: 'Demi-part supp cas G (déplafonné), célib 40 000 €',
    input: makeInput({ sal1: 40000, demiPartSupp: true, demiPartCas: 'G' }),
    // plafond = Infinity → supplément = 0 → impôt = 2046
    // TMI : pas de plafonnement actif → suit le QF réel = 24000 → tranche 11%
    expected: { impotNet: 2046, revenuReference: 40000, tmi: 0.11 },
  },

  // -------------------------------------------------------------------
  // 1AP/1BP — Allocations chômage / préretraite
  // Combinées avec les salaires pour l'abattement 10 % (plancher 509 €,
  // plafond 14 555 €). Entrent dans le RFR.
  // -------------------------------------------------------------------
  {
    name: '1AP : 30 000 € sal + 10 000 € chômage = identique 40 000 € sal',
    input: makeInput({ sal1: 30000, allocChomage1: 10000 }),
    // total déclarant 1 = 40 000 → abattement = 4 000 → net = 36 000
    // identique à un salarié 40 000 € pur (cas baseline)
    expected: { impotNet: 3904, revenuReference: 40000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 1AK/1BK — Frais réels (option, remplace l'abattement 10 %)
  // -------------------------------------------------------------------
  {
    name: '1AK : 40 000 € sal + 5 000 € frais réels (option déclarant 1)',
    input: makeInput({ sal1: 40000, fraisReels1: 5000 }),
    // 5 000 € de frais réels remplacent l'abattement 10% (qui aurait été 4 000)
    // salaire net = 40 000 - 5 000 = 35 000
    // QF = 35 000 → tranche 3 (29 579-35 000) : 5 421 × 0.30 = 1 626.30
    //       + tranche 2 : 17 979 × 0.11 = 1 977.69
    //       = 3 603.99 → arrondi 3 604
    // économie vs baseline : 300 € (= 1 000 € × 30% TMI)
    expected: { impotNet: 3604, revenuReference: 40000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 1GH/1HH — Heures supplémentaires et RTT exonérés
  // Plafond annuel 7 500 € / déclarant. Au-delà : surplus imposable.
  // Part exonérée entre dans le RFR mais pas dans le revenu imposable.
  // -------------------------------------------------------------------
  {
    name: '1GH sous plafond : 35 000 € sal + 5 000 € HS exo (intégralement exo)',
    input: makeInput({ sal1: 35000, heuresSupExo1: 5000 }),
    // 5 000 ≤ 7 500 → 0 € imposable, 5 000 € dans le RFR
    // total imposable = 35 000 → abat 10% = 3 500 → net = 31 500
    // tranche 2 : 17 979 × 0.11 = 1 977.69
    // tranche 3 : (31 500-29 579) × 0.30 = 576.30
    // impôt par part = 2 553.99 → 2 554
    // RFR = 35 000 + 5 000 = 40 000
    expected: { impotNet: 2554, revenuReference: 40000, tmi: 0.30 },
  },
  {
    name: '1GH au-dessus plafond : 35 000 € sal + 10 000 € HS (2 500 imposables)',
    input: makeInput({ sal1: 35000, heuresSupExo1: 10000 }),
    // 10 000 - 7 500 = 2 500 € imposables, ajoutés au pool sal
    // total imposable = 35 000 + 2 500 = 37 500 → abat 10% = 3 750 → net = 33 750
    // tranche 2 : 17 979 × 0.11 = 1 977.69
    // tranche 3 : (33 750-29 579) × 0.30 = 1 251.30
    // impôt par part = 3 228.99 → 3 229
    // RFR = 35 000 + 10 000 = 45 000
    expected: { impotNet: 3229, revenuReference: 45000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 1AZ/1BZ — Pensions d'invalidité
  // Mêmes règles que pensions retraite (1AS/1BS) : abattement 10%
  // commun, plancher 454 €/pensionné, plafond foyer 4 439 €.
  // -------------------------------------------------------------------
  {
    name: '1AZ : 20 000 € pen + 20 000 € pen invalidité = identique 40 000 € pen',
    input: makeInput({ pen1: 20000, pensInvalidite1: 20000 }),
    // total déclarant 1 = 40 000 € → abat = 4 000 (sous plafond foyer 4 439)
    // → net = 36 000 → impôt = 3 904 (identique baseline 40 000 € sal)
    expected: { impotNet: 3904, revenuReference: 40000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 1AO/1BO — Pensions alimentaires perçues
  // Mêmes règles que pensions retraite/invalidité : abattement 10%
  // commun, plancher 454 €/bénéficiaire, plafond foyer 4 439 €.
  // -------------------------------------------------------------------
  {
    name: '1AO : 30 000 € pen + 10 000 € pension alimentaire reçue',
    input: makeInput({ pen1: 30000, pensAlimRecue1: 10000 }),
    // total déclarant 1 = 40 000 → abat = 4 000 (sous plafond foyer 4 439)
    // → net = 36 000 → impôt = 3 904 (identique pen pure 40 000 €)
    expected: { impotNet: 3904, revenuReference: 40000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 2TR — Intérêts et placements à revenu fixe
  // PFU 12,8 % par défaut, barème en option (sans abattement contrairement
  // aux dividendes). PS 18,6 %.
  // -------------------------------------------------------------------
  {
    name: '2TR PFU : 40 000 € sal + 1 000 € intérêts PFU',
    input: makeInput({ sal1: 40000, interets: 1000, optionPFU: 'pfu' }),
    // baseline 40k → 3 904
    // + IR mob = 1 000 × 12,8 % = 128
    // + PS = 1 000 × 18,6 % = 186
    // total = 3 904 + 128 + 186 = 4 218
    // RFR = 40 000 + 1 000 = 41 000
    expected: { impotNet: 4218, revenuReference: 41000, tmi: 0.30 },
  },
  {
    name: '2TR barème : 40 000 € sal + 1 000 € intérêts au barème',
    input: makeInput({ sal1: 40000, interets: 1000, optionPFU: 'bareme' }),
    // sal net 36 000 + intérêts 1 000 (sans abattement) → RBG 37 000
    // QF = 37 000 → tranche 2 : 1 977.69 + tranche 3 : (37 000-29 579)×0.30 = 2 226.30
    // impôt brut = 4 203.99 → 4 204
    // + PS 186 (toujours dus même au barème)
    // total = 4 204 + 186 = 4 390
    expected: { impotNet: 4390, revenuReference: 41000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 2OP — Option barème global mobilier (dividendes + intérêts + PV)
  // L'option couvre TOUS les revenus mobiliers d'un coup.
  // -------------------------------------------------------------------
  {
    name: '2OP non coché (PFU) : 40k sal + 1k div + 1k intérêts + 1k PV',
    input: makeInput({ sal1: 40000, dividendes: 1000, interets: 1000, pv: 1000, optionPFU: 'pfu' }),
    // baseline 40k → 3 904
    // IR mob = 3 000 × 12,8 % = 384
    // PS = 3 000 × 18,6 % = 558
    // total = 3 904 + 384 + 558 = 4 846
    // RFR = 40 000 + 3 000 = 43 000
    expected: { impotNet: 4846, revenuReference: 43000, tmi: 0.30 },
  },
  {
    name: '2OP coché (barème) : 40k sal + 1k div + 1k intérêts + 1k PV',
    input: makeInput({ sal1: 40000, dividendes: 1000, interets: 1000, pv: 1000, optionPFU: 'bareme' }),
    // sal net 36 000
    // + dividendes 600 (abattement 40 %) + intérêts 1 000 (pas d'abat) + PV 1 000 (pas d'abat)
    // RBG = 38 600
    // QF = 38 600 → tranche 2 : 1 977.69 + tranche 3 : (38 600-29 579)×0.30 = 2 706.30
    // impôt brut = 4 683.99 → 4 684
    // + PS 558 (toujours dus)
    // total = 4 684 + 558 = 5 242
    // PFU plus avantageux ici de 396 € à TMI 30 %
    expected: { impotNet: 5242, revenuReference: 43000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 2CH/2VV/2WW — Produits assurance-vie > 8 ans
  // Abattement annuel 4 600 € (single) / 9 200 € (couple) sur l'IR.
  // PS 17,2 % sur le brut. Imposition séparée du barème.
  // -------------------------------------------------------------------
  {
    name: 'AV > 8 ans : célib 40k sal + 5k produits 7,5 % (dépasse abat 4 600)',
    input: makeInput({ sal1: 40000, avProduits75: 5000 }),
    // abattement 4 600 imputé sur 7,5 % (pas de 12,8 %) → imposable 400
    // IR AV = 400 × 7,5 % = 30
    // PS AV = 5 000 × 17,2 % = 860
    // total = 3 904 + 30 + 860 = 4 794
    expected: { impotNet: 4794, revenuReference: 45000, tmi: 0.30 },
  },
  {
    name: 'AV > 8 ans : célib 40k sal + 3k produits 7,5 % (intégralement abattus)',
    input: makeInput({ sal1: 40000, avProduits75: 3000 }),
    // 3 000 ≤ 4 600 → 0 € imposable, 0 € IR AV
    // PS AV = 3 000 × 17,2 % = 516
    expected: { impotNet: 4420, revenuReference: 43000, tmi: 0.30 },
  },
  {
    name: 'AV > 8 ans : célib 40k sal + 10k produits 12,8 % (au-delà 150k primes)',
    input: makeInput({ sal1: 40000, avProduits128: 10000 }),
    // abattement 4 600 imputé en priorité sur le 12,8 % → imposable 5 400
    // IR AV = 5 400 × 12,8 % = 691,2
    // PS AV = 10 000 × 17,2 % = 1 720
    // total = 3 904 + 691,2 + 1 720 = 6 315,2 → 6 315
    expected: { impotNet: 6315, revenuReference: 50000, tmi: 0.30 },
  },
  {
    name: 'AV > 8 ans MIXTE : célib 40k sal + 150k @ 7,5 % + 50k @ 12,8 %',
    input: makeInput({ sal1: 40000, avProduits75: 150000, avProduits128: 50000 }),
    // abattement 4 600 imputé en priorité sur le 12,8 % → 50 000 - 4 600 = 45 400 imposable
    // IR AV = 45 400 × 12,8 % + 150 000 × 7,5 % = 5 811,2 + 11 250 = 17 061,2
    // PS AV = 200 000 × 17,2 % = 34 400
    // total = 3 904 + 17 061,2 + 34 400 = 55 365,2 → 55 365
    // RFR = 40 000 + 200 000 = 240 000 (déclenche CEHR à partir de 250k → ici non)
    expected: { impotNet: 55365, revenuReference: 240000, tmi: 0.30 },
  },

  // -------------------------------------------------------------------
  // 2CK — PFNL (Prélèvement Forfaitaire Non Libératoire) déjà versé
  // Acompte 12,8 % prélevé à la source par la banque. Crédit d'impôt
  // hors plafond niches, à imputer intégralement sur l'IR final.
  // -------------------------------------------------------------------
  {
    name: '2CK : 40k sal + 1k div PFU avec PFNL 128 € déjà prélevé',
    input: makeInput({ sal1: 40000, dividendes: 1000, optionPFU: 'pfu', pfnlVerse: 128 }),
    // sans PFNL : 4 218 € (baseline 3 904 + 128 IR mob + 186 PS)
    // - PFNL 128 € déjà versé = 4 090 €
    expected: { impotNet: 4090, revenuReference: 41000, tmi: 0.30 },
  },
  {
    name: '2CK : PFNL > impôt dû → impôt net négatif (remboursement)',
    input: makeInput({ sal1: 0, interets: 100, optionPFU: 'pfu', pfnlVerse: 50 }),
    // pas de salaire → impôt barème = 0 (et < décote, mais base 0)
    // IR mobilier = 100 × 12,8 % = 12,8
    // PS mobilier = 100 × 18,6 % = 18,6
    // total = 0 + 12,8 + 18,6 = 31,4 €
    // - PFNL 50 € déjà versé = -18,6 € → arrondi -19 €
    // (excédent remboursé par l'administration)
    expected: { impotNet: -19, revenuReference: 100, tmi: 0 },
  },

  // -------------------------------------------------------------------
  // 4BC — Déficit foncier imputable sur le revenu global
  // Plafond 10 700 €/an. Le surplus est reportable 10 ans (non simulé).
  // PS foncier dus uniquement sur résultat foncier net positif.
  // -------------------------------------------------------------------
  {
    name: '4BC déficit modéré : 40k sal + foncier réel -5 000 €',
    input: makeInput({ sal1: 40000, foncierReel: -5000 }),
    // RBG = 36 000 - 5 000 = 31 000 (déficit sous plafond)
    // QF=31 000 → tranche 2: 1 977.69 + tranche 3: (31 000-29 579)×0.30 = 426.30
    // impôt = 2 403.99 → 2 404
    // pas de PS (résultat foncier négatif)
    // RFR = 40 000 + 0 + (-5 000) = 35 000
    expected: { impotNet: 2404, revenuReference: 35000, tmi: 0.30 },
  },
  {
    name: '4BC déficit plafonné : 60k sal + foncier réel -15 000 € (plafond 10 700)',
    input: makeInput({ sal1: 60000, foncierReel: -15000 }),
    // sal net 60 000 - 6 000 = 54 000
    // foncierReel plafonné à -10 700
    // RBG = 54 000 - 10 700 = 43 300
    // QF=43 300 → tranches: 1 977.69 + (43 300-29 579)×0.30 = 6 093.99 → 6 094
    // pas de PS, pas de décote
    // RFR = 60 000 + (-10 700) = 49 300 (et non 45 000 si non plafonné)
    expected: { impotNet: 6094, revenuReference: 49300, tmi: 0.30 },
  },
  {
    name: '4BA non-régression : 40k sal + foncier réel +5 000 € (revenu)',
    input: makeInput({ sal1: 40000, foncierReel: 5000 }),
    // sal net 36 000 + foncier 5 000 → RBG 41 000
    // QF=41 000 → 1 977.69 + (41 000-29 579)×0.30 = 5 403.99 → 5 404
    // PS foncier = 5 000 × 17,2 % = 860
    // total = 5 404 + 860 = 6 264
    expected: { impotNet: 6264, revenuReference: 45000, tmi: 0.30 },
  },
];

if (typeof module !== 'undefined') module.exports = { CASES, makeInput };
