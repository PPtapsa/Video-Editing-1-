# Tapsa × AquaLock™ — "The Line"

A 24-second Flipkart listing film for the Tapsa tile-insert linear shower drain, rebuilt from the original render. The approved cut in `output/` was made from a 720p/30 fps copy (`good_Listing.mp4`). The pipeline now also takes the native master **`good.mp4` (1920×1080, 24 fps, 601 frames)**, and every time in `edit.js` maps 1:1 onto it.

| File | What it is |
|---|---|
| `output/TAPSA_AquaLock_TheLine_16x9_1920x1080.mp4` | Master, 16:9 |
| `output/TAPSA_AquaLock_TheLine_1x1_1080x1080.mp4` | Square version |
| `output/TAPSA_AquaLock_TheLine_master_audio.wav` | Final mix, 48 kHz / 24-bit |
| `output/stem_music.wav`, `stem_sfx.wav`, `stem_production.wav` | Stems for rebuilding the mix in Premiere |
| `PREMIERE_PLAN.md` | Shot-by-shot Premiere Pro execution plan (TCs, speeds, Scale/Anchor/Position, keyframes, Lumetri, audio, export) |
| `output/page/` | The same plan as a web page with the preview player and storyboard |
| `assets/` | Logos (transparent / dark-background variants) and the Jost font |
| `src/edit.js` | The edit decision list: every segment, speed ramp, camera move and cue |
| `src/compositor.html` | Picture compositor (type, graphics, wipes), rendered frame by frame in Chromium |
| `src/audio.py` | Score, sound design and re-timed production audio |
| `build.sh` | Rebuilds everything: `./build.sh /path/to/good.mp4 [OUT_DIR] [OUT_FPS]` |

Requirements to rebuild: ffmpeg, Node + Playwright (Chromium), Python 3 with numpy, scipy, pillow.

## Native 1080p rebuild (from `good.mp4`)

```bash
STILLS_ONLY=1 ./build.sh "/path/to/good.mp4"            # grade + QC stills in build/stills_{wide,square}/ (check these first)
./build.sh "/path/to/good.mp4" "/path/to/deliveries"     # full build at the source rate (24 fps)
OVERLAY=1 ./build.sh "/path/to/good.mp4"                 # also writes build/overlay_wide.mov (graphics only, ProRes 4444 + alpha) for Premiere
```

- The source is probed (size, fps, frame count → `build/src/meta.json`). A native 1920×1080 source gets **no scale** and `unsharp` 0.3. A smaller source gets the old Lanczos upscale and 0.75 sharpen.
- Output frame rate defaults to the source rate (24 fps). Pass `30` as the third argument to render at 30 fps like the approved cut.
- Deliveries: `TAPSA_AquaLock_TheLine_16x9_1080p.mp4` (H.264 High, 12/16 Mbps) and `TAPSA_AquaLock_TheLine_1x1_1080.mp4` (10/14 Mbps), AAC 320k 48 kHz, `+faststart`, grain `noise=alls=2`. Contact sheets (4 fps) and EBU R128 loudness are printed or written at the end.
- Sync anchor: the AquaLock trap's cyan glow first appears at source ≈ 8.73 s and lands at record 9.375 s (24 fps source frames 209/210).
- Windows: run from Git Bash or WSL with ffmpeg, Node + `npm i playwright && npx playwright install chromium`, and `pip install numpy scipy pillow`. Set `CHROMIUM_PATH` if you want a specific browser.
