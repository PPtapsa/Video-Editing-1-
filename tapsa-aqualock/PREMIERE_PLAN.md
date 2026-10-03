# TAPSA × AquaLock™ — "THE LINE"
### Tile-Insert Linear Shower Drain · Flipkart listing film · 24.0 s · 30 fps

A rendered reference cut of this plan is in `output/` (16:9 master and 1:1 version). Every number below comes from the same edit file that produced those renders (`src/edit.js`), so if you rebuild it in Premiere with these values you get the same film.

---

## 1. Creative direction

**The idea:** the product is a line in the floor, so the film is built on **one line**:
- the linear drain itself;
- the gold rule under every headline;
- the diagonal wipe that turns tile into steel;
- the leader line that points at the AquaLock trap;
- the diagonal veil that opens the end card.

Every transition and graphic travels along the drain's own axis (65° in screen space). That one choice is what makes the film feel designed rather than edited.

**What I cut, and why:**
| Removed | Reason |
|---|---|
| 0:00–0:03 static opening of the original | Nothing moved for 3 s, which loses mobile viewers. The same shot is now used later, sped up, where the water *disappearing* is the point. |
| 3:10–4:28 soft-focus camera move | Out of focus for about 1.5 s and adds nothing. Cut. |
| 12:60–13:00 transition | Kept, but squeezed into a 6-frame whip. |
| The original "lift → flip → glint → set down" played in order | Split up: the flip opens the film as the hook, and the "set down" is replaced by a frozen-frame **tile→steel transformation**, which is stronger. |
| Ending on a wide room where the drain can't be seen | The room stays as the lifestyle beat, but the film now **ends on the product** with brand, product name and AquaLock. |

**Story (4 acts, 24 s):**
1. **HOOK (0–3.75 s)** — *"TILE IT. / OR FLAUNT IT."* Opens on the reversible cover: tile side up, flip, steel catches the light, Tapsa logo. The main selling point is clear within 2.5 s.
2. **INVISIBLE (3.75–8.75 s)** — *"WATER DISAPPEARS. / SO DOES THE DRAIN."* The original's weak static opening becomes the line that carries the film, followed by a low-angle shot of water flowing the full length and a dive into the channel.
3. **ENGINEERED (8.75–13.1 s)** — the cutaway. A speed ramp lands the cyan trap ignition **exactly on the downbeat**: bloom, tracked callout, **AquaLock™** lockup, two benefits.
4. **YOURS (13.1–24 s)** — whip up to the floor. *"YOUR FLOOR."*, then a gold line sweeps the drain and **turns the tile cover into steel** in a single frame-matched shot: *"YOUR FINISH."* Room reveal: *"LUXURY, UNDERFOOT."* Diagonal ivory veil, then the end card.

**Visual identity**
| Element | Spec |
|---|---|
| Headline font | **Futura PT Demi** (Adobe Fonts). Free equivalent: **Jost SemiBold**, used in the render. Uppercase, tracking +15. |
| Label font | Futura PT Medium / Jost Medium, uppercase, tracking +320 (echoes "L U X U R Y  B A T H I N G") |
| Charcoal (type) | `#231F1F` (from the AquaLock tagline) |
| Deep aqua (labels) | `#0E5E7E` (a darkened `#137094` so it passes contrast on beige) |
| Bright aqua (AquaLock accents) | `#13A3D7` |
| Gold rule | `#BE8F42` on light backgrounds; brand `#D0A65B` on dark |
| Ivory (veil/end card) | `#F4EFE8` |
| Headline size @1080 | 98 px (hook lines 132 px). Square: 80 / 108 px |
| Safe margin | x = 118 px, y = 104 px (16:9). 72 / 84 px (1:1) |

**Colour treatment (all clips):** a clean ivory grade, *not* yellow. Pull the beige toward neutral stone, keep a hint of cool in the shadows so the steel reads as silver, lift the cyan in the cutaway to match AquaLock's `#13A3D7`, add a light sharpen to hide the 720p upscale, and a soft vignette everywhere except the end card.

---

## 2. Sequence setup

