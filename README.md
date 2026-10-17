# Lohnklar – Brutto-Netto-Rechner 2026

Installierbare Web-App (PWA), rein statisch, ohne Backend. Funktioniert vollständig offline
(Service Worker + Manifest), es werden keine Daten übertragen; Profile liegen nur im `localStorage`.

## Starten
    python3 -m http.server 8765      # dann http://localhost:8765 öffnen
Für die Installation aufs Handy muss die App über HTTPS (oder localhost) ausgeliefert werden.

## Tests
    npm test     # bzw. node tests/lohnsteuer.test.js && node tests/netto.test.js
- `tests/lohnsteuer.test.js`: 148 Fälle gegen die externe BMF-Testschnittstelle (bmf-steuerrechner.de, LSt2026ext),
  je 12 Ausgabewerte (LSTLZZ, SOLZLZZ, BK, STS, SOLZS, BKS, DBA-Werte) – centgenau.
- `tests/netto.test.js`: komplette Netto-Rechnungen (SV von Hand nachgerechnet, LSt gegen BMF).
- `tests/validierung.test.js`: Prüfroutinen; `tests/abrechnung.test.js`: Abrechnungswerte (gegen Rechner, BMF-PAP, Handrechnung) und PDF.
- `tests/teilmonat.test.js`: Ein-/Austritt im Monat (Eintritt 15., Austritt 10., Ein- und Austritt im selben Monat, Februar,
  31-Tage-Monat, Einmalzahlung im Austrittsmonat, Mini-/Midijob); Tagestabelle (LZZ 4) und sonstige Bezüge gegen BMF.
- Referenzdaten neu abrufen: `node tests/fetch-bmf-referenz.js`, `fetch-bmf-zufall.js`, `fetch-bmf-netto.js`, `fetch-bmf-abrechnung.js`, `fetch-bmf-teilmonat.js`.

## Arbeitgeberbereich (Profile → Arbeitgeber)
- Firmendaten (Name, Adresse, Betriebsnummer, optionales Logo) und Mitarbeiterstammdaten inkl. aller Rechnereingaben
- Prüfung von Steuer-ID (ISO 7064 MOD 11,10), SV-Nummer (Prüfziffer), IBAN (mod 97), BGS/PGS
- Speicherung nur lokal in IndexedDB; JSON-Datensicherung (Export/Import)
- Entgeltabrechnung je Monat mit Einmalzahlungen, Jahressummen, Drucken (A4), PDF (jsPDF, lokal in `js/vendor/`), Teilen (Web Share API)
- Sammelabrechnung aller Mitarbeiter als ein PDF (nicht beschäftigte Mitarbeiter werden übersprungen)
- Teilmonate bei Ein-/Austritt (optionales Austrittsdatum, nicht vor Eintritt):
  - Bezüge anteilig: 30-Tage-Methode (Gehalt / 30 × Kalendertage, voller Monat = volles Gehalt; Standard), Kalendertage des Monats
    oder Arbeitstage Mo–Fr (ohne Feiertage) – je Mitarbeiter oder je Abrechnung wählbar. Anteilig: Gehalt, VWL-AG-Anteil, bAV.
    Firmenwagen/-rad: voller Monatswert (R 8.1 Abs. 9 Nr. 1 Satz 4 LStR); Sachbezüge, steuerfreie Bezüge, VWL-Sparrate ungekürzt.
  - Lohnsteuer: Teillohnzahlungszeitraum – Tageslohn = Teilmonatslohn / Kalendertage, Tagestabelle (PAP LZZ = 4),
    LSt/Soli/KiSt × Kalendertage (§ 39b Abs. 2 EStG, R 39b.5 Abs. 2 LStR; Soli: Anhang 27 II Tz. 1.2.2 LStH).
  - SV: SV-Tage = Kalendertage (voller Monat 30, § 223 Abs. 2 SGB V), Teil-BBG = Jahres-BBG / 360 × SV-Tage;
    Einmalzahlungen bis zur anteiligen Jahres-BBG = Summe SV-Tage × Jahres-BBG / 360 (§ 23a SGB IV).
    Übergangsbereich: AE × 30 / SV-Tage hochrechnen, Formel, BE × SV-Tage / 30 (Rundschreiben Übergangsbereich Ziff. 4.3.2.5);
    Minijob: anteilige Mindestbemessungsgrundlage 175 € × SV-Tage / 30 (§ 163 Abs. 8 SGB VI).
  - Keine Abrechnung vor Eintritt / nach Austritt; Jahressummen ab Eintritt bis Austritt.
- Keine zertifizierte Entgeltabrechnungssoftware: keine DEÜV-Meldungen, kein ELStAM, keine Lohnsteuer-Anmeldung

## Aufbau
- `js/decimal.js` – BigInt-Dezimalklasse (Ersatz für Java BigDecimal)
- `js/lohnsteuer2026.js` – 1:1-Portierung des BMF-XML-Pseudocodes `Lohnsteuer2026.xml` (in `ref/`)
- `js/rechner.js` – Sozialversicherung 2026, Mini-/Midijob, PKV, Firmenwagen/-rad, bAV, VWL, Einmalzahlungen, Wunschnetto
- `js/krankenkassen.js` – 92 Krankenkassen mit Zusatzbeitrag 2026 (Quelle im Dateikopf)
- `js/app.js`, `index.html`, `css/style.css` – Oberfläche; `sw.js`, `manifest.webmanifest`, `icons/` – PWA

Alle Berechnungen ohne Gewähr.
