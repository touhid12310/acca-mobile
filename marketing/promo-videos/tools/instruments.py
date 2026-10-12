"""Instrument voices built on synth.py (all synthesized, no samples)."""
import numpy as np
from synth import *  # noqa

# ---------------- drums ----------------
def kick(decay=0.30, f0=160, f1=46, click=0.25, drive=1.4):
    n = int(decay * 2.5 * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    body = sine(f, n) * np.exp(-t / (decay * 0.5))
    c = np.zeros(n); m = int(0.006 * SR); c[:m] = hp(noise(m), 1500) * np.linspace(1, 0, m) * click
    return sat(body + c, drive)

def snare(tone=185, decay=0.17, bright=6500, snap=1.0):
    n = int(decay * 3 * SR); t = np.arange(n) / SR
    nz = bp(noise(n), 900, bright) * np.exp(-t / decay) * snap
    tn = (sine(tone, n) * 0.6 + sine(tone * 1.5, n) * 0.25) * np.exp(-t / 0.045)
    return (nz * 0.8 + tn) * 0.9

def clap(decay=0.16, spread=0.011):
    n = int((decay * 3 + 0.04) * SR); out = np.zeros(n); t = np.arange(n) / SR
    for k, g in enumerate([0.7, 0.8, 1.0]):
        i0 = int(k * spread * SR); m = n - i0
        tau = 0.008 if k < 2 else decay
        out[i0:] += bp(noise(m), 800, 3200) * np.exp(-np.arange(m) / SR / tau) * g
    return out * 0.9

def hat(open_=False, decay=None, tone=8000):
    d = decay or (0.22 if open_ else 0.035); n = int(d * 4 * SR); t = np.arange(n) / SR
    s = hp(noise(n), tone, 3) * np.exp(-t / d)
    return lp(s, 15000) * 0.55

def shaker(decay=0.06):
    n = int(0.16 * SR); t = np.arange(n) / SR
    env = np.clip(t / 0.012, 0, 1) * np.exp(-np.maximum(t - 0.012, 0) / decay)
    return bp(noise(n), 3500, 11000) * env * 0.5

def rim(tone=1700):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (sine(tone, n) * 0.5 + bp(noise(n), 1500, 5000)) * np.exp(-t / 0.012)

def tom(f0=140, f1=80, decay=0.35):
    n = int(decay * 3 * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.06)
    return (sine(f, n) * np.exp(-t / decay) + lp(noise(n), 1200) * np.exp(-t / 0.03) * 0.3)

def taiko(decay=0.9):
    n = int(decay * 3 * SR); t = np.arange(n) / SR
    f = 52 + 60 * np.exp(-t / 0.05)
    body = sine(f, n) * np.exp(-t / (decay * 0.45))
    skin = lp(noise(n), 900) * np.exp(-t / 0.06) * 0.6
    return sat(body + skin, 1.6)

def woodblock(f=900):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (sine(f, n) + 0.4 * sine(f * 2.7, n)) * np.exp(-t / 0.02)

def crash(decay=1.6):
    n = int(decay * 2.5 * SR); t = np.arange(n) / SR
    s = hp(noise(n), 4000, 2) * np.exp(-t / decay) * (0.6 + 0.4 * np.exp(-t / 0.08))
    return lp(s, 14000) * 0.4

# ---------------- tonal ----------------
def bass(m, dur, kind='saw', cutoff=700, env_amt=2.2, sub=0.7, rel=0.05, drive=1.3):
    n = int((dur + rel) * SR); f = mtof(m)
    osc = saw(f, n) if kind == 'saw' else square(f, n, 0.5)
    osc = sweep_lp(osc, cutoff * env_amt, cutoff, curve='exp') if env_amt != 1 else lp(osc, cutoff)
    s = osc * 0.7 + sine(f, n) * sub
    return sat(s * adsr(n, 0.004, 0.12, 0.85, rel, hold=dur), drive) * 0.8

def subbass(m, dur, rel=0.08):
    n = int((dur + rel) * SR)
    return sine(mtof(m), n) * adsr(n, 0.01, 0.1, 0.95, rel, hold=dur)

def supersaw(m, dur, voices=7, detune=0.16, cutoff=3800, a=0.01, d=0.25, s=0.8, r=0.25, width=0.8):
    n = int((dur + r) * SR); f = mtof(m); out = np.zeros((n, 2))
    for k in range(voices):
        det = (k - (voices - 1) / 2) / ((voices - 1) / 2) * detune
        v = saw(f * 2 ** (det / 12), n)
        pan = (k / (voices - 1) * 2 - 1) * width
        out += stereo(v, pan)
    out = lp(out, cutoff) / voices * 1.6
    return out * adsr(n, a, d, s, r, hold=dur)[:, None]

def pad(m, dur, cutoff=2200, a=0.5, r=1.2, voices=5, detune=0.12):
    return supersaw(m, dur, voices=voices, detune=detune, cutoff=cutoff, a=a, d=0.6, s=0.85, r=r)

def strings(m, dur, a=0.45, r=0.9, cutoff=2600):
    n = int((dur + r) * SR); f = mtof(m); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.6, 0, 1)
    out = np.zeros((n, 2))
    for k, det in enumerate([-0.11, -0.04, 0.03, 0.1]):
        out += stereo(saw(f * vib * 2 ** (det / 12), n), -0.7 + 0.47 * k)
    out = lp(hp(out, 180), cutoff) / 4 * 1.4
    return out * adsr(n, a, 0.3, 0.9, r, hold=dur)[:, None]