1. **New Sequence:** 1920×1080, 30 fps, square pixels, 48 kHz. Name it `TAPSA_THELINE_16x9`.
2. Import `good_Listing.mp4` (1280×720). Every time you drop it in, **right-click → Set to Frame Size** (Scale = 150%). All Scale values below are *absolute* and already include that 150%.
3. **Marker grid:** music is 96 BPM, so 1 beat = 0.625 s = 18.75 frames. Add markers at the cut points in the table. If your licensed track has a different tempo, slide each cut to the nearest beat (±3 frames) rather than forcing the track.
4. Tracks: V1 picture · V2 steel layer / overlays · V3 graphics · V4 type · V5 adjustment layers. A1 production audio · A2 SFX · A3 SFX 2 · A4 music.
5. Put **one Adjustment Layer** for the grade across 00:00–20:08 on V5, and a second one for the vignette across 00:00–20:24.

---

## 3. Shot-by-shot execution table

Record TC = sequence timecode. Source TC = timecode inside `good_Listing.mp4`. Anchor = Effect Controls ▸ Motion ▸ Anchor Point (clip pixels, 1280×720). Position = sequence pixels.

| # | Record TC | Shot (Source TC) | Dur | Edit | Text / Graphics | Animation | Premiere Pro method | Key settings | Sound / SFX | Purpose |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 00:00:00:00 – 00:01:08 | Tile cover lifting · **14:23 → 16:20** | 38 f | Hard start on motion, no fade-in | **"TILE IT."** top-left, 132 px, charcoal, gold rule below | Text rises out of a mask at 00:03 (14 f, ease-out); rule draws 00:07–00:22; text lifts out 01:01–01:08 | Speed/Duration **154%**. Push-in via Scale keyframes. Type uses the Transform + Crop mask method (§4A) | Scale 159 → 171 (Bezier ease in/out) · Anchor 538,396 · Pos 806,594 | Sub-hit + air whoosh at 00:00; ticking 1/8-note clock starts; production clicks from source | Stops the scroll: motion from the first frame, plus the USP named in 2 words |
| 2 | 00:01:08 – 00:02:15 | The flip · **16:20 → 17:17** | 38 f | Straight cut on the cover's upward motion | **"OR FLAUNT IT."** same position and size | In at 01:13, out at 02:13 | **Time Remapping**: keyframes at 01:08 (src 16:20) → 02:00 (src 17:04) → 02:15 (src 17:17), so 60% through the flip, then 86%. Frame Sampling = **Optical Flow** | Scale 171 → 180 · Anchor 614,360 · Pos 922,540 | Metal swish at 01:03; **steel "shing"** at 01:28 (when the steel face first catches light) | Slow-motion turns a fast flip into a product reveal |
| 3 | 00:02:15 – 00:03:23 | Steel cover, light sweep · **18:00 → 19:17** | 38 f | Cut | **Tapsa logo** (colour) top-left at 560 px wide, gold rule, label **"2-IN-1 REVERSIBLE COVER"** | Logo wipes left→right 02:19–03:07 (Crop Right 100 → 0 %, ease-out) with Scale 104 → 100%; label fades in with tracking tightening; all out by 03:19 | Speed **124%**. Logo PNG on V3 | Scale 165 → 154.5 (pull-out, makes room for the logo) · Anchor 704,396 · Pos 1056,594 | Second softer shing at 02:19 | Puts the brand on screen inside 3 s, on the most premium frame |
| 4 | 00:03:23 – 00:06:08 | Top view, puddle drains · **00:06 → 03:02** | 75 f | **White-gold flash** cut (§4E) | **"WATER DISAPPEARS."** (in 03:28, out 05:00) → **"SO DOES THE DRAIN."** + label **"TILE-INSERT DESIGN"** (in 05:03, out 06:04) | Same mask-rise system; rule 180 px | Speed **115%** | Scale 150 → 165 · Anchor 666,418 · Pos 998,626 · **1:1 crop centre 864→883** | **THE DROP:** riser into a sub-hit at 03:23; kick enters on the beat; source water audio full, sped up | The copy plays on the visual: the water vanishes, and so does the drain |
| 5 | 00:06:08 – 00:08:04 | Low angle down the channel · **05:03 → 07:08** | 56 f | Cut on beat | **"FLOWS THE FULL LENGTH."** top-centre, 76 px | In 06:13, out 07:29 | Speed **115%** | Scale 153 → 165 · Anchor 640,446 · Pos 960,670 | Pluck arpeggio enters; source water trickle | Shows performance: the full-length channel |
| 6 | 00:08:04 – 00:08:23 | Dive into slot · **07:08 → 07:24** | 19 f | Cut | — | Black Solid on V2, Opacity 0 → 55% (ease-in) 08:09–08:23; then 55 → 0% over 08:23–08:28 on the next shot | Speed **88%** | Scale 165 → 187.5 · Anchor 640,324 · Pos 960,486 | **Falling-sweep whoosh** 08:02; music filter closes; kick drops out; **reverse swell** into the next downbeat | Tension and release: the camera falls into the product |
| 7 | 00:08:23 – 00:13:04 | Cutaway, trap ignites · **07:24 → 12:17** | 131 f | Cut | Cyan **bloom** 09:10; **tracked callout** (pin + gold leader) 09:13; **charcoal panel** right with **AquaLock™ lockup (dark)**; ✓ **BLOCKS SEWER ODOUR** (10:11) · ✓ **KEEPS INSECTS OUT** (10:23) · gold footer **ALWAYS HOLDS A WATER SEAL** (11:09) | Panel slides in from +90 px (09:14–10:00, ease-out); logo wipes in 09:23–10:11; pin pulses every 2 beats; all exit 12:21–13:00 (panel slides out right) | **Time Remap ramp:** keyframes 08:23 (src 07:24) → **09:12 (src 08:22, the ignition frame)** → 13:04 (src 12:17) = 149% then 102%. See §4B for the callout and §4C for the bloom | Scale 168 → 183 · Anchor 627,432 · **Pos X 860 → 760** (slow drift left, frees the right third) · Pos Y 648 | **IGNITE at 09:12:** sub-drop + glass chime (A5 + E6). Soft chime on each bullet. Groove returns, full | The engineering proof; the brand's sub-line (AquaLock) gets its own moment |
| 8 | 00:13:04 – 00:13:10 | Whip up · **12:17 → 13:00** | 6 f | Cut | — | Directional Blur 0 → 7 → 0 | Speed **225%** | Scale 159 → 150 · Directional Blur: Direction 0°, Length 0 → 40 → 0 | Whip whoosh 12:29 (starts 5 f early) | Energy reset: a fast move from inside the drain back to the floor |
| 9 | 00:13:10 – 00:15:00 | Top view, tile insert · **13:00 → 14:21** | 50 f | Cut | **"YOUR FLOOR."** + label **"TILE INSERT"** | In 13:15 | Speed **101%** (or 100%, then trim 1 f) | Scale 150 → 155.3 · Anchor 640,396 · Pos 960,594 | Production cover clicks, low | Sets up the transformation |
| 10 | 00:15:00 – 00:16:27 | **TRANSFORMATION** · Freeze **14:21 (tile)** + Freeze **20:24 (steel)** | 56 f | Frame Hold → wipe | Line 2 **"YOUR FINISH."** rises under line 1 at 15:14; the label drops down and swaps to **"STAINLESS STEEL"** | **Gold line sweeps along the drain 15:02–15:24** with a warm glow; the tile turns to steel behind it | See **§4D** (matched freeze frames + Linear Wipe + gold edge) | Nest both layers ▸ Scale 155.3 → 162.8 on the nest. Steel layer registered: **+5% scale, −57 / −27 px** | **Riser + shimmer whoosh** 15:02 → **shing** 15:24 | The best moment in the film: both finishes, one camera position, one sweep |
| 11 | 00:16:27 – 00:20:08 | Pull-back to room · **22:16 → 25:01** | 101 f | Cut on the camera move | **"LUXURY, UNDERFOOT."** + label **"SEAMLESS FLOORS · ZERO COMPROMISE"** | In 17:24 (after the room is revealed), out 19:24 | Speed **74%**, **Optical Flow** | Scale 150 → 160.5 · Anchor 538,396 · Pos 806,594 · 1:1 crop centre 730→806 | Air-release swell 16:26; groove continues; dominant chord (A13sus) pulls into the end | Aspiration: the drain disappears into a finished room |
| 12 | 00:20:08 – 00:24:00 | **END CARD** · Freeze **21:20** (steel, set) | 113 f | **Ivory veil wipe** along the drain axis, 19:26–20:08, gold edge | **Tapsa logo** (600 px) · gold rule · **TILE-INSERT LINEAR SHOWER DRAIN** · *2-in-1 Reversible Cover · Tile or Steel* · **AquaLock™ lockup (colour)** bottom-right | Veil goes from solid to a diagonal gradient (20:09–21:00) to show the drain; logo wipes in 20:11; rule 20:20; title 20:27; features 21:03; AquaLock 21:14; hold to 24:00 | §4E (veil). Logo/graphics on V3–V4 | Scale 169.5 → 177 · Anchor 794,360 · **Pos 1190,610** (sits the drain low-right, under the copy) | Veil whoosh 19:24; soft impact + chime (D6 + A6) 20:12; final D-major chord rings out; fade 22:12–24:00 | Ends on the product and brand, with no fade to black (the listing loops) |

