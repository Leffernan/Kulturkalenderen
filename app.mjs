import { formatSpan, localDay, monthNames } from './calendar.mjs';

const source = document.querySelector('#original-link');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const month = document.querySelector('#month');
const result = document.querySelector('#events');
const status = document.querySelector('#status');
const more = document.querySelector('#more');
const batchSize = 18;
const feed = 'https://raw.githubusercontent.com/Leffernan/Kulturkalenderen/calendar-data/events.json';
const apiFeed = 'https://api.github.com/repos/Leffernan/Kulturkalenderen/contents/events.json?ref=calendar-data';
const today = localDay();
let upcoming = [];
let shown = batchSize;

function monthLabel(id) {
  return monthNames[Number(id.slice(5, 7)) - 1] + ' ' + id.slice(0, 4);
}

function activeMonths(events) {
  const ids = new Set();
  for (const event of events) {
    const firstDay = event.start < today ? today : event.start;
    const date = new Date(firstDay.slice(0, 7) + '-01T00:00:00Z');
    while (date.toISOString().slice(0, 10) <= event.end) {
      ids.add(date.toISOString().slice(0, 7));
      date.setUTCMonth(date.getUTCMonth() + 1);
    }
  }
  return [...ids].sort();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function eventRow(event) {
  const row = element('li', 'event');
  const date = element('time', 'event-date', formatSpan(event.start, event.end));
  date.dateTime = event.start;
  const content = element('div');
  content.append(
    element('p', 'event-place', event.place.toLocaleUpperCase('nb-NO')),
    element('p', 'event-description', event.description)
  );

  const links = element('div', 'event-links');
  for (const link of Array.isArray(event.links) ? event.links : []) {
    if (typeof link?.label !== 'string' || typeof link.href !== 'string' || !/^https?:\/\//i.test(link.href)) continue;
    const anchor = element('a', '', link.label);
    anchor.href = link.href;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    links.append(anchor);
  }
  if (links.childElementCount) content.append(links);
  row.append(date, content);
  return row;
}

function render() {
  const words = search.value.toLocaleLowerCase('nb-NO').trim().split(/\s+/).filter(Boolean);
  const filtered = upcoming.filter(event => {
    if (month.value && (event.start.slice(0, 7) > month.value || event.end.slice(0, 7) < month.value)) return false;
    const corpus = (event.place + ' ' + event.description).toLocaleLowerCase('nb-NO');
    return words.every(word => corpus.includes(word));
  });
  const sections = document.createDocumentFragment();
  let previousMonth;
  let list;
  for (const event of filtered.slice(0, shown)) {
    const monthId = month.value || event.start.slice(0, 7);
    if (monthId !== previousMonth) {
      const section = element('section', 'month');
      list = element('ul');
      section.append(element('h2', '', monthLabel(monthId)), list);
      sections.append(section);
      previousMonth = monthId;
    }
    list.append(eventRow(event));
  }

  result.replaceChildren(sections);
  status.textContent = filtered.length ? '' : upcoming.length
    ? 'Fann ingen arrangement som passar søket.'
    : 'Ingen komande arrangement i kalenderen akkurat no.';
  more.hidden = shown >= filtered.length;
}

function resetFilter() {
  shown = batchSize;
  render();
}

async function fetchEvents(url) {
  const response = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Kalenderdata er utilgjengelege');
  let data = await response.json();
  if (data.encoding === 'base64' && typeof data.content === 'string') {
    const bytes = Uint8Array.from(atob(data.content), char => char.charCodeAt(0));
    data = JSON.parse(new TextDecoder().decode(bytes));
  }
  const validDay = value => typeof value === 'string' && /^20\d{2}-(?:0[1-9]|1[0-2])-\d{2}$/.test(value);
  if (!validDay(data.checkedOn) || Date.parse(today) - Date.parse(data.checkedOn) > 2 * 86400000 ||
    !Array.isArray(data.events) || !data.events.every(event =>
    validDay(event?.start) && validDay(event.end) && event.start <= event.end &&
    typeof event.place === 'string' && typeof event.description === 'string')) {
    throw new Error('Ugyldige kalenderdata');
  }
  return data.events;
}

async function load() {
  try {
    const events = await fetchEvents(feed).catch(() => fetchEvents(apiFeed));
    upcoming = events.filter(event => event.end >= today).sort((a, b) => a.start.localeCompare(b.start));
    for (const id of activeMonths(upcoming)) {
      const label = monthLabel(id);
      month.add(new Option(label[0].toUpperCase() + label.slice(1), id));
    }
    filters.hidden = !upcoming.length;
    render();
  } catch {
    const fallback = document.querySelector('#source-fallback');
    fallback.querySelector('iframe').src = source.href;
    fallback.hidden = false;
    status.textContent = 'Viser originalkalenderen.';
  }
}

filters.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', resetFilter);
month.addEventListener('change', resetFilter);
more.addEventListener('click', () => {
  shown += batchSize;
  render();
});

if (window.parent !== window) {
  const shell = document.querySelector('.shell');
  const report = () => window.parent.postMessage({
    widget: 'bygdebladet-kulturkalender',
    type: 'height',
    height: Math.ceil(shell.getBoundingClientRect().height)
  }, '*');
  new ResizeObserver(report).observe(shell);
  window.addEventListener('message', event => {
    if (event.source === window.parent && event.data?.widget === 'bygdebladet-kulturkalender' &&
        event.data.type === 'measure') report();
  });
}

load();
