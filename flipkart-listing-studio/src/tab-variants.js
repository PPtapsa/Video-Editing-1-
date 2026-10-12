/* ==========================================================================
   Variant engine — replace tokens, create-with-diff, spreadsheet table
   ========================================================================== */
const VT = { selected: new Set(), clip: null, draft: null, axisExtra: false };

function variantLabel(v) {
  const c = cat();
  const parts = (c.variantAxis || []).concat(VT.axisExtra ? c.variantAxisOptional || [] : []).map((k) => displayValue(fieldDef(k, c), variantValue(S.listing, v, k))).filter(Boolean);
  return parts.join(' · ') || 'Untitled variant';
}
function axisFields() {
  const c = cat();
  const keys = (c.variantAxis || []).concat(VT.axisExtra ? c.variantAxisOptional || [] : []);
  return keys.map((k) => fieldDef(k, c)).filter(Boolean);
}

function renderVariantsTab(panel) {
  const l = S.listing;
  if (curVariant()) {
    panel.append(h('div', { class: 'info-box' }, 'You are editing a variant. Go back to the master to manage tokens and the variant table. ', h('button', { class: 'btn btn-sm', type: 'button', onClick: () => openTarget(null, 'variants') }, '← Back to master')));
    return;
  }
  panel.append(tokensCard(), createCard(), tableCard());
}

/* ---------- replace tokens ---------- */
function tokensCard() {
  const l = S.listing;
  const card = secCard('Replace Tokens (master)', null, h('button', { class: 'btn btn-sm', type: 'button', onClick: (e) => promptPop(e.currentTarget, 'Add token', [{ name: 'name', label: 'Token name', placeholder: 'e.g. Pattern' }], (v) => {
    if (!v.name) return false;
    l.tokens.push({ id: uid('tk'), name: v.name, forms: [] }); markDirty(); rerenderPanel();
  }) }, icon('plus', 12), 'Token'));
  card.body.classList.add('pad');
  const list = h('div', { class: 'tok-list' });
  for (const t of l.tokens) {
    const forms = h('div', { class: 'tok-forms' });
    t.forms.forEach((f, i) => forms.append(h('span', { class: 'chip' + (i === 0 ? ' master' : ''), title: i === 0 ? 'Master value' : 'Alternate written form' }, i === 0 ? h('b', { class: 'small' }, 'master: ') : null, f,
      h('button', { class: 'x', type: 'button', 'aria-label': 'Remove ' + f, onClick: () => { t.forms.splice(i, 1); markDirty(); rerenderPanel(); } }, icon('x')))));
    const inp = h('input', { class: 'inp sm', style: { maxWidth: '240px' }, placeholder: t.forms.length ? 'Add another written form, Enter' : 'Master value, e.g. 48x4', 'aria-label': 'Add form for ' + t.name,
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addForms(t, inp.value); } },
      onPaste: (e) => { const tx = e.clipboardData.getData('text'); if (/[\n,]/.test(tx)) { e.preventDefault(); addForms(t, tx); } } });
    const isDim = t.forms[0] && /^\d+(\.\d+)?\s*[x×X]\s*\d+(\.\d+)?$/.test(t.forms[0]);
    const suggest = isDim ? ['x', 'X', ' x ', ' X ', ' × ', '×'].map((sep) => t.forms[0].replace(/\s*[x×X]\s*/, sep)).filter((f, i, a) => a.indexOf(f) === i && !t.forms.includes(f)) : [];
    forms.append(inp);
    list.append(h('div', { class: 'tok' },
      h('div', { class: 'row' }, h('b', null, t.name), h('span', { class: 'hint' }, t.forms.length ? t.forms.length + ' written forms' : 'No forms yet'), h('span', { class: 'grow' }),
        suggest.length ? h('button', { class: 'btn btn-xs', type: 'button', title: 'Adds spacing and case variants of the master size', onClick: () => { t.forms.push(...suggest); markDirty(); rerenderPanel(); } }, '+ Size spellings (' + suggest.length + ')') : null,
        iconBtn('trash', 'Delete token', (e) => { l.tokens = l.tokens.filter((x) => x !== t); for (const v of l.variants) delete v.tokenValues[t.id]; markDirty(); rerenderPanel(); }, 'sm')),
      forms));
  }
  card.body.append(h('div', { class: 'stack' },
    h('div', { class: 'note-line' }, 'Each token keeps its master value and every way it is written in your text, e.g. Size: 48x4 · 48X4 · 48 x 4 · 48 × 4 · 48 Inch · 120 cm · 1200 mm. New variants swap each form across Model Number, Description, Search Keywords, SKU and every other text field, whole-word and case-preserving.'),
    list));
  return card.el;
}
function addForms(t, text) {
  const parts = String(text).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) if (!t.forms.some((f) => f === p)) t.forms.push(p);
  markDirty(); rerenderPanel();
}

