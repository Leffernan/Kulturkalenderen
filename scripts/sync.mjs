import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { localDay, parseCalendar } from '../calendar.mjs';

const source = 'https://getnotionembed.com/embed/7ec4fefa-1755-4dfd-90d4-241877ad9ad4?mode=Light';
const destination = process.argv[2];
if (!destination) throw new Error('Oppgje filnamn for kalenderdata.');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const response = await page.goto(source, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (!response?.ok()) throw new Error('Kalenderkjelda returnerte HTTP ' + response?.status());
  await page.locator('article .notion-text').first().waitFor({ timeout: 30000 });
  const blocks = await page.locator('article .notion-h, article .notion-text').evaluateAll(nodes =>
    nodes.map(node => ({
      heading: node.classList.contains('notion-h'),
      text: node.innerText,
      links: [...node.querySelectorAll('a[href]')]
        .filter(link => !link.getAttribute('href').startsWith('#') && /^https?:/.test(link.href))
        .map(link => ({ href: link.href, label: link.textContent.trim() }))
        .filter(link => link.label)
    }))
  );

  const { events, skipped } = parseCalendar(blocks, localDay());
  if (!events.length || skipped.some(text => /^\d{1,2}\b/.test(text))) {
    throw new Error('Kalenderformatet kunne ikkje lesast. Linjer: ' + skipped.slice(0, 4).join(' | '));
  }
  await writeFile(destination, JSON.stringify({ events }, null, 2) + '\n');
  console.log('Henta ' + events.length + ' arrangement.');
} finally {
  await browser.close();
}
