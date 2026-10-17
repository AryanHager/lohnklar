// BMF-Referenzwerte für alle Lohnsteuer-Aufrufe der Teilmonats-Testfälle (Tagestabelle LZZ = 4 und sonstige Bezüge)
// Nutzt die externe Testschnittstelle des BMF (nur für Programmtests), mit Pause zwischen den Abfragen.
require('../js/decimal.js'); const L = require('../js/lohnsteuer2026.js');
const F = require('./teilmonat-faelle.js'), fs = require('fs');
const BASE = 'https://www.bmf-steuerrechner.de/interface/2026Version1.xhtml?code=LSt2026ext';
const aufrufe = new Map(); const orig = L.berechneLohnsteuer2026;
globalThis.berechneLohnsteuer2026 = (e) => { aufrufe.set(JSON.stringify(e), e); return orig(e); };
require('../js/krankenkassen.js');
const R2 = require('../js/rechner.js'); globalThis.Rechner = R2; require('../js/eingabe.js'); const A2 = require('../js/abrechnung.js');
for (const m of F.mitarbeiter) for (let mo = 1; mo <= 12; mo++) for (const methode of ['30tage', 'kalendertage', 'arbeitstage']) { try { A2.erstelleAbrechnung(F.firma, m, 2026, mo, { methode }); } catch (e) { } }
(async () => {
  const out = [], liste = [...aufrufe.values()].filter(e => e.LZZ === 4 || e.SONSTB);
  for (const e of liste) {
    const xml = await (await fetch(BASE + '&' + Object.entries(e).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'))).text();
    const a = {}; for (const mm of xml.matchAll(/<ausgabe name="(\w+)" value="(-?\d+)"/g)) a[mm[1]] = Number(mm[2]);
    if (!Object.keys(a).length) { console.error('Fehler', e, xml.slice(0, 300)); continue; }
    out.push({ eingabe: e, bmf: a }); await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(__dirname + '/bmf-referenz-teilmonat.json', JSON.stringify(out, null, 1));
  console.log('PAP-Aufrufe gespeichert:', out.length, '(davon Tagestabelle:', out.filter(x => x.eingabe.LZZ === 4).length + ')');
})();
