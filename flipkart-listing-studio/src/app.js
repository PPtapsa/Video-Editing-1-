/* ==========================================================================
   App shell — top bar, stepper, tabs, preview pane, saved listings, saving, boot
   ========================================================================== */
const TABS = [
  { id: 'images', label: 'Image addition' },
  { id: 'price', label: 'Price, Stock and Shipping Information' },
  { id: 'pd', label: 'Product Description' },
  { id: 'ad', label: 'Additional Description (Optional)' },
  { id: 'variants', label: 'Variant addition (optional)' },
  { id: 'lab', label: '⚡ Title & SEO Lab', extra: true },
  { id: 'ai', label: '🤖 AI Research', extra: true }
];

function buildShell() {
  const root = document.getElementById('app');
  clear(root);
  S.el = {
    topbar: h('header', { class: 'topbar' }),
    note: h('div', { class: 'store-note', hidden: true }),
    stepper: h('div', { class: 'stepper', 'aria-label': 'Listing steps' }),
    banner: h('div', { class: 'variant-banner', hidden: true }),
    mobilePv: h('details', { class: 'mobile-pv' }),
    tabs: h('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'Listing sections' }),
    panel: h('section', { class: 'panel' }),
    side: h('aside', { class: 'side-col', 'aria-label': 'Flipkart preview' })
  };
  root.append(S.el.topbar, S.el.note, S.el.stepper, S.el.banner,
    h('div', { class: 'workspace' }, h('main', { class: 'main-col' }, S.el.mobilePv, S.el.tabs, S.el.panel), S.el.side));
}

function renderAll() {
  renderTopbar(); renderStepper(); renderBanner(); renderTabs(); renderPanel(); renderPreview(); updateSaveInd();
}

/* ---------- top bar ---------- */
function renderTopbar() {
  const tb = clear(S.el.topbar);
  const l = S.listing;
  const brandSel = h('select', { class: 'sel tb', id: 'brandSel', 'aria-label': 'Brand', value: l.brand,
    onChange: () => {
      if (brandSel.value === '__add') {
        brandSel.value = l.brand;
        promptPop(brandSel, 'Add brand', [{ name: 'name', label: 'Brand name', placeholder: 'e.g. Hybath' }, { name: 'code', label: 'SKU brand code', placeholder: 'e.g. HB' }], (v) => {
          if (!v.name) { toast('Enter a brand name'); return false; }
          if (S.settings.brands.some((b) => b.name.toLowerCase() === v.name.toLowerCase())) { toast('That brand already exists'); return false; }
          S.settings.brands.push({ name: v.name, code: v.code }); saveSettingsSoon();
          l.brand = v.name; markDirty(); renderAll(); toast('Brand added');
        });
        return;
      }
      l.brand = brandSel.value;
      const b = S.settings.brands.find((x) => x.name === l.brand);
      const seg = (l.skuSegments || []).find((s) => s.label === 'Brand code');
      if (seg && b && b.code) seg.value = b.code;
      markDirty(); renderAll();
    } },
  S.settings.brands.map((b) => h('option', { value: b.name }, b.name)),
  !S.settings.brands.some((b) => b.name === l.brand) ? h('option', { value: l.brand }, l.brand) : null,
  h('option', { value: '__add' }, '+ Add brand'));

  const catSel = h('select', { class: 'sel tb', id: 'catSel', 'aria-label': 'Category', value: l.category,
    onChange: () => {
      if (catSel.value === '__add') { catSel.value = l.category; openCategoryBuilder(null, true); return; }
      changeCategory(catSel.value);
    } },
  catIds().map((id) => h('option', { value: id }, getCat(id).name)),
  h('option', { value: '__add' }, '+ Add category'));

  S.el.saveInd = h('span', { class: 'save-ind', 'aria-live': 'polite' }, h('span', { class: 'dot' }), h('span', { class: 'txt' }));
  const themeIcon = S.theme === 'dark' ? 'moon' : S.theme === 'light' ? 'sun' : 'contrast';
  tb.append(
    h('div', { class: 'wordmark' }, h('div', { class: 'plate', 'aria-hidden': 'true' }, h('span', null, 'T')),
      h('div', { class: 'wm-text' }, h('span', { class: 'wm-brand' }, 'TAPSA'), h('span', { class: 'wm-app' }, 'Flipkart Listing Studio'))),
    h('div', { class: 'tb-group' },
      h('label', { class: 'tb-field', for: 'brandSel' }, h('span', null, 'Brand'), brandSel),
      h('label', { class: 'tb-field', for: 'catSel' }, h('span', null, 'Category'), h('div', { class: 'row nowrap' }, catSel, iconBtn('gear', 'Category Builder', () => openCategoryBuilder(l.category))))),
    h('div', { class: 'tb-spacer' }),
    S.el.saveInd,
    h('div', { class: 'row tb-actions' },
      h('button', { class: 'btn', type: 'button', onClick: newListingAction }, icon('plus', 14), 'New'),
      h('button', { class: 'btn btn-primary', type: 'button', title: 'Save (Ctrl/Cmd+S)', onClick: () => saveNow(true) }, icon('save', 14), 'Save'),
      h('button', { class: 'btn', type: 'button', onClick: saveAsCopy }, icon('dup', 14), 'Save as copy'),
      h('button', { class: 'btn', type: 'button', onClick: openSavedDrawer }, icon('folder', 14), 'Saved Listings'),
      h('button', { class: 'btn', type: 'button', title: 'Excel import / export', onClick: openExcelModal }, icon('doc', 14), 'Excel'),
      iconBtn(themeIcon, 'Theme: ' + S.theme + ' (click to change)', cycleTheme)));
  updateSaveInd();
}
function changeCategory(id) {
  const l = S.listing;
  const oldCat = cat();
  l.category = id;
  const c = cat();
  for (const f of allFields(c)) if (f.def !== undefined && l.fields[f.key] === undefined) l.fields[f.key] = f.def;
  const seg = (l.skuSegments || []).find((s) => s.label === 'Category code');
  if (seg && (!seg.value || seg.value === oldCat.skuCode)) seg.value = c.skuCode || '';
  markDirty(); renderAll();
}
function cycleTheme() {
  S.theme = S.theme === 'system' ? 'light' : S.theme === 'light' ? 'dark' : 'system';
  lsSet('fls:theme', S.theme); applyTheme(); renderTopbar();
  toast('Theme: ' + S.theme);
}
function applyTheme() {
  if (S.theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', S.theme);
}

/* ---------- stepper / banner ---------- */
function renderStepper() {
  const st = clear(S.el.stepper);
  const l = S.listing;
  st.append(
    h('span', { class: 'step' }, h('span', { class: 'n' }, icon('check', 11)), 'Select Vertical: ', h('b', null, cat().name)),
    h('span', { class: 'step-sep' }, '→'),
    h('span', { class: 'step' }, h('span', { class: 'n' }, icon('check', 11)), 'Select Brand: ', h('b', null, l.brand)),
    h('span', { class: 'step-sep' }, '→'),
    h('span', { class: 'step cur' }, h('span', { class: 'n' }, '3'), h('b', null, 'Add Product Details')),
    h('span', { class: 'muted small', style: { marginLeft: 'auto' } }, (l.name || l.fields.modelNumber || 'Untitled listing') + (l.variants.length ? ' · ' + l.variants.length + ' variant' + (l.variants.length > 1 ? 's' : '') : '')));
}
function renderBanner() {
  const b = S.el.banner;
  const v = curVariant();
  b.hidden = !v;
  clear(b);
  if (!v) return;
  const idx = S.listing.variants.indexOf(v) + 1;
  b.append(h('span', null, 'Variant of: ', h('b', null, S.listing.fields.modelNumber || S.listing.name || 'master listing')),
    h('span', { class: 'tag blue' }, 'Variant ' + idx + ' · ' + variantLabel(v)),
    h('span', { class: 'hint' }, 'Unedited fields follow the master. Edited fields get a blue dot; ↺ restores the auto value.'),
    h('span', { style: { flex: 1 } }),
    h('button', { class: 'btn btn-sm', type: 'button', onClick: () => openTarget(null, 'variants') }, '← Back to master'));
}
function openTarget(variantId, tab) {
  S.target = variantId;
  if (tab) setTab(tab, true);
  renderAll();
  window.scrollTo(0, 0);
}

/* ---------- tabs ---------- */
function renderTabs() {
  const t = tabCounts(S.listing, curVariant());
  const nav = S.el.tabs;
  const existing = nav.querySelectorAll('.tab');
  const make = () => {
    clear(nav);
    for (const tab of TABS) {
      nav.append(h('button', { class: 'tab' + (tab.extra ? ' extra' : '') + (S.tab === tab.id ? ' on' : ''), role: 'tab', type: 'button', id: 'tab_' + tab.id, 'aria-selected': S.tab === tab.id ? 'true' : 'false', dataset: { tab: tab.id }, onClick: () => setTab(tab.id) },
        h('span', { class: 'lb' }, tab.label), h('span', { class: 'cnt' }), h('span', { class: 'tk' })));
    }
  };
  if (existing.length !== TABS.length) make();
  for (const btn of nav.querySelectorAll('.tab')) {
    const id = btn.dataset.tab;
    btn.classList.toggle('on', S.tab === id);
    btn.setAttribute('aria-selected', S.tab === id ? 'true' : 'false');
    const c = t[id];
    const cnt = btn.querySelector('.cnt');
    const tk = btn.querySelector('.tk');
    let text = '', done = false;
    if (c) { text = '(' + c.done + '/' + c.total + ')'; done = c.total > 0 && c.done === c.total; }
    if (id === 'variants') text = S.listing.variants.length ? '(' + S.listing.variants.length + ')' : '';
    cnt.textContent = text;
    const had = tk.dataset.done === '1';
    if (done && !had) { clear(tk); tk.append(h('span', { class: 'tick', 'aria-label': 'complete' }, icon('check'))); }
    if (!done && had) clear(tk);
    tk.dataset.done = done ? '1' : '0';
  }
}
function setTab(id, silent) {
  S.tab = id; lsSet('fls:tab', id);
  if (silent) return;
  renderTabs(); renderPanel(); scheduleLive();
  const top = S.el.tabs.getBoundingClientRect().top;
  if (top < 0) window.scrollTo(0, window.scrollY + top - 80);
}

/* ---------- panel ---------- */
function renderPanel() {
  S.fieldEls = [];
  if (openPopClose) openPopClose();
  clear(S.el.panel);
  const fn = { images: renderImagesTab, price: renderPriceTab, pd: (p) => renderDescTab(p, 'pd'), ad: (p) => renderDescTab(p, 'ad'), variants: renderVariantsTab, lab: renderLabTab, ai: renderAiTab }[S.tab] || renderImagesTab;
  try { fn(S.el.panel); } catch (e) { console.error(e); S.el.panel.append(h('div', { class: 'warn-box bad' }, 'This tab failed to render: ' + (e && e.message))); }
  refreshWarnings();
}
function rerenderPanel() {
  const y = window.scrollY;
  renderPanel();
  window.scrollTo(0, y);
  scheduleLive();
}
let liveRaf = 0;
function scheduleLive() {
  if (liveRaf) return;
  liveRaf = requestAnimationFrame(() => { liveRaf = 0; refreshLive(); });
}
function refreshLive() {
  renderTabs(); renderPreview(); refreshSecCounters(); refreshWarnings(); updateSaveInd(); renderStepper();
  if (S.tab === 'lab') labLive();
  if (S.tab === 'price') priceLive();
}
function refreshSecCounters() {
  const t = tabCounts(S.listing, curVariant());
  const g = (k) => getVal(k);
  for (const el of S.el.panel.querySelectorAll('[data-count]')) {
    const k = el.dataset.count;
    let done = 0, total = 0;
    if (t[k]) { done = t[k].done; total = t[k].total; }
    else if (k.startsWith('sec:')) {
      const [, tab, name] = k.split(':');
      const c = cat();
      const fs = tab === 'core' ? coreSections(c).find((s) => s.name === name).fields.filter((f) => f.req && f.counted !== false) : c.fields.filter((f) => f.tab === tab && (f.section || '') === name && (tab === 'ad' || f.req));
      total = fs.length; done = fs.filter((f) => isFilled(f, g(f.key))).length;
    }
    el.textContent = '(' + done + '/' + total + ')';
    el.classList.toggle('done', total > 0 && done === total);
  }
}

/* ---------- preview pane ---------- */
function titleNodes(t, mode, opts) {
  opts = opts || {};
  const frag = [];
  let first = true;
  for (const s of t.segments) {
    if (s.kind === 'lit') { if (s.text) frag.push(h('span', { class: 'seg-t k-lit' }, caseText(s.text, mode, first && !!s.text.trim()))); if (s.text.trim()) first = false; continue; }
    if (s.missing) { if (opts.placeholders !== false) frag.push(h('span', { class: 'miss', title: 'Empty: ' + s.label }, s.label)); continue; }
    frag.push(h('span', { class: 'seg-t k-' + s.kind, title: s.label }, caseText(s.text, mode, first)));
    first = false;
  }
  return frag;
}
function insertCutMarker(container, at) {
  let count = 0, prevSpace = false;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest('.miss')) continue;
    const s = node.nodeValue;
    for (let i = 0; i < s.length; i++) {
      const sp = /\s/.test(s[i]);
      if (sp && prevSpace) continue;
      prevSpace = sp;
      count++;
      if (count === at) {
        const rest = node.splitText(i + 1);
        rest.parentNode.insertBefore(h('span', { class: 'cut', title: 'Mobile search cards usually cut the title near here (~40 characters)' }), rest);
        return true;
      }
    }
  }
  return false;
}
function previewCard() {
  const l = S.listing, v = curVariant(), c = cat();
  const t = curTitle();
  const mode = l.titleCase || 'typed';
  const imgs = imagesOf(l, v);
  const filled = imgs.filter((s) => s.imgId && S.imgData[s.imgId]);
  const main = filled[0];
  const titleEl = h('div', { class: 'pv-title' + (S.showSegments !== false ? ' coded' : '') }, titleNodes(t, mode));
  insertCutMarker(titleEl, 40);
  const sp = Logic.num(getVal('sp')), mrp = Logic.num(getVal('mrp'));
  const off = Logic.discountPct(mrp, sp);
  return h('div', { class: 'pv' },
    h('div', { class: 'pv-top' }, 'Flipkart preview', v ? h('span', { class: 'tag blue' }, 'Variant') : null, h('span', { class: 'grow' }),
      c.titleVerified ? null : h('span', { class: 'tag amber', title: 'Title formula is unverified for this vertical' }, 'Formula unverified')),
    h('div', { class: 'pv-img' }, main ? h('img', { src: S.imgData[main.imgId], alt: 'Main image' }) : h('div', { class: 'ph' }, icon('image'), h('div', null, 'Main image appears here'))),
    h('div', { class: 'pv-strip' }, imgs.map((s, i) => h('div', { class: 'th' + (main && s === main ? ' on' : ''), title: slotLabel(i) }, s.imgId && S.imgData[s.imgId] ? h('img', { src: S.imgData[s.imgId], alt: slotLabel(i) }) : String(i + 1)))),
    h('div', { class: 'pv-body' },
      h('div', { class: 'pv-brand' }, l.brand),
      titleEl,
      h('div', { class: 'pv-len' }, h('span', { class: 'mono' }, t.text.length + ' characters'), h('span', null, 'red line = mobile cut (~40)')),
      h('div', { class: 'pv-price' },
        isFinite(sp) && sp > 0 ? h('span', { class: 'sp' }, Logic.fmtINR(sp)) : h('span', { class: 'muted' }, 'Selling price not set'),
        isFinite(mrp) && mrp > 0 ? h('span', { class: 'mrp' }, Logic.fmtINR(mrp)) : null,
        off !== null && off > 0 ? h('span', { class: 'off' }, off + '% off') : null),
      h('div', { class: 'pv-legend' }, h('span', null, h('i', { style: { background: 'var(--seg-model)' } }), c.seoField === 'modelName' ? 'Model Name' : 'Model Number'), h('span', null, h('i', { style: { background: 'var(--seg-type)' } }), 'Type'), h('span', null, h('i', { style: { background: 'var(--seg-install)' } }), c.id === 'shower' ? 'Mount' : 'Installation'), h('span', null, h('i', { style: { background: 'var(--seg-attr)' } }), 'Other attributes'))),
    h('div', { class: 'pv-acts' },
      h('button', { class: 'btn btn-sm btn-primary', type: 'button', onClick: (e) => { renderPreview(); toast('Title regenerated from the current attributes'); } }, icon('restore', 13), 'Re-generate Title'),
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => doCopy(caseText(t.text, mode, true)) }, icon('copy', 13), 'Copy title'),
      h('div', { class: 'seg sm', role: 'radiogroup', 'aria-label': 'Title case preview' },
        [['smart', 'Smart Title Case'], ['typed', 'As typed'], ['upper', 'UPPERCASE']].map(([k, lab]) => h('button', { type: 'button', class: mode === k ? 'on' : '', title: lab, onClick: () => { l.titleCase = k; markDirty(); renderPreview(); if (S.tab === 'lab') labLive(); } }, k === 'smart' ? 'Aa' : k === 'typed' ? 'As typed' : 'AA')))));
}
function sideCards() {
  const t = curTitle();
  const c = cat();
  const r = Logic.readability(caseText(t.text, S.listing.titleCase, true));
  const bank = S.listing.keywordBank;
  const cov = bank && bank.terms && bank.terms.length ? Logic.coverage(bank.terms.slice(0, 25), t.text).pct : null;
  const band = r.band === 'Excellent' ? 'b-ex' : r.band === 'Good' ? 'b-good' : 'b-fix';
  const limit = (fieldDef(c.seoField, c) || {}).limit;
  const w = computeWarnings(S.listing, curVariant());
  const items = Object.keys(w).flatMap((k) => w[k].map((x) => Object.assign({ key: k }, x)));
  return [
    h('div', { class: 'side-card' }, h('h4', null, 'Title health'),
      h('div', { class: 'mini-scores' },
        h('div', { class: 'mini-score', title: 'Human-Readability Flow Score' }, h('b', { class: band }, t.text ? r.score : '—'), h('span', null, 'Readability')),
        h('div', { class: 'mini-score', title: 'Coverage of the top 25 keyword-bank terms in the title' }, h('b', null, cov === null ? '—' : cov + '%'), h('span', null, 'Top-25 cov.')),
        h('div', { class: 'mini-score', title: 'SEO field length vs limit' }, h('b', { class: limit && String(getVal(c.seoField) || '').length > limit ? 'b-fix' : '' }, String(getVal(c.seoField) || '').length), h('span', null, (fieldDef(c.seoField, c) || {}).label === 'Model Name' ? 'Name / ' + (limit || '∞') : 'Model / ' + (limit || '∞')))),
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => setTab('lab') }, 'Open Title & SEO Lab →')),
    items.length ? h('div', { class: 'side-card' }, h('h4', null, 'Check before publishing (' + items.length + ')'),
      items.slice(0, 6).map((x) => h('div', { class: 'warn-box' + (x.level === 'bad' ? ' bad' : '') }, h('span', { class: 'wi' }, icon('warn', 14)),
        h('span', { class: 'wt' }, h('b', null, (fieldDef(x.key) || { label: x.key }).label + ': '), x.text),
        h('button', { class: 'btn btn-xs btn-ghost', type: 'button', onClick: () => goToField(x.key) }, 'Go')))) : null
  ];
}
function goToField(key) {
  const c = cat();
  const d = fieldDef(key, c);
  const tab = !d ? 'pd' : d.tab === 'pd' ? 'pd' : d.tab === 'ad' ? 'ad' : 'price';
  setTab(tab);
  setTimeout(() => {
    const row = S.el.panel.querySelector('.field[data-key="' + key + '"]');
    if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); const f = row.querySelector('input, select, textarea, .ms-box'); if (f) f.focus({ preventScroll: true }); }
  }, 50);
}
function renderPreview() {
  if (!S.el) return;
  const side = clear(S.el.side);
  side.append(previewCard(), ...sideCards().filter(Boolean));
  const mp = S.el.mobilePv;
  const wasOpen = mp.open;
  clear(mp);
  const t = curTitle();
  mp.append(h('summary', null, icon('image', 16), h('b', null, 'Flipkart preview'), h('span', { class: 'muted small', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 } }, t.text || 'Title builds from attributes')), previewCard());
  mp.open = wasOpen;
}

