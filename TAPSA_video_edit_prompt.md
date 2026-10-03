# TAPSA Floor Drain — Claude Code Edit Prompt

> Paste everything below the line into **Claude Code (local, on the computer with Premiere Pro)**.
> Set model to **Opus 5.5** and effort to **High** first (`/model`).
> Make sure the **Premier Pro Higgsfield MCP** custom connector (`mcp.higgsfield.ai`) is enabled (`/mcp` to check) and Premiere Pro is open.

---

You are the creative director, motion designer and editor for a premium product film for **TAPSA**, a stainless-steel floor drain brand. You have full creative freedom. I want something that looks like an Apple / Dyson / Grohe product film, not a basic slideshow. Surprise me, but every creative choice must make the product easier to understand and more desirable.

## Hard rule: edit only, in Premiere Pro
- **Edit only in Premiere Pro, through the Premier Pro Higgsfield MCP (`pr_*` tools).**
- **No AI generation of any kind.** Do not generate videos, images, voice-overs or music, do not upscale with AI, and do not spend any Higgsfield credits.
- Every shot in the film comes from **my raw footage**. All graphics (headlines, callouts, lines, the AquaLock diagram, the logo end card) are built **inside Premiere** with titles, shapes, masks, keyframes and effects.
- If the story needs a shot that isn't in the footage, solve it creatively with what's there: punch-ins, reframes, speed ramps, freeze frames, split screens, or a graphic built in Premiere. Then list the missing shot in `notes.md` so I can film it later.

## Inputs
- **Source video (raw footage, already on this PC):**
  `D:\E-commerce\Listing-Image\1 Raw\Drain\Tile Insert Ind\Video\archive\good.mp4`
  - Import it straight into Premiere with `pr_import_media`. Do not move, rename, re-encode or overwrite the original file.
  - If Premiere can't find it, stop and ask me. Don't guess another path.
