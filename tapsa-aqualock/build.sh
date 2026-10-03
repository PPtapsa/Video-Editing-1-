#!/usr/bin/env bash
# Rebuild "THE LINE" from the source render.  usage: ./build.sh /path/to/good_Listing.mp4
set -euo pipefail
SRC="${1:?path to good_Listing.mp4}"
cd "$(dirname "$0")"
mkdir -p build/src build/audio output

# 1) Grade + upscale every source frame once (ivory grade, cool shadows, cyan lift, sharpen)
GRADE="scale=1920:1080:flags=lanczos,curves=all='0/0.012 0.22/0.19 0.5/0.5 0.8/0.83 1/0.99',eq=contrast=1.04:saturation=0.93,colorbalance=rs=-0.015:bs=0.03:bm=0.012:rh=-0.01:bh=0.006,huesaturation=hue=0:saturation=0.12:colors=c+b:strength=1,unsharp=5:5:0.75"
ffmpeg -v error -y -i "$SRC" -vf "$GRADE" -q:v 2 -start_number 0 build/src/f_%04d.jpg

# 2) Score + sound design + re-timed production audio → stems + master (-14 LUFS target, -1 dBTP)
python3 src/audio.py "$SRC" build/audio/tapsa
ffmpeg -v error -y -i build/audio/tapsa_mix_raw.wav -af "loudnorm=I=-14:TP=-1.0:LRA=7" -ar 48000 -c:a pcm_s24le build/audio/tapsa_master.wav

# 3) Picture: Chromium renders the compositor timeline frame by frame
(cd src && node render.mjs wide && node render.mjs square)

# 4) Mux + delivery encode (light film grain, H.264 High, AAC 320k)
for F in wide square; do
  OUT=output/TAPSA_AquaLock_TheLine_$([ $F = wide ] && echo 16x9_1920x1080 || echo 1x1_1080x1080).mp4
  ffmpeg -v error -y -i build/video_$F.mp4 -i build/audio/tapsa_master.wav \
    -vf "noise=alls=3:allf=t" -c:v libx264 -profile:v high -preset slow -b:v 12M -maxrate 16M -bufsize 24M -pix_fmt yuv420p \
    -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT"
done
cp build/audio/tapsa_master.wav output/TAPSA_AquaLock_TheLine_master_audio.wav
for s in music sfx production; do cp build/audio/tapsa_stem_$s.wav output/stem_$s.wav; done
echo "done → output/"
