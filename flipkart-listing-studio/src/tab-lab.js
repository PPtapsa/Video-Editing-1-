/* ==========================================================================
   ⚡ Title & SEO Lab — guided builder, scores, SEO versions, keywords, warranty
   ========================================================================== */
const VERSION_DEFS = [
  { id: 'keywordMax', name: 'Keyword-Max', desc: 'Highest coverage of high-intent terms, still readable.' },
  { id: 'balanced', name: 'Balanced', desc: 'Recommended default: coverage plus readability.', rec: true },
  { id: 'premium', name: 'Premium / Readable', desc: 'Brand-forward, luxury tone, cleanest read.' },
  { id: 'mobileFirst', name: 'Mobile-First', desc: 'The most important words inside the first ~40 characters.' }
];
const LAB = {};

function seoKey() { return cat().seoField || 'modelNumber'; }
function seoDef() { return fieldDef(seoKey()) || { key: seoKey(), label: 'Model Number', limit: 80 }; }
function titleWith(key, value) { return titleFor(S.listing, curVariant(), (k) => (k === key ? value : getVal(k))); }
function bankTerms() { const b = S.listing.keywordBank; return b && b.terms ? b.terms : []; }

/* listing text that counts as "facts" — used to corroborate keyword-bank terms */
function factCorpus(excludeKey) {
  const c = cat();
  return allFields(c).filter((f) => f.key !== excludeKey && !['sku', 'hsn', 'manufacturer', 'packer', 'taxCode', 'coo'].includes(f.key))
    .map((f) => displayValue(f, getVal(f.key))).join(' ');
}
function stepState() {
  const c = cat();
  const types = getVal('type') || [];
  const inst = getVal('installationType') || [];
  const s1 = types.length > 0 && types.join(', ').length <= 80;
  const s2 = inst.length === 1;
  return { s1, s2, s3: s1 && s2 && !!String(getVal(seoKey()) || '').trim() && String(getVal(seoKey()) || '').length <= (seoDef().limit || 80), stepped: !!c.stepped };
}

