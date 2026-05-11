/**
 * Harness 100 cas — vérification du calcul IR + préconisations.
 *
 * Stratégie :
 *  1. ORACLE indépendant qui recalcule l'IR pas à pas, structuré différemment
 *     de calculator.js (pour ne pas copier ses éventuels bugs).
 *  2. PRNG seedé (reproductible) génère 100 profils diversifiés.
 *  3. Diff oracle vs calculator (champ par champ).
 *  4. Property tests : invariants math/fiscaux.
 *  5. Préconisations : delta après application doit matcher l'avantage attendu.
 *
 * Usage : node tests/run100.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const paramsSrc = fs.readFileSync(path.join(ROOT, 'js/params.js'), 'utf8');
const calculatorSrc = fs.readFileSync(path.join(ROOT, 'js/calculator.js'), 'utf8');
const { LEVIERS_CATALOGUE, appliquerPreconisations, avantageEstime } =
  require('../js/preconisations.js');

const ctx = vm.createContext({});
vm.runInContext(paramsSrc, ctx, { filename: 'params.js' });
vm.runInContext(calculatorSrc, ctx, { filename: 'calculator.js' });
const PARAMS = ctx.PARAMS;

const calc = (input) =>
  vm.runInContext('calculerIR(' + JSON.stringify(input) + ')', ctx);

// =====================================================================
// PRNG seedé (mulberry32) — reproductibilité
// =====================================================================
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(424242);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randPick = (arr) => arr[Math.floor(rand() * arr.length)];

// =====================================================================
// Input par défaut (calque sur tests/cases.js makeInput)
// =====================================================================
function makeInput(o = {}) {
  return Object.assign({
    situation: 'celibataire', nbEnfants: 0, gardeAlternee: 0,
    parentIsole: false, demiPartSupp: false, demiPartCas: 'L',
    sal1: 0, sal2: 0, allocChomage1: 0, allocChomage2: 0,
    fraisReels1: 0, fraisReels2: 0, heuresSupExo1: 0, heuresSupExo2: 0,
    pen1: 0, pen2: 0, pensInvalidite1: 0, pensInvalidite2: 0,
    pensAlimRecue1: 0, pensAlimRecue2: 0,
    bncMicro1: 0, bncMicro2: 0, bncReel1: 0, bncReel2: 0,
    microFoncier: 0, foncierReel: 0,
    meubleClasse: 0, meubleNonClasse: 0, autresMeubles: 0,
    jeanbrunAmort: 0, jeanbrunCategorie: 'intermediaire',
    dividendes: 0, interets: 0, pv: 0,
    avProduits75: 0, avProduits128: 0, pfnlVerse: 0,
    optionPFU: 'pfu', autresRevenus: 0,
    per: 0, perPlafondManuel: 0, pensionsAlim: 0, nbBeneficiairesPA: 0,
    csgDeductible: 0, autresCharges: 0,
    dons: 0, dons7UD: 0, pinel: 0, girardinPD: 0, girardinAG: 0,
    fcpi: 0, fcpiJei: 0, fipCorse: 0, gfi: 0, irPme: 0,
    malraux: 0, locAvantages: 0, sofica: 0, autresReductions: 0,
    emploiDomicile: 0, gardeEnfants: 0, cotSyndicales: 0,
    fraisScolCollege: 0, fraisScolLycee: 0, fraisScolSup: 0,
    ehpadFrais: 0, ehpadNbPers: 1, autresCredits: 0,
  }, o);
}

// =====================================================================
// ORACLE — calcul IR indépendant
// Stratégie volontairement différente : tranches hardcodées, fonctions
// nommées séparément, ordre d'opérations explicite.
// =====================================================================

const TRANCHES = [
  [0,      11600,  0.00],
  [11600,  29579,  0.11],
  [29579,  84577,  0.30],
  [84577,  181917, 0.41],
  [181917, Infinity, 0.45],
];

function oracleBareme(quotient) {
  if (quotient <= 0) return 0;
  let ir = 0;
  for (const [lo, hi, taux] of TRANCHES) {
    if (quotient <= lo) break;
    ir += (Math.min(quotient, hi) - lo) * taux;
  }
  return ir;
}

function oracleTMI(quotient) {
  for (let i = TRANCHES.length - 1; i >= 0; i--) {
    if (quotient > TRANCHES[i][0]) return TRANCHES[i][2];
  }
  return 0;
}

function oracleParts(input) {
  const sit = input.situation;
  let base = (sit === 'marie-pacse') ? 2 : 1;
  if (sit === 'veuf' && input.nbEnfants > 0) base = 2;

  const n = input.nbEnfants;
  const enf = (n <= 2) ? n * 0.5 : 1 + (n - 2);

  const g = input.gardeAlternee;
  const alt = (g <= 2) ? g * 0.25 : 0.5 + (g - 2) * 0.5;

  const pi = input.parentIsole ? 0.5 : 0;
  const dps = input.demiPartSupp ? 0.5 : 0;

  return { total: base + enf + alt + pi + dps, base };
}

function oracleAbatSal(rev, fr) {
  if (fr > 0) return fr;
  if (rev <= 0) return 0;
  return Math.max(509, Math.min(rev * 0.10, 14555));
}

function oracleAbatPen(t1, t2) {
  const a1 = t1 > 0 ? Math.max(454, t1 * 0.10) : 0;
  const a2 = t2 > 0 ? Math.max(454, t2 * 0.10) : 0;
  return Math.min(4439, a1 + a2);
}

function oracleAbatBNC(rev) {
  if (rev <= 0) return 0;
  return Math.max(305, rev * 0.34);
}

function oracleCalc(input) {
  const i = input;

  // --- Étape 1 : revenu brut global ---
  const hsExoP = 7500;
  const hs1 = Math.max(0, (i.heuresSupExo1 || 0) - hsExoP);
  const hs2 = Math.max(0, (i.heuresSupExo2 || 0) - hsExoP);
  const ts1 = i.sal1 + (i.allocChomage1 || 0) + hs1;
  const ts2 = i.sal2 + (i.allocChomage2 || 0) + hs2;
  const salNet = (ts1 - oracleAbatSal(ts1, i.fraisReels1 || 0))
               + (ts2 - oracleAbatSal(ts2, i.fraisReels2 || 0));

  const tp1 = i.pen1 + (i.pensInvalidite1 || 0) + (i.pensAlimRecue1 || 0);
  const tp2 = i.pen2 + (i.pensInvalidite2 || 0) + (i.pensAlimRecue2 || 0);
  const penNet = (tp1 + tp2) - oracleAbatPen(tp1, tp2);

  const bncMicroNet = (i.bncMicro1 - oracleAbatBNC(i.bncMicro1))
                    + (i.bncMicro2 - oracleAbatBNC(i.bncMicro2));
  const bncReelNet = i.bncReel1 + i.bncReel2;

  const microFoncierNet = i.microFoncier * 0.70;

  // Jeanbrun
  const jbCat = i.jeanbrunCategorie || 'intermediaire';
  const jbPlaf = jbCat === 'tres-social' ? 12000
               : jbCat === 'social'      ? 10000 : 8000;
  const jbAmort = Math.min(i.jeanbrunAmort || 0, jbPlaf);

  const foncAvant = i.foncierReel - jbAmort;
  const foncierReelNet = foncAvant >= 0
    ? foncAvant
    : Math.max(foncAvant, -10700);

  const meuClNet = i.meubleClasse * 0.50;
  const meuNcNet = i.meubleNonClasse * 0.70;
  const autMeuNet = (i.autresMeubles || 0) * 0.50;

  const isPFU = i.optionPFU === 'pfu';
  const divNet = isPFU ? 0 : i.dividendes * 0.60;
  const intNet = isPFU ? 0 : (i.interets || 0);
  const pvNet  = isPFU ? 0 : i.pv;

  const rbg = salNet + penNet + bncMicroNet + bncReelNet
            + microFoncierNet + foncierReelNet
            + meuClNet + meuNcNet + autMeuNet
            + divNet + intNet + pvNet
            + i.autresRevenus;

  // --- Étape 2 : revenu net imposable ---
  // PER : plafond INDIVIDUEL par déclarant (art. 163 quatervicies CGI),
  // plancher 4 710 € chacun, plafonds additionnés en mutualisation.
  const isCoupleForPER = i.situation === 'marie-pacse';
  const revPro1 = i.sal1 + (i.allocChomage1 || 0) + (i.heuresSupExo1 || 0)
                + i.bncMicro1 + i.bncReel1;
  const revPro2 = i.sal2 + (i.allocChomage2 || 0) + (i.heuresSupExo2 || 0)
                + i.bncMicro2 + i.bncReel2;
  const perCapOf = r => Math.max(4710, Math.min(r * 0.10, 37680));
  const perCapAuto = perCapOf(revPro1) + (isCoupleForPER ? perCapOf(revPro2) : 0);
  const perCap = (i.perPlafondManuel || 0) > 0 ? i.perPlafondManuel : perCapAuto;
  const perDed = Math.min(i.per, perCap);

  const paCap = i.nbBeneficiairesPA > 0
    ? i.nbBeneficiairesPA * 6674
    : rbg;
  const pensionsAlim = Math.min(i.pensionsAlim, paCap);

  const rni = Math.max(0, rbg - perDed - pensionsAlim - i.csgDeductible - i.autresCharges);

  // --- Étape 3-4 : QF + plafonnement ---
  const parts = oracleParts(i);
  const qf = parts.total > 0 ? rni / parts.total : 0;
  const irParPart = oracleBareme(qf);
  const impotBrut = Math.round(irParPart * parts.total);

  const qfBase = parts.base > 0 ? rni / parts.base : 0;
  const irPartBase = oracleBareme(qfBase);
  const impotBrutBase = Math.round(irPartBase * parts.base);

  const avantageQF = impotBrutBase - impotBrut;
  const demiPartsSupp = (parts.total - parts.base) * 2;

  let plafondDPS = 0;
  if (i.demiPartSupp) {
    if (i.demiPartCas === 'L') plafondDPS = 1079;
    else if (i.demiPartCas === 'G') plafondDPS = Infinity;
    else plafondDPS = 1807;
  }
  const dpsStandard = demiPartsSupp - (i.demiPartSupp ? 1 : 0);

  let plafondQF;
  if (i.parentIsole && i.nbEnfants > 0) {
    plafondQF = 4262 + Math.max(0, dpsStandard - 2) * 1807 + plafondDPS;
  } else {
    plafondQF = dpsStandard * 1807 + plafondDPS;
  }

  const supplementQF = Math.max(0, avantageQF - plafondQF);
  const impotApresQF = impotBrut + supplementQF;

  // --- Étape 5 : décote ---
  const isCouple = i.situation === 'marie-pacse';
  const seuilDec = isCouple ? 3277 : 1982;
  const plafDec = isCouple ? 1483 : 897;
  const decote = impotApresQF < seuilDec
    ? Math.max(0, plafDec - impotApresQF * 0.4525)
    : 0;
  const impotApresDecote = Math.max(0, impotApresQF - decote);

  // --- Étape 6 : PFU mobilier ---
  const irMobilier = isPFU
    ? (i.dividendes + (i.interets || 0) + i.pv) * 0.128
    : 0;

  // --- 6bis : AV > 8 ans ---
  const av75 = i.avProduits75 || 0;
  const av128 = i.avProduits128 || 0;
  const avAbat = isCouple ? 9200 : 4600;
  const ab128 = Math.min(av128, avAbat);
  const ab75 = Math.min(av75, avAbat - ab128);
  const irAV = (av128 - ab128) * 0.128 + (av75 - ab75) * 0.075;
  // PFNL AV prélevé à la source (régime par défaut depuis 2018)
  const pfnlAV = av75 * 0.075 + av128 * 0.128;
  const avProduits = av75 + av128;

  // --- Étape 7 : PS ---
  // PS recouvrés via avis (intégrés à l'impôt à payer).
  // Pour les RCM (dividendes/intérêts), le PFNL bancaire (2CK) ne couvre
  // que la part IR — la part PS reste donc due côté avis IR.
  const psDividendes = i.dividendes * 0.186;
  const psInterets   = (i.interets || 0) * 0.186;
  const psPV         = i.pv * 0.186;
  const fonciersNets = microFoncierNet + foncierReelNet + meuClNet + meuNcNet + autMeuNet;
  const psFoncier    = Math.max(0, fonciersNets) * 0.186;
  const psRole       = psDividendes + psInterets + psPV + psFoncier;
  // PS prélevés à la source ET libératoires (info, exclus de l'impôt à payer)
  // AV reste à 17,2 % — non concernée par la CFA LFSS 2026.
  const psAV         = avProduits * 0.172;
  const psSource     = psAV;
  const totalPS      = psSource + psRole;

  // --- Étape 8 : réductions ---
  const d7UD = i.dons7UD || 0;
  const d7UF = i.dons || 0;
  const plafRNI = rni * 0.20;
  const b75 = Math.min(d7UD, 2000);
  const surplus = Math.max(0, d7UD - 2000);
  const b75Cap = Math.min(b75, plafRNI);
  const b66Cap = Math.min(surplus + d7UF, Math.max(0, plafRNI - b75Cap));
  const redDons = b75Cap * 0.75 + b66Cap * 0.66;

  const fraisScol = (i.fraisScolCollege || 0) * 61
                  + (i.fraisScolLycee || 0) * 153
                  + (i.fraisScolSup || 0) * 183;

  const ehNbP = Math.max(1, i.ehpadNbPers || 1);
  const ehBase = Math.min(i.ehpadFrais || 0, 10000 * ehNbP);
  const redEhpad = ehBase * 0.25;

  // Caps individuels (aligné sur calculator.js — versementMax × tauxMax)
  // Couple : SOFICA = 18 000 × 48 % = 8 640 (pas de différence single/couple).
  const couple = i.situation === 'marie-pacse';
  const cv = (single, c) => couple && c !== undefined ? c : single;
  // SOFICA double plafond : min(18 000, 25 % RNG) × 48 %
  const versSoficaEff = Math.min(18000, rni * 0.25);
  const capSofica   = versSoficaEff * 0.48;
  const capFCPI     = cv(12000, 24000) * 0.18;       // 2 160 / 4 320
  const capFcpiJei  = cv(12000, 24000) * 0.30;       // 3 600 / 7 200
  const capFipCorse = cv(12000, 24000) * 0.30;       // 3 600 / 7 200
  const capIrPme    = cv(50000, 100000) * 0.25;      // 12 500 / 25 000
  const capGfi      = cv(50000, 100000) * 0.18;      //  9 000 / 18 000
  const capMalraux  = 100000 * 0.30;                 // 30 000
  const capLocAv    = 10000 * 0.65;                  //  6 500

  // Malraux — mode "travaux + zone" prioritaire, sinon fallback legacy
  let redMalraux;
  if ((i.malrauxTravaux || 0) > 0) {
    const tauxMalrauxZone = { 'spr-non': 0.22, 'spr-oui': 0.30 };
    const zone = i.malrauxZone || 'spr-non';
    const travRet = Math.min(i.malrauxTravaux, 100000);
    redMalraux = travRet * (tauxMalrauxZone[zone] || tauxMalrauxZone['spr-non']);
  } else {
    redMalraux = Math.min(i.malraux || 0, capMalraux);
  }

  const redPinel = i.pinel;                                   // pas de cap V1
  const redGirPD = i.girardinPD;                              // pas de cap (panier majoré)
  const redGirAG = i.girardinAG;
  const redFCPI = Math.min(i.fcpi || 0,         capFCPI);
  const redFcpiJei = Math.min(i.fcpiJei || 0,   capFcpiJei);
  const redFipCorse = Math.min(i.fipCorse || 0, capFipCorse);
  const redGfi = Math.min(i.gfi || 0,           capGfi);
  const redIrPme = Math.min(i.irPme || 0,       capIrPme);
  // Loc'Avantages — mode "dépenses + palier" prioritaire, sinon fallback legacy
  let redLocAv;
  if ((i.locAvantagesDepenses || 0) > 0) {
    const tauxLocAv = { loc1: 0.15, loc2: 0.35, loc3: 0.65 };
    const palier = i.locAvantagesPalier || 'loc1';
    const depRet = Math.min(i.locAvantagesDepenses, 10000);
    redLocAv = depRet * (tauxLocAv[palier] || tauxLocAv.loc1);
  } else {
    redLocAv = Math.min(i.locAvantages || 0, capLocAv);
  }
  const redSofica = Math.min(i.sofica || 0,     capSofica);
  const redAutres = i.autresReductions;

  const totalReductions = redDons + redPinel + redGirPD + redGirAG
    + redFCPI + redFcpiJei + redFipCorse + redGfi + redIrPme + redLocAv
    + redSofica + redAutres;

  // --- Étape 9 : crédits ---
  const credDom = Math.min(i.emploiDomicile, 12000) * 0.50;
  const gardeMax = 3500 * Math.max(1, i.nbEnfants);
  const credGarde = Math.min(i.gardeEnfants, gardeMax) * 0.50;
  const credAutres = i.autresCredits;
  const totalCredits = credDom + credGarde + credAutres;

  const baseSyndMax = (i.sal1 + i.sal2
    + (i.allocChomage1 || 0) + (i.allocChomage2 || 0)
    + i.pen1 + i.pen2
    + (i.pensInvalidite1 || 0) + (i.pensInvalidite2 || 0)) * 0.01;
  const cotSynd = Math.min(i.cotSyndicales || 0, baseSyndMax);
  const credSynd = cotSynd * 0.66;

  // --- Étape 10 : niches — 2 POCHES (art. 200-0 A CGI) ---
  // Poche 1 (10 000 €) : accessible à tous (niche10 + niche18)
  // Poche 2 (+8 000 €) : RÉSERVÉE aux niche18 (Girardin × quote-part + SOFICA)
  const ri10Panier = redPinel
    + redFCPI + redFcpiJei + redFipCorse + redGfi + redIrPme
    + redLocAv + redAutres
    + credDom + credGarde + credAutres;
  const ri18Panier = redGirPD * 0.44 + redGirAG * 0.34 + redSofica;

  const poche1_10 = Math.min(ri10Panier, 10000);
  const restePoche1 = 10000 - poche1_10;
  const poche1_18 = Math.min(ri18Panier, restePoche1);
  const surplus_10 = ri10Panier - poche1_10;
  const surplus_18 = ri18Panier - poche1_18;
  const poche2_18 = Math.min(surplus_18, 8000);
  const perdu_18 = surplus_18 - poche2_18;

  const nichesUt = ri10Panier + ri18Panier;
  const plafNiches = ri18Panier > 0 ? 18000 : 10000;
  const depass = surplus_10 + perdu_18;

  const facteur10 = ri10Panier > 0 ? poche1_10 / ri10Panier : 1;
  const facteur18 = ri18Panier > 0 ? (poche1_18 + poche2_18) / ri18Panier : 1;

  // --- Étape 11 : impôt net ---
  const redNiche10Retenue = (redPinel + redFCPI + redFcpiJei + redFipCorse
    + redGfi + redIrPme + redLocAv + redAutres) * facteur10;
  const redNiche18Retenue = (redGirPD + redGirAG + redSofica) * facteur18;

  const redApp = Math.min(
    impotApresDecote + irMobilier,
    redDons + fraisScol + redEhpad + redMalraux
    + redNiche10Retenue + redNiche18Retenue
  );

  const credEff = (credDom + credGarde + credAutres) * facteur10;

  const pfnl = i.pfnlVerse || 0;

  let impotNet = Math.max(0,
    impotApresDecote + irMobilier + irAV - redApp
  ) - credEff - credSynd + psRole - pfnl - pfnlAV;

  // --- RFR / CEHR ---
  // Salaires / pensions retenus NETS d'abattement 10 %. Heures sup exonérées
  // (≤ 7 500 €) réintégrées explicitement. Les charges déductibles (PER,
  // pensions alim, CSG déductible, autres) NE réduisent PAS le RFR.
  const hsExoRFR1 = Math.min(i.heuresSupExo1 || 0, 7500);
  const hsExoRFR2 = Math.min(i.heuresSupExo2 || 0, 7500);
  const rfr = Math.max(0,
    salNet + hsExoRFR1 + hsExoRFR2
    + penNet
    + i.bncMicro1 + i.bncMicro2 + i.bncReel1 + i.bncReel2
    + i.microFoncier + foncierReelNet
    + i.meubleClasse + i.meubleNonClasse + (i.autresMeubles || 0)
    + i.dividendes + (i.interets || 0) + i.pv
    + (i.avProduits75 || 0) + (i.avProduits128 || 0)
    + i.autresRevenus
  );

  const cs1 = isCouple ? 500000 : 250000;
  const cs2 = isCouple ? 1000000 : 500000;
  let cehr = 0;
  if (rfr > cs1) cehr += (Math.min(rfr, cs2) - cs1) * 0.03;
  if (rfr > cs2) cehr += (rfr - cs2) * 0.04;
  impotNet += cehr;

  const qfTMI = supplementQF > 0 ? qfBase : qf;
  const tmi = oracleTMI(qfTMI);

  return {
    revenuBrutGlobal: rbg,
    revenuNetImposable: rni,
    parts: parts.total,
    quotientFamilial: qf,
    impotBrut, avantageQF, plafondQF, supplementQF,
    impotApresQF, decote, impotApresDecote,
    irMobilier, irAV, totalPS,
    redDons, totalReductions, totalCredits,
    nichesUtilisees: nichesUt, plafondNiches: plafNiches, depassementNiches: depass,
    cehr, revenuReference: rfr,
    impotNet, tmi,
  };
}

// =====================================================================
// GÉNÉRATEUR DE PROFILS DIVERSIFIÉS
// =====================================================================
function generateProfile(idx) {
  const profile = makeInput();
  profile.__name = `Cas #${idx + 1}`;

  // Situation familiale
  profile.situation = randPick(['celibataire', 'celibataire', 'marie-pacse', 'marie-pacse', 'divorce-separe', 'veuf']);
  profile.nbEnfants = randInt(0, 4);
  if (profile.situation === 'celibataire' || profile.situation === 'divorce-separe' || profile.situation === 'veuf') {
    profile.parentIsole = profile.nbEnfants > 0 && rand() < 0.4;
  }
  if (profile.nbEnfants > 0 && rand() < 0.2) {
    profile.gardeAlternee = randInt(1, Math.min(3, profile.nbEnfants));
    profile.nbEnfants = Math.max(0, profile.nbEnfants - profile.gardeAlternee);
  }
  if (rand() < 0.15) {
    profile.demiPartSupp = true;
    profile.demiPartCas = randPick(['L', 'P', 'F', 'W']);
  }

  // Revenus principaux : on choisit un "régime" pour avoir de la diversité
  const regime = randPick(['low-sal', 'mid-sal', 'high-sal', 'pension', 'mixed', 'foncier-heavy', 'finance-heavy']);
  switch (regime) {
    case 'low-sal':
      profile.sal1 = randInt(8000, 25000);
      if (profile.situation === 'marie-pacse') profile.sal2 = randInt(0, 20000);
      break;
    case 'mid-sal':
      profile.sal1 = randInt(25000, 60000);
      if (profile.situation === 'marie-pacse') profile.sal2 = randInt(15000, 45000);
      break;
    case 'high-sal':
      profile.sal1 = randInt(80000, 250000);
      if (profile.situation === 'marie-pacse') profile.sal2 = randInt(20000, 100000);
      break;
    case 'pension':
      profile.pen1 = randInt(15000, 45000);
      if (profile.situation === 'marie-pacse') profile.pen2 = randInt(10000, 30000);
      break;
    case 'mixed':
      profile.sal1 = randInt(20000, 70000);
      profile.bncMicro1 = randInt(0, 20000);
      profile.microFoncier = randInt(0, 15000);
      break;
    case 'foncier-heavy':
      profile.sal1 = randInt(30000, 80000);
      if (rand() < 0.5) {
        profile.foncierReel = randInt(-15000, 25000);
      } else {
        profile.microFoncier = randInt(2000, 14000);
      }
      profile.meubleClasse = rand() < 0.3 ? randInt(5000, 50000) : 0;
      profile.meubleNonClasse = rand() < 0.3 ? randInt(2000, 14000) : 0;
      profile.autresMeubles = rand() < 0.3 ? randInt(5000, 50000) : 0;
      break;
    case 'finance-heavy':
      profile.sal1 = randInt(40000, 120000);
      profile.dividendes = randInt(0, 30000);
      profile.interets = randInt(0, 5000);
      profile.pv = randInt(0, 50000);
      profile.optionPFU = randPick(['pfu', 'bareme']);
      profile.avProduits75 = rand() < 0.3 ? randInt(1000, 8000) : 0;
      profile.avProduits128 = rand() < 0.2 ? randInt(500, 5000) : 0;
      break;
  }

  // Add-ons aléatoires
  if (rand() < 0.15) profile.allocChomage1 = randInt(2000, 15000);
  if (rand() < 0.10) profile.heuresSupExo1 = randInt(2000, 12000);
  if (rand() < 0.10) profile.fraisReels1 = randInt(2500, 12000);
  if (rand() < 0.08) profile.pensInvalidite1 = randInt(2000, 15000);
  if (rand() < 0.10 && profile.nbEnfants > 0) profile.pensAlimRecue1 = randInt(1000, 8000);

  // Charges déductibles
  if (rand() < 0.20) profile.per = randInt(1000, 15000);
  if (rand() < 0.10) {
    profile.pensionsAlim = randInt(2000, 8000);
    profile.nbBeneficiairesPA = randInt(0, 2);
  }
  if (rand() < 0.05) profile.csgDeductible = randInt(500, 4000);

  // Réductions / crédits — diversification
  const aleas = rand();
  if (aleas < 0.08) profile.dons7UD = randInt(100, 4000);
  if (rand() < 0.08) profile.dons = randInt(100, 3000);
  if (rand() < 0.05) profile.pinel = randInt(2000, 10000);
  if (rand() < 0.04) profile.girardinPD = randInt(1000, 6000);
  if (rand() < 0.03) profile.sofica = randInt(500, 5000);
  if (rand() < 0.06) profile.fcpiJei = randInt(200, 2000);
  if (rand() < 0.05) profile.malraux = randInt(1000, 6000);

  // Crédits
  if (rand() < 0.15) profile.emploiDomicile = randInt(500, 14000);
  if (rand() < 0.08 && profile.nbEnfants > 0) profile.gardeEnfants = randInt(500, 4000);
  if (rand() < 0.05) profile.cotSyndicales = randInt(100, 600);
  if (rand() < 0.04) {
    profile.ehpadFrais = randInt(3000, 15000);
    profile.ehpadNbPers = randInt(1, 2);
  }
  if (rand() < 0.05) profile.fraisScolCollege = randInt(1, 3);
  if (rand() < 0.04) profile.fraisScolLycee = randInt(1, 2);
  if (rand() < 0.03) profile.fraisScolSup = randInt(1, 2);

  // Cas extrêmes / corners (10% des cas)
  if (rand() < 0.05) {
    profile.sal1 = randInt(300000, 800000);
    profile.dividendes = randInt(0, 50000);
  }
  if (rand() < 0.03) {
    profile.foncierReel = randInt(-20000, -1000); // déficit foncier
  }
  if (rand() < 0.03) {
    profile.pfnlVerse = randInt(500, 4000);
  }

  return profile;
}

// =====================================================================
// COMPARAISON / DIFF
// =====================================================================
const TOL = 1.0; // ±1 €

function diff(actual, expected) {
  const errs = [];
  for (const [k, exp] of Object.entries(expected)) {
    const got = actual[k];
    if (k === 'tmi') {
      if (got !== exp) errs.push(`${k}: oracle=${exp}, calc=${got}`);
    } else if (typeof exp === 'number') {
      if (!Number.isFinite(exp) || !Number.isFinite(got)) {
        if (exp !== got) errs.push(`${k}: oracle=${exp}, calc=${got}`);
      } else if (Math.abs(got - exp) > TOL) {
        errs.push(`${k}: oracle=${Math.round(exp * 100) / 100}, calc=${Math.round(got * 100) / 100} (Δ=${Math.round((got - exp) * 100) / 100})`);
      }
    }
  }
  return errs;
}

// =====================================================================
// PROPERTY TESTS
// =====================================================================
function checkInvariants(input, result) {
  const errs = [];
  // 1. RNI >= 0
  if (result.revenuNetImposable < 0) errs.push(`RNI < 0 (${result.revenuNetImposable})`);
  // 2. impotApresDecote >= 0
  if (result.impotApresDecote < -0.01) errs.push(`impotApresDecote < 0 (${result.impotApresDecote})`);
  // 3. décote ≥ 0
  if (result.decote < 0) errs.push(`decote < 0 (${result.decote})`);
  // 4. décote == 0 si impotApresQF >= seuil
  const isCouple = input.situation === 'marie-pacse';
  const seuilDec = isCouple ? 3277 : 1982;
  if (result.impotApresQF >= seuilDec && result.decote > 0.01) {
    errs.push(`décote=${result.decote} alors qu'impotApresQF=${result.impotApresQF} >= seuil ${seuilDec}`);
  }
  // 5. PS foncier ≥ 0
  if (result.psFoncier < 0) errs.push(`psFoncier < 0`);
  // 6. PS mobilier ≈ 18.6% × (div + int + pv) [hors AV]
  const expPSMob = (input.dividendes + (input.interets || 0) + input.pv) * 0.186;
  if (Math.abs(result.psMobilier - expPSMob) > 0.5) {
    errs.push(`psMobilier=${result.psMobilier} ≠ ${expPSMob}`);
  }
  // 7. PS AV = 17.2% × (av75 + av128)
  const expPSAV = ((input.avProduits75 || 0) + (input.avProduits128 || 0)) * 0.172;
  if (Math.abs(result.psAV - expPSAV) > 0.5) {
    errs.push(`psAV=${result.psAV} ≠ ${expPSAV}`);
  }
  // 8. Parts >= 1 (au moins 1 part de base)
  if (result.parts < 1) errs.push(`parts < 1 (${result.parts})`);
  // 9. Couple = 2 parts de base
  if (isCouple && result.partsBase !== 2) errs.push(`couple partsBase=${result.partsBase}`);
  // 10. CEHR == 0 si RFR <= seuil
  const cs1 = isCouple ? 500000 : 250000;
  if (result.revenuReference <= cs1 && result.cehr > 0.01) {
    errs.push(`cehr=${result.cehr} alors que RFR=${result.revenuReference} <= ${cs1}`);
  }
  return errs;
}

// =====================================================================
// PRÉCONISATIONS — tests via deltas
//
// On vérifie deux choses :
//  (a) appliquerPreconisations modifie correctement l'input (structure)
//  (b) sur cas non-saturés (IR suffisant, pas de CEHR, pas de décote, pas
//      de niche saturée), le delta IR matche l'avantage théorique
// =====================================================================
function testPreconisations(baseInput, baseResult, idx) {
  const errs = [];

  // Conditions pour des tests "propres" (sans effet de bord) :
  // - IR après décote suffisant pour absorber les réductions testées
  // - Pas de CEHR active (RFR < seuil1)
  // - Pas de décote active (impotApresQF >= seuil)
  // - Pas de plafonnement QF actif
  // - Niches existantes ≈ 0
  const isCouple = baseInput.situation === 'marie-pacse';
  const seuilDec = isCouple ? 3277 : 1982;
  const cehrSeuil1 = isCouple ? 500000 : 250000;
  const nicheRoom = baseResult.plafondNiches - baseResult.nichesUtilisees;

  const cleanCase =
    baseResult.impotApresDecote > 5000 &&
    baseResult.revenuReference < cehrSeuil1 &&
    baseResult.impotApresQF >= seuilDec &&
    baseResult.supplementQF === 0 &&
    nicheRoom > 5000;

  // Test 1 : PER → delta = versement × TMI (sans franchissement de tranche
  // ni saturation du plafond PER 10% revenus pro)
  const revPro = baseInput.sal1 + baseInput.sal2
    + baseInput.bncMicro1 + baseInput.bncMicro2
    + baseInput.bncReel1 + baseInput.bncReel2;
  const perPlafondAuto = revPro > 0
    ? Math.max(4710, Math.min(revPro * 0.10, 37680))
    : 4710;
  const perRoom = perPlafondAuto - (baseInput.per || 0);
  if (cleanCase && baseResult.tmi > 0 && baseResult.revenuNetImposable > 50000 && perRoom >= 2000) {
    const versPER = 2000;
    const inp2 = { ...baseInput, per: (baseInput.per || 0) + versPER };
    const r2 = calc(inp2);
    const delta = baseResult.impotNet - r2.impotNet;
    const expected = versPER * baseResult.tmi;
    if (Math.abs(delta - expected) > 2) {
      errs.push(`PER+${versPER} Δ=${Math.round(delta)} ≠ ${Math.round(expected)} (TMI=${baseResult.tmi})`);
    }
  }

  // Test 2 : Don 7UD 1 000 € → 750 € (sans don 7UD existant, IR suffisant)
  if (cleanCase && (baseInput.dons7UD || 0) === 0) {
    const inp2 = { ...baseInput, dons7UD: 1000 };
    const r2 = calc(inp2);
    const delta = baseResult.impotNet - r2.impotNet;
    if (Math.abs(delta - 750) > 1) {
      errs.push(`Don7UD+1k Δ=${Math.round(delta)} ≠ 750`);
    }
  }

  // Test 3 : EHPAD 4 000 € → 1 000 € (hors plafond niches, IR suffisant)
  if (cleanCase && (baseInput.ehpadFrais || 0) === 0) {
    const inp2 = { ...baseInput, ehpadFrais: 4000, ehpadNbPers: 1 };
    const r2 = calc(inp2);
    const delta = baseResult.impotNet - r2.impotNet;
    if (Math.abs(delta - 1000) > 1) {
      errs.push(`EHPAD 4k Δ=${Math.round(delta)} ≠ 1000`);
    }
  }

  // Test 4 : emploiDomicile — crédit remboursable, niche 10k
  if (cleanCase && (baseInput.emploiDomicile || 0) === 0) {
    const inp2 = { ...baseInput, emploiDomicile: 5000 };
    const r2 = calc(inp2);
    const delta = baseResult.impotNet - r2.impotNet;
    if (Math.abs(delta - 2500) > 1) {
      errs.push(`emploiDom 5k Δ=${Math.round(delta)} ≠ 2500`);
    }
  }

  // Test 5 : structure appliquerPreconisations sur tous les modes
  const precoBatch = [
    { id: 1, leverId: 'per', montant: 3000 },                      // versement-direct
    { id: 2, leverId: 'fcpiJei', montant: 1000 },                  // taux 0.30 → +300 sur fcpiJei
    { id: 3, leverId: 'girardinPD', montant: 2000, paramValue: '113' }, // taux-variable 1.13 → +2260
    { id: 4, leverId: 'jeanbrun', montant: 6000, paramValue: 'social' }, // jeanbrun
  ];
  const merged = appliquerPreconisations(baseInput, precoBatch);
  if (merged.per !== (baseInput.per || 0) + 3000) {
    errs.push(`appliquerPreconisations PER: ${merged.per} ≠ ${(baseInput.per || 0) + 3000}`);
  }
  if (Math.abs(merged.fcpiJei - ((baseInput.fcpiJei || 0) + 300)) > 0.001) {
    errs.push(`appliquerPreconisations fcpiJei: ${merged.fcpiJei} ≠ ${(baseInput.fcpiJei || 0) + 300}`);
  }
  if (Math.abs(merged.girardinPD - ((baseInput.girardinPD || 0) + 2260)) > 0.001) {
    errs.push(`appliquerPreconisations girardinPD: ${merged.girardinPD} ≠ ${(baseInput.girardinPD || 0) + 2260}`);
  }
  if (merged.jeanbrunAmort !== (baseInput.jeanbrunAmort || 0) + 6000) {
    errs.push(`appliquerPreconisations jeanbrunAmort: ${merged.jeanbrunAmort}`);
  }
  if (merged.jeanbrunCategorie !== 'social') {
    errs.push(`appliquerPreconisations jeanbrunCategorie: ${merged.jeanbrunCategorie} ≠ 'social'`);
  }

  return errs;
}

// =====================================================================
// EXÉCUTION
// =====================================================================
const N = 100;
let pass = 0, fail = 0;
const failures = [];

for (let idx = 0; idx < N; idx++) {
  const input = generateProfile(idx);
  const oracle = oracleCalc(input);
  const result = calc(input);

  const compareKeys = [
    'revenuBrutGlobal', 'revenuNetImposable', 'parts',
    'quotientFamilial', 'impotBrut', 'avantageQF', 'plafondQF',
    'supplementQF', 'impotApresQF', 'decote', 'impotApresDecote',
    'irMobilier', 'irAV', 'totalPS',
    'redDons', 'totalReductions', 'totalCredits',
    'nichesUtilisees', 'plafondNiches', 'depassementNiches',
    'cehr', 'revenuReference', 'impotNet', 'tmi',
  ];
  const expected = {};
  for (const k of compareKeys) expected[k] = oracle[k];
  const oracleErrs = diff(result, expected);

  const invErrs = checkInvariants(input, result);
  const precoErrs = testPreconisations(input, result, idx);

  const allErrs = [
    ...oracleErrs.map(e => `[oracle] ${e}`),
    ...invErrs.map(e => `[invariant] ${e}`),
    ...precoErrs.map(e => `[preco] ${e}`),
  ];

  if (allErrs.length === 0) {
    pass++;
  } else {
    fail++;
    failures.push({ idx, input, allErrs, result, oracle });
  }
}

console.log(`\n${pass}/${N} passed, ${fail} failed.\n`);

if (failures.length > 0) {
  console.log('═'.repeat(70));
  console.log('FAILURES');
  console.log('═'.repeat(70));
  for (const f of failures) {
    console.log(`\n── Cas #${f.idx + 1} ──`);
    // Résumé de l'input (champs non-zéro uniquement)
    const summary = {};
    for (const [k, v] of Object.entries(f.input)) {
      if (k.startsWith('__')) continue;
      if (v !== 0 && v !== false && v !== '' && v !== 'celibataire' && v !== 'pfu' && v !== 'L' && v !== 'intermediaire') {
        summary[k] = v;
      }
    }
    console.log('  Input:', JSON.stringify(summary));
    for (const e of f.allErrs) console.log(`    → ${e}`);
  }
}

process.exit(fail === 0 ? 0 : 1);
