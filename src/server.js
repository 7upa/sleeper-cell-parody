require('dotenv').config();
const path = require('path');
const express = require('express');
const { getSettings, saveSettings, getAnalysisByHandle, insertAnalysis, dbMode } = require('./db');
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

app.get('/', (_req, res) => {
  res.render('index', { result: null, input: '' });
});

async function performAnalysis(raw) {
  const handle = normalizeHandle(raw || '');

  if (!handle) {
    return {
      status: 400,
      input: raw,
      result: { error: 'Please enter a valid @handle.' }
    };
  }

  let cached;
  try {
    cached = await getAnalysisByHandle(handle);
  } catch (err) {
    return {
      status: 500,
      input: `@${handle}`,
      result: { error: `Storage read failed: ${err.message}` }
    };
  }

  if (cached) {
    return {
      status: 200,
      input: `@${handle}`,
      result: { ...cached, fromCache: true }
    };
  }

  let settings;
  try {
    settings = await getSettings();
  } catch (err) {
    return {
      status: 500,
      input: `@${handle}`,
      result: { error: `Settings load failed: ${err.message}` }
    };
  }

  let fresh;
  try {
    fresh = await analyzeWithProvider({ handle, settings });
  } catch (err) {
    return {
      status: 502,
      input: `@${handle}`,
      result: {
        error: `Analysis provider failed: ${err.message}. Fix provider config or switch to local in admin.`
      }
    };
  }

  let saved;
  try {
    saved = await insertAnalysis(fresh);
  } catch (err) {
    if (String(err.message || '').includes('duplicate') || String(err.code || '') === '23505') {
      saved = await getAnalysisByHandle(handle);
    } else {
      return {
        status: 500,
        input: `@${handle}`,
        result: { error: `Storage write failed: ${err.message}` }
      };
    }
  }

  return {
    status: 200,
    input: `@${handle}`,
    result: { ...saved, fromCache: false }
  };
}

app.post('/analyze', async (req, res) => {
  const payload = await performAnalysis(req.body.handle || '');
  return res.status(payload.status).render('index', {
    result: payload.result,
    input: payload.input
  });
});

app.post('/api/analyze', async (req, res) => {
  const payload = await performAnalysis(req.body.handle || '');
  return req.app.render('partials_results', { result: payload.result }, (err, html) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    return res.status(payload.status).json({
      ok: payload.status < 400,
      input: payload.input,
      result: payload.result,
      html
    });
  });
});

app.get('/admin', checkAdmin, async (req, res) => {
  const settings = await getSettings();
  res.render('admin', {
    settings,
    message: null,
    token: req.query.token || ''
  });
});

app.post('/admin/settings', checkAdmin, async (req, res) => {
  const keywords = String(req.body.keywords || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const promptTemplate = String(req.body.promptTemplate || '').trim();
  const provider = String(req.body.provider || 'local').trim();
  const providerModel = String(req.body.providerModel || '').trim();
  const providerBaseUrl = String(req.body.providerBaseUrl || '').trim();

  const settings = await saveSettings({
    keywords,
    promptTemplate: promptTemplate || 'Parody prompt not configured yet.',
    provider,
    providerModel,
    providerBaseUrl
  });

  res.render('admin', {
    settings,
    message: `Settings saved (${dbMode()} storage). New handles will use these values.`,
    token: req.query.token || req.body.token || ''
  });
});

app.post('/admin/reset-analyses', checkAdmin, async (req, res) => {
  const { clearAll } = req.body;
  if (clearAll === 'true') {
    await clearAllAnalyses();
  }
  const settings = await loadSettings();
  res.render('admin', {
    settings,
    message: clearAll === 'true' ? 'All cached analyses cleared. Fresh scans will compute new scores.' : 'No action taken.',
    token: req.query.token || req.body.token || ''
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sleeper-cell-parody', db: dbMode() });
});

app.listen(PORT, () => {
  console.log(`Sleeper Cell Parody running on http://localhost:${PORT} (db=${dbMode()})`);
});
