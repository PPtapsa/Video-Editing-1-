/* ==========================================================================
   Excel import / export — one sheet "Listings", one row per listing / variant
   ========================================================================== */
const XL_FIXED = ['Listing ID', 'Row Type', 'Parent ID', 'Brand', 'Category', 'Created', 'Last Updated'];
const XL_GROUPS = [
  { id: 'fixed', name: 'Listing', fill: 'D5DDE1' },
  { id: 'price', name: 'Price, Stock and Shipping', fill: 'D6E4FF' },
  { id: 'pd', name: 'Product Description', fill: 'D3ECE9' },
  { id: 'ad', name: 'Additional Description', fill: 'FCEBCB' },
  { id: 'warranty', name: 'Warranty', fill: 'E6DCF7' }
];
const XL_NUM_TYPES = new Set(['number', 'money', 'mrp', 'sp', 'sla', 'dim', 'wt']);
const XL_TEXT_KEYS = new Set(['sku', 'eanUpc', 'eanUpcList', 'hsn']);
const XL_TYPE_UNIT = { dim: 'CM', wt: 'KG', mrp: 'INR', sp: 'INR', money: 'INR' };
const XL_UNIT_RE = /\s*\((?:in\s+)?(cm|mm|g|kg|k|l\/min|inch|%|year|month|inr)\)\s*$/i;

/* ---------- column model ---------- */
function xlHeaderBase(def) {
  const m = def.label.match(XL_UNIT_RE);
  const base = def.label.replace(XL_UNIT_RE, '').trim();
  const unit = XL_TYPE_UNIT[def.type] || (def.type !== 'warranty' && def.unit) || (m && m[1]) || '';
  return unit ? base + ' (' + unit.toUpperCase() + ')' : base;
}
// Flipkart order for one category: Price/Stock/Shipping → Product Description → Additional Description → Warranty
function xlCategoryColumns(c) {
  const out = [];
  const used = new Set();
  const push = (def, group) => {
    let header = xlHeaderBase(def);
    if (used.has(header.toLowerCase())) header = (def.section || 'Other') + ': ' + header;
    used.add(header.toLowerCase());
    out.push({ header, key: def.key, def, group });
  };
  for (const f of coreFields(c)) push(f, 'price');
  for (const f of pdFields(c)) push(f, 'pd');
  for (const f of adFields(c).filter((x) => x.section !== 'Warranty')) push(f, 'ad');
  if (!c.variantCols || c.variantCols.includes('supplierImage')) push(VARIANT_ONLY_FIELDS.supplierImage, 'ad');
  for (const f of adFields(c).filter((x) => x.section === 'Warranty')) push(f, 'warranty');
  return out;
}
function xlUnionColumns(cats) {
  const per = cats.map((c) => xlCategoryColumns(c));
  const cols = [];
  const seen = new Set();
  for (const g of ['price', 'pd', 'ad', 'warranty']) {
    for (const list of per) for (const col of list) {
      if (col.group !== g || seen.has(col.header.toLowerCase())) continue;
      seen.add(col.header.toLowerCase());
      cols.push({ header: col.header, group: g });
    }
  }
  return cols;
}
function xlHeaderMap(c) {
  const map = new Map();
  const alias = new Map();
  for (const col of xlCategoryColumns(c)) {
    map.set(col.header.toLowerCase(), col);
    const a = normLabel(col.header.replace(/^[^:]+:\s*/, ''));
    alias.set(a, alias.has(a) ? null : col);
    alias.set(normLabel(col.def.label), alias.has(normLabel(col.def.label)) && alias.get(normLabel(col.def.label)) !== col ? null : col);
  }
  return (header) => map.get(String(header).trim().toLowerCase()) || alias.get(normLabel(header)) || null;
}

/* ---------- values: listing → cell ---------- */
function xlCell(def, val) {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) { const s = val.map((x) => String(x).trim()).filter(Boolean).join(', '); return s ? { t: 's', v: s, z: XL_TEXT_KEYS.has(def.key) ? '@' : undefined } : null; }
  if (typeof val === 'object') { const s = displayValue(def, val); return s ? { t: 's', v: s } : null; }
  if (def.type === 'preset') { const s = displayValue(def, val); return s ? { t: 's', v: s } : null; }
  const s = String(val).trim();
  if (!s) return null;
  if (XL_TEXT_KEYS.has(def.key) || def.type === 'sku' || def.type === 'hsn') return { t: 's', v: s, z: '@' };
  if (XL_NUM_TYPES.has(def.type) && /^-?\d+(\.\d+)?$/.test(s)) return { t: 'n', v: Number(s) };
  return { t: 's', v: s };
}
// comparable form of a value, as it would sit in the sheet
function xlKey(def, val) {
  const c = xlCell(def, val);
  if (!c) return '';
  return c.t === 'n' ? 'n:' + c.v : 's:' + String(c.v).replace(/\r\n/g, '\n');
}

