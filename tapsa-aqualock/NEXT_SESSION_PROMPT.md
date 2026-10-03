You are a senior commercial video editor, motion designer and Premiere Pro expert. Finish a 24-second Flipkart listing film for my product (a tile-insert linear shower drain, brand **Tapsa Luxury Bathing**, sub-brand **AquaLock™ Water-Seal Trap Technology**) at **full native 1080p quality**, using my original high-quality video.

## What already exists (don't redesign it, reproduce it)
A previous session made the complete edit from a 720p/30 fps copy of my video. Everything is in the public GitHub repo **https://github.com/PPtapsa/Video-Editing-1-**, branch **`claude/friendly-faraday-ga5b3o`**, folder **`tapsa-aqualock/`**:
- `src/edit.js` is the edit decision list and the single source of truth: 12 segments with record in/out, source time-remap keys (in seconds), camera zoom/anchor, text cues, SFX times.
- `src/compositor.html` + `src/render.mjs`: Chromium compositor (graded source frames + all typography, logos, AquaLock panel, tracked callout, tile→steel wipe, ivory end-card veil) rendered frame by frame with Playwright.
- `src/audio.py`: original score (96 BPM, D major) + sound design + the source's own audio re-timed through the same remap. Outputs stems and a mix (normalise with `loudnorm=I=-14:TP=-1`).
- `build.sh`: full pipeline (grade → audio → render → mux).
- `PREMIERE_PLAN.md`: the same edit written as Premiere Pro steps (timecodes, speeds, Scale/Anchor/Position, keyframes, Lumetri, export).
- `assets/`: Tapsa + AquaLock logos (transparent, dark-background variants) and the Jost font.
- `output/`: the approved 720p-sourced renders (16:9 + 1:1). The goal is **the same film**, but sharper.

Read `README.md`, `src/edit.js` and `PREMIERE_PLAN.md` before doing anything.

