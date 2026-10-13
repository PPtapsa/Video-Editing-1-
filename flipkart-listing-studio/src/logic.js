/* ==========================================================================
   Logic — pure functions (no DOM). Unit-tested in test/logic.test.js
   ========================================================================== */
const Logic = (function () {
  'use strict';

  /* ---------- numbers & money ---------- */
  function num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[,₹\s]/g, '');
    if (s === '') return NaN;
    return Number(s);
  }
  // Closest price ending in 99 (ties go up).
  function round99(x) {
    if (!isFinite(x) || x <= 0) return null;
    return Math.max(99, Math.round((x - 99) / 100) * 100 + 99);
  }
  function recommendedMrp(sp) {
    sp = num(sp);
    if (!(sp > 0)) return null;
    return round99(sp / 0.2);
  }
  function benchmarkPrice(sp) {
    sp = num(sp);
    if (!(sp > 0)) return null;
    const raw = sp / 0.75;
    return { raw: Math.round(raw * 100) / 100, rounded: round99(raw) };
  }
  function discountPct(mrp, sp) {
    mrp = num(mrp); sp = num(sp);
    if (!(mrp > 0) || !(sp >= 0) || sp > mrp) return null;
    return Math.round(((mrp - sp) / mrp) * 100);
  }
  function fmtINR(n) {
    n = num(n);
    if (!isFinite(n)) return '';
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /* ---------- package / shipping ---------- */
  function volumetricKg(l, b, h) {
    l = num(l); b = num(b); h = num(h);
    if (!(l > 0 && b > 0 && h > 0)) return null;
    return Math.round((l * b * h / 5000) * 1000) / 1000;
  }
  function weightSlab(kg) {
    if (!(kg > 0)) return null;
    return Math.ceil(kg / 0.5 - 1e-9) * 0.5;
  }
  function shippingWeights(l, b, h, deadKg) {
    const vol = volumetricKg(l, b, h);
    const dead = num(deadKg);
    const hasDead = dead > 0;
    if (vol === null && !hasDead) return null;
    const chargeable = Math.max(vol || 0, hasDead ? dead : 0);
    const which = vol !== null && hasDead ? (vol > dead ? 'volumetric' : 'dead') : (vol !== null ? 'volumetric' : 'dead');
    const inflating = vol !== null && hasDead && vol > dead && weightSlab(vol) > weightSlab(dead);
    return { vol, dead: hasDead ? dead : null, chargeable, which, slab: weightSlab(chargeable), deadSlab: hasDead ? weightSlab(dead) : null, inflating };
  }
  const cmToIn = (cm) => Math.round((cm / 2.54) * 100) / 100;
  const inToCm = (inch) => Math.round(inch * 2.54 * 100) / 100;
  const cToK = (c) => Math.round((c + 273.15) * 100) / 100;

  /* ---------- text basics ---------- */
  const STOP = new Set(('a an the and or nor but of to in on at by for with from per via vs is are be as it its this that these those your our you we & + - x').split(' '));
  const CONNECTORS = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'per', 'via', 'vs', '&', '+']);

  function tokenize(str) {
    if (!str) return [];
    const m = String(str).toLowerCase().replace(/[™®©]/g, '').match(/[a-z0-9À-ɏ]+(?:[.\/][a-z0-9]+)*/g);
    return m || [];
  }
  const STEM_KEEP = new Set(['series', 'species', 'chassis', 'glass', 'brass', 'stainless', 'gas', 'bus', 'plus', 'this', 'his', 'yes', 'news', 'lens', 'always', 'canvas', 'cross', 'gloss', 'emboss', 'access', 'less', 'class']);
  function stem(w) {
    w = String(w || '').toLowerCase();
    if (w.length <= 3 || /\d/.test(w) || STEM_KEEP.has(w)) return w;
    if (/(ss|us|is)$/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/(sh|ch|x|z|ss)es$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function countMap(arr) {
    const m = new Map();
    for (const a of arr) m.set(a, (m.get(a) || 0) + 1);
    return m;
  }

  /* ---------- Smart Title Case ---------- */
  const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'per', 'via', 'vs']);
  const ACRONYMS = new Set(['ISI', 'PTMT', 'AISI', 'SS', 'ABS', 'BIS', 'CP', 'PVD', 'PVC', 'UPVC', 'CPVC', 'ISO', 'LED', 'NSF', 'WRAS', 'EAN', 'UPC', 'GST', 'HSN', 'MRP', 'BSP', 'NPT', 'UV', 'DIY', 'USA', 'UK', 'EU', 'SKU', 'TPU', 'EPDM', 'NBR', 'POM', 'PPR', 'HDPE', 'CNC', 'OEM', 'ROHS', 'BPA']);
  const UNITS = new Set(['mm', 'cm', 'm', 'ml', 'l', 'kg', 'g', 'gm', 'gms', 'lpm', 'ltr', 'mtr', 'ft', 'psi', 'sqft', 'lph']);

  function lettersOf(s) { return s.replace(/[^A-Za-z]/g, ''); }
  function isMixedCase(s) {
    const L = lettersOf(s);
    return /[a-z]/.test(L) && /[A-Z]/.test(L) && !/^[A-Z][a-z]+$/.test(L);
  }
  function casePart(part, firstOverall, shouting) {
    if (!part) return part;
    if (/\d/.test(part)) return part;                     // 48x4, SS304, 120cm, 1/2"
    const L = lettersOf(part);
    if (!L) return part;
    const up = part.toUpperCase();
    const low = part.toLowerCase();
    if (ACRONYMS.has(lettersOf(up))) return part === low || part === up ? up : part; // ISI, PTMT
    if (UNITS.has(low) && part === low) return part;       // mm stays mm
    if (isMixedCase(part)) return part;                   // AquaLock™
    if (L.length >= 2 && part === up && !shouting) return part; // other caps tokens are kept
    if (SMALL_WORDS.has(low) && !firstOverall) return low;
    return low.replace(/[a-zà-ɏ]/, (c) => c.toUpperCase());
  }
  function smartTitleCase(str) {
    if (!str) return '';
    const pieces = String(str).split(/(\s+)/);
    const alpha = pieces.filter((w) => /[A-Za-z]/.test(w) && !/\d/.test(w));
    const caps = alpha.filter((w) => lettersOf(w).length >= 2 && w === w.toUpperCase() && !ACRONYMS.has(lettersOf(w).toUpperCase()));
    const shouting = alpha.length >= 3 && caps.length / alpha.length > 0.6;
    let first = true;
    return pieces.map((w) => {
      if (!w || /^\s+$/.test(w)) return w;
      const lead = (w.match(/^[("'“‘\[{]+/) || [''])[0];
      const rest = w.slice(lead.length);
      const trail = (rest.match(/[)"'”’\]},.;:!?]+$/) || [''])[0];
      const core = rest.slice(0, rest.length - trail.length);
      if (!/[A-Za-z0-9]/.test(core)) return w;
      const parts = core.split(/([-\/])/);
      let firstPart = true;
      const out = parts.map((p) => {
        if (p === '-' || p === '/') return p;
        const r = casePart(p, first && firstPart, shouting);
        if (p) firstPart = false;
        return r;
      }).join('');
      first = false;
      return lead + out + trail;
    }).join('');
  }

  /* ---------- n-gram keyword density ---------- */
  function ngrams(tokens, n) {
    const out = [];
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n));
    return out;
  }
  function keywordDensity(text, limit) {
    limit = limit || 8;
    const toks = tokenize(text);
    const res = { total: toks.length };
    for (const n of [1, 2, 3]) {
      const grams = ngrams(toks, n);
      const usable = grams.filter((g) => !g.every((t) => STOP.has(t)) && !(n === 1 && STOP.has(g[0])));
      const counts = countMap(usable.map((g) => g.join(' ')));
      const denom = Math.max(1, grams.length);
      const rows = [...counts.entries()].map(([term, count]) => ({ term, count, pct: Math.round((count / denom) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
      res['x' + n] = rows.slice(0, limit);
      res['x' + n + 'All'] = rows;
    }
    return res;
  }

  /* ---------- Human-Readability Flow Score ---------- */
  const PRODUCT_NOUNS = new Set(['faucet', 'tap', 'mixer', 'cock', 'spout', 'valve', 'drain', 'strainer', 'trap', 'jali', 'grating', 'grate', 'shower', 'showerhead', 'head', 'overhead', 'handshower', 'cartridge', 'diverter', 'flange', 'aerator', 'bibcock', 'pillar', 'hose', 'channel', 'waste', 'coupling']);
  const READABILITY_DOC = [
    'Starts at 100 and subtracts:',
    '• Repeated words: −8 per extra repeat of a content word (max −30)',
    '• Keyword stuffing: unique-word ratio under 85% (max −25)',
    '• Comma-list runs: −8 per comma after the first (max −32)',
    '• Separator sanity: double spaces, space before punctuation, doubled or dangling separators, unbalanced brackets, 3+ separator styles (−5 each, max −15)',
    '• Average word length outside 3.5–8.5 letters (max −12)',
    '• No clear product noun (faucet, tap, mixer, drain, shower…) in the first 5 words (−15)',
    '• ALL-CAPS runs of 2+ words that are not acronyms (−3 per word in the run, max −18)',
    '• Word order: starts with a connector (−6), ends with one (−8), back-to-back connectors (−5 each)',
    'Bands: 80+ Excellent · 60–79 Good · under 60 Fix'
  ].join('\n');

  function readability(title, opts) {
    opts = opts || {};
    const nouns = opts.nouns ? new Set([...PRODUCT_NOUNS, ...opts.nouns]) : PRODUCT_NOUNS;
    const t = String(title || '').trim();
    const parts = [];
    if (!t) return { score: 0, band: 'Fix', parts: [{ label: 'Title is empty', delta: -100 }] };
    let score = 100;
    const pen = (label, d) => { d = Math.round(d); if (d < 0) { parts.push({ label, delta: d }); score += d; } };
    const toks = tokenize(t);
    const content = toks.filter((w) => !STOP.has(w));
    const stems = content.map(stem);
    // 1. repeated words
    let extra = 0;
    for (const [w, c] of countMap(stems)) if (c > 1 && w.length > 1 && !/^\d+$/.test(w)) extra += c - 1;
    pen('Repeated words', -Math.min(30, extra * 8));
    // 2. stuffing
    if (content.length >= 4) {
      const uniq = new Set(stems).size / content.length;
      pen('Keyword stuffing', -Math.min(25, Math.max(0, 0.85 - uniq) * 100));
    }
    // 3. comma lists
    const commas = (t.match(/,/g) || []).length;
    pen('Comma-list runs', -Math.min(32, Math.max(0, commas - 1) * 8));
    // 4. separator sanity
    let sep = 0;
    if (/\s{2,}/.test(String(title))) sep++;
    if (/\s[,;:.]/.test(t)) sep++;
    if (/([,|\/–—-])\s*\1/.test(t)) sep++;
    if (/^[,|\-–—:;\/]|[,|\-–—:;\/]$/.test(t)) sep++;
    const opens = (t.match(/\(/g) || []).length, closes = (t.match(/\)/g) || []).length;
    if (opens !== closes) sep++;
    const styles = [/\|/, /\s[–—]\s/, /\s-\s/, /\s\/\s/, /,/].filter((r) => r.test(t)).length;
    if (styles >= 3) sep++;
    pen('Separator sanity', -Math.min(15, sep * 5));
    // 5. average token length
    const lens = t.split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '').length).filter((n) => n > 0);
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    const dev = avg < 3.5 ? 3.5 - avg : avg > 8.5 ? avg - 8.5 : 0;
    pen('Average word length', -Math.min(12, dev * 6));
    // 6. product noun early
    const first5 = toks.slice(0, 5).map(stem);
    if (!first5.some((w) => nouns.has(w))) pen('No product noun in first 5 words', -15);
    // 7. ALL-CAPS runs
    const words = t.split(/\s+/);
    let capsWords = 0, run = 0;
    for (const w of words) {
      const L = lettersOf(w);
      const isCaps = L.length >= 3 && w === w.toUpperCase() && !ACRONYMS.has(L.toUpperCase()) && !/\d/.test(w);
      if (isCaps) { run++; } else { if (run >= 2) capsWords += run; run = 0; }
    }
    if (run >= 2) capsWords += run;
    pen('ALL-CAPS runs', -Math.min(18, capsWords * 3));
    // 8. natural order
    if (toks.length && CONNECTORS.has(toks[0])) pen('Starts with a connector', -6);
    if (toks.length > 1 && CONNECTORS.has(toks[toks.length - 1])) pen('Ends with a connector', -8);
    let pairs = 0;
    for (let i = 1; i < toks.length; i++) if (CONNECTORS.has(toks[i]) && CONNECTORS.has(toks[i - 1])) pairs++;
    pen('Back-to-back connectors', -Math.min(15, pairs * 5));
    score = Math.max(0, Math.min(100, score));
    const band = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fix';
    return { score, band, parts };
  }

  /* ---------- title formula ---------- */
  function parseFormula(f) {
    const out = [];
    const re = /\{([^{}]+)\}/g;
    let last = 0, m;
    f = String(f || '');
    while ((m = re.exec(f))) {
      if (m.index > last) out.push({ lit: f.slice(last, m.index) });
      out.push({ tok: m[1].trim() });
      last = re.lastIndex;
    }
    if (last < f.length) out.push({ lit: f.slice(last) });
    return out;
  }
  // resolve(name) -> { value, key, kind } ; returns segments + cleaned text.
  // A parenthesised group whose tokens are all empty is dropped as a whole.
  function buildTitle(formula, resolve) {
    const atoms = [];
    for (const p of parseFormula(formula)) {
      if (p.lit !== undefined) for (const ch of p.lit) atoms.push({ ch });
      else {
        const r = resolve(p.tok) || { value: '' };
        atoms.push({ tok: p.tok, value: r.value || '', key: r.key, kind: r.kind || 'attr' });
      }
    }
    const drop = new Array(atoms.length).fill(false);
    const stack = [];
    atoms.forEach((a, i) => {
      if (a.ch === '(') stack.push({ i, hasTok: false, hasVal: false });
      else if (a.ch === ')' && stack.length) {
        const g = stack.pop();
        if (g.hasTok && !g.hasVal) for (let k = g.i; k <= i; k++) drop[k] = true;
        if (stack.length) { const up = stack[stack.length - 1]; up.hasTok = up.hasTok || g.hasTok; up.hasVal = up.hasVal || g.hasVal; }
      } else if (a.tok !== undefined && stack.length) {
        const g = stack[stack.length - 1];
        g.hasTok = true;
        if (a.value) g.hasVal = true;
      }
    });
    const segments = [];
    atoms.forEach((a, i) => {
      if (a.tok !== undefined) segments.push({ text: drop[i] ? '' : a.value, kind: a.kind, key: a.key, missing: !a.value, label: a.tok, dropped: drop[i] });
      else if (!drop[i]) {
        const last = segments[segments.length - 1];
        if (last && last.kind === 'lit') last.text += a.ch; else segments.push({ text: a.ch, kind: 'lit' });
      }
    });
    return { segments, text: cleanTitle(segments.map((s) => s.text).join('')) };
  }
  function cleanTitle(s) {
    return String(s || '')
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+,/g, ',')
      .replace(/,(\s*,)+/g, ',')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .trim();
  }

  /* ---------- token replacement (variants) ---------- */
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function titleWords(s) { return s.toLowerCase().replace(/(^|[\s\-\/])([a-z])/g, (m, a, b) => a + b.toUpperCase()); }
  function preserveCase(src, to) {
    const L = lettersOf(src);
    if (!L || to === undefined || to === null) return to;
    if (L === L.toUpperCase()) return to.toUpperCase();
    if (L === L.toLowerCase()) return to.toLowerCase();
    const words = src.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
    if (words.every((w) => /^[^A-Za-z]*[A-Z][^A-Z]*$/.test(w))) return titleWords(to);
    if (/^[^A-Za-z]*[A-Z]/.test(src)) return to.replace(/[a-z]/, (c) => c.toUpperCase());
    return to;
  }
  // pairs: [{from, to}] — single pass, longest form first, whole-word safe, case-preserving
  function makeReplacer(pairs) {
    const valid = (pairs || []).filter((p) => p && p.from && String(p.from).trim() && p.to !== undefined && p.to !== null && String(p.to).trim() !== '' && p.from !== p.to)
      .map((p) => ({ from: String(p.from), to: String(p.to) }));
    if (!valid.length) return (s) => s;
    valid.sort((a, b) => b.from.length - a.from.length);
    const exact = new Map();
    const lower = new Map();
    for (const p of valid) {
      if (!exact.has(p.from)) exact.set(p.from, p.to);
      const k = p.from.toLowerCase();
      if (!lower.has(k)) lower.set(k, p.to);
    }
    const re = new RegExp('(?<![A-Za-z0-9])(' + valid.map((p) => escRe(p.from)).join('|') + ')(?![A-Za-z0-9])', 'gi');
    return function (s) {
      if (typeof s !== 'string' || !s) return s;
      return s.replace(re, (m) => (exact.has(m) ? exact.get(m) : preserveCase(m, lower.get(m.toLowerCase()))));
    };
  }
  // Rebuild a written form for a new value, following the shape of a master form.
  function deriveForm(masterFirst, masterForm, newFirst) {
    if (!masterFirst || !masterForm || !newFirst) return '';
    const dim = /^(\d+(?:\.\d+)?)(\s*)([x×X])(\s*)(\d+(?:\.\d+)?)$/;
    const mf = String(masterForm).trim().match(dim);
    const m0 = String(masterFirst).trim().match(dim);
    const n0 = String(newFirst).trim().match(dim);
    if (mf && m0 && n0 && mf[1] === m0[1] && mf[5] === m0[5]) return n0[1] + mf[2] + mf[3] + mf[4] + n0[5];
    if (String(masterForm).toLowerCase() === String(masterFirst).toLowerCase()) return preserveCase(masterForm, newFirst);
    return '';
  }

  /* ---------- word diff ---------- */
  function diffWords(a, b) {
    const A = String(a || '').split(/(\s+)/).filter((x) => x !== '');
    const B = String(b || '').split(/(\s+)/).filter((x) => x !== '');
    if (A.length * B.length > 1500000) return [{ t: String(a || ''), type: 'del' }, { t: String(b || ''), type: 'ins' }];
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    const push = (t, type) => { const l = out[out.length - 1]; if (l && l.type === type) l.t += t; else out.push({ t, type }); };
    while (i < n && j < m) {
      if (A[i] === B[j]) { push(A[i], 'eq'); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { push(A[i], 'del'); i++; }
      else { push(B[j], 'ins'); j++; }
    }
    while (i < n) push(A[i++], 'del');
    while (j < m) push(B[j++], 'ins');
    return out;
  }

  /* ---------- keyword bank ---------- */
  const CLUSTERS = ['Product type', 'Material', 'Size', 'Finish', 'Use-location', 'Feature', 'Brand-generic', 'Other'];
  const DICT = {
    'Product type': 'faucet tap mixer cock spout valve drain strainer shower showerhead head overhead handshower trap jali grating grate cartridge diverter flange aerator hose arm bibcock pillar sink-mixer waste coupling channel accessory fitting fixture sanitaryware'.split(' '),
    'Material': 'brass steel stainless ss ss304 ss316 304 316 aisi ptmt plastic abs zinc copper bronze ceramic iron ductile aluminium aluminum alloy pvc upvc cpvc metal polypropylene nickel nickle'.split(' '),
    'Finish': 'chrome matte matt black gold rose gunmetal brushed satin glossy silver white grey gray champagne antique pvd rosegold bronze-finish graphite nickel-finish polished mirror'.split(' '),
    'Use-location': 'bathroom kitchen basin sink washbasin wash floor toilet bathtub tub wall ceiling deck counter countertop garden balcony home hotel outdoor terrace utility washroom restroom commercial office hospital'.split(' '),
    'Feature': 'anti cockroach odour odor smell rust proof resistant single lever hot cold quick flow rain mist massage sensor automatic self closing rotation swivel 360 pull out high pressure water saving heavy duty jet health foam soft push pop up lock slim modern luxury premium designer cut tile insert square round rectangular long tall concealed adjustable flexible removable leak durable easy clean install installation'.split(' '),
    'Brand-generic': 'tapsa hybath jaquar hindware cera kohler grohe parryware essco marc plumber branded brand original best top quality combo pack set pcs piece'.split(' ')
  };
  const DICT_MAP = new Map();
  for (const c of Object.keys(DICT)) for (const w of DICT[c]) if (!DICT_MAP.has(stem(w))) DICT_MAP.set(stem(w), c);
  function classifyTerm(term) {
    const s = stem(term);
    if (DICT_MAP.has(s)) return DICT_MAP.get(s);
    if (/^\d+(\.\d+)?(x\d+(\.\d+)?)*(mm|cm|inch|in|m|ft|l|lpm)?$/.test(term) || /^(inch|inches|mm|cm|feet|ft|size|big|small|large|medium|mini|jumbo)$/.test(term)) return 'Size';
    if (/^\d/.test(term) && /\d/.test(term)) return 'Size';
    return 'Other';
  }
  function cleanKeyword(k) {
    return String(k || '').toLowerCase().replace(/[™®©]/g, '').replace(/[“”"'`]/g, '').replace(/[^a-z0-9À-ɏ.\/×x\s-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // rows: [{kw, vol}]
  function analyzeKeywords(rows) {
    const kwMap = new Map();
    for (const r of rows || []) {
      const k = cleanKeyword(r.kw);
      if (!k || k.length < 2) continue;
      const v = num(r.vol);
      const prev = kwMap.get(k);
      if (prev) { if (isFinite(v)) prev.vol = (isFinite(prev.vol) ? prev.vol : 0) + v; }
      else kwMap.set(k, { kw: k, vol: isFinite(v) ? v : null });
    }
    const keywords = [...kwMap.values()];
    const termMap = new Map();
    for (const k of keywords) {
      const seen = new Set();
      for (const tok of tokenize(k.kw)) {
        if (STOP.has(tok) || tok.length < 2 && !/\d/.test(tok)) continue;
        const s = stem(tok);
        if (seen.has(s)) continue;
        seen.add(s);
        let t = termMap.get(s);
        if (!t) { t = { stem: s, forms: new Map(), freq: 0, vol: null }; termMap.set(s, t); }
        t.freq++;
        t.forms.set(tok, (t.forms.get(tok) || 0) + 1);
        if (k.vol !== null) t.vol = (t.vol || 0) + k.vol;
      }
    }
    const terms = [...termMap.values()].map((t) => {
      const term = [...t.forms.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
      return { term, stem: t.stem, freq: t.freq, vol: t.vol, cluster: classifyTerm(term) };
    }).sort((a, b) => b.freq - a.freq || (b.vol || 0) - (a.vol || 0) || a.term.localeCompare(b.term));
    keywords.sort((a, b) => (b.vol || 0) - (a.vol || 0) || a.kw.localeCompare(b.kw));
    return { keywords, terms };
  }
  function stemSet(text) {
    return new Set(tokenize(text).map(stem));
  }
  function coverage(terms, text) {
    const set = stemSet(text);
    const covered = [], uncovered = [];
    for (const t of terms || []) (set.has(t.stem) ? covered : uncovered).push(t);
    const pct = terms && terms.length ? Math.round((covered.length / terms.length) * 100) : null;
    return { covered, uncovered, pct };
  }

  /* ---------- paste-back importer ---------- */
  const IMPORT_RULES = [
    { re: /^(optimi[sz]ed\s+|suggested\s+|recommended\s+|final\s+)?model\s*number\b/i, key: 'modelNumber' },
    { re: /^(optimi[sz]ed\s+|suggested\s+)?model\s*name\b/i, key: 'modelName' },
    { re: /^(the\s+)?(resulting\s+)?(flipkart\s+)?(auto[-\s]?(generated\s+)?title|product\s+title|title)\b/i, key: '_title' },
    { re: /^installation\s*type\b/i, key: 'installationType' },
    { re: /^(faucet\s+)?type(\s*picks|\(s\)|s)?\b/i, key: 'type' },
    { re: /^(key\s+features|highlights|key\s+highlights)\b/i, key: 'otherFeatures', mode: 'list' },
    { re: /^(rich\s+)?(product\s+)?description\b/i, key: 'description' },
    { re: /^(backend\s+)?search\s*keywords\b/i, key: 'searchKeywords', mode: 'list' },
    { re: /^(primary|secondary|long[-\s]?tail)(\s*\+?\s*(secondary|long[-\s]?tail))*\s*(\+\s*)?(keywords)?\b/i, key: 'searchKeywords', mode: 'list', merge: true },
    { re: /^other\s*features\b/i, key: 'otherFeatures', mode: 'list' },
    { re: /^certifications?\b/i, key: 'certification', mode: 'list' },
    { re: /^warranty\s*summary\b/i, key: 'warrantySummary' },
    { re: /^covered\s+in\s+warranty\b/i, key: 'coveredInWarranty' },
    { re: /^not\s+covered\s+in\s+warranty\b/i, key: 'notCoveredInWarranty' },
    { re: /^suitable\s*for\b/i, key: 'suitableFor', mode: 'list' },
    { re: /^usage\b/i, key: 'usage', mode: 'list' },
    { re: /^finish\b/i, key: 'finish', mode: 'list' },
    { re: /^items\s+included\b/i, key: 'itemsIncluded', mode: 'list' },
    { re: /^other\s+dimensions\b/i, key: 'otherDimensions', mode: 'list' },
    { re: /^series\b/i, key: 'series' }
  ];
  function stripMd(s) {
    return String(s || '').replace(/\*\*|__/g, '').replace(/`/g, '').replace(/^\s*>\s?/, '').trim();
  }
  function headerInfo(line) {
    const raw = line.trim();
    if (!raw) return null;
    const isHeading = /^#{1,6}\s/.test(raw) || /^\*\*[^*]+\*\*:?\s*$/.test(raw) || /^[A-K][.)]\s/.test(stripMd(raw.replace(/^#+\s*/, '')));
    let s = stripMd(raw.replace(/^#{1,6}\s*/, '')).replace(/^[-*•]\s+/, '');
    s = s.replace(/^([A-K]|\d{1,2})[.)]\s+/, '');
    s = s.replace(/^[🏆✅⭐🔹🔸▪️•\s]+/u, '');
    for (const rule of IMPORT_RULES) {
      const m = s.match(rule.re);
      if (!m) continue;
      let rest = s.slice(m[0].length);
      rest = rest.replace(/^\s*\([^)]*\)/, '').replace(/^\s*(\+[^:]*)?/, (x) => (x.includes(':') ? x : x.startsWith(' +') || x.startsWith('+') ? '' : x));
      const colon = rest.match(/^\s*[:：\-–—]\s*/);
      if (colon) return { rule, inline: rest.slice(colon[0].length).trim(), isHeading: true };
      if (/^\s*$/.test(rest) && (isHeading || /:\s*$/.test(raw) || s.length < 60)) return { rule, inline: '', isHeading: true };
      if (isHeading) return { rule, inline: '', isHeading: true };
    }
    if (isHeading) return { rule: null, inline: '', isHeading: true };
    return null;
  }
  function splitList(text) {
    const lines = String(text || '').split(/\n/).map((l) => stripMd(l).replace(/^\s*([-*•▪◦]|\d+[.)])\s+/, '').trim()).filter(Boolean);
    let items = lines.length === 1 || lines.every((l) => l.includes(',') && l.length < 400) ? lines.join(',').split(/\s*,\s*/) : lines;
    items = items.map((x) => x.replace(/^["']|["']$/g, '').replace(/[.;]$/, '').trim()).filter(Boolean);
    return dedupeCI(items);
  }
  function dedupeCI(arr) {
    const seen = new Set(), out = [];
    for (const a of arr) { const k = String(a).trim().toLowerCase(); if (k && !seen.has(k)) { seen.add(k); out.push(String(a).trim()); } }
    return out;
  }
  function parsePasteBack(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const sections = [];
    let cur = null;
    const close = () => { if (cur && cur.rule) sections.push(cur); cur = null; };
    for (const line of lines) {
      const h = headerInfo(line);
      if (h) {
        close();
        cur = { rule: h.rule, lines: h.inline ? [h.inline] : [] };
        continue;
      }
      if (cur) cur.lines.push(line);
    }
    close();
    const out = [];
    for (const s of sections) {
      const body = s.lines.join('\n').replace(/^\s+|\s+$/g, '');
      if (!body) continue;
      const r = s.rule;
      let value;
      if (r.mode === 'list') value = splitList(body);
      else if (r.key === 'description' || r.key === 'warrantySummary' || r.key === 'coveredInWarranty' || r.key === 'notCoveredInWarranty') {
        value = body.split('\n').map((l) => stripMd(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      } else if (r.key === 'type' || r.key === 'installationType') value = splitList(body.split('\n')[0]);
      else {
        const first = body.split('\n').map((l) => stripMd(l).replace(/^[-*•]\s+/, '')).find((l) => l.trim());
        value = (first || '').replace(/^["“']|["”']$/g, '').trim();
      }
      if (Array.isArray(value) ? !value.length : !value) continue;
      out.push({ key: r.key, value, merge: !!r.merge });
    }
    // merge duplicate list keys
    const merged = [];
    for (const s of out) {
      const prev = merged.find((m) => m.key === s.key && Array.isArray(m.value) && Array.isArray(s.value));
      if (prev) { prev.value = dedupeCI(prev.value.concat(s.value)); prev.merge = prev.merge && s.merge; }
      else if (!merged.find((m) => m.key === s.key)) merged.push(s);
    }
    return merged;
  }
  function matchOptions(values, options) {
    const res = [];
    const opts = options || [];
    for (const v of values || []) {
      const lv = String(v).toLowerCase().trim();
      let hit = opts.find((o) => o.toLowerCase() === lv);
      if (!hit) hit = opts.filter((o) => lv.includes(o.toLowerCase())).sort((a, b) => b.length - a.length)[0];
      if (hit && !res.includes(hit)) res.push(hit);
    }
    return res;
  }

  /* ---------- misc ---------- */
  function joinSku(segments) {
    return (segments || []).map((s) => String((s && s.value) || '').trim()).filter(Boolean).join('-');
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDateTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(h).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  }
  // "13 Oct 2026, 08:19 AM" -> timestamp (local time); null when it does not parse
  function parseDateTime(s) {
    const m = String(s || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (!m) return null;
    const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
    if (mon < 0) return null;
    let hh = Number(m[4]) % 12;
    if (/p/i.test(m[6])) hh += 12;
    const d = new Date(Number(m[3]), mon, Number(m[1]), hh, Number(m[5]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  function fmtClock(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  return {
    num, round99, recommendedMrp, benchmarkPrice, discountPct, fmtINR,
    volumetricKg, weightSlab, shippingWeights, cmToIn, inToCm, cToK,
    STOP, tokenize, stem, smartTitleCase, ngrams, keywordDensity,
    readability, READABILITY_DOC, PRODUCT_NOUNS,
    parseFormula, buildTitle, cleanTitle,
    makeReplacer, preserveCase, deriveForm, diffWords,
    CLUSTERS, classifyTerm, analyzeKeywords, cleanKeyword, stemSet, coverage,
    parsePasteBack, matchOptions, splitList, dedupeCI,
    joinSku, fmtDateTime, fmtClock, parseDateTime
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