---

## 4. Key techniques — step by step

### A. Masked-rise headline (used for every headline)
1. **Essential Graphics ▸ New Layer ▸ Text.** Futura PT Demi 98 px (hook 132), All Caps, tracking 15, fill `#231F1F`. Left-align and place the text's top-left at **x 118, y 104**.
2. Right-click the graphic ▸ **Nest**. On the nest, add **Transform** first, then **Crop** *below* it (order matters: Transform moves the text, Crop stays fixed and acts as the mask).
3. **Crop:** Bottom ≈ 100 − (baseline + 8 px)/1080 × 100. In practice, drag it up until it sits just under the letters' descenders.
4. **Transform ▸ Position Y keyframes:** IN at cue time: **+110 px** (below the mask) → **0** after **14 frames**. Right-click the keyframes ▸ **Bezier**; in the speed graph drag the first handle so the **outgoing influence ≈ 90%** (an expo-out feel). OUT: 0 → **−110 px** over **8 frames**, ease-in. Untick "Use Composition's Shutter Angle" and set Shutter Angle **180** for a little motion blur.
5. **Gold rule:** an EGP rectangle **180 × 4 px**, `#BE8F42`, placed 10 px under the text. Add **Crop ▸ Right 100% → 0%** from cue+4 f to cue+22 f, Bezier ease-out.
6. **Label:** Futura PT Medium **27 px**, tracking **320**, `#0E5E7E`, 30 px under the rule. Opacity 0 → 100 over 21 f starting at cue+9 f. For the "settling" effect, keyframe Text ▸ Tracking 550 → 320 over the same frames.

