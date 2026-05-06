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

    // Revenus salaires/pensions
    sal1: 0, sal2: 0,
    pen1: 0, pen2: 0,

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
    pv: 0,
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
  // Demi-part supplémentaire (cases L/N/P/F/W/S/G de la 2042)
  // → +0,5 part, avantage QF plafonné à 1 807 €
  // -------------------------------------------------------------------
  {
    name: 'Célibataire 1,5 part (demi-part supp), salaire 40 000 €',
    input: makeInput({ sal1: 40000, demiPartSupp: true }),
    // QF = 36000/1.5 = 24000 → impôt par part = (24000-11600)*0.11 = 1364
    // impôt brut = 1364 × 1,5 = 2046
    // qfBase = 36000/1 = 36000 → impôt brut base = 3904
    // avantage QF = 3904 - 2046 = 1858
    // plafond = 1 demi-part × 1807 = 1807
    // supplément QF = 1858 - 1807 = 51
    // impôt après QF = 2046 + 51 = 2097, > seuil décote → pas de décote
    // TMI : plafonnement actif → basé sur qfBase = 36000 → tranche 30%
    expected: {
      impotNet: 2097,
      revenuReference: 40000,
      tmi: 0.30,
    },
  },
];

if (typeof module !== 'undefined') module.exports = { CASES, makeInput };
