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

// Valeurs neutres par défaut pour TOUS les champs attendus par calculerIR.
// Source unique : si un nouveau champ est ajouté au moteur, on l'ajoute ici
// une seule fois et getInputs en hérite via `{ ...defaultInputs(), ...DOM }`
// (plus besoin de forcer chaque champ absent à 0 manuellement).
function defaultInputs() {
  return {
    // Situation
    situation: 'celibataire', nbEnfants: 0, gardeAlternee: 0,
    parentIsole: false, demiPartSupp: false, demiPartCas: 'L',
    // Revenus salaires/pensions
    sal1: 0, sal2: 0, allocChomage1: 0, allocChomage2: 0,
    fraisReels1: 0, fraisReels2: 0, heuresSupExo1: 0, heuresSupExo2: 0,
    pen1: 0, pen2: 0, pensInvalidite1: 0, pensInvalidite2: 0,
    pensAlimRecue1: 0, pensAlimRecue2: 0,
    // BNC, foncier, meublé
    bncMicro1: 0, bncMicro2: 0, bncReel1: 0, bncReel2: 0,
    microFoncier: 0, foncierReel: 0,
    meubleClasse: 0, meubleNonClasse: 0, autresMeubles: 0,
    jeanbrunAmort: 0, jeanbrunCategorie: 'intermediaire',
    // Mobilier
    dividendes: 0, interets: 0, pv: 0,
    avProduits75: 0, avProduits128: 0, pfnlVerse: 0,
    optionPFU: 'pfu', autresRevenus: 0,
    // Charges déductibles
    per: 0, perPlafondManuel: 0, pensionsAlim: 0, nbBeneficiairesPA: 0,
    csgDeductible: 0, autresCharges: 0,
    // Réductions
    dons: 0, dons7UD: 0, pinel: 0, girardinPD: 0, girardinAG: 0,
    fcpiJei: 0, fipCorse: 0, gfi: 0,    // fcpi (classique) retiré en D3.4
    // IR-PME — 7 sous-dispositifs (cf. tasks/d3.1-irpme-spec.md)
    irPme: 0,        // PME standard 18 %         → niche10
    irPmeEsus: 0,    // ESUS / SFS 25 %           → niche10
    irPmeMH: 0,      // Monuments historiques 25%  → niche10
    irPmeJei: 0,     // JEI direct 30 %           → HORS plafond niches
    irPmeJeii: 0,    // JEII 40 %                 → HORS
    irPmeJeir: 0,    // JEIR 50 %                 → HORS
    // Plafond pluri-annuel JEI+JEIR (50k RI cumulée 2024-2028) : RI déjà
    // imputée 2024-2025 (input optionnel pour les investisseurs récurrents).
    irPmeJeiJeirImputeAnterieur: 0,
    malraux: 0, malrauxTravaux: 0, malrauxZone: 'spr-non',
    locAvantages: 0, locAvantagesDepenses: 0, locAvantagesPalier: 'loc1',
    // SOFICA (D3.2) : sémantique investissement = montant souscrit + taux choisi
    sofica: 0, soficaTaux: '36',
    autresReductions: 0,
    // Crédits
    emploiDomicile: 0, gardeEnfants: 0, cotSyndicales: 0,
    fraisScolCollege: 0, fraisScolLycee: 0, fraisScolSup: 0,
    ehpadFrais: 0, ehpadNbPers: 1, autresCredits: 0,
  };
}

// Helpers de lecture DOM avec fallback sur la valeur défaut (cf. defaultInputs).
const _sel  = (id, fallback) => document.getElementById(id)?.value ?? fallback;
const _bool = (id) => document.getElementById(id)?.checked ?? false;

