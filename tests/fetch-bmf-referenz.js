// Holt Referenzwerte von der externen BMF-Testschnittstelle (nur für Programmtests,
// gem. Nutzungshinweis des BMF) und speichert sie in bmf-referenz-2026.json.
// Aufruf: node tests/fetch-bmf-referenz.js
const fs = require('fs');
const BASE = 'https://www.bmf-steuerrechner.de/interface/2026Version1.xhtml?code=LSt2026ext';
const cases = [];
const add = (c) => cases.push(c);
// Laufender Arbeitslohn, Monat, alle Steuerklassen, versch. Löhne
for (const stkl of [1,2,3,4,5,6]) for (const re4 of [80000, 150000, 250000, 400000, 650000, 1200000, 3000000])
  add({ LZZ: 2, RE4: re4, STKL: stkl, KVZ: '2.90', PVZ: stkl === 2 || stkl === 3 ? 0 : 1, R: stkl % 2, ZKF: stkl === 2 || stkl === 3 ? 1 : 0 });
// Kinderfreibeträge / Soli / KiSt
add({ LZZ: 2, RE4: 900000, STKL: 1, ZKF: '1.5', R: 1, KVZ: '2.69', PVA: 0 });
add({ LZZ: 2, RE4: 1500000, STKL: 3, ZKF: 3, R: 1, KVZ: '3.29', PVA: 2 });
add({ LZZ: 2, RE4: 700000, STKL: 4, ZKF: 2, R: 1, KVZ: '2.90', PVA: 1 });
add({ LZZ: 2, RE4: 1100000, STKL: 2, ZKF: '0.5', R: 1, KVZ: '2.90' });
// Jahreslohn
add({ LZZ: 1, RE4: 4500000, STKL: 1, KVZ: '2.90', PVZ: 1 });
add({ LZZ: 1, RE4: 12000000, STKL: 3, KVZ: '2.90', ZKF: 2, R: 1 });
add({ LZZ: 1, RE4: 30000000, STKL: 1, KVZ: '2.90', R: 1 });
// Woche / Tag
add({ LZZ: 3, RE4: 90000, STKL: 1, KVZ: '2.90' });
add({ LZZ: 4, RE4: 15000, STKL: 5, KVZ: '2.90' });
// Sachsen, PKV, Faktorverfahren, Alter, KRV/ALV
add({ LZZ: 2, RE4: 450000, STKL: 1, KVZ: '3.10', PVS: 1, PVZ: 1 });
add({ LZZ: 2, RE4: 800000, STKL: 1, PKV: 1, PKPV: 65000, PKPVAGZ: 32500, R: 1 });
add({ LZZ: 2, RE4: 800000, STKL: 3, PKV: 1, PKPV: 90000, PKPVAGZ: 45000, ZKF: 1 });
add({ LZZ: 2, RE4: 380000, STKL: 4, af: 1, f: '0.912', KVZ: '2.90' });
add({ LZZ: 2, RE4: 520000, STKL: 4, af: 1, f: '0.875', KVZ: '2.90', ZKF: 1, R: 1 });
add({ LZZ: 2, RE4: 420000, STKL: 1, ALTER1: 1, AJAHR: 2026, KVZ: '2.90' });
add({ LZZ: 2, RE4: 420000, STKL: 1, ALTER1: 1, AJAHR: 2010, KVZ: '2.90' });
add({ LZZ: 2, RE4: 600000, STKL: 1, KRV: 1, ALV: 1, KVZ: '2.90' });
// Freibetrag / Hinzurechnung
add({ LZZ: 2, RE4: 500000, STKL: 1, LZZFREIB: 20000, KVZ: '2.90' });
add({ LZZ: 2, RE4: 200000, STKL: 6, LZZHINZU: 50000, KVZ: '2.90' });
// Sonstige Bezüge (Weihnachtsgeld, 13. Gehalt)
add({ LZZ: 2, RE4: 400000, STKL: 1, KVZ: '2.90', JRE4: 4800000, SONSTB: 400000, R: 1 });
add({ LZZ: 2, RE4: 650000, STKL: 3, KVZ: '2.90', JRE4: 7800000, SONSTB: 650000, ZKF: 2, R: 1 });
add({ LZZ: 2, RE4: 300000, STKL: 5, KVZ: '2.90', JRE4: 3600000, SONSTB: 150000 });
add({ LZZ: 2, RE4: 1000000, STKL: 1, KVZ: '2.90', JRE4: 12000000, SONSTB: 2000000, R: 1 });
add({ LZZ: 2, RE4: 250000, STKL: 2, KVZ: '2.90', JRE4: 3000000, SONSTB: 100000, ZKF: 1 });
add({ LZZ: 2, RE4: 500000, STKL: 4, KVZ: '2.90', JRE4: 6000000, SONSTB: 5000000, SONSTENT: 5000000 });
// Versorgungsbezüge
add({ LZZ: 2, RE4: 300000, VBEZ: 300000, VBEZM: 300000, VJAHR: 2020, STKL: 1, KRV: 1, ALV: 1, KVZ: '2.90' });

(async () => {
  const out = [];
  for (const c of cases) {
    const qs = Object.entries(c).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const res = await fetch(`${BASE}&${qs}`);
    const xml = await res.text();
    const ausgaben = {};
    for (const m of xml.matchAll(/<ausgabe name="(\w+)" value="(-?\d+)"/g)) ausgaben[m[1]] = Number(m[2]);
    const bad = [...xml.matchAll(/<eingabe name="(\w+)"[^>]*status="(?!ok)/g)].map(m => m[1]);
    if (!Object.keys(ausgaben).length || bad.length) { console.error('Fehler', c, xml.slice(0, 400)); continue; }
    out.push({ eingabe: c, bmf: ausgaben });
    await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(__dirname + '/bmf-referenz-2026.json', JSON.stringify({ quelle: BASE, abgerufen: new Date().toISOString(), faelle: out }, null, 1));
  console.log('Fälle gespeichert:', out.length, 'von', cases.length);
})();
