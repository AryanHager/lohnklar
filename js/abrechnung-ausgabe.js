/* Darstellung der Entgeltabrechnung: gemeinsames Modell -> HTML (Vorschau/Druck) und PDF (jsPDF, lokal). */
(function (root) {
  'use strict';
  const fmtE = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = (n) => fmtE.format(n || 0).replace('−', '-') + ' €';
  const datum = (iso) => iso ? iso.split('-').reverse().join('.') : '–';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STKL = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const FUSS = 'Erstellt mit Lohnklar – alle Angaben ohne Gewähr. Lohnklar ist keine zertifizierte Entgeltabrechnungssoftware (keine DEÜV-Meldungen, kein ELStAM-Abruf, keine Lohnsteuer-Anmeldung).';

  function modell(a) {
    const f = a.firma || {}, m = a.mitarbeiter, e = a.eingabe;
    const st = a.steuermerkmale;
    const svText = [];
    if (e.kv === 'pkv') svText.push(['KV/PV', `privat versichert – Beitrag ${eur(a.pkv.beitrag)}, AG-Zuschuss ${eur(a.pkv.zuschuss)}`]);
    else { svText.push(['Krankenkasse', a.kasse]); svText.push(['KV-Beitrag AN', `${fmtP(a.kvAN)} % (inkl. ½ Zusatzbeitrag ${fmtP(e.kvZusatz)} %)`]); svText.push(['PV-Beitrag AN', `${fmtP(a.pvAN)} %${e.bundesland === 'SN' ? ' (Sachsen)' : ''}${(e.kinder || 0) === 0 ? ' inkl. Kinderlosenzuschlag' : ''}`]); }
    svText.push(['RV / AV', `${e.rvPflicht ? 'pflichtig' : 'frei'} / ${e.avPflicht ? 'pflichtig' : 'frei'}`]);
    svText.push(['Beitragsgruppe', m.bgs || '–']); svText.push(['Personengruppe', m.pgs || '–']);
    if (a.art !== 'regulär') svText.push(['Beschäftigung', a.art]);
    const stText = [['Steuerklasse', STKL[st.steuerklasse] + (st.faktor ? ` mit Faktor ${String(st.faktor).replace('.', ',')}` : '')],
      ['Kinderfreibeträge', String(st.kinderfreibetraege).replace('.', ',')], ['Konfession', a.konfession + (e.kirche ? ` (KiSt ${a.kirchensteuersatz} %)` : '')],
      ['Bundesland', st.bundesland || '–'], ['Freibetrag mtl.', st.freibetrag ? eur(st.freibetrag) : '–']];
    if (a.art === 'Minijob') stText.push(['Besteuerung', 'Pauschsteuer 2 % durch Arbeitgeber']);

    const bez = { titel: 'Bezüge', spalten: [['LA', 'l', 12], ['Bezeichnung', 'l', 108], ['St', 'c', 12], ['SV', 'c', 12], ['Betrag', 'r', 36]], zeilen: [] };
    for (const b of a.bezuege) bez.zeilen.push({ z: [b.la, b.text, b.st, b.sv, eur(b.betrag)] });
    bez.zeilen.push({ z: ['', 'Gesamtbrutto', '', '', eur(a.gesamtBrutto)], stil: 'summe' });
    for (const b of a.umwandlung) bez.zeilen.push({ z: [b.la, b.text, b.st, b.sv, eur(b.betrag)] });
    bez.zeilen.push({ z: ['', `Steuer-Brutto laufend ${eur(a.steuerBrutto.l)}${a.steuerBrutto.e ? ` · einmalig ${eur(a.steuerBrutto.e)}` : ''}`, '', '', ''], stil: 'info' });
    bez.zeilen.push({ z: ['', `SV-Brutto laufend ${eur(a.svBrutto.l)}${a.svBrutto.e ? ` · einmalig ${eur(a.svBrutto.e)}` : ''} · beitragspfl. KV/PV ${eur(a.svBrutto.kv)} · RV/AV ${eur(a.svBrutto.rv)}`, '', '', ''], stil: 'info' });

    const abz = { titel: 'Gesetzliche Abzüge', spalten: [['Bezeichnung', 'l', 96], ['laufend', 'r', 28], ['einmalig', 'r', 28], ['Betrag', 'r', 28]], zeilen: [] };
    a.abzuege.forEach((x, i) => {
      if (i === 2 && !e.kirche && !x.summe) return;
      abz.zeilen.push({ z: [x.text, eur(x.l), x.e ? eur(x.e) : '', eur(-x.summe)] });
      if (i === 2 || (i === 1 && !e.kirche)) abz.zeilen.push({ z: ['Summe Steuern', '', '', eur(-a.steuerSumme)], stil: 'zwischen' });
    });
    abz.zeilen.push({ z: ['Summe Sozialversicherung', '', '', eur(-a.svSumme)], stil: 'zwischen' });
    abz.zeilen.push({ z: ['Nettoverdienst', '', '', eur(a.netto)], stil: 'netto' });

    const sonst = { titel: 'Sonstige Be- und Abzüge', spalten: [['Bezeichnung', 'l', 152], ['Betrag', 'r', 28]], zeilen: a.sonstige.map(x => ({ z: [x.text, eur(x.betrag)] })) };

    const j = a.jahressummen;
    const vonMonat = a.beschaeftigtSeit > 1 ? root.Abrechnung.MONATE[a.beschaeftigtSeit - 1] : 'Januar';
    const jahr = { titel: `Jahressummen ${a.jahr} (kumuliert ${vonMonat} – ${a.monatName}${a.vortragManuell ? ', Vormonate manuell' : ''})`, spalten: [['Wert', 'l', 62], ['Betrag', 'r', 28], ['Wert', 'l', 62], ['Betrag', 'r', 28]], zeilen: [] };
    const paare = [['Gesamtbrutto', j.gesamtBrutto], ['Lohnsteuer', j.lst], ['Steuer-Brutto', j.steuerBrutto], ['Solidaritätszuschlag', j.soli], ['SV-Brutto KV/PV', j.svKV], ['Kirchensteuer', j.kist],
      ['SV-Brutto RV/AV', j.svRV], ['Krankenversicherung', j.kv], ['Nettoverdienst', j.netto], ['Pflegeversicherung', j.pv], ['Auszahlung', j.auszahlung], ['Rentenversicherung', j.rv], ['', null], ['Arbeitslosenversicherung', j.av]];
    for (let i = 0; i < paare.length; i += 2) jahr.zeilen.push({ z: [paare[i][0], paare[i][1] === null ? '' : eur(paare[i][1]), paare[i + 1][0], eur(paare[i + 1][1])] });

    const ag = a.arbeitgeber;
    const agText = `Arbeitgeberanteile (nachrichtlich): KV ${eur(ag.kv)} · PV ${eur(ag.pv)} · RV ${eur(ag.rv)} · AV ${eur(ag.av)}${ag.bavAG ? ` · bAV-Zuschuss ${eur(ag.bavAG)}` : ''}${a.pkv ? ` · PKV-Zuschuss enthalten` : ''}`;
    return {
      firma: { name: f.name || 'Arbeitgeber', zeilen: [f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean), betriebsnummer: f.betriebsnummer, logo: f.logo },
      titel: `Entgeltabrechnung ${a.monatName} ${a.jahr}`, zeitraum: `Abrechnungszeitraum ${a.zeitraum}`,
      empfaenger: [`${m.vorname || ''} ${m.name || ''}`.trim(), m.strasse, [m.plz, m.ort].filter(Boolean).join(' ')].filter(Boolean),
      stamm: [['Personalnummer', m.personalnummer || '–'], ['Geburtsdatum', datum(m.geburtsdatum)], ['Eintritt', datum(m.eintritt)], ['SV-Nummer', fmtSv(m.svnr)], ['Steuer-ID', fmtStId(m.steuerid)]],
      merkmale: [{ titel: 'Steuermerkmale', paare: stText }, { titel: 'SV-Merkmale', paare: svText }],
      tabellen: [bez, abz].concat(sonst.zeilen.length ? [sonst] : []),
      auszahlung: { betrag: eur(a.auszahlung), iban: m.iban ? fmtIban(m.iban) : 'nicht hinterlegt', inhaber: `${m.vorname || ''} ${m.name || ''}`.trim() },
      jahr, agText, fuss: FUSS, erstellt: new Date().toLocaleDateString('de-DE')
    };
  }
  const fmtP = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
  const fmtSv = (s) => s ? String(s).replace(/^(\d{2})(\d{6})([A-Z])(\d{2})(\d)$/i, '$1 $2 $3 $4 $5') : '–';
  const fmtStId = (s) => s ? String(s).replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4') : '–';
  const fmtIban = (s) => String(s).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();

  // ---------- HTML ----------
  function html(a) {
    const d = modell(a);
    const tab = (t) => `<table class="lz-tab"><thead><tr>${t.spalten.map(([s, al]) => `<th class="${al}">${esc(s)}</th>`).join('')}</tr></thead><tbody>${t.zeilen.map(r => r.stil === 'info'
      ? `<tr class="info"><td></td><td colspan="${t.spalten.length - 1}">${esc(r.z[1])}</td></tr>`
      : `<tr class="${r.stil || ''}">${r.z.map((c, i) => `<td class="${t.spalten[i][1]}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<article class="lohnzettel">
      <header class="lz-kopf"><div><strong class="lz-firma">${esc(d.firma.name)}</strong><br>${d.firma.zeilen.map(esc).join('<br>')}${d.firma.betriebsnummer ? `<br>Betriebsnummer ${esc(d.firma.betriebsnummer)}` : ''}</div>
        ${d.firma.logo ? `<img class="lz-logo" src="${d.firma.logo}" alt="">` : ''}</header>
      <div class="lz-anschrift"><div class="lz-adresse"><small>${esc(d.firma.name)} · ${d.firma.zeilen.map(esc).join(' · ')}</small><br>${d.empfaenger.map(esc).join('<br>')}</div>
      <dl class="lz-stamm">${d.stamm.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
      <h2 class="lz-titel">${esc(d.titel)}</h2><p class="lz-zeitraum">${esc(d.zeitraum)}</p>
      <div class="lz-merkmale">${d.merkmale.map(mk => `<section><h3>${esc(mk.titel)}</h3><dl>${mk.paare.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`).join('')}</div>
      ${d.tabellen.map(t => `<h3>${esc(t.titel)}</h3>${tab(t)}`).join('')}
      <div class="lz-auszahlung"><div><span>Auszahlungsbetrag</span><strong>${esc(d.auszahlung.betrag)}</strong></div><small>Überweisung an ${esc(d.auszahlung.inhaber)} · IBAN ${esc(d.auszahlung.iban)}</small></div>
      <h3>${esc(d.jahr.titel)}</h3>${tab(d.jahr)}
      <p class="lz-ag">${esc(d.agText)}</p>
      <footer class="lz-fuss">${esc(d.fuss)}<br>Erstellt am ${esc(d.erstellt)}. Legende St/SV: L = laufend, E = einmalig, F = frei, T = teilweise pflichtig.</footer>
    </article>`;
  }

  // ---------- PDF (jsPDF, vektorbasiert) ----------
  function pdf(liste) {
    const { jsPDF } = root.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: liste.length === 1 ? `Entgeltabrechnung ${liste[0].monatName} ${liste[0].jahr} – ${liste[0].mitarbeiter.vorname} ${liste[0].mitarbeiter.name}` : `Entgeltabrechnungen ${liste[0].monatName} ${liste[0].jahr}`, creator: 'Lohnklar' });
    liste.forEach((a, i) => { if (i) doc.addPage(); seite(doc, modell(a)); });
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(110); doc.text(`Seite ${p} von ${n}`, 195, 290, { align: 'right' }); }
    return doc;
  }
  function seite(doc, d) {
    const L = 15, B = 180, NAVY = [30, 58, 95];
    let y = 15;
    const neueSeiteWennNoetig = (h) => { if (y + h > 280) { fuss(); doc.addPage(); y = 15; } };
    const fuss = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(90); doc.text(doc.splitTextToSize(d.fuss, 160), L, 284); doc.setTextColor(0); };
    // Kopf
    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(d.firma.name, L, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    d.firma.zeilen.concat(d.firma.betriebsnummer ? [`Betriebsnummer ${d.firma.betriebsnummer}`] : []).forEach((z, i) => doc.text(z, L, y + 9 + i * 4));
    if (d.firma.logo) {
      try { const p = doc.getImageProperties(d.firma.logo); const sk = Math.min(45 / p.width, 18 / p.height), w = p.width * sk, h = p.height * sk; doc.addImage(d.firma.logo, 'PNG', L + B - w, y, w, h); } catch (e) { /* Logo ungültig */ }
    }
    // Anschrift (Fensterposition DIN 5008 ca. 45 mm von oben) + Stammdaten
    y = 44; doc.setFontSize(6.5); doc.setTextColor(100); doc.text(`${d.firma.name} · ${d.firma.zeilen.join(' · ')}`, L, y); doc.setTextColor(0);
    doc.setFontSize(9.5); d.empfaenger.forEach((z, i) => doc.text(z, L, y + 5 + i * 4.6));
    doc.setFontSize(8); d.stamm.forEach(([k, v], i) => { doc.setTextColor(90); doc.text(k, 125, y + i * 4.4); doc.setTextColor(0); doc.text(v, L + B, y + i * 4.4, { align: 'right' }); });
    y = 69;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NAVY); doc.text(d.titel, L, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80); doc.text(d.zeitraum, L + B, y, { align: 'right' }); doc.setTextColor(0);
    y += 4;
    // Merkmale (zwei Spalten)
    const mh = Math.max(...d.merkmale.map(mk => mk.paare.length)) * 3.5 + 7;
    d.merkmale.forEach((mk, i) => {
      const x = L + i * (B / 2 + 1), w = B / 2 - 1;
      doc.setFillColor(245, 243, 238); doc.roundedRect(x, y, w, mh, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY); doc.text(mk.titel, x + 3, y + 4.5); doc.setTextColor(0);
      doc.setFontSize(7.3);
      mk.paare.forEach(([k, v], j) => { doc.setFont('helvetica', 'normal'); doc.setTextColor(90); doc.text(k, x + 3, y + 8.5 + j * 3.5); doc.setTextColor(0); doc.text(doc.splitTextToSize(v, w - 31)[0], x + 30, y + 8.5 + j * 3.5); });
    });
    y += mh + 3.5;
    const tabelle = (t) => {
      const breiten = t.spalten.map(s => s[2]), summe = breiten.reduce((a, b) => a + b, 0), fakt = B / summe;
      const xs = []; let x = L; for (const w of breiten) { xs.push(x); x += w * fakt; }
      neueSeiteWennNoetig(14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY); doc.text(t.titel, L, y); y += 1.5; doc.setTextColor(0);
      doc.setFillColor(...NAVY); doc.rect(L, y, B, 4.4, 'F'); doc.setTextColor(255); doc.setFontSize(7);
      t.spalten.forEach(([s, al], i) => cell(s, i, y + 3.1)); y += 4.4; doc.setTextColor(0);
      function cell(text, i, yy = y + 3.5) {
        const al = t.spalten[i][1], w = breiten[i] * fakt;
        if (al === 'r') doc.text(text, xs[i] + w - 1.5, yy, { align: 'right' }); else if (al === 'c') doc.text(text, xs[i] + w / 2, yy, { align: 'center' }); else doc.text(text, xs[i] + 1.5, yy);
      }
      for (const r of t.zeilen) {
        neueSeiteWennNoetig(5);
        const h = r.stil === 'info' ? 3.6 : 4.15;
        if (r.stil === 'netto') { doc.setFillColor(230, 244, 236); doc.rect(L, y, B, h + 0.6, 'F'); }
        doc.setFont('helvetica', r.stil === 'summe' || r.stil === 'netto' || r.stil === 'zwischen' ? 'bold' : 'normal');
        doc.setFontSize(r.stil === 'info' ? 6.6 : 7.6); doc.setTextColor(r.stil === 'info' ? 90 : 0);
        if (r.stil === 'info') doc.text(r.z[1], xs[1] + 1.5, y + 2.7); else r.z.forEach((c, i) => c && cell(c, i, y + 3));
        y += h; doc.setDrawColor(225, 222, 214); doc.setLineWidth(r.stil === 'summe' ? 0.35 : 0.15); doc.line(L, y, L + B, y);
      }
      doc.setTextColor(0); y += 3.2;
    };
    d.tabellen.forEach(tabelle);
    // Auszahlung
    neueSeiteWennNoetig(16);
    doc.setFillColor(...NAVY); doc.roundedRect(L, y, B, 13, 2, 2, 'F'); doc.setTextColor(255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Auszahlungsbetrag', L + 4, y + 6); doc.setFontSize(13); doc.text(d.auszahlung.betrag, L + B - 4, y + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.text(`Überweisung an ${d.auszahlung.inhaber} · IBAN ${d.auszahlung.iban}`, L + 4, y + 10.5);
    doc.setTextColor(0); y += 16.5;
    tabelle(d.jahr);
    neueSeiteWennNoetig(8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(80); doc.text(doc.splitTextToSize(d.agText, B), L, y);
    doc.text(`Legende St/SV: L = laufend, E = einmalig, F = frei, T = teilweise pflichtig · erstellt am ${d.erstellt}`, L, y + 3.5);
    fuss();
  }

  function dateiname(liste) {
    const a = liste[0], mm = String(a.monat).padStart(2, '0');
    const n = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-');
    return liste.length === 1 ? `Entgeltabrechnung_${a.jahr}-${mm}_${n(a.mitarbeiter.name)}_${n(a.mitarbeiter.vorname)}.pdf` : `Entgeltabrechnungen_${a.jahr}-${mm}_alle.pdf`;
  }
  root.AbrechnungAusgabe = { modell, html, pdf, dateiname };
})(typeof globalThis !== 'undefined' ? globalThis : this);