function getInputs() {
  const d = defaultInputs();
  const out = {
    ...d,
    // Situation
    situation:    _sel('situation', d.situation),
    nbEnfants:    v('nbEnfants'),
    gardeAlternee: v('gardeAlternee'),
    parentIsole:  _sel('parentIsole', 'non') === 'oui',
    demiPartSupp: _bool('demiPartSupp'),
    demiPartCas:  _sel('demiPartCas', d.demiPartCas),
    // Revenus
    sal1: v('sal1'), sal2: v('sal2'),
    allocChomage1: v('allocChomage1'), allocChomage2: v('allocChomage2'),
    fraisReels1: v('fraisReels1'),     fraisReels2: v('fraisReels2'),
    heuresSupExo1: v('heuresSupExo1'), heuresSupExo2: v('heuresSupExo2'),
    pen1: v('pen1'), pen2: v('pen2'),
    pensInvalidite1: v('pensInvalidite1'), pensInvalidite2: v('pensInvalidite2'),
    pensAlimRecue1: v('pensAlimRecue1'),   pensAlimRecue2: v('pensAlimRecue2'),
    bncMicro1: v('bncMicro1'), bncMicro2: v('bncMicro2'),
    bncReel1: v('bncReel1'),   bncReel2: v('bncReel2'),
    microFoncier: v('microFoncier'), foncierReel: v('foncierReel'),
    meubleClasse: v('meubleClasse'), meubleNonClasse: v('meubleNonClasse'),
    autresMeubles: v('autresMeubles'),
    jeanbrunAmort: v('jeanbrunAmort'),
    jeanbrunCategorie: _sel('jeanbrunCategorie', d.jeanbrunCategorie),
    dividendes: v('dividendes'), interets: v('interets'), pv: v('pv'),
    avProduits75: v('avProduits75'), avProduits128: v('avProduits128'),
    pfnlVerse: v('pfnlVerse'), autresRevenus: v('autresRevenus'),
    optionPFU: _sel('optionPFU', d.optionPFU),
    // Charges
    per: v('per'), perPlafondManuel: v('perPlafondManuel'),
    pensionsAlim: v('pensionsAlim'), nbBeneficiairesPA: v('nbBeneficiairesPA'),
    csgDeductible: v('csgDeductible'), autresCharges: v('autresCharges'),
    // Réductions / Crédits
    dons: v('dons'), dons7UD: v('dons7UD'),
    emploiDomicile: v('emploiDomicile'), gardeEnfants: v('gardeEnfants'),
    cotSyndicales: v('cotSyndicales'),
    fraisScolCollege: v('fraisScolCollege'),
    fraisScolLycee:   v('fraisScolLycee'),
    fraisScolSup:     v('fraisScolSup'),
    ehpadFrais: v('ehpadFrais'), ehpadNbPers: v('ehpadNbPers'),
    pinel: v('pinel'),
    girardinPD: v('girardinPD'), girardinAG: v('girardinAG'),
    // FCPI classique : retiré du moteur en D3.4 — dispositif supprimé au
    // 21/02/2026 (LF 2026). Seul FCPI-JEI subsiste (taux 30 %, family ir-pme).
    fcpiJei: v('fcpiJei'),
    fipCorse: v('fipCorse'), gfi: v('gfi'),
    // IR-PME — 7 sous-dispositifs (cf. tasks/d3.1-irpme-spec.md)
    irPme:        v('irPme'),
    irPmeEsus:    v('irPmeEsus'),
    irPmeMH:      v('irPmeMH'),
    irPmeJei:     v('irPmeJei'),
    irPmeJeii:    v('irPmeJeii'),
    irPmeJeir:    v('irPmeJeir'),
    irPmeJeiJeirImputeAnterieur: v('irPmeJeiJeirImputeAnterieur'),
    malraux: v('malraux'),               // legacy (RI directe) — UI n'expose plus ce champ
    malrauxTravaux: v('malrauxTravaux'),
    malrauxZone: _sel('malrauxZone', d.malrauxZone),
    locAvantages: v('locAvantages'),     // legacy (RI directe) — UI n'expose plus ce champ
    locAvantagesDepenses: v('locAvantagesDepenses'),
    locAvantagesPalier: _sel('locAvantagesPalier', d.locAvantagesPalier),
    sofica: v('sofica'),
    soficaTaux: _sel('soficaTaux', d.soficaTaux),
    autresReductions: v('autresReductions'),
    autresCredits: v('autresCredits'),
  };

  // Phase C3 : en mode simple, les champs marqués .advanced dans le DOM sont
  // IGNORÉS par le moteur. Leur valeur DOM est préservée (pour rebascule en
  // mode complet) mais le calcul utilise la valeur neutre de defaultInputs().
  // Source unique = le markup HTML (`.advanced` posé en C2), pas de liste
  // dupliquée à maintenir ici.
  if (document.body.classList.contains('mode-simple')) {
    const advancedNodes = document.querySelectorAll(
      '#simulateur .advanced input[id], #simulateur .advanced select[id]'
    );
    advancedNodes.forEach(el => {
      if (el.id in d) out[el.id] = d[el.id];
    });
  }
  return out;
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
function updateResults(d, input) {
  // input est optionnel pour compat ; certaines jauges (PER, Dons) ont besoin
  // de la saisie utilisateur courante pour exprimer « utilisé / plafond ».
  input = input || {};
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

  // Jauges plafonds visuelles (état ACTUEL — sans préco appliquées).
  // Pattern symétrique avec l'onglet Préco qui affiche les mêmes jauges
  // mais sur la situation PROJETÉE (detApres). Cf. Phase G.
  const donsTotalSim = (input.dons || 0) + (input.dons7UD || 0);
  setJauge('SimPer',    input.per || 0,         d.perCap || 0);
  setJauge('SimDons',   donsTotalSim,           (d.revenuNetImposable || 0) * 0.20);
  setJauge('SimPoche1', d.ri10Panier || 0,      10000);
  setJauge('SimPoche2', (d.ri10Panier || 0) + (d.ri18Panier || 0), 18000);
  // Ligne "niches perdues" affichée seulement si > 0
  const perduesRow = document.getElementById('res-niches-perdues-row');
  if (perduesRow) {
    if ((d.nichesPerdues || 0) > 0) {
      perduesRow.style.display = '';
      set('res-niches-perdues', '− ' + fmt(d.nichesPerdues));
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
    // FCPI classique (cd-rfcpi) : retiré en D3.4 — dispositif supprimé 21/02/2026.
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
  updateResults(det, input);
  updateCalcDetaille(det);
  // Met à jour aussi l'onglet préconisations (calculs uniquement, sans toucher aux inputs)
  if (typeof refreshPreconisationsCalculs === 'function') refreshPreconisationsCalculs();
}

// ─────────────────────────────────────────────
// MODE SIMPLE / COMPLET — toggle persistant
// ─────────────────────────────────────────────
// Phase C1 (infra) : toggle qui pose body.mode-simple / body.mode-complet
// et persiste le choix en localStorage. Effet visible à partir de C2
// (champs .advanced marqués) ; effet sur le calcul à partir de C3
// (getInputs filtre les .advanced en mode simple).
const MODE_STORAGE_KEY = 'wiztax.mode';

function getMode() {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'complet' ? 'complet' : 'simple';
  } catch (e) {
    return 'simple';
  }
}

function setMode(mode) {
  const m = (mode === 'complet') ? 'complet' : 'simple';
  document.body.classList.toggle('mode-simple',  m === 'simple');
  document.body.classList.toggle('mode-complet', m === 'complet');
  try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch (e) {}
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const active = btn.dataset.mode === m;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  // À partir de Phase C3, getInputs() filtre selon le mode → on doit
  // re-calculer pour refléter le nouveau périmètre. En C1/C2 c'est un
  // no-op côté résultats, mais sans coût.
  if (typeof recalculer === 'function') recalculer();
}

function initModeToggle() {
  setMode(getMode());
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
}

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Générer les form-rows IR-PME du Simulateur depuis LEVIERS_CATALOGUE
  // AVANT d'attacher les listeners (sinon les nouveaux inputs ne reçoivent
  // pas le handler de recalcul). Cf. tasks/d3.1-irpme-spec.md.
  if (typeof renderSimulateurFormRows === 'function') {
    const simIrPme = document.getElementById('simIrPme');
    if (simIrPme) renderSimulateurFormRows(simIrPme, 'ir-pme');
    // SOFICA (D3.2) : même pattern — container vide alimenté depuis le catalogue
    const simSofica = document.getElementById('simSofica');
    if (simSofica) renderSimulateurFormRows(simSofica, 'sofica');
    // FIP Corse + GFI (D3.3) : sémantique investissement, mode versement-direct
    const simFipCorse = document.getElementById('simFipCorse');
    if (simFipCorse) renderSimulateurFormRows(simFipCorse, 'fipCorse');
    const simGfi = document.getElementById('simGfi');
    if (simGfi) renderSimulateurFormRows(simGfi, 'gfi');
  }

  // Écouter tous les inputs : un seul handler (recalculer) — le périmètre
  // (mode simple vs complet) est géré par getInputs en lisant body.mode-simple.
  document.querySelectorAll('input[type="number"], input[type="checkbox"], select').forEach(el => {
    el.addEventListener('input',  recalculer);
    el.addEventListener('change', recalculer);
  });

  // Demi-part supplémentaire : afficher le select des cas seulement si cochée
  const demiPartCb = document.getElementById('demiPartSupp');
  const demiPartCasRow = document.getElementById('demiPartCasRow');
  const toggleDemiPartCas = () => {
    demiPartCasRow.style.display = demiPartCb.checked ? '' : 'none';
  };
  demiPartCb.addEventListener('change', toggleDemiPartCas);
  toggleDemiPartCas();

  // Mode simple / complet — toggle persistant (cf. tasks/option3-fusion-onglets.md)
  initModeToggle();

  // Onglet Leviers fiscaux : génération dynamique des cards depuis le catalogue
  // (Phase F3 — en construction, coexiste avec le HTML statique pendant la migration).
  if (typeof renderLeviersOnglet === 'function') {
    const auto = document.getElementById('leviersAuto');
    if (auto) renderLeviersOnglet(auto);
  }

  // Préconisations : init + listeners
  initPreconisations();

  // Dev toolbar (mode dev uniquement, voir isDevMode).
  initDevToolbar();

  // Premier calcul
  recalculer();
});

