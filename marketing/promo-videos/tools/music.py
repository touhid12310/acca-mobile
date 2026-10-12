"""Original music for the ten AccountE promos (synthesized; royalty-free by construction).
Each track is 56.0 s: scene beats every 2.8 s, impact on the shared end card at 50.4 s.
usage: python3 tools/music.py 01_kinetic [..]   -> out/<id>/music.wav"""
import os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import *          # noqa
from instruments import *    # noqa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR, END = 56.0, 50.4
BEAT = 2.8  # scene beat

class Song:
    def __init__(self, bpm, stems=('drums', 'bass', 'chords', 'lead', 'pad', 'fx', 'perc')):
        self.bpm = bpm; self.b = 60.0 / bpm; self.bar = 4 * self.b
        self.s = {k: Bus(DUR) for k in stems}; self.kicks = []
        self.nbars = int(np.ceil(DUR / self.bar))
    def t(self, bar, beat=0.0): return bar * self.bar + beat * self.b
    def add(self, stem, sig, t, gain=1.0, pan=0.0):
        if t < DUR: self.s[stem].add(sig, t, gain, pan)
    def kick(self, t, gain=1.0, **kw):
        self.add('drums', kick(**kw), t, gain); self.kicks.append(t)
    def mix(self, gains, sc=None, verb=None, sc_depth=0.55, sc_rel=None, target=None):
        out = np.zeros((int(DUR * SR), 2))
        g = sidechain(len(out), self.kicks, sc_depth, sc_rel or self.b * 0.38) if sc else None
        for k, bus in self.s.items():
            x = bus.buf
            if k != 'bass' and k != 'drums': x = hp(x, 140)
            if verb and k in verb: x = reverb(x, verb[k][0], verb[k][1])
            if sc and k in sc: x = x * g[:, None]
            out += x * gains.get(k, 1.0)
        # fade tail
        n = len(out); f = int(0.9 * SR); out[n - f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
        return master(out, target=target)

def end_hit(S, root, q='', stem_inst='chords', inst=None, gain=0.8, low=52, high=74):
    S.add('fx', impact(), END, 0.9); S.add('drums', crash(2.2), END, 0.7)
    for nt in chord(root, q, low, high):
        S.add('pad', pad(nt, 4.2, cutoff=2600, a=0.02, r=1.6), END, 0.32)
        if inst: S.add(stem_inst, inst(nt, 2.0), END, gain)
    S.add('bass', subbass(root - 24 if root >= 48 else root - 12, 4.0, rel=1.2), END, 0.7)

def sec(t, cuts):
    """return section label for time t from [(t_start,label),...]"""
    lab = cuts[0][1]
    for t0, l in cuts:
        if t >= t0: lab = l
    return lab

# ======================================================================
def s01():  # Kinetic type — electro-pop 128.57 BPM, A minor / C
    S = Song(900 / 7)  # 128.571
    prog = [(57, 'm'), (53, ''), (48, ''), (55, '')]  # Am F C G
    cuts = [(0, 'hook'), (2.8, 'groove'), (30.8, 'break'), (36.4, 'peak'), (47.6, 'rise'), (END, 'end')]
    hook = [0, 3, 7, 10, 12, 10, 7, 3]  # semitone offsets around A4
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            if lab in ('groove', 'peak', 'hook'): S.kick(tb, 1.0)
            if lab == 'break' and bt == 0: S.kick(tb, 0.7)
            if lab in ('groove', 'peak') and bt in (1, 3): S.add('drums', clap(), tb, 0.55)
            if lab != 'break': S.add('drums', hat(True, 0.12), tb + S.b / 2, 0.22)
            if lab == 'peak':
                for k in (0.25, 0.75): S.add('drums', hat(), tb + S.b * k, 0.18)
            # offbeat bass
            if lab in ('groove', 'peak', 'hook'):
                S.add('bass', bass(r - 24, S.b * 0.42, cutoff=520), tb + S.b / 2, 0.55)
            # chord stabs on off-beats
            if lab in ('groove', 'peak', 'break'):
                for nt in chord(r, q, 60, 76):
                    S.add('chords', supersaw(nt, S.b * 0.3, cutoff=3200 if lab != 'break' else 1500, a=0.003, d=0.12, s=0.5, r=0.12), tb + S.b / 2, 0.16)
        # pluck hook (peak + groove second half)
        if lab in ('peak',) or (lab == 'groove' and t0 > 14):
            for i, off in enumerate(hook):
                S.add('lead', pluck(69 + off, 0.3, bright=1.6), t0 + i * S.b / 2, 0.35, pan=0.25 if i % 2 else -0.25)
        if lab in ('groove', 'peak', 'break', 'hook'):
            for nt in chord(r, q, 52, 67):
                S.add('pad', pad(nt, S.bar, cutoff=1400 if lab != 'peak' else 2400, a=0.2, r=0.4), t0, 0.12)
    # accents on every scene cut
    for k in range(1, 18):
        S.add('fx', hat(True, 0.3), k * BEAT, 0.12)
    S.add('fx', riser(2.6), END - 2.6, 0.5); S.add('fx', riser(2.4), 36.4 - 2.4, 0.35)
    S.add('drums', crash(), 36.4, 0.4); S.add('drums', crash(), 2.8, 0.35)
    end_hit(S, 57, 'm', inst=lambda n, d: pluck(n, 1.2, bright=1.4), gain=0.3)
    S.add('lead', pluck(81, 1.5), END + 2.8, 0.25)
    return S.mix({'drums': 0.9, 'bass': 0.85, 'chords': 0.7, 'lead': 0.6, 'pad': 0.6, 'fx': 0.6}, sc=('bass', 'chords', 'pad', 'lead'),
                 verb={'chords': (0.25, 1.6), 'lead': (0.3, 1.8), 'pad': (0.35, 2.4), 'fx': (0.3, 2.0)})

def s02():  # 2D flat — playful marimba/pluck, 107.14 BPM, F major
    S = Song(750 / 7)  # 107.14
    prog = [(53, ''), (48, ''), (50, 'm'), (46, '')]  # F C Dm Bb
    cuts = [(0, 'hook'), (2.8, 'a'), (28.0, 'b'), (33.6, 'c'), (47.6, 'rise'), (END, 'end')]
    mel = [72, 74, 77, 79, 77, 74, 72, 69]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            if bt in (0, 2) and (lab != 'hook' or bt == 0): S.kick(tb, 0.75, decay=0.22, f0=140)
            if bt in (1, 3) and lab in ('a', 'c'): S.add('drums', clap(0.12), tb, 0.45)
            if bt in (1, 3) and lab == 'b': S.add('drums', rim(), tb, 0.35)
            for k in (0, 0.5): S.add('perc', shaker(), tb + S.b * k + 0.01, 0.28 if k else 0.18)
            notes = chord(r, q, 60, 79)
            S.add('chords', marimba(notes[(bt) % len(notes)]), tb, 0.28, pan=-0.3)
            S.add('chords', marimba(notes[(bt + 1) % len(notes)] + 12 if lab == 'c' else notes[(bt + 1) % len(notes)]), tb + S.b / 2, 0.22, pan=0.3)
            # bass pluck
            if bt in (0, 2): S.add('bass', bass(r - 24, S.b * 0.45, kind='square', cutoff=600, env_amt=3, sub=0.8), tb, 0.42)
        if lab in ('a', 'c') and bar % 2 == 1:
            for i, m in enumerate(mel):
                S.add('lead', fm_bell(m, 0.5, ratio=3.5, index=1.8, decay=0.6), t0 + i * S.b / 2, 0.18, pan=0.2)
        for nt in chord(r, q, 53, 69):
            S.add('pad', pad(nt, S.bar, cutoff=1600, a=0.3, r=0.5, voices=3), t0, 0.07)
    # pops at scene cuts
    for k in range(1, 18): S.add('fx', fm_bell(84 + (k % 3) * 2, 0.3, ratio=2, index=1, decay=0.25), k * BEAT, 0.1)
    S.add('fx', riser(2.6, tone=False), END - 2.6, 0.35)
    end_hit(S, 53, '', inst=marimba, gain=0.4)
    S.add('lead', fm_bell(77, 1.2, decay=1.2), END + 0.6, 0.2); S.add('lead', fm_bell(81, 1.2, decay=1.2), END + 1.2, 0.2); S.add('lead', fm_bell(84, 2, decay=1.6), END + 1.8, 0.22)
    return S.mix({'drums': 0.85, 'bass': 0.8, 'chords': 0.9, 'lead': 0.8, 'pad': 0.6, 'fx': 0.6, 'perc': 0.8}, sc=('pad',),
                 verb={'chords': (0.18, 1.2), 'lead': (0.3, 1.8), 'pad': (0.3, 2.0), 'fx': (0.3, 1.5)}, sc_depth=0.3)

def s03():  # 3D — future-bass / cinematic electronic, 85.71 BPM half-time feel, D minor
    S = Song(600 / 7)  # 85.714 -> bar = 2.8 s
    prog = [(50, 'm'), (46, ''), (53, ''), (48, '')]  # Dm Bb F C
    cuts = [(0, 'hook'), (5.6, 'a'), (22.4, 'b'), (33.6, 'drop'), (47.6, 'rise'), (END, 'end')]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        S.kick(t0, 1.0, decay=0.42, f0=130, f1=40)
        if lab in ('a', 'b', 'drop'): S.kick(S.t(bar, 2.5), 0.7, decay=0.35, f0=130, f1=40)
        if lab != 'hook': S.add('drums', mixs(snare(200, 0.22), clap(0.2) * 0.6), S.t(bar, 2), 0.55)
        # trap hats 16ths/32nd rolls
        if lab in ('b', 'drop'):
            for k in range(16):
                S.add('drums', hat(decay=0.025), S.t(bar, k / 4), 0.16 if k % 2 == 0 else 0.1)
            if bar % 2 == 1:
                for k in range(8): S.add('drums', hat(decay=0.015), S.t(bar, 3.5 + k / 16), 0.08)
        # supersaw chords, pumping
        if lab in ('a', 'b', 'drop', 'hook'):
            for nt in chord(r, q, 57, 77):
                ss = supersaw(nt, S.bar * 0.98, cutoff=2400 if lab in ('a', 'hook') else 4200, a=0.02, d=0.4, s=0.75, r=0.2)
                S.add('chords', ss, t0, 0.14)
        # sub bass
        S.add('bass', subbass(r - 24, S.bar * 0.95), t0, 0.75)
        if lab == 'drop':
            S.add('bass', bass(r - 12, S.b * 0.9, cutoff=900, env_amt=3), S.t(bar, 1.5), 0.3)
            # vocal-like lead chops (square through formant-ish bandpass)
            for i, off in enumerate([12, 10, 7, 5, 7, 3]):
                S.add('lead', bp(lead(r + off + 12, S.b * 0.4, 2600), 500, 3000) * 1.6, S.t(bar, i * 0.5 + 0.5), 0.28, pan=(-0.3 if i % 2 else 0.3))
        for nt in chord(r, q, 50, 65):
            S.add('pad', pad(nt, S.bar, cutoff=1200, a=0.6, r=0.8), t0, 0.08)
    for k in (5.6, 22.4, 33.6): S.add('drums', crash(2.0), k, 0.4)
    S.add('fx', riser(2.7), 33.6 - 2.7, 0.5); S.add('fx', riser(2.6), END - 2.6, 0.55)
    S.add('fx', impact(1.6, 40), 0.0, 0.6)
    for k in range(1, 18): S.add('fx', downlift(0.6), k * BEAT, 0.08)
    end_hit(S, 50, 'm', inst=lambda n, d: fm_bell(n + 12, 2, ratio=2, index=1.5, decay=1.8), gain=0.25)
    return S.mix({'drums': 0.9, 'bass': 0.9, 'chords': 0.75, 'lead': 0.6, 'pad': 0.6, 'fx': 0.65}, sc=('chords', 'pad', 'lead'),
                 verb={'chords': (0.3, 2.2), 'lead': (0.35, 2.4), 'pad': (0.4, 3.0), 'fx': (0.35, 2.6)}, sc_depth=0.7, sc_rel=0.32)

def s04():  # Isometric — quirky marimba/pluck, 107.14 BPM, G major
    S = Song(750 / 7)
    prog = [(55, ''), (52, 'm'), (48, ''), (50, '')]  # G Em C D
    cuts = [(0, 'hook'), (2.8, 'a'), (14.0, 'b'), (28.0, 'c'), (39.2, 'd'), (47.6, 'rise'), (END, 'end')]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        notes = chord(r, q, 64, 84)
        for k in range(8):
            tb = S.t(bar, k / 2)
            if tb >= END: break
            lab = sec(tb, cuts)
            pat = [0, 2, 1, 2, 0, 2, 1, 2] if lab in ('a', 'hook') else [0, 1, 2, 1, 2, 1, 0, 2]
            nt = notes[pat[k] % len(notes)] + (12 if (lab == 'c' and k in (3, 7)) else 0)
            S.add('chords', marimba(nt), tb, 0.3, pan=(-0.35 if k % 2 else 0.35))
            if k % 2 == 0: S.add('perc', woodblock(1000 if k % 4 == 0 else 760), tb + S.b / 4, 0.12)
            if lab in ('b', 'c', 'd') and k % 2 == 1: S.add('perc', shaker(), tb, 0.2)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            if bt in (0, 2) and lab != 'hook': S.kick(tb, 0.7, decay=0.2, f0=130)
            if bt in (1, 3) and lab in ('b', 'c', 'd'): S.add('drums', snare(220, 0.1, 5000, 0.6), tb, 0.3)
            S.add('bass', pluck(r - 24 + (7 if bt == 2 else 0), 0.4, bright=0.6, decay=0.5), tb, 0.65 if lab != 'hook' else 0.3)
        if lab in ('b', 'd'):
            for i, off in enumerate([7, 9, 11, 14, 11, 9]):
                S.add('lead', pluck(r + 12 + off, 0.25, bright=2.2, decay=0.4), t0 + i * S.b * 2 / 3, 0.2, pan=0.15)
        for nt in chord(r, q, 52, 67):
            S.add('pad', pad(nt, S.bar, cutoff=1400, a=0.4, voices=3), t0, 0.06)
    for k in range(1, 18): S.add('fx', woodblock(1400), k * BEAT, 0.12)
    S.add('fx', riser(2.6, tone=False), END - 2.6, 0.3)
    end_hit(S, 55, '', inst=marimba, gain=0.45)
    for i, m in enumerate([79, 83, 86, 91]): S.add('lead', marimba(m), END + 0.35 + i * 0.28, 0.3)
    return S.mix({'drums': 0.8, 'bass': 0.8, 'chords': 0.9, 'lead': 0.8, 'pad': 0.6, 'fx': 0.6, 'perc': 0.8}, sc=('pad',),
                 verb={'chords': (0.2, 1.3), 'lead': (0.3, 1.6), 'pad': (0.3, 2.2), 'fx': (0.25, 1.4)}, sc_depth=0.25)

def s05():  # Device mockup — minimal tech-house 128.57, E minor
    S = Song(900 / 7)
    prog = [(52, 'm7'), (52, 'm7'), (48, 'maj7'), (55, '')]
    cuts = [(0, 'hook'), (2.8, 'a'), (19.6, 'b'), (33.6, 'c'), (47.6, 'rise'), (END, 'end')]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            S.kick(tb, 0.95 if lab != 'hook' or bt == 0 else 0.6, decay=0.28)
            S.add('drums', hat(True, 0.09, 9000), tb + S.b / 2, 0.24)
            if lab in ('b', 'c') and bt in (1, 3): S.add('drums', clap(0.14), tb, 0.38)
            if lab == 'c':
                for k in (0.25, 0.75): S.add('drums', hat(decay=0.02), tb + S.b * k, 0.12)
            S.add('perc', shaker(0.04), tb + S.b * 0.25, 0.14); S.add('perc', shaker(0.04), tb + S.b * 0.75, 0.1)
            # rolling bass 16ths offbeat
            for k in (0.25, 0.5, 0.75):
                if lab != 'hook': S.add('bass', bass(r - 24 + (12 if k == 0.5 else 0), S.b * 0.2, cutoff=420, env_amt=2.5, sub=0.5), tb + S.b * k, 0.42)
        # minimal chord stab every bar (dub chord with delay)
        st = np.zeros((1, 2))
        for nt in chord(r, q, 60, 76):
            S.add('chords', supersaw(nt, S.b * 0.18, voices=3, cutoff=2200, a=0.002, d=0.1, s=0.3, r=0.15), S.t(bar, 1.5), 0.12)
        if lab in ('b', 'c'):
            for i, off in enumerate([0, 7, 12, 7, 15, 12, 7, 3]):
                S.add('lead', pluck(r + 12 + off, 0.2, bright=1.8, decay=0.35), S.t(bar, i * 0.5), 0.2, pan=(-0.4 if i % 2 else 0.4))
        for nt in chord(r, q, 52, 67): S.add('pad', pad(nt, S.bar, cutoff=1100, a=0.5, voices=3), t0, 0.06)
    for k in range(1, 18): S.add('fx', rim(2400), k * BEAT, 0.1)
    S.add('fx', riser(2.6), END - 2.6, 0.45); S.add('fx', riser(2.4, tone=False), 19.6 - 2.4, 0.25)
    end_hit(S, 52, 'm7', inst=lambda n, d: pluck(n, 1.5, bright=1.2, decay=1.2), gain=0.3)
    return S.mix({'drums': 0.9, 'bass': 0.85, 'chords': 0.7, 'lead': 0.7, 'pad': 0.6, 'fx': 0.5, 'perc': 0.7}, sc=('bass', 'chords', 'pad'),
                 verb={'chords': (0.35, 2.0), 'lead': (0.3, 1.6), 'pad': (0.35, 2.4), 'fx': (0.3, 1.5)})

def s06():  # Data viz — driving corporate electronic 128.57, A major
    S = Song(900 / 7)
    prog = [(57, ''), (52, ''), (54, 'm'), (50, '')]  # A E F#m D
    cuts = [(0, 'hook'), (5.6, 'a'), (22.4, 'b'), (33.6, 'c'), (47.6, 'rise'), (END, 'end')]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        notes = chord(r, q, 64, 81)
        for k in range(16):
            tb = S.t(bar, k / 4)
            if tb >= END: break
            nt = (notes + [n + 12 for n in notes])[[0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 2, 1, 2][k] % (2 * len(notes))]
            if lab != 'hook' or k < 8:
                S.add('lead', arp_saw(nt, S.b * 0.22, cutoff=1800 if lab in ('hook', 'a') else 3000), tb, 0.13, pan=(-0.3 if k % 2 else 0.3))
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            if lab != 'hook': S.kick(tb, 0.9)
            if bt in (1, 3) and lab in ('b', 'c'): S.add('drums', mixs(clap(0.15), snare(200, 0.12) * 0.4), tb, 0.45)
            if lab in ('a', 'b', 'c'): S.add('drums', hat(True, 0.1), tb + S.b / 2, 0.2)
            for k in (0, 0.5):
                if lab != 'hook': S.add('bass', bass(r - 24, S.b * 0.4, cutoff=600, env_amt=2), tb + S.b * k, 0.4)
        for nt in chord(r, q, 55, 71):
            S.add('pad', pad(nt, S.bar, cutoff=1800 if lab != 'c' else 2800, a=0.15, r=0.4), t0, 0.1)
    for k in range(1, 18): S.add('fx', hat(True, 0.25), k * BEAT, 0.12)
    for k in (5.6, 22.4, 33.6): S.add('drums', crash(), k, 0.38)
    S.add('fx', riser(2.6), 5.6 - 2.6, 0.3); S.add('fx', riser(2.6), END - 2.6, 0.5)
    end_hit(S, 57, '', inst=lambda n, d: pluck(n, 1.4, bright=1.5), gain=0.3)
    return S.mix({'drums': 0.9, 'bass': 0.85, 'chords': 0.7, 'lead': 0.7, 'pad': 0.65, 'fx': 0.55}, sc=('bass', 'pad', 'lead'),
                 verb={'lead': (0.25, 1.4), 'pad': (0.35, 2.4), 'fx': (0.3, 1.8)}, sc_depth=0.45)

def s07():  # Glitch — dark synthwave, 107.14, F minor
    S = Song(750 / 7)
    prog = [(53, 'm'), (49, ''), (56, ''), (51, '')]  # Fm Db Ab Eb
    cuts = [(0, 'hook'), (5.6, 'a'), (11.2, 'b'), (39.2, 'c'), (47.6, 'rise'), (END, 'end')]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]; lab = sec(t0, cuts)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            lab = sec(tb, cuts)
            if bt in (0, 2) and lab != 'hook': S.kick(tb, 1.0, decay=0.35, f0=120, drive=2.0)
            if bt in (1, 3) and lab in ('a', 'b', 'c'): S.add('drums', snare(170, 0.25, 7000, 1.2), tb, 0.5)
            for k in range(4):
                if lab != 'hook': S.add('drums', hat(decay=0.02, tone=9000), tb + k * S.b / 4, 0.1 if k % 2 else 0.16)
            # gated 16th bass
            for k in range(4):
                if lab in ('a', 'b', 'c') or (lab == 'hook' and bt >= 2):
                    S.add('bass', bass(r - 24, S.b * 0.2, cutoff=380, env_amt=4, sub=0.6, drive=2.0), tb + k * S.b / 4, 0.38)
        # arp
        notes = chord(r, q, 65, 84)
        if lab in ('b', 'c'):
            for k in range(8):
                S.add('lead', arp_saw(notes[k % len(notes)] + (12 if k >= 4 else 0), S.b * 0.4, cutoff=2600), S.t(bar, k / 2), 0.12, pan=(-0.5 if k % 2 else 0.5))
        for nt in chord(r, q, 53, 70):
            S.add('pad', strings(nt, S.bar, a=0.6, cutoff=1800), t0, 0.11)
    # glitch hits on module boundaries + crushed stutters
    for k in [0, 2.8, 5.6, 11.2, 16.8, 22.4, 28.0, 33.6, 39.2, 44.8, 47.6]:
        g = crush(noise(int(0.18 * SR)) * np.exp(-np.arange(int(0.18 * SR)) / SR / 0.06), 4, 12)
        S.add('fx', g, k, 0.22)
        st = crush(bass(65, 0.05, cutoff=2000, env_amt=1), 5, 8)
        for j in range(4): S.add('fx', st, k + 0.06 * j, 0.15)
    S.add('fx', impact(1.8, 38), 0.0, 0.7); S.add('fx', riser(2.6), END - 2.6, 0.5)
    for k in (5.6, 11.2, 39.2): S.add('drums', crash(1.8), k, 0.35)
    end_hit(S, 53, 'm', inst=lambda n, d: fm_bell(n, 2.5, ratio=1.41, index=2.5, decay=2.0), gain=0.25)
    return S.mix({'drums': 0.9, 'bass': 0.9, 'chords': 0.7, 'lead': 0.7, 'pad': 0.7, 'fx': 0.6}, sc=('bass', 'pad', 'lead'),
                 verb={'drums': (0.12, 1.4), 'lead': (0.35, 2.2), 'pad': (0.4, 3.0), 'fx': (0.3, 2.2)}, sc_depth=0.5)

