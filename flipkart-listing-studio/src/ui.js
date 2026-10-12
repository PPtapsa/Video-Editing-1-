/* ==========================================================================
   UI helpers — element builder, icons, toast, copy, popover, modal, sortable
   ========================================================================== */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'text') el.textContent = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  appendKids(el, kids);
  if (value !== undefined) el.value = value;
  return el;
}
function appendKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : String(k));
  }
}
// conditional children are written as `cond ? node : null`; skip those in native append/prepend too
for (const fn of ['append', 'prepend']) {
  const orig = Element.prototype[fn];
  Element.prototype[fn] = function (...kids) { return orig.apply(this, kids.filter((k) => k !== null && k !== undefined && k !== false)); };
}
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function debounce(fn, ms) { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; }
function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return v.n === undefined || String(v.n).trim() === '';
  return String(v).trim() === '';
}
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

const ICONS = {
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  drag: '<circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  dup: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12h8M12 8v8" opacity=".0"/><circle cx="12" cy="12" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  open: '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'
};
function icon(name, size) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  if (size) { s.setAttribute('width', size); s.setAttribute('height', size); }
  s.innerHTML = ICONS[name] || '';
  return s;
}

/* ---------- toast ---------- */
let toastWrap = null;
function toast(msg, ms) {
  if (!toastWrap) { toastWrap = h('div', { class: 'toast-wrap', role: 'status', 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h('div', { class: 'toast' }, msg);
  toastWrap.append(t);
  setTimeout(() => t.remove(), ms || 1000);
}

/* ---------- clipboard ---------- */
function copyText(text) {
  text = String(text ?? '');
  const fallback = () => {
    try {
      const ta = h('textarea', { style: { position: 'fixed', top: '-1000px', left: '0', opacity: '0' } });
      ta.value = text; document.body.append(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallback());
  } catch (e) { /* fall through */ }
  return Promise.resolve(fallback());
}
function doCopy(text, label) {
  if (text === null || text === undefined || String(text) === '') { toast('Nothing to copy yet'); return; }
  copyText(text).then((ok) => toast(ok ? (label || 'Copied ✓') : 'Copy was blocked — select the text and copy it manually', ok ? 1000 : 2600));
}
function copyBtn(get, title, small) {
  return h('button', { class: 'icon-btn copy' + (small ? ' sm' : ''), type: 'button', title: title || 'Copy', 'aria-label': title || 'Copy', onClick: (e) => { e.preventDefault(); e.stopPropagation(); doCopy(get()); } }, icon('copy'));
}
function iconBtn(name, title, onClick, cls) {
  return h('button', { class: 'icon-btn ' + (cls || ''), type: 'button', title, 'aria-label': title, onClick: (e) => { e.preventDefault(); e.stopPropagation(); onClick(e); } }, icon(name));
}

/* ---------- counters ---------- */
function ctrText(len, limit) { return limit ? len + ' / ' + limit : String(len); }
function ctrClass(len, limit) { return 'ctr' + (limit ? (len > limit ? ' over' : len >= limit * 0.9 ? ' warn' : '') : ''); }
function ctrEl(len, limit) { return h('span', { class: ctrClass(len, limit), title: limit ? 'Characters used / limit' : 'Characters' }, ctrText(len, limit)); }
function setCtr(el, len, limit) { if (!el) return; el.className = ctrClass(len, limit); el.textContent = ctrText(len, limit); }

/* ---------- popover ---------- */
let openPopClose = null;
function openPop(anchor, content, opts) {
  opts = opts || {};
  if (openPopClose) openPopClose();
  const pop = h('div', { class: 'pop', role: 'dialog' }, content);
  document.body.append(pop);
  const place = () => {
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = r.left + window.scrollX;
    if (left + pw > window.scrollX + document.documentElement.clientWidth - 12) left = window.scrollX + document.documentElement.clientWidth - pw - 12;
    let top = r.bottom + window.scrollY + 6;
    if (r.bottom + ph + 12 > window.innerHeight && r.top - ph - 6 > 0) top = r.top + window.scrollY - ph - 6;
    pop.style.left = Math.max(12, left) + 'px'; pop.style.top = top + 'px';
  };
  place();
  const onDown = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    pop.remove(); document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey);
    if (openPopClose === close) openPopClose = null;
    if (opts.onClose) opts.onClose();
  }
  setTimeout(() => { document.addEventListener('pointerdown', onDown, true); document.addEventListener('keydown', onKey); }, 0);
  openPopClose = close;
  const first = pop.querySelector('input, select, textarea, button');
  if (first && opts.focus !== false) setTimeout(() => first.focus(), 0);
  return { close, el: pop, place };
}
// small inline form in a popover: fields [{name, label, placeholder, type, value}]
function promptPop(anchor, title, fields, onSubmit, submitLabel) {
  const inputs = {};
  const form = h('form', { class: 'stack', onSubmit: (e) => {
    e.preventDefault();
    const vals = {};
    for (const f of fields) vals[f.name] = inputs[f.name].value.trim();
    if (onSubmit(vals) !== false) p.close();
  } },
  h('h4', null, title),
  fields.map((f) => {
    const id = uid('pf');
    inputs[f.name] = f.type === 'textarea' ? h('textarea', { class: 'inp', id, placeholder: f.placeholder || '', rows: 3, value: f.value || '' }) : h('input', { class: 'inp sm', id, placeholder: f.placeholder || '', value: f.value || '' });
    return h('label', { class: 'lbl-stack', for: id }, f.label, inputs[f.name]);
  }),
  h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
    h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => p.close() }, 'Cancel'),
    h('button', { class: 'btn btn-sm btn-primary', type: 'submit' }, submitLabel || 'Add')));
  const p = openPop(anchor, form);
  return p;
}
// inline confirm in a popover (confirm() is unavailable in the viewer)
function confirmPop(anchor, text, onYes, yesLabel) {
  const p = openPop(anchor, h('div', { class: 'stack' }, h('div', { class: 'note-line' }, text),
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => p.close() }, 'Cancel'),
      h('button', { class: 'btn btn-sm btn-danger', type: 'button', onClick: () => { p.close(); onYes(); } }, yesLabel || 'Delete'))));
  return p;
}

