# Tapsa × AquaLock™ — "The Line"

A 24-second Flipkart listing film for the Tapsa tile-insert linear shower drain, rebuilt from the original render (`good_Listing.mp4`).

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
| `build.sh` | Rebuilds everything: `./build.sh /path/to/good_Listing.mp4` |

Requirements to rebuild: ffmpeg, Node + Playwright (Chromium), Python 3 with numpy, scipy, pillow.