/* ---------- save indicator & saving ---------- */
function updateSaveInd() {
  const el = S.el && S.el.saveInd;
  if (!el) return;
  const txt = el.querySelector('.txt');
  el.className = 'save-ind';
  if (S.storeMode === 'pending') { el.classList.add('saving'); txt.textContent = 'Connecting storage…'; return; }
  if (S.saving) { el.classList.add('saving'); txt.textContent = 'Saving…'; return; }
  if (S.saveErr) { el.classList.add('err'); txt.textContent = 'Not saved — retrying'; return; }
  if (S.dirty) { el.classList.add('dirty'); txt.textContent = 'Unsaved changes'; return; }
  txt.textContent = S.lastSaved ? 'Saved · ' + Logic.fmtClock(S.lastSaved) : 'Not saved yet';
}
const autosave = debounce(() => saveNow(false), 1400);
function markDirty() {
  S.dirty = true;
  S.listing.updatedAt = Date.now();
  autosave();
  scheduleLive();
}
async function saveNow(explicit) {
  autosave.cancel();
  if (S.storeMode === 'pending') { if (explicit) toast('Storage is still connecting…'); return; }
  if (S.saving) { S.saveAgain = true; return; }
  if (!S.dirty && !explicit) return;
  const l = S.listing;
  S.saving = true; S.dirty = false; updateSaveInd();
  try {
    if (!l.nameCustom) l.name = String(l.fields.modelNumber || '').trim() || 'Untitled listing';
    const data = listingForSave(l);
    const meta = metaOf(l);
    await Store.saveListing(data, meta);
    S.lastSaved = Date.now(); S.saveErr = null;
    upsertIndex(Object.assign({ id: l.id }, meta));
    lsSet('fls:last', l.id);
    if (explicit) toast('Saved ✓');
  } catch (e) {
    S.saveErr = e; S.dirty = true;
    toast(e && e.code === 'quota_exceeded' ? 'Storage is full. Delete old listings or images, then save again.' : 'Save failed. Retrying shortly.', 2600);
    setTimeout(() => { if (S.dirty) saveNow(false); }, 6000);
  }
  S.saving = false; updateSaveInd();
  if (S.saveAgain || S.dirty) { S.saveAgain = false; if (!S.saveErr) autosave(); }
}
function upsertIndex(meta) {
  const i = S.index.findIndex((m) => m.id === meta.id);
  if (i >= 0) S.index[i] = meta; else S.index.push(meta);
}
const saveSettingsSoon = debounce(() => {
  if (S.storeMode === 'pending') return;
  Store.saveSettings(S.settings).catch(() => toast('Could not save settings', 2000));
}, 500);

