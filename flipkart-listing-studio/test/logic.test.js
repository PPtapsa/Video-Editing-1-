// Run: node flipkart-listing-studio/test/logic.test.js
const L = require('../src/logic.js');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; } else { fail++; console.log('FAIL ' + name + '\n   got:  ' + g + '\n   want: ' + w); }
}
function ok(name, cond) { eq(name, !!cond, true); }

/* MRP ending-in-99 rounding */
eq('recMRP 5999', L.recommendedMrp(5999), 29999);      // 29995 -> 29999
eq('recMRP 1000', L.recommendedMrp(1000), 4999);       // 5000 -> 4999
eq('recMRP 1999', L.recommendedMrp(1999), 9999);       // 9995 -> 9999
eq('round99 29950', L.round99(29950), 29999);
eq('round99 29948', L.round99(29948), 29899);
eq('round99 tie 29949 goes up', L.round99(29949), 29999);
eq('round99 small', L.round99(50), 99);
eq('benchmark 5999', L.benchmarkPrice(5999), { raw: 7998.67, rounded: 7999 });
eq('benchmark 1499', L.benchmarkPrice(1499).rounded, 1999); // 1998.67
eq('discount', L.discountPct(29999, 5999), 80);
eq('recMRP empty', L.recommendedMrp(''), null);

/* Volumetric weight */
eq('vol 30x20x10', L.volumetricKg(30, 20, 10), 1.2);
eq('vol 10x10x10', L.volumetricKg(10, 10, 10), 0.2);
const sw = L.shippingWeights(40, 30, 20, 1.1); // vol 4.8
eq('chargeable vol', sw.which, 'volumetric');
eq('chargeable value', sw.chargeable, 4.8);
eq('inflating slab', sw.inflating, true);
const sw2 = L.shippingWeights(10, 10, 10, 0.6);
eq('dead wins', sw2.which, 'dead');
eq('slab 0.6 -> 1', sw2.slab, 1);
eq('slab 0.5 -> 0.5', L.weightSlab(0.5), 0.5);
eq('cm<->in', [L.cmToIn(25.4), L.inToCm(10)], [10, 25.4]);
eq('C to K', L.cToK(65), 338.15);

/* Smart Title Case */
eq('tc basic', L.smartTitleCase('aqualock floor drain with anti-cockroach trap for bathroom'), 'Aqualock Floor Drain with Anti-Cockroach Trap for Bathroom');
eq('tc digits kept', L.smartTitleCase('ss304 48x4 120cm 1/2" drain'), 'ss304 48x4 120cm 1/2" Drain');
eq('tc first small word', L.smartTitleCase('the basin mixer in chrome'), 'The Basin Mixer in Chrome');
eq('tc mixed case kept', L.smartTitleCase('tapsa AquaLock™ basin mixer'), 'Tapsa AquaLock™ Basin Mixer');
eq('tc acronyms kept', L.smartTitleCase('AISI 304 grade ISI marked PTMT tap 15 mm'), 'AISI 304 Grade ISI Marked PTMT Tap 15 mm');
eq('tc mm lower kept', L.smartTitleCase('drain 110 mm by tapsa'), 'Drain 110 mm by Tapsa');
eq('tc all small words', L.smartTitleCase('a an the and or nor but of to in on at by for with from per via vs'), 'A an the and or nor but of to in on at by for with from per via vs');
eq('tc shouting normalised', L.smartTitleCase('BASIN MIXER WITH SPOUT FOR KITCHEN'), 'Basin Mixer with Spout for Kitchen');
eq('tc punctuation', L.smartTitleCase('(wall mount) mixer, chrome'), '(Wall Mount) Mixer, Chrome');
eq('tc acronym lowercase typed', L.smartTitleCase('isi marked tap'), 'ISI Marked Tap');

