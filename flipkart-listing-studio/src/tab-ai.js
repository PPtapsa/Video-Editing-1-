/* ==========================================================================
   🤖 AI Research — keyword Excel → bank + coverage, competitor brief, paste-back importer
   ========================================================================== */
// SheetJS 0.18.5 with cell styling (bold/fill on export); also reads .xlsx/.xls/.csv keyword files
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
let xlsxPromise = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxPromise) xlsxPromise = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = XLSX_URL; s.onload = () => res(window.XLSX); s.onerror = () => { xlsxPromise = null; rej(new Error('SheetJS failed to load')); };
    document.head.append(s);
  });
  return xlsxPromise;
}
const KW = { file: null, wb: null, sheet: '', kwCol: '', volCol: '', rows: null };

function listingCorpusMap() {
  // stem -> [field labels] across the master listing + title
  const c = cat();
  const map = new Map();
  const add = (label, text) => { for (const s of Logic.stemSet(text)) { if (!map.has(s)) map.set(s, []); const a = map.get(s); if (!a.includes(label)) a.push(label); } };
  add('Title', curTitle().text);
  for (const f of allFields(c)) {
    if (['sku', 'hsn', 'manufacturer', 'packer', 'taxCode', 'coo', 'listingStatus', 'fulfilledBy', 'shipProvider', 'procType'].includes(f.key)) continue;
    const v = displayValue(f, getVal(f.key));
    if (v) add(f.label, v);
  }
  return map;
}
function addTargets() {
  const c = cat();
  const keys = ['searchKeywords', 'otherFeatures', 'suitableFor', 'usage', 'description', seoKey()];
  return keys.filter((k, i, a) => a.indexOf(k) === i).map((k) => fieldDef(k, c)).filter(Boolean);
}
function addWordTo(word, key) {
  const d = fieldDef(key);
  if (!d) return;
  const cur = getVal(key);
  if (d.type === 'fktm') setVal(key, Logic.dedupeCI((cur || []).concat(word)));
  else {
    const s = String(cur || '');
    const next = s ? s.replace(/\s+$/, '') + ' ' + word : word;
    if (d.limit && next.length > d.limit) { toast(d.label + ' would go over ' + d.limit + ' characters', 2000); return; }
    setVal(key, next);
  }
  toast('Added “' + word + '” to ' + d.label);
}

function renderAiTab(panel) {
  panel.append(keywordCard(), briefCard(), importerCard());
}

