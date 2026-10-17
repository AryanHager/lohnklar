// Tests Teilmonat (Ein-/Austritt im Monat): Anteilsberechnung, SV-Tage/Teil-BBG, Tagestabelle (BMF), Jahressummen, Monate außerhalb
require('../js/decimal.js'); const L = require('../js/lohnsteuer2026.js'); const R = require('../js/rechner.js'); require('../js/krankenkassen.js');
const E = require('../js/eingabe.js'), A = require('../js/abrechnung.js'), V = require('../js/validierung.js'), F = require('./teilmonat-faelle.js');
const ref = require('./bmf-referenz-teilmonat.json');
let ok = 0, fail = 0;
const eq = (a, b) => Math.abs(a - b) < 0.005;
const t = (name, bed, info = '') => { if (bed) ok++; else { fail++; console.log('FEHLER', name, info); } };
const ma = (id) => F.mitarbeiter.find(m => m.id === id);
const abr = (id, mo, opt) => A.erstelleAbrechnung(F.firma, ma(id), 2026, mo, opt);
const abz = (a, i) => a.abzuege[i]; // 0 LSt, 1 Soli, 2 KiSt, 3 KV, 4 PV, 5 RV, 6 AV
const bmf = (e) => ref.find(f => JSON.stringify(f.eingabe) === JSON.stringify(e));
const r2 = (x) => Math.round((x + Number.EPSILON * Math.sign(x)) * 100) / 100;
const wirft = (fn, text) => { try { fn(); return false; } catch (e) { return e.message.includes(text); } };

// 0) Alle Tagestabellen-/Sonstige-Bezüge-Aufrufe centgenau = BMF-Schnittstelle
for (const f of ref) { const o = L.berechneLohnsteuer2026(f.eingabe); const d = ['LSTLZZ', 'SOLZLZZ', 'BK', 'STS', 'SOLZS', 'BKS'].filter(k => o[k] !== f.bmf[k]); t('PAP = BMF ' + JSON.stringify(f.eingabe), !d.length, d.join()); }
t('BMF-Referenz enthält Tagestabellen-Fälle', ref.filter(f => f.eingabe.LZZ === 4).length >= 10);

// 1) Validierung Austrittsdatum
t('Austritt leer ok', V.pruefeAustritt('2026-01-01', '').ok);
t('Austritt nach Eintritt ok', V.pruefeAustritt('2026-01-01', '2026-03-31').ok);
t('Austritt = Eintritt ok', V.pruefeAustritt('2026-07-06', '2026-07-06').ok);
t('Austritt vor Eintritt abgelehnt', !V.pruefeAustritt('2026-07-06', '2026-07-05').ok);
t('Austritt ungültig abgelehnt', !V.pruefeAustritt('', '2026-02-30x').ok);
t('Abrechnung lehnt Austritt < Eintritt ab', wirft(() => A.erstelleAbrechnung(F.firma, Object.assign({}, ma('t1'), { austritt: '2026-11-01' }), 2026, 11), 'Austrittsdatum liegt vor'));

// 2) Tage und Faktoren
{
  const b = A.beschaeftigung(ma('t1'), 2026, 11);
  t('t1 Nov: 16 Kalendertage', b.kalendertage === 16 && b.svTage === 16 && b.steuerTage === 16 && b.zaehler === 16 && b.nenner === 30, JSON.stringify(b));
  const k = A.beschaeftigung(ma('t1'), 2026, 11, 'kalendertage'); t('t1 Nov Kalendertage-Methode 16/30', k.zaehler === 16 && k.nenner === 30);
  const at = A.beschaeftigung(ma('t1'), 2026, 11, 'arbeitstage'); t('t1 Nov Arbeitstage 11/21 (15.–30.11.2026)', at.zaehler === 11 && at.nenner === 21, `${at.zaehler}/${at.nenner}`);
  const b2 = A.beschaeftigung(ma('t2'), 2026, 3); t('t2 März: 10 Tage', b2.kalendertage === 10 && b2.svTage === 10 && b2.zaehler === 10 && b2.nenner === 30);
  const b2k = A.beschaeftigung(ma('t2'), 2026, 3, 'kalendertage'); t('t2 März Kalendertage 10/31', b2k.zaehler === 10 && b2k.nenner === 31);
  const b3 = A.beschaeftigung(ma('t3'), 2026, 7); t('t3 Juli 06.–24.: 19 Tage', b3.kalendertage === 19 && b3.von === 6 && b3.bis === 24);
  const b4 = A.beschaeftigung(ma('t4'), 2026, 2); t('t4 Februar ab 16.: 13 Tage', b4.kalendertage === 13 && b4.svTage === 13);
  const b4k = A.beschaeftigung(ma('t4'), 2026, 2, 'kalendertage'); t('t4 Februar Kalendertage 13/28', b4k.zaehler === 13 && b4k.nenner === 28);
  const b4v = A.beschaeftigung(ma('t4'), 2026, 3); t('t4 März voll: 30 SV-Tage, Monatstabelle', b4v.voll && b4v.svTage === 30 && b4v.steuerTage === null);
  const b5 = A.beschaeftigung(ma('t5'), 2026, 10); t('t5 Oktober ab 2.: 30 Kalendertage, 30 SV-Tage, 30/30', b5.kalendertage === 30 && b5.svTage === 30 && b5.zaehler === 30 && b5.nenner === 30 && !b5.voll);
  const b5k = A.beschaeftigung(ma('t5'), 2026, 10, 'kalendertage'); t('t5 Oktober Kalendertage 30/31', b5k.zaehler === 30 && b5k.nenner === 31);
  t('Arbeitstage Februar 2026 = 20', A.arbeitstage(2026, 2, 1, 28) === 20);
  const voll = A.beschaeftigung({ eintritt: '2026-02-01', austritt: '2026-02-28' }, 2026, 2); t('Februar 01.–28. = voller Monat (30 SV-Tage)', voll.voll && voll.svTage === 30);
}

