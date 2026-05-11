/**
 * PRÉCONISATIONS — Allocation d'un budget d'épargne sur N leviers fiscaux
 * Outil pour le conseiller en gestion de patrimoine.
 *
 * Mode "ajout" : les préconisations s'AJOUTENT aux inputs déjà saisis dans
 * l'onglet Simulateur (le client peut avoir un PER existant + on préconise
 * un versement supplémentaire).
 *
 * ⚠ LIMITATIONS CONNUES :
 *
 * - PINEL : le calcul actuel est INCORRECT pour Pinel.
 *   La RI Pinel doit être ÉTALÉE sur la durée d'engagement (6/9/12 ans),
 *   pas appliquée intégralement sur l'année. Exemple : 200 000 € investis
 *   en Pinel 9 ans (taux 18 %) doivent donner 4 000 €/an de RI pendant
 *   9 ans (= 200 000 × 18 % / 9), pas 36 000 € sur l'année.
 *   Le simulateur applique aujourd'hui le taux complet sur l'année,
 *   ce qui SUR-ESTIME largement l'avantage fiscal projeté pour Pinel.
 *   À fixer en V2 : ajouter (taux total / durée) dans le calcul.
 *
 * - INVESTISSEMENTS IMMOBILIERS À CRÉDIT (Pinel, Jeanbrun, Malraux,
 *   Loc'Avantages, Denormandie) : le "montant" saisi représente
 *   l'investissement total OU les dépenses de l'année OU l'amortissement
 *   annuel selon le levier. Aucun de ces montants n'est du cash sortant
 *   sur l'année courante (financement crédit, manque à gagner, base
 *   d'amortissement). Ils sont donc EXCLUS du calcul du "budget alloué"
 *   (jauge), pour éviter de saturer artificiellement le budget cash
 *   du client.
 *
 *   Catégorisation budget :
 *   - cash    : levier qui consomme du cash de l'année (PER, dons, etc.)
 *   - exclu   : levier financé à crédit ou amortissement (immo)
 */

// ─────────────────────────────────────────────
// CATALOGUE DES LEVIERS
// ─────────────────────────────────────────────
// Modes :
//   - 'versement-direct' : le moteur attend déjà un montant versé
//     → on additionne directement à l'inputKey
//   - 'taux' : conversion versement → RI = versement × taux
//     → on additionne (versement × taux) à l'inputKey (qui est une RI dans le moteur)
//   - 'taux-variable' : taux dépend d'un paramètre additionnel
//     → params[0].options[].taux
//   - 'jeanbrun' : amortissement spécifique foncier (pas IR direct)