/* ---------- create variant ---------- */
function blankDraft() {
  const d = { axis: {}, tokenValues: {}, changes: null };
  for (const t of S.listing.tokens) d.tokenValues[t.id] = t.forms.map(() => '');
  return d;
}
function createCard() {
  const l = S.listing, c = cat();
  if (!VT.draft) VT.draft = blankDraft();
  const d = VT.draft;
  for (const t of l.tokens) { d.tokenValues[t.id] = d.tokenValues[t.id] || []; while (d.tokenValues[t.id].length < t.forms.length) d.tokenValues[t.id].push(''); }
  const card = secCard('Create a variant', null, h('span', { class: 'hint' }, l.variants.length + ' / 100 variants'));
  card.body.classList.add('pad');
  const axisGrid = h('div', { class: 'form-grid' });
  for (const f of axisFields()) {
    const cur = d.axis[f.key];
    let ctl;
    if (f.type === 'multi') ctl = multiSelect(f, () => d.axis[f.key] || [], (v) => { d.axis[f.key] = v; d.changes = null; }, {}).el;
    else if (f.type === 'fktm') ctl = h('input', { class: 'inp sm', placeholder: 'Values separated by commas', value: (cur || []).join(', '), onInput: (e) => { d.axis[f.key] = Logic.splitList(e.target.value); d.changes = null; } });
    else ctl = h('input', { class: 'inp sm', value: cur || '', placeholder: f.unit ? 'in ' + f.unit : '', onInput: (e) => { d.axis[f.key] = e.target.value.trim(); d.changes = null; } });
    axisGrid.append(h('div', { class: 'lbl-stack' }, h('span', null, f.label, ' ', h('span', { class: 'req' }, '*'), ' ', h('span', { class: 'tag teal' }, 'Variant axis')), ctl));
  }
  const tokGrid = h('div', { class: 'stack' });
  for (const t of l.tokens) {
    if (!t.forms.length) continue;
    const vals = d.tokenValues[t.id];
    const rows = t.forms.map((f, i) => {
      const inp = h('input', { class: 'inp sm', value: vals[i] || '', placeholder: i === 0 ? 'new value' : 'new form (blank = keep)', 'aria-label': 'New value for ' + f,
        onInput: (e) => { vals[i] = e.target.value; d.changes = null; } });
      return h('div', { class: 'row nowrap' }, h('span', { class: 'mono small', style: { width: '160px', flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis' } }, f), h('span', { class: 'muted' }, '→'), inp);
    });
    tokGrid.append(h('div', { class: 'tok' }, h('div', { class: 'row' }, h('b', null, t.name), h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-xs', type: 'button', title: 'Fill the spacing/case variants from the first new value', onClick: () => {
        if (!vals[0]) { toast('Type the new master value first'); return; }
        t.forms.forEach((f, i) => { if (i > 0 && !vals[i]) vals[i] = Logic.deriveForm(t.forms[0], f, vals[0]); });
        d.changes = null; rerenderPanel();
      } }, 'Fill matching forms')), rows));
  }
  const diffBox = h('div', { class: 'stack' });
  if (d.changes) {
    if (!d.changes.length) diffBox.append(h('div', { class: 'hint' }, 'No field changes from the master. The variant will only differ in the axis values.'));
    else {
      const list = h('div', { class: 'diff-list' });
      for (const ch of d.changes) {
        list.append(h('label', { class: 'diff-item' },
          h('input', { type: 'checkbox', checked: ch.include, onChange: (e) => { ch.include = e.target.checked; } }),
          h('span', { class: 'fl' }, ch.label, ch.axis ? h('span', { class: 'tag teal', style: { marginLeft: '6px' } }, 'axis') : null),
          h('span', { class: 'diff', html: diffHtml(ch.oldTxt, ch.newTxt) })));
      }
      diffBox.append(h('div', { class: 'row' }, h('b', null, d.changes.length + ' changes'), h('span', { class: 'hint' }, 'Untick any change to keep the master text for that field.')), list);
    }
    diffBox.append(h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', onClick: commitVariant }, 'Create variant'), h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => { d.changes = null; rerenderPanel(); } }, 'Back')));
  }
  const c2 = c.variantAxisOptional && c.variantAxisOptional.length ? h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: VT.axisExtra, onChange: (e) => { VT.axisExtra = e.target.checked; rerenderPanel(); } }), 'Also vary ' + c.variantAxisOptional.map((k) => (c.colLabels && c.colLabels[k]) || (fieldDef(k) || {}).label).join(', ')) : null;
  card.body.append(h('div', { class: 'stack' },
    h('div', { class: 'row' }, h('b', null, 'Variant axis'), c2),
    axisFields().length ? axisGrid : h('div', { class: 'hint' }, 'This category has no variant axis yet. Set one in the Category Builder.'),
    h('b', null, 'New token values'),
    tokGrid.children.length ? tokGrid : h('div', { class: 'hint' }, 'Add written forms to the tokens above to enable find-and-replace.'),
    d.changes ? diffBox : h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', disabled: l.variants.length >= 100, onClick: previewVariant }, 'Preview changes'), l.variants.length >= 100 ? h('span', { class: 'tag amber' }, 'Flipkart limit of 100 reached') : null)));
  return card.el;
}
function previewVariant() {
  const l = S.listing, c = cat();
  const d = VT.draft;
  for (const f of axisFields()) if (isEmpty(d.axis[f.key])) { toast('Fill ' + f.label + ' first', 1800); return; }
  const tmp = { id: 'tmp', tokenValues: clone(d.tokenValues), axis: clone(d.axis), excluded: [], overrides: {} };
  const changes = [];
  const keys = new Set(allFields(c).map((f) => f.key).concat(Object.keys(VARIANT_ONLY_FIELDS)));
  for (const k of keys) {
    const def = fieldDef(k, c);
    const oldV = l.fields[k];
    const newV = variantAuto(l, tmp, k);
    if (sameVal(oldV, newV)) continue;
    changes.push({ key: k, label: def ? def.label : k, axis: Object.prototype.hasOwnProperty.call(d.axis, k), oldTxt: displayValue(def, oldV), newTxt: displayValue(def, newV), include: true });
  }
  d.changes = changes;
  rerenderPanel();
}
function commitVariant() {
  const l = S.listing;
  const d = VT.draft;
  if (l.variants.length >= 100) { toast('Flipkart allows up to 100 variants'); return; }
  const v = { id: uid('v'), tokenValues: clone(d.tokenValues), axis: clone(d.axis), excluded: (d.changes || []).filter((ch) => !ch.include && !ch.axis).map((ch) => ch.key), overrides: {}, disabled: false, images: null, createdAt: Date.now() };
  l.variants.push(v);
  VT.draft = blankDraft();
  markDirty(); rerenderPanel();
  toast('Variant created: ' + variantLabel(v));
}

/* ---------- variant table ---------- */
function tableCard() {
  const l = S.listing, c = cat();
  const cols = variantColumns(c);
  const card = secCard('Variants', null, h('span', { class: 'hint' }, l.variants.length + ' of 100 · click a cell to edit · ↺ restores the auto value'));
  card.body.classList.add('pad');
  if (!l.variants.length) {
    card.body.append(h('div', { class: 'empty' }, 'No variants yet. Set the replace tokens, fill the axis and create the first one above.'));
    return card.el;
  }
  const sel = VT.selected;
  for (const id of [...sel]) if (!l.variants.some((v) => v.id === id)) sel.delete(id);
  const skuCounts = new Map();
  for (const v of l.variants) { const s = String(variantValue(l, v, 'sku') || '').toLowerCase(); if (s) skuCounts.set(s, (skuCounts.get(s) || 0) + 1); }
  const masterSku = String(l.fields.sku || '').toLowerCase();
  const bar = h('div', { class: 'vt-bar' },
    h('span', { class: 'small' }, h('b', null, sel.size), ' selected'),
    h('button', { class: 'btn btn-sm', type: 'button', disabled: sel.size !== 1, title: 'Copy one row (also copies it to the clipboard as tab-separated values)', onClick: () => {
      const v = l.variants.find((x) => sel.has(x.id));
      VT.clip = { from: v.id, values: Object.fromEntries(cols.map((col) => [col.key, clone(variantValue(l, v, col.key))])) };
      doCopy(cols.map((col) => displayValue(col.def, VT.clip.values[col.key])).join('\t'), 'Row copied ✓'); rerenderPanel();
    } }, 'Copy row'),
    h('button', { class: 'btn btn-sm', type: 'button', disabled: !VT.clip || !sel.size, title: 'Pastes every column except the axis and Seller SKU ID into the selected rows', onClick: () => {
      const skip = new Set(['sku'].concat(c.variantAxis || []));
      let n = 0;
      for (const v of l.variants) if (sel.has(v.id) && v.id !== VT.clip.from) { for (const k of Object.keys(VT.clip.values)) if (!skip.has(k)) setVariantCell(v, k, clone(VT.clip.values[k])); n++; }
      markDirty(); rerenderPanel(); toast('Pasted into ' + n + ' row' + (n === 1 ? '' : 's'));
    } }, 'Paste in selected'),
    h('button', { class: 'btn btn-sm', type: 'button', disabled: !sel.size, onClick: () => {
      if (l.variants.length + sel.size > 100) { toast('That would pass the 100-variant limit'); return; }
      const add = l.variants.filter((v) => sel.has(v.id)).map((v) => Object.assign(clone(v), { id: uid('v'), createdAt: Date.now() }));
      l.variants.push(...add); markDirty(); rerenderPanel(); toast('Duplicated ' + add.length);
    } }, 'Duplicate'),
    h('button', { class: 'btn btn-sm', type: 'button', disabled: !sel.size, onClick: () => {
      const allOff = l.variants.filter((v) => sel.has(v.id)).every((v) => v.disabled);
      for (const v of l.variants) if (sel.has(v.id)) v.disabled = !allOff;
      markDirty(); rerenderPanel();
    } }, 'Disable / enable selected'),
    h('button', { class: 'btn btn-sm btn-danger', type: 'button', disabled: !sel.size, onClick: (e) => confirmPop(e.currentTarget, 'Delete ' + sel.size + ' selected variant' + (sel.size === 1 ? '' : 's') + '?', () => {
      l.variants = l.variants.filter((v) => !sel.has(v.id)); sel.clear(); markDirty(); rerenderPanel();
    }) }, 'Delete'),
    VT.clip ? h('span', { class: 'tag blue' }, 'Row in clipboard') : null);
  const thead = h('tr', null,
    h('th', { class: 'stk1' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', 'aria-label': 'Select all rows', checked: sel.size === l.variants.length, onChange: (e) => { if (e.target.checked) l.variants.forEach((v) => sel.add(v.id)); else sel.clear(); rerenderPanel(); } }), '#')),
    cols.map((col, i) => h('th', { class: i === 0 ? 'stk2' : '' }, col.label, col.req ? h('span', { class: 'req' }, ' *') : null, ' ',
      h('button', { class: 'icon-btn sm', type: 'button', title: 'Apply a value to the selected rows', 'aria-label': 'Apply value to selected in ' + col.label, onClick: (e) => applyColumnPop(e.currentTarget, col) }, icon('edit')))));
  const tbody = h('tbody');
  l.variants.forEach((v, ri) => {
    const tr = h('tr', { class: (v.disabled ? 'dis ' : '') + (sel.has(v.id) ? 'sel' : '') });
    tr.append(h('td', { class: 'stk1' }, h('div', { class: 'rowsel' },
      h('input', { type: 'checkbox', 'aria-label': 'Select variant ' + (ri + 1), checked: sel.has(v.id), onChange: (e) => { if (e.target.checked) sel.add(v.id); else sel.delete(v.id); rerenderPanel(); } }),
      h('span', { class: 'small mono' }, ri + 1),
      iconBtn('open', 'Open in full editor', () => openTarget(v.id, 'price'), 'sm'))));
    cols.forEach((col, ci) => {
      const td = h('td', { class: ci === 0 ? 'stk2' : '' });
      td.append(variantCell(v, col, { dupe: col.key === 'sku' && (() => { const s = String(variantValue(l, v, 'sku') || '').toLowerCase(); return s && (skuCounts.get(s) > 1 || s === masterSku); })() }));
      tr.append(td);
    });
    tbody.append(tr);
  });
  card.body.append(h('div', { class: 'stack' }, bar,
    h('div', { class: 'vt-wrap' }, h('table', { class: 'vt' }, h('thead', null, thead), tbody)),
    h('div', { class: 'hint' }, 'Red outline on Seller SKU ID = duplicate of another row or the master. Blue dot = edited by hand.')));
  return card.el;
}
function setVariantCell(v, key, val) {
  const auto = variantAuto(S.listing, v, key);
  if (sameVal(auto, val)) delete v.overrides[key]; else v.overrides[key] = clone(val);
}
function parseCellInput(def, text) {
  text = String(text ?? '');
  if (!def) return text;
  if (def.type === 'fktm' || def.type === 'multi') return Logic.splitList(text);
  if (def.type === 'warranty') { const m = text.match(/(\d+(?:\.\d+)?)\s*(year|month)?/i); return m ? { n: m[1], unit: m[2] && /month/i.test(m[2]) ? 'Month' : 'Year' } : { n: '', unit: 'Year' }; }
  return text.trim();
}
function cellText(def, val) { return def && def.type === 'preset' ? ((S.settings.presets || []).find((p) => p.id === val) || {}).label || '' : displayValue(def, val); }
function variantCell(v, col, flags) {
  const l = S.listing;
  const def = col.def;
  const val = variantValue(l, v, col.key);
  const ovr = Object.prototype.hasOwnProperty.call(v.overrides, col.key);
  const txt = cellText(def, val);
  const wide = def && (def.type === 'long' || def.type === 'fktm' || def.key === 'modelNumber' || def.key === 'sku');
  const cell = h('div', { class: 'cell' + (wide ? ' wide' : '') + (txt ? '' : ' empty') + (ovr ? ' ovr' : '') + (flags && flags.dupe ? ' dupe' : ''), tabindex: '0', title: txt },
    h('span', { class: 'v' }, txt || '—'),
    h('span', { class: 'tools' }, copyBtn(() => displayValue(def, variantValue(l, v, col.key)), 'Copy', true),
      h('button', { class: 'icon-btn sm restore', type: 'button', title: 'Restore auto value', 'aria-label': 'Restore auto value', onClick: (e) => { e.stopPropagation(); delete v.overrides[col.key]; markDirty(); swap(); } }, icon('restore'))));
  const swap = () => { const n = variantCell(v, col, flags); cell.replaceWith(n); };
  const edit = () => {
    let ed, finished = false;
    const done = (save) => {
      if (finished) return;
      finished = true;
      if (save) { setVariantCell(v, col.key, parseCellInput(def, ed.value)); markDirty(); }
      swap();
    };
    if (def && (def.type === 'single' || def.type === 'yesno' || def.type === 'hsn' || def.type === 'preset')) {
      const opts = def.type === 'yesno' ? ['Yes', 'No'] : def.type === 'hsn' ? (S.settings.hsn || []).map((x) => x.code) : def.type === 'preset' ? null : def.options || [];
      ed = h('select', { 'aria-label': col.label, value: val || '' }, h('option', { value: '' }, '—'),
        def.type === 'preset' ? (S.settings.presets || []).map((p) => h('option', { value: p.id }, p.label)) : opts.map((o) => h('option', { value: o }, o)));
      ed.addEventListener('change', () => done(true));
      ed.addEventListener('blur', () => done(false));
    } else {
      ed = h('input', { 'aria-label': col.label, value: def && (def.type === 'fktm' || def.type === 'multi') ? (val || []).join(', ') : displayValue(def, val) });
      ed.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } });
      ed.addEventListener('blur', () => done(true));
    }
    clear(cell); cell.classList.remove('ovr'); cell.append(ed);
    if (def && def.limit) { const ctr = ctrEl(String(ed.value).length, def.limit); ctr.style.position = 'absolute'; ctr.style.right = '4px'; ctr.style.bottom = '-1px'; ctr.style.fontSize = '9.5px'; ed.addEventListener('input', () => setCtr(ctr, ed.value.length, def.limit)); cell.append(ctr); }
    ed.focus();
    if (ed.select && ed.tagName === 'INPUT') ed.select();
  };
  cell.addEventListener('click', (e) => { if (e.target.closest('.tools')) return; if (cell.querySelector('input, select')) return; edit(); });
  cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === cell) { e.preventDefault(); edit(); } });
  return cell;
}
function applyColumnPop(anchor, col) {
  const l = S.listing;
  if (!VT.selected.size) { toast('Select rows first'); return; }
  promptPop(anchor, 'Apply to ' + VT.selected.size + ' selected · ' + col.label, [{ name: 'v', label: col.def && (col.def.type === 'fktm' || col.def.type === 'multi') ? 'Values (comma-separated)' : col.def && col.def.type === 'preset' ? 'Preset name' : 'Value' }], (r) => {
    let val = parseCellInput(col.def, r.v);
    if (col.def && col.def.type === 'preset') { const p = (S.settings.presets || []).find((x) => x.label.toLowerCase() === r.v.toLowerCase()); if (!p) { toast('No preset with that name'); return false; } val = p.id; }
    for (const v of l.variants) if (VT.selected.has(v.id)) setVariantCell(v, col.key, clone(val));
    markDirty(); rerenderPanel(); toast('Applied to ' + VT.selected.size + ' rows');
  }, 'Apply');
}
