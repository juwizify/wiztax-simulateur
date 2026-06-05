/**
 * Runner de tests — charge params.js + calculator.js dans un contexte VM,
 * exécute chaque cas de cases.js et compare aux valeurs attendues (±1 €).
 *
 * Usage : node tests/run.js
 * Exit code : 0 si tous les cas passent, 1 sinon.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const paramsSrc = fs.readFileSync(path.join(ROOT, 'core/params.js'), 'utf8');
const calculatorSrc = fs.readFileSync(path.join(ROOT, 'core/calculator.js'), 'utf8');
const { CASES } = require('./cases.js');

const ctx = vm.createContext({});
vm.runInContext(paramsSrc, ctx, { filename: 'params.js' });
vm.runInContext(calculatorSrc, ctx, { filename: 'calculator.js' });

const TOL_EUR = 1;

let pass = 0, fail = 0;
const failures = [];

for (const c of CASES) {
  const result = vm.runInContext('calculerIR(' + JSON.stringify(c.input) + ')', ctx);
  const errs = [];

  for (const [k, exp] of Object.entries(c.expected)) {
    const got = result[k];
    if (k === 'tmi') {
      if (got !== exp) errs.push(`${k}: attendu ${exp}, obtenu ${got}`);
    } else {
      if (Math.abs(got - exp) > TOL_EUR) {
        errs.push(`${k}: attendu ${exp} ±${TOL_EUR}, obtenu ${Math.round(got)}`);
      }
    }
  }

  if (errs.length === 0) {
    pass++;
    console.log(`  OK   ${c.name}`);
  } else {
    fail++;
    console.log(`  FAIL ${c.name}`);
    for (const e of errs) console.log(`         → ${e}`);
    failures.push({ name: c.name, errs, result });
  }
}

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