- **Premiere project:** a Premiere project is already open (`Untitled.prproj`). Save it as `TAPSA_Drain.prproj` in `D:\E-commerce\Listing-Image\1 Raw\Drain\Tile Insert Ind\Video\` before you start, and save again after every major step.
- **Exports folder:** `D:\E-commerce\Listing-Image\1 Raw\Drain\Tile Insert Ind\Video\exports\` (create it if it doesn't exist). Put `plan.md` and `notes.md` in the `Video` folder as well.
- **The connector:**
  - Before your first edit, call `get_host_status` to confirm Premiere Pro is connected, then load `pr_get_skill` and follow it.
  - Useful tools: `pr_import_media`, `pr_probe_media`, `pr_extract_frames`, `pr_create_bin`, `pr_create_sequence`, `pr_assemble_edit` / `pr_apply_cut_plan`, `pr_split_clip`, `pr_trim_clip`, `pr_set_clip_speed` (speed ramps), `pr_set_clip_transform` + `pr_add_keyframe` + `pr_set_keyframe_interpolation` (push-ins, reframing, eased motion), `pr_add_transition`, `pr_apply_effect` + `pr_set_effect_property`, `pr_color_correct`, `pr_import_mogrt` + `pr_set_mogrt_text` (titles), `pr_detect_beats`, `pr_add_music_bed`, `pr_duck_music`, `pr_add_audio_fade`, `pr_set_sequence_format` (9:16 / 1:1 versions), `pr_export_sequence_frame` (checking frames), `pr_export_sequence`, `pr_save_project`.
  - Shell (ffmpeg, Python) only for downloading, inspecting and checking files. **Never for the edit itself.**

## Step 1: Understand the footage before touching anything
1. Import the video and run `pr_probe_media` to get its resolution, frame rate and length. Then use `pr_extract_frames` (one frame every 1–2 s) and look at every frame.
2. Write a **shot log**: timecode, what's in frame, quality (sharp / soft / shaky / badly lit), and what it's useful for.
3. Note what's **missing** from the footage and how you'll cover it in Premiere (see the hard rule above).

## Step 2: Creative plan (show me, then go)
Write a short treatment and save it as `plan.md`:
- Concept and mood in 2–3 lines
- Shot-by-shot storyboard with timings, and which source timecode each shot comes from
- The graphics you'll build in Premiere (style, positions, animation)
- Music and sound direction (you can't generate music, so say what kind of track I should drop in, or use any audio I provide)

Show me the plan, then continue without waiting unless a decision is genuinely mine to make.

## The product (only facts you may claim)
- Tile / marble **insert** floor drain: the top takes a piece of the same tile or marble, so the drain disappears into the floor.
- **2 mm rim thickness.** Always say "rim". Never "only 2 mm thick" (that would imply the whole body is 2 mm).
- **AquaLock water seal:** water stays in the trap and blocks odours and insects. **No flap, no moving parts**, unlike drains that use a gravity flap.
- Full drain and trap components in **AISI 304 (SS304) stainless steel**. Material certificate included with every product.
- **Removable cover and strainer** for easy cleaning.
- Brand line: **TAPSA, Where Perfection Begins.**

Do **not** invent anything else: no sizes, flow rates, warranty years, certifications or percentages that aren't listed above. If you want a spec on screen, leave a clearly marked placeholder and tell me.

## Story (3 benefits, one at a time)
Build the film around three benefits. Land each one before moving to the next:
1. **Seamless floor:** the drain disappears into the tile or marble. 2 mm rim.
2. **AquaLock:** a water seal with no flap and no moving parts. This is the hero moment, so slow down here.
3. **Built to last:** SS304 steel, certificate, easy to lift out and clean.
4. **Close:** TAPSA logo and tagline.

A suggested order (you may change it if you have a stronger idea): hero reveal of the installed floor → rim detail → water draining → push into the outlet → AquaLock explanation → steel components and certificate → lift, remove, clean → logo.

**AquaLock explanation:** if the footage has no cutaway, build a clean, simple diagram in Premiere over a frozen or slowed frame of the outlet. Use shapes and masks: a steel-grey trap outline, an aqua water layer that rises and holds, and an arrow showing the drain path. Keep it in the same orientation as the real outlet so the cut makes sense.

## Raw reference copy (rewrite freely, keep the facts exact)
Use this as a starting point only. Make it sharper, shorter and more premium if you can:

- SEAMLESS FLOORING. DOWN TO THE DETAIL.
- Matching tile or marble insert · 2 mm rim thickness
- AQUALOCK WATER-SEAL TECHNOLOGY · Helps block drain odours & insects
- NO FLAP. NO MOVING PARTS. · A water seal without a gravity-operated flap
- BUILT FOR LASTING PERFORMANCE · Full drain and trap components in AISI 304 stainless steel · Material certificate included
- LIFT. REMOVE. CLEAN. · Removable cover and strainer
- TAPSA · WHERE PERFECTION BEGINS.

"NO FLAP. NO MOVING PARTS." must be one of the biggest, clearest moments in the film.

## Design rules (non-negotiable)
- **One idea per shot:** one main subject and one headline. Put each callout right next to the part it describes: the 2 mm label by the rim, the water-seal text by the trap, the SS304 text by the steel body.
- **Readable on a phone with sound off.** Large headline, smaller explanation, specs smallest. Hold each line long enough to read it twice.
- **Brand colours:** charcoal, porcelain white, aqua. Use aqua for water and the water seal and keep it consistent everywhere. One font family, same callout-line style, same text positions.
- **Motion:** the product appears first and the text follows it. Slow, eased push-ins on steel give it weight; speed ramps on water make it feel fluid. No cheap template transitions; every transition should lead to the next question a buyer would ask (e.g. push into the outlet, which leads to the AquaLock explanation).
- **Continuity:** keep the outlet facing the same way when cutting from the full drain to the close-up or diagram, so viewers know where the close-up comes from.
- **Leave negative space** for text. Don't cover the rim, the water-entry gap or the trap while they're being explained.
- **Sound:** keep the real water and metal sounds from the footage where they help, cleaned up and subtle, with music underneath if I provide a track. No AI voice-over.
- **Color grade (Lumetri via `pr_color_correct`):** clean, cool, high-end. Steel should look like real steel (no orange cast), and the marble should look bright and expensive. Match every shot so the film looks like one shoot.

## Deliverables
Save to the exports folder above:
1. `TAPSA_master_16x9.mp4`: 1920×1080 (or 4K if the source is 4K), 30–60 s
2. `TAPSA_reel_9x16.mp4`: 1080×1920, 15–30 s, reframed shot by shot (not just center-cropped), with the text re-laid out for vertical
3. `TAPSA_square_1x1.mp4` (optional): 1080×1080 for feed posts
4. The Premiere project `TAPSA_Drain.prproj`, saved, with bins: Raw, Selects, Graphics, Audio, Sequences
5. `plan.md` (treatment + storyboard) and `notes.md` (what you did, shots I should film next time, placeholders I need to fill)

Export settings: H.264, high bitrate, AAC 320 kbps audio, loudness around −14 LUFS.

## Before you say you're done
- Use `pr_export_sequence_frame` on every scene and look at each frame: text readable at phone size? Callout next to the right part? Nothing cut off in 9:16?
- Watch the whole film once with sound off: is every benefit still clear?
- Check every claim on screen against the product facts above. Remove anything that isn't listed.
- Confirm you used **zero** AI generation and **zero** Higgsfield credits.
- Report back: paths to the exports, total length, and anything you'd improve with more footage.

Go all out.
