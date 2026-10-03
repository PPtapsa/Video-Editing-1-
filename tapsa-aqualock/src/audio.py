"""Tapsa x AquaLock — score + sound design, rendered to 48 kHz stereo WAV stems and a master.

Score: 96 BPM (beat = 0.625 s), D major, minimal 'tech-luxury' — warm pad, sub bass, felt kick,
plucked arpeggio, glass chimes. Hits are locked to picture cues from edit.js.
Production SFX: the original render audio (water, whooshes, cover clicks) is re-timed through the same
time-remap as the picture (tape-style, pitch follows speed), plus synthesized impacts/whooshes/risers.
"""
import json, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 24.0
N = int(SR * DUR)
BEAT = 0.625
rng = np.random.default_rng(7)
SRC = sys.argv[1]
OUT = sys.argv[2]

def T(sec): return int(round(sec * SR))
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def bus(): return np.zeros((N, 2))
def add(b, sig, at, pan=0.0, gain=1.0):
    """sig: mono (n,) or stereo (n,2)."""
    i = T(at)
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j0 = max(0, -i); i = max(0, i)
    n = min(len(sig) - j0, N - i)
    if n > 0: b[i:i + n] += sig[j0:j0 + n] * gain

def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def env_adsr(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = min(n, T(a)), min(n, T(r))
    if na: e[:na] = np.linspace(0, 1, na) ** 1.5 * sus
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

# ---------------- reverb (stereo exponential noise IR) ----------------
def make_ir(sec=2.4, damp=5200):
    n = T(sec); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (sec / 6.5))[:, None]
    ir = lp(ir, damp); ir[:T(0.012)] = 0
    return ir / np.sqrt((ir ** 2).sum())
IR = make_ir()
def verb(x, wet=0.3):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([fftconvolve(x[:, 0], IR[:, 0])[:len(x)], fftconvolve(x[:, 1], IR[:, 1])[:len(x)]], 1)
    return x * (1 - wet) + y * wet * 2.2

# ---------------- instruments ----------------
def pad_voice(f, n, bright=1.0):
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for k, det in enumerate([-7, 0, 6]):
        ff = f * 2 ** (det / 1200)
        ph = rng.uniform(0, 2 * np.pi)
        s = np.zeros(n)
        for h in range(1, 9):
            s += np.sin(2 * np.pi * ff * h * t + ph * h) / h ** (1.6 - 0.4 * bright)
        pan = (k - 1) * 0.6
        out[:, 0] += s * np.cos((pan + 1) * np.pi / 4); out[:, 1] += s * np.sin((pan + 1) * np.pi / 4)
    return out / 3

def chord(notes, at, dur, cutoff=1800, gain=0.06, a=0.35, r=0.6, bass=True):
    n = T(dur + r)
    sig = np.zeros((n, 2))
    for m in notes[1:]:
        sig += pad_voice(midi(m), n)
    sig = lp(sig, cutoff, 2) * env_adsr(n, a, r)[:, None]
    add(PAD, sig, at, gain=gain)
    if bass:
        t = np.arange(n) / SR; f = midi(notes[0])
        b = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env_adsr(n, 0.08, r)
        add(BASS, b, at, gain=0.16)

def kick(at, g=1.0):
    n = T(0.45); t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.16) + 0.15 * rng.standard_normal(n) * np.exp(-t / 0.004)
    add(DRUM, lp(s, 2400), at, gain=0.42 * g)
    # sidechain dip on the pad
    DUCK[T(at):T(at) + T(0.3)] = np.minimum(DUCK[T(at):T(at) + T(0.3)], 1 - 0.45 * np.exp(-np.arange(min(T(0.3), N - T(at))) / SR / 0.09))

def shaker(at, g=1.0):
    n = T(0.09); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 6500) * np.exp(-t / 0.018)
    add(DRUM, s, at, pan=0.35, gain=0.05 * g)

