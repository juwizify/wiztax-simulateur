/**
 * APP.JS — Interface utilisateur du simulateur IR
 * Gestion des onglets, lecture des inputs, affichage des résultats
 */

// ─────────────────────────────────────────────
// NAVIGATION ONGLETS
// ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ─────────────────────────────────────────────
// LECTURE DES INPUTS
// ─────────────────────────────────────────────
function v(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  if (el.tagName === 'SELECT') return el.value;
  if (el.type === 'checkbox') return el.checked;
  return parseFloat(el.value.replace(/\s/g, '').replace(',', '.')) || 0;
}

function getInputs() {
  return {
    // Situation
    situation:    document.getElementById('situation').value,
    nbEnfants:    v('nbEnfants'),
    gardeAlternee: v('gardeAlternee'),
    parentIsole:  document.getElementById('parentIsole').value === 'oui',
    demiPartSupp: document.getElementById('demiPartSupp').checked,
    demiPartCas:  document.getElementById('demiPartCas').value,

    // Revenus
    sal1:         v('sal1'),
    sal2:         v('sal2'),
    allocChomage1: v('allocChomage1'),
    allocChomage2: v('allocChomage2'),
    fraisReels1:  v('fraisReels1'),
    fraisReels2:  v('fraisReels2'),
    heuresSupExo1: v('heuresSupExo1'),
    heuresSupExo2: v('heuresSupExo2'),
    pen1:         v('pen1'),
    pen2:         v('pen2'),
    pensInvalidite1: v('pensInvalidite1'),
    pensInvalidite2: v('pensInvalidite2'),
    pensAlimRecue1: v('pensAlimRecue1'),
    pensAlimRecue2: v('pensAlimRecue2'),
    bncMicro1:    v('bncMicro1'),
    bncMicro2:    v('bncMicro2'),
    bncReel1:     v('bncReel1'),
    bncReel2:     v('bncReel2'),
    microFoncier: v('microFoncier'),
    foncierReel:  v('foncierReel'),
    meubleClasse: v('meubleClasse'),
    meubleNonClasse: v('meubleNonClasse'),
    autresMeubles: v('autresMeubles'),
    jeanbrunAmort:    v('jeanbrunAmort'),
    jeanbrunCategorie: v('jeanbrunCategorie'),
    dividendes:   v('dividendes'),
    interets:     v('interets'),
    pv:           v('pv'),
    avProduits75:  v('avProduits75'),
    avProduits128: v('avProduits128'),
    pfnlVerse:    v('pfnlVerse'),
    autresRevenus: v('autresRevenus'),
    optionPFU:    document.getElementById('optionPFU').value,

    // Charges
    per:               v('per'),
    perPlafondManuel:  v('perPlafondManuel'),
    pensionsAlim:      v('pensionsAlim'),
    nbBeneficiairesPA: v('nbBeneficiairesPA'),
    csgDeductible:     v('csgDeductible'),
    autresCharges:     v('autresCharges'),

    // Réductions / Crédits
    dons:            v('dons'),
    dons7UD:         v('dons7UD'),
    emploiDomicile:  v('emploiDomicile'),
    gardeEnfants:    v('gardeEnfants'),
    cotSyndicales:   v('cotSyndicales'),
    fraisScolCollege: v('fraisScolCollege'),
    fraisScolLycee:   v('fraisScolLycee'),
    fraisScolSup:     v('fraisScolSup'),
    ehpadFrais:      v('ehpadFrais'),
    ehpadNbPers:     v('ehpadNbPers'),
    pinel:           v('pinel'),
    girardinPD:      v('girardinPD'),
    girardinAG:      v('girardinAG'),
    fcpi:            v('fcpi'),
    fcpiJei:         v('fcpiJei'),
    fipCorse:        v('fipCorse'),
    gfi:             v('gfi'),
    irPme:           v('irPme'),
    malraux:          v('malraux'),  // legacy (RI directe) — UI n'expose plus ce champ
    malrauxTravaux:   v('malrauxTravaux'),
    malrauxZone:      document.getElementById('malrauxZone')?.value || 'spr-non',
    locAvantages:    v('locAvantages'),  // legacy (RI directe) — UI n'expose plus ce champ, conservé pour rétro-compat
    locAvantagesDepenses: v('locAvantagesDepenses'),
    locAvantagesPalier:   document.getElementById('locAvantagesPalier')?.value || 'loc1',
    sofica:          v('sofica'),
    autresReductions: v('autresReductions'),
    autresCredits:   v('autresCredits'),
  };
}

// ─────────────────────────────────────────────
// FORMATAGE
// ─────────────────────────────────────────────
function fmt(n, decimals = 0) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n) + ' €';
}

function fmtPct(n) {
  return (n * 100).toFixed(1) + ' %';
}

function fmtParts(n) {
  return n.toFixed(2);
}

