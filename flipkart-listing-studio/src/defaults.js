/* ==========================================================================
   Defaults — Flipkart Seller Hub field mirrors, category definitions
   ========================================================================== */
const COLORS = ['Beige', 'Black', 'Blue', 'Brown', 'Clear', 'Gold', 'Green', 'Grey', 'Ivory', 'Maroon', 'Multicolor', 'Orange', 'Pink', 'Purple', 'Red', 'Silver', 'Steel', 'White', 'Yellow'];

const DEFAULT_PRESET_ID = 'preset_pp';
const DEFAULT_SETTINGS = () => ({
  v: 1,
  brands: [{ name: 'Tapsa', code: 'T' }, { name: 'Hybath', code: 'HB' }],
  hsn: [{ code: '73249000', desc: 'Sanitary ware of iron/steel incl. parts' }],
  presets: [{ id: DEFAULT_PRESET_ID, label: 'PP INTERNATIONAL', text: 'PP INTERNATIONAL, Samaypur Badli, Delhi - 110042, India Contact No. (91) 7065756055' }],
  categories: {},          // edited built-ins + custom categories, keyed by id
  categoryOrder: ['faucet', 'drain', 'shower']
});

/* Price, Stock and Shipping Information — shared core.
   counted:false keeps a field out of the (x/N) counter, matching Seller Hub's 17 for faucets. */
function coreSections(cat) {
  const fees = cat.handlingFees ? [
    { key: 'localFee', label: 'Local handling fee', type: 'money', req: true, def: '0' },
    { key: 'zonalFee', label: 'Zonal handling fee', type: 'money', req: true, def: '0' },
    { key: 'nationalFee', label: 'National handling fee', type: 'money', req: true, def: '0' }
  ] : [];
  const extras = (cat.coreExtras || []).map((f) => Object.assign({ core: true }, f));
  const secs = [
    { name: 'Listing Information', fields: [{ key: 'sku', label: 'Seller SKU ID', type: 'sku', req: true, limit: 64 }] },
    { name: 'Status Details', fields: [{ key: 'listingStatus', label: 'Listing Status', type: 'single', req: true, options: ['Active', 'Inactive'], def: 'Active' }] },
    { name: 'Price Details', fields: [
      { key: 'mrp', label: 'MRP', type: 'mrp', req: true, unit: 'INR' },
      { key: 'sp', label: 'Your selling price', type: 'sp', req: true, unit: 'INR' },
      { key: 'minoq', label: 'Minimum Order Quantity (MinOQ)', type: 'number', def: '1' }
    ] },
    { name: 'Inventory Details', fields: [
      { key: 'fulfilledBy', label: 'Fulfillment by', type: 'single', req: true, options: ['Seller'], def: 'Seller', counted: false },
      { key: 'procType', label: 'Procurement type', type: 'single', req: true, options: ['instock', 'express', 'domestic procurement'], def: 'instock' },
      { key: 'procSla', label: 'Procurement SLA', type: 'sla', req: true },
      { key: 'stock', label: 'Stock', type: 'number', req: true }
    ] },
    { name: 'Shipping Provider', fields: [{ key: 'shipProvider', label: 'Shipping provider', type: 'single', req: true, options: ['Flipkart'], def: 'Flipkart' }].concat(fees) },
    { name: 'Package Details', fields: [
      { key: 'length', label: 'Length', type: 'dim', req: true },
      { key: 'breadth', label: 'Breadth', type: 'dim', req: true },
      { key: 'height', label: 'Height', type: 'dim', req: true },
      { key: 'weight', label: 'Weight', type: 'wt', req: true }
    ], volumetric: true },
    { name: 'Tax Details', fields: [
      { key: 'hsn', label: 'HSN', type: 'hsn', req: true },
      { key: 'luxuryCess', label: 'Luxury Cess', type: 'number', unit: '%', def: '0' },
      { key: 'taxCode', label: 'Tax Code', type: 'text', req: true, def: 'GST_18' }
    ] },
    { name: 'Manufacturing Details', fields: [
      { key: 'coo', label: 'Country Of Origin', type: 'text', req: true, def: 'India' },
      { key: 'manufacturer', label: 'Manufacturer Details', type: 'preset', req: true, def: DEFAULT_PRESET_ID },
      { key: 'packer', label: 'Packer Details', type: 'preset', req: true, def: DEFAULT_PRESET_ID }
    ] }
  ];
  if (extras.length) secs.push({ name: 'Other Details', fields: extras });
  return secs;
}
function coreFields(cat) { return coreSections(cat).flatMap((s) => s.fields); }