/* ---------- listing actions ---------- */
async function flushCurrent() {
  if (S.dirty || S.saving) {
    await saveNow(false);
    while (S.saving) await new Promise((r) => setTimeout(r, 80));
  }
}
async function newListingAction() {
  await flushCurrent();
  S.listing = newListing(S.listing.brand, S.listing.category);
  S.target = null; S.dirty = false; S.lastSaved = null;
  setTab('images', true);
  renderAll();
  toast('New listing — it saves as soon as you type');
}
function duplicateData(src) {
  const d = clone(src);
  const now = Date.now();
  d.id = uid('L'); d.createdAt = now; d.updatedAt = now;
  d.name = (src.name || src.fields.modelNumber || 'Untitled listing') + ' (copy)'; d.nameCustom = true;
  return d;
}
function allImageIds(l) {
  const ids = new Set();
  for (const s of l.images || []) if (s.imgId) ids.add(s.imgId);
  for (const v of l.variants || []) for (const s of v.images || []) if (s.imgId) ids.add(s.imgId);
  return [...ids];
}
async function copyImagesTo(src, dstId) {
  for (const id of allImageIds(src)) {
    let payload = S.imgData[id] ? { d: S.imgData[id] } : await Store.loadImage(src.id, id);
    if (payload && payload.d) await Store.saveImage(dstId, id, { d: payload.d, w: payload.w || null, h: payload.h || null });
  }
}
async function saveAsCopy() {
  await flushCurrent();
  const src = S.listing;
  const d = duplicateData(src);
  S.listing = normalizeListing(d);
  S.target = null;
  S.dirty = true;
  await saveNow(false);
  await copyImagesTo(src, d.id);
  renderAll();
  toast('Copy saved. You are now editing the copy.', 1800);
}
async function openListing(id, quiet) {
  if (S.listing && id === S.listing.id) return;
  await flushCurrent();
  let data = null;
  try { data = await Store.loadListing(id); } catch (e) { data = null; }
  if (!data) { if (!quiet) toast('Could not open that listing', 2000); return false; }
  S.listing = normalizeListing(data);
  S.target = null; S.dirty = false; S.lastSaved = S.listing.updatedAt; S.saveErr = null;
  lsSet('fls:last', id);
  renderAll();
  loadImagesFor(S.listing);
  return true;
}
async function loadImagesFor(l) {
  const ids = allImageIds(l).filter((id) => !S.imgData[id]);
  let changed = false;
  for (const id of ids) {
    const p = await Store.loadImage(l.id, id);
    if (p && p.d) { S.imgData[id] = p.d; S.imgStored[id] = true; changed = true; }
  }
  if (changed && S.listing === l) { renderPreview(); if (S.tab === 'images') rerenderPanel(); }
}