// ─────────────────────────────────────────────
// PRÉCONISATIONS — bridge UI/moteur
// ─────────────────────────────────────────────
// Petite pastille indiquant la catégorie d'un dispositif (Niche 10k /
// Niche 18k / Hors niches / Foncier). Texte coloré subtilement, fond
// uniforme gris clair — discret pour ne pas surcharger.
function renderCatBadge(cat) {
  const labels = {
    niche10: 'Niche 10k',
    niche18: 'Niche 18k',
    hors:    'Hors niches',
    foncier: 'Foncier',
  };
  const label = labels[cat];
  if (!label) return '';
  return ` <span class="preco-cat-badge preco-cat-${cat}">${label}</span>`;
}

// Quel pourcentage d'1 € saisi dans la ligne préco entre dans le panier
// niches ? Dépend du mode du levier :
//   - 'taux'         : lev.taux       (FCPI 30 %, IR-PME 25 %, etc.)
//   - 'taux-variable': option.taux    (SOFICA 30/36/48 %, Loc'Av legacy…)
//   - 'taux-libre'   : rendement × quote-part   (Girardin PD/AG)
//   - 'versement-direct' avec quote-part 1 : ratio = 1
// Utilisé par computeMaxForLevier pour ne pas surévaluer le max.
function panierRatioParInput(lev, paramValue) {
  if (lev.id === 'girardinPD') {
    const r = parseFloat(paramValue) || lev.rendementDefaut || 1.10;
    return r * 0.44;
  }
  if (lev.id === 'girardinAG') {
    const r = parseFloat(paramValue) || lev.rendementDefaut || 1.08;
    return r * 0.34;
  }
  if (lev.mode === 'taux') return lev.taux || 1;
  if (lev.mode === 'taux-variable' && lev.params && paramValue) {
    const opt = lev.params[0].options.find(o => o.value === paramValue);
    if (opt && opt.taux) return opt.taux;
  }
  return 1; // mode versement-direct : la saisie est = à la valeur de panier
}

