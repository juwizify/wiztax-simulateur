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
    dividendes:   v('dividendes'),
    interets:     v('interets'),
    pv:           v('pv'),
    avProduits75:  v('avProduits75'),
    avProduits128: v('avProduits128'),
    autresRevenus: v('autresRevenus'),
    optionPFU:    document.getElementById('optionPFU').value,

    // Charges
    per:               v('per'),
    pensionsAlim:      v('pensionsAlim'),
    nbBeneficiairesPA: v('nbBeneficiairesPA'),
    csgDeductible:     v('csgDeductible'),
    autresCharges:     v('autresCharges'),

    // Réductions / Crédits
    dons:            v('dons'),
    emploiDomicile:  v('emploiDomicile'),
    gardeEnfants:    v('gardeEnfants'),
    pinel:           v('pinel'),
    girardinPD:      v('girardinPD'),
    girardinAG:      v('girardinAG'),
    fcpi:            v('fcpi'),
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
  set('res-ps',          fmt(d.totalPS));
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
    ['cd-fon',     'Foncier réel',                               d.foncierReel,       ''],
    ['cd-mbc',     'Meublé classé (après abat. 50%)',            d.meubleClasseNet,   ''],
    ['cd-mbnc',    'Meublé non classé (après abat. 30%)',        d.meubleNonClasseNet,''],
    ['cd-div',     'Dividendes intégrés au barème',              d.dividendesBareme,  'Abat. 40% si barème · 0 si PFU'],
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
    // Étape 6
    ['cd-irmob',   'IR sur dividendes/PV (PFU 12.8%)',          d.irMobilier,        ''],
    // Étape 7
    ['cd-psmob',   'PS mobilier (18.6%)',                        d.psMobilier,        ''],
    ['cd-psfon',   'PS foncier (17.2%)',                         d.psFoncier,         ''],
    ['cd-tps',     '▶ TOTAL PS',                                d.totalPS,           'total'],
    // Étape 8
    ['cd-rdons',   'Réduction dons (75%/66%) — HORS NICHE',     d.redDons,           ''],
    ['cd-rpinel',  'Pinel / Denormandie — NICHE 10k',            d.redPinel,          ''],
    ['cd-rgpd',    'Girardin plein droit — NICHE 18k (44%)',     d.redGirardinPD,     ''],
    ['cd-rgag',    'Girardin avec agrément — NICHE 18k (34%)',   d.redGirardinAG,     ''],
    ['cd-rfcpi',   'FCPI / FIP — NICHE 10k',                    d.redFCPI,           ''],
    ['cd-rsof',    'Sofica — NICHE 18k',                         d.redSofica,         ''],
    ['cd-raut',    'Autres réductions — NICHE 10k',              d.redAutres,         ''],
    ['cd-tred',    '▶ TOTAL RÉDUCTIONS',                        d.totalReductions,   'total'],
    // Étape 9
    ['cd-cdom',    'Crédit emploi à domicile (50%) — NICHE 10k', d.credDomicile,     ''],
    ['cd-cgrd',    'Crédit garde enfants (50%) — NICHE 10k',     d.credGarde,        ''],
    ['cd-caut',    'Autres crédits — NICHE 10k',                 d.credAutres,        ''],
    ['cd-tcrd',    '▶ TOTAL CRÉDITS',                           d.totalCredits,      'total'],
    // Étape 10
    ['cd-nutil',   'Niches utilisées (pondérées)',                d.nichesUtilisees,   'GirPD ×44%, GirAG ×34%'],
    ['cd-nplaf',   'Plafond applicable',                          d.plafondNiches,     d.depassementNiches > 0 ? '⚠ DÉPASSÉ' : 'OK'],
    ['cd-ndep',    'Dépassement du plafond',                     d.depassementNiches, ''],
    // Étape 11
    ['cd-apd',     'Impôt après décote',                         d.impotApresDecote,  ''],
    ['cd-irm2',    '+ IR mobilier (PFU)',                         d.irMobilier,        ''],
    ['cd-rapp',    '− Réductions appliquées',                    d.reductionsAppliquees,'plafonnées à l\'impôt et aux niches'],
    ['cd-capp',    '− Crédits appliqués',                        d.creditsAppliques,  ''],
    ['cd-ps2',     '+ Prélèvements sociaux',                     d.totalPS,           ''],
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
  set('s-res-ps',           fmt(d.totalPS));
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

  // Premiers calculs
  recalculer();
  recalculerSimple();
});
