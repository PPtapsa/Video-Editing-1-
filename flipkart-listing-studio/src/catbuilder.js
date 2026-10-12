/* ==========================================================================
   Category Builder — edit built-ins (with reset) and add new categories
   ========================================================================== */
function slugKey(label) {
  return (String(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'field') + '_' + Math.random().toString(36).slice(2, 6);
}
function newCategoryDraft() {
  return {
    id: 'cat_' + Math.random().toString(36).slice(2, 8), name: 'New category', builtin: false, skuCode: '',
    imageLabels: ['Image'], imageMin: 1100, handlingFees: true, coreExtras: [],
    titleFormula: '{Model Number}', titleVerified: false, seoField: 'modelNumber', stepped: false,
    variantAxis: [], variantCols: null, colLabels: { fulfilledBy: 'Fullfilment by' },
    fields: [
      { key: 'modelNumber', label: 'Model Number', type: 'text', tab: 'pd', section: '', req: true, title: true, limit: 80 },
      { key: 'description', label: 'Description', type: 'long', tab: 'ad', section: 'General', limit: 5000 },
      { key: 'searchKeywords', label: 'Search Keywords', type: 'fktm', tab: 'ad', section: 'General' }
    ]
  };
}
function openCategoryBuilder(id, isNew) {
  let W = null, selId = null, openField = null, curSync = () => {};
  const left = h('div', { class: 'cb-cats' });
  const right = h('div', { class: 'stack', style: { minWidth: 0 } });
  const select = (cid, draft) => {
    selId = cid;
    W = draft || clone(getCat(cid));
    openField = null;
    drawLeft(); drawRight();
  };
  function drawLeft() {
    clear(left);
    for (const cid of catIds()) {
      const c = getCat(cid);
      left.append(h('button', { class: 'cb-cat' + (cid === selId ? ' on' : ''), type: 'button', onClick: () => select(cid) }, c.name,
        c.builtin ? (S.settings.categories[cid] ? h('span', { class: 'tag amber' }, 'edited') : h('span', { class: 'tag' }, 'built-in')) : h('span', { class: 'tag teal' }, 'custom')));
    }
    if (W && !getCat(W.id)) left.append(h('button', { class: 'cb-cat on', type: 'button' }, W.name, h('span', { class: 'tag blue' }, 'new')));
    left.append(h('button', { class: 'btn btn-sm', type: 'button', style: { marginTop: '8px' }, onClick: () => select(null, newCategoryDraft()) }, icon('plus', 12), 'Add category'));
  }
  function fieldEditor(f, list, i) {
    const isOpen = openField === f;
    const typeSel = h('select', { class: 'sel sm', 'aria-label': 'Field type', value: f.type, onChange: (e) => { f.type = e.target.value; if ((f.type === 'single' || f.type === 'multi') && !f.options) f.options = []; drawRight(); } }, FIELD_TYPES.map(([k, lab]) => h('option', { value: k }, lab)),
      ['sku', 'mrp', 'sp', 'sla', 'dim', 'wt', 'hsn', 'preset', 'money'].includes(f.type) ? h('option', { value: f.type }, f.type) : null);
    const row = h('div', { class: 'cb-field' + (isOpen ? ' open' : '') },
      h('span', { class: 'drag', title: 'Drag to reorder' }, icon('drag')),
      h('input', { class: 'inp sm', value: f.label, 'aria-label': 'Field name', onInput: (e) => { f.label = e.target.value; } }),
      h('div', { class: 'opt-col' }, typeSel),
      h('input', { class: 'inp sm opt-col', value: f.limit || '', placeholder: 'limit', title: 'Character limit', 'aria-label': 'Character limit', inputmode: 'numeric', onInput: (e) => { const n = parseInt(e.target.value, 10); if (n > 0) f.limit = n; else delete f.limit; } }),
      h('label', { class: 'check small opt-col', title: 'Mandatory' }, h('input', { type: 'checkbox', checked: !!f.req, onChange: (e) => { f.req = e.target.checked; } }), 'Req'),
      h('label', { class: 'check small opt-col', title: 'Makes up the title' }, h('input', { type: 'checkbox', checked: !!f.title, onChange: (e) => { f.title = e.target.checked; } }), 'Title'),
      h('button', { class: 'btn btn-xs opt-col', type: 'button', onClick: () => { openField = isOpen ? null : f; drawRight(); } }, isOpen ? 'Less' : 'More'),
      iconBtn('trash', 'Delete field', () => { list.splice(i, 1); curSync(); if (W.seoField === f.key) W.seoField = 'modelNumber'; W.variantAxis = (W.variantAxis || []).filter((k) => k !== f.key); drawRight(); }, 'sm'));
    if (isOpen) {
      row.append(h('div', { class: 'more' },
        f.core ? null : h('label', { class: 'lbl-stack' }, 'Tab', h('select', { class: 'sel sm', value: f.tab, onChange: (e) => { f.tab = e.target.value; drawRight(); } }, h('option', { value: 'pd' }, 'Product Description'), h('option', { value: 'ad' }, 'Additional Description'))),
        f.core ? null : h('label', { class: 'lbl-stack' }, 'Section', h('input', { class: 'inp sm', value: f.section || '', placeholder: 'e.g. General', onInput: (e) => { f.section = e.target.value; } })),
        h('label', { class: 'lbl-stack' }, 'Unit', h('input', { class: 'inp sm', value: f.unit || '', placeholder: 'cm, kg, l/min…', onInput: (e) => { f.unit = e.target.value || undefined; } })),
        f.type === 'multi' ? h('label', { class: 'lbl-stack' }, 'Max selections', h('input', { class: 'inp sm', value: f.max || '', inputmode: 'numeric', onInput: (e) => { const n = parseInt(e.target.value, 10); if (n > 0) f.max = n; else delete f.max; } })) : null,
        f.type === 'multi' ? h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: !!f.exactOne, onChange: (e) => { f.exactOne = e.target.checked; } }), 'Exactly one') : null,
        f.type === 'multi' ? h('label', { class: 'lbl-stack' }, 'Combined label limit', h('input', { class: 'inp sm', value: f.combinedLimit || '', inputmode: 'numeric', onInput: (e) => { const n = parseInt(e.target.value, 10); if (n > 0) f.combinedLimit = n; else delete f.combinedLimit; } })) : null,
        f.type === 'single' || f.type === 'multi' ? h('label', { class: 'lbl-stack', style: { gridColumn: '1 / -1' } }, 'Options (one per line)', h('textarea', { class: 'inp', rows: 5, value: (f.options || []).join('\n'), onInput: (e) => { f.options = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); } })) : null,
        h('div', { class: 'hint', style: { gridColumn: '1 / -1' } }, 'Key: ', h('span', { class: 'mono' }, f.key), ' — values are stored by key, so renaming keeps existing data.')));
    }
    return row;
  }
  function fieldList(list, title, addTo) {
    const box = h('div', { class: 'cb-fields' });
    list.forEach((f, i) => box.append(fieldEditor(f, list, i)));
    makeSortable(box, { item: '.cb-field', handle: '.drag', onEnd: (a, b) => { moveItem(list, a, b); curSync(); drawRight(); } });
    return h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('b', null, title), h('span', { class: 'hint' }, list.length + ' fields'), h('span', { class: 'grow' }),
        h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { const f = addTo(); openField = f; drawRight(); } }, icon('plus', 12), 'Add field')),
      box);
  }
  function drawRight() {
    clear(right);
    if (!W) return;
    const pd = W.fields.filter((f) => f.tab === 'pd');
    const ad = W.fields.filter((f) => f.tab === 'ad');
    const syncFields = () => { W.fields = pd.concat(ad); };
    curSync = syncFields;
    const allF = coreFields(W).concat(W.fields);
    const formulaInp = h('input', { class: 'inp mono', value: W.titleFormula, 'aria-label': 'Title formula', onInput: (e) => { W.titleFormula = e.target.value; drawPrev(); } });
    const prev = h('div', { class: 'live-title', style: { fontSize: '14px' } });
    const drawPrev = () => {
      const t = Logic.buildTitle(W.titleFormula, (name) => {
        const fs = coreFields(W).concat(W.fields);
        const f = fs.find((x) => x.label.toLowerCase() === name.toLowerCase()) || fs.find((x) => normLabel(x.label) === normLabel(name));
        if (!f) return { value: '', kind: 'attr' };
        return { value: displayValue(f, S.listing.fields[f.key]), key: f.key, kind: segKind(f, W) };
      });
      clear(prev).append(...titleNodes(t, 'typed'));
      const unknown = Logic.parseFormula(W.titleFormula).filter((p) => p.tok && !allF.some((f) => f.label.toLowerCase() === p.tok.toLowerCase() || normLabel(f.label) === normLabel(p.tok))).map((p) => p.tok);
      if (unknown.length) prev.append(h('div', { class: 'hint', style: { color: 'var(--bad)' } }, 'Unknown fields: ' + unknown.join(', ')));
    };
    const insertTok = (label) => { const pos = formulaInp.selectionStart ?? formulaInp.value.length; const v = formulaInp.value; formulaInp.value = v.slice(0, pos) + '{' + label + '}' + v.slice(pos); W.titleFormula = formulaInp.value; drawPrev(); formulaInp.focus(); };
    right.append(
      h('div', { class: 'form-grid' },
        h('label', { class: 'lbl-stack' }, 'Category name', h('input', { class: 'inp sm', value: W.name, onInput: (e) => { W.name = e.target.value; } })),
        h('label', { class: 'lbl-stack' }, 'SKU category code', h('input', { class: 'inp sm mono', value: W.skuCode || '', onInput: (e) => { W.skuCode = e.target.value.trim(); } })),
        h('label', { class: 'lbl-stack' }, 'Minimum image size (px)', h('input', { class: 'inp sm', inputmode: 'numeric', value: W.imageMin || 1100, onInput: (e) => { W.imageMin = parseInt(e.target.value, 10) || 0; } })),
        h('label', { class: 'lbl-stack' }, 'Image slot labels (comma-separated)', h('input', { class: 'inp sm', value: (W.imageLabels || []).join(', '), onInput: (e) => { W.imageLabels = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); } }))),
      h('div', { class: 'row' },
        h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: !!W.handlingFees, onChange: (e) => { W.handlingFees = e.target.checked; drawRight(); } }), 'Local / Zonal / National handling fees'),
        h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: !!W.stepped, onChange: (e) => { W.stepped = e.target.checked; } }), 'Faucet-style 3-step title builder (needs Type + Installation Type fields)')),
      h('div', { class: 'subsec-title' }, 'Title formula'),
      h('div', { class: 'row nowrap' }, h('div', { class: 'grow' }, formulaInp), h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: !!W.titleVerified, onChange: (e) => { W.titleVerified = e.target.checked; } }), 'Confirmed from Seller Hub')),
      h('div', { class: 'tok-btns' }, h('span', { class: 'hint' }, 'Insert:'), W.fields.map((f) => h('button', { class: 'btn btn-xs', type: 'button', onClick: () => insertTok(f.label) }, '{' + f.label + '}'))),
      prev,
      h('div', { class: 'form-grid' },
        h('label', { class: 'lbl-stack' }, 'SEO field (SEO versions target this)', h('select', { class: 'sel sm', value: W.seoField, onChange: (e) => { W.seoField = e.target.value; } }, W.fields.filter((f) => f.type === 'text').map((f) => h('option', { value: f.key }, f.label)))),
        h('div', { class: 'lbl-stack' }, 'Variant axis', h('div', { class: 'row' }, W.fields.filter((f) => f.tab === 'pd' || f.tab === 'ad').map((f) => h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: (W.variantAxis || []).includes(f.key), onChange: (e) => { W.variantAxis = (W.variantAxis || []).filter((k) => k !== f.key); if (e.target.checked) W.variantAxis.push(f.key); } }), f.label))))),
      h('div', { class: 'subsec-title' }, 'Price, Stock and Shipping (reused automatically)'),
      fieldList(W.coreExtras = W.coreExtras || [], 'Extra fields in this tab', () => { const f = { key: slugKey('extra'), label: 'New field', type: 'text', req: true, core: true, addedByUser: true }; W.coreExtras.push(f); return f; }),
      h('div', { class: 'subsec-title' }, 'Product Description'),
      fieldList(pd, 'Product Description fields', () => { const f = { key: slugKey('field'), label: 'New field', type: 'text', tab: 'pd', section: '', req: true, addedByUser: true }; pd.push(f); syncFields(); return f; }),
      h('div', { class: 'subsec-title' }, 'Additional Description (Optional)'),
      fieldList(ad, 'Additional Description fields', () => { const f = { key: slugKey('field'), label: 'New field', type: 'text', tab: 'ad', section: 'General', addedByUser: true }; ad.push(f); syncFields(); return f; }));
    drawPrev();
    // keep W.fields in sync after any reorder inside pd/ad lists
    W.fields = pd.concat(ad);
  }
  const save = () => {
    if (!W) return;
    W.fields = W.fields.filter((f) => String(f.label || '').trim());
    for (const f of W.fields.concat(W.coreExtras || [])) {
      if (!f.key) f.key = slugKey(f.label);
      if ((f.type === 'single' || f.type === 'multi') && !(f.options || []).length) { toast('“' + f.label + '” needs at least one option', 2200); return; }
    }
    const labels = W.fields.map((f) => f.label.trim().toLowerCase());
    const dup = labels.find((x, i) => labels.indexOf(x) !== i);
    if (dup) { toast('Two fields are named “' + dup + '”. Rename one.', 2400); return; }
    if (!W.name.trim()) { toast('Give the category a name'); return; }
    S.settings.categories[W.id] = clone(W);
    if (!S.settings.categoryOrder.includes(W.id)) S.settings.categoryOrder.push(W.id);
    saveSettingsSoon();
    const wasNew = !selId;
    m.close();
    if (wasNew && isNew) changeCategory(W.id); else renderAll();
    toast('Category saved');
  };
  const resetBtn = h('button', { class: 'btn btn-danger', type: 'button', onClick: (e) => {
    if (!W) return;
    if (W.builtin) {
      if (!S.settings.categories[W.id]) { toast('Already the default'); return; }
      confirmPop(e.currentTarget, 'Reset ' + W.name + ' to the default Seller Hub fields? Your edits to this category are removed; listing values stay.', () => { delete S.settings.categories[W.id]; saveSettingsSoon(); select(W.id); renderAll(); toast('Reset to default'); }, 'Reset');
    } else if (getCat(W.id)) {
      confirmPop(e.currentTarget, 'Delete the category “' + W.name + '”? Listings that use it fall back to Faucet fields.', () => { delete S.settings.categories[W.id]; S.settings.categoryOrder = S.settings.categoryOrder.filter((x) => x !== W.id); saveSettingsSoon(); select('faucet'); renderAll(); }, 'Delete');
    } else { select('faucet'); }
  } }, 'Reset to default');
  const m = openModal({ title: 'Category Builder', body: h('div', { class: 'cb' }, left, right),
    foot: [resetBtn, h('span', { style: { flex: 1 } }), h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => m.close() }, 'Cancel'), h('button', { class: 'btn btn-primary', type: 'button', onClick: save }, 'Save category')] });
  if (isNew) select(null, newCategoryDraft()); else select(id || S.listing.category);
  const upd = () => { resetBtn.textContent = W && !W.builtin ? (getCat(W.id) ? 'Delete category' : 'Discard') : 'Reset to default'; };
  const obs = new MutationObserver(upd); obs.observe(left, { childList: true }); upd();
}