// Calcule le maximum saisissable pour un dispositif sur une ligne préco,
// en combinant TROIS plafonds (on retient le plus restrictif) :
//   1. Plafond individuel propre au dispositif (et cumul avec l'existant
//      déjà saisi dans le Simulateur)
//   2. Place encore disponible dans le panier niches (poche 1 + poche 2
//      pour les cat. niche10/niche18). Pour Girardin sans cap individuel,
//      c'est SOUVENT cette contrainte qui domine.
//   3. Impôt restant à effacer côté Levier 2 : au-delà la réduction est
//      perdue (Pinel/FCPI/SOFICA/Malraux) ou reportable (Girardin/IR-PME/
//      dons > 20 % RNI) selon le dispositif.
// Retourne null si l'algo ne peut absolument rien chiffrer (devrait être
// rare avec cette refonte — Girardin tombe désormais sur la poche niches).
function computeMaxForLevier(lev, inputAvant, paramValue, detAvant, isCouple) {
  const existant = inputAvant[lev.inputKey] || 0;
  const POS = (v) => Math.max(0, v);

  // ─── 1. Plafond individuel du dispositif ─────────────────────────────
  let maxIndiv = Infinity;
  if (lev.id === 'per') {
    maxIndiv = POS((detAvant.perCap || 0) - existant);
  } else if (lev.id === 'ehpad') {
    maxIndiv = POS(10000 * Math.max(1, inputAvant.ehpadNbPers || 1) - existant);
  } else if (lev.id === 'emploiDom') {
    maxIndiv = POS(12000 - existant);
  } else if (lev.id === 'gardeEnf') {
    maxIndiv = POS(3500 * Math.max(1, inputAvant.nbEnfants || 1) - existant);
  } else if (lev.id === 'syndic') {
    const baseMax = ((inputAvant.sal1 || 0) + (inputAvant.sal2 || 0)
      + (inputAvant.allocChomage1 || 0) + (inputAvant.allocChomage2 || 0)
      + (inputAvant.pen1 || 0) + (inputAvant.pen2 || 0)) * 0.01;
    maxIndiv = POS(baseMax - existant);
  } else if (lev.id === 'dons7UD') {
    maxIndiv = POS(2000 - existant);
  } else if (lev.id === 'dons7UF') {
    const cap = (detAvant.revenuNetImposable || 0) * 0.20;
    const dejaUtilise = (inputAvant.dons7UD || 0) + (inputAvant.dons || 0);
    maxIndiv = POS(cap - dejaUtilise);
  } else if (lev.id === 'deficitFoncier') {
    // Cap = 10 700 € d'imputation RG − déficit foncier déjà existant
    // (valeur positive du déficit = −min(0, foncierReel)).
    const deficitExistant = -Math.min(0, inputAvant.foncierReel || 0);
    maxIndiv = POS(10000 + 700 - deficitExistant);
  } else if (lev.mode === 'jeanbrun') {
    const opt = lev.params[0].options.find(o => o.value === paramValue);
    const cap = opt ? opt.plafond : 8000;
    maxIndiv = POS(cap - existant);
  } else if (typeof PARAMS !== 'undefined' && PARAMS.plafondsDispositifs && PARAMS.plafondsDispositifs[lev.id]) {
    const cfg = PARAMS.plafondsDispositifs[lev.id];
    if (cfg.versementMax !== undefined) {
      const vMax = isCouple && cfg.versementMaxCouple !== undefined
        ? cfg.versementMaxCouple : cfg.versementMax;
      maxIndiv = POS(vMax - existant);
    } else if (cfg.depensesMax !== undefined) {
      maxIndiv = POS(cfg.depensesMax - existant);
    } else if (cfg.depensesParAnMax !== undefined) {
      maxIndiv = POS(cfg.depensesParAnMax - existant);
    }
    // Girardin : cfg n'a ni versementMax ni depensesMax → maxIndiv reste à Infinity
  }

  // ─── 2. Place restante dans le panier niches ─────────────────────────
  // Calculer la VRAIE marge pour le dispositif :
  //   - niche10 cap = 10 000 € − (niche10 déjà demandé) → les niche18 déjà
  //     présents dans la poche 1 peuvent basculer en poche 2 pour libérer
  //     la place. La contrainte est donc le total niche10, pas le total
  //     panier 1.
  //   - niche18 cap = 18 000 € − (niche10 + niche18 demandés) → bornée par
  //     la somme du panier total (poche 1 + poche 2 = 18 000).
  // Ratio saisie→panier (selon mode) appliqué pour convertir en max saisi.
  let maxNiches = Infinity;
  if (lev.cat === 'niche10' || lev.cat === 'niche18') {
    const ratio = panierRatioParInput(lev, paramValue);
    const ri10 = detAvant.ri10Panier || 0;
    const ri18 = detAvant.ri18Panier || 0;
    const panierDispo = (lev.cat === 'niche10')
      ? POS(10000 - ri10)            // marge propre niche10
      : POS(18000 - ri10 - ri18);    // marge totale niche18 (panier 1+2)
    maxNiches = ratio > 0 ? panierDispo / ratio : panierDispo;
  }
  // cat 'hors' / 'foncier' : pas de cap niches → reste Infinity.

  // ─── 3. Impôt restant à effacer (Levier 2 uniquement) ────────────────
  // L'impôt restant = impôt après application des RI déjà actives dans le
  // contexte (autres préco L2 + existant Simulateur). Le bouton max ne
  // propose jamais une valeur qui ferait basculer en surdimensionnement
  // (RI perdue ou reportable).
  let maxUtile = Infinity;
  if (lev.levier === 2) {
    const impotRestant = POS(
      (detAvant.impotApresDecote || 0)
      + (detAvant.irMobilier || 0)
      - (detAvant.reductionsAppliquees || 0)
    );
    // Taux applicable selon le mode du levier (pour convertir impôt → saisie)
    let tauxRi = null;
    if (lev.mode === 'taux') {
      tauxRi = lev.taux;
    } else if (lev.mode === 'taux-variable' && lev.params && paramValue) {
      const opt = lev.params[0].options.find(o => o.value === paramValue);
      if (opt && opt.taux) tauxRi = opt.taux;
    } else if (lev.mode === 'taux-libre') {
      tauxRi = parseFloat(paramValue) || lev.rendementDefaut || 1.10;
    } else {
      // versement-direct : taux selon dispositif
      const tauxMap = {
        dons7UD: 0.75, dons7UF: 0.66, ehpad: 0.25,
      };
      tauxRi = tauxMap[lev.id] || null;
      // Malraux et Loc'Avantages en mode versement-direct avec paramKey
      if (lev.id === 'malraux' && paramValue) {
        tauxRi = (paramValue === 'spr-oui') ? 0.30 : 0.22;
      }
      if (lev.id === 'locAvantages' && paramValue) {
        const m = { loc1: 0.15, loc2: 0.35, loc3: 0.65 };
        tauxRi = m[paramValue] || 0.15;
      }
    }
    if (tauxRi !== null && tauxRi > 0) {
      maxUtile = impotRestant / tauxRi;
    }
  }

  const result = Math.min(maxIndiv, maxNiches, maxUtile);
  return isFinite(result) ? result : null;
}