// ─────────────────────────────────────────────
// MISE À JOUR DES RÉSULTATS (panneau de droite)
// ─────────────────────────────────────────────
function updateResults(d) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('res-rbg',         fmt(d.revenuBrutGlobal));
  set('res-rni',         fmt(d.revenuNetImposable));
  set('res-rfr',         fmt(d.revenuReference));
  set('res-parts',       fmtParts(d.parts));
  set('res-qf',          fmt(d.quotientFamilial));
  set('res-impot-brut',  fmt(d.impotBrut));
  set('res-supp-qf',     fmt(d.supplementQF));
  set('res-apres-qf',    fmt(d.impotApresQF));
  set('res-decote',      fmt(d.decote));
  set('res-apres-decote',fmt(d.impotApresDecote));
  set('res-ir-mob',      fmt(d.irMobilier));
  set('res-ps',          fmt(d.psRole));
  set('res-cehr',        fmt(d.cehr));
  // Totaux RETENUS (effectivement déduits de l'impôt), pas les bruts.
  set('res-reductions',  fmt(d.reductionsAppliquees));
  set('res-credits',     fmt(d.creditsAppliques));
  // Plafond PER live (sous le champ de saisie)
  set('per-cap-live',    fmt(d.perCap));

  // Niches : 2 lignes claires (poche commune + supplément majorée)
  set('res-poche1', fmt(d.poche1Utilisee || 0) + ' / 10 000 €');
  set('res-poche2', fmt(d.poche2Utilisee || 0) + ' / 8 000 €');
  // Ligne "niches perdues" affichée seulement si > 0
  const perduesRow = document.getElementById('res-niches-perdues-row');
  if (perduesRow) {
    if ((d.nichesPerdues || 0) > 0) {
      perduesRow.style.display = '';
      set('res-niches-perdues', '− ' + fmt(d.nichesPerdues) + ' €');
    } else {
      perduesRow.style.display = 'none';
    }
  }

  const impotNetEl = document.getElementById('res-impot-net');
  if (impotNetEl) impotNetEl.textContent = fmt(d.impotNet);

  set('res-taux-moyen',  fmtPct(d.tauxMoyen));
  set('res-tmi',         fmtPct(d.tmi));

  // Parts dans le simulateur
  set('parts-affichage', fmtParts(d.parts) + ' parts');
}

