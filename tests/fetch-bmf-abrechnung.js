// BMF-Referenzwerte für alle Lohnsteuer-Aufrufe der Testabrechnungen (laufend + sonstige Bezüge je Monat)
require('../js/decimal.js'); const L = require('../js/lohnsteuer2026.js'); require('../js/rechner.js'); require('../js/krankenkassen.js'); require('../js/eingabe.js');
const A = require('../js/abrechnung.js'), F = require('./abrechnung-faelle.js'), fs = require('fs');
const BASE = 'https://www.bmf-steuerrechner.de/interface/2026Version1.xhtml?code=LSt2026ext';
// Eingaben mitschneiden, die die Abrechnung an den PAP übergibt
const aufrufe = new Map(); const orig = L.berechneLohnsteuer2026;
globalThis.berechneLohnsteuer2026 = (e) => { aufrufe.set(JSON.stringify(e), e); return orig(e); };
delete require.cache[require.resolve('../js/abrechnung.js')]; delete require.cache[require.resolve('../js/rechner.js')];
const R2 = require('../js/rechner.js'); globalThis.Rechner = R2; const A2 = require('../js/abrechnung.js');
for (const m of F.mitarbeiter) for (let mo = 1; mo <= 12; mo++) { try { A2.erstelleAbrechnung(F.firma, m, 2026, mo); } catch (e) { } }
(async () => {
  const out = [];
  for (const e of aufrufe.values()) {
    const xml = await (await fetch(BASE + '&' + Object.entries(e).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'))).text();
    const a = {}; for (const mm of xml.matchAll(/<ausgabe name="(\w+)" value="(-?\d+)"/g)) a[mm[1]] = Number(mm[2]);
    if (!Object.keys(a).length) { console.error('Fehler', e, xml.slice(0, 300)); continue; }
    out.push({ eingabe: e, bmf: a }); await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(__dirname + '/bmf-referenz-abrechnung.json', JSON.stringify(out, null, 1)); console.log('PAP-Aufrufe gespeichert:', out.length);
})();
