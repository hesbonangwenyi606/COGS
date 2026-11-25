const $ = id => document.getElementById(id);
function applyFeed(text, name) {
  const get = (pattern) => text.match(pattern)?.[1];
  const test = get(/TEST_ONLY\s*=\s*(true|false)\s*;/i);
  const confirmed = get(/TRANSACTION_LABELS_CONFIRMED\s*=\s*(true|false)\s*;/i);
  const sheet = get(/sheetId\s*=\s*"([^"]*)"/);
  const days = get(/windowDays\s*=\s*(\d+)/);
  if (!test || !confirmed || sheet === undefined || !days || !/cogsAccounts\s*=/.test(text)) {
    $('source').textContent = `Could not read ${name}. Choose a valid COGS feed file.`;
    return;
  }
  const isTest = test.toLowerCase() === 'true';
  const labelsConfirmed = confirmed.toLowerCase() === 'true';
  const hasSheet = !!sheet.trim() && !sheet.includes('PUT_');
  const accounts = [...text.matchAll(/^\s*cogsAccounts\.add\("([^"]+)"\)/gm)].filter(m => !m[1].includes('PUT_')).length;
  $('mode').textContent = isTest ? 'Test mode' : labelsConfirmed ? 'Live enabled' : 'Writes blocked';
  $('mode-note').textContent = isTest ? 'No Sheet writes in test mode' : 'Based on settings in the file';
  $('sheet-status').textContent = hasSheet ? 'ID present' : 'ID needed';
  $('sheet-note').textContent = hasSheet ? 'Connection has not been verified' : 'Add the Sheet resource ID';
  $('accounts').textContent = `${accounts} configured`;
  $('window').textContent = `${days}-day rolling window`;
  $('labels').textContent = labelsConfirmed ? 'Marked confirmed' : 'Need confirmation';
  $('writes').textContent = isTest ? 'Disabled in test mode' : labelsConfirmed ? 'Enabled in settings' : 'Blocked until labels confirmed';
  const issues = [!hasSheet, accounts === 0, !labelsConfirmed].filter(Boolean).length;
  $('failed-count').textContent = issues;
  $('failed-note').textContent = issues === 1 ? '1 configuration item needs attention' : `${issues} configuration items need attention`;
  $('source').textContent = `Checked: ${name}`;
}
for (const id of ['feed-file', 'feed-file-alt']) $(id).addEventListener('change', async e => {
  const file = e.target.files[0];
  if (file) try { applyFeed(await file.text(), file.name); } catch { $('source').textContent = 'Could not read the selected file.'; }
});
fetch('Armco_Nightly_COGS_Feed.dg').then(r => { if (!r.ok) throw Error(); return r.text(); }).then(t => applyFeed(t, 'Armco_Nightly_COGS_Feed.dg')).catch(() => { $('source').textContent = 'Choose the feed file to check its settings.'; });
const tasks = [...document.querySelectorAll('[data-task]')];
let stored = {};
try { stored = JSON.parse(localStorage.getItem('armco-cogs-checklist') || '{}'); } catch { $('storage-note').textContent = 'Browser storage is unavailable; checklist progress may not be saved.'; }
function updateProgress() { const done = tasks.filter(t => t.checked).length; $('progress').textContent = `${done} of ${tasks.length} done`; $('completed-count').textContent = done; $('remaining-count').textContent = tasks.length - done; }
tasks.forEach(task => { task.checked = stored[task.dataset.task] === true; task.addEventListener('change', () => {
  const state = Object.fromEntries(tasks.map(t => [t.dataset.task, t.checked]));
  try { localStorage.setItem('armco-cogs-checklist', JSON.stringify(state)); } catch { $('storage-note').textContent = 'Browser storage is unavailable; checklist progress will not be saved.'; }
  updateProgress();
}); });
$('reset').addEventListener('click', () => { tasks.forEach(t => t.checked = false); try { localStorage.removeItem('armco-cogs-checklist'); } catch {} updateProgress(); });
updateProgress();
function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw Error('Unclosed quoted field.');
  row.push(field); if (row.some(v => v.trim())) rows.push(row); return rows;
}
$('csv-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  $('daily-table').hidden = true; $('daily-table').querySelector('tbody').replaceChildren();
  try {
    const rows = parseCSV((await file.text()).replace(/^\uFEFF/, ''));
    const headers = (rows.shift() || []).map(h => h.trim().toLowerCase());
    const date = headers.indexOf('date'), amount = headers.indexOf('cogs');
    if (date < 0 || amount < 0) throw Error('CSV must have Date and COGS headers.');
    if (!rows.length) throw Error('CSV has no data rows.');
    const body = $('daily-table').querySelector('tbody');
    for (const row of rows) { const tr = document.createElement('tr'); for (const value of [row[date] ?? '', row[amount] ?? '']) { const td = document.createElement('td'); td.textContent = value; tr.append(td); } body.append(tr); }
    $('daily-table').hidden = false; $('csv-message').textContent = `${rows.length} rows imported from ${file.name}. Values are shown as provided and are not verified against Zoho.`;
  } catch (error) { $('csv-message').textContent = `Could not import CSV: ${error.message}`; }
});