// ─────────────────────────────────────────────
// MISE À JOUR DE L'ONGLET CALCUL DÉTAILLÉ
// ─────────────────────────────────────────────
function updateCalcDetaille(d) {
  const rows = [
    // [id, label, valeur, note]
    // Étape 1
    ['cd-sal',     'Salaires après abattement 10%',             d.salaireNet,        'Abat. 10% · min 509 € · max 14 555 €/déclarant'],
    ['cd-pen',     'Pensions après abattement 10%',             d.pensionNet,        'Abat. 10% · min 454 €/personne · max 4 439 €/foyer'],
    ['cd-bnc',     'BNC micro après abattement 34%',            d.bncMicroNet,       'Abat. 34% · min 305 €'],
    ['cd-bncr',    'BNC réel',                                   d.bncReel,           ''],
    ['cd-mfon',    'Micro-foncier (après abat. 30%)',            d.microFoncierNet,   ''],
    ['cd-fon',     'Foncier réel (après Jeanbrun et plafond déficit)', d.foncierReel, ''],
    ['cd-mbc',     'Meublé tourisme classé / chambres d\'hôtes (après abat. 50%)', d.meubleClasseNet,    ''],
    ['cd-mbnc',    'Meublé tourisme non classé (après abat. 30%)',                 d.meubleNonClasseNet, ''],
    ['cd-mbau',    'Autres locations meublées (après abat. 50%)',                  d.autresMeublesNet,   ''],
    ['cd-div',     'Dividendes intégrés au barème',              d.dividendesBareme,  'Abat. 40% si barème · 0 si PFU'],
    ['cd-int',     'Intérêts (2TR) intégrés au barème',          d.interetsBareme,    'Sans abat. si barème · 0 si PFU'],
    ['cd-pv',      'Plus-values intégrées au barème',            d.pvBareme,          ''],
    ['cd-autrev',  'Autres revenus',                             d.autresRevenus,     ''],
    ['cd-rbg',     '▶ REVENU BRUT GLOBAL',                      d.revenuBrutGlobal,  'total'],
    // Étape 2
    ['cd-per',     '− Versements PER (déductible)',                d.per,               'Plafond : ' + fmt(d.perCap)],
    ['cd-palim',   '− Pensions alimentaires',                    d.pensionsAlim,      d.pensionAlimCap ? 'Plafond : ' + fmt(d.pensionAlimCap) : 'Montant libre (pas de bénéficiaires déclarés)'],
    ['cd-csg',     '− CSG déductible',                           d.csgDeductible,     ''],
    ['cd-ach',     '− Autres charges',                           d.autresCharges,     ''],
    ['cd-rni',     '▶ REVENU NET IMPOSABLE',                     d.revenuNetImposable,'total'],
    // Étape 3
    ['cd-qf',      'Quotient familial (R/N)',                    d.quotientFamilial,  fmtParts(d.parts) + ' part(s)'],
    ['cd-ipp',     'Impôt par part (barème)',                    d.impotParPart,      ''],
    ['cd-ibr',     '▶ IMPÔT BRUT',                              d.impotBrut,         '× ' + fmtParts(d.parts) + ' parts'],
    // Étape 4
    ['cd-qfb',     'QF avec parts de base',                     d.qfBase,            fmtParts(d.partsBase) + ' part(s) base'],
    ['cd-ibase',   'Impôt avec parts de base',                  d.impotBrutBase,     ''],
    ['cd-avqf',    'Avantage procuré par les demi-parts',        d.avantageQF,        ''],
    ['cd-plqf',    'Plafond total avantage QF',                  d.plafondQF,         d.demiPartsSupp.toFixed(1) + ' demi-parts × 1 807 €'],
    ['cd-suqf',    'Supplément (plafonnement QF)',               d.supplementQF,      ''],
    ['cd-aqf',     '▶ IMPÔT APRÈS QF',                         d.impotApresQF,      'total'],
    // Étape 5
    ['cd-sdec',    'Seuil de décote',                            d.seuilDecote,       ''],
    ['cd-dec',     'Montant de la décote',                       d.decote,            ''],
    ['cd-adec',    '▶ IMPÔT APRÈS DÉCOTE',                     d.impotApresDecote,  'total'],
    // Étape 6 — IR mobilier PFU
    ['cd-irmob',   'IR mobilier (PFU 12,8 %) — div + intérêts + PV', d.irMobilier,   ''],
    // Étape 6bis — IR AV > 8 ans
    ['cd-avbrut',  'Produits AV bruts (7,5 % + 12,8 %)',         (d.avAbattement || 0) + (d.avImposable || 0), ''],
    ['cd-avabat',  '− Abattement annuel utilisé',                d.avAbattement,      'Imputé en priorité sur 12,8 %'],
    ['cd-avimpos', '= Produits imposables',                       d.avImposable,       ''],
    ['cd-irav',    '▶ IR sur produits AV (7,5 % et 12,8 %)',     d.irAV,              'total'],
    ['cd-pfnlav',  '− PFNL prélevé à la source par la banque',   d.pfnlAV,            'av75 × 7,5% + av128 × 12,8% (crédit auto)'],
    // Étape 7 — PS
    ['cd-psdiv',   'PS dividendes (18,6 %) — voie de rôle',      d.psDividendes,      'Le PFNL bancaire (2CK) ne couvre que l\'IR, pas les PS'],
    ['cd-psint',   'PS intérêts (18,6 %) — voie de rôle',        d.psInterets,        'Le PFNL bancaire (2CK) ne couvre que l\'IR, pas les PS'],
    ['cd-pspv',    'PS plus-values mobilières (18,6 %) — voie de rôle', d.psPV,       'À payer via avis IR'],
    ['cd-psfon',   'PS foncier (18,6 %) — voie de rôle',         d.psFoncier,         'À payer via avis IR'],
    ['cd-psrol',   '▶ Sous-total PS dus via avis IR',            d.psRole,            'total'],
    ['cd-psav',    'PS sur produits AV (17,2 %) — prélevés source', d.psAV,           'Libératoires : auto-imputés par le simulateur officiel'],
    ['cd-pssrc',   '▶ Sous-total PS prélevés à la source',       d.psSource,          'INFO — n\'entre pas dans l\'impôt à payer'],
    ['cd-tps',     '▶ TOTAL PS (charge fiscale globale)',        d.totalPS,           'source + avis'],
    // Étape 8 — Réductions
    ['cd-rdons',     'Dons 7UD/7UF (75 % puis 66 %) — HORS NICHE', d.redDons,         ''],
    ['cd-rscol',     'Frais de scolarité 7EA/7EC/7EF — HORS NICHE', d.fraisScol,      ''],
    ['cd-rehpad',    'EHPAD ascendants 7CD (25 %) — HORS NICHE',  d.redEhpad,         ''],
    ['cd-rmalraux',  'Loi Malraux 7NX/7NY (22/30 %) — HORS NICHE', d.redMalraux,      ''],
    ['cd-rpinel',    'Pinel / Denormandie — NICHE 10k',            d.redPinel,        ''],
    ['cd-rgpd',      'Girardin plein droit — NICHE 18k (44%)',     d.redGirardinPD,   ''],
    ['cd-rgag',      'Girardin avec agrément — NICHE 18k (34%)',   d.redGirardinAG,   ''],
    ['cd-rfcpi',     'FCPI / FIP classique — NICHE 10k',           d.redFCPI,         ''],
    ['cd-rfcpijei',  'FCPI JEI (LF 2026, 30 %) — NICHE 10k',       d.redFcpiJei,      ''],
    ['cd-rfipcorse', 'FIP Corse / Outre-mer (30 %) — NICHE 10k',   d.redFipCorse,     ''],
    ['cd-rgfi',      'GFI (Groupements forestiers) — NICHE 10k',   d.redGfi,          ''],
    ['cd-rirpme',    'IR-PME / Madelin (25 %) — NICHE 10k',        d.redIrPme,        ''],
    ['cd-rlocav',    "Loc'Avantages — NICHE 10k",                  d.redLocAvantages, ''],
    ['cd-rsof',      'Sofica — NICHE 18k',                         d.redSofica,       ''],
    ['cd-raut',      'Autres réductions — NICHE 10k',              d.redAutres,       ''],
    ['cd-tred',      '▶ TOTAL RÉDUCTIONS',                         d.totalReductions, 'total'],
    // Étape 9 — Crédits
    ['cd-cdom',    'Crédit emploi à domicile (50 %) — NICHE 10k', d.credDomicile,     ''],
    ['cd-cgrd',    'Crédit garde enfants (50 %) — NICHE 10k',     d.credGarde,        ''],
    ['cd-caut',    'Autres crédits — NICHE 10k',                  d.credAutres,       ''],
    ['cd-csynd',   'Cotisations syndicales 7AC (66 %) — HORS NICHE', d.credSyndic,    ''],
    ['cd-tcrd',    '▶ TOTAL CRÉDITS',                             d.totalCredits + (d.credSyndic||0), 'total'],
    // Étape 10
    ['cd-nutil',   'Niches demandées (panier total)',             d.nichesUtilisees,   'GirPD ×44%, GirAG ×34%, SOFICA ×1'],
    ['cd-npoche1', '↳ Retenu poche 1 (10 000 € — tous)',          d.poche1Utilisee,    ''],
    ['cd-npoche2', '↳ Retenu poche 2 (+8 000 € — Girardin/SOFICA)', d.poche2Utilisee,  ''],
    ['cd-nplaf',   'Plafond global applicable',                   d.plafondNiches,     ''],
    ['cd-ndep',    'Niches perdues (au-delà des poches)',         d.nichesPerdues,     d.nichesPerdues > 0 ? '⚠ avantage non récupérable' : ''],
    // Étape 11
    ['cd-apd',     'Impôt après décote',                         d.impotApresDecote,  ''],
    ['cd-irm2',    '+ IR mobilier (PFU sur div/intérêts/PV)',     d.irMobilier,        ''],
    ['cd-irav2',   '+ IR sur AV > 8 ans (7,5 % et 12,8 %)',       d.irAV,              ''],
    ['cd-rapp',    '− Réductions appliquées',                     d.reductionsAppliquees, 'plafonnées à l\'impôt et aux niches'],
    ['cd-capp',    '− Crédits appliqués (niches)',                d.creditsAppliques,  ''],
    ['cd-csynd2',  '− Crédit cotisations syndicales (hors niches)', d.credSyndic,      ''],
    ['cd-ps2',     '+ PS dus via avis IR (RCM + PV mob + foncier)', d.psRole,         'PS AV exclus (libératoires), 2CK ne couvre que l\'IR'],
    ['cd-pfnl2',   '− PFNL déjà versé (acompte 2CK)',             d.pfnlVerse,         'crédit hors niches, remboursable'],
    ['cd-pfnlav2', '− PFNL AV prélevé à la source',               d.pfnlAV,            'crédit auto sur produits 2CH/2VV/2WW'],
    ['cd-cehr2',   '+ CEHR (contribution hauts revenus)',         d.cehr,              d.cehr > 0 ? 'art. 223 sexies CGI' : '—'],
    ['cd-inet',    '▶ IMPÔT NET FINAL',                         d.impotNet,          'total'],
    ['cd-tm',      'Taux moyen d\'imposition',                   null,                fmtPct(d.tauxMoyen)],
    ['cd-tmi',     'Taux marginal (TMI)',                        null,                fmtPct(d.tmi)],
  ];

  rows.forEach(([id, , val, note]) => {
    const valEl = document.getElementById(id + '-val');
    const noteEl = document.getElementById(id + '-note');
    if (valEl) valEl.textContent = val !== null ? fmt(val) : note;
    if (noteEl) noteEl.textContent = val !== null ? note : '';
  });
}

