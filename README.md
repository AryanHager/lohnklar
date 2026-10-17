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
- Referenzdaten neu abrufen: `node tests/fetch-bmf-referenz.js`, `fetch-bmf-zufall.js`, `fetch-bmf-netto.js`.

## Aufbau
- `js/decimal.js` – BigInt-Dezimalklasse (Ersatz für Java BigDecimal)
- `js/lohnsteuer2026.js` – 1:1-Portierung des BMF-XML-Pseudocodes `Lohnsteuer2026.xml` (in `ref/`)
- `js/rechner.js` – Sozialversicherung 2026, Mini-/Midijob, PKV, Firmenwagen/-rad, bAV, VWL, Einmalzahlungen, Wunschnetto
- `js/krankenkassen.js` – 92 Krankenkassen mit Zusatzbeitrag 2026 (Quelle im Dateikopf)
- `js/app.js`, `index.html`, `css/style.css` – Oberfläche; `sw.js`, `manifest.webmanifest`, `icons/` – PWA

Alle Berechnungen ohne Gewähr.
