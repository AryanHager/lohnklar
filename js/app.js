/* Lohnklar – Oberfläche. Keine Netzwerkzugriffe; Speicherung nur in localStorage. */
(function () {
  'use strict';
  const R = window.Rechner, KASSEN = window.KRANKENKASSEN || [];
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const form = $('#form');
  const LS_PROFILE = 'lohnklar.profile', LS_ZULETZT = 'lohnklar.zuletzt', LS_SZEN = 'lohnklar.szenarien';
  const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const fmtZahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
  const eur = (n) => fmt.format(n || 0);

  const zahl = window.Eingabe.zahl, eingabeAus = window.Eingabe.eingabeAus;
  const lesen = (k) => localStorage.getItem(k) ? JSON.parse(localStorage.getItem(k)) : null;
  const schreiben = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('zeigen'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('zeigen'), 2200); }

  // ---------- Auswahllisten ----------
  $('#bundesland').innerHTML = R.BUNDESLAENDER.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
  $('#bundesland').value = 'NW';
  const gruppe = (titel, liste) => `<optgroup label="${titel}">` + liste.map(k => `<option value="${KASSEN.indexOf(k)}">${k.name} (${fmtZahl.format(k.zusatz)} %)</option>`).join('') + '</optgroup>';
  $('#kasse').innerHTML = `<option value="avg">Durchschnitt 2026 (2,90 %)</option><option value="eigen">Eigener Zusatzbeitrag</option>` +
    gruppe('Bundesweit geöffnet', KASSEN.filter(k => k.offen === 'bundesweit')) +
    gruppe('Regional geöffnet', KASSEN.filter(k => k.offen === 'regional')) +
    gruppe('Nur für Beschäftigte (betriebsbezogen)', KASSEN.filter(k => k.offen !== 'bundesweit' && k.offen !== 'regional'));

  // ---------- Segment-Schalter ----------
  const zustand = { modus: 'b2n', zeitraum: 'monat', kvArt: 'gkv', vglZeitraum: 'monat' };
  function segment(id, key, cb) {
    const el = $('#' + id);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      zustand[key] = b.dataset.wert; setzeSegment(id, b.dataset.wert); cb && cb();
    });
  }
  function setzeSegment(id, wert) { $$('#' + id + ' button').forEach(x => x.classList.toggle('aktiv', x.dataset.wert === wert)); }
  segment('modus', 'modus', aktualisieren); segment('zeitraum', 'zeitraum', aktualisieren); segment('kvArt', 'kvArt', aktualisieren);
  segment('vglZeitraum', 'vglZeitraum', zeigeVergleich);

  // ---------- Tabs ----------
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('aktiv', x === b));
    $$('.tab').forEach(t => t.classList.toggle('aktiv', t.id === 'tab-' + b.dataset.tab));
    if (b.dataset.tab === 'vergleich') zeigeVergleich();
    if (b.dataset.tab === 'profile') zeigeProfile();
  }));

  // ---------- Formularzustand ----------
  function formWerte() {
    const o = { _modus: zustand.modus, _zeitraum: zustand.zeitraum, _kvArt: zustand.kvArt, betrag: $('#betrag').value };
    for (const el of form.elements) { if (!el.name || el.name === 'betrag') continue; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }
    return o;
  }
  function setzeFormWerte(o) {
    if (!o) return;
    zustand.modus = o._modus || 'b2n'; zustand.zeitraum = o._zeitraum || 'monat'; zustand.kvArt = o._kvArt || 'gkv';
    setzeSegment('modus', zustand.modus); setzeSegment('zeitraum', zustand.zeitraum); setzeSegment('kvArt', zustand.kvArt);
    $('#betrag').value = o.betrag ?? '';
    for (const el of form.elements) { if (!el.name || !(el.name in o) || el.name === 'betrag') continue; if (el.type === 'checkbox') el.checked = !!o[el.name]; else el.value = o[el.name]; }
  }

  /** Berechnung inkl. Wunschnetto-Modus */
  function rechne(w) {
    const e = eingabeAus(w);
    if (w._modus === 'n2b') { const r = R.bruttoAusNetto(e.brutto, e); return r.ergebnis; }
    return R.berechne(e);
  }

  // ---------- Darstellung ----------
  const FARBEN = { lst: 'var(--c-lst)', soli: 'var(--c-soli)', kist: 'var(--c-kist)', kv: 'var(--c-kv)', pv: 'var(--c-pv)', rv: 'var(--c-rv)', av: 'var(--c-av)', netto: 'var(--c-netto)' };
  const NAMEN = { lst: 'Lohnsteuer', soli: 'Solidaritätszuschlag', kist: 'Kirchensteuer', kv: 'Krankenversicherung', pv: 'Pflegeversicherung', rv: 'Rentenversicherung', av: 'Arbeitslosenversicherung' };
  function zeile(text, m, j, cls = '', farbe) {
    return `<tr class="${cls}"><td>${farbe ? `<span class="punkt" style="background:${farbe}"></span>` : ''}${text}</td><td>${m === null ? '' : eur(m)}</td><td>${j === null ? '' : eur(j)}</td></tr>`;
  }
  function render(r, w) {
    const m = r.monat, j = r.jahr, p = r.eingabe;
    const jahrAnsicht = w._zeitraum === 'jahr';
    $('#lblErgebnis').textContent = w._modus === 'n2b' ? (jahrAnsicht ? 'Benötigtes Bruttogehalt pro Jahr' : 'Benötigtes Bruttogehalt pro Monat') : (jahrAnsicht ? 'Auszahlung pro Jahr' : 'Auszahlung pro Monat');
    if (w._modus === 'n2b') {
      $('#hauptwert').textContent = eur(jahrAnsicht ? m.brutto * 12 : m.brutto);
      $('#nebenwert').textContent = `ergibt ${eur(jahrAnsicht ? m.auszahlung * 12 : m.auszahlung)} Auszahlung (ohne Einmalzahlungen)`;
    } else {
      $('#hauptwert').textContent = eur(jahrAnsicht ? j.auszahlung : m.auszahlung);
      $('#nebenwert').textContent = jahrAnsicht ? `≈ ${eur(j.auszahlung / 12)} im Monatsdurchschnitt` : `${eur(j.auszahlung)} im Jahr${r.einmal.brutto ? ' inkl. Einmalzahlungen' : ''}`;
    }
    $('#artBadge').textContent = r.art === 'regulär' ? `StKl ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][p.steuerklasse]}${p.steuerklasse === 4 && p.faktor < 1 ? ' + Faktor' : ''}` : r.art;

    // Balken (Monat)
    const teile = ['netto', 'lst', 'soli', 'kist', 'kv', 'pv', 'rv', 'av'].map(k => [k, Math.max(0, k === 'netto' ? m.netto : m[k])]).filter(([, v]) => v > 0);
    const summe = teile.reduce((a, [, v]) => a + v, 0) || 1;
    $('#balken').innerHTML = teile.map(([k, v]) => `<span style="width:${(v / summe * 100).toFixed(2)}%;background:${FARBEN[k]}"></span>`).join('');
    $('#legende').innerHTML = teile.map(([k, v]) => `<li><i style="background:${FARBEN[k]}"></i>${k === 'netto' ? 'Netto' : NAMEN[k].replace('versicherung', 'v.').replace('Solidaritätszuschlag', 'Soli')} ${(v / summe * 100).toFixed(1).replace('.', ',')} %</li>`).join('');

    let h = zeile('Bruttogehalt', m.brutto, p.brutto * 12);
    if (m.vwlAG) h += zeile('+ VWL-Arbeitgeberanteil', m.vwlAG, j.vwlAG);
    if (m.fwVorteil) h += zeile(`+ Geldwerter Vorteil Firmenwagen (${String(r.firmenwagenAnteil).replace('.', ',')}-%-Regel)`, m.fwVorteil, j.fwVorteil);
    if (m.radVorteil) h += zeile('+ Geldwerter Vorteil Firmenrad', m.radVorteil, j.radVorteil);
    if (m.gwv - m.fwVorteil - m.radVorteil > 0.004) h += zeile('+ Sonstiger geldwerter Vorteil', m.gwv - m.fwVorteil - m.radVorteil, (m.gwv - m.fwVorteil - m.radVorteil) * 12);
    if (r.einmal.brutto) h += zeile('+ Einmalzahlungen', null, r.einmal.brutto);
    h += zeile('Gesamtbrutto', m.gesamtBrutto, j.gesamtBrutto, 'summe');
    if (m.bavAN) h += zeile('− Betriebsrente (Entgeltumwandlung)', m.bavAN, j.bavAN, 'abzug');
    if (m.radUmwandlung) h += zeile('− Gehaltsumwandlung Firmenrad', m.radUmwandlung, j.radUmwandlung, 'abzug');
    h += zeile('Steuerpflichtiges Brutto', m.steuerBrutto, null, 'zwischen');
    h += zeile('SV-pflichtiges Brutto', m.svBrutto, null, 'zwischen');
    h += `<tr class="titel"><td colspan="3">Steuern</td></tr>`;
    for (const k of ['lst', 'soli', 'kist']) if (k !== 'kist' || p.kirche) h += zeile(k === 'kist' ? `${NAMEN[k]} (${r.kirchensteuersatz} %)` : NAMEN[k], m[k], j[k], 'abzug', FARBEN[k]);
    h += `<tr class="titel"><td colspan="3">Sozialabgaben${r.art !== 'regulär' ? ' – ' + r.art : ''}</td></tr>`;
    if (p.kv === 'pkv') {
      h += zeile('Private KV/PV-Beitrag', m.pkvBeitrag, m.pkvBeitrag * 12, 'zwischen');
      h += zeile('Arbeitgeberzuschuss PKV', m.pkvZuschuss, m.pkvZuschuss * 12, 'zwischen');
      h += zeile('Private Krankenversicherung (Eigenanteil)', m.kv, j.kv, 'abzug', FARBEN.kv);
      h += zeile('Private Pflegeversicherung (Eigenanteil)', m.pv, j.pv, 'abzug', FARBEN.pv);
    } else {
      h += zeile(`${NAMEN.kv} (${fmtZahl.format(7.3 + p.kvZusatz / 2)} %)`, m.kv, j.kv, 'abzug', FARBEN.kv);
      h += zeile(NAMEN.pv, m.pv, j.pv, 'abzug', FARBEN.pv);
    }
    h += zeile(NAMEN.rv, m.rv, j.rv, 'abzug', FARBEN.rv);
    h += zeile('Arbeitslosenvers.', m.av, j.av, 'abzug', FARBEN.av);
    h += zeile('Summe Abzüge', r2(m.steuern + m.sozial), r2(j.steuern + j.sozial), 'summe');
    h += zeile('Nettogehalt', m.netto, j.netto, 'netto');
    if (m.gwv) h += zeile('− Geldwerte Vorteile (bereits erhalten)', m.gwv, j.gwv, 'abzug');
    if (m.vwlSpar) h += zeile('− VWL-Sparrate', m.vwlSpar, j.vwlSpar, 'abzug');
    if (m.steuerfrei) h += zeile('+ Steuerfreie Bezüge', m.steuerfrei, j.steuerfrei);
    if (m.gwv || m.vwlSpar || m.steuerfrei) h += zeile('Auszahlungsbetrag', m.auszahlung, j.auszahlung, 'netto');
    h += zeile('Arbeitgeberkosten (ohne Umlagen)', m.agKosten, j.agKosten, 'zwischen');
    $('#aufstellung tbody').innerHTML = h;

    const ez = r.einmal;
    $('#einmalBox').innerHTML = ez.brutto ? `<table class="aufstellung"><thead><tr><th>Einmalzahlung (im Auszahlungsmonat)</th><th></th><th>Betrag</th></tr></thead><tbody>
      ${zeile('Einmalzahlung brutto', null, ez.brutto)}${zeile('Lohnsteuer', null, ez.lst, 'abzug')}${zeile('Solidaritätszuschlag', null, ez.soli, 'abzug')}
      ${p.kirche ? zeile('Kirchensteuer', null, ez.kist, 'abzug') : ''}${zeile('Sozialabgaben', null, r2(ez.kv + ez.pv + ez.rv + ez.av), 'abzug')}${zeile('Einmalzahlung netto', null, ez.netto, 'netto')}</tbody></table>` : '';
  }
  const r2 = (x) => Math.round(x * 100) / 100;

  function aktualisieren() {
    const w = formWerte();
    $('#lblBetrag').textContent = (w._modus === 'n2b' ? 'Gewünschte Auszahlung' : 'Bruttogehalt') + (w._zeitraum === 'jahr' ? ' pro Jahr' : ' pro Monat');
    $('#feldFaktor').hidden = w.steuerklasse !== '4';
    $('#gkvFelder').hidden = w._kvArt !== 'gkv'; $('#pkvFelder').hidden = w._kvArt !== 'pkv';
    $('input[name=kvZusatz]').disabled = w.kasse !== 'eigen';
    if (w.kasse !== 'eigen') $('input[name=kvZusatz]').value = fmtZahl.format(w.kasse === 'avg' ? 2.9 : KASSEN[w.kasse].zusatz).replace(/^(\d+)$/, '$1,00');
    $('#fwFelder').hidden = !w.fw; $('#radFelder').hidden = !w.rad; $('#feldRadLeasing').hidden = w.radModus !== 'umwandlung';
    const bl = R.BUNDESLAENDER.find(b => b.code === w.bundesland); $('#kistSatz').textContent = `(${bl ? bl.kist : 9} %)`;
    const lp = zahl(w.fwListenpreis);
    $('#fwInfo').textContent = w.fwAntrieb === 'elektro' && lp > 100000 ? 'Listenpreis über 100.000 €: für E-Autos gilt dann die 0,5-%-Regel.' : 'Listenpreis wird auf volle 100 € abgerundet; zzgl. 0,03 % je Entfernungskilometer.';
    try { const r = rechne(w); render(r, w); aktualisieren.letztes = { w, r }; } catch (e) { console.error(e); }
    schreiben(LS_ZULETZT, w);
  }
  form.addEventListener('input', aktualisieren); form.addEventListener('change', aktualisieren);
  $('#betrag').addEventListener('input', aktualisieren);
  $('#betrag').addEventListener('blur', () => { const n = zahl($('#betrag').value); $('#betrag').value = n ? fmtZahl.format(n) : ''; });

  // ---------- Profile ----------
  const profile = () => lesen(LS_PROFILE) || [];
  $('#btnSpeichern').addEventListener('click', () => { $('#profilName').value = ''; $('#dlgSpeichern').showModal(); });
  $('#dlgSpeichern').addEventListener('close', () => {
    if ($('#dlgSpeichern').returnValue !== 'ok') return;
    const name = $('#profilName').value.trim() || 'Profil';
    const liste = profile(); liste.push({ id: Date.now().toString(36), name, datum: new Date().toISOString(), werte: formWerte() });
    schreiben(LS_PROFILE, liste); toast(`„${name}“ gespeichert`);
  });
  function zeigeProfile() {
    const liste = profile();
    $('#profilliste').innerHTML = liste.length ? liste.map(pr => {
      let info = ''; try { const r = rechne(pr.werte); info = `Brutto ${eur(r.monat.brutto)} → Netto ${eur(r.monat.auszahlung)} / Monat`; } catch (e) { }
      return `<li><div class="info"><strong>${esc(pr.name)}</strong><small>${info}</small></div>
        <button class="btn sekundaer" data-laden="${pr.id}">Laden</button><button class="btn gefahr" data-loeschen="${pr.id}" aria-label="Löschen">✕</button></li>`;
    }).join('') : '<li><span class="hinweis">Noch keine Profile gespeichert.</span></li>';
  }
  $('#profilliste').addEventListener('click', (e) => {
    const l = e.target.dataset.laden, d = e.target.dataset.loeschen;
    if (l) { const pr = profile().find(x => x.id === l); setzeFormWerte(pr.werte); aktualisieren(); $('.tabs button[data-tab=rechner]').click(); toast(`„${pr.name}“ geladen`); }
    if (d && confirm('Profil löschen?')) { schreiben(LS_PROFILE, profile().filter(x => x.id !== d)); zeigeProfile(); }
  });
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Vergleich ----------
  function szenarien() { return lesen(LS_SZEN) || {}; }
  ['A', 'B'].forEach(x => $('#btn' + x).addEventListener('click', () => {
    const s = szenarien(); s[x] = { name: 'Rechner (' + new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) + ')', werte: formWerte() };
    schreiben(LS_SZEN, s); toast(`Szenario ${x} übernommen`);
  }));
  function optionen(sel, aktuell) {
    const s = szenarien(), liste = profile();
    let h = '<option value="">– auswählen –</option>';
    for (const x of ['A', 'B']) if (s[x]) h += `<option value="s:${x}">Szenario ${x}: ${esc(s[x].name)}</option>`;
    h += liste.map(p => `<option value="p:${p.id}">Profil: ${esc(p.name)}</option>`).join('');
    sel.innerHTML = h; if ([...sel.options].some(o => o.value === aktuell)) sel.value = aktuell;
  }
  function holeWerte(v) { if (!v) return null; const [t, id] = v.split(':'); if (t === 's') return (szenarien()[id] || {}).werte; const p = profile().find(x => x.id === id); return p && p.werte; }
  function zeigeVergleich() {
    const a0 = $('#wahlA').value || (szenarien().A ? 's:A' : ''), b0 = $('#wahlB').value || (szenarien().B ? 's:B' : '');
    optionen($('#wahlA'), a0); optionen($('#wahlB'), b0);
    const wa = holeWerte($('#wahlA').value), wb = holeWerte($('#wahlB').value);
    if (!wa || !wb) { $('#vergleichTabelle').innerHTML = '<tr><td class="hinweis">Bitte zwei Szenarien auswählen.</td></tr>'; return; }
    const ra = rechne(wa), rb = rechne(wb), z = zustand.vglZeitraum === 'jahr' ? 'jahr' : 'monat';
    const A = ra[z], B = rb[z];
    const zeilen = [['Bruttogehalt', 'brutto'], ['Gesamtbrutto', 'gesamtBrutto'], ['Lohnsteuer', 'lst'], ['Solidaritätszuschlag', 'soli'], ['Kirchensteuer', 'kist'],
      ['Krankenversicherung', 'kv'], ['Pflegeversicherung', 'pv'], ['Rentenversicherung', 'rv'], ['Arbeitslosenversicherung', 'av'], ['Steuern gesamt', 'steuern'], ['Sozialabgaben gesamt', 'sozial'],
      ['Nettogehalt', 'netto'], ['Auszahlung', 'auszahlung'], ['Arbeitgeberkosten', 'agKosten']];
    const plusGut = new Set(['netto', 'auszahlung', 'brutto', 'gesamtBrutto']);
    $('#vergleichTabelle').innerHTML = `<thead><tr><th></th><th>A</th><th>B</th><th>B − A</th></tr></thead><tbody>` + zeilen.map(([t, k]) => {
      const d = r2(B[k] - A[k]); const gut = plusGut.has(k) ? d > 0 : d < 0;
      return `<tr class="${k === 'auszahlung' || k === 'netto' ? 'netto' : ''}"><td>${t}</td><td>${eur(A[k])}</td><td>${eur(B[k])}</td><td class="${d === 0 ? '' : gut ? 'diff-plus' : 'diff-minus'}">${d > 0 ? '+' : ''}${eur(d)}</td></tr>`;
    }).join('') + '</tbody>';
  }
  $('#wahlA').addEventListener('change', zeigeVergleich); $('#wahlB').addEventListener('change', zeigeVergleich);

  // ---------- Start ----------
  setzeFormWerte(lesen(LS_ZULETZT));
  aktualisieren();

  // ---------- PWA ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hatteController = !!navigator.serviceWorker.controller; let neuGeladen = false;
    navigator.serviceWorker.register('sw.js').then((reg) => { $('#offlineStatus').textContent = 'Offline verfügbar ✓'; reg.update().catch(() => { }); }).catch(() => { });
    // Neue Version: nach Aktivierung des neuen Service Workers einmal neu laden
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hatteController || neuGeladen) return; neuGeladen = true; if ([...document.querySelectorAll('.vollbild')].some(v => !v.hidden)) toast('Neue Version verfügbar – bitte die App neu laden.'); else location.reload(); });
  }
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').addEventListener('click', async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; $('#btnInstall').hidden = true; });
})();