// ─────────────────────────────────────────────
// INPUTS SIMULATEUR SIMPLIFIÉ
// ─────────────────────────────────────────────
function getInputsSimple() {
  return {
    // Situation
    situation:    v('s-situation'),
    nbEnfants:    v('s-nbEnfants'),
    gardeAlternee: v('s-gardeAlternee'),
    parentIsole:  v('s-parentIsole') === 'oui',

    // Revenus — champs simplifiés
    sal1:         v('s-sal'),
    sal2:         0,
    pen1:         0, pen2:           0,
    bncMicro1:    v('s-bnc'),
    bncMicro2:    0,
    bncReel1:     0, bncReel2:       0,
    microFoncier: 0, foncierReel:    0,
    meubleClasse: 0, meubleNonClasse: 0, autresMeubles: 0,
    dividendes:   v('s-dividendes'),
    pv:           0,
    autresRevenus: 0,
    optionPFU:    v('s-optionPFU'),

    // Charges
    per:               v('s-per'),
    pensionsAlim:      v('s-pensionsAlim'),
    nbBeneficiairesPA: v('s-nbBeneficiairesPA'),
    csgDeductible:     v('s-csg'),
    autresCharges:     0,

    // Réductions / Crédits
    dons:            v('s-dons'),
    emploiDomicile:  v('s-emploi'),
    gardeEnfants:    v('s-garde'),
    pinel:           v('s-pinel'),
    girardinPD:      0, girardinAG:   0, fcpi:          0,
    sofica:          v('s-sofica'),
    autresReductions: 0,
    autresCredits:    0,
  };
}

// ─────────────────────────────────────────────
// RÉSULTATS SIMULATEUR SIMPLIFIÉ
// ─────────────────────────────────────────────
function updateResultsSimple(d) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('s-res-rni',          fmt(d.revenuNetImposable));
  set('s-res-parts',        fmtParts(d.parts));
  set('s-res-impot-brut',   fmt(d.impotBrut));
  set('s-res-supp-qf',      fmt(d.supplementQF));
  set('s-res-decote',       fmt(d.decote));
  set('s-res-apres-decote', fmt(d.impotApresDecote));
  set('s-res-ir-mob',       fmt(d.irMobilier));
  set('s-res-ps',           fmt(d.psRole));
  set('s-res-cehr',         fmt(d.cehr));
  // Plafond PER live
  set('s-per-cap-live',     fmt(d.perCap));
  // Réductions + crédits = avantages totaux appliqués
  const avantages = d.reductionsAppliquees + d.creditsAppliques;
  set('s-res-avantages',    avantages > 0 ? '−\u202F' + fmt(avantages) : fmt(0));
  set('s-res-taux-moyen',   fmtPct(d.tauxMoyen));
  set('s-res-tmi',          fmtPct(d.tmi));
  set('s-parts-affichage',  fmtParts(d.parts) + ' parts');

  const impotNetEl = document.getElementById('s-res-impot-net');
  if (impotNetEl) impotNetEl.textContent = fmt(d.impotNet);
}

// ─────────────────────────────────────────────
// ACCORDÉON LEVIERS FISCAUX
// ─────────────────────────────────────────────
function toggleLevier(header) {
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');
  // Ferme tous les autres
  document.querySelectorAll('.levier-body.open').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.levier-header.open').forEach(h => h.classList.remove('open'));
  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('open');
  }
}