/* ---------- saved listings drawer ---------- */
function openSavedDrawer() {
  const st = { q: '', brand: '', category: '', sort: 'updated', renaming: null };
  const list = h('div', { class: 'saved-list' });
  const draw = () => {
    clear(list);
    let rows = S.index.slice();
    const q = st.q.toLowerCase();
    if (q) rows = rows.filter((m) => (m.name + ' ' + (m.modelNumber || '')).toLowerCase().includes(q));
    if (st.brand) rows = rows.filter((m) => m.brand === st.brand);
    if (st.category) rows = rows.filter((m) => m.category === st.category);
    rows.sort((a, b) => st.sort === 'name' ? String(a.name).localeCompare(String(b.name)) : st.sort === 'created' ? (b.createdAt || 0) - (a.createdAt || 0) : (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!rows.length) {
      list.append(h('div', { class: 'empty' }, S.index.length ? 'No listings match these filters.' : 'No saved listings yet. Start typing in any field and the listing saves itself.'));
      return;
    }
    for (const m of rows) {
      const isCur = S.listing && m.id === S.listing.id;
      const nameEl = st.renaming === m.id
        ? h('form', { class: 'row', onSubmit: (e) => { e.preventDefault(); renameListing(m.id, e.target.querySelector('input').value).then(() => { st.renaming = null; draw(); }); } },
          h('input', { class: 'inp sm grow', value: m.name, 'aria-label': 'Listing name' }), h('button', { class: 'btn btn-sm btn-primary', type: 'submit' }, 'Rename'), h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => { st.renaming = null; draw(); } }, 'Cancel'))
        : h('div', { class: 'nm' }, m.name || 'Untitled listing', isCur ? h('span', { class: 'tag blue', style: { marginLeft: '8px' } }, 'Open now') : null);
      const c = getCat(m.category);
      list.append(h('div', { class: 'saved-card' + (isCur ? ' cur' : '') },
        h('div', { class: 'stack', style: { gap: '6px' } }, nameEl,
          h('div', { class: 'meta' },
            h('span', null, h('b', null, m.brand)), h('span', null, c ? c.name : m.category),
            h('span', null, h('b', null, m.variantCount || 0), ' variants'),
            h('span', null, h('span', { class: 'pct-bar' }, h('i', { style: { width: (m.completion || 0) + '%' } })), ' ', h('b', null, (m.completion || 0) + '%'))),
          h('div', { class: 'meta' }, h('span', null, 'Created ', h('b', null, Logic.fmtDateTime(m.createdAt))), h('span', null, 'Last updated ', h('b', null, Logic.fmtDateTime(m.updatedAt))))),
        h('div', { class: 'acts' },
          h('button', { class: 'btn btn-sm btn-primary', type: 'button', onClick: async () => { const ok = await openListing(m.id); if (ok !== false) d.close(); } }, 'Open'),
          h('button', { class: 'btn btn-sm', type: 'button', onClick: async (e) => { await duplicateFromIndex(m.id); draw(); } }, 'Duplicate'),
          h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { st.renaming = m.id; draw(); } }, 'Rename'),
          h('button', { class: 'btn btn-sm btn-danger', type: 'button', onClick: (e) => confirmPop(e.currentTarget, 'Delete “' + (m.name || 'Untitled listing') + '” and its images? This cannot be undone.', async () => { await deleteListingAction(m.id); draw(); }) }, 'Delete'))));
    }
  };
  const tools = h('div', { class: 'saved-tools' },
    h('input', { class: 'inp', type: 'search', placeholder: 'Search by name or model number', 'aria-label': 'Search listings', onInput: (e) => { st.q = e.target.value; draw(); } }),
    h('select', { class: 'sel', style: { width: 'auto' }, 'aria-label': 'Filter by brand', onChange: (e) => { st.brand = e.target.value; draw(); } }, h('option', { value: '' }, 'All brands'), [...new Set(S.settings.brands.map((b) => b.name).concat(S.index.map((m) => m.brand)))].filter(Boolean).map((b) => h('option', { value: b }, b))),
    h('select', { class: 'sel', style: { width: 'auto' }, 'aria-label': 'Filter by category', onChange: (e) => { st.category = e.target.value; draw(); } }, h('option', { value: '' }, 'All categories'), catIds().map((id) => h('option', { value: id }, getCat(id).name))),
    h('select', { class: 'sel', style: { width: 'auto' }, 'aria-label': 'Sort', onChange: (e) => { st.sort = e.target.value; draw(); } }, h('option', { value: 'updated' }, 'Last updated'), h('option', { value: 'created' }, 'Created'), h('option', { value: 'name' }, 'Name')));
  const d = openDrawer({ title: 'Saved Listings', headExtra: h('span', { class: 'muted small' }, S.index.length + ' saved'), body: h('div', null, tools, list) });
  draw();
}
async function renameListing(id, name) {
  name = String(name || '').trim();
  if (!name) return;
  if (S.listing.id === id) { S.listing.name = name; S.listing.nameCustom = true; markDirty(); await saveNow(false); renderStepper(); return; }
  const data = await Store.loadListing(id);
  if (!data) return;
  data.name = name; data.nameCustom = true; data.updatedAt = Date.now();
  const l = normalizeListing(data);
  await Store.saveListing(listingForSave(l), metaOf(l));
  upsertIndex(Object.assign({ id }, metaOf(l)));
  toast('Renamed');
}
async function duplicateFromIndex(id) {
  if (S.listing.id === id) await flushCurrent();
  const src = S.listing.id === id ? S.listing : normalizeListing(await Store.loadListing(id));
  if (!src) return;
  const d = normalizeListing(duplicateData(src));
  await Store.saveListing(listingForSave(d), metaOf(d));
  upsertIndex(Object.assign({ id: d.id }, metaOf(d)));
  await copyImagesTo(src, d.id);
  toast('Duplicated');
}
async function deleteListingAction(id) {
  await Store.deleteListing(id);
  S.index = S.index.filter((m) => m.id !== id);
  if (S.listing.id === id) {
    S.listing = newListing(S.listing.brand, S.listing.category);
    S.target = null; S.dirty = false; S.lastSaved = null;
    renderAll();
  }
  toast('Deleted');
}