def tick(at, g=1.0):
    n = T(0.05); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 4200 * t) * 0.6 + hp(rng.standard_normal(n), 5000)) * np.exp(-t / 0.006)
    add(DRUM, s, at, pan=-0.25, gain=0.07 * g)

def pluck(m, at, g=1.0, pan=0.0):
    n = T(0.9); t = np.arange(n) / SR; f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * np.exp(-t / 0.22)
    s *= np.minimum(1, t / 0.003)
    add(ARP, lp(s, 5200), at, pan=pan, gain=0.05 * g)

def bell(f0, at, g=1.0, pan=0.0, dec=2.2):
    n = T(dec * 1.6); t = np.arange(n) / SR
    s = np.zeros(n)
    for r_, a_, d_ in [(1, 1, 1), (2.76, 0.5, 0.6), (5.40, 0.28, 0.35), (8.93, 0.14, 0.2), (2.0, 0.3, 0.8)]:
        s += a_ * np.sin(2 * np.pi * f0 * r_ * t) * np.exp(-t / (dec * d_ / 3))
    s *= np.minimum(1, t / 0.002)
    add(FX, s, at, pan=pan, gain=0.06 * g)

# ---------------- sound design ----------------
def whoosh(at, dur, f0=250, f1=4000, g=1.0, pan0=-0.6, pan1=0.6, peak=0.6):
    n = T(dur); t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    # sweep a band through the noise in short blocks
    out = np.zeros(n); blk = 512
    zi = None
    for i in range(0, n, blk):
        u = i / n; fc = f0 * (f1 / f0) ** u
        sos = butter(2, [max(40, fc * 0.6), min(SR / 2 - 100, fc * 1.6)], 'band', fs=SR, output='sos')
        out[i:i + blk] = sosfilt(sos, noise[i:i + blk])
    e = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.4)
    out *= e
    pans = np.linspace(pan0, pan1, n)
    st = np.stack([out * np.cos((pans + 1) * np.pi / 4), out * np.sin((pans + 1) * np.pi / 4)], 1) * 1.414
    add(FX, st, at, gain=0.34 * g)

def sub_hit(at, g=1.0, f0=110, f1=34, dec=1.3):
    n = T(dec * 1.5); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dec / 3))
    s += 0.5 * lp(rng.standard_normal(n), 900) * np.exp(-t / 0.03)
    add(FX, s, at, gain=0.5 * g)

def shing(at, g=1.0):
    n = T(2.2); t = np.arange(n) / SR
    s = np.zeros(n)
    for f, a, d in [(2093, 1, 0.9), (3136, 0.7, 0.7), (4186, 0.55, 0.55), (5274, 0.4, 0.45), (6645, 0.3, 0.35), (2349, 0.5, 1.1)]:
        s += a * np.sin(2 * np.pi * f * (1 + rng.uniform(-0.003, 0.003)) * t) * np.exp(-t / d)
    s += 0.6 * hp(rng.standard_normal(n), 7000) * np.exp(-t / 0.05)
    s *= np.minimum(1, t / 0.004)
    add(FX, s, at, pan=0.3, gain=0.06 * g)

def riser(at_end, dur, g=1.0, f0=300, f1=6000):
    n = T(dur); u = np.linspace(0, 1, n)
    noise = rng.standard_normal(n); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        fc = f0 * (f1 / f0) ** (i / n)
        sos = butter(2, [fc * 0.7, min(SR / 2 - 100, fc * 1.4)], 'band', fs=SR, output='sos')
        out[i:i + blk] = sosfilt(sos, noise[i:i + blk])
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2)) / SR) * 0.25
    s = (out + tone) * u ** 2.5
    add(FX, s, at_end - dur, gain=0.2 * g)

def reverse_swell(notes, at_end, dur, g=1.0):
    n = T(dur)
    sig = np.zeros((n, 2))
    for m in notes: sig += pad_voice(midi(m + 12), n, bright=1.4)
    sig = verb(lp(sig, 4000), 0.8)
    sig = sig[::-1] * (np.linspace(0, 1, n) ** 3)[:, None]
    add(FX, sig, at_end - dur, gain=0.07 * g)

