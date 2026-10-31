const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Load .env.local for local development parity with Vercel Environment Variables
const ENV_LOCAL_PATH = path.join(__dirname, '.env.local');
if (fs.existsSync(ENV_LOCAL_PATH)) {
  const envRaw = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  envRaw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const configHandler = require('./api/config');
const dbHandler = require('./api/db');
const uploadHandler = require('./api/upload');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf'
};

function wrapVercelResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  wrapVercelResponse(res);

  if (pathname === '/api/config') {
    return configHandler(req, res);
  }

  if (pathname === '/api/db') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        req.body = body;
        dbHandler(req, res);
      });
      return;
    }
    return dbHandler(req, res);
  }

  if (pathname === '/api/upload') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      req.body = body;
      uploadHandler(req, res);
    });
    return;
  }

  // Mac Apple Mail / Outlook Doğrudan Sürükle-Bırak & Seçili Mail Okuma Köprüsü
  if (pathname === '/api/apple-mail') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const jxaScript = `
      function run() {
        var results = [];
        try {
          var mailApp = Application('Mail');
          if (mailApp.running()) {
            var sel = mailApp.selection();
            for (var i = 0; i < sel.length; i++) {
              var m = sel[i];
              var attNames = [];
              try {
                var atts = m.mailAttachments();
                for (var j = 0; j < atts.length; j++) {
                  attNames.push(atts[j].name());
                }
              } catch (e) {}
              results.push({
                subject: m.subject() || 'Konusuz E-posta',
                sender: m.sender() || '',
                date: String(m.dateReceived() || ''),
                content: (m.content() || '').slice(0, 8000),
                attachments: attNames
              });
            }
          }
        } catch (err) {}
        return JSON.stringify({ ok: true, emails: results });
      }
    `;

    execFile('osascript', ['-l', 'JavaScript', '-e', jxaScript], { timeout: 8000 }, (err, stdout) => {
      if (err) {
        return res.status(200).json({ ok: false, emails: [], error: err.message });
      }
      try {
        const parsed = JSON.parse(stdout.trim() || '{"ok":true,"emails":[]}');
        return res.status(200).json(parsed);
      } catch (parseErr) {
        return res.status(200).json({ ok: false, emails: [] });
      }
    });
    return;
  }

  // Serve static files from /public (identical to Vercel static output)
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexHtml).pipe(res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DealRoom Cloud-Native Dev Server running at http://0.0.0.0:${PORT}`);
});
