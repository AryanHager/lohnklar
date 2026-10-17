// Tests der Entgeltabrechnung: Übereinstimmung mit der geprüften Rechenlogik, BMF-PAP und Handrechnung
require('../js/decimal.js'); const L = require('../js/lohnsteuer2026.js'); const R = require('../js/rechner.js'); require('../js/krankenkassen.js');
const E = require('../js/eingabe.js'), A = require('../js/abrechnung.js'), F = require('./abrechnung-faelle.js');
const ref = require('./bmf-referenz-abrechnung.json');
let ok = 0, fail = 0;
const eq = (a, b) => Math.abs(a - b) < 0.005;
const t = (name, bed, info = '') => { if (bed) ok++; else { fail++; console.log('FEHLER', name, info); } };
const ma = (id) => F.mitarbeiter.find(m => m.id === id);
const abr = (id, mo, opt) => A.erstelleAbrechnung(F.firma, ma(id), 2026, mo, opt);
const engine = (m, ez = 0) => R.berechne(Object.assign(E.eingabeAus(A.werteFuer(m)), { einmalzahlung: ez }));

// 1) Laufende Monate ohne Einmalzahlung = Rechner-Ergebnis
for (const m of F.mitarbeiter) {
  const a = A.erstelleAbrechnung(F.firma, Object.assign({}, m, { einmalzahlungen: [] }), 2026, 7), r = engine(m).monat;
  for (const k of ['lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av']) t(`${m.vorname}: ${k} = Rechner`, eq(a.abzuege.find((x, i) => ['lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av'][i] === k).summe, r[k]));
  t(`${m.vorname}: Netto = Rechner`, eq(a.netto, r.netto)); t(`${m.vorname}: Auszahlung = Rechner`, eq(a.auszahlung, r.auszahlung));
  // Konsistenz der Abrechnungszeilen
  const brutto = a.bezuege.reduce((s, b) => s + b.betrag, 0), umw = a.umwandlung.reduce((s, b) => s + b.betrag, 0);
  t(`${m.vorname}: Gesamtbrutto = Summe Bezüge`, eq(brutto, a.gesamtBrutto));
  t(`${m.vorname}: Netto = Brutto − Umwandlung − Abzüge`, eq(a.gesamtBrutto + umw - a.steuerSumme - a.svSumme, a.netto));
  t(`${m.vorname}: Auszahlung = Netto ± sonstige`, eq(a.netto + a.sonstige.reduce((s, x) => s + x.betrag, 0), a.auszahlung));
}
// 2) Alle PAP-Aufrufe der Abrechnungen centgenau = BMF-Schnittstelle
let pap = 0;
for (const f of ref) { const o = L.berechneLohnsteuer2026(f.eingabe); const d = ['LSTLZZ', 'SOLZLZZ', 'BK', 'STS', 'SOLZS', 'BKS'].filter(k => o[k] !== f.bmf[k]); t('PAP = BMF ' + JSON.stringify(f.eingabe), !d.length, d.join()); pap++; }
// 3) Dezember bei ganzjähriger Beschäftigung: Einmalzahlung und Jahressummen = Jahresbetrachtung des Rechners
{
  const m = Object.assign({}, ma('m1'), { einmalzahlungen: [{ monat: '2026-12', bezeichnung: 'Weihnachtsgeld', betrag: '8.000' }] });
  const a = A.erstelleAbrechnung(F.firma, m, 2026, 12), r = engine(m, 8000);
  for (const k of ['lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av', 'netto']) t(`Dezember Einmalzahlung ${k} = Rechner`, eq(a.einmal[k], r.einmal[k]), `${a.einmal[k]} vs ${r.einmal[k]}`);
  for (const k of ['lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av', 'netto', 'auszahlung']) t(`Jahressumme ${k} = Rechner Jahr`, eq(a.jahressummen[k], r.jahr[k]), `${a.jahressummen[k]} vs ${r.jahr[k]}`);
}
// 4) November-Einmalzahlung mit anteiliger BBG (Handrechnung): 5.500 €/Monat, Urlaubsgeld Juni 1.500, Weihnachtsgeld Nov 8.000
{
  const a = abr('m1', 11), ez = a.einmal;
  // KV/PV: anteilige BBG Jan–Nov 11 × 5.812,50 = 63.937,50; laufend 11 × 5.500 = 60.500; Juni-EZ 1.500 verbraucht -> frei 1.937,50
  t('Nov: SV-pflichtiger Teil KV/PV', eq(ez.svKV, 1937.50), ez.svKV);
  t('Nov: KV-Beitrag (8,75 %)', eq(ez.kv, 169.53), ez.kv); t('Nov: PV-Beitrag (2,4 % kinderlos)', eq(ez.pv, 46.50), ez.pv);
  // RV/AV: 11 × 8.450 = 92.950 − 60.500 − 1.500 = 30.950 ≥ 8.000 -> voll
  t('Nov: SV-pflichtiger Teil RV/AV', eq(ez.svRV, 8000), ez.svRV); t('Nov: RV 9,3 %', eq(ez.rv, 744)); t('Nov: AV 1,3 %', eq(ez.av, 104));
  // Lohnsteuer: JRE4 = 12 × 5.500 + 1.500 (Juni), SONSTB = 8.000 -> unabhängig direkt per PAP
  const e = Object.assign({}, engine(ma('m1')).lstEingaben, { JRE4: (66000 + 1500) * 100, SONSTB: 800000 }), o = L.berechneLohnsteuer2026(e);
  t('Nov: LSt sonstiger Bezug = PAP(JRE4 inkl. Juni)', eq(ez.lst, o.STS / 100), `${ez.lst} vs ${o.STS / 100}`);
  t('Nov: KiSt 9 % auf BKS', eq(ez.kist, Math.floor(o.BKS * 9 / 100) / 100));
  // Jahressummen Jan–Nov = 11 × laufend + Juni + Nov
  const lauf = engine(ma('m1')).monat, juni = abr('m1', 6).einmal;
  t('Nov: Jahressumme Brutto', eq(a.jahressummen.gesamtBrutto, 11 * 5500 + 1500 + 8000));
  t('Nov: Jahressumme LSt', eq(a.jahressummen.lst, Math.round((11 * lauf.lst + juni.lst + ez.lst) * 100) / 100));
  t('Nov: Jahressumme Auszahlung', eq(a.jahressummen.auszahlung, Math.round((11 * lauf.auszahlung + juni.netto + ez.netto) * 100) / 100));
}
// 5) Eintritt 01.04.2026: Kumulierung ab April, anteilige BBG ab Eintritt
{
  const a = abr('m2', 6), lauf = engine(ma('m2')).monat;
  t('Eintritt April: 3 Monate kumuliert', eq(a.jahressummen.gesamtBrutto, 3 * 3200) && eq(a.jahressummen.lst, Math.round(3 * lauf.lst * 100) / 100));
  let fehler = ''; try { abr('m2', 3); } catch (e) { fehler = e.message; }
  t('Abrechnung vor Eintritt abgelehnt', /vor dem Eintritt/.test(fehler));
  const d = abr('m2', 12); t('Eintritt April: Dez-EZ voll SV-pflichtig (9 × BBG)', eq(d.einmal.svKV, 1600));
}
// 6) Firmenwagen/bAV/VWL: Lohnarten und Auszahlung
{
  const a = abr('m3', 7);
  t('E-Auto 0,25 %: 42.000 × 0,25 % + 0,03 % × 15 km × 0,25', eq(a.bezuege.find(b => b.la === '1200').betrag, 105 + 47.25));
  t('bAV-Umwandlung als Abzug', eq(a.umwandlung[0].betrag, -150) && a.umwandlung[0].st === 'F');
  t('Sachsen: PV-Satz AN 2,3 % + 0,6 %', eq(a.pvAN, 2.9));
  t('Sonstige: GwV, VWL, steuerfrei', a.sonstige.length === 3);
}
// 7) Minijob
{
  const a = abr('m4', 5); t('Minijob: keine LSt, RV 3,6 %', a.art === 'Minijob' && a.steuerSumme === 0 && eq(a.abzuege[5].summe, 19.80) && eq(a.auszahlung, 530.20));
}
// 8) PKV + Faktor + großer Bonus (über BBG)
{
  const a = abr('m5', 5), m = engine(ma('m5')).monat;
  t('PKV: laufender Eigenanteil = Rechner', eq(a.abzuege[3].l, m.kv) && eq(a.abzuege[4].l, m.pv));
  t('PKV: keine KV/PV auf Bonus', a.einmal.kv === 0 && a.einmal.pv === 0);
  t('Bonus Mai über RV-BBG: 5 × 8.450 − 5 × 8.450 = 0', eq(a.einmal.svRV, 0) && a.einmal.rv === 0);
  t('Faktor im Steuermerkmal', a.steuermerkmale.faktor === 0.912);
}
// 9) Manueller Vortrag
{
  const a = abr('m1', 3, { vortrag: { gesamtBrutto: '10.000', lst: '1.000,50' } }), lauf = engine(ma('m1')).monat;
  t('Vortrag: Brutto = Vortrag + Monat', eq(a.jahressummen.gesamtBrutto, 15500));
  t('Vortrag: LSt = Vortrag + Monat', eq(a.jahressummen.lst, 1000.5 + lauf.lst));
  t('Vortrag: nicht angegebene Felder berechnet', eq(a.jahressummen.kv, Math.round(3 * lauf.kv * 100) / 100));
}
// 10) PDF-Erzeugung mit dem lokal mitgelieferten jsPDF (Node)
{
  globalThis.jspdf = require('../js/vendor/jspdf.umd.min.js'); globalThis.Abrechnung = A; require('../js/abrechnung-ausgabe.js');
  const liste = F.mitarbeiter.map(m => A.erstelleAbrechnung(F.firma, m, 2026, 12));
  const doc = globalThis.AbrechnungAusgabe.pdf(liste), bytes = doc.output('arraybuffer').byteLength;
  t('Sammel-PDF: eine Seite je Mitarbeiter', doc.getNumberOfPages() === F.mitarbeiter.length, doc.getNumberOfPages());
  t('PDF-Größe plausibel', bytes > 5000, bytes);
  t('Dateiname', globalThis.AbrechnungAusgabe.dateiname([liste[0]]) === 'Entgeltabrechnung_2026-12_Mustermann_Erika.pdf');
}
console.log(`${ok}/${ok + fail} Abrechnungstests bestanden (davon ${pap} PAP-Aufrufe gegen BMF-Schnittstelle)`);
process.exit(fail ? 1 : 0);