/* ---------- modal & drawer ---------- */
function openLayer(kind, opts) {
  const scrim = h('div', { class: 'scrim' });
  const body = h('div', { class: kind + '-body' }, opts.body);
  const head = h('div', { class: kind + '-head' }, h('h2', null, opts.title), opts.headExtra || null, iconBtn('x', 'Close', () => close()));
  const el = h('div', { class: kind + (opts.narrow ? ' narrow' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title }, head, body, opts.foot ? h('div', { class: 'modal-foot' }, opts.foot) : null);
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.pop')) close(); };
  function close() { scrim.remove(); el.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); }
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(scrim, el);
  return { el, body, close };
}
const openModal = (o) => openLayer('modal', o);
const openDrawer = (o) => openLayer('drawer', o);

/* ---------- pointer-based sortable (mouse + touch) ---------- */
function makeSortable(container, opts) {
  container.addEventListener('pointerdown', (e) => {
    const hdl = e.target.closest(opts.handle);
    if (!hdl || !container.contains(hdl)) return;
    const it = hdl.closest(opts.item);
    if (!it || it.parentElement !== container) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const items = () => [...container.children].filter((c) => c.matches(opts.item));
    const from = items().indexOf(it);
    let moved = false;
    const startX = e.clientX, startY = e.clientY;
    const move = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
      if (!moved) { moved = true; it.classList.add('sort-placeholder'); }
      const els = items();
      const target = els.find((el) => {
        if (el === it) return false;
        const r = el.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (target) {
        const a = els.indexOf(it), b = els.indexOf(target);
        if (a < b) target.after(it); else target.before(it);
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      it.classList.remove('sort-placeholder');
      const to = items().indexOf(it);
      if (moved && to !== from) opts.onEnd(from, to);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}
function moveItem(arr, from, to) { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); return arr; }

/* ---------- misc ---------- */
function tipI(text) { return h('span', { class: 'tooltip-i', tabindex: '0', 'data-tip': text, 'aria-label': text }, 'i'); }
function highlightVerify(text) {
  return esc(text).replace(/\[VERIFY[^\]]*\]/g, (m) => '<span class="verify">' + m + '</span>');
}
function diffHtml(a, b) {
  return Logic.diffWords(a, b).map((d) => d.type === 'eq' ? esc(d.t) : d.type === 'ins' ? '<ins>' + esc(d.t) + '</ins>' : '<del>' + esc(d.t) + '</del>').join('');
}
