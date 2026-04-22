// Local dev server for Skylar Caller CRM.
// Serves static files + routes /api/* to the handlers under /api.
// Each /api/*.js exports a (req, res) handler — same signature as
// Vercel serverless functions, so it deploys 1:1 to Vercel.
//
// Run with: npm run dev

try { require('dotenv').config(); } catch { /* dotenv optional */ }

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.jsx':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.csv':  'text/csv; charset=utf-8',
  '.map':  'application/json',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      const ctype = (req.headers['content-type'] || '').split(';')[0].trim();
      try {
        if (ctype === 'application/json') return resolve(JSON.parse(raw));
        if (ctype === 'application/x-www-form-urlencoded') {
          const out = {};
          for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
          return resolve(out);
        }
      } catch {}
      resolve({ _raw: raw });
    });
    req.on('error', () => resolve({}));
  });
}

async function handleApi(req, res, pathname) {
  // pathname is like "/api/token" or "/api/recording/stream"
  // map the first segment after /api/ to api/<segment>.js
  const rest = pathname.replace(/^\/api\//, '');
  const [first] = rest.split('/');
  const handlerPath = path.join(ROOT, 'api', `${first}.js`);
  if (!fs.existsSync(handlerPath)) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: `No handler for /api/${first}` }));
    return;
  }

  // mimic Vercel's req extensions
  const parsed = url.parse(req.url, true);
  req.query = parsed.query || {};
  req.body = await readBody(req);

  // shim res.json / res.status used by some handlers (ours uses the raw API)
  try {
    // bust require cache during dev so edits take effect without restart
    delete require.cache[require.resolve(handlerPath)];
    const handler = require(handlerPath);
    const fn = handler.default || handler;
    await fn(req, res);
  } catch (e) {
    console.error(`[api ${first}]`, e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }
}

function handleStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // don't let the browser snoop into .env etc.
  const basename = path.basename(filePath);
  if (basename.startsWith('.env') || basename === 'package-lock.json') {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end(`Not found: ${rel}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
    handleStatic(req, res, pathname);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});

server.listen(PORT, () => {
  const here = `http://localhost:${PORT}/`;
  const configured = !!(process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('ACxxxx'));
  console.log(`\n  Skylar Caller CRM`);
  console.log(`  ready at ${here}`);
  console.log(`  twilio:  ${configured ? 'configured ✓' : 'not configured — see .env.example + SETUP.md'}`);
  console.log(`\n  (press Ctrl+C to stop)\n`);
});
