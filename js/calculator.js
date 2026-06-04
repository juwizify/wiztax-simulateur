/**
 * MOTEUR DE CALCUL IR — Projection sur Revenus 2026 (Déclaration 2027)
 * Mécanique invariante d'une année sur l'autre. Seuls les paramètres dans
 * params.js sont susceptibles d'évoluer avec la LF 2027 (réindexation inflation).
 */

/**
 * Calcule l'impôt selon le barème progressif pour un revenu par part donné.
 * @param {number} qf - Quotient familial (revenu / nombre de parts)
 * @returns {number} Impôt par part
 */
function calcBaremePart(qf) {
  let impot = 0;
  let borneInf = 0;
  for (const tranche of PARAMS.bareme) {
    if (qf <= borneInf) break;
    const base = Math.min(qf, tranche.limite) - borneInf;
    impot += base * tranche.taux;
    borneInf = tranche.limite;
  }
  return impot;
}

/**
 * Calcule le nombre de parts fiscales.
 */
function calcParts(situation, nbEnfants, gardeAlternee, parentIsole, demiPartSupp) {
  // Parts de base
  let partsBase = (situation === 'marie-pacse') ? 2 : 1;
  // Veuf avec enfants = 2 parts de base
  if (situation === 'veuf' && nbEnfants > 0) partsBase = 2;

  // Parts supplémentaires enfants
  let partsEnfants = 0;
  if (nbEnfants <= 2) {
    partsEnfants = nbEnfants * 0.5;
  } else {
    partsEnfants = 1 + (nbEnfants - 2); // 0.5+0.5 pour les 2 premiers, puis 1 par enfant
  }

  // Garde alternée
  let partsAlternee = 0;
  if (gardeAlternee <= 2) {
    partsAlternee = gardeAlternee * 0.25;
  } else {
    partsAlternee = 0.5 + (gardeAlternee - 2) * 0.5;
  }

  // Parent isolé
  const partsPI = parentIsole ? 0.5 : 0;

  // Demi-part supplémentaire (cases L, N, P, F, W, S, G de la 2042)
  // Plafond standard 1 807 € appliqué via la logique QF en aval (étape 4).
  // Cas particuliers L (plafond réduit) et G (déplafonné) non simulés.
  const partsDemi = demiPartSupp ? 0.5 : 0;

  return {
    total: partsBase + partsEnfants + partsAlternee + partsPI + partsDemi,
    base: partsBase,
  };
}

/**
 * Calcul complet de l'IR.
 * @param {Object} input - Toutes les données saisies
 * @returns {Object} Détail complet du calcul
 */