/* ---------- export ---------- */
async function xlListingsForScope(scope, ids) {
  await flushCurrent();
  if (scope === 'current') return [S.listing];
  const metas = scope === 'all' ? S.index.slice() : S.index.filter((m) => ids.has(m.id));
  metas.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const out = [];
  for (const m of metas) {
    if (m.id === S.listing.id) { out.push(S.listing); continue; }
    const d = await Store.loadListing(m.id);
    if (d) out.push(normalizeListing(d));
  }
  return out;
}
function xlFileName(listings) {
  const one = (arr) => (arr.length && arr.every((x) => x === arr[0]) ? arr[0] : 'Mixed');
  const brand = one(listings.map((l) => l.brand));
  const category = one(listings.map((l) => (getCat(l.category) || {}).name || l.category));
  const model = listings.length === 1 ? (listings[0].fields.modelNumber || 'Untitled') : listings.length + '-listings';
  const d = new Date();
  const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const clean = (s) => String(s).trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'NA';
  return [brand, category, model].map(clean).join('_') + '_' + date + '.xlsx';
}
function xlBuildWorkbook(X, listings) {
  const cats = [];
  for (const l of listings) { const c = getCat(l.category) || BUILTIN_CATEGORIES.faucet; if (!cats.includes(c)) cats.push(c); }
  const attrCols = xlUnionColumns(cats);
  const headers = XL_FIXED.concat(attrCols.map((c) => c.header));
  const groups = XL_FIXED.map(() => 'fixed').concat(attrCols.map((c) => c.group));
  const rows = [];
  for (const l of listings) {
    const c = getCat(l.category) || BUILTIN_CATEGORIES.faucet;
    const hm = xlHeaderMap(c);
    const line = (v) => {
      const g = getterFor(l, v);
      const fixed = [
        { t: 's', v: v ? v.id : l.id }, { t: 's', v: v ? 'Variant' : 'Master' }, v ? { t: 's', v: l.id } : null,
        { t: 's', v: l.brand }, { t: 's', v: c.name },
        { t: 's', v: Logic.fmtDateTime(v && v.createdAt ? v.createdAt : l.createdAt) }, { t: 's', v: Logic.fmtDateTime(l.updatedAt) }
      ];
      const attrs = attrCols.map((col) => { const m = hm(col.header); return m && m.header.toLowerCase() === col.header.toLowerCase() ? xlCell(m.def, g(m.key)) : null; });
      return fixed.concat(attrs);
    };
    rows.push(line(null));
    for (const v of l.variants) rows.push(line(v));
  }
  const ws = {};
  const enc = (r, c) => X.utils.encode_cell({ r, c });
  const border = { bottom: { style: 'thin', color: { rgb: '8FA1AB' } } };
  headers.forEach((hd, ci) => {
    const fill = XL_GROUPS.find((g) => g.id === groups[ci]).fill;
    ws[enc(0, ci)] = { t: 's', v: hd, s: { font: { bold: true, color: { rgb: '14202A' } }, fill: { patternType: 'solid', fgColor: { rgb: fill } }, alignment: { vertical: 'center' }, border } };
  });
  rows.forEach((row, ri) => row.forEach((cell, ci) => {
    if (!cell) return;
    const o = { t: cell.t, v: cell.v };
    if (cell.z) { o.z = cell.z; o.s = { numFmt: '@' }; }
    ws[enc(ri + 1, ci)] = o;
  }));
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, rows.length), c: headers.length - 1 } });
  ws['!cols'] = headers.map((hd, ci) => {
    let w = hd.length;
    for (const row of rows) { const cell = row[ci]; if (cell) w = Math.max(w, ...String(cell.v).split('\n').map((x) => x.length)); }
    return { wch: Math.min(60, Math.max(8, w + 2)) };
  });
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, 'Listings');
  const out = X.write(wb, { type: 'array', bookType: 'xlsx', bookSST: true });
  return { data: xlFreezeHeader(X, out), rows: rows.length, headers };
}
// SheetJS CE does not write frozen panes: add the pane to sheet1.xml inside the zip.
function xlFreezeHeader(X, out) {
  try {
    const zip = X.CFB.read(new Uint8Array(out), { type: 'array' });
    const i = zip.FullPaths.findIndex((p) => /xl\/worksheets\/sheet1\.xml$/.test(p));
    if (i < 0) return out;
    const entry = zip.FileIndex[i];
    const xml = new TextDecoder().decode(entry.content);
    const pane = '<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>';
    const next = xml.replace(/<sheetView workbookViewId="0"\s*\/>/, pane);
    if (next === xml) return out;
    entry.content = new TextEncoder().encode(next);
    entry.size = entry.content.length;
    return X.CFB.write(zip, { type: 'array', fileType: 'zip', compression: true });
  } catch (e) { return out; }
}
async function xlSave(filename, data) {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); toast('Saved ' + filename, 1800); return true; }
    catch (e) {
      if (e && e.code === 'declined') { toast('Download cancelled'); return false; }
      if (e && e.code === 'rate_limited') { toast('A save prompt is already open'); return false; }
      if (e && e.code !== 'unavailable' && e.code !== 'not_granted') { toast('The file could not be saved (' + (e.code || 'error') + ')', 2400); return false; }
    }
  }
  // outside the Claude viewer (a plain browser tab) a normal download link works
  const a = h('a', { href: URL.createObjectURL(blob), download: filename, style: { display: 'none' } });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('Downloading ' + filename, 1800);
  return true;
}
async function xlExport(scope, ids) {
  const listings = await xlListingsForScope(scope, ids);
  if (!listings.length) { toast('Pick at least one listing'); return; }
  let X;
  try { X = await loadXlsx(); } catch (e) { toast('The Excel library could not load. Check your connection and try again.', 2600); return; }
  const wb = xlBuildWorkbook(X, listings);
  await xlSave(xlFileName(listings), wb.data);
}

