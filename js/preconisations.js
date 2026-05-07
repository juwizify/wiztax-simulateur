/**
 * PRÉCONISATIONS — Allocation d'un budget d'épargne sur N leviers fiscaux
 * Outil pour le conseiller en gestion de patrimoine.
 *
 * Mode "ajout" : les préconisations s'AJOUTENT aux inputs déjà saisis dans
 * l'onglet Simulateur (le client peut avoir un PER existant + on préconise
 * un versement supplémentaire).
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

const LEVIERS_CATALOGUE = [
  // ─── HORS NICHES ───────────────────────────────────────
  {
    id: 'per', label: 'PER (Plan d\'Épargne Retraite)',
    cat: 'hors', mode: 'versement-direct', inputKey: 'per',
    desc: 'Déduction du revenu imposable. Économie = versement × TMI.',
  },
  {
    id: 'dons7UD', label: 'Dons « Coluche » (organismes d\'aide, 75%)',
    cat: 'hors', mode: 'versement-direct', inputKey: 'dons7UD',
    desc: '75 % jusqu\'à 2 000 €, surplus bascule sur 7UF (66 %).',
  },
  {
    id: 'dons7UF', label: 'Dons d\'intérêt général (66%)',
    cat: 'hors', mode: 'versement-direct', inputKey: 'dons',
    desc: 'Associations, fondations, écoles. Total dons plafonné à 20 % du RNI.',
  },
  {
    id: 'ehpad', label: 'Frais EHPAD ascendants (25%)',
    cat: 'hors', mode: 'versement-direct', inputKey: 'ehpadFrais',
    desc: '25 % des dépenses, plafond 10 000 € par personne hébergée.',
  },
  {
    id: 'syndic', label: 'Cotisations syndicales (66%)',
    cat: 'hors', mode: 'versement-direct', inputKey: 'cotSyndicales',
    desc: '66 %, plafond 1 % des salaires + chômage + pensions.',
  },
  {
    id: 'malraux', label: 'Loi Malraux (22% ou 30%)',
    cat: 'hors', mode: 'taux-variable', inputKey: 'malraux',
    desc: 'Restauration en SPR ou QAD. Hors plafond niches.',
    params: [
      { name: 'zone', label: 'Zone',
        options: [
          { value: 'spr-non', label: 'SPR sans PSMV (22 %)', taux: 0.22 },
          { value: 'spr-oui', label: 'SPR avec PSMV ou QAD (30 %)', taux: 0.30 },
        ]
      },
    ],
  },

  // ─── NICHE 10 000 € ────────────────────────────────────
  {
    id: 'emploiDom', label: 'Emploi à domicile (50%)',
    cat: 'niche10', mode: 'versement-direct', inputKey: 'emploiDomicile',
    desc: '50 % des dépenses, plafond 12 000 € (jusqu\'à 15 000 € avec majoration enfants).',
  },
  {
    id: 'gardeEnf', label: 'Garde enfants < 6 ans (50%)',
    cat: 'niche10', mode: 'versement-direct', inputKey: 'gardeEnfants',
    desc: '50 % des dépenses, plafond 3 500 € par enfant.',
  },
  {
    id: 'fcpiJei', label: 'FCPI JEI (30%)',
    cat: 'niche10', mode: 'taux', taux: 0.30, inputKey: 'fcpiJei',
    desc: 'Nouveau LF 2026. Plafond souscription 12 k€ single / 24 k€ couple.',
  },
  {
    id: 'fipCorse', label: 'FIP Corse / Outre-mer (30%)',
    cat: 'niche10', mode: 'taux', taux: 0.30, inputKey: 'fipCorse',
    desc: 'Plafond souscription 12 k€ single / 24 k€ couple.',
  },
  {
    id: 'irPme', label: 'IR-PME / Madelin (25%)',
    cat: 'niche10', mode: 'taux', taux: 0.25, inputKey: 'irPme',
    desc: 'Souscription DIRECTE au capital de PME. Plafond 50 k€ / 100 k€.',
  },
  {
    id: 'gfi', label: 'GFI Forestier (18%)',
    cat: 'niche10', mode: 'taux', taux: 0.18, inputKey: 'gfi',
    desc: 'Groupement Forestier d\'Investissement. Plafond 50 k€ / 100 k€.',
  },
  {
    id: 'locAvantages', label: 'Loc\'Avantages',
    cat: 'niche10', mode: 'taux-variable', inputKey: 'locAvantages',
    desc: 'Location à loyer modéré. Plafond 10 000 € de dépenses retenues.',
    params: [
      { name: 'palier', label: 'Palier de décote',
        options: [
          { value: 'loc1', label: 'Loc 1 — décote 15 % (RI 15 %)', taux: 0.15 },
          { value: 'loc2', label: 'Loc 2 — décote 30 % (RI 35 %)', taux: 0.35 },
          { value: 'loc3', label: 'Loc 3 — IML décote 45 % (RI 65 %)', taux: 0.65 },
        ]
      },
    ],
  },
  {
    id: 'pinel', label: 'Pinel (engagement existant)',
    cat: 'niche10', mode: 'taux-variable', inputKey: 'pinel',
    desc: 'Éteint depuis fin 2024 pour les nouveaux engagements. Pour les engagements en cours uniquement.',
    params: [
      { name: 'duree', label: 'Durée d\'engagement',
        options: [
          { value: '6',  label: '6 ans (12 %)',  taux: 0.12 },
          { value: '9',  label: '9 ans (18 %)',  taux: 0.18 },
          { value: '12', label: '12 ans (21 %)', taux: 0.21 },
        ]
      },
    ],
  },

  // ─── NICHE 18 000 € (majorée) ──────────────────────────
  {
    id: 'sofica', label: 'SOFICA (30%)',
    cat: 'niche18', mode: 'taux', taux: 0.30, inputKey: 'sofica',
    desc: 'Financement cinéma/audiovisuel. Plafond 18 k€ souscription. Niche majorée 18 k€.',
  },
  {
    id: 'girardinPD', label: 'Girardin Industriel — Plein Droit',
    cat: 'niche18', mode: 'taux-variable', inputKey: 'girardinPD',
    desc: 'Investissement à fonds perdus dans une SNC ultramarine. Rétrocession 56 % à l\'opérateur, le solde finance la RI majorée. Quote-part 44 % dans le plafond niches 18 k€.',
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
    cat: 'niche18', mode: 'taux-variable', inputKey: 'girardinAG',
    desc: 'Idem Plein Droit mais avec agrément ministériel (programmes > 250 k€). Rétrocession 66 %. Quote-part 34 % dans le plafond niches 18 k€.',
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

  // ─── DÉDUCTION D'ASSIETTE FONCIER ──────────────────────
  {
    id: 'jeanbrun', label: 'Dispositif Jeanbrun (LF 2026)',
    cat: 'foncier', mode: 'jeanbrun', inputKey: 'jeanbrunAmort',
    desc: 'Amortissement déductible des revenus fonciers. Saisir le montant d\'amortissement annuel.',
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
    }
    else if (lev.mode === 'taux') {
      out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * lev.taux;
    }
    else if (lev.mode === 'taux-variable') {
      const opt = lev.params[0].options.find(o => o.value === p.paramValue);
      if (opt) out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * opt.taux;
    }
    else if (lev.mode === 'jeanbrun') {
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
