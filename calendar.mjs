const months = [
  ['jan', 'januar'],
  ['feb', 'februar'],
  ['mar', 'mars'],
  ['apr', 'april'],
  ['mai'],
  ['jun', 'juni'],
  ['jul', 'juli'],
  ['aug', 'august'],
  ['sep', 'sept', 'september'],
  ['okt', 'oktober'],
  ['nov', 'november'],
  ['des', 'desember']
];

export const monthNames = months.map(names => names.at(-1));
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit'
});
const monthPattern = months.flat().sort((a, b) => b.length - a.length).join('|');
const eventLine = new RegExp(
  '^\\s*(?<day>\\d{1,2})\\.?\\s*(?<month>' + monthPattern + ')?\\.?\\s*' +
  '(?:[-–—]\\s*(?<until>\\d{1,2})\\.?\\s*(?<untilMonth>' + monthPattern + ')?\\.?\\s*)?' +
  '(?:(?<year>20\\d{2})\\s*)?[-–—]\\s*(?<place>[^:]+):\\s*(?<description>.+)$',
  'iu'
);

export function localDay(now = new Date()) {
  const parts = Object.fromEntries(dayFormat.formatToParts(now).map(p => [p.type, p.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function monthNumber(name) {
  return months.findIndex(group => group.includes(name?.toLowerCase())) + 1;
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return '';
  return date.toISOString().slice(0, 10);
}

export function parseCalendar(blocks, today) {
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const events = [];
  const skipped = [];
  let yearHeading;
  let monthHeading;

  for (const block of blocks) {
    const text = block.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (block.heading) {
      const year = text.match(/\b20\d{2}\b/);
      if (year) yearHeading = Number(year[0]);
      monthHeading = monthNumber(text.replace(/\s+20\d{2}$/, '')) || undefined;
      continue;
    }
    const entry = text.match(eventLine)?.groups;
    if (!entry) {
      skipped.push(text);
      continue;
    }

    const fromMonth = monthNumber(entry.month || entry.untilMonth) || monthHeading;
    const toMonth = monthNumber(entry.untilMonth) || fromMonth;
    const offset = fromMonth - currentMonth;
    const inferredYear = currentYear + (offset < -6 ? 1 : offset > 6 ? -1 : 0);
    const year = Number(entry.year) || yearHeading || inferredYear;
    const start = isoDate(year, fromMonth, Number(entry.day));
    const end = entry.until
      ? isoDate(year + (toMonth < fromMonth ? 1 : 0), toMonth, Number(entry.until))
      : start;

    if (!start || !end || end < start || !entry.place.trim() || !entry.description.trim()) {
      skipped.push(text);
      continue;
    }
    events.push({
      start, end,
      place: entry.place.trim(),
      description: entry.description.trim(),
      ...(block.links?.length ? { links: block.links } : {})
    });
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return { events, skipped };
}

export function formatSpan(start, end) {
  const monthOf = date => months[Number(date.slice(5, 7)) - 1][0];
  const dayOf = date => Number(date.slice(8, 10));
  if (start === end) return dayOf(start) + '. ' + monthOf(start);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return dayOf(start) + '.-' + dayOf(end) + '. ' + monthOf(end);
  }
  return dayOf(start) + '. ' + monthOf(start) + ' - ' + dayOf(end) + '. ' + monthOf(end);
}