/* ---------- rule-based SEO versions ---------- */
function ruleVersions() {
  const l = S.listing, c = cat();
  const key = seoKey(), limit = seoDef().limit || 80;
  const base = titleWith(key, '');
  const taken = new Set(Logic.tokenize(base.text).map(Logic.stem));
  const facts = factCorpus(null);
  const factStems = Logic.stemSet(facts);
  const existing = String(getVal(key) || '');
  const code = (existing.match(/\b[a-z]*\d[\w-]*\b/gi) || []).find((w) => !/^(ss|aisi)?-?(30[1-9]|316l?)$/i.test(w) && !/^\d+(\.\d+)?(x\d+(\.\d+)?)+$/i.test(w) && !/^\d+(mm|cm|inch|in|m)$/i.test(w)) || '';
  const mats = (getVal('material') || []).flatMap((m) => { const g = (m.match(/\((.*?)\)/) || [])[1]; const b = m.replace(/\(.*?\)/g, '').trim(); return g && /\d/.test(g) ? [g.replace(/\s+/g, ''), b] : [b]; });
  const finishes = (getVal('finish') || []).concat(getVal('brandColor') || []);
  const sizeTok = (l.tokens || []).find((t) => /size/i.test(t.name));
  const size = sizeTok && sizeTok.forms[0] ? sizeTok.forms[0] : '';
  const features = (getVal('otherFeatures') || []).filter((x) => x.split(/\s+/).length <= 3 && !/\[verify/i.test(x));
  const uses = (getVal('suitableFor') || []).concat(getVal('usage') || []).filter((x) => x.split(/\s+/).length <= 2);
  const terms = bankTerms();
  const corroborated = terms.filter((t) => factStems.has(t.stem));
  const locTerms = terms.filter((t) => t.cluster === 'Use-location').map((t) => t.term);
  const bankFeat = corroborated.filter((t) => ['Feature', 'Material', 'Finish', 'Size', 'Product type'].includes(t.cluster)).map((t) => t.term);
  const unconfirmed = terms.filter((t) => !factStems.has(t.stem) && ['Feature', 'Material', 'Finish', 'Size', 'Product type'].includes(t.cluster)).slice(0, 12).map((t) => t.term);

  function compose(parts, locs, budget, opts) {
    opts = opts || {};
    const used = new Set(opts.allowTaken ? [] : [...taken]);
    const out = [];
    const tryAdd = (phrase) => {
      const words = String(phrase || '').split(/\s+/).filter(Boolean).filter((w) => { const st = Logic.tokenize(w).map(Logic.stem); return st.length && !st.every((s) => used.has(s)); });
      if (!words.length) return;
      const cand = out.concat(words).join(' ');
      if (cand.length > budget) return;
      words.forEach((w) => Logic.tokenize(w).forEach((s) => used.add(Logic.stem(s))));
      out.push(...words);
    };
    parts.forEach(tryAdd);
    const L = [];
    for (const loc of locs) {
      const st = Logic.tokenize(loc).map(Logic.stem);
      if (st.every((s) => used.has(s))) continue;
      const cand = out.concat(['for'], L.concat(loc).join(' & ').split(' ')).join(' ');
      if (cand.length > budget) break;
      L.push(loc); st.forEach((s) => used.add(s));
    }
    let text = out.join(' ') + (L.length ? ' for ' + L.join(' & ') : '');
    return Logic.smartTitleCase(text.trim());
  }
  const brandName = l.brand;
  const tone = /tapsa/i.test(brandName) || terms.some((t) => /luxury|premium|designer/.test(t.term)) ? 'Luxury' : '';
  // the current value is the seller's own wording: keep its words (minus the code) as a fact phrase
  const own = existing.split(/\s+/).filter((w) => w && w !== code).join(' ');
  const series = getVal('series');
  const v = {
    keywordMax: compose([code, series, own, ...mats, ...bankFeat, ...features, size, ...finishes], locTerms.concat(uses), limit),
    balanced: compose([code, series, own, mats[0], ...bankFeat.slice(0, 2), features[0], size], locTerms.slice(0, 1).concat(uses.slice(0, 1)), Math.min(limit, 66)),
    premium: compose([brandName, series, finishes[0], tone, own, mats[0], features[0], code], [], Math.min(limit, 60)),
    mobileFirst: compose([bankFeat[0], mats[0], own, series, code, size, bankFeat[1]], locTerms.slice(0, 1), Math.min(limit, 60))
  };
  return { versions: v, unconfirmed, hasFacts: !!(code || own || getVal('series') || mats.length || finishes.length || features.length || corroborated.length) };
}

/* ---------- prompts ---------- */
function listingFactsText(maxLen) {
  const c = cat();
  const lines = ['Brand: ' + S.listing.brand, 'Flipkart vertical: ' + c.name, 'Auto-title formula: ' + c.titleFormula];
  for (const f of allFields(c)) {
    if (['manufacturer', 'packer', 'shipProvider', 'fulfilledBy', 'listingStatus', 'taxCode', 'luxuryCess', 'minoq', 'stock', 'procSla', 'procType', 'localFee', 'zonalFee', 'nationalFee', 'hsn'].includes(f.key)) continue;
    const v = displayValue(f, getVal(f.key));
    if (v) lines.push(f.label + ': ' + v);
  }
  const t = curTitle();
  if (t.text) lines.push('Current auto-title: ' + t.text);
  const s = lines.join('\n');
  return maxLen && s.length > maxLen ? s.slice(0, maxLen) : s;
}
function bankSummaryText(n) {
  const terms = bankTerms();
  if (!terms.length) return 'Keyword bank: none uploaded.';
  const kws = (S.listing.keywordBank.keywords || []).slice(0, 25).map((k) => k.kw + (k.vol !== null && k.vol !== undefined ? ' (' + k.vol + ')' : ''));
  return 'Keyword bank — top root terms (term · frequency · cluster):\n' + terms.slice(0, n || 50).map((t) => t.term + ' · ' + t.freq + ' · ' + t.cluster).join('\n') +
    '\nTop keyword phrases' + (kws.some((k) => /\(/.test(k)) ? ' (search volume)' : '') + ':\n' + kws.join('\n');
}
const AI_RULES = 'Rules: never invent specs — mark any unknown or unverified spec as [VERIFY]. Use only facts given below or clearly generic wording. Write for Flipkart India buyers.';
function aiFieldPrompt(def, current) {
  const c = cat();
  const lim = def.limit ? 'Hard limit: ' + def.limit + ' characters. Stay within it.' : 'No hard character limit; keep it scannable.';
  let task = 'Write the "' + def.label + '" field of this Flipkart listing.';
  if (def.key === seoKey()) {
    const base = titleWith(def.key, '');
    task = 'Write the "' + def.label + '" field. Flipkart builds the title as: ' + c.titleFormula + '. The rest of the title is already: "' + base.text + '". Do not repeat words that are already in that title. Put the strongest buyer search words early and keep it readable.';
  }
  if (def.key === 'description') task = 'Write the Product Description: benefit-led, scannable short paragraphs, plain text (no markdown), keyword-rich without stuffing.';
  if (def.key === 'warrantySummary') task = 'Write a one-to-two sentence Warranty Summary using only the warranty facts given. If coverage is not given, use [VERIFY] placeholders.';
  const fmt = def.type === 'fktm' ? 'Reply with only a JSON array of strings, one value per item, no duplicates.' : 'Reply with only the field text, no quotes, no labels, no explanation.';
  return [task, AI_RULES, lim, fmt, '', 'Product facts as entered:', listingFactsText(6000), '', bankSummaryText(40), '', 'Current value of this field: ' + (displayValue(def, current) || '(empty)')].join('\n');
}

/* ---------- render ---------- */
function gaugeEl() {
  const C = 2 * Math.PI * 60;
  const el = h('div', { class: 'gauge', html: '<svg viewBox="0 0 150 150" aria-hidden="true"><circle class="trk" cx="75" cy="75" r="60" fill="none" stroke-width="12"/><circle class="val" cx="75" cy="75" r="60" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg>' },
    h('div', { class: 'lbl' }, h('div', null, h('b', null, '—'), h('span', null, '—'))));
  return el;
}
function setGauge(el, score, band) {
  const C = 2 * Math.PI * 60;
  const val = el.querySelector('.val');
  val.style.strokeDashoffset = String(C * (1 - (score || 0) / 100));
  val.style.stroke = band === 'Excellent' ? 'var(--ok)' : band === 'Good' ? 'var(--fk)' : 'var(--bad)';
  el.querySelector('.lbl b').textContent = score === null ? '—' : String(score);
  const sp = el.querySelector('.lbl span');
  sp.textContent = band || '—';
  sp.className = band === 'Excellent' ? 'b-ex' : band === 'Good' ? 'b-good' : 'b-fix';
}
function densTable(title, rows) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return h('div', { class: 'dens' }, h('h5', null, title),
    rows.length ? rows.map((r) => h('div', { class: 'dens-row' + (r.count > 2 ? ' hot' : ''), title: r.count > 2 ? 'Repeated more than twice' : '' },
      h('span', { class: 'term' }, h('i', { style: { width: Math.round((r.count / max) * 100) + '%' } }), h('em', null, r.term)),
      h('span', { class: 'c' }, '×' + r.count), h('span', { class: 'p' }, r.pct + '%'))) : h('div', { class: 'hint' }, '—'));
}

function renderLabTab(panel) {
  const c = cat();
  const key = seoKey();
  const st = stepState();
  LAB.el = {};

  /* 7.1 guided builder */
  const builder = secCard('Guided title builder', null, h('span', { class: 'hint mono' }, c.titleFormula));
  builder.body.classList.add('pad');
  const live = h('div', { class: 'live-title', 'aria-live': 'polite' });
  const liveMeta = h('div', { class: 'row small muted' });
  LAB.el.live = live; LAB.el.liveMeta = liveMeta;
  const steps = h('div', { class: 'steps' });
  if (c.stepped) {
    const typeDef = fieldDef('type'), instDef = fieldDef('installationType');
    const s1 = h('div', { class: 'lstep' + (st.s1 ? ' valid' : ''), dataset: { step: '1' } },
      h('div', { class: 'lstep-head' }, h('span', { class: 'n' }, st.s1 ? icon('check', 12) : '1'), h('h4', null, 'STEP 1 — Decide Type')),
      h('p', null, 'Select only genuinely applicable Types. No Types just for SEO, no internal components unless they are the product being sold, no near-duplicates.'),
      typeDef ? fieldRow(typeDef, { idSuffix: '_lab' }) : null);
    const s2 = h('div', { class: 'lstep' + (st.s2 ? ' valid' : ''), dataset: { step: '2' } },
      h('div', { class: 'lstep-head' }, h('span', { class: 'n' }, st.s2 ? icon('check', 12) : '2'), h('h4', null, 'STEP 2 — Decide Installation Type')),
      h('p', null, 'Exactly one, from the actual physical installation method. Never chosen to change the title wording.'),
      instDef ? fieldRow(instDef, { idSuffix: '_lab' }) : null);
    const locked = !(st.s1 && st.s2);
    const s3body = h('div');
    const s3 = h('div', { class: 'lstep' + (locked ? ' locked' : '') + (st.s3 ? ' valid' : ''), dataset: { step: '3' } },
      h('div', { class: 'lstep-head' }, h('span', { class: 'n' }, locked ? icon('lock', 12) : st.s3 ? icon('check', 12) : '3'), h('h4', null, 'STEP 3 — Build the Model Number')),
      h('p', null, 'This is where the SEO happens: the strongest editable Model Number within 80 characters, without repeating words Type and Installation already put in the title.'),
      s3body);
    if (locked) s3body.append(h('div', { class: 'info-box' }, icon('lock', 13), ' Unlocks when Step 1 has at least one Type within 80 combined characters and Step 2 has exactly one Installation Type.'));
    else s3body.append(fieldRow(fieldDef(key), { idSuffix: '_lab' }), h('div', { class: 'small', dataset: { repeat: '1' } }));
    steps.append(s1, s2, s3);
  } else {
    const tm = c.fields.filter((f) => f.title);
    const wrap = h('div', { class: 'lstep valid' }, h('div', { class: 'lstep-head' }, h('h4', null, 'Attributes that make up the title')),
      h('p', null, 'Every selected value is printed into the title. Watch the live title and the “what if” list below as you add values.'));
    for (const f of tm) wrap.append(fieldRow(f, { idSuffix: '_lab' }));
    if (!tm.some((f) => f.key === key) && fieldDef(key)) wrap.append(fieldRow(fieldDef(key), { idSuffix: '_lab' }), h('div', { class: 'small', dataset: { repeat: '1' } }));
    steps.append(wrap);
    if (!c.titleVerified) steps.prepend(h('div', { class: 'warn-box' }, h('span', { class: 'wi' }, icon('warn', 14)), h('span', { class: 'wt' }, 'Unverified — edit in Category Builder. Flipkart’s exact title formula for ' + c.name + ' is not confirmed.'), h('button', { class: 'btn btn-xs', type: 'button', onClick: () => openCategoryBuilder(c.id) }, 'Edit formula')));
  }
  const whatIf = h('div', { class: 'whatif-list' });
  LAB.el.whatIf = whatIf;
  const caseSeg = h('div', { class: 'seg sm', role: 'radiogroup', 'aria-label': 'Title case' },
    [['smart', 'Smart Title Case'], ['typed', 'As typed'], ['upper', 'UPPERCASE']].map(([k, lab]) => h('button', { type: 'button', class: (S.listing.titleCase || 'typed') === k ? 'on' : '', dataset: { case: k }, onClick: () => { S.listing.titleCase = k; markDirty(); caseSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.case === k)); } }, lab)));
  builder.body.append(h('div', { class: 'lab-grid' },
    h('div', { class: 'stack compact' }, steps),
    h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('b', null, 'Live auto-title'), h('span', { class: 'grow' }), copyBtn(() => caseText(curTitle().text, S.listing.titleCase, true), 'Copy title')),
      live, liveMeta,
      h('div', { class: 'row' }, caseSeg, tipI('Smart Title Case capitalises each word, keeps a, an, the, and, or, nor, but, of, to, in, on, at, by, for, with, from, per, via, vs in lowercase unless first, and never changes tokens with digits or mixed case (SS304, 48x4, 120cm, AquaLock™) or acronyms (ISI, PTMT, AISI). UPPERCASE is preview-only.'),
        h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { const v = String(getVal(key) || ''); const n = Logic.smartTitleCase(v); if (n === v) { toast('Already in Smart Title Case'); return; } setVal(key, n); rerenderPanel(); toast('Smart Title Case applied to ' + seoDef().label); } }, 'Apply Smart Title Case to ' + seoDef().label)),
      h('div', { class: 'row' }, h('b', { class: 'small' }, 'What each extra selection does to the title'), tipI('Shows how many characters the title gains or loses if you toggle each value. Amber = adds length, green = removes.')),
      whatIf)));
  panel.append(builder.el);

  /* 7.4 scores */
  const scores = secCard('Scores', null, tipI(Logic.READABILITY_DOC));
  scores.body.classList.add('pad');
  const gauge = gaugeEl(); LAB.el.gauge = gauge;
  const breakdown = h('div', { class: 'breakdown' }); LAB.el.breakdown = breakdown;
  const kpis = h('div', { class: 'kpi-row' }); LAB.el.kpis = kpis;
  const dens = h('div', { class: 'dens-grid' }); LAB.el.dens = dens;
  scores.body.append(h('div', { class: 'stack', style: { gap: '16px' } },
    h('div', { class: 'scores' }, h('div', { class: 'stack', style: { alignItems: 'center' } }, gauge, h('div', { class: 'small muted' }, 'Human-Readability Flow')),
      h('div', { class: 'stack' }, kpis, h('div', null, h('div', { class: 'small', style: { fontWeight: 700, marginBottom: '4px' } }, 'Score breakdown'), breakdown))),
    h('div', null, h('div', { class: 'row', style: { marginBottom: '8px' } }, h('b', null, 'Keyword density'), tipI('x1 = single words, x2 = 2-word phrases, x3 = 3-word phrases in the auto-title. Density = count ÷ all n-grams of that length. Amber = repeated more than twice.')), dens)));
  panel.append(scores.el);

  /* 7.2 SEO versions */
  const verHead = h('div', { class: 'row' },
    h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { const r = ruleVersions(); S.listing.seoVersions = Object.assign({}, S.listing.seoVersions, r.versions, { _unconfirmed: r.unconfirmed, _src: 'rules' }); markDirty(); rerenderPanel(); toast(r.hasFacts ? 'Versions rebuilt from attributes and keyword bank' : 'Add Series, Material, Finish or a keyword bank first', 2000); } }, icon('restore', 13), 'Build from rules'),
    S.aiOk ? h('button', { class: 'btn btn-sm btn-ai', type: 'button', dataset: { ai: '1' }, onClick: aiVersions }, icon('spark', 13), '✨ AI generate') : null);
  const vers = secCard('SEO versions of the ' + seoDef().label, null, verHead);
  vers.body.classList.add('pad');
  const sv = S.listing.seoVersions || {};
  const vgrid = h('div', { class: 'versions' });
  LAB.el.vers = {};
  for (const d of VERSION_DEFS) {
    const ta = h('textarea', { class: 'inp', 'aria-label': d.name + ' version', value: sv[d.id] || '', placeholder: 'Build from rules or type your own',
      onInput: () => { S.listing.seoVersions = Object.assign({}, S.listing.seoVersions, { [d.id]: ta.value }); markDirty(); updateVersion(d.id); } });
    const ctr = h('span', { class: 'ctr' });
    const info = h('div', { class: 'ver-scores' });
    const tprev = h('div', { class: 'ver-title' });
    LAB.el.vers[d.id] = { ta, ctr, info, tprev };
    vgrid.append(h('div', { class: 'ver' + (d.rec ? ' rec' : '') },
      h('div', { class: 'ver-head' }, h('h4', null, d.name), d.rec ? h('span', { class: 'tag teal' }, 'Recommended') : null, ctr, copyBtn(() => ta.value, 'Copy ' + d.name)),
      h('div', { class: 'hint' }, d.desc), ta, tprev, info,
      h('button', { class: 'btn btn-sm btn-primary', type: 'button', disabled: c.stepped && !(st.s1 && st.s2), title: c.stepped && !(st.s1 && st.s2) ? 'Finish Steps 1 and 2 first' : '', onClick: () => { const v = ta.value.trim(); if (!v) { toast('This version is empty'); return; } setVal(key, v); rerenderPanel(); toast('Pushed into ' + seoDef().label); } }, 'Use this')));
  }
  vers.body.append(vgrid);
  if (sv._unconfirmed && sv._unconfirmed.length) vers.body.append(h('div', { class: 'info-box', style: { marginTop: '10px' } }, h('b', null, 'Bank terms left out because the listing does not confirm them: '), sv._unconfirmed.join(', '), '. Add them to the listing facts (features, description, material) if they are true, then rebuild.'));
  if (!bankTerms().length) vers.body.append(h('div', { class: 'hint', style: { marginTop: '8px' } }, 'Tip: upload a keyword Excel in 🤖 AI Research to drive coverage scoring and better versions.'));
  panel.append(vers.el);

  /* 7.5 backend keywords */
  panel.append(searchKeywordsBuilder());
  /* 7.6 warranty */
  panel.append(warrantyBuilder());
  labLive();
}