// Schéma cible (Phase 3.1) — chaque levier a un champ `levier: 1|2|3` qui
// pilote son groupement dans la nouvelle UI 3 sections :
//   1 = Réduire la base imposable (déductions du revenu)
//   2 = Réductions d'impôt (perdues si IR = 0)
//   3 = Crédits d'impôt (remboursés même si IR = 0)
// `cat` reste utilisé par la mécanique 2 poches niches (niche10 / niche18 / hors / foncier).
const LEVIERS_CATALOGUE = [
  // ─── LEVIER 1 — RÉDUIRE LA BASE IMPOSABLE ──────────────
  {
    id: 'per', label: 'PER (Plan d\'Épargne Retraite)',
    levier: 1, cat: 'hors', mode: 'versement-direct', inputKey: 'per',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le VERSEMENT VOLONTAIRE de l\'année sur le PER. Cash sortant pour le client (épargne bloquée jusqu\'à la retraite). Déduction du revenu imposable → économie ≈ versement × TMI. Plafond auto = 10 % des revenus pro (cap 37 680 €), par déclarant.',
  },
  {
    id: 'jeanbrun', label: 'Dispositif Jeanbrun (LF 2026)',
    levier: 1, cat: 'foncier', mode: 'jeanbrun', inputKey: 'jeanbrunAmort',
    paramKey: 'jeanbrunCategorie',
    nature: 'amortissement-annuel', budget: 'exclu',
    info: 'Saisir l\'AMORTISSEMENT ANNUEL = prix d\'achat du bien × taux selon la catégorie de loyer (3,5 / 4,5 / 5,5 %). Ce n\'est PAS du cash sortant — c\'est une déduction comptable qui réduit l\'assiette des revenus fonciers → EXCLU du budget annuel. Le bien lui-même est généralement financé à crédit. Applicable aux acquisitions jusqu\'au 31/12/2028.',
    params: [
      { name: 'categorie', label: 'Catégorie de loyer',
        options: [
          { value: 'intermediaire', label: 'Intermédiaire (3,5 % · plafond 8 000 €)', plafond: 8000 },
          { value: 'social',        label: 'Social (4,5 % · plafond 10 000 €)',       plafond: 10000 },
          { value: 'tres-social',   label: 'Très social (5,5 % · plafond 12 000 €)',  plafond: 12000 },
        ]
      },
    ],
  },

  // ─── LEVIER 2 — RÉDUCTIONS D'IMPÔT ─────────────────────
  // 2.a) Hors plafond niches
  {
    id: 'dons7UD', label: 'Dons « Coluche » (organismes d\'aide, 75%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'dons7UD',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DES DONS de l\'année à des organismes d\'aide aux personnes en difficulté (Restos du Cœur, Croix-Rouge, etc.). Cash sortant. Réduction 75 % jusqu\'à 2 000 €, surplus bascule sur le régime 7UF (66 %).',
  },
  {
    id: 'dons7UF', label: 'Dons d\'intérêt général (66%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'dons',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DES DONS de l\'année à des associations / fondations / écoles d\'intérêt général. Cash sortant. Réduction 66 %, total dons plafonné à 20 % du RNI.',
  },
  {
    id: 'ehpad', label: 'Frais EHPAD ascendants (25%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'ehpadFrais',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES D\'HÉBERGEMENT ET DE DÉPENDANCE de l\'année facturées par l\'EHPAD pour un ascendant. Cash sortant. Réduction 25 %, plafond 10 000 € par personne hébergée.',
  },
  {
    id: 'malraux', label: 'Loi Malraux (22% ou 30%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'malrauxTravaux',
    paramKey: 'malrauxZone',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: 'Saisir les TRAVAUX DE RESTAURATION DE L\'ANNÉE sur immeuble en SPR ou QAD. Généralement financés à crédit → EXCLU du budget annuel. Le moteur calcule la RI = min(travaux, 100 000 €/an) × 22 % ou 30 % selon zone. Hors plafond niches.',
    params: [
      { name: 'zone', label: 'Zone',
        options: [
          { value: 'spr-non', label: 'SPR sans PSMV (22 %)' },
          { value: 'spr-oui', label: 'SPR avec PSMV ou QAD (30 %)' },
        ]
      },
    ],
  },
  // 2.b) Dans le panier niche 10 000 €
  {
    id: 'fcpiJei', label: 'FCPI JEI (30%)',
    levier: 2, cat: 'niche10', mode: 'taux', taux: 0.30, inputKey: 'fcpiJei',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de FCPI investissant dans des Jeunes Entreprises Innovantes. Cash sortant. Réduction 30 %. Plafond 12 000 € (single) / 24 000 € (couple). Blocage 5 à 10 ans.',
  },
  {
    id: 'fipCorse', label: 'FIP Corse / Outre-mer (30%)',
    levier: 2, cat: 'niche10', mode: 'taux', taux: 0.30, inputKey: 'fipCorse',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de FIP Corse ou Outre-mer. Cash sortant. Réduction 30 %. Plafond 12 000 € / 24 000 €. Blocage 5 à 10 ans.',
  },
  {
    id: 'irPme', label: 'IR-PME / Madelin (25%)',
    levier: 2, cat: 'niche10', mode: 'taux', taux: 0.25, inputKey: 'irPme',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DIRECTE DE L\'ANNÉE au capital d\'une PME non cotée (≠ via fonds). Cash sortant. Réduction 25 % (taux boost 2024-2025). Plafond 50 000 € (single) / 100 000 € (couple). Conservation 5 ans.',
  },
  {
    id: 'gfi', label: 'GFI Forestier (18%)',
    levier: 2, cat: 'niche10', mode: 'taux', taux: 0.18, inputKey: 'gfi',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de Groupement Forestier d\'Investissement. Cash sortant. Réduction 18 % (jusqu\'à 25 % en zone éligible). Plafond 50 k€ / 100 k€. Avantages annexes IFI et succession.',
  },
  {
    id: 'locAvantages', label: 'Loc\'Avantages',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'locAvantagesDepenses',
    paramKey: 'locAvantagesPalier',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: 'Saisir les DÉPENSES (loyers décotés) DE L\'ANNÉE liées à la location à loyer modéré (ex-Cosse). Pas du cash sortant strict, plutôt un manque à gagner sur loyer → EXCLU du budget annuel. Le moteur calcule la RI = min(dépenses, 10 000 €) × 15/35/65 % selon palier de décote.',
    params: [
      { name: 'palier', label: 'Palier de décote',
        options: [
          { value: 'loc1', label: 'Loc 1 — décote 15 % (RI 15 %)' },
          { value: 'loc2', label: 'Loc 2 — décote 30 % (RI 35 %)' },
          { value: 'loc3', label: 'Loc 3 — IML décote 45 % (RI 65 %)' },
        ]
      },
    ],
  },
  // 2.c) Dans le panier niche 18 000 € (majoration)
  {
    id: 'sofica', label: 'SOFICA (30%)',
    levier: 2, cat: 'niche18', mode: 'taux', taux: 0.30, inputKey: 'sofica',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de SOFICA (financement cinéma/audiovisuel). Cash sortant. Réduction 30 % standard (36 % ou 48 % si conditions majorées). Versement plafonné à min(18 000 €, 25 % du RNG). Niche majorée 18 k€. Conservation 5 ans.',
  },
  {
    id: 'girardinPD', label: 'Girardin Industriel — Plein Droit',
    levier: 2, cat: 'niche18', mode: 'taux-variable', inputKey: 'girardinPD',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN PD de l\'année (versement à l\'opérateur, à fonds perdus). Cash sortant. Mécanique one-shot : RI majorée encaissée l\'année suivante. Quote-part 44 % dans le plafond niches 18 k€.',
    params: [
      { name: 'rendement', label: 'Rendement (RI / investissement)',
        options: [
          { value: '110', label: '110 % (rentabilité 10 % — conservateur)', taux: 1.10 },
          { value: '113', label: '113 % (rentabilité 13 % — médian marché)', taux: 1.13 },
          { value: '116', label: '116 % (rentabilité 16 % — performant)', taux: 1.16 },
          { value: '120', label: '120 % (rentabilité 20 % — premium / fin d\'année)', taux: 1.20 },
        ]
      },
    ],
  },
  {
    id: 'girardinAG', label: 'Girardin Industriel — Avec Agrément',
    levier: 2, cat: 'niche18', mode: 'taux-variable', inputKey: 'girardinAG',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN AG de l\'année (versement à l\'opérateur, à fonds perdus). Idem Plein Droit mais avec agrément ministériel (programmes > 250 k€). Cash sortant. Quote-part 34 % dans le plafond niches 18 k€.',
    params: [
      { name: 'rendement', label: 'Rendement (RI / investissement)',
        options: [
          { value: '105', label: '105 % (rentabilité 5 % — conservateur)', taux: 1.05 },
          { value: '108', label: '108 % (rentabilité 8 % — médian marché)', taux: 1.08 },
          { value: '112', label: '112 % (rentabilité 12 % — performant)', taux: 1.12 },
          { value: '115', label: '115 % (rentabilité 15 % — premium)', taux: 1.15 },
        ]
      },
    ],
  },

  // ─── LEVIER 3 — CRÉDITS D'IMPÔT (REMBOURSÉS SI IR = 0) ──
  {
    id: 'emploiDom', label: 'Emploi à domicile (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'emploiDomicile',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES DE L\'ANNÉE (salaires + charges sociales) pour un employé à domicile (ménage, jardinage, soutien scolaire, aide à la personne, etc.). Cash sortant. Crédit 50 %, plafond 12 000 € (15 000 € avec majoration enfants).',
  },
  {
    id: 'gardeEnf', label: 'Garde enfants < 6 ans (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'gardeEnfants',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES DE GARDE DE L\'ANNÉE pour enfants de moins de 6 ans (crèche, assistante maternelle, garderie périscolaire). Cash sortant. Crédit 50 %, plafond 3 500 € par enfant.',
  },
  {
    id: 'syndic', label: 'Cotisations syndicales (66%)',
    levier: 3, cat: 'hors', mode: 'versement-direct', inputKey: 'cotSyndicales',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir la COTISATION SYNDICALE de l\'année (CGT, CFDT, FO, CFTC, Sud, etc.). Cash sortant. Crédit d\'impôt 66 %, plafond 1 % des salaires + alloc chômage + pensions.',
  },
];

