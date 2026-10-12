/* ==========================================================================
   Field components — every row: label · control · counter + copy · warnings
   ========================================================================== */
const AI_FIELDS = new Set(['modelNumber', 'modelName', 'description', 'searchKeywords', 'otherFeatures', 'certification', 'warrantySummary']);

function fieldRow(def, opts) {
  opts = opts || {};
  const get = opts.get || (() => getVal(def.key));
  const set = opts.set || ((v) => setVal(def.key, v));
  const id = 'f_' + def.key + (opts.idSuffix || '');
  const tools = h('div', { class: 'f-tools' });
  const warn = h('div', { class: 'f-warn', dataset: { key: def.key } });
  const body = h('div', { class: 'f-body' });
  const labelEl = h('div', { class: 'f-label' },
    h('label', { for: id }, def.label), def.req ? h('span', { class: 'req', 'aria-label': 'mandatory' }, '*') : null,
    def.title ? h('span', { class: 'tm-chip', title: 'Attributes that can make up title' }, 'Makes title') : null,
    def.hint ? h('span', { class: 'hint' }, '· ' + def.hint) : null);
  const row = h('div', { class: 'field' + (isOverride(def.key) ? ' is-override' : ''), dataset: { key: def.key } }, labelEl, body, tools, warn);
  const ctx = { def, get, set, id, tools, body, row, warn, labelEl, refresh: null };

  const builder = FIELD_BUILDERS[def.type] || FIELD_BUILDERS.text;
  builder(ctx);

  if (S.aiOk && AI_FIELDS.has(def.key) && !opts.noAi) {
    labelEl.append(h('button', { class: 'icon-btn sm ai', type: 'button', title: 'AI suggestion for ' + def.label, 'aria-label': 'AI suggestion for ' + def.label, dataset: { ai: '1' }, onClick: () => aiFieldSuggest(ctx) }, icon('spark')));
  }
  if (curVariant() && !opts.noRestore) {
    tools.prepend(h('button', { class: 'icon-btn sm restore-btn', type: 'button', title: 'Restore the auto value from the master', 'aria-label': 'Restore auto value', hidden: !isOverride(def.key), onClick: () => { restoreAuto(def.key); rerenderPanel(); } }, icon('restore')));
  }
  S.fieldEls.push(ctx);
  return row;
}
function afterChange(ctx) {
  ctx.row.classList.toggle('is-override', isOverride(ctx.def.key));
  const rb = ctx.tools.querySelector('.restore-btn');
  if (rb) rb.hidden = !isOverride(ctx.def.key);
  scheduleLive();
}