function updateVersion(id) {
  const e = LAB.el.vers && LAB.el.vers[id];
  if (!e) return;
  const key = seoKey(), limit = seoDef().limit;
  const v = e.ta.value.trim();
  setCtr(e.ctr, e.ta.value.length, limit);
  clear(e.info); clear(e.tprev);
  if (!v) { e.tprev.textContent = 'Resulting title appears here'; return; }
  const t = titleWith(key, v);
  e.tprev.textContent = caseText(t.text, S.listing.titleCase, true);
  const r = Logic.readability(t.text);
  const terms = bankTerms();
  const cov = terms.length ? Logic.coverage(terms.slice(0, 25), t.text).pct : null;
  const first40 = t.text.slice(0, 40);
  e.info.append(
    h('span', null, 'Flow ', h('b', { class: r.band === 'Excellent' ? 'b-ex' : r.band === 'Good' ? 'b-good' : 'b-fix' }, r.score)),
    h('span', null, 'Coverage ', h('b', null, cov === null ? '—' : cov + '%')),
    h('span', { title: 'First 40 characters of the full title' }, 'First 40: ', h('b', null, '“' + first40 + (t.text.length > 40 ? '…' : '') + '”')));
}
function labLive() {
  if (!LAB.el || !LAB.el.live || !LAB.el.live.isConnected) return;
  const c = cat();
  const key = seoKey();
  const t = curTitle();
  const mode = S.listing.titleCase || 'typed';
  clear(LAB.el.live).append(...titleNodes(t, mode));
  if (!t.text) LAB.el.live.prepend(h('span', { class: 'muted' }, 'Fill the title-making attributes to see the auto-title. '));
  insertCutMarkerLab(LAB.el.live);
  clear(LAB.el.liveMeta).append(h('span', { class: 'mono' }, t.text.length + ' characters'), h('span', null, '· ' + seoDef().label + ' ' + String(getVal(key) || '').length + ' / ' + (seoDef().limit || '∞')),
    h('span', null, '· Mobile shows: “' + t.text.slice(0, 40) + (t.text.length > 40 ? '…' : '') + '”'));
  // step states
  const st = stepState();
  if (c.stepped) {
    const steps = S.el.panel.querySelectorAll('.lstep[data-step]');
    const was = steps[2] && steps[2].classList.contains('locked');
    const nowLocked = !(st.s1 && st.s2);
    if (steps.length === 3 && was !== nowLocked) { rerenderPanel(); return; }
    if (steps[0]) steps[0].classList.toggle('valid', st.s1);
    if (steps[1]) steps[1].classList.toggle('valid', st.s2);
    if (steps[2]) steps[2].classList.toggle('valid', st.s3);
  }
  // repeated words between SEO field and the rest of the title
  const rep = S.el.panel.querySelector('[data-repeat]');
  if (rep) {
    clear(rep);
    const rest = titleWith(key, '');
    const restStems = new Set(Logic.tokenize(rest.text).map(Logic.stem));
    const words = Logic.tokenize(getVal(key) || '').filter((w) => !Logic.STOP.has(w) && restStems.has(Logic.stem(w)));
    const uniq = [...new Set(words)];
    if (uniq.length) rep.append(h('span', null, 'Already in the title from other attributes: '), uniq.map((w) => [h('span', { class: 'repeat-word' }, w), ' ']), h('span', { class: 'muted' }, '— remove them from the ' + seoDef().label + '.'));
    else if (String(getVal(key) || '').trim()) rep.append(h('span', { class: 'muted' }, 'No words repeated from the other title attributes.'));
  }
  // what-if
  const wi = clear(LAB.el.whatIf);
  const base = t.text.length;
  for (const f of c.fields.filter((x) => x.title && x.type === 'multi')) {
    const vals = getVal(f.key) || [];
    for (const o of f.options || []) {
      const next = vals.includes(o) ? vals.filter((x) => x !== o) : vals.concat(o);
      const nt = titleFor(S.listing, curVariant(), (k) => (k === f.key ? next : getVal(k))).text;
      const d = nt.length - base;
      wi.append(h('div', { class: 'whatif-row', title: nt },
        h('span', { class: 'tag ' + (vals.includes(o) ? 'teal' : '') }, (vals.includes(o) ? '− ' : '+ ') + o),
        h('span', { class: 't' }, nt),
        h('span', { class: 'd ' + (d > 0 ? 'd-plus' : 'd-minus') }, (d > 0 ? '+' : '') + d)));
    }
  }
  if (!wi.children.length) wi.append(h('div', { class: 'hint' }, 'No multi-select title attributes in this category.'));
  // scores
  const shown = caseText(t.text, mode, true);
  const r = Logic.readability(shown);
  setGauge(LAB.el.gauge, t.text ? r.score : null, t.text ? r.band : null);
  clear(LAB.el.breakdown);
  if (!t.text) LAB.el.breakdown.append(h('div', { class: 'hint' }, 'No title yet.'));
  else if (!r.parts.length) LAB.el.breakdown.append(h('div', { class: 'hint' }, 'No penalties. Clean read.'));
  else for (const p of r.parts) LAB.el.breakdown.append(h('div', null, h('span', null, p.label), h('span', { class: 'neg' }, p.delta)));
  const terms = bankTerms();
  const cov = terms.length ? Logic.coverage(terms.slice(0, 25), t.text) : null;
  const limit = seoDef().limit || 80;
  const sl = String(getVal(key) || '').length;
  clear(LAB.el.kpis).append(
    h('div', { class: 'kpi', title: 'Share of the top 25 keyword-bank terms (by frequency) present in the auto-title' }, h('span', null, 'Keyword coverage'), h('b', null, cov ? cov.pct + '%' : '—'), h('div', { class: 'bar' }, h('i', { style: { width: (cov ? cov.pct : 0) + '%' } })),
      h('div', { class: 'hint' }, cov ? 'Top 25 bank terms' : 'Upload a keyword bank in AI Research')),
    h('div', { class: 'kpi' }, h('span', null, seoDef().label + ' length'), h('b', { class: sl > limit ? 'b-fix' : '' }, sl + ' / ' + limit), h('div', { class: 'bar' }, h('i', { class: sl > limit ? 'over' : '', style: { width: Math.min(100, (sl / limit) * 100) + '%' } }))),
    h('div', { class: 'kpi' }, h('span', null, 'Auto-title length'), h('b', null, t.text.length), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, (t.text.length / 150) * 100) + '%' } })), h('div', { class: 'hint' }, 'Mobile cut ≈ 40 characters')));
  const kd = Logic.keywordDensity(t.text, 8);
  clear(LAB.el.dens).append(densTable('x1 · words', kd.x1), densTable('x2 · 2-word phrases', kd.x2), densTable('x3 · 3-word phrases', kd.x3));
  for (const d of VERSION_DEFS) updateVersion(d.id);
}
function insertCutMarkerLab(el) { insertCutMarker(el, 40); }

