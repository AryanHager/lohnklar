/*
 * Brutto-Netto-Rechner 2026 – Sozialversicherung + Lohnsteuer (PAP 2026).
 *
 * Rechengrößen 2026 (Quellen):
 *  - BBG RV/AV 101.400 €/Jahr (8.450 €/Monat), BBG KV/PV 69.750 €/Jahr (5.812,50 €/Monat), JAEG 77.400 €:
 *    Sozialversicherungsrechengrößen-Verordnung 2026, BGBl. 2025 I Nr. 278
 *    https://www.recht.bund.de/bgbl/1/2025/278/regelungstext.pdf
 *  - KV allgemeiner Beitragssatz 14,6 %, durchschnittlicher Zusatzbeitrag 2,9 % (BMG, BAnz. 10.11.2025),
 *    PV 3,6 % (AN 1,8 %, Sachsen AN 2,3 % / AG 1,3 %), Kinderlosenzuschlag 0,6 %,
 *    Abschlag 0,25 %-Punkte je Kind ab dem 2. bis 5. Kind (unter 25), RV 18,6 %, AV 2,6 %:
 *    Senatsverwaltung für Finanzen Berlin, Rundschreiben "Berechnungsgrundlagen in der Sozialversicherung 2026";
 *    https://www.krankenkassen.de/.../rechengroessen-2026/
 *  - Geringfügigkeitsgrenze 603 €, Übergangsbereich 603,01–2.000 €, Faktor F 0,6619:
 *    Deutsche Rentenversicherung, https://www.deutsche-rentenversicherung.de/.../uebergangsbereich
 *  - Minijob: AG-Pauschalbeitrag RV 15 %, AN-Eigenanteil RV 3,6 %, Mindestbemessungsgrundlage 175 €.
 *  - bAV: steuerfrei bis 8 % der BBG RV (676 €/Monat), sozialversicherungsfrei bis 4 % (338 €/Monat) (§ 3 Nr. 63 EStG, § 1 SvEV).
 *  - Firmenwagen: 1 %-Regel + 0,03 % je Entfernungs-km (§ 6 Abs. 1 Nr. 4, § 8 Abs. 2 EStG); Hybrid ½,
 *    Elektro ¼ (Bruttolistenpreis bis 100.000 € bei Anschaffung ab 1.7.2025, sonst ½).
 *  - Firmenrad: zusätzlich zum Arbeitslohn steuerfrei (§ 3 Nr. 37 EStG); bei Gehaltsumwandlung 0,25 % der
 *    auf volle 100 € abgerundeten UVP als geldwerter Vorteil.
 */