function calculerIR(input) {
  const P = PARAMS;
  const det = {}; // détail du calcul (pour l'onglet calcul détaillé)
  const isCouple = input.situation === 'marie-pacse';

  // ============================================================
  // ÉTAPE 1 : REVENU BRUT GLOBAL
  // ============================================================

  // Salaires (1AJ/1BJ) + allocations chômage/préretraite (1AP/1BP)
  // + surplus d'heures sup au-dessus du plafond d'exonération (1GH/1HH > 7 500 €).
  // Abattement 10% commun par déclarant (mêmes plancher 509 € et plafond 14 555 €).
  // Si frais réels (1AK/1BK) > 0 pour un déclarant : ils remplacent son abattement 10%.
  const hsExoPlafond = P.plafonds.heuresSupExoPlafond;
  const hsImpos1 = Math.max(0, (input.heuresSupExo1 || 0) - hsExoPlafond);
  const hsImpos2 = Math.max(0, (input.heuresSupExo2 || 0) - hsExoPlafond);
  const totalSal1 = input.sal1 + (input.allocChomage1 || 0) + hsImpos1;
  const totalSal2 = input.sal2 + (input.allocChomage2 || 0) + hsImpos2;
  const abatSal1 = (input.fraisReels1 || 0) > 0
    ? input.fraisReels1
    : (totalSal1 > 0
        ? Math.max(P.abat.sal.min, Math.min(totalSal1 * P.abat.sal.taux, P.abat.sal.max))
        : 0);
  const abatSal2 = (input.fraisReels2 || 0) > 0
    ? input.fraisReels2
    : (totalSal2 > 0
        ? Math.max(P.abat.sal.min, Math.min(totalSal2 * P.abat.sal.taux, P.abat.sal.max))
        : 0);
  det.salaireNet = (totalSal1 - abatSal1) + (totalSal2 - abatSal2);

  // Pensions retraite (1AS/1BS) + pensions d'invalidité (1AZ/1BZ)
  // + pensions alimentaires perçues (1AO/1BO).
  // Même traitement : abattement 10 % commun par bénéficiaire (plancher 454 €),
  // plafond foyer 4 439 €.
  const totalPen1 = input.pen1 + (input.pensInvalidite1 || 0) + (input.pensAlimRecue1 || 0);
  const totalPen2 = input.pen2 + (input.pensInvalidite2 || 0) + (input.pensAlimRecue2 || 0);
  const abatPen1 = totalPen1 > 0
    ? Math.max(P.abat.pen.min, totalPen1 * P.abat.pen.taux)
    : 0;
  const abatPen2 = totalPen2 > 0
    ? Math.max(P.abat.pen.min, totalPen2 * P.abat.pen.taux)
    : 0;
  const abatPenTotal = Math.min(P.abat.pen.maxFoyer, abatPen1 + abatPen2);
  det.pensionNet = (totalPen1 + totalPen2) - abatPenTotal;

  // BNC micro
  const abatBNC1 = input.bncMicro1 > 0
    ? Math.max(P.abat.bncMicro.min, input.bncMicro1 * P.abat.bncMicro.taux)
    : 0;
  const abatBNC2 = input.bncMicro2 > 0
    ? Math.max(P.abat.bncMicro.min, input.bncMicro2 * P.abat.bncMicro.taux)
    : 0;
  det.bncMicroNet = (input.bncMicro1 - abatBNC1) + (input.bncMicro2 - abatBNC2);

  // BNC réel
  det.bncReel = input.bncReel1 + input.bncReel2;

  // Foncier
  det.microFoncierNet = input.microFoncier * (1 - P.abat.microFoncier.taux);

  // Dispositif Jeanbrun (LF 2026) — amortissement déductible des revenus fonciers
  // selon catégorie de loyer. Le plafond annuel borne le montant retenu.
  // L'utilisateur saisit le foncier réel AVANT cet amortissement.
  const jeanbrunCat = input.jeanbrunCategorie || 'intermediaire';
  const jeanbrunPlaf = jeanbrunCat === 'tres-social' ? P.plafonds.jeanbrunPlafondTresSoc
                     : jeanbrunCat === 'social'      ? P.plafonds.jeanbrunPlafondSocial
                     :                                  P.plafonds.jeanbrunPlafondInter;
  det.jeanbrunAmort = Math.min(input.jeanbrunAmort || 0, jeanbrunPlaf);

  // Foncier réel après amortissement Jeanbrun, puis plafonnement du déficit (4BC) :
  // imputation sur revenu global plafonnée à 10 700 €/an.
  // Le surplus serait reportable 10 ans (non simulé). Si bénéfice (>= 0), pas de plafonnement.
  const foncierApresJeanbrun = input.foncierReel - det.jeanbrunAmort;
  det.foncierReel = foncierApresJeanbrun >= 0
    ? foncierApresJeanbrun
    : Math.max(foncierApresJeanbrun, -P.plafonds.deficitFoncierMax);

  // Meublé
  det.meubleClasseNet = input.meubleClasse * (1 - P.abat.meubleClasse.taux);
  det.meubleNonClasseNet = input.meubleNonClasse * (1 - P.abat.meubleNonClasse.taux);
  det.autresMeublesNet = (input.autresMeubles || 0) * (1 - P.abat.autresMeubles.taux);

  // Mobilier selon option
  const isPFU = input.optionPFU === 'pfu';
  det.dividendesBareme = isPFU ? 0 : input.dividendes * (1 - P.abat.dividendes);
  // Intérêts (2TR) : pas d'abattement au barème, contrairement aux dividendes
  det.interetsBareme = isPFU ? 0 : (input.interets || 0);
  det.pvBareme = isPFU ? 0 : input.pv;

  // Autres
  det.autresRevenus = input.autresRevenus;

  det.revenuBrutGlobal = det.salaireNet + det.pensionNet + det.bncMicroNet + det.bncReel
    + det.microFoncierNet + det.foncierReel
    + det.meubleClasseNet + det.meubleNonClasseNet + det.autresMeublesNet
    + det.dividendesBareme + det.interetsBareme + det.pvBareme
    + det.autresRevenus;

  // ============================================================
  // ÉTAPE 2 : REVENU NET IMPOSABLE
  // ============================================================

  // PER — plafond = 10 % des revenus pro de CHAQUE déclarant, plancher 4 710 €
  // individuel, max 37 680 €. Les plafonds individuels s'additionnent (mutualisation
  // conjugale considérée par défaut, comme la déclaration en ligne).
  // Art. 163 quatervicies CGI — assiette = revenus d'activité pro :
  // salaires + chômage + heures sup exonérées + BNC micro + BNC réel.
  // On utilise les revenus N comme proxy des revenus N-1 (approximation raisonnable).
  const revenuPro1 = input.sal1
    + (input.allocChomage1 || 0)
    + (input.heuresSupExo1 || 0)
    + input.bncMicro1 + input.bncReel1;
  const revenuPro2 = input.sal2
    + (input.allocChomage2 || 0)
    + (input.heuresSupExo2 || 0)
    + input.bncMicro2 + input.bncReel2;
  const capForRevenu = r => Math.max(
    P.plafonds.perPlancher,
    Math.min(r * P.plafonds.perTaux, P.plafonds.perMaxSalarie)
  );
  const perCapAuto = capForRevenu(revenuPro1)
    + (isCouple ? capForRevenu(revenuPro2) : 0);

  // Plafond manuel (cases 6PS/6PT) : si l'utilisateur saisit > 0, on l'utilise
  // au lieu du calcul auto (utile quand il a des reports de plafonds non utilisés
  // des 3 dernières années, non modélisés ici).
  const perCapManuel = input.perPlafondManuel || 0;
  det.perCap = perCapManuel > 0 ? perCapManuel : perCapAuto;
  det.per = Math.min(input.per, det.perCap);

  // Pensions alimentaires — plafond (art. 156-II CGI)
  // Si nbBeneficiairesPA > 0 : cap à nbBeneficiairesPA × 6 674 € (enfants majeurs)
  // Si nbBeneficiairesPA = 0 : ex-conjoint / ascendant — pas de cap légal fixe,
  //   mais on plafonne au revenu brut global pour éviter un RNI négatif irréaliste
  const pensionCap = input.nbBeneficiairesPA > 0
    ? input.nbBeneficiairesPA * P.plafonds.pensionAlimEnfantMax
    : det.revenuBrutGlobal;   // fallback : impossible de déduire plus que son revenu
  det.pensionsAlim    = Math.min(input.pensionsAlim, pensionCap);
  det.pensionAlimCap  = pensionCap;
  det.csgDeductible = input.csgDeductible;
  det.autresCharges = input.autresCharges;

  det.revenuNetImposable = Math.max(0,
    det.revenuBrutGlobal - det.per - det.pensionsAlim - det.csgDeductible - det.autresCharges
  );

  // ============================================================
  // ÉTAPE 3 : QUOTIENT FAMILIAL ET BARÈME
  // ============================================================
  const parts = calcParts(input.situation, input.nbEnfants, input.gardeAlternee, input.parentIsole, input.demiPartSupp);
  det.parts = parts.total;
  det.partsBase = parts.base;

  det.quotientFamilial = parts.total > 0 ? det.revenuNetImposable / parts.total : 0;
  det.impotParPart = calcBaremePart(det.quotientFamilial);
  det.impotBrut = Math.round(det.impotParPart * parts.total);

  // ============================================================
  // ÉTAPE 4 : PLAFONNEMENT DU QUOTIENT FAMILIAL
  // ============================================================
  det.qfBase = parts.base > 0 ? det.revenuNetImposable / parts.base : 0;
  det.impotParPartBase = calcBaremePart(det.qfBase);
  det.impotBrutBase = Math.round(det.impotParPartBase * parts.base);

  det.avantageQF = det.impotBrutBase - det.impotBrut;
  det.demiPartsSupp = (parts.total - parts.base) * 2;

  // Demi-part supplémentaire (cases L/N/P/F/W/S/G de la 2042) : plafond spécifique
  // selon le cas. L = 1 079 €, G = déplafonné, autres = standard 1 807 €.
  // On l'isole du décompte des autres demi-parts pour appliquer son plafond propre.
  let plafondDemiPartSupp = 0;
  if (input.demiPartSupp) {
    if (input.demiPartCas === 'L')      plafondDemiPartSupp = P.qf.plafondDemiPartL;
    else if (input.demiPartCas === 'G') plafondDemiPartSupp = Infinity;
    else                                plafondDemiPartSupp = P.qf.plafondDemiPart;
  }
  const demiPartsStandard = det.demiPartsSupp - (input.demiPartSupp ? 1 : 0);

  if (input.parentIsole && input.nbEnfants > 0) {
    det.plafondQF = P.qf.parentIsole1er + Math.max(0, demiPartsStandard - 2) * P.qf.plafondDemiPart + plafondDemiPartSupp;
  } else {
    det.plafondQF = demiPartsStandard * P.qf.plafondDemiPart + plafondDemiPartSupp;
  }

  det.supplementQF = Math.max(0, det.avantageQF - det.plafondQF);
  det.impotApresQF = det.impotBrut + det.supplementQF;

  // ============================================================
  // ÉTAPE 5 : DÉCOTE
  // ============================================================
  const seuilDecote = isCouple ? P.decote.seuilCouple : P.decote.seuilCelibataire;
  const plafondDecote = isCouple ? P.decote.plafondCouple : P.decote.plafondCelibataire;

  det.seuilDecote = seuilDecote;
  det.decote = det.impotApresQF < seuilDecote
    ? Math.max(0, plafondDecote - det.impotApresQF * P.decote.taux)
    : 0;
  det.impotApresDecote = Math.max(0, det.impotApresQF - det.decote);

  // ============================================================
  // ÉTAPE 6 : IR MOBILIER (PFU)
  // ============================================================
  det.irMobilier = isPFU ? (input.dividendes + (input.interets || 0) + input.pv) * P.ps.pfuIr : 0;

  // ============================================================
  // ÉTAPE 6bis : IR sur produits assurance-vie > 8 ans (2CH/2VV/2WW)
  // Abattement annuel commun aux deux taux (7,5 % et 12,8 %), imputé
  // EN PRIORITÉ sur le taux le plus élevé (12,8 %) puis sur le 7,5 %
  // — règle BOI-RPPM-RCM-20-10-30 favorable au contribuable.
  // L'abattement ne s'applique qu'à l'IR ; les PS sont dues sur le brut.
  // Imposition séparée du barème (n'entre pas dans le RNI ni le QF).
  //
  // PFNL prélevé à la source par la banque (régime par défaut depuis 2018) :
  //   av75  → 7,5 % du BRUT (sans abattement)
  //   av128 → 12,8 % du BRUT (sans abattement)
  // L'abattement étant appliqué a posteriori en déclaration, le différentiel
  // (PFNL prélevé − IR définitif) constitue un trop-perçu remboursé au
  // contribuable. Imputé sans plafond niches.
  // ============================================================
  const av75  = input.avProduits75  || 0;
  const av128 = input.avProduits128 || 0;
  const avAbat = isCouple ? P.abat.avCouple : P.abat.avSingle;
  // Imputation prioritaire sur 12,8 % puis solde sur 7,5 %
  const abat128 = Math.min(av128, avAbat);
  const abat75  = Math.min(av75,  avAbat - abat128);
  det.avAbattement = abat128 + abat75;
  det.avImposable  = (av128 - abat128) + (av75 - abat75);
  det.irAV = (av128 - abat128) * 0.128 + (av75 - abat75) * 0.075;
  // PFNL AV prélevé à la source — crédit d'impôt
  det.pfnlAV = av75 * 0.075 + av128 * 0.128;
  const avProduits = av75 + av128;

  // ============================================================
  // ÉTAPE 7 : PRÉLÈVEMENTS SOCIAUX
  //
  // Mode de recouvrement (source : service-public.gouv.fr / BOFiP) :
  //   - Prélevés à la source par l'assureur ET imputés automatiquement
  //     par le simulateur officiel via l'abattement (cas spécifique
  //     AV > 8 ans), donc EXCLUS de l'impôt à payer :
  //       • produits assurance-vie > 8 ans (av75, av128)
  //   - Recouvrés PAR VOIE DE RÔLE (avis IR), à payer en sus de l'IR :
  //       • dividendes (le PFNL bancaire IR est imputé via 2CK, mais la
  //         part PS, elle, reste due côté avis IR)
  //       • intérêts (idem dividendes)
  //       • plus-values mobilières
  //       • revenus fonciers (nu, LMNP, micro-foncier)
  // ============================================================
  // PS recouvrés via avis (intégrés à l'impôt à payer)
  det.psDividendes = input.dividendes * P.ps.mobilier;
  det.psInterets   = (input.interets || 0) * P.ps.mobilier;
  det.psPV         = input.pv * P.ps.mobilier;
  const revenusFonciersNets = det.microFoncierNet + det.foncierReel + det.meubleClasseNet + det.meubleNonClasseNet + det.autresMeublesNet;
  det.psFoncier    = Math.max(0, revenusFonciersNets) * P.ps.foncier;
  det.psRole       = det.psDividendes + det.psInterets + det.psPV + det.psFoncier;
  // PS prélevés à la source ET libératoires (info uniquement, exclus impôt dû)
  det.psAV     = avProduits * P.ps.av;
  det.psSource = det.psAV;
  // Conservé pour rétro-compat / affichage de la charge fiscale totale
  det.psMobilier = det.psDividendes + det.psInterets + det.psPV;
  det.totalPS    = det.psSource + det.psRole;

  // ============================================================
  // ÉTAPE 8 : RÉDUCTIONS D'IMPÔT
  // ============================================================
  // Dons — HORS niche, base plafonnée à 20 % du RNI (art. 200 CGI)
  // L'excédent au-delà de 20 % RNI est reportable 5 ans (non simulé).
  //
  // Mécanisme officiel (BOI-IR-RICI-250-30-10) :
  // - 7UD (organismes d'aide) : 75 % jusqu'à 2 000 € (LF 2026)
  // - L'excédent 7UD au-delà de 2 000 € BASCULE sur le régime 7UF (66 %)
  // - 7UF (intérêt général) : 66 %
  // - Le total des deux est plafonné à 20 % RNI (priorité au 75 % puis 66 %)
  const dons7UD = input.dons7UD || 0;
  const dons7UF = input.dons || 0;
  const plafondRNI = det.revenuNetImposable * P.plafonds.donsPlafondRNI;

  // Étape 1 : assiette 7UD à 75 % (max 2 000 €), surplus reporté sur 7UF
  const base7UD75   = Math.min(dons7UD, P.plafonds.dons75Plafond);
  const surplus7UD  = Math.max(0, dons7UD - P.plafonds.dons75Plafond);

  // Étape 2 : application du plafond 20 % RNI, en priorité sur le 75 %
  const base7UD75Cap = Math.min(base7UD75, plafondRNI);
  const base66Cap    = Math.min(surplus7UD + dons7UF, Math.max(0, plafondRNI - base7UD75Cap));

  det.donsBase = base7UD75Cap + base66Cap;
  det.redDons  = base7UD75Cap * 0.75 + base66Cap * 0.66;

  // Frais de scolarité enfants (7EA/7EC/7EF) — réduction forfaitaire HORS niches
  det.fraisScol = (input.fraisScolCollege || 0) * P.plafonds.fraisScolCollege
                + (input.fraisScolLycee   || 0) * P.plafonds.fraisScolLycee
                + (input.fraisScolSup     || 0) * P.plafonds.fraisScolSup;

  // Frais d'hébergement EHPAD ascendants (7CD/7CE/7CF) — HORS niches
  // Réduction 25 % sur dépenses plafonnées à 10 000 €/personne hébergée.
  const ehpadNbPers = Math.max(1, input.ehpadNbPers || 1);
  const ehpadBase = Math.min(input.ehpadFrais || 0, P.plafonds.ehpadPlafondParPers * ehpadNbPers);
  det.redEhpad = ehpadBase * P.plafonds.ehpadTaux;

  // Loi Malraux (7NX/7NY) — HORS plafond niches (art. 199 tervicies CGI)
  // L'utilisateur saisit le montant de la réduction (taux 22 % ou 30 % selon zone, déjà calculé).
  // Caps individuels par dispositif (art. 199 ... CGI spécifiques).
  // Règle : l'input utilisateur reste libre (il peut saisir 200 000 € de
  // SOFICA s'il les a vraiment versés, fidélité à sa réalité patrimoniale),
  // mais le moteur tronque la RI retenue au plafond fiscal applicable.
  // Le surplus est exposé dans det.capExcedents pour affichage UI.
  //
  // Aujourd'hui l'input est la RI déjà calculée sans préciser le scénario,
  // donc on prend le cap au TAUX MAXIMUM du dispositif (= scénario le plus
  // avantageux). Phase 3 (refonte préco) basculera vers input versement +
  // scénario explicite, ce qui permettra des caps plus précis.
  const PD = P.plafondsDispositifs;
  const versCouple = (d) => isCouple && d.versementMaxCouple !== undefined
    ? d.versementMaxCouple : d.versementMax;
  const tauxMax = (d) => Math.max(...Object.values(d.taux));
  // SOFICA : double plafond — art. 199 unvicies CGI (BOI-IR-RICI-180-20 §140).
  // Versement effectif = min(18 000 €, 25 % du revenu net global).
  // Le wiztax utilise det.revenuNetImposable comme proxy du RNG (mêmes composantes
  // après charges déductibles).
  const versSoficaEffectif = Math.min(
    PD.sofica.versementMax,
    det.revenuNetImposable * 0.25
  );
  const capRiMax = {
    sofica:       versSoficaEffectif * tauxMax(PD.sofica),                         // min(18k, 25%RNG) × 48 %
    fcpi:         versCouple(PD.fcpi) * PD.fcpi.taux,                              // 12k/24k × 18 %
    fcpiJei:      versCouple(PD.fcpiJei) * PD.fcpiJei.taux,                        // 12k/24k × 30 %
    fipCorse:     versCouple(PD.fipCorse) * PD.fipCorse.taux,                      // 12k/24k × 30 %
    irPme:        versCouple(PD.irPme) * PD.irPme.taux,                            // 50k/100k × 25 %
    gfi:          versCouple(PD.gfi) * PD.gfi.taux,                                // 50k/100k × 18 %
    malraux:      PD.malraux.depensesParAnMax * tauxMax(PD.malraux),               // 100 000 × 30 % = 30 000
    locAvantages: PD.locAvantages.depensesMax * tauxMax(PD.locAvantages),          // 10 000 × 65 % = 6 500
  };

  // Malraux — 2 modes acceptés :
  //   * NOUVEAU (Phase 2.5) : input.malrauxTravaux + input.malrauxZone
  //     → RI = min(travaux, 100 000 €/an) × taux zone (22 % SPR sans PSMV / 30 % SPR-PSMV ou QAD).
  //   * LEGACY : input.malraux directement (RI saisie), conservé pour rétro-compat.
  if ((input.malrauxTravaux || 0) > 0) {
    const zone = input.malrauxZone || PD.malraux.tauxDefaut;
    const tauxZone = PD.malraux.taux[zone] || PD.malraux.taux[PD.malraux.tauxDefaut];
    const travauxRetenus = Math.min(input.malrauxTravaux, PD.malraux.depensesParAnMax);
    det.redMalraux = travauxRetenus * tauxZone;
  } else {
    det.redMalraux = Math.min(input.malraux || 0, capRiMax.malraux);
  }

  // Réductions dans le plafond niches
  det.redPinel       = input.pinel;             // Pinel : retiré du périmètre (fermé fin 2024). Pas de cap V1.
  det.redGirardinPD  = input.girardinPD;        // Girardin : pas de cap individuel, limité par panier majoré.
  det.redGirardinAG  = input.girardinAG;
  det.redFCPI        = Math.min(input.fcpi || 0,         capRiMax.fcpi);
  det.redFcpiJei     = Math.min(input.fcpiJei || 0,      capRiMax.fcpiJei);
  det.redFipCorse    = Math.min(input.fipCorse || 0,     capRiMax.fipCorse);
  det.redGfi         = Math.min(input.gfi || 0,          capRiMax.gfi);
  det.redIrPme       = Math.min(input.irPme || 0,        capRiMax.irPme);
  // Loc'Avantages — 2 modes acceptés :
  //   * NOUVEAU (Phase 2.4) : input.locAvantagesDepenses + input.locAvantagesPalier
  //     → moteur calcule la RI = min(dépenses, 10 000 €) × taux palier (15/35/65 %).
  //   * LEGACY : input.locAvantages directement (RI saisie), conservé pour rétro-compat
  //     des tests et de toute UI/intégration existante.
  if ((input.locAvantagesDepenses || 0) > 0) {
    const palier = input.locAvantagesPalier || PD.locAvantages.tauxDefaut;
    const tauxPalier = PD.locAvantages.taux[palier]
      || PD.locAvantages.taux[PD.locAvantages.tauxDefaut];
    const depensesRetenues = Math.min(input.locAvantagesDepenses, PD.locAvantages.depensesMax);
    det.redLocAvantages = depensesRetenues * tauxPalier;
  } else {
    det.redLocAvantages = Math.min(input.locAvantages || 0, capRiMax.locAvantages);
  }
  det.redSofica      = Math.min(input.sofica || 0,       capRiMax.sofica);
  det.redAutres      = input.autresReductions;  // catch-all, pas de cap

  // Surplus écrasés par les caps individuels (pour affichage UI)
  det.capExcedents = {
    sofica:       Math.max(0, (input.sofica || 0)       - det.redSofica),
    fcpi:         Math.max(0, (input.fcpi || 0)         - det.redFCPI),
    fcpiJei:      Math.max(0, (input.fcpiJei || 0)      - det.redFcpiJei),
    fipCorse:     Math.max(0, (input.fipCorse || 0)     - det.redFipCorse),
    irPme:        Math.max(0, (input.irPme || 0)        - det.redIrPme),
    gfi:          Math.max(0, (input.gfi || 0)          - det.redGfi),
    malraux:      Math.max(0, (input.malraux || 0)      - det.redMalraux),
    locAvantages: Math.max(0, (input.locAvantages || 0) - det.redLocAvantages),
  };

  det.totalReductions = det.redDons + det.redPinel + det.redGirardinPD + det.redGirardinAG
    + det.redFCPI + det.redFcpiJei + det.redFipCorse + det.redGfi + det.redIrPme + det.redLocAvantages
    + det.redSofica + det.redAutres;

  // ============================================================
  // ÉTAPE 9 : CRÉDITS D'IMPÔT
  // ============================================================
  // Emploi à domicile (art. 199 sexdecies-I-2° CGI) : plafond de base 12 000 €
  // majoré par enfant à charge (+1 500 €) et par enfant en garde alternée (+750 €),
  // capé à 15 000 €. Majorations seniors/invalidité non modélisées.
  const majoEnfantsDom = P.plafonds.emploiDomMajEnfant * input.nbEnfants
                      + P.plafonds.emploiDomMajGardeAlt * input.gardeAlternee;
  const plafondEmploiDom = Math.min(
    P.plafonds.emploiDomMax + majoEnfantsDom,
    P.plafonds.emploiDomMaxMajore
  );
  det.credDomicile = Math.min(input.emploiDomicile, plafondEmploiDom) * P.plafonds.emploiDomTaux;
  // Garde enfants : plafond de 3 500 € de dépenses PAR enfant < 6 ans
  // On utilise nbEnfants comme approximation du nombre d'enfants éligibles
  const gardeMax = P.plafonds.gardeEnfantsMax * Math.max(1, input.nbEnfants);
  det.credGarde    = Math.min(input.gardeEnfants, gardeMax) * P.plafonds.gardeEnfantsTaux;
  det.credAutres   = input.autresCredits;

  det.totalCredits = det.credDomicile + det.credGarde + det.credAutres;

  // Cotisations syndicales (7AC/7AE/7AG) — HORS plafond niches
  // Crédit 66 % plafonné à 1 % des revenus d'activité (sal + chômage + pensions).
  const baseSyndicMax = (
    input.sal1 + input.sal2
    + (input.allocChomage1 || 0) + (input.allocChomage2 || 0)
    + input.pen1 + input.pen2
    + (input.pensInvalidite1 || 0) + (input.pensInvalidite2 || 0)
  ) * P.plafonds.cotSyndicalesPlafondPct;
  det.cotSyndicalesBase = Math.min(input.cotSyndicales || 0, baseSyndicMax);
  det.credSyndic = det.cotSyndicalesBase * P.plafonds.cotSyndicalesTaux;

  // ============================================================
  // ÉTAPE 10 : PLAFONNEMENT DES NICHES FISCALES — 2 POCHES
  //
  // Art. 200-0 A CGI :
  //   • POCHE 1 (10 000 €)   — accessible à TOUS les dispositifs cat. niche10
  //                            ET cat. niche18.
  //   • POCHE 2 (+8 000 €)   — RÉSERVÉE aux dispositifs cat. niche18 (Girardin
  //                            avec quote-part 44/34 % + SOFICA).
  //
  // Algo : on remplit d'abord la poche 1 (avec niche10 prioritaire par ordre
  // d'apparition, puis le solde par niche18). Le surplus niche10 est PERDU.
  // Le surplus niche18 peut s'écouler dans la poche 2 (max 8 000 €). Le
  // surplus restant au-delà de la poche 2 est PERDU.
  //
  // Les valeurs manipulées ici sont les "valeurs panier" (= RI brute × quote-part
  // pour les niche18, RI brute pour les niche10).
  // ============================================================

  // RI panier par catégorie
  const ri10Panier = det.redPinel
    + det.redFCPI + det.redFcpiJei + det.redFipCorse + det.redGfi + det.redIrPme
    + det.redLocAvantages + det.redAutres
    + det.credDomicile + det.credGarde + det.credAutres;
  const ri18Panier = det.redGirardinPD * P.niches.girardinPdQuotePart
    + det.redGirardinAG * P.niches.girardinAgQuotePart
    + det.redSofica;

  // Algo 2 poches
  const poche1_10  = Math.min(ri10Panier, P.niches.plafond);
  const restePoche1 = P.niches.plafond - poche1_10;
  const poche1_18  = Math.min(ri18Panier, restePoche1);
  const surplus_10 = ri10Panier - poche1_10;
  const surplus_18 = ri18Panier - poche1_18;
  const poche2Cap  = P.niches.plafondMajore - P.niches.plafond;  // 8 000 €
  const poche2_18  = Math.min(surplus_18, poche2Cap);
  const perdu_18   = surplus_18 - poche2_18;

  // Champs exposés (UI / debug / rétro-compat)
  det.poche1Utilisee   = poche1_10 + poche1_18;
  det.poche2Utilisee   = poche2_18;
  det.ri10Panier       = ri10Panier;     // demandé niche10 (Pinel/FCPI/...)
  det.ri18Panier       = ri18Panier;     // demandé niche18 (Girardin × qp + SOFICA)
  det.nichesUtilisees  = ri10Panier + ri18Panier;                 // total demandé
  det.nichesRetenues   = det.poche1Utilisee + det.poche2Utilisee;
  det.nichesPerdues    = surplus_10 + perdu_18;
  // Rétro-compat : "plafondNiches" reste le plafond global applicable (10 ou 18)
  // utilisé par les libellés UI. depassementNiches reflète le total perdu.
  det.plafondNiches    = ri18Panier > 0 ? P.niches.plafondMajore : P.niches.plafond;
  det.depassementNiches = det.nichesPerdues;

  // Facteurs proportionnels de rétention par catégorie.
  // Si une catégorie est en surplus, on tronque proportionnellement tous ses
  // dispositifs (règle classique du plafonnement proportionnel).
  const facteur10 = ri10Panier > 0 ? poche1_10 / ri10Panier : 1;
  const facteur18 = ri18Panier > 0 ? (poche1_18 + poche2_18) / ri18Panier : 1;
  det.facteurNiche10 = facteur10;
  det.facteurNiche18 = facteur18;

  // ============================================================
  // ÉTAPE 11 : IMPÔT NET FINAL (hors CEHR)
  // ============================================================
  // Application des réductions avec plafonnement niches par catégorie.
  // Hors panier niches (toujours retenus) : dons, fraisScol, EHPAD, Malraux.
  const redNiche10Retenue = (det.redPinel
    + det.redFCPI + det.redFcpiJei + det.redFipCorse + det.redGfi + det.redIrPme
    + det.redLocAvantages + det.redAutres) * facteur10;
  const redNiche18Retenue = (det.redGirardinPD + det.redGirardinAG + det.redSofica) * facteur18;

  det.reductionsAppliquees = Math.min(
    det.impotApresDecote + det.irMobilier,
    det.redDons + det.fraisScol + det.redEhpad + det.redMalraux
    + redNiche10Retenue + redNiche18Retenue
  );

  // Crédits : tous cat. niche10 (emploi domicile, garde, autres crédits).
  // Cot. syndicales : crédit hors plafond niches, géré séparément (det.credSyndic).
  det.creditsAppliques = (det.credDomicile + det.credGarde + det.credAutres) * facteur10;

  // PFNL (acompte 2CK déjà versé à la source par la banque) : crédit d'impôt
  // sans plafond niches, imputé sur l'IR final. Si supérieur à l'impôt dû,
  // l'excédent est remboursé (impôt net peut devenir négatif).
  // - input.pfnlVerse : acompte 2CK saisi par l'utilisateur (div/intérêts)
  // - det.pfnlAV     : PFNL automatiquement prélevé sur les produits AV > 8 ans
  det.pfnlVerse = input.pfnlVerse || 0;

  det.impotNet = Math.max(0,
    det.impotApresDecote + det.irMobilier + det.irAV - det.reductionsAppliquees
  ) - det.creditsAppliques - det.credSyndic + det.psRole - det.pfnlVerse - det.pfnlAV;

  // Revenu de référence — sert d'assiette à la CEHR (art. 223 sexies CGI) et
  // au calcul du taux moyen affiché.
  // Règles BOI-IR-DECLA-20-10 :
  //   - Salaires et pensions retenus NETS d'abattement 10 % (ou frais réels).
  //   - BNC / BIC / fonciers : montants nets effectivement imposables.
  //   - Revenus mobiliers / AV : retenus en brut (les abattements ne s'imputent
  //     que sur l'IR, pas sur le RFR).
  //   - Heures sup exonérées entrent intégralement dans le RFR (part exonérée
  //     comprise), alors que seul le surplus > 7 500 € est dans le revenu
  //     imposable — donc la part exonérée doit être réajoutée ici.
  //   - Charges déductibles (PER, pensions alim versées, CSG déductible,
  //     autres) : NE RÉDUISENT PAS le RFR. Elles ne baissent que le revenu
  //     imposable. Le simulateur officiel impots.gouv calcule le RFR comme
  //     si ces déductions n'avaient pas eu lieu.
  // ⚠ Doit être calculé AVANT la CEHR (étape 12) qui l'utilise comme assiette.
  const hsExoRFR1 = Math.min(input.heuresSupExo1 || 0, P.plafonds.heuresSupExoPlafond);
  const hsExoRFR2 = Math.min(input.heuresSupExo2 || 0, P.plafonds.heuresSupExoPlafond);
  det.revenuReference = Math.max(0,
    det.salaireNet + hsExoRFR1 + hsExoRFR2
    + det.pensionNet
    + input.bncMicro1 + input.bncMicro2
    + input.bncReel1 + input.bncReel2
    + input.microFoncier + det.foncierReel
    + input.meubleClasse + input.meubleNonClasse + (input.autresMeubles || 0)
    + input.dividendes + (input.interets || 0) + input.pv
    + (input.avProduits75 || 0) + (input.avProduits128 || 0)
    + input.autresRevenus
  );

  det.tauxMoyen = det.revenuReference > 0
    ? det.impotNet / det.revenuReference
    : 0;

  // ============================================================
  // ÉTAPE 12 : CONTRIBUTION EXCEPTIONNELLE SUR LES HAUTS REVENUS (CEHR)
  // Art. 223 sexies CGI — assiette : revenu fiscal de référence (proxy : revenuReference)
  // ============================================================
  const cehrSeuil1 = isCouple ? P.cehr.seuilCouple1 : P.cehr.seuilCelibataire1;
  const cehrSeuil2 = isCouple ? P.cehr.seuilCouple2 : P.cehr.seuilCelibataire2;
  det.cehr = 0;
  if (det.revenuReference > cehrSeuil1) {
    det.cehr += (Math.min(det.revenuReference, cehrSeuil2) - cehrSeuil1) * P.cehr.taux1;
  }
  if (det.revenuReference > cehrSeuil2) {
    det.cehr += (det.revenuReference - cehrSeuil2) * P.cehr.taux2;
  }
  det.impotNet += det.cehr;

  // TMI : quand le plafonnement QF est actif (supplementQF > 0), le taux marginal
  // est déterminé par le QF de base (sans les demi-parts supplémentaires), car
  // d(impôt_final)/d(RNI) = d(impôt_base)/d(RNI) = taux_barème(QF_base)
  const qfTMI = det.supplementQF > 0 ? det.qfBase : det.quotientFamilial;
  let prevLimite = 0;
  det.tmi = 0;
  for (const t of PARAMS.bareme) {
    if (qfTMI > prevLimite) det.tmi = t.taux;
    prevLimite = t.limite;
    if (qfTMI <= t.limite) break;
  }

  return det;
}
