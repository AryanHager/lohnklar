/*
 * Krankenkassen und kassenindividuelle Zusatzbeitragssätze 2026.
 * Quelle: Krankenkassenliste des GKV-Spitzenverbands (https://www.gkv-spitzenverband.de/kassenliste),
 * maschinenlesbar aufbereitet von PKVler: https://www.pkvler.de/studie/zusatzbeitrag-2026.csv
 * (Spalte "Satz am 17.09.2026", Lizenz CC BY 4.0). Durchschnittlicher Zusatzbeitrag 2026: 2,9 Prozent (BMG, BAnz. 10.11.2025).
 * offen: "bundesweit" | "regional" | "nur Beschäftigte" (betriebsbezogene BKK)
 */
(function (root) {
  const KRANKENKASSEN = [
{
"name": "AOK - Die Gesundheitskasse für Niedersachsen",
"zusatz": 2.98,
"offen": "regional",
"laender": "Niedersachsen"
},
{
"name": "AOK - Die Gesundheitskasse in Hessen",
"zusatz": 2.98,
"offen": "regional",
"laender": "Hessen"
},
{
"name": "AOK Baden-Württemberg",
"zusatz": 2.99,
"offen": "regional",
"laender": "Baden-Württemberg"
},
{
"name": "AOK Bayern - Die Gesundheitskasse",
"zusatz": 2.69,
"offen": "regional",
"laender": "Bayern"
},
{
"name": "AOK Bremen / Bremerhaven",
"zusatz": 3.29,
"offen": "regional",
"laender": "Bremen"
},
{
"name": "AOK Nordost - Die Gesundheitskasse",
"zusatz": 3.5,
"offen": "regional",
"laender": "Berlin, Brandenburg, Mecklenburg-Vorpommern"
},
{
"name": "AOK NordWest - Die Gesundheitskasse",
"zusatz": 2.99,
"offen": "regional",
"laender": "Nordrhein-Westfalen, Schleswig-Holstein"
},
{
"name": "AOK PLUS - Die Gesundheitskasse für Sachsen und Thüringen",
"zusatz": 3.1,
"offen": "regional",
"laender": "Sachsen, Thüringen"
},
{
"name": "AOK Rheinland-Pfalz/Saarland-Die Gesundheitskasse",
"zusatz": 2.47,
"offen": "regional",
"laender": "Rheinland-Pfalz, Saarland"
},
{
"name": "AOK Rheinland/Hamburg - Die Gesundheitskasse",
"zusatz": 3.29,
"offen": "regional",
"laender": "Hamburg, Nordrhein-Westfalen"
},
{
"name": "AOK Sachsen-Anhalt - Die Gesundheitskasse",
"zusatz": 2.89,
"offen": "regional",
"laender": "Sachsen-Anhalt"
},
{
"name": "Audi BKK",
"zusatz": 2.6,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BAHN-BKK",
"zusatz": 3.65,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BARMER",
"zusatz": 3.29,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BERGISCHE KRANKENKASSE",
"zusatz": 3.79,
"offen": "regional",
"laender": "Hamburg, Hessen, Nordrhein-Westfalen"
},
{
"name": "Bertelsmann BKK",
"zusatz": 3.2,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Sachsen, Thüringen"
},
{
"name": "Betriebskrankenkasse der G.M. Pfaff AG",
"zusatz": 2.78,
"offen": "regional",
"laender": "Rheinland-Pfalz"
},
{
"name": "Betriebskrankenkasse EWE",
"zusatz": 3.19,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Betriebskrankenkasse Miele",
"zusatz": 3.2,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Betriebskrankenkasse Mobil",
"zusatz": 3.89,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Betriebskrankenkasse PricewaterhouseCoopers",
"zusatz": 2.8,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Betriebskrankenkasse Technoform",
"zusatz": 3.49,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Niedersachsen, Rheinland-Pfalz"
},
{
"name": "BIG direkt gesund",
"zusatz": 3.69,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK Akzo Nobel Bayern",
"zusatz": 3.39,
"offen": "regional",
"laender": "Bayern"
},
{
"name": "BKK B. Braun Aesculap",
"zusatz": 3.65,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Deutsche Bank AG",
"zusatz": 3.4,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Diakonie",
"zusatz": 3.8,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Sachsen, Sachsen-Anhalt, Schleswig-Holstein"
},
{
"name": "BKK EUREGIO",
"zusatz": 3.39,
"offen": "regional",
"laender": "Hamburg, Nordrhein-Westfalen"
},
{
"name": "BKK evm",
"zusatz": 2.5,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK exklusiv",
"zusatz": 3.49,
"offen": "regional",
"laender": "Bremen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Sachsen-Anhalt, Schleswig-Holstein"
},
{
"name": "BKK Faber-Castell & Partner",
"zusatz": 2.48,
"offen": "regional",
"laender": "Bayern"
},
{
"name": "BKK firmus",
"zusatz": 2.18,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Bremen, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Sachsen, Sachsen-Anhalt"
},
{
"name": "BKK Freudenberg",
"zusatz": 2.99,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Hessen, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Sachsen"
},
{
"name": "BKK GILDEMEISTER SEIDENSTICKER",
"zusatz": 3.4,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK Groz-Beckert",
"zusatz": 3.4,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Herkules",
"zusatz": 4.38,
"offen": "regional",
"laender": "Bayern, Hessen, Niedersachsen"
},
{
"name": "BKK Linde",
"zusatz": 2.99,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK MAHLE",
"zusatz": 4.2,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "bkk melitta hmr",
"zusatz": 3.9,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Brandenburg, Bremen, Hessen, Niedersachsen, Nordrhein-Westfalen, Sachsen, Sachsen-Anhalt, Schleswig-Holstein"
},
{
"name": "BKK mkk - meine krankenkasse",
"zusatz": 3.5,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK MTU",
"zusatz": 2.8,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Pfalz",
"zusatz": 3.9,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK ProVita",
"zusatz": 3.79,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK Public",
"zusatz": 2.5,
"offen": "regional",
"laender": "Hamburg, Niedersachsen, Nordrhein-Westfalen"
},
{
"name": "BKK Rieker.RICOSTA.Weisser",
"zusatz": 4.2,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Salzgitter",
"zusatz": 3.5,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK Scheufelen",
"zusatz": 3.99,
"offen": "regional",
"laender": "Baden-Württemberg"
},
{
"name": "BKK Schwarzwald-Baar-Heuberg",
"zusatz": 2.79,
"offen": "regional",
"laender": "Baden-Württemberg"
},
{
"name": "BKK VDN",
"zusatz": 3.19,
"offen": "regional",
"laender": "Hamburg, Nordrhein-Westfalen, Sachsen"
},
{
"name": "BKK VerbundPlus",
"zusatz": 3.89,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK WERRA-MEISSNER",
"zusatz": 4.35,
"offen": "regional",
"laender": "Bayern, Hessen"
},
{
"name": "BKK WIRTSCHAFT UND FINANZEN",
"zusatz": 3.99,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen"
},
{
"name": "BKK-Würth",
"zusatz": 3.4,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "BKK24",
"zusatz": 4.39,
"offen": "bundesweit",
"laender": ""
},
{
"name": "BKK_DürkoppAdler",
"zusatz": 3.88,
"offen": "regional",
"laender": "Nordrhein-Westfalen"
},
{
"name": "BMW BKK",
"zusatz": 2.9,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Bosch BKK",
"zusatz": 3.18,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Brandenburg, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Thüringen"
},
{
"name": "Continentale Betriebskrankenkasse",
"zusatz": 3.33,
"offen": "bundesweit",
"laender": ""
},
{
"name": "DAK-Gesundheit",
"zusatz": 3.2,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Debeka BKK",
"zusatz": 3.25,
"offen": "bundesweit",
"laender": ""
},
{
"name": "energie-Betriebskrankenkasse",
"zusatz": 3.98,
"offen": "bundesweit",
"laender": ""
},
{
"name": "EY Betriebskrankenkasse",
"zusatz": 2.75,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Handelskrankenkasse (hkk)",
"zusatz": 2.59,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Heimat Krankenkasse",
"zusatz": 3.9,
"offen": "bundesweit",
"laender": ""
},
{
"name": "HEK - Hanseatische Krankenkasse",
"zusatz": 2.89,
"offen": "bundesweit",
"laender": ""
},
{
"name": "IKK - Die Innovationskasse",
"zusatz": 4.3,
"offen": "bundesweit",
"laender": ""
},
{
"name": "IKK classic",
"zusatz": 3.85,
"offen": "bundesweit",
"laender": ""
},
{
"name": "IKK gesund plus",
"zusatz": 3.39,
"offen": "bundesweit",
"laender": ""
},
{
"name": "IKK Südwest",
"zusatz": 3.87,
"offen": "regional",
"laender": "Hessen, Rheinland-Pfalz, Saarland"
},
{
"name": "INNUNGSKRANKENKASSE BRANDENBURG UND BERLIN",
"zusatz": 4.35,
"offen": "regional",
"laender": "Berlin, Brandenburg"
},
{
"name": "KARL MAYER BKK",
"zusatz": 2.99,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Kaufmännische Krankenkasse - KKH",
"zusatz": 3.78,
"offen": "bundesweit",
"laender": ""
},
{
"name": "KNAPPSCHAFT",
"zusatz": 4.3,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Koenig & Bauer BKK",
"zusatz": 3.18,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Krones Betriebskrankenkasse",
"zusatz": 2.2,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Mercedes-Benz BKK",
"zusatz": 3.2,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Merck BKK",
"zusatz": 3.97,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "mhplus Betriebskrankenkasse",
"zusatz": 3.86,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Schleswig-Holstein, Thüringen"
},
{
"name": "novitas bkk",
"zusatz": 3.6,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Pronova BKK",
"zusatz": 3.7,
"offen": "bundesweit",
"laender": ""
},
{
"name": "R+V Betriebskrankenkasse",
"zusatz": 3.49,
"offen": "bundesweit",
"laender": ""
},
{
"name": "Salus BKK",
"zusatz": 3.29,
"offen": "bundesweit",
"laender": ""
},
{
"name": "SECURVITA BKK",
"zusatz": 3.9,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Brandenburg, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen"
},
{
"name": "Siemens-Betriebskrankenkasse (SBK)",
"zusatz": 3.8,
"offen": "bundesweit",
"laender": ""
},
{
"name": "SKD BKK",
"zusatz": 2.98,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Bremen, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Saarland, Sachsen, Schleswig-Holstein"
},
{
"name": "Südzucker BKK",
"zusatz": 3.5,
"offen": "nur Beschäftigte",
"laender": ""
},
{
"name": "Techniker Krankenkasse",
"zusatz": 2.69,
"offen": "bundesweit",
"laender": ""
},
{
"name": "TUI BKK",
"zusatz": 2.5,
"offen": "bundesweit",
"laender": ""
},
{
"name": "VIACTIV Krankenkasse",
"zusatz": 4.19,
"offen": "bundesweit",
"laender": ""
},
{
"name": "vivida bkk",
"zusatz": 3.79,
"offen": "bundesweit",
"laender": ""
},
{
"name": "WMF BKK",
"zusatz": 2.85,
"offen": "bundesweit",
"laender": ""
},
{
"name": "ZF BKK",
"zusatz": 3.4,
"offen": "regional",
"laender": "Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Thüringen"
}
];
  root.KRANKENKASSEN = KRANKENKASSEN;
  if (typeof module !== 'undefined' && module.exports) module.exports = KRANKENKASSEN;
})(typeof globalThis !== 'undefined' ? globalThis : this);
