/* Calculator: Standard, Scientific, Programmer, Unit conversion and Date
   calculation, with memory keys, a history panel and full keyboard input.
   The window resizes itself as you switch modes from the View menu. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  // ---------------------------------------------------------------- math helpers
  // Trim binary floating point noise (0.1 + 0.2) without losing real precision.
  function clean(n) {
    if (!isFinite(n)) return n;
    if (n === 0) return 0;
    const r = parseFloat(n.toPrecision(14));
    return Object.is(r, -0) ? 0 : r;
  }
  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) {
      if (n < 0 && n === Math.floor(n)) return NaN;
      return gamma(n + 1);
    }
    if (n > 170) return Infinity;
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }
  // Lanczos approximation, so x! works for non-integers in Scientific mode.
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

  // Shunting-yard expression evaluator for Scientific mode (real precedence).
  const FUNCS = {
    sin: (x, m) => Math.sin(toRad(x, m)), cos: (x, m) => Math.cos(toRad(x, m)), tan: (x, m) => Math.tan(toRad(x, m)),
    asin: (x, m) => fromRad(Math.asin(x), m), acos: (x, m) => fromRad(Math.acos(x), m), atan: (x, m) => fromRad(Math.atan(x), m),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  };
  const toRad = (x, m) => (m === 'deg' ? (x * Math.PI) / 180 : m === 'grad' ? (x * Math.PI) / 200 : x);
  const fromRad = (x, m) => (m === 'deg' ? (x * 180) / Math.PI : m === 'grad' ? (x * 200) / Math.PI : x);
  const OPS = { '+': [2, 'l'], '-': [2, 'l'], '*': [3, 'l'], '/': [3, 'l'], mod: [3, 'l'], '^': [4, 'r'] };

  function tokenize(s) {
    const out = [];
    const re = /\s*(?:(\d*\.?\d+(?:e[+-]?\d+)?)|(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|ln|log|exp|sqrt|cbrt|abs)|(pi|e)|(mod)|([-+*/^%!()]))/giy;
    let m, last = null;
    while ((m = re.exec(s))) {
      if (m[1]) out.push({ t: 'num', v: parseFloat(m[1]) });
      else if (m[2]) out.push({ t: 'fn', v: m[2].toLowerCase() });
      else if (m[3]) out.push({ t: 'num', v: m[3].toLowerCase() === 'pi' ? Math.PI : Math.E });
      else if (m[4]) out.push({ t: 'op', v: 'mod' });
      else if (m[5]) {
        const c = m[5];
        if (c === '-' && (!last || (last.t === 'op') || (last.t === 'paren' && last.v === '(') || last.t === 'fn')) out.push({ t: 'neg' });
        else if (c === '+' && (!last || last.t === 'op' || (last.t === 'paren' && last.v === '('))) { /* unary plus: skip */ }
        else if (c === '(' || c === ')') out.push({ t: 'paren', v: c });
        else if (c === '!') out.push({ t: 'fact' });
        else if (c === '%') out.push({ t: 'pct' });
        else out.push({ t: 'op', v: c });
      }
      last = out[out.length - 1];
      if (re.lastIndex >= s.length) break;
    }
    return out;
  }
  function evaluate(expr, angleMode) {
    const toks = tokenize(expr);
    const output = [], stack = [];
    const prec = (o) => OPS[o][0];
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (tk.t === 'num') output.push(tk);
      else if (tk.t === 'fn') stack.push(tk);
      else if (tk.t === 'neg') stack.push(tk);
      else if (tk.t === 'fact') output.push(tk);
      else if (tk.t === 'pct') output.push(tk);
      else if (tk.t === 'op') {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.t === 'fn' || top.t === 'neg' || (top.t === 'op' && (prec(top.v) > prec(tk.v) || (prec(top.v) === prec(tk.v) && OPS[tk.v][1] === 'l')))) output.push(stack.pop());
          else break;
        }
        stack.push(tk);
      } else if (tk.t === 'paren' && tk.v === '(') stack.push(tk);
      else if (tk.t === 'paren' && tk.v === ')') {
        while (stack.length && !(stack[stack.length - 1].t === 'paren')) output.push(stack.pop());
        if (!stack.length) throw new Error('Mismatched parentheses');
        stack.pop();
        if (stack.length && stack[stack.length - 1].t === 'fn') output.push(stack.pop());
      }
    }
    while (stack.length) { const s = stack.pop(); if (s.t === 'paren') throw new Error('Mismatched parentheses'); output.push(s); }
    const st = [];
    for (const tk of output) {
      if (tk.t === 'num') st.push(tk.v);
      else if (tk.t === 'neg') st.push(-st.pop());
      else if (tk.t === 'fact') st.push(factorial(st.pop()));
      else if (tk.t === 'pct') st.push(st.pop() / 100);
      else if (tk.t === 'fn') st.push(FUNCS[tk.v](st.pop(), angleMode));
      else if (tk.t === 'op') {
        const b = st.pop(), a = st.pop();
        st.push(tk.v === '+' ? a + b : tk.v === '-' ? a - b : tk.v === '*' ? a * b : tk.v === '/' ? a / b : tk.v === 'mod' ? a % b : Math.pow(a, b));
      }
    }
    if (st.length !== 1) throw new Error('Invalid input');
    return st[0];
  }

  // ---------------------------------------------------------------- display formatting
  function group(intPart) {
    const neg = intPart.startsWith('-');
    if (neg) intPart = intPart.slice(1);
    return (neg ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmt(n) {
    if (n === 'error') return 'Cannot divide by zero';
    if (typeof n === 'string') return n;
    if (Number.isNaN(n)) return 'Invalid input';
    if (!isFinite(n)) return 'Overflow';
    n = clean(n);
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e16 || abs < 1e-9)) return n.toExponential(9).replace(/\.?0+e/, 'e');
    let s = String(n);
    if (s.includes('e')) return s;
    const [i, dec] = s.split('.');
    return group(i) + (dec ? '.' + dec : '');
  }

  // ---------------------------------------------------------------- unit conversion tables
  // Everything converts through a base unit; temperature is handled specially.
  const CONVERT = {
    Length: { base: 'm', units: [['Millimeters', 0.001], ['Centimeters', 0.01], ['Meters', 1], ['Kilometers', 1000], ['Inches', 0.0254], ['Feet', 0.3048], ['Yards', 0.9144], ['Miles', 1609.344], ['Nautical miles', 1852]] },
    Weight: { units: [['Milligrams', 0.001], ['Grams', 1], ['Kilograms', 1000], ['Tonnes', 1e6], ['Ounces', 28.349523], ['Pounds', 453.59237], ['Stones', 6350.29318]] },
    Temperature: { special: true, units: [['Celsius', 'C'], ['Fahrenheit', 'F'], ['Kelvin', 'K']] },
    Volume: { units: [['Milliliters', 0.001], ['Liters', 1], ['Cubic meters', 1000], ['Teaspoons (US)', 0.00492892], ['Tablespoons (US)', 0.0147868], ['Cups (US)', 0.236588], ['Pints (US)', 0.473176], ['Quarts (US)', 0.946353], ['Gallons (US)', 3.78541]] },
    Area: { units: [['Square meters', 1], ['Square kilometers', 1e6], ['Square feet', 0.092903], ['Square yards', 0.836127], ['Acres', 4046.8564], ['Hectares', 10000]] },
    Speed: { units: [['Meters/second', 1], ['Kilometers/hour', 0.277778], ['Miles/hour', 0.44704], ['Knots', 0.514444], ['Feet/second', 0.3048]] },
    Time: { units: [['Milliseconds', 0.001], ['Seconds', 1], ['Minutes', 60], ['Hours', 3600], ['Days', 86400], ['Weeks', 604800], ['Years', 31557600]] },
  };
  function convertTemp(v, from, to) {
    let c = from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
    return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  }

  // ---------------------------------------------------------------- keypad definitions
  // op keys: aqua tone. equals: grass. function keys: water. digits: pearl.
  const T_DIGIT = 'pearl', T_OP = 'aqua', T_FN = 'water', T_EQ = 'grass', T_MEM = 'sun';
  const STD_KEYS = [
    ['MC', 'm', T_MEM], ['MR', 'm', T_MEM], ['MS', 'm', T_MEM], ['M+', 'm', T_MEM], ['M-', 'm', T_MEM],
    ['%', 'op', T_FN], ['CE', 'clear', T_FN], ['C', 'clear', T_FN], ['⌫', 'back', T_FN], ['1/x', 'fn', T_FN],
    ['√', 'fn', T_FN], ['7', 'd', T_DIGIT], ['8', 'd', T_DIGIT], ['9', 'd', T_DIGIT], ['÷', 'op', T_OP],
    ['x²', 'fn', T_FN], ['4', 'd', T_DIGIT], ['5', 'd', T_DIGIT], ['6', 'd', T_DIGIT], ['×', 'op', T_OP],
    ['±', 'fn', T_FN], ['1', 'd', T_DIGIT], ['2', 'd', T_DIGIT], ['3', 'd', T_DIGIT], ['−', 'op', T_OP],
    ['.', 'dot', T_DIGIT], ['0', 'd', T_DIGIT], ['=', 'eq', T_EQ, 'span2'], ['+', 'op', T_OP],
  ];

  A.apps.register({
    id: 'calculator',
    name: 'Calculator',
    icon: 'icons/calculator',
    color: '#3aa6f5',
    category: 'accessories',
    description: 'Performs arithmetic, conversions and date math.',
    keywords: ['math', 'calc', 'calculator', 'science', 'convert'],
    single: false,
    window: { width: 300, height: 470, minWidth: 300, minHeight: 430, resizable: false, maximizable: false },
    launch(win, args) {
      let mode = A.store.get('calc.mode', 'standard');
      let angle = A.store.get('calc.angle', 'deg');
      let historyOpen = A.store.get('calc.history', false);
      let digitGroup = A.store.get('calc.grouping', true);

      // Engine state (Standard / Scientific share this)
      let display = '0';       // the big number (raw, may hold 'error' style strings)
      let entry = '0';         // what the user is typing
      let acc = null;          // accumulator for immediate-execution (Standard)
      let pendingOp = null;    // '+', '-', '*', '/'
      let lastOp = null, lastOperand = null; // for repeated '='
      let fresh = true;        // next digit starts a new entry
      let exprLine = '';       // the small line above the number
      let mem = null;
      let sciExpr = '';        // Scientific expression being built
      let error = false;
      const history = [];

      // ------------------------------------------------------------ DOM
      const exprEl = h('div.calc-expr', { 'aria-hidden': 'true' });
      const memEl = h('div.calc-mem', null, 'M');
      const numEl = h('div.calc-num', { role: 'status', 'aria-live': 'polite' }, '0');
      const angleEl = h('div.calc-angle');
      const lcd = h('div.calc-lcd', null, h('div.calc-lcd-top', null, memEl, angleEl), exprEl, numEl);
      const keypad = h('div.calc-keys');
      const sidePanel = h('div.calc-side');
      const historyPanel = h('div.calc-history');
      const bodyRow = h('div.calc-row', null, sidePanel, h('div.calc-main', null, lcd, keypad), historyPanel);
      win.body.classList.add('calc');

      const menubar = A.ui.menubar([
        { label: 'View', items: () => [
          { label: 'Standard', checked: mode === 'standard', radio: true, onClick: () => setMode('standard') },
          { label: 'Scientific', checked: mode === 'scientific', radio: true, onClick: () => setMode('scientific') },
          { label: 'Programmer', checked: mode === 'programmer', radio: true, onClick: () => setMode('programmer') },
          { separator: true },
          { label: 'Unit conversion', checked: mode === 'converter', radio: true, onClick: () => setMode('converter') },
          { label: 'Date calculation', checked: mode === 'date', radio: true, onClick: () => setMode('date') },
          { separator: true },
          { label: 'History', checked: historyOpen, onClick: toggleHistory },
          { label: 'Digit grouping', checked: digitGroup, onClick: () => { digitGroup = !digitGroup; A.store.set('calc.grouping', digitGroup); refresh(); } },
        ] },
        { label: 'Edit', items: () => [
          { label: 'Copy', shortcut: 'Ctrl+C', onClick: copy },
          { label: 'Paste', shortcut: 'Ctrl+V', onClick: paste },
          { separator: true },
          { label: 'Clear history', disabled: !history.length, onClick: () => { history.length = 0; renderHistory(); } },
        ] },
        { label: 'Help', items: () => [
          { label: 'View Help', onClick: help },
          { separator: true },
          { label: 'About Calculator', onClick: about },
        ] },
      ]);
      win.body.append(menubar, bodyRow);

      // ------------------------------------------------------------ number output
      function showNumber(str) {
        let out = str;
        if (digitGroup && !error && /^-?\d/.test(str) && !str.includes('e')) {
          const [i, d] = str.split('.');
          out = group(i) + (d != null ? '.' + d : '');
        }
        numEl.textContent = out;
        // Shrink long numbers so they fit the LCD.
        numEl.classList.toggle('calc-num-sm', out.length > 12);
        numEl.classList.toggle('calc-num-xs', out.length > 18);
      }
      function refresh() {
        exprEl.textContent = mode === 'scientific' ? sciExpr : exprLine;
        showNumber(display);
        memEl.style.visibility = mem != null ? 'visible' : 'hidden';
        angleEl.textContent = mode === 'scientific' ? angle.toUpperCase() : '';
      }
      function setError(msg) { error = true; display = msg; entry = '0'; fresh = true; acc = null; pendingOp = null; sciExpr = ''; exprLine = ''; refresh(); }
      function clearError() { if (error) { error = false; display = '0'; entry = '0'; } }

      // ------------------------------------------------------------ Standard / immediate execution
      function inputDigit(d) {
        if (error) clearError();
        if (fresh) { entry = d === '.' ? '0.' : d; fresh = false; }
        else {
          if (d === '.' && entry.includes('.')) return;
          if (entry.replace(/[-.]/g, '').length >= 16) return;
          entry = entry === '0' && d !== '.' ? d : entry + d;
        }
        display = entry;
        refresh();
      }
      function applyPending() {
        const b = parseFloat(entry);
        if (pendingOp && acc != null) {
          acc = clean(compute(acc, b, pendingOp));
        } else acc = b;
        return acc;
      }
      function compute(a, b, op) {
        switch (op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? NaN : a / b;
        }
      }
      function setOp(op, sym) {
        if (error) clearError();
        if (pendingOp && !fresh) {
          const r = applyPending();
          if (Number.isNaN(r)) return setError('Cannot divide by zero');
          display = fmt(r); entry = String(clean(r));
        } else if (pendingOp && fresh) {
          // change the operator
        } else acc = parseFloat(entry);
        pendingOp = op;
        lastOp = null;
        exprLine = fmt(acc) + ' ' + sym;
        fresh = true;
        refresh();
      }
      function equals() {
        if (error) return;
        let a, b, op;
        if (pendingOp) { a = acc; b = parseFloat(entry); op = pendingOp; lastOp = op; lastOperand = b; }
        else if (lastOp) { a = parseFloat(entry); b = lastOperand; op = lastOp; }
        else { exprLine = ''; refresh(); return; }
        const r = compute(a, b, op);
        if (Number.isNaN(r) || !isFinite(r)) return setError('Cannot divide by zero');
        const clr = clean(r);
        pushHistory(fmt(a) + ' ' + opSym(op) + ' ' + fmt(b) + ' =', fmt(clr));
        acc = clr; display = fmt(clr); entry = String(clr); pendingOp = null; fresh = true; exprLine = ''; refresh();
      }
      const opSym = (o) => ({ '+': '+', '-': '−', '*': '×', '/': '÷' }[o] || o);
      function unary(kind) {
        if (error) clearError();
        let v = parseFloat(entry);
        let r, label;
        if (kind === '√') { if (v < 0) return setError('Invalid input'); r = Math.sqrt(v); label = '√(' + fmt(v) + ')'; }
        else if (kind === 'x²') { r = v * v; label = 'sqr(' + fmt(v) + ')'; }
        else if (kind === '1/x') { if (v === 0) return setError('Cannot divide by zero'); r = 1 / v; label = '1/(' + fmt(v) + ')'; }
        else if (kind === '±') { r = -v; }
        r = clean(r);
        entry = String(r); display = fmt(r); fresh = kind !== '±';
        if (kind !== '±' && label) exprLine = (pendingOp ? exprLine.split(/\s(?=[^\s]*$)/)[0] + ' ' : '') + label;
        refresh();
      }
      function percent() {
        if (error) clearError();
        let v = parseFloat(entry);
        let r;
        if (pendingOp && acc != null) r = (pendingOp === '+' || pendingOp === '-') ? acc * v / 100 : v / 100;
        else r = v / 100;
        r = clean(r); entry = String(r); display = fmt(r); fresh = false; refresh();
      }
      function backspace() {
        if (error) { clearError(); refresh(); return; }
        if (fresh) return;
        entry = entry.length <= 1 || (entry.length === 2 && entry.startsWith('-')) ? '0' : entry.slice(0, -1);
        if (entry === '-' || entry === '') entry = '0';
        if (entry === '0') fresh = true;
        display = entry; refresh();
      }
      function clearEntry() { if (error) clearError(); entry = '0'; display = '0'; fresh = true; refresh(); }
      function clearAll() { clearError(); entry = '0'; display = '0'; acc = null; pendingOp = null; lastOp = null; exprLine = ''; sciExpr = ''; fresh = true; refresh(); }

      // ------------------------------------------------------------ memory
      function memory(kind) {
        const v = parseFloat(entry);
        if (kind === 'MC') mem = null;
        else if (kind === 'MR') { if (mem != null) { entry = String(mem); display = fmt(mem); fresh = true; } }
        else if (kind === 'MS') mem = v;
        else if (kind === 'M+') mem = clean((mem || 0) + v);
        else if (kind === 'M-') mem = clean((mem || 0) - v);
        A.sound.play('click');
        refresh();
      }

      // ------------------------------------------------------------ history
      function pushHistory(expr, result) {
        history.unshift({ expr, result });
        if (history.length > 60) history.pop();
        renderHistory();
      }
      function renderHistory() {
        historyPanel.innerHTML = '';
        historyPanel.append(h('div.calc-history-head', null, 'History', h('button.calc-hclear', { type: 'button', 'aria-label': 'Clear history', 'data-tip': 'Clear history', onclick: () => { history.length = 0; renderHistory(); } }, '✕')));
        const list = h('div.calc-history-list');
        if (!history.length) list.appendChild(h('div.calc-history-empty', null, "There's no history yet."));
        history.forEach((it) => {
          const row = h('button.calc-history-item', { type: 'button' }, h('span.calc-hx', null, it.expr), h('span.calc-hr', null, it.result));
          row.addEventListener('click', () => { clearError(); const n = parseFloat(String(it.result).replace(/,/g, '')); if (isFinite(n)) { entry = String(n); display = fmt(n); fresh = true; refresh(); A.sound.play('click'); } });
          list.appendChild(row);
        });
        historyPanel.appendChild(list);
      }
      function toggleHistory() { historyOpen = !historyOpen; A.store.set('calc.history', historyOpen); layout(); }

      // ------------------------------------------------------------ clipboard
      function copy() {
        const text = numEl.textContent.replace(/,/g, '');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
        A.sound.play('click');
      }
      function paste() {
        const use = (t) => { const n = parseFloat(String(t).replace(/[^0-9.eE+-]/g, '')); if (isFinite(n)) { clearError(); entry = String(n); display = fmt(n); fresh = true; refresh(); } };
        if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(use).catch(() => {});
      }

      // ------------------------------------------------------------ Scientific expression building
      function sciInput(token, kind) {
        if (error) { clearError(); sciExpr = ''; }
        if (kind === 'num') {
          if (fresh) { entry = token === '.' ? '0.' : token; fresh = false; }
          else if (token === '.' && /\.\d*$/.test(entry)) return;
          else entry = entry === '0' && token !== '.' ? token : entry + token;
          display = entry;
        } else if (kind === 'op') {
          sciExpr += (fresh && sciExpr && /[-+*/^]$/.test(sciExpr.trim()) ? '' : (numOrEmpty())) + ' ' + token + ' ';
          fresh = true; entry = '0';
        } else if (kind === 'fn') { sciExpr += numOrEmpty() + ' ' + token + '('; fresh = true; entry = '0'; }
        else if (kind === 'const') { sciExpr += token; fresh = true; }
        else if (kind === 'paren') { sciExpr += token; if (token === '(') { fresh = true; } }
        refresh();
      }
      function numOrEmpty() { const v = fresh ? '' : entry; if (v) { const t = v; entry = '0'; return t; } return ''; }
      function sciEquals() {
        let e = (sciExpr + (fresh ? '' : entry)).trim();
        if (!e) return;
        try {
          const r = clean(evaluate(e, angle));
          if (Number.isNaN(r)) return setError('Invalid input');
          if (!isFinite(r)) return setError('Overflow');
          pushHistory(e.replace(/\*/g, '×').replace(/\//g, '÷') + ' =', fmt(r));
          display = fmt(r); entry = String(r); sciExpr = ''; fresh = true; refresh();
        } catch (err) { setError('Invalid input'); }
      }

      // ------------------------------------------------------------ keypads
      function makeKey(label, act, tone, extra) {
        const b = h('button.calc-key', { type: 'button', class: ['fa-btn', 'fa-tone-' + tone, extra], dataset: { act, label } }, h('span', null, label));
        b.addEventListener('click', () => handleKey(label, act));
        return b;
      }
      function buildStandard() {
        keypad.className = 'calc-keys calc-keys-std';
        keypad.innerHTML = '';
        STD_KEYS.forEach(([label, act, tone, extra]) => keypad.appendChild(makeKey(label, act, tone, extra)));
      }
      function buildScientific() {
        keypad.className = 'calc-keys calc-keys-sci';
        keypad.innerHTML = '';
        const degBtn = h('button.calc-key.calc-key-toggle.fa-btn.fa-tone-pearl', { type: 'button' }, h('span', null, 'DEG'));
        const rows = [
          [[angleLabel(), 'angle', T_FN], ['Inv', 'inv', T_FN], ['x!', 'sfact', T_FN], ['(', 'lparen', T_FN], [')', 'rparen', T_FN], ['⌫', 'back', T_FN]],
          [['sin', 'sfn', T_FN], ['cos', 'sfn', T_FN], ['tan', 'sfn', T_FN], ['xʸ', 'spow', T_OP], ['CE', 'clear', T_FN], ['C', 'clear', T_FN]],
          [['ln', 'sfn', T_FN], ['log', 'sfn', T_FN], ['√', 'ssqrt', T_FN], ['x²', 'ssqr', T_OP], ['%', 'spct', T_FN], ['÷', 'op', T_OP]],
          [['π', 'const', T_FN], ['7', 'd', T_DIGIT], ['8', 'd', T_DIGIT], ['9', 'd', T_DIGIT], ['×', 'op', T_OP], ['1/x', 'sinv', T_FN]],
          [['e', 'const', T_FN], ['4', 'd', T_DIGIT], ['5', 'd', T_DIGIT], ['6', 'd', T_DIGIT], ['−', 'op', T_OP], ['MR', 'm', T_MEM]],
          [['±', 'sneg', T_FN], ['1', 'd', T_DIGIT], ['2', 'd', T_DIGIT], ['3', 'd', T_DIGIT], ['+', 'op', T_OP], ['MS', 'm', T_MEM]],
          [['.', 'dot', T_DIGIT], ['0', 'd', T_DIGIT], ['exp', 'sexp', T_FN], ['=', 'eq', T_EQ, 'span2'], ['M+', 'm', T_MEM]],
        ];
        rows.forEach((r) => r.forEach(([label, act, tone, extra]) => keypad.appendChild(makeKey(label, act, tone, extra))));
        void degBtn;
      }
      const angleLabel = () => angle.toUpperCase();
      let sciInv = false;

      function handleKey(label, act) {
        if (act !== 'm') A.sound.play('click');
        switch (act) {
          case 'd': mode === 'scientific' ? sciInput(label, 'num') : inputDigit(label); break;
          case 'dot': mode === 'scientific' ? sciInput('.', 'num') : inputDigit('.'); break;
          case 'op': {
            const map = { '÷': '/', '×': '*', '−': '-', '+': '+' };
            const o = map[label];
            if (mode === 'scientific') sciInput(o, 'op'); else setOp(o, label);
            break;
          }
          case 'eq': mode === 'scientific' ? sciEquals() : equals(); break;
          case 'clear': label === 'CE' ? clearEntry() : clearAll(); break;
          case 'back': backspace(); break;
          case 'fn': unary(label); break;
          case 'm': memory(label); break;
          // scientific
          case 'sfn': sciInput(sciInv ? invFn(label) : label, 'fn'); break;
          case 'ssqrt': sciInput('sqrt', 'fn'); break;
          case 'ssqr': sciInput('^', 'op'); sciInput('2', 'num'); fresh = true; break;
          case 'spow': sciInput('^', 'op'); break;
          case 'sinv': sciInput('1', 'num'); sciExpr = numOrEmptyWrap(); break;
          case 'sfact': sciInput('!', 'op'); break;
          case 'const': sciInput(label === 'π' ? 'pi' : label === 'e' ? 'e' : label, 'const'); break;
          case 'lparen': sciInput('(', 'paren'); break;
          case 'rparen': sciInput(')', 'paren'); break;
          case 'sneg': sciNeg(); break;
          case 'spct': sciInput('%', 'op'); break;
          case 'sexp': sciInput('e', 'const'); break;
          case 'angle': cycleAngle(); break;
          case 'inv': sciInv = !sciInv; keypad.querySelectorAll('.calc-key').forEach((k) => { if (k.dataset.act === 'inv') k.classList.toggle('calc-key-on', sciInv); }); break;
        }
      }
      function numOrEmptyWrap() { const v = fresh ? '' : entry; entry = '0'; fresh = true; return sciExpr + '1/' + (v || ''); }
      function invFn(l) { return { sin: 'asin', cos: 'acos', tan: 'atan', ln: 'exp', log: 'exp' }[l] || l; }
      function sciNeg() { if (!fresh) { entry = String(-parseFloat(entry)); display = entry; refresh(); } else { sciInput('-', 'op'); } }
      function cycleAngle() { angle = angle === 'deg' ? 'rad' : angle === 'rad' ? 'grad' : 'deg'; A.store.set('calc.angle', angle); const b = keypad.querySelector('[data-act="angle"] span'); if (b) b.textContent = angle.toUpperCase(); refresh(); }

      // ------------------------------------------------------------ Programmer mode
      let progBase = 10, progVal = 0n;
      function buildProgrammer() {
        keypad.className = 'calc-keys calc-keys-prog';
        keypad.innerHTML = '';
        const bases = h('div.calc-bases');
        [['HEX', 16], ['DEC', 10], ['OCT', 8], ['BIN', 2]].forEach(([name, b]) => {
          const val = h('span.calc-base-val');
          const row = h('button.calc-base', { type: 'button', class: b === progBase && 'active', dataset: { base: b } }, h('span.calc-base-name', null, name), val);
          row.addEventListener('click', () => { progBase = b; A.sound.play('click'); renderProg(); });
          bases.appendChild(row);
        });
        const bits = h('div.calc-bits');
        const grid = h('div.calc-prog-keys');
        const hexKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
        const layoutKeys = [
          ['A', 'B', '⌫', 'CE', 'C'],
          ['C', 'D', '«', '»', '÷'],
          ['E', 'F', '7', '8', '9'],
          ['×', 'AND', '4', '5', '6'],
          ['−', 'OR', '1', '2', '3'],
          ['+', 'XOR', 'NOT', '0', '='],
        ];
        layoutKeys.forEach((row) => row.forEach((k) => {
          const isHex = hexKeys.includes(k);
          const isDigit = /^[0-9]$/.test(k) || isHex;
          const tone = k === '=' ? T_EQ : /[+\-×÷]/.test(k) ? T_OP : isDigit ? T_DIGIT : T_FN;
          const b = h('button.calc-key.fa-btn', { type: 'button', class: 'fa-tone-' + tone, dataset: { pk: k } }, h('span', null, k));
          b.addEventListener('click', () => progKey(k));
          grid.appendChild(b);
        }));
        keypad.append(bases, bits, grid);
        renderProg();
      }
      let progOp = null, progAcc = null, progFresh = true;
      function progKey(k) {
        A.sound.play('click');
        if (error) { error = false; progVal = 0n; }
        if (/^[0-9A-F]$/.test(k)) {
          const digit = parseInt(k, 16);
          if (digit >= progBase) return;
          if (progFresh) { progVal = BigInt(digit); progFresh = false; }
          else progVal = clampBits(progVal * BigInt(progBase) + BigInt(digit));
        } else if (['+', '−', '×', '÷', 'AND', 'OR', 'XOR'].includes(k)) {
          if (progOp && !progFresh) progVal = progCompute(progAcc, progVal, progOp);
          progAcc = progVal; progOp = k; progFresh = true;
        } else if (k === '=') {
          if (progOp) { progVal = progCompute(progAcc, progVal, progOp); progOp = null; progFresh = true; }
        } else if (k === 'NOT') { progVal = clampBits(~progVal); progFresh = true; }
        else if (k === '«') { progVal = clampBits(progVal << 1n); progFresh = true; }
        else if (k === '»') { progVal = progVal >> 1n; progFresh = true; }
        else if (k === '⌫') { progVal = progVal / BigInt(progBase); progFresh = false; }
        else if (k === 'CE' || k === 'C') { progVal = 0n; if (k === 'C') { progOp = null; progAcc = null; } progFresh = true; }
        renderProg();
      }
      function progCompute(a, b, op) {
        try {
          switch (op) {
            case '+': return clampBits(a + b);
            case '−': return clampBits(a - b);
            case '×': return clampBits(a * b);
            case '÷': return b === 0n ? (setError('Cannot divide by zero'), 0n) : clampBits(a / b);
            case 'AND': return a & b; case 'OR': return a | b; case 'XOR': return a ^ b;
          }
        } catch (e) { return 0n; }
      }
      const MASK = (1n << 64n) - 1n;
      function clampBits(v) { v &= MASK; if (v >> 63n) v -= 1n << 64n; return v; }
      function renderProg() {
        const uns = progVal < 0n ? progVal + (1n << 64n) : progVal;
        keypad.querySelectorAll('.calc-base').forEach((row) => {
          const b = Number(row.dataset.base);
          row.classList.toggle('active', b === progBase);
          const val = row.querySelector('.calc-base-val');
          val.textContent = uns.toString(b).toUpperCase().replace(/\B(?=(.{4})+$)/g, ' ');
        });
        // Bit display: 64 toggleable bits, grouped in nibbles.
        const bits = keypad.querySelector('.calc-bits');
        bits.innerHTML = '';
        const s = uns.toString(2).padStart(64, '0');
        for (let i = 0; i < 64; i++) {
          const bit = s[i];
          const idx = 63 - i;
          const cell = h('button.calc-bit', { type: 'button', class: bit === '1' && 'on', 'aria-label': 'Bit ' + idx, title: 'Bit ' + idx }, bit);
          cell.addEventListener('click', () => { progVal = clampBits(progVal ^ (1n << BigInt(idx))); progFresh = true; A.sound.play('click'); renderProg(); });
          if (i % 4 === 0 && i) cell.classList.add('calc-bit-gap');
          bits.appendChild(cell);
        }
        // Big display shows the value in the current base.
        display = uns.toString(progBase).toUpperCase();
        numEl.textContent = display;
        numEl.classList.toggle('calc-num-sm', display.length > 12);
        numEl.classList.toggle('calc-num-xs', display.length > 18);
        exprEl.textContent = progOp ? progAcc + ' ' + progOp : '';
        // Enable only valid hex digit keys.
        keypad.querySelectorAll('[data-pk]').forEach((b) => {
          const k = b.dataset.pk;
          if (/^[0-9A-F]$/.test(k)) b.disabled = parseInt(k, 16) >= progBase;
        });
        memEl.style.visibility = 'hidden';
        angleEl.textContent = String(progBase === 16 ? 'HEX' : progBase === 8 ? 'OCT' : progBase === 2 ? 'BIN' : 'DEC');
      }

      // ------------------------------------------------------------ Unit converter
      function buildConverter() {
        keypad.className = 'calc-keys calc-keys-std';
        keypad.innerHTML = '';
        STD_KEYS.filter(([, act]) => act === 'd' || act === 'dot' || act === 'back' || act === 'clear').forEach(() => {});
        // Reuse the digit portion of the standard pad.
        const convKeys = [
          ['CE', 'clear', T_FN], ['C', 'clear', T_FN], ['⌫', 'back', T_FN],
          ['7', 'd', T_DIGIT], ['8', 'd', T_DIGIT], ['9', 'd', T_DIGIT],
          ['4', 'd', T_DIGIT], ['5', 'd', T_DIGIT], ['6', 'd', T_DIGIT],
          ['1', 'd', T_DIGIT], ['2', 'd', T_DIGIT], ['3', 'd', T_DIGIT],
          ['±', 'convneg', T_FN], ['0', 'd', T_DIGIT], ['.', 'dot', T_DIGIT],
        ];
        keypad.className = 'calc-keys calc-keys-conv';
        convKeys.forEach(([label, act, tone]) => keypad.appendChild(makeKey(label, act, tone)));
      }
      let convCat = A.store.get('calc.convCat', 'Length');
      let convFrom = 0, convTo = 1;
      function buildConvPanel() {
        sidePanel.innerHTML = '';
        const cat = CONVERT[convCat];
        const catSel = A.ui.select({ options: Object.keys(CONVERT), value: convCat, onChange: (v) => { convCat = v; A.store.set('calc.convCat', v); convFrom = 0; convTo = 1; buildConvPanel(); convert(); } });
        const fromVal = h('div.calc-conv-val', null, '0');
        const toVal = h('div.calc-conv-val calc-conv-to', null, '0');
        const fromSel = A.ui.select({ options: cat.units.map((u, i) => [i, u[0]]), value: convFrom, onChange: (v) => { convFrom = +v; convert(); } });
        const toSel = A.ui.select({ options: cat.units.map((u, i) => [i, u[0]]), value: convTo, onChange: (v) => { convTo = +v; convert(); } });
        const swap = h('button.calc-conv-swap.fa-orb.fa-tone-aqua.fa-focus', { type: 'button', 'aria-label': 'Swap units', 'data-tip': 'Swap units', onclick: () => { [convFrom, convTo] = [convTo, convFrom]; A.sound.play('click'); buildConvPanel(); convert(); } }, h('span', null, '⇅'));
        sidePanel.append(
          h('div.calc-side-title', null, 'Unit conversion'),
          h('label.calc-conv-field', null, h('span', null, 'Category'), catSel),
          h('div.calc-conv-block', null, h('div.calc-conv-label', null, 'From'), fromVal, fromSel),
          h('div.calc-conv-swaprow', null, swap),
          h('div.calc-conv-block', null, h('div.calc-conv-label', null, 'To'), toVal, toSel),
        );
        sidePanel._from = fromVal; sidePanel._to = toVal;
        convert();
      }
      function convert() {
        const v = parseFloat(entry) || 0;
        const cat = CONVERT[convCat];
        let r;
        if (cat.special) r = convertTemp(v, cat.units[convFrom][1], cat.units[convTo][1]);
        else r = v * cat.units[convFrom][1] / cat.units[convTo][1];
        if (sidePanel._from) sidePanel._from.textContent = fmt(v);
        if (sidePanel._to) sidePanel._to.textContent = fmt(clean(r));
        display = entry; showNumber(display);
      }

      // ------------------------------------------------------------ Date calculation
      let dateMode = 'diff';
      function buildDatePanel() {
        sidePanel.innerHTML = '';
        keypad.className = 'calc-keys calc-keys-date';
        keypad.innerHTML = '';
        const modeSel = A.ui.select({ options: [['diff', 'Difference between dates'], ['add', 'Add or subtract days']], value: dateMode, onChange: (v) => { dateMode = v; buildDatePanel(); } });
        const today = new Date();
        const iso = (d) => d.toISOString().slice(0, 10);
        const result = h('div.calc-date-result');
        if (dateMode === 'diff') {
          const from = h('input.ae-input.calc-date-input', { type: 'date', value: iso(today) });
          const to = h('input.ae-input.calc-date-input', { type: 'date', value: iso(new Date(today.getTime() + 30 * 86400000)) });
          const calc = () => {
            const a = new Date(from.value), b = new Date(to.value);
            if (isNaN(a) || isNaN(b)) { result.textContent = ''; return; }
            const days = Math.round((b - a) / 86400000);
            const abs = Math.abs(days);
            const y = Math.floor(abs / 365), rem = abs % 365, mo = Math.floor(rem / 30), dd = rem % 30;
            result.innerHTML = '';
            result.append(
              h('div.calc-date-big', null, abs + (abs === 1 ? ' day' : ' days')),
              h('div.calc-date-sub', null, (y ? y + 'y ' : '') + (mo ? mo + 'mo ' : '') + dd + 'd' + (days < 0 ? ' (earlier)' : '')),
              h('div.calc-date-sub', null, Math.round(abs / 7) + ' weeks'),
            );
          };
          from.addEventListener('change', calc); to.addEventListener('change', calc);
          sidePanel.append(h('div.calc-side-title', null, 'Date calculation'),
            h('label.calc-conv-field', null, h('span', null, 'Calculate'), modeSel),
            h('label.calc-conv-field', null, h('span', null, 'From'), from),
            h('label.calc-conv-field', null, h('span', null, 'To'), to), result);
          calc();
        } else {
          const base = h('input.ae-input.calc-date-input', { type: 'date', value: iso(today) });
          const opSel = A.ui.select({ options: [['add', 'Add'], ['sub', 'Subtract']], value: 'add' });
          const daysIn = h('input.ae-input.calc-date-input', { type: 'number', value: '30', min: '0' });
          const calc = () => {
            const a = new Date(base.value);
            if (isNaN(a)) { result.textContent = ''; return; }
            const n = parseInt(daysIn.value, 10) || 0;
            const out = new Date(a.getTime() + (opSel.value === 'add' ? 1 : -1) * n * 86400000);
            result.innerHTML = '';
            result.append(h('div.calc-date-big', null, A.util.fmtLongDate(out)));
          };
          [base, daysIn].forEach((e) => e.addEventListener('change', calc));
          opSel.addEventListener('change', calc);
          sidePanel.append(h('div.calc-side-title', null, 'Date calculation'),
            h('label.calc-conv-field', null, h('span', null, 'Calculate'), modeSel),
            h('label.calc-conv-field', null, h('span', null, 'Start date'), base),
            h('label.calc-conv-field', null, h('span', null, 'Operation'), opSel),
            h('label.calc-conv-field', null, h('span', null, 'Days'), daysIn), result);
          calc();
        }
        lcd.style.display = 'none';
      }

      // ------------------------------------------------------------ mode switching + layout
      const SIZES = {
        standard: [300, 470], scientific: [468, 490], programmer: [468, 540],
        converter: [560, 470], date: [520, 400],
      };
      function setMode(m) {
        if (m === mode && win.body.dataset.built) return;
        mode = m; A.store.set('calc.mode', m);
        A.sound.play('navigate');
        build();
        layout();
      }
      function build() {
        win.body.dataset.built = '1';
        win.body.dataset.mode = mode;
        clearAll();
        lcd.style.display = '';
        sidePanel.innerHTML = '';
        if (mode === 'standard') buildStandard();
        else if (mode === 'scientific') buildScientific();
        else if (mode === 'programmer') buildProgrammer();
        else if (mode === 'converter') { buildConverter(); buildConvPanel(); }
        else if (mode === 'date') buildDatePanel();
        refresh();
      }
      function layout() {
        const [w, hh] = SIZES[mode] || SIZES.standard;
        const extra = historyOpen && (mode === 'standard' || mode === 'scientific') ? 220 : 0;
        historyPanel.style.display = extra ? '' : 'none';
        sidePanel.style.display = (mode === 'converter' || mode === 'date') ? '' : 'none';
        win.body.classList.toggle('calc-has-history', !!extra);
        // menubar (22) + a little chrome
        win.resizeTo(w + extra, hh + 22);
        // keep it on screen
        const { W } = { W: A.wm.layer.clientWidth };
        if (win.rect.x + win.rect.w > W) win.moveTo(Math.max(4, W - win.rect.w - 8), win.rect.y);
        renderHistory();
      }

      // ------------------------------------------------------------ keyboard
      function onKey(e) {
        if (A.util.isTyping(e) && e.target.tagName !== 'BODY') {
          // date inputs / selects handle their own keys
          if (mode === 'date' || (mode === 'converter' && e.target.tagName === 'SELECT')) return;
        }
        const k = e.key;
        if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'c') { e.preventDefault(); copy(); return; }
        if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'v') { e.preventDefault(); paste(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (mode === 'programmer') { onKeyProg(e); return; }
        if (mode === 'date') return;
        if (/^[0-9]$/.test(k)) { e.preventDefault(); press(k, 'd'); }
        else if (k === '.') { e.preventDefault(); press('.', 'dot'); }
        else if (k === '+') { e.preventDefault(); press('+', 'op'); }
        else if (k === '-') { e.preventDefault(); press('−', 'op'); }
        else if (k === '*') { e.preventDefault(); press('×', 'op'); }
        else if (k === '/') { e.preventDefault(); press('÷', 'op'); }
        else if (k === 'Enter' || k === '=') { e.preventDefault(); press('=', 'eq'); }
        else if (k === 'Backspace') { e.preventDefault(); press('⌫', 'back'); }
        else if (k === 'Escape') { e.preventDefault(); press('C', 'clear'); }
        else if (k === 'Delete') { e.preventDefault(); press('CE', 'clear'); }
        else if (k === '%') { e.preventDefault(); mode === 'scientific' ? handleKey('%', 'spct') : (A.sound.play('click'), percent()); }
        else if (k === 'F9') { e.preventDefault(); mode === 'scientific' ? handleKey('±', 'sneg') : (A.sound.play('click'), unary('±')); }
        else if (k === '(' && mode === 'scientific') { e.preventDefault(); press('(', 'lparen'); }
        else if (k === ')' && mode === 'scientific') { e.preventDefault(); press(')', 'rparen'); }
        else if (k === '^' && mode === 'scientific') { e.preventDefault(); press('xʸ', 'spow'); }
        else return;
        if (mode === 'converter') convert();
      }
      function onKeyProg(e) {
        const k = e.key.toUpperCase();
        if (/^[0-9A-F]$/.test(k)) { e.preventDefault(); progKey(k); }
        else if (k === '+') { e.preventDefault(); progKey('+'); }
        else if (e.key === '-') { e.preventDefault(); progKey('−'); }
        else if (e.key === '*') { e.preventDefault(); progKey('×'); }
        else if (e.key === '/') { e.preventDefault(); progKey('÷'); }
        else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); progKey('='); }
        else if (e.key === 'Backspace') { e.preventDefault(); progKey('⌫'); }
        else if (e.key === 'Escape') { e.preventDefault(); progKey('C'); }
      }
      // Briefly light up the matching key so keyboard input feels physical.
      function press(label, act) {
        const btn = Array.from(keypad.querySelectorAll('.calc-key')).find((b) => b.dataset.label === label && b.dataset.act === act) ||
          Array.from(keypad.querySelectorAll('.calc-key')).find((b) => b.dataset.label === label);
        if (btn) { btn.classList.add('calc-key-press'); setTimeout(() => btn.classList.remove('calc-key-press'), 110); }
        handleKey(label, act);
      }

      function help() {
        A.ui.messageBox({ parent: win, title: 'Calculator Help', icon: 'icons/calculator',
          instruction: 'Calculator',
          message: 'Switch modes from the View menu: Standard, Scientific, Programmer, Unit conversion and Date calculation.\n\nType with your keyboard. Enter is equals, Esc clears, F9 changes sign, % is percent. Use the memory keys (MC MR MS M+ M-) to store a running total.' });
      }
      function about() {
        A.ui.messageBox({ parent: win, title: 'About Calculator', icon: 'icons/calculator', instruction: 'Aerium Calculator', message: 'Version 7.0 (Build 2007)\n\nStill counting on its fingers, but very fast fingers.', sound: false });
      }

      win.el.addEventListener('keydown', onKey);
      build();
      layout();
      if (args && args.mode && SIZES[args.mode]) setMode(args.mode);
      setTimeout(() => win.el.focus({ preventScroll: true }), 40);

      return {
        onArgs(a) { if (a && a.mode && SIZES[a.mode]) setMode(a.mode); },
      };
    },
  });
})();
