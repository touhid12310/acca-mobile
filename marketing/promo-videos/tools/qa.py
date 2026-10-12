"""Automated QA for delivered MP4s: format, duration, fps, loudness/true peak, frozen frames,
cut cadence, plus a 2-second contact strip for visual review.
usage: python3 tools/qa.py deliver/AccountE_01_*.mp4 ..."""
import json, os, re, subprocess, sys

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)

def probe(f):
    j = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).stdout)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video'); a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    num, den = map(int, v['r_frame_rate'].split('/'))
    return {'w': v['width'], 'h': v['height'], 'fps': round(num / den, 3), 'vcodec': v['codec_name'], 'pix': v['pix_fmt'],
            'acodec': a['codec_name'] if a else None, 'ar': int(a['sample_rate']) if a else None, 'ch': a['channels'] if a else None,
            'dur': round(float(j['format']['duration']), 2), 'size_mb': round(int(j['format']['size']) / 1048576, 1), 'kbps': round(int(j['format']['bit_rate']) / 1000)}

def loudness(f):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', e); TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)
    return float(I[-1]), float(TP[-1])

def freezes(f, dur=1.2):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-map', '0:v', '-vf', f'freezedetect=n=0.0015:d={dur}', '-f', 'null', '-']).stderr
    st = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', e)]; en = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', e)]
    return [(round(a, 2), round(b, 2)) for a, b in zip(st, en + [None] * (len(st) - len(en))) if b is not None] + ([(round(st[-1], 2), 'end')] if len(st) > len(en) else [])

def cuts(f, thr=0.22):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-map', '0:v', '-vf', f"select='gt(scene,{thr})',showinfo", '-f', 'null', '-']).stderr
    return [round(float(x), 2) for x in re.findall(r'pts_time:([\d.]+)', e)]

def strip(f, out):
    p = probe(f); tile = '7x4' if p['w'] > p['h'] else '14x2'; scale = '320:-1' if p['w'] > p['h'] else '180:-1'
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-vf', f'fps=0.5,scale={scale},tile={tile}', '-frames:v', '1', out])

if __name__ == '__main__':
    report = {}
    for f in sys.argv[1:]:
        p = probe(f); I, TP = loudness(f); fr = freezes(f); c = cuts(f)
        gaps = [round(b - a, 2) for a, b in zip([0] + c, c + [p['dur']])]
        checks = {
            'resolution_ok': (p['w'], p['h']) in ((1920, 1080), (1080, 1920)),
            'size_ok': p['size_mb'] <= 28,
            'fps_ok': p['fps'] in (30.0, 60.0), 'duration_ok': 50 <= p['dur'] <= 60,
            'loudness_ok': abs(I + 16) <= 1.0, 'truepeak_ok': TP <= -1.0,
            'no_freeze_over_1_2s': len(fr) == 0,
        }
        report[os.path.basename(f)] = {**p, 'lufs': I, 'true_peak': TP, 'freezes': fr, 'n_cuts': len(c), 'max_gap_between_cuts': max(gaps) if gaps else None, 'checks': checks}
        os.makedirs('out/qa', exist_ok=True); strip(f, os.path.join('out/qa', os.path.basename(f).replace('.mp4', '_strip.jpg')))
        print(os.path.basename(f), json.dumps(report[os.path.basename(f)]))
    os.makedirs('out', exist_ok=True)
    allr = {}
    if os.path.exists('out/qa.json'): allr = json.load(open('out/qa.json'))
    allr.update(report); json.dump(allr, open('out/qa.json', 'w'), indent=1)
