/*
 * Lohnsteuer 2026 – 1:1-Portierung des offiziellen XML-Pseudocodes des BMF
 * "Programmablaufplan für die maschinelle Berechnung der vom Arbeitslohn
 * einzubehaltenden Lohnsteuer, des Solidaritätszuschlags und der
 * Maßstabsteuer für die Kirchenlohnsteuer für 2026" (Lohnsteuer2026.xml,
 * Stand 2025-10-23, ITZBund Berlin).
 * Quelle: https://www.bmf-steuerrechner.de/interface/pseudocodes.xhtml
 *         https://www.bundesfinanzministerium.de/Datenportal/Daten/frei-nutzbare-produkte/Anwendungen/Programmablaufplan-2026/Programmablaufplan-2026.html
 * Alle Geldbeträge als Ein-/Ausgabe in Cent (wie im PAP).
 */
(function (root) {
  'use strict';
  const Dec = root.Dec || (typeof require !== 'undefined' ? require('./decimal.js') : null);
  const D = (v) => Dec.of(v);
  const ZERO = Dec.ZERO, DOWN = Dec.ROUND_DOWN, UP = Dec.ROUND_UP;
  const ZAHL1 = D(1), ZAHL2 = D(2), ZAHL5 = D(5), ZAHL7 = D(7), ZAHL12 = D(12), ZAHL100 = D(100),
    ZAHL360 = D(360), ZAHL500 = D(500), ZAHL700 = D(700), ZAHL1000 = D(1000), ZAHL10000 = D(10000);
  const tab = (a) => [ZERO].concat(a.map(D));
  const TAB1 = tab([0.4,0.384,0.368,0.352,0.336,0.32,0.304,0.288,0.272,0.256,0.24,0.224,0.208,0.192,0.176,0.16,0.152,0.144,0.14,0.136,0.132,0.128,0.124,0.12,0.116,0.112,0.108,0.104,0.1,0.096,0.092,0.088,0.084,0.08,0.076,0.072,0.068,0.064,0.06,0.056,0.052,0.048,0.044,0.04,0.036,0.032,0.028,0.024,0.02,0.016,0.012,0.008,0.004,0]);
  const TAB2 = tab([3000,2880,2760,2640,2520,2400,2280,2160,2040,1920,1800,1680,1560,1440,1320,1200,1140,1080,1050,1020,990,960,930,900,870,840,810,780,750,720,690,660,630,600,570,540,510,480,450,420,390,360,330,300,270,240,210,180,150,120,90,60,30,0]);
  const TAB3 = tab([900,864,828,792,756,720,684,648,612,576,540,504,468,432,396,360,342,324,315,306,297,288,279,270,261,252,243,234,225,216,207,198,189,180,171,162,153,144,135,126,117,108,99,90,81,72,63,54,45,36,27,18,9,0]);
  const TAB4 = TAB1;
  const TAB5 = tab([1900,1824,1748,1672,1596,1520,1444,1368,1292,1216,1140,1064,988,912,836,760,722,684,665,646,627,608,589,570,551,532,513,494,475,456,437,418,399,380,361,342,323,304,285,266,247,228,209,190,171,152,133,114,95,76,57,38,19,0]);

  const INPUT_DEFAULTS = {
    af: 1, AJAHR: 0, ALTER1: 0, ALV: 0, f: 1.0, JFREIB: 0, JHINZU: 0, JRE4: 0, JRE4ENT: 0, JVBEZ: 0,
    KRV: 0, KVZ: 0, LZZ: 1, LZZFREIB: 0, LZZHINZU: 0, MBV: 0, PKPV: 0, PKPVAGZ: 0, PKV: 0, PVA: 0,
    PVS: 0, PVZ: 0, R: 0, RE4: 0, SONSTB: 0, SONSTENT: 0, STERBE: 0, STKL: 1, VBEZ: 0, VBEZM: 0,
    VBEZS: 0, VBS: 0, VJAHR: 0, ZKF: 0, ZMVB: 0
  };
  const BIG_INPUTS = ['JFREIB','JHINZU','JRE4','JRE4ENT','JVBEZ','KVZ','LZZFREIB','LZZHINZU','MBV','PKPV','PKPVAGZ','PVA','RE4','SONSTB','SONSTENT','STERBE','VBEZ','VBEZM','VBEZS','VBS','ZKF'];
  const INTERNALS = ['ALTE','ANP','ANTEIL1','AVSATZAN','BBGKVPV','BBGRVALV','BMG','DIFF','EFA','FVB','FVBSO','FVBZ','FVBZSO','GFB','HBALTE','HFVB','HFVBZ','HFVBZSO','HOCH','JBMG','JLFREIB','JLHINZU','JW','KFB','KVSATZAN','LSTJAHR','LSTOSO','LSTSO','MIST','PKPVAGZJ','PVSATZAN','RVSATZAN','RW','SAP','SOLZFREI','SOLZJ','SOLZMIN','SOLZSBMG','SOLZSZVE','ST','ST1','ST2','VBEZB','VBEZBSO','VERGL','VSPHB','VSP','VSPN','VSPALV','VSPKVPV','VSPR','W1STKL5','W2STKL5','W3STKL5','X','Y','ZRE4','ZRE4J','ZRE4VP','ZRE4VPR','ZTABFB','ZVBEZ','ZVBEZJ','ZVE','ZX','ZZX',
    'BK','BKS','LSTLZZ','SOLZLZZ','SOLZS','STS','VFRB','VFRBS1','VFRBS2','WVFRB','WVFRBO','WVFRBM'];

  class Lohnsteuer2026 {
    constructor(inputs) {
      const inp = Object.assign({}, INPUT_DEFAULTS, inputs || {});
      for (const k of INTERNALS) this[k] = ZERO;
      this.J = 0; this.K = 0; this.KZTAB = 0;
      for (const k in inp) this[k] = BIG_INPUTS.includes(k) ? D(inp[k]) : Number(inp[k]);
    }
    // PROGRAMMABLAUFPLAN 2026, Steuerung, PAP Seite 13
    main() {
      this.MPARA(); this.MRE4JL(); this.VBEZBSO = ZERO;
      this.MRE4(); this.MRE4ABZ(); this.MBERECH(); this.MSONST();
      return this;
    }
    // PAP Seite 14
    MPARA() {
      this.BBGRVALV = D(101400); this.AVSATZAN = D(0.013); this.RVSATZAN = D(0.093);
      this.BBGKVPV = D(69750);
      this.KVSATZAN = this.KVZ.divide(ZAHL2).divide(ZAHL100).add(D(0.07));
      this.PVSATZAN = this.PVS === 1 ? D(0.023) : D(0.018);
      if (this.PVZ === 1) this.PVSATZAN = this.PVSATZAN.add(D(0.006));
      else this.PVSATZAN = this.PVSATZAN.subtract(this.PVA.multiply(D(0.0025)));
      this.W1STKL5 = D(14071); this.W2STKL5 = D(34939); this.W3STKL5 = D(222260);
      this.GFB = D(12348); this.SOLZFREI = D(20350);
    }
    // PAP Seite 15
    MRE4JL() {
      const conv = (v) => {
        if (this.LZZ === 1) return v.divide(ZAHL100, 2, DOWN);
        if (this.LZZ === 2) return v.multiply(ZAHL12).divide(ZAHL100, 2, DOWN);
        if (this.LZZ === 3) return v.multiply(ZAHL360).divide(ZAHL700, 2, DOWN);
        return v.multiply(ZAHL360).divide(ZAHL100, 2, DOWN);
      };
      this.ZRE4J = conv(this.RE4); this.ZVBEZJ = conv(this.VBEZ);
      this.JLFREIB = conv(this.LZZFREIB); this.JLHINZU = conv(this.LZZHINZU);
      if (this.af === 0) this.f = 1;
    }
    // PAP Seite 16
    MRE4() {
      if (this.ZVBEZJ.compareTo(ZERO) === 0) {
        this.FVBZ = ZERO; this.FVB = ZERO; this.FVBZSO = ZERO; this.FVBSO = ZERO;
      } else {
        if (this.VJAHR < 2006) this.J = 1;
        else if (this.VJAHR < 2058) this.J = this.VJAHR - 2004;
        else this.J = 54;
        const J = this.J;
        if (this.LZZ === 1) {
          this.VBEZB = this.VBEZM.multiply(D(this.ZMVB)).add(this.VBEZS);
          this.HFVB = TAB2[J].divide(ZAHL12).multiply(D(this.ZMVB)).setScale(0, UP);
          this.FVBZ = TAB3[J].divide(ZAHL12).multiply(D(this.ZMVB)).setScale(0, UP);
        } else {
          this.VBEZB = this.VBEZM.multiply(ZAHL12).add(this.VBEZS).setScale(2, DOWN);
          this.HFVB = TAB2[J]; this.FVBZ = TAB3[J];
        }
        this.FVB = this.VBEZB.multiply(TAB1[J]).divide(ZAHL100).setScale(2, UP);
        if (this.FVB.compareTo(this.HFVB) === 1) this.FVB = this.HFVB;
        if (this.FVB.compareTo(this.ZVBEZJ) === 1) this.FVB = this.ZVBEZJ;
        this.FVBSO = this.FVB.add(this.VBEZBSO.multiply(TAB1[J]).divide(ZAHL100)).setScale(2, UP);
        if (this.FVBSO.compareTo(TAB2[J]) === 1) this.FVBSO = TAB2[J];
        this.HFVBZSO = this.VBEZB.add(this.VBEZBSO).divide(ZAHL100).subtract(this.FVBSO).setScale(2, DOWN);
        this.FVBZSO = this.FVBZ.add(this.VBEZBSO.divide(ZAHL100)).setScale(0, UP);
        if (this.FVBZSO.compareTo(this.HFVBZSO) === 1) this.FVBZSO = this.HFVBZSO.setScale(0, UP);
        if (this.FVBZSO.compareTo(TAB3[J]) === 1) this.FVBZSO = TAB3[J];
        this.HFVBZ = this.VBEZB.divide(ZAHL100).subtract(this.FVB).setScale(2, DOWN);
        if (this.FVBZ.compareTo(this.HFVBZ) === 1) this.FVBZ = this.HFVBZ.setScale(0, UP);
      }
      this.MRE4ALTE();
    }
    // PAP Seite 17
    MRE4ALTE() {
      if (this.ALTER1 === 0) { this.ALTE = ZERO; return; }
      if (this.AJAHR < 2006) this.K = 1;
      else if (this.AJAHR < 2058) this.K = this.AJAHR - 2004;
      else this.K = 54;
      this.BMG = this.ZRE4J.subtract(this.ZVBEZJ);
      this.ALTE = this.BMG.multiply(TAB4[this.K]).setScale(0, UP);
      this.HBALTE = TAB5[this.K];
      if (this.ALTE.compareTo(this.HBALTE) === 1) this.ALTE = this.HBALTE;
    }
    // PAP Seite 20
    MRE4ABZ() {
      this.ZRE4 = this.ZRE4J.subtract(this.FVB).subtract(this.ALTE).subtract(this.JLFREIB).add(this.JLHINZU).setScale(2, DOWN);
      if (this.ZRE4.compareTo(ZERO) === -1) this.ZRE4 = ZERO;
      this.ZRE4VP = this.ZRE4J;
      this.ZVBEZ = this.ZVBEZJ.subtract(this.FVB).setScale(2, DOWN);
      if (this.ZVBEZ.compareTo(ZERO) === -1) this.ZVBEZ = ZERO;
    }
    // PAP Seite 21
    MBERECH() {
      this.MZTABFB();
      this.VFRB = this.ANP.add(this.FVB.add(this.FVBZ)).multiply(ZAHL100).setScale(0, DOWN);
      this.MLSTJAHR();
      this.WVFRB = this.ZVE.subtract(this.GFB).multiply(ZAHL100).setScale(0, DOWN);
      if (this.WVFRB.compareTo(ZERO) === -1) this.WVFRB = ZERO;
      this.LSTJAHR = this.ST.multiply(D(this.f)).setScale(0, DOWN);
      this.UPLSTLZZ();
      if (this.ZKF.compareTo(ZERO) === 1) {
        this.ZTABFB = this.ZTABFB.add(this.KFB);
        this.MRE4ABZ(); this.MLSTJAHR();
        this.JBMG = this.ST.multiply(D(this.f)).setScale(0, DOWN);
      } else {
        this.JBMG = this.LSTJAHR;
      }
      this.MSOLZ();
    }
    // PAP Seite 22
    MZTABFB() {
      this.ANP = ZERO;
      if (this.ZVBEZ.compareTo(ZERO) >= 0 && this.ZVBEZ.compareTo(this.FVBZ) === -1) this.FVBZ = D(this.ZVBEZ.longValue());
      if (this.STKL < 6) {
        if (this.ZVBEZ.compareTo(ZERO) === 1) {
          if (this.ZVBEZ.subtract(this.FVBZ).compareTo(D(102)) === -1) this.ANP = this.ZVBEZ.subtract(this.FVBZ).setScale(0, UP);
          else this.ANP = D(102);
        }
      } else { this.FVBZ = ZERO; this.FVBZSO = ZERO; }
      if (this.STKL < 6) {
        if (this.ZRE4.compareTo(this.ZVBEZ) === 1) {
          if (this.ZRE4.subtract(this.ZVBEZ).compareTo(D(1230)) === -1) this.ANP = this.ANP.add(this.ZRE4).subtract(this.ZVBEZ).setScale(0, UP);
          else this.ANP = this.ANP.add(D(1230));
        }
      }
      this.KZTAB = 1;
      const s = this.STKL;
      if (s === 1) { this.SAP = D(36); this.KFB = this.ZKF.multiply(D(9756)).setScale(0, DOWN); }
      else if (s === 2) { this.EFA = D(4260); this.SAP = D(36); this.KFB = this.ZKF.multiply(D(9756)).setScale(0, DOWN); }
      else if (s === 3) { this.KZTAB = 2; this.SAP = D(36); this.KFB = this.ZKF.multiply(D(9756)).setScale(0, DOWN); }
      else if (s === 4) { this.SAP = D(36); this.KFB = this.ZKF.multiply(D(4878)).setScale(0, DOWN); }
      else if (s === 5) { this.SAP = D(36); this.KFB = ZERO; }
      else { this.KFB = ZERO; }
      this.ZTABFB = this.EFA.add(this.ANP).add(this.SAP).add(this.FVBZ).setScale(2, DOWN);
    }
    // PAP Seite 23
    MLSTJAHR() {
      this.UPEVP();
      this.ZVE = this.ZRE4.subtract(this.ZTABFB).subtract(this.VSP);
      this.UPMLST();
    }
    // PAP Seite 24
    UPLSTLZZ() { this.JW = this.LSTJAHR.multiply(ZAHL100); this.UPANTEIL(); this.LSTLZZ = this.ANTEIL1; }
    // PAP Seite 25
    UPMLST() {
      if (this.ZVE.compareTo(ZAHL1) === -1) { this.ZVE = ZERO; this.X = ZERO; }
      else this.X = this.ZVE.divide(D(this.KZTAB)).setScale(0, DOWN);
      if (this.STKL < 5) this.UPTAB26(); else this.MST5_6();
    }
    // Vorsorgepauschale, PAP Seite 26
    UPEVP() {
      if (this.KRV === 1) this.VSPR = ZERO;
      else {
        this.ZRE4VPR = this.ZRE4VP.compareTo(this.BBGRVALV) === 1 ? this.BBGRVALV : this.ZRE4VP;
        this.VSPR = this.ZRE4VPR.multiply(this.RVSATZAN).setScale(2, DOWN);
      }
      this.MVSPKVPV();
      if (this.ALV === 1) { /* NOP */ }
      else if (this.STKL === 6) { /* NOP */ }
      else this.MVSPHB();
    }
    // PAP Seite 27
    MVSPKVPV() {
      this.ZRE4VPR = this.ZRE4VP.compareTo(this.BBGKVPV) === 1 ? this.BBGKVPV : this.ZRE4VP;
      if (this.PKV > 0) {
        if (this.STKL === 6) this.VSPKVPV = ZERO;
        else {
          this.PKPVAGZJ = this.PKPVAGZ.multiply(ZAHL12).divide(ZAHL100).setScale(2, DOWN);
          this.VSPKVPV = this.PKPV.multiply(ZAHL12).divide(ZAHL100).setScale(2, DOWN);
          this.VSPKVPV = this.VSPKVPV.subtract(this.PKPVAGZJ);
          if (this.VSPKVPV.compareTo(ZERO) === -1) this.VSPKVPV = ZERO;
        }
      } else {
        this.VSPKVPV = this.ZRE4VPR.multiply(this.KVSATZAN.add(this.PVSATZAN)).setScale(2, DOWN);
      }
      this.VSP = this.VSPKVPV.add(this.VSPR).setScale(0, UP);
    }
    // PAP Seite 28
    MVSPHB() {
      this.ZRE4VPR = this.ZRE4VP.compareTo(this.BBGRVALV) === 1 ? this.BBGRVALV : this.ZRE4VP;
      this.VSPALV = this.AVSATZAN.multiply(this.ZRE4VPR).setScale(2, DOWN);
      this.VSPHB = this.VSPALV.add(this.VSPKVPV).setScale(2, DOWN);
      if (this.VSPHB.compareTo(D(1900)) === 1) this.VSPHB = D(1900);
      this.VSPN = this.VSPR.add(this.VSPHB).setScale(0, UP);
      if (this.VSPN.compareTo(this.VSP) === 1) this.VSP = this.VSPN;
    }
    // PAP Seite 29
    MST5_6() {
      this.ZZX = this.X;
      if (this.ZZX.compareTo(this.W2STKL5) === 1) {
        this.ZX = this.W2STKL5; this.UP5_6();
        if (this.ZZX.compareTo(this.W3STKL5) === 1) {
          this.ST = this.ST.add(this.W3STKL5.subtract(this.W2STKL5).multiply(D(0.42))).setScale(0, DOWN);
          this.ST = this.ST.add(this.ZZX.subtract(this.W3STKL5).multiply(D(0.45))).setScale(0, DOWN);
        } else {
          this.ST = this.ST.add(this.ZZX.subtract(this.W2STKL5).multiply(D(0.42))).setScale(0, DOWN);
        }
      } else {
        this.ZX = this.ZZX; this.UP5_6();
        if (this.ZZX.compareTo(this.W1STKL5) === 1) {
          this.VERGL = this.ST; this.ZX = this.W1STKL5; this.UP5_6();
          this.HOCH = this.ST.add(this.ZZX.subtract(this.W1STKL5).multiply(D(0.42))).setScale(0, DOWN);
          this.ST = this.HOCH.compareTo(this.VERGL) === -1 ? this.HOCH : this.VERGL;
        }
      }
    }
    // PAP Seite 30
    UP5_6() {
      this.X = this.ZX.multiply(D(1.25)).setScale(0, DOWN); this.UPTAB26(); this.ST1 = this.ST;
      this.X = this.ZX.multiply(D(0.75)).setScale(0, DOWN); this.UPTAB26(); this.ST2 = this.ST;
      this.DIFF = this.ST1.subtract(this.ST2).multiply(ZAHL2);
      this.MIST = this.ZX.multiply(D(0.14)).setScale(0, DOWN);
      this.ST = this.MIST.compareTo(this.DIFF) === 1 ? this.MIST : this.DIFF;
    }
    // Solidaritätszuschlag, PAP Seite 31
    MSOLZ() {
      this.SOLZFREI = this.SOLZFREI.multiply(D(this.KZTAB));
      if (this.JBMG.compareTo(this.SOLZFREI) === 1) {
        this.SOLZJ = this.JBMG.multiply(D(5.5)).divide(ZAHL100).setScale(2, DOWN);
        this.SOLZMIN = this.JBMG.subtract(this.SOLZFREI).multiply(D(11.9)).divide(ZAHL100).setScale(2, DOWN);
        if (this.SOLZMIN.compareTo(this.SOLZJ) === -1) this.SOLZJ = this.SOLZMIN;
        this.JW = this.SOLZJ.multiply(ZAHL100).setScale(0, DOWN);
        this.UPANTEIL(); this.SOLZLZZ = this.ANTEIL1;
      } else this.SOLZLZZ = ZERO;
      if (this.R > 0) { this.JW = this.JBMG.multiply(ZAHL100); this.UPANTEIL(); this.BK = this.ANTEIL1; }
      else this.BK = ZERO;
    }
    // PAP Seite 32
    UPANTEIL() {
      if (this.LZZ === 1) this.ANTEIL1 = this.JW;
      else if (this.LZZ === 2) this.ANTEIL1 = this.JW.divide(ZAHL12, 0, DOWN);
      else if (this.LZZ === 3) this.ANTEIL1 = this.JW.multiply(ZAHL7).divide(ZAHL360, 0, DOWN);
      else this.ANTEIL1 = this.JW.divide(ZAHL360, 0, DOWN);
    }
    // Sonstige Bezüge, PAP Seite 33
    MSONST() {
      this.LZZ = 1;
      if (this.ZMVB === 0) this.ZMVB = 12;
      if (this.SONSTB.compareTo(ZERO) === 0 && this.MBV.compareTo(ZERO) === 0) {
        this.LSTSO = ZERO; this.STS = ZERO; this.SOLZS = ZERO; this.BKS = ZERO;
      } else {
        this.MOSONST();
        this.ZRE4J = this.JRE4.add(this.SONSTB).divide(ZAHL100).setScale(2, DOWN);
        this.ZVBEZJ = this.JVBEZ.add(this.VBS).divide(ZAHL100).setScale(2, DOWN);
        this.VBEZBSO = this.STERBE;
        this.MRE4SONST(); this.MLSTJAHR();
        this.WVFRBM = this.ZVE.subtract(this.GFB).multiply(ZAHL100).setScale(2, DOWN);
        if (this.WVFRBM.compareTo(ZERO) === -1) this.WVFRBM = ZERO;
        this.LSTSO = this.ST.multiply(ZAHL100);
        this.STS = this.LSTSO.subtract(this.LSTOSO).multiply(D(this.f)).divide(ZAHL100, 0, DOWN).multiply(ZAHL100);
        this.STSMIN();
      }
    }
    // PAP Seite 34
    STSMIN() {
      if (this.STS.compareTo(ZERO) === -1) {
        if (this.MBV.compareTo(ZERO) === 0) { /* NOP */ }
        else {
          this.LSTLZZ = this.LSTLZZ.add(this.STS);
          if (this.LSTLZZ.compareTo(ZERO) === -1) this.LSTLZZ = ZERO;
          this.SOLZLZZ = this.SOLZLZZ.add(this.STS.multiply(D(5.5).divide(ZAHL100))).setScale(0, DOWN);
          if (this.SOLZLZZ.compareTo(ZERO) === -1) this.SOLZLZZ = ZERO;
          this.BK = this.BK.add(this.STS);
          if (this.BK.compareTo(ZERO) === -1) this.BK = ZERO;
        }
        this.STS = ZERO; this.SOLZS = ZERO;
      } else this.MSOLZSTS();
      this.BKS = this.R > 0 ? this.STS : ZERO;
    }
    // PAP Seite 35
    MSOLZSTS() {
      this.SOLZSZVE = this.ZKF.compareTo(ZERO) === 1 ? this.ZVE.subtract(this.KFB) : this.ZVE;
      if (this.SOLZSZVE.compareTo(Dec.ONE) === -1) { this.SOLZSZVE = ZERO; this.X = ZERO; }
      else this.X = this.SOLZSZVE.divide(D(this.KZTAB), 0, DOWN);
      if (this.STKL < 5) this.UPTAB26(); else this.MST5_6();
      this.SOLZSBMG = this.ST.multiply(D(this.f)).setScale(0, DOWN);
      if (this.SOLZSBMG.compareTo(this.SOLZFREI) === 1) this.SOLZS = this.STS.multiply(D(5.5)).divide(ZAHL100, 0, DOWN);
      else this.SOLZS = ZERO;
    }
    // PAP Seite 36
    MOSONST() {
      this.ZRE4J = this.JRE4.divide(ZAHL100).setScale(2, DOWN);
      this.ZVBEZJ = this.JVBEZ.divide(ZAHL100).setScale(2, DOWN);
      this.JLFREIB = this.JFREIB.divide(ZAHL100, 2, DOWN);
      this.JLHINZU = this.JHINZU.divide(ZAHL100, 2, DOWN);
      this.MRE4(); this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.subtract(this.JRE4ENT.divide(ZAHL100));
      this.MZTABFB();
      this.VFRBS1 = this.ANP.add(this.FVB.add(this.FVBZ)).multiply(ZAHL100).setScale(2, DOWN);
      this.MLSTJAHR();
      this.WVFRBO = this.ZVE.subtract(this.GFB).multiply(ZAHL100).setScale(2, DOWN);
      if (this.WVFRBO.compareTo(ZERO) === -1) this.WVFRBO = ZERO;
      this.LSTOSO = this.ST.multiply(ZAHL100);
    }
    // PAP Seite 37
    MRE4SONST() {
      this.MRE4(); this.FVB = this.FVBSO; this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.add(this.MBV.divide(ZAHL100)).subtract(this.JRE4ENT.divide(ZAHL100)).subtract(this.SONSTENT.divide(ZAHL100));
      this.FVBZ = this.FVBZSO; this.MZTABFB();
      this.VFRBS2 = this.ANP.add(this.FVB).add(this.FVBZ).multiply(ZAHL100).subtract(this.VFRBS1);
    }
    // Tarifliche Einkommensteuer § 32a EStG, PAP Seite 38
    UPTAB26() {
      const X = this.X;
      if (X.compareTo(this.GFB.add(ZAHL1)) === -1) this.ST = ZERO;
      else if (X.compareTo(D(17800)) === -1) {
        this.Y = X.subtract(this.GFB).divide(ZAHL10000, 6, DOWN);
        this.RW = this.Y.multiply(D(914.51)); this.RW = this.RW.add(D(1400));
        this.ST = this.RW.multiply(this.Y).setScale(0, DOWN);
      } else if (X.compareTo(D(69879)) === -1) {
        this.Y = X.subtract(D(17799)).divide(ZAHL10000, 6, DOWN);
        this.RW = this.Y.multiply(D(173.1)); this.RW = this.RW.add(D(2397)); this.RW = this.RW.multiply(this.Y);
        this.ST = this.RW.add(D(1034.87)).setScale(0, DOWN);
      } else if (X.compareTo(D(277826)) === -1) {
        this.ST = X.multiply(D(0.42)).subtract(D(11135.63)).setScale(0, DOWN);
      } else {
        this.ST = X.multiply(D(0.45)).subtract(D(19470.38)).setScale(0, DOWN);
      }
      this.ST = this.ST.multiply(D(this.KZTAB));
    }
    outputs() {
      const o = {};
      for (const k of ['BK','BKS','LSTLZZ','SOLZLZZ','SOLZS','STS','VFRB','VFRBS1','VFRBS2','WVFRB','WVFRBO','WVFRBM']) o[k] = this[k].toNumber();
      return o;
    }
  }
  /** Bequemer Aufruf: Eingaben (Cent) -> Ausgaben (Cent) */
  function berechneLohnsteuer2026(inputs) { return new Lohnsteuer2026(inputs).main().outputs(); }
  root.Lohnsteuer2026 = Lohnsteuer2026;
  root.berechneLohnsteuer2026 = berechneLohnsteuer2026;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Lohnsteuer2026, berechneLohnsteuer2026 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