/* ---------- builders ---------- */
const FIELD_BUILDERS = {
  text(ctx) {
    const { def } = ctx;
    const ctr = ctrEl(String(ctx.get() || '').length, def.limit);
    const inp = h('input', { class: 'inp', id: ctx.id, value: ctx.get() || '', autocomplete: 'off', placeholder: def.placeholder || '',
      onInput: () => { ctx.set(inp.value); setCtr(ctr, inp.value.length, def.limit); inp.classList.toggle('over', def.limit && inp.value.length > def.limit); afterChange(ctx); } });
    if (def.limit && inp.value.length > def.limit) inp.classList.add('over');
    ctx.body.append(inp);
    ctx.tools.append(ctr, copyBtn(() => ctx.get() || ''));
    ctx.input = inp;
    ctx.refresh = () => { if (document.activeElement !== inp) inp.value = ctx.get() || ''; setCtr(ctr, String(ctx.get() || '').length, def.limit); };
  },
  long(ctx) {
    const { def } = ctx;
    const ctr = ctrEl(String(ctx.get() || '').length, def.limit);
    const rows = def.limit >= 2000 ? 9 : 4;
    const ta = h('textarea', { class: 'inp', id: ctx.id, rows, value: ctx.get() || '',
      onInput: () => { ctx.set(ta.value); setCtr(ctr, ta.value.length, def.limit); ta.classList.toggle('over', def.limit && ta.value.length > def.limit); afterChange(ctx); } });
    ctx.body.append(ta);
    ctx.tools.append(ctr, copyBtn(() => ctx.get() || ''));
    ctx.input = ta;
    ctx.refresh = () => { if (document.activeElement !== ta) ta.value = ctx.get() || ''; setCtr(ctr, String(ctx.get() || '').length, def.limit); };
  },
  number(ctx) {
    const { def } = ctx;
    const inp = h('input', { class: 'inp', id: ctx.id, inputmode: 'decimal', value: ctx.get() ?? '', autocomplete: 'off',
      onInput: () => { ctx.set(inp.value.trim()); setCtr(ctr, inp.value.length); afterChange(ctx); } });
    const ctr = ctrEl(String(ctx.get() ?? '').length);
    ctx.body.append(def.unit ? h('div', { class: 'inp-group' }, inp, h('span', { class: 'addon' }, def.unit)) : inp);
    if (def.helper === 'tempK') {
      const c = h('input', { class: 'inp sm', inputmode: 'decimal', placeholder: '°C', style: { width: '90px' }, 'aria-label': 'Temperature in °C',
        onInput: () => { const n = Logic.num(c.value); if (isFinite(n)) { inp.value = String(Logic.cToK(n)); ctx.set(inp.value); setCtr(ctr, inp.value.length); afterChange(ctx); } } });
      ctx.body.append(h('div', { class: 'row small muted' }, 'Type °C', c, '→ converts to K (°C + 273.15)'));
    }
    ctx.tools.append(ctr, copyBtn(() => ctx.get() ?? ''));
    ctx.input = inp;
    ctx.refresh = () => { if (document.activeElement !== inp) inp.value = ctx.get() ?? ''; };
  },
  money(ctx) {
    const inp = h('input', { class: 'inp', id: ctx.id, inputmode: 'decimal', value: ctx.get() ?? '', autocomplete: 'off',
      onInput: () => { ctx.set(inp.value.trim()); afterChange(ctx); } });
    ctx.body.append(h('div', { class: 'inp-group' }, h('span', { class: 'addon pre' }, '₹'), inp));
    ctx.tools.append(copyBtn(() => ctx.get() ?? ''));
    ctx.input = inp;
  },
  single(ctx) {
    const { def } = ctx;
    const cur = ctx.get() || '';
    const opts = (def.options || []).slice();
    if (cur && !opts.includes(cur)) opts.push(cur);
    const sel = h('select', { class: 'sel', id: ctx.id, value: cur, onChange: () => { ctx.set(sel.value); afterChange(ctx); } },
      h('option', { value: '' }, 'Select'), opts.map((o) => h('option', { value: o }, o)));
    ctx.body.append(sel);
    ctx.tools.append(copyBtn(() => ctx.get() || ''));
    ctx.input = sel;
  },
  yesno(ctx) {
    const seg = h('div', { class: 'seg', role: 'radiogroup', id: ctx.id });
    const draw = () => {
      clear(seg);
      for (const o of ['Yes', 'No']) seg.append(h('button', { type: 'button', class: ctx.get() === o ? 'on' : '', role: 'radio', 'aria-checked': ctx.get() === o ? 'true' : 'false',
        onClick: () => { ctx.set(ctx.get() === o ? '' : o); draw(); afterChange(ctx); } }, o));
    };
    draw();
    ctx.body.append(h('div', { class: 'row' }, seg));
    ctx.tools.append(copyBtn(() => ctx.get() || ''));
  },
  warranty(ctx) {
    const cur = ctx.get() || {};
    const n = h('input', { class: 'inp', id: ctx.id, inputmode: 'numeric', value: cur.n ?? '', style: { maxWidth: '120px' },
      onInput: () => { ctx.set({ n: n.value.trim(), unit: unit.value }); afterChange(ctx); } });
    const unit = h('select', { class: 'sel', style: { maxWidth: '120px' }, value: cur.unit || 'Year', onChange: () => { ctx.set({ n: n.value.trim(), unit: unit.value }); afterChange(ctx); } },
      h('option', { value: 'Year' }, 'Year'), h('option', { value: 'Month' }, 'Month'));
    ctx.body.append(h('div', { class: 'row nowrap' }, n, unit));
    ctx.tools.append(copyBtn(() => displayValue(ctx.def, ctx.get())));
    ctx.refresh = () => { const v = ctx.get() || {}; if (document.activeElement !== n) n.value = v.n ?? ''; unit.value = v.unit || 'Year'; };
  },
  fktm(ctx) {
    const meta = h('span', { class: 'ctr' });
    const ed = fktmEditor(ctx.def, ctx.get, (v) => { ctx.set(v); afterChange(ctx); }, { id: ctx.id, onRender: (vals) => { meta.textContent = vals.length + (vals.length === 1 ? ' value' : ' values'); } });
    ctx.body.append(ed.el);
    ctx.tools.append(meta, h('button', { class: 'btn btn-xs', type: 'button', title: 'Copy every value, joined with “, ”', onClick: () => doCopy((ctx.get() || []).join(', '), 'Copied all ✓') }, 'Copy all'));
    ctx.refresh = () => ed.render();
  },
  multi(ctx) {
    const { def } = ctx;
    const ctr = def.combinedLimit ? ctrEl((ctx.get() || []).join(', ').length, def.combinedLimit) : h('span', { class: 'ctr' });
    const ms = multiSelect(def, ctx.get, (v) => {
      ctx.set(v);
      if (def.combinedLimit) setCtr(ctr, v.join(', ').length, def.combinedLimit); else ctr.textContent = v.length ? v.length + ' selected' : '';
      afterChange(ctx);
    }, { id: ctx.id, whatIf: def.title });
    if (!def.combinedLimit) { const v = ctx.get() || []; ctr.textContent = v.length ? v.length + ' selected' : ''; }
    ctx.body.append(ms.el);
    if (def.rank) ctx.body.append(h('div', { class: 'rank-hint' }, 'Rank: exact product identity → buyer relevance → useful taxonomy/search coverage → title clarity. Drag chips to reorder.'));
    if (def.max) ctx.body.append(h('div', { class: 'hint' }, 'Up to ' + def.max + ' values.'));
    if (def.combinedLimit) ctx.body.append(h('div', { class: 'hint' }, 'Combined labels must stay within ' + def.combinedLimit + ' characters (counter on the right).'));
    ctx.tools.append(ctr, copyBtn(() => (ctx.get() || []).join(', ')));
    ctx.refresh = () => ms.render();
  }
};

