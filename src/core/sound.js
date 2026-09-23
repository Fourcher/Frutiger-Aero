/* Aerium sound engine. Every sound is synthesized live with Web Audio:
   FM glass bells, warm pads, soft noise swooshes and a generated reverb.
   No recorded audio ships with Aerium. */
(function () {
  'use strict';
  const A = window.Aerium;
  const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function noteToMidi(name) {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
    if (!m) return 60;
    return NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  }
  function freq(n) { return typeof n === 'number' ? n : midiToFreq(noteToMidi(n)); }

  const sound = {
    ctx: null,
    master: null,
    sfx: null,
    musicBus: null,
    revSend: null,
    ready: false,
    freq,
    midiToFreq,
    noteToMidi,
  };

  let noiseBuf = null;

  function buildImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Soft early reflections, then a smooth exponential tail.
        const early = i < rate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.6 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) + early) * (ch ? 0.95 : 1);
      }
    }
    return buf;
  }

  sound.unlock = function () {
    if (!sound.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = (sound.ctx = new Ctx({ latencyHint: 'interactive' }));
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);
      sound.master = ctx.createGain();
      sound.master.connect(comp);
      sound.sfx = ctx.createGain();
      sound.sfx.gain.value = 1;
      sound.sfx.connect(sound.master);
      sound.musicBus = ctx.createGain();
      sound.musicBus.connect(sound.master);
      const reverb = ctx.createConvolver();
      reverb.buffer = buildImpulse(ctx, 2.8, 3.4);
      const revLP = ctx.createBiquadFilter();
      revLP.type = 'lowpass';
      revLP.frequency.value = 6500;
      const revOut = ctx.createGain();
      revOut.gain.value = 0.55;
      sound.revSend = ctx.createGain();
      sound.revSend.connect(reverb);
      reverb.connect(revLP).connect(revOut).connect(sound.master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      applyVolume();
      sound.ready = true;
      A.bus.emit('sound:ready');
    }
    if (sound.ctx.state === 'suspended') sound.ctx.resume().catch(() => {});
    return true;
  };

  function applyVolume() {
    if (!sound.master) return;
    const on = A.store.get('sound.enabled');
    const vol = A.store.get('sound.volume') / 100;
    const g = on ? Math.pow(vol, 1.6) * 0.95 : 0;
    sound.master.gain.setTargetAtTime(g, sound.ctx.currentTime, 0.03);
  }
  A.bus.on('store:sound.enabled', applyVolume);
  A.bus.on('store:sound.volume', applyVolume);
  Object.defineProperty(sound, 'enabled', { get: () => A.store.get('sound.enabled'), set: (v) => A.store.set('sound.enabled', !!v) });
  Object.defineProperty(sound, 'volume', { get: () => A.store.get('sound.volume'), set: (v) => A.store.set('sound.volume', Math.max(0, Math.min(100, Math.round(v)))) });

  // ------------------------------------------------------------ routing
  function out(node, o) {
    const dest = (o && o.dest) || sound.sfx;
    let n = node;
    if (o && o.pan) {
      const p = sound.ctx.createStereoPanner();
      p.pan.value = o.pan;
      n.connect(p);
      n = p;
    }
    n.connect(dest);
    const rev = o && o.rev != null ? o.rev : 0.25;
    if (rev > 0) {
      const g = sound.ctx.createGain();
      g.gain.value = rev;
      n.connect(g).connect(sound.revSend);
    }
  }
  function env(g, t, a, peak, dur, floor = 0.0001) {
    g.gain.setValueAtTime(floor, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, floor * 2), t + a);
    g.gain.exponentialRampToValueAtTime(floor, t + dur);
  }
  const now = () => sound.ctx.currentTime + 0.02;

  // ------------------------------------------------------------ instruments
  // FM glass bell.
  sound.bell = function (f, t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    f = freq(f); t = t == null ? now() : t;
    const dur = o.dur || 1.6, vel = o.vel || 0.2, ratio = o.ratio || 3.5, index = o.index == null ? 2 : o.index;
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f * ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.02 + 0.01, t + dur * 0.5);
    mod.connect(mg).connect(car.frequency);
    const amp = ctx.createGain();
    env(amp, t, 0.004, vel, dur);
    car.connect(amp);
    const sp = ctx.createOscillator(); sp.frequency.value = f * 2.001;
    const sg = ctx.createGain();
    env(sg, t, 0.003, vel * 0.18, dur * 0.45);
    sp.connect(sg);
    out(amp, o); out(sg, o);
    [car, mod, sp].forEach((n) => { n.start(t); n.stop(t + dur + 0.05); });
  };

  // Rhodes-like electric piano.
  sound.epiano = function (f, t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    f = freq(f); t = t == null ? now() : t;
    const dur = o.dur || 1.8, vel = o.vel || 0.16;
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.4, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.9);
    mod.connect(mg).connect(car.frequency);
    const tine = ctx.createOscillator(); tine.frequency.value = f * 7.02;
    const tg = ctx.createGain(); env(tg, t, 0.002, vel * 0.12, 0.12);
    tine.connect(tg);
    const amp = ctx.createGain(); env(amp, t, 0.004, vel, dur);
    car.connect(amp);
    out(amp, o); out(tg, o);
    [car, mod, tine].forEach((n) => { n.start(t); n.stop(t + dur + 0.05); });
  };

  // Marimba / pluck.
  sound.pluck = function (f, t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    f = freq(f); t = t == null ? now() : t;
    const dur = o.dur || 0.6, vel = o.vel || 0.2;
    const a = ctx.createOscillator(); a.frequency.value = f;
    const b = ctx.createOscillator(); b.frequency.value = f * 4.0;
    const ga = ctx.createGain(); env(ga, t, 0.003, vel, dur);
    const gb = ctx.createGain(); env(gb, t, 0.002, vel * 0.22, dur * 0.25);
    a.connect(ga); b.connect(gb);
    out(ga, o); out(gb, o);
    [a, b].forEach((n) => { n.start(t); n.stop(t + dur + 0.05); });
  };

  // Warm detuned pad chord.
  sound.pad = function (notes, t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    t = t == null ? now() : t;
    const dur = o.dur || 3, vel = o.vel || 0.06, atk = o.attack || 0.6, rel = o.release || 1.2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.cutoff || 900, t);
    lp.frequency.linearRampToValueAtTime(o.cutoffEnd || 2600, t + atk + 0.5);
    lp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + atk);
    g.gain.setValueAtTime(vel, t + Math.max(atk, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    const oscs = [];
    notes.forEach((n) => {
      const f = freq(n);
      [-7, 7].forEach((cents) => {
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = cents;
        const og = ctx.createGain(); og.gain.value = 0.35 / notes.length;
        osc.connect(og).connect(lp); oscs.push(osc);
      });
      const tri = ctx.createOscillator(); tri.type = 'triangle'; tri.frequency.value = f;
      const tg = ctx.createGain(); tg.gain.value = 0.5 / notes.length;
      tri.connect(tg).connect(lp); oscs.push(tri);
    });
    out(g, Object.assign({ rev: 0.6 }, o));
    oscs.forEach((n) => { n.start(t); n.stop(t + dur + 0.1); });
  };

  // Filtered noise gesture (swooshes, clicks, crumples).
  sound.noise = function (t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    t = t == null ? now() : t;
    const dur = o.dur || 0.2, vel = o.vel || 0.1;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f1 || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain();
    if (o.shape === 'swell') {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else env(g, t, o.attack || 0.002, vel, dur);
    src.connect(f).connect(g);
    out(g, Object.assign({ rev: 0.1 }, o));
    src.start(t, Math.random() * 1.5, dur + 0.05);
  };

  // Pitched blip with a glide.
  sound.blip = function (f1, f2, t, o = {}) {
    const ctx = sound.ctx; if (!ctx) return;
    t = t == null ? now() : t;
    const dur = o.dur || 0.08, vel = o.vel || 0.1;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq(f1), t);
    osc.frequency.exponentialRampToValueAtTime(freq(f2), t + (o.glide || dur * 0.7));
    const g = ctx.createGain(); env(g, t, o.attack || 0.003, vel, dur);
    osc.connect(g);
    out(g, Object.assign({ rev: 0.15 }, o));
    osc.start(t); osc.stop(t + dur + 0.05);
  };

  // ------------------------------------------------------------ catalog
  const S = {
    startup(t) {
      // Four warm chords resolving home, with a rising "da-dum" in glass bells.
      const chords = [
        ['G2', 'Bb3', 'D4', 'F4', 'A4'],
        ['A2', 'C4', 'F4', 'A4', 'C5'],
        ['Bb2', 'D4', 'F4', 'A4', 'C5'],
        ['F2', 'C4', 'F4', 'G4', 'A4'],
      ];
      chords.forEach((ch, i) => {
        const last = i === chords.length - 1;
        sound.pad(ch, t + i * 0.72, { dur: last ? 4.6 : 1.5, vel: last ? 0.085 : 0.07, attack: i ? 0.22 : 0.5, release: last ? 3.2 : 0.8, cutoff: 900 + i * 300, cutoffEnd: 2400 + i * 400 });
        sound.blip(ch[0], ch[0], t + i * 0.72, { dur: last ? 4 : 1.2, vel: 0.07, attack: 0.15, rev: 0.15 });
      });
      sound.bell('C5', t + 0.05, { vel: 0.1, dur: 1.6, index: 1.6, rev: 0.5, pan: -0.2 });
      sound.bell('F5', t + 0.3, { vel: 0.11, dur: 2, index: 1.5, rev: 0.5, pan: -0.1 });
      sound.bell('D5', t + 1.47, { vel: 0.1, dur: 1.6, index: 1.5, rev: 0.5, pan: 0.1 });
      sound.bell('G5', t + 1.72, { vel: 0.11, dur: 2.2, index: 1.4, rev: 0.55, pan: 0.2 });
      sound.bell('A5', t + 2.16, { vel: 0.1, dur: 3.2, index: 1.2, rev: 0.6 });
      sound.bell('F6', t + 2.3, { vel: 0.05, dur: 3.4, index: 0.7, rev: 0.7, pan: 0.35 });
      sound.bell('C7', t + 2.45, { vel: 0.03, dur: 3.4, index: 0.5, rev: 0.75, pan: -0.35 });
      sound.noise(t + 1.6, { dur: 3.2, vel: 0.012, type: 'highpass', f1: 6500, shape: 'swell', rev: 0.5 });
    },
    logon(t) {
      sound.pad(['G3', 'D4', 'A4', 'B4'], t, { dur: 2.6, vel: 0.06, attack: 0.25, release: 1.6 });
      ['D5', 'G5', 'B5', 'D6'].forEach((n, i) => sound.bell(n, t + i * 0.085, { vel: 0.09, dur: 1.8, index: 1.2, rev: 0.5 }));
    },
    logoff(t) {
      ['D6', 'B5', 'G5', 'D5'].forEach((n, i) => sound.bell(n, t + i * 0.11, { vel: 0.085, dur: 1.8, index: 1.2, rev: 0.5 }));
      sound.pad(['G3', 'D4', 'B4'], t + 0.1, { dur: 2.2, vel: 0.05, attack: 0.3, release: 1.4 });
    },
    shutdown(t) {
      sound.pad(['Eb3', 'G3', 'Bb3', 'D4'], t, { dur: 3.6, vel: 0.075, attack: 0.35, release: 2.6, cutoff: 2400, cutoffEnd: 700 });
      ['D6', 'Bb5', 'G5', 'Eb5'].forEach((n, i) => sound.bell(n, t + i * 0.2, { vel: 0.08, dur: 2.2, index: 1.1, rev: 0.6 }));
      sound.blip('Eb2', 'Eb2', t, { dur: 3, vel: 0.08, attack: 0.3 });
    },
    notify(t) {
      sound.bell('E6', t, { vel: 0.13, dur: 1.2, index: 1.5 });
      sound.bell('B5', t + 0.11, { vel: 0.11, dur: 1.4, index: 1.3 });
    },
    ding(t) { sound.bell('E6', t, { vel: 0.14, dur: 1.3, index: 1.6 }); },
    error(t) {
      sound.bell('A4', t, { vel: 0.16, dur: 0.9, ratio: 1.41, index: 2.6 });
      sound.bell('E4', t + 0.12, { vel: 0.15, dur: 1.1, ratio: 1.41, index: 2.4 });
      sound.blip(120, 70, t, { dur: 0.22, vel: 0.14, rev: 0 });
    },
    exclamation(t) {
      sound.bell('D5', t, { vel: 0.12, dur: 1.2, ratio: 2.5, index: 1.8 });
      sound.bell('A5', t, { vel: 0.08, dur: 1.2, ratio: 2.5, index: 1.4 });
    },
    question(t) {
      sound.bell('A5', t, { vel: 0.1, dur: 0.9, index: 1.2 });
      sound.bell('E6', t + 0.13, { vel: 0.1, dur: 1.1, index: 1.2 });
    },
    navigate(t) {
      sound.noise(t, { dur: 0.014, vel: 0.28, type: 'highpass', f1: 1800, rev: 0 });
      sound.blip(2400, 1500, t, { dur: 0.02, vel: 0.05, type: 'triangle', rev: 0 });
    },
    click(t) { sound.noise(t, { dur: 0.01, vel: 0.12, type: 'highpass', f1: 2600, rev: 0 }); },
    menu(t) { sound.noise(t, { dur: 0.008, vel: 0.05, type: 'highpass', f1: 3000, rev: 0 }); },
    open(t) {
      sound.noise(t, { dur: 0.22, vel: 0.05, f1: 500, f2: 2600, q: 1.1, rev: 0.2 });
      sound.blip(620, 920, t, { dur: 0.2, vel: 0.012 });
    },
    close(t) {
      sound.noise(t, { dur: 0.2, vel: 0.045, f1: 2400, f2: 500, q: 1.1, rev: 0.2 });
    },
    minimize(t) {
      sound.noise(t, { dur: 0.2, vel: 0.04, f1: 2200, f2: 400, q: 1.4 });
      sound.blip(900, 420, t, { dur: 0.18, vel: 0.02 });
    },
    maximize(t) {
      sound.noise(t, { dur: 0.18, vel: 0.04, f1: 420, f2: 2200, q: 1.4 });
      sound.blip(420, 900, t, { dur: 0.16, vel: 0.02 });
    },
    message(t) {
      sound.pluck('E5', t, { vel: 0.2, dur: 0.5, rev: 0.25 });
      sound.pluck('B5', t + 0.08, { vel: 0.2, dur: 0.7, rev: 0.3 });
    },
    signin(t) {
      ['C6', 'E6', 'G6'].forEach((n, i) => sound.bell(n, t + i * 0.09, { vel: 0.085, dur: 1, ratio: 2, index: 0.9 }));
    },
    signout(t) {
      ['G5', 'E5'].forEach((n, i) => sound.bell(n, t + i * 0.1, { vel: 0.07, dur: 0.9, ratio: 2, index: 0.9 }));
    },
    nudge(t) {
      const ctx = sound.ctx;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      const g = ctx.createGain(); env(g, t, 0.02, 0.2, 0.72);
      const trem = ctx.createGain(); trem.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 15;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
      lfo.connect(lfoG).connect(trem.gain);
      [120, 60].forEach((f) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + 0.7); });
      lp.connect(trem).connect(g);
      out(g, { rev: 0.05 });
      lfo.start(t); lfo.stop(t + 0.7);
      sound.noise(t, { dur: 0.6, vel: 0.12, f1: 900, q: 3, rev: 0 });
    },
    recycle(t) {
      for (let i = 0; i < 16; i++) {
        sound.noise(t + Math.random() * 0.45, { dur: 0.015 + Math.random() * 0.05, vel: 0.05 + Math.random() * 0.14, f1: 1200 + Math.random() * 3500, q: 0.9, rev: 0.05 });
      }
    },
    empty(t) {
      S.recycle(t);
      S.recycle(t + 0.35);
      sound.noise(t + 0.2, { dur: 0.5, vel: 0.05, f1: 3000, f2: 400, q: 0.8 });
    },
    pop(t) {
      sound.blip(560, 1500, t, { dur: 0.07, vel: 0.18, glide: 0.04 });
      sound.noise(t, { dur: 0.006, vel: 0.08, type: 'highpass', f1: 3000, rev: 0 });
    },
    plop(t) {
      sound.blip(900, 280, t, { dur: 0.09, vel: 0.08, glide: 0.07 });
    },
    bubble(t) {
      sound.blip(700 + Math.random() * 500, 1600 + Math.random() * 800, t, { dur: 0.05, vel: 0.05, glide: 0.035 });
    },
    hover(t) { sound.bell(3000, t, { vel: 0.035, dur: 0.05, ratio: 2.7, index: 0.8, rev: 0.05 }); },
    zap(t) { sound.blip(900, 2800, t, { dur: 0.08, vel: 0.06, glide: 0.07, type: 'triangle' }); },
    whooshIn(t) { sound.noise(t, { dur: 0.35, vel: 0.07, f1: 400, f2: 3000, q: 1.2, shape: 'swell', rev: 0.3 }); },
    whooshOut(t) { sound.noise(t, { dur: 0.35, vel: 0.07, f1: 3000, f2: 400, q: 1.2, shape: 'swell', rev: 0.3 }); },
    select(t) {
      sound.bell('G6', t, { vel: 0.08, dur: 0.5, ratio: 2, index: 1 });
      sound.bell('C7', t + 0.05, { vel: 0.05, dur: 0.6, ratio: 2, index: 0.8 });
    },
    back(t) {
      sound.bell('C7', t, { vel: 0.05, dur: 0.4, ratio: 2, index: 0.8 });
      sound.bell('G6', t + 0.05, { vel: 0.06, dur: 0.5, ratio: 2, index: 0.8 });
    },
    win(t) {
      ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => sound.bell(n, t + i * 0.09, { vel: 0.1, dur: 1.6, index: 1.2, rev: 0.5 }));
      sound.pad(['C4', 'E4', 'G4', 'B4'], t + 0.3, { dur: 2.2, vel: 0.05, attack: 0.3 });
      for (let i = 0; i < 6; i++) sound.bell(midiToFreq(96 + Math.floor(Math.random() * 12)), t + 0.5 + i * 0.07, { vel: 0.03, dur: 0.8, index: 0.6, rev: 0.7 });
    },
    lose(t) {
      sound.noise(t, { dur: 1, vel: 0.35, type: 'lowpass', f1: 700, f2: 120, q: 0.7, rev: 0.2 });
      sound.blip(90, 38, t, { dur: 0.7, vel: 0.3, glide: 0.6 });
    },
    balloon(t) {
      sound.blip(700, 1100, t, { dur: 0.06, vel: 0.07 });
      sound.bell(1760, t + 0.05, { vel: 0.06, dur: 0.8, ratio: 2, index: 0.8 });
    },
    snap(t) {
      sound.noise(t, { dur: 0.05, vel: 0.12, type: 'lowpass', f1: 500, rev: 0 });
      sound.blip(220, 150, t, { dur: 0.06, vel: 0.07, rev: 0 });
    },
    card(t) { sound.noise(t, { dur: 0.035, vel: 0.12, f1: 2400, q: 0.9, rev: 0.05 }); },
    shuffle(t) { for (let i = 0; i < 10; i++) S.card(t + i * 0.045 + Math.random() * 0.02); },
    coin(t) {
      sound.bell('B5', t, { vel: 0.08, dur: 0.3, ratio: 2, index: 0.6 });
      sound.bell('E6', t + 0.06, { vel: 0.08, dur: 0.6, ratio: 2, index: 0.6 });
    },
    flag(t) { sound.bell('A6', t, { vel: 0.05, dur: 0.3, ratio: 2, index: 0.5 }); },
    lock(t) {
      sound.bell('E5', t, { vel: 0.08, dur: 0.6, ratio: 2, index: 1 });
      sound.bell('B4', t + 0.09, { vel: 0.08, dur: 0.8, ratio: 2, index: 1 });
    },
    connect(t) {
      sound.bell('E5', t, { vel: 0.08, dur: 0.6, ratio: 2, index: 1 });
      sound.bell('A5', t + 0.12, { vel: 0.09, dur: 0.9, ratio: 2, index: 1 });
    },
    disconnect(t) {
      sound.bell('A5', t, { vel: 0.08, dur: 0.6, ratio: 2, index: 1 });
      sound.bell('E5', t + 0.12, { vel: 0.09, dur: 0.9, ratio: 2, index: 1 });
    },
    type(t) { sound.noise(t, { dur: 0.012, vel: 0.05, f1: 3000 + Math.random() * 2000, q: 2, rev: 0 }); },
  };
  S.tada = S.win;
  S.critical = S.error;
  S.warning = S.exclamation;
  S.info = S.notify;
  sound.catalog = Object.keys(S);

  const lastPlayed = {};
  sound.play = function (name, opts) {
    if (!sound.ctx || !A.store.get('sound.enabled')) return;
    if (sound.ctx.state === 'suspended') sound.ctx.resume().catch(() => {});
    const fn = S[name];
    if (!fn) return;
    // Rate-limit identical sounds so rapid events do not pile up.
    const n = performance.now();
    if (lastPlayed[name] && n - lastPlayed[name] < ((opts && opts.minGap) || 35)) return;
    lastPlayed[name] = n;
    try { fn(sound.ctx.currentTime + 0.015 + ((opts && opts.delay) || 0)); } catch (e) { console.warn('[Aerium] sound failed', name, e); }
  };
  sound.register = function (name, fn) { S[name] = fn; if (!sound.catalog.includes(name)) sound.catalog.push(name); };

  // Unlock audio on the first gesture anywhere.
  function firstGesture() {
    sound.unlock();
    window.removeEventListener('pointerdown', firstGesture, true);
    window.removeEventListener('keydown', firstGesture, true);
  }
  window.addEventListener('pointerdown', firstGesture, true);
  window.addEventListener('keydown', firstGesture, true);

  A.sound = sound;
})();
