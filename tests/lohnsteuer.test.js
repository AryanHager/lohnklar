// Vergleicht die PAP-Portierung centgenau mit den BMF-Referenzwerten.
// Aufruf: node tests/lohnsteuer.test.js
require('../js/decimal.js');
const { berechneLohnsteuer2026 } = require('../js/lohnsteuer2026.js');
const ref = { faelle: [...require('./bmf-referenz-2026.json').faelle, ...require('./bmf-referenz-2026-zufall.json').faelle] };
const FELDER = ['LSTLZZ', 'SOLZLZZ', 'BK', 'STS', 'SOLZS', 'BKS', 'VFRB', 'WVFRB', 'VFRBS1', 'VFRBS2', 'WVFRBO', 'WVFRBM'];
let ok = 0, fail = 0, werte = 0;
for (const f of ref.faelle) {
  const r = berechneLohnsteuer2026(f.eingabe);
  const diffs = FELDER.filter(k => k in f.bmf && r[k] !== f.bmf[k]).map(k => `${k}: ist ${r[k]} / BMF ${f.bmf[k]}`);
  werte += FELDER.filter(k => k in f.bmf).length;
  if (diffs.length) { fail++; console.log('ABWEICHUNG', JSON.stringify(f.eingabe), diffs.join('; ')); } else ok++;
}
console.log(`${ok}/${ref.faelle.length} Fälle centgenau identisch (${werte} Ausgabewerte geprüft), ${fail} Abweichungen`);
process.exit(fail ? 1 : 0);