/* ---------- import: cell → value ---------- */
function xlNumText(v) { return typeof v === 'number' ? (Number.isInteger(v) ? v.toFixed(0) : String(v)) : String(v ?? '').trim(); }
function xlEmpty(def) { return def.type === 'fktm' || def.type === 'multi' ? [] : ''; }
function xlParse(def, raw, err) {
  const s = xlNumText(raw);
  if (s === '') return xlEmpty(def);
  switch (def.type) {
    case 'fktm': return Logic.dedupeCI(s.split(',').map((x) => x.trim()).filter(Boolean));
    case 'multi': {
      const vals = Logic.dedupeCI(s.split(',').map((x) => x.trim()).filter(Boolean));
      const out = [];
      for (const v of vals) {
        const hit = (def.options || []).find((o) => o.toLowerCase() === v.toLowerCase());
        if (hit) { if (!out.includes(hit)) out.push(hit); } else err('Unknown option “' + v + '” (not in Flipkart’s ' + def.label + ' list)');
      }
      return out;
    }
    case 'single': {
      const hit = (def.options || []).find((o) => o.toLowerCase() === s.toLowerCase());
      if (!hit) { err('Unknown option “' + s + '” (not in Flipkart’s ' + def.label + ' list)'); return undefined; }
      return hit;
    }
    case 'yesno':
      if (/^(y|yes|true|1)$/i.test(s)) return 'Yes';
      if (/^(n|no|false|0)$/i.test(s)) return 'No';
      err('Use Yes or No, not “' + s + '”'); return undefined;
    case 'warranty': {
      const m = s.match(/^(\d+(?:\.\d+)?)\s*(years?|yrs?|y|months?|mos?|m)?$/i);
      if (!m) { err('Warranty should look like “2 Year” or “18 Month”'); return undefined; }
      return { n: m[1], unit: m[2] && /^m/i.test(m[2]) ? 'Month' : 'Year' };
    }
    case 'hsn':
      if (!/^\d{4,8}$/.test(s)) { err('HSN should be a 4–8 digit code'); return undefined; }
      return s;
    case 'preset': {
      const norm = (x) => String(x || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const p = (S.settings.presets || []).find((x) => norm(x.text) === norm(s) || norm(x.label) === norm(s));
      return p ? p.id : 'new-preset:' + s;
    }
    default:
      if (XL_NUM_TYPES.has(def.type) && !/^-?\d+(\.\d+)?$/.test(s)) { err('Expected a number, got “' + s + '”'); return s; }
      return s;
  }
}
function xlShow(def, val) {
  if (typeof val === 'string' && val.startsWith('new-preset:')) return val.slice(11) + ' (new preset)';
  return displayValue(def, val);
}

/* ---------- import: read + plan ---------- */
async function xlReadFile(file) {
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const name = wb.SheetNames.find((n) => n.toLowerCase() === 'listings') || wb.SheetNames[0];
  const aoa = X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false });
  const headers = (aoa[0] || []).map((x) => String(x).trim());
  const rows = aoa.slice(1).map((r, i) => ({ cells: r, rowNo: i + 2 })).filter((r) => r.cells.some((x) => String(x).trim() !== ''));
  return { sheet: name, headers, rows, X };
}
// a header that belongs to some other category is expected in a mixed sheet, so it is not reported as ignored
function headerKnownElsewhere(hd) {
  const n = String(hd).trim().toLowerCase();
  return catIds().some((id) => xlCategoryColumns(getCat(id)).some((x) => x.header.toLowerCase() === n));
}
function xlCatByName(s) {
  const n = String(s || '').trim().toLowerCase();
  if (!n) return null;
  return catIds().map(getCat).find((c) => c.name.toLowerCase() === n || c.id.toLowerCase() === n) || null;
}
function xlDateCell(X, v) {
  if (typeof v === 'number' && X && X.SSF) { const d = X.SSF.parse_date_code(v); if (d) return new Date(d.y, d.m - 1, d.d, d.H, d.M).getTime(); }
  return Logic.parseDateTime(v);
}
async function xlPlan(file) {
  const { headers, rows, X, sheet } = await xlReadFile(file);
  const col = (name) => headers.findIndex((h0) => h0.toLowerCase() === name.toLowerCase());
  const ix = Object.fromEntries(XL_FIXED.map((f) => [f, col(f)]));
  const cell = (r, name) => (ix[name] >= 0 ? r.cells[ix[name]] : '');
  if (!headers.length) throw new Error('The sheet has no header row.');
  // saved listings for matching
  await flushCurrent();
  const saved = new Map();
  for (const m of S.index) {
    if (m.id === S.listing.id) { saved.set(m.id, S.listing); continue; }
    try { const d = await Store.loadListing(m.id); if (d) saved.set(m.id, normalizeListing(d)); } catch (e) { /* skip */ }
  }
  const bySku = new Map();
  for (const l of saved.values()) { const k = String(l.fields.sku || '').trim().toLowerCase(); if (k && !bySku.has(k)) bySku.set(k, l); }

  const groups = [];
  const ignored = new Set();
  let cur = null;
  for (const r of rows) {
    const isVar = /variant/i.test(String(cell(r, 'Row Type')));
    const id = String(cell(r, 'Listing ID') || '').trim();
    if (!isVar) {
      cur = { rowNo: r.rowNo, master: r, id, variants: [], errors: [] };
      groups.push(cur);
      continue;
    }
    const parent = String(cell(r, 'Parent ID') || '').trim();
    let g = parent ? groups.find((x) => x.id && x.id === parent) : cur;
    if (!g && parent && saved.has(parent)) { g = { rowNo: r.rowNo, master: null, id: parent, variants: [], errors: [] }; groups.push(g); }
    if (!g) { groups.push({ rowNo: r.rowNo, master: null, id: '', variants: [], errors: [{ row: r.rowNo, msg: 'Variant row has no master row above it' }], broken: true }); continue; }
    g.variants.push({ row: r, id });
  }
  for (const g of groups) {
    if (g.broken) continue;
    // match
    let existing = null, matchedBy = null;
    if (g.id && saved.has(g.id)) { existing = saved.get(g.id); matchedBy = 'Listing ID'; }
    const skuIdx = headers.findIndex((h0) => /^seller sku id$/i.test(h0));
    const sku = g.master && skuIdx >= 0 ? xlNumText(g.master.cells[skuIdx]) : '';
    if (!existing && sku && bySku.has(sku.toLowerCase())) { existing = bySku.get(sku.toLowerCase()); matchedBy = 'Seller SKU ID'; }
    g.existing = existing; g.matchedBy = matchedBy;
    const c = (g.master && xlCatByName(cell(g.master, 'Category'))) || (existing && getCat(existing.category));
    if (!c) { g.errors.push({ row: g.rowNo, msg: 'Unknown category “' + (g.master ? cell(g.master, 'Category') : '') + '”' }); g.broken = true; continue; }
    g.cat = c;
    g.brand = (g.master && String(cell(g.master, 'Brand') || '').trim()) || (existing && existing.brand) || S.listing.brand;
    g.created = g.master ? xlDateCell(X, cell(g.master, 'Created')) : null;
    const hm = xlHeaderMap(c);
    // exact header matches first, then label aliases (e.g. "Length" for "Length (CM)") for fields not yet mapped
    const fieldCols = [];
    const mapped = new Set();
    const exact = new Map(xlCategoryColumns(c).map((x) => [x.header.toLowerCase(), x]));
    const attrHeaders = headers.map((hd, i) => ({ hd, i })).filter(({ hd }) => hd && !XL_FIXED.some((f) => f.toLowerCase() === hd.toLowerCase()));
    for (const { hd, i } of attrHeaders) { const m = exact.get(hd.toLowerCase()); if (m && !mapped.has(m.key)) { fieldCols.push({ i, col: m }); mapped.add(m.key); } }
    for (const { hd, i } of attrHeaders) {
      if (exact.has(hd.toLowerCase())) continue;
      const m = hm(hd);
      if (m && !mapped.has(m.key)) { fieldCols.push({ i, col: m }); mapped.add(m.key); }
      else if (!m && !headerKnownElsewhere(hd)) ignored.add(hd);
    }
    g.fieldCols = fieldCols;
    const parseRow = (r) => {
      const vals = {}, errs = [];
      for (const { i, col } of fieldCols) {
        const v = xlParse(col.def, r.cells[i], (msg) => errs.push({ row: r.rowNo, field: col.def.label, msg }));
        if (v !== undefined) vals[col.key] = v;
      }
      return { vals, errs };
    };
    if (g.master) { const p = parseRow(g.master); g.vals = p.vals; g.errors.push(...p.errs); } else g.vals = {};
    g.variantPlans = g.variants.map((vr) => { const p = parseRow(vr.row); return { id: vr.id, rowNo: vr.row.rowNo, vals: p.vals, errors: p.errs }; });
    xlValidate(g);
    xlDiff(g);
    g.action = existing ? 'update' : 'new';
  }
  return { groups, ignored: [...ignored], sheet, rowCount: rows.length };
}
function xlValidate(g) {
  const c = g.cat;
  const base = g.existing ? (k) => g.existing.fields[k] : (k) => fieldDefaults(c)[k];
  const check = (vals, rowNo, getter, list) => {
    for (const f of allFields(c)) {
      const v = Object.prototype.hasOwnProperty.call(vals, f.key) ? vals[f.key] : getter(f.key);
      if (f.limit && !Array.isArray(v) && String(v || '').length > f.limit) list.push({ row: rowNo, field: f.label, msg: String(v).length + ' characters, over the ' + f.limit + ' limit' });
      if (f.combinedLimit && Array.isArray(v) && v.join(', ').length > f.combinedLimit) list.push({ row: rowNo, field: f.label, msg: 'Combined labels are ' + v.join(', ').length + ' characters, over ' + f.combinedLimit });
      if (f.exactOne && (!Array.isArray(v) || v.length !== 1)) list.push({ row: rowNo, field: f.label, msg: (Array.isArray(v) ? v.length : 0) + ' values; exactly one is required' });
      if (f.max && Array.isArray(v) && v.length > f.max) list.push({ row: rowNo, field: f.label, msg: 'Up to ' + f.max + ' values allowed' });
      if (f.req && !f.exactOne && isEmpty(v)) list.push({ row: rowNo, field: f.label, msg: 'Mandatory field is empty' });
    }
  };
  if (g.master) check(g.vals, g.rowNo, base, g.errors);
  for (const vp of g.variantPlans) {
    const ev = g.existing && g.existing.variants.find((x) => x.id === vp.id);
    const getter = ev ? (k) => variantValue(g.existing, ev, k) : (k) => (Object.prototype.hasOwnProperty.call(g.vals, k) ? g.vals[k] : base(k));
    check(vp.vals, vp.rowNo, getter, vp.errors);
  }
}
function xlDiff(g) {
  const c = g.cat;
  const l = g.existing;
  const diffs = (vals, oldGetter) => {
    const out = [];
    for (const key of Object.keys(vals)) {
      const def = fieldDef(key, c) || VARIANT_ONLY_FIELDS[key];
      const ov = oldGetter(key);
      if (xlKey(def, ov) !== xlKey(def, vals[key])) out.push({ key, label: def.label, old: xlShow(def, ov), new: xlShow(def, vals[key]) });
    }
    return out;
  };
  g.diffs = [];
  if (l && g.master) {
    g.diffs = diffs(g.vals, (k) => l.fields[k]);
    if (g.brand && g.brand !== l.brand) g.diffs.unshift({ key: '_brand', label: 'Brand', old: l.brand, new: g.brand });
    if (g.cat.id !== l.category) g.diffs.unshift({ key: '_cat', label: 'Category', old: (getCat(l.category) || {}).name, new: g.cat.name });
  }
  for (const vp of g.variantPlans) {
    let ev = l ? l.variants.find((x) => x.id === vp.id) : null;
    if (!ev && l) {
      const sku = String(vp.vals.sku || '').trim().toLowerCase();
      if (sku) ev = l.variants.find((x) => String(variantValue(l, x, 'sku') || '').trim().toLowerCase() === sku) || null;
    }
    vp.existing = ev;
    vp.diffs = ev ? diffs(vp.vals, (k) => variantValue(l, ev, k)) : null;
  }
  g.changed = !l || g.diffs.length > 0 || g.variantPlans.some((vp) => !vp.existing || vp.diffs.length);
  g.keptVariants = l ? l.variants.filter((x) => !g.variantPlans.some((vp) => vp.existing === x)).length : 0;
}