/* ---------- AI versions ---------- */
function aiVersions(e) {
  const btn = e.currentTarget;
  const key = seoKey(), def = seoDef();
  const base = titleWith(key, '');
  const prompt = [
    'Create 4 alternate versions of the "' + def.label + '" field for this Flipkart listing.',
    'Flipkart auto-builds the title as: ' + cat().titleFormula + '. The rest of the title is already: "' + base.text + '". Do not repeat words already in it.',
    'Versions: keywordMax (highest coverage of high-intent terms, still grammatical), balanced (coverage + readability, the recommended default), premium (brand-forward, luxury tone, cleanest read), mobileFirst (most important words inside the first ~40 characters of the full title).',
    AI_RULES, 'Hard limit per version: ' + (def.limit || 80) + ' characters.',
    'Reply with only JSON: {"keywordMax": "...", "balanced": "...", "premium": "...", "mobileFirst": "..."}',
    '', 'Product facts:', listingFactsText(6000), '', bankSummaryText(50)
  ].join('\n');
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Thinking…';
  S.ai.json(prompt, { cache: false }).then((r) => {
    const out = {};
    for (const d of VERSION_DEFS) if (r && typeof r[d.id] === 'string') out[d.id] = r[d.id].trim();
    S.listing.seoVersions = Object.assign({}, S.listing.seoVersions, out, { _src: 'ai' });
    markDirty(); rerenderPanel(); toast('AI versions ready. Check every [VERIFY].', 1800);
  }).catch((err) => {
    btn.disabled = false; btn.textContent = old;
    if (err && err.code === 'cancelled') return;
    if (aiPermanentError(err)) { toast('AI is off in this view. Use the Research Brief instead.', 2200); return; }
    toast(err && err.code === 'rate_limited' ? 'Too many AI requests. Try again in a minute.' : 'AI request failed. Try again.', 2200);
  });
}

