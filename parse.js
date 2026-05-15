// Parse various plain-text timetable formats into rows
// Output shape: { days: string[], rows: [{time, cells: [{subject}]}] }

const DEFAULT_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

function parseTimetable(text) {
  if (!text || !text.trim()) return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  // Detect markdown table
  if (lines.some(l => l.startsWith('|'))) {
    return parseMdTable(lines);
  }
  // Detect TSV/CSV
  if (lines[0].includes('\t')) {
    return parseDelim(lines, '\t');
  }
  if (lines[0].includes(',') && lines.length > 1) {
    return parseDelim(lines, ',');
  }
  // Multi-space delimited
  return parseDelim(lines, /\s{2,}/);
}

function parseMdTable(lines) {
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    // skip separator
    if (/^\|[\s:|-]+\|?$/.test(line)) continue;
    const cells = line.split('|').map(s => s.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
    if (cells.length === 0) continue;
    if (!header) {
      header = cells;
    } else {
      rows.push(cells);
    }
  }
  if (!header) return null;
  const days = header.slice(1).map(d => d || '');
  const out = rows.map(r => ({
    time: r[0] || '',
    cells: days.map((_, i) => ({ subject: (r[i + 1] || '').trim() }))
  }));
  return { days, rows: out };
}

function parseDelim(lines, sep) {
  const split = (s) => sep instanceof RegExp ? s.split(sep) : s.split(sep);
  const header = split(lines[0]).map(s => s.trim());
  const days = header.slice(1);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = split(lines[i]).map(s => s.trim());
    if (parts.length < 2) continue;
    rows.push({
      time: parts[0],
      cells: days.map((_, j) => ({ subject: parts[j + 1] || '' }))
    });
  }
  return { days, rows };
}

window.parseTimetable = parseTimetable;
window.DEFAULT_DAYS = DEFAULT_DAYS;

// Sample timetable shipped with the app
window.SAMPLE_TIMETABLE = `| Time        | Monday                       | Tuesday                      | Wednesday                    | Thursday               | Friday                      |
| ----------- | ---------------------------- | ---------------------------- | ---------------------------- | ---------------------- | --------------------------- |
| 09:00–09:40 | Enjoy with Mathematics       | Enjoy with Mathematics       | Rhythmic Activities          | Enjoy with Mathematics | Enjoy with Thai Language    |
| 09:40–10:20 | Conversation By Fun Language | Conversation By Fun Language | Junior Scientist             | Enjoy with Thai Music  | Fun Stories By Fun Language |
| 10:30–11:10 | Enjoy with Thai Language     | Enjoy with Thai Language     | Conversation By Fun Language | Enjoy with Chinese     | Enjoy with English          |
| 13:00–13:40 | Enjoy with Chinese           | Swimming                     | Enjoy with Chinese           | Enjoy with English     | Enjoy with Chinese          |
| 13:40–14:20 | Enjoy with English           | Swimming                     | Music Activities             | Junior Scientist       | Coding & AI                 |
| 14:35–15:15 | Creative Activities          | Free Activity                | Creative Activities          | Taekwondo              | Free Activity               |
| 15:15–16:00 | Extra Class                  | Extra Class                  | Extra Class                  | Extra Class            | Extra Class                 |`;