/* ---------- import: apply ---------- */
function xlResolvePresets(vals) {
  for (const k of Object.keys(vals)) {
    const v = vals[k];
    if (typeof v === 'string' && v.startsWith('new-preset:')) {
      const text = v.slice(11);
      let p = S.settings.presets.find((x) => x.text === text);
      if (!p) { p = { id: uid('preset'), label: text.split(',')[0].slice(0, 40), text }; S.settings.presets.push(p); saveSettingsSoon(); }
      vals[k] = p.id;
    }
    if (k === 'hsn' && v && !S.settings.hsn.some((x) => x.code === v)) { S.settings.hsn.push({ code: v, desc: '' }); saveSettingsSoon(); }
  }
}
function xlApplyVariant(l, vp, existing) {
  xlResolvePresets(vp.vals);
  if (existing) {
    for (const k of Object.keys(vp.vals)) {
      const def = fieldDef(k, getCat(l.category)) || VARIANT_ONLY_FIELDS[k];
      if (xlKey(def, existing._before[k]) === xlKey(def, vp.vals[k])) continue; // unchanged in the sheet: keep as it was
      const auto = variantAuto(l, existing, k);
      if (xlKey(def, auto) === xlKey(def, vp.vals[k])) delete existing.overrides[k]; else existing.overrides[k] = clone(vp.vals[k]);
    }
    return existing;
  }
  const nv = { id: vp.id && !l.variants.some((x) => x.id === vp.id) && /^v_/.test(vp.id) ? vp.id : uid('v'), tokenValues: {}, axis: {}, excluded: [], overrides: {}, disabled: false, images: null, createdAt: Date.now() };
  for (const k of Object.keys(vp.vals)) {
    const def = fieldDef(k, getCat(l.category)) || VARIANT_ONLY_FIELDS[k];
    if (xlKey(def, variantAuto(l, nv, k)) !== xlKey(def, vp.vals[k])) nv.overrides[k] = clone(vp.vals[k]);
  }
  l.variants.push(nv);
  return nv;
}
async function xlApply(plan) {
  const now = Date.now();
  let created = 0, updated = 0, skipped = 0, unchanged = 0;
  const touched = [];
  for (const g of plan.groups) {
    if (g.broken || g.action === 'skip') { skipped++; continue; }
    if (g.action === 'update' && !g.changed) { unchanged++; continue; }
    let l;
    if (g.action === 'update') {
      l = g.existing;
      // remember each existing variant's values before the master changes
      for (const vp of g.variantPlans) if (vp.existing) vp.existing._before = Object.fromEntries(Object.keys(vp.vals).map((k) => [k, clone(variantValue(l, vp.existing, k))]));
      if (g.master) {
        xlResolvePresets(g.vals);
        if (g.cat.id !== l.category) l.category = g.cat.id;
        if (g.brand) l.brand = g.brand;
        for (const k of Object.keys(g.vals)) { const def = fieldDef(k, g.cat) || VARIANT_ONLY_FIELDS[k]; if (xlKey(def, l.fields[k]) !== xlKey(def, g.vals[k])) l.fields[k] = clone(g.vals[k]); }
      }
      for (const vp of g.variantPlans) xlApplyVariant(l, vp, vp.existing);
      for (const v of l.variants) delete v._before;
      l.updatedAt = now;
      updated++;
    } else {
      const reuseId = g.action === 'new' && g.id && /^L_/.test(g.id) && !S.index.some((m) => m.id === g.id) ? g.id : null;
      l = newListing(g.brand, g.cat.id);
      if (reuseId) l.id = reuseId;
      l.createdAt = g.action === 'new' && g.created ? g.created : now;
      l.updatedAt = now;
      xlResolvePresets(g.vals);
      for (const k of Object.keys(g.vals)) l.fields[k] = clone(g.vals[k]);
      for (const vp of g.variantPlans) xlApplyVariant(l, Object.assign({}, vp, { id: g.action === 'new' ? vp.id : '' }), null);
      l.name = String(l.fields.modelNumber || '').trim() || 'Untitled listing';
      created++;
    }
    if (!S.settings.brands.some((b) => b.name === l.brand)) { S.settings.brands.push({ name: l.brand, code: '' }); saveSettingsSoon(); }
    if (!l.nameCustom) l.name = String(l.fields.modelNumber || '').trim() || 'Untitled listing';
    await Store.saveListing(listingForSave(l), metaOf(l));
    upsertIndex(Object.assign({ id: l.id }, metaOf(l)));
    touched.push(l.id);
  }
  if (touched.includes(S.listing.id)) {
    const d = await Store.loadListing(S.listing.id);
    if (d) { S.listing = normalizeListing(d); S.target = null; S.dirty = false; S.lastSaved = S.listing.updatedAt; }
  }
  renderAll();
  return { created, updated, skipped, unchanged };
}