// ─────────────────────────────────────────────
// DEV TOOLBAR — outils de test (charger cas démo, vider les champs).
// Visible UNIQUEMENT en mode dev : localhost / 127.0.0.1 / fichier local,
// ou si l'URL contient ?dev (ex: https://wizify.github.io/...?dev).
// En production publique : la toolbar est cachée par isDevMode().
// ─────────────────────────────────────────────
function isDevMode() {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '') return true;
  return new URLSearchParams(location.search).has('dev');
}

const DEMO_CASE = {
  // Foyer : couple marié 2 enfants
  situation: 'marie-pacse',
  nbEnfants: 2,
  // Salaires
  sal1: 150000,
  sal2: 80000,
  // Levier 1 — base imposable
  per: 10000,
  // Levier 2 — quelques réductions pour avoir de la matière
  girardinPD: 3000,
  sofica: 5000,
  dons: 1000,
  ehpadFrais: 4000,
  // Levier 3 — crédits d'impôt
  gardeEnfants: 6000,
  emploiDomicile: 7000,
  // Revenus mobiliers + foncier pour tester PS et niches
  dividendes: 5000,
  microFoncier: 3000,
};

function initDevToolbar() {
  const toolbar = document.querySelector('.dev-toolbar');
  if (!isDevMode()) {
    if (toolbar) toolbar.style.display = 'none';
    return;
  }
  const btnLoad = document.getElementById('btnLoadDemo');
  const btnReset = document.getElementById('btnResetInputs');
  if (btnLoad) {
    btnLoad.addEventListener('click', () => {
      Object.entries(DEMO_CASE).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      recalculer();
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      // Reset = remettre tous les inputs numériques du Simulateur à 0
      // et les selects à leur 1ère option.
      document.querySelectorAll('#simulateur input[type="number"]').forEach(el => {
        el.value = el.defaultValue || 0;
      });
      document.querySelectorAll('#simulateur select').forEach(el => {
        if (el.options.length) el.selectedIndex = 0;
      });
      document.querySelectorAll('#simulateur input[type="checkbox"]').forEach(el => {
        el.checked = false;
      });
      recalculer();
    });
  }
}

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
      // Pastille catégorie uniquement (Niche 10k / 18k / Hors / Foncier).
      // Les pastilles "nature" (perdu/reportable) ont été retirées : elles
      // alourdissaient la lecture et pouvaient induire en erreur (ex :
      // "Remboursable" sur Emploi à domicile, alors qu'au-delà de 12 000 €
      // de dépenses le surplus est PERDU, pas remboursé).
      const wrap = document.createElement('span');
      wrap.innerHTML = renderCatBadge(levSelected.cat);
      while (wrap.firstChild) tdLev.appendChild(wrap.firstChild);
    }
    tr.appendChild(tdLev);

    // Montant + bouton "max" (si calculable)
    const tdMt = document.createElement('td');
    const wrapMt = document.createElement('div');
    wrapMt.className = 'preco-montant-wrap';
    const inMt = document.createElement('input');
    inMt.type = 'number';
    inMt.min = 0;
    inMt.value = p.montant || 0;
    inMt.className = 'preco-montant-input';
    inMt.addEventListener('input', () => {
      P.updateLever(p.id, 'montant', inMt.value);
      refreshPreconisationsCalculs();
    });
    wrapMt.appendChild(inMt);
    // Bouton max — visible uniquement si un levier est sélectionné ET qu'on
    // peut calculer un max (pas applicable à Girardin qui n'a pas de cap propre).
    const levSel = P.LEVIERS_CATALOGUE.find(l => l.id === p.leverId);
    if (levSel) {
      const btnMax = document.createElement('button');
      btnMax.type = 'button';
      btnMax.className = 'preco-max-btn';
      btnMax.textContent = 'max';
      btnMax.title = 'Remplir avec le maximum disponible (plafond − déjà saisi)';
      btnMax.addEventListener('click', () => {
        const ipAv = getInputs();
        const isC  = ipAv.situation === 'marie-pacse';
        // Contexte = inputs Simulateur + TOUTES les autres préco actives
        // (sauf la ligne en cours). Permet au max de tenir compte de ce qui
        // est déjà saisi ailleurs (panier niches, impôt déjà effacé, etc.).
        const stateCur = P.getState();
        const autres = stateCur.preconisations.filter(pp => pp.id !== p.id);
        const ipCtx = P.appliquerPreconisations(ipAv, autres);
        const dtCtx = calculerIR(ipCtx);
        const m = computeMaxForLevier(levSel, ipCtx, p.paramValue, dtCtx, isC);
        if (m !== null && m > 0) {
          const rounded = Math.floor(m);
          inMt.value = rounded;
          P.updateLever(p.id, 'montant', rounded);
          refreshPreconisationsCalculs();
        } else if (m !== null) {
          // max = 0 → plafond déjà atteint
          btnMax.textContent = 'atteint';
          setTimeout(() => { btnMax.textContent = 'max'; }, 1500);
        } else {
          // Pas de cap calculable (Girardin)
          btnMax.textContent = 'n/a';
          setTimeout(() => { btnMax.textContent = 'max'; }, 1500);
        }
      });
      wrapMt.appendChild(btnMax);
    }
    tdMt.appendChild(wrapMt);
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
  setText('recapEco', eco > 0 ? '− ' + fmt(eco) : fmt(eco));

  // Ligne "PS via avis IR" : s'affiche seulement si > 0. Permet de comprendre
  // pourquoi le "Final" peut être moins négatif que la somme des crédits L3
  // (les PS sur dividendes/intérêts/PV mob/foncier viennent en +).
  const psRoleVal = detApres.psRole || 0;
  const psRow = document.getElementById('recapPsRow');
  if (psRow) {
    if (psRoleVal > 0.5) {
      psRow.style.display = '';
      setText('recapPs', '+ ' + fmt(psRoleVal));
    } else {
      psRow.style.display = 'none';
    }
  }

  // Phrase de conclusion (impôt restant à payer / remboursé / effacé)
  const conclEl = document.getElementById('recapConclusion');
  if (conclEl) {
    const final = detApres.impotNet;
    if (final > 0.5) {
      conclEl.textContent = `Il restera ${fmt(final)} à payer.`;
      conclEl.className = 'recap-conclusion recap-conclusion-due';
    } else if (final < -0.5) {
      conclEl.textContent = `L'État vous remboursera ${fmt(-final)}.`;
      conclEl.className = 'recap-conclusion recap-conclusion-remb';
    } else {
      conclEl.textContent = `Impôt entièrement effacé.`;
      conclEl.className = 'recap-conclusion recap-conclusion-zero';
    }
  }

  // Pré-affichage des dispositifs déjà saisis dans le Simulateur, par section
  renderExistingByLevier(inputAvant, detAvant);

  // Indicateur "Impôt effacé" en haut à droite de la section Levier 2.
  // Format identique aux autres jauges : numérateur = ce qui est déjà
  // utilisé/effacé ; dénominateur = capacité totale.
  //   total       = impôt à effacer initialement (après L1, avant L2)
  //   effacéParL2 = ce que les RI L2 actives ont déduit (capé au total)
  const totalAEffacer = Math.max(0,
    (detL1.impotApresDecote || 0) + (detL1.irMobilier || 0)
  );
  const effaceParL2 = Math.min(totalAEffacer, detL12.reductionsAppliquees || 0);
  const indicValEl = document.getElementById('indicL2Val');
  const indicFillEl = document.getElementById('indicL2Fill');
  if (indicValEl) {
    indicValEl.textContent = fmt(effaceParL2) + ' / ' + fmt(totalAEffacer);
  }
  if (indicFillEl) {
    const pct = totalAEffacer > 0
      ? Math.min(100, (effaceParL2 / totalAEffacer) * 100)
      : 0;
    indicFillEl.style.width = pct + '%';
  }

  // Jauges des contraintes panier niches (sémantique fiscale réelle) :
  //   "Niches communes (cap 10 k€)"  = somme RI cat. niche10 demandées
  //   "Total panier (cap 18 k€)"      = niche10 + niche18 demandés
  // Plus parlant que "poche 1 / poche 2" qui mélangeait niche10 et niche18
  // dans la poche 1 et empêchait de voir qu'on pouvait encore ajouter du
  // niche10 (les niche18 basculent automatiquement en poche 2).
  setJauge('Poche1', detApres.ri10Panier || 0, 10000);
  setJauge('Poche2', (detApres.ri10Panier || 0) + (detApres.ri18Panier || 0), 18000);

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
          ? '− ' + fmt(gainMarginal)
          : gainMarginal < 0 ? '+ ' + fmt(-gainMarginal) : fmt(0);
      }
    }
    if (tdPl) {
      const ck = P.checkPlafond(p, inputAvant, detSeul, inputSeul);
      tdPl.className = 'preco-plafond ' + (ck.ok ? 'preco-ok' : 'preco-warn');
      tdPl.textContent = ck.ok ? '✓' : '⚠ ' + ck.msg;
    }
  });

  // Warnings — bandeaux par section
  const warnings = P.computeWarnings(detApres);
  ['L1', 'L2', 'L3'].forEach(s => {
    const box = document.getElementById('precoWarnings' + s);
    if (box) box.innerHTML = '';
  });
  const boxL2 = document.getElementById('precoWarningsL2');

  warnings.forEach(w => {
    if (!boxL2) return;
    if (w.type === 'surdimensionnement') return; // rendu enrichi ci-dessous
    const chip = document.createElement('div');
    chip.className = 'preco-warning preco-warning-' + w.level;
    chip.textContent = (w.level === 'info' ? 'ℹ ' : '⚠ ') + w.message;
    boxL2.appendChild(chip);
  });

  // Box "surdimensionnement" enrichie : liste les dispositifs L2 actifs
  // avec leur statut (perdu / reportable N ans). Source de vérité unique
  // pour le sort de l'excédent, à la place des pastilles par ligne.
  const surdim = warnings.find(w => w.type === 'surdimensionnement');
  if (surdim && boxL2) {
    const statusByLev = {
      girardinPD: 'Reportable 5 ans',
      girardinAG: 'Reportable 5 ans',
      irPme:      'Reportable 4 ans',
      dons7UD:    'Reportable 5 ans',
      dons7UF:    'Reportable 5 ans',
    };
    // Récupère les dispositifs L2 actifs (préco + existant Simulateur).
    const activesIds = new Set();
    state.preconisations.forEach(p => {
      const l = P.LEVIERS_CATALOGUE.find(x => x.id === p.leverId);
      if (l && l.levier === 2 && p.montant > 0) activesIds.add(l.id);
    });
    // Existants Simulateur : on regarde tous les L2 avec valeur > 0
    P.LEVIERS_CATALOGUE.forEach(l => {
      if (l.levier !== 2) return;
      const v = (inputAvant[l.inputKey] || 0)
        || (l.id === 'malraux' ? (inputAvant.malraux || 0) : 0)
        || (l.id === 'locAvantages' ? (inputAvant.locAvantages || 0) : 0);
      if (v > 0) activesIds.add(l.id);
    });
    const items = [...activesIds].map(id => {
      const l = P.LEVIERS_CATALOGUE.find(x => x.id === id);
      return { label: l.label, status: statusByLev[id] || 'Perdu' };
    });
    const box = document.createElement('div');
    box.className = 'preco-warning preco-warning-info preco-warning-surdim';
    let html = `<div class="surdim-head">ℹ ${surdim.message}</div>`;
    if (items.length) {
      html += '<ul class="surdim-list">';
      items.forEach(it => {
        const cls = it.status.startsWith('Reportable') ? 'surdim-rep' : 'surdim-perdu';
        html += `<li><span class="${cls}">${it.status}</span> · ${it.label}</li>`;
      });
      html += '</ul>';
    }
    box.innerHTML = html;
    boxL2.appendChild(box);
  }

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
  setCmp('decote', detAvant.decote,            detApres.decote, true);
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