/* ---------- 8.1 keyword upload & bank ---------- */
function keywordCard() {
  const l = S.listing;
  const bank = l.keywordBank;
  const card = secCard('Raw Excel keyword upload → Keyword Bank', null, bank ? h('button', { class: 'btn btn-sm btn-ghost btn-danger', type: 'button', onClick: (e) => confirmPop(e.currentTarget, 'Remove the keyword bank from this listing?', () => { l.keywordBank = null; markDirty(); rerenderPanel(); }, 'Remove') }, 'Remove bank') : null);
  card.body.classList.add('pad');
  const body = h('div', { class: 'stack' });
  const file = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', hidden: true, onChange: (e) => readKwFile(e.target.files[0]) });
  const dz = h('div', { class: 'dropzone', tabindex: '0', role: 'button', onClick: () => file.click(), onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } },
    icon('upload', 22), h('div', null, h('b', null, 'Drop a keyword file or click to choose'), h('div', { class: 'hint' }, '.xlsx, .xls or .csv · parsed in your browser, nothing is uploaded')));
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) readKwFile(f); });
  body.append(file, dz);
  if (KW.wb) body.append(kwPicker());
  if (bank && bank.terms) body.append(bankView(bank));
  card.body.append(body);
  return card.el;
}
async function readKwFile(f) {
  if (!f) return;
  if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast('Choose a .xlsx, .xls or .csv file', 2000); return; }
  toast('Reading ' + f.name + '…', 1200);
  try {
    const XLSX = await loadXlsx();
    const buf = await f.arrayBuffer();
    KW.wb = XLSX.read(buf, { type: 'array' });
    KW.file = f.name;
    KW.sheet = KW.wb.SheetNames[0];
    pickDefaultCols();
    rerenderPanel();
  } catch (e) { toast('Could not read that file: ' + (e.message || 'unknown error'), 2600); }
}
function sheetRows() {
  const ws = KW.wb.Sheets[KW.sheet];
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
}
function pickDefaultCols() {
  const rows = sheetRows();
  const head = (rows[0] || []).map((x) => String(x));
  const kwI = head.findIndex((x) => /keyword|search\s*term|query|term/i.test(x));
  const vI = head.findIndex((x) => /volume|searches|impressions|count|traffic/i.test(x));
  KW.kwCol = String(kwI >= 0 ? kwI : 0);
  KW.volCol = vI >= 0 ? String(vI) : '';
}
function kwPicker() {
  const rows = sheetRows();
  const head = (rows[0] || []).map((x, i) => String(x || 'Column ' + (i + 1)));
  const sample = rows.slice(1, 4).map((r) => r[Number(KW.kwCol)]).filter(Boolean);
  return h('div', { class: 'info-box stack' },
    h('div', { class: 'row' }, h('b', null, KW.file), h('span', { class: 'hint' }, (rows.length - 1) + ' data rows in this sheet')),
    h('div', { class: 'form-grid' },
      h('label', { class: 'lbl-stack' }, 'Sheet', h('select', { class: 'sel sm', value: KW.sheet, onChange: (e) => { KW.sheet = e.target.value; pickDefaultCols(); rerenderPanel(); } }, KW.wb.SheetNames.map((n) => h('option', { value: n }, n)))),
      h('label', { class: 'lbl-stack' }, 'Keyword column', h('select', { class: 'sel sm', value: KW.kwCol, onChange: (e) => { KW.kwCol = e.target.value; rerenderPanel(); } }, head.map((x, i) => h('option', { value: String(i) }, x)))),
      h('label', { class: 'lbl-stack' }, 'Search volume / metric (optional)', h('select', { class: 'sel sm', value: KW.volCol, onChange: (e) => { KW.volCol = e.target.value; } }, h('option', { value: '' }, 'None'), head.map((x, i) => h('option', { value: String(i) }, x))))),
    sample.length ? h('div', { class: 'hint' }, 'Sample: ' + sample.join(' · ')) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: analyseKw }, 'Analyse keywords'), h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => { KW.wb = null; rerenderPanel(); } }, 'Cancel')));
}
function analyseKw() {
  const rows = sheetRows().slice(1);
  const ki = Number(KW.kwCol), vi = KW.volCol === '' ? -1 : Number(KW.volCol);
  const input = rows.map((r) => ({ kw: r[ki], vol: vi >= 0 ? r[vi] : null })).filter((r) => String(r.kw || '').trim());
  if (!input.length) { toast('That column has no keywords', 2000); return; }
  const res = Logic.analyzeKeywords(input);
  S.listing.keywordBank = {
    source: { file: KW.file, sheet: KW.sheet, rows: input.length, at: Date.now(), hasVolume: vi >= 0 },
    keywords: res.keywords.slice(0, 2000), terms: res.terms.slice(0, 2000)
  };
  KW.wb = null;
  markDirty(); rerenderPanel();
  toast(res.terms.length + ' root words from ' + res.keywords.length + ' unique keywords', 2000);
}
function bankView(bank) {
  const st = KW.view = KW.view || { q: '', cluster: '', sort: 'freq', showAll: false };
  const map = listingCorpusMap();
  const terms = bank.terms;
  const covered = terms.filter((t) => map.has(t.stem));
  const pct = terms.length ? Math.round((covered.length / terms.length) * 100) : 0;
  const uncovered = terms.filter((t) => !map.has(t.stem));
  const targets = addTargets();
  const wrap = h('div', { class: 'stack' });
  // coverage tracker
  const unc = h('div', { class: 'uncov' });
  for (const t of uncovered.slice(0, st.showAll ? uncovered.length : 60)) {
    const sel = h('select', { 'aria-label': 'Add “' + t.term + '” to field', onChange: (e) => { if (e.target.value) { addWordTo(t.term, e.target.value); rerenderPanel(); } } },
      h('option', { value: '' }, 'add to →'), targets.map((d) => h('option', { value: d.key }, d.label)));
    unc.append(h('span', { class: 'chip', title: t.cluster + ' · in ' + t.freq + ' keywords' }, t.term, sel));
  }
  wrap.append(
    h('div', { class: 'row' }, h('span', { class: 'tag teal' }, bank.source.file), h('span', { class: 'hint' }, bank.source.rows + ' rows · ' + bank.keywords.length + ' unique keywords · ' + terms.length + ' root words · analysed ' + Logic.fmtDateTime(bank.source.at))),
    h('div', { class: 'kpi-row' },
      h('div', { class: 'kpi' }, h('span', null, 'Word coverage'), h('b', null, pct + '%'), h('div', { class: 'bar' }, h('i', { style: { width: pct + '%' } })), h('div', { class: 'hint' }, covered.length + ' of ' + terms.length + ' words appear somewhere in the listing')),
      h('div', { class: 'kpi' }, h('span', null, 'Uncovered words'), h('b', null, uncovered.length), h('div', { class: 'hint' }, 'Add each to a field below, only if true for this product')),
      h('div', { class: 'kpi' }, h('span', null, 'Top term'), h('b', { style: { fontSize: '16px' } }, terms[0] ? terms[0].term : '—'), h('div', { class: 'hint' }, terms[0] ? 'in ' + terms[0].freq + ' keywords' : ''))),
    h('div', { class: 'subsec-title' }, 'Word Coverage Tracker — uncovered words'),
    uncovered.length ? unc : h('div', { class: 'hint' }, 'Every word from the file is covered somewhere in the listing.'),
    uncovered.length > 60 && !st.showAll ? h('button', { class: 'btn btn-xs btn-ghost', type: 'button', onClick: () => { st.showAll = true; rerenderPanel(); } }, 'Show all ' + uncovered.length) : null);
  // bank table
  let rows = terms.slice();
  if (st.q) rows = rows.filter((t) => t.term.includes(st.q.toLowerCase()));
  if (st.cluster) rows = rows.filter((t) => t.cluster === st.cluster);
  rows.sort((a, b) => st.sort === 'vol' ? (b.vol || 0) - (a.vol || 0) : st.sort === 'term' ? a.term.localeCompare(b.term) : b.freq - a.freq);
  const tbody = h('tbody');
  for (const t of rows.slice(0, 400)) {
    const where = map.get(t.stem);
    tbody.append(h('tr', null,
      h('td', null, t.term),
      h('td', { class: 'num' }, t.freq),
      h('td', null, h('select', { class: 'sel sm', style: { height: '26px', width: 'auto' }, 'aria-label': 'Cluster for ' + t.term, value: t.cluster, onChange: (e) => { t.cluster = e.target.value; markDirty(); } }, Logic.CLUSTERS.map((c) => h('option', { value: c }, c)))),
      h('td', { class: 'num' }, t.vol === null || t.vol === undefined ? '—' : Number(t.vol).toLocaleString('en-IN')),
      h('td', { title: where ? 'In: ' + where.join(', ') : 'Not in the listing yet' }, where ? h('span', { class: 'yes' }, '✓ ', h('span', { class: 'hint' }, where.slice(0, 2).join(', ') + (where.length > 2 ? '…' : ''))) : h('span', { class: 'no' }, '—'))));
  }
  const counts = {};
  for (const t of terms) counts[t.cluster] = (counts[t.cluster] || 0) + 1;
  wrap.append(
    h('div', { class: 'subsec-title' }, 'Keyword Bank'),
    h('div', { class: 'row' },
      h('input', { class: 'inp sm', style: { maxWidth: '220px' }, type: 'search', placeholder: 'Filter terms', value: st.q, 'aria-label': 'Filter terms', onInput: debounce((e) => { st.q = e.target.value; rerenderPanel(); }, 300) }),
      h('select', { class: 'sel sm', style: { width: 'auto' }, value: st.cluster, 'aria-label': 'Cluster filter', onChange: (e) => { st.cluster = e.target.value; rerenderPanel(); } }, h('option', { value: '' }, 'All clusters'), Logic.CLUSTERS.map((c) => h('option', { value: c }, c + ' (' + (counts[c] || 0) + ')'))),
      h('select', { class: 'sel sm', style: { width: 'auto' }, value: st.sort, 'aria-label': 'Sort terms', onChange: (e) => { st.sort = e.target.value; rerenderPanel(); } }, h('option', { value: 'freq' }, 'By frequency'), h('option', { value: 'vol' }, 'By volume'), h('option', { value: 'term' }, 'A–Z')),
      h('span', { class: 'hint' }, rows.length > 400 ? 'Showing 400 of ' + rows.length : rows.length + ' terms')),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Term'), h('th', null, 'Frequency'), h('th', null, 'Cluster'), h('th', null, 'Volume'), h('th', null, 'Covered in listing?'))), tbody)));
  return wrap;
}

/* ---------- 8.2 competitor brief ---------- */
function researchBrief() {
  const c = cat();
  return [
    'Find the TOP 5 Flipkart listings worth studying for this product — the strongest for Visibility × CTR × Conversion Potential × SEO × Buyer Trust × Listing Quality.',
    '',
    'Do not rank only by review count, rating or "Bestseller"/F-Assured badges. Analyze the full listing. Where actual CTR, CVR, sales or traffic data is unavailable, do not invent it. Use observable marketplace signals and label conclusions as estimated/proxy-based.',
    '',
    'For each of the Top 5 give:',
    '1. Product + Brand', '2. Flipkart link / FSN (if visible)', '3. Current price, MRP and % off', '4. Rating + rating/review count',
    '5. Exact/near-exact title structure (and which attributes Flipkart\'s title is built from)', '6. Highlights / key-features strategy', '7. Main keywords / search intent targeted',
    '8. Image + infographic strategy', '9. Rich product-description / brand-content strategy, if visible', '10. Strongest conversion elements (offers, assured badge, delivery, warranty, specs)',
    '11. Weaknesses / missed opportunities', '12. Why this listing likely performs well', '13. Visibility Score /10', '14. CTR Potential /10', '15. Conversion Potential /10', '16. Overall Listing Score /10',
    '',
    'Then: 🏆 #1 BEST LISTING TO STUDY — which is strongest and exactly what to learn from it. Never copy wording verbatim. Extract the strategy, structure, keyword patterns, hierarchy, persuasion and merchandising logic.',
    '',
    'THEN BUILD MY IDEAL FLIPKART LISTING, using everything learned, Flipkart search behaviour, buyer intent, review insights and expert judgment. Deliver:',
    'A. Optimised ' + (seoDef().label) + ' (≤' + (seoDef().limit || 80) + ' chars) + the resulting Flipkart auto-title' + (c.stepped ? ', plus Type and Installation Type picks (genuine only)' : '') + ' — for ranking + CTR + readability.',
    'B. Key Features / highlights (benefit-led, keyword-rich, scannable, objection-handling).',
    'C. Product Description (≤5000 chars).',
    'D. Search Keywords (Fkt-M list).',
    'E. Primary + Secondary + Long-tail keywords.',
    'F. Main (first) image recommendation.',
    'G. Recommended 5–10 image sequence and what each communicates.',
    'H. Rich description / brand-content structure.',
    'I. Top customer objections + how the listing solves them.',
    'J. Differentiation / positioning strategy.',
    'K. Final scorecard: SEO / CTR / Conversion / Trust / Differentiation — each /10.',
    '',
    'NON-NEGOTIABLE STANDARD — look for:',
    '- recurring words in high-ranking titles;', '- keyword placement patterns;', '- review-driven buying triggers;', '- negative-review pain points;', '- feature-vs-benefit positioning;', '- price/offer psychology;',
    '- trust signals;', '- specs customers actually care about;', '- title readability;', '- mobile-first structure;', '- main-image click appeal;', '- gaps competitors miss.',
    '',
    'Tell me what the leaders do, why it works, what they miss, and exactly how my listing outperforms them. Prioritise truth, relevance, search visibility, CTR, conversion, premium presentation and low return risk. If information about my product is missing, list what must be verified instead of inventing specs.',
    '',
    'Format the final listing (A–K) with each section starting on its own line as "A. …", and inside A write "Model Number: …", "Auto-title: …"' + (c.stepped ? ', "Type: …", "Installation Type: …"' : '') + ' on separate lines so I can import it.',
    '',
    '— MY PRODUCT (as entered; anything missing is unknown — mark it [VERIFY]) —',
    listingFactsText(8000),
    '',
    bankSummaryText(40)
  ].join('\n');
}
function briefCard() {
  const l = S.listing;
  const card = secCard('Flipkart Top-5 Competitor Study brief', null);
  card.body.classList.add('pad');
  const brief = researchBrief();
  const out = h('div', { class: 'ai-out', hidden: !l.research.answer, html: highlightVerify(l.research.answer || '') });
  let ctl = null;
  const runBtn = S.aiOk ? h('button', { class: 'btn btn-ai', type: 'button', dataset: { ai: '1' }, onClick: () => {
    if (ctl) { ctl.abort(); return; }
    ctl = new AbortController();
    runBtn.textContent = 'Stop';
    out.hidden = false; out.textContent = 'Thinking… a full study can take a few minutes.';
    S.ai(researchBrief(), { signal: ctl.signal, cache: false, modelTier: 'complex', onText: ({ text }) => { out.innerHTML = highlightVerify(text); } })
      .then((r) => { l.research.answer = r.text; markDirty(); if (r.truncated) toast('The answer was cut short. Ask for less at a time.', 2400); })
      .catch((e) => {
        if (e && e.text) { l.research.answer = e.text; markDirty(); }
        if (e && e.code === 'cancelled') return;
        if (aiPermanentError(e)) { out.textContent = 'AI is not available in this view. Use Copy Research Brief and paste it into a Claude chat with web search.'; return; }
        toast(e && e.code === 'rate_limited' ? 'Too many AI requests. Try again later.' : 'The study stopped early. You can run it again.', 2400);
      })
      .finally(() => { ctl = null; runBtn.textContent = '✨ Run in tool'; });
  } }, '✨ Run in tool') : null;
  card.body.append(h('div', { class: 'stack' },
    h('div', { class: 'note-line' }, 'Auto-filled with this listing’s facts and keyword-bank summary. Paste it into a Claude chat with web search for live Flipkart data.'),
    h('details', null, h('summary', { class: 'small', style: { cursor: 'pointer', fontWeight: 600 } }, 'Preview the brief (' + brief.length.toLocaleString('en-IN') + ' characters)'),
      h('textarea', { class: 'inp mono', rows: 12, readonly: true, value: brief, style: { fontSize: '12px', marginTop: '8px' }, 'aria-label': 'Research brief' })),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => doCopy(researchBrief(), 'Research brief copied ✓') }, icon('copy', 14), 'Copy Research Brief'),
      runBtn,
      S.aiOk ? h('span', { class: 'hint' }, 'Run in tool asks Claude from this page without live web search, so competitor details are from general knowledge and must be verified.') : null,
      l.research.answer ? h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { l.research.paste = l.research.answer; markDirty(); rerenderPanel(); toast('Answer sent to the importer below'); } }, 'Send answer to importer ↓') : null),
    out));
  return card.el;
}