// ─────────────────────────────────────────────
// CALCUL PRINCIPAL
// ─────────────────────────────────────────────
function recalculer() {
  const input = getInputs();
  const det = calculerIR(input);
  updateResults(det);
  updateCalcDetaille(det);
  // Met à jour aussi l'onglet préconisations (calculs uniquement, sans toucher aux inputs)
  if (typeof refreshPreconisationsCalculs === 'function') refreshPreconisationsCalculs();
}

function recalculerSimple() {
  const input = getInputsSimple();
  const det = calculerIR(input);
  updateResultsSimple(det);
}

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Écouter tous les inputs — chaque champ déclenche son propre simulateur
  document.querySelectorAll('input[type="number"], input[type="checkbox"], select').forEach(el => {
    const isSimple = el.id && el.id.startsWith('s-');
    const handler = isSimple ? recalculerSimple : recalculer;
    el.addEventListener('input',  handler);
    el.addEventListener('change', handler);
  });

  // Demi-part supplémentaire : afficher le select des cas seulement si cochée
  const demiPartCb = document.getElementById('demiPartSupp');
  const demiPartCasRow = document.getElementById('demiPartCasRow');
  const toggleDemiPartCas = () => {
    demiPartCasRow.style.display = demiPartCb.checked ? '' : 'none';
  };
  demiPartCb.addEventListener('change', toggleDemiPartCas);
  toggleDemiPartCas();

  // Préconisations : init + listeners
  initPreconisations();

  // Premiers calculs
  recalculer();
  recalculerSimple();
});

// ─────────────────────────────────────────────
// PRÉCONISATIONS — bridge UI/moteur
// ─────────────────────────────────────────────
function initPreconisations() {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const budgetInput = document.getElementById('precoBudget');
  if (budgetInput) {
    budgetInput.addEventListener('input', () => {
      window.PRECONISATIONS.setBudget(budgetInput.value);
      refreshPreconisationsCalculs();
    });
  }
  // 3 boutons "+ Ajouter" — un par levier (data-add-levier)
  document.querySelectorAll('[data-add-levier]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.addLevier, 10);
      window.PRECONISATIONS.addLever({ assignedLevier: lvl });
      renderPreconisations();
    });
  });
}

// Render structurel : recrée toutes les lignes des 3 sections.
// Appelé seulement à add/remove/changement de levier (sinon perte du focus input).
function renderPreconisations() {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const P = window.PRECONISATIONS;
  // 3 tbody, un par levier
  const tbodies = {
    1: document.getElementById('precoRowsL1'),
    2: document.getElementById('precoRowsL2'),
    3: document.getElementById('precoRowsL3'),
  };
  if (!tbodies[1] || !tbodies[2] || !tbodies[3]) return;
  Object.values(tbodies).forEach(t => { t.innerHTML = ''; });

  const state = P.getState();
  state.preconisations.forEach(p => {
    const sectionLevier = p.assignedLevier || 2;  // fallback L2 par défaut
    const tbody = tbodies[sectionLevier];
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.dataset.rowId = p.id;

    // Levier select + tooltip info contextuel — FILTRÉ par section
    const tdLev = document.createElement('td');
    tdLev.className = 'preco-lever-cell';
    const sel = document.createElement('select');
    sel.className = 'preco-lever-select';
    const leviersFiltres = P.LEVIERS_CATALOGUE.filter(l => l.levier === sectionLevier);
    sel.innerHTML = '<option value="">— Choisir un dispositif —</option>'
      + leviersFiltres.map(l => `<option value="${l.id}">${l.label}</option>`).join('');
    sel.value = p.leverId;
    sel.addEventListener('change', () => {
      P.updateLever(p.id, 'leverId', sel.value);
      renderPreconisations();      // Full re-render car la colonne param peut apparaître/disparaître
    });
    tdLev.appendChild(sel);

    // Info tooltip dépendant du levier sélectionné
    const levSelected = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    if (levSelected && levSelected.info) {
      const tip = document.createElement('i');
      tip.className = 'tip tip-down preco-lever-tip';   // tip-down : ouvre vers le bas (sécurise pour la 1ʳᵉ ligne)
      tip.textContent = 'i';
      let tipText = levSelected.info;
      if (levSelected.budget === 'exclu') {
        tipText = '⚠ EXCLU du budget annuel (financement crédit, manque à gagner ou amortissement)\n\n' + tipText;
      }
      tip.setAttribute('data-tip', tipText);
      tdLev.appendChild(tip);
    }
    tr.appendChild(tdLev);

    // Montant
    const tdMt = document.createElement('td');
    const inMt = document.createElement('input');
    inMt.type = 'number';
    inMt.min = 0;
    inMt.value = p.montant || 0;
    inMt.className = 'preco-montant-input';
    inMt.addEventListener('input', () => {
      P.updateLever(p.id, 'montant', inMt.value);
      refreshPreconisationsCalculs();   // Update partiel — préserve le focus de l'input
    });
    tdMt.appendChild(inMt);
    tr.appendChild(tdMt);

    // Param additionnel (taux-variable / jeanbrun)
    const tdParam = document.createElement('td');
    const lev = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    if (lev && lev.mode === 'taux-libre') {
      // Girardin PD/AG : input numérique de rendement avec boutons ± 0,5 %
      const wrap = document.createElement('div');
      wrap.className = 'preco-rendement-wrap';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'preco-rendement-btn';
      minus.textContent = '−';
      minus.title = `− ${(lev.rendementStep * 100).toFixed(1)} %`;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'preco-rendement-input';
      input.min = (lev.rendementMin * 100).toFixed(1);
      input.max = (lev.rendementMax * 100).toFixed(1);
      input.step = (lev.rendementStep * 100).toFixed(1);
      const cur = (p.paramValue || lev.rendementDefaut) * 100;
      input.value = cur.toFixed(1);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'preco-rendement-btn';
      plus.textContent = '+';
      plus.title = `+ ${(lev.rendementStep * 100).toFixed(1)} %`;
      const suffix = document.createElement('span');
      suffix.className = 'preco-rendement-suffix';
      suffix.textContent = '%';

      const apply = (newPct) => {
        const clamped = Math.max(lev.rendementMin * 100, Math.min(lev.rendementMax * 100, newPct));
        input.value = clamped.toFixed(1);
        P.updateLever(p.id, 'paramValue', clamped / 100);
        refreshPreconisationsCalculs();
      };
      minus.addEventListener('click', () => apply(parseFloat(input.value) - lev.rendementStep * 100));
      plus.addEventListener('click',  () => apply(parseFloat(input.value) + lev.rendementStep * 100));
      input.addEventListener('input', () => apply(parseFloat(input.value) || (lev.rendementDefaut * 100)));

      wrap.appendChild(minus);
      wrap.appendChild(input);
      wrap.appendChild(suffix);
      wrap.appendChild(plus);
      tdParam.appendChild(wrap);
    } else if (lev && lev.params) {
      const psel = document.createElement('select');
      psel.className = 'preco-param-select';
      psel.innerHTML = lev.params[0].options
        .map(o => `<option value="${o.value}">${o.label}</option>`).join('');
      psel.value = p.paramValue || lev.params[0].options[0].value;
      psel.addEventListener('change', () => {
        P.updateLever(p.id, 'paramValue', psel.value);
        refreshPreconisationsCalculs();
      });
      tdParam.appendChild(psel);
    } else {
      tdParam.innerHTML = '<span class="preco-param-na">—</span>';
    }
    tr.appendChild(tdParam);

    // Cellules calculées (vides au render structurel, remplies par refresh)
    const tdAv = document.createElement('td');
    tdAv.className = 'preco-avantage';
    tdAv.dataset.col = 'avantage';
    tr.appendChild(tdAv);

    const tdPl = document.createElement('td');
    tdPl.className = 'preco-plafond';
    tdPl.dataset.col = 'plafond';
    tr.appendChild(tdPl);

    // Bouton suppression
    const tdDel = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preco-del-btn';
    btn.textContent = '×';
    btn.addEventListener('click', () => {
      P.removeLever(p.id);
      renderPreconisations();
    });
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });

  // Premier remplissage des calculs
  refreshPreconisationsCalculs();
}