// 3) Eintritt 15.11. – Handrechnung
{
  const a = abr('t1', 11), m = a.laufend;
  t('t1 Gehalt 4.500 × 16/30 = 2.400,00', eq(m.brutto, 2400));
  t('t1 Teil-BBG KV 69.750/360×16 = 3.100,00, RV 4.506,67', eq(a.bbg.kv, 3100) && eq(a.bbg.rv, 4506.67), JSON.stringify(a.bbg));
  t('t1 KV 2.400 × 8,75 % = 210,00', eq(abz(a, 3).summe, 210)); t('t1 PV 2,4 % = 57,60', eq(abz(a, 4).summe, 57.6));
  t('t1 RV 9,3 % = 223,20', eq(abz(a, 5).summe, 223.2)); t('t1 AV 1,3 % = 31,20', eq(abz(a, 6).summe, 31.2));
  t('t1 PAP-Eingabe Tagestabelle LZZ 4, RE4 = 150,00 €', a.lstEingaben.LZZ === 4 && a.lstEingaben.RE4 === 15000);
  const o = bmf(a.lstEingaben); t('t1 BMF-Referenz vorhanden', !!o);
  if (o) { t('t1 LSt = BMF-Tageslohnsteuer × 16', eq(abz(a, 0).summe, o.bmf.LSTLZZ / 100 * 16), `${abz(a, 0).summe} vs ${o.bmf.LSTLZZ}`);
    t('t1 KiSt = 9 % der Tages-BK (abgerundet) × 16', eq(abz(a, 2).summe, Math.floor(o.bmf.BK * 9 / 100) / 100 * 16)); }
  t('t1 Teilmonat-Text', a.teilmonat && a.teilmonat.text.startsWith('Teilmonat 15.11.–30.11.2026: 16 Kalendertage · 16 SV-Tage'), a.teilmonat && a.teilmonat.text);
  t('t1 Oktober: keine Abrechnung (vor Eintritt)', wirft(() => abr('t1', 10), 'vor dem Eintrittsdatum (15.11.2026)'));
  const d = abr('t1', 12); t('t1 Dezember voll, Monatstabelle', d.lstEingaben.LZZ === 2 && !d.teilmonat && eq(d.laufend.brutto, 4500));
  t('t1 Jahressummen Dez ab Eintritt: Brutto 2.400 + 4.500', eq(d.jahressummen.gesamtBrutto, 6900) && d.jahressummen.svTage === 46, JSON.stringify(d.jahressummen));
  const at = abr('t1', 11, { methode: 'arbeitstage' }); t('t1 Arbeitstage-Methode 4.500 × 11/21 = 2.357,14', eq(at.laufend.brutto, 2357.14));
  t('t1 Konsistenz Netto', eq(a.gesamtBrutto - a.steuerSumme - a.svSumme, a.netto));
}
// 4) Austritt 10.03. (StKl III, BY, rk, 1 Kind)
{
  const a = abr('t2', 3), m = a.laufend;
  t('t2 Gehalt 3.800 × 10/30 = 1.266,67', eq(m.brutto, 1266.67));
  t('t2 RE4 Tag = 126,67 €, LZZ 4', a.lstEingaben.LZZ === 4 && a.lstEingaben.RE4 === 12667);
  const o = bmf(a.lstEingaben); if (o) t('t2 LSt = BMF × 10', eq(abz(a, 0).summe, o.bmf.LSTLZZ / 100 * 10)); else t('t2 BMF-Referenz vorhanden', false);
  t('t2 KV 1.266,67 × 8,75 % = 110,83', eq(abz(a, 3).summe, 110.83)); t('t2 PV 1,8 % = 22,80', eq(abz(a, 4).summe, 22.8));
  t('t2 April: keine Abrechnung (nach Austritt)', wirft(() => abr('t2', 4), 'nach dem Austrittsdatum (10.03.2026)'));
  t('t2 Jahressummen Jan–Mär: SV-Tage 70, Brutto 2×3.800 + 1.266,67', a.jahressummen.svTage === 70 && eq(a.jahressummen.gesamtBrutto, 8866.67), JSON.stringify(a.jahressummen));
}
// 5) Ein- und Austritt im selben Monat
{
  const a = abr('t3', 7);
  t('t3 Gehalt 3.000 × 19/30 = 1.900,00', eq(a.laufend.brutto, 1900)); t('t3 RE4 Tag 100,00 €', a.lstEingaben.RE4 === 10000 && a.lstEingaben.LZZ === 4);
  t('t3 SV 19 Tage: RV 176,70', eq(abz(a, 5).summe, 176.7));
  const o = bmf(a.lstEingaben); t('t3 LSt = BMF × 19', !!o && eq(abz(a, 0).summe, o.bmf.LSTLZZ / 100 * 19));
  t('t3 Juni und August ohne Abrechnung', wirft(() => abr('t3', 6), 'vor dem') && wirft(() => abr('t3', 8), 'nach dem'));
  t('t3 Jahressummen nur Juli', eq(a.jahressummen.gesamtBrutto, 1900) && a.jahressummen.svTage === 19);
}
// 6) Februar, Teil-BBG greift
{
  const a = abr('t4', 2);
  t('t4 Gehalt 6.000 × 13/30 = 2.600,00', eq(a.laufend.brutto, 2600));
  t('t4 Teil-BBG KV 2.518,75 / RV 3.661,67', eq(a.bbg.kv, 2518.75) && eq(a.bbg.rv, 3661.67));
  t('t4 KV auf Teil-BBG: 2.518,75 × 8,75 % = 220,39', eq(abz(a, 3).summe, 220.39)); t('t4 PV 2,4 % = 60,45', eq(abz(a, 4).summe, 60.45));
  t('t4 RV unter Teil-BBG: 241,80', eq(abz(a, 5).summe, 241.8)); t('t4 SV-Brutto KV beitragspfl. 2.518,75', eq(a.svBrutto.kv, 2518.75));
  t('t4 RE4 Tag 200,00 €', a.lstEingaben.RE4 === 20000);
  const k = abr('t4', 2, { methode: 'kalendertage' }); t('t4 Kalendertage-Methode 6.000 × 13/28 = 2.785,71', eq(k.laufend.brutto, 2785.71));
}
// 7) 31-Tage-Monat, Eintritt 02.10.
{
  const a = abr('t5', 10);
  t('t5 30-Tage-Methode: volles Gehalt 4.000', eq(a.laufend.brutto, 4000));
  t('t5 dennoch Teillohnzahlungszeitraum: Tagestabelle × 30', a.lstEingaben.LZZ === 4 && a.laufend.steuerTage === 30 && a.lstEingaben.RE4 === 13333);
  t('t5 30 SV-Tage: Teil-BBG = Monats-BBG', eq(a.bbg.kv, 5812.5) && eq(a.bbg.rv, 8450));
  const o = bmf(a.lstEingaben); t('t5 LSt = BMF × 30', !!o && eq(abz(a, 0).summe, o.bmf.LSTLZZ / 100 * 30));
  const k = abr('t5', 10, { methode: 'kalendertage' }); t('t5 Kalendertage 4.000 × 30/31 = 3.870,97', eq(k.laufend.brutto, 3870.97));
}
// 8) Einmalzahlung im Austrittsmonat (Austritt 15.09., Firmenwagen, Urlaubsgeld Juni)
{
  const a = abr('t6', 9), m = a.laufend;
  t('t6 Gehalt 7.800 × 15/30 = 3.900', eq(m.brutto, 3900)); t('t6 Firmenwagen voller Monatswert 390,00 (nicht anteilig)', eq(m.fwVorteil, 390));
  t('t6 Bezugszeile Firmenwagen "voller Monatswert"', a.bezuege.some(b => b.la === '1200' && /voller Monatswert/.test(b.text)));
  t('t6 laufend RV auf Teil-BBG 4.225,00 (15 Tage)', eq(a.bbg.rv, 4225) && eq(m.rv, r2(4225 * 9.3 / 100)), `${m.rv}`);
  // § 23a: anteilige Jahres-BBG RV = 101.400/360 × 255 = 71.825; verbeitragt: 8 × 8.190 + 4.225 = 69.745; Juni-Urlaubsgeld 1.000 → frei 1.080
  t('t6 anteilige Jahres-BBG RV 71.825 (255 SV-Tage)', eq(a.einmal.bbgRVanteilig, 71825) && a.jahressummen.svTage === 255);
  t('t6 Bonus RV-pflichtig 1.080,00', eq(a.einmal.svRV, 1080), `${a.einmal.svRV}`);
  t('t6 Bonus RV 100,44 / AV 14,04', eq(a.einmal.rv, 100.44) && eq(a.einmal.av, 14.04));
  t('t6 Bonus KV-frei (Jahres-BBG KV ausgeschöpft)', eq(a.einmal.svKV, 0) && eq(a.einmal.kv, 0));
  t('t6 JRE4 = 8 × 8.190 + 4.290 + 3 × 8.190 (Hochrechnung) + 1.000 = 95.380', eq(a.einmal.jre4, 95380), `${a.einmal.jre4}`);
  const o = ref.find(f => f.eingabe.SONSTB === 500000); t('t6 LSt Bonus = BMF (sonstiger Bezug)', !!o && eq(a.einmal.lst, o.bmf.STS / 100) && o.eingabe.JRE4 === 9538000);
  t('t6 Oktober ohne Abrechnung', wirft(() => abr('t6', 10), 'nach dem Austrittsdatum (15.09.2026)'));
  t('t6 Konsistenz Netto', eq(a.gesamtBrutto - a.steuerSumme - a.svSumme, a.netto));
}
// 9) Minijob im Teilmonat: anteilige Mindestbemessungsgrundlage 175 × 17/30 = 99,17
{
  const a = abr('t7', 7);
  t('t7 Minijob 150 × 17/30 = 85,00', eq(a.laufend.brutto, 85) && a.art === 'Minijob');
  t('t7 RV-AN = 99,17 × 18,6 % − 12,75 = 5,70', eq(abz(a, 5).summe, 5.7), `${abz(a, 5).summe}`);
  t('t7 keine Lohnsteuer (Pauschsteuer)', eq(a.steuerSumme, 0));
}
// 10) Übergangsbereich im Teilmonat: Einordnung nach regelmäßigem Entgelt, AE hochrechnen, BE anteilig
{
  const a = abr('t8', 11);
  t('t8 Midijob 1.500 × 15/30 = 750 bleibt Übergangsbereich', eq(a.laufend.brutto, 750) && a.art.startsWith('Midijob'));
  t('t8 BE-AN = 1.284,18 × 15/30 = 642,09 → KV 56,18', eq(abz(a, 3).summe, 56.18), `${abz(a, 3).summe}`);
}
// 11) Ohne Teilmonat unverändert: voller Monat = Rechner
{
  const a = abr('t6', 5), r = R.berechne(Object.assign(E.eingabeAus(A.werteFuer(ma('t6'))), { einmalzahlung: 0 })).monat;
  t('voller Monat = Rechner (LSt/KV/RV/Netto)', eq(abz(a, 0).summe, r.lst) && eq(abz(a, 3).summe, r.kv) && eq(abz(a, 5).summe, r.rv) && eq(a.netto, r.netto));
}
// 12) Ausgabe: PDF und HTML enthalten Teilmonat-Angaben
{
  globalThis.Abrechnung = A; const AUS = require('../js/abrechnung-ausgabe.js') && globalThis.AbrechnungAusgabe;
  const a = abr('t1', 11), mo = AUS.modell(a);
  t('Ausgabe: Teilmonat-Zeile', /16 SV-Tage/.test(mo.teil));
  t('Ausgabe: SV-Tage in SV-Merkmalen', mo.merkmale[1].paare.some(([k, v]) => k === 'SV-Tage' && v.startsWith('16')));
  t('Ausgabe: Lohnzahlungszeitraum Tagestabelle', mo.merkmale[0].paare.some(([k, v]) => /Tagestabelle × 16/.test(v)));
  const m2 = AUS.modell(abr('t2', 3)); t('Ausgabe: Austritt in Stammdaten', m2.stamm.some(([k, v]) => k === 'Austritt' && v === '10.03.2026'));
  t('Ausgabe: HTML mit lz-teil', AUS.html(a).includes('lz-teil'));
}
// 13) PDF: Teilmonats-Abrechnungen passen auf eine A4-Seite
{
  globalThis.jspdf = require('../js/vendor/jspdf.umd.min.js'); const AUS = globalThis.AbrechnungAusgabe;
  for (const [id, mo] of [['t1', 11], ['t2', 3], ['t6', 9], ['t8', 11]]) t(`PDF ${id}/${mo} eine Seite`, AUS.pdf([abr(id, mo)]).getNumberOfPages() === 1);
}
console.log(`${ok}/${ok + fail} Teilmonatstests bestanden (davon ${ref.length} PAP-Aufrufe gegen BMF-Schnittstelle, ${ref.filter(f => f.eingabe.LZZ === 4).length} mit Tagestabelle)`);
if (fail) process.exit(1);
