"""Render the voice-over for one or more videos with Kokoro-82M (Apache-2.0).
For each line in videos/<id>/script.json: synthesize, trim silence, make sure it ends before the
next line starts (speeding up slightly if needed), then write
  out/<id>/vo.wav   (48 kHz mono, full 56 s timeline)
  out/<id>/vo.js    (window.VO = [{t, dur, text, nocap}]) for captions in the page
usage: python3 tools/vo.py 01_kinetic [02_flat ...]"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS = os.environ.get('TTS_DIR', os.path.join(os.path.dirname(ROOT), 'tts'))
SR = 48000
DUR = 56.0
CONTENT_END = 50.4   # content lines must finish before the end card (50.4 s)

kokoro = Kokoro(os.path.join(TTS, 'kokoro-v1.0.onnx'), os.path.join(TTS, 'voices-v1.0.bin'))

def synth(text, voice, speed):
    s, sr = kokoro.create(text, voice=voice, speed=speed, lang='en-gb' if voice.startswith('b') else 'en-us')
    s = resample_poly(np.asarray(s, dtype=np.float64), SR, sr)
    # trim leading/trailing silence (-45 dBFS), keep 30 ms tails
    env = np.abs(s); thr = 10 ** (-45 / 20) * max(env.max(), 1e-9)
    idx = np.nonzero(env > thr)[0]
    if len(idx): s = s[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.06 * SR)]
    fade = int(0.01 * SR); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade)
    return s

def run(vid):
    spec = json.load(open(os.path.join(ROOT, 'videos', vid, 'script.json')))
    voice = spec['voice']; lines = spec['lines']
    out = os.path.join(ROOT, 'out', vid); os.makedirs(out, exist_ok=True)
    track = np.zeros(int(DUR * SR))
    manifest = []; report = []
    for i, ln in enumerate(lines):
        limit = (lines[i + 1]['t'] - 0.12) if i + 1 < len(lines) else DUR - 0.25
        if not ln.get('nocap') and i + 1 == len(lines): limit = min(limit, CONTENT_END)
        if ln['t'] < CONTENT_END: limit = min(limit, CONTENT_END - 0.05)
        speed = ln.get('speed', 1.0)
        a = synth(ln.get('say', ln['text']), voice, speed)
        while ln['t'] + len(a) / SR > limit and speed < 1.22:
            speed = round(speed + 0.04, 2); a = synth(ln.get('say', ln['text']), voice, speed)
        dur = len(a) / SR
        ok = ln['t'] + dur <= limit + 1e-3
        s0 = int(ln['t'] * SR); track[s0:s0 + len(a)] += a[: len(track) - s0]
        manifest.append({'t': ln['t'], 'dur': round(dur, 3), 'text': ln['text'], 'nocap': bool(ln.get('nocap'))})
        report.append(f"  {ln['t']:5.2f}-{ln['t']+dur:5.2f} (limit {limit:5.2f}) speed {speed:.2f} {'OK ' if ok else 'OVER'} {ln['text']}")
    peak = np.abs(track).max(); track = track / max(peak, 1e-9) * 0.89
    sf.write(os.path.join(out, 'vo.wav'), track.astype(np.float32), SR, subtype='FLOAT')
    open(os.path.join(out, 'vo.js'), 'w').write('window.VO=' + json.dumps(manifest) + ';')
    json.dump(manifest, open(os.path.join(out, 'vo.json'), 'w'), indent=1)
    print(vid, voice); print('\n'.join(report))

if __name__ == '__main__':
    for v in sys.argv[1:]: run(v)
