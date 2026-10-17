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
 * Teilmonate (Eintritt/Austritt im Monat):
 *  - Bezüge anteilig nach 30-Tage-Methode (Standard), Kalendertagen oder Arbeitstagen (Mo–Fr); Firmenwagen/-rad voller Monatswert
 *    (R 8.1 Abs. 9 Nr. 1 Satz 4 LStR: Monatswert auch bei nur zeitweiser Überlassung im Kalendermonat).
 *  - Lohnsteuer: Teillohnzahlungszeitraum, Tagestabelle (PAP LZZ = 4) × Kalendertage (§ 39b Abs. 2 EStG, R 39b.5 Abs. 2 LStR).
 *  - SV: SV-Tage = Kalendertage (voller Monat = 30), Teil-BBG = Jahres-BBG / 360 × SV-Tage (§ 223 SGB V, § 23a SGB IV).
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
  const pad = (n) => String(n).padStart(2, '0');
  const letzterTag = (j, m) => new Date(j, m, 0).getDate();
  const isoDatum = (s) => { const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); return t ? { j: +t[1], m: +t[2], t: +t[3] } : null; };
  const vergl = (a, b) => (a.j - b.j) || (a.m - b.m) || (a.t - b.t);
  const deDatum = (d) => `${pad(d.t)}.${pad(d.m)}.${d.j}`;

  const METHODEN = {
    '30tage': '30-Tage-Methode',
    kalendertage: 'Kalendertage des Monats',
    arbeitstage: 'Arbeitstage (Mo–Fr) des Monats'
  };
  /** Arbeitstage Mo–Fr von Tag a bis Tag b (einschließlich) im Monat; Feiertage werden nicht berücksichtigt */
  function arbeitstage(j, m, a, b) { let n = 0; for (let t = a; t <= b; t++) { const w = new Date(j, m - 1, t).getDay(); if (w !== 0 && w !== 6) n++; } return n; }

  /**
   * Beschäftigung im Abrechnungsmonat.
   *  status: 'vor' (vor Eintritt), 'nach' (nach Austritt), 'voll', 'teil'
   *  kalendertage = beschäftigte Kalendertage; svTage = 30 bei vollem Monat, sonst Kalendertage (max. 30, § 223 Abs. 2 SGB V);
   *  steuerTage = Kalendertage des Teillohnzahlungszeitraums (R 39b.5 Abs. 2 LStR), bei vollem Monat null (Monatstabelle).
   *  Anteilsfaktor zaehler/nenner nach gewählter Methode (bei vollem Monat immer 1).
   */
  function beschaeftigung(ma, jahr, monat, methode) {
    const ein = isoDatum(ma.eintritt), aus = isoDatum(ma.austritt), mt = letzterTag(jahr, monat);
    const anfang = { j: jahr, m: monat, t: 1 }, ende = { j: jahr, m: monat, t: mt };
    if (ein && vergl(ein, ende) > 0) return { status: 'vor', eintritt: ein };
    if (aus && vergl(aus, anfang) < 0) return { status: 'nach', austritt: aus };
    const von = ein && vergl(ein, anfang) > 0 ? ein.t : 1, bis = aus && vergl(aus, ende) < 0 ? aus.t : mt;
    const kt = bis - von + 1, voll = von === 1 && bis === mt;
    methode = METHODEN[methode] ? methode : '30tage';
    let zaehler = 1, nenner = 1;
    if (!voll) {
      if (methode === 'kalendertage') { zaehler = kt; nenner = mt; }
      else if (methode === 'arbeitstage') { zaehler = arbeitstage(jahr, monat, von, bis); nenner = arbeitstage(jahr, monat, 1, mt); }
      else { zaehler = Math.min(kt, 30); nenner = 30; }
    }
    return {
      status: voll ? 'voll' : 'teil', voll, von, bis, monatsTage: mt, kalendertage: kt,
      svTage: voll ? 30 : Math.min(kt, 30), steuerTage: voll ? null : kt,
      methode, methodeText: METHODEN[methode], zaehler, nenner, faktor: nenner ? zaehler / nenner : 0,
      vonText: `${pad(von)}.${pad(monat)}.`, bisText: `${pad(bis)}.${pad(monat)}.${jahr}`
    };
  }

  /** Teilmonat: laufende Monatsbezüge anteilig (Gehalt, VWL-AG-Anteil, bAV AN/AG). Firmenwagen/-rad (Monatswert 1 %/0,25 %-Regel), Sachbezüge,
   *  steuerfreie Bezüge und VWL-Sparrate bleiben ungekürzt. */
  function anteiligeEingabe(e, b, regelSvBrutto) {
    const k = Object.assign({}, e), q = (x) => r2((x || 0) * b.zaehler / b.nenner);
    k.brutto = q(e.brutto); k.vwlAG = q(e.vwlAG); k.bavAN = q(e.bavAN); k.bavAG = q(e.bavAG);
    k._teil = { svTage: b.svTage, steuerTage: b.steuerTage, regelSvBrutto };
    return k;
  }

  function erstelleAbrechnung(firma, ma, jahr, monat, opt = {}) {
    jahr = Number(jahr); monat = Number(monat);
    if (jahr !== 2026) throw new Error('Die Rechenlogik ist für das Abrechnungsjahr 2026 ausgelegt.');
    const ein = isoDatum(ma.eintritt), aus = isoDatum(ma.austritt);
    if (ein && aus && vergl(aus, ein) < 0) throw new Error('Das Austrittsdatum liegt vor dem Eintrittsdatum.');
    const methode = opt.methode || ma.teilmonatMethode || '30tage';
    const bAkt = beschaeftigung(ma, jahr, monat, methode);
    if (bAkt.status === 'vor') throw new Error(`Keine Abrechnung: Der Abrechnungsmonat liegt vor dem Eintrittsdatum (${deDatum(bAkt.eintritt)}).`);
    if (bAkt.status === 'nach') throw new Error(`Keine Abrechnung: Der Abrechnungsmonat liegt nach dem Austrittsdatum (${deDatum(bAkt.austritt)}).`);
    const w = werteFuer(ma), e = E.eingabeAus(w);
    e.einmalzahlung = 0;
    const reg = R.berechne(e), regM = reg.monat;
    // Beschäftigungszeitraum im Kalenderjahr
    const start = ein && ein.j === jahr ? ein.m : 1;
    const alle = (opt.einmalzahlungen || ma.einmalzahlungen || []).filter(x => x && Number(E.zahl(x.betrag)) > 0);
    const ezMonat = (k) => alle.filter(x => x.monat === monatKey(jahr, k)).map(x => ({ bezeichnung: x.bezeichnung || 'Einmalzahlung', betrag: r2(E.zahl(x.betrag)) }));
    const alter = 2026 - (e.geburtsjahr || 1990);
    const kvAN = W.KV_ALLG / 2 + e.kvZusatz / 2, pvAN = R.pvSatzAN(e, alter);
    const pvAG = e.bundesland === 'SN' ? W.PV_AG_SN : W.PV - W.PV_AN;
    const minijob = reg.art === 'Minijob';

    /** laufender Monat k (voll: unverändertes Rechenergebnis; Teilmonat: anteilige Bezüge, SV-Tage, Tagestabelle) */
    function laufend(k) {
      const b = k === monat ? bAkt : beschaeftigung(ma, jahr, k, methode);
      if (b.voll) return { b, r: reg, m: regM, bbgKV: W.BBG_KV_M, bbgRV: W.BBG_RV_M, ek: e };
      const ek = anteiligeEingabe(e, b, regM.svBrutto), r = R.berechne(ek);
      return { b, r, m: r.monat, bbgKV: r.monat.bbgKV, bbgRV: r.monat.bbgRV, ek };
    }

    let vorherEZ = 0, verbrauchtKV = 0, verbrauchtRV = 0, svTageKum = 0, regKVKum = 0, regRVKum = 0, stBruttoKum = 0, monateBesch = 0;
    function einmal(k, lm) {
      const posten = ezMonat(k), summe = r2(posten.reduce((a, x) => a + x.betrag, 0));
      const o = { posten, brutto: summe, lst: 0, soli: 0, kist: 0, kv: 0, pv: 0, rv: 0, av: 0, svKV: 0, svRV: 0, agKv: 0, agPv: 0, agRv: 0, agAv: 0, netto: 0 };
      if (!summe) return o;
      if (minijob) {
        o.svRV = summe;
        o.rv = e.rvPflicht && !e.minijobRvBefreit ? r2(summe * (W.RV - W.MINI_RV_AG) / 100) : 0;
        o.agRv = r2(summe * W.MINI_RV_AG / 100); if (e.kv === 'gkv') o.agKv = r2(summe * 0.13);
      } else {
        // § 39b Abs. 3 EStG / R 39b.6 Abs. 2, 3 LStR: tatsächlicher laufender Arbeitslohn der abgelaufenen Monate dieses Dienstverhältnisses
        // (einschließlich Teilmonate) + Hochrechnung mit dem regulären Monatslohn für die übrigen Monate des Kalenderjahres
        // (Monate vor Eintritt / nach Austritt / Restzeit) + bereits gezahlte sonstige Bezüge.
        const jre4 = stBruttoKum + regM.steuerBrutto * (12 - monateBesch) + vorherEZ;
        const lo = LSt(Object.assign({}, reg.lstEingaben, { JRE4: cent(jre4), SONSTB: cent(summe) }));
        o.jre4 = r2(jre4);
        o.lst = lo.STS / 100; o.soli = lo.SOLZS / 100;
        o.kist = e.kirche ? Math.floor(lo.BKS * reg.kirchensteuersatz / 100) / 100 : 0;
        // § 23a Abs. 3 SGB IV: anteilige Jahres-BBG = Summe SV-Tage × Jahres-BBG / 360
        const bbgKVanteilig = r2(W.BBG_KV_J / 360 * svTageKum), bbgRVanteilig = r2(W.BBG_RV_J / 360 * svTageKum);
        o.bbgKVanteilig = bbgKVanteilig; o.bbgRVanteilig = bbgRVanteilig;
        o.svKV = r2(Math.min(summe, Math.max(0, bbgKVanteilig - regKVKum - verbrauchtKV)));
        o.svRV = r2(Math.min(summe, Math.max(0, bbgRVanteilig - regRVKum - verbrauchtRV)));
        if (e.kv === 'gkv') { o.kv = r2(o.svKV * kvAN / 100); o.pv = r2(o.svKV * pvAN / 100); o.agKv = r2(o.svKV * kvAN / 100); o.agPv = r2(o.svKV * pvAG / 100); }
        if (e.rvPflicht) { o.rv = r2(o.svRV * W.RV / 200); o.agRv = o.rv; }
        if (e.avPflicht) { o.av = r2(o.svRV * W.AV / 200); o.agAv = o.av; }
      }
      vorherEZ = r2(vorherEZ + summe); verbrauchtKV = r2(verbrauchtKV + o.svKV); verbrauchtRV = r2(verbrauchtRV + o.svRV);
      o.netto = r2(summe - o.lst - o.soli - o.kist - o.kv - o.pv - o.rv - o.av);
      return o;
    }

    // Monatsweise kumulieren ab Eintritt (bzw. Januar) bis Abrechnungsmonat; Monate nach Austritt entfallen
    const FELDER = ['gesamtBrutto', 'steuerBrutto', 'svKV', 'svRV', 'lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av', 'netto', 'auszahlung', 'agKv', 'agPv', 'agRv', 'agAv', 'svTage'];
    const kum = Object.fromEntries(FELDER.map(f => [f, 0]));
    let akt = null;
    for (let k = start; k <= monat; k++) {
      const lm = laufend(k);
      svTageKum += lm.b.svTage; monateBesch++;
      stBruttoKum = r2(stBruttoKum + lm.m.steuerBrutto);
      regKVKum = r2(regKVKum + Math.min(lm.m.svBrutto, lm.bbgKV)); regRVKum = r2(regRVKum + Math.min(lm.m.svBrutto, lm.bbgRV));
      const ez = einmal(k, lm);
      const zeile = monatsWerte(lm.m, ez, lm.bbgKV, lm.bbgRV);
      zeile.svTage = lm.b.svTage;
      if (k === monat) akt = { ez, werte: zeile, lm };
      for (const f of FELDER) kum[f] = r2(kum[f] + zeile[f]);
    }
    if (opt.vortrag) { // manuell überschriebene Summen Januar bis Vormonat
      for (const f of FELDER) if (opt.vortrag[f] !== undefined && opt.vortrag[f] !== '') kum[f] = r2(E.zahl(opt.vortrag[f]) + akt.werte[f]);
    }
    const ez = akt.ez, mw = akt.werte, lm = akt.lm, m = lm.m, ek = lm.ek, b = bAkt;
    const anteil = b.voll ? '' : ` (anteilig ${b.zaehler}/${b.nenner})`;

    // Bezüge (Lohnarten)
    const bezuege = [{ la: '1000', text: 'Gehalt' + anteil, betrag: m.brutto, st: 'L', sv: 'L' }];
    if (m.vwlAG) bezuege.push({ la: '1100', text: 'Vermögenswirksame Leistungen (AG-Anteil)' + anteil, betrag: m.vwlAG, st: 'L', sv: 'L' });
    if (m.fwVorteil) bezuege.push({ la: '1200', text: `Geldwerter Vorteil Firmenwagen (${String(reg.firmenwagenAnteil).replace('.', ',')}-%-Regel${b.voll ? '' : ', voller Monatswert'})`, betrag: m.fwVorteil, st: 'L', sv: 'L' });
    if (m.radVorteil) bezuege.push({ la: '1210', text: 'Geldwerter Vorteil Firmenrad' + (b.voll ? '' : ' (voller Monatswert)'), betrag: m.radVorteil, st: 'L', sv: 'L' });
    const gwvSonst = r2(m.gwv - m.fwVorteil - m.radVorteil);
    if (gwvSonst > 0) bezuege.push({ la: '1290', text: 'Sonstiger geldwerter Vorteil', betrag: gwvSonst, st: 'L', sv: 'L' });
    ez.posten.forEach((p, i) => bezuege.push({ la: String(1500 + i), text: p.bezeichnung, betrag: p.betrag, st: 'E', sv: 'E' }));
    const umwandlung = [];
    if (m.bavAN) umwandlung.push({ la: '2000', text: 'Entgeltumwandlung betriebliche Altersversorgung' + anteil, betrag: -m.bavAN, st: (m.bavAN + ek.bavAG) > W.BAV_STFREI_M ? 'T' : 'F', sv: (m.bavAN + ek.bavAG) > W.BAV_SVFREI_M ? 'T' : 'F' });
    if (m.radUmwandlung) umwandlung.push({ la: '2100', text: 'Gehaltsumwandlung Firmenrad (Leasingrate)', betrag: -m.radUmwandlung, st: 'F', sv: 'F' });

    const abzuege = [
      { text: 'Lohnsteuer' + (m.steuerTage ? ` (Tagestabelle × ${m.steuerTage})` : ''), l: m.lst, e: ez.lst }, { text: 'Solidaritätszuschlag', l: m.soli, e: ez.soli },
      { text: `Kirchensteuer (${e.kirche ? reg.kirchensteuersatz + ' %' : 'entfällt'})`, l: m.kist, e: ez.kist },
      e.kv === 'pkv' ? { text: 'Private Krankenversicherung (abzgl. AG-Zuschuss)', l: m.kv, e: 0 } : { text: `Krankenversicherung (${fmtP(kvAN)} %)`, l: m.kv, e: ez.kv },
      e.kv === 'pkv' ? { text: 'Private Pflegeversicherung (abzgl. AG-Zuschuss)', l: m.pv, e: 0 } : { text: `Pflegeversicherung (${fmtP(pvAN)} %)`, l: m.pv, e: ez.pv },
      { text: `Rentenversicherung (${minijob ? '3,6' : '9,3'} %)`, l: m.rv, e: ez.rv }, { text: 'Arbeitslosenversicherung (1,3 %)', l: m.av, e: ez.av }
    ].map(x => Object.assign(x, { summe: r2(x.l + x.e) }));
    const sonstige = [];
    if (m.gwv) sonstige.push({ text: 'Verrechnung geldwerter Vorteile (Sachbezüge)', betrag: -m.gwv });
    if (m.vwlSpar) sonstige.push({ text: 'Überweisung vermögenswirksame Leistungen', betrag: -m.vwlSpar });
    if (m.steuerfrei) sonstige.push({ text: 'Steuer- und sozialversicherungsfreie Bezüge', betrag: m.steuerfrei });

    const teilmonat = b.voll ? null : Object.assign({}, b, {
      text: `Teilmonat ${b.vonText}–${b.bisText}: ${b.kalendertage} Kalendertage · ${b.svTage} SV-Tage · Lohnsteuer nach Tagestabelle × ${b.steuerTage} Tage · ` +
        `Bezüge anteilig ${b.zaehler}/${b.nenner} (${b.methodeText}, Faktor ${fmtFaktor(b.faktor)})`
    });
    const steuerSumme = r2(abzuege.slice(0, 3).reduce((a, x) => a + x.summe, 0)), svSumme = r2(abzuege.slice(3).reduce((a, x) => a + x.summe, 0));
    const ergebnis = {
      firma, mitarbeiter: ma, jahr, monat, monatName: MONATE[monat - 1], zeitraum: `01.${pad(monat)}.${jahr} – ${letzterTag(jahr, monat)}.${pad(monat)}.${jahr}`,
      art: reg.art, eingabe: e, kirchensteuersatz: reg.kirchensteuersatz, konfession: KONFESSIONEN[ma.konfession || ''] || ma.konfession,
      kasse: E.kassenName(w), kvAN, pvAN, beschaeftigtSeit: start, teilmonat, svTage: b.svTage, bbg: { kv: lm.bbgKV, rv: lm.bbgRV },
      steuermerkmale: { steuerklasse: e.steuerklasse, faktor: e.steuerklasse === 4 && e.faktor < 1 ? e.faktor : null, kinderfreibetraege: e.steuerklasse <= 4 ? e.kinderfreibetraege : 0, freibetrag: e.freibetrag, bundesland: (R.BUNDESLAENDER.find(x => x.code === e.bundesland) || {}).name },
      bezuege, umwandlung,
      gesamtBrutto: mw.gesamtBrutto, steuerBrutto: { l: m.steuerBrutto, e: ez.brutto }, svBrutto: { l: m.svBrutto, kv: r2(Math.min(m.svBrutto, lm.bbgKV) + ez.svKV), rv: r2(Math.min(m.svBrutto, lm.bbgRV) + ez.svRV), e: ez.brutto },
      abzuege, steuerSumme, svSumme, netto: mw.netto, sonstige, auszahlung: mw.auszahlung,
      pkv: e.kv === 'pkv' ? { beitrag: m.pkvBeitrag, zuschuss: m.pkvZuschuss } : null,
      arbeitgeber: { kv: mw.agKv, pv: mw.agPv, rv: mw.agRv, av: mw.agAv, bavAG: ek.bavAG },
      jahressummen: kum, vortragManuell: !!opt.vortrag,
      einmal: ez, laufend: m, lstEingaben: lm.r.lstEingaben
    };
    return ergebnis;
  }
  function monatsWerte(m, ez, bbgKV, bbgRV) {
    return {
      gesamtBrutto: r2(m.gesamtBrutto + ez.brutto), steuerBrutto: r2(m.steuerBrutto + ez.brutto),
      svKV: r2(Math.min(m.svBrutto, bbgKV) + ez.svKV), svRV: r2(Math.min(m.svBrutto, bbgRV) + ez.svRV),
      lst: r2(m.lst + ez.lst), soli: r2(m.soli + ez.soli), kist: r2(m.kist + ez.kist), kv: r2(m.kv + ez.kv), pv: r2(m.pv + ez.pv), rv: r2(m.rv + ez.rv), av: r2(m.av + ez.av),
      netto: r2(m.netto + ez.netto), auszahlung: r2(m.auszahlung + ez.netto),
      agKv: r2(m.agKv + ez.agKv), agPv: r2(m.agPv + ez.agPv), agRv: r2(m.agRv + ez.agRv), agAv: r2(m.agAv + ez.agAv)
    };
  }
  const fmtP = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
  const fmtFaktor = (x) => (Math.round(x * 10000) / 10000).toFixed(4).replace('.', ',');

  const api = { erstelleAbrechnung, werteFuer, beschaeftigung, arbeitstage, METHODEN, MONATE, KONFESSIONEN };
  root.Abrechnung = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
