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
    malraux:         v('malraux'),
    locAvantages:    v('locAvantages'),
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
  set('res-reductions',  fmt(d.totalReductions));
  set('res-credits',     fmt(d.totalCredits));
  // Plafond PER live (sous le champ de saisie)
  set('per-cap-live',    fmt(d.perCap));

  // Niches : affichage "X € / Y €"
  const nichesEl = document.getElementById('res-niches');
  if (nichesEl) {
    nichesEl.textContent = fmt(d.nichesUtilisees) + ' / ' + fmt(d.plafondNiches);
    nichesEl.classList.toggle('warning', d.depassementNiches > 0);
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
    ['cd-mbc',     'Meublé classé (après abat. 50%)',            d.meubleClasseNet,   ''],
    ['cd-mbnc',    'Meublé non classé (après abat. 30%)',        d.meubleNonClasseNet,''],
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
    ['cd-psdiv',   'PS dividendes (18,6 %) — prélevés source',   d.psDividendes,      'Acquittés par la banque, exclus de l\'avis IR'],
    ['cd-psint',   'PS intérêts (18,6 %) — prélevés source',     d.psInterets,        'Acquittés par la banque, exclus de l\'avis IR'],
    ['cd-psav',    'PS sur produits AV (17,2 %) — prélevés source', d.psAV,           'Acquittés par l\'assureur, exclus de l\'avis IR'],
    ['cd-pssrc',   '▶ Sous-total PS prélevés à la source',       d.psSource,          'INFO — n\'entre pas dans l\'impôt à payer'],
    ['cd-pspv',    'PS plus-values mobilières (18,6 %) — voie de rôle', d.psPV,       'À payer via avis IR'],
    ['cd-psfon',   'PS foncier (17,2 %) — voie de rôle',         d.psFoncier,         'À payer via avis IR'],
    ['cd-psrol',   '▶ Sous-total PS dus via avis IR',            d.psRole,            'total'],
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
    ['cd-nutil',   'Niches utilisées (pondérées)',                d.nichesUtilisees,   'GirPD ×44%, GirAG ×34%'],
    ['cd-nplaf',   'Plafond applicable',                          d.plafondNiches,     d.depassementNiches > 0 ? '⚠ DÉPASSÉ' : 'OK'],
    ['cd-ndep',    'Dépassement du plafond',                     d.depassementNiches, ''],
    // Étape 11
    ['cd-apd',     'Impôt après décote',                         d.impotApresDecote,  ''],
    ['cd-irm2',    '+ IR mobilier (PFU sur div/intérêts/PV)',     d.irMobilier,        ''],
    ['cd-irav2',   '+ IR sur AV > 8 ans (7,5 % et 12,8 %)',       d.irAV,              ''],
    ['cd-rapp',    '− Réductions appliquées',                     d.reductionsAppliquees, 'plafonnées à l\'impôt et aux niches'],
    ['cd-capp',    '− Crédits appliqués (niches)',                d.creditsAppliques,  ''],
    ['cd-csynd2',  '− Crédit cotisations syndicales (hors niches)', d.credSyndic,      ''],
    ['cd-ps2',     '+ PS dus via avis IR (PV mob + foncier)',     d.psRole,            'PS source exclus, déjà acquittés'],
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
    meubleClasse: 0, meubleNonClasse: 0,
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
  const addBtn = document.getElementById('precoAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      window.PRECONISATIONS.addLever();
      renderPreconisations();
    });
  }
}

// Render structurel : recrée toutes les lignes du tableau.
// Appelé seulement à add/remove/changement de levier (sinon perte du focus input).
function renderPreconisations() {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const P = window.PRECONISATIONS;
  const tbody = document.getElementById('precoRows');
  if (!tbody) return;

  const state = P.getState();
  tbody.innerHTML = '';
  state.preconisations.forEach(p => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = p.id;

    // Levier select + tooltip info contextuel
    const tdLev = document.createElement('td');
    tdLev.className = 'preco-lever-cell';
    const sel = document.createElement('select');
    sel.className = 'preco-lever-select';
    sel.innerHTML = '<option value="">— Choisir un levier —</option>'
      + groupedLeviersOptions(P.LEVIERS_CATALOGUE);
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
    if (lev && lev.params) {
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
  const tbody = document.getElementById('precoRows');
  if (!tbody) return;

  const inputAvant = getInputs();
  const detAvant = calculerIR(inputAvant);
  const state = P.getState();

  // Update des cellules computed dans chaque ligne
  state.preconisations.forEach(p => {
    const tr = tbody.querySelector(`tr[data-row-id="${p.id}"]`);
    if (!tr) return;
    const tdAv = tr.querySelector('td[data-col="avantage"]');
    const tdPl = tr.querySelector('td[data-col="plafond"]');
    if (tdAv) {
      const av = P.avantageEstime(p, inputAvant);
      tdAv.textContent = av === null ? '—' : (av > 0 ? '−' + fmt(av) : fmt(0));
    }
    if (tdPl) {
      const ck = P.checkPlafond(p, inputAvant);
      tdPl.className = 'preco-plafond ' + (ck.ok ? 'preco-ok' : 'preco-warn');
      tdPl.textContent = ck.ok ? '✓' : '⚠ ' + ck.msg;
    }
  });

  // Recalcul projeté
  const inputApres = P.appliquerPreconisations(inputAvant, state.preconisations);
  const detApres = calculerIR(inputApres);

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
  setJauge('Niches', detApres.nichesUtilisees, detApres.plafondNiches);

  // Affichage conditionnel du bonus 8 k€ OM/SOFICA
  const bonusRow = document.getElementById('jaugeBonusRow');
  const bonusDetail = document.getElementById('jaugeBonusDetail');
  const hasMajore = (inputApres.girardinPD || 0) > 0 || (inputApres.girardinAG || 0) > 0 || (inputApres.sofica || 0) > 0;
  if (bonusRow) {
    bonusRow.style.display = hasMajore ? '' : 'none';
    if (hasMajore && bonusDetail) {
      const causes = [];
      if ((inputApres.girardinPD || 0) > 0) causes.push('Girardin Plein Droit');
      if ((inputApres.girardinAG || 0) > 0) causes.push('Girardin Agrément');
      if ((inputApres.sofica || 0) > 0) causes.push('SOFICA');
      bonusDetail.textContent = `Plafond porté à 18 000 € grâce à : ${causes.join(', ')}.`;
    }
  }
  const perTotal = inputApres.per || 0;
  setJauge('Per', perTotal, detApres.perCap);
  const donsTotal = (inputApres.dons7UD || 0) + (inputApres.dons || 0);
  const donsCap = detApres.revenuNetImposable * 0.20;
  setJauge('Dons', donsTotal, donsCap);

  // Économie totale
  const economie = detAvant.impotNet - detApres.impotNet;
  const ecoEl = document.getElementById('jaugeEconomieVal');
  if (ecoEl) {
    ecoEl.textContent = economie > 0 ? '−' + fmt(economie) : fmt(economie);
    ecoEl.className = 'preco-jauge-economie-val ' + (economie > 0 ? 'preco-economie-pos' : '');
  }

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
