// Build: inline CSS + JS into one artifact page (no doctype/html/head/body — the publisher wraps it).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(here, 'src', f), 'utf8');
const order = ['logic.js', 'defaults.js', 'ui.js', 'store.js', 'model.js', 'fields.js', 'app.js', 'tab-basic.js', 'tab-lab.js', 'tab-ai.js', 'tab-variants.js', 'catbuilder.js', 'excel.js'];
const js = order.map((f) => '/* ---- ' + f + ' ---- */\n' + src(f).replace(/^if \(typeof module.*$/m, '')).join('\n');
const page = src('page.html').replace('/*__CSS__*/', () => src('styles.css')).replace('/*__JS__*/', () => js);
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'flipkart-listing-studio.html'), page);
// local test harness with the same skeleton the publisher adds
const skeleton = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
writeFileSync(join(here, 'test', 'harness.html'), skeleton + page + '</body></html>');
console.log('built', (page.length / 1024).toFixed(1) + ' KB');
