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
- Referenzdaten neu abrufen: `node tests/fetch-bmf-referenz.js`, `fetch-bmf-zufall.js`, `fetch-bmf-netto.js`.

## Arbeitgeberbereich (Profile → Arbeitgeber)
- Firmendaten (Name, Adresse, Betriebsnummer, optionales Logo) und Mitarbeiterstammdaten inkl. aller Rechnereingaben
- Prüfung von Steuer-ID (ISO 7064 MOD 11,10), SV-Nummer (Prüfziffer), IBAN (mod 97), BGS/PGS
- Speicherung nur lokal in IndexedDB; JSON-Datensicherung (Export/Import)
- Entgeltabrechnung je Monat mit Einmalzahlungen, Jahressummen, Drucken (A4), PDF (jsPDF, lokal in `js/vendor/`), Teilen (Web Share API)
- Sammelabrechnung aller Mitarbeiter als ein PDF
- Keine zertifizierte Entgeltabrechnungssoftware: keine DEÜV-Meldungen, kein ELStAM, keine Lohnsteuer-Anmeldung

## Aufbau
- `js/decimal.js` – BigInt-Dezimalklasse (Ersatz für Java BigDecimal)
- `js/lohnsteuer2026.js` – 1:1-Portierung des BMF-XML-Pseudocodes `Lohnsteuer2026.xml` (in `ref/`)
- `js/rechner.js` – Sozialversicherung 2026, Mini-/Midijob, PKV, Firmenwagen/-rad, bAV, VWL, Einmalzahlungen, Wunschnetto
- `js/krankenkassen.js` – 92 Krankenkassen mit Zusatzbeitrag 2026 (Quelle im Dateikopf)
- `js/app.js`, `index.html`, `css/style.css` – Oberfläche; `sw.js`, `manifest.webmanifest`, `icons/` – PWA

Alle Berechnungen ohne Gewähr.
