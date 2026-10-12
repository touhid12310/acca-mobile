"""Builds the 7.5 s soundtrack: cut Voxscape, low-pass sweeps, synthesized SFX, then master.

Usage: python3 audio.py <voxscape.mp3> <out.wav> [cues.json total_frames]
With cues (written by `node render.js <dir> --long`) it builds the full-length film's soundtrack:
the reveal's hand-placed sounds plus every chapter cue, with the music running to the end.
Voxscape (Eugenio Mininni) — Mixkit Stock Music Free License: https://assets.mixkit.co/music/571/571.mp3
Mastering to -14 LUFS / -1 dBTP is done afterwards with ffmpeg loudnorm (see build.sh).
"""
import subprocess
import sys

import json

import numpy as np

SR = 48000
CUES = json.load(open(sys.argv[3])) if len(sys.argv) > 4 else []
FRAMES = int(sys.argv[4]) if len(sys.argv) > 4 else 226
DUR = FRAMES / 30  # match the picture
N = int(round(DUR * SR))
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def load(path, start, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{start:.4f}', '-t', f'{dur:.4f}', '-i', path,
                          '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def env_ramp(times, values, x=t):
    return np.interp(x, times, values)


# ---------------- music: two-piece cut ----------------
# piece A: film 1.72 s = source 38.76 s (first bass step)  → film 0 = source 37.04
# piece B: film 4.11 s = source 47.36 s (big bass attack), spliced in at film 3.41 → source 46.66
src = sys.argv[1]
SPLICE, XF = 3.41, 0.012
A = load(src, 38.76 - 1.72, SPLICE + XF)
B = load(src, 47.36 - (4.11 - SPLICE), DUR - SPLICE + 0.1)
music = np.zeros((N, 2))
nA = min(len(A), N)
music[:nA] += A[:nA] * np.clip((SPLICE + XF - t[:nA]) / XF, 0, 1)[:, None]
s0 = int(SPLICE * SR)
nB = min(len(B), N - s0)
music[s0:s0 + nB] += B[:nB] * np.clip(t[s0:s0 + nB] - SPLICE, 0, XF)[:, None] / XF

# low-pass sweeps (time-varying SVF): 400 Hz dip 2.4→2.78, 150 Hz dip 3.41→3.58, reopened by 4.08
cut_t = [0, 2.40, 2.78, 3.40, 3.41, 3.58, 4.08, DUR]
cut_v = np.log([20000, 20000, 400, 400, 150, 150, 20000, 20000])
fc = np.exp(env_ramp(cut_t, cut_v))
g = np.tan(np.pi * np.minimum(fc, SR * 0.45) / SR)
k = 1 / 0.85  # Q ≈ 0.85, a touch of resonance on the sweep
a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2
out = music.copy()
NF = min(N, int(4.2 * SR))
for ch in range(2):
    ic1 = ic2 = 0.0
    x = music[:, ch]; y = out[:, ch]
    for i in range(NF):
        v3 = x[i] - ic2
        v1 = a1[i] * ic1 + a2[i] * v3
        v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        y[i] = v2
if FRAMES == 226:
    music = out * env_ramp([0, 6.6, 7.5, DUR], [1, 1, 0, 0])[:, None]
else:  # long film: music runs on, dips a touch under the finale sign-off, fades on the last black
    music = out * env_ramp([0, DUR - 7.0, DUR - 3.6, DUR - 0.6, DUR], [1, 1, .8, 0, 0])[:, None]
music *= env_ramp([0, 0.08], [0, 1])[:, None]  # de-click the head

# ---------------- SFX ----------------
sfx = np.zeros((N, 2))


def place(sig, at, pan=0.0, gain=1.0):
    i0 = int(at * SR)
    if i0 >= N: return
    sig = sig[:N - i0] * gain
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    sfx[i0:i0 + len(sig), 0] += sig * L * 1.414
    sfx[i0:i0 + len(sig), 1] += sig * R * 1.414


def tick(seed, bright=1.0):
    r = np.random.default_rng(seed)
    n = int(0.035 * SR); tt = np.arange(n) / SR
    noise = r.standard_normal(n)
    hp = np.diff(noise, prepend=0)  # bright click body
    body = np.sin(2 * np.pi * (1800 + 900 * r.random()) * tt) * 0.35
    e = np.exp(-tt / (0.0045 + 0.002 * r.random()))
    return (hp * 0.6 * bright + body) * e


def bandnoise(dur, f_lo, f_hi, seed, q=0.3):
    """noise through a swept 2-pole band-pass (log sweep f_lo→f_hi)"""
    r = np.random.default_rng(seed)
    n = int(dur * SR); x = r.standard_normal(n)
    fc = np.exp(np.linspace(np.log(f_lo), np.log(f_hi), n))
    gg = np.tan(np.pi * fc / SR); kk = 1 / q
    b1 = 1 / (1 + gg * (gg + kk)); b2 = gg * b1; b3 = gg * b2
    y = np.zeros(n); c1 = c2 = 0.0
    for i in range(n):
        v3 = x[i] - c2; v1 = b1[i] * c1 + b2[i] * v3; v2 = c2 + b2[i] * c1 + b3[i] * v3
        c1 = 2 * v1 - c1; c2 = 2 * v2 - c2; y[i] = v1
    return y


# keystrokes for the prompt: f4→f26 human rhythm (mirrors T_CHAR in index.html)
def h(*a):
    hh = 2166136261
    for v in a:
        hh ^= (v * 2654435761) & 0xFFFFFFFF
        hh = (hh ^ (hh >> 15)) * 2246822519 & 0xFFFFFFFF
        hh = (hh ^ (hh >> 13)) * 3266489917 & 0xFFFFFFFF
        hh ^= hh >> 16
    return (hh & 0xFFFFFFFF) / 4294967296


PROMPT = 'Build a premium, modern fintec'
gaps = []
for i in range(1, 30):
    c = PROMPT[i - 1]; gg_ = 0.55 + 0.9 * h(i, 17)
    if c == ' ': gg_ += 0.55 * h(i, 3)
    if c == ',': gg_ += 0.9
    gaps.append(gg_)
tc = [4.0]
for gp in gaps: tc.append(tc[-1] + gp * 22 / sum(gaps))
for i, f in enumerate(tc):
    place(tick(100 + i), f / 30, pan=rng.uniform(-.25, .25), gain=0.42 * (0.8 + 0.4 * rng.random()))
# burst f40→f48 plus its tail to 1.97 s: a thinning flurry of keys
tb = 40 / 30
while tb < 1.97:
    dens = np.interp(tb, [40 / 30, 48 / 30, 1.97], [0.011, 0.02, 0.06])
    place(tick(int(tb * 1e5), 1.2), tb, pan=rng.uniform(-.5, .5), gain=0.32 * np.interp(tb, [1.33, 1.97], [1, .35]))
    tb += dens * (0.6 + 0.8 * rng.random())
# headline typing 4.3→5.1 s (two lines at once → paired ticks)
th = 4.30
while th < 5.10:
    place(tick(int(th * 1e5) + 3, 0.8), th, pan=-.2, gain=0.24)
    place(tick(int(th * 1e5) + 9, 0.8), th + 0.006, pan=.2, gain=0.2)
    th += 0.048 + 0.03 * rng.random()


def whoosh(at, dur, f0, f1, gain, pan0=-.6, pan1=.6, seed=1):
    y = bandnoise(dur, f0, f1, seed, q=0.7)
    tt = np.arange(len(y)) / SR
    e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 2.2
    y = y * e / (np.abs(y).max() + 1e-9)
    i0 = int((at - dur * 0.6) * SR)  # peak lands on the cue
    for j, p in enumerate(np.linspace(pan0, pan1, 8)):
        seg = y[j * len(y) // 8:(j + 1) * len(y) // 8]
        place(seg, (i0 + j * len(y) // 8) / SR, pan=p, gain=gain)


whoosh(1.35, 0.55, 300, 5200, 0.55, seed=11)           # the charge
whoosh(2.18, 0.45, 2400, 500, 0.32, .5, -.2, seed=12)  # cursor swings in
whoosh(3.30, 0.70, 200, 7000, 0.6, -.7, .7, seed=13)   # reveal drop

# click at 2.78 (the press)
n = int(0.09 * SR); tt = np.arange(n) / SR
click = (np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt / 0.004) * .8
         + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.03) * .7
         + np.diff(rng.standard_normal(n), prepend=0) * np.exp(-tt / 0.002) * .5)
place(click, 2.78, pan=.1, gain=0.85)

# shimmer rising to 4.08
sh_start, sh_end = 3.42, 4.08
n = int((sh_end - sh_start + 0.25) * SR); tt = np.arange(n) / SR
shimmer = np.zeros(n)
for j, base in enumerate([1320, 1760, 2217, 2637, 3520]):
    f = base * np.exp(np.log(1.5) * np.clip(tt / (sh_end - sh_start), 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    shimmer += np.sin(ph + j) * (0.6 + 0.4 * np.sin(2 * np.pi * (11 + 3 * j) * tt))
shimmer *= (np.clip(tt / (sh_end - sh_start), 0, 1) ** 2.4) * np.exp(-np.clip(tt - (sh_end - sh_start), 0, None) / 0.05)
place(shimmer / 5, sh_start, pan=0, gain=0.22)

# sub boom 4.09
n = int(1.6 * SR); tt = np.arange(n) / SR
f = 32 + 40 * np.exp(-tt / 0.09)
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.55) * np.clip(tt / 0.004, 0, 1)
boom += np.tanh(3 * boom) * 0.25
place(boom, 4.09, gain=0.95)

# pop 5.15
n = int(0.12 * SR); tt = np.arange(n) / SR
f = 340 + 520 * np.exp(-tt / 0.012)
pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.035) * np.clip(tt / 0.001, 0, 1)
place(pop, 5.15, pan=-.15, gain=0.6)

# settle 6.54: soft descending air + a low bell
air = bandnoise(0.9, 3000, 400, 21, q=0.9)
tt = np.arange(len(air)) / SR
air *= np.sin(np.pi * tt / 0.9) ** 2 / (np.abs(air).max() + 1e-9)
place(air, 6.54 - 0.35, gain=0.22)
n = int(1.0 * SR); tt = np.arange(n) / SR
bell = sum(np.sin(2 * np.pi * fr * tt) * a for fr, a in [(196, .6), (293.7, .35), (392, .25), (587, .1)])
bell *= np.exp(-tt / 0.35) * np.clip(tt / 0.01, 0, 1)
place(bell, 6.54, gain=0.18)

# ---------------- chapter cues (long film) ----------------
def cue_tick(q):
    place(tick(int(q['t'] * 1e4)), q['t'], pan=(h(int(q['t'] * 100), 5) - .5) * .5, gain=q.get('gain', .3))


def cue_pop(q):
    p = q.get('pitch', 1.0)
    n = int(0.12 * SR); tt = np.arange(n) / SR
    f = (340 + 520 * np.exp(-tt / 0.012)) * p
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.035) * np.clip(tt / 0.001, 0, 1)
    place(sig, q['t'], pan=(h(int(q['t'] * 100), 9) - .5) * .4, gain=q.get('gain', .3))


def cue_click(q):
    place(click, q['t'], pan=.1, gain=.75)


def cue_whoosh(q):
    whoosh(q['t'] + q.get('dur', .6) * .6, q.get('dur', .6), q.get('f0', 300), q.get('f1', 4000), q.get('gain', .4), seed=int(q['t'] * 10))


def cue_swish(q):  # cursor glide: short, soft, high
    whoosh(q['t'] + .2, .35, 2600, 900, .18, .6, 0, seed=int(q['t'] * 10) + 3)


def cue_boom(q):
    place(boom, q['t'], gain=q.get('gain', .8))


def shimmer_sig(dur):
    n = int((dur + 0.25) * SR); tt = np.arange(n) / SR
    y = np.zeros(n)
    for j, base in enumerate([1320, 1760, 2217, 2637, 3520]):
        f = base * np.exp(np.log(1.5) * np.clip(tt / dur, 0, 1))
        y += np.sin(2 * np.pi * np.cumsum(f) / SR + j) * (0.6 + 0.4 * np.sin(2 * np.pi * (11 + 3 * j) * tt))
    return y * (np.clip(tt / dur, 0, 1) ** 2.4) * np.exp(-np.clip(tt - dur, 0, None) / 0.05) / 5


def cue_shimmerTo(q):
    d = (q['lf'] - q['from']) / 30
    place(shimmer_sig(d), q['t'] - d, gain=.2)


def cue_shimmer(q):
    d = q.get('dur', 1.2)
    sig = shimmer_sig(d); tt = np.arange(len(sig)) / SR
    place(sig * np.sin(np.pi * np.clip(tt / (d + .25), 0, 1)), q['t'], gain=q.get('gain', .15))


def cue_rise(q):  # soft tonal swell under growing charts
    d = q.get('dur', 1.5); n = int(d * SR); tt = np.arange(n) / SR
    f = 220 * np.exp(np.log(2) * tt / d)
    sig = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) * a for m, a in [(1, .6), (1.5, .3), (2, .2)])
    place(sig * np.sin(np.pi * tt / d) ** 2, q['t'], gain=q.get('gain', .2))


def cue_scan(q):  # scanner sweep: band-passed noise rising + a light hum
    d = q.get('dur', 2)
    y = bandnoise(d, 500, 6000, int(q['t'] * 7), q=2.5); tt = np.arange(len(y)) / SR
    y = y / (np.abs(y).max() + 1e-9) * np.sin(np.pi * tt / d) ** .8
    y += np.sin(2 * np.pi * 880 * tt) * .08 * np.sin(np.pi * tt / d)
    place(y, q['t'], gain=.28)


def cue_settle(q):
    place(air, q['t'] - 0.35, gain=0.22); place(bell, q['t'], gain=0.18)


for q in CUES:
    globals()['cue_' + q['type']](q)

mix = music * 0.9 + sfx
mix *= np.clip((DUR - t) / 0.01, 0, 1)[:, None]  # frame 225 is black and silent at the very end
mix /= max(1e-9, np.abs(mix).max()) / 0.9
import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', sys.argv[2], f'{DUR:.3f}s')
