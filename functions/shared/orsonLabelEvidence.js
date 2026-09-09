'use strict';
const https = require('node:https');
const dns = require('node:dns').promises;
const { isIP } = require('node:net');
const { createHash } = require('node:crypto');
const publicIPv4 = address => {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
};
const pageText = html => String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, code) => {
    const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
  }).replace(/&(amp|nbsp|quot|apos|lt|gt);/g, (_m, name) => ({ amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>' }[name]))
  .replace(/\s+/g, ' ').trim();
const fetchLabelPage = async rawUrl => {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isIP(url.hostname)) throw new Error('unsafe_source');
  return new Promise((resolve, reject) => {
    // Pin the connection to a public IPv4 result; no redirect or DNS-rebinding path.
    const request = https.get(url, { headers: { Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { all: true, family: 4 }).then(addresses => {
          if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) return callback(new Error('unsafe_source'));
          const chosen = addresses[0];
          if (options.all) callback(null, [chosen]); else callback(null, chosen.address, 4);
        }, callback);
      },
    }, response => {
      if (response.statusCode !== 200 || !/^text\/(html|plain)\b/i.test(response.headers['content-type'] || '')
        || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.resume(); request.destroy(new Error('unsupported_label_source')); return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 1024 * 1024) request.destroy(new Error('label_too_large')); else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve(pageText(Buffer.concat(chunks).toString('utf8'))));
    });
    const timer = setTimeout(() => request.destroy(new Error('label_timeout')), 8000);
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
  });
};
const captureLabelEvidence = async (evidence, fetchPage = fetchLabelPage) => {
  const snapshots = [];
  const pages = new Map();
  for (const key of ['identity', 'composition', 'aquaculture_use']) {
    const claim = evidence?.[key];
    if (!claim || typeof claim.quote !== 'string') return null;
    if (!pages.has(claim.url)) pages.set(claim.url, await fetchPage(claim.url));
    const text = pages.get(claim.url);
    const quote = pageText(claim.quote);
    if (quote.length < 15 || !text.includes(quote)) return null;
    snapshots.push({ claim: key, url: claim.url, quote, content_hash: createHash('sha256').update(text).digest('hex') });
  }
  return snapshots;
};
module.exports = { publicIPv4, pageText, captureLabelEvidence, fetchLabelPage };
