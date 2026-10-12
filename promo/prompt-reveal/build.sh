#!/usr/bin/env bash
# Full build: frames → soundtrack → master (-14 LUFS, -1 dBTP) → h264 MP4.
# Usage: ./build.sh [workdir]   (needs node + playwright, python3 + numpy, ffmpeg)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${1:-$HERE/build}"
mkdir -p "$WORK"
[ -f "$WORK/voxscape.mp3" ] || curl -sSL https://assets.mixkit.co/music/571/571.mp3 -o "$WORK/voxscape.mp3"
node "$HERE/render.js" "$WORK/frames"
python3 "$HERE/audio.py" "$WORK/voxscape.mp3" "$WORK/mix.wav"
ffmpeg -v error -y -i "$WORK/mix.wav" -af "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=1,volume=8.9dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=disabled,aresample=48000" -c:a pcm_s24le "$WORK/master.wav"
ffmpeg -v error -y -framerate 30 -i "$WORK/frames/f%03d.png" -i "$WORK/master.wav" \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -profile:v high -tune film -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$WORK/accounte-prompt-reveal.mp4"
ffmpeg -hide_banner -i "$WORK/master.wav" -af loudnorm=I=-14:TP=-1:print_format=summary -f null - 2>&1 | grep -E 'Input (Integrated|True Peak)'
echo "→ $WORK/accounte-prompt-reveal.mp4"
