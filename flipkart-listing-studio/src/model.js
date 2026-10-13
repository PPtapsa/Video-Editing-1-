/* ==========================================================================
   Model — state, categories, value accessors, variants, counters, titles, guardrails
   ========================================================================== */
const S = {
  settings: DEFAULT_SETTINGS(),
  listing: null,
  target: null,           // variant id while editing a variant
  tab: lsGet('fls:tab') || 'images',
  storeMode: 'pending',
  ai: null, aiOk: false,
  dirty: false, saving: false, saveAgain: false, lastSaved: null, saveErr: null,
  index: [],
  imgData: {},            // imgId -> dataURL
  imgStored: {},          // imgId -> true when kept in storage
  fieldEls: [],
  theme: lsGet('fls:theme') || 'system'
};

/* ---------- categories ---------- */
function getCat(id) {
  return (S.settings.categories && S.settings.categories[id]) || BUILTIN_CATEGORIES[id] || null;
}
function catIds() {
  const ids = (S.settings.categoryOrder || []).filter((id) => getCat(id));
  for (const id of Object.keys(BUILTIN_CATEGORIES)) if (!ids.includes(id)) ids.push(id);
  for (const id of Object.keys(S.settings.categories || {})) if (!ids.includes(id)) ids.push(id);
  return ids;
}
function cat() { return getCat(S.listing.category) || BUILTIN_CATEGORIES.faucet; }
function pdFields(c) { return c.fields.filter((f) => f.tab === 'pd'); }
function adFields(c) { return c.fields.filter((f) => f.tab === 'ad'); }
function allFields(c) { return coreFields(c).concat(c.fields); }
function fieldDef(key, c) { c = c || cat(); return allFields(c).find((f) => f.key === key) || VARIANT_ONLY_FIELDS[key] || null; }
function normLabel(s) { return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function fieldByToken(name, c) {
  const fs = allFields(c);
  const n = String(name).toLowerCase().trim();
  return fs.find((f) => f.label.toLowerCase() === n) || fs.find((f) => f.key.toLowerCase() === n) || fs.find((f) => normLabel(f.label) === normLabel(name)) || null;
}
function variantColumns(c) {
  const fs = allFields(c);
  const keys = new Set(fs.map((f) => f.key));
  let cols;
  if (c.variantCols && c.variantCols.length) {
    cols = c.variantCols.filter((k) => keys.has(k) || VARIANT_ONLY_FIELDS[k]);
    for (const f of fs) if (!cols.includes(f.key) && f.addedByUser) cols.push(f.key);
    for (const a of c.variantAxis || []) if (!cols.includes(a)) cols.unshift(a);
  } else {
    const axis = (c.variantAxis || []).filter((k) => keys.has(k));
    cols = axis.concat(coreFields(c).map((f) => f.key), c.fields.map((f) => f.key)).filter((k, i, a) => a.indexOf(k) === i);
  }
  return cols.map((k) => {
    const d = fieldDef(k, c);
    return { key: k, def: d, label: (c.colLabels && c.colLabels[k]) || (d ? d.label : k), req: d ? !!d.req : false };
  }).filter((x) => x.def);
}

/* ---------- listing creation / normalisation ---------- */
function defaultSegments(brandName, c) {
  const b = (S.settings.brands || []).find((x) => x.name === brandName);
  return [
    { id: uid('sg'), label: 'Brand code', value: b ? b.code || '' : '' },
    { id: uid('sg'), label: 'Category code', value: c ? c.skuCode || '' : '' },
    { id: uid('sg'), label: 'Series', value: '' },
    { id: uid('sg'), label: 'Size', value: '' },
    { id: uid('sg'), label: 'Finish', value: '' },
    { id: uid('sg'), label: 'Pack', value: '' }
  ];
}
function defaultTokens() {
  return [{ id: uid('tk'), name: 'Size', forms: [] }, { id: uid('tk'), name: 'Finish', forms: [] }, { id: uid('tk'), name: 'Series', forms: [] }];
}
function fieldDefaults(c) {
  const out = {};
  for (const f of allFields(c)) if (f.def !== undefined) out[f.key] = f.def;
  return out;
}
function imageSlotsFor(n) { return Array.from({ length: n }, () => ({ id: uid('sl'), imgId: null, note: '', w: null, h: null, name: '' })); }
function newListing(brand, catId) {
  const c = getCat(catId) || BUILTIN_CATEGORIES.faucet;
  const now = Date.now();
  return {
    id: uid('L'), name: '', nameCustom: false, brand, category: c.id, createdAt: now, updatedAt: now,
    fields: fieldDefaults(c), images: imageSlotsFor(5), imageSlots: 5,
    keywordBank: null, seoVersions: {}, tokens: defaultTokens(), variants: [],
    skuSegments: defaultSegments(brand, c), dismissed: [], titleCase: 'typed',
    ui: { dimUnit: 'cm', wtUnit: 'kg' }, research: { answer: '', paste: '' }
  };
}
function normalizeListing(l) {
  const base = newListing(l.brand || 'Tapsa', l.category || 'faucet');
  for (const k of Object.keys(base)) if (l[k] === undefined) l[k] = base[k];
  l.fields = l.fields || {};
  l.ui = Object.assign({ dimUnit: 'cm', wtUnit: 'kg' }, l.ui || {});
  l.research = Object.assign({ answer: '', paste: '' }, l.research || {});
  if (!Array.isArray(l.images)) l.images = imageSlotsFor(l.imageSlots || 5);
  while (l.images.length < (l.imageSlots || 5)) l.images.push(imageSlotsFor(1)[0]);
  for (const v of l.variants) {
    v.tokenValues = v.tokenValues || {}; v.axis = v.axis || {}; v.excluded = v.excluded || []; v.overrides = v.overrides || {};
  }
  return l;
}
function metaOf(l) {
  return {
    name: l.name || 'Untitled listing', brand: l.brand, category: l.category,
    variantCount: l.variants.length, completion: completionPct(l), createdAt: l.createdAt, updatedAt: l.updatedAt,
    modelNumber: l.fields.modelNumber || '', sku: l.fields.sku || ''
  };
}
function listingForSave(l) {
  return JSON.parse(JSON.stringify(l));
}

/* ---------- values ---------- */
const REPLACED_TYPES = new Set(['text', 'long', 'sku', 'fktm']);
const repCache = new WeakMap();
function variantReplacer(l, v) {
  const sig = JSON.stringify([l.tokens, v.tokenValues]);
  const hit = repCache.get(v);
  if (hit && hit.sig === sig) return hit.fn;
  const pairs = [];
  for (const t of l.tokens || []) {
    const nv = (v.tokenValues || {})[t.id] || [];
    (t.forms || []).forEach((f, i) => { if (f && nv[i]) pairs.push({ from: f, to: nv[i] }); });
  }
  const fn = Logic.makeReplacer(pairs);
  repCache.set(v, { sig, fn });
  return fn;
}
function variantAuto(l, v, key) {
  if (v.axis && Object.prototype.hasOwnProperty.call(v.axis, key)) return clone(v.axis[key]);
  const mv = l.fields[key];
  if (mv === undefined || mv === null) return mv;
  if (v.excluded && v.excluded.includes(key)) return clone(mv);
  const d = fieldDef(key, getCat(l.category) || BUILTIN_CATEGORIES.faucet);
  const t = d ? d.type : 'text';
  if (!REPLACED_TYPES.has(t)) return clone(mv);
  const rep = variantReplacer(l, v);
  if (Array.isArray(mv)) return mv.map((x) => rep(String(x)));
  return rep(String(mv));
}
function variantValue(l, v, key) {
  if (v.overrides && Object.prototype.hasOwnProperty.call(v.overrides, key)) return v.overrides[key];
  return variantAuto(l, v, key);
}
function curVariant() { return S.target ? S.listing.variants.find((v) => v.id === S.target) || null : null; }
function getVal(key) {
  const v = curVariant();
  return v ? variantValue(S.listing, v, key) : S.listing.fields[key];
}
function sameVal(a, b) { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || (isEmpty(a) && isEmpty(b)); }
function setVal(key, val) {
  const v = curVariant();
  if (v) {
    const auto = variantAuto(S.listing, v, key);
    if (sameVal(auto, val)) delete v.overrides[key]; else v.overrides[key] = clone(val);
  } else S.listing.fields[key] = val;
  markDirty();
}
function isOverride(key) { const v = curVariant(); return !!(v && v.overrides && Object.prototype.hasOwnProperty.call(v.overrides, key)); }
function restoreAuto(key) { const v = curVariant(); if (v) { delete v.overrides[key]; markDirty(); } }
function getterFor(l, v) { return v ? (k) => variantValue(l, v, k) : (k) => l.fields[k]; }

function displayValue(def, val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return isEmpty(val) ? '' : (val.n + ' ' + (val.unit || 'Year'));
  if (def && def.type === 'hsn') return String(val);
  if (def && def.type === 'preset') { const p = (S.settings.presets || []).find((x) => x.id === val); return p ? p.text : ''; }
  return String(val);
}
function copyValue(def, val) { return displayValue(def, val); }
function textLen(val) { return displayValue(null, val).length; }

/* ---------- completion counters ---------- */
function isFilled(def, val) {
  if (def.exactOne) return Array.isArray(val) && val.length === 1;
  return !isEmpty(val);
}
function imagesOf(l, v) { return (v && v.images) || l.images; }
function tabCounts(l, v) {
  const c = getCat(l.category) || BUILTIN_CATEGORIES.faucet;
  const g = getterFor(l, v);
  const core = coreFields(c).filter((f) => f.req && f.counted !== false);
  const pd = pdFields(c).filter((f) => f.req);
  const ad = adFields(c);
  const imgs = imagesOf(l, v);
  const n = (arr) => arr.filter((f) => isFilled(f, g(f.key))).length;
  return {
    images: { done: imgs.filter((s) => s.imgId).length, total: imgs.length, firstOk: !!(imgs[0] && imgs[0].imgId) },
    price: { done: n(core), total: core.length },
    pd: { done: n(pd), total: pd.length },
    ad: { done: n(ad), total: ad.length }
  };
}
function completionPct(l) {
  const t = tabCounts(l, null);
  const done = t.price.done + t.pd.done + (t.images.firstOk ? 1 : 0);
  const total = t.price.total + t.pd.total + 1;
  return Math.round((done / Math.max(1, total)) * 100);
}

/* ---------- titles ---------- */
function segKind(f, c) {
  if (f.key === c.seoField || f.key === 'modelNumber' || f.key === 'modelName') return 'model';
  if (f.key === 'type' || f.key === 'showerType') return 'type';
  if (f.key === 'installationType' || f.key === 'mountType') return 'install';
  return 'attr';
}
function titleFor(l, v, overrideGetter) {
  const c = getCat(l.category) || BUILTIN_CATEGORIES.faucet;
  const g = overrideGetter || getterFor(l, v);
  return Logic.buildTitle(c.titleFormula, (name) => {
    const f = fieldByToken(name, c);
    if (!f) return { value: '', kind: 'attr' };
    return { value: displayValue(f, g(f.key)), key: f.key, kind: segKind(f, c) };
  });
}
function caseText(text, mode, isFirst) {
  if (!text) return text;
  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'smart') return isFirst ? Logic.smartTitleCase(text) : Logic.smartTitleCase('x ' + text).slice(2);
  return text;
}
function titleWordsInSegments(t, kinds) {
  return new Set(Logic.tokenize(t.segments.filter((s) => kinds.includes(s.kind)).map((s) => s.text).join(' ')).map(Logic.stem));
}
function curTitle() { return titleFor(S.listing, curVariant()); }