def s08():  # Cinematic — hybrid orchestral, 85.71 BPM, C minor
    S = Song(600 / 7)
    prog = [(48, 'm'), (44, ''), (51, ''), (46, '')]  # Cm Ab Eb Bb
    chapters = [5.6, 15.4, 25.2, 35.0, 44.8]
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]
        energy = 0.4 + 0.6 * min(1, t0 / 44.8)
        for nt in chord(r, q, 48, 70):
            S.add('pad', strings(nt, S.bar, a=0.8, r=1.2, cutoff=1500 + 2500 * energy), t0, 0.16)
        S.add('bass', strings(r - 24, S.bar, a=0.4, cutoff=900)[:, 0], t0, 0.35)
        S.add('bass', subbass(r - 24, S.bar), t0, 0.35)
        # pulse ostinato 8ths
        if t0 >= 5.6:
            for k in range(8):
                S.add('chords', pluck(r + (12 if k % 2 else 0), 0.25, bright=0.8, decay=0.25), S.t(bar, k / 2), 0.18 * energy + 0.05, pan=(-0.3 if k % 2 else 0.3))
        # piano motif every other bar
        if bar % 2 == 0:
            mot = [r + 24, r + 27, r + 31, r + 26] if q == 'm' else [r + 24, r + 28, r + 31, r + 26]
            for i, m in enumerate(mot): S.add('lead', piano(m, 0.6, vel=0.55 + 0.2 * energy), S.t(bar, i), 0.5)
        if t0 >= 25.2:
            S.add('drums', taiko(0.6), S.t(bar, 0), 0.35 * energy); S.add('drums', tom(110, 70, 0.3), S.t(bar, 2.5), 0.25 * energy)
    for c in chapters:
        S.add('drums', taiko(1.2), c, 0.8); S.add('fx', impact(2.5, 42), c, 0.45); S.add('fx', rev_cymbal(1.6), c - 1.6, 0.35)
    S.add('fx', impact(3.0, 38), 0.0, 0.5); S.add('fx', riser(2.6), END - 2.6, 0.5)
    for k in range(1, 18):
        if k * BEAT not in chapters: S.add('fx', downlift(0.8), k * BEAT, 0.06)
    end_hit(S, 48, 'm', inst=lambda n, d: piano(n, 2.5, vel=0.7), gain=0.5, low=48, high=72)
    return S.mix({'drums': 0.9, 'bass': 0.8, 'chords': 0.6, 'lead': 0.8, 'pad': 0.8, 'fx': 0.6}, sc=None,
                 verb={'drums': (0.3, 3.0), 'chords': (0.3, 2.4), 'lead': (0.4, 3.2), 'pad': (0.45, 3.6), 'fx': (0.4, 3.0)}, target=[-9, -5, -7.5, -7.5, -13.5, -21])

