#!/usr/bin/env node
// Read-only check: does each published claim's sourceExcerpt occur on its linked HTML page?
// A match checks transcription, not whether the passage supports the claim.

import {writeFile} from 'node:fs/promises';

const projectId = 'cxjysvlq';
const dataset = 'production';
const apiVersion = '2025-08-15';
const query = '*[_type == "evidenceClaim"]{_id, sourceExcerpt, sourceLocator, "sourceUrl": source->url}';
const datasetUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?perspective=published&query=${encodeURIComponent(query)}`;
const timeoutMs = 15000;
const maxConcurrent = 4;

function normalize(value) {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
    ndash: '-', mdash: '-', hellip: '…', bull: '•',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return named[key] ?? match;
  });
}

function pageText(html) {
  return normalize(decodeEntities(
    html
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/?(?:p|div|section|li|h[1-6]|br|tr|td|th|ul|ol|article|main|header|footer)\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  ));
}

async function fetchWithTimeout(url) {
  return fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'},
  });
}

async function readSource(url) {
  if (!url) return {error: 'Missing linked source URL'};
  if (!/^https:\/\//i.test(url)) return {error: 'Source URL is not HTTPS'};
  if (/\.pdf(?:[?#]|$)/i.test(url)) return {error: 'PDF: check the original document manually'};
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return {error: `HTTP ${response.status}`};
    const type = response.headers.get('content-type') || '';
    if (!/html/i.test(type)) return {error: `Unsupported content type: ${type || 'unknown'}`};
    const text = pageText(await response.text());
    if (text.length < 300 || /verify you are human|checking your browser|enable javascript to continue/i.test(text.slice(0, 2000))) {
      return {error: 'Page blocked or has no readable article text'};
    }
    return {text};
  } catch (error) {
    return {error: error?.message || String(error)};
  }
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

async function main() {
  const response = await fetchWithTimeout(datasetUrl);
  if (!response.ok) throw new Error(`Sanity query failed: HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.result)) throw new Error('Sanity query did not return a claim list');
  const claims = payload.result.sort((a, b) => a._id.localeCompare(b._id));
  const urls = [...new Set(claims.map(claim => claim.sourceUrl).filter(Boolean))];
  const pages = new Map();
  let next = 0;
  await Promise.all(Array.from({length: Math.min(maxConcurrent, urls.length)}, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      pages.set(url, await readSource(url));
    }
  }));

  const rows = claims.map(claim => {
    const passage = claim.sourceExcerpt?.trim();
    if (!passage) return {id: claim._id, status: 'NO PASSAGE', url: claim.sourceUrl, detail: 'Empty sourceExcerpt'};
    const page = pages.get(claim.sourceUrl) || {error: 'Missing linked source URL'};
    if (page.error) return {id: claim._id, status: 'UNREADABLE', url: claim.sourceUrl, detail: page.error};
    const found = page.text.includes(normalize(passage.replace(/^\s*[*•-]\s*/, '')));
    if (!found && /pdf/i.test(claim.sourceLocator || '')) {
      return {id: claim._id, status: 'UNREADABLE', url: claim.sourceUrl, detail: 'Passage locator points to a PDF, not the linked HTML landing page'};
    }
    return {id: claim._id, status: found ? 'FOUND' : 'NOT FOUND', url: claim.sourceUrl, detail: found ? '' : 'Exact passage not found in readable HTML'};
  });

  const counts = Object.fromEntries(['FOUND', 'NOT FOUND', 'UNREADABLE', 'NO PASSAGE'].map(status =>
    [status, rows.filter(row => row.status === status).length]));
  console.log(`FOUND ${counts.FOUND} | NOT FOUND ${counts['NOT FOUND']} | UNREADABLE ${counts.UNREADABLE} | NO PASSAGE ${counts['NO PASSAGE']} | TOTAL ${rows.length}`);
  for (const row of rows.filter(row => row.status !== 'FOUND')) {
    console.log(`${row.status}\t${row.id}\t${row.detail}\t${row.url || ''}`);
  }
  if (process.argv.includes('--csv')) {
    const csv = [
      'claim_id,status,source_url,detail',
      ...rows.map(row => [row.id, row.status, row.url, row.detail].map(csvCell).join(',')),
    ].join('\n') + '\n';
    await writeFile('verify-report.csv', csv, 'utf8');
    console.log('Wrote verify-report.csv');
  }
}

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