const FAUCET_TYPES = ['Aerator Foam Flow', 'Angle Cock', 'Basin Mixer', 'Bib Tap', 'Cascading Faucet', 'Cascading Spout', 'Cartridge', 'Diverter', 'Dual-Flow Faucet', 'Diverter Plate', 'Flange', 'Flush Valve', 'Gooseneck Faucet', 'Health Faucet', 'Kitchen Mixer', 'Lift Cock', 'Pillar Tap', 'Push Cock', 'Pull-Out Faucet', 'Pull-Out Faucet/Tap', 'Spout', 'Sensor Tap', 'Swan Neck Faucet', 'Single-Hole Faucet', 'Sink Mixer', 'Sink Tap', 'Stop Valve', 'Tall Body Mixer', 'Tall Body Mixer/Tap', 'Taper Cock', 'Twin Elbow Valve', 'Three Way Valve', 'Thermostatic Valve', 'Wall Mounted Basin Mixer', 'Wall Mixer'];
const FAUCET_INSTALL = ['Built-in Installation Type', 'Centerset Installation Type', 'Deck Mount Installation Type', 'Floor Mount Installation Type', 'Single Handle Installation Type', 'Spout Installation Type', 'Spread Fit Installation Type', 'Vessel Installation Type', 'Wall Concealed Installation Type', 'Wall Mount Installation Type'];
const FAUCET_CONTROL = ['Ball Faucet', 'Compression', 'Compression Faucet', 'Disc Faucet', 'Half Turn', 'Handle Controlled', 'Joystick Controlled', 'Knob Controlled', 'Motion Sensor Controlled', 'Push Cock/Self-Closing', 'Quarter Turn (Ceramic)', 'Single Lever Mixer'];
const FAUCET_MATERIAL = ['ABS Plastic', 'Brass (Virgin Grade)', 'Brass', 'Bronze', 'Ceramic (Disc)', 'Copper', 'Nickle', 'Plastic', 'PTMT (Plastic)', 'Stainless Steel (SS 304)', 'Stainless Steel', 'Steel', 'Zinc Alloy', 'Zinc'];

