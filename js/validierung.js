/*
 * Prüfroutinen für Stammdaten (Arbeitgeberbereich).
 *  - Steuerliche Identifikationsnummer (§ 139b AO): 11 Ziffern, 1. Ziffer ≠ 0, Prüfziffer nach ISO/IEC 7064 MOD 11,10;
 *    in den ersten 10 Ziffern kommt genau eine Ziffer zwei- oder dreimal vor (dreifach nicht direkt nebeneinander).
 *  - Versicherungsnummer (Rentenversicherung, § 147 SGB VI / VKVV): 12 Stellen
 *    BB TTMMJJ A SS P (Bereich, Geburtsdatum, Anfangsbuchstabe Geburtsname, Seriennummer, Prüfziffer).
 *    Prüfziffer: Buchstabe -> zweistellige Alphabetposition; Gewichte 2,1,2,5,7,1,2,1,2,1,2,1; Quersummen; Summe mod 10.
 *  - IBAN (ISO 13616): Länge je Land, Prüfsumme mod 97 = 1.
 *  - Betriebsnummer: 8 Ziffern. Beitragsgruppenschlüssel: 4 Stellen KV/RV/AV/PV. Personengruppenschlüssel: 3 Ziffern.
 */
(function (root) {
  'use strict';
  const nurZiffern = (s) => String(s || '').replace(/[\s./-]/g, '');

  function pruefeSteuerId(eingabe) {
    const s = nurZiffern(eingabe);
    if (!/^\d{11}$/.test(s)) return { ok: false, fehler: 'Die Steuer-ID muss aus 11 Ziffern bestehen.' };
    if (s[0] === '0') return { ok: false, fehler: 'Die Steuer-ID darf nicht mit 0 beginnen.' };
    const zehn = s.slice(0, 10), haeufig = {};
    for (const c of zehn) haeufig[c] = (haeufig[c] || 0) + 1;
    const mehrfach = Object.values(haeufig).filter(n => n > 1);
    if (mehrfach.length !== 1 || mehrfach[0] > 3) return { ok: false, fehler: 'Ungültige Ziffernfolge (genau eine Ziffer muss 2- oder 3-mal vorkommen).' };
    if (mehrfach[0] === 3 && /(\d)\1\1/.test(zehn)) return { ok: false, fehler: 'Ungültige Ziffernfolge (drei gleiche Ziffern nebeneinander).' };
    let produkt = 10;
    for (let i = 0; i < 10; i++) {
      let summe = (Number(s[i]) + produkt) % 10;
      if (summe === 0) summe = 10;
      produkt = (summe * 2) % 11;
    }
    let pz = 11 - produkt; if (pz === 10) pz = 0;
    if (pz !== Number(s[10])) return { ok: false, fehler: 'Prüfziffer der Steuer-ID ist falsch.' };
    return { ok: true, wert: s };
  }

  function pruefeSvNummer(eingabe, geburtsdatum, nachname) {
    const s = String(eingabe || '').replace(/\s/g, '').toUpperCase();
    if (!/^\d{8}[A-Z]\d{3}$/.test(s)) return { ok: false, fehler: 'Format: 12 Stellen, z. B. 65 170839 J 00 3 (8 Ziffern, Buchstabe, 3 Ziffern).' };
    const tag = Number(s.slice(2, 4)), monat = Number(s.slice(4, 6));
    const tagEcht = tag > 31 ? tag - 50 : tag; // Tag + 50 bei Mehrfachvergabe
    if (tagEcht < 1 || tagEcht > 31 || monat < 1 || monat > 12) return { ok: false, fehler: 'Das Geburtsdatum in der SV-Nummer ist ungültig.' };
    const pos = s.charCodeAt(8) - 64;
    const ziffern = (s.slice(0, 8) + String(pos).padStart(2, '0') + s.slice(9, 11)).split('').map(Number);
    const gew = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
    let summe = 0;
    ziffern.forEach((z, i) => { const p = z * gew[i]; summe += Math.floor(p / 10) + (p % 10); });
    if (summe % 10 !== Number(s[11])) return { ok: false, fehler: 'Prüfziffer der SV-Nummer ist falsch.' };
    const hinweise = [];
    if (geburtsdatum) {
      const [j, m, t] = String(geburtsdatum).split('-');
      if (j && (t !== String(tagEcht).padStart(2, '0') || m !== s.slice(4, 6) || j.slice(2) !== s.slice(6, 8))) hinweise.push('Geburtsdatum passt nicht zur SV-Nummer.');
    }
    if (nachname && nachname.trim() && nachname.trim()[0].toUpperCase().normalize('NFD')[0] !== s[8]) hinweise.push('Buchstabe entspricht nicht dem Anfangsbuchstaben des Nachnamens (bei abweichendem Geburtsnamen korrekt).');
    return { ok: true, wert: s, hinweise };
  }

  const IBAN_LAENGE = { DE: 22, AT: 20, CH: 21, LI: 21, LU: 20, NL: 18, BE: 16, FR: 27, IT: 27, ES: 24, PL: 28, CZ: 24, DK: 18, SE: 24, NO: 15, FI: 18, IE: 22, PT: 25, GB: 22, HU: 28, SK: 24, SI: 19, HR: 21, RO: 24, BG: 22, GR: 27, EE: 20, LV: 21, LT: 20, MT: 31, CY: 28, IS: 26, MC: 27, SM: 27 };
  function pruefeIban(eingabe) {
    const s = String(eingabe || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return { ok: false, fehler: 'Ungültiges IBAN-Format.' };
    const land = s.slice(0, 2);
    if (IBAN_LAENGE[land] && s.length !== IBAN_LAENGE[land]) return { ok: false, fehler: `Eine IBAN aus ${land} hat ${IBAN_LAENGE[land]} Stellen (eingegeben: ${s.length}).` };
    const umgestellt = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let rest = 0;
    for (const c of umgestellt) rest = (rest * 10 + Number(c)) % 97;
    if (rest !== 1) return { ok: false, fehler: 'Prüfsumme der IBAN ist falsch.' };
    return { ok: true, wert: s, formatiert: s.replace(/(.{4})/g, '$1 ').trim() };
  }

  function pruefeBetriebsnummer(eingabe) {
    const s = nurZiffern(eingabe);
    if (!/^\d{8}$/.test(s)) return { ok: false, fehler: 'Die Betriebsnummer besteht aus 8 Ziffern.' };
    if (s[0] === '0') return { ok: false, fehler: 'Die Betriebsnummer darf nicht mit 0 beginnen.' };
    return { ok: true, wert: s };
  }

  // Beitragsgruppenschlüssel: KV RV AV PV
  const BGS = { kv: '0123456789'.split('').filter(x => x !== '7' && x !== '8'), rv: ['0', '1', '3', '5'], av: ['0', '1', '2'], pv: ['0', '1', '2'] };
  function pruefeBeitragsgruppe(eingabe) {
    const s = nurZiffern(eingabe);
    if (!/^\d{4}$/.test(s)) return { ok: false, fehler: 'Der Beitragsgruppenschlüssel hat 4 Ziffern (KV/RV/AV/PV), z. B. 1111.' };
    if (!BGS.kv.includes(s[0]) || !BGS.rv.includes(s[1]) || !BGS.av.includes(s[2]) || !BGS.pv.includes(s[3])) return { ok: false, fehler: 'Unzulässige Ziffer im Beitragsgruppenschlüssel.' };
    return { ok: true, wert: s };
  }
  const PERSONENGRUPPEN = {
    '101': 'Sozialversicherungspflichtig Beschäftigte ohne besondere Merkmale', '102': 'Auszubildende', '103': 'Beschäftigte in Altersteilzeit',
    '104': 'Hausgewerbetreibende', '105': 'Praktikanten', '106': 'Werkstudenten', '107': 'Behinderte Menschen in Werkstätten',
    '108': 'Bezieher von Vorruhestandsgeld', '109': 'Geringfügig entlohnte Beschäftigte', '110': 'Kurzfristig Beschäftigte',
    '111': 'Personen in Einrichtungen der Jugendhilfe', '112': 'Mitarbeitende Familienangehörige in der Landwirtschaft', '113': 'Nebenerwerbslandwirte',
    '114': 'Nebenerwerbslandwirte – saisonal', '116': 'Ausgleichsgeldempfänger', '117': 'Nicht berufsmäßig unständig Beschäftigte',
    '118': 'Unständig Beschäftigte', '119': 'Versicherungsfreie Altersvollrentner und Versorgungsbezieher', '120': 'Versicherungspflichtige Altersvollrentner',
    '121': 'Auszubildende unter Geringverdienergrenze', '122': 'Auszubildende in außerbetrieblicher Einrichtung', '123': 'Personen im Freiwilligendienst',
    '124': 'Heimarbeiter ohne Anspruch auf Entgeltfortzahlung', '127': 'Beschäftigte im Rahmen betrieblicher Berufsbildung', '190': 'Beschäftigte, die ausschließlich in der gesetzlichen Unfallversicherung versichert sind'
  };
  function pruefePersonengruppe(eingabe) {
    const s = nurZiffern(eingabe);
    if (!/^\d{3}$/.test(s)) return { ok: false, fehler: 'Der Personengruppenschlüssel hat 3 Ziffern, z. B. 101.' };
    if (!PERSONENGRUPPEN[s]) return { ok: false, fehler: 'Unbekannter Personengruppenschlüssel.' };
    return { ok: true, wert: s, bezeichnung: PERSONENGRUPPEN[s] };
  }
  /** Vorschlag Beitragsgruppenschlüssel aus den Rechnereingaben */
  function vorschlagBeitragsgruppe(e) {
    if (e.minijob) return (e.kvArt === 'pkv' ? '0' : '6') + (e.rvPflicht && !e.minijobRvBefreit ? '1' : '5') + '00';
    return (e.kvArt === 'pkv' ? '0' : '1') + (e.rvPflicht ? '1' : '0') + (e.avPflicht ? '1' : '0') + (e.kvArt === 'pkv' ? '0' : '1');
  }

  /** Austrittsdatum (optional): gültiges Datum, nicht vor dem Eintrittsdatum */
  function pruefeAustritt(eintritt, austritt) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!austritt) return { ok: true, wert: '' };
    if (!re.test(austritt) || isNaN(new Date(austritt + 'T00:00:00').getTime())) return { ok: false, fehler: 'Ungültiges Datum.' };
    if (eintritt && re.test(eintritt) && austritt < eintritt) return { ok: false, fehler: 'Das Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.' };
    return { ok: true, wert: austritt };
  }
  const api = { pruefeAustritt, pruefeSteuerId, pruefeSvNummer, pruefeIban, pruefeBetriebsnummer, pruefeBeitragsgruppe, pruefePersonengruppe, vorschlagBeitragsgruppe, PERSONENGRUPPEN };
  root.Validierung = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
