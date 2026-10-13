// Round-trip: seed a faucet listing with 2 variants → export .xlsx → re-import → nothing changes.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const SP = process.argv[2];
const X = require(SP + '/xjs/package/dist/xlsx.bundle.js');
const url = 'file://' + new URL('./harness.html', import.meta.url).pathname;
let fails = 0;
const check = (name, cond, extra) => { if (cond) console.log('PASS', name); else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };

const now = new Date(2026, 9, 13, 8, 19).getTime();
const listing = {
  id: 'L_rt1', name: 'AquaLock SS304 Single Lever 1234t Chrome', nameCustom: false, brand: 'Tapsa', category: 'faucet', createdAt: new Date(2026, 9, 1, 9, 5).getTime(), updatedAt: now,
  fields: {
    sku: 'T-SSM-AQL-CHR-FAD-48X4-PC-1', listingStatus: 'Active', mrp: '29999', sp: '5999', minoq: '1', fulfilledBy: 'Seller', procType: 'instock', procSla: '2', stock: '25', shipProvider: 'Flipkart',
    length: '30', breadth: '20', height: '12.5', weight: '1.25', hsn: '73249000', luxuryCess: '0', taxCode: 'GST_18', coo: 'India', manufacturer: 'preset_pp', packer: 'preset_pp',
    modelNumber: 'AquaLock SS304 Single Lever 1234t Chrome', brandColor: ['Chrome', 'Silver'], type: ['Basin Mixer', 'Pillar Tap'], installationType: ['Deck Mount Installation Type'],
    faucetControl: ['Single Lever Mixer'], material: ['Stainless Steel (SS 304)'], itemsIncluded: ['1 Basin Mixer', '2 Connection Hoses'], faucetCategory: 'Faucet (Single Unit)',
    color: ['Silver'], suitableFor: ['Bathroom', 'Wash Basin'], numHandles: '1', description: 'Line one of the description.\nLine two with a Chrome finish.', searchKeywords: ['basin mixer', 'ss304 tap'],
    finish: ['Chrome'], series: 'AquaLock', parentBrand: 'TAPSA', netQuantity: '1', packOf: '1', eanUpc: '0890123456789', maxTemp: '338.15', flowRate: '6.5', holeDiameter: '3.5', width: '5',
    productWeight: '850', otherDimensions: ['Spout reach 12 cm'], certification: ['ISI'], otherFeatures: ['Ceramic disc cartridge'], domesticWarranty: { n: '5', unit: 'Year' },
    warrantySummary: '5 Year warranty covering Cartridge.', warrantyServiceType: 'Manufacturer', coveredInWarranty: 'Cartridge', notCoveredInWarranty: 'Physical damage', boxHeight: '15'
  },
  images: [0, 1, 2, 3, 4].map((i) => ({ id: 'sl_' + i, imgId: null, note: i === 0 ? 'Front, white background' : '', w: null, h: null, name: '' })), imageSlots: 5,
  keywordBank: null, seoVersions: {}, tokens: [{ id: 'tk_fin', name: 'Finish', forms: ['Chrome', 'CHR'] }, { id: 'tk_size', name: 'Size', forms: [] }],
  variants: [
    { id: 'v_gold', tokenValues: { tk_fin: ['Gold', 'GLD'] }, axis: { brandColor: ['Gold'], material: ['Stainless Steel (SS 304)'] }, excluded: [], overrides: { mrp: '31999', sp: '6499' }, disabled: false, images: null, createdAt: now },
    { id: 'v_black', tokenValues: { tk_fin: ['Matte Black', 'MBK'] }, axis: { brandColor: ['Black'], material: ['Brass'] }, excluded: [], overrides: { stock: '7', eanUpc: '0890123456796' }, disabled: false, images: null, createdAt: now }
  ],
  skuSegments: [], dismissed: [], titleCase: 'typed', ui: { dimUnit: 'cm', wtUnit: 'kg' }, research: { answer: '', paste: '' }
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', (r) => r.fulfill({ path: SP + '/xjs/package/dist/xlsx.bundle.js', contentType: 'application/javascript' }));
await page.goto(url);
await page.evaluate((l) => {
  localStorage.clear();
  localStorage.setItem('fls:l:' + l.id, JSON.stringify(l));
  localStorage.setItem('fls:index', JSON.stringify({ [l.id]: { name: l.name, brand: l.brand, category: l.category, variantCount: 2, completion: 100, createdAt: l.createdAt, updatedAt: l.updatedAt, modelNumber: l.fields.modelNumber, sku: l.fields.sku } }));
  localStorage.setItem('fls:last', l.id);
}, listing);
await page.reload(); await page.waitForTimeout(800);
const snap = () => page.evaluate(() => localStorage.getItem('fls:l:L_rt1'));
const before = await snap();
check('seeded listing opened', (await page.locator('.stepper').textContent()).includes('2 variants'));

// export current listing
const exportFile = async (path, scopeLabel) => {
  await page.click('button:has-text("Excel")');
  if (scopeLabel) await page.click('label.check:has-text("' + scopeLabel + '")');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export .xlsx")')]);
  await dl.saveAs(path);
  await page.keyboard.press('Escape');
  return dl.suggestedFilename();
};
const fname = await exportFile(SP + '/rt1.xlsx');
check('file name pattern', /^Tapsa_Faucet_AquaLock-SS304-Single-Lever-1234t-Chrome_\d{4}-\d{2}-\d{2}\.xlsx$/.test(fname), fname);

// inspect the workbook
const wb = X.read(readFileSync(SP + '/rt1.xlsx'), { type: 'buffer', cellStyles: true });
check('one sheet named Listings', JSON.stringify(wb.SheetNames) === '["Listings"]', wb.SheetNames);
const ws = wb.Sheets.Listings;
const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const hdr = aoa[0];
check('fixed columns first', JSON.stringify(hdr.slice(0, 7)) === JSON.stringify(['Listing ID', 'Row Type', 'Parent ID', 'Brand', 'Category', 'Created', 'Last Updated']), hdr.slice(0, 7));
check('price group then PD then AD then warranty', hdr[7] === 'Seller SKU ID' && hdr.indexOf('Length (CM)') < hdr.indexOf('Model Number') && hdr.indexOf('Model Number') < hdr.indexOf('Color') && hdr.indexOf('Box Dimensions: Height (CM)') < hdr.indexOf('Domestic Warranty') && hdr[hdr.length - 1] === 'Not Covered in Warranty', hdr);
check('unit headers', ['MRP (INR)', 'Length (CM)', 'Weight (KG)', 'Luxury Cess (%)', 'Weight (G)', 'Flow Rate (L/MIN)', 'Maximum Water Inlet Temperature (K)'].every((x) => hdr.includes(x)), hdr.filter((x) => /\(/.test(String(x))));
check('3 rows: master + 2 variants', aoa.length === 4 && aoa[1][1] === 'Master' && aoa[2][1] === 'Variant' && aoa[3][1] === 'Variant' && aoa[2][2] === 'L_rt1', aoa.map((r) => r.slice(0, 3)));
const col = (n) => hdr.indexOf(n);
const cellAt = (r, n) => ws[X.utils.encode_cell({ r, c: col(n) })];
check('SKU is text', cellAt(1, 'Seller SKU ID').t === 's' && cellAt(1, 'Seller SKU ID').z === '@', cellAt(1, 'Seller SKU ID'));
check('EAN keeps leading zero as text', cellAt(1, 'EAN/UPC').t === 's' && cellAt(1, 'EAN/UPC').v === '0890123456789', cellAt(1, 'EAN/UPC'));
check('HSN is code only, text', cellAt(1, 'HSN').v === '73249000' && cellAt(1, 'HSN').t === 's', cellAt(1, 'HSN'));
check('numbers stay numbers', cellAt(1, 'MRP (INR)').t === 'n' && cellAt(1, 'MRP (INR)').v === 29999 && cellAt(1, 'Height (CM)').v === 12.5 && cellAt(1, 'Stock').t === 'n', [cellAt(1, 'MRP (INR)'), cellAt(1, 'Height (CM)')]);
check('dates formatted', cellAt(1, 'Created').v === '01 Oct 2026, 09:05 AM'.replace(/^0/, '') && cellAt(1, 'Last Updated').v === '13 Oct 2026, 08:19 AM', [cellAt(1, 'Created').v, cellAt(1, 'Last Updated').v]);
check('Fkt-M joined with comma+space', cellAt(1, 'Brand Color').v === 'Chrome, Silver' && cellAt(1, 'Items Included').v === '1 Basin Mixer, 2 Connection Hoses');
check('preset exported as text', /^PP INTERNATIONAL, Samaypur Badli/.test(cellAt(1, 'Manufacturer Details').v));
check('variant token replacement in cells', cellAt(2, 'Seller SKU ID').v === 'T-SSM-AQL-GLD-FAD-48X4-PC-1' && cellAt(3, 'Model Number').v === 'AquaLock SS304 Single Lever 1234t Matte Black' && cellAt(3, 'Stock').v === 7, [cellAt(2, 'Seller SKU ID').v, cellAt(3, 'Model Number').v]);
// styling + freeze, straight from the zip XML
const zip = X.CFB.read(readFileSync(SP + '/rt1.xlsx'), { type: 'buffer' });
const xmlOf = (re) => Buffer.from(zip.FileIndex[zip.FullPaths.findIndex((p) => re.test(p))].content).toString();
const sheetXml = xmlOf(/worksheets\/sheet1\.xml$/), stylesXml = xmlOf(/styles\.xml$/);
check('header row frozen', /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/.test(sheetXml));
check('bold header font + section fills', /<b\/>/.test(stylesXml) && ['D5DDE1', 'D6E4FF', 'D3ECE9', 'FCEBCB', 'E6DCF7'].every((c) => stylesXml.includes(c)));
check('column widths set', /<col min="1" max="1" width=/.test(sheetXml));

// re-import the same file: nothing should change
const importFile = async (path) => {
  await page.click('button:has-text("Excel")');
  await page.setInputFiles('.modal input[type=file][accept=".xlsx"]', path);
  await page.waitForSelector('[data-xl-summary]', { timeout: 8000 });
  return (await page.locator('[data-xl-summary]').textContent()).replace(/\s+/g, ' ');
};
const sum1 = await importFile(SP + '/rt1.xlsx');
check('preview: 1 unchanged, 0 errors', sum1.includes('0 new') && sum1.includes('0 updated') && sum1.includes('1 unchanged') && sum1.includes('0 row errors'), sum1);
check('variant rows show no changes', (await page.locator('.imp-sec .tag:has-text("No changes")').count()) === 3);
await page.click('button:has-text("Apply import")');
await page.waitForSelector('[data-xl-result]');
check('apply result', (await page.locator('[data-xl-result]').textContent()).includes('0 created, 0 updated, 1 unchanged'));
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const after = await snap();
check('stored listing byte-identical after round trip', before === after, { before: before.length, after: after && after.length });

// save as new → export the copy → every attribute cell matches the original export
await importFile(SP + '/rt1.xlsx');
await page.click('.imp-sec .seg button:has-text("Save as new")');
await page.click('button:has-text("Apply import")');
await page.waitForSelector('[data-xl-result]');
await page.keyboard.press('Escape');
const newId = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('fls:index'))).find((k) => k !== 'L_rt1'));
check('copy created', !!newId, newId);
check('original still unchanged', (await snap()) === before);
await page.click('button:has-text("Excel")');
await page.click('label.check:has-text("Selected saved listings")');
await page.locator('.modal label.check').filter({ hasText: 'variants' }).first().waitFor();
const rows = page.locator('.modal .stack label.check').filter({ hasText: '2 variants' });
const n = await rows.count();
for (let i = 0; i < n; i++) { const t = await rows.nth(i).textContent(); if (!t.includes('Open now')) { /* both have same name; pick by order below */ } }
// select only the copy: it is the most recently updated, so it is listed first
await rows.first().locator('input').check();
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export .xlsx")')]);
await dl2.saveAs(SP + '/rt2.xlsx');
await page.keyboard.press('Escape');
const aoa2 = X.utils.sheet_to_json(X.read(readFileSync(SP + '/rt2.xlsx'), { type: 'buffer' }).Sheets.Listings, { header: 1, raw: true, defval: null });
const strip = (a) => a.map((r) => r.filter((_, i) => ![0, 2, 5, 6].includes(i)));
check('copy export has same headers', JSON.stringify(aoa2[0]) === JSON.stringify(hdr));
check('copy export: every attribute cell identical (types too)', JSON.stringify(strip(aoa2)) === JSON.stringify(strip(aoa)), { a: strip(aoa)[2], b: strip(aoa2)[2] });
check('copy keeps master/variant structure', aoa2[2][2] === aoa2[1][0] && aoa2[3][2] === aoa2[1][0]);

