/*
 * Minimaler BigDecimal-Ersatz (BigInt-basiert) für die exakte Umsetzung des
 * BMF-Programmablaufplans. Bildet die im PAP verwendeten Java-BigDecimal-
 * Operationen nach: add, subtract, multiply, divide (exakt oder mit Scale +
 * Rundungsmodus), setScale (ROUND_DOWN / ROUND_UP), compareTo, longValue.
 *   ROUND_DOWN = Richtung Null, ROUND_UP = weg von Null (wie in Java).
 */
(function (root) {
  'use strict';
  const ROUND_DOWN = 'DOWN', ROUND_UP = 'UP';
  const P10 = [];
  function p10(n) { if (P10[n] === undefined) P10[n] = 10n ** BigInt(n); return P10[n]; }

  class Dec {
    constructor(m, s) { this.m = m; this.s = s; }
    static of(v) {
      if (v instanceof Dec) return v;
      if (typeof v === 'bigint') return new Dec(v, 0);
      let str = typeof v === 'number' ? numToStr(v) : String(v).trim();
      let neg = false;
      if (str[0] === '-') { neg = true; str = str.slice(1); } else if (str[0] === '+') str = str.slice(1);
      const [i, f = ''] = str.split('.');
      const m = BigInt((i || '0') + f);
      return new Dec(neg ? -m : m, f.length);
    }
    _align(o) {
      o = Dec.of(o);
      if (this.s === o.s) return [this.m, o.m, this.s];
      if (this.s > o.s) return [this.m, o.m * p10(this.s - o.s), this.s];
      return [this.m * p10(o.s - this.s), o.m, o.s];
    }
    add(o) { const [a, b, s] = this._align(o); return new Dec(a + b, s); }
    subtract(o) { const [a, b, s] = this._align(o); return new Dec(a - b, s); }
    multiply(o) { o = Dec.of(o); return new Dec(this.m * o.m, this.s + o.s); }
    compareTo(o) { const [a, b] = this._align(o); return a < b ? -1 : a > b ? 1 : 0; }
    signum() { return this.m < 0n ? -1 : this.m > 0n ? 1 : 0; }
    // Division mit Ziel-Scale und Rundungsmodus; ohne Scale: exakte Division
    divide(o, scale, mode) {
      o = Dec.of(o);
      if (o.m === 0n) throw new Error('Division durch Null');
      if (scale === undefined) {
        for (let sc = Math.max(this.s, 0); sc <= 40; sc++) {
          const r = this._divScaled(o, sc, null);
          if (r) return r;
        }
        return this._divScaled(o, 40, ROUND_DOWN); // nicht-terminierend (im PAP nicht vorkommend)
      }
      return this._divScaled(o, scale, mode || ROUND_DOWN);
    }
    _divScaled(o, scale, mode) {
      // Ergebnis q = this / o mit 'scale' Nachkommastellen
      let num = this.m, den = o.m;
      const e = scale + o.s - this.s;
      if (e >= 0) num = num * p10(e); else den = den * p10(-e);
      let q = num / den; const r = num % den;
      if (r !== 0n) {
        if (mode === null) return null;
        if (mode === ROUND_UP) q += ((num < 0n) !== (den < 0n)) ? -1n : 1n;
      }
      return new Dec(q, scale);
    }
    setScale(n, mode) {
      if (n >= this.s) return new Dec(this.m * p10(n - this.s), n);
      const d = p10(this.s - n);
      let q = this.m / d; const r = this.m % d;
      if (r !== 0n && mode === ROUND_UP) q += this.m < 0n ? -1n : 1n;
      return new Dec(q, n);
    }
    longValue() { return Number(this.m / p10(this.s)); }
    toNumber() { return Number(this.toString()); }
    toString() {
      const neg = this.m < 0n; let a = (neg ? -this.m : this.m).toString();
      if (this.s > 0) { a = a.padStart(this.s + 1, '0'); a = a.slice(0, -this.s) + '.' + a.slice(-this.s); }
      return (neg ? '-' : '') + a;
    }
  }
  function numToStr(n) {
    // entspricht Double.toString für übliche Werte (BigDecimal.valueOf(double))
    let s = String(n);
    if (/e/i.test(s)) s = n.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  Dec.ZERO = new Dec(0n, 0); Dec.ONE = new Dec(1n, 0);
  Dec.ROUND_DOWN = ROUND_DOWN; Dec.ROUND_UP = ROUND_UP;
  root.Dec = Dec;
  if (typeof module !== 'undefined' && module.exports) module.exports = Dec;
})(typeof globalThis !== 'undefined' ? globalThis : this);
