// Smoke test: load the built page, exercise every tab and the main flows, collect errors.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const gRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(gRoot + '/playwright');
const url = 'file://' + new URL('./harness.html', import.meta.url).pathname;
const shots = process.argv[2] || '/tmp';
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errors.push('console: ' + m.text()); });
page.setDefaultTimeout(5000);
const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push('STEP ' + name + ': ' + e.message.split('\n').slice(0, 3).join(' | ')); } };
await page.goto(url);
await page.waitForTimeout(600);
const tab = (id) => page.click('#tab_' + id);

await step('pd fill', async () => {
  await tab('pd');
  await page.fill('#f_modelNumber', 'aqualock ss304 1234t');
  await page.click('.field[data-key="type"] .ms-box');
  await page.click('.ms-pop .ms-opt:has-text("Basin Mixer")');
  await page.click('.ms-pop .ms-opt:has-text("Pillar Tap")');
  await page.click('.ms-pop .ms-opt:has-text("Kitchen Mixer")');
  await page.click('.ms-pop button:has-text("Done")');
  await page.click('.field[data-key="installationType"] .ms-box');
  await page.click('.ms-pop .ms-opt:has-text("Deck Mount Installation Type")');
  await page.keyboard.press('Escape');
  await page.click('.field[data-key="material"] .ms-box');
  await page.locator('.ms-pop .ms-opt').filter({ hasText: /^Brass$/ }).click();
  await page.keyboard.press('Escape');
  await page.fill('.field[data-key="brandColor"] .fktm-add input', 'Chrome');
  await page.keyboard.press('Enter');
  await page.fill('.field[data-key="brandColor"] .fktm-add input', 'Silver, chrome, Gold');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
});
await step('ad fill', async () => {
  await tab('ad');
  await page.fill('#f_description', 'Premium SS304 stainless steel basin mixer with ceramic cartridge.');
  await page.fill('#f_series', 'AquaLock');
  await page.waitForTimeout(150);
});
await step('price fill', async () => {
  await tab('price');
  await page.fill('#f_sp', '5999');
  await page.waitForTimeout(150);
  await page.click('button.price-chip:not(.bench)');
  await page.fill('#f_length', '40');
  await page.fill('#f_breadth', '30');
  await page.fill('#f_height', '20');
  await page.fill('#f_weight', '1.1');
  await page.click('button:has-text("SKU builder")');
  await page.waitForTimeout(100);
});
await page.screenshot({ path: shots + '/01-price.png', fullPage: false });
await step('images', async () => { await tab('images'); await page.waitForTimeout(100); });
await page.screenshot({ path: shots + '/02-images.png' });
await step('lab', async () => {
  await tab('lab');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Build from rules")');
  await page.waitForTimeout(200);
});
await page.screenshot({ path: shots + '/03-lab.png', fullPage: true });
await step('ai tab', async () => {
  await tab('ai');
  await page.waitForTimeout(200);
  await page.fill('.imp-sec textarea, textarea[aria-label="Paste AI answer"]', '## A. Model\n**Model Number:** AquaLock SS304 Deck Basin Tap\n**Type:** Basin Mixer, Pillar Tap\n## C. Product Description\nNew description text.\n## D. Search Keywords\nbasin tap, steel tap');
  await page.click('button:has-text("Parse sections")');
  await page.waitForTimeout(150);
  await page.click('.imp-sec button:has-text("Apply to field") >> nth=0');
});
await page.screenshot({ path: shots + '/04-ai.png', fullPage: true });
await step('variants', async () => {
  await tab('variants');
  await page.waitForTimeout(150);
  await page.fill('input[aria-label="Add form for Finish"]', 'Chrome');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  // axis: brand color text + material multi
  const axisInputs = page.locator('.sec:has-text("Create a variant") input.inp.sm');
  await axisInputs.first().fill('Gold');
  await page.click('.sec:has-text("Create a variant") .ms-box');
  await page.locator('.ms-pop .ms-opt').filter({ hasText: /^Brass$/ }).click();
  await page.keyboard.press('Escape');
  await page.fill('input[aria-label="New value for Chrome"]', 'Gold');
  await page.click('button:has-text("Preview changes")');
  await page.waitForTimeout(150);
  await page.click('button:has-text("Create variant")');
  await page.waitForTimeout(200);
});
await page.screenshot({ path: shots + '/05-variants.png', fullPage: true });
await step('variant editor', async () => {
  await page.click('table.vt button[title="Open in full editor"]');
  await page.waitForTimeout(200);
  await tab('pd');
  await page.waitForTimeout(150);
});
await page.screenshot({ path: shots + '/06-variant-pd.png' });
await step('back + saved drawer', async () => {
  await page.click('button:has-text("Back to master")');
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(400);
  await page.click('button:has-text("Saved Listings")');
  await page.waitForTimeout(200);
});
await page.screenshot({ path: shots + '/07-saved.png' });
await step('category builder', async () => {
  await page.keyboard.press('Escape');
  await page.click('button[title="Category Builder"]');
  await page.waitForTimeout(200);
});
await page.screenshot({ path: shots + '/08-catbuilder.png' });
await step('switch categories', async () => {
  await page.keyboard.press('Escape');
  await page.selectOption('#catSel', 'drain');
  await tab('pd'); await page.waitForTimeout(100);
  await tab('lab'); await page.waitForTimeout(100);
  await page.selectOption('#catSel', 'shower');
  await tab('pd'); await page.waitForTimeout(100);
  await tab('lab'); await page.waitForTimeout(100);
  await tab('variants'); await page.waitForTimeout(100);
  await tab('price'); await page.waitForTimeout(100);
});
const state = await page.evaluate(() => ({ note: document.querySelector('.store-note').textContent, title: document.querySelector('.pv-title') && document.querySelector('.pv-title').textContent, save: document.querySelector('.save-ind').textContent }));
console.log(JSON.stringify(state));
// dark + mobile
await page.emulateMedia({ colorScheme: 'dark' });
await page.selectOption('#catSel', 'faucet');
await tab('pd');
await page.waitForTimeout(150);
await page.screenshot({ path: shots + '/09-dark.png' });
await page.setViewportSize({ width: 390, height: 900 });
await page.emulateMedia({ colorScheme: 'light' });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile horizontal overflow px:', overflow);
await page.screenshot({ path: shots + '/10-mobile.png', fullPage: false });
await tab('lab'); await page.waitForTimeout(150);
const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile lab overflow px:', overflow2);
await page.screenshot({ path: shots + '/11-mobile-lab.png', fullPage: false });
// reload → persistence
await page.setViewportSize({ width: 1440, height: 1000 });
await page.reload(); await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ model: (document.querySelector('.pv-title') || {}).textContent, stepper: document.querySelector('.stepper').textContent }));
console.log('after reload:', JSON.stringify(after));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
await browser.close();
