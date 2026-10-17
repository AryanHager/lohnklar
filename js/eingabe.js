/* Gemeinsame Umrechnung Formularwerte -> Rechner-Eingabe (vom Rechner und vom Arbeitgeberbereich genutzt). */
(function (root) {
  'use strict';
  const R = root.Rechner || (typeof require !== 'undefined' ? require('./rechner.js') : null);
  const KASSEN = root.KRANKENKASSEN || (typeof require !== 'undefined' ? require('./krankenkassen.js') : []);

  /** Deutsche Zahleneingabe ("4.000,50", "4000.5") -> Zahl */
  function zahl(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v).trim().replace(/\s|€/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function zusatzbeitrag(w) {
    if (w.kasse === 'eigen') return zahl(w.kvZusatz);
    if (w.kasse !== 'avg' && w.kasse !== undefined && w.kasse !== '' && KASSEN[w.kasse]) return KASSEN[w.kasse].zusatz;
    return R.WERTE.KV_ZUSATZ_DURCHSCHNITT;
  }
  function kassenName(w) {
    if (w._kvArt === 'pkv') return 'Private Krankenversicherung';
    if (w.kasse === 'eigen') return `Krankenkasse (Zusatzbeitrag ${String(zahl(w.kvZusatz)).replace('.', ',')} %)`;
    if (w.kasse !== 'avg' && w.kasse !== undefined && w.kasse !== '' && KASSEN[w.kasse]) return KASSEN[w.kasse].name;
    return 'GKV (durchschnittlicher Zusatzbeitrag)';
  }
  /** Formularwerte -> Rechner-Eingabe (Monatswerte) */
  function eingabeAus(w) {
    const div = w._zeitraum === 'jahr' ? 12 : 1;
    return {
      brutto: zahl(w.betrag) / div,
      steuerklasse: Number(w.steuerklasse) || 1, faktor: zahl(w.faktor) || 1, bundesland: w.bundesland || 'NW', kirche: !!w.kirche,
      geburtsjahr: Number(w.geburtsjahr) || 1990, kinder: Number(w.kinder) || 0, kinderU25: Math.min(Number(w.kinderU25) || 0, Number(w.kinder) || 0),
      kinderfreibetraege: zahl(w.kinderfreibetraege), freibetrag: zahl(w.freibetrag),
      kv: w._kvArt || 'gkv', kvZusatz: zusatzbeitrag(w), pkvKV: zahl(w.pkvKV), pkvPV: zahl(w.pkvPV),
      rvPflicht: w.rvPflicht !== false, avPflicht: w.avPflicht !== false, minijobRvBefreit: !!w.minijobRvBefreit,
      fw: !!w.fw, fwListenpreis: zahl(w.fwListenpreis), fwKm: Number(w.fwKm) || 0, fwAntrieb: w.fwAntrieb || 'verbrenner', fwZuzahlung: zahl(w.fwZuzahlung),
      rad: !!w.rad, radListenpreis: zahl(w.radListenpreis), radModus: w.radModus || 'zusaetzlich', radLeasing: zahl(w.radLeasing),
      bavAN: zahl(w.bavAN), bavAG: zahl(w.bavAG), vwlAG: zahl(w.vwlAG), vwlSpar: zahl(w.vwlSpar), gwv: zahl(w.gwv), steuerfrei: zahl(w.steuerfrei),
      einmalzahlung: zahl(w.ezWeihnacht) + zahl(w.ezBonus)
    };
  }
  const api = { zahl, eingabeAus, zusatzbeitrag, kassenName };
  root.Eingabe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