# ---------------- buses ----------------
PAD, BASS, DRUM, ARP, FX, PROD = bus(), bus(), bus(), bus(), bus(), bus()
DUCK = np.ones(N)

# ---------------- score ----------------
D9 = [38, 50, 54, 57, 61, 64]; Bm9 = [35, 47, 50, 54, 57, 61]; A7s = [33, 45, 50, 52, 55]
G9 = [31, 43, 47, 50, 54, 57]; Em9 = [40, 52, 55, 59, 62, 66]; Fsm7 = [42, 54, 57, 61, 64]
A13s = [33, 45, 50, 52, 55, 59, 66]; Dsus = [38, 45, 52, 57]

chord(Dsus, 0.0, 3.75, cutoff=900, gain=0.05, a=0.05, r=0.25)          # hook: dark suspended drone
chord(D9, 3.75, 2.5, cutoff=2200, a=0.02)                              # the drop
chord(Bm9, 6.25, 1.875, cutoff=2400)
chord(A7s, 8.125, 1.25, cutoff=700, gain=0.045, a=0.1, r=0.2)            # dive: filter closes
chord(G9, 9.375, 1.875, cutoff=3000, a=0.01)                           # AquaLock ignite
chord(Em9, 11.25, 1.875, cutoff=2600)
chord(D9, 13.125, 1.875, cutoff=2400, a=0.05)
chord(Fsm7, 15.0, 1.875, cutoff=3200, a=0.05)                          # the transform lifts
chord(G9, 16.875, 1.875, cutoff=2600)
chord(A13s, 18.75, 1.25, cutoff=2800)
chord(D9, 20.0, 4.0, cutoff=2600, gain=0.065, a=0.05, r=2.6)           # resolve home on the logo

# hook: ticking clock in 1/8ths builds tension, ends on the cut
for i in range(12):
    at = i * BEAT / 2
    if at < 3.7: tick(at, 0.6 + 0.4 * i / 12)

# groove (kick on beats, shaker off-beats) with breaks around the dive and the transform
def groove(a, b, shaker_on=True):
    k = a
    while k < b - 1e-6:
        kick(k)
        if shaker_on: shaker(k + BEAT / 2)
        k += BEAT
groove(3.75, 8.125, shaker_on=False)
groove(9.375, 15.0)
groove(15.625, 20.0)

# arpeggio — chord tones up an octave, 1/8 notes, ping-pong
def arp(notes, a, b, g=1.0):
    seq = [notes[i % (len(notes) - 1) + 1] + 12 for i in [0, 2, 1, 3, 2, 4, 1, 3]]
    k, i = a, 0
    while k < b - 1e-6:
        pluck(seq[i % len(seq)], k, g, pan=-0.45 if i % 2 == 0 else 0.45); k += BEAT / 2; i += 1
arp(Bm9, 6.25, 8.125, 0.8); arp(G9, 9.375, 11.25); arp(Em9, 11.25, 13.125)
arp(D9, 13.125, 15.0); arp(Fsm7, 15.0, 16.875, 1.1); arp(G9, 16.875, 18.75, 0.8); arp(A13s, 18.75, 20.0, 0.7)