### B. Tracked AquaLock callout (shot 7)
The source camera drifts ≈ 60 px upward across this shot, so the pin must follow the trap.
- **After Effects (better):** Dynamic Link the shot ▸ Track Motion on the right wall of the glowing cup ▸ apply to a Null ▸ parent the pin and the leader's start point to it.
- **Premiere-only:** create the pin (white 14 px dot + aqua 3 px ring) in EGP. Keyframe **Position** so it sits on the cup's right wall: **09:13 → (1179, 721) · 10:20 → (1154, 664) · 11:24 → (1127, 613) · 13:00 → (1112, 605)** (sequence pixels, after the Scale/Position move above). Use **Temporal Interpolation ▸ Auto Bezier**. For the pulse, duplicate the ring and keyframe Scale 100 → 440% and Opacity 100 → 0 every 38 f (2 beats).
- **Leader:** EGP pen path or 3-segment polyline, 3 px `#D0A65B`. Reveal with **Crop Left 100 → 0** (or Linear Wipe) 09:16–09:29, ease-out.
- **Panel:** EGP rectangle **540 × 470** at **x 1290, y 250**, `#1A1717` at **86%** opacity, with a 3 px `#D0A65B` top stroke (a second 540 × 3 rectangle). Transform Position X **+90 → 0** (09:14–10:00, ease-out), Opacity 0 → 100.
- **Lockup:** `assets/logos/aqualock_dark.png` at 440 px wide, wipe-in via Crop Right.
- **Bullets:** Futura PT Medium 25 px, tracking 140, white, with an aqua ✓ in a 42 px ring. Stagger them 12 f apart, each sliding 30 px → 0.

