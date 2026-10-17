// Gemeinsame Szenarien für die Netto-Plausibilitätstests
module.exports = [
  { name: 'StKl I, 4.000 €, NRW, kinderlos, ohne KiSt, Ø-Zusatzbeitrag', in: { brutto: 4000 },
    sv: { kv: 350.00, pv: 96.00, rv: 372.00, av: 52.00 } },
  { name: 'StKl I, 3.500 €, Bayern, KiSt 8 %, TK 2,69 %, 1 Kind', in: { brutto: 3500, bundesland: 'BY', kirche: true, kvZusatz: 2.69, kinder: 1, kinderU25: 1, kinderfreibetraege: 0.5 },
    sv: { kv: r(3500 * 0.08645), pv: 63.00, rv: 325.50, av: 45.50 } },
  { name: 'StKl III, 6.000 €, Sachsen, KiSt 9 %, 2 Kinder', in: { brutto: 6000, steuerklasse: 3, bundesland: 'SN', kirche: true, kinder: 2, kinderU25: 2, kinderfreibetraege: 2 },
    sv: { kv: r(5812.5 * 0.0875), pv: r(5812.5 * 0.0205), rv: 558.00, av: 78.00 } },
  { name: 'StKl V, 2.800 €, Hessen, kinderlos', in: { brutto: 2800, steuerklasse: 5, bundesland: 'HE' },
    sv: { kv: 245.00, pv: 67.20, rv: 260.40, av: 36.40 } },
  { name: 'StKl I, 9.000 € (über beiden BBG), BW, KiSt', in: { brutto: 9000, bundesland: 'BW', kirche: true },
    sv: { kv: r(5812.5 * 0.0875), pv: r(5812.5 * 0.024), rv: 785.85, av: 109.85 } },
  { name: 'StKl IV mit Faktor 0,912, 3.800 €', in: { brutto: 3800, steuerklasse: 4, faktor: 0.912 },
    sv: { kv: 332.50, pv: 91.20, rv: 353.40, av: 49.40 } },
  { name: 'StKl II, 2.900 €, 1 Kind, Berlin', in: { brutto: 2900, steuerklasse: 2, bundesland: 'BE', kinder: 1, kinderU25: 1, kinderfreibetraege: 1 },
    sv: { kv: 253.75, pv: 52.20, rv: 269.70, av: 37.70 } },
  { name: 'StKl VI, Zweitjob 2.500 €', in: { brutto: 2500, steuerklasse: 6 },
    sv: { kv: 218.75, pv: 60.00, rv: 232.50, av: 32.50 } },
  { name: 'PKV, StKl I, 7.500 €, KV 650 €, PV 70 €', in: { brutto: 7500, kv: 'pkv', pkvKV: 650, pkvPV: 70 },
    sv: { kv: 325.00, pv: 35.00, rv: 697.50, av: 97.50 } },
  { name: 'Rentner-nah: Jg. 1960 (Altersentlastungsbetrag), 3.000 €', in: { brutto: 3000, geburtsjahr: 1960 },
    sv: { kv: 262.50, pv: 72.00, rv: 279.00, av: 39.00 } },
];
function r(x) { return Math.round(x * 100) / 100; }
