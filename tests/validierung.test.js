// Tests der Prüfroutinen (Steuer-ID, SV-Nummer, IBAN, Betriebsnummer, BGS, PGS)
const V = require('../js/validierung.js');
let ok = 0, fail = 0;
const t = (name, bed) => { if (bed) ok++; else { fail++; console.log('FEHLER', name); } };
// Steuer-ID: veröffentlichte Beispiel-/Test-IDs (gültig) und Manipulationen
for (const id of ['86095742719', '47036892816', '65929970489', '57549285017', '25768131411', '86 095 742 719']) t('Steuer-ID gültig ' + id, V.pruefeSteuerId(id).ok);
t('Steuer-ID falsche Prüfziffer', !V.pruefeSteuerId('86095742718').ok);
t('Steuer-ID Ziffernregel', !V.pruefeSteuerId('12345678903').ok);
t('Steuer-ID beginnt mit 0', !V.pruefeSteuerId('06095742719').ok);
t('Steuer-ID zu kurz', !V.pruefeSteuerId('8609574271').ok);
t('Steuer-ID Buchstaben', !V.pruefeSteuerId('8609574271A').ok);
t('Steuer-ID drei gleiche nebeneinander', !V.pruefeSteuerId('11123456780').ok);
// Vertauschte Ziffern werden erkannt
t('Steuer-ID Zahlendreher', !V.pruefeSteuerId('80695742719').ok);
// SV-Nummer: Beispiele aus der DRV-/Wikipedia-Dokumentation
t('SVNR gültig 65170839J003', V.pruefeSvNummer('65170839J003').ok);
t('SVNR gültig mit Leerzeichen', V.pruefeSvNummer('15 070649 C 103').ok);
t('SVNR klein geschrieben', V.pruefeSvNummer('65170839j003').ok);
t('SVNR falsche Prüfziffer', !V.pruefeSvNummer('65170839J004').ok);
t('SVNR falsches Format', !V.pruefeSvNummer('651708390003').ok);
t('SVNR ungültiger Monat', !V.pruefeSvNummer('65171339J003').ok);
t('SVNR Hinweis Geburtsdatum', V.pruefeSvNummer('65170839J003', '1940-08-18').hinweise.length === 1);
t('SVNR passendes Geburtsdatum', V.pruefeSvNummer('65170839J003', '1939-08-17', 'Jansen').hinweise.length === 0);
// IBAN
t('IBAN DE gültig', V.pruefeIban('DE89 3704 0044 0532 0130 00').ok);
t('IBAN formatiert', V.pruefeIban('de89370400440532013000').formatiert === 'DE89 3704 0044 0532 0130 00');
t('IBAN GB gültig', V.pruefeIban('GB82WEST12345698765432').ok);
t('IBAN AT gültig', V.pruefeIban('AT611904300234573201').ok);
t('IBAN Prüfsumme falsch', !V.pruefeIban('DE89370400440532013001').ok);
t('IBAN Länge DE falsch', !V.pruefeIban('DE8937040044053201300').ok);
t('IBAN Müll', !V.pruefeIban('hallo').ok);
// Betriebsnummer, BGS, PGS
t('BBNR gültig', V.pruefeBetriebsnummer('12345678').ok);
t('BBNR 7 Ziffern', !V.pruefeBetriebsnummer('1234567').ok);
t('BGS 1111', V.pruefeBeitragsgruppe('1111').ok);
t('BGS 6500', V.pruefeBeitragsgruppe('6500').ok);
t('BGS ungültig 1411', !V.pruefeBeitragsgruppe('1411').ok);
t('BGS 3 Ziffern', !V.pruefeBeitragsgruppe('111').ok);
t('PGS 101', V.pruefePersonengruppe('101').ok);
t('PGS 999', !V.pruefePersonengruppe('999').ok);
t('BGS Vorschlag GKV', V.vorschlagBeitragsgruppe({ kvArt: 'gkv', rvPflicht: true, avPflicht: true }) === '1111');
t('BGS Vorschlag PKV', V.vorschlagBeitragsgruppe({ kvArt: 'pkv', rvPflicht: true, avPflicht: true }) === '0110');
t('BGS Vorschlag Minijob', V.vorschlagBeitragsgruppe({ kvArt: 'gkv', rvPflicht: true, minijob: true }) === '6100');
console.log(`${ok}/${ok + fail} Validierungstests bestanden`);
process.exit(fail ? 1 : 0);
