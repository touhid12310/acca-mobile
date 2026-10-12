#!/bin/bash
# Re-encode a delivered spot to fit a size budget (two-pass x264), keeping its mixed audio.
# usage: tools/fit.sh <id> <ar> <MiB>     e.g. tools/fit.sh 03_3d 16x9 26
set -e
cd "$(dirname "$0")/.."
ID=$1; AR=$2; MIB=$3
OUT=$(ls deliver/AccountE_${ID:0:2}_*_${AR}.mp4)
SRC=out/$ID/video_${AR}.mp4
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
VK=$(python3 -c "print(int(($MIB*8*1048576/$DUR - 192000)/1000))")
TMP=$(mktemp -d)
ffmpeg -v error -y -i "$SRC" -c:v libx264 -preset slow -b:v ${VK}k -pass 1 -passlogfile $TMP/p -an -f null /dev/null
ffmpeg -v error -y -i "$SRC" -i "$OUT" -map 0:v -map 1:a -c:v libx264 -preset slow -b:v ${VK}k -pass 2 -passlogfile $TMP/p \
  -pix_fmt yuv420p -profile:v high -c:a copy -movflags +faststart $TMP/fit.mp4
mv $TMP/fit.mp4 "$OUT"; rm -rf $TMP
SSIM=$(ffmpeg -i "$OUT" -i "$SRC" -lavfi "[0:v][1:v]ssim" -f null - 2>&1 | grep -o "All:[0-9.]*" | cut -d: -f2)
python3 -I - "$OUT" "$VK" "$SSIM" <<'PY'
import json, os, sys
out, vk, ssim = sys.argv[1:4]; fn = 'out/fit.json'
d = json.load(open(fn)) if os.path.exists(fn) else {}
d[os.path.basename(out)] = {'mib': round(os.path.getsize(out) / 1048576, 1), 'video_kbps': int(vk), 'ssim': round(float(ssim), 4)}
json.dump(d, open(fn, 'w'), indent=1)
PY
echo "$OUT -> $(python3 -c "import os;print(round(os.path.getsize('$OUT')/1048576,1))") MiB @ ${VK}k, SSIM $SSIM"