/* ---------- Fkt-M editor ---------- */
function fktmEditor(def, get, set, opts) {
  opts = opts || {};
  const wrap = h('div', { class: 'fktm' });
  let editing = -1, bulkOpen = false, rendering = false;
  function render(focusAdd) {
    rendering = true;
    clear(wrap);
    rendering = false;
    const vals = (get() || []).slice();
    const list = h('ol', { class: 'fktm-list' });
    vals.forEach((v, i) => {
      const li = h('li', { class: 'fktm-item' }, h('span', { class: 'drag', title: 'Drag to reorder' }, icon('drag')), h('span', { class: 'bullet' }));
      if (editing === i) {
        let done = false;
        const inp = h('input', { class: 'inp', value: v, 'aria-label': 'Edit value',
          onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(); } else if (e.key === 'Escape') { done = true; editing = -1; render(); } },
          onBlur: () => { if (!rendering) finish(); } });
        const finish = () => {
          if (done) return; done = true;
          const nv = inp.value.trim();
          const arr = vals.slice();
          if (nv) arr[i] = nv; else arr.splice(i, 1);
          editing = -1;
          const d = Logic.dedupeCI(arr);
          if (d.length < arr.length) toast('Already in the list');
          set(d); render();
        };
        li.append(inp);
        setTimeout(() => { inp.focus(); inp.select(); }, 0);
      } else {
        li.append(h('span', { class: 'txt', tabindex: '0', title: 'Click to edit', onClick: () => { editing = i; render(); }, onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); editing = i; render(); } } }, v));
      }
      li.append(ctrEl(v.length, def.itemLimit), copyBtn(() => v, 'Copy value', true),
        iconBtn('x', 'Delete value', () => { const arr = vals.slice(); arr.splice(i, 1); set(arr); render(); }, 'sm'));
      list.append(li);
    });
    makeSortable(list, { item: '.fktm-item', handle: '.drag', onEnd: (a, b) => { const arr = vals.slice(); moveItem(arr, a, b); set(arr); render(); } });
    const addValues = (text) => {
      addInp.value = '';
      const parts = String(text || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return;
      const all = vals.concat(parts);
      const d = Logic.dedupeCI(all);
      const dupes = all.length - d.length;
      set(d); render(true);
      if (dupes) toast(dupes + (dupes > 1 ? ' duplicates' : ' duplicate') + ' skipped');
    };
    const addInp = h('input', { class: 'inp', id: opts.id, placeholder: 'Type a value, press Enter or ,', autocomplete: 'off',
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValues(addInp.value); } },
      onPaste: (e) => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (/[\n,]/.test(t)) { e.preventDefault(); addValues(addInp.value + t); } },
      onBlur: (e) => { if (rendering || (e.relatedTarget && wrap.contains(e.relatedTarget))) return; if (addInp.value.trim()) addValues(addInp.value); } });
    wrap.append(list, h('div', { class: 'fktm-add' }, addInp, h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { bulkOpen = !bulkOpen; render(); } }, bulkOpen ? 'Close' : 'Bulk paste')));
    if (bulkOpen) {
      const ta = h('textarea', { class: 'inp', rows: 4, placeholder: 'Paste values, one per line or separated by commas', 'aria-label': 'Bulk paste values' });
      wrap.append(h('div', { class: 'fktm-bulk' }, ta, h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm btn-primary', type: 'button', onClick: () => { bulkOpen = false; addValues(ta.value); } }, 'Add all'),
        h('span', { class: 'hint' }, 'Splits on new lines and commas. Duplicates are skipped, ignoring case.'))));
      setTimeout(() => ta.focus(), 0);
    }
    if (focusAdd) setTimeout(() => addInp.focus(), 0);
    if (opts.onRender) opts.onRender(vals);
  }
  render();
  return { el: wrap, render };
}

