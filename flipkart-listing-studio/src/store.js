/* ==========================================================================
   Store — artifact database when available, browser storage otherwise
   Layout (db):
     settings/app                      brands, HSN library, presets, categories
     meta/{id}                         listing card data for Saved Listings
     listings/{id}                     { v, data } or { v, chunks } when large
     listings/{id}/parts/p{n}          { s } JSON string chunks
     listings/{id}/images/{imgId}      { d: dataURL, w, h }
   ========================================================================== */
const Store = {
  mode: 'pending',
  db: null,
  q: {},
  chunks: {},
  mem: { settings: null, meta: {}, listings: {}, images: {} },

  async init() {
    let db = null;
    try {
      if (window.claude && typeof window.claude.use === 'function') db = await window.claude.use('db');
    } catch (e) { db = null; }
    if (db) {
      try { await db.doc('settings/app').get(); this.db = db; this.mode = 'db'; return this.mode; } catch (e) { /* fall back */ }
    }
    this.mode = this.lsProbe() ? 'local' : 'memory';
    return this.mode;
  },
  lsProbe() {
    try { localStorage.setItem('fls:probe', '1'); localStorage.removeItem('fls:probe'); return true; } catch (e) { return false; }
  },
  _write(path, data) {
    const prev = this.q[path] || Promise.resolve();
    const p = prev.catch(() => {}).then(() => this.db.doc(path).set(data));
    this.q[path] = p;
    return p;
  },
  _del(path) {
    const prev = this.q[path] || Promise.resolve();
    const p = prev.catch(() => {}).then(() => this.db.doc(path).delete());
    this.q[path] = p;
    return p;
  },

  /* settings */
  async loadSettings() {
    if (this.mode === 'db') { const s = await this.db.doc('settings/app').get(); return s.exists ? clone(s.data()) : null; }
    if (this.mode === 'local') { const r = lsGet('fls:settings'); return r ? JSON.parse(r) : null; }
    return clone(this.mem.settings);
  },
  async saveSettings(s) {
    const data = JSON.parse(JSON.stringify(s));
    if (this.mode === 'db') return this._write('settings/app', data);
    if (this.mode === 'local') { if (!lsSet('fls:settings', JSON.stringify(data))) throw { code: 'quota_exceeded' }; return; }
    this.mem.settings = data;
  },

  /* listing index */
  async listMeta() {
    if (this.mode === 'db') {
      const qs = await this.db.collection('meta').limit(1000).get();
      return qs.docs.map((d) => Object.assign({}, d.data(), { id: d.id }));
    }
    if (this.mode === 'local') {
      const idx = JSON.parse(lsGet('fls:index') || '{}');
      return Object.keys(idx).map((id) => Object.assign({}, idx[id], { id }));
    }
    return Object.keys(this.mem.meta).map((id) => Object.assign({}, this.mem.meta[id], { id }));
  },

  /* listings */
  async saveListing(listing, meta) {
    const json = JSON.stringify(listing);
    const id = listing.id;
    if (this.mode === 'db') {
      const bytes = new TextEncoder().encode(json).length;
      const prev = this.chunks[id] || 0;
      if (bytes <= 200 * 1024) {
        await this._write('listings/' + id, { v: 1, data: JSON.parse(json) });
        for (let i = 0; i < prev; i++) this._del('listings/' + id + '/parts/p' + i);
        this.chunks[id] = 0;
      } else {
        const parts = [];
        for (let i = 0; i < json.length; i += 60000) parts.push(json.slice(i, i + 60000));
        for (let i = 0; i < parts.length; i++) await this._write('listings/' + id + '/parts/p' + i, { s: parts[i] });
        for (let i = parts.length; i < prev; i++) this._del('listings/' + id + '/parts/p' + i);
        await this._write('listings/' + id, { v: 1, chunks: parts.length });
        this.chunks[id] = parts.length;
      }
      await this._write('meta/' + id, meta);
      return;
    }
    if (this.mode === 'local') {
      if (!lsSet('fls:l:' + id, json)) throw { code: 'quota_exceeded' };
      const idx = JSON.parse(lsGet('fls:index') || '{}');
      idx[id] = meta;
      if (!lsSet('fls:index', JSON.stringify(idx))) throw { code: 'quota_exceeded' };
      return;
    }
    this.mem.listings[id] = json;
    this.mem.meta[id] = meta;
  },
  async loadListing(id) {
    if (this.mode === 'db') {
      const s = await this.db.doc('listings/' + id).get();
      if (!s.exists) return null;
      const d = s.data();
      if (d.data) { this.chunks[id] = 0; return clone(d.data); }
      if (d.chunks) {
        const parts = await Promise.all(Array.from({ length: d.chunks }, (_, i) => this.db.doc('listings/' + id + '/parts/p' + i).get()));
        this.chunks[id] = d.chunks;
        return JSON.parse(parts.map((p) => (p.exists ? p.data().s : '')).join(''));
      }
      return null;
    }
    if (this.mode === 'local') { const r = lsGet('fls:l:' + id); return r ? JSON.parse(r) : null; }
    return this.mem.listings[id] ? JSON.parse(this.mem.listings[id]) : null;
  },
  async deleteListing(id) {
    if (this.mode === 'db') {
      await this._del('meta/' + id);
      try {
        const s = await this.db.doc('listings/' + id).get();
        const n = s.exists && s.data().chunks ? s.data().chunks : 0;
        for (let i = 0; i < n; i++) this._del('listings/' + id + '/parts/p' + i);
        const imgs = await this.db.collection('listings/' + id + '/images').limit(1000).get();
        for (const d of imgs.docs) this._del('listings/' + id + '/images/' + d.id);
      } catch (e) { /* best effort */ }
      await this._del('listings/' + id);
      return;
    }
    if (this.mode === 'local') {
      try {
        localStorage.removeItem('fls:l:' + id);
        const idx = JSON.parse(lsGet('fls:index') || '{}'); delete idx[id]; lsSet('fls:index', JSON.stringify(idx));
        const kill = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fls:img:' + id + ':')) kill.push(k); }
        kill.forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
      return;
    }
    delete this.mem.listings[id]; delete this.mem.meta[id];
  },

  /* images */
  async saveImage(listingId, imgId, payload) {
    try {
      if (this.mode === 'db') { await this._write('listings/' + listingId + '/images/' + imgId, payload); return true; }
      if (this.mode === 'local') return lsSet('fls:img:' + listingId + ':' + imgId, JSON.stringify(payload));
    } catch (e) { return false; }
    return false;
  },
  async loadImage(listingId, imgId) {
    try {
      if (this.mode === 'db') { const s = await this.db.doc('listings/' + listingId + '/images/' + imgId).get(); return s.exists ? s.data() : null; }
      if (this.mode === 'local') { const r = lsGet('fls:img:' + listingId + ':' + imgId); return r ? JSON.parse(r) : null; }
    } catch (e) { return null; }
    return null;
  },
  async deleteImage(listingId, imgId) {
    try {
      if (this.mode === 'db') return this._del('listings/' + listingId + '/images/' + imgId);
      if (this.mode === 'local') localStorage.removeItem('fls:img:' + listingId + ':' + imgId);
    } catch (e) { /* ignore */ }
  }
};
