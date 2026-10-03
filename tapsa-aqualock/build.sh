#!/usr/bin/env bash
# Rebuild "THE LINE" from the source render.
#   usage: ./build.sh /path/to/good.mp4 [OUT_DIR] [OUT_FPS]
#   STILLS_ONLY=1 ./build.sh good.mp4      → grade + QC stills only (no full render)
#   OVERLAY=1     ./build.sh good.mp4      → also render the graphics-only ProRes 4444 overlay for Premiere
# Source can be the 1080p/24 fps master (good.mp4) or the old 720p/30 fps copy: frame rate, frame count
# and size are probed, so edit.js (all in seconds) maps onto either.
set -euo pipefail
SRC="$(cd "$(dirname "${1:?path to good.mp4}")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")"
OUT_DIR="${2:-output}"
mkdir -p build/src build/audio "$OUT_DIR"

# 0) Probe the source frame grid
read -r SW SH SFPS_RAT <<<"$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$SRC" | tr ',' ' ')"
SFPS=$(python3 -c "from fractions import Fraction as F;print(float(F('$SFPS_RAT')))")
OUT_FPS="${3:-$SFPS}"
echo "source: ${SW}x${SH} @ ${SFPS} fps → output ${OUT_FPS} fps"

# 1) Grade every source frame once (ivory grade, cool shadows, cyan lift, light sharpen).
#    Native 1920x1080 → no scale, unsharp 0.3. Smaller sources get the Lanczos upscale + the old 0.75 sharpen.
if [ "$SW" = 1920 ] && [ "$SH" = 1080 ]; then SCALE=""; SHARP=0.3; else SCALE="scale=1920:1080:flags=lanczos,"; SHARP=0.75; fi
GRADE="${SCALE}curves=all='0/0.012 0.22/0.19 0.5/0.5 0.8/0.83 1/0.99',eq=contrast=1.04:saturation=0.93,colorbalance=rs=-0.015:bs=0.03:bm=0.012:rh=-0.01:bh=0.006,huesaturation=hue=0:saturation=0.12:colors=c+b:strength=1,unsharp=5:5:${SHARP}"
rm -f build/src/f_*.jpg
ffmpeg -v error -y -i "$SRC" -vf "$GRADE" -fps_mode passthrough -q:v 1 -qmin 1 -start_number 0 build/src/f_%04d.jpg
NF=$(ls build/src/f_*.jpg | wc -l)
echo "{\"fps\": $SFPS, \"frames\": $NF, \"width\": $SW, \"height\": $SH}" > build/src/meta.json
echo "graded $NF frames"

# QC stills (both formats)
QC_T="0.6,3.3,5.6,9.6,11.8,15.4,18.6,21.6,23.5,9.333,9.375,9.417"
(cd src && node render.mjs wide --fps "$OUT_FPS" --stills "$QC_T" && node render.mjs square --fps "$OUT_FPS" --stills "$QC_T")
[ "${STILLS_ONLY:-0}" = 1 ] && { echo "stills → build/stills_*"; exit 0; }

# 2) Score + sound design + re-timed production audio → stems + master (-14 LUFS target, -1 dBTP)
python3 src/audio.py "$SRC" build/audio/tapsa
ffmpeg -v error -y -i build/audio/tapsa_mix_raw.wav -af "loudnorm=I=-14:TP=-1.0:LRA=7" -ar 48000 -c:a pcm_s24le build/audio/tapsa_master.wav

# 3) Picture: Chromium renders the compositor timeline frame by frame
(cd src && node render.mjs wide --fps "$OUT_FPS" && node render.mjs square --fps "$OUT_FPS")
if [ "${OVERLAY:-0}" = 1 ]; then (cd src && node render.mjs wide --fps "$OUT_FPS" --alpha); fi

# 4) Mux + delivery encode (light film grain, H.264 High, AAC 320k 48 kHz, faststart)
mux() { # fmt out bitrate maxrate
  ffmpeg -v error -y -i "build/video_$1.mp4" -i build/audio/tapsa_master.wav \
    -vf "noise=alls=2:allf=t" -c:v libx264 -profile:v high -preset slow -b:v "$3" -maxrate "$4" -bufsize "$4" -pix_fmt yuv420p \
    -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$2"
}
mux wide   "$OUT_DIR/TAPSA_AquaLock_TheLine_16x9_1080p.mp4" 12M 16M
mux square "$OUT_DIR/TAPSA_AquaLock_TheLine_1x1_1080.mp4"   10M 14M
cp build/audio/tapsa_master.wav "$OUT_DIR/TAPSA_AquaLock_TheLine_master_audio.wav"
for s in music sfx production; do cp build/audio/tapsa_stem_$s.wav "$OUT_DIR/stem_$s.wav"; done

# 5) QC: contact sheets (4 fps) + loudness
for f in "$OUT_DIR"/TAPSA_AquaLock_TheLine_16x9_1080p.mp4 "$OUT_DIR"/TAPSA_AquaLock_TheLine_1x1_1080.mp4; do
  ffmpeg -v error -y -i "$f" -vf "fps=4,scale=320:-1,tile=8x12" -frames:v 1 "build/contact_$(basename "$f" .mp4).jpg"
  echo "== $(basename "$f")"; ffmpeg -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E "I:|Peak:"
done
echo "done → $OUT_DIR/"
