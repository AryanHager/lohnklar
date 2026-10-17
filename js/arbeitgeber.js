/* Lohnklar – Arbeitgeberbereich: Firmendaten, Mitarbeiter, Entgeltabrechnungen. Alles lokal (IndexedDB). */
(function () {
  'use strict';
  const S = window.Speicher, V = window.Validierung, A = window.Abrechnung, AUS = window.AbrechnungAusgabe, E = window.Eingabe, R = window.Rechner;
  const KASSEN = window.KRANKENKASSEN || [];
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('zeigen'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('zeigen'), 2600); };
  let firma = null, mitarbeiter = [];

  // ---------- Frage-Dialog (Bestätigungen) ----------
  function frage(titel, text, knoepfe) {
    return new Promise((resolve) => {
      const d = $('#dlgFrage'); $('#frageTitel').textContent = titel; $('#frageText').textContent = text;
      $('#frageKnoepfe').innerHTML = knoepfe.map(([w, t, cls]) => `<button value="${w}" class="btn ${cls || ''}">${esc(t)}</button>`).join('');
      d.returnValue = ''; d.showModal();
      d.addEventListener('close', () => resolve(d.returnValue), { once: true });
    });
  }

  // ---------- Bereichsumschalter im Profil-Tab ----------
  $('#profilBereich').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#profilBereich button').forEach(x => x.classList.toggle('aktiv', x === b));
    $('#bereich-profile').hidden = b.dataset.wert !== 'profile'; $('#bereich-arbeitgeber').hidden = b.dataset.wert !== 'arbeitgeber';
    if (b.dataset.wert === 'arbeitgeber') laden();
  });

  const monatOptionen = (sel) => { sel.innerHTML = A.MONATE.map((m, i) => `<option value="${i + 1}">${m}</option>`).join(''); sel.value = String(Math.min(12, new Date().getMonth() + 1)); };
  monatOptionen($('#sammelMonat')); monatOptionen($('#lzMonat'));

  async function laden() {
    $('#speicherArt').textContent = await S.art();
    firma = await S.firmaLaden(); mitarbeiter = await S.alleMitarbeiter();
    zeigeFirma(); zeigeListe();
  }

  // ---------- Firmendaten ----------
  function zeigeFirma() {
    const f = firma || {}, form = $('#firmaForm');
    for (const n of ['name', 'strasse', 'plz', 'ort', 'betriebsnummer']) form.elements[n].value = f[n] || '';
    $('#firmaKurz').textContent = f.name ? f.name : 'noch nicht angelegt';
    if (!f.name) $('#firmaKarte').open = true;
    zeigeLogo(f.logo);
  }
  function zeigeLogo(src) { $('#logoVorschau').hidden = !src; $('#logoEntfernen').hidden = !src; if (src) $('#logoVorschau').src = src; else $('#logoVorschau').removeAttribute('src'); }
  let logoNeu;
  $('#logoDatei').addEventListener('change', async (e) => {
    const datei = e.target.files[0]; if (!datei) return;
    if (datei.size > 5e6) return toast('Logo ist zu groß (max. 5 MB).');
    try { logoNeu = await bildVerkleinern(datei); zeigeLogo(logoNeu); } catch (err) { toast('Logo konnte nicht gelesen werden.'); }
  });
  $('#logoEntfernen').addEventListener('click', () => { logoNeu = null; $('#logoDatei').value = ''; zeigeLogo(null); });
  function bildVerkleinern(datei) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 600, s = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
          const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((img.naturalWidth || max) * s)); c.height = Math.max(1, Math.round((img.naturalHeight || 200) * s));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL('image/png'));
        };
        img.onerror = reject; img.src = fr.result;
      };
      fr.onerror = reject; fr.readAsDataURL(datei);
    });
  }
  $('#firmaSpeichern').addEventListener('click', async () => {
    const form = $('#firmaForm'), f = Object.assign({}, firma || {});
    for (const n of ['name', 'strasse', 'plz', 'ort', 'betriebsnummer']) f[n] = form.elements[n].value.trim();
    if (!f.name) { form.elements.name.classList.add('ungueltig'); return toast('Bitte einen Firmennamen eingeben.'); }
    form.elements.name.classList.remove('ungueltig');
    const bn = f.betriebsnummer ? V.pruefeBetriebsnummer(f.betriebsnummer) : { ok: true };
    feldStatus(form.elements.betriebsnummer, bn);
    if (!bn.ok) return toast('Bitte die Betriebsnummer prüfen.');
    if (bn.wert) f.betriebsnummer = bn.wert;
    if (logoNeu !== undefined) f.logo = logoNeu;
    await S.firmaSpeichern(f); firma = f; logoNeu = undefined; zeigeFirma(); $('#firmaKarte').open = false;
    S.persistentAnfordern(); toast('Firmendaten gespeichert');
  });
  function feldStatus(input, res, hinweise) {
    const box = input.closest('label').querySelector('.feldfehler');
    input.classList.toggle('ungueltig', !res.ok); input.classList.toggle('gueltig', res.ok && !!input.value.trim());
    if (box) box.textContent = !res.ok ? res.fehler : (hinweise && hinweise.length ? '⚠ ' + hinweise.join(' ') : '');
    if (box) box.className = !res.ok ? 'feldfehler' : (hinweise && hinweise.length ? 'feldhinweis feldfehler' : 'feldfehler');
  }

  // ---------- Mitarbeiterliste ----------
  const deDatum = (iso) => iso ? String(iso).split('-').reverse().join('.') : '';
  function zeigeListe() {
    const ul = $('#maliste');
    if (!mitarbeiter.length) { ul.innerHTML = '<li class="leer">Noch keine Mitarbeiter angelegt. Tippe auf „+ Mitarbeiter“.</li>'; return; }
    ul.innerHTML = mitarbeiter.map(m => {
      let info = '';
      try { const r = R.berechne(Object.assign(E.eingabeAus(A.werteFuer(m)), { einmalzahlung: 0 })); info = `Brutto ${eur(r.monat.brutto)} · Auszahlung ${eur(r.monat.auszahlung)}`; } catch (e) { }
      const ini = ((m.vorname || ' ')[0] + (m.name || ' ')[0]).toUpperCase();
      return `<li data-id="${esc(m.id)}"><div class="ma-kopf"><span class="avatar">${esc(ini)}</span><div class="ma-info"><strong>${esc(m.name)}, ${esc(m.vorname)}</strong>
        <small>${m.personalnummer ? 'Pers.-Nr. ' + esc(m.personalnummer) + ' · ' : ''}StKl ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][Number(m.werte.steuerklasse) || 1]} · ${esc(E.kassenName(m.werte))}</small><small>${info}</small>${m.austritt ? `<small class="ma-austritt">Austritt ${esc(deDatum(m.austritt))}</small>` : ''}</div></div>
        <div class="ma-aktionen"><button class="btn" data-aktion="abrechnung">Abrechnung</button><button class="btn sekundaer" data-aktion="bearbeiten">Bearbeiten</button><button class="btn gefahr" data-aktion="loeschen" aria-label="Löschen">Löschen</button></div></li>`;
    }).join('');
  }
  $('#maliste').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-aktion]'); if (!b) return;
    const m = mitarbeiter.find(x => x.id === b.closest('li').dataset.id); if (!m) return;
    if (b.dataset.aktion === 'bearbeiten') oeffneEditor(m);
    if (b.dataset.aktion === 'abrechnung') oeffneAbrechnung(m);
    if (b.dataset.aktion === 'loeschen') {
      const antwort = await frage('Mitarbeiter löschen?', `„${m.vorname} ${m.name}“ und alle gespeicherten Einmalzahlungen werden unwiderruflich von diesem Gerät gelöscht.`, [['nein', 'Abbrechen', 'sekundaer'], ['ja', 'Endgültig löschen', 'gefahr']]);
      if (antwort !== 'ja') return;
      await S.mitarbeiterLoeschen(m.id); mitarbeiter = await S.alleMitarbeiter(); zeigeListe(); toast('Mitarbeiter gelöscht');
    }
  });
  $('#maNeu').addEventListener('click', () => {
    if (!firma || !firma.name) toast('Tipp: Lege zuerst die Firmendaten an.');
    oeffneEditor(null);
  });

  // ---------- Mitarbeiter-Editor ----------
  const blOpt = R.BUNDESLAENDER.map(b => [b.code, b.name]);
  const kassenOpt = [['avg', 'Durchschnitt 2026 (2,90 %)'], ['eigen', 'Eigener Zusatzbeitrag']].concat(KASSEN.map((k, i) => [String(i), `${k.name} (${String(k.zusatz).replace('.', ',')} %)`]));
  const ja = (n, l, breit) => ({ n, l, typ: 'check', breit });
  const ABSCHNITTE = [
    { titel: 'Persönliche Daten', felder: [{ n: 'vorname', l: 'Vorname*', pflicht: 1 }, { n: 'name', l: 'Name*', pflicht: 1 }, { n: 'strasse', l: 'Straße und Hausnummer', breit: 1 }, { n: 'plz', l: 'PLZ', im: 'numeric' }, { n: 'ort', l: 'Ort' },
      { n: 'geburtsdatum', l: 'Geburtsdatum*', typ: 'date', pflicht: 1 }, { n: 'iban', l: 'IBAN', ph: 'DE.. .... .... .... .... ..', pruef: 'iban' }] },
    { titel: 'Beschäftigung', felder: [{ n: 'personalnummer', l: 'Personalnummer', breit: 1 }, { n: 'eintritt', l: 'Eintrittsdatum', typ: 'date' }, { n: 'austritt', l: 'Austrittsdatum (optional)', typ: 'date', pruef: 'austritt' },
      { n: 'teilmonatMethode', l: 'Teilmonat (Ein-/Austritt im Monat): Gehalt anteilig nach', typ: 'select', breit: 1, opts: [['30tage', '30-Tage-Methode: Gehalt / 30 × Kalendertage (Standard)'], ['kalendertage', 'Kalendertagen des Monats'], ['arbeitstage', 'Arbeitstagen Mo–Fr des Monats (ohne Feiertage)']] },
      { n: 'w.betrag', l: 'Bruttogehalt / Monat*', im: 'decimal', pflicht: 1 }, { n: 'pgs', l: 'Personengruppenschlüssel', ph: '101', im: 'numeric', pruef: 'pgs' },
      { n: 'bgs', l: 'Beitragsgruppenschlüssel', ph: '1111', im: 'numeric', pruef: 'bgs', knopf: 'Vorschlag' }] },
    { titel: 'Steuermerkmale', felder: [{ n: 'steuerid', l: 'Steuer-ID', im: 'numeric', ph: '11 Ziffern', pruef: 'steuerid' },
      { n: 'w.steuerklasse', l: 'Steuerklasse', typ: 'select', opts: [['1', 'I'], ['2', 'II'], ['3', 'III'], ['4', 'IV'], ['5', 'V'], ['6', 'VI']] }, { n: 'w.faktor', l: 'Faktor (nur IV)', im: 'decimal', ph: 'z. B. 0,912' },
      { n: 'w.kinderfreibetraege', l: 'Kinderfreibeträge', typ: 'select', opts: ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6'].map(x => [x, x.replace('.', ',')]) },
      { n: 'konfession', l: 'Konfession (Kirchensteuer)', typ: 'select', opts: Object.entries(A.KONFESSIONEN).map(([k, v]) => [k, k ? `${k} – ${v}` : '– keine (keine KiSt) –']) },
      { n: 'w.bundesland', l: 'Bundesland (Betriebsstätte)', typ: 'select', opts: blOpt }, { n: 'w.freibetrag', l: 'Steuerfreibetrag / Monat', im: 'decimal' }] },
    { titel: 'Sozialversicherung', felder: [{ n: 'svnr', l: 'Sozialversicherungsnummer', ph: '65 170839 J 00 3', pruef: 'svnr' },
      { n: 'w._kvArt', l: 'Krankenversicherung', typ: 'select', opts: [['gkv', 'gesetzlich (GKV)'], ['pkv', 'privat (PKV)']] },
      { n: 'w.kasse', l: 'Krankenkasse', typ: 'select', opts: kassenOpt, breit: 1, nur: 'gkv' }, { n: 'w.kvZusatz', l: 'Eigener Zusatzbeitrag %', im: 'decimal', nur: 'eigen' },
      { n: 'w.pkvKV', l: 'PKV-Beitrag Kranken / Monat', im: 'decimal', nur: 'pkv' }, { n: 'w.pkvPV', l: 'PKV-Beitrag Pflege / Monat', im: 'decimal', nur: 'pkv' },
      { n: 'w.kinder', l: 'Kinder (gesamt, für PV)', typ: 'number' }, { n: 'w.kinderU25', l: 'davon unter 25', typ: 'number' },
      ja('w.rvPflicht', 'Rentenversicherungspflichtig'), ja('w.avPflicht', 'Arbeitslosenversicherungspflichtig'), ja('w.minijobRvBefreit', 'Minijob: von RV-Pflicht befreit', 1)] },
    { titel: 'Dienstwagen & Dienstrad', felder: [ja('w.fw', 'Firmenwagen', 1), { n: 'w.fwListenpreis', l: 'Bruttolistenpreis', im: 'decimal', nur: 'fw' }, { n: 'w.fwKm', l: 'Entfernung (km)', typ: 'number', nur: 'fw' },
      { n: 'w.fwAntrieb', l: 'Antrieb', typ: 'select', opts: [['verbrenner', 'Verbrenner (1 %)'], ['hybrid', 'Plug-in-Hybrid (0,5 %)'], ['elektro', 'Elektro (0,25 %)']], nur: 'fw' }, { n: 'w.fwZuzahlung', l: 'Zuzahlung AN / Monat', im: 'decimal', nur: 'fw' },
      ja('w.rad', 'Firmenrad', 1), { n: 'w.radListenpreis', l: 'UVP Fahrrad', im: 'decimal', nur: 'rad' }, { n: 'w.radModus', l: 'Überlassung', typ: 'select', opts: [['zusaetzlich', 'zusätzlich (steuerfrei)'], ['umwandlung', 'Gehaltsumwandlung (0,25 %)']], nur: 'rad' },
      { n: 'w.radLeasing', l: 'Leasingrate / Monat', im: 'decimal', nur: 'radumw' }],
      hinweis: 'Bei Ein- oder Austritt im Laufe des Monats wird der geldwerte Vorteil für Firmenwagen und Firmenrad nicht gekürzt: Der Monatswert gilt, sobald das Fahrzeug an mindestens einem Tag im Monat zur Verfügung stand (R 8.1 Abs. 9 Nr. 1 Satz 4 LStR).' },
    { titel: 'Vorsorge & Zusatzleistungen', hinweis: 'Im Teilmonat werden Gehalt, VWL-AG-Anteil und bAV anteilig berechnet; Sachbezüge, steuerfreie Bezüge und die VWL-Sparrate bleiben ungekürzt.', felder: [{ n: 'w.bavAN', l: 'bAV Entgeltumwandlung / Monat', im: 'decimal' }, { n: 'w.bavAG', l: 'bAV AG-Zuschuss / Monat', im: 'decimal' },
      { n: 'w.vwlAG', l: 'VWL AG-Anteil / Monat', im: 'decimal' }, { n: 'w.vwlSpar', l: 'VWL Sparrate / Monat', im: 'decimal' },
      { n: 'w.gwv', l: 'Sonstiger geldwerter Vorteil / Monat', im: 'decimal' }, { n: 'w.steuerfrei', l: 'Steuerfreie Bezüge / Monat', im: 'decimal' }] }
  ];
  function feldHtml(f) {
    const id = 'ma_' + f.n.replace('.', '_');
    const attr = `name="${f.n}" id="${id}"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}${f.im ? ` inputmode="${f.im}"` : ''}`;
    const cls = `${f.breit ? 'breit' : ''}${f.nur ? ' nur-' + f.nur : ''}`;
    if (f.typ === 'check') return `<label class="schalter ${cls}"><input type="checkbox" ${attr}> <span>${esc(f.l)}</span></label>`;
    let input;
    if (f.typ === 'select') input = `<select ${attr}>${f.opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>`;
    else input = `<input type="${f.typ === 'date' ? 'date' : f.typ === 'number' ? 'number' : 'text'}" ${attr}${f.typ === 'number' ? ' min="0" max="20"' : ''}>`;
    if (f.knopf) input = `<div class="mitknopf">${input}<button type="button" class="btn sekundaer" data-vorschlag="${f.n}">${esc(f.knopf)}</button></div>`;
    return `<label class="${cls}">${esc(f.l)}${input}<small class="feldfehler"></small></label>`;
  }
  $('#maForm').innerHTML = ABSCHNITTE.map(a => `<div class="karte"><h3>${esc(a.titel)}</h3><div class="raster">${a.felder.map(feldHtml).join('')}</div>${a.hinweis ? `<p class="hinweis">${esc(a.hinweis)}</p>` : ''}</div>`).join('') +
    '<p class="hinweis">* Pflichtfeld. Prüfziffern von Steuer-ID, SV-Nummer und IBAN werden lokal geprüft. Alle Daten bleiben auf diesem Gerät.</p><button type="button" class="btn breit" id="maSpeichern2">Mitarbeiter speichern</button>';
  const alleFelder = ABSCHNITTE.flatMap(a => a.felder);
  const STANDARD = { 'w.steuerklasse': '1', 'w.kinderfreibetraege': '0', konfession: '', 'w.bundesland': 'NW', 'w._kvArt': 'gkv', 'w.kasse': 'avg', 'w.kinder': '0', 'w.kinderU25': '0', 'w.rvPflicht': true, 'w.avPflicht': true, 'w.fwAntrieb': 'verbrenner', 'w.radModus': 'zusaetzlich', pgs: '101', teilmonatMethode: '30tage' };
  let aktuell = null;
  function wert(m, n) { if (n.startsWith('w.')) return (m.werte || {})[n.slice(2)]; return m[n]; }
  function oeffneEditor(m) {
    aktuell = m;
    $('#maEditorTitel').textContent = m ? `${m.vorname} ${m.name}` : 'Neuer Mitarbeiter';
    const form = $('#maForm');
    for (const f of alleFelder) {
      const el = form.elements[f.n]; let v = m ? wert(m, f.n) : undefined; if (v === undefined) v = STANDARD[f.n] ?? '';
      if (f.typ === 'check') el.checked = !!v; else el.value = v ?? '';
      el.classList.remove('ungueltig', 'gueltig'); const box = el.closest('label').querySelector('.feldfehler'); if (box) box.textContent = '';
    }
    if (!m && firma && firma.betriebsnummer) { /* nichts */ }
    sichtbarkeit(); oeffne('#maEditor'); form.parentElement.scrollTop = 0; $('#maForm').scrollTop = 0;
    if (m) alleFelder.filter(f => f.pruef).forEach(f => pruefeFeld(f.n));
  }
  function sichtbarkeit() {
    const f = $('#maForm').elements, kv = f['w._kvArt'].value;
    $$('.nur-gkv', $('#maForm')).forEach(x => x.hidden = kv !== 'gkv');
    $$('.nur-pkv', $('#maForm')).forEach(x => x.hidden = kv !== 'pkv');
    $$('.nur-eigen', $('#maForm')).forEach(x => x.hidden = kv !== 'gkv' || f['w.kasse'].value !== 'eigen');
    $$('.nur-fw', $('#maForm')).forEach(x => x.hidden = !f['w.fw'].checked);
    $$('.nur-rad', $('#maForm')).forEach(x => x.hidden = !f['w.rad'].checked);
    $$('.nur-radumw', $('#maForm')).forEach(x => x.hidden = !f['w.rad'].checked || f['w.radModus'].value !== 'umwandlung');
    f['w.faktor'].closest('label').hidden = f['w.steuerklasse'].value !== '4';
  }
  function pruefeFeld(n) {
    const f = $('#maForm').elements, el = f[n], v = el.value.trim();
    if (!v) { feldStatus(el, { ok: true }); return { ok: true }; }
    let res;
    if (n === 'steuerid') res = V.pruefeSteuerId(v);
    else if (n === 'svnr') res = V.pruefeSvNummer(v, f.geburtsdatum.value, f.name.value);
    else if (n === 'iban') res = V.pruefeIban(v);
    else if (n === 'bgs') res = V.pruefeBeitragsgruppe(v);
    else if (n === 'pgs') res = V.pruefePersonengruppe(v);
    else if (n === 'austritt') res = V.pruefeAustritt(f.eintritt.value, v);
    feldStatus(el, res, res.hinweise || (res.bezeichnung ? [res.bezeichnung] : []));
    if (n === 'pgs' && res.ok) { const box = el.closest('label').querySelector('.feldfehler'); box.textContent = res.bezeichnung; box.className = 'feldfehler hinweis'; }
    return res;
  }
  $('#maForm').addEventListener('change', (e) => { sichtbarkeit(); const f = alleFelder.find(x => x.n === e.target.name); if (f && f.pruef) pruefeFeld(f.n); if (e.target.name === 'geburtsdatum' || e.target.name === 'name') pruefeFeld('svnr'); if (e.target.name === 'eintritt') pruefeFeld('austritt'); });
  $('#maForm').addEventListener('input', (e) => { if (e.target.classList.contains('ungueltig')) { const f = alleFelder.find(x => x.n === e.target.name); if (f && f.pruef) pruefeFeld(f.n); } });
  $('#maForm').addEventListener('click', (e) => {
    const b = e.target.closest('[data-vorschlag]'); if (!b) return;
    const f = $('#maForm').elements;
    const brutto = E.zahl(f['w.betrag'].value);
    f.bgs.value = V.vorschlagBeitragsgruppe({ kvArt: f['w._kvArt'].value, rvPflicht: f['w.rvPflicht'].checked, avPflicht: f['w.avPflicht'].checked, minijobRvBefreit: f['w.minijobRvBefreit'].checked, minijob: brutto > 0 && brutto <= R.WERTE.MINI });
    if (brutto > 0 && brutto <= R.WERTE.MINI && f.pgs.value === '101') f.pgs.value = '109';
    pruefeFeld('bgs'); pruefeFeld('pgs');
  });
  async function editorSpeichern() {
    const f = $('#maForm').elements, m = aktuell ? JSON.parse(JSON.stringify(aktuell)) : { einmalzahlungen: [] };
    m.werte = m.werte || {};
    let fehler = 0;
    for (const d of alleFelder) {
      const el = f[d.n], v = d.typ === 'check' ? el.checked : el.value.trim();
      if (d.pflicht && !v) { el.classList.add('ungueltig'); el.closest('label').querySelector('.feldfehler').textContent = 'Pflichtfeld'; fehler++; }
      if (d.pruef && v && !pruefeFeld(d.n).ok) fehler++;
      if (d.n.startsWith('w.')) m.werte[d.n.slice(2)] = v; else m[d.n] = v;
    }
    if (E.zahl(m.werte.betrag) <= 0 && f['w.betrag'].value) { f['w.betrag'].classList.add('ungueltig'); fehler++; }
    if (fehler) { toast('Bitte die markierten Felder prüfen.'); const erstes = $('#maForm .ungueltig'); if (erstes) erstes.scrollIntoView({ block: 'center' }); return; }
    // Normalisieren
    if (m.steuerid) m.steuerid = V.pruefeSteuerId(m.steuerid).wert;
    if (m.svnr) m.svnr = V.pruefeSvNummer(m.svnr).wert;
    if (m.iban) m.iban = V.pruefeIban(m.iban).wert;
    m.werte._modus = 'b2n'; m.werte._zeitraum = 'monat';
    await S.mitarbeiterSpeichern(m); mitarbeiter = await S.alleMitarbeiter(); zeigeListe(); schliesse('#maEditor');
    S.persistentAnfordern(); toast(`${m.vorname} ${m.name} gespeichert`);
  }
  $('#maSpeichern').addEventListener('click', editorSpeichern);
  $('#maForm').addEventListener('click', (e) => { if (e.target.id === 'maSpeichern2') editorSpeichern(); });

  // ---------- Vollbild-Ansichten ----------
  function oeffne(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; history.pushState({ ansicht: sel }, ''); }
  function schliesse(sel) { if ($(sel).hidden) return; $(sel).hidden = true; if (!$$('.vollbild').some(x => !x.hidden)) document.body.style.overflow = ''; if (history.state && history.state.ansicht === sel) history.back(); }
  $$('[data-schliessen]').forEach(b => b.addEventListener('click', () => schliesse('#' + b.closest('.vollbild').id)));
  window.addEventListener('popstate', () => { $$('.vollbild').forEach(x => x.hidden = true); document.body.style.overflow = ''; });

  // ---------- Entgeltabrechnung ----------
  let lzMa = null, lzAktuell = null;
  const VORTRAG = [['gesamtBrutto', 'Gesamtbrutto'], ['steuerBrutto', 'Steuer-Brutto'], ['svKV', 'SV-Brutto KV/PV'], ['svRV', 'SV-Brutto RV/AV'], ['lst', 'Lohnsteuer'], ['soli', 'Soli'], ['kist', 'Kirchensteuer'],
    ['kv', 'KV'], ['pv', 'PV'], ['rv', 'RV'], ['av', 'AV'], ['netto', 'Netto'], ['auszahlung', 'Auszahlung']];
  $('#lzVortrag').innerHTML = '<p class="hinweis breit">Summen Januar bis Vormonat (z. B. bei unterjährigen Gehaltsänderungen). Leere Felder werden berechnet.</p>' +
    VORTRAG.map(([k, t]) => `<label>${t}<input data-vortrag="${k}" inputmode="decimal" placeholder="berechnet"></label>`).join('');
  function oeffneAbrechnung(m) {
    lzMa = JSON.parse(JSON.stringify(m)); lzMa.einmalzahlungen = lzMa.einmalzahlungen || [];
    $('#lzMethode').value = '';
    $('#lzMethode').options[0].textContent = `wie Stammdaten (${A.METHODEN[m.teilmonatMethode] || A.METHODEN['30tage']})`;
    // Abrechnungsmonat in den Beschäftigungszeitraum legen
    const b = A.beschaeftigung(m, Number($('#lzJahr').value), Number($('#lzMonat').value));
    if (b.status === 'vor' && b.eintritt.j === Number($('#lzJahr').value)) $('#lzMonat').value = String(b.eintritt.m);
    if (b.status === 'nach' && b.austritt.j === Number($('#lzJahr').value)) $('#lzMonat').value = String(b.austritt.m);
    $('#lzTitel').textContent = `Abrechnung ${m.vorname} ${m.name}`;
    $('#lzVortragAn').checked = false; $('#lzVortrag').hidden = true; $$('#lzVortrag input').forEach(i => i.value = '');
    oeffne('#lzAnsicht'); zeigeEinmal(); aktualisiereAbrechnung();
  }
  const mk = () => `${$('#lzJahr').value}-${String($('#lzMonat').value).padStart(2, '0')}`;
  function zeigeEinmal() {
    const key = mk(), liste = lzMa.einmalzahlungen.filter(x => x.monat === key);
    $('#lzEinmal').innerHTML = liste.length ? liste.map((x) => `<div class="ez-zeile" data-i="${lzMa.einmalzahlungen.indexOf(x)}"><input data-feld="bezeichnung" value="${esc(x.bezeichnung)}" aria-label="Bezeichnung"><input data-feld="betrag" inputmode="decimal" value="${esc(x.betrag)}" aria-label="Betrag"><button type="button" data-entf aria-label="Entfernen">✕</button></div>`).join('') : '<p class="hinweis">Keine Einmalzahlung in diesem Monat.</p>';
    const andere = lzMa.einmalzahlungen.filter(x => x.monat !== key && x.monat.startsWith($('#lzJahr').value) && E.zahl(x.betrag) > 0);
    $('#lzEinmalInfo').textContent = andere.length ? 'Weitere gespeicherte Einmalzahlungen im Jahr: ' + andere.map(x => `${A.MONATE[Number(x.monat.slice(5)) - 1]}: ${x.bezeichnung} ${eur(E.zahl(x.betrag))}`).join(' · ') + ' (fließen in Lohnsteuer und Jahressummen ein).' : '';
  }
  async function einmalSpeichern() {
    const orig = mitarbeiter.find(x => x.id === lzMa.id); if (!orig) return;
    orig.einmalzahlungen = lzMa.einmalzahlungen.filter(x => x.bezeichnung || E.zahl(x.betrag));
    await S.mitarbeiterSpeichern(orig);
  }
  $('#lzEinmal').addEventListener('input', (e) => {
    const z = e.target.closest('.ez-zeile'); if (!z) return;
    lzMa.einmalzahlungen[Number(z.dataset.i)][e.target.dataset.feld] = e.target.value; aktualisiereAbrechnung(); einmalSpeichern();
  });
  $('#lzEinmal').addEventListener('click', (e) => {
    if (!e.target.matches('[data-entf]')) return; lzMa.einmalzahlungen.splice(Number(e.target.closest('.ez-zeile').dataset.i), 1); zeigeEinmal(); aktualisiereAbrechnung(); einmalSpeichern();
  });
  $('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ez]'); if (!b) return;
    const vorschlag = b.dataset.ez === '13. Monatsgehalt' || b.dataset.ez === 'Weihnachtsgeld' ? String(E.zahl(lzMa.werte.betrag)).replace('.', ',') : '';
    lzMa.einmalzahlungen.push({ monat: mk(), bezeichnung: b.dataset.ez, betrag: vorschlag }); zeigeEinmal(); aktualisiereAbrechnung(); einmalSpeichern();
    const inputs = $$('#lzEinmal input[data-feld=betrag]'); if (inputs.length) inputs[inputs.length - 1].focus();
  });
  $('#lzMonat').addEventListener('change', () => { zeigeEinmal(); aktualisiereAbrechnung(); });
  $('#lzMethode').addEventListener('change', aktualisiereAbrechnung);
  $('#lzVortragAn').addEventListener('change', () => { $('#lzVortrag').hidden = !$('#lzVortragAn').checked; aktualisiereAbrechnung(); });
  $('#lzVortrag').addEventListener('input', aktualisiereAbrechnung);
  function vortrag() {
    if (!$('#lzVortragAn').checked) return null;
    const v = {}; $$('#lzVortrag input').forEach(i => { if (i.value.trim()) v[i.dataset.vortrag] = i.value; });
    return Object.keys(v).length ? v : null;
  }
  function aktualisiereAbrechnung() {
    $('#lzFehler').textContent = '';
    try {
      lzAktuell = A.erstelleAbrechnung(firma || {}, lzMa, $('#lzJahr').value, $('#lzMonat').value, { vortrag: vortrag(), methode: $('#lzMethode').value || undefined });
      $('#lzVorschau').innerHTML = AUS.html(lzAktuell);
      $('#lzTeilInfo').textContent = lzAktuell.teilmonat ? lzAktuell.teilmonat.text : 'Voller Monat beschäftigt – keine anteilige Berechnung.';
    } catch (err) {
      lzAktuell = null; $('#lzTeilInfo').textContent = '';
      $('#lzVorschau').innerHTML = `<div class="karte lz-keine"><strong>Keine Abrechnung für diesen Monat</strong><p>${esc(err.message.replace(/^Keine Abrechnung: /, ''))}</p></div>`;
    }
    ['#lzDrucken', '#lzPdf', '#lzTeilen'].forEach(sel => { $(sel).disabled = !lzAktuell; });
  }
  function drucken(liste) {
    $('#druckbereich').innerHTML = liste.map(AUS.html).join('');
    const titel = document.title; document.title = AUS.dateiname(liste).replace('.pdf', '');
    setTimeout(() => { window.print(); document.title = titel; }, 50);
  }
  function pdfBlob(liste) { return AUS.pdf(liste).output('blob'); }
  function herunterladen(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function teilen(liste) {
    const name = AUS.dateiname(liste), blob = pdfBlob(liste);
    const datei = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) {
      try { await navigator.share({ files: [datei], title: name.replace('.pdf', '').replace(/_/g, ' '), text: `Entgeltabrechnung ${liste[0].monatName} ${liste[0].jahr}` }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    herunterladen(blob, name); toast('Teilen wird hier nicht unterstützt – PDF wurde heruntergeladen.');
  }
  $('#lzDrucken').addEventListener('click', () => lzAktuell && drucken([lzAktuell]));
  $('#lzPdf').addEventListener('click', () => { if (!lzAktuell) return; herunterladen(pdfBlob([lzAktuell]), AUS.dateiname([lzAktuell])); toast('PDF gespeichert'); });
  $('#lzTeilen').addEventListener('click', () => lzAktuell && teilen([lzAktuell]));

  // ---------- Sammelabrechnung ----------
  function sammel() {
    if (!mitarbeiter.length) { toast('Keine Mitarbeiter vorhanden.'); return null; }
    const liste = [], fehler = [];
    let nichtBeschaeftigt = 0;
    for (const m of mitarbeiter) {
      const b = A.beschaeftigung(m, Number($('#sammelJahr').value), Number($('#sammelMonat').value));
      if (b.status === 'vor' || b.status === 'nach') { nichtBeschaeftigt++; continue; }
      try { liste.push(A.erstelleAbrechnung(firma || {}, m, $('#sammelJahr').value, $('#sammelMonat').value)); } catch (e) { fehler.push(`${m.vorname} ${m.name}: ${e.message}`); }
    }
    if (fehler.length) toast(`${fehler.length} übersprungen: ${fehler[0]}`);
    else if (nichtBeschaeftigt) toast(`${nichtBeschaeftigt} Mitarbeiter in diesem Monat nicht beschäftigt – ohne Abrechnung.`);
    return liste.length ? liste : null;
  }
  $('#sammelPdf').addEventListener('click', () => { const l = sammel(); if (!l) return; herunterladen(pdfBlob(l), AUS.dateiname(l)); toast(`${l.length} Abrechnungen als PDF gespeichert`); });
  $('#sammelTeilen').addEventListener('click', () => { const l = sammel(); if (l) teilen(l); });
  $('#sammelDruck').addEventListener('click', () => { const l = sammel(); if (l) drucken(l); });

  // ---------- Datensicherung ----------
  $('#backupExport').addEventListener('click', async () => {
    const daten = await S.exportieren();
    herunterladen(new Blob([JSON.stringify(daten, null, 1)], { type: 'application/json' }), `Lohnklar-Sicherung_${new Date().toLocaleDateString('sv-SE')}.json`);
    toast('Sicherung exportiert – bitte sicher aufbewahren');
  });
  $('#backupImport').addEventListener('change', async (e) => {
    const datei = e.target.files[0]; e.target.value = ''; if (!datei) return;
    let daten; try { daten = JSON.parse(await datei.text()); } catch (err) { return toast('Datei ist kein gültiges JSON.'); }
    if (!daten || daten.format !== 'lohnklar-arbeitgeber-backup') return toast('Keine gültige Lohnklar-Sicherungsdatei.');
    const antwort = await frage('Sicherung importieren', `Die Datei enthält ${daten.mitarbeiter.length} Mitarbeiter${daten.firma ? ' und Firmendaten' : ''} (Stand ${new Date(daten.exportiert).toLocaleString('de-DE')}). Wie soll importiert werden?`,
      [['abbrechen', 'Abbrechen', 'sekundaer'], ['zusammenfuehren', 'Hinzufügen'], ['ersetzen', 'Alles ersetzen', 'gefahr']]);
    if (antwort !== 'ersetzen' && antwort !== 'zusammenfuehren') return;
    try { const n = await S.importieren(daten, antwort); await laden(); toast(`${n} Mitarbeiter importiert`); } catch (err) { toast(err.message); }
  });

  window.LohnklarArbeitgeber = { laden, oeffneEditor, oeffneAbrechnung };
})();
