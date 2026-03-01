require('dotenv').config();
const path = require('path');
const express = require('express');
const { getSettings, saveSettings, getAnalysisByHandle, insertAnalysis } = require('./db');
const { normalizeHandle } = require('./analyzer');
const { analyzeWithProvider } = require('./agent-provider');

const app = express();
const PORT = Number(process.env.PORT || 3024);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

function checkAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'] || req.body.token;
  if (!ADMIN_TOKEN || token === ADMIN_TOKEN) return next();
  return res.status(401).send('Unauthorized admin token');
}

app.get('/', (req, res) => {
  res.render('index', { result: null, input: '' });
});

app.post('/analyze', async (req, res) => {
  const raw = req.body.handle || '';
  const handle = normalizeHandle(raw);

  if (!handle) {
    return res.status(400).render('index', {
      result: { error: 'Please enter a valid @handle.' },
      input: raw
    });
  }

  const cached = getAnalysisByHandle(handle);
  if (cached) {
    return res.render('index', {
      result: { ...cached, fromCache: true },
      input: `@${handle}`
    });
  }

  const settings = getSettings();

  let fresh;
  try {
    fresh = await analyzeWithProvider({ handle, settings });
  } catch (err) {
    console.error('Provider analysis failed, falling back to local:', err.message);
    return res.status(502).render('index', {
      result: {
        error: `Analysis provider failed: ${err.message}. Fix provider config or switch to local in admin.`
      },
      input: `@${handle}`
    });
  }

  let saved;
  try {
    saved = insertAnalysis(fresh);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      saved = getAnalysisByHandle(handle);
    } else {
      throw err;
    }
  }

  return res.render('index', {
    result: { ...saved, fromCache: false },
    input: `@${handle}`
  });
});

app.get('/admin', checkAdmin, (req, res) => {
  const settings = getSettings();
  res.render('admin', {
    settings,
    message: null,
    token: req.query.token || ''
  });
});

app.post('/admin/settings', checkAdmin, (req, res) => {
  const keywords = String(req.body.keywords || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const promptTemplate = String(req.body.promptTemplate || '').trim();
  const provider = String(req.body.provider || 'local').trim();
  const providerModel = String(req.body.providerModel || '').trim();
  const providerBaseUrl = String(req.body.providerBaseUrl || '').trim();

  const settings = saveSettings({
    keywords,
    promptTemplate: promptTemplate || 'Parody prompt not configured yet.',
    provider,
    providerModel,
    providerBaseUrl
  });

  res.render('admin', {
    settings,
    message: 'Settings saved. New handles will use these values.',
    token: req.query.token || req.body.token || ''
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sleeper-cell-parody' });
});

app.listen(PORT, () => {
  console.log(`Sleeper Cell Parody running on http://localhost:${PORT}`);
});
