/* ==========================================================================
   Tabs — Image addition · Price, Stock and Shipping · Product / Additional Description
   ========================================================================== */
function secCard(title, countKey, extraHead) {
  const body = h('div', { class: 'sec-body' });
  const el = h('div', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h3', null, title), countKey ? h('span', { class: 'sec-count', dataset: { count: countKey } }) : null, h('span', { class: 'grow' }), extraHead || null), body);
  return { el, body };
}

/* ---------- Image addition ---------- */
function slotLabel(i) {
  const c = cat();
  const labels = c.imageLabels && c.imageLabels.length ? c.imageLabels : ['Image'];
  return labels[Math.min(i, labels.length - 1)];
}
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function compressImage(img, maxBytes) {
  const sizes = [1200, 1000, 800, 640, 480];
  const qs = [0.82, 0.72, 0.62];
  for (const side of sizes) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), hh = Math.max(1, Math.round(img.naturalHeight * scale));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    const g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh); g.drawImage(img, 0, 0, w, hh);
    for (const q of qs) { const d = cv.toDataURL('image/jpeg', q); if (d.length <= maxBytes) return d; }
  }
  return null;
}
function imageRefCount(l, imgId) {
  let n = 0;
  for (const s of l.images) if (s.imgId === imgId) n++;
  for (const v of l.variants) for (const s of v.images || []) if (s.imgId === imgId) n++;
  return n;
}
function editableSlots() {
  const v = curVariant();
  if (!v) return S.listing.images;
  if (!v.images) v.images = clone(S.listing.images);
  return v.images;
}
async function putImage(slotIndex, file) {
  if (!file || !/^image\//.test(file.type)) { toast('Choose an image file (JPG, PNG or WebP)', 2000); return; }
  const l = S.listing;
  const slots = editableSlots();
  const slot = slots[slotIndex];
  let url, img;
  try { url = await readAsDataURL(file); img = await loadImg(url); } catch (e) { toast('That image could not be read', 2000); return; }
  const old = slot.imgId;
  const imgId = uid('img');
  slot.imgId = imgId; slot.w = img.naturalWidth; slot.h = img.naturalHeight; slot.name = file.name;
  const small = S.storeMode === 'db' || S.storeMode === 'local' ? compressImage(img, 230000) : null;
  S.imgData[imgId] = small || url;
  S.imgStored[imgId] = small ? await Store.saveImage(l.id, imgId, { d: small, w: slot.w, h: slot.h }) : false;
  if (old && imageRefCount(l, old) === 0) Store.deleteImage(l.id, old);
  markDirty(); rerenderPanel();
}
function removeImage(i) {
  const l = S.listing;
  const slots = editableSlots();
  const old = slots[i].imgId;
  Object.assign(slots[i], { imgId: null, w: null, h: null, name: '' });
  if (old && imageRefCount(l, old) === 0) Store.deleteImage(l.id, old);
  markDirty(); rerenderPanel();
}
function renderImagesTab(panel) {
  const l = S.listing, v = curVariant(), c = cat();
  const slots = imagesOf(l, v);
  const min = c.imageMin || 1100;
  const toggle = h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: (l.imageSlots || 5) === 10, onChange: (e) => {
    if (e.target.checked) { l.imageSlots = 10; while (l.images.length < 10) l.images.push(imageSlotsFor(1)[0]); for (const vv of l.variants) if (vv.images) while (vv.images.length < 10) vv.images.push(imageSlotsFor(1)[0]); }
    else {
      const busy = l.images.slice(5).some((s) => s.imgId) || l.variants.some((vv) => (vv.images || []).slice(5).some((s) => s.imgId));
      if (busy) { e.target.checked = true; toast('Remove the images in slots 6–10 first', 2200); return; }
      l.imageSlots = 5; l.images = l.images.slice(0, 5); for (const vv of l.variants) if (vv.images) vv.images = vv.images.slice(0, 5);
    }
    markDirty(); rerenderPanel();
  } }), 'Enable up to 10');
  const card = secCard('Image addition', 'images', toggle);
  const notes = [];
  if (v && !v.images) notes.push(h('div', { class: 'info-box' }, 'This variant shows the master’s images. Adding or changing one here gives the variant its own set.'));
  if (S.storeMode === 'memory') notes.push(h('div', { class: 'info-box' }, 'Images are preview-only in this view. Slot notes are kept with the listing when storage is available.'));
  else notes.push(h('div', { class: 'hint' }, 'Images are for planning and preview. Each one is compressed and kept with the listing when it fits the storage limit; otherwise only the slot note is kept and the slot says so.'));
  const grid = h('div', { class: 'img-grid' });
  slots.forEach((s, i) => {
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onChange: (e) => putImage(i, e.target.files[0]) });
    const data = s.imgId ? S.imgData[s.imgId] : null;
    const drop = h('div', { class: 'drop', tabindex: '0', role: 'button', 'aria-label': 'Add image to ' + slotLabel(i),
      onClick: () => file.click(), onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } },
    data ? h('img', { src: data, alt: slotLabel(i) }) : s.imgId ? h('div', { class: 'ph' }, icon('image'), 'Image not stored', h('br'), 'drop it again to preview') : h('div', { class: 'ph' }, icon('upload'), 'Drop image or click'));
    const slotEl = h('div', { class: 'img-slot', dataset: { i } },
      h('div', { class: 'img-slot-head' }, h('span', { class: 'drag', title: 'Drag to reorder' }, icon('drag')),
        h('span', { class: 'grow' }, (i + 1) + '. ' + slotLabel(i), i === 0 ? h('span', { class: 'req' }, ' *') : null),
        s.imgId ? iconBtn('trash', 'Remove image', () => removeImage(i), 'sm') : null),
      file, drop,
      h('div', { class: 'img-meta' },
        s.w ? h('span', { class: 'mono' }, s.w + ' × ' + s.h + ' px') : null,
        s.w && (s.w < min || s.h < min) ? h('span', { class: 'tag amber', title: 'Flipkart minimum for this category' }, 'Under ' + min + '×' + min) : null,
        s.imgId ? (S.imgStored[s.imgId] === false ? h('span', { class: 'tag', title: 'Too large for storage, or storage unavailable' }, 'Preview only') : S.imgData[s.imgId] ? h('span', { class: 'tag green' }, 'Kept') : null) : null,
        i === 0 && c.id === 'faucet' ? h('span', { class: 'hint' }, 'Must be first') : null),
      h('textarea', { class: 'inp', rows: 2, placeholder: 'What this image must communicate', 'aria-label': 'Note for ' + slotLabel(i), value: s.note || '',
        onInput: (e) => { editableSlots()[i].note = e.target.value; markDirty(); } }));
    slotEl.addEventListener('dragover', (e) => { e.preventDefault(); slotEl.classList.add('drag-over'); });
    slotEl.addEventListener('dragleave', () => slotEl.classList.remove('drag-over'));
    slotEl.addEventListener('drop', (e) => { e.preventDefault(); slotEl.classList.remove('drag-over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) putImage(i, f); });
    grid.append(slotEl);
  });
  makeSortable(grid, { item: '.img-slot', handle: '.img-slot-head .drag', onEnd: (a, b) => { moveItem(editableSlots(), a, b); markDirty(); rerenderPanel(); } });
  card.body.classList.add('pad');
  card.body.append(h('div', { class: 'stack' }, notes, grid));
  panel.append(card.el);
}