/* Title formulas */
const faucetF = '{Model Number} {Type} Faucet ({Installation Type})';
const fv = { 'Model Number': '1234t', 'Type': 'Aerator Foam Flow', 'Installation Type': 'Wall Mount Installation Type' };
eq('faucet title', L.buildTitle(faucetF, (n) => ({ value: fv[n] || '' })).text, '1234t Aerator Foam Flow Faucet (Wall Mount Installation Type)');
eq('faucet title empty install', L.buildTitle(faucetF, (n) => ({ value: n === 'Installation Type' ? '' : fv[n] })).text, '1234t Aerator Foam Flow Faucet');
const drainF = '{Application} {Material} {Style} ({Mesh Basket Diameter} cm Set of {Set of})';
const dv = { 'Application': 'Basin, Kitchen Sink', 'Material': 'Stainless Steel', 'Style': 'Push Down Strainer', 'Mesh Basket Diameter': '10', 'Set of': '1' };
eq('drain title', L.buildTitle(drainF, (n) => ({ value: dv[n] || '' })).text, 'Basin, Kitchen Sink Stainless Steel Push Down Strainer (10 cm Set of 1)');
eq('drain title missing group', L.buildTitle(drainF, (n) => ({ value: ['Mesh Basket Diameter', 'Set of'].includes(n) ? '' : dv[n] })).text, 'Basin, Kitchen Sink Stainless Steel Push Down Strainer');
const showerF = '{Model Name} {Type} {Mount Type} Shower Head ({Spray Patterns})';
eq('shower title', L.buildTitle(showerF, (n) => ({ value: { 'Model Name': 'Aura', 'Type': 'Fixed Mount', 'Mount Type': 'Wall Mount', 'Spray Patterns': 'Rain, Mist' }[n] || '' })).text, 'Aura Fixed Mount Wall Mount Shower Head (Rain, Mist)');
eq('segments kinds', L.buildTitle('{A} x', (n) => ({ value: 'v', kind: 'model' })).segments.map((s) => s.kind), ['model', 'lit']);

/* Combined Type cap */
const types = ['Wall Mounted Basin Mixer', 'Thermostatic Valve', 'Tall Body Mixer/Tap', 'Single-Hole Faucet'];
const combined = types.join(', ');
eq('combined type length', combined.length, 85);
ok('combined over 80', combined.length > 80);
ok('3 types under 80', types.slice(0, 3).join(', ').length <= 80);

/* n-gram density */
const kd = L.keywordDensity('steel drain steel trap steel drain for bathroom');
eq('x1 top', kd.x1[0], { term: 'steel', count: 3, pct: 37.5 });
eq('x2 top', kd.x2[0], { term: 'steel drain', count: 2, pct: 28.6 });
eq('x3 count', kd.x3.find((r) => r.term === 'steel drain steel').count, 1);
ok('stopword excluded from x1', !kd.x1.find((r) => r.term === 'for'));

/* case-preserving token replacement */
const rep = L.makeReplacer([{ from: 'Sfumato', to: 'Chroma' }]);
eq('case upper', rep('SFUMATO finish'), 'CHROMA finish');
eq('case title', rep('Sfumato finish'), 'Chroma finish');
eq('case lower', rep('sfumato finish'), 'chroma finish');
eq('whole word safe', rep('Sfumatox Sfumato-Line'), 'Sfumatox Chroma-Line');
const size = L.makeReplacer([
  { from: '48x4', to: '36x4' }, { from: '48 x 4', to: '36 x 4' }, { from: '48 × 4', to: '36 × 4' },
  { from: '48 Inch', to: '36 Inch' }, { from: '120 cm', to: '90 cm' }, { from: '1200 mm', to: '900 mm' }
]);
eq('size forms', size('Drain 48x4, 48X4 | 48 x 4 / 48 × 4 · 48 Inch = 120 cm = 1200 mm'), 'Drain 36x4, 36X4 | 36 x 4 / 36 × 4 · 36 Inch = 90 cm = 900 mm');
eq('sku segment', size('T-SSM-AQL-SLK-FAD-FD-48X4-D-32-H-75-PC-1'), 'T-SSM-AQL-SLK-FAD-FD-36X4-D-32-H-75-PC-1');
eq('no partial number', size('148x4 48x40'), '148x4 48x40');
const chain = L.makeReplacer([{ from: 'A1', to: 'B1' }, { from: 'B1', to: 'C1' }]);
eq('single pass (no chaining)', chain('A1 B1'), 'B1 C1');
eq('derive dim form', L.deriveForm('48x4', '48 X 4', '36x4'), '36 X 4');
eq('derive case form', L.deriveForm('Sfumato', 'SFUMATO', 'Chroma'), 'CHROMA');
eq('derive unknown form', L.deriveForm('48x4', '120 cm', '36x4'), '');