### C. Ignition bloom (shot 7, at 09:12)
- Duplicate the shot on V2 ▸ Lumetri ▸ HSL Secondary: key the cyan (Hue ≈ 180–200°) ▸ **Gaussian Blur 80** ▸ Blend Mode **Screen**.
- Opacity keyframes: 09:10 = 0 → **09:13 = 100** → 10:06 = 30 → 13:04 = 30.
- Add a 2-frame **white flash** on the ignition (V5 white solid, Screen, 0 → 35 → 0).

### D. Tile → steel transformation (shot 10) — the centrepiece
1. **Frame Hold** the tile at source **14:21** (V1) and the steel at source **20:24** (V2), each 56 f long.
2. **Register them:** set V2 Blend Mode to **Difference**. Adjust V2 **Scale (+5% relative)** and **Position (≈ −57, −27 px)** until the floor tiles turn **black** and only the drain shows a difference. Set it back to **Normal**.
3. On V2 add **Linear Wipe**: Feather **20**. Set the **Wipe Angle** so the edge sits *perpendicular* to the drain and travels from its lower-left end to its upper-right end (≈ 245°; if it runs backwards, use 65°). Keyframe **Transition Completion 100% → 0%** from **15:02 to 15:24**, Bezier **ease in/out**.
4. **Gold edge:** EGP rectangle **4 × 2400 px** `#D0A65B`, **Rotation 65.3°** (square to the drain). Duplicate it, make it 26 px wide, `#FFF3DC`, add **Gaussian Blur 30**, Blend **Screen**, 85% opacity. Keyframe both layers' Position along the drain axis so they ride the wipe edge (2 keyframes, the same ease as the wipe).
5. Select V1 + V2 + the edges ▸ **Nest** ▸ Scale **155.3 → 162.8** across the shot (the move keeps a frozen frame feeling alive).
6. *After Effects alternative:* a Shape-layer mask with Feather + **CC Light Sweep** across the steel at the end of the wipe for an extra glint. Optional; the Premiere version already works well.

### E. Transitions
- **Hook → Act 2 flash (03:20–03:29):** a white solid `#FFF7EA` on V5, Blend **Screen**, Opacity 0 → **90** (03:20–03:23) → 0 (03:29). Hard cut underneath at 03:23.
- **Whip (13:04–13:10):** Directional Blur Length 0 → 40 → 0 + a 2-frame warm flash at 35%.
- **Ivory veil (19:26–20:08):** a colour matte `#F4EFE8` on V5 with **Linear Wipe**, the same angle as §4D, Feather 30. Completion 100 → 0 (ease in/out). Then crossfade (20:09–21:00) to a second matte that has a **Gradient Wipe** or Crop + Feather, leaving the top-left 40% solid and fading to clear parallel to the drain. *Premiere-only shortcut:* use a PNG of the gradient veil (render one from `src/compositor.html` at t = 23 s).

### F. Colour (Lumetri on the adjustment layer)
- **Basic:** Temperature **−6**, Tint **0**, Exposure **0**, Contrast **+8**, Highlights **−6**, Shadows **−4**, Whites **+6**, Blacks **−4**, Saturation **93**.
- **Curves ▸ RGB:** a gentle S (lift black output to ~1.5%, 22% → 19%, 80% → 83%, roll white to 99%).
- **Color Wheels:** Shadows a nudge toward **blue/cyan** (≈ +3), Highlights neutral to a hair **cool**. This is what turns "yellow beige" into "ivory stone".
- **HSL Secondary** (only on shot 7): key cyan/blue ▸ Saturation **+12**.
- **Creative ▸ Sharpen 25** (hides the 720p → 1080p upscale; 35 for the 1:1).
- **Vignette** (separate adjustment layer, off from 20:08): Amount **−0.22**, Midpoint 55, Feather 75.
- *Optional texture:* **Noise 2%** (Use Color Noise off) for a filmic finish.