def pluck(m, dur=0.6, bright=1.0, harm=18, decay=0.9):
    n = int(max(dur, 0.2) * 2.0 * SR); t = np.arange(n) / SR; f = mtof(m); out = np.zeros(n)
    for k in range(1, harm + 1):
        if f * k > 16000: break
        out += np.sin(2 * np.pi * f * k * t + RNG.random()) * np.exp(-t * (1.6 / decay + 2.2 * k / bright)) / k ** 1.05
    att = np.clip(t / 0.002, 0, 1)
    return out * att * 0.55

def marimba(m, dur=0.5):
    n = int(1.4 * SR); t = np.arange(n) / SR; f = mtof(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.45) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.09)
         + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.03))
    return s * np.clip(t / 0.0015, 0, 1) * 0.7

def fm_bell(m, dur=1.5, ratio=3.5, index=3.0, decay=1.4):
    n = int(decay * 3 * SR); t = np.arange(n) / SR; f = mtof(m)
    mod = np.sin(2 * np.pi * f * ratio * t) * index * np.exp(-t / (decay * 0.35))
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / decay) * np.clip(t / 0.002, 0, 1) * 0.5

def epiano(m, dur, vel=0.8):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR; f = mtof(m)
    idx = (0.9 + 1.6 * vel) * np.exp(-t / 0.35)
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.025) * 0.18 * vel
    env = adsr(n, 0.003, 1.2, 0.35, 0.35, hold=dur) * np.exp(-t / 2.4)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.3 * t)
    return (body + tine) * env * trem * 0.45 * vel

def piano(m, dur, vel=0.7, felt=False):
    n = int((dur + 1.6) * SR); t = np.arange(n) / SR; f0 = mtof(m); B = 0.00035; out = np.zeros(n)
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 15000: break
        dec = (3.2 if f0 < 300 else 2.0) / (1 + 0.35 * k)
        out += np.sin(2 * np.pi * fk * t + RNG.random()) * np.exp(-t / dec) * (vel ** (0.4 * k)) / k ** (1.2 if felt else 0.85)
    ham = lp(noise(int(0.01 * SR)), 2500) * 0.08 * vel
    out[: len(ham)] += ham
    env = adsr(n, 0.002, 0.1, 1.0, 0.25, hold=dur)
    out = out * env
    if felt: out = lp(out, 1800 + 2500 * vel)
    return out * 0.35 * (0.4 + vel)

def lead(m, dur, cutoff=3000, kind='square'):
    n = int((dur + 0.08) * SR); f = mtof(m)
    o = square(f, n, 0.35) if kind == 'square' else saw(f, n)
    o = sweep_lp(o, cutoff * 2.5, cutoff)
    return o * adsr(n, 0.004, 0.08, 0.6, 0.08, hold=dur) * 0.35

def arp_saw(m, dur, cutoff=2400):
    n = int((dur + 0.05) * SR); f = mtof(m)
    o = saw(f, n) * 0.6 + saw(f * 1.006, n) * 0.4
    o = sweep_lp(o, cutoff * 3, cutoff * 0.6)
    return o * adsr(n, 0.002, dur * 0.8, 0.2, 0.05, hold=dur) * 0.4

# ---------------- fx (musical) ----------------
def riser(dur, f0=300, f1=7000, tone=True):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sweep_bp(noise(n), f0, f1, 0.5) * (t / dur) ** 1.6
    if tone:
        f = 120 * (16 ** (t / dur)); s += sine(f, n) * 0.25 * (t / dur) ** 2
    return s * 0.6

def downlift(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return sweep_bp(noise(n), 6000, 200, 0.6) * np.exp(-t / (dur * 0.5)) * 0.6

def impact(decay=2.2, low=46):
    n = int(decay * 2 * SR); t = np.arange(n) / SR
    boom = sine(low + 40 * np.exp(-t / 0.08), n) * np.exp(-t / (decay * 0.4))
    hit = lp(noise(n), 3000) * np.exp(-t / 0.12) * 0.5
    return sat(boom + hit, 1.8)

def rev_cymbal(dur=1.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(noise(n), 5000) * (t / dur) ** 3 * 0.5

def vinyl(dur, density=9):
    n = int(dur * SR); s = lp(hp(noise(n), 1000), 5000) * 0.012
    k = RNG.random(n) < density / SR
    clicks = np.zeros(n); clicks[k] = RNG.standard_normal(k.sum()) * 0.35
    return s + lp(clicks, 6000)

# ---------------- harmony helpers ----------------
TRIADS = {'': [0, 4, 7], 'm': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'add9': [0, 4, 7, 14], 'm9': [0, 3, 7, 10, 14]}
def chord(root, q='', low=55, high=76):
    notes = [root + i for i in TRIADS[q]]
    out = []
    for nt in notes:
        while nt < low: nt += 12
        while nt > high: nt -= 12
        out.append(nt)
    return sorted(out)