// hand-edited sheet: change a value, use different case, add a fresh row without Listing ID
const ws3 = X.read(readFileSync(SP + '/rt1.xlsx'), { type: 'buffer' }).Sheets.Listings;
const set = (r, n, v) => { ws3[X.utils.encode_cell({ r, c: col(n) })] = typeof v === 'number' ? { t: 'n', v } : { t: 's', v }; };
set(1, 'Stock', 30); set(1, 'Type', 'basin mixer, Bogus Type'); set(1, 'Faucet Category', 'faucet set');
const r4 = 4;
set(r4, 'Row Type', 'Master'); set(r4, 'Brand', 'Hybath'); set(r4, 'Category', 'faucet'); set(r4, 'Model Number', 'HB New Tap'); set(r4, 'Installation Type', 'wall mount installation type, Deck Mount Installation Type');
ws3['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r4, c: hdr.length - 1 } });
const wb3 = X.utils.book_new(); X.utils.book_append_sheet(wb3, ws3, 'Listings'); X.writeFile(wb3, SP + '/rt3.xlsx');
const sum3 = await importFile(SP + '/rt3.xlsx');
check('hand-edited: 1 new + 1 updated', sum3.includes('1 new') && sum3.includes('1 updated'), sum3);
const body = (await page.locator('.modal').textContent()).replace(/\s+/g, ' ');
check('diff lists Stock 25 → 30', /Stock\s*25\s*30/.test(body));
check('case-insensitive option mapping', /Faucet Category\s*Faucet \(Single Unit\)\s*Faucet Set/.test(body) && !body.includes('Unknown option “faucet set”'));
check('unknown option reported', body.includes('Unknown option “Bogus Type”'));
check('installation count reported', body.includes('Installation Type: 2 values; exactly one is required'));
check('missing mandatory reported', body.includes('Mandatory field is empty'));
check('match by Listing ID shown', body.includes('Matched by Listing ID'));
// match by SKU when the ID is blank
const ws4 = X.read(readFileSync(SP + '/rt1.xlsx'), { type: 'buffer' }).Sheets.Listings;
ws4[X.utils.encode_cell({ r: 1, c: 0 })] = { t: 's', v: '' };
const wb4 = X.utils.book_new(); X.utils.book_append_sheet(wb4, ws4, 'Listings'); X.writeFile(wb4, SP + '/rt4.xlsx');
await page.keyboard.press('Escape');
await importFile(SP + '/rt4.xlsx');
check('match by Seller SKU ID when Listing ID is blank', (await page.locator('.modal').textContent()).includes('Matched by Seller SKU ID'));
await page.screenshot({ path: SP + '/shots/30-import.png', fullPage: false });
check('no page errors', errors.length === 0, errors);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
await browser.close();
