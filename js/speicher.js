/*
 * Lokale Speicherung für den Arbeitgeberbereich – ausschließlich auf dem Gerät.
 * IndexedDB (Datenbank "lohnklar", Stores "firma" und "mitarbeiter"); Fallback localStorage.
 * Backup: JSON-Export/-Import.
 */
(function (root) {
  'use strict';
  const DB_NAME = 'lohnklar', DB_VERSION = 1, LS_FALLBACK = 'lohnklar.arbeitgeber';
  let dbPromise = null;
  function oeffnen() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!root.indexedDB) return resolve(null);
      let req;
      try { req = root.indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return resolve(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('firma')) db.createObjectStore('firma');
        if (!db.objectStoreNames.contains('mitarbeiter')) db.createObjectStore('mitarbeiter', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbPromise;
  }
  const lsLesen = () => { try { return JSON.parse(localStorage.getItem(LS_FALLBACK)) || { firma: null, mitarbeiter: [] }; } catch (e) { return { firma: null, mitarbeiter: [] }; } };
  const lsSchreiben = (d) => localStorage.setItem(LS_FALLBACK, JSON.stringify(d));
  function tx(db, store, modus, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, modus), s = t.objectStore(store); let ergebnis;
      const r = fn(s); if (r) r.onsuccess = () => { ergebnis = r.result; };
      t.oncomplete = () => resolve(ergebnis); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
    });
  }
  const api = {
    async art() { return (await oeffnen()) ? 'IndexedDB' : 'localStorage'; },
    async firmaLaden() { const db = await oeffnen(); if (!db) return lsLesen().firma; return (await tx(db, 'firma', 'readonly', s => s.get('firma'))) || null; },
    async firmaSpeichern(f) { const db = await oeffnen(); if (!db) { const d = lsLesen(); d.firma = f; return lsSchreiben(d); } await tx(db, 'firma', 'readwrite', s => s.put(f, 'firma')); },
    async alleMitarbeiter() {
      const db = await oeffnen(); const liste = db ? (await tx(db, 'mitarbeiter', 'readonly', s => s.getAll())) || [] : lsLesen().mitarbeiter;
      return liste.sort((a, b) => (a.name + a.vorname).localeCompare(b.name + b.vorname, 'de'));
    },
    async mitarbeiterSpeichern(m) {
      if (!m.id) m.id = 'ma-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      m.geaendert = new Date().toISOString();
      const db = await oeffnen();
      if (!db) { const d = lsLesen(); d.mitarbeiter = d.mitarbeiter.filter(x => x.id !== m.id).concat([m]); lsSchreiben(d); return m; }
      await tx(db, 'mitarbeiter', 'readwrite', s => s.put(m)); return m;
    },
    async mitarbeiterLoeschen(id) {
      const db = await oeffnen();
      if (!db) { const d = lsLesen(); d.mitarbeiter = d.mitarbeiter.filter(x => x.id !== id); return lsSchreiben(d); }
      await tx(db, 'mitarbeiter', 'readwrite', s => s.delete(id));
    },
    async exportieren() {
      return { app: 'Lohnklar', format: 'lohnklar-arbeitgeber-backup', version: 1, exportiert: new Date().toISOString(), firma: await api.firmaLaden(), mitarbeiter: await api.alleMitarbeiter() };
    },
    /** modus: 'ersetzen' | 'zusammenfuehren' */
    async importieren(daten, modus = 'ersetzen') {
      if (!daten || daten.format !== 'lohnklar-arbeitgeber-backup' || !Array.isArray(daten.mitarbeiter)) throw new Error('Keine gültige Lohnklar-Sicherungsdatei.');
      if (modus === 'ersetzen') { for (const m of await api.alleMitarbeiter()) await api.mitarbeiterLoeschen(m.id); }
      if (daten.firma && (modus === 'ersetzen' || !(await api.firmaLaden()))) await api.firmaSpeichern(daten.firma);
      for (const m of daten.mitarbeiter) await api.mitarbeiterSpeichern(Object.assign({}, m));
      return daten.mitarbeiter.length;
    },
    async persistentAnfordern() { try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch (e) { return false; } }
  };
  root.Speicher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