/* ---------- 8.3 paste-back importer ---------- */
function importerCard() {
  const l = S.listing;
  const c = cat();
  const card = secCard('Paste-back importer', null);
  card.body.classList.add('pad');
  const ta = h('textarea', { class: 'inp', rows: 8, placeholder: 'Paste the AI’s final listing answer here (sections A–K). Nothing is applied until you click.', value: l.research.paste || '', 'aria-label': 'Paste AI answer',
    onInput: debounce(() => { l.research.paste = ta.value; markDirty(); }, 400) });
  const results = h('div', { class: 'stack' });
  const parse = () => {
    if (l.research.paste !== ta.value) { l.research.paste = ta.value; markDirty(); }
    clear(results);
    const secs = Logic.parsePasteBack(ta.value);
    if (!secs.length) { results.append(h('div', { class: 'hint' }, 'No recognisable sections found. Use headings like “Model Number:”, “Product Description”, “Search Keywords”.')); return; }
    for (const s of secs) results.append(importSection(s, c));
  };
  card.body.append(h('div', { class: 'stack' }, ta, h('div', { class: 'row' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: parse }, 'Parse sections'), h('span', { class: 'hint' }, 'Recognises Model Number, Model Name, Type, Installation Type, Key Features, Description, Search Keywords, keyword lists, Other Features, Certification, warranty text, Suitable For, Usage, Finish, Items Included, Series.')), results));
  if (l.research.paste) setTimeout(parse, 0);
  return card.el;
}
function importSection(s, c) {
  if (s.key === '_title') {
    const t = curTitle().text;
    return h('div', { class: 'imp-sec' }, h('div', { class: 'row' }, h('b', null, 'Auto-title (reference only)'), h('span', { class: 'hint' }, 'Flipkart builds the title from attributes; compare with your live title.')),
      h('div', { class: 'diff', html: diffHtml(t, String(s.value)) }));
  }
  const d = fieldDef(s.key, c);
  if (!d) return h('div', { class: 'imp-sec' }, h('div', { class: 'row' }, h('b', null, s.key), h('span', { class: 'tag' }, 'Not a field in ' + c.name)));
  let value = s.value;
  let note = null;
  if (d.type === 'multi') {
    const vals = Array.isArray(value) ? value : [value];
    const matched = Logic.matchOptions(vals, d.options);
    const unmatched = vals.filter((v) => !matched.some((m) => String(v).toLowerCase().includes(m.toLowerCase())));
    value = d.exactOne ? matched.slice(0, 1) : matched;
    if (unmatched.length) note = 'Not in the Flipkart option list, skipped: ' + unmatched.join(', ');
  } else if (d.type === 'fktm' && !Array.isArray(value)) value = Logic.splitList(value);
  else if (d.type !== 'fktm' && Array.isArray(value)) value = value.join(d.type === 'long' ? '\n' : ', ');
  const cur = getVal(s.key);
  const oldTxt = Array.isArray(cur) ? cur.join('\n') : String(cur || '');
  const newTxt = Array.isArray(value) ? value.join('\n') : String(value || '');
  const len = Array.isArray(value) ? value.length + ' values' : ctrText(newTxt.length, d.limit);
  const over = d.limit && !Array.isArray(value) && newTxt.length > d.limit;
  const applied = h('span', { class: 'tag green', hidden: true }, 'Applied');
  const sec = h('div', { class: 'imp-sec' },
    h('div', { class: 'row' }, h('b', null, d.label), h('span', { class: over ? 'ctr over' : 'ctr' }, len), h('span', { class: 'grow' }), applied,
      d.type === 'fktm' ? h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { setVal(s.key, Logic.dedupeCI((getVal(s.key) || []).concat(value))); applied.hidden = false; toast('Merged into ' + d.label); scheduleLive(); } }, 'Merge') : null,
      h('button', { class: 'btn btn-sm btn-teal', type: 'button', disabled: d.type === 'multi' && !value.length, onClick: () => { setVal(s.key, clone(value)); applied.hidden = false; toast('Applied to ' + d.label); scheduleLive(); } }, s.merge && d.type === 'fktm' ? 'Replace field' : 'Apply to field')),
    note ? h('div', { class: 'hint' }, note) : null,
    over ? h('div', { class: 'warn-box bad' }, h('span', { class: 'wi' }, icon('warn', 14)), h('span', { class: 'wt' }, 'Over the ' + d.limit + '-character limit. Trim it after applying.')) : null,
    h('div', { class: 'diff', html: oldTxt ? diffHtml(oldTxt, newTxt) : '<ins>' + esc(newTxt) + '</ins>' }));
  return sec;
}