/* readability */
const good = L.readability('Tapsa AquaLock Stainless Steel Floor Drain with Anti-Cockroach Trap');
ok('good title >= 80', good.score >= 80);
const bad = L.readability('Basin, Bathroom Sink, Bathtub, Floor, Kitchen Sink Brass, Ceramic, Plastic Push Down Strainer');
ok('comma list < 60', bad.score < 60);
const caps = L.readability('BEST DRAIN DRAIN DRAIN STEEL STEEL');
ok('stuffed caps low', caps.score < 40);

/* keyword bank */
const kb = L.analyzeKeywords([{ kw: 'Floor Drain', vol: 100 }, { kw: 'floor drains ', vol: 50 }, { kw: 'stainless steel floor drain', vol: 30 }, { kw: 'Floor drain 6x6', vol: 10 }, { kw: 'floor drain', vol: 5 }]);
eq('kb dedupe', kb.keywords.length, 4);
eq('kb top terms', kb.terms.slice(0, 2).map((t) => t.term).sort(), ['drain', 'floor']);
eq('kb drain freq (plural merged)', kb.terms.find((t) => t.stem === 'drain').freq, 4);
eq('kb cluster material', kb.terms.find((t) => t.term === 'stainless').cluster, 'Material');
eq('kb cluster size', kb.terms.find((t) => t.term === '6x6').cluster, 'Size');
eq('kb volume', kb.terms.find((t) => t.term === 'stainless').vol, 30);
const cov = L.coverage(kb.terms, 'Floor Drain in Steel');
eq('coverage pct', cov.pct, 60);
eq('uncovered', cov.uncovered.map((t) => t.term).sort(), ['6x6', 'stainless']);

/* paste-back parser */
const answer = [
  '## A. Optimised Model Number + auto-title',
  '**Model Number:** AquaLock SS304 Anti-Cockroach 48x4 Floor Trap',
  '**Auto-title:** AquaLock SS304 ... Faucet',
  '**Type:** Basin Mixer, Pillar Tap',
  '**Installation Type:** Deck Mount Installation Type',
  '## B. Key Features',
  '- Anti-cockroach trap [VERIFY]',
  '- SS304 body',
  '## C. Product Description',
  'Line one of the description.',
  '',
  'Line two.',
  '## D. Search Keywords',
  'floor drain, steel drain, bathroom jali',
  '## E. Primary + Secondary + Long-tail keywords',
  '- primary: floor drain',
  '## F. Main image recommendation',
  'Front on white.'
].join('\n');
const parsed = L.parsePasteBack(answer);
const byKey = Object.fromEntries(parsed.map((p) => [p.key, p.value]));
eq('pb model', byKey.modelNumber, 'AquaLock SS304 Anti-Cockroach 48x4 Floor Trap');
eq('pb type', byKey.type, ['Basin Mixer', 'Pillar Tap']);
eq('pb install', byKey.installationType, ['Deck Mount Installation Type']);
eq('pb features', byKey.otherFeatures, ['Anti-cockroach trap [VERIFY]', 'SS304 body']);
eq('pb description', byKey.description, 'Line one of the description.\n\nLine two.');
ok('pb search keywords include list', byKey.searchKeywords.includes('steel drain'));
ok('pb section F ignored', !parsed.find((p) => /white/.test(JSON.stringify(p.value))));
eq('match options', L.matchOptions(['basin mixer', 'Wall Mount'], ['Basin Mixer', 'Wall Mixer', 'Wall Mount Installation Type']), ['Basin Mixer']);

/* misc */
eq('sku join', L.joinSku([{ value: 'T' }, { value: ' SSM ' }, { value: '' }, { value: 'PC-1' }]), 'T-SSM-PC-1');
eq('date fmt', L.fmtDateTime(new Date(2026, 9, 13, 0, 28).getTime()), '13 Oct 2026, 12:28 AM');
eq('date fmt pm', L.fmtDateTime(new Date(2026, 9, 13, 15, 5).getTime()), '13 Oct 2026, 03:05 PM');
eq('diff', L.diffWords('a b c', 'a x c').map((d) => d.type), ['eq', 'del', 'ins', 'eq']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
