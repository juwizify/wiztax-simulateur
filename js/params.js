/**
 * PARAMÈTRES FISCAUX — Projection sur Revenus 2026 (Déclaration 2027)
 * Basés sur la Loi de Finances 2026 (paramètres officiels les plus récents).
 * Le barème pour les revenus 2026 sera fixé par la LF 2027 (publiée fin 2026)
 * — sans doute légèrement réindexé inflation (~1-2 %), ce qui n'invalide pas
 * la projection à court terme.
 * Sources : BOFiP, brochure IR 2026, service-public.gouv.fr, LFSS 2026.
 */

const PARAMS = {
  // --- BARÈME PROGRESSIF (BOI-IR-LIQ-20-10 du 07/04/2026) ---
  bareme: [
    { limite: 11600,  taux: 0.00 },
    { limite: 29579,  taux: 0.11 },
    { limite: 84577,  taux: 0.30 },
    { limite: 181917, taux: 0.41 },
    { limite: Infinity, taux: 0.45 },
  ],

  // --- QUOTIENT FAMILIAL (BOI-IR-LIQ-20-20-20 du 07/04/2026) ---
  qf: {
    plafondDemiPart:    1807,
    parentIsole1er:     4262,
    parentIsoleDemi:    2131,
    veufPartSupp:       2011,
    // Plafond spécifique de la demi-part "vieux parent isolé" (case L) — art. 197 I 2 al. 2 CGI
    // Cas le plus restrictif des demi-parts supplémentaires ; appliqué par défaut quand
    // la case "demi-part supplémentaire" est cochée (cohérent avec le simulateur officiel).
    plafondDemiPartL:   1079,
  },

  // --- DÉCOTE (BOI-IR-LIQ-20-20-30 du 07/04/2026) ---
  decote: {
    plafondCelibataire: 897,
    plafondCouple:      1483,
    seuilCelibataire:   1982,
    seuilCouple:        3277,
    taux:               0.4525,
  },

  // --- ABATTEMENTS ---
  abat: {
    sal:    { taux: 0.10, min: 509,   max: 14555 },
    pen:    { taux: 0.10, min: 454,   maxFoyer: 4439 },
    bncMicro: { taux: 0.34, min: 305 },
    microFoncier: { taux: 0.30, plafond: 15000 },
    meubleClasse:    { taux: 0.50, plafond: 77700 },
    meubleNonClasse: { taux: 0.30, plafond: 15000 },
    dividendes: 0.40,
    // Assurance-vie > 8 ans (cases 2CH/2VV/2WW) — art. 125-0 A CGI
    // Abattement annuel sur les produits, applicable à l'IR uniquement (PS dues sur le brut).
    avSingle: 4600,
    avCouple: 9200,
  },

  // --- PRÉLÈVEMENTS SOCIAUX ---
  ps: {
    mobilier: 0.186,  // dividendes, intérêts, PV mob — CSG 10.6% + CRDS 0.5% + sol. 7.5%
    foncier:  0.186,  // foncier nu, LMNP, micro-foncier — CFA LFSS 2026 inclus
    av:       0.172,  // AV > 8 ans — non concernée par la CFA, reste à 17,2 %
    pfuIr:    0.128,  // PFU — part IR
    csgDeductible: 0.068,
  },

  // --- NICHES FISCALES ---
  niches: {
    plafond:       10000,
    plafondMajore: 18000,
    girardinPdQuotePart: 0.44,  // rétrocession 56% → 44% dans le plafond (art. 200-0 A, 4° CGI)
    girardinAgQuotePart: 0.34,  // rétrocession 66% → 34% dans le plafond (art. 200-0 A, 4° CGI)
  },

  // --- PLAFONDS RÉDUCTIONS / CRÉDITS ---
  plafonds: {
    // Dons
    dons75Plafond:        2000,    // seuil taux 75% (LF 2026 art. 28)
    donsPlafondRNI:       0.20,    // base totale dons plafonnée à 20% du RNI (art. 200 CGI)

    // PER — déduction plafonnée à 10% des revenus pro (art. 163 quatervicies CGI)
    // Note : le plafond réglementaire se calcule sur les revenus N-1.
    // Le simulateur utilise les revenus N comme approximation.
    perTaux:              0.10,
    perPlancher:          4710,    // 10% × PASS 2025 (47 100 €)
    perMaxSalarie:        37680,   // 10% × 8 × PASS 2025

    // Pensions alimentaires (art. 156-II CGI) — pas capé automatiquement
    // car dépend du type de bénéficiaire (enfant adulte : 6 674 €/enfant ;
    // ex-conjoint : montant judiciaire ; ascendants : besoins réels)
    pensionAlimEnfantMax: 6674,    // plafond par enfant majeur (2025)

    // Déficit foncier imputable sur le revenu global — art. 156-I-3° CGI
    // Plafond annuel pour la part hors intérêts d'emprunt. Surplus reportable 10 ans (non simulé).
    deficitFoncierMax:    10700,

    // Dispositif Jeanbrun / Statut du bailleur privé (LF 2026, en vigueur 21/02/2026)
    // Amortissement déductible des revenus fonciers selon catégorie de loyer.
    // Applicable aux acquisitions jusqu'au 31/12/2028.
    jeanbrunPlafondInter:    8000,   // loyer intermédiaire (taux amort. 3,5 %)
    jeanbrunPlafondSocial:  10000,   // loyer social (4,5 %)
    jeanbrunPlafondTresSoc: 12000,   // loyer très social (5,5 %)

    // Heures supplémentaires exonérées (1GH/1HH) — art. 81 quater CGI
    // Plafond annuel par déclarant ; au-delà, le surplus est imposable.
    // La part exonérée entre dans le RFR mais pas dans le revenu imposable.
    heuresSupExoPlafond:  7500,

    // Frais d'hébergement EHPAD ascendants (7CD/7CE/7CF) — art. 199 quindecies CGI
    // Réduction 25 % plafonnée à 10 000 € de dépenses PAR personne hébergée.
    // HORS plafond niches.
    ehpadTaux:           0.25,
    ehpadPlafondParPers: 10000,

    // Frais de scolarité enfants (7EA/7EC/7EF) — art. 199 quater F CGI
    // Réduction forfaitaire par enfant à charge selon niveau scolaire.
    // HORS plafond niches.
    fraisScolCollege:     61,
    fraisScolLycee:      153,
    fraisScolSup:        183,

    // Cotisations syndicales (7AC/7AE/7AG) — art. 199 quater C CGI
    // Crédit d'impôt 66 % plafonné à 1 % des salaires + alloc chômage + pensions.
    // HORS plafond niches.
    cotSyndicalesTaux:    0.66,
    cotSyndicalesPlafondPct: 0.01,

    // Emploi à domicile & garde enfants
    emploiDomTaux:        0.50,
    emploiDomMax:         12000,
    gardeEnfantsTaux:     0.50,
    gardeEnfantsMax:      3500,    // par enfant < 6 ans — multiplié par nbEnfants
  },

  // --- CONTRIBUTION EXCEPTIONNELLE SUR LES HAUTS REVENUS (art. 223 sexies CGI) ---
  // Assiette : revenu fiscal de référence (proxy : revenuReference du simulateur)
  cehr: {
    seuilCelibataire1:  250000,   // célibataire/divorcé/veuf : tranche 3%
    seuilCelibataire2:  500000,   // célibataire/divorcé/veuf : tranche 4%
    seuilCouple1:       500000,   // marié/pacsé : tranche 3%
    seuilCouple2:      1000000,   // marié/pacsé : tranche 4%
    taux1: 0.03,
    taux2: 0.04,
  },
};
