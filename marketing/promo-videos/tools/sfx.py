"""Synthesized UI / motion SFX (original, royalty-free)."""
import numpy as np
from synth import *        # noqa
from instruments import *  # noqa

def _env(n, a, d):
    t = np.arange(n) / SR
    return np.clip(t / max(a, 1e-4), 0, 1) * np.exp(-np.maximum(t - a, 0) / d)

def whoosh(dur=0.45, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return sweep_bp(noise(n), 400 if up else 3500, 3500 if up else 400, 0.9) * e * 0.9

def swoosh(dur=0.3):
    return whoosh(dur, True) * 0.7

def pop(f=900):
    n = int(0.12 * SR); t = np.arange(n) / SR
    fr = f * (1 + 0.8 * np.exp(-t / 0.012))
    return sine(fr, n) * _env(n, 0.002, 0.035) * 0.8

def click():
    n = int(0.03 * SR); return bp(noise(n), 2000, 8000) * _env(n, 0.0005, 0.005) * 0.8

def tap():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (sine(1400 * (1 + np.exp(-t / 0.005)), n) * 0.5 + bp(noise(n), 1500, 6000) * 0.4) * _env(n, 0.001, 0.012)

def type_():
    n = int(0.035 * SR); f = 2500 + RNG.random() * 1500
    return bp(noise(n), f * 0.6, f * 1.6) * _env(n, 0.0005, 0.006) * 0.7

def shutter():
    n = int(0.22 * SR); s = np.zeros(n)
    for t0, g in ((0.0, 1.0), (0.07, 0.7)):
        i = int(t0 * SR); m = int(0.06 * SR)
        s[i:i + m] += bp(noise(m), 1500, 9000) * _env(m, 0.0005, 0.012) * g
    return s * 0.9

def ding(m=88):
    return fm_bell(m, 0.8, ratio=2.0, index=1.2, decay=0.5) * 0.7

def success():
    out = np.zeros(int(0.9 * SR))
    for i, m in enumerate((84, 88, 91)):
        s = fm_bell(m, 0.6, ratio=2.0, index=0.9, decay=0.35); i0 = int(i * 0.07 * SR)
        out[i0:i0 + len(s)] += s[: len(out) - i0]
    return out * 0.55

def notify():
    out = np.zeros(int(0.7 * SR))
    for i, m in enumerate((86, 81)):
        s = fm_bell(m, 0.5, ratio=3.0, index=1.0, decay=0.3); i0 = int(i * 0.12 * SR)
        out[i0:i0 + len(s)] += s[: len(out) - i0]
    return out * 0.6

def error():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return (square(220, n) * 0.3 + square(233, n) * 0.3) * _env(n, 0.003, 0.09) * 0.4

def glitch():
    n = int(0.22 * SR); s = crush(noise(n) * 0.6 + square(70 + RNG.random() * 200, n) * 0.4, 3, 16)
    gate = (np.floor(np.arange(n) / (0.018 * SR)) % 2 == 0).astype(float)
    return s * gate * _env(n, 0.001, 0.1) * 0.5

def beep(f=1800):
    n = int(0.09 * SR); return sine(f, n) * _env(n, 0.002, 0.04) * 0.4

def scan(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sine(600 + 900 * t / dur, n) * 0.15 + sweep_bp(noise(n), 1500, 5000, 0.4) * 0.3
    return s * np.sin(np.pi * t / dur) ** 0.7 * 0.6

def data(dur=0.6):
    n = int(dur * SR); out = np.zeros(n); k = 0
    while k < n:
        m = int(0.02 * SR); f = 1200 + RNG.random() * 2400
        seg = sine(f, min(m, n - k)) * 0.15; out[k:k + len(seg)] += seg; k += int(0.035 * SR)
    return out * np.sin(np.pi * np.arange(n) / n)

def paper(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    crackle = (RNG.random(n) < 900 / SR) * RNG.standard_normal(n)
    return (bp(noise(n), 1500, 7000) * 0.35 + lp(crackle, 8000)) * np.sin(np.pi * t / dur) * 0.6

def snip():
    out = np.zeros(int(0.25 * SR))
    for t0 in (0, 0.11):
        n = int(0.05 * SR); i = int(t0 * SR)
        out[i:i + n] += (bp(noise(n), 3000, 10000) + sine(4200, n) * 0.3) * _env(n, 0.0005, 0.01)
    return out * 0.8

def stamp():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return sat(sine(90 * (1 + np.exp(-t / 0.01)), n) * _env(n, 0.001, 0.05) + lp(noise(n), 2500) * _env(n, 0.001, 0.02) * 0.6, 1.5) * 0.9

def coin():
    out = np.zeros(int(0.6 * SR))
    for i, (r, d) in enumerate(((1.0, 0.25), (2.76, 0.12), (5.4, 0.06))):
        s = fm_bell(96, 0.4, ratio=r * 1.5, index=0.6, decay=d); out[: len(s)] += s[: len(out)]
    return out * 0.45

def thud():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return sine(70 * (1 + 0.6 * np.exp(-t / 0.02)), n) * _env(n, 0.001, 0.06) * 0.9

def swipe():
    return whoosh(0.22, True) * 0.6

def ping(m=93):
    return fm_bell(m, 0.5, ratio=1.0, index=0.3, decay=0.4) * 0.5

def rise(dur=1.5):
    return riser(dur) * 0.7

def endhit():
    return mixs(impact(1.8, 50) * 0.5, crash(1.4) * 0.25)

LIB = {'whoosh': whoosh, 'whoosh_down': lambda: whoosh(0.45, False), 'swoosh': swoosh, 'pop': pop, 'pop_hi': lambda: pop(1300), 'pop_lo': lambda: pop(600),
       'click': click, 'tap': tap, 'type': type_, 'shutter': shutter, 'ding': ding, 'success': success, 'notify': notify, 'error': error,
       'glitch': glitch, 'beep': beep, 'beep_lo': lambda: beep(900), 'scan': scan, 'data': data, 'paper': paper, 'snip': snip, 'stamp': stamp,
       'coin': coin, 'thud': thud, 'swipe': swipe, 'ping': ping, 'rise': rise, 'endhit': endhit, 'impact': lambda: impact(1.5, 48) * 0.6}