(function (root) {
  'use strict';
  const LSt = root.berechneLohnsteuer2026 || (typeof require !== 'undefined' ? require('./lohnsteuer2026.js').berechneLohnsteuer2026 : null);

  const W = {
    BBG_KV_M: 5812.5, BBG_RV_M: 8450, BBG_KV_J: 69750, BBG_RV_J: 101400,
    KV_ALLG: 14.6, KV_ZUSATZ_DURCHSCHNITT: 2.9, PV: 3.6, PV_AN: 1.8, PV_AN_SN: 2.3, PV_AG_SN: 1.3, PV_ZUSCHLAG: 0.6, PV_ABSCHLAG: 0.25,
    RV: 18.6, AV: 2.6, MINI: 603, MIDI_OBEN: 2000, FAKTOR_F: 0.6619, MINI_RV_AG: 15, MINI_MIN_BMG: 175,
    BAV_STFREI_M: 676, BAV_SVFREI_M: 338
  };

  const BUNDESLAENDER = [
    ['BW', 'Baden-Württemberg', 8], ['BY', 'Bayern', 8], ['BE', 'Berlin', 9], ['BB', 'Brandenburg', 9],
    ['HB', 'Bremen', 9], ['HH', 'Hamburg', 9], ['HE', 'Hessen', 9], ['MV', 'Mecklenburg-Vorpommern', 9],
    ['NI', 'Niedersachsen', 9], ['NW', 'Nordrhein-Westfalen', 9], ['RP', 'Rheinland-Pfalz', 9], ['SL', 'Saarland', 9],
    ['SN', 'Sachsen', 9], ['ST', 'Sachsen-Anhalt', 9], ['SH', 'Schleswig-Holstein', 9], ['TH', 'Thüringen', 9]
  ].map(([code, name, kist]) => ({ code, name, kist }));

  const r2 = (x) => Math.round((x + Number.EPSILON * Math.sign(x)) * 100) / 100;
  const cent = (x) => Math.round(x * 100);
  const floor2 = (x) => Math.floor(x * 100 + 1e-7) / 100;

  const DEFAULTS = {
    brutto: 4000, steuerklasse: 1, faktor: 1, bundesland: 'NW', kirche: false, kinder: 0, kinderU25: 0, kinderfreibetraege: 0,
    geburtsjahr: 1990, kv: 'gkv', kvZusatz: W.KV_ZUSATZ_DURCHSCHNITT, pkvKV: 0, pkvPV: 0, rvPflicht: true, avPflicht: true,
    minijobRvBefreit: false, freibetrag: 0, bavAN: 0, bavAG: 0,
    fw: false, fwListenpreis: 0, fwKm: 0, fwAntrieb: 'verbrenner', fwZuzahlung: 0,
    rad: false, radListenpreis: 0, radModus: 'zusaetzlich', radLeasing: 0,
    gwv: 0, steuerfrei: 0, vwlAG: 0, vwlSpar: 0, einmalzahlung: 0
  };

  function firmenwagenVorteil(p) {
    if (!p.fw || !(p.fwListenpreis > 0)) return { wert: 0, satz: 0 };
    const lp = Math.floor(p.fwListenpreis / 100) * 100;
    let anteil = 1;
    if (p.fwAntrieb === 'hybrid') anteil = 0.5;
    if (p.fwAntrieb === 'elektro') anteil = lp <= 100000 ? 0.25 : 0.5;
    const wert = lp * 0.01 * anteil + lp * 0.0003 * (p.fwKm || 0) * anteil;
    return { wert: Math.max(0, r2(wert - (p.fwZuzahlung || 0))), satz: anteil };
  }
  function firmenradVorteil(p) {
    if (!p.rad || !(p.radListenpreis > 0) || p.radModus !== 'umwandlung') return 0;
    return r2(Math.floor(p.radListenpreis / 100) * 100 * 0.0025);
  }

  /** AG-Zuschuss zur PKV (§ 257 SGB V / § 61 SGB XI): halber Beitrag, max. halber allg. Satz + halber Ø-Zusatzbeitrag bzw. AG-PV-Satz aus BBG */
  function pkvZuschuss(p) {
    const pvAG = p.bundesland === 'SN' ? W.PV_AG_SN : W.PV - W.PV_AN;
    return { kv: r2(Math.min((p.pkvKV || 0) / 2, W.BBG_KV_M * (W.KV_ALLG + W.KV_ZUSATZ_DURCHSCHNITT) / 200)),
             pv: r2(Math.min((p.pkvPV || 0) / 2, W.BBG_KV_M * pvAG / 100)) };
  }
  /** PV-Arbeitnehmersatz in Prozent */
  function pvSatzAN(p, alter) {
    const sachsen = p.bundesland === 'SN';
    let s = sachsen ? W.PV_AN_SN : W.PV_AN;
    if ((p.kinder || 0) === 0 && alter >= 23) s += W.PV_ZUSCHLAG;
    else s -= W.PV_ABSCHLAG * pvAbschlaege(p);
    return s;
  }
  function pvAbschlaege(p) { return Math.max(0, Math.min(p.kinderU25 || 0, 5) - 1); }

  /** Sozialversicherung für einen Monat (regulär, laufend) */
  function sozialMonat(p, svBrutto, alter) {
    const res = { kv: 0, pv: 0, rv: 0, av: 0, agKv: 0, agPv: 0, agRv: 0, agAv: 0, pkvBeitrag: 0, pkvZuschuss: 0, art: 'regulär' };
    const sachsen = p.bundesland === 'SN';
    const pvAG = sachsen ? W.PV_AG_SN : W.PV - W.PV_AN;
    const kvAN = W.KV_ALLG / 2 + p.kvZusatz / 2;
    const pvAN = pvSatzAN(p, alter);
    if (svBrutto <= 0) return res;
    if (svBrutto <= W.MINI) {
      res.art = 'Minijob';
      if (p.rvPflicht && !p.minijobRvBefreit) {
        res.rv = r2(Math.max(svBrutto, W.MINI_MIN_BMG) * W.RV / 100 - r2(svBrutto * W.MINI_RV_AG / 100));
        res.agRv = r2(svBrutto * W.MINI_RV_AG / 100);
      } else res.agRv = r2(svBrutto * W.MINI_RV_AG / 100);
      if (p.kv === 'gkv') res.agKv = r2(svBrutto * 0.13);
      return res;
    }
    let beG = svBrutto, beAN = svBrutto;
    if (svBrutto <= W.MIDI_OBEN) {
      res.art = 'Midijob (Übergangsbereich)';
      const F = W.FAKTOR_F, G = W.MINI, O = W.MIDI_OBEN;
      beG = F * G + (O / (O - G) - G / (O - G) * F) * (svBrutto - G);
      beAN = O / (O - G) * (svBrutto - G);
    }
    const kvB = Math.min(beAN, W.BBG_KV_M), rvB = Math.min(beAN, W.BBG_RV_M);
    const kvG = Math.min(beG, W.BBG_KV_M), rvG = Math.min(beG, W.BBG_RV_M);
    const regulaer = res.art === 'regulär';
    const pvBasisAN = sachsen ? W.PV_AN_SN : W.PV_AN; // ohne Zuschlag/Abschläge (tragen nur AN)
    if (p.kv === 'gkv') {
      res.kv = r2(kvB * kvAN / 100);
      res.pv = r2(kvB * pvAN / 100);
      // Übergangsbereich: AG-Anteil = Gesamtbeitrag aus BE_gesamt − AN-Anteil aus BE_AN
      res.agKv = regulaer ? r2(kvG * kvAN / 100) : r2(kvG * (W.KV_ALLG + p.kvZusatz) / 100 - kvB * kvAN / 100);
      res.agPv = regulaer ? r2(kvG * pvAG / 100) : Math.max(0, r2(kvG * W.PV / 100 - kvB * pvBasisAN / 100));
    } else {
      const z = pkvZuschuss(p), zKV = z.kv, zPV = z.pv;
      res.pkvBeitrag = r2((p.pkvKV || 0) + (p.pkvPV || 0));
      res.pkvZuschuss = r2(zKV + zPV);
      res.kv = r2((p.pkvKV || 0) - zKV);
      res.pv = r2((p.pkvPV || 0) - zPV);
      res.agKv = r2(zKV); res.agPv = r2(zPV);
    }
    if (p.rvPflicht) { res.rv = r2(rvB * W.RV / 200); res.agRv = regulaer ? res.rv : r2(rvG * W.RV / 100 - rvB * W.RV / 200); }
    if (p.avPflicht) { res.av = r2(rvB * W.AV / 200); res.agAv = regulaer ? res.av : r2(rvG * W.AV / 100 - rvB * W.AV / 200); }
    return res;
  }

  /** SV-Beiträge (nur AN) auf eine Jahressumme – für Einmalzahlungen (anteilige Jahres-BBG) */
  function svJahr(p, svJahresBrutto, alter) {
    const kvB = Math.min(svJahresBrutto, W.BBG_KV_J), rvB = Math.min(svJahresBrutto, W.BBG_RV_J);
    const o = { kv: 0, pv: 0, rv: 0, av: 0 };
    if (p.kv === 'gkv') { o.kv = kvB * (W.KV_ALLG / 2 + p.kvZusatz / 2) / 100; o.pv = kvB * pvSatzAN(p, alter) / 100; }
    if (p.rvPflicht) o.rv = rvB * W.RV / 200;
    if (p.avPflicht) o.av = rvB * W.AV / 200;
    return o;
  }

  function lstEingaben(p, steuerBruttoMonat, alter) {
    const pvs = p.bundesland === 'SN' ? 1 : 0;
    const kinderlosZuschlag = (p.kinder || 0) === 0 && alter >= 23 ? 1 : 0;
    const e = {
      LZZ: 2, RE4: cent(steuerBruttoMonat), STKL: p.steuerklasse, R: p.kirche ? 1 : 0,
      ZKF: p.steuerklasse <= 4 ? (p.kinderfreibetraege || 0) : 0,
      KRV: p.rvPflicht ? 0 : 1, ALV: p.avPflicht ? 0 : 1, KVZ: (p.kvZusatz || 0).toFixed(2),
      PVS: pvs, PVZ: kinderlosZuschlag, PVA: kinderlosZuschlag ? 0 : pvAbschlaege(p),
      LZZFREIB: cent(p.freibetrag || 0),
      af: p.steuerklasse === 4 && p.faktor && p.faktor < 1 ? 1 : 0, f: p.steuerklasse === 4 && p.faktor && p.faktor < 1 ? Number(p.faktor).toFixed(3) : 1
    };
    if (p.kv === 'pkv') { const z = pkvZuschuss(p); e.PKV = 1; e.PKPV = cent((p.pkvKV || 0) + (p.pkvPV || 0)); e.PKPVAGZ = cent(z.kv + z.pv); }
    const geb = p.geburtsjahr || 1990;
    if (geb <= 1961) { e.ALTER1 = 1; e.AJAHR = geb + 65; }
    return e;
  }

  /**
   * Hauptberechnung. Alle Eingaben in € pro Monat (Einmalzahlung pro Jahr).
   */
  function berechne(eingabe) {
    const p = Object.assign({}, DEFAULTS, eingabe || {});
    p.steuerklasse = Number(p.steuerklasse) || 1;
    const alter = 2026 - (p.geburtsjahr || 1990);
    const bl = BUNDESLAENDER.find(b => b.code === p.bundesland) || BUNDESLAENDER[9];

    const fw = firmenwagenVorteil(p);
    const radGwv = firmenradVorteil(p);
    const radUmw = p.rad && p.radModus === 'umwandlung' ? (p.radLeasing || 0) : 0;
    const gwvSumme = r2(fw.wert + radGwv + (p.gwv || 0));
    const bavGes = (p.bavAN || 0) + (p.bavAG || 0);
    const bavStPfl = Math.max(0, bavGes - W.BAV_STFREI_M);
    const bavSvPfl = Math.max(0, bavGes - W.BAV_SVFREI_M);

    const gesamtBrutto = r2(p.brutto + (p.vwlAG || 0) + gwvSumme);
    const basis = p.brutto - (p.bavAN || 0) - radUmw + (p.vwlAG || 0) + gwvSumme;
    const steuerBrutto = Math.max(0, r2(basis + bavStPfl));
    const svBrutto = Math.max(0, r2(basis + bavSvPfl));

    const sv = sozialMonat(p, svBrutto, alter);
    const minijob = sv.art === 'Minijob';

    // Lohnsteuer laufender Monat
    let lst = 0, soli = 0, bk = 0, kist = 0, lstEin = null;
    if (!minijob) {
      lstEin = lstEingaben(p, steuerBrutto, alter);
      const o = LSt(lstEin);
      lst = o.LSTLZZ / 100; soli = o.SOLZLZZ / 100; bk = o.BK / 100;
      kist = p.kirche ? floor2(bk * bl.kist / 100) : 0;
    }
    const svSumme = r2(sv.kv + sv.pv + sv.rv + sv.av);
    const steuerSumme = r2(lst + soli + kist);
    const netto = r2(gesamtBrutto - (p.bavAN || 0) - radUmw - steuerSumme - svSumme);
    const auszahlung = r2(netto - gwvSumme - (p.vwlSpar || 0) + (p.steuerfrei || 0));

    // Einmalzahlung (sonstiger Bezug, z. B. Weihnachtsgeld/13. Gehalt)
    const ez = { brutto: p.einmalzahlung || 0, lst: 0, soli: 0, kist: 0, kv: 0, pv: 0, rv: 0, av: 0, netto: 0 };
    if (ez.brutto > 0) {
      if (minijob && svBrutto + ez.brutto / 12 <= W.MINI) {
        ez.rv = p.rvPflicht && !p.minijobRvBefreit ? r2(ez.brutto * (W.RV - W.MINI_RV_AG) / 100) : 0;
      } else {
        const e = lstEin || lstEingaben(p, steuerBrutto, alter);
        const o = LSt(Object.assign({}, e, { JRE4: cent(steuerBrutto * 12), SONSTB: cent(ez.brutto) }));
        ez.lst = o.STS / 100; ez.soli = o.SOLZS / 100;
        ez.kist = p.kirche ? floor2(o.BKS / 100 * bl.kist / 100) : 0;
        const ohne = svJahr(p, svBrutto * 12, alter), mit = svJahr(p, svBrutto * 12 + ez.brutto, alter);
        if (sv.art !== 'regulär') { // Midijob: Einmalzahlung vereinfacht mit vollen AN-Sätzen
          Object.assign(ohne, { kv: 0, pv: 0, rv: 0, av: 0 }); Object.assign(mit, svJahr(p, ez.brutto, alter));
        }
        for (const k of ['kv', 'pv', 'rv', 'av']) ez[k] = p.kv === 'pkv' && (k === 'kv' || k === 'pv') ? 0 : r2(mit[k] - ohne[k]);
      }
      ez.netto = r2(ez.brutto - ez.lst - ez.soli - ez.kist - ez.kv - ez.pv - ez.rv - ez.av);
    }

    const monat = {
      brutto: p.brutto, gesamtBrutto, steuerBrutto, svBrutto, gwv: gwvSumme, fwVorteil: fw.wert, radVorteil: radGwv, radUmwandlung: radUmw,
      bavAN: p.bavAN || 0, vwlAG: p.vwlAG || 0, vwlSpar: p.vwlSpar || 0, steuerfrei: p.steuerfrei || 0,
      lst, soli, kist, kv: sv.kv, pv: sv.pv, rv: sv.rv, av: sv.av, pkvBeitrag: sv.pkvBeitrag, pkvZuschuss: sv.pkvZuschuss,
      steuern: steuerSumme, sozial: svSumme, netto, auszahlung,
      agKv: sv.agKv, agPv: sv.agPv, agRv: sv.agRv, agAv: sv.agAv
    };
    // Arbeitgeberkosten (ohne geldwerte Vorteile, ohne Umlagen U1/U2/U3, BG); Minijob inkl. 2 % Pauschsteuer
    monat.agKosten = r2(p.brutto + (p.vwlAG || 0) + (p.bavAG || 0) + (p.steuerfrei || 0) + sv.agKv + sv.agPv + sv.agRv + sv.agAv + (minijob ? r2(svBrutto * 0.02) : 0));
    const jahr = {};
    for (const k of Object.keys(monat)) jahr[k] = r2(monat[k] * 12);
    jahr.brutto = r2(p.brutto * 12 + ez.brutto);
    jahr.gesamtBrutto = r2(gesamtBrutto * 12 + ez.brutto);
    for (const k of ['lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av']) jahr[k] = r2(monat[k] * 12 + ez[k]);
    jahr.steuern = r2(jahr.lst + jahr.soli + jahr.kist);
    jahr.sozial = r2(jahr.kv + jahr.pv + jahr.rv + jahr.av);
    jahr.netto = r2(monat.netto * 12 + ez.netto);
    jahr.auszahlung = r2(monat.auszahlung * 12 + ez.netto);
    jahr.agKosten = r2(monat.agKosten * 12 + ez.brutto);
    return { eingabe: p, art: sv.art, kirchensteuersatz: bl.kist, firmenwagenAnteil: fw.satz, monat, jahr, einmal: ez, lstEingaben: lstEin };
  }

  /** Wunschnetto: Bruttogehalt (Monat) zu gewünschtem Auszahlungsbetrag per Bisektion */
  function bruttoAusNetto(wunschAuszahlung, eingabe) {
    const f = (b) => berechne(Object.assign({}, eingabe, { brutto: b })).monat.auszahlung;
    let lo = 0, hi = Math.max(1000, wunschAuszahlung * 3);
    while (f(hi) < wunschAuszahlung && hi < 1e7) hi *= 2;
    for (let i = 0; i < 80 && hi - lo > 0.001; i++) { const mid = (lo + hi) / 2; if (f(mid) < wunschAuszahlung) lo = mid; else hi = mid; }
    let b = Math.ceil(hi * 100) / 100;
    while (b > 0.01 && f(r2(b - 0.01)) >= wunschAuszahlung) b = r2(b - 0.01);
    return { brutto: b, ergebnis: berechne(Object.assign({}, eingabe, { brutto: b })) };
  }

  const api = { berechne, bruttoAusNetto, BUNDESLAENDER, WERTE: W, DEFAULTS };
  root.Rechner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
