/* Calculator: Standard, Scientific and Programmer modes, with Unit conversion
   and Date calculation panels that slide out beside the keypad. It keeps
   exact decimals (0.1 + 0.2 is 0.3), real operator precedence (2 + 3 × 4 is
   14), memory keys, a history list, keyboard input and copy and paste. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  // ============================================================ exact decimals
  // A value is { c, e }: a BigInt coefficient times 10^e. Arithmetic keeps 40
  // significant digits, so rounding noise stays far below what the display shows.
  const P = 40;
  const MAX_EXP = 9999;
  const P10 = Array.from({ length: 96 }, (_, i) => 10n ** BigInt(i));
  const pow10 = (n) => (n < P10.length ? P10[n] : 10n ** BigInt(n));
  const ZERO = { c: 0n, e: 0 };
  const ONE = { c: 1n, e: 0 };
  class CalcError extends Error {}
  const fail = (msg) => { throw new CalcError(msg); };
  const absB = (c) => (c < 0n ? -c : c);
  const ndig = (c) => (c === 0n ? 1 : absB(c).toString().length);
  const mag = (x) => ndig(x.c) + x.e - 1;

  function norm(c, e) {
    if (c === 0n) return ZERO;
    const d = ndig(c);
    if (d > P) {
      const k = d - P, div = pow10(k);
      let q = c / div;
      if (absB(c % div) * 2n >= div) q += c < 0n ? -1n : 1n;
      c = q; e += k;
    }
    while (c % 100000000n === 0n) { c /= 100000000n; e += 8; }
    while (c % 10n === 0n) { c /= 10n; e += 1; }
    const m = ndig(c) + e - 1;
    if (m > MAX_EXP) fail('Overflow');
    if (m < -MAX_EXP) return ZERO;
    return { c, e };
  }
  function dParse(str) {
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(str).trim().replace(/,/g, '').replace(/e[+-]?$/i, ''));
    if (!m || (!m[2] && !m[3])) return ZERO;
    const frac = m[3] || '';
    const c = BigInt((m[2] || '0') + frac) * (m[1] === '-' ? -1n : 1n);
    return norm(c, (m[4] ? parseInt(m[4], 10) : 0) - frac.length);
  }
  // From a JS number (transcendental results), rounded to 15 digits so that
  // sin 30° is exactly 0.5 and tan 45° is exactly 1.
  function dNum(x) {
    if (Number.isNaN(x)) fail('Invalid input');
    if (!isFinite(x)) fail('Overflow');
    if (x === 0) return ZERO;
    return dParse(x.toPrecision(15));
  }
  const toJS = (a) => (a.c === 0n ? 0 : Number(a.c.toString() + 'e' + a.e));
  const dNeg = (a) => (a.c === 0n ? a : { c: -a.c, e: a.e });
  const dSign = (a) => (a.c === 0n ? 0 : a.c < 0n ? -1 : 1);
  const isInt = (a) => a.e >= 0;
  const dInt = (n) => norm(BigInt(n), 0);
  const TEN = dInt(10), HUNDRED = dInt(100), THREE = dInt(3), SIXTY = dInt(60), TENK = dInt(10000), TWO = dInt(2);
  const PI = dParse('3.14159265358979323846264338327950288419716939937510');
  const EULER = dParse('2.71828182845904523536028747135266249775724709369995');

  function dAdd(a, b) {
    if (a.c === 0n) return b;
    if (b.c === 0n) return a;
    const ma = mag(a), mb = mag(b);
    if (ma - mb > P + 1) return a;
    if (mb - ma > P + 1) return b;
    const e = Math.min(a.e, b.e);
    const r = norm(a.c * pow10(a.e - e) + b.c * pow10(b.e - e), e);
    // Cancellation below the working precision is rounding noise, not an answer.
    if (r.c !== 0n && Math.max(ma, mb) - mag(r) > P - 5) return ZERO;
    return r;
  }
  const dSub = (a, b) => dAdd(a, dNeg(b));
  function dMul(a, b) {
    if (a.c === 0n || b.c === 0n) return ZERO;
    if (mag(a) + mag(b) > MAX_EXP + 1) fail('Overflow');
    return norm(a.c * b.c, a.e + b.e);
  }
  function dDiv(a, b) {
    if (b.c === 0n) fail(a.c === 0n ? 'Result is undefined' : 'Cannot divide by zero');
    if (a.c === 0n) return ZERO;
    const k = Math.max(0, P + 2 + ndig(b.c) - ndig(a.c));
    const n = a.c * pow10(k);
    let q = n / b.c;
    let e = a.e - b.e - k;
    // A sticky digit keeps rounding honest when the division is not exact.
    if (n % b.c !== 0n) { q = q * 10n + ((a.c < 0n) !== (b.c < 0n) ? -1n : 1n); e -= 1; }
    return norm(q, e);
  }
  function dTrunc(a) {
    if (a.e >= 0) return a;
    if (mag(a) < 0) return ZERO;
    return norm(a.c / pow10(-a.e), 0);
  }
  const dFrac = (a) => dSub(a, dTrunc(a));
  function dMod(a, b) {
    if (b.c === 0n) fail('Cannot divide by zero');
    return dSub(a, dMul(b, dTrunc(dDiv(a, b))));
  }
  function isqrt(n) {
    if (n < 2n) return n;
    let x = 1n << BigInt((n.toString(2).length >> 1) + 1);
    for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
  }
  function dSqrt(a) {
    if (a.c < 0n) fail('Invalid input');
    if (a.c === 0n) return ZERO;
    let c = a.c, e = a.e;
    if (e % 2 !== 0) { c *= 10n; e -= 1; }
    const k = Math.max(0, Math.ceil((2 * (P + 2) - ndig(c)) / 2));
    const n = c * pow10(2 * k);
    let r = isqrt(n), re = e / 2 - k;
    if (r * r !== n) { r = r * 10n + 1n; re -= 1; }
    return norm(r, re);
  }
  function log10abs(a) { const s = absB(a.c).toString(); return Math.log10(Number('0.' + s.slice(0, 17))) + s.length + a.e; }
  function dPowInt(a, n) {
    const neg = n < 0n;
    if (neg) n = -n;
    if (n === 0n) return ONE;
    if (a.c === 0n) { if (neg) fail('Cannot divide by zero'); return ZERO; }
    const est = Number(n) * log10abs(a);
    if (est > MAX_EXP + 1) { if (neg) return ZERO; fail('Overflow'); }
    if (est < -MAX_EXP - 1) { if (neg) fail('Overflow'); return ZERO; }
    let result = ONE, base = a;
    while (n > 0n) {
      if (n & 1n) result = dMul(result, base);
      n >>= 1n;
      if (n) base = dMul(base, base);
    }
    return neg ? dDiv(ONE, result) : result;
  }
  function dPow10Real(lg) {
    if (lg > MAX_EXP + 1) fail('Overflow');
    if (lg < -MAX_EXP - 1) return ZERO;
    const ip = Math.floor(lg);
    return dMul(dNum(Math.pow(10, lg - ip)), { c: 1n, e: ip });
  }
  function dPow(a, b) {
    if (isInt(b) && mag(b) < 10) return dPowInt(a, b.c * pow10(b.e));
    if (a.c < 0n) fail('Invalid input');
    if (a.c === 0n) { if (b.c < 0n) fail('Cannot divide by zero'); return ZERO; }
    const x = toJS(a), y = toJS(b);
    const lg = y * log10abs(a);
    if (isFinite(x) && x > 0 && Math.abs(lg) < 300) return dNum(Math.pow(x, y));
    return dPow10Real(lg);
  }
  // The y-th root of x, exact when the answer is a whole number (cube root of 27 is 3).
  function dRoot(x, y) {
    if (y.c === 0n) fail('Invalid input');
    const yi = isInt(y) && mag(y) < 6 ? Number(y.c * pow10(y.e)) : null;
    if (x.c < 0n) {
      if (yi == null || yi % 2 === 0) fail('Invalid input');
      return dNeg(dRoot(dNeg(x), y));
    }
    if (x.c === 0n) { if (y.c < 0n) fail('Cannot divide by zero'); return ZERO; }
    if (yi === 2) return dSqrt(x);
    const r = dPow(x, dDiv(ONE, y));
    if (yi != null && yi > 0) {
      const near = Math.round(toJS(r));
      if (Number.isSafeInteger(near) && near > 0) {
        const cand = dInt(near);
        if (dSub(dPowInt(cand, BigInt(yi)), x).c === 0n) return cand;
      }
    }
    return r;
  }
  // Lanczos approximation, so x! works for fractions too.
  function gamma(z) {
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
  function dFact(a) {
    if (isInt(a)) {
      if (a.c < 0n) fail('Invalid input');
      if (mag(a) > 5) fail('Overflow');
      const n = Number(a.c * pow10(a.e));
      let r = ONE;
      for (let i = 2; i <= n; i++) r = dMul(r, { c: BigInt(i), e: 0 });
      return r;
    }
    const x = toJS(a);
    if (x > 170.6) fail('Overflow');
    return dNum(gamma(x + 1));
  }
  const ANG = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };
  function dTrig(fn, a, angle) {
    let x = toJS(a);
    if (!isFinite(x)) fail('Invalid input');
    if (angle === 'deg') x %= 360; else if (angle === 'grad') x %= 400;
    const r = x * ANG[angle];
    let s = Math.sin(r), c = Math.cos(r);
    if (Math.abs(s) < 1e-15) s = 0;
    if (Math.abs(c) < 1e-15) c = 0;
    if (fn === 'sin') return dNum(s);
    if (fn === 'cos') return dNum(c);
    if (c === 0) fail('Invalid input');
    return dNum(s / c);
  }
  function dArc(fn, a, angle) {
    const x = toJS(a);
    if ((fn === 'asin' || fn === 'acos') && Math.abs(x) > 1) fail('Invalid input');
    return dNum(Math[fn](x) / ANG[angle]);
  }
  function dHyp(fn, a) {
    const x = toJS(a);
    if (fn === 'acosh' && x < 1) fail('Invalid input');
    if (fn === 'atanh' && Math.abs(x) >= 1) fail('Invalid input');
    if ((fn === 'sinh' || fn === 'cosh') && Math.abs(x) > 700) {
      const big = dDiv(dExp(dInt(Math.round(Math.abs(x)))), TWO);
      return fn === 'sinh' && x < 0 ? dNeg(big) : big;
    }
    return dNum(Math[fn](x));
  }
  function dLn(a) {
    if (a.c <= 0n) fail('Invalid input');
    const x = toJS(a);
    return dNum(isFinite(x) && x > 0 ? Math.log(x) : log10abs(a) * Math.LN10);
  }
  function dLog(a) {
    if (a.c <= 0n) fail('Invalid input');
    if (absB(a.c) === 1n) return dInt(a.e);
    const x = toJS(a);
    return dNum(isFinite(x) && x > 0 ? Math.log10(x) : log10abs(a));
  }
  function dExp(a) {
    const x = toJS(a);
    if (x > 23027) fail('Overflow');
    if (x < -23027) return ZERO;
    if (Math.abs(x) < 700) return dNum(Math.exp(x));
    return dPow10Real(x * Math.LOG10E);
  }
  // Decimal degrees to degrees.minutes-seconds (12.5 becomes 12.30) and back.
  function dDms(a) {
    const neg = a.c < 0n, x = neg ? dNeg(a) : a;
    const d = dTrunc(x);
    const mRaw = dMul(dSub(x, d), SIXTY);
    const m = dTrunc(mRaw);
    const s = dMul(dSub(mRaw, m), SIXTY);
    const r = dAdd(dAdd(d, dDiv(m, HUNDRED)), dDiv(s, TENK));
    return neg ? dNeg(r) : r;
  }
  function dDeg(a) {
    const neg = a.c < 0n, x = neg ? dNeg(a) : a;
    const d = dTrunc(x);
    const f = dMul(dSub(x, d), HUNDRED);
    const m = dTrunc(f);
    const s = dMul(dSub(f, m), HUNDRED);
    const r = dAdd(dAdd(d, dDiv(m, SIXTY)), dDiv(s, dInt(3600)));
    return neg ? dNeg(r) : r;
  }

  // ------------------------------------------------------------ formatting
  const groupInt = (s, on) => (on ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s);
  function dRoundSig(a, n) {
    if (a.c === 0n) return a;
    const d = ndig(a.c);
    if (d <= n) return a;
    const k = d - n, div = pow10(k);
    let q = a.c / div;
    if (absB(a.c % div) * 2n >= div) q += a.c < 0n ? -1n : 1n;
    return norm(q, a.e + k);
  }
  // Up to maxDigits significant digits, switching to 1.5e+20 style when needed.
  function dFormat(a, maxDigits, group, sci) {
    if (a.c === 0n) return '0';
    const r = dRoundSig(a, maxDigits);
    const neg = r.c < 0n;
    const ds = absB(r.c).toString();
    const m = ds.length + r.e - 1;
    let out;
    if (sci || m >= maxDigits || (m < 0 && ds.length - m - 1 > maxDigits)) {
      out = (ds.length > 1 ? ds[0] + '.' + ds.slice(1) : ds) + 'e' + (m >= 0 ? '+' : '-') + Math.abs(m);
    } else if (r.e >= 0) {
      out = groupInt(ds + '0'.repeat(r.e), group);
    } else {
      const point = ds.length + r.e;
      out = point > 0 ? groupInt(ds.slice(0, point), group) + '.' + ds.slice(point) : '0.' + '0'.repeat(-point) + ds;
    }
    return (neg ? '-' : '') + out;
  }
  // What the user is typing, with digit grouping but keeping trailing zeros.
  function fmtEntry(s, group) {
    const m = /^(-?)(\d*)(\.?)(\d*)(e[+-]?\d*)?$/.exec(s);
    if (!m) return s;
    return m[1] + groupInt(m[2] || '0', group) + m[3] + m[4] + (m[5] || '');
  }
  const plain = (a) => dFormat(a, P, false, false);

  // @@CONTINUE@@
})();
