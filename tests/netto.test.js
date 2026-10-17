// Plausibilitätsprüfung kompletter Netto-Ergebnisse:
//  - SV-Beiträge gegen unabhängig von Hand berechnete Sollwerte (Sätze/BBG 2026)
//  - LSt/Soli/KiSt gegen BMF-Schnittstelle (gleiche PAP-Eingaben)
//  - Netto = Brutto − Steuern − SV (Konsistenz), Wunschnetto-Rückrechnung
require('../js/decimal.js'); require('../js/lohnsteuer2026.js'); const R = require('../js/rechner.js');
const sz = require('./netto-szenarien.js'); const ref = require('./bmf-referenz-netto.json');
let ok = 0, fail = 0; const eq = (a, b) => Math.abs(a - b) < 0.005;
const fmt = (n) => n.toFixed(2).padStart(9);
for (const s of sz) {
  const r = R.berechne(s.in), m = r.monat, b = ref.find(x => x.name === s.name).bmf;
  const errs = [];
  for (const k of ['kv', 'pv', 'rv', 'av']) if (!eq(m[k], s.sv[k])) errs.push(`${k} ${m[k]} ≠ ${s.sv[k]}`);
  if (!eq(m.lst, b.LSTLZZ / 100)) errs.push(`LSt ${m.lst} ≠ BMF ${b.LSTLZZ / 100}`);
  if (!eq(m.soli, b.SOLZLZZ / 100)) errs.push(`Soli ${m.soli} ≠ BMF ${b.SOLZLZZ / 100}`);
  const kist = s.in.kirche ? Math.floor(b.BK * r.kirchensteuersatz / 100) / 100 : 0;
  if (!eq(m.kist, kist)) errs.push(`KiSt ${m.kist} ≠ ${kist}`);
  const netto = Math.round((m.gesamtBrutto - m.lst - m.soli - m.kist - m.kv - m.pv - m.rv - m.av) * 100) / 100;
  if (!eq(m.netto, netto)) errs.push(`Netto ${m.netto} ≠ ${netto}`);
  const w = R.bruttoAusNetto(m.auszahlung, s.in);
  if (Math.abs(w.brutto - s.in.brutto) > 0.02 && !eq(w.ergebnis.monat.auszahlung, m.auszahlung)) errs.push(`Wunschnetto ${w.brutto} ≠ ${s.in.brutto}`);
  console.log(`${errs.length ? 'FEHLER' : 'OK    '} ${s.name}\n        Brutto${fmt(m.gesamtBrutto)} | LSt${fmt(m.lst)} Soli${fmt(m.soli)} KiSt${fmt(m.kist)} | KV${fmt(m.kv)} PV${fmt(m.pv)} RV${fmt(m.rv)} AV${fmt(m.av)} | Netto${fmt(m.netto)}${errs.length ? '\n        ' + errs.join('; ') : ''}`);
  errs.length ? fail++ : ok++;
}
// Sonderfälle Mini-/Midijob (Sollwerte von Hand nach DRV-Formel)
const mini = R.berechne({ brutto: 550 }).monat;
const t1 = eq(mini.rv, 19.80) && mini.lst === 0 && eq(mini.netto, 530.20);
const midi = R.berechne({ brutto: 1500 }).monat; const beAN = 2000 / 1397 * (1500 - 603);
const t2 = eq(midi.kv, Math.round(beAN * 8.75) / 100) && eq(midi.rv, Math.round(beAN * 9.3) / 100) && eq(midi.av, Math.round(beAN * 1.3) / 100) && eq(midi.pv, Math.round(beAN * 2.4) / 100);
console.log(`${t1 ? 'OK    ' : 'FEHLER'} Minijob 550 €: RV-Eigenanteil 3,6 % = ${mini.rv}, Netto ${mini.netto}`);
console.log(`${t2 ? 'OK    ' : 'FEHLER'} Midijob 1.500 €: BE_AN ${beAN.toFixed(2)}, KV ${midi.kv}, PV ${midi.pv}, RV ${midi.rv}, AV ${midi.av}`);
t1 ? ok++ : fail++; t2 ? ok++ : fail++;
console.log(`\n${ok}/${ok + fail} Netto-Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