/* ---------- 7.5 Search Keywords builder ---------- */
function searchKeywordsBuilder() {
  const card = secCard('Backend / Search Keywords builder', null);
  card.body.classList.add('pad');
  const l = S.listing;
  l.ui.skHideCovered = l.ui.skHideCovered !== false;
  const field = fieldDef('searchKeywords');
  const bank = l.keywordBank;
  const body = h('div', { class: 'stack' });
  if (!bank || !bank.keywords || !bank.keywords.length) {
    body.append(h('div', { class: 'info-box' }, 'Upload a keyword Excel in 🤖 AI Research to fill this builder from your keyword bank.'));
  } else {
    const t = curTitle();
    const titleStems = Logic.stemSet(t.text);
    const existing = new Set((getVal('searchKeywords') || []).map((x) => x.toLowerCase()));
    let cands = bank.keywords.map((k) => k.kw).filter((k) => !existing.has(k.toLowerCase()));
    if (l.ui.skHideCovered) cands = cands.filter((k) => !Logic.tokenize(k).filter((w) => !Logic.STOP.has(w)).every((w) => titleStems.has(Logic.stem(w))));
    cands = Logic.dedupeCI(cands).slice(0, 80);
    const picked = new Set();
    const chips = h('div', { class: 'uncov' });
    const countEl = h('span', { class: 'hint' });
    const drawCount = () => { countEl.textContent = picked.size + ' selected of ' + cands.length + ' suggestions'; };
    for (const k of cands) {
      const cb = h('input', { type: 'checkbox', onChange: () => { if (cb.checked) picked.add(k); else picked.delete(k); drawCount(); } });
      chips.append(h('label', { class: 'chip check', style: { paddingRight: '8px' } }, cb, k));
    }
    drawCount();
    body.append(
      h('div', { class: 'row' },
        h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: l.ui.skHideCovered, onChange: (e) => { l.ui.skHideCovered = e.target.checked; markDirty(); rerenderPanel(); } }), 'Hide keywords whose words are all in the title already'),
        h('span', { class: 'grow' }), countEl,
        h('button', { class: 'btn btn-sm', type: 'button', onClick: () => { chips.querySelectorAll('input').forEach((cb, i) => { cb.checked = true; picked.add(cands[i]); }); drawCount(); } }, 'Select all'),
        h('button', { class: 'btn btn-sm btn-primary', type: 'button', onClick: () => { if (!picked.size) { toast('Select keywords first'); return; } setVal('searchKeywords', Logic.dedupeCI((getVal('searchKeywords') || []).concat([...picked]))); rerenderPanel(); toast(picked.size + ' added to Search Keywords'); } }, 'Add selected to Search Keywords')),
      cands.length ? chips : h('div', { class: 'hint' }, 'Every bank keyword is already covered or added.'));
  }
  if (field) body.append(h('div', { class: 'subsec-title' }, 'Search Keywords field (Fkt-M)'), fieldRow(field, { idSuffix: '_lab' }));
  card.body.append(body);
  return card.el;
}