/* ---------- guardrails ---------- */
function computeWarnings(l, v) {
  const c = getCat(l.category) || BUILTIN_CATEGORIES.faucet;
  const g = getterFor(l, v);
  const w = {};
  const add = (key, id, text, level) => { if (!(l.dismissed || []).includes(id)) (w[key] = w[key] || []).push({ id, text, level: level || 'warn' }); };
  const fs = allFields(c);
  const anyTitleFilled = fs.some((f) => f.title && !f.exactOne && !isEmpty(g(f.key)));
  for (const f of fs) {
    const val = g(f.key);
    if (f.limit && !Array.isArray(val)) {
      const len = String(val || '').length;
      if (len > f.limit) add(f.key, 'limit:' + f.key + ':' + len, 'Over the ' + f.limit + '-character limit by ' + (len - f.limit) + '. Seller Hub will reject it.', 'bad');
    }
    if (f.combinedLimit && Array.isArray(val)) {
      const len = val.join(', ').length;
      if (len > f.combinedLimit) add(f.key, 'climit:' + f.key + ':' + len, 'Selected ' + f.label + ' values add up to ' + len + ' characters. The combined limit is ' + f.combinedLimit + '.', 'bad');
    }
    if (f.exactOne) {
      const n = Array.isArray(val) ? val.length : 0;
      if (n > 1) add(f.key, 'exact:' + f.key + ':' + n, n + ' values selected. Choose exactly one, from the real physical installation.', 'bad');
      else if (n === 0 && anyTitleFilled) add(f.key, 'exact0:' + f.key, 'Choose exactly one. The title shows it in brackets.', 'warn');
    }
    if (f.max && Array.isArray(val) && val.length > f.max) add(f.key, 'max:' + f.key, 'Flipkart allows up to ' + f.max + ' values here.', 'bad');
    if (f.title && f.type === 'multi' && !f.exactOne && Array.isArray(val) && val.length >= 3) {
      add(f.key, 'comma:' + f.key + ':' + val.length, val.length + ' values print into the auto-title as a comma list. Keep only the ones that describe this exact product.', 'warn');
    }
  }
  // material contradiction
  const mats = g('material');
  if (Array.isArray(mats) && mats.length) {
    const factKeys = ['modelNumber', 'modelName', 'description', 'series', 'finish', 'otherFeatures', 'itemsIncluded', 'surfaceTreatment'];
    const facts = factKeys.map((k) => displayValue(null, g(k))).join(' \n ');
    if (facts.trim()) {
      const mentioned = MATERIAL_ALIASES.filter((a) => a.re.test(facts));
      for (const m of mats) {
        if (/ceramic|nick|gold/i.test(m)) continue;
        const ids = materialAliasIds(m);
        if (!ids.length) continue;
        const supported = mentioned.some((a) => ids.includes(a.id));
        const others = mentioned.filter((a) => !ids.includes(a.id) && !['ceramic', 'nickel'].includes(a.id) && !(a.id === 'steel' && (ids.includes('ss') || mentioned.some((x) => x.id === 'ss'))));
        if (!supported && others.length) {
          add('material', 'mat:' + m, '“' + m + '” is selected, but the listing text mentions ' + others.map((a) => a.label).filter((x, i, arr) => arr.indexOf(x) === i).join(', ') + ' and never ' + m.toLowerCase() + '. Check the material before publishing.', 'warn');
        }
      }
    }
  }
  return w;
}
function dismissWarning(id) {
  S.listing.dismissed = (S.listing.dismissed || []).concat(id);
  markDirty();
}
