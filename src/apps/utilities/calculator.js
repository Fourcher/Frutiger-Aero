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
    if (!neg && est >= MAX_EXP + 1) fail('Overflow');
    if (neg && est > MAX_EXP + 0.5) return ZERO;
    if (est < -MAX_EXP - 1) { if (neg) fail('Overflow'); return ZERO; }
    let result = ONE, base = a;
    try {
      while (n > 0n) {
        if (n & 1n) result = dMul(result, base);
        n >>= 1n;
        if (n) base = dMul(base, base);
      }
    } catch (err) {
      // 1 / (something too big) is just too small to show.
      if (neg && err instanceof CalcError && err.message === 'Overflow') return ZERO;
      throw err;
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
    const g = gamma(x + 1);
    if (!isFinite(g) || Number.isNaN(g)) fail('Invalid input');
    return dParse(g.toPrecision(14)); // the approximation is good to about 14 digits
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

  // ============================================================ unit conversion
  // Factors convert each unit to the category's base unit. "a/b" means a divided by b.
  const UNITS = {
    Length: [['Nanometers', '1e-9'], ['Microns', '1e-6'], ['Millimeters', '0.001'], ['Centimeters', '0.01'], ['Meters', '1'], ['Kilometers', '1000'],
      ['Inches', '0.0254'], ['Feet', '0.3048'], ['Yards', '0.9144'], ['Miles', '1609.344'], ['Nautical miles', '1852'], ['Hands', '0.1016'], ['Light-years', '9460730472580800']],
    Weight: [['Carats', '0.2'], ['Milligrams', '0.001'], ['Grams', '1'], ['Kilograms', '1000'], ['Metric tonnes', '1000000'], ['Ounces', '28.349523125'],
      ['Pounds', '453.59237'], ['Stones', '6350.29318'], ['Short tons (US)', '907184.74'], ['Long tons (UK)', '1016046.9088']],
    Temperature: [['Celsius', 'C'], ['Fahrenheit', 'F'], ['Kelvin', 'K']],
    Volume: [['Milliliters', '0.001'], ['Liters', '1'], ['Cubic centimeters', '0.001'], ['Cubic meters', '1000'], ['Cubic inches', '0.016387064'], ['Cubic feet', '28.316846592'],
      ['Teaspoons (US)', '0.00492892159375'], ['Tablespoons (US)', '0.01478676478125'], ['Fluid ounces (US)', '0.0295735295625'], ['Cups (US)', '0.2365882365'],
      ['Pints (US)', '0.473176473'], ['Quarts (US)', '0.946352946'], ['Gallons (US)', '3.785411784'], ['Gallons (UK)', '4.54609']],
    Area: [['Square millimeters', '0.000001'], ['Square centimeters', '0.0001'], ['Square meters', '1'], ['Hectares', '10000'], ['Square kilometers', '1000000'],
      ['Square inches', '0.00064516'], ['Square feet', '0.09290304'], ['Square yards', '0.83612736'], ['Acres', '4046.8564224'], ['Square miles', '2589988.110336']],
    Speed: [['Meters per second', '1'], ['Kilometers per hour', '1000/3600'], ['Miles per hour', '0.44704'], ['Feet per second', '0.3048'], ['Knots', '1852/3600'], ['Mach (at sea level)', '340.3']],
    Time: [['Microseconds', '0.000001'], ['Milliseconds', '0.001'], ['Seconds', '1'], ['Minutes', '60'], ['Hours', '3600'], ['Days', '86400'], ['Weeks', '604800'], ['Years (365 days)', '31536000']],
  };
  const UNIT_DEFAULTS = { Length: [7, 4], Weight: [6, 3], Temperature: [0, 1], Volume: [1, 12], Area: [2, 6], Speed: [1, 2], Time: [5, 4] };
  function factor(s) { const i = s.indexOf('/'); return i > 0 ? dDiv(dParse(s.slice(0, i)), dParse(s.slice(i + 1))) : dParse(s); }
  function convertUnit(cat, v, from, to) {
    const list = UNITS[cat];
    if (cat === 'Temperature') {
      const f = list[from][1], t = list[to][1];
      const NINE = dInt(9), FIVE = dInt(5), K = dParse('273.15'), F32 = dInt(32);
      const c = f === 'C' ? v : f === 'F' ? dDiv(dMul(dSub(v, F32), FIVE), NINE) : dSub(v, K);
      return t === 'C' ? c : t === 'F' ? dAdd(dDiv(dMul(c, NINE), FIVE), F32) : dAdd(c, K);
    }
    return dDiv(dMul(v, factor(list[from][1])), factor(list[to][1]));
  }

  // ============================================================ dates
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  function parseDate(s) {
    const m = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    d.setFullYear(+m[1]);
    return isNaN(d) ? null : d;
  }
  const dayNum = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  // Whole months first (clamping at month ends, like adding months does), then the leftover days.
  function dateDiff(a, b) {
    if (dayNum(a) > dayNum(b)) [a, b] = [b, a];
    let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (months > 0 && dayNum(addToDate(a, 0, months, 0)) > dayNum(b)) months--;
    const rest = dayNum(b) - dayNum(addToDate(a, 0, months, 0));
    return { y: Math.floor(months / 12), m: months % 12, w: Math.floor(rest / 7), d: rest % 7, days: dayNum(b) - dayNum(a) };
  }
  function addToDate(date, years, months, days) {
    const y = date.getFullYear() + years, m = date.getMonth() + months;
    const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    const out = new Date(ty, tm, Math.min(date.getDate(), daysIn(ty, tm)));
    out.setFullYear(ty);
    out.setDate(out.getDate() + days);
    return out;
  }

  // ============================================================ precedence engine
  // Keeps operator precedence while showing running results, the way a good
  // scientific calculator does. Works for decimals and for programmer integers.
  function makeEngine(sys) {
    const E = { vals: [], ops: [], line: [], opens: [] };
    E.reset = () => { E.vals = []; E.ops = []; E.line = []; E.opens = []; };
    const top = () => E.ops[E.ops.length - 1];
    const applyTop = () => { const op = E.ops.pop(); const b = E.vals.pop(); const a = E.vals.pop(); E.vals.push(sys.apply(op, a, b)); };
    const binds = (t, op) => t !== '(' && (sys.prec[t] > sys.prec[op] || (sys.prec[t] === sys.prec[op] && !sys.right.has(op)));
    E.operand = (v, text) => { E.vals.push(v); E.line.push(text); };
    E.op = (op) => {
      while (E.ops.length && binds(top(), op)) applyTop();
      E.ops.push(op);
      E.line.push(sys.sym[op]);
      return E.vals[E.vals.length - 1];
    };
    E.swapOp = (op) => { E.ops.pop(); E.line.pop(); return E.op(op); };
    E.open = () => { E.opens.push(E.line.length); E.ops.push('('); E.line.push('('); };
    E.close = () => {
      while (E.ops.length && top() !== '(') applyTop();
      E.ops.pop();
      const start = E.opens.pop();
      E.line.push(')');
      const text = E.line.slice(start).join(' ');
      E.line.length = start;
      return { value: E.vals.pop(), text };
    };
    E.finish = () => {
      while (E.ops.length) { if (top() === '(') { E.ops.pop(); E.line.push(')'); } else applyTop(); }
      E.opens = [];
      return E.vals.pop();
    };
    E.parens = () => E.opens.length;
    E.lastOp = () => { for (let i = E.ops.length - 1; i >= 0; i--) if (E.ops[i] !== '(') return E.ops[i]; return null; };
    E.pendingOp = () => (E.ops.length && top() !== '(' ? top() : null);
    E.left = () => E.vals[E.vals.length - 1];
    return E;
  }
  const DEC_SYS = {
    prec: { '+': 1, '-': 1, '*': 2, '/': 2, mod: 2, pow: 3, root: 3 },
    right: new Set(['pow', 'root']),
    sym: { '+': '+', '-': '−', '*': '×', '/': '÷', mod: 'Mod', pow: '^', root: 'yroot' },
    apply(op, a, b) {
      switch (op) {
        case '+': return dAdd(a, b);
        case '-': return dSub(a, b);
        case '*': return dMul(a, b);
        case '/': return dDiv(a, b);
        case 'mod': return dMod(a, b);
        case 'pow': return dPow(a, b);
        case 'root': return dRoot(a, b);
      }
      return b;
    },
  };
  function progSys(getBits) {
    return {
      prec: { or: 1, xor: 2, and: 3, lsh: 4, rsh: 4, '+': 5, '-': 5, '*': 6, '/': 6, mod: 6 },
      right: new Set(),
      sym: { or: 'Or', xor: 'Xor', and: 'And', lsh: 'Lsh', rsh: 'Rsh', '+': '+', '-': '−', '*': '×', '/': '÷', mod: 'Mod' },
      apply(op, a, b) {
        const W = getBits();
        const wrap = (v) => BigInt.asIntN(W, v);
        switch (op) {
          case '+': return wrap(a + b);
          case '-': return wrap(a - b);
          case '*': return wrap(a * b);
          case '/': if (b === 0n) fail('Cannot divide by zero'); return wrap(a / b);
          case 'mod': if (b === 0n) fail('Cannot divide by zero'); return wrap(a % b);
          case 'and': return wrap(a & b);
          case 'or': return wrap(a | b);
          case 'xor': return wrap(a ^ b);
          case 'lsh': return b < 0n || b >= BigInt(W) ? 0n : wrap(a << b);
          case 'rsh': return b < 0n || b >= BigInt(W) ? (a < 0n ? -1n : 0n) : wrap(a >> b);
        }
        return b;
      },
    };
  }

  // ============================================================ keypads
  // [label, action, argument, classes]. Classes pick the gel tone and the size.
  const STD_KEYS = [
    ['MC', 'mem', 'MC', 'mem'], ['MR', 'mem', 'MR', 'mem'], ['MS', 'mem', 'MS', 'mem'], ['M+', 'mem', 'M+', 'mem'], ['M−', 'mem', 'M-', 'mem'],
    ['←', 'back', '', 'fn'], ['CE', 'ce', '', 'fn'], ['C', 'clear', '', 'fn'], ['±', 'neg', '', 'fn'], ['√', 'un', 'sqrt', 'fn'],
    ['7', 'digit', '7', 'num'], ['8', 'digit', '8', 'num'], ['9', 'digit', '9', 'num'], ['÷', 'op', '/', 'op'], ['%', 'pct', '', 'fn'],
    ['4', 'digit', '4', 'num'], ['5', 'digit', '5', 'num'], ['6', 'digit', '6', 'num'], ['×', 'op', '*', 'op'], ['1/x', 'un', 'recip', 'fn'],
    ['1', 'digit', '1', 'num'], ['2', 'digit', '2', 'num'], ['3', 'digit', '3', 'num'], ['−', 'op', '-', 'op'], ['=', 'eq', '', 'eq tall'],
    ['0', 'digit', '0', 'num wide'], ['.', 'dot', '', 'num'], ['+', 'op', '+', 'op'],
  ];
  // Scientific block: [label, action, argument, inverse label, inverse argument]
  const SCI_KEYS = [
    [['Rand', 'rand'], ['Inv', 'inv'], ['ln', 'un', 'ln', 'eˣ', 'exp'], ['(', 'lp'], [')', 'rp']],
    [['Int', 'un', 'int', 'Frac', 'frac'], ['sinh', 'un', 'sinh', 'sinh⁻¹', 'asinh'], ['sin', 'un', 'sin', 'sin⁻¹', 'asin'], ['x²', 'un', 'sqr', '√x', 'sqrt'], ['n!', 'un', 'fact']],
    [['dms', 'un', 'dms', 'deg', 'deg'], ['cosh', 'un', 'cosh', 'cosh⁻¹', 'acosh'], ['cos', 'un', 'cos', 'cos⁻¹', 'acos'], ['xʸ', 'op', 'pow'], ['ʸ√x', 'op', 'root']],
    [['π', 'pi'], ['tanh', 'un', 'tanh', 'tanh⁻¹', 'atanh'], ['tan', 'un', 'tan', 'tan⁻¹', 'atan'], ['x³', 'un', 'cube', '∛x', 'cuberoot'], ['∛x', 'un', 'cuberoot']],
    [['F-E', 'fe'], ['Exp', 'exp'], ['Mod', 'op', 'mod'], ['log', 'un', 'log', '10ˣ', 'pow10'], ['10ˣ', 'un', 'pow10', 'log', 'log']],
  ];
  const PROG_KEYS = [
    [['Quot', 'op', '/'], ['Mod', 'op', 'mod'], ['A', 'digit', 'A', 'num']],
    [['(', 'lp'], [')', 'rp'], ['B', 'digit', 'B', 'num']],
    [['RoL', 'rol'], ['RoR', 'ror'], ['C', 'digit', 'C', 'num']],
    [['Or', 'op', 'or'], ['Xor', 'op', 'xor'], ['D', 'digit', 'D', 'num']],
    [['Lsh', 'op', 'lsh'], ['Rsh', 'op', 'rsh'], ['E', 'digit', 'E', 'num']],
    [['Not', 'not'], ['And', 'op', 'and'], ['F', 'digit', 'F', 'num']],
  ];
  // Expression-line names for one-number functions.
  const UNARY_NAMES = {
    sqrt: 'sqrt', sqr: 'sqr', cube: 'cube', cuberoot: 'cuberoot', recip: 'reciproc', negate: 'negate', fact: 'fact',
    ln: 'ln', exp: 'powe', log: 'log', pow10: 'powten', int: 'int', frac: 'frac', dms: 'dms', deg: 'degrees',
    sin: 'sin', cos: 'cos', tan: 'tan', asin: 'asin', acos: 'acos', atan: 'atan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', asinh: 'asinh', acosh: 'acosh', atanh: 'atanh',
    not: 'NOT', rol: 'RoL', ror: 'RoR',
  };
  const MODES = ['standard', 'scientific', 'programmer'];

  // ============================================================ the app
  A.apps.register({
    id: 'calculator',
    name: 'Calculator',
    icon: 'icons/calculator',
    color: '#3aa6f5',
    category: 'accessories',
    description: 'Adds, subtracts and much more, with scientific, programmer, unit and date tools.',
    keywords: ['math', 'calc', 'calculator', 'scientific', 'programmer', 'hex', 'binary', 'convert', 'units', 'date'],
    window: { width: 290, height: 400, resizable: false, maximizable: false },
    launch(win, args) {
      const saved = (k, ok, dflt) => { const v = A.store.get(k, dflt); return ok(v) ? v : dflt; };
      let mode = saved('calc.mode', (v) => MODES.includes(v), 'standard');
      if (args && MODES.includes(args.mode)) mode = args.mode;
      let panel = saved('calc.panel', (v) => v === 'unit' || v === 'date', 'none');
      let showHistory = A.store.get('calc.showHistory', false) === true;
      let grouping = A.store.get('calc.grouping', true) !== false;
      let angle = saved('calc.angle', (v) => v in ANG, 'deg');
      let fe = false, inv = false, flipped = false;
      let base = 10, bits = 64;
      let history = (A.store.get('calc.historyList', []) || []).filter((x) => x && typeof x.e === 'string').slice(0, 40);
      let mem = null; // memory is kept as a decimal in every mode

      // Engine state shared by the key handlers.
      const progS = progSys(() => bits);
      const decEng = makeEngine(DEC_SYS), progEng = makeEngine(progS);
      const isProg = () => mode === 'programmer';
      let eng = isProg() ? progEng : decEng;
      const sys = () => (isProg() ? progS : DEC_SYS);
      let cur = { typed: '0', v: null, text: null };
      let phase = 'entry'; // entry | value | afterOp | afterParen | afterEq
      let errorMsg = null;
      let lastEq = null;

      // ------------------------------------------------------------ DOM
      win.body.classList.add('calc');
      const numEl = h('div.calc-num', { role: 'status', 'aria-live': 'polite' }, '0');
      const exprEl = h('div.calc-expr', { 'aria-hidden': 'true' });
      const memEl = h('span.calc-ind.calc-ind-mem', { 'data-tip': 'A number is saved in memory' }, 'M');
      const parenEl = h('span.calc-ind.calc-ind-paren');
      const infoEl = h('span.calc-ind.calc-ind-info');
      const histEl = h('div.calc-hist', { hidden: true });
      const lcd = h('div.calc-lcd', null, histEl, h('div.calc-lcd-top', null, memEl, parenEl, h('span.calc-ind-fill'), infoEl), exprEl, numEl);
      const bitsEl = h('div.calc-bitgrid');
      const pad = h('div.calc-pad');
      const main = h('div.calc-main', null, lcd, bitsEl, pad);
      const panelEl = h('div.calc-panel');
      const panelWrap = h('div.calc-panel-wrap', null, panelEl);
      const root = h('div.calc-root', null, main, panelWrap);

      const menubar = A.ui.menubar([
        { label: 'View', items: () => [
          { label: 'Standard', shortcut: 'Alt+1', checked: mode === 'standard', radio: true, onClick: () => setMode('standard') },
          { label: 'Scientific', shortcut: 'Alt+2', checked: mode === 'scientific', radio: true, onClick: () => setMode('scientific') },
          { label: 'Programmer', shortcut: 'Alt+3', checked: mode === 'programmer', radio: true, onClick: () => setMode('programmer') },
          { separator: true },
          { label: 'History', shortcut: 'Ctrl+H', checked: showHistory, onClick: toggleHistory },
          { label: 'Digit grouping', checked: grouping, onClick: () => { grouping = !grouping; A.store.set('calc.grouping', grouping); show(); } },
          { separator: true },
          { label: 'Basic', shortcut: 'Ctrl+F4', checked: panel === 'none', radio: true, onClick: () => setPanel('none') },
          { label: 'Unit conversion', shortcut: 'Ctrl+U', checked: panel === 'unit', radio: true, onClick: () => setPanel('unit') },
          { label: 'Date calculation', shortcut: 'Ctrl+E', checked: panel === 'date', radio: true, onClick: () => setPanel('date') },
        ] },
        { label: 'Edit', items: () => [
          { label: 'Copy', shortcut: 'Ctrl+C', onClick: copyValue },
          { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteFromMenu },
          { separator: true },
          { label: 'History', submenu: [
            { label: 'Copy history', disabled: !history.length, onClick: copyHistory },
            { label: 'Clear history', shortcut: 'Ctrl+Shift+D', disabled: !history.length, onClick: clearHistory },
          ] },
        ] },
        { label: 'Help', items: () => [
          { label: 'View Help', onClick: help },
          { separator: true },
          { label: 'About Calculator', onClick: about },
        ] },
      ]);
      win.body.append(menubar, root);

      // ------------------------------------------------------------ numbers in either mode
      const maxDigits = () => (mode === 'scientific' ? 32 : 16);
      const prefix = () => (base === 16 ? '0x' : base === 8 ? '0o' : base === 2 ? '0b' : '');
      function parseProg(t) {
        const neg = t.startsWith('-');
        let v = BigInt(prefix() + (t.replace('-', '') || '0'));
        if (neg) v = -v;
        return BigInt.asIntN(bits, v);
      }
      function groupProg(s) {
        if (!grouping) return s;
        if (base === 10) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const n = base === 8 ? 3 : 4;
        return s.replace(new RegExp('\\B(?=(\\w{' + n + '})+(?!\\w))', 'g'), ' ');
      }
      const progDigits = (v) => (base === 10 ? BigInt.asIntN(bits, v).toString() : BigInt.asUintN(bits, v).toString(base).toUpperCase());
      const N = {
        zero: () => (isProg() ? 0n : ZERO),
        parse: (t) => (isProg() ? parseProg(t) : dParse(t)),
        show: (v) => (isProg() ? groupProg(progDigits(v)) : dFormat(v, maxDigits(), grouping, fe)),
        entry: (t) => (isProg() ? (t.startsWith('-') ? '-' : '') + groupProg(t.replace('-', '').toUpperCase()) : fmtEntry(t, grouping)),
        plain: (v) => (isProg() ? progDigits(v) : plain(v)),
      };
      const curValue = () => (phase === 'entry' ? N.parse(cur.typed) : cur.v);
      const curText = () => (cur.text != null ? cur.text : N.show(curValue()));
      const commit = () => eng.operand(curValue(), curText());
      function setValue(v, text) { cur = { typed: null, v, text: text == null ? null : text }; phase = 'value'; }
      const toDec = (v) => (typeof v === 'bigint' ? dParse(v.toString()) : v);
      function toProg(v) {
        if (typeof v === 'bigint') return BigInt.asIntN(bits, v);
        const t = dTrunc(v);
        return BigInt.asIntN(bits, t.c * pow10(t.e));
      }

      // ------------------------------------------------------------ typing numbers
      function fits(t) {
        if (isProg()) {
          let v;
          try { v = BigInt(prefix() + (t.replace('-', '') || '0')); } catch (e) { return false; }
          const W = BigInt(bits);
          if (base === 10) return t.startsWith('-') ? v <= 1n << (W - 1n) : v <= (1n << (W - 1n)) - 1n;
          return v < 1n << W;
        }
        return t.replace(/^-/, '').replace('.', '').replace(/^0+(?=\d)/, '').length <= maxDigits();
      }
      function digit(d) {
        if (errorMsg || phase === 'afterEq') clearAll(true);
        if (isProg() && parseInt(d, 16) >= base) return nope();
        if (!isProg() && !/^[0-9]$/.test(d)) return nope();
        if (phase !== 'entry') { cur = { typed: '0' }; phase = 'entry'; }
        const t = cur.typed;
        if (!isProg() && t.includes('e')) {
          if (t.split('e')[1].replace(/[+-]/, '').length >= 4) return nope();
          cur.typed = t + d;
        } else {
          const next = t === '0' ? d : t === '-0' ? '-' + d : t + d;
          if (next !== t && !fits(next)) return nope();
          cur.typed = next;
        }
        show();
      }
      function dot() {
        if (isProg()) return nope();
        if (errorMsg || phase === 'afterEq') clearAll(true);
        if (phase !== 'entry') { cur = { typed: '0.' }; phase = 'entry'; show(); return; }
        if (cur.typed.includes('.') || cur.typed.includes('e')) return nope();
        cur.typed += '.';
        show();
      }
      // Exp starts the exponent of a number written like 1.5e+20.
      function expKey() {
        if (errorMsg || isProg()) return nope();
        if (phase !== 'entry') {
          const v = cur.v || ZERO;
          if (phase === 'afterEq') clearAll(true);
          const p = plain(v);
          cur = { typed: p.includes('e') ? '1' : p };
          phase = 'entry';
        }
        if (!cur.typed.includes('e')) cur.typed += 'e+';
        show();
      }
      function negate() {
        if (errorMsg) return nope();
        if (phase === 'entry' && !isProg()) {
          let t = cur.typed;
          if (t.includes('e')) t = t.replace(/e([+-])/, (m0, s) => 'e' + (s === '-' ? '+' : '-'));
          else if (t !== '0') t = t.startsWith('-') ? t.slice(1) : '-' + t;
          cur.typed = t;
          show();
          return;
        }
        unary('negate');
      }

      // ------------------------------------------------------------ functions of one number
      function unaryFn(kind, v) {
        if (isProg()) {
          const W = BigInt(bits), u = BigInt.asUintN(bits, v);
          if (kind === 'negate') return BigInt.asIntN(bits, -v);
          if (kind === 'not') return BigInt.asIntN(bits, ~v);
          if (kind === 'rol') return BigInt.asIntN(bits, (u << 1n) | (u >> (W - 1n)));
          if (kind === 'ror') return BigInt.asIntN(bits, (u >> 1n) | ((u & 1n) << (W - 1n)));
          fail('Invalid input');
        }
        switch (kind) {
          case 'sqrt': return dSqrt(v);
          case 'sqr': return dMul(v, v);
          case 'cube': return dMul(dMul(v, v), v);
          case 'cuberoot': return dRoot(v, THREE);
          case 'recip': return dDiv(ONE, v);
          case 'negate': return dNeg(v);
          case 'fact': return dFact(v);
          case 'ln': return dLn(v);
          case 'exp': return dExp(v);
          case 'log': return dLog(v);
          case 'pow10': return dPow(TEN, v);
          case 'int': return dTrunc(v);
          case 'frac': return dFrac(v);
          case 'dms': return dDms(v);
          case 'deg': return dDeg(v);
          case 'sin': case 'cos': case 'tan': return dTrig(kind, v, angle);
          case 'asin': case 'acos': case 'atan': return dArc(kind, v, angle);
          default: return dHyp(kind, v);
        }
      }
      function unary(kind) {
        if (errorMsg) return nope();
        const v = curValue();
        const inner = phase === 'afterEq' ? N.show(v) : curText();
        try {
          const r = unaryFn(kind, v);
          if (phase === 'afterEq') eng.reset();
          setValue(r, (UNARY_NAMES[kind] || kind) + '(' + inner + ')');
          show();
        } catch (err) { oops(err); }
      }
      // 200 + 10 % gives 20 (ten percent of 200); 50 × 10 % gives 0.1 × 50.
      function percent() {
        if (errorMsg || isProg()) return nope();
        const v = curValue();
        const op = phase === 'afterEq' ? null : eng.pendingOp();
        try {
          const r = op === '+' || op === '-' ? dDiv(dMul(eng.left(), v), HUNDRED) : dDiv(v, HUNDRED);
          if (phase === 'afterEq') eng.reset();
          setValue(r, N.show(r));
          show();
        } catch (err) { oops(err); }
      }
      function constant(v) {
        if (errorMsg || phase === 'afterEq') clearAll(true);
        setValue(v, null);
        show();
      }

      // ------------------------------------------------------------ operators, equals, parentheses
      function operator(op) {
        if (errorMsg) return nope();
        if (!(op in sys().prec)) return nope();
        try {
          let v;
          if (phase === 'afterOp') v = eng.swapOp(op);
          else {
            if (phase === 'afterEq') { const r = cur.v; eng.reset(); setValue(r, null); }
            commit();
            v = eng.op(op);
          }
          cur = { typed: null, v, text: null };
          phase = 'afterOp';
          show();
        } catch (err) { oops(err); }
      }
      function equals() {
        if (errorMsg) return nope();
        try {
          if (phase === 'afterEq') {
            // Pressing = again repeats the last operation: 2 + 3 = = = gives 5, 8, 11.
            if (!lastEq) return;
            const a = cur.v;
            const r = sys().apply(lastEq.op, a, lastEq.operand);
            const expr = N.show(a) + ' ' + sys().sym[lastEq.op] + ' ' + N.show(lastEq.operand);
            eng.reset();
            eng.line = [expr, '='];
            addHistory(expr, r);
            setValue(r, null);
            phase = 'afterEq';
            show();
            return;
          }
          const op = eng.lastOp();
          const operand = curValue();
          commit();
          const r = eng.finish();
          lastEq = op ? { op, operand } : null;
          const expr = eng.line.join(' ');
          eng.line.push('=');
          eng.vals = []; eng.ops = [];
          if (expr !== N.show(r)) addHistory(expr, r);
          setValue(r, null);
          phase = 'afterEq';
          show();
        } catch (err) { oops(err); }
      }
      function openParen() {
        if (errorMsg || eng.parens() >= 25) return nope();
        try {
          if (phase === 'afterEq') clearAll(true);
          else if ((phase === 'entry' && cur.typed !== '0') || phase === 'value') { commit(); eng.op('*'); } // 2(3 + 4) means 2 × (3 + 4)
          eng.open();
          cur = { typed: null, v: N.zero(), text: null };
          phase = 'afterParen';
          show();
        } catch (err) { oops(err); }
      }
      function closeParen() {
        if (errorMsg || !eng.parens() || phase === 'afterEq') return nope();
        try {
          commit();
          const g = eng.close();
          setValue(g.value, g.text);
          show();
        } catch (err) { oops(err); }
      }

      // ------------------------------------------------------------ clearing and memory
      function clearEntry() {
        if (errorMsg || phase === 'afterEq') return clearAll();
        cur = { typed: '0' };
        phase = 'entry';
        show();
      }
      function clearAll(quiet) {
        eng.reset();
        cur = { typed: '0' };
        phase = 'entry';
        errorMsg = null;
        lastEq = null;
        if (!quiet) show();
      }
      function backspace() {
        if (errorMsg) return clearAll();
        if (phase !== 'entry') return nope();
        let t = cur.typed.slice(0, -1);
        if (/e[+-]?$/.test(t)) t = t.replace(/e[+-]?$/, '');
        if (t === '' || t === '-') t = '0';
        cur.typed = t;
        show();
      }
      function memory(kind) {
        if (errorMsg && kind !== 'MC') return nope();
        try {
          const v = curValue();
          if (kind === 'MC') mem = null;
          else if (kind === 'MR') {
            if (!mem) return nope();
            if (phase === 'afterEq') eng.reset();
            setValue(isProg() ? toProg(mem) : mem, null);
          } else if (kind === 'MS') mem = toDec(v);
          else if (kind === 'M+') mem = dAdd(mem || ZERO, toDec(v));
          else if (kind === 'M-') mem = dSub(mem || ZERO, toDec(v));
          // After saving, the next digit starts a fresh number.
          if (kind !== 'MR' && kind !== 'MC' && phase === 'entry') setValue(v, null);
          show();
        } catch (err) { oops(err); }
      }

      // ------------------------------------------------------------ feedback
      function oops(err) {
        if (!(err instanceof CalcError)) console.error('[Calculator]', err);
        errorMsg = err instanceof CalcError ? err.message : 'Invalid input';
        eng.reset();
        lastEq = null;
        A.sound.play('error');
        show();
      }
      function nope() {
        lcd.classList.remove('calc-nope');
        void lcd.offsetWidth;
        lcd.classList.add('calc-nope');
      }
      function show() {
        let text;
        if (errorMsg) text = errorMsg;
        else if (phase === 'entry') text = N.entry(cur.typed);
        else text = N.show(cur.v);
        numEl.textContent = text;
        numEl.classList.toggle('calc-num-error', !!errorMsg);
        const pending = phase === 'value' && cur.text ? cur.text : '';
        exprEl.textContent = errorMsg ? '' : eng.line.concat(pending ? [pending] : []).join(' ');
        exprEl.scrollLeft = exprEl.scrollWidth;
        memEl.classList.toggle('on', !!mem);
        const pc = eng.parens();
        parenEl.textContent = pc ? '(=' + pc : '';
        if (mode === 'scientific') infoEl.textContent = { deg: 'DEG', rad: 'RAD', grad: 'GRAD' }[angle] + (inv ? ' · INV' : '') + (fe ? ' · F-E' : '');
        else if (isProg()) infoEl.textContent = { 16: 'HEX', 10: 'DEC', 8: 'OCT', 2: 'BIN' }[base] + ' · ' + { 64: 'QWORD', 32: 'DWORD', 16: 'WORD', 8: 'BYTE' }[bits];
        else infoEl.textContent = '';
        fitNumber();
        if (isProg()) renderBits();
        if (panel === 'unit') updateUnit();
      }
      function fitNumber() {
        for (const size of [34, 29, 24, 20, 17, 14]) {
          numEl.style.fontSize = size + 'px';
          if (numEl.scrollWidth <= numEl.clientWidth + 1) break;
        }
      }

      // ------------------------------------------------------------ history
      function addHistory(expr, r) {
        history.unshift({ e: expr, r: N.show(r), raw: isProg() ? 'p:' + r.toString() : plain(r) });
        if (history.length > 40) history.length = 40;
        A.store.set('calc.historyList', history);
        renderHistory();
      }
      function renderHistory() {
        histEl.hidden = !showHistory;
        if (!showHistory) return;
        histEl.innerHTML = '';
        if (!history.length) { histEl.appendChild(h('div.calc-hist-empty', null, "There's no history yet.")); return; }
        history.slice().reverse().forEach((it) => {
          const row = h('button.calc-hist-item', { type: 'button', 'data-tip': 'Use this result' }, h('span.calc-hist-expr', null, it.e + ' ='), h('span.calc-hist-res', null, it.r));
          row.addEventListener('mousedown', (e) => e.preventDefault());
          row.addEventListener('click', () => recall(it));
          histEl.appendChild(row);
        });
        histEl.scrollTop = histEl.scrollHeight;
      }
      function recall(it) {
        const isP = String(it.raw).startsWith('p:');
        try {
          const v = isP ? (isProg() ? BigInt.asIntN(bits, BigInt(it.raw.slice(2))) : dParse(it.raw.slice(2))) : (isProg() ? toProg(dParse(it.raw)) : dParse(it.raw));
          if (errorMsg || phase === 'afterEq') clearAll(true);
          setValue(v, null);
          A.sound.play('click');
          show();
        } catch (err) { oops(err); }
      }
      function toggleHistory() {
        showHistory = !showHistory;
        A.store.set('calc.showHistory', showHistory);
        renderHistory();
        fitWindow(true);
      }
      function clearHistory() {
        history = [];
        A.store.set('calc.historyList', history);
        renderHistory();
        A.sound.play('recycle');
      }
      function copyHistory() {
        const text = history.slice().reverse().map((it) => it.e + ' = ' + it.r).join('\r\n');
        writeClipboard(text);
      }

      // ------------------------------------------------------------ keypads
      function keyEl(def) {
        const [label, act, arg = '', cls = 'fn', invLabel, invArg] = def;
        const tone = /\bop\b/.test(cls) ? 'aqua' : /\beq\b/.test(cls) ? 'grass' : 'pearl';
        const b = h('button.calc-key.fa-btn', {
          type: 'button', tabIndex: -1,
          class: ['fa-tone-' + tone].concat(cls.split(' ').map((c) => 'calc-k-' + c)),
          dataset: { act, arg },
          'aria-label': label,
        }, h('span', null, label));
        if (invLabel) Object.assign(b.dataset, { label, invLabel, invArg });
        // Keep keyboard focus on the window so typing keeps working after a click.
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => press(act, arg, b));
        return b;
      }
      const sciDef = (d) => [d[0], d[1], d[2] || '', 'sci', d[3], d[4]];
      function buildPad() {
        pad.innerHTML = '';
        bitsEl.innerHTML = '';
        pad.className = 'calc-pad calc-pad-' + mode;
        win.body.dataset.mode = mode;
        inv = false;
        const std = STD_KEYS.map(keyEl);
        if (mode === 'standard') { std.forEach((k) => pad.appendChild(k)); return; }
        if (mode === 'scientific') {
          const angles = A.ui.radioGroup({ options: [['deg', 'Degrees'], ['rad', 'Radians'], ['grad', 'Grads']], value: angle, onChange: setAngle });
          pad.appendChild(h('div.calc-box.calc-angles', null, angles));
          std.slice(0, 5).forEach((k) => pad.appendChild(k));
          SCI_KEYS.forEach((row, r) => {
            row.forEach((d) => pad.appendChild(keyEl(sciDef(d))));
            std.slice(5 + r * 5, 10 + r * 5).forEach((k) => pad.appendChild(k));
          });
          return;
        }
        // Programmer
        const bases = A.ui.radioGroup({ options: [[16, 'Hex'], [10, 'Dec'], [8, 'Oct'], [2, 'Bin']], value: base, onChange: (v) => setBase(Number(v)) });
        const words = A.ui.radioGroup({ options: [[64, 'Qword'], [32, 'Dword'], [16, 'Word'], [8, 'Byte']], value: bits, onChange: (v) => setBits(Number(v)) });
        pad.appendChild(h('div.calc-radios', null, h('div.calc-box', null, bases), h('div.calc-box', null, words)));
        PROG_KEYS.forEach((row, r) => {
          row.forEach((d) => pad.appendChild(keyEl([d[0], d[1], d[2] || '', d[3] || 'sci'])));
          std.slice(r * 5, r * 5 + 5).forEach((k) => pad.appendChild(k));
        });
        buildBits();
        updateProgKeys();
      }
      function updateProgKeys() {
        pad.querySelectorAll('.calc-key').forEach((b) => {
          const { act, arg } = b.dataset;
          if (act === 'digit') b.disabled = parseInt(arg, 16) >= base;
          else if (act === 'dot' || act === 'pct' || (act === 'un' && (arg === 'sqrt' || arg === 'recip'))) b.disabled = true;
        });
        // The two radio groups share values (16 and 8), so set each group on its own.
        const groups = pad.querySelectorAll('.calc-radios .ae-radio-group');
        if (groups[0]) groups[0].querySelectorAll('input').forEach((i) => { i.checked = Number(i.value) === base; });
        if (groups[1]) groups[1].querySelectorAll('input').forEach((i) => { i.checked = Number(i.value) === bits; });
      }
      // 64 clickable bits in two rows, grouped in fours, like the classic programmer view.
      let bitCells = [];
      function buildBits() {
        bitsEl.innerHTML = '';
        bitCells = [];
        [[63, 47, 32], [31, 15, 0]].forEach(([hi, mid, lo]) => {
          const row = h('div.calc-bitrow');
          for (let g = 0; g < 8; g++) {
            const grp = h('span.calc-nib');
            for (let k = 0; k < 4; k++) {
              const idx = hi - (g * 4 + k);
              const cell = h('span.calc-bit', { dataset: { i: idx } }, '0');
              cell.addEventListener('mousedown', (e) => e.preventDefault());
              cell.addEventListener('click', () => toggleBit(idx));
              bitCells[idx] = cell;
              grp.appendChild(cell);
            }
            row.appendChild(grp);
          }
          bitsEl.append(row, h('div.calc-bitlabels', null, h('span', null, String(hi)), h('span', null, String(mid)), h('span', null, String(lo))));
        });
      }
      function renderBits() {
        if (!bitCells.length) return;
        let v = 0n;
        if (!errorMsg) { try { v = curValue(); } catch (e) { v = 0n; } }
        const u = BigInt.asUintN(bits, v);
        for (let i = 0; i < 64; i++) {
          const cell = bitCells[i];
          const on = i < bits && ((u >> BigInt(i)) & 1n) === 1n;
          cell.textContent = on ? '1' : '0';
          cell.classList.toggle('on', on);
          cell.classList.toggle('off', i >= bits);
        }
      }
      function toggleBit(i) {
        if (i >= bits) return;
        if (errorMsg) clearAll(true);
        const v = curValue();
        if (phase === 'afterEq') eng.reset();
        setValue(BigInt.asIntN(bits, v ^ (1n << BigInt(i))), null);
        A.sound.play('click');
        show();
      }
      function setBase(b) {
        if (b === base || !isProg()) return;
        let v = null;
        if (!errorMsg) { try { v = curValue(); } catch (e) { v = null; } }
        base = b;
        if (v != null && phase === 'entry') setValue(v, null);
        updateProgKeys();
        A.sound.play('click');
        show();
      }
      function setBits(n) {
        if (n === bits || !isProg()) return;
        let v = null;
        if (!errorMsg) { try { v = curValue(); } catch (e) { v = null; } }
        bits = n;
        if (v != null) { const keep = phase; setValue(BigInt.asIntN(bits, v), null); if (keep === 'afterEq') phase = 'afterEq'; }
        updateProgKeys();
        A.sound.play('click');
        show();
      }
      function setAngle(a) {
        if (!(a in ANG)) return;
        angle = a;
        A.store.set('calc.angle', a);
        pad.querySelectorAll('.calc-angles input').forEach((i) => { i.checked = i.value === a; });
        show();
      }
      function toggleInv() {
        inv = !inv;
        pad.querySelectorAll('.calc-key[data-inv-label]').forEach((b) => { b.firstChild.textContent = inv ? b.dataset.invLabel : b.dataset.label; });
        pad.querySelectorAll('.calc-key[data-act="inv"]').forEach((b) => b.classList.toggle('calc-k-on', inv));
        show();
      }
      function setMode(m) {
        if (m === mode || !MODES.includes(m)) return;
        let carry = null;
        if (!errorMsg) { try { carry = curValue(); } catch (e) { carry = null; } }
        const wasProg = isProg();
        mode = m;
        A.store.set('calc.mode', m);
        eng = isProg() ? progEng : decEng;
        eng.reset();
        errorMsg = null; lastEq = null; fe = false;
        if (carry != null && (typeof carry === 'bigint' ? carry !== 0n : carry.c !== 0n)) {
          if (isProg() && !wasProg) carry = toProg(carry);
          else if (!isProg() && wasProg) carry = toDec(carry);
          setValue(carry, null);
        } else { cur = { typed: '0' }; phase = 'entry'; }
        buildPad();
        show();
        renderHistory();
        fitWindow(true);
        A.sound.play('navigate');
      }

      // ------------------------------------------------------------ window size follows the layout
      let fitRaf = null;
      function fitWindow(animate, done, minusPanel) {
        if (win.closed || win.state !== 'normal') { if (done) done(); return; }
        const chromeW = win.el.offsetWidth - win.body.clientWidth;
        const chromeH = win.el.offsetHeight - win.body.clientHeight;
        let w = root.offsetWidth + chromeW;
        const hh = menubar.offsetHeight + root.offsetHeight + chromeH;
        if (minusPanel) w -= panelWrap.offsetWidth;
        const W = A.wm.layer ? A.wm.layer.clientWidth : window.innerWidth;
        const H = A.wm.layer ? A.wm.layer.clientHeight : window.innerHeight;
        const from = { x: win.rect.x, y: win.rect.y, w: win.el.offsetWidth, h: win.el.offsetHeight };
        let tx = from.x, ty = from.y;
        if (tx + w > W - 4) tx = Math.max(4, W - w - 4);
        if (ty + hh > H - 4) ty = Math.max(0, H - hh - 4);
        cancelAnimationFrame(fitRaf);
        if (!animate || (Math.abs(from.w - w) < 2 && Math.abs(from.h - hh) < 2)) {
          win.moveTo(tx, ty);
          win.resizeTo(w, hh);
          if (done) done();
          return;
        }
        const t0 = performance.now(), dur = 220;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          win.moveTo(from.x + (tx - from.x) * e, from.y + (ty - from.y) * e);
          win.resizeTo(from.w + (w - from.w) * e, from.h + (hh - from.h) * e);
          if (k < 1) fitRaf = requestAnimationFrame(step);
          else { fitRaf = null; if (done) done(); }
        };
        fitRaf = requestAnimationFrame(step);
      }

      // ------------------------------------------------------------ slide-out panels
      function setPanel(p) {
        if (p === panel) return;
        const wasOpen = panel !== 'none';
        panel = p;
        A.store.set('calc.panel', p);
        if (p === 'none') {
          A.sound.play('whooshOut');
          fitWindow(true, () => { panelWrap.classList.remove('open'); panelEl.innerHTML = ''; fitWindow(false); }, true);
          return;
        }
        buildPanel();
        panelWrap.classList.add('open');
        panelEl.classList.remove('calc-panel-in');
        void panelEl.offsetWidth;
        panelEl.classList.add('calc-panel-in');
        if (!wasOpen) A.sound.play('whooshIn');
        fitWindow(true);
      }
      function buildPanel() {
        panelEl.innerHTML = '';
        if (panel === 'unit') buildUnitPanel();
        else if (panel === 'date') buildDatePanel();
      }
      const refocus = () => setTimeout(() => { if (!win.closed) win.el.focus({ preventScroll: true }); }, 0);
      const field = (label, control) => h('label.calc-field', null, h('span.calc-field-label', null, label), control);

      let unitCat = UNITS[A.store.get('calc.unitCat')] ? A.store.get('calc.unitCat') : 'Length';
      let [unitFrom, unitTo] = UNIT_DEFAULTS[unitCat];
      let uFrom = null, uTo = null, uResult = null;
      function buildUnitPanel() {
        const opts = UNITS[unitCat].map((u, i) => [i, u[0]]);
        const catSel = A.ui.select({ options: Object.keys(UNITS), value: unitCat, label: 'Type of unit', onChange: (v) => { unitCat = v; [unitFrom, unitTo] = UNIT_DEFAULTS[v]; A.store.set('calc.unitCat', v); buildPanel(); refocus(); } });
        const fromSel = A.ui.select({ options: opts, value: unitFrom, label: 'From unit', onChange: (v) => { unitFrom = Number(v); updateUnit(); refocus(); } });
        const toSel = A.ui.select({ options: opts, value: unitTo, label: 'To unit', onChange: (v) => { unitTo = Number(v); updateUnit(); refocus(); } });
        uFrom = h('div.calc-u-val');
        uTo = h('button.calc-u-val.calc-u-to', { type: 'button', 'data-tip': 'Type a number on the keypad, then click the answer to use it.' });
        uTo.addEventListener('mousedown', (e) => e.preventDefault());
        uTo.addEventListener('click', () => { if (uResult) { if (errorMsg || phase === 'afterEq') clearAll(true); setValue(isProg() ? toProg(uResult) : uResult, null); A.sound.play('click'); show(); } });
        const swap = h('button.calc-u-swap', { type: 'button', 'aria-label': 'Swap units', 'data-tip': 'Swap units' }, h('span', null, '⇅'));
        swap.addEventListener('mousedown', (e) => e.preventDefault());
        swap.addEventListener('click', () => { [unitFrom, unitTo] = [unitTo, unitFrom]; A.sound.play('click'); buildPanel(); });
        panelEl.append(
          h('div.calc-panel-title', null, 'Unit conversion'),
          field('Select the type of unit you want to convert', catSel),
          h('div.calc-u-box', null, h('div.calc-u-label', null, 'From'), uFrom, fromSel),
          h('div.calc-u-swaprow', null, swap),
          h('div.calc-u-box', null, h('div.calc-u-label', null, 'To'), uTo, toSel));
        updateUnit();
      }
      function updateUnit() {
        if (panel !== 'unit' || !uFrom) return;
        let v = ZERO;
        if (!errorMsg) { try { v = toDec(curValue()); } catch (e) { v = ZERO; } }
        uFrom.textContent = dFormat(v, 16, grouping, false);
        try {
          uResult = convertUnit(unitCat, v, unitFrom, unitTo);
          uTo.textContent = dFormat(uResult, 15, grouping, false);
        } catch (err) { uResult = null; uTo.textContent = err instanceof CalcError ? err.message : 'Invalid input'; }
      }

      let dateMode = 'diff';
      function buildDatePanel() {
        const modeSel = A.ui.select({
          options: [['diff', 'Difference between two dates'], ['add', 'Add or subtract days']],
          value: dateMode, label: 'Date calculation', onChange: (v) => { dateMode = v; buildPanel(); fitWindow(true); },
        });
        const today = isoDate(new Date());
        const dateInput = () => h('input.ae-input.calc-d-input', { type: 'date', value: today, min: '1601-01-01', max: '9999-12-31' });
        const result = h('div.calc-d-result', { role: 'status' });
        let calc;
        panelEl.append(h('div.calc-panel-title', null, 'Date calculation'), field('Select the date calculation you want', modeSel));
        if (dateMode === 'diff') {
          const from = dateInput(), to = dateInput();
          calc = () => {
            const a = parseDate(from.value), b = parseDate(to.value);
            result.innerHTML = '';
            if (!a || !b) { result.appendChild(h('div.calc-d-sub', null, 'Pick two dates.')); return; }
            const d = dateDiff(a, b);
            const parts = [];
            if (d.y) parts.push(d.y + (d.y === 1 ? ' year' : ' years'));
            if (d.m) parts.push(d.m + (d.m === 1 ? ' month' : ' months'));
            if (d.w) parts.push(d.w + (d.w === 1 ? ' week' : ' weeks'));
            if (d.d) parts.push(d.d + (d.d === 1 ? ' day' : ' days'));
            result.append(
              h('div.calc-d-label', null, 'Difference'),
              h('div.calc-d-big', null, d.days ? parts.join(', ') : 'Same dates'),
              h('div.calc-d-sub', null, '(' + d.days.toLocaleString('en-US') + (d.days === 1 ? ' day)' : ' days)')));
            // Counting the sleeps until something good, the way kids do.
            if (from.value === today && dayNum(b) > dayNum(a)) result.appendChild(h('div.calc-d-fun', null, d.days === 1 ? 'Just one more sleep!' : d.days.toLocaleString('en-US') + ' more sleeps.'));
          };
          [from, to].forEach((i) => i.addEventListener('input', calc));
          panelEl.append(field('From', from), field('To', to));
        } else {
          const from = dateInput();
          const how = A.ui.radioGroup({ options: [['add', 'Add'], ['sub', 'Subtract']], value: 'add', onChange: () => calc() });
          how.classList.add('calc-d-how');
          const num = () => h('input.ae-input.calc-d-num', { type: 'number', min: 0, max: 9999, value: 0 });
          const yy = num(), mm = num(), dd = num();
          dd.value = 30;
          calc = () => {
            const a = parseDate(from.value);
            result.innerHTML = '';
            if (!a) { result.appendChild(h('div.calc-d-sub', null, 'Pick a date.')); return; }
            const s = how.value === 'sub' ? -1 : 1;
            const n = (i) => Math.max(0, Math.min(9999, parseInt(i.value, 10) || 0));
            const out = addToDate(a, s * n(yy), s * n(mm), s * n(dd));
            if (out.getFullYear() < 1601 || out.getFullYear() > 9999) { result.appendChild(h('div.calc-d-sub', null, 'That date is out of range.')); return; }
            result.append(h('div.calc-d-label', null, 'Date'), h('div.calc-d-big', null, A.util.fmtLongDate(out)));
          };
          [from, yy, mm, dd].forEach((i) => i.addEventListener('input', calc));
          panelEl.append(field('From', from), how,
            h('div.calc-d-nums', null, field('Year(s)', yy), field('Month(s)', mm), field('Day(s)', dd)));
        }
        panelEl.append(h('div.calc-d-actions', null, A.ui.button('Calculate', { tone: 'aqua', size: 'sm', onClick: () => { calc(); A.sound.play('click'); } })), result);
        calc();
      }

      // ------------------------------------------------------------ key dispatch
      function press(act, arg, btn, quiet) {
        if (flipped) setFlip(false);
        if (btn && btn.disabled) return;
        if (!quiet) {
          A.sound.play('click');
          if (btn) { btn.classList.add('calc-key-press'); setTimeout(() => btn.classList.remove('calc-key-press'), 110); }
        }
        switch (act) {
          case 'digit': return digit(arg);
          case 'dot': return dot();
          case 'op': return operator(arg);
          case 'eq': return equals();
          case 'ce': return clearEntry();
          case 'clear': return clearAll();
          case 'back': return backspace();
          case 'neg': return negate();
          case 'un': return unary(inv && btn && btn.dataset.invArg ? btn.dataset.invArg : arg);
          case 'pct': return percent();
          case 'mem': return memory(arg);
          case 'lp': return openParen();
          case 'rp': return closeParen();
          case 'pi': return constant(inv ? dMul(PI, TWO) : PI);
          case 'rand': return constant(dNum(Math.random()));
          case 'fe': fe = !fe; return show();
          case 'exp': return expKey();
          case 'inv': return toggleInv();
          case 'rol': case 'ror': case 'not': return unary(act);
        }
      }
      const keyFor = (act, arg) => pad.querySelector('.calc-key[data-act="' + act + '"][data-arg="' + (arg || '') + '"]');
      const hit = (act, arg, quiet) => press(act, arg || '', keyFor(act, arg), quiet);

      function onKey(e) {
        if (A.util.isTyping(e)) return; // inputs in the side panels
        const k = e.key, ctrl = e.ctrlKey || e.metaKey;
        let handled = true;
        if (e.altKey && !ctrl) {
          if (k === '1') setMode('standard');
          else if (k === '2') setMode('scientific');
          else if (k === '3') setMode('programmer');
          else handled = false;
        } else if (ctrl) {
          const l = k.toLowerCase();
          if (l === 'c') { const sel = window.getSelection(); if (sel && !sel.isCollapsed) handled = false; else copyValue(); }
          else if (l === 'v') handled = false; // the paste event below does the work
          else if (l === 'h') toggleHistory();
          else if (l === 'u') setPanel(panel === 'unit' ? 'none' : 'unit');
          else if (l === 'e') setPanel(panel === 'date' ? 'none' : 'date');
          else if (k === 'F4') setPanel('none');
          else if (l === 'm') hit('mem', 'MS');
          else if (l === 'r') hit('mem', 'MR');
          else if (l === 'l') hit('mem', 'MC');
          else if (l === 'p') hit('mem', 'M+');
          else if (l === 'q') hit('mem', 'M-');
          else if (l === 'd' && e.shiftKey) clearHistory();
          else handled = false;
        } else handled = plainKey(k);
        if (handled) { e.preventDefault(); e.stopPropagation(); }
      }
      function plainKey(k) {
        if (isProg()) {
          const u = k.length === 1 ? k.toUpperCase() : k;
          if (/^[0-9A-F]$/.test(u)) { hit('digit', u); return true; }
          const map = { '&': ['op', 'and'], '|': ['op', 'or'], '^': ['op', 'xor'], '~': ['not'], '<': ['op', 'lsh'], '>': ['op', 'rsh'], '%': ['op', 'mod'], '(': ['lp'], ')': ['rp'] };
          if (map[k]) { hit(map[k][0], map[k][1]); return true; }
          const fk = { F5: () => setBase(16), F6: () => setBase(10), F7: () => setBase(8), F8: () => setBase(2), F12: () => setBits(64), F2: () => setBits(32), F3: () => setBits(16), F4: () => setBits(8) };
          if (fk[k]) { fk[k](); return true; }
        } else if (/^[0-9]$/.test(k)) { hit('digit', k); return true; }
        const common = {
          '.': ['dot'], ',': ['dot'], '+': ['op', '+'], '-': ['op', '-'], '*': ['op', '*'], '/': ['op', '/'],
          Enter: ['eq'], '=': ['eq'], Backspace: ['back'], Escape: ['clear'], Delete: ['ce'], F9: ['neg'], '%': ['pct'], '@': ['un', 'sqrt'], r: ['un', 'recip'], R: ['un', 'recip'],
        };
        if (common[k]) { hit(common[k][0], common[k][1]); return true; }
        if (mode === 'scientific') {
          const sci = {
            '(': ['lp'], ')': ['rp'], '^': ['op', 'pow'], y: ['op', 'pow'], s: ['un', 'sin'], o: ['un', 'cos'], t: ['un', 'tan'], n: ['un', 'ln'], l: ['un', 'log'],
            '!': ['un', 'fact'], q: ['un', 'sqr'], '#': ['un', 'cube'], p: ['pi'], i: ['inv'], x: ['exp'], d: ['un', 'dms'], v: ['fe'],
          };
          if (sci[k]) { hit(sci[k][0], sci[k][1]); return true; }
          const ang = { F3: 'deg', F4: 'rad', F5: 'grad' };
          if (ang[k]) { setAngle(ang[k]); return true; }
        }
        return false;
      }
      win.el.addEventListener('keydown', onKey);

      // ------------------------------------------------------------ copy and paste
      function displayPlain() {
        if (errorMsg) return '';
        if (phase === 'entry') return cur.typed.replace(/e[+-]?$/, '');
        return N.plain(cur.v);
      }
      // Copy through a one-time copy event, which works offline without permissions.
      function writeClipboard(text) {
        let done = false;
        const onCopy = (e) => { e.clipboardData.setData('text/plain', text); e.preventDefault(); done = true; };
        document.addEventListener('copy', onCopy, true);
        try { document.execCommand('copy'); } catch (err) { /* ignore */ }
        document.removeEventListener('copy', onCopy, true);
        if (!done && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
      }
      function copyValue() {
        writeClipboard(displayPlain());
        lcd.classList.remove('calc-copied');
        void lcd.offsetWidth;
        lcd.classList.add('calc-copied');
      }
      function pasteFromMenu() {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(pasteText).catch(() => A.ui.messageBox({ parent: win, title: 'Calculator', icon: 'info', message: 'To paste a number, press Ctrl+V.' }));
        } else A.ui.messageBox({ parent: win, title: 'Calculator', icon: 'info', message: 'To paste a number, press Ctrl+V.' });
      }
      win.el.addEventListener('paste', (e) => {
        if (A.util.isTyping(e)) return;
        e.preventDefault();
        pasteText((e.clipboardData && e.clipboardData.getData('text')) || '');
      });
      function pasteText(t) {
        t = String(t || '').trim().slice(0, 400);
        if (!t) return;
        const compact = t.replace(/[\s,]/g, '');
        if (isProg()) {
          const clean = compact.replace(/^0[xob]/i, '').toUpperCase();
          const ok = base === 16 ? /^-?[0-9A-F]+$/ : base === 8 ? /^-?[0-7]+$/ : base === 2 ? /^-?[01]+$/ : /^-?\d+$/;
          if (ok.test(clean)) {
            if (errorMsg || phase === 'afterEq') clearAll(true);
            try { setValue(parseProg(clean), null); show(); } catch (err) { oops(err); }
            return;
          }
        } else if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(compact)) {
          if (errorMsg || phase === 'afterEq') clearAll(true);
          try { setValue(dParse(compact), null); show(); } catch (err) { oops(err); }
          return;
        }
        // Anything else is typed in key by key, like the classic calculator did.
        const keys = { '+': ['op', '+'], '-': ['op', '-'], '−': ['op', '-'], '*': ['op', '*'], '×': ['op', '*'], x: ['op', '*'], '/': ['op', '/'], '÷': ['op', '/'],
          '(': ['lp'], ')': ['rp'], '=': ['eq'], '\n': ['eq'], '%': ['pct'], '.': ['dot'], '^': ['op', 'pow'] };
        for (const ch of t) {
          if (/[0-9]/.test(ch) || (isProg() && /[a-f]/i.test(ch))) hit('digit', ch.toUpperCase(), true);
          else if (keys[ch]) hit(keys[ch][0], keys[ch][1], true);
          if (errorMsg) break;
        }
      }

      // ------------------------------------------------------------ extras
      // Double-click the display to read it upside down (0.7734 says hello).
      function setFlip(on) {
        flipped = on;
        numEl.classList.toggle('calc-flip', on);
      }
      numEl.addEventListener('dblclick', () => { setFlip(!flipped); A.sound.play(flipped ? 'whooshIn' : 'whooshOut'); });
      function help() {
        A.ui.messageBox({
          parent: win, title: 'Calculator Help', icon: 'icons/calculator', instruction: 'Getting around the Calculator',
          message: 'Switch between Standard, Scientific and Programmer from the View menu. Unit conversion and Date calculation slide out beside the keypad.\n\n' +
            'Keyboard: type digits and + - * /, then Enter for equals. Esc clears, Delete clears the entry, Backspace erases a digit, % is percent and F9 changes the sign. ' +
            'Ctrl+M saves a number in memory and Ctrl+R brings it back. Ctrl+C and Ctrl+V copy and paste.',
        });
      }
      function about() {
        A.ui.messageBox({
          parent: win, title: 'About Calculator', icon: 'icons/calculator', instruction: 'Aerium Calculator',
          message: 'Version 7.0 (Build 2007)\n\nExact to 32 digits, and it never needs new batteries.\n\nTip: type 0.7734, then double-click the display and read it upside down.',
          sound: false,
        });
      }

      // ------------------------------------------------------------ start
      buildPad();
      if (panel !== 'none') { buildPanel(); panelWrap.classList.add('open'); }
      show();
      renderHistory();
      fitWindow(false);
      setTimeout(() => { if (!win.closed) { fitWindow(false); win.el.focus({ preventScroll: true }); } }, 60);

      return {
        onClose() { cancelAnimationFrame(fitRaf); },
      };
    },
  });
})();