// ─────────────────────────────────────────────
// STATE (en mémoire, pas de persistance V1)
// ─────────────────────────────────────────────
let preconisations = [];   // [{ id, leverId, montant, paramValue? }]
let budgetDispo = 0;
let nextRowId = 1;

function addLever(leverId = null) {
  preconisations.push({ id: nextRowId++, leverId: leverId || '', montant: 0, paramValue: null });
}

function removeLever(rowId) {
  preconisations = preconisations.filter(p => p.id !== rowId);
}

function updateLever(rowId, field, value) {
  const p = preconisations.find(p => p.id === rowId);
  if (!p) return;
  if (field === 'leverId') {
    p.leverId = value;
    // Reset paramValue à l'option par défaut si le levier en a un
    const lev = LEVIERS_CATALOGUE.find(l => l.id === value);
    p.paramValue = (lev && lev.params) ? lev.params[0].options[0].value : null;
  } else if (field === 'montant') {
    p.montant = parseFloat(value) || 0;
  } else if (field === 'paramValue') {
    p.paramValue = value;
  }
}

// ─────────────────────────────────────────────
// MOTEUR — application des préconisations sur les inputs
// ─────────────────────────────────────────────
function appliquerPreconisations(input, precos) {
  const out = { ...input };
  for (const p of precos) {
    const lev = LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    if (!lev || !p.montant) continue;

    if (lev.mode === 'versement-direct') {
      out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant;
      // Si un paramètre additionnel est associé (palier Loc'Avantages, zone
      // Malraux, catégorie Jeanbrun) on le propage dans l'input correspondant.
      if (lev.paramKey && p.paramValue) {
        out[lev.paramKey] = p.paramValue;
      }
    }
    else if (lev.mode === 'taux') {
      out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * lev.taux;
    }
    else if (lev.mode === 'taux-variable') {
      const opt = lev.params[0].options.find(o => o.value === p.paramValue);
      if (opt) out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * opt.taux;
    }
    else if (lev.mode === 'jeanbrun') {
      // Mode legacy spécifique — sera unifié vers versement-direct + paramKey
      // dans une itération suivante (le catalogue déclare désormais paramKey
      // = 'jeanbrunCategorie' pour préparer la migration).
      out.jeanbrunAmort = (out.jeanbrunAmort || 0) + p.montant;
      if (p.paramValue) out.jeanbrunCategorie = p.paramValue;
    }
  }
  return out;
}