// Update partiel : met à jour les colonnes calculées + jauges + comparaison
// SANS toucher aux inputs (préserve le focus en cours de saisie).
function refreshPreconisationsCalculs() {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const P = window.PRECONISATIONS;
  // 3 tbody (un par levier)
  const tbodies = {
    1: document.getElementById('precoRowsL1'),
    2: document.getElementById('precoRowsL2'),
    3: document.getElementById('precoRowsL3'),
  };
  if (!tbodies[1] || !tbodies[2] || !tbodies[3]) return;

  const inputAvant = getInputs();
  const detAvant = calculerIR(inputAvant);
  const state = P.getState();

  // Helper : levier (1/2/3) d'une preco via son leverId
  const levOf = (p) => {
    const lev = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    return lev ? lev.levier : (p.assignedLevier || null);
  };

  // 4 calculs progressifs pour la barre synthèse :
  //   detAvant : sans préconisations
  //   detL1    : avec préco L1 uniquement (déductions revenu)
  //   detL12   : avec préco L1 + L2 (réductions)
  //   detApres : avec tout (incluant L3 crédits)
  const precosL1   = state.preconisations.filter(p => levOf(p) === 1);
  const precosL12  = state.preconisations.filter(p => levOf(p) <= 2);
  const detL1    = calculerIR(P.appliquerPreconisations(inputAvant, precosL1));
  const detL12   = calculerIR(P.appliquerPreconisations(inputAvant, precosL12));
  const inputApres = P.appliquerPreconisations(inputAvant, state.preconisations);
  const detApres = calculerIR(inputApres);

  // Récap sticky (sidebar fixe en haut à droite)
  const setText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setText('recapInit',  fmt(detAvant.impotNet));
  setText('recapL1',    fmt(detL1.impotNet));
  setText('recapL2',    fmt(detL12.impotNet));
  setText('recapFinal', fmt(detApres.impotNet));
  const eco = detAvant.impotNet - detApres.impotNet;
  setText('recapEco', eco > 0 ? '− ' + fmt(eco) + ' €' : fmt(eco) + ' €');

  // Pré-affichage des dispositifs déjà saisis dans le Simulateur, par section
  renderExistingByLevier(inputAvant, detAvant);

  // Jauges 2 poches niches dans la section L2
  setJauge('Poche1', detApres.poche1Utilisee || 0, 10000);
  setJauge('Poche2', detApres.poche2Utilisee || 0, 8000);

  // Update des cellules computed dans chaque ligne (toutes sections confondues).
  // Pour chaque préconisation, on calcule un "delta isolé" = effet de cette préco
  // SEULE par rapport à l'input simulateur de base. C'est le gain MARGINAL réel
  // (tient compte des plafonds qui peuvent tronquer le calcul théorique).
  state.preconisations.forEach(p => {
    const tbody = tbodies[p.assignedLevier || 2];
    if (!tbody) return;
    const tr = tbody.querySelector(`tr[data-row-id="${p.id}"]`);
    if (!tr) return;
    const tdAv = tr.querySelector('td[data-col="avantage"]');
    const tdPl = tr.querySelector('td[data-col="plafond"]');

    // Calcul isolé de cette préconisation seule, par-dessus l'input Simulateur
    const lev = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    let inputSeul = inputAvant;
    let detSeul = detAvant;
    if (lev && p.montant) {
      inputSeul = P.appliquerPreconisations(inputAvant, [p]);
      detSeul = calculerIR(inputSeul);
    }
    const gainMarginal = detAvant.impotNet - detSeul.impotNet;

    if (tdAv) {
      if (!lev || !p.montant) {
        tdAv.textContent = '—';
      } else {
        // Gain réel : montant d'impôt en moins, en tenant compte des plafonds
        // et de l'input existant déjà dans le Simulateur.
        tdAv.textContent = gainMarginal > 0
          ? '− ' + fmt(gainMarginal) + ' €'
          : gainMarginal < 0 ? '+ ' + fmt(-gainMarginal) + ' €' : fmt(0) + ' €';
      }
    }
    if (tdPl) {
      const ck = P.checkPlafond(p, inputAvant, detSeul, inputSeul);
      tdPl.className = 'preco-plafond ' + (ck.ok ? 'preco-ok' : 'preco-warn');
      tdPl.textContent = ck.ok ? '✓' : '⚠ ' + ck.msg;
    }
  });

  // Warnings — bandeaux par section (panier-niches → L2, surdimensionnement → L2)
  const warnings = P.computeWarnings(detApres);
  ['L1', 'L2', 'L3'].forEach(s => {
    const box = document.getElementById('precoWarnings' + s);
    if (box) box.innerHTML = '';
  });
  const boxL2 = document.getElementById('precoWarningsL2');
  warnings.forEach(w => {
    // cap-indiv et panier-niches et surdimensionnement → tous Levier 2
    if (!boxL2) return;
    const chip = document.createElement('div');
    chip.className = 'preco-warning preco-warning-' + w.level;
    chip.textContent = (w.level === 'info' ? 'ℹ ' : '⚠ ') + w.message;
    boxL2.appendChild(chip);
  });

  // Jauges
  // Budget alloué : ne compte QUE les leviers à cash sortant réel (budget: 'cash').
  // Les leviers immo financés à crédit ou amortissement (budget: 'exclu') ne réduisent
  // pas le budget annuel disponible du client.
  const totalAlloue = state.preconisations.reduce((s, p) => {
    const lev = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    if (!lev || lev.budget === 'exclu') return s;
    return s + (p.montant || 0);
  }, 0);
  setJauge('Budget', totalAlloue, state.budgetDispo);
  setJauge('Per', inputApres.per || 0, detApres.perCap);
  const donsTotal = (inputApres.dons7UD || 0) + (inputApres.dons || 0);
  setJauge('Dons', donsTotal, detApres.revenuNetImposable * 0.20);

  // Tableau comparatif
  setCmp('rni',   detAvant.revenuNetImposable, detApres.revenuNetImposable);
  setCmp('ibr',   detAvant.impotBrut,          detApres.impotBrut);
  setCmp('red',   detAvant.reductionsAppliquees, detApres.reductionsAppliquees, true);
  setCmp('cr',    detAvant.creditsAppliques,   detApres.creditsAppliques, true);
  setCmp('csy',   detAvant.credSyndic,         detApres.credSyndic, true);
  setCmp('irmob', detAvant.irMobilier,         detApres.irMobilier);
  setCmp('irav',  detAvant.irAV,               detApres.irAV);
  setCmp('ps',    detAvant.psRole,             detApres.psRole);
  setCmp('cehr',  detAvant.cehr,               detApres.cehr);
  setCmp('net',   detAvant.impotNet,           detApres.impotNet);

  document.getElementById('cmp-tm-act').textContent = fmtPct(detAvant.tauxMoyen);
  document.getElementById('cmp-tm-pro').textContent = fmtPct(detApres.tauxMoyen);
  document.getElementById('cmp-tmi-act').textContent = fmtPct(detAvant.tmi);
  document.getElementById('cmp-tmi-pro').textContent = fmtPct(detApres.tmi);
}

