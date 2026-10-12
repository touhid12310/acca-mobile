"""Final audio: music (ducked under VO) + SFX from the page's cue list + VO, loudness-normalised
(-16 LUFS integrated, -1.5 dBTP) and muxed onto both renders.
usage: python3 tools/mix.py 01_kinetic [...]"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import SR, lp, stereo, reverb
import sfx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = {'01_kinetic': 'KineticType', '02_flat': 'Flat2D', '03_3d': '3D', '04_isometric': 'Isometric', '05_device': 'UIDeviceMockup',
         '06_dataviz': 'DataViz', '07_glitch': 'GlitchFuturistic', '08_cinematic': 'Cinematic', '09_papercut': 'PaperCutCollage', '10_minimal': 'MinimalPremium'}
DELIVER = os.path.join(ROOT, 'deliver')

def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

def build(vid, music_db=-9.0, sfx_db=-11.0):
    out = os.path.join(ROOT, 'out', vid)
    music, _ = sf.read(os.path.join(out, 'music.wav')); vo, _ = sf.read(os.path.join(out, 'vo.wav'))
    n = int(56.0 * SR); music = music[:n]; vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
    meta = json.load(open(os.path.join(out, 'meta_16x9.json')))
    # --- SFX bus ---
    bus = np.zeros((n, 2)); missing = set()
    for c in meta['cues']:
        fn = sfx.LIB.get(c['name'])
        if fn is None: missing.add(c['name']); continue
        s = stereo(fn(), c.get('pan', 0.0)) * c.get('gain', 1.0)
        i0 = int(c['t'] * SR)
        if i0 >= n: continue
        m = min(len(s), n - i0); bus[i0:i0 + m] += s[:m]
    if missing: print('  ! unknown cues:', missing)
    bus = reverb(bus, 0.12, 1.2, 6000)
    # --- levels: VO is the reference ---
    vo_active = np.abs(vo) > 1e-4
    vo_lvl = rms_db(vo[vo_active]) if vo_active.any() else -20
    mus_lvl = rms_db(music.mean(1))
    music = music * 10 ** ((vo_lvl + music_db - mus_lvl) / 20)
    sfx_lvl = rms_db(bus[np.abs(bus).max(1) > 1e-4].mean(1)) if np.abs(bus).max() > 0 else -60
    bus = bus * 10 ** ((vo_lvl + sfx_db - sfx_lvl) / 20)
    # --- ducking: smooth VO envelope -> music gain (-6 dB under speech) ---
    env = lp(np.abs(vo), 6.0); env = env / (env.max() + 1e-9)
    env = np.convolve(env, np.ones(int(0.12 * SR)) / int(0.12 * SR), mode='same')
    duck = 1 - 0.5 * np.clip(env * 3, 0, 1)
    mix = music * duck[:, None] + bus + stereo(vo) * 0.7071
    mix = mix / max(np.abs(mix).max(), 1e-9) * 0.9
    raw = os.path.join(out, 'mix_raw.wav'); sf.write(raw, mix.astype(np.float32), SR, subtype='FLOAT')
    # --- loudness normalise (two-pass loudnorm) ---
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    j = json.loads(p.stderr[p.stderr.rfind('{'):p.stderr.rfind('}') + 1])
    final = os.path.join(out, 'mix.wav')
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', final], check=True)
    print(f'  {vid}: VO {vo_lvl:.1f} dB, input {j["input_i"]} LUFS -> -16 LUFS')
    return final

def mux(vid):
    out = os.path.join(ROOT, 'out', vid); os.makedirs(DELIVER, exist_ok=True)
    audio = os.path.join(out, 'mix.wav')
    for ar in ('16x9', '9x16'):
        v = os.path.join(out, f'video_{ar}.mp4')
        if not os.path.exists(v): print('  missing', v); continue
        dst = os.path.join(DELIVER, f'AccountE_{vid[:2]}_{NAMES[vid]}_{ar}.mp4')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', v, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', dst], check=True)
        print('  ->', dst)

if __name__ == '__main__':
    for vid in sys.argv[1:]:
        build(vid); mux(vid)