// Calcule l'avantage fiscal estimé d'une ligne préconisation (pour l'affichage)
// (estimation simple, le vrai delta vient de la comparaison actuel/projeté)
function avantageEstime(p, inputAvant) {
  const lev = LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
  if (!lev || !p.montant) return 0;

  if (lev.mode === 'taux') {
    return p.montant * lev.taux;
  }
  if (lev.mode === 'taux-variable') {
    const opt = lev.params[0].options.find(o => o.value === p.paramValue);
    return opt ? p.montant * opt.taux : 0;
  }
  if (lev.mode === 'jeanbrun') {
    return null; // pas un avantage IR direct
  }
  // versement-direct : selon le levier
  if (lev.id === 'per') {
    // approximation : versement × TMI (le delta réel dépend du barème)
    return null; // on laisse le delta global parler
  }
  if (lev.id === 'dons7UD') return Math.min(p.montant, 2000) * 0.75 + Math.max(0, p.montant - 2000) * 0.66;
  if (lev.id === 'dons7UF') return p.montant * 0.66;
  if (lev.id === 'ehpad')   return Math.min(p.montant, 10000) * 0.25;
  if (lev.id === 'syndic')  return p.montant * 0.66;
  if (lev.id === 'emploiDom') return Math.min(p.montant, 12000) * 0.50;
  if (lev.id === 'gardeEnf')  return Math.min(p.montant, 3500) * 0.50;
  return null;
}

