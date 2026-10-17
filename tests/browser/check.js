const { chromium, devices } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage(); const fehler = [];
  p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); }); p.on('pageerror', e => fehler.push(e.message));
  const extern = []; p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8765')) extern.push(r.url()); });
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  console.log('Hauptwert:', await p.textContent('#hauptwert'), '|', await p.textContent('#nebenwert'));
  await p.screenshot({ path: '/workspace/brutto-netto-app/screenshot.png', fullPage: false });
  await p.screenshot({ path: '/workspace/brutto-netto-app/screenshot-ganz.png', fullPage: true });
  // Wunschnetto
  await p.click('#modus button[data-wert=n2b]'); await p.fill('#betrag', '3000');
  console.log('Wunschnetto 3000 ->', await p.textContent('#hauptwert'), '|', await p.textContent('#nebenwert'));
  await p.click('#modus button[data-wert=b2n]'); await p.fill('#betrag', '4.000');
  // Szenario A/B + Vergleich
  await p.click('#btnA'); await p.selectOption('select[name=steuerklasse]', '3'); await p.click('#btnB');
  await p.click('.tabs button[data-tab=vergleich]'); await p.waitForTimeout(300);
  console.log('Vergleich Zeilen:', await p.$$eval('#vergleichTabelle tbody tr', r => r.length));
  await p.screenshot({ path: '/workspace/brutto-netto-app/screenshot-vergleich.png' });
  // Profil speichern
  await p.click('.tabs button[data-tab=rechner]'); await p.click('#btnSpeichern'); await p.fill('#profilName', 'Testprofil'); await p.click('#dlgSpeichern button[value=ok]');
  await p.click('.tabs button[data-tab=profile]'); console.log('Profile:', (await p.textContent('#profilliste')).trim().replace(/\s+/g, ' '));
  // Offline
  await ctx.setOffline(true); await p.reload({ waitUntil: 'load' });
  console.log('Offline geladen, Hauptwert:', await p.textContent('#hauptwert'));
  console.log('Manifest:', await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()).then(j => j.name)));
  console.log('Fehler:', fehler.length ? fehler : 'keine', '| externe Requests:', extern.length ? extern : 'keine');
  await b.close();
})();
