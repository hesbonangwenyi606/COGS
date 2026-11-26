const $ = id => document.getElementById(id);
function applyFeed(text, name) {
  const sheet = text.match(/sheetUrl\s*=\s*"https:\/\/sheet\.zoho\.com\/api\/v2\/([^"\s]+)"/);
  const account = text.match(/accountId\s*=\s*"([^"\s]+)"/);
  const days = text.match(/fromDate\s*=\s*zoho\.currentdate\.subDay\((\d+)\)/);
  if (!sheet || !account || !days || !text.includes('cell.content.set')) {
    $('source').textContent = `Could not read ${name}. Choose the current production file.`;
    return;
  }
  $('source').textContent = `Checked locally: ${name}`;
  $('mode').textContent = 'File loaded';
  $('sheet-status').textContent = 'ID present';
  $('accounts').textContent = '1 configured';
  $('window').textContent = `${Number(days[1]) + 1} days`;
  $('labels').textContent = 'Review in script';
  $('writes').textContent = 'Review in script';
  $('mode-note').textContent = 'Review the selected script before running it; it may write to Zoho.';
  $('sheet-note').textContent = 'File checks do not confirm Zoho access, execution or schedule status.';
  $('failed-count').textContent = 'Not verified';
  $('failed-note').textContent = 'Check the execution log in Zoho Books';
}
for (const id of ['feed-file', 'feed-file-alt']) $(id).addEventListener('change', async e => {
  const file = e.target.files[0];
  if (file) try { applyFeed(await file.text(), file.name); } catch { $('source').textContent = 'Could not read the selected file.'; }
});
fetch('COGS_Production_Ready.dg').then(r => { if (!r.ok) throw Error(); return r.text(); }).then(t => applyFeed(t, 'COGS_Production_Ready.dg')).catch(() => { $('source').textContent = 'Choose COGS_Production_Ready.dg to check its settings.'; });
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