/* ---------- multi-select ---------- */
function multiSelect(def, get, set, opts) {
  opts = opts || {};
  const wrap = h('div', { class: 'ms' });
  let pop = null, query = '';
  const box = h('div', { class: 'ms-box', tabindex: '0', id: opts.id, role: 'button', 'aria-haspopup': 'listbox',
    onClick: (e) => { if (e.target.closest('.x') || e.target.closest('.drag')) return; toggle(); },
    onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); if (!pop) toggle(); } } });
  wrap.append(box);
  function renderBox() {
    clear(box);
    const vals = get() || [];
    if (!vals.length) box.append(h('span', { class: 'ms-ph' }, def.exactOne ? 'Select exactly one' : 'Select'));
    vals.forEach((v, i) => {
      const known = (def.options || []).includes(v);
      box.append(h('span', { class: 'chip' + (known ? '' : ' unknown'), title: known ? v : 'Not in the Flipkart option list' },
        def.rank ? [h('span', { class: 'drag', title: 'Drag to rank' }, icon('drag')), h('span', { class: 'rank' }, '#' + (i + 1))] : null,
        v,
        h('button', { class: 'x', type: 'button', 'aria-label': 'Remove ' + v, onClick: (e) => { e.stopPropagation(); set(vals.filter((x) => x !== v)); renderBox(); syncPop(); } }, icon('x'))));
    });
    if (def.rank && vals.length > 1) makeSortable(box, { item: '.chip', handle: '.drag', onEnd: (a, b) => { const nv = vals.slice(); moveItem(nv, a, b); set(nv); renderBox(); } });
    box.classList.toggle('open', !!pop);
  }
  function whatIf(opt, vals) {
    if (!opts.whatIf) return '';
    const base = curTitle().text.length;
    const next = vals.includes(opt) ? vals.filter((x) => x !== opt) : vals.concat(opt);
    const t = titleFor(S.listing, curVariant(), (k) => (k === def.key ? next : getVal(k))).text.length;
    const d = t - base;
    return (d > 0 ? '+' : '') + d + ' ch';
  }
  function syncPop() {
    if (!pop) return;
    const vals = get() || [];
    const list = pop.querySelector('.ms-list');
    const focusedOpt = document.activeElement && document.activeElement.closest && document.activeElement.closest('.ms-opt');
    const focusIdx = focusedOpt && list.contains(focusedOpt) ? [...list.children].indexOf(focusedOpt) : -1;
    const scrollTop = list.scrollTop;
    clear(list);
    const q = query.toLowerCase();
    const full = def.max && vals.length >= def.max;
    for (const o of def.options || []) {
      if (q && !o.toLowerCase().includes(q)) continue;
      const on = vals.includes(o);
      const dis = !on && full;
      const cb = h('input', { type: 'checkbox', checked: on, disabled: dis, tabindex: '-1' });
      list.append(h('label', { class: 'ms-opt' + (dis ? ' dis' : ''), tabindex: '0',
        onKeydown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(o); } else if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling || e.currentTarget).focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); (e.currentTarget.previousElementSibling || pop.querySelector('input.inp')).focus(); } },
        onClick: (e) => { e.preventDefault(); if (!dis) pick(o); } }, cb, h('span', null, o), opts.whatIf ? h('span', { class: 'whatif' }, whatIf(o, vals)) : null));
    }
    if (!list.children.length) list.append(h('div', { class: 'hint', style: { padding: '6px 8px' } }, 'No match'));
    list.scrollTop = scrollTop;
    if (focusIdx >= 0 && list.children[focusIdx]) list.children[focusIdx].focus({ preventScroll: true });
    pop.querySelector('.ms-count').textContent = vals.length + (def.max ? ' / ' + def.max : '') + ' selected' + (def.combinedLimit ? ' · ' + vals.join(', ').length + ' / ' + def.combinedLimit + ' ch' : '');
  }
  function pick(o) {
    const vals = (get() || []).slice();
    const i = vals.indexOf(o);
    if (i >= 0) vals.splice(i, 1);
    else { if (def.max && vals.length >= def.max) { toast('Up to ' + def.max + ' values'); return; } vals.push(o); }
    set(vals); renderBox(); syncPop();
  }
  const onDoc = (e) => { if (pop && !wrap.contains(e.target)) close(); };
  const onKey = (e) => { if (pop && e.key === 'Escape') { e.preventDefault(); close(); box.focus(); } };
  function close() {
    if (!pop) return;
    pop.remove(); pop = null; query = '';
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey, true);
    renderBox();
  }
  function toggle() {
    if (pop) { close(); return; }
    const search = h('input', { class: 'inp sm', placeholder: 'Search options', 'aria-label': 'Search options',
      onInput: () => { query = search.value; syncPop(); },
      onKeydown: (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); const f = pop.querySelector('.ms-opt'); if (f) f.focus(); } } });
    pop = h('div', { class: 'ms-pop', role: 'listbox', 'aria-multiselectable': 'true' },
      search, h('div', { class: 'ms-list' }),
      h('div', { class: 'ms-foot' }, h('span', { class: 'ms-count' }), h('button', { class: 'btn btn-xs btn-primary', type: 'button', onClick: () => { close(); box.focus(); } }, 'Done')));
    wrap.append(pop);
    syncPop(); renderBox();
    setTimeout(() => search.focus(), 0);
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
  }
  renderBox();
  return { el: wrap, render: () => { renderBox(); syncPop(); } };
}

