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
const PD = P.plafondsDispositifs;

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
  // Champs descriptifs (sectionGroup, tagType, meta, descBlocks, refs) consommés
  // par renderLeviersOnglet() pour générer dynamiquement les cards de l'onglet
  // Leviers fiscaux. Cf. tasks/d3.1-irpme-spec.md et la spec F2 à venir.
  {
    id: 'per', label: 'PER (Plan d\'Épargne Retraite)',
    levier: 1, cat: 'hors', mode: 'versement-direct', inputKey: 'per',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le VERSEMENT VOLONTAIRE de l\'année sur le PER. Cash sortant pour le client (épargne bloquée jusqu\'à la retraite). Déduction du revenu imposable → économie ≈ versement × TMI. Plafond auto = 10 % des revenus pro (cap 37 680 €), par déclarant.',
    // ── Enrichissement pour l'onglet Leviers fiscaux (générateur F3) ──
    sectionGroup: 'epargne-retraite',
    tagType: 'Déduction du revenu imposable',
    titleLong: 'PER — Plan d\'Épargne Retraite',
    meta: [
      { label: 'Plafond salarié', value: '10 % revenus N−1 · max 37 680 €' },
      { label: 'Plafond TNS (Madelin)', value: 'jusqu\'à 88 911 €' },
      { label: 'Plancher', value: '4 710 €' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
      { label: 'Report plafond non utilisé', value: '5 ans (LF 2026, art. 10)' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Le PER individuel (PERIN) permet de verser volontairement des sommes déduites du revenu brut global. L\'économie dépend directement de la TMI : plus elle est élevée, plus le gain est fort. Argent bloqué jusqu\'à la retraite, sauf déblocage anticipé (achat résidence principale, accidents de la vie). Non déductible pour les 70 ans et plus (LF 2026, art. 9).' },
      { label: 'Calcul de l\'économie',
        text: 'Versement × TMI = économie d\'impôt. Exemple : 10 000 € versés, TMI 30 % → 3 000 € d\'impôt en moins. Un couple peut mutualiser ses plafonds non utilisés sur 5 ans.' },
    ],
    refCGI: 'Art. 163 quatervicies CGI',
    refBofip: 'BOI-IR-BASE-20-50',
  },
  {
    id: 'deficitFoncier', label: 'Déficit foncier (travaux)',
    levier: 1, cat: 'foncier', mode: 'deficit-foncier', inputKey: 'foncierReel',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir le MONTANT DES TRAVAUX FONCIERS de l\'année qui créent un déficit (travaux > loyers nets, ou en l\'absence de revenu foncier). Le déficit foncier s\'impute sur le REVENU GLOBAL, plafonné à 10 700 €/an (art. 156-I-3° CGI) — le surplus est reportable 10 ans sur les revenus fonciers ultérieurs (non simulé).\n\nÉconomie ≈ montant × TMI (en réduisant le revenu foncier, on réduit aussi sa base PS 17,2 %).\n\nCash sortant pour le client (travaux à financer).',
    sectionGroup: 'immobilier-locatif',
    tagType: 'Déduction du revenu foncier (et partiel sur revenu global)',
    titleLong: 'Déficit foncier — travaux sur bien locatif nu',
    meta: [
      { label: 'Imputation sur revenu global', value: '10 700 € / an' },
      { label: 'Plafond doublé (réno. énergie DPE E/F/G)', value: '21 400 € / an — jusqu\'au 31 déc. 2027 (LF 2026)' },
      { label: 'Report excédent', value: 'Revenus fonciers pendant 10 ans' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Si les charges (travaux d\'entretien, réparation, amélioration) dépassent les loyers perçus sur un bien loué nu, le déficit peut s\'imputer sur le revenu global, dans la limite de 10 700 € / an. L\'excédent s\'impute sur les revenus fonciers des 10 années suivantes. Condition : le bien doit rester loué 3 ans après l\'imputation.' },
      { label: 'Calcul',
        text: 'Déficit imputé × TMI = économie d\'impôt. Exemple : 10 700 € de déficit, TMI 41 % → ~4 390 € d\'économie. Hors plafond global des niches, mais plafonné dans son imputation annuelle sur le revenu global.' },
    ],
    refCGI: 'Art. 156-I-3° CGI',
    refBofip: 'BOI-RFPI-BASE-30',
  },
  {
    id: 'jeanbrun', label: 'Dispositif Jeanbrun (LF 2026)',
    levier: 1, cat: 'foncier', mode: 'jeanbrun', inputKey: 'jeanbrunAmort',
    paramKey: 'jeanbrunCategorie',
    nature: 'amortissement-annuel', budget: 'exclu',
    info: 'Saisir l\'AMORTISSEMENT ANNUEL = prix d\'achat du bien × taux selon la catégorie de loyer (3,5 / 4,5 / 5,5 %). Ce n\'est PAS du cash sortant — c\'est une déduction comptable qui réduit l\'assiette des revenus fonciers → EXCLU du budget annuel. Le bien lui-même est généralement financé à crédit. Applicable aux acquisitions jusqu\'au 31/12/2028.',
    sectionGroup: 'immobilier-locatif',
    tagType: 'Déduction du revenu foncier (amortissement)',
    titleLong: 'Dispositif Jeanbrun — amortissement du logement loué nu',
    meta: [
      { label: 'Taux d\'amortissement selon catégorie', value: '3,5 % (intermédiaire) · 4,5 % (social) · 5,5 % (très social)' },
      { label: 'Plafond annuel par catégorie', value: `${P.plafonds.jeanbrunPlafondInter.toLocaleString('fr-FR')} € · ${P.plafonds.jeanbrunPlafondSocial.toLocaleString('fr-FR')} € · ${P.plafonds.jeanbrunPlafondTresSoc.toLocaleString('fr-FR')} €` },
      { label: 'Condition (logement ancien)', value: 'Travaux ≥ 30 % du prix · réhabilitation lourde · DPE A/B après travaux' },
      { label: 'Validité acquisitions', value: 'Jusqu\'au 31/12/2028' },
      { label: 'Dans le plafond niches ?', value: 'Non — déduction hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Créé par la LF 2026 (art. 47). Permet aux propriétaires bailleurs de logements nus d\'amortir la valeur du bien (hors terrain) sur leur résultat foncier. Mécanisme proche du LMNP au réel mais appliqué à la location nue. Particulièrement adapté aux TMI 41–45 %. Comme c\'est une déduction et non une réduction d\'impôt, il échappe totalement au plafond global des niches.' },
      { label: 'Calcul',
        text: 'L\'amortissement annuel vient en déduction des revenus fonciers → réduction de la base imposable → économie ≈ amortissement déduit × TMI. Dispositif en cours de publication au BOFiP.' },
    ],
    refCGI: 'Art. 31-I-1° i et j CGI',
    refBofip: 'LF 2026, art. 47',
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
    sectionGroup: 'dons',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Dons aux organismes d\'aide aux personnes (Coluche)',
    meta: [
      { label: 'Taux', value: '75 % jusqu\'à 2 000 € (LF 2026, art. 28)' },
      { label: 'Surplus', value: 'Bascule sur le régime 7UF à 66 %' },
      { label: 'Plafond d\'assiette (cumul 7UD+7UF)', value: '20 % du revenu imposable' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Dons aux organismes d\'aide alimentaire, soins gratuits, logement (Restos du Cœur, Secours populaire, Croix-Rouge, Emmaüs, etc.). Taux MAJORÉ 75 % sur les premiers 2 000 € versés. Au-delà, les dons basculent automatiquement sur le régime général 66 % (case 7UF).' },
      { label: 'Calcul',
        text: 'RI = min(don, 2 000 €) × 75 % + reste × 66 %. Exemple : 3 000 € versés → 2 000 × 75 % + 1 000 × 66 % = 1 500 + 660 = 2 160 €.' },
    ],
    refCGI: 'Art. 200 CGI',
    refBofip: 'BOI-IR-RICI-250 · LF 2026 art. 28',
  },
  {
    id: 'dons7UF', label: 'Dons d\'intérêt général (66%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'dons',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DES DONS de l\'année à des associations / fondations / écoles d\'intérêt général. Cash sortant. Réduction 66 %, total dons plafonné à 20 % du RNI.',
    sectionGroup: 'dons',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Dons aux œuvres et organismes d\'intérêt général',
    meta: [
      { label: 'Taux général', value: '66 %' },
      { label: 'Plafond d\'assiette', value: '20 % du revenu imposable (cumul 7UD+7UF)' },
      { label: 'Report si dépassement', value: '5 ans' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Les dons à des associations reconnues d\'utilité publique, fondations et organismes d\'intérêt général ouvrent droit à une réduction de 66 %. Exclu du plafond global des niches : il ne « consomme » pas l\'enveloppe de 10 000 €. L\'assiette est limitée à 20 % du revenu imposable, le surplus est reportable 5 ans.' },
      { label: 'Calcul',
        text: 'RI = don × 66 %, dans la limite de 20 % du revenu imposable. Exemple : 1 500 € de dons → 990 € de réduction.' },
    ],
    refCGI: 'Art. 200 CGI',
    refBofip: 'BOI-IR-RICI-250',
  },
  {
    id: 'ehpad', label: 'Frais EHPAD ascendants (25%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'ehpadFrais',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES D\'HÉBERGEMENT ET DE DÉPENDANCE de l\'année facturées par l\'EHPAD pour un ascendant. Cash sortant. Réduction 25 %, plafond 10 000 € par personne hébergée.',
    sectionGroup: 'famille-quotidien',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Frais EHPAD pour ascendants (25 %)',
    meta: [
      { label: 'Taux', value: '25 %' },
      { label: 'Plafond par personne hébergée', value: `${P.plafonds.ehpadPlafondParPers.toLocaleString('fr-FR')} €` },
      { label: 'Non cumul', value: 'Non cumulable avec déduction pensions alimentaires versées au même ascendant' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Lorsque le contribuable supporte les frais d\'hébergement et de dépendance d\'un ascendant en EHPAD (ou EHPA), il bénéficie d\'une réduction d\'impôt. Plafonné à 10 000 € de dépenses par personne hébergée et par an.' },
      { label: 'Calcul',
        text: 'RI = min(dépenses, 10 000 €) × 25 % × nb personnes hébergées. Exemple : 12 000 € de frais pour un parent → 10 000 × 25 % = 2 500 €.' },
    ],
    refCGI: 'Art. 199 quindecies CGI',
    refBofip: 'BOI-IR-RICI-140',
  },
  {
    id: 'malraux', label: 'Loi Malraux (22% ou 30%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'malrauxTravaux',
    paramKey: 'malrauxZone',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: 'Saisir les TRAVAUX DE RESTAURATION DE L\'ANNÉE sur immeuble en SPR ou QAD. Généralement financés à crédit → EXCLU du budget annuel. Le moteur calcule la RI = min(travaux, 100 000 €/an) × 22 % ou 30 % selon zone. Hors plafond niches.',
    sectionGroup: 'immobilier-locatif',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Loi Malraux — restauration en Site Patrimonial Remarquable',
    meta: [
      { label: 'Plafond travaux / an', value: '100 000 €' },
      { label: 'Plafond travaux / 4 ans', value: '400 000 €' },
      { label: 'Taux SPR + PSMV ou QAD', value: '30 %' },
      { label: 'Taux autres SPR', value: '22 %' },
      { label: 'RI max (4 ans)', value: '120 000 €' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Réservé aux immeubles en Site Patrimonial Remarquable (SPR) avec restauration complète sous contrôle de l\'Architecte des Bâtiments de France. Location nue pendant 9 ans obligatoire. Très puissant pour les TMI 41–45 %. La réduction n\'est pas reportable en cas de plafonnement.' },
      { label: 'Calcul',
        text: 'RI = travaux éligibles × 30 % (ou 22 %), plafonnés à 100 000 €/an. Hors plafond niches : aucune limite d\'enveloppe, même si le contribuable a déjà consommé 10 000 € d\'autres niches.' },
    ],
    refCGI: 'Art. 199 tervicies CGI',
    refBofip: 'BOI-IR-RICI-200',
    params: [
      { name: 'zone', label: 'Zone',
        options: [
          { value: 'spr-non', label: 'SPR sans PSMV (22 %)' },
          { value: 'spr-oui', label: 'SPR avec PSMV ou QAD (30 %)' },
        ]
      },
    ],
  },
  // 2.b) IR-PME et apparentés (art. 199 terdecies-0 A et bis/ter, post-LF 2026)
  // Source unique : PARAMS.plafondsDispositifs (cf. tasks/d3.1-irpme-spec.md)
  {
    id: 'irPme', family: 'ir-pme', label: 'IR-PME — PME standard (18 %)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPme.taux, inputKey: 'irPme',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription au capital d\'une PME non cotée (cas général). Réduction 18 % (le « boost 25 % » de 2024-2025 a expiré). Plafond 50 000 € (célibataire) / 100 000 € (couple). Conservation 5 ans. Art. 199 terdecies-0 A CGI.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — PME standard (souscription directe)',
    meta: [
      { label: 'Taux', value: '18 %' },
      { label: 'Plafond annuel', value: '50 000 € (célib) / 100 000 € (couple)' },
      { label: 'Conservation', value: '5 ans minimum' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription directe au capital d\'une PME non cotée (moins de 250 salariés, CA < 50 M€). L\'entreprise ne doit pas être en difficulté. Les titres doivent être conservés au minimum 5 ans. Le taux 18 % est le taux de droit commun ; les variantes ESUS/MH/JEI/JEII/JEIR offrent des taux majorés (voir cards dédiées).' },
      { label: 'Calcul',
        text: 'RI = montant versé × 18 %, dans la limite du plafond. Exemple : 10 000 € → 1 800 €. L\'excédent de versements au-delà du plafond est reportable sur 4 ans.' },
    ],
    refCGI: 'Art. 199 terdecies-0 A CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213428' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html/identifiant=BOI-IR-RICI-90-20140509' },
    ],
  },
  {
    id: 'irPmeEsus', family: 'ir-pme', label: 'IR-PME — ESUS / SFS (25 %)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPmeEsus.taux, inputKey: 'irPmeEsus',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription au capital d\'une Entreprise Solidaire d\'Utilité Sociale (ESUS) ou Société Foncière Solidaire (SFS). Réduction 25 %. Plafond 50 000 € / 100 000 €. Validité versements 28/06/2024 → 30/09/2026 ; au-delà du 1/10/2026 subordonné à validation Commission européenne.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — ESUS / SFS (entreprises solidaires)',
    meta: [
      { label: 'Taux', value: '25 % (majoré)' },
      { label: 'Plafond annuel', value: '50 000 € / 100 000 €' },
      { label: 'Validité', value: 'Versements 28/06/2024 → 30/09/2026' },
      { label: 'Après 1/10/2026', value: 'Subordonné à validation Commission européenne', status: 'warn' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription au capital d\'une ESUS (Entreprise Solidaire d\'Utilité Sociale) ou SFS (Société Foncière Solidaire). Taux majoré 25 % vs 18 % en PME classique.' },
      { label: 'Calcul',
        text: 'RI = versement × 25 %, plafonné à 50 000 € (célib) / 100 000 € (couple). Exemple : 10 000 € → 2 500 €.' },
    ],
    refCGI: 'Art. 199 terdecies-0 A CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas ESUS)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213428' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html/identifiant=BOI-IR-RICI-90-20140509' },
    ],
  },
  {
    id: 'irPmeMH', family: 'ir-pme', label: 'IR-PME — Monuments historiques (25 %)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPmeMH.taux, inputKey: 'irPmeMH',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription au capital d\'une société foncière de monuments historiques (immeubles protégés, sites, parcs, jardins). Réduction 25 %. Plafond 50 000 € / 100 000 €. Validité depuis le 28/09/2025.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — Sociétés foncières de monuments historiques',
    meta: [
      { label: 'Taux', value: '25 % (majoré)' },
      { label: 'Plafond annuel', value: '50 000 € / 100 000 €' },
      { label: 'Validité', value: 'Versements depuis le 28/09/2025' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription au capital d\'une société foncière dédiée à la préservation de monuments historiques (immeubles protégés, sites, parcs, jardins).' },
      { label: 'Calcul',
        text: 'RI = versement × 25 %, plafonné à 50 000 € / 100 000 €.' },
    ],
    refCGI: 'Art. 199 terdecies-0 A CGI (extension)',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas Monuments historiques)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213428' },
    ],
  },
  {
    id: 'irPmeJei', family: 'ir-pme', label: 'IR-PME — JEI direct (30 %)',
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJei.taux, inputKey: 'irPmeJei',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription directe au capital d\'une Jeune Entreprise Innovante (JEI). Réduction 30 %. Plafond ANNUEL 75 000 € / 150 000 € PARTAGÉ avec FCPI-JEI (cumul des deux ≤ ce plafond). Plafond pluri-annuel : RI cumulée JEI+JEIR ≤ 50 000 € sur 2024-2028. Hors plafond niches 10 k (art. 200-0 A exclut 199 terdecies-0 A bis). Conservation 5 ans.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEI direct (Jeune Entreprise Innovante)',
    meta: [
      { label: 'Taux', value: '30 %' },
      { label: 'Plafond annuel partagé avec FCPI-JEI', value: '75 000 € / 150 000 €' },
      { label: 'Plafond pluri-annuel JEI+JEIR', value: '50 000 € de RI cumulée sur 2024-2028' },
      { label: 'Validité', value: '1/1/2024 → 31/12/2028' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription DIRECTE au capital d\'une Jeune Entreprise Innovante (JEI : R&D ≥ 15 % des charges, créée < 8 ans, capital ≥ 50 % personnes physiques). Conservation 5 ans.' },
      { label: 'Calcul',
        text: 'RI = versement × 30 %, plafond ANNUEL partagé avec FCPI-JEI (cumul ≤ 75k/150k). Plafond PLURI-ANNUEL : RI cumulée JEI+JEIR ne peut dépasser 50 000 € sur 2024-2028 (saisir le cumul antérieur via le champ dédié du simulateur).' },
    ],
    refCGI: 'Art. 199 terdecies-0 A bis CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas JEI)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A bis CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213424' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html/identifiant=BOI-IR-RICI-90-20140509' },
    ],
  },
  {
    id: 'fcpiJei', family: 'ir-pme', label: 'IR-PME — FCPI investi en JEI (30 %)',
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.fcpiJei.taux, inputKey: 'fcpiJei',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription de parts de FCPI investissant en Jeunes Entreprises Innovantes (au quota prévu par le règlement du fonds). Réduction 30 %. Plafond ANNUEL 75 000 € / 150 000 € PARTAGÉ avec IR-PME JEI direct. Hors plafond niches 10 k. Validité depuis le 21/02/2026 — les FCPI classiques ne sont plus éligibles.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — FCPI investi en JEI',
    meta: [
      { label: 'Taux', value: '30 %' },
      { label: 'Plafond annuel partagé avec JEI direct', value: '75 000 € / 150 000 €' },
      { label: 'Validité', value: 'Depuis le 21/02/2026 (LF 2026)' },
      { label: 'FCPI classique', value: 'Non éligible IR-PME depuis 21/02/2026', status: 'warn' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription de parts d\'un FCPI (Fonds Commun de Placement dans l\'Innovation) dont le règlement prévoit un quota minimum investi en JEI. Mécanisme créé par la LF 2026 pour remplacer le FCPI classique supprimé. Durée de blocage : généralement 7 à 10 ans.' },
      { label: 'Calcul',
        text: 'RI = versement × 30 %. Plafond commun avec JEI direct : si l\'utilisateur cumule les deux, leur somme doit rester ≤ 75 000 € (cél) ou 150 000 € (couple).' },
    ],
    refCGI: 'Art. 199 terdecies-0 A bis CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas FCPI-JEI)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A bis CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213424' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html/identifiant=BOI-IR-RICI-90-20140509' },
    ],
  },
  {
    id: 'irPmeJeii', family: 'ir-pme', label: 'IR-PME — JEII (40 %)',
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJeii.taux, inputKey: 'irPmeJeii',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription au capital d\'une Jeune Entreprise Innovante à Impact (JEII). Réduction 40 %. Plafond 50 000 € / 100 000 €. Validité 21/02/2026 → 31/12/2028 (LF 2026, nouvel article).',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEII (Jeune Entreprise Innovante à Impact)',
    meta: [
      { label: 'Taux', value: '40 %' },
      { label: 'Plafond annuel', value: '50 000 € / 100 000 €' },
      { label: 'Validité', value: '21/02/2026 → 31/12/2028' },
      { label: 'Conditions', value: 'R&D 5-20 % des charges · critères ESUS · créée < 8 ans' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Dispositif créé par la LF 2026 (nouvel article). Souscription au capital d\'une Jeune Entreprise Innovante à Impact, combinant critères d\'innovation (R&D 5-20 %) et critères d\'utilité sociale (ESUS).' },
      { label: 'Calcul',
        text: 'RI = versement × 40 %, plafond annuel 50 000 € (cél) / 100 000 € (couple).' },
    ],
    refCGI: 'LF 2026 nouvel article',
    refBofip: '—',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas JEII)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Loi 2026-103 du 19 février 2026 (création JEII)', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051200000' },
    ],
  },
  {
    id: 'irPmeJeir', family: 'ir-pme', label: 'IR-PME — JEIR (50 %)',
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJeir.taux, inputKey: 'irPmeJeir',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Souscription au capital d\'une Jeune Entreprise Innovante de Rupture (JEIR). Réduction 50 %. Plafond 50 000 € / 100 000 €. Plafond pluri-annuel : RI cumulée JEI+JEIR ≤ 50 000 € sur 2024-2028. Hors plafond niches. Validité 1/1/2024 → 31/12/2028. Art. 199 terdecies-0 A ter CGI.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEIR (Jeune Entreprise Innovante de Rupture)',
    meta: [
      { label: 'Taux', value: '50 % (le plus élevé du dispositif IR-PME)' },
      { label: 'Plafond annuel', value: '50 000 € / 100 000 €' },
      { label: 'Plafond pluri-annuel JEI+JEIR', value: '50 000 € de RI cumulée sur 2024-2028' },
      { label: 'Validité', value: '1/1/2024 → 31/12/2028' },
      { label: 'Conditions', value: 'R&D ≥ 30 % des charges · aides de minimis ≤ 300 k€ / 3 ans' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription au capital d\'une Jeune Entreprise Innovante de Rupture (R&D ≥ 30 % des charges, aides de minimis plafonnées). Taux record de 50 %, mais le plafond pluri-annuel cumulé JEI+JEIR limite la RI totale à 50 000 € sur 5 ans.' },
      { label: 'Calcul',
        text: 'RI = versement × 50 %. Attention au plafond cumulé JEI+JEIR : 50 000 € de RI sur la période 2024-2028.' },
    ],
    refCGI: 'Art. 199 terdecies-0 A ter CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME (cas JEIR)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A ter CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543758' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html/identifiant=BOI-IR-RICI-90-20140509' },
    ],
  },
  // 2.c) Autres dispositifs niche 10 000 €
  {
    // Sémantique D3.3 : input.fipCorse = MONTANT SOUSCRIT (cash), RI = invest × 30 %
    // plafonné à versCouple(PD.fipCorse) = 12 000 € (single) / 24 000 € (couple).
    // Aligné sur le pattern IR-PME / SOFICA.
    id: 'fipCorse', family: 'fipCorse', label: 'FIP Corse / Outre-mer (30 %)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'fipCorse',
    taux: PD.fipCorse.taux,    // constante éditoriale, sert à avantageEstime et aux tooltips
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de FIP Corse ou Outre-mer. Cash sortant. Réduction 30 %. Plafond versement : 12 000 € (célib) / 24 000 € (couple). Blocage 5 ans minimum.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'FIP Corse / Outre-mer',
    meta: [
      { label: 'Taux', value: '30 % (majoré vs FIP classique métropolitain supprimé)' },
      { label: 'Plafond versements', value: '12 000 € (célib) / 24 000 € (couple)' },
      { label: 'RI max célib', value: '3 600 €' },
      { label: 'Blocage', value: '5 ans minimum (généralement 7-10 ans en pratique)' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription en parts de FIP (Fonds d\'Investissement de Proximité) investis en PME de Corse ou des DROM. Le FIP classique métropolitain a été supprimé au 1/1/2026. Seuls les FIP Corse et Outre-mer conservent le taux majoré 30 %.' },
      { label: 'Calcul',
        text: 'RI = versement × 30 %, plafonné à 12 000 € (cél) / 24 000 € (couple). Exemple : 10 000 € → 3 000 €.' },
    ],
    refCGI: 'Art. 199 terdecies-0 A bis CGI',
    refBofip: 'BOI-IR-RICI-100',
    links: [
      { label: 'Art. 199 terdecies-0 A bis CGI (Légifrance)',
        url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041464766' },
      { label: 'BOFiP — BOI-IR-RICI-100',
        url: 'https://bofip.impots.gouv.fr/bofip/2049-PGP.html' },
      { label: 'Service-public.fr — FIP',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F12888' },
    ],
  },
  {
    // Sémantique D3.3 : input.gfi = MONTANT SOUSCRIT (cash), RI = invest × 18 %
    // plafonné à versCouple(PD.gfi) = 50 000 € / 100 000 €.
    // Arbitrage BOFiP en attente (audit-preco-vs-leviers.md) : taux 25 % en zone
    // éligible reste à modéliser. V1 = 18 % uniformément.
    id: 'gfi', family: 'gfi', label: 'GFI Forestier (18%)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'gfi',
    taux: PD.gfi.taux,    // 0.18 — constante éditoriale pour avantageEstime + tooltips
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de Groupement Forestier d\'Investissement. Cash sortant. Réduction 18 % (jusqu\'à 25 % en zone éligible). Plafond 50 k€ / 100 k€. Avantages annexes IFI et succession.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'GFI — Groupement Forestier d\'Investissement',
    meta: [
      { label: 'Taux', value: '18 % (jusqu\'à 25 % en zone éligible)' },
      { label: 'Plafond versements', value: '50 000 € (célib) / 100 000 € (couple)' },
      { label: 'RI max célib', value: '9 000 € (12 500 € en zone majorée)' },
      { label: 'Durée de détention', value: '5 ans 1/2 minimum' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription au capital de Groupements Forestiers d\'Investissement (GFI), véhicules collectifs qui financent l\'achat et la gestion durable de forêts françaises. Diversification patrimoniale + soutien à la filière bois + avantage fiscal. Liquidité limitée : marché secondaire restreint, sortie organisée par le gérant en général sur 8-12 ans.' },
      { label: 'Calcul',
        text: 'RI = montant souscrit × 18 % (ou 25 % en zone éligible majorée), dans la limite du plafond. Exemple : 30 000 € souscrits par un couple à 18 % → 5 400 € de RI.' },
      { label: 'Avantages annexes',
        text: 'Au-delà de la RI : exonération partielle d\'IFI (75 % de la valeur des bois et forêts) et abattement de 75 % sur les droits de mutation à titre gratuit (succession/donation), sous conditions d\'engagement de gestion durable.' },
    ],
    refCGI: 'Art. 199 decies H CGI',
    refBofip: 'BOI-IR-RICI-130',
    links: [
      { label: 'Art. 199 decies H CGI (Légifrance)',
        url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045203167' },
      { label: 'BOFiP — BOI-IR-RICI-80',
        url: 'https://bofip.impots.gouv.fr/bofip/2105-PGP.html' },
      { label: 'Service-public.fr — GFI',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F22806' },
    ],
  },
  {
    id: 'locAvantages', label: 'Loc\'Avantages',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'locAvantagesDepenses',
    paramKey: 'locAvantagesPalier',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: 'Saisir les DÉPENSES (loyers décotés) DE L\'ANNÉE liées à la location à loyer modéré (ex-Cosse). Pas du cash sortant strict, plutôt un manque à gagner sur loyer → EXCLU du budget annuel. Le moteur calcule la RI = min(dépenses, 10 000 €) × 15/35/65 % selon palier de décote.',
    sectionGroup: 'immobilier-locatif',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Loc\'Avantages — location à loyer modéré',
    meta: [
      { label: 'Taux loyer intermédiaire (Loc 1)', value: '15 % (sans intermédiation) · 20 % (avec)' },
      { label: 'Taux loyer social (Loc 2)', value: '35 % (sans intermédiation) · 40 % (avec)' },
      { label: 'Taux loyer très social (Loc 3)', value: '65 % (avec intermédiation uniquement)' },
      { label: 'Plafond d\'assiette', value: '10 000 € de loyers retenus par an' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Applicable sur l\'ensemble du territoire, sans obligation de travaux. En échange d\'un loyer modéré (locataire sous plafonds de ressources), le propriétaire obtient une réduction d\'impôt calculée sur les loyers perçus. Plus le loyer est bas, plus le taux est élevé. L\'intermédiation locative (via une association agréée) augmente le taux.' },
      { label: 'Calcul',
        text: 'RI = min(loyers, 10 000 €) × taux applicable. Exemple Loc 2 sans intermédiation : 8 000 € × 35 % = 2 800 € de RI.' },
    ],
    refCGI: 'Art. 199 tricies CGI',
    refBofip: '—',
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
    // Sémantique D3.2 : input.sofica = MONTANT SOUSCRIT (cash) ; input.soficaTaux
    // = '30' | '36' | '48' (engagement de la SOFICA). RI = invest × taux,
    // plafonné par versement effectif = min(18 000 €, 25 %·RNG).
    // Aligné sur le pattern IR-PME (post-F4) : 1 input numérique + 1 select de taux.
    id: 'sofica', family: 'sofica', label: 'SOFICA',
    levier: 2, cat: 'niche18', mode: 'versement-direct', inputKey: 'sofica',
    paramKey: 'soficaTaux',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de SOFICA (financement cinéma/audiovisuel). Cash sortant. Choisir ensuite le taux selon le scénario de la SOFICA. Versement plafonné à min(18 000 €, 25 % du RNG). Niche majorée 18 k€. Conservation 5 ans.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'SOFICA — financement du cinéma et de l\'audiovisuel',
    meta: [
      { label: 'Taux de base', value: '30 %' },
      { label: 'Taux majoré (engagement production)', value: '36 %' },
      { label: 'Taux maximal (production indép. + langues régionales)', value: '48 %' },
      { label: 'Plafond de souscription', value: 'min(18 000 €, 25 % du RNG)' },
      { label: 'Durée de blocage', value: '5 ans minimum' },
      { label: 'Dans le plafond niches ?', value: 'Oui — plafond majoré 18 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Les SOFICA sont des fonds agréés par le CNC et l\'AMF qui financent la production de films et séries. Parts bloquées 5 ans, risque de perte en capital. Souscriptions agréées annuellement, en volume limité. Mécanisme de niche à plafond majoré 18 000 € (vs 10 000 € pour les niches standard).' },
      { label: 'Calcul',
        text: 'RI = souscription × taux (30/36/48 %), plafonné à min(18 000 €, 25 % du RNG). Exemple à 48 % : 18 000 × 48 % = 8 640 € de RI.' },
    ],
    refCGI: 'Art. 199 unvicies CGI',
    refBofip: 'BOI-IR-RICI-180',
    links: [
      { label: 'Art. 199 unvicies CGI (Légifrance)',
        url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041467091' },
      { label: 'BOFiP BOI-IR-RICI-180-20',
        url: 'https://bofip.impots.gouv.fr/bofip/3666-PGP.html' },
      { label: 'Service-public.fr — SOFICA',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F31290' },
    ],
    params: [
      { name: 'taux', label: 'Taux SOFICA', defaultValue: '36',
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
    rendementDefaut: 1.10, rendementMin: 1.00, rendementMax: 1.30, rendementStep: 0.005,
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN PD de l\'année (versement à l\'opérateur, à fonds perdus). Cash sortant. Mécanique one-shot : RI majorée encaissée l\'année suivante. Quote-part 44 % dans le plafond niches 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 108–115 %. Boutons ± 0,5 % ou saisie clavier directe.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt — investissement à fonds perdus',
    titleLong: 'Girardin Industriel — Plein Droit',
    meta: [
      { label: 'Quote-part dans le plafond niches', value: '44 % (rétrocession 56 %)' },
      { label: 'RI brute max (célib)', value: '40 909 € (= 18 000 € / 44 %)' },
      { label: 'Rendement marché 2026', value: '108–115 % (gain net 8–15 %)' },
      { label: 'Mécanique', value: 'One-shot : RI encaissée l\'année suivante' },
      { label: 'Dans le plafond niches ?', value: 'Oui — plafond majoré 18 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Investissement à fonds perdus dans une société de portage qui finance l\'acquisition d\'équipements industriels exploités en Outre-mer. L\'investisseur ne récupère pas son capital (perte nette) mais obtient une RI supérieure à l\'apport (rendement typique 108-115 %) dès l\'année suivante.' },
      { label: 'Calcul',
        text: 'RI = versement × rendement (saisi entre 100 % et 130 %). Quote-part 44 % dans le plafond niches : RI brute jusqu\'à 40 909 € possible avant saturation. Report possible sur 5 ans si excédent.' },
    ],
    refCGI: 'Art. 199 undecies B CGI',
    refBofip: 'Art. 200-0 A CGI (quote-part)',
  },
  {
    id: 'girardinAG', label: 'Girardin Industriel — Avec Agrément',
    levier: 2, cat: 'niche18', mode: 'taux-libre', inputKey: 'girardinAG',
    nature: 'versement-annuel', budget: 'cash',
    rendementDefaut: 1.08, rendementMin: 1.00, rendementMax: 1.25, rendementStep: 0.005,
    info: 'Saisir le MONTANT INVESTI DANS LE PROGRAMME GIRARDIN AG de l\'année (versement à l\'opérateur, à fonds perdus). Idem Plein Droit mais avec agrément ministériel (programmes > 250 k€). Cash sortant. Quote-part 34 % dans le plafond niches 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 105–112 %.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt — investissement à fonds perdus',
    titleLong: 'Girardin Industriel — Avec Agrément',
    meta: [
      { label: 'Quote-part dans le plafond niches', value: '34 % (rétrocession 66 %)' },
      { label: 'RI brute max (célib)', value: '52 941 € (= 18 000 € / 34 %)' },
      { label: 'Rendement marché 2026', value: '105–112 % (gain net 5–12 %)' },
      { label: 'Condition', value: 'Agrément ministériel (programmes > 250 k€)' },
      { label: 'Dans le plafond niches ?', value: 'Oui — plafond majoré 18 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Variante du Girardin Industriel pour les programmes > 250 k€, soumis à agrément ministériel préalable. Quote-part plus faible (34 %) → permet plus de versement avant saturation du plafond niches.' },
      { label: 'Calcul',
        text: 'RI = versement × rendement. Quote-part 34 % : RI brute jusqu\'à 52 941 € possible avant saturation. Mécanique one-shot identique au PD.' },
    ],
    refCGI: 'Art. 199 undecies B CGI',
    refBofip: 'Art. 200-0 A CGI (quote-part)',
  },

  // ─── LEVIER 3 — CRÉDITS D'IMPÔT (REMBOURSÉS SI IR = 0) ──
  {
    id: 'emploiDom', label: 'Emploi à domicile (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'emploiDomicile',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES DE L\'ANNÉE (salaires + charges sociales) pour un employé à domicile (ménage, jardinage, soutien scolaire, aide à la personne, etc.). Cash sortant. Crédit 50 %, plafond 12 000 € (15 000 € avec majoration enfants).',
    sectionGroup: 'famille-quotidien',
    tagType: 'Crédit d\'impôt',
    titleLong: 'Emploi à domicile (50 %)',
    meta: [
      { label: 'Taux', value: '50 %' },
      { label: 'Plafond de base', value: '12 000 € de dépenses' },
      { label: 'Majoration enfants', value: '+1 500 € / enfant à charge (+750 € en garde alt.), max 15 000 €' },
      { label: 'Crédit max', value: '7 500 € (15 000 × 50 %)' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Crédit d\'impôt (remboursable même si l\'IR est nul) pour les dépenses d\'emploi salarié à domicile : ménage, jardinage, soutien scolaire, aide à la personne, garde d\'enfants à domicile, etc.' },
      { label: 'Calcul',
        text: 'Crédit = min(dépenses, plafond) × 50 %. Le plafond de base 12 000 € est majoré de 1 500 € par enfant à charge plein (750 € en garde alternée), dans la limite globale de 15 000 €.' },
    ],
    refCGI: 'Art. 199 sexdecies-I-2° CGI',
    refBofip: '—',
  },
  {
    id: 'gardeEnf', label: 'Garde enfants < 6 ans (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'gardeEnfants',
    nature: 'depenses-annuelles', budget: 'cash',
    info: 'Saisir les DÉPENSES DE GARDE DE L\'ANNÉE pour enfants de moins de 6 ans (crèche, assistante maternelle, garderie périscolaire). Cash sortant. Crédit 50 %, plafond 3 500 € par enfant.',
    sectionGroup: 'famille-quotidien',
    tagType: 'Crédit d\'impôt',
    titleLong: 'Garde d\'enfants < 6 ans (50 %)',
    meta: [
      { label: 'Taux', value: '50 %' },
      { label: 'Plafond par enfant', value: `${P.plafonds.gardeEnfantsMax.toLocaleString('fr-FR')} €` },
      { label: 'Garde alternée', value: '½ plafond par enfant (1 750 €)' },
      { label: 'Dans le plafond niches ?', value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Crédit d\'impôt pour les frais de garde des enfants à charge âgés de moins de 6 ans au 1er janvier de l\'année : crèche, halte-garderie, assistante maternelle agréée, garderie périscolaire.' },
      { label: 'Calcul',
        text: 'Crédit = min(dépenses, 3 500 € × nb enfants éligibles) × 50 %. Exemple : 6 000 € pour 1 enfant → 3 500 × 50 % = 1 750 €.' },
    ],
    refCGI: 'Art. 200 quater B CGI',
    refBofip: 'BOI-IR-RICI-300',
  },
  {
    id: 'syndic', label: 'Cotisations syndicales (66%)',
    levier: 3, cat: 'hors', mode: 'versement-direct', inputKey: 'cotSyndicales',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir la COTISATION SYNDICALE de l\'année (CGT, CFDT, FO, CFTC, Sud, etc.). Cash sortant. Crédit d\'impôt 66 %, plafond 1 % des salaires + alloc chômage + pensions.',
    sectionGroup: 'famille-quotidien',
    tagType: 'Crédit d\'impôt',
    titleLong: 'Cotisations syndicales (66 %)',
    meta: [
      { label: 'Taux', value: '66 %' },
      { label: 'Plafond', value: '1 % des salaires + alloc chômage + pensions de retraite/invalidité' },
      { label: 'Cases déclaration', value: '7AC / 7AE / 7AG' },
      { label: 'Dans le plafond niches ?', value: 'Non — hors plafond', status: 'warn' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Crédit d\'impôt pour les cotisations versées à un syndicat (CGT, CFDT, FO, CFTC, Sud, etc.). Crédit d\'impôt remboursable même si l\'IR est nul.' },
      { label: 'Calcul',
        text: 'Crédit = min(cotisation, 1 % des revenus d\'activité) × 66 %. Exemple : 500 € de cotisation, revenus 40 000 € → cap 400 €, crédit 264 €.' },
    ],
    refCGI: 'Art. 199 quater C CGI',
    refBofip: '—',
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
  // SOFICA (D3.2) — versement-direct + paramKey, sémantique INVESTISSEMENT pure.
  // RI brute = montant × taux choisi (cap effectif appliqué par le moteur).
  // Loc'Av / Malraux utilisent aussi versement-direct+paramKey mais en mode
  // « dépenses + palier » (RI = min(montant, plafond) × taux) : on ne peut PAS
  // assimiler montant × taux à l'avantage estimé pour eux, d'où la restriction.
  if (lev.id === 'sofica' && lev.params && lev.params[0]) {
    const opt = lev.params[0].options.find(o => o.value === p.paramValue);
    if (opt && opt.taux !== undefined) return p.montant * opt.taux;
  }
  // Versement-direct + family + taux constant (D3.3) — FIP Corse, GFI, etc.
  // Sémantique investissement pure : RI ≈ montant × taux (cap effectif côté moteur).
  // Critère `lev.family` indispensable pour ne pas attraper les leviers en mode
  // dépenses ou autres versement-direct sans correspondance simple.
  if (lev.mode === 'versement-direct' && lev.family && lev.taux !== undefined) {
    return p.montant * lev.taux;
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
      // fcpi (classique) retiré en D3.4 — dispositif supprimé au 21/02/2026.
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

// ─────────────────────────────────────────────
// GÉNÉRATEUR ONGLET LEVIERS — depuis LEVIERS_CATALOGUE
// ─────────────────────────────────────────────
// Phase F3 : produit dynamiquement les cards de l'onglet Leviers fiscaux
// à partir du catalogue. Un seul niveau de configuration (le catalogue)
// pilote 3 vues (Préco, Simulateur, Leviers).
//
// Un levier doit avoir : sectionGroup, tagType, titleLong, meta[], descBlocks[],
// refCGI, [refBofip]. Si l'un manque, la card affiche un fallback minimal
// (titre seul) — l'ajout progressif au catalogue est ainsi non-bloquant.

const SECTION_LABELS = {
  'epargne-retraite':      'Épargne retraite',
  'immobilier-locatif':    'Immobilier locatif',
  'investissement-financier': 'Investissement financier',
  'dons':                  'Dons et mécénat',
  'famille-quotidien':     'Famille et quotidien',
};

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function badgeForCat(cat) {
  if (cat === 'hors')    return '<span class="lbadge lbadge-hors">Hors plafond niches</span>';
  if (cat === 'niche10') return '<span class="lbadge lbadge-10k">Niche 10 000 €</span>';
  if (cat === 'niche18') return '<span class="lbadge lbadge-18k">Niche 18 000 €</span>';
  if (cat === 'foncier') return '<span class="lbadge lbadge-hors">Hors plafond niches</span>'
    + '<span class="lbadge lbadge-deduct">Déduction revenu foncier</span>';
  return '';
}

function badgeForLevier(levier, cat) {
  // Levier 1 (déduction) ajoute un badge "Déduction revenu"
  if (levier === 1 && cat !== 'foncier') return '<span class="lbadge lbadge-deduct">Déduction revenu</span>';
  return '';
}

function renderLevierCard(lev) {
  // Fallback minimal si le catalogue n'a pas encore été enrichi pour ce levier
  if (!lev.titleLong && !lev.tagType) {
    return `<div class="levier-card">
      <div class="levier-header" onclick="toggleLevier(this)">
        <div class="levier-header-left">
          <div class="levier-title">${escHtml(lev.label)}</div>
        </div>
        <span class="levier-arrow">▾</span>
      </div>
    </div>`;
  }

  const badges = badgeForCat(lev.cat) + badgeForLevier(lev.levier, lev.cat);
  const meta = (lev.meta || []).map(m =>
    `<div class="levier-meta-item">
       <div class="levier-meta-label">${escHtml(m.label)}</div>
       <div class="levier-meta-value${m.status === 'warn' ? ' lmv-warn' : (m.status === 'good' ? ' lmv-good' : '')}">${escHtml(m.value)}</div>
     </div>`
  ).join('');
  const descs = (lev.descBlocks || []).map((d, i, all) => {
    // La dernière desc inclut la référence CGI en italique à la fin
    // (sauf si lev.links est présent — dans ce cas la ref est dans le bloc Sources)
    const isLast = i === all.length - 1;
    const hasLinks = Array.isArray(lev.links) && lev.links.length > 0;
    const ref = isLast && lev.refCGI && !hasLinks
      ? ` <em>${escHtml(lev.refCGI)}${lev.refBofip ? ' — ' + escHtml(lev.refBofip) : ''}</em>` : '';
    return `<div class="levier-desc">
       <div class="levier-desc-label">${escHtml(d.label)}</div>
       <div class="levier-desc-text">${escHtml(d.text)}${ref}</div>
     </div>`;
  }).join('');

  // Bloc Sources officielles (si lev.links défini) — liens cliquables vers BOFiP,
  // Légifrance, service-public.gouv.fr. Sécurité : target="_blank" rel="noopener".
  const sources = Array.isArray(lev.links) && lev.links.length > 0
    ? `<div class="levier-sources">
         <div class="levier-desc-label">Sources officielles</div>
         <ul class="levier-sources-list">
           ${lev.links.map(l => `<li><a href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escHtml(l.label)}</a></li>`).join('')}
         </ul>
       </div>`
    : '';

  return `<div class="levier-card">
    <div class="levier-header" onclick="toggleLevier(this)">
      <div class="levier-header-left">
        <div class="levier-tag-type">${escHtml(lev.tagType)}</div>
        <div class="levier-title">${escHtml(lev.titleLong || lev.label)}</div>
      </div>
      <div class="levier-badges">${badges}</div>
      <span class="levier-arrow">▾</span>
    </div>
    <div class="levier-body"><div class="levier-body-inner">
      ${meta ? `<div class="levier-meta">${meta}</div>` : ''}
      ${descs}
      ${sources}
    </div></div>
  </div>`;
}

// ─────────────────────────────────────────────
// GÉNÉRATEUR FORM-ROWS SIMULATEUR — depuis le catalogue
// ─────────────────────────────────────────────
// Pour une `family` du catalogue (ex: 'ir-pme'), génère les form-rows
// correspondantes dans le Simulateur. Élimine la duplication HTML.
// Pattern : chaque famille de leviers fiscaux a un container vide dans
// index.html (ex: <div id="simIrPme"></div>), alimenté par cette fonction.
function renderSimulateurFormRows(targetEl, family) {
  if (!targetEl) return;
  const leviers = LEVIERS_CATALOGUE.filter(l => l.family === family);
  const html = leviers.map(lev => {
    const nicheClass = lev.cat === 'hors'    ? 'niche-hors'
                     : lev.cat === 'niche18' ? 'niche-18k'
                     : lev.cat === 'foncier' ? 'niche-hors'
                     :                         'niche-10k';
    const nicheLabel = lev.cat === 'hors'    ? 'hors plafond niches'
                     : lev.cat === 'niche18' ? 'niche 18 000 €'
                     : lev.cat === 'foncier' ? 'hors plafond niches'
                     :                         'niche 10 000 €';
    // Si le levier a un paramètre additionnel (taux variable côté UI, ex.
    // SOFICA 30/36/48 %), on génère un <select> à droite de l'input numérique.
    // Le wrapper `.form-row-input-with-param` impose un flex 1+auto dans la
    // cellule centrale de la grille (cf. CSS).
    const hasParam = lev.paramKey && lev.params && lev.params[0] && lev.params[0].options;
    const selectHtml = hasParam
      ? `<select id="${escHtml(lev.paramKey)}" aria-label="${escHtml(lev.params[0].label || '')}">${
          lev.params[0].options.map(o =>
            `<option value="${escHtml(o.value)}"${o.value === (lev.params[0].defaultValue || '') ? ' selected' : ''}>${escHtml(o.label)}</option>`
          ).join('')
        }</select>`
      : '';
    const inputCell = hasParam
      ? `<div class="form-row-input-with-param">
          <input type="number" id="${escHtml(lev.inputKey)}" value="0" min="0">
          ${selectHtml}
        </div>`
      : `<input type="number" id="${escHtml(lev.inputKey)}" value="0" min="0">`;
    return `<div class="form-row advanced">
      <label for="${escHtml(lev.inputKey)}">
        ${escHtml(lev.titleLong || lev.label)}
        <i class="tip" data-tip="${escHtml(lev.info || '')}">i</i>
      </label>
      ${inputCell}
      <div class="niche-cell">
        <span class="niche-marker ${nicheClass}">${escHtml(nicheLabel)}</span>
      </div>
    </div>`;
  }).join('');
  targetEl.innerHTML = html;
}

function renderLeviersOnglet(targetEl) {
  if (!targetEl) return;
  // Groupe les leviers par sectionGroup ; ceux sans sectionGroup sont ignorés
  // (fallback : restent en HTML statique pendant la transition F3).
  const bySection = new Map();
  for (const lev of LEVIERS_CATALOGUE) {
    if (!lev.sectionGroup) continue;
    if (!bySection.has(lev.sectionGroup)) bySection.set(lev.sectionGroup, []);
    bySection.get(lev.sectionGroup).push(lev);
  }
  const parts = [];
  for (const [section, leviers] of bySection) {
    parts.push(`<div class="leviers-section-title">${escHtml(SECTION_LABELS[section] || section)}</div>`);
    parts.push(leviers.map(renderLevierCard).join(''));
  }
  targetEl.innerHTML = parts.join('');
}

// Export Node pour tests
if (typeof module !== 'undefined') {
  module.exports = {
    LEVIERS_CATALOGUE,
    appliquerPreconisations,
    avantageEstime,
    checkPlafond,
    computeWarnings,
    renderLeviersOnglet,
    renderSimulateurFormRows,
  };
}
