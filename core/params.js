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
    meubleClasse:    { taux: 0.50, plafond: 77700 },  // 5NG — chambres d'hôtes + meublé tourisme classé
    meubleNonClasse: { taux: 0.30, plafond: 15000 },  // 5NH — meublé tourisme non classé
    autresMeubles:   { taux: 0.50, plafond: 77700 },  // 5NI — autres locations meublées (LMNP année)
    dividendes: 0.40,
    // Assurance-vie > 8 ans (cases 2CH/2VV/2WW) — art. 125-0 A CGI
    // Abattement annuel sur les produits, applicable à l'IR uniquement (PS dues sur le brut).
    avSingle: 4600,
    avCouple: 9200,
  },

  // --- PRÉLÈVEMENTS SOCIAUX ---
  // Source de vérité : service-public.gouv.fr/F2329 (vérifié 2026-06-05) +
  // capture avis IR impots.gouv.fr du contribuable (référence interne PR-J).
  //
  // L'avis IR décompose les PS en DEUX blocs arrondis indépendamment :
  //   bloc « CSG + CRDS » : taux variable selon catégorie de revenu
  //     · 9,7 % (CSG 9,2 + CRDS 0,5) — foncier nu, AV > 8 ans, PV immobilières
  //     · 11,1 % (CSG 10,6 + CRDS 0,5) — mobilier (div/int/PV mob), LMNP
  //   bloc « Solidarité » : 7,5 % uniforme sur toutes les catégories.
  //
  // LFSS 2026 art. 12 a relevé la CSG du cas général de 9,2 → 10,6 %
  // (+1,4 pt) sans toucher au taux foncier nu / AV / PV immo.
  //
  // Les composantes ci-dessous (csg / crds / solidarite) sont la source
  // primaire ; les taux agrégés (mobilier, foncierNu, lmnp, …) sont des
  // raccourcis d'affichage — JAMAIS utilisés pour le calcul officiel,
  // uniquement pour les libellés (« PS foncier nu 17,2 % »).
  ps: {
    csg: {
      casGeneral: 0.106,  // mobilier, LMNP
      fonciers:   0.092,  // foncier nu, AV > 8 ans, PV immobilières
    },
    crds:        0.005,
    solidarite:  0.075,

    // Taux agrégés — pour l'affichage uniquement. Doivent rester cohérents
    // avec la somme des composantes ci-dessus (vérifié par test unitaire).
    mobilier:    0.186,  // = csg.casGeneral + crds + solidarite
    foncierNu:   0.172,  // = csg.fonciers + crds + solidarite
    lmnp:        0.186,
    av:          0.172,
    pvImmo:      0.172,

    pfuIr:       0.128,  // PFU — part IR
    avIr75:      0.075,  // IR sur AV ≤ 8 ans avant abattement
    csgDeductible: 0.068,
  },

  // --- NICHES FISCALES ---
  niches: {
    // Plafond global art. 200-0 A CGI : 2 poches.
    //   poche 1 (10 000 €) : ouverte à tous les dispositifs cat. niche10 + niche18
    //   poche 2 (+8 000 €) : RÉSERVÉE aux dispositifs cat. niche18 (Girardin / SOFICA)
    plafond:       10000,
    plafondMajore: 18000,
    girardinPdQuotePart: 0.44,  // rétrocession 56% → 44% dans le plafond (art. 200-0 A, 4° CGI)
    girardinAgQuotePart: 0.34,  // rétrocession 66% → 34% dans le plafond (art. 200-0 A, 4° CGI)
  },

  // --- PLAFONDS INDIVIDUELS DES DISPOSITIFS DE RÉDUCTION ---
  // Source de vérité unique pour les caps individuels (single / couple) et
  // les taux applicables. Quand la LF de l'année suivante modifie ces valeurs,
  // on met à jour ici et tout le calcul moteur + UI suit automatiquement.
  // Utilisé par calculator.js (Math.min sur det.redXXX) et preconisations.js
  // (calcul de RI à partir du versement + warnings UI).
  plafondsDispositifs: {
    // SOFICA — art. 199 unvicies CGI, niche majorée 18 k
    sofica: {
      versementMax: 18000,
      // Versement effectif retenu = min(versementMax, plafondAssiettePctRng × RNG)
      plafondAssiettePctRng: 0.25,
      // Taux selon engagement de la SOFICA (production indépendante / langue régionale…)
      taux: { '30': 0.30, '36': 0.36, '48': 0.48 },
      tauxDefaut: '36',
    },
    // FCPI investi en JEI — art. 199 terdecies-0 A bis (LF 2026 art. 199 terdecies-0 A bis)
    // Taux 30 %, plafond ANNUEL PARTAGÉ avec irPmeJei (cumul fcpiJei + irPmeJei ≤ vMax).
    // Hors plafond niches (art. 200-0 A exclut explicitement 199 terdecies-0 A bis).
    // Validité : versements depuis le 21/02/2026 (LF 2026 / loi 2026-103).
    fcpiJei: {
      versementMax:        75000,
      versementMaxCouple: 150000,
      taux: 0.30,
      panierPartage: 'irPmeJei',          // plafond commun avec irPmeJei
    },
    // FCPI classique : RETIRÉ au 21/02/2026 (LF 2026 / loi 2026-103). Suppression
    // complète du moteur en D3.4 — la mécanique FCPI subsiste UNIQUEMENT via
    // PD.fcpiJei (FCPI investi en JEI, taux 30 %, panier partagé avec IR-PME JEI).
    // FIP Corse / Outre-mer — art. 199 terdecies-0 A bis
    fipCorse: {
      versementMax:        12000,
      versementMaxCouple:  24000,
      taux: 0.30,
    },

    // ── IR-PME (art. 199 terdecies-0 A CGI et variantes) ────────────────
    // Source : Légifrance + BOFiP BOI-IR-RICI-90, post-LF 2026 (loi 2026-103
    // du 19/02/2026). Cf. tasks/d3.1-irpme-spec.md pour la cartographie.

    // IR-PME — PME standard (art. 199 terdecies-0 A)
    // Taux 18 % (le « boost » 25 % de 2024-2025 a expiré au 31/12/2025).
    // DANS le plafond niches 10 000 €.
    irPme: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: 0.18,
    },
    // IR-PME — ESUS / SFS (Entreprise Solidaire d'Utilité Sociale / Société Foncière Solidaire)
    // Taux majoré 25 % — versements 28/06/2024 → 30/09/2026.
    // Au-delà du 30/09/2026 : subordonné à validation Commission européenne.
    irPmeEsus: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: 0.25,
    },
    // IR-PME — Sociétés foncières de monuments historiques
    // Taux 25 %, depuis le 28/09/2025.
    irPmeMH: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: 0.25,
    },
    // IR-PME — JEI direct (art. 199 terdecies-0 A bis)
    // Taux 30 %, plafond ANNUEL 75k/150k PARTAGÉ avec fcpiJei.
    // Plafond pluri-annuel : RI cumulée irPmeJei + irPmeJeir ≤ 50 000 € sur 2024-2028.
    // Hors plafond niches (art. 200-0 A exclut 199 terdecies-0 A bis).
    irPmeJei: {
      versementMax:        75000,
      versementMaxCouple: 150000,
      taux: 0.30,
      panierPartage: 'fcpiJei',           // plafond commun avec fcpiJei
    },
    // IR-PME — JEII (Jeune Entreprise Innovante à Impact) — nouvel art. LF 2026
    // Taux 40 %, validité 21/02/2026 → 31/12/2028.
    irPmeJeii: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: 0.40,
    },
    // IR-PME — JEIR (Jeune Entreprise Innovante de Rupture) — art. 199 terdecies-0 A ter
    // Taux 50 %, validité 1/1/2024 → 31/12/2028.
    // Plafond pluri-annuel partagé avec irPmeJei (cf. ci-dessus).
    // Hors plafond niches (art. 200-0 A exclut 199 terdecies-0 A ter).
    irPmeJeir: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: 0.50,
    },

    // Plafond pluri-annuel commun JEI + JEIR : 50 000 € de RI cumulée sur la
    // période 01/01/2024 → 31/12/2028. Source : art. 199 terdecies-0 A bis IV
    // et art. 199 terdecies-0 A ter IV CGI (vérifié Légifrance 2026-06-05) :
    //   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213424
    //   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048796322
    // Appliqué dans le moteur via input `irPmeJeiJeirImputeAnterieur` (RI déjà
    // imputée les années antérieures, optionnel).
    irPmeJeiJeirPlafondCumule: 50000,
    // GFI — art. 199 decies H CGI (Groupements Forestiers d'Investissement).
    // Taux standard 18 %, majoré à 25 % pour les acquisitions de forêts en
    // zone éligible (massifs déficitaires en gestion durable, art. 199 decies H I 2°).
    // L'utilisateur sélectionne `gfiZone` ∈ {standard, eligible} dans le Simulateur.
    gfi: {
      versementMax:        50000,
      versementMaxCouple: 100000,
      taux: { 'standard': 0.18, 'eligible': 0.25 },
      tauxDefaut: 'standard',
    },
    // Malraux — art. 199 tervicies CGI.
    // Deux plafonds coexistent :
    //   - plafond ANNUEL : 100 000 € de travaux retenus (depensesParAnMax)
    //   - plafond PLURI-ANNUEL : 400 000 € de travaux cumulés sur 4 ans
    //     glissants (CGI art. 199 tervicies II al. 3). L'utilisateur peut
    //     saisir le cumul des années précédentes via `malrauxTravauxAnterieurs`
    //     pour que le moteur tronque l'année courante en conséquence.
    malraux: {
      depensesParAnMax: 100000,
      depensesPluriAnMax: 400000,
      taux: { 'spr-non': 0.22, 'spr-oui': 0.30 },
      tauxDefaut: 'spr-non',
    },
    // Loc'Avantages — art. 199 tricies CGI (ex-Cosse).
    // Intermédiation locative (gestion par association agréée type Solibail) :
    //   - Loc 1 : 15 % → 20 % (palier loc1-im)
    //   - Loc 2 : 35 % → 40 % (palier loc2-im)
    //   - Loc 3 : 65 % (intermédiation obligatoire, pas de variante sans)
    locAvantages: {
      depensesMax: 10000,
      taux: {
        'loc1': 0.15, 'loc1-im': 0.20,
        'loc2': 0.35, 'loc2-im': 0.40,
        'loc3': 0.65,
      },
      tauxDefaut: 'loc1',
    },
    // Denormandie — art. 199 novovicies CGI (volet ancien rénové).
    // Investissement locatif dans des communes labellisées « Cœur de Ville »
    // ou en ORT (Opération de Revitalisation du Territoire). Travaux de
    // rénovation représentant ≥ 25 % du coût total de l'opération.
    // Taux total de réduction selon engagement de location : 12 % (6 ans),
    // 18 % (9 ans), 21 % (12 ans). RI étalée linéairement sur la durée
    // d'engagement → RI annuelle = invest retenu × taux total / durée.
    // Plafond invest 300 000 €/an, plafond 5 500 €/m². Dans le panier
    // niches 10 000 €.
    // Prolongé jusqu'au 31/12/2027 par LF 2026 art. 47 (loi 2026-103).
    denormandie: {
      versementMax:        300000,
      versementMaxCouple:  300000,   // pas de cap doublé pour couple
      prixMaxM2:             5500,   // non vérifié côté moteur (info UI uniquement)
      taux: { '6': 0.12, '9': 0.18, '12': 0.21 },
      tauxDefaut: '9',
    },
    // Girardin — pas de cap individuel propre (la limite vient du panier 18 k)
    // mais on centralise quote-part + rendement par défaut pour cohérence.
    girardinPD: {
      quotePart: 0.44,
      rendementDefaut: 1.10,
    },
    girardinAG: {
      quotePart: 0.34,
      rendementDefaut: 1.08,
    },
  },

  // --- PLAFONDS RÉDUCTIONS / CRÉDITS ---
  plafonds: {
    // Dons (art. 200 CGI + LF 2026 art. 28 pour le seuil 75 %)
    dons75Taux:           0.75,    // taux 7UD organismes d'aide aux personnes (Coluche)
    dons66Taux:           0.66,    // taux 7UF intérêt général (cas standard)
    dons75Plafond:        2000,    // seuil au-dessus duquel le 7UD bascule sur le régime 66 %
    donsPlafondRNI:       0.20,    // base totale dons plafonnée à 20 % du RNI

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

    // Emploi à domicile (art. 199 sexdecies-I-2° CGI) — crédit d'impôt 50 %
    // Plafond de base 12 000 € majoré de 1 500 € par enfant à charge
    // (750 € en garde alternée), dans la limite globale de 15 000 €.
    // Note : majorations seniors ≥ 65 ans dans le foyer et présence d'invalide
    // (plafond 20 000 €) non modélisées — inputs absents de l'UI actuelle.
    emploiDomTaux:        0.50,
    emploiDomMax:         12000,   // plafond de base
    emploiDomMajEnfant:   1500,    // par enfant à charge plein
    emploiDomMajGardeAlt: 750,     // par enfant en garde alternée
    emploiDomMaxMajore:   15000,   // cap absolu avec majorations

    // Garde enfants < 6 ans
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

// ============================================================
// FORMATTEURS PARTAGÉS — source unique pour l'affichage des paramètres
// ============================================================
// Conséquence directe du principe « one source of truth » : aucun taux ni
// plafond fiscal ne doit être écrit en dur dans l'HTML ou les tooltips.
// Tout texte affiché qui mentionne une valeur de PARAMS DOIT passer par
// ces helpers, soit en JS (`formatPct(PARAMS.ps.foncierNu)`), soit via les
// tokens `{{path|fmt}}` résolus par `injectParams()` (cf. js/paramInject.js).
//
// Format français : virgule décimale, espace fine pour les milliers,
// espace insécable avant le symbole.
const formatPct = (x, opts = {}) => {
  const v = x * 100;
  const dec = opts.decimals != null
    ? opts.decimals
    : (Number.isInteger(v) ? 0 : (Number.isInteger(v * 10) ? 1 : 2));
  return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' %';
};
const formatEur = (x) =>
  Math.round(x).toLocaleString('fr-FR') + ' €';
const formatNum = (x) =>
  x.toLocaleString('fr-FR');

// Compat Node (tests CommonJS). En navigateur, PARAMS et les helpers de
// format restent exposés globalement par le chargement <script> sans avoir
// à passer par exports.
if (typeof module !== 'undefined') {
  module.exports = { PARAMS, formatPct, formatEur, formatNum };
}
