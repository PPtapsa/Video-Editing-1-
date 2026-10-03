// Tapsa × AquaLock — "The Line" — master edit decision list.
// All times in seconds. 30 fps. Source = graded 1920x1080 frames of good_Listing.mp4 (f_0000 = 0.000s).
// Music grid: 96 BPM → 1 beat = 0.625 s, 1 bar = 2.5 s. Major cuts land on beats.

const FPS = 30;
const DURATION = 24.0;
const BEAT = 0.625;

const ease = {
  lin: t => t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};

// Each segment: record in/out, source mapping (piecewise-linear "time remap" keys),
// camera: zoom z, image anchor (ax, ay as 0..1 of source), stage anchor for wide (wx) and square (sx) as 0..1.
// Square format uses the same 1920x1080 plate scaled to 1080 tall, panned by sx/cx.
const SEGMENTS = [
  { id: 'S1', name: 'Hook — tile cover lifts', in: 0.000, out: 1.250,
    remap: [[0.000, 14.75], [1.250, 16.67]],
    cam: { z: [1.06, 1.14], ax: 0.42, ay: 0.55, cx: [0.40, 0.44] } },
  { id: 'S2', name: 'Hook — the flip', in: 1.250, out: 2.500,
    remap: [[1.250, 16.67], [2.000, 17.12], [2.500, 17.55]],   // slow through the flip, recover
    cam: { z: [1.14, 1.20], ax: 0.48, ay: 0.50, cx: [0.46, 0.50] } },
  { id: 'S3', name: 'Hook — steel glint + brand', in: 2.500, out: 3.750,
    remap: [[2.500, 18.00], [3.750, 19.55]],
    cam: { z: [1.10, 1.03], ax: 0.55, ay: 0.55, cx: [0.56, 0.54] } },
  { id: 'S4', name: 'Water disappears', in: 3.750, out: 6.250,
    remap: [[3.750, 0.20], [6.250, 3.08]],
    cam: { z: [1.00, 1.10], ax: 0.52, ay: 0.58, cx: [0.45, 0.46] } },
  { id: 'S5', name: 'Full-length flow (low angle)', in: 6.250, out: 8.125,
    remap: [[6.250, 5.10], [8.125, 7.25]],
    cam: { z: [1.02, 1.10], ax: 0.50, ay: 0.62, cx: [0.50, 0.50] } },
  { id: 'S6', name: 'Dive into the channel', in: 8.125, out: 8.750,
    remap: [[8.125, 7.25], [8.750, 7.80]],
    cam: { z: [1.10, 1.25], ax: 0.50, ay: 0.45, cx: [0.50, 0.50] } },
  { id: 'S7', name: 'AquaLock — trap ignites', in: 8.750, out: 13.125,
    remap: [[8.750, 7.80], [9.375, 8.733], [13.125, 12.55]],   // ramp so the cyan ignition hits the downbeat
    cam: { z: [1.12, 1.22], ax: 0.49, ay: 0.60, wx: [0.448, 0.396], cx: [0.49, 0.49] } },
  { id: 'S8', name: 'Whip up to floor', in: 13.125, out: 13.325,
    remap: [[13.125, 12.55], [13.325, 13.00]], blur: 7,
    cam: { z: [1.06, 1.00], ax: 0.50, ay: 0.50, cx: [0.50, 0.50] } },
  { id: 'S9', name: 'Your floor — tile insert', in: 13.325, out: 15.000,
    remap: [[13.325, 13.00], [15.000, 14.70]],
    cam: { z: [1.00, 1.035], ax: 0.50, ay: 0.55, cx: [0.52, 0.53] } },
  { id: 'S10', name: 'Your finish — tile→steel transform', in: 15.000, out: 16.875,
    freeze: 14.70, freezeB: 20.80, wipe: [15.050, 15.800],
    cam: { z: [1.035, 1.085], ax: 0.50, ay: 0.55, cx: [0.53, 0.54] } },
  { id: 'S11', name: 'Luxury, underfoot (lifestyle)', in: 16.875, out: 20.250,
    remap: [[16.875, 22.53], [20.250, 25.03]],
    cam: { z: [1.00, 1.07], ax: 0.42, ay: 0.55, cx: [0.38, 0.42] } },
  { id: 'S12', name: 'End card', in: 20.250, out: 24.000,
    freeze: 21.67,
    cam: { z: [1.13, 1.18], ax: 0.62, ay: 0.50, wy: 0.565, cx: [0.62, 0.60] } },
];

// Steel freeze-frame registration onto the tile freeze-frame (found by brute-force difference search):
// steel_aligned(x,y) = steel( (x+57)/1.05, (y+27)/1.05 ) in 1920 space → CSS: translate(-57px,-27px) scale(1.05)
const STEEL_ALIGN = { tx: -57, ty: -27, s: 1.05 };

// Drain axis on the floor plates (lower-left → upper-right), used for every diagonal wipe ("The Line").
const LINE_ANGLE_CSS = 65.3; // CSS gradient angle along the drain axis

// Story cues (record time). Used by compositor + exported into the Premiere plan.
const CUES = [
  { at: 0.10, out: 1.18, kind: 'head', text: 'TILE IT.', pos: 'tl', size: 1.35 },
  { at: 1.42, out: 2.42, kind: 'head', text: 'OR FLAUNT IT.', pos: 'tl', size: 1.35 },
  { at: 2.62, out: 3.62, kind: 'brand', pos: 'tl', sub: '2-IN-1 REVERSIBLE COVER' },
  { at: 3.95, out: 5.00, kind: 'head', text: 'WATER DISAPPEARS.', pos: 'tl' },
  { at: 5.10, out: 6.12, kind: 'head', text: 'SO DOES THE DRAIN.', pos: 'tl', sub: 'TILE-INSERT DESIGN' },
  { at: 6.42, out: 7.95, kind: 'head', text: 'FLOWS THE FULL LENGTH.', pos: 'tc', size: 0.78 },
  { at: 9.375, out: 12.95, kind: 'aqualock' },
  { at: 13.50, out: 16.70, kind: 'head', text: 'YOUR FLOOR.', pos: 'tl', sub: 'TILE INSERT', subSwap: { at: 15.45, text: 'STAINLESS STEEL' } },
  { at: 15.45, out: 16.70, kind: 'head2', text: 'YOUR FINISH.', pos: 'tl' },
  { at: 17.80, out: 19.80, kind: 'head', text: 'LUXURY, UNDERFOOT.', pos: 'tl', sub: 'SEAMLESS FLOORS · ZERO COMPROMISE' },
  { at: 19.85, out: 24.00, kind: 'endcard' },
];

// Sound map (record time) — mirrored by the audio build.
const SFX = [
  { at: 0.000, name: 'sub-hit + air whoosh (cold open)' },
  { at: 1.250, name: 'metal flip swish' },
  { at: 1.900, name: 'steel "shing" (glint)' },
  { at: 3.750, name: 'water splash transition' },
  { at: 8.125, name: 'reverse-suck dive whoosh' },
  { at: 9.375, name: 'AquaLock ignite: sub-drop + glass chime' },
  { at: 13.125, name: 'whip whoosh' },
  { at: 15.050, name: 'transform sweep (riser into shimmer)' },
  { at: 16.875, name: 'air release' },
  { at: 20.000, name: 'logo resolve: soft impact + chime' },
];

if (typeof module !== 'undefined') module.exports = { FPS, DURATION, BEAT, SEGMENTS, CUES, SFX, STEEL_ALIGN, LINE_ANGLE_CSS, ease };
