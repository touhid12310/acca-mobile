#!/bin/bash
# usage: tools/queue.sh 02_flat 03_3d ...   (render both ARs, mix, QA; log to out/queue.log)
cd "$(dirname "$0")/.."
declare -A NAME=( [01_kinetic]=KineticType [02_flat]=Flat2D [03_3d]=3D [04_isometric]=Isometric [05_device]=UIDeviceMockup [06_dataviz]=DataViz [07_glitch]=GlitchFuturistic [08_cinematic]=Cinematic [09_papercut]=PaperCutCollage [10_minimal]=MinimalPremium )
python3 -I tools/mkpage.py > /dev/null
for v in "$@"; do
  echo "=== $v $(date +%T)" >> out/queue.log
  node tools/render.mjs --jobs 2 $v:16x9 $v:9x16 2>&1 | grep -E "done|ERR|FAIL|PAGEERROR" >> out/queue.log
  python3 -I tools/mix.py $v 2>&1 | grep -v Warn >> out/queue.log
  python3 -I tools/qa.py deliver/AccountE_${v:0:2}_${NAME[$v]}_16x9.mp4 deliver/AccountE_${v:0:2}_${NAME[$v]}_9x16.mp4 2>&1 | cut -c1-700 >> out/queue.log
done
echo "QUEUE DONE $(date +%T)" >> out/queue.log
