// Renders the compositor timeline frame-by-frame with headless Chromium.
// usage: node render.mjs <wide|square> [--stills t1,t2,...] [--out file.mp4]
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const fmt = process.argv[2] || 'wide';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const stills = arg('--stills');
const out = arg('--out') || path.join(here, `../build/video_${fmt}.mp4`);
const W = fmt === 'square' ? 1080 : 1920, H = 1080, FPS = 30, DUR = 24.0;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files', '--disable-web-security'] }).catch(() => chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] }));
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto('file://' + path.join(here, `compositor.html?fmt=${fmt}`));
await page.evaluate(() => window.ready);

const shot = async (t) => {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
};

if (stills) {
  const dir = path.join(here, `../build/stills_${fmt}`); mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',')) {
    const buf = await shot(parseFloat(s));
    writeFileSync(path.join(dir, `t_${parseFloat(s).toFixed(2)}.png`), buf);
  }
  console.log('stills ->', dir);
} else {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(DUR * FPS);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`${fmt} frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video ->', out);
}
await browser.close();
