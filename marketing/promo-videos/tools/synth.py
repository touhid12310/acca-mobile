"""Tiny numpy synthesizer used for the original (royalty-free) music and SFX of the AccountE promos.
Everything is generated from oscillators and noise; no samples are used."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
RNG = np.random.default_rng(7)

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

def tarr(dur):
    return np.arange(int(dur * SR)) / SR

# ---------- oscillators ----------
def _polyblep(ph, dt):
    out = np.zeros_like(ph); dt = np.broadcast_to(dt, ph.shape)
    m = ph < dt; x = ph[m] / dt[m]; out[m] = x + x - x * x - 1.0
    m = ph > 1.0 - dt; x = (ph[m] - 1.0) / dt[m]; out[m] = x * x + x + x + 1.0
    return out

def phase(freq, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return (ph0 + np.cumsum(f) / SR) % 1.0, f / SR

def saw(freq, n, ph0=None):
    ph, dt = phase(freq, n, RNG.random() if ph0 is None else ph0)
    return 2.0 * ph - 1.0 - _polyblep(ph, dt)

def square(freq, n, pw=0.5, ph0=None):
    ph, dt = phase(freq, n, RNG.random() if ph0 is None else ph0)
    s = np.where(ph < pw, 1.0, -1.0)
    s += _polyblep(ph, dt); s -= _polyblep((ph + 1 - pw) % 1.0, dt)
    return s

def sine(freq, n, ph0=0.0):
    ph, _ = phase(freq, n, ph0)
    return np.sin(2 * np.pi * ph)

def tri(freq, n):
    return 2 * np.abs(2 * phase(freq, n, RNG.random())[0] - 1) - 1

def noise(n):
    return RNG.standard_normal(n)

# ---------- envelopes ----------
def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, hold=None):
    a_n, d_n, r_n = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR))
    hold_n = n - r_n if hold is None else int(hold * SR)
    env = np.full(n, s, dtype=float)
    env[:a_n] = np.linspace(0, 1, a_n)[: n]
    e = min(n, a_n + d_n)
    if e > a_n: env[a_n:e] = np.linspace(1, s, e - a_n)
    if hold_n < n:
        start = max(0, hold_n)
        lvl = env[start - 1] if start > 0 else s
        env[start:] = lvl * np.linspace(1, 0, n - start)
    return env

def expdec(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))

# ---------- filters ----------
def lp(x, fc, order=2):
    fc = min(fc, SR * 0.45); return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x, axis=0)

def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)

def bp(x, lo, hi, order=2):
    hi = min(hi, SR * 0.45); return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)

def sweep_lp(x, f0, f1, block=256, q_order=2, curve='exp'):
    """time-varying low-pass (block-wise, state carried)"""
    n = len(x); out = np.zeros_like(x); zi = None; nb = (n + block - 1) // block
    for i in range(nb):
        p = i / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** p if curve == 'exp' else f0 + (f1 - f0) * p
        sos = butter(q_order, min(max(fc, 20), SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        seg = x[i * block:(i + 1) * block]
        y, zi = sosfilt(sos, seg, zi=zi); out[i * block:(i + 1) * block] = y
    return out

def sweep_bp(x, f0, f1, width=0.6, block=256):
    n = len(x); out = np.zeros_like(x); zi = None; nb = (n + block - 1) // block
    for i in range(nb):
        p = i / max(1, nb - 1); fc = f0 * (f1 / f0) ** p
        lo, hi = fc * (1 - width / 2), min(fc * (1 + width / 2), SR * 0.45)
        sos = butter(2, [max(lo, 20), hi], 'band', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        seg = x[i * block:(i + 1) * block]
        y, zi = sosfilt(sos, seg, zi=zi); out[i * block:(i + 1) * block] = y
    return out

# ---------- effects ----------
_IR = {}
def reverb_ir(seconds=2.4, damp=5000, predelay=0.012, seed=3):
    key = (seconds, damp, predelay)
    if key in _IR: return _IR[key]
    rng = np.random.default_rng(seed); n = int(seconds * SR)
    t = np.arange(n) / SR; env = np.exp(-6.9 * t / seconds)
    ir = np.zeros((n + int(predelay * SR), 2))
    for c in range(2):
        nz = rng.standard_normal(n) * env
        nz = lp(nz, damp) * (1 - 0.6 * (t / seconds)) + lp(nz, damp * 0.35) * 0.6 * (t / seconds)
        ir[int(predelay * SR):, c] = nz
    ir /= np.sqrt((ir ** 2).sum(0)).max()
    _IR[key] = ir; return ir

def reverb(x, wet=0.25, seconds=2.4, damp=5000):
    x = stereo(x); ir = reverb_ir(seconds, damp)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.6

def delay(x, t, fb=0.35, mix=0.3, pingpong=True, taps=5):
    x = stereo(x); y = x.copy(); d = int(t * SR); g = 1.0
    for k in range(1, taps + 1):
        g *= fb; sh = d * k
        if sh >= len(x): break
        tap = np.zeros_like(x); tap[sh:] = x[:-sh] * g
        if pingpong and k % 2 == 1: tap = tap[:, ::-1]
        y += tap * mix
    return y

def stereo(x, pan=0.0):
    if x.ndim == 2: return x
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)

def widen(x, ms=0.012):
    x = stereo(x); d = int(ms * SR); y = x.copy(); y[d:, 1] = x[:-d, 1]; return y

def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)

def crush(x, bits=6, down=6):
    q = 2 ** bits; y = np.round(x * q) / q
    idx = (np.arange(len(y)) // down) * down
    return y[idx]

# ---------- bus ----------
class Bus:
    def __init__(self, dur):
        self.n = int(dur * SR); self.buf = np.zeros((self.n, 2))
    def add(self, sig, t, gain=1.0, pan=0.0):
        s = stereo(sig, pan) * gain; i0 = int(round(t * SR))
        if i0 >= self.n: return
        if i0 < 0: s = s[-i0:]; i0 = 0
        m = min(len(s), self.n - i0); self.buf[i0:i0 + m] += s[:m]

def sidechain(n, times, depth=0.6, release=0.18, attack=0.004):
    g = np.ones(n)
    for t in times:
        i0 = int(t * SR); L = int((release * 5) * SR)
        if i0 >= n: continue
        seg = np.arange(min(L, n - i0)) / SR
        curve = 1 - depth * np.exp(-seg / release) * np.clip(seg / attack, 0, 1) ** 0.3
        g[i0:i0 + len(seg)] = np.minimum(g[i0:i0 + len(seg)], curve)
    return g

def compress(x, thr_db=-14, ratio=3, att=0.005, rel=0.12):
    """simple feed-forward stereo-linked compressor"""
    lvl = np.abs(x).max(1); a = np.exp(-1 / (att * SR)); r = np.exp(-1 / (rel * SR))
    # block envelope follower for speed
    blk = 64; nb = len(lvl) // blk + 1; env = np.zeros(nb); e = 0.0
    for i in range(nb):
        v = lvl[i * blk:(i + 1) * blk].max() if i * blk < len(lvl) else 0
        c = a ** blk if v > e else r ** blk; e = c * e + (1 - c) * v; env[i] = e
    env = np.repeat(env, blk)[: len(lvl)]
    db = 20 * np.log10(np.maximum(env, 1e-6)); over = np.maximum(0, db - thr_db)
    gain = 10 ** (-over * (1 - 1 / ratio) / 20)
    return x * gain[:, None]

def limiter(x, ceil=0.93, look=0.004, rel=0.08):
    n = len(x); pk = np.abs(x).max(1); L = int(look * SR)
    # running max over lookahead window
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(pk, size=2 * L + 1)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    # smooth release
    g = np.empty(n); cur = 1.0; r = np.exp(-1 / (rel * SR))
    blk = 32
    for i in range(0, n, blk):
        v = need[i:i + blk].min(); cur = v if v < cur else cur * r + v * (1 - r); g[i:i + blk] = cur
    return x * g[:, None]

def master(x, hp_hz=32, target=None):
    x = hp(x, hp_hz); x = match_eq(x, target); x = x / max(np.abs(x).max(), 1e-9) * 0.9
    x = compress(x, -16, 2.5); x = limiter(x * 1.0)
    pk = np.abs(x).max(); return x / max(pk, 1e-9) * 0.89

def mixs(*xs):
    """sum signals of different lengths"""
    n = max(len(x) for x in xs); out = np.zeros((n,) + xs[0].shape[1:])
    for x in xs: out[: len(x)] += x
    return out

BANDS = [(20, 60), (60, 250), (250, 500), (500, 2000), (2000, 6000), (6000, 16000)]
TARGET = [-10.0, -4.5, -8.0, -8.0, -13.0, -19.0]   # balanced modern mix (energy share per band, dB)

def band_levels(x):
    m = x.mean(1) if x.ndim == 2 else x
    X = np.abs(np.fft.rfft(m)) ** 2; f = np.fft.rfftfreq(len(m), 1 / SR); tot = X.sum() + 1e-12
    return np.array([10 * np.log10(X[(f >= a) & (f < b)].sum() / tot + 1e-12) for a, b in BANDS])

def match_eq(x, target=None, max_db=10.0, iters=2):
    """static linear-phase 'match EQ' towards a target band balance"""
    target = np.array(TARGET if target is None else target)
    for _ in range(iters):
        lv = band_levels(x); g = np.clip(target - lv, -max_db, max_db); g -= g.max() * 0  # relative
        centers = np.array([np.sqrt(a * b) for a, b in BANDS])
        X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR)
        lf = np.log10(np.maximum(f, 10)); gain_db = np.interp(lf, np.log10(centers), g)
        gain_db[f < 25] = g[0] - 12  # rumble cut
        X *= (10 ** (gain_db / 20))[:, None]
        x = np.fft.irfft(X, n=len(x), axis=0)
    return x