// Vérifie le respect du plafond individuel d'un levier
function checkPlafond(p, inputAvant) {
  const lev = LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
  if (!lev || !p.montant) return { ok: true, msg: '' };

  // Cumul = existant Simulateur + préconisé
  const existant = inputAvant[lev.inputKey] || 0;
  const total = existant + p.montant;

  if (lev.id === 'ehpad') {
    const nbPers = Math.max(1, inputAvant.ehpadNbPers || 1);
    const cap = 10000 * nbPers;
    return total > cap
      ? { ok: false, msg: `Cap ${cap.toLocaleString('fr-FR')} € (${nbPers} pers.)` }
      : { ok: true, msg: '' };
  }
  if (lev.id === 'emploiDom') {
    return p.montant > 12000 ? { ok: false, msg: 'Cap 12 000 €' } : { ok: true, msg: '' };
  }
  if (lev.id === 'gardeEnf') {
    const nbEnf = Math.max(1, inputAvant.nbEnfants || 1);
    const cap = 3500 * nbEnf;
    return p.montant > cap
      ? { ok: false, msg: `Cap ${cap.toLocaleString('fr-FR')} € (${nbEnf} enf.)` }
      : { ok: true, msg: '' };
  }
  if (lev.mode === 'jeanbrun') {
    const opt = lev.params[0].options.find(o => o.value === p.paramValue);
    const cap = opt ? opt.plafond : 8000;
    return p.montant > cap
      ? { ok: false, msg: `Cap ${cap.toLocaleString('fr-FR')} € (cat. ${p.paramValue})` }
      : { ok: true, msg: '' };
  }
  return { ok: true, msg: '' };
}

// Expose API globale
if (typeof window !== 'undefined') {
  window.PRECONISATIONS = {
    LEVIERS_CATALOGUE,
    appliquerPreconisations,
    avantageEstime,
    checkPlafond,
    addLever,
    removeLever,
    updateLever,
    getState:    () => ({ preconisations: [...preconisations], budgetDispo }),
    setBudget:   (v) => { budgetDispo = parseFloat(v) || 0; },
    getBudget:   () => budgetDispo,
    reset:       () => { preconisations = []; budgetDispo = 0; nextRowId = 1; },
  };
}

// Export Node pour tests
if (typeof module !== 'undefined') {
  module.exports = { LEVIERS_CATALOGUE, appliquerPreconisations, avantageEstime, checkPlafond };
}