// Affiche dans chaque section les dispositifs déjà saisis dans le Simulateur
// (input > 0), comme des lignes read-only au-dessus du bloc préconisations.
// Cette fonction reconstruit les tbody "existing" à chaque refresh — pas
// d'interaction utilisateur sur ces lignes donc pas de souci de focus.
function renderExistingByLevier(inputAvant, detAvant) {
  if (typeof window.PRECONISATIONS === 'undefined') return;
  const P = window.PRECONISATIONS;
  const tbodies = {
    1: document.getElementById('precoExistingL1'),
    2: document.getElementById('precoExistingL2'),
    3: document.getElementById('precoExistingL3'),
  };
  if (!tbodies[1] || !tbodies[2] || !tbodies[3]) return;
  Object.values(tbodies).forEach(t => { t.innerHTML = ''; });

  // Description des dispositifs : libellé, levier, clé d'input, effet IR
  // (cherché dans det après application des charges/réductions/crédits) et
  // paramètre additionnel (palier Loc'Avantages, zone Malraux, etc.).
  const items = [
    { id: 'per',         levier: 1, inputKey: 'per',                  label: 'PER',                    effet: () => (detAvant.per || 0) * (detAvant.tmi || 0), param: null },
    { id: 'jeanbrun',    levier: 1, inputKey: 'jeanbrunAmort',        label: 'Amortissement Jeanbrun', effet: () => null, param: () => inputAvant.jeanbrunCategorie },
    // Déficit foncier : input.foncierReel < 0 (montant affiché en valeur absolue)
    { id: 'deficitFoncier', levier: 1, inputKey: '__deficitFoncierVirtuel',
      label: 'Déficit foncier',
      // On force val > 0 si foncier négatif
      effet: () => null, param: null,
      isDeficit: true },
    { id: 'dons7UD',     levier: 2, inputKey: 'dons7UD',              label: 'Dons Coluche 75 %',     effet: () => {
      const v = inputAvant.dons7UD || 0;
      return Math.min(v, 2000) * 0.75 + Math.max(0, v - 2000) * 0.66;
    }, param: null },
    { id: 'dons7UF',     levier: 2, inputKey: 'dons',                 label: 'Dons 66 %',             effet: () => (inputAvant.dons || 0) * 0.66, param: null },
    { id: 'ehpad',       levier: 2, inputKey: 'ehpadFrais',           label: 'EHPAD',                 effet: () => detAvant.redEhpad, param: null },
    { id: 'malraux',     levier: 2, inputKey: 'malrauxTravaux',       label: 'Malraux',               effet: () => detAvant.redMalraux, param: () => inputAvant.malrauxZone, fallback: 'malraux' },
    { id: 'fcpiJei',     levier: 2, inputKey: 'fcpiJei',              label: 'FCPI JEI',              effet: () => detAvant.redFcpiJei, param: null },
    { id: 'fipCorse',    levier: 2, inputKey: 'fipCorse',             label: 'FIP Corse',             effet: () => detAvant.redFipCorse, param: null },
    { id: 'irPme',       levier: 2, inputKey: 'irPme',                label: 'IR-PME',                effet: () => detAvant.redIrPme, param: null },
    { id: 'gfi',         levier: 2, inputKey: 'gfi',                  label: 'GFI',                   effet: () => detAvant.redGfi, param: null },
    { id: 'locAvantages',levier: 2, inputKey: 'locAvantagesDepenses', label: "Loc'Avantages",         effet: () => detAvant.redLocAvantages, param: () => inputAvant.locAvantagesPalier, fallback: 'locAvantages' },
    { id: 'sofica',      levier: 2, inputKey: 'sofica',               label: 'SOFICA',                effet: () => detAvant.redSofica, param: null },
    { id: 'girardinPD',  levier: 2, inputKey: 'girardinPD',           label: 'Girardin PD',           effet: () => detAvant.redGirardinPD, param: null },
    { id: 'girardinAG',  levier: 2, inputKey: 'girardinAG',           label: 'Girardin AG',           effet: () => detAvant.redGirardinAG, param: null },
    { id: 'emploiDom',   levier: 3, inputKey: 'emploiDomicile',       label: 'Emploi à domicile',     effet: () => detAvant.credDomicile, param: null },
    { id: 'gardeEnf',    levier: 3, inputKey: 'gardeEnfants',         label: 'Garde enfants',         effet: () => detAvant.credGarde, param: null },
    { id: 'syndic',      levier: 3, inputKey: 'cotSyndicales',        label: 'Cotisations syndicales',effet: () => detAvant.credSyndic, param: null },
  ];

  items.forEach(it => {
    // Cas particulier déficit foncier : il vit comme un foncierReel < 0.
    // On l'affiche en valeur positive si présent.
    let val;
    if (it.isDeficit) {
      const fr = inputAvant.foncierReel || 0;
      val = fr < 0 ? -fr : 0;
    } else {
      val = (inputAvant[it.inputKey] || 0)
        || (it.fallback ? (inputAvant[it.fallback] || 0) : 0);
    }
    if (val <= 0) return;
    const tr = document.createElement('tr');
    tr.className = 'preco-row-existing';

    const tdLab = document.createElement('td');
    const catLev = P.LEVIERS_CATALOGUE.find(l => l.id === it.id);
    const badges = catLev ? renderCatBadge(catLev.cat) : '';
    tdLab.innerHTML = `<span class="preco-existing-marker">✓ déjà saisi</span> ${it.label}${badges}`;
    tr.appendChild(tdLab);

    const tdMt = document.createElement('td');
    tdMt.textContent = fmt(val);
    tr.appendChild(tdMt);

    const tdParam = document.createElement('td');
    const paramVal = it.param ? it.param() : null;
    tdParam.textContent = paramVal || '—';
    tr.appendChild(tdParam);

    const tdEff = document.createElement('td');
    const eff = it.effet ? it.effet() : null;
    tdEff.textContent = (eff !== null && eff !== undefined && eff > 0) ? '− ' + fmt(eff) : '—';
    tr.appendChild(tdEff);

    const tdPl = document.createElement('td');
    tdPl.className = 'preco-plafond preco-ok';
    tdPl.textContent = '✓';
    tr.appendChild(tdPl);

    const tdEmpty = document.createElement('td');
    tr.appendChild(tdEmpty);

    tbodies[it.levier].appendChild(tr);
  });

  // Cacher les tbody vides pour ne pas générer de bordures inutiles
  Object.values(tbodies).forEach(tb => {
    tb.style.display = tb.children.length ? '' : 'none';
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