/* ---------- 7.6 Warranty builder ---------- */
function warrantyBuilder() {
  const c = cat();
  const l = S.listing;
  const has = (k) => !!fieldDef(k, c);
  const card = secCard('Warranty builder', null);
  card.body.classList.add('pad');
  const wd = l.warrantyDraft = l.warrantyDraft || { preset: '', covered: [], notCovered: [], service: '' };
  const presets = [['Lifetime', null], ['10 year', 10], ['5 year', 5], ['2 year', 2], ['1 year', 1]];
  const out = h('div', { class: 'stack' });
  const gen = () => {
    const p = presets.find((x) => x[0] === wd.preset);
    const period = !p ? '[VERIFY: warranty period]' : p[1] === null ? 'Lifetime' : p[1] + ' Year';
    const cov = wd.covered.length ? wd.covered.join(', ') : '[VERIFY: list what is covered]';
    const notCov = wd.notCovered.length ? wd.notCovered.join(', ') : '[VERIFY: list what is not covered]';
    const svc = wd.service.trim() || '[VERIFY: warranty service type]';
    return {
      n: p && p[1] !== null ? String(p[1]) : '',
      summary: period + ' warranty covering ' + cov + '.' + (wd.notCovered.length ? ' Not covered: ' + notCov + '.' : ''),
      covered: cov, notCovered: notCov, service: svc
    };
  };
  const draw = () => {
    clear(out);
    const g = gen();
    const rows = [];
    if (has('warrantySummary')) rows.push(['Warranty Summary', g.summary]);
    if (has('coveredInWarranty')) rows.push(['Covered in Warranty', g.covered]);
    if (has('notCoveredInWarranty')) rows.push(['Not Covered in Warranty', g.notCovered]);
    if (has('warrantyServiceType')) rows.push(['Warranty Service Type', g.service]);
    rows.push([has('domesticWarranty') || has('domWarrantyYears') ? 'Domestic Warranty' : 'Domestic Warranty (not in this category)', g.n ? g.n + ' Year' : wd.preset === 'Lifetime' ? 'Enter a number manually (Seller Hub needs a number)' : '—']);
    for (const [k, v] of rows) out.append(h('div', { class: 'row nowrap', style: { alignItems: 'flex-start' } }, h('b', { class: 'small', style: { width: '170px', flex: 'none' } }, k), h('span', { class: 'grow small', html: highlightVerify(v) }), ctrEl(v.length), copyBtn(() => v, 'Copy ' + k, true)));
  };
  const presetSeg = h('div', { class: 'seg' }, presets.map(([name]) => h('button', { type: 'button', class: wd.preset === name ? 'on' : '', onClick: (e) => { wd.preset = name; presetSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.textContent === name)); markDirty(); draw(); } }, name)));
  const covEd = fktmEditor({ key: 'wcov', label: 'Covered' }, () => wd.covered, (v) => { wd.covered = v; markDirty(); draw(); });
  const notEd = fktmEditor({ key: 'wnot', label: 'Not covered' }, () => wd.notCovered, (v) => { wd.notCovered = v; markDirty(); draw(); });
  const svc = h('input', { class: 'inp', value: wd.service, placeholder: 'e.g. what the buyer does to claim — leave blank if unsure', onInput: (e) => { wd.service = e.target.value; markDirty(); draw(); } });
  card.body.append(h('div', { class: 'stack' },
    h('div', { class: 'row' }, h('b', { class: 'small' }, 'Period'), presetSeg),
    h('div', { class: 'form-grid' }, h('div', { class: 'lbl-stack' }, 'What is covered (only what you can confirm)', covEd.el), h('div', { class: 'lbl-stack' }, 'What is not covered', notEd.el), h('label', { class: 'lbl-stack' }, 'Warranty service type', svc)),
    h('div', { class: 'info-box' }, 'Nothing is claimed that you have not entered. Missing parts become [VERIFY] placeholders.'),
    out,
    h('div', { class: 'row' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => {
      const g = gen();
      if (has('warrantySummary')) setVal('warrantySummary', g.summary);
      if (has('coveredInWarranty')) setVal('coveredInWarranty', g.covered);
      if (has('notCoveredInWarranty')) setVal('notCoveredInWarranty', g.notCovered);
      if (has('warrantyServiceType')) setVal('warrantyServiceType', g.service);
      if (g.n && has('domesticWarranty')) setVal('domesticWarranty', { n: g.n, unit: 'Year' });
      if (g.n && has('domWarrantyYears')) setVal('domWarrantyYears', g.n);
      toast('Warranty fields written');
    } }, 'Write to warranty fields'), h('span', { class: 'hint' }, 'Writes into Additional Description → Warranty.'))));
  draw();
  return card.el;
}