const BUILTIN_CATEGORIES = {
  faucet: {
    id: 'faucet', name: 'Faucet', builtin: true, skuCode: 'FC',
    imageLabels: ['Front View', 'Side View', 'Size View', 'Life Style', 'Image'], imageMin: 1100,
    handlingFees: false, coreExtras: [],
    titleFormula: '{Model Number} {Type} Faucet ({Installation Type})', titleVerified: true,
    seoField: 'modelNumber', stepped: true,
    variantAxis: ['brandColor', 'material'],
    variantCols: ['brandColor', 'material', 'sku', 'listingStatus', 'mrp', 'sp', 'fulfilledBy', 'procType', 'procSla', 'stock', 'shipProvider', 'length', 'breadth', 'height', 'weight', 'hsn', 'luxuryCess', 'coo', 'manufacturer', 'packer', 'taxCode', 'minoq', 'modelNumber', 'color', 'suitableFor', 'numHandles', 'maxTemp', 'flowRate', 'holeDiameter', 'itemsIncluded', 'description', 'searchKeywords', 'videoUrl', 'finish', 'series', 'width', 'productWeight', 'otherDimensions', 'certification', 'otherFeatures', 'domesticWarranty', 'internationalWarranty', 'warrantySummary', 'warrantyServiceType', 'coveredInWarranty', 'notCoveredInWarranty', 'supplierImage', 'parentBrand', 'faucetCategory', 'boxHeight', 'netQuantity', 'packOf', 'eanUpc'],
    colLabels: { fulfilledBy: 'Fullfilment by', maxTemp: 'Maximum Water Inlet Temperature', flowRate: 'Flow Rate', holeDiameter: 'Hole Diameter', width: 'Width', productWeight: 'Weight', boxHeight: 'Height' },
    fields: [
      { key: 'modelNumber', label: 'Model Number', type: 'text', tab: 'pd', section: '', req: true, title: true, limit: 80 },
      { key: 'brandColor', label: 'Brand Color', type: 'fktm', tab: 'pd', section: '', req: true },
      { key: 'type', label: 'Type', type: 'multi', tab: 'pd', section: '', req: true, title: true, options: FAUCET_TYPES, combinedLimit: 80, rank: true },
      { key: 'installationType', label: 'Installation Type', type: 'multi', tab: 'pd', section: '', req: true, title: true, options: FAUCET_INSTALL, exactOne: true },
      { key: 'faucetControl', label: 'Faucet Control', type: 'multi', tab: 'pd', section: '', req: true, options: FAUCET_CONTROL },
      { key: 'material', label: 'Material', type: 'multi', tab: 'pd', section: '', req: true, options: FAUCET_MATERIAL },
      { key: 'itemsIncluded', label: 'Items Included', type: 'fktm', tab: 'pd', section: '', req: true },
      { key: 'faucetCategory', label: 'Faucet Category', type: 'single', tab: 'pd', section: '', req: true, options: ['Faucet (Single Unit)', 'Faucet Set'] },

      { key: 'color', label: 'Color', type: 'multi', tab: 'ad', section: 'General', options: COLORS },
      { key: 'suitableFor', label: 'Suitable For', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'numHandles', label: 'Number of Handles', type: 'number', tab: 'ad', section: 'General' },
      { key: 'description', label: 'Description', type: 'long', tab: 'ad', section: 'General', limit: 5000 },
      { key: 'searchKeywords', label: 'Search Keywords', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'videoUrl', label: 'Video URL', type: 'text', tab: 'ad', section: 'General' },
      { key: 'finish', label: 'Finish', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'series', label: 'Series', type: 'text', tab: 'ad', section: 'General' },
      { key: 'parentBrand', label: 'Parent Brand', type: 'text', tab: 'ad', section: 'General' },
      { key: 'netQuantity', label: 'Net Quantity', type: 'text', tab: 'ad', section: 'General' },
      { key: 'packOf', label: 'Pack Of', type: 'number', tab: 'ad', section: 'General' },
      { key: 'eanUpc', label: 'EAN/UPC', type: 'text', tab: 'ad', section: 'General' },
      { key: 'maxTemp', label: 'Maximum Water Inlet Temperature (in K)', type: 'number', tab: 'ad', section: 'Performance Features', unit: 'K', helper: 'tempK' },
      { key: 'flowRate', label: 'Flow Rate (l/min)', type: 'number', tab: 'ad', section: 'Performance Features', unit: 'l/min' },
      { key: 'holeDiameter', label: 'Hole Diameter (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm' },
      { key: 'width', label: 'Width (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm' },
      { key: 'productWeight', label: 'Weight (g)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'g' },
      { key: 'otherDimensions', label: 'Other Dimensions', type: 'fktm', tab: 'ad', section: 'Dimensions' },
      { key: 'certification', label: 'Certification', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'otherFeatures', label: 'Other Features', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'domesticWarranty', label: 'Domestic Warranty', type: 'warranty', tab: 'ad', section: 'Warranty' },
      { key: 'internationalWarranty', label: 'International Warranty', type: 'warranty', tab: 'ad', section: 'Warranty' },
      { key: 'warrantySummary', label: 'Warranty Summary', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'warrantyServiceType', label: 'Warranty Service Type', type: 'text', tab: 'ad', section: 'Warranty' },
      { key: 'coveredInWarranty', label: 'Covered in Warranty', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'notCoveredInWarranty', label: 'Not Covered in Warranty', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'boxHeight', label: 'Height (cm)', type: 'number', tab: 'ad', section: 'Box Dimensions', unit: 'cm' }
    ]
  },

  drain: {
    id: 'drain', name: 'Drain Strainer', builtin: true, skuCode: 'FD',
    imageLabels: ['Image'], imageMin: 1100,
    handlingFees: true, coreExtras: [],
    titleFormula: '{Application} {Material} {Style} ({Mesh Basket Diameter} cm Set of {Set of})', titleVerified: true,
    seoField: 'modelNumber', stepped: false,
    variantAxis: ['meshDiameter'],
    variantCols: ['meshDiameter', 'sku', 'listingStatus', 'mrp', 'sp', 'fulfilledBy', 'procType', 'procSla', 'stock', 'shipProvider', 'localFee', 'zonalFee', 'nationalFee', 'length', 'breadth', 'height', 'weight', 'hsn', 'luxuryCess', 'coo', 'manufacturer', 'packer', 'taxCode', 'minoq', 'application', 'material', 'setOf', 'modelName', 'finish', 'strainerBasketType', 'strainType', 'drainInstallType', 'surfaceTreatment', 'usage', 'width', 'dimHeight', 'otherDimensions', 'openCloseStopper', 'rustResistant', 'certification', 'otherFeatures', 'domWarrantyYears', 'intlWarrantyYears', 'eanUpcList', 'packOf', 'searchKeywords'],
    colLabels: { fulfilledBy: 'Fullfilment by', meshDiameter: 'Mesh Basket Diameter', width: 'Width', dimHeight: 'Height', domWarrantyYears: 'Domestic Warranty', intlWarrantyYears: 'International Warranty', packOf: 'Pack of' },
    fields: [
      { key: 'modelNumber', label: 'Model Number', type: 'text', tab: 'pd', section: '', req: true, limit: 80, seo: true },
      { key: 'application', label: 'Application', type: 'multi', tab: 'pd', section: '', req: true, title: true, options: ['Basin', 'Bathroom Sink', 'Bathtub', 'Floor', 'Kitchen Sink'] },
      { key: 'material', label: 'Material', type: 'multi', tab: 'pd', section: '', req: true, title: true, options: ['Brass', 'Ceramic', 'Ductile Iron', 'Plastic', 'Stainless Steel', 'Zinc'] },
      { key: 'style', label: 'Style', type: 'single', tab: 'pd', section: '', req: true, title: true, options: ['Push Down Strainer', 'Pop-Up Strainer'] },
      { key: 'withTailPiece', label: 'With Tail Piece', type: 'yesno', tab: 'pd', section: '', req: true },
      { key: 'meshDiameter', label: 'Mesh Basket Diameter', type: 'number', tab: 'pd', section: '', req: true, title: true, unit: 'cm' },
      { key: 'setOf', label: 'Set of', type: 'number', tab: 'pd', section: '', req: true, title: true },

      { key: 'modelName', label: 'Model Name', type: 'text', tab: 'ad', section: 'General' },
      { key: 'finish', label: 'Finish', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'strainerBasketType', label: 'Strainer Basket Type', type: 'text', tab: 'ad', section: 'General' },
      { key: 'strainType', label: 'Strain Type', type: 'text', tab: 'ad', section: 'General' },
      { key: 'drainInstallType', label: 'Installation Type', type: 'text', tab: 'ad', section: 'General' },
      { key: 'surfaceTreatment', label: 'Surface Treatment', type: 'text', tab: 'ad', section: 'General' },
      { key: 'usage', label: 'Usage', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'eanUpcList', label: 'EAN/UPC', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'packOf', label: 'Pack of', type: 'number', tab: 'ad', section: 'General' },
      { key: 'searchKeywords', label: 'Search Keywords', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'width', label: 'Width (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm' },
      { key: 'dimHeight', label: 'Height (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm' },
      { key: 'otherDimensions', label: 'Other Dimensions', type: 'fktm', tab: 'ad', section: 'Dimensions' },
      { key: 'openCloseStopper', label: 'Open and Close Stopper', type: 'yesno', tab: 'ad', section: 'Additional Features' },
      { key: 'rustResistant', label: 'Rust Resistant', type: 'yesno', tab: 'ad', section: 'Additional Features' },
      { key: 'certification', label: 'Certification', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'otherFeatures', label: 'Other Features', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'domWarrantyYears', label: 'Domestic Warranty', type: 'number', tab: 'ad', section: 'Warranty', unit: 'Year' },
      { key: 'intlWarrantyYears', label: 'International Warranty', type: 'number', tab: 'ad', section: 'Warranty', unit: 'Year' }
    ]
  },

  shower: {
    id: 'shower', name: 'Shower Head', builtin: true, skuCode: 'SH',
    imageLabels: ['Image'], imageMin: 1100,
    handlingFees: true,
    coreExtras: [{ key: 'coreExtra1', label: 'Extra field (rename in Category Builder)', type: 'text', req: true }],
    titleFormula: '{Model Name} {Type} {Mount Type} Shower Head ({Spray Patterns})', titleVerified: false,
    seoField: 'modelName', stepped: false,
    variantAxis: ['finish'], variantAxisOptional: ['sprayFaceDiameter'],
    variantCols: null, // computed: axis + full core + every PD + AD field
    colLabels: { fulfilledBy: 'Fullfilment by', sprayFaceDiameter: 'Size' },
    fields: [
      { key: 'modelNumber', label: 'Model Number', type: 'text', tab: 'pd', section: '', req: true, limit: 80 },
      { key: 'modelName', label: 'Model Name', type: 'text', tab: 'pd', section: '', req: true, title: true, limit: 80 },
      { key: 'finish', label: 'Finish', type: 'fktm', tab: 'pd', section: '', req: true },
      { key: 'showerType', label: 'Type', type: 'single', tab: 'pd', section: '', req: true, title: true, options: ['Fixed Mount', 'Handheld'] },
      { key: 'mountType', label: 'Mount Type', type: 'single', tab: 'pd', section: '', req: true, title: true, options: ['Ceiling Mount', 'Handheld', 'Wall Mount'] },
      { key: 'sprayPatterns', label: 'Spray Patterns', type: 'multi', tab: 'pd', section: '', req: true, title: true, max: 4, options: ['Massage', 'Mist', 'Rain', 'Waterfall'] },
      { key: 'material', label: 'Material', type: 'multi', tab: 'pd', section: '', req: true, max: 11, options: ['Aluminium', 'Brass', 'Bronze', 'Cast Iron', 'Copper', 'Gold Plated', 'Iron', 'Nickle', 'Plastic', 'Polypropylene', 'Steel'] },
      { key: 'itemsIncluded', label: 'Items Included', type: 'fktm', tab: 'pd', section: '', req: true },

      { key: 'color', label: 'Color', type: 'multi', tab: 'ad', section: 'General', options: COLORS },
      { key: 'suitableFor', label: 'Suitable For', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'numSpraySettings', label: 'Number of Spray Settings', type: 'number', tab: 'ad', section: 'General' },
      { key: 'description', label: 'Description', type: 'long', tab: 'ad', section: 'General', limit: 5000 },
      { key: 'searchKeywords', label: 'Search Keywords', type: 'fktm', tab: 'ad', section: 'General' },
      { key: 'videoUrl', label: 'Video URL', type: 'text', tab: 'ad', section: 'General' },
      { key: 'series', label: 'Series', type: 'text', tab: 'ad', section: 'General' },
      { key: 'parentBrand', label: 'Parent Brand', type: 'text', tab: 'ad', section: 'General' },
      { key: 'netQuantity', label: 'Net Quantity', type: 'text', tab: 'ad', section: 'General' },
      { key: 'packOf', label: 'Pack Of', type: 'number', tab: 'ad', section: 'General' },
      { key: 'eanUpc', label: 'EAN/UPC', type: 'text', tab: 'ad', section: 'General' },
      { key: 'flowRate', label: 'Flow Rate (l/min)', type: 'number', tab: 'ad', section: 'Performance Features', unit: 'l/min' },
      { key: 'maxTemp', label: 'Maximum Water Inlet Temperature (in K)', type: 'number', tab: 'ad', section: 'Performance Features', unit: 'K', helper: 'tempK' },
      { key: 'sprayFaceDiameter', label: 'Spray Face Diameter (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm' },
      { key: 'hoseLength', label: 'Hose Length (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm', hint: 'For handheld' },
      { key: 'armLength', label: 'Arm Length (cm)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'cm', hint: 'For fixed mount' },
      { key: 'productWeight', label: 'Weight (g)', type: 'number', tab: 'ad', section: 'Dimensions', unit: 'g' },
      { key: 'otherDimensions', label: 'Other Dimensions', type: 'fktm', tab: 'ad', section: 'Dimensions' },
      { key: 'certification', label: 'Certification', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'otherFeatures', label: 'Other Features', type: 'fktm', tab: 'ad', section: 'Additional Features' },
      { key: 'domesticWarranty', label: 'Domestic Warranty', type: 'warranty', tab: 'ad', section: 'Warranty' },
      { key: 'internationalWarranty', label: 'International Warranty', type: 'warranty', tab: 'ad', section: 'Warranty' },
      { key: 'warrantySummary', label: 'Warranty Summary', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'warrantyServiceType', label: 'Warranty Service Type', type: 'text', tab: 'ad', section: 'Warranty' },
      { key: 'coveredInWarranty', label: 'Covered in Warranty', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'notCoveredInWarranty', label: 'Not Covered in Warranty', type: 'long', tab: 'ad', section: 'Warranty' },
      { key: 'boxHeight', label: 'Height (cm)', type: 'number', tab: 'ad', section: 'Box Dimensions', unit: 'cm' }
    ]
  }
};

const VARIANT_ONLY_FIELDS = { supplierImage: { key: 'supplierImage', label: 'Supplier Image', type: 'text' } };

const FIELD_TYPES = [
  ['text', 'Text'], ['number', 'Number + unit'], ['single', 'Single-select'], ['multi', 'Multi-select'],
  ['fktm', 'Fkt-M (multiple values)'], ['yesno', 'Yes / No'], ['long', 'Long text'], ['warranty', 'Number + Year/Month']
];

// Material words the contradiction guardrail looks for in the listing's own text
const MATERIAL_ALIASES = [
  { id: 'brass', re: /\bbrass\b/i, label: 'brass' },
  { id: 'ss', re: /\b(ss\s?-?30[24]|ss\s?-?316|stainless|aisi\s?30[24]|ss)\b/i, label: 'stainless steel / SS304' },
  { id: 'ptmt', re: /\bptmt\b/i, label: 'PTMT' },
  { id: 'plastic', re: /\b(plastic|abs|pvc|upvc|polypropylene|pp)\b/i, label: 'plastic' },
  { id: 'zinc', re: /\b(zinc|zamak)\b/i, label: 'zinc' },
  { id: 'copper', re: /\bcopper\b/i, label: 'copper' },
  { id: 'bronze', re: /\bbronze\b/i, label: 'bronze' },
  { id: 'ceramic', re: /\bceramic\b/i, label: 'ceramic' },
  { id: 'iron', re: /\b(ductile|cast\s?iron|iron)\b/i, label: 'iron' },
  { id: 'alu', re: /\balumin(i)?um\b/i, label: 'aluminium' },
  { id: 'nickel', re: /\bnick(el|le)\b/i, label: 'nickel' },
  { id: 'steel', re: /\b(steel|ss)\b/i, label: 'steel' }
];
// map option label -> alias ids that support it
function materialAliasIds(option) {
  const o = option.toLowerCase();
  const ids = [];
  if (/brass/.test(o)) ids.push('brass');
  if (/stainless|ss 304/.test(o)) ids.push('ss', 'steel');
  else if (/steel/.test(o)) ids.push('steel', 'ss');
  if (/ptmt/.test(o)) ids.push('ptmt', 'plastic');
  if (/plastic|abs|polypropylene/.test(o)) ids.push('plastic', 'ptmt');
  if (/zinc/.test(o)) ids.push('zinc');
  if (/copper/.test(o)) ids.push('copper');
  if (/bronze/.test(o)) ids.push('bronze');
  if (/ceramic/.test(o)) ids.push('ceramic');
  if (/iron/.test(o)) ids.push('iron');
  if (/alumin/.test(o)) ids.push('alu');
  if (/nick/.test(o)) ids.push('nickel');
  if (/gold plated/.test(o)) ids.push('brass', 'steel', 'zinc');
  return ids;
}