// Affiche en haut de chaque section les dispositifs déjà saisis dans le
// Simulateur (input > 0), avec leur effet IR estimé. Format compact en vert.
// L'utilisateur voit que ces leviers sont DÉJÀ pris en compte sans avoir
// besoin de les ré-ajouter en préconisation.
function renderExistingByLevier(inputAvant, detAvant) {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const P = window.PRECONISATIONS;
  const boxes = {
    1: document.getElementById('precoExistingL1'),
    2: document.getElementById('precoExistingL2'),
    3: document.getElementById('precoExistingL3'),
  };
  if (!boxes[1] || !boxes[2] || !boxes[3]) return;
  Object.values(boxes).forEach(b => { b.innerHTML = ''; });

  // Liste des dispositifs avec leur valeur d'input + estimation effet IR
  // L'effet d'un dispositif déjà saisi = (det.redXXX OU det.creditXXX OU ...)
  const items = [
    { id: 'per',        levier: 1, inputKey: 'per',                  label: 'PER',                effet: detAvant.per * detAvant.tmi },
    { id: 'jeanbrun',   levier: 1, inputKey: 'jeanbrunAmort',        label: 'Amortissement Jeanbrun', effet: null },
    { id: 'dons7UD',    levier: 2, inputKey: 'dons7UD',              label: 'Dons Coluche 75 %',  effet: null },
    { id: 'dons7UF',    levier: 2, inputKey: 'dons',                 label: 'Dons 66 %',          effet: null },
    { id: 'ehpad',      levier: 2, inputKey: 'ehpadFrais',           label: 'EHPAD',              effet: detAvant.redEhpad },
    { id: 'malraux',    levier: 2, inputKey: 'malrauxTravaux',       label: 'Malraux',            effet: detAvant.redMalraux, fallback: 'malraux' },
    { id: 'fcpiJei',    levier: 2, inputKey: 'fcpiJei',              label: 'FCPI JEI',           effet: detAvant.redFcpiJei },
    { id: 'fipCorse',   levier: 2, inputKey: 'fipCorse',             label: 'FIP Corse',          effet: detAvant.redFipCorse },
    { id: 'irPme',      levier: 2, inputKey: 'irPme',                label: 'IR-PME',             effet: detAvant.redIrPme },
    { id: 'gfi',        levier: 2, inputKey: 'gfi',                  label: 'GFI',                effet: detAvant.redGfi },
    { id: 'locAvantages',levier: 2, inputKey: 'locAvantagesDepenses',label: "Loc'Avantages",      effet: detAvant.redLocAvantages, fallback: 'locAvantages' },
    { id: 'sofica',     levier: 2, inputKey: 'sofica',               label: 'SOFICA',             effet: detAvant.redSofica },
    { id: 'girardinPD', levier: 2, inputKey: 'girardinPD',           label: 'Girardin PD',        effet: detAvant.redGirardinPD },
    { id: 'girardinAG', levier: 2, inputKey: 'girardinAG',           label: 'Girardin AG',        effet: detAvant.redGirardinAG },
    { id: 'emploiDom',  levier: 3, inputKey: 'emploiDomicile',       label: 'Emploi à domicile',  effet: detAvant.credDomicile },
    { id: 'gardeEnf',   levier: 3, inputKey: 'gardeEnfants',         label: 'Garde enfants',      effet: detAvant.credGarde },
    { id: 'syndic',     levier: 3, inputKey: 'cotSyndicales',        label: 'Cotisations syndicales', effet: detAvant.credSyndic },
  ];

  items.forEach(it => {
    const val = (inputAvant[it.inputKey] || 0)
      || (it.fallback ? (inputAvant[it.fallback] || 0) : 0);
    if (val <= 0) return;
    const chip = document.createElement('span');
    chip.className = 'preco-existing-chip';
    const eff = it.effet;
    const effTxt = (eff !== null && eff !== undefined && eff > 0)
      ? ` → −${fmt(eff)} €`
      : '';
    chip.textContent = `✓ ${it.label} : ${fmt(val)} €${effTxt}`;
    boxes[it.levier].appendChild(chip);
  });

  // Si une section est vide, on cache son conteneur pour ne pas occuper d'espace
  Object.entries(boxes).forEach(([_, box]) => {
    box.style.display = box.children.length ? '' : 'none';
  });
}