def s09():  # Paper-cut — lo-fi, 85.71 BPM, Bb major 7ths, swing
    S = Song(600 / 7)
    prog = [(58, 'maj7'), (55, 'm7'), (51, 'maj7'), (53, '7')]  # Bbmaj7 Gm7 Ebmaj7 F7
    sw = 0.08  # swing
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]
        for nt in chord(r, q, 55, 74):
            S.add('chords', epiano(nt, S.bar * 0.95, vel=0.6), t0 + RNG.random() * 0.02, 0.32)
        S.add('bass', lp(bass(r - 24, S.b * 1.6, cutoff=380, env_amt=1.4, sub=0.9, drive=1.1), 800), t0, 0.5)
        S.add('bass', lp(bass(r - 24 + 7, S.b * 0.8, cutoff=380, env_amt=1.4, sub=0.9, drive=1.1), 800), S.t(bar, 2.5), 0.4)
        for bt in range(4):
            tb = S.t(bar, bt)
            if tb >= END: break
            if bt in (0,) or (bt == 2 and bar % 2): S.kick(tb, 0.7, decay=0.25, f0=110, f1=50, click=0.05)
            if bt == 2 and not bar % 2: S.kick(tb + S.b * 0.5 + sw, 0.5, decay=0.22, f0=110, f1=50, click=0.05)
            if bt in (1, 3): S.add('drums', lp(snare(190, 0.14, 4000, 0.7), 4500), tb, 0.35)
            S.add('perc', lp(hat(decay=0.03, tone=6000), 7000), tb, 0.14)
            S.add('perc', lp(hat(decay=0.03, tone=6000), 7000), tb + S.b / 2 + sw, 0.1)
        if bar % 2 == 1 and t0 > 5:
            for i, (off, d) in enumerate([(14, 0.5), (12, 0.5), (9, 1.0), (7, 0.5)]):
                S.add('lead', fm_bell(r + off + 12, d, ratio=2.0, index=1.2, decay=0.8), S.t(bar, i * 0.75 + 0.5), 0.13)
    S.add('fx', vinyl(DUR), 0.0, 1.0)
    for k in range(1, 18): S.add('fx', lp(noise(int(0.15 * SR)), 3000) * np.linspace(0, 1, int(0.15 * SR)) ** 0.5 * np.linspace(1, 0, int(0.15 * SR)) ** 2, k * BEAT - 0.05, 0.05)
    end_hit(S, 58, 'maj7', inst=lambda n, d: epiano(n, 3.0, vel=0.7), gain=0.35)
    mix = S.mix({'drums': 0.85, 'bass': 0.85, 'chords': 0.85, 'lead': 0.7, 'pad': 0.55, 'fx': 0.9, 'perc': 0.8}, sc=None,
                verb={'chords': (0.25, 2.0), 'lead': (0.35, 2.4), 'pad': (0.3, 2.6)}, target=[-10, -4.5, -7, -7, -14, -24])
    # tape wow + lowpass for lo-fi glue
    n = len(mix); t = np.arange(n) / SR
    idx = np.clip(np.arange(n) + (0.0018 * SR * np.sin(2 * np.pi * 0.55 * t)), 0, n - 1)
    mix = np.stack([np.interp(idx, np.arange(n), mix[:, c]) for c in range(2)], 1)
    return master(lp(mix, 9000), target=[-10, -4.5, -7, -7, -14, -24])