/* ---------- Price, Stock and Shipping ---------- */
FIELD_BUILDERS.sku = function (ctx) {
  FIELD_BUILDERS.text(ctx);
  ctx.input.classList.add('mono');
  if (curVariant()) { ctx.body.append(h('div', { class: 'hint' }, 'Built from the master SKU with this variant’s replace tokens.')); return; }
  const l = S.listing;
  let open = false;
  const holder = h('div');
  const btn = h('button', { class: 'btn btn-xs', type: 'button', onClick: () => { open = !open; draw(); } }, 'SKU builder');
  ctx.body.append(h('div', { class: 'row' }, btn, h('span', { class: 'hint' }, 'Segments joined with “-”, e.g. T-SSM-AQL-SLK-FAD-FD-48X4-D-32-H-75-PC-1')), holder);
  function draw() {
    clear(holder);
    btn.textContent = open ? 'Close SKU builder' : 'SKU builder';
    if (!open) return;
    const segs = l.skuSegments;
    const out = h('div', { class: 'sku-out' });
    const ctr = h('span', { class: 'ctr' });
    const upd = () => { const j = Logic.joinSku(segs); out.textContent = j || '—'; setCtr(ctr, j.length, 64); };
    const list = h('div', { class: 'sku-segs' });
    segs.forEach((sg, i) => {
      list.append(h('div', { class: 'sku-seg' },
        h('div', { class: 'lab' }, h('span', { class: 'drag', title: 'Drag to reorder' }, icon('drag')), h('input', { value: sg.label, 'aria-label': 'Segment name', onInput: (e) => { sg.label = e.target.value; markDirty(); } }),
          h('button', { class: 'icon-btn sm', type: 'button', title: 'Remove segment', 'aria-label': 'Remove segment', onClick: () => { segs.splice(i, 1); markDirty(); draw(); } }, icon('x'))),
        h('input', { class: 'inp', value: sg.value, 'aria-label': sg.label + ' value', onInput: (e) => { sg.value = e.target.value.trim(); upd(); markDirty(); } })));
    });
    list.append(h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { segs.push({ id: uid('sg'), label: 'Segment', value: '' }); markDirty(); draw(); } }, icon('plus', 12), 'Segment'));
    makeSortable(list, { item: '.sku-seg', handle: '.drag', onEnd: (a, b) => { moveItem(segs, a, b); markDirty(); draw(); } });
    holder.append(h('div', { class: 'sku-builder' }, list,
      h('div', { class: 'row nowrap' }, out, ctr, copyBtn(() => Logic.joinSku(segs)),
        h('button', { class: 'btn btn-sm btn-primary', type: 'button', onClick: () => { ctx.set(Logic.joinSku(segs)); ctx.refresh(); afterChange(ctx); toast('SKU applied'); } }, 'Apply to SKU'))));
    upd();
  }
};
function moneyInput(ctx) {
  const inp = h('input', { class: 'inp', id: ctx.id, inputmode: 'decimal', value: ctx.get() ?? '', autocomplete: 'off', onInput: () => { ctx.set(inp.value.trim()); afterChange(ctx); } });
  ctx.input = inp;
  ctx.refresh = () => { if (document.activeElement !== inp) inp.value = ctx.get() ?? ''; };
  return h('div', { class: 'inp-group' }, h('span', { class: 'addon pre' }, '₹'), inp);
}
FIELD_BUILDERS.mrp = function (ctx) {
  const chipRow = h('div', { class: 'row' });
  ctx.body.append(moneyInput(ctx), chipRow);
  ctx.tools.append(copyBtn(() => ctx.get() ?? ''));
  ctx.live = () => {
    clear(chipRow);
    const sp = getVal('sp');
    const rec = Logic.recommendedMrp(sp);
    const off = Logic.discountPct(ctx.get(), sp);
    if (rec) chipRow.append(h('button', { class: 'price-chip', type: 'button', title: 'Selling price ÷ 0.2, rounded to the closest price ending in 99. Click to apply.', onClick: () => { ctx.set(String(rec)); ctx.refresh(); afterChange(ctx); toast('Recommended MRP applied'); } }, 'Recommended MRP ' + Logic.fmtINR(rec), h('span', { class: 'raw' }, 'SP ÷ 0.2')));
    else chipRow.append(h('span', { class: 'hint' }, 'Enter the selling price to see the recommended MRP.'));
    if (off !== null) chipRow.append(h('span', { class: 'disc-pill', title: 'Discount shown on Flipkart' }, off + '% off'));
    else if (Logic.num(ctx.get()) > 0 && Logic.num(sp) > Logic.num(ctx.get())) chipRow.append(h('span', { class: 'tag amber' }, 'Selling price is above MRP'));
  };
  ctx.live();
};
FIELD_BUILDERS.sp = function (ctx) {
  const chipRow = h('div', { class: 'row' });
  ctx.body.append(moneyInput(ctx), chipRow);
  ctx.tools.append(copyBtn(() => ctx.get() ?? ''));
  ctx.live = () => {
    clear(chipRow);
    const b = Logic.benchmarkPrice(ctx.get());
    if (b) chipRow.append(h('span', { class: 'price-chip bench', title: 'Selling price ÷ 0.75, rounded to the closest price ending in 99' }, 'Benchmark price ' + Logic.fmtINR(b.rounded), h('span', { class: 'raw' }, 'raw ' + b.raw.toLocaleString('en-IN')), copyBtn(() => String(b.rounded), 'Copy benchmark price', true)));
  };
  ctx.live();
};
FIELD_BUILDERS.sla = function (ctx) {
  const unit = h('span', { class: 'addon' });
  const inp = h('input', { class: 'inp', id: ctx.id, inputmode: 'numeric', value: ctx.get() ?? '', onInput: () => { ctx.set(inp.value.trim()); afterChange(ctx); } });
  ctx.body.append(h('div', { class: 'inp-group' }, inp, unit));
  ctx.tools.append(copyBtn(() => ctx.get() ?? ''));
  ctx.live = () => { unit.textContent = getVal('procType') === 'express' ? 'hours' : 'days'; };
  ctx.live();
};
function unitNumber(ctx, units, unitKey, toStore, fromStore) {
  const l = S.listing;
  const u = l.ui[unitKey] || units[0];
  const shown = (v) => { const n = Logic.num(v); return isFinite(n) ? String(fromStore(n, u)) : (v ?? ''); };
  const inp = h('input', { class: 'inp', id: ctx.id, inputmode: 'decimal', value: shown(ctx.get()),
    onInput: () => { const n = Logic.num(inp.value); ctx.set(inp.value.trim() === '' ? '' : isFinite(n) ? String(toStore(n, l.ui[unitKey] || units[0])) : inp.value.trim()); afterChange(ctx); } });
  const seg = h('div', { class: 'seg' }, units.map((x) => h('button', { type: 'button', class: (l.ui[unitKey] || units[0]) === x ? 'on' : '', onClick: () => { l.ui[unitKey] = x; markDirty(); rerenderPanel(); } }, x)));
  ctx.body.append(h('div', { class: 'inp-group' }, inp, seg));
  ctx.tools.append(h('span', { class: 'ctr', title: 'Stored and copied in ' + units[0] }, units[0]), copyBtn(() => ctx.get() ?? ''));
  ctx.input = inp;
}
FIELD_BUILDERS.dim = (ctx) => unitNumber(ctx, ['cm', 'inch'], 'dimUnit', (n, u) => (u === 'inch' ? Logic.inToCm(n) : n), (n, u) => (u === 'inch' ? Logic.cmToIn(n) : n));
FIELD_BUILDERS.wt = (ctx) => unitNumber(ctx, ['kg', 'g'], 'wtUnit', (n, u) => (u === 'g' ? Math.round(n) / 1000 : n), (n, u) => (u === 'g' ? Math.round(n * 1000 * 100) / 100 : n));
FIELD_BUILDERS.hsn = function (ctx) {
  const cur = ctx.get() || '';
  const lib = S.settings.hsn || [];
  const sel = h('select', { class: 'sel', id: ctx.id, value: cur, onChange: () => { ctx.set(sel.value); afterChange(ctx); } },
    h('option', { value: '' }, 'Select HSN'), lib.map((x) => h('option', { value: x.code }, x.code + ' — ' + x.desc)),
    cur && !lib.some((x) => x.code === cur) ? h('option', { value: cur }, cur) : null);
  const add = h('button', { class: 'btn btn-sm', type: 'button', onClick: () => promptPop(add, 'Add HSN to library', [{ name: 'code', label: 'HSN code', placeholder: 'e.g. 84818020' }, { name: 'desc', label: 'Description', placeholder: 'What this code covers' }], (v) => {
    if (!/^\d{4,8}$/.test(v.code)) { toast('HSN codes are 4–8 digits'); return false; }
    if (lib.some((x) => x.code === v.code)) { toast('Already in the library'); return false; }
    S.settings.hsn.push({ code: v.code, desc: v.desc || '' }); saveSettingsSoon();
    ctx.set(v.code); rerenderPanel(); toast('HSN added');
  }) }, icon('plus', 12), 'Add HSN');
  ctx.body.append(h('div', { class: 'row nowrap' }, h('div', { class: 'grow' }, sel), add));
  ctx.tools.append(h('span', { class: 'ctr', title: 'Copy gives the code only' }, 'code'), copyBtn(() => ctx.get() || '', 'Copy HSN code'));
};
FIELD_BUILDERS.preset = function (ctx) {
  const cur = ctx.get() || '';
  const presets = S.settings.presets || [];
  const text = h('div', { class: 'hint', style: { whiteSpace: 'pre-wrap' } });
  const showText = () => { const p = presets.find((x) => x.id === (ctx.get() || '')); text.textContent = p ? p.text : ''; };
  const sel = h('select', { class: 'sel', id: ctx.id, value: cur, onChange: () => { ctx.set(sel.value); showText(); afterChange(ctx); } },
    h('option', { value: '' }, 'Select preset'), presets.map((p) => h('option', { value: p.id }, p.label)));
  const add = h('button', { class: 'btn btn-sm', type: 'button', onClick: () => promptPop(add, 'Add address preset', [{ name: 'label', label: 'Preset name', placeholder: 'e.g. Factory, Kundli' }, { name: 'text', label: 'Full details as Flipkart should show them', type: 'textarea', placeholder: 'Name, address, PIN, contact number' }], (v) => {
    if (!v.label || !v.text) { toast('Enter a name and the full details'); return false; }
    const p = { id: uid('preset'), label: v.label, text: v.text };
    S.settings.presets.push(p); saveSettingsSoon();
    ctx.set(p.id); rerenderPanel(); toast('Preset added');
  }) }, icon('plus', 12), 'Add preset');
  ctx.body.append(h('div', { class: 'row nowrap' }, h('div', { class: 'grow' }, sel), add), text);
  ctx.tools.append(copyBtn(() => displayValue(ctx.def, ctx.get())));
  showText();
};
function volumetricPanel() {
  const el = h('div', { class: 'vol-panel', dataset: { vol: '1' } });
  fillVol(el);
  return el;
}
function fillVol(el) {
  clear(el);
  const w = Logic.shippingWeights(getVal('length'), getVal('breadth'), getVal('height'), getVal('weight'));
  const kg = (n) => (n === null || n === undefined ? '—' : (Math.round(n * 1000) / 1000).toLocaleString('en-IN') + ' kg');
  el.append(
    h('div', { class: 'vol-cell' + (w && w.which === 'dead' ? ' charge' : '') }, h('span', null, 'Dead weight'), h('b', null, w ? kg(w.dead) : '—')),
    h('div', { class: 'vol-cell' + (w && w.which === 'volumetric' ? ' charge' : '') }, h('span', null, 'Volumetric (L×B×H ÷ 5000)'), h('b', null, w ? kg(w.vol) : '—')),
    h('div', { class: 'vol-cell' }, h('span', null, 'Chargeable · slab'), h('b', null, w ? kg(w.chargeable) + ' · ' + w.slab + ' kg' : '—')));
  let tip = 'Enter length, breadth and height in cm and the weight in kg. The higher of dead and volumetric weight is charged.';
  if (w && w.inflating) {
    const maxVol = w.deadSlab * 5000;
    tip = 'The box size is pushing this into the ' + w.slab + ' kg slab (dead weight alone is ' + w.deadSlab + ' kg). Keep L × B × H under ' + maxVol.toLocaleString('en-IN') + ' cm³ to stay in the ' + w.deadSlab + ' kg slab.';
  } else if (w && w.vol !== null && w.dead !== null) tip = (w.which === 'dead' ? 'Dead weight is chargeable. The box size is not adding cost.' : 'Volumetric weight is chargeable but stays in the same slab as the dead weight.');
  el.append(h('div', { class: 'vol-tip' }, tip));
}
function priceLive() {
  for (const ctx of S.fieldEls) if (ctx.live) ctx.live();
  const v = S.el.panel.querySelector('[data-vol]');
  if (v) fillVol(v);
}
function renderPriceTab(panel) {
  const c = cat();
  const card = secCard('Price, Stock and Shipping Information', 'price');
  for (const s of coreSections(c)) {
    card.body.append(h('div', { class: 'subsec-title' }, s.name, h('span', { class: 'sec-count', dataset: { count: 'sec:core:' + s.name } })));
    for (const f of s.fields) card.body.append(fieldRow(f));
    if (s.volumetric) card.body.append(volumetricPanel());
  }
  panel.append(card.el);
}

