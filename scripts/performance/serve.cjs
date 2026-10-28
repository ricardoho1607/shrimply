// Serve static production exports with transfer compression, as hosting does.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(process.argv[2]);
const cache = new Map();
http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file + '.html')) file += '.html';
  else if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const ext = path.extname(file);
  const type = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.txt':'text/plain', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2' }[ext] || 'application/octet-stream';
  const compress = /html|javascript|css|json|text\/plain|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '');
  const key = file + ':' + fs.statSync(file).mtimeMs + ':' + compress;
  if (!cache.has(key)) { const bytes = fs.readFileSync(file); cache.set(key, compress ? zlib.gzipSync(bytes) : bytes); }
  const data = cache.get(key);
  res.writeHead(200, { 'Content-Type':type, 'Content-Length':data.length, ...(compress ? {'Content-Encoding':'gzip'} : {}), 'Cache-Control':'no-store' });
  res.end(data);
}).listen(Number(process.argv[3] || 4311), '127.0.0.1');
