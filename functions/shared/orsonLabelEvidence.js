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

const fetchLabelPage = async (rawUrl, options = {}) => {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isIP(url.hostname)) throw new Error('unsafe_source');
  const signal = options?.signal;
  if (signal?.aborted) throw new Error('label_abort');

  let remainingMs = 8000;
  if (options?.deadlineMs && Number.isFinite(options.deadlineMs)) {
    const diff = options.deadlineMs - Date.now();
    if (diff <= 0) throw new Error('label_timeout');
    remainingMs = Math.min(8000, diff);
  }

  return new Promise((resolve, reject) => {
    let timer;
    let onAbort;
    const request = https.get(url, {
      headers: { Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      lookup: (hostname, lookupOptions, callback) => {
        dns.lookup(hostname, { all: true, family: 4 }).then(addresses => {
          if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) return callback(new Error('unsafe_source'));
          const chosen = addresses[0];
          if (lookupOptions.all) callback(null, [chosen]); else callback(null, chosen.address, 4);
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

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    };

    request.on('error', reject);
    request.on('close', cleanup);

    onAbort = () => request.destroy(new Error('label_abort'));
    if (signal) {
      if (signal.aborted) {
        request.destroy(new Error('label_abort'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(() => request.destroy(new Error('label_timeout')), remainingMs);
  });
};

const captureLabelEvidence = async (evidence, fetchPage = fetchLabelPage, options = {}) => {
  const signal = options?.signal;
  if (signal?.aborted) return null;

  const claims = ['identity', 'composition', 'aquaculture_use'];
  const validated = {};

  for (const key of claims) {
    const claim = evidence?.[key];
    if (!claim || typeof claim.quote !== 'string' || typeof claim.url !== 'string') return null;
    const quote = pageText(claim.quote);
    if (quote.length < 15) return null;
    validated[key] = { url: claim.url, quote };
  }

  const localCache = new Map();
  const uniqueUrls = [...new Set(claims.map(key => validated[key].url))];

  try {
    await Promise.all(uniqueUrls.map(async url => {
      if (signal?.aborted) throw new Error('label_abort');
      const text = await fetchPage(url, options);
      if (typeof text !== 'string') throw new Error('invalid_label_text');
      localCache.set(url, text);
    }));
  } catch {
    return null;
  }

  if (signal?.aborted) return null;

  const snapshots = [];
  for (const key of claims) {
    const { url, quote } = validated[key];
    const text = localCache.get(url);
    if (!text || !text.includes(quote)) return null;
    snapshots.push({
      claim: key,
      url,
      quote,
      content_hash: createHash('sha256').update(text).digest('hex'),
    });
  }

  return snapshots;
};

module.exports = { publicIPv4, pageText, captureLabelEvidence, fetchLabelPage };
