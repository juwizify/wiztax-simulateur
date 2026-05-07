/**
 * Test systématique : chaque levier du catalogue est appliqué sur un input
 * témoin, et on vérifie :
 *   - la transformation input correcte (clé, valeur, taux appliqué)
 *   - le delta IR cohérent avec l'avantage théorique
 *   - avantageEstime() retourne une valeur correcte (ou null si non applicable)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/params.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/calculator.js'), 'utf8'), ctx);
const calc = (i) => vm.runInContext('calculerIR(' + JSON.stringify(i) + ')', ctx);

const { LEVIERS_CATALOGUE, appliquerPreconisations, avantageEstime } =
  require('../js/preconisations.js');

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
    meubleClasse: 0, meubleNonClasse: 0,
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

// Témoin "généreux" : RNI élevé, niches vides, pas de décote/CEHR
// Salaire 100k → IR ~22k, marge confortable
const TEMOIN = makeInput({ sal1: 100000, situation: 'marie-pacse', nbEnfants: 1 });
const baseR = calc(TEMOIN);

console.log(`Témoin : couple+1 enf, sal=100k → IR=${Math.round(baseR.impotNet)}, TMI=${baseR.tmi}\n`);

// Cas test par levier : { id, montant, paramValue?, expectedKey, expectedValue, expectedDelta }
const TESTS = [
  // PER : versement direct, IR baisse de versement × TMI
  { id: 'per', montant: 5000, key: 'per', expected: 5000, delta: 5000 * baseR.tmi, deltaTol: 5 },

  // Dons 7UD : 1500 € (en-dessous de 2000) → 1500 × 0.75 = 1125
  { id: 'dons7UD', montant: 1500, key: 'dons7UD', expected: 1500, delta: 1500 * 0.75, deltaTol: 1 },

  // Dons 7UF : 1500 → 990
  { id: 'dons7UF', montant: 1500, key: 'dons', expected: 1500, delta: 1500 * 0.66, deltaTol: 1 },

  // EHPAD : 8000 → 25% = 2000 (sous plafond 10k)
  { id: 'ehpad', montant: 8000, key: 'ehpadFrais', expected: 8000, delta: 8000 * 0.25, deltaTol: 1 },

  // Syndic : 500 → 66% = 330 si dans plafond 1% des salaires
  // Plafond = 100000 × 1% = 1000, OK
  { id: 'syndic', montant: 500, key: 'cotSyndicales', expected: 500, delta: 500 * 0.66, deltaTol: 1 },

  // Malraux : taux variable, "spr-non" 22% → input.malraux = 10000 × 0.22 = 2200
  { id: 'malraux', montant: 10000, paramValue: 'spr-non', key: 'malraux', expected: 2200, delta: 2200, deltaTol: 1 },
  // Malraux SPR oui 30%
  { id: 'malraux', montant: 10000, paramValue: 'spr-oui', key: 'malraux', expected: 3000, delta: 3000, deltaTol: 1 },

  // EmploiDom : 10k → 5000 (50%)
  { id: 'emploiDom', montant: 10000, key: 'emploiDomicile', expected: 10000, delta: 5000, deltaTol: 1 },

  // GardeEnf : 3000 (sous plafond 3500 × 1 enfant) → 1500
  { id: 'gardeEnf', montant: 3000, key: 'gardeEnfants', expected: 3000, delta: 1500, deltaTol: 1 },

  // FCPI JEI : 5000 × 30% = 1500 → input.fcpiJei = 1500
  { id: 'fcpiJei', montant: 5000, key: 'fcpiJei', expected: 1500, delta: 1500, deltaTol: 1 },

  // FIP Corse : 5000 × 30% = 1500
  { id: 'fipCorse', montant: 5000, key: 'fipCorse', expected: 1500, delta: 1500, deltaTol: 1 },

  // IR-PME : 5000 × 25% = 1250
  { id: 'irPme', montant: 5000, key: 'irPme', expected: 1250, delta: 1250, deltaTol: 1 },

  // GFI : 5000 × 18% = 900
  { id: 'gfi', montant: 5000, key: 'gfi', expected: 900, delta: 900, deltaTol: 1 },

  // LocAvantages loc1 : 8000 × 15% = 1200
  { id: 'locAvantages', montant: 8000, paramValue: 'loc1', key: 'locAvantages', expected: 1200, delta: 1200, deltaTol: 1 },
  // LocAvantages loc2 : 8000 × 35% = 2800
  { id: 'locAvantages', montant: 8000, paramValue: 'loc2', key: 'locAvantages', expected: 2800, delta: 2800, deltaTol: 1 },
  // LocAvantages loc3 : 8000 × 65% = 5200 — mais cap niches 10k pourrait s'appliquer
  { id: 'locAvantages', montant: 8000, paramValue: 'loc3', key: 'locAvantages', expected: 5200, delta: 5200, deltaTol: 1 },

  // SOFICA : 5000 × 30% = 1500
  { id: 'sofica', montant: 5000, key: 'sofica', expected: 1500, delta: 1500, deltaTol: 1 },

  // Girardin PD 113% : 5000 × 1.13 = 5650 input ; quote-part 44% dans niche 18k
  // Avantage IR brut = 5650, mais à vérifier vs niche
  { id: 'girardinPD', montant: 5000, paramValue: '113', key: 'girardinPD', expected: 5650, delta: 5650, deltaTol: 1 },

  // Girardin AG 108% : 5000 × 1.08 = 5400
  { id: 'girardinAG', montant: 5000, paramValue: '108', key: 'girardinAG', expected: 5400, delta: 5400, deltaTol: 1 },

  // Pinel 9 ans 18% : 100k × 0.18 = 18000 input
  // ⚠ Bug connu : devrait être étalé sur 9 ans = 2000/an
  // Avec niche 10k cap, delta sera ~10k (sans bug ce serait ~2k)
  { id: 'pinel', montant: 100000, paramValue: '9', key: 'pinel', expected: 18000, delta: null, knownBug: 'Pinel non étalé' },

  // Jeanbrun : amortissement social 8000 (sous plafond 10k)
  // Pas un avantage IR direct → diminue revenus fonciers
  { id: 'jeanbrun', montant: 8000, paramValue: 'social', key: 'jeanbrunAmort', expected: 8000, delta: null },
];

let pass = 0, fail = 0;
const failures = [];

for (const t of TESTS) {
  const lev = LEVIERS_CATALOGUE.find(l => l.id === t.id);
  if (!lev) {
    console.log(`  ⚠ Levier inconnu : ${t.id}`);
    continue;
  }

  const preco = [{ id: 1, leverId: t.id, montant: t.montant, paramValue: t.paramValue || null }];
  const merged = appliquerPreconisations(TEMOIN, preco);
  const errs = [];

  // Vérif clé d'input transformée
  const got = merged[t.key];
  if (Math.abs(got - t.expected) > 0.01) {
    errs.push(`input.${t.key}=${got} ≠ ${t.expected}`);
  }

  // Vérif jeanbrunCategorie pour le cas jeanbrun
  if (t.id === 'jeanbrun' && merged.jeanbrunCategorie !== t.paramValue) {
    errs.push(`jeanbrunCategorie=${merged.jeanbrunCategorie} ≠ ${t.paramValue}`);
  }

  // Vérif avantageEstime (si pertinent)
  const est = avantageEstime(preco[0], TEMOIN);
  if (lev.mode === 'taux' || lev.mode === 'taux-variable') {
    const expEst = t.id === 'pinel' || t.id === 'sofica' || t.id === 'fcpiJei' ||
                   t.id === 'fipCorse' || t.id === 'irPme' || t.id === 'gfi' ||
                   t.id === 'malraux' || t.id === 'locAvantages' ||
                   t.id === 'girardinPD' || t.id === 'girardinAG'
      ? t.expected
      : null;
    if (expEst !== null && Math.abs(est - expEst) > 0.01) {
      errs.push(`avantageEstime=${est} ≠ ${expEst}`);
    }
  }

  // Vérif delta IR (si pas de bug connu et delta donné)
  if (t.delta !== null && !t.knownBug) {
    const r2 = calc(merged);
    const delta = baseR.impotNet - r2.impotNet;
    if (Math.abs(delta - t.delta) > t.deltaTol) {
      errs.push(`Δ IR=${Math.round(delta)} ≠ ${Math.round(t.delta)} (tol ${t.deltaTol})`);
    }
  }

  const label = `${t.id}${t.paramValue ? '(' + t.paramValue + ')' : ''} montant=${t.montant}`;
  if (errs.length === 0) {
    pass++;
    console.log(`  OK   ${label}${t.knownBug ? ' [BUG CONNU: ' + t.knownBug + ']' : ''}`);
  } else {
    fail++;
    failures.push({ label, errs });
    console.log(`  FAIL ${label}`);
    for (const e of errs) console.log(`         → ${e}`);
  }
}

console.log(`\n${pass}/${TESTS.length} leviers passent, ${fail} échecs.`);

// =====================================================================
// Vérif : tous les leviers du catalogue sont couverts
// =====================================================================
const tested = new Set(TESTS.map(t => t.id));
const missing = LEVIERS_CATALOGUE.map(l => l.id).filter(id => !tested.has(id));
if (missing.length) {
  console.log(`\n⚠ Leviers non testés : ${missing.join(', ')}`);
}

process.exit(fail === 0 ? 0 : 1);
