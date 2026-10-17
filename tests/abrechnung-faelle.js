// Fiktive Testmitarbeiter (offensichtliche Musterdaten) für die Abrechnungstests
const basis = { rvPflicht: true, avPflicht: true, kasse: 'avg', _kvArt: 'gkv', bundesland: 'NW', kinder: '0', kinderU25: '0', kinderfreibetraege: '0' };
module.exports = {
  firma: { name: 'Musterfirma Beispiel GmbH', strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt', betriebsnummer: '12345678' },
  mitarbeiter: [
    { id: 'm1', vorname: 'Erika', name: 'Mustermann', geburtsdatum: '1985-03-15', konfession: 'ev', eintritt: '2020-01-01',
      werte: Object.assign({}, basis, { betrag: '5.500', steuerklasse: '1' }),
      einmalzahlungen: [{ monat: '2026-06', bezeichnung: 'Urlaubsgeld', betrag: '1.500' }, { monat: '2026-11', bezeichnung: 'Weihnachtsgeld', betrag: '8.000' }] },
    { id: 'm2', vorname: 'Max', name: 'Mustermann', geburtsdatum: '1979-07-01', konfession: 'rk', eintritt: '2026-04-01',
      werte: Object.assign({}, basis, { betrag: '3.200', steuerklasse: '3', bundesland: 'BY', kinder: '2', kinderU25: '2', kinderfreibetraege: '2', kasse: '67' }),
      einmalzahlungen: [{ monat: '2026-12', bezeichnung: 'Weihnachtsgeld', betrag: '1.600' }] },
    { id: 'm3', vorname: 'Mia', name: 'Musterfrau', geburtsdatum: '2001-09-09', konfession: '', eintritt: '2024-01-01',
      werte: Object.assign({}, basis, { betrag: '4.200', steuerklasse: '1', bundesland: 'SN', fw: true, fwListenpreis: '42.000', fwKm: '15', fwAntrieb: 'elektro', bavAN: '150', vwlAG: '26,59', vwlSpar: '40', steuerfrei: '50' }),
      einmalzahlungen: [{ monat: '2026-03', bezeichnung: 'Prämie', betrag: '2.000' }] },
    { id: 'm4', vorname: 'Tom', name: 'Beispiel', geburtsdatum: '1990-02-02', konfession: '', eintritt: '2025-01-01',
      werte: Object.assign({}, basis, { betrag: '550' }), einmalzahlungen: [] },
    { id: 'm5', vorname: 'Lena', name: 'Probe', geburtsdatum: '1975-05-05', konfession: 'ev', eintritt: '2015-01-01',
      werte: Object.assign({}, basis, { betrag: '9.000', steuerklasse: '4', faktor: '0,912', _kvArt: 'pkv', pkvKV: '700', pkvPV: '80' }),
      einmalzahlungen: [{ monat: '2026-05', bezeichnung: 'Bonus', betrag: '20.000' }] }
  ]
};
