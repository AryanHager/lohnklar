/*
 * Entgeltabrechnung je Mitarbeiter und Monat.
 * Nutzt unverändert die geprüfte Rechenlogik (Rechner.berechne für den laufenden Monat,
 * berechneLohnsteuer2026 = BMF-PAP 2026 für sonstige Bezüge).
 * Einmalzahlungen:
 *  - Lohnsteuer nach § 39b Abs. 3 EStG: JRE4 = voraussichtlicher Jahresarbeitslohn (12 × laufender Monat)
 *    zzgl. in Vormonaten gezahlter sonstiger Bezüge, SONSTB = Einmalzahlung des Monats.
 *  - SV nach § 23a SGB IV: beitragspflichtig bis zur anteiligen Jahres-BBG (BBG/Monat × Beschäftigungsmonate
 *    im Kalenderjahr bis einschließlich Auszahlungsmonat) abzüglich bereits verbeitragter Entgelte.
 *    Für Dezember bei ganzjähriger Beschäftigung identisch mit der Jahresbetrachtung des Rechners.
 */
(function (root) {
  'use strict';
  const R = root.Rechner || require('./rechner.js');
  const E = root.Eingabe || require('./eingabe.js');
  const LSt = root.berechneLohnsteuer2026 || require('./lohnsteuer2026.js').berechneLohnsteuer2026;
  const W = R.WERTE;
  const r2 = (x) => Math.round((x + Number.EPSILON * Math.sign(x)) * 100) / 100;
  const cent = (x) => Math.round(x * 100);
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const KONFESSIONEN = { '': 'keine', ev: 'evangelisch', rk: 'römisch-katholisch', ak: 'altkatholisch', lt: 'evangelisch-lutherisch', rf: 'evangelisch-reformiert',
    fr: 'französisch-reformiert', fa: 'freireligiös (Pfalz)', fb: 'freireligiös (Baden)', fg: 'freireligiös (Bayern)', fm: 'freireligiös (Mainz)', fs: 'freireligiös (Offenbach)',
    ib: 'israelitisch (Baden)', jd: 'jüdisch', jh: 'jüdisch (Hessen)', il: 'israelitisch (Bayern)', is: 'israelitisch (Saarland)' };

  /** Mitarbeiter-Stammdaten -> Formularwerte für die Rechenlogik (laufender Monat, ohne Einmalzahlungen) */
  function werteFuer(ma) {
    const w = Object.assign({}, ma.werte || {});
    w._modus = 'b2n'; w._zeitraum = 'monat';
    w.kirche = !!ma.konfession;
    if (ma.geburtsdatum) w.geburtsjahr = Number(String(ma.geburtsdatum).slice(0, 4));
    w.ezWeihnacht = 0; w.ezBonus = 0;
    return w;
  }
  const monatKey = (j, m) => `${j}-${String(m).padStart(2, '0')}`;

  function erstelleAbrechnung(firma, ma, jahr, monat, opt = {}) {
    jahr = Number(jahr); monat = Number(monat);
    if (jahr !== 2026) throw new Error('Die Rechenlogik ist für das Abrechnungsjahr 2026 ausgelegt.');
    const w = werteFuer(ma), e = E.eingabeAus(w);
    e.einmalzahlung = 0;
    const reg = R.berechne(e), m = reg.monat;
    // Beschäftigungsbeginn im Kalenderjahr
    let start = 1;
    if (ma.eintritt) {
      const ej = Number(ma.eintritt.slice(0, 4)), em = Number(ma.eintritt.slice(5, 7));
      if (ej > jahr || (ej === jahr && em > monat)) throw new Error('Der Abrechnungsmonat liegt vor dem Eintrittsdatum.');
      if (ej === jahr) start = em;
    }
    const alle = (opt.einmalzahlungen || ma.einmalzahlungen || []).filter(x => x && Number(x.betrag) > 0);
    const ezMonat = (k) => alle.filter(x => x.monat === monatKey(jahr, k)).map(x => ({ bezeichnung: x.bezeichnung || 'Einmalzahlung', betrag: r2(E.zahl(x.betrag)) }));
    const alter = 2026 - (e.geburtsjahr || 1990);
    const kvAN = W.KV_ALLG / 2 + e.kvZusatz / 2, pvAN = R.pvSatzAN(e, alter);
    const pvAG = e.bundesland === 'SN' ? W.PV_AG_SN : W.PV - W.PV_AN;
    const minijob = reg.art === 'Minijob';
    let vorherEZ = 0, verbrauchtKV = 0, verbrauchtRV = 0;

    function einmal(k) {
      const posten = ezMonat(k), summe = r2(posten.reduce((a, x) => a + x.betrag, 0));
      const o = { posten, brutto: summe, lst: 0, soli: 0, kist: 0, kv: 0, pv: 0, rv: 0, av: 0, svKV: 0, svRV: 0, agKv: 0, agPv: 0, agRv: 0, agAv: 0, netto: 0 };
      if (!summe) return o;
      if (minijob) {
        o.svRV = summe;
        o.rv = e.rvPflicht && !e.minijobRvBefreit ? r2(summe * (W.RV - W.MINI_RV_AG) / 100) : 0;
        o.agRv = r2(summe * W.MINI_RV_AG / 100); if (e.kv === 'gkv') o.agKv = r2(summe * 0.13);
      } else {
        const lo = LSt(Object.assign({}, reg.lstEingaben, { JRE4: cent(m.steuerBrutto * 12 + vorherEZ), SONSTB: cent(summe) }));
        o.lst = lo.STS / 100; o.soli = lo.SOLZS / 100;
        o.kist = e.kirche ? Math.floor(lo.BKS * reg.kirchensteuersatz / 100) / 100 : 0;
        const n = k - start + 1;
        o.svKV = r2(Math.min(summe, Math.max(0, W.BBG_KV_M * n - Math.min(m.svBrutto, W.BBG_KV_M) * n - verbrauchtKV)));
        o.svRV = r2(Math.min(summe, Math.max(0, W.BBG_RV_M * n - Math.min(m.svBrutto, W.BBG_RV_M) * n - verbrauchtRV)));
        if (e.kv === 'gkv') { o.kv = r2(o.svKV * kvAN / 100); o.pv = r2(o.svKV * pvAN / 100); o.agKv = r2(o.svKV * kvAN / 100); o.agPv = r2(o.svKV * pvAG / 100); }
        if (e.rvPflicht) { o.rv = r2(o.svRV * W.RV / 200); o.agRv = o.rv; }
        if (e.avPflicht) { o.av = r2(o.svRV * W.AV / 200); o.agAv = o.av; }
      }
      vorherEZ = r2(vorherEZ + summe); verbrauchtKV = r2(verbrauchtKV + o.svKV); verbrauchtRV = r2(verbrauchtRV + o.svRV);
      o.netto = r2(summe - o.lst - o.soli - o.kist - o.kv - o.pv - o.rv - o.av);
      return o;
    }

    // Monatsweise kumulieren (laufender Bezug konstant, Einmalzahlungen je Monat)
    const FELDER = ['gesamtBrutto', 'steuerBrutto', 'svKV', 'svRV', 'lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av', 'netto', 'auszahlung', 'agKv', 'agPv', 'agRv', 'agAv'];
    const kum = Object.fromEntries(FELDER.map(f => [f, 0]));
    let akt = null;
    for (let k = start; k <= monat; k++) {
      const ez = einmal(k);
      const zeile = monatsWerte(m, ez);
      if (k === monat) akt = { ez, werte: zeile };
      for (const f of FELDER) kum[f] = r2(kum[f] + zeile[f]);
    }
    if (opt.vortrag) { // manuell überschriebene Summen Januar bis Vormonat
      for (const f of FELDER) if (opt.vortrag[f] !== undefined && opt.vortrag[f] !== '') kum[f] = r2(E.zahl(opt.vortrag[f]) + akt.werte[f]);
    }
    const ez = akt.ez, mw = akt.werte;

    // Bezüge (Lohnarten)
    const bezuege = [{ la: '1000', text: 'Gehalt', betrag: m.brutto, st: 'L', sv: 'L' }];
    if (m.vwlAG) bezuege.push({ la: '1100', text: 'Vermögenswirksame Leistungen (AG-Anteil)', betrag: m.vwlAG, st: 'L', sv: 'L' });
    if (m.fwVorteil) bezuege.push({ la: '1200', text: `Geldwerter Vorteil Firmenwagen (${String(reg.firmenwagenAnteil).replace('.', ',')}-%-Regel)`, betrag: m.fwVorteil, st: 'L', sv: 'L' });
    if (m.radVorteil) bezuege.push({ la: '1210', text: 'Geldwerter Vorteil Firmenrad', betrag: m.radVorteil, st: 'L', sv: 'L' });
    const gwvSonst = r2(m.gwv - m.fwVorteil - m.radVorteil);
    if (gwvSonst > 0) bezuege.push({ la: '1290', text: 'Sonstiger geldwerter Vorteil', betrag: gwvSonst, st: 'L', sv: 'L' });
    ez.posten.forEach((p, i) => bezuege.push({ la: String(1500 + i), text: p.bezeichnung, betrag: p.betrag, st: 'E', sv: 'E' }));
    const umwandlung = [];
    if (m.bavAN) umwandlung.push({ la: '2000', text: 'Entgeltumwandlung betriebliche Altersversorgung', betrag: -m.bavAN, st: (m.bavAN + e.bavAG) > W.BAV_STFREI_M ? 'T' : 'F', sv: (m.bavAN + e.bavAG) > W.BAV_SVFREI_M ? 'T' : 'F' });
    if (m.radUmwandlung) umwandlung.push({ la: '2100', text: 'Gehaltsumwandlung Firmenrad (Leasingrate)', betrag: -m.radUmwandlung, st: 'F', sv: 'F' });

    const abzuege = [
      { text: 'Lohnsteuer', l: m.lst, e: ez.lst }, { text: 'Solidaritätszuschlag', l: m.soli, e: ez.soli },
      { text: `Kirchensteuer (${e.kirche ? reg.kirchensteuersatz + ' %' : 'entfällt'})`, l: m.kist, e: ez.kist },
      e.kv === 'pkv' ? { text: 'Private Krankenversicherung (abzgl. AG-Zuschuss)', l: m.kv, e: 0 } : { text: `Krankenversicherung (${fmtP(kvAN)} %)`, l: m.kv, e: ez.kv },
      e.kv === 'pkv' ? { text: 'Private Pflegeversicherung (abzgl. AG-Zuschuss)', l: m.pv, e: 0 } : { text: `Pflegeversicherung (${fmtP(pvAN)} %)`, l: m.pv, e: ez.pv },
      { text: `Rentenversicherung (${minijob ? '3,6' : '9,3'} %)`, l: m.rv, e: ez.rv }, { text: 'Arbeitslosenversicherung (1,3 %)', l: m.av, e: ez.av }
    ].map(x => Object.assign(x, { summe: r2(x.l + x.e) }));
    const sonstige = [];
    if (m.gwv) sonstige.push({ text: 'Verrechnung geldwerter Vorteile (Sachbezüge)', betrag: -m.gwv });
    if (m.vwlSpar) sonstige.push({ text: 'Überweisung vermögenswirksame Leistungen', betrag: -m.vwlSpar });
    if (m.steuerfrei) sonstige.push({ text: 'Steuer- und sozialversicherungsfreie Bezüge', betrag: m.steuerfrei });

    const steuerSumme = r2(abzuege.slice(0, 3).reduce((a, x) => a + x.summe, 0)), svSumme = r2(abzuege.slice(3).reduce((a, x) => a + x.summe, 0));
    const ergebnis = {
      firma, mitarbeiter: ma, jahr, monat, monatName: MONATE[monat - 1], zeitraum: `01.${String(monat).padStart(2, '0')}.${jahr} – ${letzterTag(jahr, monat)}.${String(monat).padStart(2, '0')}.${jahr}`,
      art: reg.art, eingabe: e, kirchensteuersatz: reg.kirchensteuersatz, konfession: KONFESSIONEN[ma.konfession || ''] || ma.konfession,
      kasse: E.kassenName(w), kvAN, pvAN, beschaeftigtSeit: start,
      steuermerkmale: { steuerklasse: e.steuerklasse, faktor: e.steuerklasse === 4 && e.faktor < 1 ? e.faktor : null, kinderfreibetraege: e.steuerklasse <= 4 ? e.kinderfreibetraege : 0, freibetrag: e.freibetrag, bundesland: (R.BUNDESLAENDER.find(b => b.code === e.bundesland) || {}).name },
      bezuege, umwandlung,
      gesamtBrutto: mw.gesamtBrutto, steuerBrutto: { l: m.steuerBrutto, e: ez.brutto }, svBrutto: { l: m.svBrutto, kv: r2(Math.min(m.svBrutto, W.BBG_KV_M) + ez.svKV), rv: r2(Math.min(m.svBrutto, W.BBG_RV_M) + ez.svRV), e: ez.brutto },
      abzuege, steuerSumme, svSumme, netto: mw.netto, sonstige, auszahlung: mw.auszahlung,
      pkv: e.kv === 'pkv' ? { beitrag: m.pkvBeitrag, zuschuss: m.pkvZuschuss } : null,
      arbeitgeber: { kv: mw.agKv, pv: mw.agPv, rv: mw.agRv, av: mw.agAv, bavAG: e.bavAG },
      jahressummen: kum, vortragManuell: !!opt.vortrag,
      einmal: ez, laufend: m
    };
    return ergebnis;
  }
  function monatsWerte(m, ez) {
    return {
      gesamtBrutto: r2(m.gesamtBrutto + ez.brutto), steuerBrutto: r2(m.steuerBrutto + ez.brutto),
      svKV: r2(Math.min(m.svBrutto, W.BBG_KV_M) + ez.svKV), svRV: r2(Math.min(m.svBrutto, W.BBG_RV_M) + ez.svRV),
      lst: r2(m.lst + ez.lst), soli: r2(m.soli + ez.soli), kist: r2(m.kist + ez.kist), kv: r2(m.kv + ez.kv), pv: r2(m.pv + ez.pv), rv: r2(m.rv + ez.rv), av: r2(m.av + ez.av),
      netto: r2(m.netto + ez.netto), auszahlung: r2(m.auszahlung + ez.netto),
      agKv: r2(m.agKv + ez.agKv), agPv: r2(m.agPv + ez.agPv), agRv: r2(m.agRv + ez.agRv), agAv: r2(m.agAv + ez.agAv)
    };
  }
  const letzterTag = (j, m) => new Date(j, m, 0).getDate();
  const fmtP = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

  const api = { erstelleAbrechnung, werteFuer, MONATE, KONFESSIONEN };
  root.Abrechnung = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
