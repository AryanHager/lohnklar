// Holt für jedes Netto-Szenario die BMF-Lohnsteuer zu exakt den Eingaben, die der Rechner an den PAP übergibt.
require('../js/decimal.js'); require('../js/lohnsteuer2026.js'); const R = require('../js/rechner.js');
const fs = require('fs'); const BASE = 'https://www.bmf-steuerrechner.de/interface/2026Version1.xhtml?code=LSt2026ext';
(async () => {
  const out = [];
  for (const s of require('./netto-szenarien.js')) {
    const e = R.berechne(s.in).lstEingaben;
    const xml = await (await fetch(BASE + '&' + Object.entries(e).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'))).text();
    const a = {}; for (const m of xml.matchAll(/<ausgabe name="(\w+)" value="(-?\d+)"/g)) a[m[1]] = Number(m[2]);
    out.push({ name: s.name, eingabe: e, bmf: a }); await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(__dirname + '/bmf-referenz-netto.json', JSON.stringify(out, null, 1)); console.log('ok', out.length);
})();
