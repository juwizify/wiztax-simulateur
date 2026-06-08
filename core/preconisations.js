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
 * ⚠ NOTES & CHOIX DE DESIGN :
 *
 * - PINEL : la sémantique de saisie est INTENTIONNELLEMENT « RI annuelle déjà
 *   connue par l'utilisateur » (lue sur l'attestation fiscale notariale). Le
 *   moteur ne ré-applique pas le taux et n'étale pas sur 6/9/12 ans : il
 *   prend la RI annuelle saisie au pied de la lettre. PR-D enrichit le tooltip
 *   HTML avec la formule d'étalement (RI annuelle = invest × taux total / durée)
 *   et les taux par millésime (2014-2022, 2023, 2024, Pinel+) pour les
 *   utilisateurs qui n'auraient pas l'attestation et doivent calculer eux-mêmes.
 *   Pinel est en .advanced + label « dispositif fermé » (LF 2024 art. 168) :
 *   plus aucune nouvelle acquisition éligible depuis le 01/01/2025.
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
const P  = (typeof PARAMS !== 'undefined') ? PARAMS : require('./params.js').PARAMS;
const PD = P.plafondsDispositifs;

// ─── Helpers de formatage (lecture catalogue + templates `info`) ───
// pct(0.18) → '18 %' · pct(0.185) → '18,5 %' · eur(50000) → '50 000 €'
// Évite la duplication des chiffres entre catalogue et params.js (cf. PR-E).
const pct = (n) => (n * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
const eur = (n) => n.toLocaleString('fr-FR') + ' €';

// ─────────────────────────────────────────────
// CATALOGUE DES LEVIERS
// ─────────────────────────────────────────────
// Modes :
//   - 'versement-direct' : input du moteur = montant saisi (INVESTISSEMENT pour
//     les véhicules cash, ou DÉPENSE pour Loc'Avantages/Malraux). Le moteur
//     calcule la RI via plafond × taux. Tous les véhicules « cash sortant »
//     (IR-PME, SOFICA, FIP Corse, GFI) sont en versement-direct depuis D3.3.
//   - 'taux-variable' : taux dépend d'un paramètre additionnel listé dans
//     `params[0].options[].taux` (Loc'Avantages palier, Malraux zone).
//   - 'taux-libre' : rendement saisi par l'utilisateur (Girardin PD/AG).
//   - Le déficit foncier utilise 'versement-direct' avec inputKey 'deficitFoncier'
//     (sémantique positif, traité comme charge déductible cap 10 700 €/an).
//   - 'jeanbrun' : amortissement spécifique foncier (pas un avantage IR direct).
// Mode 'taux' retiré en D3.5 (plus aucun usager après migration FIP/GFI).

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
    // D3.13 : ajout family + secondaryInputs (perPlafondManuel) + customRightCell.
    // Visible en mode simple (PER = levier patrimonial très courant).
    // Cellule de droite custom : `per-cap-live` mise à jour dynamiquement
    // par app.js (set('per-cap-live', fmt(d.perCap))) à chaque recalcul.
    id: 'per', family: 'per', label: 'PER (Plan d\'Épargne Retraite)',
    levier: 1, cat: 'hors', mode: 'versement-direct', inputKey: 'per',
    nature: 'versement-annuel', budget: 'cash',
    inSimpleMode: true,
    customRightCell: 'per-cap',
    titleLong: 'Versements PER (part déductible)',
    secondaryInputs: [
      {
        key: 'perPlafondManuel',
        label: '↳ Plafond PER manuel (option, cases 6PS/6PT)',
        tip: 'Si tu connais ton plafond exact (lu sur ton avis d\'imposition, section « Plafond épargne retraite »), saisis-le ici pour ÉCRASER le calcul automatique.\n\nUtile notamment quand tu as accumulé des plafonds non utilisés des 3 dernières années (reportables) — ton plafond réel est souvent supérieur au calcul auto.\n\nLaisser à 0 pour utiliser le calcul automatique.\n\nLe plafond saisi ici est appliqué au foyer entier (somme des cases 6PS + 6PT).',
        inSimpleMode: false,    // sous-champ avancé même si PER principal est en mode simple
      },
    ],
    info: `Saisir le versement volontaire de l'année (cases 6NS / 6NT). Vient diminuer le revenu imposable, économie ≈ versement × TMI.\n\nPlafond automatique : 10 % des revenus pro, avec un plancher de ${eur(P.plafonds.perPlancher)} et un plafond max de ${eur(P.plafonds.perMaxSalarie)}.\n\nLe report des plafonds non utilisés des 3 années précédentes n'est pas pris en compte ici. Si tu connais ton vrai plafond (avis d'imposition), saisis-le dans le sous-champ pour écraser le calcul auto.\n\n⚠ Versements non déductibles à partir de 70 ans (LF 2026).`,
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
    // D3.8 : seules les URLs vérifiées (audit) sont collées ici.
    links: [
      { label: 'service-public.gouv.fr — Plan d\'Épargne Retraite (PER)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F34982' },
    ],
  },
  {
    id: 'deficitFoncier', label: 'Déficit foncier (travaux)',
    levier: 1, cat: 'foncier', mode: 'versement-direct', inputKey: 'deficitFoncier',
    nature: 'depenses-annuelles', budget: 'cash',
    inSimpleMode: true,   // PR-V — cas courant dans la liste « Type de charge »
    info: `Saisir le montant du déficit foncier. Vient diminuer le revenu global, plafonné à ${eur(P.plafonds.deficitFoncierMax)}/an. Économie = montant retenu × TMI.`,
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
    // URL vérifiée en D3.9.
    links: [
      { label: 'service-public.gouv.fr — Revenus locatifs (déficit foncier, cap 10 700 €)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1991' },
    ],
  },
  {
    // D3.11 : ajout family pour génération form-row (input + select catégorie).
    // showNicheCell: false → pas de cellule niche à droite (déduction foncière,
    // pas une réduction d'impôt classique).
    id: 'jeanbrun', family: 'jeanbrun', label: 'Dispositif Jeanbrun (LF 2026)',
    levier: 1, cat: 'foncier', mode: 'jeanbrun', inputKey: 'jeanbrunAmort',
    paramKey: 'jeanbrunCategorie',
    inSimpleMode: true,   // PR-V — dispositif locatif neuf phare LF 2026
    showNicheCell: false,
    titleLong: 'Déficit Jeanbrun annuel — bailleur privé (LF 2026)',
    nature: 'amortissement-annuel', budget: 'exclu',
    info: `Saisir le montant du déficit Jeanbrun de l'année. Vient diminuer le revenu imposable, dans la limite du plafond de la catégorie de loyer choisie : ${eur(P.plafonds.jeanbrunPlafondInter)} (intermédiaire), ${eur(P.plafonds.jeanbrunPlafondSocial)} (social), ${eur(P.plafonds.jeanbrunPlafondTresSoc)} (très social). Économie = montant retenu × TMI.\n\nPlafond commun avec le déficit foncier classique : ${eur(P.plafonds.deficitFoncierMax)}/an au total.`,
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
    // URL vérifiée en D3.9 — actualité officielle « Relance logement ».
    links: [
      { label: 'service-public.gouv.fr — Relance logement (nouveau dispositif bailleur privé)',
        url: 'https://www.service-public.gouv.fr/particuliers/actualites/A18817' },
    ],
  },

  // ─── LEVIER 2 — RÉDUCTIONS D'IMPÔT ─────────────────────
  // 2.a) Hors plafond niches
  {
    // D3.11 : ajout family pour génération form-row depuis catalogue.
    // PR-V : passé en mode simple (cas courant — Coluche).
    // dons7UD retiré du mode simple (PR-J) : le lead-gen utilise dons7UF (66 %) comme
    // catch-all dons. Le 7UD reste accessible en mode complet pour les CGP.
    id: 'dons7UD', family: 'dons7UD', label: 'Dons « Coluche » (organismes d\'aide, 75%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'dons7UD',
    nature: 'versement-annuel', budget: 'cash',
    nichePlafLabel: '75 % ≤ 2 000 € · surplus → 7UF',
    info: `Saisir le montant des dons versés à un organisme d'aide aux personnes en difficulté (Restos du Cœur, Croix-Rouge, Secours Populaire, Banque alimentaire…) ou aux victimes de violences domestiques. Réduction d'impôt de ${pct(P.plafonds.dons75Taux)} sur les premiers ${eur(P.plafonds.dons75Plafond)} ; au-delà, l'excédent bascule automatiquement en régime classique à ${pct(P.plafonds.dons66Taux)}. Hors plafond niches.`,
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
    links: [
      { label: 'service-public.gouv.fr — Réduction d\'impôt pour dons',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F426' },
    ],
  },
  {
    // D3.11 : visible en mode simple (les dons sont un usage quotidien).
    id: 'dons7UF', family: 'dons7UF', label: 'Dons d\'intérêt général (66%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'dons',
    nature: 'versement-annuel', budget: 'cash',
    inSimpleMode: true,
    nichePlafLabel: '66 % · plafond 20 % du RNI',
    info: `Saisir le montant des dons versés à un organisme d'intérêt général : associations sportives, culturelles, environnementales, écoles, fondations reconnues d'utilité publique, etc. Réduction d'impôt de ${pct(P.plafonds.dons66Taux)}, plafonnée à ${pct(P.plafonds.donsPlafondRNI)} du revenu net imposable. Hors plafond niches. Le surplus est reportable 5 ans (non simulé ici).`,
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
    links: [
      { label: 'service-public.gouv.fr — Réduction d\'impôt pour dons',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F426' },
    ],
  },
  {
    // D3.13 : ajout family + secondaryInput (ehpadNbPers).
    // Reste en .advanced (cas spécifique aidants familiaux).
    id: 'ehpad', family: 'ehpad', label: 'Frais EHPAD ascendants (25%)',
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'ehpadFrais',
    nature: 'depenses-annuelles', budget: 'cash',
    // EHPAD retiré du mode simple (PR-J) — cas spécifique aidants familiaux.
    nichePlafLabel: 'crédit 25 % · plaf. dép. 10 000 €/personne',
    titleLong: 'Frais EHPAD pour ascendants (25 %)',
    secondaryInputs: [
      {
        key: 'ehpadNbPers',
        label: '↳ Nombre de personnes hébergées',
        tip: 'Une cellule par personne hébergée : le plafond annuel de 10 000 € de dépenses est appliqué × ce nombre.\n\nSaisir au moins 1 pour utiliser le crédit. Exemple : 2 ascendants en EHPAD → plafond global 20 000 € de dépenses.',
        defaultValue: 1,
        min: 1,
        step: 1,
        inSimpleMode: false,
      },
    ],
    info: `Saisir le montant total facturé par l'EHPAD pour un ascendant : hébergement + dépendance (hors frais médicaux). Crédit d'impôt de ${pct(P.plafonds.ehpadTaux)}, plafonné à ${eur(P.plafonds.ehpadPlafondParPers)} de dépenses par personne hébergée — soit un crédit max de ${eur(P.plafonds.ehpadPlafondParPers * P.plafonds.ehpadTaux)}/personne. Hors plafond niches.`,
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
    // URLs vérifiées en D3.9.
    links: [
      { label: 'service-public.gouv.fr — Frais d\'accueil dépendance (réduction 25 %)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F17' },
      { label: 'impots.gouv.fr — FAQ entrée en EHPAD (cases 7CD/7CE)',
        url: 'https://www.impots.gouv.fr/particulier/questions/je-suis-entree-en-etablissement-pour-personne-dependante-comment-puis-je' },
    ],
  },
  {
    // D3.7 : ajout family 'malraux' pour génération form-row depuis catalogue.
    // Sémantique = TRAVAUX DE L'ANNÉE + select zone (SPR sans PSMV / SPR-PSMV ou QAD).
    // Moteur calcule RI = min(travaux, 100 000 €) × taux zone (22 % / 30 %).
    id: 'malraux', family: 'malraux', label: `Loi Malraux (${pct(PD.malraux.taux['spr-non'])} ou ${pct(PD.malraux.taux['spr-oui'])})`,
    levier: 2, cat: 'hors', mode: 'versement-direct', inputKey: 'malrauxTravaux',
    paramKey: 'malrauxZone',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: `Saisir le montant des travaux Malraux engagés dans l'année (restauration d'immeubles patrimoniaux loués nus 9 ans).\n\nRéduction = travaux retenus × taux de la zone :\n· 22 % en SPR sans PSMV (Site Patrimonial Remarquable « simple »)\n· 30 % en SPR avec PSMV, ou en Quartier Ancien Dégradé (QAD)\n\nSPR = Site Patrimonial Remarquable (ancien « secteur sauvegardé »). PSMV = Plan de Sauvegarde et de Mise en Valeur, document d'urbanisme renforcé qui couvre la partie la plus protégée du SPR — sa présence (ou un QAD) ouvre droit au taux majoré 30 %.\n\nPlafond annuel : ${eur(PD.malraux.depensesParAnMax)}/an. Plafond pluri-annuel : ${eur(PD.malraux.depensesPluriAnMax)} sur 4 ans glissants — saisir le cumul des 3 années précédentes dans le sous-champ pour que le moteur applique le bon reliquat.\n\nHors plafond niches : c'est l'atout majeur du dispositif.`,
    sectionGroup: 'immobilier-locatif',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Loi Malraux — restauration en Site Patrimonial Remarquable',
    meta: [
      { label: 'Plafond travaux / an', value: eur(PD.malraux.depensesParAnMax) },
      { label: 'Plafond travaux / 4 ans', value: eur(PD.malraux.depensesPluriAnMax) },
      { label: 'Taux SPR + PSMV ou QAD', value: pct(PD.malraux.taux['spr-oui']) },
      { label: 'Taux autres SPR', value: pct(PD.malraux.taux['spr-non']) },
      { label: 'RI max (4 ans)', value: eur(PD.malraux.depensesPluriAnMax * PD.malraux.taux['spr-oui']) },
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
    // URLs vérifiées en D3.9. Pas de fiche grand public dédiée Malraux → BOFiP seul.
    links: [
      { label: 'BOFiP — BOI-IR-RICI-200 (modalités Loi Malraux)',
        url: 'https://bofip.impots.gouv.fr/bofip/8771-PGP.html/identifiant=BOI-IR-RICI-200-30-20240307' },
    ],
    params: [
      { name: 'zone', label: 'Zone du bien', defaultValue: 'spr-non',
        options: [
          { value: 'spr-non', label: `SPR — secteur sauvegardé sans plan urbanisme renforcé (${pct(PD.malraux.taux['spr-non'])})` },
          { value: 'spr-oui', label: `SPR avec PSMV, ou QAD (quartier ancien dégradé) — taux ${pct(PD.malraux.taux['spr-oui'])}` },
        ]
      },
    ],
    secondaryInputs: [
      {
        key: 'malrauxTravauxAnterieurs',
        label: '↳ Cumul travaux Malraux des 3 années précédentes',
        tip: 'Plafond pluri-annuel : 400 000 € de travaux sur 4 ans glissants (CGI art. 199 tervicies II al. 3). Saisir ici le cumul des travaux Malraux retenus en N−1 + N−2 + N−3 (lu sur l\'avis d\'imposition ou les déclarations passées).\n\nLe moteur tronque automatiquement les travaux de l\'année courante à `400 000 − cumul antérieur`. Laisser à 0 si c\'est la première année de Malraux ou si le cumul antérieur est nul.\n\nExemple : 350 000 € déjà investis sur 3 ans → marge résiduelle 50 000 € pour cette année (la 4ᵉ).',
        inSimpleMode: false,
      },
    ],
  },
  // 2.b) IR-PME et apparentés (art. 199 terdecies-0 A et bis/ter, post-LF 2026)
  // Source unique : PARAMS.plafondsDispositifs (cf. tasks/d3.1-irpme-spec.md)
  {
    id: 'irPme', family: 'ir-pme', label: `IR-PME — PME standard (${pct(PD.irPme.taux)})`,
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPme.taux, inputKey: 'irPme',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription au capital d'une PME non cotée (cas général). Réduction ${pct(PD.irPme.taux)} (le « boost 25 % » de 2024-2025 a expiré). Plafond ${eur(PD.irPme.versementMax)} (célibataire) / ${eur(PD.irPme.versementMaxCouple)} (couple). Conservation 5 ans. Art. 199 terdecies-0 A CGI.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — PME standard (souscription directe)',
    meta: [
      { label: 'Taux', value: pct(PD.irPme.taux) },
      { label: 'Plafond annuel', value: `${eur(PD.irPme.versementMax)} (célib) / ${eur(PD.irPme.versementMaxCouple)} (couple)` },
      { label: 'Conservation', value: '5 ans minimum' },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: `Souscription directe au capital d'une PME non cotée (moins de 250 salariés, CA < 50 M€). L'entreprise ne doit pas être en difficulté. Les titres doivent être conservés au minimum 5 ans. Le taux ${pct(PD.irPme.taux)} est le taux de droit commun ; les variantes ESUS/MH/JEI/JEII/JEIR offrent des taux majorés (voir cards dédiées).` },
      { label: 'Calcul',
        text: `RI = montant versé × ${pct(PD.irPme.taux)}, dans la limite du plafond ${eur(PD.irPme.versementMax)} / ${eur(PD.irPme.versementMaxCouple)}. Exemple : 10 000 € → ${eur(10000 * PD.irPme.taux)}. L'excédent de versements au-delà du plafond est reportable sur 4 ans.` },
    ],
    refCGI: 'Art. 199 terdecies-0 A CGI',
    refBofip: 'BOI-IR-RICI-90',
    links: [
      { label: 'service-public.gouv.fr — IR-PME', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37091' },
      { label: 'Légifrance — Art. 199 terdecies-0 A CGI', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213428' },
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html' },
    ],
  },
  {
    id: 'irPmeEsus', family: 'ir-pme', label: `IR-PME — ESUS / SFS (${pct(PD.irPmeEsus.taux)})`,
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPmeEsus.taux, inputKey: 'irPmeEsus',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription au capital d'une Entreprise Solidaire d'Utilité Sociale (ESUS) ou Société Foncière Solidaire (SFS). Réduction ${pct(PD.irPmeEsus.taux)}. Plafond ${eur(PD.irPmeEsus.versementMax)} / ${eur(PD.irPmeEsus.versementMaxCouple)}. Validité versements 28/06/2024 → 30/09/2026 ; au-delà du 1/10/2026 subordonné à validation Commission européenne.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — ESUS / SFS (entreprises solidaires)',
    meta: [
      { label: 'Taux', value: `${pct(PD.irPmeEsus.taux)} (majoré)` },
      { label: 'Plafond annuel', value: `${eur(PD.irPmeEsus.versementMax)} / ${eur(PD.irPmeEsus.versementMaxCouple)}` },
      { label: 'Validité', value: 'Versements 28/06/2024 → 30/09/2026' },
      { label: 'Après 1/10/2026', value: 'Subordonné à validation Commission européenne', status: 'warn' },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
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
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html' },
    ],
  },
  {
    id: 'irPmeMH', family: 'ir-pme', label: `IR-PME — Monuments historiques (${pct(PD.irPmeMH.taux)})`,
    levier: 2, cat: 'niche10', mode: 'versement-direct', taux: PD.irPmeMH.taux, inputKey: 'irPmeMH',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription au capital d'une société foncière de monuments historiques (immeubles protégés, sites, parcs, jardins). Réduction ${pct(PD.irPmeMH.taux)}. Plafond ${eur(PD.irPmeMH.versementMax)} / ${eur(PD.irPmeMH.versementMaxCouple)}. Validité depuis le 28/09/2025.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — Sociétés foncières de monuments historiques',
    meta: [
      { label: 'Taux', value: `${pct(PD.irPmeMH.taux)} (majoré)` },
      { label: 'Plafond annuel', value: `${eur(PD.irPmeMH.versementMax)} / ${eur(PD.irPmeMH.versementMaxCouple)}` },
      { label: 'Validité', value: 'Versements depuis le 28/09/2025' },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
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
    id: 'irPmeJei', family: 'ir-pme', label: `IR-PME — JEI direct (${pct(PD.irPmeJei.taux)})`,
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJei.taux, inputKey: 'irPmeJei',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription directe au capital d'une Jeune Entreprise Innovante (JEI). Réduction ${pct(PD.irPmeJei.taux)}. Plafond ANNUEL ${eur(PD.irPmeJei.versementMax)} / ${eur(PD.irPmeJei.versementMaxCouple)} PARTAGÉ avec FCPI-JEI (cumul des deux ≤ ce plafond). Plafond pluri-annuel : RI cumulée JEI+JEIR ≤ ${eur(PD.irPmeJeiJeirPlafondCumule)} sur 2024-2028. Hors plafond niches ${eur(P.niches.plafond)} (art. 200-0 A exclut 199 terdecies-0 A bis). Conservation 5 ans.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEI direct (Jeune Entreprise Innovante)',
    meta: [
      { label: 'Taux', value: pct(PD.irPmeJei.taux) },
      { label: 'Plafond annuel partagé avec FCPI-JEI', value: `${eur(PD.irPmeJei.versementMax)} / ${eur(PD.irPmeJei.versementMaxCouple)}` },
      { label: 'Plafond pluri-annuel JEI+JEIR', value: `${eur(PD.irPmeJeiJeirPlafondCumule)} de RI cumulée sur 2024-2028` },
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
      // Légifrance Art. 199 terdecies-0 A bis : URL retirée en D3.8 (non vérifiée).
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html' },
    ],
  },
  {
    id: 'fcpiJei', family: 'ir-pme', label: `IR-PME — FCPI investi en JEI (${pct(PD.fcpiJei.taux)})`,
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.fcpiJei.taux, inputKey: 'fcpiJei',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription de parts de FCPI investissant en Jeunes Entreprises Innovantes (au quota prévu par le règlement du fonds). Réduction ${pct(PD.fcpiJei.taux)}. Plafond ANNUEL ${eur(PD.fcpiJei.versementMax)} / ${eur(PD.fcpiJei.versementMaxCouple)} PARTAGÉ avec IR-PME JEI direct. Hors plafond niches ${eur(P.niches.plafond)}. Validité depuis le 21/02/2026 — les FCPI classiques ne sont plus éligibles.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — FCPI investi en JEI',
    meta: [
      { label: 'Taux', value: pct(PD.fcpiJei.taux) },
      { label: 'Plafond annuel partagé avec JEI direct', value: `${eur(PD.fcpiJei.versementMax)} / ${eur(PD.fcpiJei.versementMaxCouple)}` },
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
      // Légifrance Art. 199 terdecies-0 A bis : URL retirée en D3.8 (non vérifiée).
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html' },
    ],
  },
  {
    id: 'irPmeJeii', family: 'ir-pme', label: `IR-PME — JEII (${pct(PD.irPmeJeii.taux)})`,
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJeii.taux, inputKey: 'irPmeJeii',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription au capital d'une Jeune Entreprise Innovante à Impact (JEII). Réduction ${pct(PD.irPmeJeii.taux)}. Plafond ${eur(PD.irPmeJeii.versementMax)} / ${eur(PD.irPmeJeii.versementMaxCouple)}. Validité 21/02/2026 → 31/12/2028 (LF 2026, nouvel article).`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEII (Jeune Entreprise Innovante à Impact)',
    meta: [
      { label: 'Taux', value: pct(PD.irPmeJeii.taux) },
      { label: 'Plafond annuel', value: `${eur(PD.irPmeJeii.versementMax)} / ${eur(PD.irPmeJeii.versementMaxCouple)}` },
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
      { label: 'BOFiP — Actualité création de la JEII par LF 2026 art. 23',
        url: 'https://bofip.impots.gouv.fr/bofip/15020-PGP.html/ACTU-2026-00067' },
    ],
  },
  {
    id: 'irPmeJeir', family: 'ir-pme', label: `IR-PME — JEIR (${pct(PD.irPmeJeir.taux)})`,
    levier: 2, cat: 'hors', mode: 'versement-direct', taux: PD.irPmeJeir.taux, inputKey: 'irPmeJeir',
    nature: 'versement-annuel', budget: 'cash',
    info: `Souscription au capital d'une Jeune Entreprise Innovante de Rupture (JEIR). Réduction ${pct(PD.irPmeJeir.taux)}. Plafond ${eur(PD.irPmeJeir.versementMax)} / ${eur(PD.irPmeJeir.versementMaxCouple)}. Plafond pluri-annuel : RI cumulée JEI+JEIR ≤ ${eur(PD.irPmeJeiJeirPlafondCumule)} sur 2024-2028. Hors plafond niches. Validité 1/1/2024 → 31/12/2028. Art. 199 terdecies-0 A ter CGI.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'IR-PME — JEIR (Jeune Entreprise Innovante de Rupture)',
    meta: [
      { label: 'Taux', value: `${pct(PD.irPmeJeir.taux)} (le plus élevé du dispositif IR-PME)` },
      { label: 'Plafond annuel', value: `${eur(PD.irPmeJeir.versementMax)} / ${eur(PD.irPmeJeir.versementMaxCouple)}` },
      { label: 'Plafond pluri-annuel JEI+JEIR', value: `${eur(PD.irPmeJeiJeirPlafondCumule)} de RI cumulée sur 2024-2028` },
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
      // Légifrance Art. 199 terdecies-0 A ter : URL retirée en D3.8 (non vérifiée).
      { label: 'BOFiP — BOI-IR-RICI-90', url: 'https://bofip.impots.gouv.fr/bofip/4374-PGP.html' },
    ],
  },
  // 2.c) Autres dispositifs niche 10 000 €
  {
    // Sémantique D3.3 : input.fipCorse = MONTANT SOUSCRIT (cash), RI = invest × 30 %
    // plafonné à versCouple(PD.fipCorse) = 12 000 € (single) / 24 000 € (couple).
    // Aligné sur le pattern IR-PME / SOFICA.
    id: 'fipCorse', family: 'fipCorse', label: `FIP Corse / Outre-mer (${pct(PD.fipCorse.taux)})`,
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'fipCorse',
    taux: PD.fipCorse.taux,    // constante éditoriale, sert à avantageEstime
    nature: 'versement-annuel', budget: 'cash',
    info: `Saisir le MONTANT DE LA SOUSCRIPTION DE L'ANNÉE en parts de FIP Corse ou Outre-mer. Cash sortant. Réduction ${pct(PD.fipCorse.taux)}. Plafond versement : ${eur(PD.fipCorse.versementMax)} (célib) / ${eur(PD.fipCorse.versementMaxCouple)} (couple). Blocage 5 ans minimum.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'FIP Corse / Outre-mer',
    meta: [
      { label: 'Taux', value: `${pct(PD.fipCorse.taux)} (majoré vs FIP classique métropolitain supprimé)` },
      { label: 'Plafond versements', value: `${eur(PD.fipCorse.versementMax)} (célib) / ${eur(PD.fipCorse.versementMaxCouple)} (couple)` },
      { label: 'RI max célib', value: eur(PD.fipCorse.versementMax * PD.fipCorse.taux) },
      { label: 'Blocage', value: '5 ans minimum (généralement 7-10 ans en pratique)' },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: `Souscription en parts de FIP (Fonds d'Investissement de Proximité) investis en PME de Corse ou des DROM. Le FIP classique métropolitain a été supprimé au 1/1/2026. Seuls les FIP Corse et Outre-mer conservent le taux majoré ${pct(PD.fipCorse.taux)}.` },
      { label: 'Calcul',
        text: `RI = versement × ${pct(PD.fipCorse.taux)}, plafonné à ${eur(PD.fipCorse.versementMax)} (cél) / ${eur(PD.fipCorse.versementMaxCouple)} (couple). Exemple : 10 000 € → ${eur(10000 * PD.fipCorse.taux)}.` },
    ],
    refCGI: 'Art. 199 terdecies-0 A bis CGI',
    refBofip: 'BOI-IR-RICI-110',
    // URLs vérifiées en D3.9. Pas de fiche service-public.fr dédiée → BOFiP seul.
    links: [
      { label: 'BOFiP — BOI-IR-RICI-110 (souscriptions de parts de FIP)',
        url: 'https://bofip.impots.gouv.fr/bofip/5320-PGP.html/identifiant=BOI-IR-RICI-110-20140509' },
    ],
  },
  {
    // Sémantique D3.3 : input.gfi = MONTANT SOUSCRIT (cash), RI = invest × taux zone
    // plafonné à versCouple(PD.gfi) = 50 000 € / 100 000 €.
    // PR-C : taux variable selon input.gfiZone (standard 18 % / éligible 25 %).
    // Zone éligible = massifs déficitaires en gestion durable (CGI 199 decies H I 2°).
    id: 'gfi', family: 'gfi', label: `GFI Forestier (${pct(PD.gfi.taux.standard)} – ${pct(PD.gfi.taux.eligible)})`,
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'gfi',
    paramKey: 'gfiZone',
    nature: 'versement-annuel', budget: 'cash',
    info: 'Saisir le MONTANT DE LA SOUSCRIPTION DE L\'ANNÉE en parts de Groupement Forestier d\'Investissement. Cash sortant.\n\nTaux selon la zone du massif forestier :\n· Standard\n· Zone éligible (massifs déficitaires en gestion durable certifiée — PEFC / FSC — voir doc du GFI sur l\'éligibilité de chaque parcelle)\n\nPlafond annuel de souscription : voir colonne meta.\n\nAvantages annexes : exonération partielle d\'IFI (75 % de la valeur des bois) + abattement 75 % sur droits de mutation à titre gratuit (succession/donation), sous conditions d\'engagement de gestion durable.',
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'GFI — Groupement Forestier d\'Investissement',
    meta: [
      { label: 'Taux', value: `${pct(PD.gfi.taux.standard)} (jusqu'à ${pct(PD.gfi.taux.eligible)} en zone éligible)` },
      { label: 'Plafond versements', value: `${eur(PD.gfi.versementMax)} (célib) / ${eur(PD.gfi.versementMaxCouple)} (couple)` },
      { label: 'RI max célib', value: `${eur(PD.gfi.versementMax * PD.gfi.taux.standard)} (${eur(PD.gfi.versementMax * PD.gfi.taux.eligible)} en zone majorée)` },
      { label: 'Durée de détention', value: '5 ans 1/2 minimum' },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Souscription au capital de Groupements Forestiers d\'Investissement (GFI), véhicules collectifs qui financent l\'achat et la gestion durable de forêts françaises. Diversification patrimoniale + soutien à la filière bois + avantage fiscal. Liquidité limitée : marché secondaire restreint, sortie organisée par le gérant en général sur 8-12 ans.' },
      { label: 'Calcul',
        text: `RI = montant souscrit × taux (${pct(PD.gfi.taux.standard)} standard / ${pct(PD.gfi.taux.eligible)} zone éligible), dans la limite du plafond ${eur(PD.gfi.versementMaxCouple)} (couple). Exemple : 30 000 € souscrits à ${pct(PD.gfi.taux.standard)} → ${eur(30000 * PD.gfi.taux.standard)} de RI.` },
      { label: 'Avantages annexes',
        text: 'Au-delà de la RI : exonération partielle d\'IFI (75 % de la valeur des bois et forêts) et abattement de 75 % sur les droits de mutation à titre gratuit (succession/donation), sous conditions d\'engagement de gestion durable.' },
    ],
    refCGI: 'Art. 199 decies H CGI',
    refBofip: 'BOI-IR-RICI-60-20-20 (DEFI Forêt)',
    // URLs vérifiées en D3.9. Pas de fiche grand public dédiée GFI → BOFiP seul.
    links: [
      { label: 'BOFiP — BOI-IR-RICI-60-20-20 (DEFI Forêt incl. GFI)',
        url: 'https://bofip.impots.gouv.fr/bofip/5537-PGP.html/identifiant=BOI-IR-RICI-60-20-20-20230614' },
    ],
    params: [
      { name: 'zone', label: 'Zone du massif', defaultValue: 'standard',
        options: [
          { value: 'standard', label: `Standard — taux ${pct(PD.gfi.taux.standard)}` },
          { value: 'eligible', label: `Zone éligible — taux ${pct(PD.gfi.taux.eligible)} (massif déficitaire en gestion durable)` },
        ]
      },
    ],
  },
  {
    // D3.6 : ajout family 'locAvantages' pour génération form-row depuis catalogue.
    // Sémantique = DÉPENSES (loyers décotés) + select palier (loc1/loc2/loc3).
    // Moteur calcule RI = min(dépenses, 10 000 €) × taux palier.
    id: 'locAvantages', family: 'locAvantages', label: 'Loc\'Avantages',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'locAvantagesDepenses',
    paramKey: 'locAvantagesPalier',
    nature: 'depenses-annuelles', budget: 'exclu',
    info: `Saisir les dépenses de l'année liées à une location à loyer modéré (ex-Cosse).\n\nRéduction = min(dépenses, ${eur(PD.locAvantages.depensesMax)}) × taux du palier :\n· Loc 1 (décote 15 %) : 15 % sans intermédiation / 20 % avec\n· Loc 2 (décote 30 %) : 35 % sans / 40 % avec\n· Loc 3 (décote 45 %) : 65 % (intermédiation obligatoire, déjà incluse)\n\nIntermédiation locative = gestion confiée à une association agréée (type Solibail) qui garantit loyer et charges. En contrepartie, taux fiscal majoré de +5 points.`,
    sectionGroup: 'immobilier-locatif',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Loc\'Avantages — location à loyer modéré',
    meta: [
      { label: 'Taux loyer intermédiaire (Loc 1)', value: `${pct(PD.locAvantages.taux.loc1)} (sans intermédiation) · ${pct(PD.locAvantages.taux['loc1-im'])} (avec)` },
      { label: 'Taux loyer social (Loc 2)', value: `${pct(PD.locAvantages.taux.loc2)} (sans intermédiation) · ${pct(PD.locAvantages.taux['loc2-im'])} (avec)` },
      { label: 'Taux loyer très social (Loc 3)', value: `${pct(PD.locAvantages.taux.loc3)} (avec intermédiation uniquement)` },
      { label: 'Plafond d\'assiette', value: `${eur(PD.locAvantages.depensesMax)} de loyers retenus par an` },
      { label: 'Dans le plafond niches ?', value: `Oui — ${eur(P.niches.plafond)}`, status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Applicable sur l\'ensemble du territoire, sans obligation de travaux. En échange d\'un loyer modéré (locataire sous plafonds de ressources), le propriétaire obtient une réduction d\'impôt calculée sur les loyers perçus. Plus le loyer est bas, plus le taux est élevé. L\'intermédiation locative (via une association agréée) augmente le taux.' },
      { label: 'Calcul',
        text: 'RI = min(loyers, 10 000 €) × taux applicable. Exemple Loc 2 sans intermédiation : 8 000 € × 35 % = 2 800 € de RI. Avec intermédiation locative : 8 000 € × 40 % = 3 200 € (+ 400 € grâce à l\'IML).' },
    ],
    refCGI: 'Art. 199 tricies CGI',
    refBofip: '—',
    // URLs vérifiées en D3.9. Fiche grand public Anah + actualité service-public.
    links: [
      { label: 'service-public.gouv.fr — Logement conventionné Anah (taux 15/35/65 %)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F34115' },
      { label: 'service-public.gouv.fr — Loc\'Avantages (jusqu\'au 31/12/2027)',
        url: 'https://www.service-public.gouv.fr/particuliers/actualites/A18077' },
    ],
    params: [
      { name: 'palier', label: 'Palier de décote × intermédiation', defaultValue: 'loc1',
        // Intermédiation locative (IML) = gestion confiée à une association
        // agréée type Solibail. Augmente le taux loc1/loc2 de +5 pts.
        // Loc 3 n'existe qu'avec intermédiation (déjà intégrée au taux 65 %).
        options: [
          { value: 'loc1',    label: `Loc 1 — décote 15 %, sans intermédiation (RI ${pct(PD.locAvantages.taux.loc1)})` },
          { value: 'loc1-im', label: `Loc 1 — décote 15 %, avec intermédiation (RI ${pct(PD.locAvantages.taux['loc1-im'])})` },
          { value: 'loc2',    label: `Loc 2 — décote 30 %, sans intermédiation (RI ${pct(PD.locAvantages.taux.loc2)})` },
          { value: 'loc2-im', label: `Loc 2 — décote 30 %, avec intermédiation (RI ${pct(PD.locAvantages.taux['loc2-im'])})` },
          { value: 'loc3',    label: `Loc 3 — IML décote 45 % (RI ${pct(PD.locAvantages.taux.loc3)}, intermédiation obligatoire)` },
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
    // SOFICA retiré du mode simple (PR-J) — fond dans le champ « Autres RI » (fourre-tout mobilier).
    info: `Saisir le MONTANT DE LA SOUSCRIPTION DE L'ANNÉE en parts de SOFICA (financement cinéma/audiovisuel). Cash sortant. Choisir ensuite le taux selon le scénario de la SOFICA. Versement plafonné à min(${eur(PD.sofica.versementMax)}, ${pct(PD.sofica.plafondAssiettePctRng)} du RNG). Niche majorée ${eur(P.niches.plafondMajore)}. Conservation 5 ans.`,
    sectionGroup: 'investissement-financier',
    tagType: 'Réduction d\'impôt',
    titleLong: 'SOFICA — financement du cinéma et de l\'audiovisuel',
    meta: [
      { label: 'Taux de base', value: pct(PD.sofica.taux['30']) },
      { label: 'Taux majoré (engagement production)', value: pct(PD.sofica.taux['36']) },
      { label: 'Taux maximal (production indép. + langues régionales)', value: pct(PD.sofica.taux['48']) },
      { label: 'Plafond de souscription', value: `min(${eur(PD.sofica.versementMax)}, ${pct(PD.sofica.plafondAssiettePctRng)} du RNG)` },
      { label: 'Durée de blocage', value: '5 ans minimum' },
      { label: 'Dans le plafond niches ?', value: `Oui — plafond majoré ${eur(P.niches.plafondMajore)}`, status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: `Les SOFICA sont des fonds agréés par le CNC et l'AMF qui financent la production de films et séries. Parts bloquées 5 ans, risque de perte en capital. Souscriptions agréées annuellement, en volume limité. Mécanisme de niche à plafond majoré ${eur(P.niches.plafondMajore)} (vs ${eur(P.niches.plafond)} pour les niches standard).` },
      { label: 'Calcul',
        text: `RI = souscription × taux (${pct(PD.sofica.taux['30'])}/${pct(PD.sofica.taux['36'])}/${pct(PD.sofica.taux['48'])}), plafonné à min(${eur(PD.sofica.versementMax)}, ${pct(PD.sofica.plafondAssiettePctRng)} du RNG). Exemple à ${pct(PD.sofica.taux['48'])} : ${eur(PD.sofica.versementMax)} × ${pct(PD.sofica.taux['48'])} = ${eur(PD.sofica.versementMax * PD.sofica.taux['48'])} de RI.` },
    ],
    refCGI: 'Art. 199 unvicies CGI',
    refBofip: 'BOI-IR-RICI-180',
    // URLs vérifiées en D3.9 (cf. tasks/audit-liens-officiels.md).
    // SOFICA n'a pas de fiche service-public.fr en langage humain → BOFiP + Culture.
    links: [
      { label: 'BOFiP — BOI-IR-RICI-180 (réduction d\'impôt SOFICA)',
        url: 'https://bofip.impots.gouv.fr/bofip/13198-PGP.html/identifiant=BOI-IR-RICI-180-20240229' },
      { label: 'Ministère de la Culture — SOFICA',
        url: 'https://www.culture.gouv.fr/Divers/Outils-de-financement-des-entreprises-culturelles/Cinema-et-audiovisuel/reduction-d-impot-sur-le-revenu-pour-les-investissements-au-capital-de-societes-de-financement-de-l-industrie-cinematographique-et-de-l-audiovisuel' },
    ],
    params: [
      { name: 'taux', label: 'Taux SOFICA', defaultValue: '36',
        options: [
          { value: '30', label: `${pct(PD.sofica.taux['30'])} — standard`,                                 taux: PD.sofica.taux['30'] },
          { value: '36', label: `${pct(PD.sofica.taux['36'])} — engagement production (10 %)`,             taux: PD.sofica.taux['36'] },
          { value: '48', label: `${pct(PD.sofica.taux['48'])} — production indép. + langues régionales`,   taux: PD.sofica.taux['48'] },
        ]
      },
    ],
  },
  // ── DENORMANDIE — art. 199 novovicies CGI (volet ancien rénové) ─────
  // Investissement locatif dans communes Cœur de Ville / ORT avec travaux
  // ≥ 25 % du coût total. RI = invest retenu × taux total / durée. Étalée
  // linéairement sur la durée d'engagement.
  // Prolongé jusqu'au 31/12/2027 par LF 2026 art. 47 (loi 2026-103).
  {
    id: 'denormandie', family: 'denormandie', label: 'Denormandie (ancien rénové)',
    levier: 2, cat: 'niche10', mode: 'versement-direct', inputKey: 'denormandie',
    paramKey: 'denormandieDuree',
    nature: 'investissement-immobilier', budget: 'exclu',
    // Denormandie retiré du mode simple (PR-J) — fond dans le champ « Immobilier » (fourre-tout immo).
    info: `Saisir le montant total investi dans l'année (prix d'acquisition + travaux). Les travaux doivent représenter au moins 25 % du coût total. La réduction d'impôt s'étale sur la durée d'engagement de location choisie.\n\nRI annuelle = min(invest, ${eur(PD.denormandie.versementMax)}) × taux total / durée :\n· 6 ans : 12 % au total → 2 %/an\n· 9 ans : 18 % au total → 2 %/an\n· 12 ans : 21 % au total → 1,75 %/an\n\nPrix au m² plafonné à 5 500 €. Le bien doit se trouver dans une commune labellisée « Action Cœur de Ville » ou couverte par une Opération de Revitalisation du Territoire (ORT). Dans le plafond niches 10 000 €.\n\nAcquisitions éligibles jusqu'au 31/12/2027.`,
    sectionGroup: 'immobilier-locatif',
    tagType: 'Réduction d\'impôt',
    titleLong: 'Denormandie — investissement locatif dans l\'ancien rénové',
    meta: [
      { label: 'Taux total — 6 ans / 9 ans / 12 ans',           value: '12 % · 18 % · 21 %' },
      { label: 'Plafond annuel d\'investissement',              value: `${eur(PD.denormandie.versementMax)}` },
      { label: 'Plafond au m²',                                 value: `${eur(PD.denormandie.prixMaxM2)}/m²` },
      { label: 'Travaux minimum (% coût total)',                value: '25 %' },
      { label: 'Communes éligibles',                            value: 'Action Cœur de Ville + ORT' },
      { label: 'Acquisitions éligibles',                        value: 'Jusqu\'au 31/12/2027 (LF 2026 art. 47)' },
      { label: 'Dans le plafond niches ?',                      value: 'Oui — 10 000 €', status: 'good' },
    ],
    descBlocks: [
      { label: 'Ce que c\'est',
        text: 'Le dispositif Denormandie est le volet « ancien rénové » de l\'article 199 novovicies CGI (anciennement Pinel volet ancien). Il vise à inciter à la rénovation d\'immeubles dégradés dans les villes moyennes labellisées « Action Cœur de Ville » ou couvertes par une Opération de Revitalisation du Territoire (ORT). Contrairement à Pinel (fermé fin 2024), Denormandie est prolongé jusqu\'au 31/12/2027 par la LF 2026.' },
      { label: 'Calcul',
        text: 'Le contribuable s\'engage à louer nu sa propriété 6, 9 ou 12 ans à un loyer plafonné et à des locataires sous condition de ressources. La réduction d\'impôt est calculée sur l\'investissement total (prix + travaux) plafonné à 300 000 €/an, dans la limite de 5 500 €/m². Étalement linéaire sur la durée : ex 200 000 € × 18 % = 36 000 € de RI répartis sur 9 ans → 4 000 €/an.' },
    ],
    refCGI: 'Art. 199 novovicies CGI (volet ancien)',
    refBofip: 'BOI-IR-RICI-365',
    links: [
      { label: 'service-public.gouv.fr — F35011 (Denormandie, fiche pratique)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F35011' },
      { label: 'BOFiP — BOI-IR-RICI-365 (Denormandie)',
        url: 'https://bofip.impots.gouv.fr/bofip/11941-PGP.html/identifiant=BOI-IR-RICI-365' },
      { label: 'Légifrance — art. 199 novovicies CGI',
        url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049313862' },
      { label: 'Liste des communes Action Cœur de Ville (ANCT)',
        url: 'https://agence-cohesion-territoires.gouv.fr/action-coeur-de-ville-42' },
    ],
    params: [
      { name: 'duree', label: 'Durée d\'engagement de location', defaultValue: '9',
        options: [
          { value: '6',  label: '6 ans — taux total 12 %',  taux: 0.12 },
          { value: '9',  label: '9 ans — taux total 18 %',  taux: 0.18 },
          { value: '12', label: '12 ans — taux total 21 %', taux: 0.21 },
        ]
      },
    ],
  },
  {
    // D3.12 : ajout family pour génération form-row dans le Simulateur.
    // Dans le Simulateur l'utilisateur saisit directement la RI (montant
    // de la réduction attestée). Le mode taux-libre + slider rendement
    // n'intervient QUE dans l'onglet Préconisations (calcul prospectif).
    id: 'girardinPD', family: 'girardinPD', label: 'Girardin Industriel — Plein Droit',
    levier: 2, cat: 'niche18', mode: 'taux-libre', inputKey: 'girardinPD',
    nichePlafLabel: 'quote-part plafond : × 44 %',
    nature: 'versement-annuel', budget: 'cash',
    rendementDefaut: 1.10, rendementMin: 1.00, rendementMax: 1.30, rendementStep: 0.005,
    info: `Saisir le montant investi dans le programme Girardin Plein Droit (versement à l'opérateur, à fonds perdus). Mécanique one-shot : la réduction d'impôt majorée est encaissée l'année suivante. Quote-part de ${pct(P.niches.girardinPdQuotePart)} dans le plafond niches majoré 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 108-115 %. Ajuster avec les boutons ± 0,5 % ou la saisie directe.`,
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
    // URL vérifiée en D3.9 — page impots.gouv.fr professionnel (commune PD + AG).
    links: [
      { label: 'impots.gouv.fr — Girardin industriel (investissements productifs neufs Outre-mer)',
        url: 'https://www.impots.gouv.fr/professionnel/reduction-ou-deduction-au-titre-des-investissements-productifs-neufs' },
    ],
  },
  {
    // D3.12 : idem girardinPD (cf. commentaire ci-dessus).
    id: 'girardinAG', family: 'girardinAG', label: 'Girardin Industriel — Avec Agrément',
    levier: 2, cat: 'niche18', mode: 'taux-libre', inputKey: 'girardinAG',
    nichePlafLabel: 'quote-part plafond : × 34 %',
    nature: 'versement-annuel', budget: 'cash',
    rendementDefaut: 1.08, rendementMin: 1.00, rendementMax: 1.25, rendementStep: 0.005,
    info: `Saisir le montant investi dans le programme Girardin avec Agrément (versement à l'opérateur, à fonds perdus). Identique au Plein Droit mais réservé aux programmes > 250 k€ ayant reçu l'agrément ministériel. Quote-part de ${pct(P.niches.girardinAgQuotePart)} dans le plafond niches majoré 18 k€.\n\nRendement = ratio RI / investissement. Marché 2026 typiquement 105-112 %.`,
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
    // URL vérifiée en D3.9 — page impots.gouv.fr (commune PD + AG).
    links: [
      { label: 'impots.gouv.fr — Girardin industriel (investissements productifs neufs Outre-mer)',
        url: 'https://www.impots.gouv.fr/professionnel/reduction-ou-deduction-au-titre-des-investissements-productifs-neufs' },
    ],
  },

  // ─── LEVIER 3 — CRÉDITS D'IMPÔT (REMBOURSÉS SI IR = 0) ──
  {
    // D3.11 : visible en mode simple (très utilisé par les ménages).
    id: 'emploiDom', family: 'emploiDom', label: 'Emploi à domicile (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'emploiDomicile',
    nature: 'depenses-annuelles', budget: 'cash',
    inSimpleMode: true,
    nichePlafLabel: 'crédit 50 % · plaf. dép. 12 000 € (+ majo enfants, max 15 000 €)',
    info: `Saisir le montant total des dépenses (salaires + charges sociales) pour l'emploi d'un salarié à domicile : ménage, jardinage, soutien scolaire, aide à la personne, garde d'enfants à domicile, etc.\n\nCrédit d'impôt de ${pct(P.plafonds.emploiDomTaux)}, remboursable même si l'impôt est nul. Plafond de base ${eur(P.plafonds.emploiDomMax)}, majoré de ${eur(P.plafonds.emploiDomMajEnfant)} par enfant à charge (${eur(P.plafonds.emploiDomMajGardeAlt)} en garde alternée), sans dépasser ${eur(P.plafonds.emploiDomMaxMajore)}.\n\nDans le plafond niches 10 000 €.`,
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
    links: [
      { label: 'service-public.gouv.fr — Emploi à domicile (crédit 50 %)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12' },
    ],
  },
  {
    // D3.11 : visible en mode simple.
    id: 'gardeEnf', family: 'gardeEnf', label: 'Garde enfants < 6 ans (50%)',
    levier: 3, cat: 'niche10', mode: 'versement-direct', inputKey: 'gardeEnfants',
    nature: 'depenses-annuelles', budget: 'cash',
    inSimpleMode: true,
    nichePlafLabel: 'crédit 50 % · plaf. dép. 3 500 €/enfant',
    info: `Saisir le montant total des dépenses pour la garde des enfants de moins de 6 ans au 1er janvier, hors du domicile : crèche, halte-garderie, assistante maternelle agréée, garderie périscolaire.\n\nCrédit d'impôt de ${pct(P.plafonds.gardeEnfantsTaux)}, remboursable. Plafond ${eur(P.plafonds.gardeEnfantsMax)} de dépenses par enfant (${eur(P.plafonds.gardeEnfantsMax / 2)} en garde alternée).\n\nDans le plafond niches 10 000 €.`,
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
    links: [
      { label: 'service-public.gouv.fr — Garde d\'enfants hors domicile (crédit 50 %)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F8' },
    ],
  },
  {
    // D3.11 : conserve .advanced (rare). Cases 7AC/7AE/7AG.
    id: 'syndic', family: 'syndic', label: 'Cotisations syndicales (66%)',
    levier: 3, cat: 'hors', mode: 'versement-direct', inputKey: 'cotSyndicales',
    nature: 'versement-annuel', budget: 'cash',
    nichePlafLabel: 'crédit 66 % · plafond 1 % des revenus',
    info: `Saisir le montant de la cotisation annuelle versée à un syndicat (CGT, CFDT, FO, CFTC, Sud…) par un salarié, retraité ou demandeur d'emploi. Crédit d'impôt de ${pct(P.plafonds.cotSyndicalesTaux)}, remboursable si supérieur à l'impôt dû. Plafond automatique : ${pct(P.plafonds.cotSyndicalesPlafondPct)} des salaires + allocations chômage + pensions. Hors plafond niches.`,
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
    // URL vérifiée en D3.9.
    links: [
      { label: 'service-public.gouv.fr — Cotisations syndicales (crédit 66 %)',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1' },
    ],
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
  const lev = opts.leverId
    ? LEVIERS_CATALOGUE.find(l => l.id === opts.leverId)
    : null;
  // Pré-remplir paramValue selon le type de paramètre du levier choisi.
  // Cohérent avec ce que fait updateLever('leverId', …) — indispensable quand
  // une row est créée directement avec un leverId (ex : bouton DEV ou
  // initialisation programmatique). Sans cette init, le moteur recevait null
  // et tombait sur tauxDefaut côté calculator → écart silencieux entre l'UI
  // (select affiche option 1 via fallback) et le calcul réel.
  let paramValue = null;
  if (lev) {
    if (lev.mode === 'taux-libre') {
      paramValue = lev.rendementDefaut;
    } else if (lev.params && lev.params[0]) {
      paramValue = lev.params[0].defaultValue || lev.params[0].options[0].value;
    }
  }
  preconisations.push({
    id: nextRowId++,
    leverId: opts.leverId || '',
    montant: 0,
    paramValue,
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
    // Reset paramValue selon le type de paramètre — DOIT rester cohérent avec
    // l'init de addLever() (cf. PR-S/U) :
    //   - mode 'taux-libre' (Girardin PD/AG) → rendement par défaut (1.10 etc.)
    //   - autres modes avec params → defaultValue prioritaire, sinon 1ère option
    //   - aucun paramètre → null
    if (lev && lev.mode === 'taux-libre') {
      p.paramValue = lev.rendementDefaut;
    } else if (lev && lev.params && lev.params[0]) {
      p.paramValue = lev.params[0].defaultValue || lev.params[0].options[0].value;
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
    else if (lev.mode === 'taux-libre') {
      // Rendement saisi directement par l'utilisateur (Girardin PD/AG).
      // p.paramValue est un nombre décimal (1.10 = 110 %).
      const rendement = parseFloat(p.paramValue) || lev.rendementDefaut;
      out[lev.inputKey] = (out[lev.inputKey] || 0) + p.montant * rendement;
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

  // 0. Plafond déficit foncier (10 700 €/an, art. 156-I-3° CGI) partagé entre
  //    déficit foncier classique et amortissement Jeanbrun. Si l'utilisateur
  //    saisit un cumul > 10 700 €, le surplus est ignoré dans le calcul
  //    (en pratique reportable 10 ans sur revenus fonciers, non simulé V1).
  if ((det.deficitFoncierSurplus || 0) > 0.5) {
    warnings.push({
      type: 'deficit-foncier-cap',
      level: 'warning',
      section: 'L1',
      message: `Plafond déficit foncier dépassé de ${fmtEur(det.deficitFoncierSurplus)} €. Le déficit imputable sur le revenu global est plafonné à ${fmtEur(P.plafonds.deficitFoncierMax)} €/an, partagé entre le déficit foncier classique et l'amortissement Jeanbrun (art. 156-I-3° CGI). Le surplus est ignoré dans le calcul courant (reportable 10 ans sur revenus fonciers, non simulé).`,
      amount: det.deficitFoncierSurplus,
    });
  }

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
          message: `${fmtEur(surplus)} € au-delà du plafond fiscal ${labels[disp] || disp}, ignorés dans le calcul.`,
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
      message: `${fmtEur(det.nichesPerdues)} € de réductions perdues (panier niches 10k+8k saturé).`,
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
      message: `${fmtEur(excedent)} € de réductions L2 au-delà de l'impôt restant.`,
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

  // data-source-catalogue : marqueur dev pour le bouton « Highlight catalogue »
  // de la dev-toolbar. Permet de voir d'un coup d'œil tout ce qui vient du
  // catalogue unique (vs ce qui reste hardcodé dans le HTML).
  return `<div class="levier-card" data-source-catalogue="${escHtml(lev.id)}">
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
    // Trois options de catalogue qui affinent le rendu :
    //   - `inSimpleMode: true` → la form-row reste visible en mode simple
    //     (pas de classe .advanced). Par défaut, .advanced (mode complet uniquement).
    //   - `nichePlafLabel: '...'` → sous-texte affiché dans la niche-cell
    //     (ex « crédit 50 % · plaf. dép. 12 000 € »).
    //   - `showNicheCell: false` → masque la cellule de droite (utile pour
    //     les leviers qui ne sont ni dans le plafond niches ni hors plafond
    //     mais dans une autre logique, ex Jeanbrun = déduction foncière).
    const cls = lev.inSimpleMode ? 'form-row' : 'form-row advanced';
    // Cellule de droite — 3 cas :
    //   - `customRightCell: 'per-cap'` → cellule custom (plafond PER dynamique
    //     mis à jour côté JS via `set('per-cap-live', ...)`).
    //   - `showNicheCell: false` → pas de cellule (Jeanbrun, déduction foncière).
    //   - défaut → niche-cell standard (marqueur de plafond niches + sous-texte
    //     nichePlafLabel optionnel).
    let rightCell;
    if (lev.customRightCell === 'per-cap') {
      rightCell = `<div class="per-cap-note">Plafond déductible : <strong id="per-cap-live">—</strong></div>`;
    } else if (lev.showNicheCell === false) {
      rightCell = '';
    } else {
      rightCell = `<div class="niche-cell">
        <span class="niche-marker ${nicheClass}">${escHtml(nicheLabel)}</span>
        ${lev.nichePlafLabel ? `<span class="niche-plaf">${escHtml(lev.nichePlafLabel)}</span>` : ''}
      </div>`;
    }
    // data-source-catalogue : marqueur dev pour le bouton « Highlight catalogue ».
    const mainRow = `<div class="${cls}" data-source-catalogue="${escHtml(lev.id)}">
      <label for="${escHtml(lev.inputKey)}">
        ${escHtml(lev.titleLong || lev.label)}
        <i class="tip" data-tip="${escHtml(lev.info || '')}">i</i>
      </label>
      ${inputCell}
      ${rightCell}
    </div>`;
    // Form-rows secondaires (sous-champs) — utilisé par PER (perPlafondManuel)
    // et EHPAD (ehpadNbPers). Chacune est une form-row à part avec son propre
    // input. Le préfixe ↳ dans le label marque la subordination.
    const secondaries = (lev.secondaryInputs || []).map(sub => {
      const subCls = sub.inSimpleMode ? 'form-row' : 'form-row advanced';
      const subTip = sub.tip
        ? `<i class="tip tip-down" data-tip="${escHtml(sub.tip)}">i</i>` : '';
      const subStep = sub.step ? ` step="${escHtml(String(sub.step))}"` : '';
      return `<div class="${subCls}" data-source-catalogue="${escHtml(lev.id)}.${escHtml(sub.key)}">
        <label for="${escHtml(sub.key)}">${escHtml(sub.label)} ${subTip}</label>
        <input type="number" id="${escHtml(sub.key)}" value="${escHtml(String(sub.defaultValue ?? 0))}" min="${escHtml(String(sub.min ?? 0))}"${subStep}>
      </div>`;
    }).join('');
    return mainRow + secondaries;
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