/* ---------- UI ---------- */
function openExcelModal() {
  const st = { scope: 'current', ids: new Set(), plan: null, busy: false };
  const exportBox = h('div', { class: 'stack' });
  const importBox = h('div', { class: 'stack' });
  const drawExport = () => {
    clear(exportBox);
    const scopes = [['current', 'Current listing (master + variants)'], ['selected', 'Selected saved listings'], ['all', 'All saved listings (' + S.index.length + ')']];
    const list = h('div', { class: 'stack', style: { maxHeight: '220px', overflow: 'auto', gap: '4px' } });
    if (st.scope === 'selected') {
      if (!S.index.length) list.append(h('div', { class: 'hint' }, 'No saved listings yet.'));
      for (const m of S.index.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))) {
        list.append(h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: st.ids.has(m.id), onChange: (e) => { if (e.target.checked) st.ids.add(m.id); else st.ids.delete(m.id); } }),
          h('span', null, h('b', null, m.name || 'Untitled listing'), ' · ', m.brand, ' · ', (getCat(m.category) || {}).name || m.category, ' · ', (m.variantCount || 0) + ' variants')));
      }
    }
    exportBox.append(
      h('div', { class: 'stack', style: { gap: '6px' } }, scopes.map(([k, lab]) => h('label', { class: 'check' }, h('input', { type: 'radio', name: 'xlscope', checked: st.scope === k, onChange: () => { st.scope = k; drawExport(); } }), lab))),
      st.scope === 'selected' ? list : null,
      h('div', { class: 'hint' }, 'One sheet named “Listings”. Each variant is its own row under its master. Columns follow Seller Hub order: Price, Stock and Shipping → Product Description → Additional Description → Warranty.'),
      h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', onClick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try { await xlExport(st.scope, st.ids); } finally { b.disabled = false; }
      } }, icon('save', 14), 'Export .xlsx')));
  };
  const file = h('input', { type: 'file', accept: '.xlsx', hidden: true, onChange: (e) => readImport(e.target.files[0]) });
  const readImport = async (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { toast('Choose an .xlsx file', 2000); return; }
    clear(importBox).append(h('div', { class: 'hint' }, 'Reading ' + f.name + '…'));
    try { st.plan = await xlPlan(f); st.plan.file = f.name; drawImport(); }
    catch (e) { clear(importBox).append(h('div', { class: 'warn-box bad' }, h('span', { class: 'wi' }, icon('warn', 14)), h('span', { class: 'wt' }, 'Could not read that file: ' + (e.message || e))), dropZone()); }
  };
  const dropZone = () => {
    const dz = h('div', { class: 'dropzone', tabindex: '0', role: 'button', onClick: () => file.click(), onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } },
      icon('upload', 22), h('div', null, h('b', null, 'Drop an exported .xlsx or click to choose'), h('div', { class: 'hint' }, 'Columns are matched by header name, in any order. Rows without a Listing ID become new listings.')));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); readImport(e.dataTransfer.files[0]); });
    return dz;
  };
  const drawImport = () => {
    clear(importBox);
    const p = st.plan;
    if (!p) { importBox.append(file, dropZone()); return; }
    const gs = p.groups;
    const errCount = gs.reduce((n, g) => n + g.errors.length + (g.variantPlans || []).reduce((m, vp) => m + vp.errors.length, 0), 0);
    const nNew = gs.filter((g) => !g.broken && !g.existing).length;
    const nUpd = gs.filter((g) => !g.broken && g.existing && g.changed).length;
    const nSame = gs.filter((g) => !g.broken && g.existing && !g.changed).length;
    importBox.append(
      h('div', { class: 'row' }, h('span', { class: 'tag teal' }, p.file), h('span', { class: 'hint' }, 'Sheet “' + p.sheet + '” · ' + p.rowCount + ' rows'), h('span', { class: 'grow' }),
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => { st.plan = null; drawImport(); } }, 'Choose another file')),
      h('div', { class: 'row', dataset: { xlSummary: '1' } }, h('span', { class: 'tag blue' }, nNew + ' new'), h('span', { class: 'tag amber' }, nUpd + ' updated'), h('span', { class: 'tag green' }, nSame + ' unchanged'), h('span', { class: 'tag' + (errCount ? '' : ' green'), style: errCount ? { background: 'var(--bad-soft)', color: 'var(--bad)' } : null }, errCount + ' row errors')),
      p.ignored.length ? h('div', { class: 'hint' }, 'Ignored columns (not a field of this category): ' + p.ignored.join(', ')) : null);
    for (const g of gs) importBox.append(xlGroupCard(g, () => drawImport()));
    const applyBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => {
      applyBtn.disabled = true; applyBtn.textContent = 'Applying…';
      try {
        const r = await xlApply(p);
        toast(r.created + ' created · ' + r.updated + ' updated · ' + r.unchanged + ' unchanged · ' + r.skipped + ' skipped', 2600);
        st.plan = null; drawImport();
        importBox.prepend(h('div', { class: 'info-box', dataset: { xlResult: '1' } }, 'Import done: ' + r.created + ' created, ' + r.updated + ' updated, ' + r.unchanged + ' unchanged, ' + r.skipped + ' skipped.'));
      } catch (e) { toast('Import failed: ' + (e.message || e.code || 'error'), 2600); applyBtn.disabled = false; applyBtn.textContent = 'Apply import'; }
    } }, 'Apply import');
    importBox.append(h('div', { class: 'row' }, applyBtn, h('span', { class: 'hint' }, 'Nothing changes until you apply. Unchanged listings are left as they are.')));
  };
  drawExport(); drawImport();
  openModal({ title: 'Excel import / export', body: h('div', { class: 'stack', style: { gap: '18px' } },
    h('div', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h3', null, 'Export')), h('div', { class: 'sec-body pad' }, exportBox)),
    h('div', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h3', null, 'Import')), h('div', { class: 'sec-body pad' }, importBox))) });
}
function xlErrList(list) {
  if (!list.length) return null;
  return h('div', { class: 'stack', style: { gap: '4px' } }, list.map((e) => h('div', { class: 'warn-box bad' }, h('span', { class: 'wi' }, icon('warn', 13)), h('span', { class: 'wt' }, 'Row ' + e.row + (e.field ? ' · ' + e.field : '') + ': ' + e.msg))));
}
function xlDiffTable(diffs) {
  if (!diffs.length) return h('div', { class: 'hint' }, 'No field changes.');
  return h('div', { class: 'tbl-wrap', style: { maxHeight: '260px' } }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, 'Field'), h('th', null, 'Current'), h('th', null, 'From sheet'))),
    h('tbody', null, diffs.map((d) => h('tr', null, h('td', null, h('b', null, d.label)), h('td', { class: 'diff', html: d.old ? '<del>' + esc(d.old) + '</del>' : '<span class="muted">—</span>' }), h('td', { class: 'diff', html: d.new ? xlNewSide(d.old || '', d.new) : '<span class="muted">(empty)</span>' }))))));
}
// the sheet's value with the words that are new highlighted (deleted words are shown in the Current column)
function xlNewSide(a, b) {
  return Logic.diffWords(a, b).filter((d) => d.type !== 'del').map((d) => (d.type === 'ins' ? '<ins>' + esc(d.t) + '</ins>' : esc(d.t))).join('');
}
function xlGroupCard(g, redraw) {
  const title = g.master ? (g.vals && g.vals.modelNumber) || (g.vals && g.vals.sku) || 'Row ' + g.rowNo : (g.existing ? g.existing.name : 'Variant rows');
  const head = h('div', { class: 'row' }, h('b', null, title || 'Untitled listing'), g.cat ? h('span', { class: 'tag' }, g.cat.name) : null, h('span', { class: 'hint' }, 'Row ' + g.rowNo));
  if (g.broken) return h('div', { class: 'imp-sec' }, head, xlErrList(g.errors));
  let status;
  if (!g.existing) status = h('span', { class: 'tag blue' }, 'New listing');
  else if (!g.changed) status = h('span', { class: 'tag green' }, 'No changes');
  else status = h('span', { class: 'tag amber' }, 'Updates saved listing');
  head.append(status);
  if (g.existing) head.append(h('span', { class: 'hint' }, 'Matched by ' + g.matchedBy + ' → “' + (g.existing.name || g.existing.fields.modelNumber) + '”'));
  const opts = g.existing ? [['update', 'Update'], ['new', 'Save as new'], ['skip', 'Skip']] : [['new', 'Create'], ['skip', 'Skip']];
  head.append(h('span', { class: 'grow' }), h('div', { class: 'seg sm', role: 'radiogroup', 'aria-label': 'Action for ' + title }, opts.map(([k, lab]) => h('button', { type: 'button', class: g.action === k ? 'on' : '', onClick: () => { g.action = k; redraw(); } }, lab))));
  const body = [head];
  if (g.action !== 'skip') {
    if (g.existing && g.action === 'update' && g.master) body.push(xlDiffTable(g.diffs));
    if (!g.existing || g.action === 'new') body.push(h('div', { class: 'hint' }, Object.keys(g.vals).filter((k) => !isEmpty(g.vals[k])).length + ' fields filled from the sheet' + (g.created && g.action === 'new' && !g.existing ? ' · Created ' + Logic.fmtDateTime(g.created) + ' is kept' : '')));
    body.push(xlErrList(g.errors));
    g.variantPlans.forEach((vp, i) => {
      const vh = h('div', { class: 'row small' }, h('b', null, 'Variant ' + (i + 1)), h('span', { class: 'hint' }, 'Row ' + vp.rowNo),
        g.action === 'update' && vp.existing ? (vp.diffs.length ? h('span', { class: 'tag amber' }, vp.diffs.length + ' changes') : h('span', { class: 'tag green' }, 'No changes')) : h('span', { class: 'tag blue' }, 'New variant'));
      body.push(h('div', { class: 'stack', style: { gap: '6px', paddingLeft: '12px', borderLeft: '2px solid var(--line)' } }, vh,
        g.action === 'update' && vp.existing && vp.diffs.length ? xlDiffTable(vp.diffs) : null, xlErrList(vp.errors)));
    });
    if (g.action === 'update' && g.keptVariants) body.push(h('div', { class: 'hint' }, g.keptVariants + ' saved variant' + (g.keptVariants > 1 ? 's are' : ' is') + ' not in the sheet and will be kept.'));
  }
  return h('div', { class: 'imp-sec', dataset: { xlGroup: g.existing ? 'match' : 'new' } }, body);
}