def s10():  # Minimal premium — felt piano + pad, sparse, E major
    S = Song(600 / 7)
    prog = [(52, 'maj7'), (49, 'm7'), (45, 'maj7'), (47, 'sus4')]  # Emaj7 C#m7 Amaj7 Bsus4
    for bar in range(S.nbars):
        t0 = S.t(bar)
        if t0 >= END: break
        r, q = prog[bar % 4]
        for nt in chord(r, q, 52, 71):
            S.add('pad', pad(nt, S.bar, cutoff=1200, a=1.0, r=1.6, voices=3, detune=0.08), t0, 0.09)
        S.add('bass', subbass(r - 24, S.bar * 0.9, rel=0.6), t0, 0.35)
        notes = chord(r, q, 64, 83)
        pat = [(0, 0), (1, 1.5), (2, 2.5)] if bar % 2 == 0 else [(2, 0.5), (1, 2), (3 % len(notes), 3)]
        for i, (ni, bt) in enumerate(pat):
            S.add('lead', piano(notes[ni % len(notes)], 1.4, vel=0.45 + 0.1 * (i == 0), felt=True), S.t(bar, bt), 0.75)
        if t0 >= 28.0:
            for k in range(4): S.add('perc', lp(hat(decay=0.02, tone=7000), 9000), S.t(bar, k + 0.5), 0.05)
            S.add('drums', kick(0.25, 90, 45, 0.0, 1.1), t0, 0.35)
    for k in range(1, 18): S.add('fx', fm_bell(88, 0.6, ratio=2.0, index=0.6, decay=0.5), k * BEAT, 0.035)
    S.add('fx', rev_cymbal(2.4), END - 2.4, 0.18)
    end_hit(S, 52, 'maj7', inst=lambda n, d: piano(n + 12, 3.0, vel=0.55, felt=True), gain=0.6)
    S.s['fx'].buf *= 0.6
    return S.mix({'drums': 0.6, 'bass': 0.7, 'lead': 0.95, 'pad': 0.75, 'fx': 0.7, 'perc': 0.6}, sc=None,
                 verb={'lead': (0.45, 3.4), 'pad': (0.5, 3.8), 'fx': (0.5, 3.0)}, target=[-11, -6, -6, -6, -15, -24])

STYLES = {'01_kinetic': s01, '02_flat': s02, '03_3d': s03, '04_isometric': s04, '05_device': s05,
          '06_dataviz': s06, '07_glitch': s07, '08_cinematic': s08, '09_papercut': s09, '10_minimal': s10}

if __name__ == '__main__':
    for vid in sys.argv[1:]:
        x = STYLES[vid]()
        out = os.path.join(ROOT, 'out', vid); os.makedirs(out, exist_ok=True)
        sf.write(os.path.join(out, 'music.wav'), x.astype(np.float32), SR, subtype='FLOAT')
        rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
        print(vid, f'len {len(x)/SR:.2f}s peak {np.abs(x).max():.2f} rms {rms:.1f} dBFS')