/* ---------- Product / Additional Description ---------- */
function renderDescTab(panel, tab) {
  const c = cat();
  const fs = tab === 'pd' ? pdFields(c) : adFields(c);
  const card = secCard(tab === 'pd' ? 'Product Description' : 'Additional Description (Optional)', tab);
  if (tab === 'pd') {
    card.body.append(h('div', { class: 'info-box', style: { margin: '10px 0 4px' } },
      h('b', null, 'Auto-title formula: '), h('span', { class: 'mono' }, c.titleFormula),
      c.titleVerified ? null : h('span', { class: 'tag amber', style: { marginLeft: '6px' } }, 'Unverified — edit in Category Builder'),
      ' ', h('button', { class: 'btn btn-xs btn-ghost', type: 'button', onClick: () => setTab('lab') }, 'Build it in the Lab →')));
  }
  const sections = [];
  for (const f of fs) { const s = f.section || ''; if (!sections.includes(s)) sections.push(s); }
  for (const s of sections) {
    if (s) card.body.append(h('div', { class: 'subsec-title' }, s, h('span', { class: 'sec-count', dataset: { count: 'sec:' + tab + ':' + s } })));
    for (const f of fs.filter((x) => (x.section || '') === s)) card.body.append(fieldRow(f));
  }
  if (!fs.length) card.body.append(h('div', { class: 'empty', style: { margin: '12px 0' } }, 'No fields in this tab yet. Add them in the Category Builder.'));
  panel.append(card.el);
}
