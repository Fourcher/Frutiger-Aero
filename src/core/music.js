/* Aerium music engine.
   A small real-time sequencer on the Web Audio clock (a 25 ms timer schedules
   notes about 0.2 s ahead) that plays original tracks synthesized from scratch:
   FM electric piano, vibraphone, marimba, kalimba, steel drum, glass bells,
   pads, plucked and sub bass, a breathy flute, synth leads and a soft kit.
   User-chosen audio files play through the same chain, so one analyser drives
   the visualizations for both.
   Routing: voices -> channels -> mix -> glue compressor -> EQ -> fade ->
   player volume -> analyser -> mute -> Aerium.sound.musicBus. */
(function () {
  'use strict';
  const A = window.Aerium;
  const U = A.util;
  const clamp = U.clamp;
  const EMPTY = Object.freeze({});

  // ================================================================ theory
  const PCS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const midiCache = new Map();
  function midi(n) {
    if (typeof n === 'number') return n;
    let v = midiCache.get(n);
    if (v == null) {
      const m = /^([a-gA-G])(#|b)?(-?\d)$/.exec(n);
      if (!m) throw new Error('Aerium music: bad note ' + n);
      v = PCS[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
      midiCache.set(n, v);
    }
    return v;
  }
  function pcOf(s) {
    const m = /^([A-Ga-g])(#|b)?$/.exec(s);
    return (PCS[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7],
    maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], maj13: [0, 4, 7, 11, 14, 21],
    'maj7#11': [0, 4, 7, 11, 18], 'maj9#11': [0, 4, 7, 11, 14, 18],
    6: [0, 4, 7, 9], 69: [0, 4, 7, 9, 14], add9: [0, 4, 7, 14],
    m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17], m6: [0, 3, 7, 9], m69: [0, 3, 7, 9, 14],
    madd9: [0, 3, 7, 14], mmaj7: [0, 3, 7, 11],
    7: [0, 4, 7, 10], 9: [0, 4, 7, 10, 14], 11: [0, 7, 10, 14, 17], 13: [0, 4, 7, 10, 14, 21],
    '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], '7#5': [0, 4, 8, 10], '9#11': [0, 4, 7, 10, 14, 18], '13b9': [0, 4, 7, 10, 13, 21],
    '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14], '13sus4': [0, 5, 7, 10, 14, 21],
    sus4: [0, 5, 7], sus2: [0, 2, 7], '6sus4': [0, 5, 7, 9], 'add9sus4': [0, 5, 7, 14],
    m7b5: [0, 3, 6, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8],
  };
  const chordCache = new Map();
  function chord(sym, tr) {
    tr = tr || 0;
    const key = sym + '@' + tr;
    let c = chordCache.get(key);
    if (c) return c;
    const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(sym);
    if (!m || !QUAL[m[2]]) throw new Error('Aerium music: bad chord ' + sym);
    const root = (pcOf(m[1]) + tr + 120) % 12;
    const iv = QUAL[m[2]];
    c = { sym: sym + (tr ? '+' + tr : ''), root, iv, q: m[2], bass: m[3] ? (pcOf(m[3]) + tr + 120) % 12 : root };
    c.pcs = Array.from(new Set(iv.map((x) => (root + x) % 12)));
    c.core = Array.from(new Set(iv.filter((x) => x <= 14).map((x) => (root + x) % 12)));
    chordCache.set(key, c);
    return c;
  }
  // Tones in the order a pianist would reach for them.
  function chordOrder(c, rootless) {
    const iv = c.iv, has = (x) => iv.indexOf(x) >= 0;
    const third = [4, 3, 5, 2].find(has);
    let sev = [10, 11].find(has);
    if (sev == null && has(9)) sev = 9;
    const fifth = [7, 6, 8].find(has);
    const ext = iv.filter((x) => x > 12).sort((a, b) => a - b);
    const out = [];
    const push = (x) => { if (x == null) return; const pc = (c.root + x) % 12; if (out.indexOf(pc) < 0) out.push(pc); };
    if (rootless) { push(third); push(sev); ext.forEach(push); push(fifth); push(0); }
    else { push(0); push(third); push(sev); push(fifth); ext.forEach(push); }
    return out;
  }
  // Choose octaves for pitch classes: close to the previous voicing, no mud.
  function place(pcs, prev, lo, hi) {
    const center = (lo + hi) / 2;
    const opts = [];
    pcs.forEach((pc) => {
      const a = [];
      for (let m = lo; m <= hi; m++) if (m % 12 === pc) a.push(m);
      if (a.length) opts.push(a);
    });
    let best = null, bestScore = Infinity;
    const cur = new Array(opts.length);
    const rec = (i) => {
      if (i === opts.length) {
        const s = cur.slice().sort((a, b) => a - b);
        let score = 0;
        const span = s[s.length - 1] - s[0];
        if (span > 15) score += (span - 15) * 2.5;
        for (let k = 1; k < s.length; k++) {
          const d = s[k] - s[k - 1];
          if (d === 0) return;
          if (d === 1) score += s[k] < 60 ? 6 : 1.5;
          if (d < 3 && s[k] < 52) score += 4;
        }
        const avg = s.reduce((a, b) => a + b, 0) / s.length;
        if (prev && prev.length) {
          for (const m of s) { let md = 99; for (const p of prev) { const dd = Math.abs(m - p); if (dd < md) md = dd; } score += md; }
          score += Math.abs(avg - center) * 0.35;
        } else score += Math.abs(avg - center) * 1.5;
        if (score < bestScore) { bestScore = score; best = s; }
        return;
      }
      for (const m of opts[i]) { cur[i] = m; rec(i + 1); }
    };
    rec(0);
    return best || [];
  }
  function voicing(c, prev, o) {
    return place(chordOrder(c, !!o.rootless).slice(0, o.n || 4), prev, o.lo, o.hi);
  }
  function inRange(pc, lo) { return lo + (((pc - lo) % 12) + 12) % 12; }
  function ladder(c, lo, hi, core) {
    const set = core ? c.core : c.pcs, out = [];
    for (let m = lo; m <= hi; m++) if (set.indexOf(m % 12) >= 0) out.push(m);
    return out;
  }
  function harmonyBelow(m, c) {
    let best = null, bd = 99;
    for (let x = m - 9; x <= m - 3; x++) {
      if (c.core.indexOf(x % 12) >= 0) { const d = Math.abs(m - x - 4); if (d < bd) { bd = d; best = x; } }
    }
    return best != null ? best : m - 4;
  }

  // ================================================================ composition toolkit
  const VEL = { x: 0.75, X: 1, o: 0.45, g: 0.24 };
  const MEL_RE = /^(r|[a-gA-G](?:#|b)?-?\d)(?::([\d.]+)(?:\/([\d.]+))?)?([!^.,]*)(?:@([\d.]+))?$/;
  const warnings = [];
  function parseMel(str, bpb, where) {
    const notes = [];
    let dur = 1, b = 0;
    str.split('|').forEach((bar, bi, bars) => {
      const start = b;
      bar.split(/\s+/).forEach((tok) => {
        if (!tok) return;
        const m = MEL_RE.exec(tok);
        if (!m) throw new Error('Aerium music: bad melody token ' + tok + ' in ' + where);
        if (m[2]) dur = parseFloat(m[2]) / (m[3] ? parseFloat(m[3]) : 1);
        const f = m[4] || '';
        if (m[1] !== 'r') {
          notes.push({ b, m: midi(m[1]), d: dur, acc: f.indexOf('!') >= 0, soft: f.indexOf(',') >= 0, stac: f.indexOf('.') >= 0, scoop: f.indexOf('^') >= 0, v: m[5] ? parseFloat(m[5]) : null });
        }
        b += dur;
      });
      if (bars.length > 1 && Math.abs(b - start - bpb) > 1e-3) warnings.push(where + ': bar ' + (bi + 1) + ' has ' + (b - start) + ' beats');
    });
    return { notes, beats: b };
  }

  class Song {
    constructor(def) {
      this.def = def;
      this.bpb = def.bpb || 4;
      this.ev = [];
      this.cursor = 0;
      this.rng = U.seeded(hash(def.id));
      this.voice = {};
      this.ritards = [];
      this.loopA = null;
      this.loopB = null;
    }
    section(name, prog, fn, o) {
      const S = new Section(this, name, prog, o);
      if (fn) fn(S);
      this.cursor += S.beats;
      return S;
    }
    loopStart() { this.loopA = this.cursor; }
    loopEnd() { this.loopB = this.cursor; }
  }

  class Section {
    constructor(song, name, prog, o) {
      this.song = song;
      this.name = name;
      this.o = o || {};
      this.tr = this.o.transpose || 0;
      this.start = song.cursor;
      this.bpb = song.bpb;
      const bars = prog.split('|').map((x) => x.trim());
      this.bars = bars.length;
      this.beats = this.bars * this.bpb;
      this.chords = [];
      let prev = null;
      bars.forEach((bar, i) => {
        const toks = bar.split(/\s+/).filter(Boolean);
        const durs = toks.map((t) => (t.indexOf(':') > 0 ? parseFloat(t.split(':')[1]) : null));
        const fixed = durs.reduce((a, x) => a + (x || 0), 0);
        const free = durs.filter((x) => x == null).length;
        const each = free ? (this.bpb - fixed) / free : 0;
        let b = i * this.bpb;
        toks.forEach((t, k) => {
          const sym = t.split(':')[0];
          const c = sym === '%' ? prev : chord(sym, this.tr);
          const d = durs[k] != null ? durs[k] : each;
          this.chords.push({ b, e: b + d, c });
          b += d;
          prev = c;
        });
      });
    }
    add(ch, b, n, d, v, o) { this.song.ev.push({ b: this.start + b, ch, n, d, v, o }); }
    chordAt(b) {
      const cs = this.chords;
      for (let i = 0; i < cs.length; i++) if (b < cs[i].e - 1e-6) return cs[i].c;
      return cs[cs.length - 1].c;
    }
    nextChord(b) {
      const cs = this.chords;
      for (let i = 0; i < cs.length; i++) if (cs[i].b > b + 1e-6) return cs[i].c;
      return this.o.next ? chord(this.o.next, this.tr) : cs[0].c;
    }
    pats(p) { return p.split('|').map((x) => x.replace(/\s+/g, '')); }
    range(o) { return [o.from || 0, o.to == null ? this.bars : Math.min(o.to, this.bars)]; }
    rand(a, b) { return a + (b - a) * this.song.rng(); }

    // Drum-style step patterns: x hit, X accent, o soft, g ghost, . rest.
    drum(ch, pat, o) {
      o = o || EMPTY;
      const pats = this.pats(pat), [from, to] = this.range(o);
      const fill = o.fill ? this.pats(o.fill)[0] : null;
      for (let bar = from; bar < to; bar++) {
        const p = fill && bar === to - 1 ? fill : pats[(bar - from) % pats.length];
        const step = this.bpb / p.length;
        for (let i = 0; i < p.length; i++) {
          const v = VEL[p[i]];
          if (!v) continue;
          if (o.prob != null && this.song.rng() > o.prob) continue;
          this.add(ch, bar * this.bpb + i * step, o.n != null ? midi(o.n) : null, o.d || step, v * (o.vel || 1), o.o);
        }
      }
    }
    // Bass patterns: 1 root, 5 fifth, 8 octave, 3 third, 7 seventh, 4, 6, 2,
    // > next chord's root, a chromatic approach, o slap pop, g dead note, - hold.
    bass(ch, pat, o) {
      o = o || EMPTY;
      const pats = this.pats(pat), [from, to] = this.range(o);
      const lo = midi(o.lo || 'E1');
      for (let bar = from; bar < to; bar++) {
        const p = pats[(bar - from) % pats.length];
        const step = this.bpb / p.length;
        for (let i = 0; i < p.length; i++) {
          const k = p[i];
          if (k === '.' || k === '-') continue;
          let len = 1;
          while (i + len < p.length && p[i + len] === '-') len++;
          const b = bar * this.bpb + i * step;
          const c = this.chordAt(b);
          const root = inRange(c.bass, lo);
          const iv = (x) => { const r = inRange((c.root + x) % 12, root); return r; };
          let m = root, v = 0.85, extra = null;
          if (k === '5') m = iv(c.iv.indexOf(6) >= 0 && c.iv.indexOf(7) < 0 ? 6 : c.iv.indexOf(8) >= 0 && c.iv.indexOf(7) < 0 ? 8 : 7);
          else if (k === '8') m = root + 12;
          else if (k === '3') m = iv([4, 3, 5, 2].find((x) => c.iv.indexOf(x) >= 0) || 4);
          else if (k === '7') m = iv([10, 11, 9].find((x) => c.iv.indexOf(x) >= 0) || 10);
          else if (k === '4') m = iv(5);
          else if (k === '6') m = iv(9);
          else if (k === '2') m = iv(2);
          else if (k === '>') m = inRange(this.nextChord(b).bass, lo);
          else if (k === 'a') { const t = inRange(this.nextChord(b).bass, lo); m = t - 1 >= lo ? t - 1 : t + 1; v = 0.7; }
          else if (k === 'o') { m = root + 12; v = 1; extra = { pop: true }; }
          else if (k === 'g') { v = 0.35; extra = { ghost: true }; len = Math.min(len, 1); }
          else if (k === 'x') v = 1;
          this.add(ch, b, m + 12 * (o.oct || 0), len * step * (o.gate || 0.9), v * (o.vel || 1), extra ? Object.assign({}, o.o, extra) : o.o);
        }
      }
    }
    // Chord comping on a step grid: x hit, - hold, . rest.
    comp(ch, pat, o) {
      o = o || EMPTY;
      const pats = this.pats(pat), [from, to] = this.range(o);
      const vo = { lo: midi(o.lo || 'E3'), hi: midi(o.hi || 'D5'), n: o.n || 4, rootless: o.rootless !== false };
      const key = ch + ':comp';
      for (let bar = from; bar < to; bar++) {
        const p = pats[(bar - from) % pats.length];
        const step = this.bpb / p.length;
        for (let i = 0; i < p.length; i++) {
          const vv = VEL[p[i]];
          if (!vv) continue;
          let len = 1;
          while (i + len < p.length && p[i + len] === '-') len++;
          const b = bar * this.bpb + i * step;
          let c = this.chordAt(b);
          if (o.push && this.chordAt(b + o.push) !== c) c = this.chordAt(b + o.push);
          const v = voicing(c, this.song.voice[key], vo);
          this.song.voice[key] = v;
          const vel = vv * (o.vel || 0.7), d = len * step * (o.gate || 0.92);
          if (o.chord) this.add(ch, b, v, d, vel, o.o);
          else v.forEach((m, k) => this.add(ch, b + k * (o.strum || 0), m, d, vel * (k === v.length - 1 ? 1 : 0.86), o.o));
        }
      }
    }
    // Sustained chords, merged across repeated symbols.
    pad(ch, o) {
      o = o || EMPTY;
      const [from, to] = this.range(o);
      const b0 = from * this.bpb, b1 = to * this.bpb;
      const vo = { lo: midi(o.lo || 'C3'), hi: midi(o.hi || 'C5'), n: o.n || 4, rootless: !!o.rootless };
      const segs = [];
      for (const x of this.chords) {
        const b = Math.max(x.b, b0), e = Math.min(x.e, b1);
        if (e <= b) continue;
        const last = segs[segs.length - 1];
        if (last && o.merge !== false && last.c === x.c && Math.abs(last.e - b) < 1e-6) last.e = e;
        else segs.push({ b, e, c: x.c });
      }
      const key = ch + ':pad';
      for (const sg of segs) {
        const v = voicing(sg.c, this.song.voice[key], vo);
        this.song.voice[key] = v;
        const notes = v.slice();
        if (o.bass) notes.unshift(inRange(sg.c.bass, midi(o.bass)));
        this.add(ch, sg.b, notes, sg.e - sg.b + (o.overlap || 0.02), o.vel || 0.6, o.o);
      }
    }
    // Arpeggios over the current chord. pattern indexes into the voicing.
    arp(ch, o) {
      o = o || EMPTY;
      const [from, to] = this.range(o), rate = o.rate || 0.5;
      const pat = (o.pattern || '0 1 2 3').split(/\s+/).map((x) => (x === 'r' ? null : parseInt(x, 10)));
      const acc = o.accent ? o.accent.split(/\s+/).map(Number) : null;
      const vo = { lo: midi(o.lo || 'C4'), hi: midi(o.hi || 'C6'), n: o.n || 4, rootless: !!o.rootless };
      let k = 0, lastC = null, tones = null;
      for (let b = from * this.bpb; b < to * this.bpb - 1e-6; b += rate, k++) {
        const c = this.chordAt(b);
        if (c !== lastC) { tones = voicing(c, tones, vo); lastC = c; }
        const idx = pat[k % pat.length];
        if (idx == null || !tones.length) continue;
        const L = tones.length;
        const m = tones[((idx % L) + L) % L] + 12 * Math.floor(idx / L);
        this.add(ch, b, m + 12 * (o.oct || 0), rate * (o.gate || 0.9), (o.vel || 0.6) * (acc ? acc[k % acc.length] : 1), o.o);
      }
    }
    // Written melody: "c5:1 e5:.5 r:.5 g5:2 | ..." (durations in beats, | checks bars).
    mel(ch, str, o) {
      o = o || EMPTY;
      const at = (o.at || 0) * this.bpb;
      const parsed = parseMel(str, this.bpb, this.song.def.id + '/' + this.name);
      const tr = (o.transpose || 0) + (o.fixed ? 0 : this.tr) + 12 * (o.oct || 0);
      const out = [];
      parsed.notes.forEach((nt, i) => {
        const b = at + nt.b;
        if (b >= this.beats - 1e-6) return;
        const m = nt.m + tr;
        let v = (o.vel || 0.8) * (nt.v != null ? nt.v : nt.acc ? 1.2 : nt.soft ? 0.7 : 1) * (o.shape ? o.shape(i, nt) : 1);
        const d = nt.d * (nt.stac ? 0.5 : o.gate || 0.94);
        const extra = nt.scoop || (o.scoop && nt.d >= 1 && this.song.rng() < o.scoop) ? { scoop: true } : null;
        const prevN = parsed.notes[i - 1];
        const glide = o.glide && prevN && Math.abs(prevN.b + prevN.d - nt.b) < 1e-3 ? { from: prevN.m + tr } : null;
        const oo = extra || glide || o.o ? Object.assign({}, o.o, extra, glide) : null;
        this.add(ch, b, m, d, Math.min(1.1, v), oo);
        if (o.harm) {
          const c = this.chordAt(b);
          this.add(o.harm, b, harmonyBelow(m, c) + 12 * (o.harmOct || 0), d, v * (o.harmVel || 0.7), o.harmO || null);
        }
        out.push({ b, m, d: nt.d });
      });
      return out;
    }
    // Call and response: fill the space after long lead notes with a short figure.
    respond(ch, notes, o) {
      o = o || EMPTY;
      const rng = this.song.rng, min = o.min || 2, rate = o.rate || 0.5;
      const lo = midi(o.lo || 'C5'), hi = midi(o.hi || 'C6');
      for (let i = 0; i < notes.length; i++) {
        const nt = notes[i], next = notes[i + 1];
        if (nt.d < min) continue;
        const end = next ? next.b : Math.min(this.beats, nt.b + nt.d + 1);
        const b0 = nt.b + (o.after || 1);
        const count = Math.min(o.max || 4, Math.floor((end - 0.25 - b0) / rate));
        if (count < 2) continue;
        if (o.prob != null && rng() > o.prob) continue;
        const c = this.chordAt(b0);
        const lad = ladder(c, lo, hi, true).filter((m) => Math.abs(m - nt.m) > 2);
        if (lad.length < 3) continue;
        const up = rng() < 0.6;
        let idx = up ? Math.floor(rng() * Math.max(1, lad.length - count)) : lad.length - 1 - Math.floor(rng() * Math.max(1, lad.length - count));
        for (let k = 0; k < count; k++) {
          const m = lad[clamp(idx, 0, lad.length - 1)];
          const last = k === count - 1;
          this.add(ch, b0 + k * rate, m, rate * (last ? 1.8 : 0.9), (o.vel || 0.5) * (0.8 + 0.25 * rng()), o.o);
          idx += up ? 1 : -1;
          if (rng() < 0.2) idx += up ? 1 : -1;
        }
      }
    }
    // Random chord tones in a register (bubbles, water drops, glassy plucks).
    sprinkle(ch, o) {
      o = o || EMPTY;
      const [from, to] = this.range(o), rng = this.song.rng;
      const lo = midi(o.lo || 'C6'), hi = midi(o.hi || 'C7'), grid = o.grid || 0.5;
      const per = o.per || [1, 2], vel = o.vel || [0.4, 0.8];
      let last = null;
      for (let bar = from; bar < to; bar++) {
        const slots = [];
        for (let i = 0; i < this.bpb / grid; i++) slots.push(i);
        const k = Math.floor(per[0] + rng() * (per[1] - per[0] + 1));
        U.shuffle(slots, rng).slice(0, k).forEach((sl) => {
          const b = bar * this.bpb + sl * grid;
          const lad = ladder(this.chordAt(b), lo, hi, o.core !== false);
          if (!lad.length) return;
          let m = lad[Math.floor(rng() * lad.length)];
          if (m === last && lad.length > 1) m = lad[(lad.indexOf(m) + 1) % lad.length];
          last = m;
          this.add(ch, b, m, o.d || grid, vel[0] + (vel[1] - vel[0]) * rng(), o.o);
        });
      }
    }
    // A short motif repeated every few bars, re-pitched to fit each chord.
    motif(ch, o) {
      o = o || EMPTY;
      const rng = this.song.rng, every = o.every || 2, [from, to] = this.range(o);
      const lo = midi(o.lo || 'E5'), hi = midi(o.hi || 'E7');
      const rhythms = o.rhythms || [[0, 0.5, 1.5], [0, 0.75, 1.5, 2.25], [0, 1, 1.5, 3], [0.5, 1, 2], [0, 0.5, 1, 2.5]];
      const make = () => {
        const r = rhythms[Math.floor(rng() * rhythms.length)];
        const steps = [0];
        for (let i = 1; i < r.length; i++) steps.push(steps[i - 1] + (rng() < 0.7 ? 1 : -1) * (rng() < 0.75 ? 1 : 2));
        return { r, steps };
      };
      const m1 = o.m1 || make(), m2 = o.m2 || make();
      for (let bar = from, k = 0; bar < to; bar += every, k++) {
        const mo = k % 4 === 2 ? m2 : m1;
        const shift = k % 4 === 3 ? 1 : k % 4 === 1 && o.vary !== false ? -1 : 0;
        mo.r.forEach((rb, j) => {
          const b = bar * this.bpb + rb;
          if (b >= to * this.bpb) return;
          const lad = ladder(this.chordAt(b), lo, hi, o.core !== false);
          if (!lad.length) return;
          const base = Math.floor(lad.length * (o.center || 0.4));
          const m = lad[clamp(base + shift + mo.steps[j], 0, lad.length - 1)];
          this.add(ch, b, m, o.d || 1, (o.vel || 0.5) * (j === 0 ? 1 : 0.85 + 0.15 * rng()), o.o);
        });
      }
      return { m1, m2 };
    }
    hit(ch, b, o) { o = o || EMPTY; this.add(ch, b, o.n != null ? midi(o.n) : null, o.d || 1, o.v || 0.8, o.o); }
    note(ch, b, n, d, v, o) { this.add(ch, b, typeof n === 'string' ? midi(n) + this.tr : n, d, v, o); }
    auto(ch, param, value, b, ramp) { this.song.ev.push({ b: this.start + b, ch, auto: true, param, value, ramp: ramp || 0, d: 0, v: 0 }); }
    duck(ch, depth, o) {
      o = o || EMPTY;
      const [from, to] = this.range(o);
      for (let b = from * this.bpb; b < to * this.bpb - 1e-6; b += o.every || 1) this.song.ev.push({ b: this.start + b, ch, auto: true, param: 'duck', value: depth, ramp: o.len || 0.55, d: 0, v: 0 });
    }
    ritard(fromBar, toBar, factor) { this.song.ritards.push({ from: this.start + fromBar * this.bpb, to: this.start + toBar * this.bpb, factor }); }
  }

  function tempoMap(bpm, ritards, total) {
    if (!ritards.length) { const k = 60 / bpm; return (b) => b * k; }
    const step = 1 / 32, n = Math.ceil((total + 32) / step) + 2;
    const cum = new Float64Array(n);
    const tempoAt = (b) => {
      let t = bpm;
      for (const r of ritards) {
        if (b >= r.to) t = bpm * r.factor;
        else if (b > r.from) t = bpm * (1 + (r.factor - 1) * (b - r.from) / (r.to - r.from));
      }
      return t;
    };
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + step * 60 / tempoAt((i - 0.5) * step);
    return (b) => {
      const x = b / step, i = Math.floor(x);
      if (i >= n - 1) return cum[n - 1] + (b - (n - 1) * step) * 60 / tempoAt(b);
      if (i < 0) return b * 60 / bpm;
      return cum[i] + (cum[i + 1] - cum[i]) * (x - i);
    };
  }
  function swingB(b, s16, s8) {
    const beat = Math.floor(b + 1e-7), p = b - beat;
    if (s8) {
      const s = 0.5 + s8 * 0.1667;
      return beat + (p < 0.5 ? (p / 0.5) * s : s + ((p - 0.5) / 0.5) * (1 - s));
    }
    if (s16) {
      const half = p < 0.5 - 1e-7 ? 0 : 0.5, pp = p - half, s = 0.25 + s16 * 0.0833;
      return beat + half + (pp < 0.25 ? (pp / 0.25) * s : s + ((pp - 0.25) / 0.25) * (0.5 - s));
    }
    return b;
  }

  function compile(def) {
    if (def._c) return def._c;
    const song = new Song(def);
    def.write(song);
    const total = song.cursor;
    const b2s = tempoMap(def.bpm, song.ritards, total);
    const rng = U.seeded(hash(def.id) ^ 0x5bd1e995);
    const hz = def.humanize == null ? 0.005 : def.humanize;
    const sw = (b) => (def.swing || def.swing8 ? swingB(b, def.swing, def.swing8) : b);
    const events = song.ev.map((e) => {
      const t0 = b2s(sw(e.b));
      if (e.auto) return { t: t0, ch: e.ch, auto: true, param: e.param, value: e.value, ramp: e.ramp ? b2s(e.b + e.ramp) - b2s(e.b) : 0, d: 0 };
      const t1 = b2s(sw(e.b + e.d));
      return {
        t: Math.max(0, t0 + (rng() - 0.5) * 2 * hz),
        ch: e.ch, n: e.n,
        d: Math.max(0.02, t1 - t0),
        v: clamp(e.v * (1 + (rng() - 0.5) * 0.1), 0, 1.2),
        o: e.o || null,
      };
    });
    events.sort((a, b) => a.t - b.t || (a.auto ? -1 : 0) - (b.auto ? -1 : 0));
    const end = b2s(total);
    def._c = {
      events,
      end,
      duration: Math.round((end + (def.tail == null ? 3 : def.tail)) * 100) / 100,
      loopStart: song.loopA != null ? b2s(song.loopA) : null,
      loopEnd: song.loopB != null ? b2s(song.loopB) : null,
      delay: 60 / def.bpm * (def.delayBeats || 0.75),
      b2s,
      beats: total,
    };
    return def._c;
  }

  // ================================================================ instruments
  function osc(ctx, type, f, t, stop) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t);
    o.stop(stop);
    return o;
  }
  function gainNode(ctx, v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function biquad(ctx, type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function noise(E, t, stop) {
    const s = E.ctx.createBufferSource();
    s.buffer = E.noise;
    s.loop = true;
    s.start(t, E.rnd() * 1.8);
    s.stop(stop);
    return s;
  }
  // Struck envelope: attack, exponential decay, optional damper release.
  function struck(g, t, peak, atk, tau, off, rel) {
    const p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + atk);
    p.setTargetAtTime(0, t + atk, tau);
    if (off != null) p.setTargetAtTime(0, Math.max(off, t + atk + 0.001), rel);
  }
  // Held envelope: attack, settle to sustain, release after the note.
  function held(g, t, peak, atk, sus, dec, off, rel) {
    const p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + atk);
    if (sus !== peak) p.setTargetAtTime(sus, t + atk, dec);
    p.setTargetAtTime(0, Math.max(off, t + atk + 0.001), rel);
  }

  const INST = {};

  // Electric piano: FM tone with a short metallic "tine" bark on the attack.
  INST.ep = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d, rel = o.rel || 0.09;
    const tau = clamp(2.4 - (m - 48) * 0.045, 0.45, 2.6);
    const end = Math.min(off + rel * 8, t + tau * 6) + 0.05;
    const b = (o.bright == null ? 1 : o.bright) * (0.55 + v * 0.9);
    const car = osc(ctx, 'sine', f, t, end), mod = osc(ctx, 'sine', f, t, end);
    if (o.detune) car.detune.value = o.detune;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.5 * b, t);
    mg.gain.setTargetAtTime(f * 0.16 * b, t, 0.38);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    struck(g, t, v * 0.4, 0.003, tau, off, rel);
    car.connect(g).connect(out);
    if (f < 1100) {
      const c2 = osc(ctx, 'sine', f, t, t + 0.5), m2 = osc(ctx, 'sine', f * 14, t, t + 0.5);
      const mg2 = ctx.createGain();
      mg2.gain.setValueAtTime(f * 2 * b, t);
      mg2.gain.setTargetAtTime(0, t, 0.03);
      m2.connect(mg2).connect(c2.frequency);
      const g2 = ctx.createGain();
      struck(g2, t, v * 0.1 * b, 0.001, 0.06, null);
      c2.connect(g2).connect(out);
    }
  };

  // Vibraphone: pure bar tone plus quick upper partials; tremolo lives on the channel.
  INST.vibes = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    const tau = clamp(2.6 - (m - 60) * 0.05, 0.7, 3);
    const off = t + (o.damp ? d : Math.max(d, o.ring || 1.1));
    const end = Math.min(t + tau * 6, off + 1.2);
    const g = ctx.createGain();
    struck(g, t, v * 0.36, 0.002, tau, off, 0.16);
    osc(ctx, 'sine', f, t, end).connect(g).connect(out);
    const g4 = ctx.createGain();
    struck(g4, t, v * v * 0.13, 0.001, 0.13, null);
    osc(ctx, 'sine', f * 4, t, t + 0.9).connect(g4).connect(out);
    if (f < 1600) {
      const g10 = ctx.createGain();
      struck(g10, t, v * 0.03, 0.001, 0.03, null);
      osc(ctx, 'sine', f * 9.92, t, t + 0.2).connect(g10).connect(out);
    }
  };

  INST.marimba = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    const tau = clamp(0.5 - (m - 60) * 0.012, 0.1, 0.7);
    const g = ctx.createGain();
    struck(g, t, v * 0.46, 0.0015, tau, null);
    osc(ctx, 'sine', f, t, t + tau * 7).connect(g).connect(out);
    const g2 = ctx.createGain();
    struck(g2, t, v * 0.15, 0.001, 0.04, null);
    osc(ctx, 'sine', f * 3.93, t, t + 0.3).connect(g2).connect(out);
    if (f < 1800) {
      const g3 = ctx.createGain();
      struck(g3, t, v * 0.04, 0.001, 0.012, null);
      osc(ctx, 'sine', f * 9.2, t, t + 0.1).connect(g3).connect(out);
    }
  };

  INST.kalimba = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    const tau = clamp(1.05 - (m - 60) * 0.02, 0.3, 1.3);
    const g = ctx.createGain();
    struck(g, t, v * 0.42, 0.001, tau, null);
    osc(ctx, 'sine', f, t, t + tau * 6).connect(g).connect(out);
    if (f * 5.95 < 16000) {
      const g2 = ctx.createGain();
      struck(g2, t, v * 0.12, 0.0008, 0.05, null);
      osc(ctx, 'sine', f * 5.95, t, t + 0.35).connect(g2).connect(out);
    }
    const g3 = ctx.createGain();
    struck(g3, t, v * 0.05, 0.001, 0.25, null);
    osc(ctx, 'sine', f * 2.01, t, t + 1.5).connect(g3).connect(out);
    const n = noise(E, t, t + 0.03), hp = biquad(ctx, 'highpass', 4200), gn = ctx.createGain();
    struck(gn, t, v * 0.05, 0.0005, 0.004, null);
    n.connect(hp).connect(gn).connect(out);
  };

  INST.steel = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    const car = osc(ctx, 'sine', f, t, t + 2.6), mod = osc(ctx, 'sine', f * 2, t, t + 2.6);
    car.frequency.setValueAtTime(f * 1.012, t);
    car.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.1 * v, t);
    mg.gain.setTargetAtTime(f * 0.1, t, 0.12);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    struck(g, t, v * 0.3, 0.003, 0.45, t + d + 0.3, 0.1);
    car.connect(g).connect(out);
    const g2 = ctx.createGain();
    struck(g2, t, v * 0.12, 0.002, 0.22, null);
    osc(ctx, 'sine', f * 2, t, t + 1.4).connect(g2).connect(out);
  };

  // FM glass bell (ratio 3.5 is glassy, 2 is a sweet chime).
  INST.bell = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    const ratio = o.ratio || 3.5, idx = o.index == null ? 2 : o.index, decay = o.decay || 1.6;
    const end = t + decay * 6;
    const car = osc(ctx, 'sine', f, t, end), mod = osc(ctx, 'sine', f * ratio, t, end);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * idx * (0.5 + v * 0.6), t);
    mg.gain.setTargetAtTime(0, t, decay * 0.22);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    struck(g, t, v * 0.3, 0.002, decay, null);
    car.connect(g).connect(out);
    const g2 = ctx.createGain();
    struck(g2, t, v * 0.08, 0.002, decay * 0.4, null);
    osc(ctx, 'sine', f * 2.004, t, t + decay * 3).connect(g2).connect(out);
  };

  INST.glock = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m);
    [[1, 0.3, 1.1], [2.76, 0.1, 0.28], [5.4, 0.045, 0.07]].forEach(([r, a, tau]) => {
      if (f * r > 17000) return;
      const g = ctx.createGain();
      struck(g, t, v * a, 0.001, tau, null);
      osc(ctx, 'sine', f * r, t, t + tau * 7).connect(g).connect(out);
    });
  };

  // Pads: one shared filter per chord with slow motion; waves warm | soft | glass | strings.
  INST.pad = (E, t, ns, d, v, o, out) => {
    const ctx = E.ctx, notes = Array.isArray(ns) ? ns : [ns];
    const atk = o.attack == null ? 1 : o.attack, rel = o.release == null ? 1.8 : o.release;
    const off = t + d, end = off + rel * 1.6 + 0.1;
    const flt = biquad(ctx, 'lowpass', o.cutoff || 800, o.q == null ? 0.7 : o.q);
    const c1 = o.cutoffEnd || 2400;
    flt.frequency.setValueAtTime(o.cutoff || 800, t);
    flt.frequency.linearRampToValueAtTime(c1, t + atk * 1.4 + 0.01);
    if (o.lfo !== 0) {
      const l = osc(ctx, 'sine', o.lfo || 0.13, t, end), lg = gainNode(ctx, c1 * (o.lfoDepth == null ? 0.3 : o.lfoDepth));
      l.connect(lg).connect(flt.frequency);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * (o.level || 0.5), t + atk);
    g.gain.setTargetAtTime(0, Math.max(off, t + atk), rel / 4);
    flt.connect(g).connect(out);
    const wave = o.wave || 'warm', norm = 1 / Math.sqrt(notes.length + 1);
    const busA = gainNode(ctx, norm * (wave === 'glass' ? 0.55 : 0.42)), busB = gainNode(ctx, norm * 0.5);
    busA.connect(flt);
    busB.connect(flt);
    const dt = o.detune == null ? 8 : o.detune;
    notes.forEach((m, i) => {
      const f = mtof(m), jitter = ((i * 37) % 7) - 3;
      if (wave === 'warm' || wave === 'strings') {
        [-1, 1].forEach((sg) => { const x = osc(ctx, 'sawtooth', f, t, end); x.detune.value = sg * dt + jitter; x.connect(busA); });
        osc(ctx, 'triangle', f * (wave === 'strings' ? 1 : 0.5), t, end).connect(busB);
      } else if (wave === 'soft') {
        const x = osc(ctx, 'triangle', f, t, end); x.detune.value = -dt * 0.6 + jitter; x.connect(busA);
        const y = osc(ctx, 'sine', f, t, end); y.detune.value = dt * 0.6; y.connect(busB);
      } else {
        osc(ctx, 'sine', f, t, end).connect(busA);
        const y = osc(ctx, 'sine', f * 2, t, end); y.detune.value = dt * 0.5 + jitter; y.connect(busB);
        const z = osc(ctx, 'triangle', f, t, end); z.detune.value = -dt; z.connect(busB);
      }
    });
  };

  // Plucked electric bass; pops and dead notes for the slap-ish tracks.
  INST.bass = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d, end = off + 0.25;
    const pop = !!o.pop, ghost = !!o.ghost;
    const flt = biquad(ctx, 'lowpass', 1000, o.q == null ? 2.2 : o.q);
    const br = pop ? 22 : ghost ? 5 : o.bright || 8;
    flt.frequency.setValueAtTime(Math.min(f * br * (0.6 + v * 0.6), 9000), t);
    flt.frequency.setTargetAtTime(f * (pop ? 3 : 2), t + 0.004, pop ? 0.05 : o.fdecay || 0.09);
    const saw = osc(ctx, o.wave || 'sawtooth', f, t, end);
    if (pop || o.slap) { saw.frequency.setValueAtTime(f * 1.025, t); saw.frequency.exponentialRampToValueAtTime(f, t + 0.03); }
    saw.connect(flt);
    const sub = osc(ctx, 'sine', f, t, end), sg = gainNode(ctx, ghost ? 0.2 : o.sub == null ? 0.8 : o.sub);
    sub.connect(sg);
    const g = ctx.createGain();
    const peak = v * (pop ? 0.42 : 0.45);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.setTargetAtTime(peak * (ghost ? 0 : 0.62), t + 0.004, ghost ? 0.02 : o.decay || 0.35);
    g.gain.setTargetAtTime(0, Math.max(off, t + 0.01), 0.025);
    flt.connect(g);
    sg.connect(g);
    g.connect(out);
    if (pop || ghost) {
      const n = noise(E, t, t + 0.03), hp = biquad(ctx, 'bandpass', pop ? 2500 : 1200, 0.9), gn = ctx.createGain();
      struck(gn, t, v * (pop ? 0.12 : 0.18), 0.0005, 0.006, null);
      n.connect(hp).connect(gn).connect(out);
    }
  };

  INST.sub = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d;
    const g = ctx.createGain();
    held(g, t, v * 0.6, o.attack || 0.012, v * 0.6, 1, off, o.rel || 0.05);
    osc(ctx, 'sine', f, t, off + 0.4).connect(g);
    const h2 = gainNode(ctx, 0.12);
    osc(ctx, 'sine', f * 2, t, off + 0.4).connect(h2).connect(g);
    g.connect(out);
  };

  // Flute: sine and a little triangle, delayed vibrato, breath noise and chiff.
  INST.flute = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d, end = off + 0.4;
    const a = osc(ctx, 'sine', f, t, end), b = osc(ctx, 'triangle', f, t, end);
    if (o.scoop) [a, b].forEach((x) => { x.frequency.setValueAtTime(f * 0.972, t); x.frequency.exponentialRampToValueAtTime(f, t + 0.08); });
    if (d > 0.3) {
      const l = osc(ctx, 'sine', o.vib || 5.1, t, end), vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(f * 0.0065 * (o.vibDepth == null ? 1 : o.vibDepth), t + Math.min(0.55, d * 0.7));
      l.connect(vg);
      vg.connect(a.frequency);
      vg.connect(b.frequency);
    }
    const bg = gainNode(ctx, o.tri == null ? 0.22 : o.tri);
    b.connect(bg);
    const lp = biquad(ctx, 'lowpass', (o.tone || 2600) + 1600 * v, 0.5);
    a.connect(lp);
    bg.connect(lp);
    const g = ctx.createGain(), atk = o.attack || 0.05;
    held(g, t, v * 0.34, atk, v * 0.28, 0.25, off, 0.05);
    lp.connect(g).connect(out);
    const br = o.breath == null ? 1 : o.breath;
    if (br > 0) {
      const n = noise(E, t, end), bp = biquad(ctx, 'bandpass', Math.min(f * 2.2, 7000), 1.1), ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(v * 0.08 * br, t + 0.014);
      ng.gain.setTargetAtTime(v * 0.016 * br, t + 0.02, 0.06);
      ng.gain.setTargetAtTime(0, Math.max(off, t + 0.03), 0.05);
      n.connect(bp).connect(ng).connect(out);
    }
  };

  // Glossy synth lead with delayed vibrato and optional glide.
  INST.lead = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d, end = off + 0.4;
    const a = osc(ctx, o.wave || 'sawtooth', f, t, end), b = osc(ctx, 'square', f, t, end);
    b.detune.value = 7;
    if (o.from != null) {
      const f0 = mtof(o.from);
      [a, b].forEach((x) => { x.frequency.setValueAtTime(f0, t); x.frequency.exponentialRampToValueAtTime(f, t + (o.glide || 0.06)); });
    }
    if (d > 0.3) {
      const l = osc(ctx, 'sine', 5.4, t, end), vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(f * 0.009, t + Math.min(0.6, d * 0.7));
      l.connect(vg);
      vg.connect(a.frequency);
      vg.connect(b.frequency);
    }
    const bg = gainNode(ctx, o.sq == null ? 0.35 : o.sq);
    b.connect(bg);
    const lp = biquad(ctx, 'lowpass', 1000, o.q || 1.2);
    lp.frequency.setValueAtTime(Math.min(f * 3 + 3200 * v, 12000), t);
    lp.frequency.setTargetAtTime(Math.min(f * (o.cut || 4), 9000), t + 0.01, 0.18);
    a.connect(lp);
    bg.connect(lp);
    const g = ctx.createGain();
    held(g, t, v * 0.24, 0.012, v * 0.19, 0.3, off, 0.07);
    lp.connect(g).connect(out);
  };

  // Resonant pluck for arpeggios.
  INST.pluck = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d;
    const x = osc(ctx, o.wave || 'square', f, t, off + 0.4);
    const lp = biquad(ctx, 'lowpass', 1000, o.q == null ? 6 : o.q);
    lp.frequency.setValueAtTime(Math.min((o.cut || 3200) * (0.5 + v * 0.7), 12000), t);
    lp.frequency.setTargetAtTime(f * 1.3, t, o.fdecay || 0.07);
    const g = ctx.createGain();
    struck(g, t, v * 0.26, 0.002, o.decay || 0.14, off, 0.03);
    x.connect(lp).connect(g).connect(out);
  };

  // Bubbly "bloop" pluck: a sine that jumps up into pitch like a droplet.
  INST.bloop = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m), off = t + d;
    const x = osc(ctx, 'sine', f, t, off + 0.5);
    x.frequency.setValueAtTime(f * 0.5, t);
    x.frequency.exponentialRampToValueAtTime(f, t + 0.028);
    const y = osc(ctx, 'triangle', f * 2, t, off + 0.5), yg = gainNode(ctx, 0.14);
    y.frequency.setValueAtTime(f, t);
    y.frequency.exponentialRampToValueAtTime(f * 2, t + 0.028);
    const g = ctx.createGain();
    struck(g, t, v * 0.36, 0.003, o.decay || 0.2, off, 0.05);
    x.connect(g);
    y.connect(yg).connect(g);
    g.connect(out);
  };

  // Synth brass stab (takes an array of notes).
  INST.stab = (E, t, ns, d, v, o, out) => {
    const ctx = E.ctx, notes = Array.isArray(ns) ? ns : [ns], off = t + d, end = off + 0.5;
    const lp = biquad(ctx, 'lowpass', 600, 1.1);
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(900 + 3200 * v, t + 0.025);
    lp.frequency.setTargetAtTime(1300, t + 0.03, 0.16);
    const g = ctx.createGain();
    held(g, t, v * 0.3, 0.012, v * 0.2, 0.2, off, 0.06);
    lp.connect(g).connect(out);
    const bus = gainNode(ctx, 0.5 / Math.sqrt(notes.length));
    bus.connect(lp);
    notes.forEach((m) => [-7, 6].forEach((dt) => { const x = osc(ctx, 'sawtooth', mtof(m), t, end); x.detune.value = dt; x.connect(bus); }));
  };

  // Clean funk guitar / clav: short bandpassed pulses, strummed.
  INST.gtr = (E, t, ns, d, v, o, out) => {
    const ctx = E.ctx, notes = Array.isArray(ns) ? ns : [ns];
    const mute = !!o.mute, tau = mute ? 0.03 : o.decay || 0.16;
    const hp = biquad(ctx, 'highpass', 320, 0.7), bp = biquad(ctx, 'peaking', 1800, 1);
    bp.gain.value = 6;
    hp.connect(bp).connect(out);
    notes.forEach((m, i) => {
      const tt = t + i * (o.strum == null ? 0.007 : o.strum), f = mtof(m);
      const x = osc(ctx, 'square', f, tt, tt + tau * 7 + 0.05), lp = biquad(ctx, 'lowpass', Math.min(f * 6, 6000), 1.5);
      const g = ctx.createGain();
      struck(g, tt, v * 0.11, 0.0015, tau, tt + d, 0.02);
      x.connect(lp).connect(g).connect(hp);
    });
    if (mute) {
      const n = noise(E, t, t + 0.05), nb = biquad(ctx, 'bandpass', 2200, 1.3), ng = ctx.createGain();
      struck(ng, t, v * 0.12, 0.001, 0.012, null);
      n.connect(nb).connect(ng).connect(out);
    }
  };

  // Drums -----------------------------------------------------------------
  INST.kick = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f0 = o.f0 || 140, f1 = o.f1 || 46, dec = o.decay || 0.32;
    const x = osc(ctx, 'sine', f0, t, t + dec * 2 + 0.1);
    x.frequency.setValueAtTime(f0, t);
    x.frequency.exponentialRampToValueAtTime(f1, t + (o.sweep || 0.08));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.95, t + 0.002);
    g.gain.setTargetAtTime(v * 0.7, t + 0.002, 0.04);
    g.gain.setTargetAtTime(0, t + 0.03, dec / 3);
    x.connect(g).connect(out);
    const ck = o.click == null ? 1 : o.click;
    if (ck > 0) {
      const n = noise(E, t, t + 0.02), hp = biquad(ctx, 'highpass', 3000), gn = ctx.createGain();
      struck(gn, t, v * 0.14 * ck, 0.0005, 0.004, null);
      n.connect(hp).connect(gn).connect(out);
    }
  };
  INST.snare = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, dec = o.decay || 0.09;
    const n = noise(E, t, t + dec * 7), bp = biquad(ctx, 'bandpass', o.tone || 1900, 0.7), hp = biquad(ctx, 'highpass', 600), gn = ctx.createGain();
    struck(gn, t, v * 0.42, 0.001, dec, null);
    n.connect(bp).connect(hp).connect(gn).connect(out);
    const x = osc(ctx, 'triangle', 200, t, t + 0.25), gt = ctx.createGain();
    x.frequency.setValueAtTime(205, t);
    x.frequency.exponentialRampToValueAtTime(165, t + 0.04);
    struck(gt, t, v * 0.3, 0.001, 0.045, null);
    x.connect(gt).connect(out);
  };
  INST.clap = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + 0.6), bp = biquad(ctx, 'bandpass', o.tone || 1250, 1.1), g = ctx.createGain();
    const p = g.gain;
    p.setValueAtTime(0, t);
    [0, 0.011, 0.022].forEach((dt) => { p.setValueAtTime(v * 0.5, t + dt); p.setTargetAtTime(0, t + dt + 0.001, 0.004); });
    p.setValueAtTime(v * 0.45, t + 0.033);
    p.setTargetAtTime(0, t + 0.034, o.decay || 0.07);
    n.connect(bp).connect(g).connect(out);
  };
  INST.hat = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, open = !!o.open, tau = open ? o.decay || 0.12 : o.decay || 0.022;
    const n = noise(E, t, t + tau * 7 + 0.01), hp = biquad(ctx, 'highpass', o.hp || 7200, 0.8), pk = biquad(ctx, 'peaking', 10500, 1.2);
    pk.gain.value = 5;
    const g = ctx.createGain();
    struck(g, t, v * 0.22, 0.001, tau, null);
    n.connect(hp).connect(pk).connect(g).connect(out);
  };
  INST.shaker = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + 0.2), bp = biquad(ctx, 'bandpass', o.tone || 6800, 1.4), g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.26, t + 0.012);
    g.gain.setTargetAtTime(0, t + 0.013, o.decay || 0.024);
    n.connect(bp).connect(g).connect(out);
  };
  INST.tamb = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + 0.4), hp = biquad(ctx, 'highpass', 6000), bp = biquad(ctx, 'peaking', 9000, 1.5), g = ctx.createGain();
    bp.gain.value = 8;
    struck(g, t, v * 0.2, 0.002, o.decay || 0.06, null);
    n.connect(hp).connect(bp).connect(g).connect(out);
  };
  INST.rim = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const a = osc(ctx, 'triangle', o.tone || 820, t, t + 0.12), ga = ctx.createGain();
    struck(ga, t, v * 0.3, 0.0005, 0.016, null);
    a.connect(ga).connect(out);
    const b = osc(ctx, 'sine', (o.tone || 820) * 2.03, t, t + 0.08), gb = ctx.createGain();
    struck(gb, t, v * 0.1, 0.0005, 0.011, null);
    b.connect(gb).connect(out);
    const n = noise(E, t, t + 0.03), bp = biquad(ctx, 'bandpass', 3000, 2), gn = ctx.createGain();
    struck(gn, t, v * 0.16, 0.0005, 0.005, null);
    n.connect(bp).connect(gn).connect(out);
  };
  INST.snap = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + 0.12), bp = biquad(ctx, 'bandpass', 2400, 1.8), g = ctx.createGain();
    struck(g, t, v * 0.55, 0.0006, 0.02, null);
    n.connect(bp).connect(g).connect(out);
  };
  INST.crash = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, dec = o.decay || 0.9;
    const n = noise(E, t, t + dec * 6), hp = biquad(ctx, 'highpass', 4200), lp = biquad(ctx, 'lowpass', 12000), g = ctx.createGain();
    struck(g, t, v * 0.2, 0.004, dec, null);
    n.connect(hp).connect(lp).connect(g).connect(out);
  };
  INST.swell = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + d + 0.1), hp = biquad(ctx, 'highpass', 1500), g = ctx.createGain();
    hp.frequency.setValueAtTime(1200, t);
    hp.frequency.exponentialRampToValueAtTime(7000, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.2, t + d);
    g.gain.linearRampToValueAtTime(0, t + d + 0.05);
    n.connect(hp).connect(g).connect(out);
  };
  INST.riser = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + d + 0.1), bp = biquad(ctx, 'bandpass', 400, 1.6), g = ctx.createGain();
    bp.frequency.setValueAtTime(350, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.26, t + d);
    g.gain.linearRampToValueAtTime(0, t + d + 0.04);
    n.connect(bp).connect(g).connect(out);
  };
  INST.tom = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = m ? mtof(m) : 120;
    const x = osc(ctx, 'sine', f, t, t + 0.8);
    x.frequency.setValueAtTime(f * 1.25, t);
    x.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.18);
    const g = ctx.createGain();
    struck(g, t, v * 0.55, 0.002, 0.17, null);
    x.connect(g).connect(out);
  };
  INST.conga = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = m ? mtof(m) : 240;
    const x = osc(ctx, 'sine', f, t, t + 0.6);
    x.frequency.setValueAtTime(f * 1.08, t);
    x.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const g = ctx.createGain();
    struck(g, t, v * 0.45, 0.001, 0.12, null);
    x.connect(g).connect(out);
    const n = noise(E, t, t + 0.03), bp = biquad(ctx, 'bandpass', 1600, 1.4), gn = ctx.createGain();
    struck(gn, t, v * 0.1, 0.0005, 0.006, null);
    n.connect(bp).connect(gn).connect(out);
  };
  // Water drop: a tuned "plink" that rises into pitch.
  INST.drop = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m || 84);
    const x = osc(ctx, 'sine', f, t, t + 0.5);
    x.frequency.setValueAtTime(f * 0.55, t);
    x.frequency.exponentialRampToValueAtTime(f * 1.18, t + 0.045);
    const g = ctx.createGain();
    struck(g, t, v * 0.34, 0.001, 0.055, null);
    x.connect(g).connect(out);
  };
  // Bubble: a quick upward blip.
  INST.bubble = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m || 84);
    const x = osc(ctx, 'sine', f, t, t + 0.3);
    x.frequency.setValueAtTime(f, t);
    x.frequency.exponentialRampToValueAtTime(f * 2.3, t + 0.06);
    const g = ctx.createGain();
    struck(g, t, v * 0.24, 0.002, 0.035, null);
    x.connect(g).connect(out);
  };
  // Dolphin-ish whistle: a playful pitch path with a fast flutter.
  INST.whistle = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx, f = mtof(m || 91), end = t + d;
    const x = osc(ctx, 'sine', f, t, end + 0.1);
    const path = o.path || [1, 1.3, 0.92, 1.45, 1.1];
    x.frequency.setValueAtTime(f * path[0], t);
    path.forEach((r, i) => { if (i) x.frequency.exponentialRampToValueAtTime(f * r, t + (d * i) / (path.length - 1)); });
    const l = osc(ctx, 'sine', 34, t, end + 0.1), lg = gainNode(ctx, f * 0.02);
    l.connect(lg).connect(x.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.12, t + 0.04);
    g.gain.setValueAtTime(v * 0.12, end - 0.06);
    g.gain.linearRampToValueAtTime(0, end);
    x.connect(g).connect(out);
  };
  // Ocean wash and wind: filtered noise that breathes over the note length.
  INST.ocean = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + d + 0.2), lp = biquad(ctx, 'lowpass', 500, 0.5), g = ctx.createGain();
    lp.frequency.setValueAtTime(o.lo || 350, t);
    lp.frequency.linearRampToValueAtTime(o.hi || 1400, t + d * 0.45);
    lp.frequency.linearRampToValueAtTime(o.lo || 350, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.3, t + d * 0.45);
    g.gain.linearRampToValueAtTime(0, t + d);
    n.connect(lp).connect(g).connect(out);
  };
  INST.wind = (E, t, m, d, v, o, out) => {
    const ctx = E.ctx;
    const n = noise(E, t, t + d + 0.2), bp = biquad(ctx, 'bandpass', 600, 2.2), g = ctx.createGain();
    bp.frequency.setValueAtTime(o.lo || 450, t);
    bp.frequency.exponentialRampToValueAtTime(o.hi || 1500, t + d * 0.5);
    bp.frequency.exponentialRampToValueAtTime(o.lo || 450, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.28, t + d * 0.5);
    g.gain.linearRampToValueAtTime(0, t + d);
    n.connect(bp).connect(g).connect(out);
  };

  // ================================================================ engine graph
  function makeNoise(ctx) {
    const rnd = U.seeded(7);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    return buf;
  }
  function makeImpulse(ctx, secs, decay) {
    const rnd = U.seeded(11);
    const rate = ctx.sampleRate, len = Math.floor(rate * secs);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const x = i / len;
        const env = Math.pow(1 - x, decay) * Math.min(1, i / (rate * 0.004));
        lp += (rnd() * 2 - 1 - lp) * (0.18 + 0.75 * (1 - x));
        d[i] = lp * env;
      }
    }
    return buf;
  }
  function driveCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
    return c;
  }
  const EQ_BANDS = [[60, 'lowshelf'], [250, 'peaking'], [1000, 'peaking'], [4000, 'peaking'], [12000, 'highshelf']];

  function buildEngine(ctx, dest, o) {
    o = o || {};
    const E = { ctx, rnd: U.seeded(99) };
    E.noise = makeNoise(ctx);
    E.mix = gainNode(ctx, 0.8);
    E.comp = ctx.createDynamicsCompressor();
    E.comp.threshold.value = -14;
    E.comp.knee.value = 10;
    E.comp.ratio.value = 2.6;
    E.comp.attack.value = 0.012;
    E.comp.release.value = 0.22;
    E.eqIn = gainNode(ctx, 1);
    E.eq = EQ_BANDS.map(([f, type]) => { const b = biquad(ctx, type, f, 0.9); b.gain.value = 0; return b; });
    E.fade = gainNode(ctx, 1);
    E.vol = gainNode(ctx, o.volume == null ? 1 : o.volume);
    E.analyser = ctx.createAnalyser();
    E.analyser.fftSize = 2048;
    E.analyser.smoothingTimeConstant = 0.78;
    E.analyser.minDecibels = -96;
    E.analyser.maxDecibels = -22;
    E.mute = gainNode(ctx, o.muted ? 0 : 1);
    E.mix.connect(E.comp).connect(E.eqIn);
    let n = E.eqIn;
    E.eq.forEach((b) => { n.connect(b); n = b; });
    n.connect(E.fade).connect(E.vol).connect(E.analyser).connect(E.mute).connect(dest);
    E.fileIn = gainNode(ctx, 1);
    E.fileIn.connect(E.eqIn);
    // Reverb: generated hall with a pre-delay and a darker, low-cut return.
    E.revIn = gainNode(ctx, 1);
    const rhp = biquad(ctx, 'highpass', 220), pre = ctx.createDelay(0.1), conv = ctx.createConvolver(), rlp = biquad(ctx, 'lowpass', 6800), rout = gainNode(ctx, 0.85);
    pre.delayTime.value = 0.022;
    conv.buffer = makeImpulse(ctx, 3.4, 3.1);
    E.revIn.connect(rhp).connect(pre).connect(conv).connect(rlp).connect(rout).connect(E.mix);
    // Ping-pong delay with a darkening feedback loop.
    E.dlyIn = gainNode(ctx, 1);
    E.d1 = ctx.createDelay(2);
    E.d2 = ctx.createDelay(2);
    E.d1.delayTime.value = E.d2.delayTime.value = 0.375;
    const fb = gainNode(ctx, 0.36), dlp = biquad(ctx, 'lowpass', 3600), dhp = biquad(ctx, 'highpass', 300);
    const pl = ctx.createStereoPanner(), pr = ctx.createStereoPanner(), dout = gainNode(ctx, 0.6);
    pl.pan.value = -0.65;
    pr.pan.value = 0.65;
    E.dlyIn.connect(dhp).connect(E.d1);
    E.d1.connect(E.d2);
    E.d2.connect(dlp).connect(fb).connect(E.d1);
    E.d1.connect(pl).connect(dout);
    E.d2.connect(pr).connect(dout);
    dout.connect(E.mix);
    return E;
  }

  function makeChannel(E, S, name, cfg, t) {
    const ctx = E.ctx;
    const inst = INST[cfg.inst || name];
    if (!inst) throw new Error('Aerium music: unknown instrument ' + (cfg.inst || name));
    const input = gainNode(ctx, cfg.gain == null ? 0.5 : cfg.gain);
    const c = { name, cfg, input, inst, o: cfg.o || null };
    let node = input;
    const lfo = (rate, depth, param) => {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const lg = gainNode(ctx, depth);
      l.connect(lg).connect(param);
      l.start(t);
      S.lfos.push(l);
    };
    if (cfg.drive) { const ws = ctx.createWaveShaper(); ws.curve = driveCurve(cfg.drive); node.connect(ws); node = ws; }
    if (cfg.hp) { const hp = biquad(ctx, 'highpass', cfg.hp, 0.7); node.connect(hp); node = hp; }
    if (cfg.lp != null) { const lp = biquad(ctx, 'lowpass', cfg.lp, cfg.q || 0.7); node.connect(lp); node = lp; c.filter = lp; }
    if (cfg.trem) { const tg = gainNode(ctx, 1 - cfg.trem[1] / 2); lfo(cfg.trem[0], cfg.trem[1] / 2, tg.gain); node.connect(tg); node = tg; }
    if (cfg.duck) { const dg = gainNode(ctx, 1); node.connect(dg); node = dg; c.duck = dg; }
    if (cfg.chorus) {
      const sum = gainNode(ctx, 1), dl = ctx.createDelay(0.05), wet = gainNode(ctx, cfg.chorus), wp = ctx.createStereoPanner();
      dl.delayTime.value = 0.013;
      wp.pan.value = -(cfg.pan || 0) * 1.5 + 0.35;
      lfo(0.7, 0.0032, dl.delayTime);
      node.connect(sum);
      node.connect(dl).connect(wet).connect(wp).connect(sum);
      node = sum;
    }
    const pan = ctx.createStereoPanner();
    pan.pan.value = cfg.pan || 0;
    if (cfg.autopan) lfo(cfg.autopanRate || 0.23, cfg.autopan, pan.pan);
    node.connect(pan);
    c.panner = pan;
    pan.connect(S.out);
    if (cfg.rev) pan.connect(gainNode(ctx, cfg.rev)).connect(S.rev);
    if (cfg.dly) pan.connect(gainNode(ctx, cfg.dly)).connect(S.dly);
    return c;
  }

  function createSession(E, track, from, o) {
    const ctx = E.ctx, C = compile(track);
    const now = o.at != null ? o.at : ctx.currentTime + 0.06;
    const S = {
      track, C, E, loop: !!o.loop, from,
      out: gainNode(ctx, track.gain == null ? 1 : track.gain), rev: gainNode(ctx, 1), dly: gainNode(ctx, 1),
      ch: {}, lfos: [], base: now - from, segs: [{ at: -1, base: now - from }], idx: lowerBound(C.events, from), start: now,
    };
    S.out.connect(E.mix);
    S.rev.connect(E.revIn);
    S.dly.connect(E.dlyIn);
    Object.keys(track.mix).forEach((name) => { S.ch[name] = makeChannel(E, S, name, track.mix[name], now); });
    E.d1.delayTime.setValueAtTime(C.delay, now);
    E.d2.delayTime.setValueAtTime(C.delay, now);
    if (from > 0) catchUp(S, from, now);
    return S;
  }
  // When starting mid-song, restore automation and resume long notes already sounding.
  function catchUp(S, from, now) {
    const ev = S.C.events, last = {};
    for (let i = 0; i < S.idx; i++) { const e = ev[i]; if (e.auto && e.param !== 'duck') last[e.ch + '|' + e.param] = e; }
    Object.keys(last).forEach((k) => trigger(S, Object.assign({}, last[k], { ramp: 0 }), now));
    for (let i = S.idx - 1; i >= 0; i--) {
      const e = ev[i];
      if (from - e.t > 24) break;
      if (e.auto || e.t + e.d < from + 0.3 || e.d < 1.5) continue;
      const inst = (S.track.mix[e.ch] || EMPTY).inst || e.ch;
      if (inst !== 'pad' && inst !== 'sub' && inst !== 'ocean' && inst !== 'wind') continue;
      trigger(S, Object.assign({}, e, { d: e.t + e.d - from, o: Object.assign({}, e.o, { attack: 0.25 }) }), now);
    }
  }
  function lowerBound(ev, t) {
    let lo = 0, hi = ev.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ev[mid].t < t) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function trigger(S, e, when) {
    const ch = S.ch[e.ch];
    if (!ch) return;
    if (e.auto) { automate(ch, e, when); return; }
    const o = e.o ? (ch.o ? Object.assign({}, ch.o, e.o) : e.o) : ch.o || EMPTY;
    ch.inst(S.E, when, e.n, e.d, e.v, o, ch.input);
  }
  function automate(ch, e, when) {
    if (e.param === 'duck') {
      if (!ch.duck) return;
      const p = ch.duck.gain;
      p.setValueAtTime(1, when);
      p.linearRampToValueAtTime(1 - e.value, when + 0.012);
      p.linearRampToValueAtTime(1, when + Math.max(0.05, e.ramp));
      return;
    }
    const p = e.param === 'cutoff' ? ch.filter && ch.filter.frequency : e.param === 'gain' ? ch.input.gain : e.param === 'pan' ? ch.panner.pan : null;
    if (!p) return;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(when); else p.cancelScheduledValues(when);
    if (e.ramp > 0) p.setTargetAtTime(e.value, when, e.ramp / 4);
    else p.setValueAtTime(e.value, when);
  }
  function killSession(S, fade) {
    if (!S || S.dead) return;
    S.dead = true;
    const ctx = S.E.ctx, t = ctx.currentTime;
    [S.out, S.rev, S.dly].forEach((g) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + (fade || 0.04)); });
    setTimeout(() => {
      S.lfos.forEach((l) => { try { l.stop(); } catch (e) { /* already stopped */ } });
      [S.out, S.rev, S.dly].forEach((g) => { try { g.disconnect(); } catch (e) { /* ignore */ } });
      Object.keys(S.ch).forEach((k) => { try { S.ch[k].input.disconnect(); } catch (e) { /* ignore */ } });
    }, ((fade || 0.04) + 0.15) * 1000);
  }

  // ================================================================ tracks
  const TRACKS = [];
  const HIDDEN = [];
  function track(def) {
    const meta = {
      id: def.id, title: def.title, artist: def.artist, album: def.album, genre: def.genre, year: def.year,
      bpm: def.bpm, color: def.color, no: def.no || 1, loop: !!def.loopable,
    };
    Object.defineProperty(meta, 'duration', { enumerable: true, get: () => compile(def).duration });
    Object.defineProperty(meta, '_def', { value: def });
    (def.hidden ? HIDDEN : TRACKS).push(meta);
    return meta;
  }

  // Shared rhythm vocabulary
  const BOSSA_KICK = 'x.....x.x.....x.';
  const BOSSA_RIM = 'x.....x.....x...|....x.....x.....';
  const BOSSA_BASS = '1-----5-5-----1-';
  const SHAKE16 = 'ogXgogXgogXgogXg';

  // ---------------------------------------------------------------- Bubble Garden
  track({
    id: 'bubble-garden', no: 1, title: 'Bubble Garden', artist: 'Crystal Lagoon', album: 'Clear Skies', genre: 'Bossa Lounge', year: 2007,
    bpm: 120, color: '#2fb6e6', swing: 0.12, tail: 3.4, gain: 1.05,
    mix: {
      ep: { inst: 'ep', gain: 0.24, pan: -0.2, rev: 0.16, chorus: 0.4, autopan: 0.18 },
      vib: { inst: 'vibes', gain: 0.46, pan: 0.24, rev: 0.26, dly: 0.1, trem: [5.3, 0.32] },
      flute: { inst: 'flute', gain: 0.66, pan: 0.04, rev: 0.28, dly: 0.12 },
      bass: { inst: 'bass', gain: 0.62, o: { bright: 5, sub: 0.9 } },
      pad: { inst: 'pad', gain: 0.22, rev: 0.45, o: { wave: 'soft', attack: 1.6, release: 2.4, cutoff: 600, cutoffEnd: 1900 } },
      kick: { inst: 'kick', gain: 0.5, o: { f0: 105, f1: 48, decay: 0.26, click: 0.3 } },
      rim: { inst: 'rim', gain: 0.4, pan: 0.18, rev: 0.12 },
      shk: { inst: 'shaker', gain: 0.32, pan: -0.34, rev: 0.05 },
      conga: { inst: 'conga', gain: 0.32, pan: -0.45, rev: 0.12 },
      bub: { inst: 'bubble', gain: 0.34, rev: 0.4, dly: 0.25 },
      bell: { inst: 'bell', gain: 0.24, pan: 0.1, rev: 0.5, dly: 0.2, o: { ratio: 3.5, index: 1.3, decay: 2.2 } },
    },
    write(s) {
      const A1 = 'Fmaj9 | Bbmaj9 | Am9 | D9 | Gm9 | C13sus4 C13 | Am7 D7b9 | Gm9 C13sus4';
      const A2 = 'Fmaj9 | Bbmaj9 | Am9 | D9 | Gm9 | C13sus4 C13 | Fmaj9 | Fmaj9';
      const B = 'Bbmaj9 | Bbm6 | Am9 | Abdim7 | Gm9 | C7b9 | Fmaj9 | C13sus4';
      const MA = 'r:.5 a4:.5 c5:.5 e5:.5 g5:1.5 f5:.5 | e5:1 d5:.5 c5:2.5 | r:.5 e5:.5 g5:.5 b5:.5 a5:1.5 g5:.5 | f#5:1 e5:.5 d5:2.5 | r:.5 d5:.5 f5:.5 a5:.5 bb5:1.5 a5:.5 | g5:1 f5:.5 d5:.5 e5:1 c5:1 | c5:1 e5:.5 g5:.5 f#5:1 eb5:1 | d5:1.5 bb4:.5 c5:2';
      const MA2 = 'r:.5 a4:.5 c5:.5 e5:.5 g5:1.5 f5:.5 | e5:1 d5:.5 c5:2.5 | r:.5 e5:.5 g5:.5 b5:.5 a5:1.5 g5:.5 | f#5:1 e5:.5 d5:2.5 | r:.5 d5:.5 f5:.5 a5:.5 bb5:1.5 a5:.5 | g5:1 a5:.5 bb5:.5 a5:1 g5:1 | a5:1.5 g5:.5 f5:.5 e5:.5 f5:1 | f5:3 r:1';
      const MB = 'd5:1.5 f5:.5 a5:2 | g5:1.5 f5:.5 db5:2 | c5:1.5 e5:.5 g5:2 | f5:1.5 d5:.5 b4:2 | bb4:.5 d5:.5 f5:.5 a5:.5 bb5:2 | bb5:.5 a5:.5 g5:.5 e5:.5 db5:1.5 c5:.5 | c5:.5 a4:.5 c5:.5 e5:.5 g5:2 | f5:1.5 g5:.5 a5:2';
      const groove = (x, o) => {
        o = o || {};
        x.drum('kick', BOSSA_KICK, { vel: o.kick || 0.72 });
        x.drum('rim', BOSSA_RIM, { vel: 0.82 });
        x.drum('shk', SHAKE16, { vel: 0.85 });
        x.bass('bass', BOSSA_BASS, { vel: 0.88 });
        x.comp('ep', 'x-----x-----x---|....x-----x-----', { lo: 'E3', hi: 'D5', vel: o.ep || 0.55 });
        if (o.conga) x.drum('conga', '......x.x.....x.|..x...x.x...x.x.', { vel: 0.7, n: 'D4' });
      };
      s.section('intro', 'Fmaj9 | Bbmaj9 | Fmaj9 | Bbmaj9', (x) => {
        x.arp('vib', { pattern: '0 1 2 3 4 3 2 1', rate: 0.5, lo: 'F4', hi: 'A5', n: 5, vel: 0.55 });
        x.drum('shk', SHAKE16, { from: 2, vel: 0.7 });
        x.drum('rim', BOSSA_RIM, { from: 2, vel: 0.7 });
        x.bass('bass', '1-------5-------', { from: 2, vel: 0.75 });
        x.pad('pad', { lo: 'A3', hi: 'E5', vel: 0.5 });
        x.sprinkle('bub', { per: [1, 3], lo: 'C6', hi: 'C7', vel: [0.4, 0.8] });
      });
      s.section('A1', A1, (x) => {
        groove(x);
        x.respond('vib', x.mel('flute', MA, { vel: 0.8, scoop: 0.3 }), { lo: 'F4', hi: 'F5', vel: 0.5 });
      });
      s.section('A2', A2, (x) => {
        groove(x, { conga: true });
        x.respond('vib', x.mel('flute', MA2, { vel: 0.82, scoop: 0.3 }), { lo: 'F4', hi: 'F5', vel: 0.52 });
        x.hit('bell', 28, { n: 'C6', v: 0.5, d: 4 });
      });
      s.section('B1', B, (x) => {
        groove(x, { kick: 0.55, ep: 0.45 });
        x.mel('vib', MB, { vel: 0.72 });
        x.pad('pad', { lo: 'F3', hi: 'D5', vel: 0.55 });
        x.sprinkle('bub', { per: [0, 1], lo: 'F6', hi: 'F7', vel: [0.3, 0.5], from: 6 });
      });
      s.section('A3', A1, (x) => {
        groove(x, { conga: true });
        x.mel('flute', MA, { vel: 0.84, scoop: 0.3, harm: 'vib', harmVel: 0.55 });
      });
      s.section('breakdown', A1, (x) => {
        x.drum('shk', SHAKE16, { vel: 0.55 });
        x.drum('rim', BOSSA_RIM, { from: 4, vel: 0.6 });
        x.drum('kick', BOSSA_KICK, { from: 6, vel: 0.5 });
        x.bass('bass', '1---------------', { vel: 0.7 });
        x.comp('ep', 'x---------------', { lo: 'E3', hi: 'D5', vel: 0.45 });
        x.arp('vib', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'A4', hi: 'C6', n: 5, vel: 0.4 });
        x.sprinkle('bub', { per: [1, 2], lo: 'C6', hi: 'C7', vel: [0.35, 0.7] });
        x.hit('bell', 0, { n: 'A5', v: 0.4, d: 4 });
        x.hit('bell', 16, { n: 'D6', v: 0.35, d: 4 });
      });
      s.section('B2', B, (x) => {
        groove(x, { conga: true });
        x.mel('flute', MB, { vel: 0.84, scoop: 0.25, harm: 'vib', harmVel: 0.5 });
        x.pad('pad', { lo: 'F3', hi: 'D5', vel: 0.55 });
      });
      s.section('A4', A2, (x) => {
        groove(x, { conga: true });
        x.respond('vib', x.mel('flute', MA2, { vel: 0.84, scoop: 0.3 }), { lo: 'F4', hi: 'F5', vel: 0.5 });
      });
      s.section('outro', 'Fmaj9 | Bbmaj9 | Fmaj9 | Bbmaj9 | Fmaj9 | Fmaj9', (x) => {
        x.drum('shk', SHAKE16, { to: 4, vel: 0.7 });
        x.drum('rim', BOSSA_RIM, { to: 4, vel: 0.7 });
        x.drum('kick', BOSSA_KICK, { to: 2, vel: 0.6 });
        x.bass('bass', BOSSA_BASS, { to: 4, vel: 0.8 });
        x.note('bass', 16, 'F1', 7, 0.8);
        x.comp('ep', 'x-----x-----x---|....x-----x-----', { lo: 'E3', hi: 'D5', vel: 0.5, to: 4 });
        x.comp('ep', 'x---------------', { lo: 'E3', hi: 'D5', vel: 0.5, from: 4, to: 5, gate: 1.8 });
        x.mel('flute', 'r:.5 a4:.5 c5:.5 e5:.5 g5:2 | r:.5 f5:.5 e5:.5 d5:.5 c5:2 | r:.5 a4:.5 c5:.5 e5:.5 g5:1.5 a5:.5 | f5:2 g5:2 | a5:4 | r:4', { vel: 0.78 });
        x.pad('pad', { lo: 'A3', hi: 'E5', vel: 0.5, from: 2 });
        x.arp('vib', { pattern: '0 1 2 3 4 5 6 7', rate: 0.25, lo: 'F4', hi: 'C6', n: 5, vel: 0.45, from: 4, to: 5 });
        x.sprinkle('bub', { per: [1, 2], lo: 'C6', hi: 'C7', vel: [0.3, 0.6], from: 2 });
        x.hit('bell', 16, { n: 'F6', v: 0.45, d: 6 });
        x.hit('bell', 16.5, { n: 'C6', v: 0.35, d: 6 });
        x.ritard(3, 5, 0.82);
      });
    },
  });

  // ---------------------------------------------------------------- Escalator Sunrise
  track({
    id: 'sky-mall', no: 1, title: 'Escalator Sunrise', artist: 'Sky Mall Orchestra', album: 'Upper Level', genre: 'Easy Listening', year: 2006,
    bpm: 100, color: '#ff9f6b', swing: 0.14, tail: 3.2, gain: 1,
    mix: {
      ep: { inst: 'ep', gain: 0.3, pan: -0.12, rev: 0.2, chorus: 0.5, autopan: 0.15, o: { bright: 1.35 } },
      eplead: { inst: 'ep', gain: 0.42, pan: 0.08, rev: 0.25, dly: 0.14, chorus: 0.3, o: { bright: 1.5 } },
      chime: { inst: 'bell', gain: 0.34, pan: 0.18, rev: 0.34, dly: 0.16, o: { ratio: 2, index: 1.1, decay: 1.3 } },
      glock: { inst: 'glock', gain: 0.4, pan: -0.25, rev: 0.3, dly: 0.12 },
      flute: { inst: 'flute', gain: 0.6, pan: 0.05, rev: 0.32, dly: 0.14, o: { breath: 1.4, tone: 2200 } },
      bass: { inst: 'bass', gain: 0.56, o: { bright: 9, slap: true, decay: 0.28 } },
      pad: { inst: 'pad', gain: 0.24, rev: 0.4, o: { wave: 'strings', attack: 1.1, release: 1.8, cutoff: 900, cutoffEnd: 2800 } },
      kick: { inst: 'kick', gain: 0.58, o: { f0: 130, f1: 50, decay: 0.3 } },
      snare: { inst: 'snare', gain: 0.4, pan: 0.05, rev: 0.34, o: { tone: 2000, decay: 0.1 } },
      snap: { inst: 'snap', gain: 0.36, pan: -0.15, rev: 0.3 },
      hat: { inst: 'hat', gain: 0.3, pan: 0.28 },
      tamb: { inst: 'tamb', gain: 0.26, pan: -0.3, rev: 0.1 },
      crash: { inst: 'crash', gain: 0.3, pan: 0.2, rev: 0.2 },
      pa: { inst: 'bell', gain: 0.36, rev: 0.45, dly: 0.1, o: { ratio: 2, index: 0.8, decay: 1.8 } },
    },
    write(s) {
      const VERSE = 'Dmaj7 | F#m7 | Gmaj7 | Gmaj7/A | Dmaj7 | F#m7 Bm7 | Em9 | A13sus4 A13';
      const CHORUS = 'Gmaj9 | A/G | F#m7 | Bm9 | Em9 | F#m7 | Gmaj9 | A13sus4';
      const MV = 'r:1 a4:.5 d5:.5 f#5:1 e5:1 | c#5:3 r:1 | r:1 b4:.5 d5:.5 f#5:1 e5:1 | d5:3 r:1 | r:.5 f#5:.5 a5:.5 c#6:.5 b5:1 a5:1 | a5:1 f#5:1 f#5:.5 d5:.5 b4:1 | r:.5 g4:.5 b4:.5 d5:.5 f#5:1 e5:1 | d5:1.5 e5:.5 c#5:2';
      const MV2 = 'r:1 a4:.5 d5:.5 f#5:1 a5:1 | c#6:2 b5:1 a5:1 | r:1 b4:.5 d5:.5 f#5:1 g5:1 | a5:3 r:1 | r:.5 f#5:.5 a5:.5 c#6:.5 e6:1 d6:1 | c#6:1 a5:1 b5:.5 a5:.5 f#5:1 | r:.5 g5:.5 f#5:.5 e5:.5 d5:1 b4:1 | d5:1.5 e5:.5 e5:2';
      const MC = 'd5:.5 e5:.5 f#5:.5 a5:1 b5:.5 a5:1 | c#6:1 b5:.5 a5:2.5 | c#5:.5 e5:.5 f#5:.5 a5:1 c#6:.5 b5:1 | a5:.5 f#5:.5 d5:3 | g5:.5 f#5:.5 e5:.5 b5:1 a5:.5 g5:1 | a5:.5 f#5:.5 e5:.5 c#5:2.5 | d5:.5 e5:.5 f#5:.5 a5:1 b5:.5 d6:1 | e6:2 d6:.5 c#6:.5 b5:1';
      const MBR = 'd5:1.5 f5:.5 a5:1 c6:1 | e5:1.5 g5:.5 c6:2 | e5:1 g5:.5 b5:.5 a5:1 g5:1 | g5:1.5 a5:.5 f#5:2 | d5:.5 e5:.5 f#5:.5 a5:.5 b5:2 | a5:1.5 f#5:.5 c#5:2 | e5:.5 f#5:.5 g5:.5 b5:.5 d6:2 | e6:1.5 c#6:.5 d#6:2';
      const KICK = 'x.....x.x.......|x.....x.x.....x.';
      const BASS = '1-.o..1-1-5.o.g>|1-.o..1-1-5.o.7.';
      const drums = (x, o) => {
        o = o || {};
        const r = { from: o.from, to: o.to };
        x.drum('kick', KICK, Object.assign({ vel: 0.8 }, r));
        if (o.snap) x.drum('snap', '....x.......x...', Object.assign({ vel: 0.8 }, r));
        else x.drum('snare', '....x.......x...', Object.assign({ vel: 0.85, fill: o.fill ? '....x.......x.oo' : null }, r));
        x.drum('hat', o.busy ? 'xgxgXgxgxgxgXgxg' : 'x.o.X.o.x.o.X.o.', Object.assign({ vel: 0.75 }, r));
        if (o.tamb) x.drum('tamb', 'g.g.x.g.g.g.x.g.', Object.assign({ vel: 0.8 }, r));
      };
      const rise = (x, b, key) => {
        const notes = key === 'E' ? ['E5', 'G#5', 'B5', 'E6', 'G#6', 'B6'] : ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'];
        notes.forEach((n, i) => x.note('glock', b + i * 0.25, n, 0.5, 0.45 + i * 0.05));
      };
      s.section('intro', 'Dmaj9 | Gmaj7/A | Dmaj9 | Gmaj7/A', (x) => {
        ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => x.note('pa', i * 0.75, n, 2.5, 0.55 + i * 0.08));
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.5, from: 1 });
        x.comp('ep', 'x-------..x-----', { lo: 'F#3', hi: 'E5', vel: 0.45, from: 1 });
        drums(x, { snap: true, from: 2 });
        x.bass('bass', BASS, { from: 2, vel: 0.8 });
        rise(x, 14.5);
        x.hit('crash', 16, { v: 0.6, d: 2 });
      });
      s.section('verse1', VERSE, (x) => {
        x.drum('kick', KICK, { vel: 0.8 });
        x.drum('snap', '....x.......x...', { vel: 0.8 });
        x.drum('hat', 'x.o.X.o.x.o.X.o.', { vel: 0.7 });
        x.bass('bass', BASS, { vel: 0.85 });
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.5 });
        x.mel('eplead', MV, { vel: 0.72 });
      });
      s.section('chorus1', CHORUS, (x) => {
        drums(x, { tamb: true, fill: true });
        x.bass('bass', BASS, { vel: 0.9 });
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.45 });
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.55 });
        x.mel('chime', MC, { vel: 0.72 });
        x.mel('eplead', MC, { vel: 0.4, oct: -1 });
        x.hit('crash', 0, { v: 0.7, d: 2 });
        rise(x, 30.5);
      });
      s.section('verse2', VERSE, (x) => {
        x.drum('kick', KICK, { vel: 0.8 });
        x.drum('snare', '....x.......x...', { vel: 0.7 });
        x.drum('hat', 'xgxgXgxgxgxgXgxg', { vel: 0.7 });
        x.bass('bass', BASS, { vel: 0.85 });
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.5 });
        x.respond('glock', x.mel('eplead', MV2, { vel: 0.74 }), { lo: 'A5', hi: 'A6', vel: 0.4 });
      });
      s.section('chorus2', CHORUS, (x) => {
        drums(x, { tamb: true, busy: true, fill: true });
        x.bass('bass', BASS, { vel: 0.9 });
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.45 });
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.55 });
        x.mel('chime', MC, { vel: 0.74, harm: 'glock', harmVel: 0.5 });
        x.mel('eplead', MC, { vel: 0.4, oct: -1 });
        x.hit('crash', 0, { v: 0.7, d: 2 });
      });
      s.section('bridge', 'Bbmaj9 | C/Bb | Am9 | D7sus4 D7 | Gmaj9 | F#m7 | Em9 | B7sus4 B7', (x) => {
        x.drum('kick', 'x.......x.......', { vel: 0.7 });
        x.drum('snap', '....x.......x...', { vel: 0.7 });
        x.drum('hat', 'x.o.x.o.x.o.x.o.', { vel: 0.55 });
        x.bass('bass', '1-------5---1-a-', { vel: 0.8 });
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.6 });
        x.comp('ep', '..x-..x-..x-..x-', { lo: 'F#3', hi: 'E5', vel: 0.4 });
        x.mel('flute', MBR, { vel: 0.82, scoop: 0.35 });
        rise(x, 30.5, 'E');
        x.drum('snare', '................|................|................|................|................|................|................|........x.x.xxXX', { vel: 0.6 });
      });
      s.section('chorusE', CHORUS, (x) => {
        drums(x, { tamb: true, busy: true });
        x.bass('bass', BASS, { vel: 0.92 });
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.45 });
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.6 });
        x.mel('chime', MC, { vel: 0.78, harm: 'glock', harmVel: 0.5 });
        x.mel('eplead', MC, { vel: 0.42, oct: -1 });
        x.hit('crash', 0, { v: 0.8, d: 2 });
      }, { transpose: 2 });
      s.section('outro', 'Emaj9 | Amaj7/B | Emaj9 | Amaj7/B | Emaj9 | Emaj9', (x) => {
        drums(x, { tamb: true, to: 4 });
        x.bass('bass', BASS, { vel: 0.85, to: 4 });
        x.note('bass', 16, 'E1', 6, 0.85);
        x.comp('ep', 'x-----x---x-----|x-------x-x-----', { lo: 'F#3', hi: 'E5', vel: 0.45, to: 4 });
        x.comp('ep', 'x---------------', { lo: 'F#3', hi: 'E5', vel: 0.5, from: 4, to: 5, gate: 1.8 });
        x.pad('pad', { lo: 'D3', hi: 'E5', vel: 0.55 });
        x.mel('chime', 'e5:.5 f#5:.5 g#5:.5 b5:1 c#6:.5 b5:1 | c#6:1 b5:.5 g#5:2.5 | e5:.5 f#5:.5 g#5:.5 b5:1 c#6:.5 e6:1 | f#6:2 e6:2 | e6:4 | r:4', { vel: 0.74 });
        rise(x, 14.5, 'E');
        x.hit('crash', 16, { v: 0.6, d: 3 });
        ['E5', 'G#5', 'B5', 'E6'].forEach((n, i) => x.note('pa', 17 + i * 0.75, n, 3, 0.5 + i * 0.06));
        x.ritard(3, 5, 0.8);
      });
    },
  });

  // ---------------------------------------------------------------- Aurora Drift
  track({
    id: 'aurora-drift', no: 1, title: 'Aurora Drift', artist: 'Aqua Pura', album: 'Northern Water', genre: 'Ambient', year: 2008,
    bpm: 70, color: '#3ee6a0', swing: 0, tail: 6, gain: 1.15, delayBeats: 0.75,
    mix: {
      pad: { inst: 'pad', gain: 0.34, rev: 0.6, lp: 3200, o: { wave: 'warm', attack: 3, release: 4, cutoff: 500, cutoffEnd: 1700, lfo: 0.07, lfoDepth: 0.35 } },
      glass: { inst: 'pad', gain: 0.2, pan: 0.1, rev: 0.7, o: { wave: 'glass', attack: 2.5, release: 4, cutoff: 1500, cutoffEnd: 4200, lfo: 0.11 } },
      bell: { inst: 'bell', gain: 0.3, pan: 0.2, rev: 0.6, dly: 0.34, o: { ratio: 3.5, index: 1.6, decay: 2.6 } },
      bell2: { inst: 'bell', gain: 0.24, pan: -0.3, rev: 0.6, dly: 0.3, o: { ratio: 2, index: 1, decay: 2.2 } },
      pulse: { inst: 'pluck', gain: 0.28, pan: -0.1, rev: 0.3, dly: 0.34, lp: 1500, o: { wave: 'triangle', cut: 1800, q: 3, decay: 0.2 } },
      lead: { inst: 'flute', gain: 0.54, pan: 0.02, rev: 0.55, dly: 0.2, o: { breath: 0.4, tone: 1700, vib: 4.6, attack: 0.12, tri: 0.12 } },
      sub: { inst: 'sub', gain: 0.5, o: { attack: 0.3, rel: 0.5 } },
      kick: { inst: 'kick', gain: 0.4, o: { f0: 90, f1: 42, decay: 0.4, click: 0 } },
      shk: { inst: 'shaker', gain: 0.18, pan: 0.35, rev: 0.2, o: { decay: 0.03 } },
      wind: { inst: 'wind', gain: 0.4, rev: 0.4, o: { lo: 400, hi: 1600 } },
    },
    write(s) {
      const A = 'Emaj9 | Emaj9 | C#m11 | C#m11 | Amaj9 | Amaj9 | Bsus4 | Bsus4';
      const B = 'Cmaj7#11 | Cmaj7#11 | G#m7 | G#m7 | Amaj9 | F#m9 | Bsus4 | B7sus4';
      const MB = 'e5:3 f#5:1 | g5:2 b5:2 | g#5:4 | f#5:2 d#5:2 | e5:3 g#5:1 | a5:2 c#6:2 | b5:4 | a5:2 f#5:2';
      const MB2 = 'e5:1.5 f#5:.5 g5:1 b5:1 | d6:2 b5:1 f#5:1 | g#5:3 b5:1 | d#6:2 c#6:1 b5:1 | c#6:3 b5:1 | a5:2 g#5:1 f#5:1 | e5:4 | f#5:4';
      const PULSE = '0 2 1 3 2 4 3 1';
      let motifs = null;
      s.section('intro', 'Emaj9 | Emaj9 | Emaj9 | Emaj9 | Cmaj7#11 | Bsus4', (x) => {
        x.hit('wind', 0, { d: 12, v: 0.7 });
        x.hit('wind', 12, { d: 10, v: 0.5 });
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.55 });
        x.auto('pad', 'cutoff', 300, 0);
        x.auto('pad', 'cutoff', 3200, 0.1, 16);
        motifs = x.motif('bell', { from: 2, every: 2, lo: 'E5', hi: 'E7', vel: 0.5, d: 2 });
      });
      s.section('A1', A, (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.6 });
        x.motif('bell', { every: 2, lo: 'E5', hi: 'E7', vel: 0.5, d: 2, m1: motifs.m1, m2: motifs.m2 });
        x.arp('pulse', { pattern: PULSE, rate: 0.5, lo: 'E3', hi: 'B4', n: 5, vel: 0.4, accent: '1 .7 .8 .7', from: 2 });
        x.auto('pulse', 'cutoff', 500, 8);
        x.auto('pulse', 'cutoff', 1600, 8.1, 20);
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.7 });
      });
      s.section('B1', B, (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.6 });
        x.pad('glass', { lo: 'B4', hi: 'B5', n: 3, vel: 0.5 });
        x.respond('bell2', x.mel('lead', MB, { vel: 0.72 }), { lo: 'B5', hi: 'B6', vel: 0.4, min: 3 });
        x.arp('pulse', { pattern: PULSE, rate: 0.5, lo: 'E3', hi: 'B4', n: 5, vel: 0.42, accent: '1 .7 .8 .7' });
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.7 });
        x.drum('kick', 'x.......x.......', { from: 4, vel: 0.6 });
      });
      s.section('A2', A, (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.62 });
        x.pad('glass', { lo: 'B4', hi: 'B5', n: 3, vel: 0.5 });
        x.motif('bell', { every: 2, lo: 'E5', hi: 'E7', vel: 0.55, d: 2, m1: motifs.m1, m2: motifs.m2 });
        x.motif('bell2', { every: 4, lo: 'B5', hi: 'B6', vel: 0.35, d: 3, center: 0.7 });
        x.arp('pulse', { pattern: PULSE, rate: 0.5, lo: 'E3', hi: 'B4', n: 5, vel: 0.44, accent: '1 .7 .8 .7' });
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.72 });
        x.drum('kick', 'x.......x.......', { vel: 0.62 });
        x.drum('shk', 'o.x.o.x.o.x.o.x.', { vel: 0.6 });
      });
      s.section('B2', B, (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.62 });
        x.pad('glass', { lo: 'B4', hi: 'B5', n: 3, vel: 0.55 });
        x.mel('lead', MB2, { vel: 0.74 });
        x.motif('bell', { every: 2, lo: 'B5', hi: 'E7', vel: 0.4, d: 2, center: 0.6, m1: motifs.m1, m2: motifs.m2 });
        x.arp('pulse', { pattern: PULSE, rate: 0.5, lo: 'E3', hi: 'B4', n: 5, vel: 0.44, accent: '1 .7 .8 .7' });
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.72 });
        x.drum('kick', 'x.......x.......', { vel: 0.62, to: 7 });
        x.drum('shk', 'o.x.o.x.o.x.o.x.', { vel: 0.6, to: 7 });
        x.hit('wind', 24, { d: 8, v: 0.5 });
      });
      s.section('breakdown', 'C#m11 | C#m11 | Amaj9 | Bsus4', (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.55 });
        x.motif('bell', { every: 1, lo: 'E5', hi: 'E7', vel: 0.45, d: 2, m1: motifs.m1, m2: motifs.m2 });
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.6 });
      });
      s.section('end', 'Emaj9 | Emaj9 | Emaj9 | Emaj9', (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D#5', n: 4, bass: 'E2', vel: 0.62, overlap: 2 });
        x.pad('glass', { lo: 'B4', hi: 'B5', n: 3, vel: 0.55, overlap: 2 });
        x.arp('bell', { pattern: '0 1 2 3 4 5 6 7 8 9', rate: 0.5, lo: 'E5', hi: 'G#6', n: 5, vel: 0.4, gate: 3, to: 2 });
        x.note('bell2', 8, 'E6', 4, 0.4);
        x.note('bell', 10, 'B6', 4, 0.3);
        x.bass('sub', '1---------------', { lo: 'E1', vel: 0.65, to: 3 });
        x.hit('wind', 4, { d: 10, v: 0.45 });
        x.auto('pad', 'cutoff', 500, 6, 8);
        x.ritard(1, 4, 0.85);
      });
    },
  });

  // ---------------------------------------------------------------- Hydration Station
  track({
    id: 'hydration-station', no: 1, title: 'Hydration Station', artist: 'DJ Hydrate', album: 'Fresh Mix', genre: 'Electronic', year: 2007,
    bpm: 124, color: '#8fe05a', swing: 0.05, tail: 2.6, gain: 0.92, delayBeats: 0.75,
    mix: {
      kick: { inst: 'kick', gain: 0.62, o: { f0: 150, f1: 47, decay: 0.3, click: 1 } },
      clap: { inst: 'clap', gain: 0.38, rev: 0.22 },
      hat: { inst: 'hat', gain: 0.3, pan: 0.22 },
      ohat: { inst: 'hat', gain: 0.24, pan: -0.18, o: { open: true, decay: 0.09 } },
      shk: { inst: 'shaker', gain: 0.2, pan: -0.3 },
      bass: { inst: 'bass', gain: 0.5, duck: true, o: { bright: 11, q: 3.5, decay: 0.2 } },
      sub: { inst: 'sub', gain: 0.46, duck: true },
      pad: { inst: 'pad', gain: 0.24, rev: 0.35, duck: true, o: { wave: 'warm', attack: 0.4, release: 0.9, cutoff: 1400, cutoffEnd: 3800, lfo: 0.2 } },
      arp: { inst: 'pluck', gain: 0.3, pan: 0.15, rev: 0.2, dly: 0.22, lp: 5000, duck: true, o: { wave: 'square', cut: 4200, q: 7, decay: 0.11 } },
      lead: { inst: 'lead', gain: 0.4, pan: 0.02, rev: 0.22, dly: 0.2, o: { wave: 'sawtooth', cut: 5, sq: 0.4 } },
      bloop: { inst: 'bloop', gain: 0.5, pan: -0.12, rev: 0.25, dly: 0.25 },
      bub: { inst: 'bubble', gain: 0.36, rev: 0.4, dly: 0.3 },
      crash: { inst: 'crash', gain: 0.32, rev: 0.25, o: { decay: 1.1 } },
      riser: { inst: 'riser', gain: 0.4, rev: 0.3 },
      swell: { inst: 'swell', gain: 0.4, rev: 0.2 },
    },
    write(s) {
      const DROP = 'F | G | Em7 | Am7 | F | G | Em7 | Am7';
      const VERSE = 'Am9 | Fmaj9 | Cadd9 | G6 | Am9 | Fmaj9 | Cadd9 | G6';
      const MH = 'c6:.75 a5:.75 f5:.5 g5:.5 a5:.5 c6:1 | b5:.75 g5:.75 d5:.5 e5:.5 g5:.5 b5:1 | g5:.75 e5:.75 b4:.5 c5:.5 e5:.5 g5:1 | a5:.5 c6:.5 b5:.5 a5:.5 e5:2';
      const MH2 = 'c6:.75 a5:.75 f5:.5 g5:.5 a5:.5 c6:1 | b5:.75 g5:.75 d5:.5 e5:.5 g5:.5 b5:1 | g5:.75 e5:.75 b4:.5 c5:.5 e5:.5 g5:1 | a5:.5 b5:.5 c6:.5 d6:.5 e6:2';
      const MVR = 'e5:.5 a5:.5 b5:.25 c6:.75 b5:.5 a5:.5 e5:1 | f5:.5 a5:.5 c6:.25 e6:.75 c6:.5 a5:.5 g5:1 | g5:.5 c6:.5 d6:.25 e6:.75 d6:.5 c6:.5 g5:1 | d5:.5 g5:.5 a5:.25 b5:.75 a5:.5 g5:.5 e5:1';
      const ARP = '0 1 2 3 1 2 3 4 2 3 4 5 3 4 5 6';
      const FOUR = 'x...x...x...x...';
      const full = (x, o) => {
        o = o || {};
        x.drum('kick', FOUR, { vel: 0.95, to: o.to });
        x.drum('clap', '....x.......x...', { vel: 0.85, to: o.to });
        x.drum('hat', 'gxgxgxgXgxgxgxgX', { vel: 0.75, to: o.to });
        x.drum('ohat', '..x...x...x...x.', { vel: 0.7, to: o.to });
        x.bass('bass', '..1-..1-..1-..8-', { lo: 'F1', vel: 0.9, to: o.to });
        x.bass('sub', '1---------------', { lo: 'F1', vel: 0.8, to: o.to });
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.55, to: o.to });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.5, accent: '1 .6 .8 .6', to: o.to });
        ['bass', 'sub', 'pad', 'arp'].forEach((c) => x.duck(c, 0.55, { to: o.to }));
      };
      s.section('intro', DROP, (x) => {
        x.drum('kick', FOUR, { vel: 0.85 });
        x.drum('hat', 'gxgxgxgXgxgxgxgX', { vel: 0.6, from: 2 });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.5, accent: '1 .6 .8 .6' });
        x.auto('arp', 'cutoff', 350, 0);
        x.auto('arp', 'cutoff', 5000, 0.1, 30);
        x.bass('sub', '1---------------', { lo: 'F1', vel: 0.7, from: 4 });
        x.duck('arp', 0.4);
        x.duck('sub', 0.5);
        x.sprinkle('bub', { per: [1, 3], lo: 'C6', hi: 'C7', vel: [0.4, 0.8] });
      });
      s.section('build', 'F | G | Em7 | Am7', (x) => {
        x.drum('kick', FOUR, { vel: 0.9, to: 3 });
        x.drum('clap', '....x.......x...|....x.......x...|x...x...x...x...|x.x.x.x.xxxxXXXX', { vel: 0.8 });
        x.drum('hat', 'gxgxgxgXgxgxgxgX', { vel: 0.7 });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.55, accent: '1 .6 .8 .6' });
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.5 });
        x.auto('pad', 'gain', 0.05, 0);
        x.auto('pad', 'gain', 0.24, 0.1, 14);
        x.hit('riser', 0, { d: 16, v: 0.8 });
        x.bass('sub', '1---------------', { lo: 'F1', vel: 0.7, to: 3 });
      });
      s.section('drop1', DROP + ' | ' + DROP, (x) => {
        full(x);
        x.hit('crash', 0, { v: 0.8, d: 3 });
        x.mel('lead', MH + ' | ' + MH2 + ' | ' + MH + ' | ' + MH2, { vel: 0.78, glide: true });
        x.hit('crash', 32, { v: 0.6, d: 3 });
      });
      s.section('verse', VERSE + ' | ' + VERSE, (x) => {
        x.drum('kick', FOUR, { vel: 0.9 });
        x.drum('clap', '....x.......x...', { vel: 0.7 });
        x.drum('hat', 'gxgxgxgxgxgxgxgx', { vel: 0.65 });
        x.drum('shk', '..x...x...x...x.', { vel: 0.6, from: 8 });
        x.bass('bass', '1-..1-..1-..1-8-', { lo: 'F1', vel: 0.8 });
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.45 });
        x.mel('bloop', MVR + ' | ' + MVR, { vel: 0.8 });
        x.mel('bloop', MVR + ' | ' + MVR, { vel: 0.75, at: 8, harm: 'bloop', harmVel: 0.55 });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.4, accent: '1 .6 .8 .6', from: 8 });
        ['bass', 'pad', 'arp'].forEach((c) => x.duck(c, 0.45));
        x.sprinkle('bub', { per: [0, 1], lo: 'G6', hi: 'G7', vel: [0.3, 0.6] });
      });
      s.section('break', 'Fmaj7 | Fmaj7 | G6 | G6 | Em7 | Em7 | Am9 | Am9', (x) => {
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.6 });
        x.auto('pad', 'gain', 0.3, 0);
        x.comp('bloop', 'x..x..x...x..x..', { lo: 'C5', hi: 'C6', n: 3, vel: 0.45, rootless: false });
        x.drum('shk', 'o.x.o.x.o.x.o.x.', { vel: 0.5 });
        x.sprinkle('bub', { per: [2, 4], lo: 'C6', hi: 'C7', vel: [0.3, 0.7] });
        x.hit('swell', 28, { d: 4, v: 0.7 });
        x.bass('sub', '1---------------', { lo: 'F1', vel: 0.6 });
      });
      s.section('build2', 'F | G | Em7 | Am7', (x) => {
        x.drum('kick', 'x.......x.......|x...x...x...x...|x...x...x...x...|x.x.x.x.x.x.x.x.', { vel: 0.9 });
        x.drum('clap', '....x.......x...|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxXXXXXXXX', { vel: 0.75 });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.5, accent: '1 .6 .8 .6' });
        x.auto('arp', 'cutoff', 600, 0);
        x.auto('arp', 'cutoff', 5500, 0.1, 15);
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.5 });
        x.auto('pad', 'gain', 0.24, 0);
        x.hit('riser', 0, { d: 16, v: 0.9 });
      });
      s.section('drop2', DROP + ' | ' + DROP, (x) => {
        full(x);
        x.hit('crash', 0, { v: 0.85, d: 3 });
        x.mel('lead', MH + ' | ' + MH2 + ' | ' + MH + ' | ' + MH2, { vel: 0.8, glide: true });
        x.mel('bloop', MH + ' | ' + MH2 + ' | ' + MH + ' | ' + MH2, { vel: 0.5, oct: -1 });
        x.hit('crash', 32, { v: 0.6, d: 3 });
        x.sprinkle('bub', { per: [0, 1], lo: 'C7', hi: 'C8', vel: [0.3, 0.5] });
      });
      s.section('outro', 'F | G | Em7 | Am7 | F | G | C | C', (x) => {
        x.drum('kick', FOUR, { vel: 0.9, to: 6 });
        x.drum('hat', 'gxgxgxgXgxgxgxgX', { vel: 0.65, to: 6 });
        x.drum('clap', '....x.......x...', { vel: 0.7, to: 4 });
        x.arp('arp', { pattern: ARP, rate: 0.25, lo: 'C4', hi: 'C6', n: 4, vel: 0.5, accent: '1 .6 .8 .6', to: 6 });
        x.auto('arp', 'cutoff', 5000, 0);
        x.auto('arp', 'cutoff', 500, 12, 10);
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.5, to: 6 });
        x.bass('bass', '..1-..1-..1-..8-', { lo: 'F1', vel: 0.85, to: 4 });
        ['bass', 'pad', 'arp'].forEach((c) => x.duck(c, 0.5, { to: 6 }));
        x.hit('kick', 24, { v: 1 });
        x.hit('crash', 24, { v: 0.8, d: 4 });
        x.note('sub', 24, 'C2', 4, 0.8);
        x.pad('pad', { lo: 'E3', hi: 'E5', n: 4, vel: 0.6, from: 6, overlap: 1 });
        x.auto('pad', 'gain', 0.24, 24);
        x.arp('bloop', { pattern: '0 1 2 3 4 5 6 7', rate: 0.25, lo: 'C5', hi: 'C7', n: 4, vel: 0.5, from: 6, to: 7 });
        x.sprinkle('bub', { per: [2, 3], lo: 'C6', hi: 'C7', vel: [0.3, 0.6], from: 6 });
      });
    },
  });

  // ---------------------------------------------------------------- Glass City
  track({
    id: 'glass-city', no: 1, title: 'Glass City', artist: 'The Glassmen', album: 'Glass City', genre: 'City Pop', year: 2008,
    bpm: 110, color: '#5fb8ff', swing: 0.16, tail: 3, gain: 0.95,
    mix: {
      ep: { inst: 'ep', gain: 0.26, pan: -0.25, rev: 0.16, chorus: 0.5, autopan: 0.12, o: { bright: 1.2 } },
      gtr: { inst: 'gtr', gain: 0.5, pan: 0.32, rev: 0.1 },
      lead: { inst: 'lead', gain: 0.38, pan: 0.04, rev: 0.25, dly: 0.16, o: { wave: 'square', cut: 3.5, sq: 0.55 } },
      brass: { inst: 'stab', gain: 0.44, pan: -0.05, rev: 0.22 },
      chime: { inst: 'bell', gain: 0.28, pan: 0.2, rev: 0.4, dly: 0.2, o: { ratio: 3.5, index: 1.2, decay: 1.4 } },
      bass: { inst: 'bass', gain: 0.58, o: { bright: 10, slap: true, decay: 0.24, q: 2.6 } },
      pad: { inst: 'pad', gain: 0.2, rev: 0.4, o: { wave: 'strings', attack: 0.9, release: 1.5, cutoff: 1100, cutoffEnd: 3200 } },
      kick: { inst: 'kick', gain: 0.6, o: { f0: 125, f1: 50, decay: 0.26 } },
      snare: { inst: 'snare', gain: 0.46, pan: 0.04, rev: 0.26, o: { tone: 2100, decay: 0.085 } },
      clap: { inst: 'clap', gain: 0.24, pan: -0.06, rev: 0.25 },
      hat: { inst: 'hat', gain: 0.3, pan: 0.26 },
      tamb: { inst: 'tamb', gain: 0.24, pan: -0.3 },
      crash: { inst: 'crash', gain: 0.3, rev: 0.2 },
      tom: { inst: 'tom', gain: 0.4, rev: 0.15 },
    },
    write(s) {
      const VERSE = 'Amaj7 | G#m7 | F#m7 | Bsus4 B7 | Amaj7 | G#m7 | F#m7 | Bsus4 B7';
      const PRE = 'F#m9 | G#m7 | Amaj9 | B13sus4';
      const CHORUS = 'Amaj9 | G#7 | C#m9 | Bm7 E7 | Amaj9 | G#7 | C#m9 F#m7 | Bsus4 B7';
      const MV = 'e5:.5 g#5:.5 b5:1 a5:.5 g#5:1.5 | r:.5 f#5:.5 g#5:.5 b5:.5 d#5:2 | c#5:.5 e5:.5 a5:1 g#5:.5 f#5:1.5 | e5:1 f#5:1 d#5:2 | e5:.5 g#5:.5 b5:1 c#6:.5 b5:1.5 | r:.5 b5:.5 c#6:.5 d#6:.5 f#6:2 | e6:.5 c#6:.5 a5:1 g#5:.5 f#5:1.5 | e5:1 f#5:1 d#5:2';
      const MP = 'r:.5 a5:.5 g#5:.5 f#5:.5 e5:1 c#5:1 | r:.5 b5:.5 g#5:.5 f#5:.5 d#5:1 b4:1 | r:.5 c#6:.5 b5:.5 a5:.5 g#5:1 e5:1 | f#5:1 g#5:1 a5:1 b5:1';
      const MC = 'c#6:1 b5:.5 c#6:1 e6:1.5 | d#6:1 c6:.5 d#6:1 g#6:1.5 | e6:1 d#6:.5 c#6:1 b5:1.5 | a5:1 b5:.5 d6:1 g#5:1.5 | c#6:1 b5:.5 c#6:1 e6:1.5 | f#6:1 d#6:.5 c6:1 g#5:1.5 | e5:.5 g#5:.5 b5:.5 c#6:1 a5:1.5 | b5:2 d#6:2';
      const MS = 'f#5:.5 a5:.5 c#6:.5 e6:.5 c#6:1 a5:1 | g#5:.5 b5:.5 e6:.5 d#6:.25 e6:.25 c#6:2 | d6:.5 c#6:.5 b5:.5 a5:.5 f#5:1 d5:1 | a5:1 b5:.5 d6:.5 g#5:1 e5:1 | a5:.25 b5:.25 c#6:.25 d6:.25 e6:.5 f#6:.5 e6:1 c#6:1 | b5:.5 g#5:.5 e5:.5 g#5:.5 b5:1 c#6:1 | e6:.5 c#6:.5 a5:.5 f#5:.5 a5:1 c#6:1 | c#6:1 d#6:1 c6:1 d#6:1';
      const KICK = 'x..x..x...x.....|x..x..x...x..x..';
      const SNARE = '....x..g....x.g.';
      const BASS = '1..1..8.1.g1..o.|1..1..8.1.g5.o7.';
      const GTR = '.x.x.xx..x.x.x.x';
      const band = (x, o) => {
        o = o || {};
        x.drum('kick', KICK, { vel: 0.85, to: o.to });
        x.drum('snare', SNARE, { vel: 0.85, to: o.to, fill: o.fill });
        x.drum('hat', 'xgxgXgxgxgxgXgxg', { vel: 0.7, to: o.to });
        x.bass('bass', BASS, { lo: 'E1', vel: 0.88, to: o.to });
        x.comp('gtr', GTR, { lo: 'G#4', hi: 'E5', n: 3, vel: 0.6, chord: true, o: { mute: true }, to: o.to });
        x.comp('ep', 'x--.x--...x--.x-', { lo: 'E3', hi: 'D5', vel: 0.5, to: o.to });
      };
      const gliss = (x, b) => ['C#6', 'E6', 'G#6', 'B6', 'C#7'].forEach((n, i) => x.note('chime', b + i * 0.125, n, 1, 0.5));
      s.section('intro', 'Amaj9 | G#7 | C#m9 | Bsus4 B7', (x) => {
        x.drum('kick', KICK, { vel: 0.85, from: 1 });
        x.drum('snare', SNARE, { vel: 0.8, from: 1 });
        x.drum('hat', 'xgxgXgxgxgxgXgxg', { vel: 0.7 });
        x.bass('bass', BASS, { lo: 'E1', vel: 0.88 });
        x.comp('brass', 'x.......x..x....|x.......x.......|x.......x..x....|x...x...x.x.x...', { lo: 'E4', hi: 'E5', n: 4, vel: 0.8, chord: true, gate: 0.6 });
        x.drum('tom', '................|................|................|........x.x.x.x.', { vel: 0.8, n: 'A2' });
        x.hit('crash', 0, { v: 0.7, d: 2 });
      });
      s.section('verse1', VERSE, (x) => {
        band(x, { fill: '....x..g....xgXX' });
        x.mel('lead', MV, { vel: 0.72, glide: true });
      });
      s.section('pre1', PRE, (x) => {
        band(x);
        x.pad('pad', { lo: 'E3', hi: 'E5', vel: 0.5 });
        x.mel('lead', MP, { vel: 0.74, glide: true });
        x.comp('brass', '................|................|................|x...x...x...x...', { lo: 'E4', hi: 'E5', n: 4, vel: 0.75, chord: true, gate: 0.5 });
        x.drum('snare', '................|................|................|........x.x.xxXX', { vel: 0.7 });
      });
      const chorus = (x, harm) => {
        band(x, { fill: '....x..g....x.XX' });
        x.drum('clap', '....x.......x...', { vel: 0.8 });
        x.drum('tamb', '..x...x...x...x.', { vel: 0.75 });
        x.pad('pad', { lo: 'E3', hi: 'E5', vel: 0.55 });
        x.mel('lead', MC, { vel: 0.8, glide: true, harm: harm ? 'chime' : null, harmVel: 0.5 });
        x.comp('brass', 'x.........x.....|..........x.....|x.........x.....|x.....x...x.....', { lo: 'E4', hi: 'E5', n: 4, vel: 0.7, chord: true, gate: 0.5 });
        x.hit('crash', 0, { v: 0.75, d: 2 });
        gliss(x, 0);
      };
      s.section('chorus1', CHORUS, (x) => chorus(x));
      s.section('verse2', VERSE, (x) => {
        band(x, { fill: '....x..g....xgXX' });
        x.mel('lead', MV, { vel: 0.74, glide: true });
        x.comp('brass', '................|..........x.....|................|..........x..x..', { lo: 'E4', hi: 'E5', n: 4, vel: 0.6, chord: true, gate: 0.5 });
      });
      s.section('pre2', PRE, (x) => {
        band(x);
        x.pad('pad', { lo: 'E3', hi: 'E5', vel: 0.5 });
        x.mel('lead', MP, { vel: 0.76, glide: true });
        x.comp('brass', '................|................|................|x...x...x...x...', { lo: 'E4', hi: 'E5', n: 4, vel: 0.75, chord: true, gate: 0.5 });
        x.drum('snare', '................|................|................|........x.x.xxXX', { vel: 0.7 });
      });
      s.section('chorus2', CHORUS, (x) => chorus(x));
      s.section('solo', 'Dmaj7 | C#m7 | Bm7 | E7sus4 E7 | Dmaj7 | C#m7 | F#m7 | G#7sus4 G#7', (x) => {
        band(x, { fill: '....x..g....x.XX' });
        x.pad('pad', { lo: 'E3', hi: 'E5', vel: 0.5 });
        x.mel('lead', MS, { vel: 0.8, glide: true });
        x.drum('tamb', '..x...x...x...x.', { vel: 0.6 });
      });
      s.section('chorus3', CHORUS, (x) => chorus(x, true));
      s.section('outro', 'Amaj9 | G#7 | C#m9 | Bm7 E7 | Amaj9 | Amaj9', (x) => {
        band(x, { to: 4 });
        x.drum('clap', '....x.......x...', { vel: 0.7, to: 4 });
        x.pad('pad', { lo: 'E3', hi: 'E5', vel: 0.55 });
        x.mel('lead', 'c#6:1 b5:.5 c#6:1 e6:1.5 | d#6:1 c6:.5 d#6:1 g#6:1.5 | e6:1 d#6:.5 c#6:1 b5:1.5 | a5:1 b5:.5 d6:1 g#5:1.5 | c#6:4 | r:4', { vel: 0.78, glide: true });
        x.comp('brass', '................|................|................|................|X---------------', { lo: 'E4', hi: 'E5', n: 4, vel: 0.8, chord: true, gate: 1.6, to: 5 });
        x.comp('ep', 'x---------------', { lo: 'E3', hi: 'D5', vel: 0.55, from: 4, to: 5, gate: 1.8 });
        x.note('bass', 16, 'A1', 6, 0.9);
        x.hit('kick', 16, { v: 1 });
        x.hit('crash', 16, { v: 0.8, d: 3 });
        gliss(x, 16);
        x.ritard(3, 5, 0.8);
      });
    },
  });

  // ---------------------------------------------------------------- Dolphin Dreams
  track({
    id: 'dolphin-dreams', no: 2, title: 'Dolphin Dreams', artist: 'Crystal Lagoon', album: 'Clear Skies', genre: 'Chill', year: 2007,
    bpm: 85, color: '#1fb4d8', swing: 0.22, tail: 4.5, gain: 1.08,
    mix: {
      ep: { inst: 'ep', gain: 0.34, pan: -0.15, rev: 0.25, chorus: 0.5, autopan: 0.3, lp: 1100, q: 1.4 },
      kal: { inst: 'kalimba', gain: 0.62, pan: 0.18, rev: 0.3, dly: 0.2 },
      lead: { inst: 'flute', gain: 0.52, pan: 0.05, rev: 0.45, dly: 0.18, o: { breath: 0.7, tone: 1900, tri: 0.12 } },
      bell: { inst: 'bell', gain: 0.24, pan: -0.25, rev: 0.5, dly: 0.25, o: { ratio: 3.5, index: 1.2, decay: 1.8 } },
      drop: { inst: 'drop', gain: 0.42, rev: 0.4, dly: 0.25 },
      pad: { inst: 'pad', gain: 0.24, rev: 0.55, o: { wave: 'glass', attack: 2, release: 3, cutoff: 900, cutoffEnd: 2400, lfo: 0.09 } },
      sub: { inst: 'sub', gain: 0.52 },
      kick: { inst: 'kick', gain: 0.54, o: { f0: 100, f1: 44, decay: 0.34, click: 0.4 } },
      rim: { inst: 'rim', gain: 0.34, pan: 0.12, rev: 0.25, o: { tone: 700 } },
      snap: { inst: 'snap', gain: 0.28, pan: -0.1, rev: 0.35 },
      shk: { inst: 'shaker', gain: 0.22, pan: -0.3, o: { decay: 0.02 } },
      hat: { inst: 'hat', gain: 0.2, pan: 0.3 },
      ocean: { inst: 'ocean', gain: 0.4, rev: 0.3 },
      whistle: { inst: 'whistle', gain: 0.3, pan: 0.3, rev: 0.6, dly: 0.3 },
    },
    write(s) {
      const A = 'Abmaj9 | Gm9 | Fm9 | Bb13sus4 | Abmaj9 | Gm9 | Fm9 Bb7sus4 | Ebmaj9';
      const B = 'Cm9 | Abmaj7 | Ebmaj9/G | Bb13sus4 | Cm9 | Abmaj7 | Fm9 | Bb13sus4';
      const MA = 'c5:.5 eb5:.5 g5:1 bb5:.5 g5:1.5 | f5:.5 g5:.5 bb5:1 d6:.5 bb5:1.5 | ab5:.5 g5:.5 f5:1 eb5:.5 c5:1.5 | c5:1 eb5:.5 f5:2.5 | c5:.5 eb5:.5 g5:1 bb5:.5 c6:1.5 | d6:.5 c6:.5 bb5:1 f5:.5 g5:1.5 | ab5:1 g5:.5 f5:.5 eb5:1 f5:1 | g5:4';
      const MB = 'g5:1.5 bb5:.5 d6:2 | c6:1.5 bb5:.5 g5:2 | bb5:1.5 f5:.5 d5:2 | eb5:1 f5:1 c5:2 | g5:1.5 bb5:.5 eb6:2 | c6:1.5 bb5:.5 g5:1 eb5:1 | f5:1 g5:1 ab5:1 c6:1 | bb5:4';
      const KICK = 'x......x..x.....|x......x..x..x..';
      const beat = (x, o) => {
        o = o || {};
        x.drum('kick', KICK, { vel: 0.8, to: o.to, from: o.from });
        x.drum('rim', '....x.......x...', { vel: 0.75, to: o.to, from: o.from });
        x.drum('shk', 'ogxgogxgogxgogxg', { vel: 0.7, to: o.to, from: o.from });
        if (o.hat) x.drum('hat', 'x.o.x.o.x.o.x.o.', { vel: 0.6, to: o.to, from: o.from });
      };
      const EP = 'x-------..x-----|x-----..x-------';
      s.section('intro', 'Abmaj9 | Gm9 | Fm9 | Bb13sus4', (x) => {
        x.hit('ocean', 0, { d: 8, v: 0.8 });
        x.hit('ocean', 7, { d: 9, v: 0.7 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.pad('pad', { lo: 'Eb4', hi: 'D5', n: 3, vel: 0.4 });
        x.sprinkle('drop', { per: [2, 3], lo: 'Eb6', hi: 'Eb7', grid: 0.25, vel: [0.4, 0.8] });
        x.hit('whistle', 5, { n: 'Bb6', d: 0.9, v: 0.7 });
        x.hit('whistle', 6.2, { n: 'Eb7', d: 0.6, v: 0.5, o: { path: [1, 0.8, 1.2, 1] } });
        x.arp('kal', { pattern: '0 1 2 3 2 1 4 3', rate: 0.5, lo: 'Eb4', hi: 'Eb6', n: 5, vel: 0.5, from: 2 });
      });
      s.section('A1', A, (x) => {
        beat(x);
        x.bass('sub', '1-----..1-5-----', { lo: 'Eb1', vel: 0.8 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.mel('kal', MA, { vel: 0.8 });
        x.sprinkle('drop', { per: [0, 2], lo: 'Eb6', hi: 'Eb7', grid: 0.25, vel: [0.3, 0.6] });
      });
      s.section('A2', A, (x) => {
        beat(x, { hat: true });
        x.bass('sub', '1-----..1-5-----', { lo: 'Eb1', vel: 0.8 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.respond('bell', x.mel('kal', MA, { vel: 0.82 }), { lo: 'Bb5', hi: 'Bb6', vel: 0.4, min: 1.5 });
        x.pad('pad', { lo: 'Eb4', hi: 'D5', n: 3, vel: 0.45 });
      });
      s.section('B1', B, (x) => {
        beat(x, { hat: true });
        x.bass('sub', '1-------..1-5---', { lo: 'Eb1', vel: 0.8 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.auto('ep', 'cutoff', 2600, 0, 8);
        x.mel('lead', MB, { vel: 0.78, scoop: 0.3 });
        x.arp('kal', { pattern: '0 2 1 3 2 4 3 5', rate: 0.25, lo: 'Eb5', hi: 'Eb6', n: 4, vel: 0.35 });
        x.pad('pad', { lo: 'Eb4', hi: 'D5', n: 3, vel: 0.5 });
        x.auto('ep', 'cutoff', 1100, 28, 4);
      });
      s.section('breakdown', 'Abmaj9 | Gm9 | Fm9 | Bb13sus4', (x) => {
        x.hit('ocean', 0, { d: 9, v: 0.7 });
        x.comp('ep', 'x---------------', { lo: 'Eb3', hi: 'D5', vel: 0.45 });
        x.sprinkle('drop', { per: [3, 5], lo: 'Eb6', hi: 'Eb7', grid: 0.25, vel: [0.3, 0.8] });
        x.arp('kal', { pattern: '0 1 2 3 4 3 2 1', rate: 0.5, lo: 'Eb4', hi: 'Eb6', n: 5, vel: 0.45 });
        x.drum('kick', '................|................|................|x.......x...x.x.', { vel: 0.7 });
        x.hit('whistle', 9, { n: 'C7', d: 0.8, v: 0.5 });
      });
      s.section('A3', A, (x) => {
        beat(x, { hat: true });
        x.bass('sub', '1-----..1-5-----', { lo: 'Eb1', vel: 0.8 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.mel('kal', MA, { vel: 0.84, harm: 'lead', harmVel: 0.5, harmO: { breath: 0.5 } });
        x.sprinkle('drop', { per: [0, 1], lo: 'Eb6', hi: 'Eb7', grid: 0.25, vel: [0.3, 0.5] });
      });
      s.section('B2', B, (x) => {
        beat(x, { hat: true });
        x.bass('sub', '1-------..1-5---', { lo: 'Eb1', vel: 0.8 });
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5 });
        x.auto('ep', 'cutoff', 2600, 0, 8);
        x.mel('lead', MB, { vel: 0.8, scoop: 0.3 });
        x.mel('kal', MB, { vel: 0.5, oct: -1 });
        x.pad('pad', { lo: 'Eb4', hi: 'D5', n: 3, vel: 0.5 });
        x.auto('ep', 'cutoff', 1100, 28, 4);
      });
      s.section('outro', 'Abmaj9 | Gm9 | Fm9 | Bb13sus4 | Ebmaj9 | Ebmaj9', (x) => {
        beat(x, { to: 2 });
        x.bass('sub', '1-----..1-5-----', { lo: 'Eb1', vel: 0.75, to: 4 });
        x.note('sub', 16, 'Eb1', 6, 0.75);
        x.comp('ep', EP, { lo: 'Eb3', hi: 'D5', vel: 0.5, to: 4 });
        x.comp('ep', 'x---------------', { lo: 'Eb3', hi: 'D5', vel: 0.5, from: 4, to: 5, gate: 1.8 });
        x.mel('kal', 'c5:.5 eb5:.5 g5:1 bb5:.5 g5:1.5 | f5:.5 g5:.5 bb5:1 d6:.5 bb5:1.5 | ab5:.5 g5:.5 f5:1 eb5:.5 c5:1.5 | c5:1 eb5:.5 f5:2.5', { vel: 0.75 });
        x.arp('kal', { pattern: '0 1 2 3 4 5 6 7', rate: 0.5, lo: 'Eb4', hi: 'G6', n: 5, vel: 0.5, from: 4, to: 5, gate: 3 });
        x.pad('pad', { lo: 'Eb4', hi: 'D5', n: 3, vel: 0.5, overlap: 2 });
        x.hit('ocean', 4, { d: 12, v: 0.7 });
        x.hit('whistle', 13, { n: 'Bb6', d: 1, v: 0.6 });
        x.sprinkle('drop', { per: [1, 2], lo: 'Eb6', hi: 'Eb7', grid: 0.25, vel: [0.3, 0.6], from: 2 });
        x.ritard(3, 5, 0.82);
      });
    },
  });

  // ---------------------------------------------------------------- Channels (loop)
  track({
    id: 'channels', no: 1, title: 'Channels', artist: 'Aerium Sound Team', album: 'Channels', genre: 'Ambient', year: 2006,
    bpm: 72, color: '#9fd8f5', swing: 0.1, tail: 4.5, gain: 1.12, loopable: true,
    mix: {
      pad: { inst: 'pad', gain: 0.3, rev: 0.55, o: { wave: 'glass', attack: 2.2, release: 3, cutoff: 1000, cutoffEnd: 2600, lfo: 0.08, lfoDepth: 0.25 } },
      ep: { inst: 'ep', gain: 0.44, pan: -0.1, rev: 0.35, dly: 0.14, chorus: 0.4, o: { bright: 0.9 } },
      pluck: { inst: 'bell', gain: 0.3, pan: 0.25, rev: 0.45, dly: 0.28, o: { ratio: 2, index: 0.9, decay: 1.2 } },
      marim: { inst: 'marimba', gain: 0.34, pan: -0.28, rev: 0.3, dly: 0.2 },
      sub: { inst: 'sub', gain: 0.44, o: { attack: 0.2, rel: 0.4 } },
    },
    write(s) {
      const B1 = 'Cmaj9 | Cmaj9 | Ebmaj9 | Ebmaj9 | Abmaj9 | Abmaj9 | Fm9 | G13sus4';
      const B2 = 'Cmaj9 | Cmaj9 | Emaj9 | Emaj9 | Amaj9 | Fmaj9 | Dm9 | G13sus4';
      const EP1 = 'r:1 e5:1 d5:.5 b4:1.5 | r:2 g4:1 d5:1 | r:1 g5:1 f5:.5 d5:1.5 | r:2 bb4:1 f5:1 | r:1 c6:1 bb5:.5 g5:1.5 | r:2 eb5:1 bb5:1 | r:1 ab5:1 g5:.5 c5:1.5 | r:2 f5:1 d5:1';
      const EP2 = 'r:1 g5:1 e5:.5 d5:1.5 | r:2 b4:1 e5:1 | r:1 g#5:1 f#5:.5 d#5:1.5 | r:2 b4:1 f#5:1 | r:1 c#6:1 b5:.5 e5:1.5 | r:1 a5:1 g5:.5 e5:1.5 | r:1 f5:1 e5:.5 a4:1.5 | r:2 d5:1 e5:1';
      const body = (x, second) => {
        x.pad('pad', { lo: 'E3', hi: 'D5', n: 4, vel: 0.55 });
        x.bass('sub', '1---------------', { lo: 'C2', vel: 0.6 });
        x.mel('ep', x.name === 'b1' || x.name === 'b1b' ? EP1 : EP2, { vel: second ? 0.6 : 0.55, oct: second ? 1 : 0 });
        x.sprinkle('pluck', { per: [1, 2], lo: 'G5', hi: 'G6', vel: [0.3, 0.55], grid: 1 });
        if (second) x.arp('marim', { pattern: '0 2 1 3 r 2 r 1', rate: 0.5, lo: 'C4', hi: 'C6', n: 5, vel: 0.35 });
      };
      s.section('intro', 'Cmaj9 | Cmaj9', (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D5', n: 4, vel: 0.5 });
        x.note('pluck', 4, 'G6', 2, 0.4);
        x.note('pluck', 5.5, 'D6', 2, 0.35);
      });
      s.loopStart();
      s.section('b1', B1, (x) => body(x));
      s.section('b2', B2, (x) => body(x));
      s.loopEnd();
      s.section('b1b', B1, (x) => body(x, true));
      s.section('b2b', B2, (x) => body(x, true));
      s.section('end', 'Cmaj9 | Cmaj9', (x) => {
        x.pad('pad', { lo: 'E3', hi: 'D5', n: 4, vel: 0.55, overlap: 1.5 });
        x.note('sub', 0, 'C2', 6, 0.55);
        x.arp('pluck', { pattern: '0 1 2 3 4 5', rate: 0.5, lo: 'E5', hi: 'D7', n: 5, vel: 0.35, gate: 3, to: 1 });
        x.note('ep', 4, 'E5', 4, 0.45);
        x.note('ep', 4, 'B4', 4, 0.4);
        x.ritard(0, 2, 0.85);
      });
    },
  });

  // ---------------------------------------------------------------- Shop (loop)
  track({
    id: 'shop', no: 1, title: 'Shop', artist: 'Aerium Sound Team', album: 'Shop', genre: 'Bossa Nova', year: 2006,
    bpm: 138, color: '#7cc8ff', swing: 0.06, tail: 3, gain: 1, loopable: true,
    mix: {
      ep: { inst: 'ep', gain: 0.28, pan: -0.22, rev: 0.14, chorus: 0.35, o: { bright: 1.1 } },
      vib: { inst: 'vibes', gain: 0.42, pan: 0.24, rev: 0.2, trem: [5.6, 0.3], o: { damp: true } },
      flute: { inst: 'flute', gain: 0.62, pan: 0.04, rev: 0.24, dly: 0.08, o: { breath: 0.9 } },
      bass: { inst: 'bass', gain: 0.62, o: { bright: 5, sub: 0.9, decay: 0.3 } },
      kick: { inst: 'kick', gain: 0.46, o: { f0: 100, f1: 48, decay: 0.24, click: 0.25 } },
      rim: { inst: 'rim', gain: 0.42, pan: 0.16, rev: 0.1 },
      shk: { inst: 'shaker', gain: 0.26, pan: -0.34 },
      bell: { inst: 'bell', gain: 0.22, pan: -0.1, rev: 0.4, dly: 0.15, o: { ratio: 2, index: 1, decay: 1.4 } },
    },
    write(s) {
      const A = 'Gmaj9 | Em9 | Am9 | D13sus4 D7b9 | Gmaj9 | Em9 | Cm6 | D13sus4';
      const B = 'Cmaj9 | Cm6 | Bm7 | E7b9 | Am9 | D7b9 | Gmaj9 | F#13sus4 F#7b9';
      const BB = 'Cmaj9 | Cm6 | Bm7 | E7b9 | Am9 | D7b9 | Gmaj9 | Bb13sus4 Bb7b9';
      const SA = 'b4:.5 d5:.5 f#5:.5 a5:1 f#5:.5 g5:1 | r:1 b5:.5 a5:.5 g5:.5 e5:1.5 | c5:.5 e5:.5 g5:.5 b5:1 g5:.5 a5:1 | r:1.5 g5:.5 f#5:.5 eb5:.5 c5:1 | b4:.5 d5:.5 f#5:.5 a5:1 b5:.5 d6:1 | r:.5 b5:.5 a5:.5 g5:.5 f#5:.5 e5:.5 d5:1 | eb5:.5 g5:.5 a5:.5 c6:1 a5:.5 g5:1 | a5:1.5 b5:.5 a5:2';
      const SB7 = 'e5:1.5 g5:.5 b5:1 d6:1 | c6:1.5 a5:.5 g5:1 eb5:1 | d5:1.5 f#5:.5 a5:1 b5:1 | g#5:1.5 f5:.5 d5:1 b4:1 | c5:.5 e5:.5 g5:.5 b5:1 a5:.5 g5:1 | f#5:.5 a5:.5 c6:.5 eb6:1 d6:.5 c6:1 | b5:1.5 a5:.5 f#5:.5 d5:.5 e5:1';
      const groove = (x, o) => {
        o = o || {};
        x.drum('kick', BOSSA_KICK, { vel: 0.7, to: o.to });
        x.drum('rim', BOSSA_RIM, { vel: 0.85, to: o.to });
        x.drum('shk', SHAKE16, { vel: 0.75, to: o.to });
        x.bass('bass', BOSSA_BASS, { lo: 'E1', vel: 0.88, to: o.to });
        x.comp('ep', '..x-......x-....|..x-......x-..x-', { lo: 'E3', hi: 'D5', vel: 0.55, gate: 0.8, to: o.to });
        x.comp('vib', '......x-......x-|......x-.......x', { lo: 'G4', hi: 'E5', n: 3, vel: 0.45, gate: 0.8, to: o.to });
      };
      const bodyA = (x) => { groove(x); x.mel('flute', SA, { vel: 0.8, scoop: 0.2 }); };
      const bodyB = (x, back) => {
        groove(x);
        x.mel('flute', SB7, { vel: 0.8, scoop: 0.2 });
        x.mel('flute', back ? 'a5:1 g5:1 f#5:1 eb5:1' : 'b5:2 a#5:1 g5:1', { vel: 0.8, at: 7, fixed: !!back });
        x.hit('bell', 28, { n: back ? 'D6' : 'F#6', v: 0.4, d: 2 });
      };
      s.section('intro', 'Gmaj9 | D13sus4', (x) => {
        x.drum('rim', BOSSA_RIM, { vel: 0.8 });
        x.drum('shk', SHAKE16, { vel: 0.6 });
        x.bass('bass', BOSSA_BASS, { lo: 'E1', vel: 0.8 });
        x.comp('vib', 'x---..x-..x-..x-', { lo: 'G4', hi: 'E5', n: 3, vel: 0.5 });
        x.note('bell', 6, 'D6', 2, 0.4);
      });
      s.loopStart();
      s.section('A', A, bodyA);
      s.section('B', B, (x) => bodyB(x));
      s.section('A+', A, bodyA, { transpose: 4 });
      s.section('B+', BB, (x) => bodyB(x, true), { transpose: 4 });
      s.loopEnd();
      s.section('A2', A, bodyA);
      s.section('B2', B, (x) => bodyB(x));
      s.section('A2+', A, bodyA, { transpose: 4 });
      s.section('B2+', BB, (x) => bodyB(x, true), { transpose: 4 });
      s.section('end', 'Am9 D7b9 | Gmaj9 | Gmaj9', (x) => {
        groove(x, { to: 1 });
        x.mel('flute', 'c5:.5 e5:.5 g5:.5 b5:.5 a5:.5 f#5:.5 eb5:.5 c5:.5 | b4:4 | r:4', { vel: 0.8 });
        x.note('bass', 4, 'G1', 5, 0.85);
        x.note('kick', 4, null, 1, 0.8);
        x.comp('ep', 'x---------------', { lo: 'E3', hi: 'D5', vel: 0.5, from: 1, to: 2, gate: 1.8 });
        x.arp('vib', { pattern: '0 1 2 3 4 5 6', rate: 0.25, lo: 'G4', hi: 'D6', n: 4, vel: 0.45, from: 1, to: 2, gate: 4 });
        x.note('bell', 5, 'D6', 3, 0.4);
        x.ritard(0, 2, 0.85);
      });
    },
  });

  // ---------------------------------------------------------------- video soundtracks (hidden)
  track({
    id: 'video:aquarium', hidden: true, title: 'Fish', artist: 'Sample Videos', album: 'Sample Videos', genre: 'Video', year: 2007,
    bpm: 76, color: '#1fb4d8', swing: 0.1, tail: 3,
    mix: {
      water: { inst: 'ocean', gain: 0.34, rev: 0.3, o: { lo: 220, hi: 700 } },
      bub: { inst: 'bubble', gain: 0.4, rev: 0.35, dly: 0.2 },
      mar: { inst: 'marimba', gain: 0.4, pan: -0.2, rev: 0.35, dly: 0.2 },
      kal: { inst: 'kalimba', gain: 0.5, pan: 0.2, rev: 0.4, dly: 0.2 },
      pad: { inst: 'pad', gain: 0.24, rev: 0.55, o: { wave: 'soft', attack: 2, release: 2.5, cutoff: 700, cutoffEnd: 1800 } },
      sub: { inst: 'sub', gain: 0.4 },
    },
    write(s) {
      const P = 'Cmaj9 | Am9 | Fmaj9 | Gsus2';
      s.section('in', 'Cmaj9 | Cmaj9', (x) => {
        x.hit('water', 0, { d: 12, v: 0.8 });
        x.sprinkle('bub', { per: [2, 5], lo: 'C6', hi: 'C7', grid: 0.25, vel: [0.3, 0.8] });
        x.pad('pad', { lo: 'E3', hi: 'D5', vel: 0.4 });
      });
      s.section('a', P + ' | ' + P, (x) => {
        [0, 12, 24].forEach((b) => x.hit('water', b, { d: 13, v: 0.7 }));
        x.sprinkle('bub', { per: [1, 4], lo: 'C6', hi: 'C7', grid: 0.25, vel: [0.3, 0.7] });
        x.arp('mar', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'C4', hi: 'C6', n: 5, vel: 0.45 });
        x.pad('pad', { lo: 'E3', hi: 'D5', vel: 0.45 });
        x.bass('sub', '1---------------', { lo: 'C2', vel: 0.55 });
      });
      s.section('b', P + ' | ' + P, (x) => {
        [0, 12, 24].forEach((b) => x.hit('water', b, { d: 13, v: 0.7 }));
        x.sprinkle('bub', { per: [1, 4], lo: 'C6', hi: 'C7', grid: 0.25, vel: [0.3, 0.7] });
        x.arp('mar', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'C4', hi: 'C6', n: 5, vel: 0.4 });
        x.mel('kal', 'e5:1 g5:.5 a5:1.5 g5:1 | e5:1 c5:.5 d5:2.5 | c5:1 e5:.5 g5:1.5 a5:1 | g5:4 | e5:1 g5:.5 a5:1.5 c6:1 | b5:1 a5:.5 e5:2.5 | f5:1 a5:.5 c6:1.5 a5:1 | g5:4', { vel: 0.75 });
        x.pad('pad', { lo: 'E3', hi: 'D5', vel: 0.45 });
        x.bass('sub', '1---------------', { lo: 'C2', vel: 0.55 });
      });
      s.section('end', 'Cmaj9 | Am9 | Fmaj9 | Cmaj9', (x) => {
        x.hit('water', 0, { d: 16, v: 0.7 });
        x.sprinkle('bub', { per: [2, 5], lo: 'C6', hi: 'C7', grid: 0.25, vel: [0.3, 0.8] });
        x.arp('mar', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'C4', hi: 'C6', n: 5, vel: 0.35, to: 3 });
        x.pad('pad', { lo: 'E3', hi: 'D5', vel: 0.45, overlap: 1 });
        x.note('kal', 12, 'C6', 2, 0.5);
      });
    },
  });
  track({
    id: 'video:clouds', hidden: true, title: 'Clouds', artist: 'Sample Videos', album: 'Sample Videos', genre: 'Video', year: 2007,
    bpm: 90, color: '#7cc8ff', swing: 0, tail: 3.5, gain: 1.05,
    mix: {
      pad: { inst: 'pad', gain: 0.3, rev: 0.55, o: { wave: 'warm', attack: 2, release: 3, cutoff: 700, cutoffEnd: 2200 } },
      glass: { inst: 'pad', gain: 0.18, rev: 0.6, o: { wave: 'glass', attack: 2, release: 3, cutoff: 1800, cutoffEnd: 4000 } },
      bell: { inst: 'bell', gain: 0.3, pan: 0.2, rev: 0.5, dly: 0.3, o: { ratio: 3.5, index: 1.4, decay: 2 } },
      pulse: { inst: 'pluck', gain: 0.26, pan: -0.15, rev: 0.25, dly: 0.3, o: { wave: 'triangle', cut: 2200, q: 3, decay: 0.18 } },
      sub: { inst: 'sub', gain: 0.44 },
      wind: { inst: 'wind', gain: 0.4, rev: 0.35 },
      kick: { inst: 'kick', gain: 0.36, o: { f0: 90, f1: 44, decay: 0.35, click: 0 } },
    },
    write(s) {
      const P = 'Dmaj9 | Bm11 | Gmaj9 | A6sus4';
      s.section('in', 'Dmaj9 | Dmaj9', (x) => {
        x.hit('wind', 0, { d: 6, v: 0.8 });
        x.pad('pad', { lo: 'D3', hi: 'C#5', vel: 0.5 });
        x.note('bell', 4, 'A6', 2, 0.4);
      });
      s.section('a', P + ' | ' + P, (x) => {
        x.pad('pad', { lo: 'D3', hi: 'C#5', vel: 0.55 });
        x.motif('bell', { every: 2, lo: 'D5', hi: 'D7', vel: 0.5, d: 2 });
        x.arp('pulse', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'D3', hi: 'A4', n: 5, vel: 0.4 });
        x.bass('sub', '1---------------', { lo: 'D1', vel: 0.6 });
        x.hit('wind', 12, { d: 8, v: 0.5 });
      });
      s.section('b', P + ' | ' + P, (x) => {
        x.pad('pad', { lo: 'D3', hi: 'C#5', vel: 0.55 });
        x.pad('glass', { lo: 'A4', hi: 'A5', n: 3, vel: 0.5 });
        x.motif('bell', { every: 2, lo: 'D5', hi: 'D7', vel: 0.55, d: 2, center: 0.55 });
        x.arp('pulse', { pattern: '0 2 1 3 2 4 3 1', rate: 0.5, lo: 'D3', hi: 'A4', n: 5, vel: 0.42 });
        x.bass('sub', '1---------------', { lo: 'D1', vel: 0.6 });
        x.drum('kick', 'x.......x.......', { vel: 0.6 });
      });
      s.section('end', 'Gmaj9 | A6sus4 | Dmaj9 | Dmaj9', (x) => {
        x.pad('pad', { lo: 'D3', hi: 'C#5', vel: 0.55, overlap: 1 });
        x.pad('glass', { lo: 'A4', hi: 'A5', n: 3, vel: 0.45, overlap: 1 });
        x.arp('bell', { pattern: '0 1 2 3 4 5 6', rate: 0.5, lo: 'D5', hi: 'F#6', n: 5, vel: 0.4, from: 2, to: 3, gate: 3 });
        x.bass('sub', '1---------------', { lo: 'D1', vel: 0.55, to: 3 });
        x.hit('wind', 4, { d: 10, v: 0.5 });
      });
    },
  });

  // ================================================================ player
  const events = U.emitter();
  const store = A.store;
  let E = null;            // live engine for Aerium.sound.ctx
  let S = null;            // current synth session
  let F = null;            // current file playback { el, src, url }
  let timer = null;
  let pausedAt = 0;
  let lastTime = 0;
  let gen = 0;
  const voiceErrors = [];

  const volCurve = (v) => Math.pow(clamp(v, 0, 1), 1.6);

  function engine() {
    const ctx = A.sound && A.sound.ctx;
    if (!ctx || !A.sound.musicBus) return null;
    if (E && E.ctx === ctx) return E;
    E = buildEngine(ctx, A.sound.musicBus, { volume: volCurve(store.get('music.volume', 0.8)), muted: store.get('music.muted', false) });
    applyEQ();
    return E;
  }
  function ready() {
    if (A.sound && A.sound.unlock) A.sound.unlock();
    const e = engine();
    if (!e) return Promise.resolve(null);
    if (e.ctx.state === 'running') return Promise.resolve(e);
    return new Promise((res) => {
      let done = false;
      const finish = () => { if (!done) { done = true; res(e); } };
      e.ctx.resume().then(finish, finish);
      setTimeout(finish, 1500);
    });
  }
  function fadeTo(v, secs) {
    if (!E) return;
    const p = E.fade.gain, t = E.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(v, t + Math.max(0.005, secs));
  }
  function startTimer() { if (!timer) timer = setInterval(tick, 25); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function synthPos() {
    const s = S;
    if (!s) return pausedAt;
    const now = s.E.ctx.currentTime;
    let seg = 0;
    for (let i = 0; i < s.segs.length; i++) if (s.segs[i].at <= now) seg = i;
    const pos = now - s.segs[seg].base;
    return clamp(seg === 0 ? Math.max(pos, s.from) : pos, 0, s.C.duration);
  }

  function tick() {
    if (music.state !== 'playing') return;
    if (F) {
      const t = F.el.currentTime;
      if (performance.now() - lastTime > 250) { lastTime = performance.now(); events.emit('time', t, music.duration); }
      return;
    }
    const s = S;
    if (!s) return;
    const ctx = s.E.ctx, now = ctx.currentTime;
    const horizon = now + (document.hidden ? 1.2 : 0.2);
    const ev = s.C.events;
    for (let guard = 0; guard < 8000; guard++) {
      const loopB = s.loop && s.C.loopEnd != null ? s.C.loopEnd : Infinity;
      if (s.idx >= ev.length || ev[s.idx].t >= loopB) {
        if (loopB === Infinity) break;
        const at = s.base + loopB;
        if (at > horizon) break;
        s.base += loopB - s.C.loopStart;
        s.segs.push({ at, base: s.base });
        if (s.segs.length > 4) s.segs.splice(1, s.segs.length - 4);
        s.idx = lowerBound(ev, s.C.loopStart);
        continue;
      }
      const e = ev[s.idx], when = s.base + e.t;
      if (when > horizon) break;
      s.idx++;
      if (when < now - 0.08) continue;
      try { trigger(s, e, Math.max(when, now + 0.002)); } catch (err) { if (voiceErrors.length < 5) voiceErrors.push(String(err && err.message)); }
    }
    const pos = synthPos();
    if (!s.loop && pos >= s.C.duration - 0.01) { finish(); return; }
    if (performance.now() - lastTime > 250) { lastTime = performance.now(); events.emit('time', pos, s.C.duration); }
  }

  function nowPlaying(tr) {
    A.bus.emit('media:nowplaying', { title: tr.title, artist: tr.artist, album: tr.album, id: tr.id });
  }

  function clearFile() {
    if (!F) return;
    const f = F;
    F = null;
    disposeFile(f);
  }
  function disposeFile(f) {
    try { f.el.pause(); } catch (e) { /* ignore */ }
    try { f.src.disconnect(); } catch (e) { /* ignore */ }
    f.el.removeAttribute('src');
    try { f.el.load(); } catch (e) { /* ignore */ }
  }
  function halt(fade) {
    if (S) { killSession(S, fade); S = null; }
    clearFile();
    stopTimer();
  }

  function finish() {
    const tr = music.current;
    halt(0.05);
    music.state = 'stopped';
    pausedAt = 0;
    events.emit('time', tr ? tr.duration : 0, tr ? tr.duration : 0);
    events.emit('end', tr);
    A.bus.emit('media:stopped');
  }

  const music = {
    tracks: TRACKS,
    state: 'stopped',
    current: null,
    loop: false,
    getTrack(id) {
      if (!id) return null;
      id = String(id).replace(/^track:/, '');
      return TRACKS.find((t) => t.id === id) || HIDDEN.find((t) => t.id === id) || null;
    },
    async play(id, o) {
      o = o || {};
      const tr = typeof id === 'object' && id ? id : music.getTrack(id);
      if (!tr || !tr._def) return false;
      const my = ++gen;
      const e = await ready();
      if (!e || my !== gen) return false;
      halt(0.06);
      compile(tr._def);
      const from = clamp(o.from || 0, 0, tr.duration - 0.5);
      music.current = tr;
      music.loop = !!o.loop;
      music.state = 'playing';
      pausedAt = 0;
      const fadeIn = o.fadeIn || 0;
      fadeTo(fadeIn ? 0 : 1, 0.01);
      S = createSession(e, tr._def, from, { loop: music.loop });
      if (fadeIn) {
        const p = e.fade.gain, t = e.ctx.currentTime + 0.05;
        p.setValueAtTime(0, t);
        p.linearRampToValueAtTime(1, t + fadeIn);
      }
      lastTime = 0;
      startTimer();
      tick();
      events.emit('play', tr, { resumed: false });
      nowPlaying(tr);
      return true;
    },
    async playFile(url, meta) {
      meta = meta || {};
      const my = ++gen;
      const e = await ready();
      if (!e || my !== gen) return false;
      halt(0.06);
      fadeTo(1, 0.02);
      const el = new Audio();
      el.preload = 'auto';
      el.src = url;
      let src;
      try { src = e.ctx.createMediaElementSource(el); } catch (err) { events.emit('error', { message: 'This file could not be opened.' }); return false; }
      src.connect(e.fileIn);
      const name = meta.name || meta.title || 'Unknown';
      const tr = {
        id: 'file:' + name, title: meta.title || name.replace(/\.[a-z0-9]+$/i, ''), artist: meta.artist || 'Unknown Artist', album: meta.album || 'Unknown Album',
        genre: meta.genre || 'Unknown Genre', year: meta.year || '', duration: meta.duration || 0, bpm: 0, color: meta.color || '#5b89b4', file: true, url,
      };
      F = { el, src, url };
      music.current = tr;
      music.loop = false;
      music.state = 'playing';
      pausedAt = 0;
      el.addEventListener('loadedmetadata', () => {
        if (!F || F.el !== el) return;
        if (isFinite(el.duration)) tr.duration = el.duration;
        events.emit('meta', tr);
        events.emit('time', el.currentTime, tr.duration);
      });
      el.addEventListener('ended', () => { if (F && F.el === el) finish(); });
      el.addEventListener('error', () => {
        if (!F || F.el !== el) return;
        halt(0.02);
        music.state = 'stopped';
        events.emit('error', { track: tr, message: 'Media Player cannot play this file. It may be damaged, or it uses a format this computer does not understand.' });
        events.emit('stop', tr);
        A.bus.emit('media:stopped');
      });
      try {
        await el.play();
      } catch (err) {
        if (F && F.el === el) {
          halt(0.02);
          music.state = 'stopped';
          events.emit('error', { track: tr, message: 'Media Player cannot play this file.' });
          events.emit('stop', tr);
        }
        return false;
      }
      if (!F || F.el !== el) return false;
      lastTime = 0;
      startTimer();
      events.emit('play', tr, { resumed: false });
      nowPlaying(tr);
      return true;
    },
    pause() {
      if (music.state !== 'playing') return;
      gen++;
      if (F) { F.el.pause(); }
      else if (S) {
        pausedAt = synthPos();
        fadeTo(0, 0.1);
        const s = S;
        S = null;
        killSession(s, 0.1);
      }
      stopTimer();
      music.state = 'paused';
      events.emit('pause', music.current);
      events.emit('time', music.position, music.duration);
    },
    async resume() {
      if (music.state !== 'paused' || !music.current) return false;
      const my = ++gen;
      const e = await ready();
      if (!e || my !== gen || music.state !== 'paused') return false;
      if (F) {
        fadeTo(1, 0.02);
        try { await F.el.play(); } catch (err) { return false; }
      } else {
        const tr = music.current;
        fadeTo(0, 0.005);
        S = createSession(e, tr._def, pausedAt, { loop: music.loop });
        const p = e.fade.gain, t = e.ctx.currentTime + 0.05;
        p.setValueAtTime(0, t);
        p.linearRampToValueAtTime(1, t + 0.08);
      }
      music.state = 'playing';
      lastTime = 0;
      startTimer();
      tick();
      events.emit('play', music.current, { resumed: true });
      return true;
    },
    stop(o) {
      o = o || {};
      if (music.state === 'stopped' && !S && !F) return;
      gen++;
      const fade = o.fadeOut || 0.12;
      const tr = music.current;
      if (S && E) {
        fadeTo(0, fade);
        const s = S;
        S = null;
        setTimeout(() => killSession(s, 0.02), fade * 1000);
      }
      if (F) {
        const f = F;
        F = null;
        fadeTo(0, Math.min(fade, 0.3));
        setTimeout(() => disposeFile(f), Math.min(fade, 0.3) * 1000 + 20);
      }
      stopTimer();
      music.state = 'stopped';
      pausedAt = 0;
      events.emit('stop', tr);
      events.emit('time', 0, tr ? tr.duration : 0);
      A.bus.emit('media:stopped');
    },
    seek(sec) {
      const tr = music.current;
      if (!tr) return;
      const dur = music.duration || 0;
      sec = clamp(Number(sec) || 0, 0, Math.max(0, dur - 0.25));
      if (F) { try { F.el.currentTime = sec; } catch (e) { /* ignore */ } }
      else if (music.state === 'playing' && S) {
        const old = S;
        S = createSession(old.E, tr._def, sec, { loop: music.loop });
        killSession(old, 0.035);
        tick();
      } else pausedAt = sec;
      events.emit('time', sec, dur);
    },
    on(ev, fn) { return events.on(ev, fn); },
    off(ev, fn) { events.off(ev, fn); },
    get position() {
      if (F) return F.el.currentTime || 0;
      if (music.state === 'playing') return synthPos();
      return music.state === 'paused' ? pausedAt : 0;
    },
    get duration() { const tr = music.current; return tr ? tr.duration || 0 : 0; },
    get volume() { return store.get('music.volume', 0.8); },
    set volume(v) {
      v = clamp(Number(v) || 0, 0, 1);
      store.set('music.volume', v);
      if (E) E.vol.gain.setTargetAtTime(volCurve(v), E.ctx.currentTime, 0.03);
      events.emit('volume', v);
    },
    get muted() { return !!store.get('music.muted', false); },
    set muted(m) {
      store.set('music.muted', !!m);
      if (E) E.mute.gain.setTargetAtTime(m ? 0 : 1, E.ctx.currentTime, 0.02);
      events.emit('volume', music.volume);
    },
    get analyser() { const e = engine(); return e ? e.analyser : null; },
    get bpm() { const tr = music.current; return tr && !tr.file ? tr.bpm : 0; },
    // Beats elapsed in the current synthesized track (for tempo-synced visuals).
    get beat() {
      const tr = music.current;
      if (!tr || tr.file || !tr._def) return 0;
      const C = compile(tr._def), t = music.position;
      let lo = 0, hi = C.beats + 16;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (C.b2s(mid) < t) lo = mid; else hi = mid; }
      return lo;
    },
    get eq() { return (store.get('music.eq', null) || [0, 0, 0, 0, 0]).slice(); },
    setEQ(gains) {
      const g = (gains || []).slice(0, 5).map((x) => clamp(Number(x) || 0, -12, 12));
      while (g.length < 5) g.push(0);
      store.set('music.eq', g);
      applyEQ();
    },
    EQ_BANDS: EQ_BANDS.map((b) => b[0]),
    // Offline render for testing and sanity checks: resolves to an AudioBuffer.
    render(id, o) {
      o = o || {};
      const tr = music.getTrack(id);
      if (!tr) return Promise.reject(new Error('Unknown track ' + id));
      const C = compile(tr._def), sr = o.sampleRate || 44100, from = o.from || 0;
      const secs = Math.max(0.1, Math.min(o.seconds || C.duration - from, C.duration - from));
      const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ctx = new Off(2, Math.ceil(sr * secs), sr);
      const e = buildEngine(ctx, ctx.destination, { volume: 1 });
      const sess = createSession(e, tr._def, from, { loop: false, at: 0 });
      for (let i = sess.idx; i < C.events.length; i++) {
        const ev = C.events[i];
        if (ev.t >= from + secs) break;
        trigger(sess, ev, Math.max(0, ev.t - from));
      }
      return ctx.startRendering();
    },
    _warnings: warnings,
    _errors: voiceErrors,
    _compile: (id) => { const tr = music.getTrack(id); return tr ? compile(tr._def) : null; },
  };
  function applyEQ() {
    if (!E) return;
    const g = music.eq;
    E.eq.forEach((b, i) => b.gain.setTargetAtTime(g[i] || 0, E.ctx.currentTime, 0.05));
  }

  A.music = music;
})();
