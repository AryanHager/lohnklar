// Zufällige (deterministisch geseedete) Referenzfälle von der BMF-Testschnittstelle.
const fs = require('fs');
const BASE = 'https://www.bmf-steuerrechner.de/interface/2026Version1.xhtml?code=LSt2026ext';
let seed = 20260101; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const cases = [];
for (let i = 0; i < 80; i++) {
  const STKL = 1 + Math.floor(rnd() * 6);
  const c = { LZZ: 2, STKL, RE4: Math.floor(rnd() * 1400000) + 50000, KVZ: pick(['2.69', '2.90', '3.29', '3.85', '4.39']), R: rnd() < 0.5 ? 1 : 0 };
  if (STKL <= 4) c.ZKF = pick([0, 0, '0.5', 1, '1.5', 2, 3]);
  if (rnd() < 0.3) c.PVZ = 1; else c.PVA = pick([0, 1, 2, 3, 4]);
  if (rnd() < 0.15) c.PVS = 1;
  if (rnd() < 0.15) { c.PKV = 1; c.PKPV = Math.floor(rnd() * 90000) + 20000; c.PKPVAGZ = Math.floor(c.PKPV / 2); }
  if (STKL === 4 && rnd() < 0.5) { c.af = 1; c.f = pick(['0.950', '0.887', '0.801']); }
  if (rnd() < 0.3) { c.JRE4 = c.RE4 * 12; c.SONSTB = Math.floor(rnd() * 1500000) + 10000; }
  if (rnd() < 0.1) { c.ALTER1 = 1; c.AJAHR = pick([2015, 2022, 2026]); }
  cases.push(c);
}
(async () => {
  const out = [];
  for (const c of cases) {
    const qs = Object.entries(c).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const xml = await (await fetch(`${BASE}&${qs}`)).text();
    const a = {}; for (const m of xml.matchAll(/<ausgabe name="(\w+)" value="(-?\d+)"/g)) a[m[1]] = Number(m[2]);
    if (Object.keys(a).length) out.push({ eingabe: c, bmf: a }); else console.error('Fehler', c, xml.slice(0, 300));
    await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(__dirname + '/bmf-referenz-2026-zufall.json', JSON.stringify({ quelle: BASE, abgerufen: new Date().toISOString(), faelle: out }, null, 1));
  console.log('gespeichert', out.length);
})();