/* ---------- storage note ---------- */
function renderStoreNote() {
  const n = S.el.note;
  if (S.storeMode === 'local') { n.hidden = false; n.textContent = 'Saves live in this browser only. Clearing site data or switching device will not carry them over.'; }
  else if (S.storeMode === 'memory') { n.hidden = false; n.textContent = 'Storage is unavailable in this view, so nothing will be kept after you close the page.'; }
  else n.hidden = true;
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveNow(true); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.dirty) saveNow(false); });

/* ---------- boot ---------- */
function mergeSettings(s) {
  const d = DEFAULT_SETTINGS();
  const out = Object.assign(d, s);
  if (!Array.isArray(out.brands) || !out.brands.length) out.brands = DEFAULT_SETTINGS().brands;
  if (!Array.isArray(out.hsn)) out.hsn = DEFAULT_SETTINGS().hsn;
  if (!Array.isArray(out.presets) || !out.presets.length) out.presets = DEFAULT_SETTINGS().presets;
  out.categories = out.categories || {};
  return out;
}
async function initAI() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const s = await window.claude.use('sample');
    if (!s) return;
    S.ai = s; S.aiOk = true;
    rerenderPanel();
  } catch (e) { /* AI stays off */ }
}
async function boot() {
  applyTheme();
  S.listing = newListing('Tapsa', 'faucet');
  buildShell();
  renderAll();
  initAI();
  const mode = await Store.init();
  S.storeMode = mode;
  try { const s = await Store.loadSettings(); if (s) S.settings = mergeSettings(s); } catch (e) { /* defaults */ }
  try { S.index = await Store.listMeta(); } catch (e) { S.index = []; }
  renderStoreNote();
  if (!S.dirty && S.index.length) {
    const last = lsGet('fls:last');
    const pick = S.index.find((m) => m.id === last) || S.index.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (pick) await openListing(pick.id, true);
  }
  renderAll();
  if (S.dirty) saveNow(false);
}