function setCmp(key, valAct, valPro, isNeg) {
  const elA = document.getElementById('cmp-' + key + '-act');
  const elP = document.getElementById('cmp-' + key + '-pro');
  const elE = document.getElementById('cmp-' + key + '-ecart');
  if (elA) elA.textContent = isNeg && valAct > 0 ? '−' + fmt(valAct) : fmt(valAct);
  if (elP) elP.textContent = isNeg && valPro > 0 ? '−' + fmt(valPro) : fmt(valPro);
  if (elE) {
    const ecart = valPro - valAct;
    elE.textContent = ecart === 0 ? '—' : (ecart > 0 ? '+' + fmt(ecart) : fmt(ecart));
    // Pour les lignes "isNeg" (réductions, crédits) : ecart > 0 = gain utilisateur (plus de réductions)
    // Pour les autres : ecart < 0 = gain utilisateur (moins d'impôt)
    const gain = isNeg ? (ecart > 0) : (ecart < 0);
    elE.className = ecart === 0 ? '' : (gain ? 'cmp-ecart-pos' : 'cmp-ecart-neg');
  }
}

function setJauge(name, used, cap) {
  const fill = document.getElementById('jauge' + name + 'Fill');
  const val = document.getElementById('jauge' + name + 'Val');
  if (!fill || !val) return;
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  fill.style.width = pct + '%';
  let color = 'var(--accent)';
  if (cap > 0 && used > cap) color = '#dc2626';
  else if (cap > 0 && used > cap * 0.80) color = '#ea580c';
  else color = '#15803d';
  fill.style.background = color;
  val.textContent = fmt(used) + ' / ' + (cap > 0 ? fmt(cap) : '—');
}

function groupedLeviersOptions(leviers) {
  const groups = {
    hors:    { label: 'Hors plafond niches',          opts: [] },
    niche10: { label: 'Niche 10 000 €',                opts: [] },
    niche18: { label: 'Niche 18 000 € (majorée)',      opts: [] },
    foncier: { label: 'Déduction d\'assiette foncière',opts: [] },
  };
  leviers.forEach(l => {
    if (groups[l.cat]) groups[l.cat].opts.push(`<option value="${l.id}">${l.label}</option>`);
  });
  return Object.values(groups)
    .filter(g => g.opts.length)
    .map(g => `<optgroup label="${g.label}">${g.opts.join('')}</optgroup>`)
    .join('');
}
