// Renders the compositor timeline frame-by-frame with headless Chromium.
// usage: node render.mjs <wide|square> [--fps 24] [--sfps 24 --sframes 601] [--stills t1,t2,...] [--out file] [--alpha]
//   --fps      output frame rate (default 24)
//   --sfps     source frame rate of build/src/f_*.jpg, --sframes their count (default: build/src/meta.json, else 30 / 752)
//   --alpha    graphics-only pass: picture plates hidden, transparent background, ProRes 4444 + alpha (.mov)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const fmt = process.argv[2] || 'wide';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ALPHA = process.argv.includes('--alpha');
const meta = existsSync(path.join(here, '../build/src/meta.json')) ? JSON.parse(readFileSync(path.join(here, '../build/src/meta.json'), 'utf8')) : {};
const SFPS = parseFloat(arg('--sfps') || meta.fps || 30), SFRAMES = parseInt(arg('--sframes') || meta.frames || 752, 10);
const FPS = parseFloat(arg('--fps') || 24), DUR = 24.0;
const stills = arg('--stills');
const out = arg('--out') || path.join(here, `../build/${ALPHA ? 'overlay' : 'video'}_${fmt}.${ALPHA ? 'mov' : 'mp4'}`);
const W = fmt === 'square' ? 1080 : 1920, H = 1080;

const launchArgs = ['--allow-file-access-from-files', '--disable-web-security'];
const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: launchArgs });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
const url = pathToFileURL(path.join(here, 'compositor.html'));
url.search = new URLSearchParams({ fmt, sfps: SFPS, sframes: SFRAMES, alpha: ALPHA ? '1' : '0' }).toString();
await page.goto(url.href);
await page.evaluate(() => window.ready);
console.log(`${fmt}: out ${FPS} fps, source ${SFPS} fps / ${SFRAMES} frames${ALPHA ? ', alpha' : ''}`);

const shot = async (t) => {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H }, omitBackground: ALPHA });
};

if (stills) {
  const dir = path.join(here, `../build/stills_${fmt}${ALPHA ? '_alpha' : ''}`); mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',')) {
    const buf = await shot(parseFloat(s));
    writeFileSync(path.join(dir, `t_${parseFloat(s).toFixed(2)}.png`), buf);
  }
  console.log('stills ->', dir);
} else {
  const enc = ALPHA
    ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0']
    : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p'];
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...enc, out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(DUR * FPS);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 48 === 0) console.log(`${fmt} frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video ->', out);
}
await browser.close();