# ---------------- sound design on picture ----------------
sub_hit(0.0, 0.7); whoosh(0.0, 0.7, 200, 2500, 0.8, peak=0.15)          # cold open
whoosh(1.10, 0.55, 600, 5000, 0.9, -0.5, 0.5, peak=0.55)                 # the flip
shing(1.92, 1.0)                                                          # steel catches the light
shing(2.62, 0.55)
riser(3.75, 1.2, 0.8)                                                     # into the drop
sub_hit(3.75, 1.0)
whoosh(8.05, 1.25, 4000, 120, 1.1, 0.3, -0.3, peak=0.35)                  # dive (falling sweep)
reverse_swell(G9[1:], 9.375, 1.2, 1.0)
sub_hit(9.375, 1.2, 140, 30, 1.8)                                         # AquaLock ignite
bell(midi(81), 9.40, 1.0, -0.2); bell(midi(88), 9.52, 0.6, 0.3)         # glass chime A5 + E6
bell(midi(86), 10.38, 0.35, 0.4); bell(midi(90), 10.80, 0.30, -0.4)      # bullets
whoosh(12.95, 0.5, 300, 6000, 1.0, -0.7, 0.7, peak=0.6)                   # whip up
riser(15.05, 0.9, 0.55, 800, 9000)                                        # transform sweep
whoosh(15.05, 0.8, 1500, 9000, 0.6, -0.8, 0.8, peak=0.5)
shing(15.80, 0.7)
whoosh(16.85, 1.4, 120, 900, 0.5, 0.2, -0.2, peak=0.3)                    # air release into the room
whoosh(19.80, 0.55, 400, 6000, 0.7, -0.6, 0.6, peak=0.7)                  # veil wipe
sub_hit(20.0, 0.6, 90, 32, 2.0)
bell(midi(86), 20.40, 0.9, 0.0, 3.0); bell(midi(93), 20.55, 0.45, 0.25, 3.0)   # logo resolve D6 + A6

# ---------------- production audio (re-timed through the picture remap) ----------------
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
src = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
segs = json.loads(subprocess.run(['node', '-e', "const e=require('./edit.js');console.log(JSON.stringify(e.SEGMENTS))"], capture_output=True, text=True, cwd=sys.path[0] or '.').stdout)
prod_gain = {'S1': 0.9, 'S2': 0.9, 'S3': 0.8, 'S4': 1.1, 'S5': 1.0, 'S6': 0.9, 'S7': 0.8, 'S8': 0.9, 'S9': 0.6, 'S11': 0.7}
for s in segs:
    if 'remap' not in s or s['id'] not in prod_gain: continue
    a, b = T(s['in']), T(s['out'])
    rec_t = np.arange(a, b) / SR
    ks = np.array(s['remap'])
    src_t = np.interp(rec_t, ks[:, 0], ks[:, 1])
    idx = np.clip(src_t * SR, 0, len(src) - 2)
    i0 = idx.astype(int); fr = (idx - i0)[:, None]
    seg = src[i0] * (1 - fr) + src[i0 + 1] * fr
    fade = np.ones(len(seg)); m = min(T(0.012), len(seg) // 2)
    fade[:m] = np.linspace(0, 1, m); fade[-m:] = np.linspace(1, 0, m)
    PROD[a:b] += seg * fade[:, None] * prod_gain[s['id']]

# ---------------- mix ----------------
music = (verb(PAD, 0.35) * DUCK[:, None] + lp(BASS, 400) * DUCK[:, None] * 0.9 + DRUM + verb(ARP, 0.4))
fx = verb(FX, 0.22)
prod = hp(PROD, 60) * 2.2
# end fade
fade = np.ones(N); fade[T(22.4):] = np.linspace(1, 0, N - T(22.4)) ** 1.6
for name, x in [('music', music), ('sfx', fx), ('production', prod)]:
    np.save(f'{OUT}_{name}.npy', (x * fade[:, None] * 0.6).astype(np.float32))
mix = (music * 0.48 + fx * 0.8 + prod * 2.1) * fade[:, None]
mix = np.tanh(mix * 1.2) / 1.2      # gentle soft-clip glue
def wav(path, x):
    x = np.clip(x, -1, 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', path],
                   input=x.astype(np.float32).tobytes(), check=True)
wav(f'{OUT}_mix_raw.wav', mix)
for name in ['music', 'sfx', 'production']:
    wav(f'{OUT}_stem_{name}.wav', np.load(f'{OUT}_{name}.npy'))
print('ok')