### G. Sound
- **Music (A4):** use `build/audio/tapsa_stem_music.wav`, the score composed for this cut (96 BPM, D major, minimal "tech-luxury": warm pad, sub bass, felt kick, plucked arpeggio, glass chimes, all landing on picture cues). If you'd rather license a track, search Adobe Stock Audio for *"minimal luxury tech ambient 96 bpm"* and look for: no vocals; a sparse intro (hook); a **drop or kick entry around 3–4 s**; a breakdown you can place at 8 s.
- **Production (A1):** the original render's audio is re-timed with each clip, so speed changes in Premiere carry the water and click sounds automatically. **Uncheck "Maintain Audio Pitch"** on the slow-motion clips (pitch-down = weight).
- **SFX (A2/A3):** `tapsa_stem_sfx.wav`, or rebuild it from Premiere/Adobe Stock: sub hit (00:00, 03:23, 09:12, 20:08), whooshes (01:03, 08:02, 12:29, 15:02, 19:24), metallic shing (01:28, 02:19, 15:24), glass chime (09:12, 20:12), riser (02:17 → 03:23).
- **Essential Sound:** tag the music as Music ▸ **Ducking** against SFX, −6 dB, sensitivity 6, fade 300 ms. Tag SFX as SFX.
- **Master:** **Loudness: −14 LUFS integrated, −1.0 dBTP** (Effects ▸ Loudness Meter, then the Hard Limiter at −1.0 dB on the Mix). The reference master measures −15.3 LUFS / −1.1 dBTP.

---

## 5. 1:1 version (1080 × 1080)
1. Duplicate the sequence ▸ **Sequence ▸ Auto Reframe Sequence** ▸ Square 1:1, Motion Preset *Slower Motion* ▸ **nest clips = off**.
2. Override each shot's horizontal crop centre with these source-pixel values (1920 space): S1 768→845 · S2 883→960 · S3 1075→1037 · **S4 864→883** (keeps "SO DOES THE DRAIN." off the drain) · S5–S8 960 · S9 998→1018 · S10 1018→1037 · S11 730→806 · S12 1190→1152.
3. Type: headlines **80 px** (hook 108), margins **72 / 84 px**.
4. The AquaLock panel becomes a **bottom strip** (984 × 272 at 48, 760): lockup on the left, the 2 bullets side by side; the leader drops down from the pin.
5. End card: the logo is centred (430 px), the copy is centred under it, and the veil becomes a top-down fade (solid to 40%, clear by 62%).

---

## 6. Export
| | 16:9 master | 1:1 |
|---|---|---|
| Format | H.264, High profile, Level 4.2 | H.264, High |
| Frame | 1920×1080, 30 fps, progressive | 1080×1080, 30 fps |
| Bitrate | VBR 2-pass, target **12 Mbps**, max 16 | VBR 2-pass, target 10, max 14 |
| Audio | AAC 320 kbps, 48 kHz stereo | same |
| Tick | Render at Maximum Depth · Use Maximum Render Quality | same |

Before uploading, check Flipkart Seller Hub's current video specs (accepted aspect ratios, max length and file size). Both renders are 24 s and well under typical size limits.

---

## 7. Before this goes live — please verify
- **Benefit claims:** "Blocks sewer odour", "Keeps insects out", "Always holds a water seal" describe what a water-seal trap does. Confirm they are true for this product before publishing.
- **"Stainless steel"**, and the grade (SS304/316) if you want to add it to the end card.
- **Product name** on the end card: "Tile-Insert Linear Shower Drain". Add size options (e.g. 600 / 800 / 1000 mm) if you sell several.
- Flipkart content rules: no prices, offers, phone numbers or URLs in the video (none are used).
