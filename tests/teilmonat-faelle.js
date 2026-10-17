// Fiktive Testmitarbeiter (offensichtliche Musterdaten) für Teilmonate bei Ein- und Austritt
const basis = { rvPflicht: true, avPflicht: true, kasse: 'avg', _kvArt: 'gkv', bundesland: 'NW', kinder: '0', kinderU25: '0', kinderfreibetraege: '0', steuerklasse: '1' };
const ma = (id, vorname, eintritt, austritt, werte, einmalzahlungen = [], extra = {}) => Object.assign({ id, vorname, name: 'Teilmonat', geburtsdatum: '1988-04-04', konfession: '', eintritt, austritt,
  werte: Object.assign({}, basis, werte), einmalzahlungen }, extra);
module.exports = {
  firma: { name: 'Musterfirma Beispiel GmbH', strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt', betriebsnummer: '12345678' },
  mitarbeiter: [
    ma('t1', 'Eintritt-15.', '2026-11-15', '', { betrag: '4.500' }, [], { konfession: 'ev' }),                                      // Eintritt 15.11. (30-Tage-Monat)
    ma('t2', 'Austritt-10.', '2019-05-01', '2026-03-10', { betrag: '3.800', steuerklasse: '3', bundesland: 'BY', kinder: '1', kinderU25: '1', kinderfreibetraege: '1' }, [], { konfession: 'rk' }),
    ma('t3', 'Ein-und-Austritt', '2026-07-06', '2026-07-24', { betrag: '3.000' }),                                                    // Ein- und Austritt im selben Monat
    ma('t4', 'Februar', '2026-02-16', '', { betrag: '6.000' }),                                                                       // Februar (28 Tage), Teil-BBG KV greift
    ma('t5', 'Oktober-2.', '2026-10-02', '', { betrag: '4.000' }),                                                                    // 31-Tage-Monat: 30 Kalendertage
    ma('t6', 'Austritt-Bonus', '2018-01-01', '2026-09-15', { betrag: '7.800', fw: true, fwListenpreis: '30.000', fwKm: '10', fwAntrieb: 'verbrenner' },
      [{ monat: '2026-06', bezeichnung: 'Urlaubsgeld', betrag: '1.000' }, { monat: '2026-09', bezeichnung: 'Abschlussbonus', betrag: '5.000' }]),
    ma('t7', 'Minijob', '2026-07-15', '', { betrag: '150' }),
    ma('t8', 'Midijob', '2026-11-16', '', { betrag: '1.500' })
  ]
};