## My original files (on my Windows PC)
Folder: `D:\E-commerce\Listing-Image\1 Raw\Drain\Tile Insert Ind\Video\Claude\`
- `good.mp4`: the original render. **1920×1080, 24 fps, 25.04 s (601 frames)**, larger than 100 MB.
- `1 TAPSA Plain.png`: Tapsa logo. `AquaLock.svg`: AquaLock logo. `1 Final.png`: AquaLock logo sheet.

Verified facts about `good.mp4` vs the 720p copy the edit was made from: the 720p copy was 30 fps, 752 frames, 25.067 s, i.e. a plain 24→30 fps conversion of this same render. **All times in `edit.js` are in seconds and map 1:1 onto `good.mp4`.** Key anchor for checking sync: the AquaLock trap's cyan glow first appears at **source ≈ 8.73 s**. Check this on `good.mp4` before building anything.

## Choose the route by what this session can reach

### Route A (preferred): you can read `D:\...\Claude\good.mp4` from a terminal (local Claude Code on my PC)
Re-render the film natively from `good.mp4` with the repo pipeline:
1. Clone the repo/branch. Install what's missing: ffmpeg, Node + Playwright with Chromium, and Python with numpy, scipy, pillow.
2. Adapt the pipeline for a **1080p / 24 fps** source:
   - Grade: keep the curves/eq/colorbalance/huesaturation chain. Drop the `scale` (already 1920×1080). Reduce `unsharp` from 0.75 to about **0.3** (no upscale to hide any more).
   - Frame indexing: `compositor.html` assumes 30 fps source frames (`st * 30`, clamp to 751). Change it to the source's real fps (24) and frame count (601), or extract source frames at 30 fps (`-vf fps=30`) so nothing else changes. Prefer **native 24 fps output** if the motion looks right; otherwise keep 30 fps.
   - `render.mjs`: make `FPS` match the chosen output rate. Fix the Chromium `executablePath` for Windows, or let Playwright use its own browser.
   - `audio.py` reads audio straight from the source, so just point it at `good.mp4`.
3. Before the full render, render stills at 0.6, 3.3, 5.6, 9.6, 11.8, 15.4, 18.6, 21.6 and 23.5 s for **both** `wide` and `square`. Compare them to the approved stills/renders in `output/` and check that the cyan ignition lands at record 9.375 s.
4. Full render of both formats, then mux (H.264 High, 16:9 VBR 12 Mbps max 16; 1:1 10/14; AAC 320k 48 kHz; `+faststart`; light grain `noise=alls=2:allf=t`). Write the outputs into my `D:\...\Claude\` folder as `TAPSA_AquaLock_TheLine_16x9_1080p.mp4` and `TAPSA_AquaLock_TheLine_1x1_1080.mp4`.
5. QC with contact sheets of the final files (4 fps) and loudness (`ebur128`: about −14 to −15 LUFS, true peak ≤ −1 dBTP). Report what you verified.

### Route B: you can only reach my Premiere Pro (Higgsfield Premiere MCP, `pr_*` tools)
Build an **editable Premiere sequence** from `good.mp4`, plus a graphics overlay rendered from the repo:
1. Render the graphics-only layer from `compositor.html` with the picture plates hidden (transparent background, `omitBackground`), at **24 fps**. Encode it as **ProRes 4444 with alpha** (`prores_ks -profile:v 4444 -pix_fmt yuva444p10le`). If a file would exceed 100 MB, split it into time chunks. Commit the files to the repo, which is public, so `pr_import_media(urls=[raw.githubusercontent.com/...])` can download them. Include the master audio WAV.
2. In Premiere: a 1920×1080 24 fps sequence. V1 = `good.mp4` segments per `edit.js` (source in/out, constant speeds; split the two speed ramps S2 and S7 into two constant-speed clips at the ramp keyframe). Scale keyframes per segment: `edit.js` zoom × **100%** (native 1080p, not the 150% in the plan). S10 = tile frame-hold (14.70 s) on V1 + steel frame-hold (20.80 s) on V2, registered +5% scale / −57,−27 px, with a keyframed Linear Wipe along the drain axis 15.05→15.80 s. S12 = frame-hold at 21.67 s. V3 = overlay. A1 = master audio (drop `good.mp4`'s own audio). Lumetri per `PREMIERE_PLAN.md` §4F.
3. Problems the previous session hit with this Premiere connection:
   - `pr_export_sequence_frame`, `pr_export_frame` and `pr_extract_audio` produced **no file or timed out**.
   - `pr_export_sequence` found **no preset** (pass an `.epr`, e.g. from `C:\Program Files\Adobe\Adobe Media Encoder 2026\MediaIO\systempresets\`, or use `pr_add_to_render_queue`).
   - `pr_upload_media(good.mp4)` failed (over 100 MB).
   - After the export attempts Premiere stopped responding (bridge timeouts). Call `get_host_status` first. If calls time out, ask me to restart Premiere and reconnect the Higgsfield panel rather than retrying.
   - `pr_add_keyframe` takes a single number, so it may not keyframe 2-D Position. Check with `pr_get_effect_properties` before planning camera moves that need Position keyframes; if not possible, zoom about the frame centre and adjust the overlay's callout pin to match.
4. Current state of my Premiere project (`C:\Users\Lenovo\OneDrive\Documents\Adobe\Premiere Pro\26.0\Untitled.prproj`): `good.mp4` imported, plus a throwaway sequence **`_probe good`** that you can delete. Name the real sequence `TAPSA_TheLine_16x9_1080p` and save the project.
5. Since frame export may not work, tell me exactly which moments to check by eye (timecodes) and what I should see at each.

## Rules
- Keep the approved creative exactly: copy, typography (Jost / Futura PT), colours (#231F1F, #0E5E7E, #13A3D7, #BE8F42/#D0A65B, #F4EFE8), timings and sound. Only quality improves.
- Don't invent product claims. The existing lines ("Blocks sewer odour", "Keeps insects out", "Always holds a water seal", "Stainless steel") are pending my confirmation. Leave them as they are and remind me at the end.
- Verify before you report: a tool returning success is not proof. Say plainly what you checked and what you couldn't.
- Commit and push any pipeline changes to branch `claude/friendly-faraday-ga5b3o` with clear messages.
- Finish with: the output file paths, what was verified, what I need to check, and anything that differs from the approved 720p version.
