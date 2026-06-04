/**
 * PRÉCONISATIONS — Allocation d'un budget d'épargne sur N leviers fiscaux
 * Outil pour le conseiller en gestion de patrimoine.
 *
 * Lecture des paramètres fiscaux : on lit toujours via PARAMS (source unique
 * de vérité). En navigateur, PARAMS est exposé globalement par params.js
 * chargé avant ce script. En Node (tests), on importe via require.
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

// ─── Accès aux paramètres fiscaux : browser (global) ou Node (require) ───
const P = (typeof PARAMS !== 'undefined')
  ? PARAMS
  : require('./params.js').PARAMS;

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
    id: 'deficitFoncier', label: 'Déficit foncier (travaux)',
    levier: 1, cat: 'foncier', mode: 'deficit-foncier', inputKey: 'foncierReel',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir le MONTANT DES TRAVAUX FONCIERS de l\'année qui créent un déficit (travaux > loyers nets, ou en l\'absence de revenu foncier). Le déficit foncier s\'impute sur le REVENU GLOBAL, plafonné à 10 700 €/an (art. 156-I-3° CGI) — le surplus est reportable 10 ans sur les revenus fonciers ultérieurs (non simulé).\n\nÉconomie ≈ montant × (TMI + PS foncier 18,6 %).\n\nCash sortant pour le client (travaux à financer).',
  },
  {
    id: 'jeanbrun', label: 'Dispositif Jeanbrun (LF 2026)',
    levier: 1, cat: 'foncier', mode: 'jeanbrun', inputKey: 'jeanbrunAmort',
    paramKey: 'jeanbrunCategorie',
    nature: 'amortissement-annuel', budget: 'exclu',
    info: 'Saisir l\'AMORTISSEMENT ANNUEL = prix d\'achat du bien × taux selon la catégorie de loyer (3,5 / 4,5 / 5,5 %). Ce n\'est PAS du cash sortant — c\'est une déduction comptable qui réduit l\'assiette des revenus fonciers → EXCLU du budget annuel. Le bien lui-même est généralement financé à crédit. Applicable aux acquisitions jusqu\'au 31/12/2028.',
    params: [
      { name: 'categorie', label: 'Catégorie de loyer',
        // Plafonds lus dans PARAMS — taux fiscaux conservés en clair dans le
        // label parce qu'ils sont liés à la catégorie (pas dans PARAMS).
        options: [
          { value: 'intermediaire', label: `Intermédiaire (3,5 % · plafond ${P.plafonds.jeanbrunPlafondInter.toLocaleString('fr-FR')} €)`,    plafond: P.plafonds.jeanbrunPlafondInter },
          { value: 'social',        label: `Social (4,5 % · plafond ${P.plafonds.jeanbrunPlafondSocial.toLocaleString('fr-FR')} €)`,         plafond: P.plafonds.jeanbrunPlafondSocial },
          { value: 'tres-social',   label: `Très social (5,5 % · plafond ${P.plafonds.jeanbrunPlafondTresSoc.toLocaleString('fr-FR')} €)`,   plafond: P.plafonds.jeanbrunPlafondTresSoc },
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
    id: 'sofica', label: 'SOFICA',
    levier: 2, cat: 'niche18', mode: 'taux-variable', inputKey: 'sofica',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de SOFICA (financement cinéma/audiovisuel). Cash sortant. Choisir ensuite le taux selon le scénario de la SOFICA. Versement plafonné à min(18 000 €, 25 % du RNG). Niche majorée 18 k€. Conservation 5 ans.',
    params: [
      { name: 'taux', label: 'Taux SOFICA',
        options: [
          { value: '30', label: '30 % — standard',                                taux: 0.30 },
          { value: '36', label: '36 % — engagement production (10 %)',             taux: 0.36 },
          { value: '48', label: '48 % — production indép. + langues régionales',   taux: 0.48 },
        ]
      },
    ],
  },
  {
    id: 'girardinPD', label: 'Girardin Industriel — Plein Droit',
    levier: 2, cat: 'niche18', mode: 'taux-libre', inputKey: 'girardinPD',
    nature: 'versement-annuel', budget: 'cash',
    // Rendement libre : l'utilisateur saisit un % entre 100 et 130 % (boutons ± 0,5 %).
    rendementDefaut: 1.10,    // 110 %
    rendementMin:    1.00,    // 100 %
    rendementMax:    1.30,    // 130 %
    rendementStep:   0.005,   // 0,5 %
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN PD de l\'année (versement à l\'opérateur, à fonds perdus). Cash sortant. Mécanique one-shot : RI majorée encaissée l\'année suivante. Quote-part 44 % dans le plafond niches 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 108–115 %. Boutons ± 0,5 % ou saisie clavier directe.',
  },
  {
    id: 'girardinAG', label: 'Girardin Industriel — Avec Agrément',
    levier: 2, cat: 'niche18', mode: 'taux-libre', inputKey: 'girardinAG',
    nature: 'versement-annuel', budget: 'cash',
    rendementDefaut: 1.08,    // 108 %
    rendementMin:    1.00,
    rendementMax:    1.25,
    rendementStep:   0.005,
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN AG de l\'année (versement à l\'opérateur, à fonds perdus). Idem Plein Droit mais avec agrément ministériel (programmes > 250 k€). Cash sortant. Quote-part 34 % dans le plafond niches 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 105–112 %.',
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

// addLever({ leverId, assignedLevier }) — assignedLevier (1/2/3) détermine dans
// quelle section UI la ligne apparaît, même si leverId n'est pas encore choisi.
// Si leverId est fourni, on en déduit le levier réel pour assignedLevier.
function addLever(opts = {}) {
  // Compat ancienne signature : addLever('per') ou addLever()
  if (typeof opts === 'string') opts = { leverId: opts };
  const lev = opts.leverId
    ? LEVIERS_CATALOGUE.find(l => l.id === opts.leverId)
    : null;
  preconisations.push({
    id: nextRowId++,
    leverId: opts.leverId || '',
    montant: 0,
    paramValue: null,
    assignedLevier: (lev && lev.levier) || opts.assignedLevier || null,
  });
}

function removeLever(rowId) {
  preconisations = preconisations.filter(p => p.id !== rowId);
}

function updateLever(rowId, field, value) {
  const p = preconisations.find(p => p.id === rowId);
  if (!p) return;
  if (field === 'leverId') {
    p.leverId = value;
    const lev = LEVIERS_CATALOGUE.find(l => l.id === value);
    // Reset paramValue selon le type de paramètre :
    //   - mode 'taux-libre' (Girardin PD/AG) → rendement par défaut (1.10 etc.)
    //   - autres modes avec params → 1ère option par défaut
    //   - aucun paramètre → null
    if (lev && lev.mode === 'taux-libre') {
      p.paramValue = lev.rendementDefaut;
    } else if (lev && lev.params) {
      p.paramValue = lev.params[0].options[0].value;
    } else {
      p.paramValue = null;
    }
    // Mémorise le levier (1/2/3) — utile si la preco n'avait pas encore d'assignment
    if (lev && lev.levier) p.assignedLevier = lev.levier;
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
    else if (lev.mode === 'taux-libre') {
      // Rendement saisi directement par l'utilisateur (Girardin PD/AG).
      // p.paramValue est un nombre décimal (1.10 = 110 %).
      const rendement = parseFloat(p.paramValue) || lev.rendementDefaut;
      out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * rendement;
    }
    else if (lev.mode === 'deficit-foncier') {
      // Les travaux saisis VIENNENT EN DÉFICIT (= foncier négatif). Le
      // moteur cap déjà l'imputation sur le revenu global à -10 700 €/an.
      out.foncierReel = (out.foncierReel || 0) - p.montant;
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
  if (lev.mode === 'taux-libre') {
    const rendement = parseFloat(p.paramValue) || lev.rendementDefaut;
    return p.montant * rendement;
  }
  if (lev.mode === 'jeanbrun') {
    return null; // pas un avantage IR direct
  }
  // versement-direct : selon le levier
  if (lev.id === 'per') {
    // approximation : versement × TMI (le delta réel dépend du barème)
    return null; // on laisse le delta global parler
  }
  // Versement-direct simples (dons, ehpad, syndic, emploiDom, gardeEnf) :
  // le moteur calcule le delta réel via la comparaison globale (même pattern
  // que per/jeanbrun ci-dessus). Retourner null évite de dupliquer ici la
  // logique fiscale (plafonds, majorations, dégressions) déjà dans calculator.js.
  return null;
}

// Vérifie le respect du plafond individuel d'un levier.
// Signature : (p, inputAvant, detSeul?, inputSeul?)
//   - p, inputAvant : minimum requis (rétro-compat).
//   - detSeul, inputSeul (optionnels) : résultat d'un calculerIR appliqué à
//     inputAvant + cette préco SEULE. Permet de détecter via le moteur les
//     dépassements pour tous les dispositifs couverts par capExcedents et
//     pour le PER (perCap calculé par le moteur).
const fmtEur = (n) => Math.round(n).toLocaleString('fr-FR');
function checkPlafond(p, inputAvant, detSeul, inputSeul) {
  const lev = LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
  if (!lev || !p.montant) return { ok: true, msg: '' };

  const existant = inputAvant[lev.inputKey] || 0;
  const total = existant + p.montant;

  // ─── Détection par capExcedents du moteur (Phase 2.3) ───
  if (detSeul && detSeul.capExcedents) {
    const key = lev.inputKey === 'malrauxTravaux' ? 'malraux'
              : lev.inputKey === 'locAvantagesDepenses' ? 'locAvantages'
              : lev.inputKey;
    const exc = detSeul.capExcedents[key];
    if (exc && exc > 0.5) {
      return { ok: false, msg: `${fmtEur(exc)} € au-delà du plafond fiscal du dispositif` };
    }
  }

  // ─── PER : plafond calculé dynamiquement par le moteur ───
  if (lev.id === 'per' && detSeul && inputSeul) {
    const perVerse = inputSeul.per || 0;
    if (perVerse > detSeul.perCap + 0.5) {
      const surplus = perVerse - detSeul.perCap;
      return { ok: false, msg: `${fmtEur(surplus)} € au-delà du plafond PER ${fmtEur(detSeul.perCap)} €` };
    }
  }

  // ─── Dons : plafond 20 % du RNI (cumul 7UD + 7UF) ───
  if ((lev.id === 'dons7UD' || lev.id === 'dons7UF') && detSeul && inputSeul) {
    const donsTotal = (inputSeul.dons || 0) + (inputSeul.dons7UD || 0);
    const capRni = (detSeul.revenuNetImposable || 0) * P.plafonds.donsPlafondRNI;
    if (donsTotal > capRni + 0.5) {
      const pctLabel = (P.plafonds.donsPlafondRNI * 100).toFixed(0);
      return { ok: false, msg: `Cumul dons > ${pctLabel} % du RNI (${fmtEur(capRni)} €)` };
    }
  }

  // ─── EHPAD : plafond par personne hébergée ───
  if (lev.id === 'ehpad') {
    const nbPers = Math.max(1, inputAvant.ehpadNbPers || 1);
    const cap = P.plafonds.ehpadPlafondParPers * nbPers;
    if (total > cap) {
      return { ok: false, msg: `Cap ${fmtEur(cap)} € (${nbPers} pers.)` };
    }
  }

  // ─── Emploi à domicile : plafond dynamique avec majoration enfants ───
  // Réplique de la règle calculator.js (art. 199 sexdecies-I-2° CGI) :
  // base + 1500 €/enfant + 750 €/garde alternée, capé à emploiDomMaxMajore.
  if (lev.id === 'emploiDom') {
    const majoEnf = P.plafonds.emploiDomMajEnfant * (inputAvant.nbEnfants || 0)
                  + P.plafonds.emploiDomMajGardeAlt * (inputAvant.gardeAlternee || 0);
    const cap = Math.min(P.plafonds.emploiDomMax + majoEnf, P.plafonds.emploiDomMaxMajore);
    if (total > cap) {
      return { ok: false, msg: `Cap ${fmtEur(cap)} € (déjà saisi : ${fmtEur(existant)} €)` };
    }
  }

  // ─── Garde d'enfants : plafond par enfant à charge (cumul) ───
  if (lev.id === 'gardeEnf') {
    const nbEnf = Math.max(1, inputAvant.nbEnfants || 1);
    const cap = P.plafonds.gardeEnfantsMax * nbEnf;
    if (total > cap) {
      return { ok: false, msg: `Cap ${fmtEur(cap)} € (${nbEnf} enf., déjà saisi : ${fmtEur(existant)} €)` };
    }
  }

  // ─── Cotisations syndicales : plafond en % des revenus salariaux ───
  if (lev.id === 'syndic' && detSeul) {
    const baseMax = ((inputAvant.sal1 || 0) + (inputAvant.sal2 || 0)
      + (inputAvant.allocChomage1 || 0) + (inputAvant.allocChomage2 || 0)
      + (inputAvant.pen1 || 0) + (inputAvant.pen2 || 0)) * P.plafonds.cotSyndicalesPlafondPct;
    if (total > baseMax + 0.5 && baseMax > 0) {
      const pctLabel = (P.plafonds.cotSyndicalesPlafondPct * 100).toFixed(0);
      return { ok: false, msg: `Cap ${fmtEur(baseMax)} € (${pctLabel} % des revenus)` };
    }
  }

  // ─── Déficit foncier : cap d'imputation RG (art. 156-I-3° CGI) ───
  if (lev.id === 'deficitFoncier' && inputSeul) {
    const cap = P.plafonds.deficitFoncierMax;
    const deficitTotal = -Math.min(0, inputSeul.foncierReel || 0);
    if (deficitTotal > cap + 0.5) {
      const surplus = deficitTotal - cap;
      return { ok: false, msg: `${fmtEur(surplus)} € au-delà du cap ${fmtEur(cap)} € (reportable 10 ans sur foncier)` };
    }
  }

  // ─── Jeanbrun : plafond par catégorie ───
  if (lev.mode === 'jeanbrun') {
    const opt = lev.params[0].options.find(o => o.value === p.paramValue);
    const cap = opt ? opt.plafond : P.plafonds.jeanbrunPlafondInter;
    if (p.montant > cap) {
      return { ok: false, msg: `Cap ${fmtEur(cap)} € (cat. ${p.paramValue})` };
    }
  }

  return { ok: true, msg: '' };
}

// ─────────────────────────────────────────────
// WARNINGS — détection des situations pathologiques pour l'UI
// ─────────────────────────────────────────────
// Entrées : le résultat du calculator AVEC les préconisations appliquées
// (det = retour de calculerIR). Sortie : liste de warnings typés à afficher
// dans l'UI (chips inline, bandeaux, messages d'aide).
//
// Types couverts :
//   - 'cap-indiv'        : un dispositif L2 dépasse son plafond fiscal
//     individuel (SOFICA, FCPI, Malraux, etc.). Surplus tronqué dans le calcul.
//   - 'panier-niches'    : la somme des RI niche10 + niche18 dépasse ce que
//     les 2 poches peuvent absorber → surplus PERDU (panier).
//   - 'surdimensionnement': la somme des réductions L2 demandées dépasse
//     l'impôt à effacer → les RI au-delà sont PERDUES (≠ crédits L3).
//
// Pour chaque warning :
//   { type, level: 'info'|'warning'|'error', leverId|null, message, amount }
function computeWarnings(det) {
  const warnings = [];
  const fmt = n => Math.round(n).toLocaleString('fr-FR');

  // 1. Caps individuels par dispositif (capExcedents exposé par calculator.js)
  if (det.capExcedents) {
    const labels = {
      sofica:       'SOFICA',
      fcpi:         'FCPI classique',
      fcpiJei:      'FCPI JEI',
      fipCorse:     'FIP Corse',
      irPme:        'IR-PME',
      gfi:          'GFI',
      malraux:      'Loi Malraux',
      locAvantages: "Loc'Avantages",
    };
    for (const [disp, surplus] of Object.entries(det.capExcedents)) {
      if (surplus > 0.5) {
        warnings.push({
          type: 'cap-indiv',
          level: 'warning',
          leverId: disp,
          message: `${fmt(surplus)} € au-delà du plafond fiscal ${labels[disp] || disp}, ignorés dans le calcul.`,
          amount: surplus,
        });
      }
    }
  }

  // 2. Panier niches saturé — RI niche10/niche18 perdues
  if ((det.nichesPerdues || 0) > 0.5) {
    warnings.push({
      type: 'panier-niches',
      level: 'warning',
      leverId: null,
      message: `${fmt(det.nichesPerdues)} € de réductions perdues (panier niches 10k+8k saturé).`,
      amount: det.nichesPerdues,
    });
  }

  // 3. Surdimensionnement — RI L2 demandées dépassent l'impôt à effacer.
  //    Le détail (sort de chaque dispositif : perdu / reportable / etc.)
  //    est rendu côté UI dans refreshPreconisationsCalculs (a accès au
  //    state des préco actives, donc peut lister les dispositifs concernés).
  //    On expose juste un signal "surdimensionnement" + le montant.
  const impotAvantReductions = (det.impotApresDecote || 0) + (det.irMobilier || 0);
  const totalRiL2 = (det.totalReductions || 0)
    + (det.fraisScol || 0) + (det.redEhpad || 0) + (det.redMalraux || 0);
  if (impotAvantReductions > 0 && totalRiL2 > impotAvantReductions) {
    const excedent = totalRiL2 - impotAvantReductions;
    warnings.push({
      type: 'surdimensionnement',
      level: 'info',
      leverId: null,
      message: `${fmt(excedent)} € de réductions L2 au-delà de l'impôt restant.`,
      amount: excedent,
    });
  }

  return warnings;
}

// Expose API globale
if (typeof window !== 'undefined') {
  window.PRECONISATIONS = {
    LEVIERS_CATALOGUE,
    appliquerPreconisations,
    avantageEstime,
    checkPlafond,
    computeWarnings,
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
  module.exports = {
    LEVIERS_CATALOGUE,
    appliquerPreconisations,
    avantageEstime,
    checkPlafond,
    computeWarnings,
  };
}