/* ---------- warnings ---------- */
function renderWarnBoxes(container, list) {
  clear(container);
  for (const w of list || []) {
    container.append(h('div', { class: 'warn-box' + (w.level === 'bad' ? ' bad' : ''), role: 'note' },
      h('span', { class: 'wi' }, icon('warn', 14)), h('span', { class: 'wt' }, w.text),
      iconBtn('x', 'Dismiss', () => { dismissWarning(w.id); })));
  }
}
function refreshWarnings() {
  const w = computeWarnings(S.listing, curVariant());
  for (const ctx of S.fieldEls) if (ctx.warn && ctx.warn.isConnected) renderWarnBoxes(ctx.warn, w[ctx.def.key]);
  return w;
}

/* ---------- AI suggestion per field ---------- */
function aiFieldSuggest(ctx) {
  const { def } = ctx;
  let box = ctx.body.querySelector('.ai-sugg');
  if (box) box.remove();
  box = h('div', { class: 'ai-sugg', role: 'status' });
  ctx.body.append(box);
  const isList = def.type === 'fktm';
  let ctl = null, result = null;
  const run = () => {
    ctl = new AbortController();
    clear(box);
    const out = h('div', { class: 'txt' }, 'Thinking…');
    box.append(h('div', { class: 'row small' }, h('b', null, '✨ Suggestion'), h('span', { class: 'grow' }), h('button', { class: 'btn btn-xs', type: 'button', onClick: () => ctl.abort() }, 'Stop')), out);
    const prompt = aiFieldPrompt(def, ctx.get());
    const p = isList ? S.ai.json(prompt, { signal: ctl.signal, cache: false }) : S.ai(prompt, { signal: ctl.signal, cache: false, onText: ({ text }) => { out.innerHTML = highlightVerify(text); } }).then((r) => r.text.trim());
    p.then((val) => {
      if (isList) val = Array.isArray(val) ? Logic.dedupeCI(val.map(String)) : [];
      else val = String(val).replace(/^["“]|["”]$/g, '').trim();
      result = val;
      clear(box);
      const len = isList ? val.length + ' values' : ctrText(val.length, def.limit);
      box.append(h('div', { class: 'row small' }, h('b', null, '✨ Suggestion'), h('span', { class: 'grow' }), h('span', { class: (isList ? 'ctr' : ctrClass(val.length, def.limit)) }, len)),
        h('div', { class: 'txt', html: isList ? val.map((x) => '• ' + highlightVerify(x)).join('<br>') : highlightVerify(val) }),
        h('div', { class: 'acts' },
          h('button', { class: 'btn btn-xs btn-teal', type: 'button', onClick: () => { ctx.set(result); box.remove(); rerenderPanel(); toast('Applied'); } }, 'Accept'),
          h('button', { class: 'btn btn-xs', type: 'button', onClick: run }, 'Retry'),
          h('button', { class: 'btn btn-xs btn-ghost', type: 'button', onClick: () => box.remove() }, 'Discard'),
          h('span', { class: 'hint' }, 'Check every [VERIFY] before publishing.')));
    }).catch((e) => aiErrorInto(box, e, run));
  };
  run();
}
function aiErrorInto(box, e, retry) {
  clear(box);
  if (e && e.code === 'cancelled') { box.remove(); return; }
  if (aiPermanentError(e)) { box.append(h('div', { class: 'txt' }, 'AI is not available in this view. Use “Copy Research Brief” in the AI Research tab instead.')); return; }
  const msg = e && e.code === 'rate_limited' ? 'Too many AI requests right now. Try again in a minute.' : e && e.code === 'invalid_json' ? 'The answer could not be read as a list. Try again.' : 'The AI request failed. Try again.';
  box.append(h('div', { class: 'txt' }, msg), h('div', { class: 'acts' }, h('button', { class: 'btn btn-xs', type: 'button', onClick: retry }, 'Retry'), h('button', { class: 'btn btn-xs btn-ghost', type: 'button', onClick: () => box.remove() }, 'Discard')));
}
function aiPermanentError(e) {
  const perm = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  if (e && perm.includes(e.code)) { S.aiOk = false; setTimeout(() => { document.querySelectorAll('[data-ai]').forEach((b) => b.remove()); }, 0); return true; }
  return false;
}
