const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  reasons_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  keywords_json TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'local',
  provider_model TEXT NOT NULL DEFAULT 'grok-beta',
  provider_base_url TEXT NOT NULL DEFAULT 'https://api.x.ai/v1',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function ensureSettingsColumn(name, ddl) {
  const cols = db.prepare('PRAGMA table_info(settings)').all();
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE settings ADD COLUMN ${ddl}`);
  }
}

ensureSettingsColumn('provider', "provider TEXT NOT NULL DEFAULT 'local'");
ensureSettingsColumn('provider_model', "provider_model TEXT NOT NULL DEFAULT 'grok-beta'");
ensureSettingsColumn('provider_base_url', "provider_base_url TEXT NOT NULL DEFAULT 'https://api.x.ai/v1'");

const getSettingsStmt = db.prepare('SELECT * FROM settings WHERE id = 1');
const upsertSettingsStmt = db.prepare(`
INSERT INTO settings (
  id, keywords_json, prompt_template, provider, provider_model, provider_base_url, updated_at
)
VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  keywords_json=excluded.keywords_json,
  prompt_template=excluded.prompt_template,
  provider=excluded.provider,
  provider_model=excluded.provider_model,
  provider_base_url=excluded.provider_base_url,
  updated_at=datetime('now')
`);

const defaultKeywords = [
  'activate',
  'activation',
  'the sleeper has awakened',
  'pineapple on pizza',
  'meow',
  'john',
  'raccoon protocol',
  'phase two'
];

const defaultPrompt = `You are a parody intelligence classifier.
Given a handle and text snippets, output a comedic but structured risk profile with score, verdict, and short reasons.
Output strict JSON: {score, verdict, confidence, reasons, evidence}`;

function getSettings() {
  let row = getSettingsStmt.get();
  if (!row) {
    upsertSettingsStmt.run(
      JSON.stringify(defaultKeywords),
      defaultPrompt,
      'local',
      'grok-beta',
      'https://api.x.ai/v1'
    );
    row = getSettingsStmt.get();
  }

  return {
    keywords: JSON.parse(row.keywords_json),
    promptTemplate: row.prompt_template,
    provider: row.provider || 'local',
    providerModel: row.provider_model || 'grok-beta',
    providerBaseUrl: row.provider_base_url || 'https://api.x.ai/v1',
    updatedAt: row.updated_at
  };
}

function saveSettings({ keywords, promptTemplate, provider, providerModel, providerBaseUrl }) {
  upsertSettingsStmt.run(
    JSON.stringify(keywords),
    promptTemplate,
    provider || 'local',
    providerModel || 'grok-beta',
    providerBaseUrl || 'https://api.x.ai/v1'
  );
  return getSettings();
}

function getAnalysisByHandle(handle) {
  const row = db.prepare('SELECT * FROM analyses WHERE handle = ?').get(handle);
  if (!row) return null;
  return {
    handle: row.handle,
    score: row.score,
    verdict: row.verdict,
    confidence: row.confidence,
    reasons: JSON.parse(row.reasons_json),
    evidence: JSON.parse(row.evidence_json),
    algorithmVersion: row.algorithm_version,
    createdAt: row.created_at
  };
}

function insertAnalysis(record) {
  const stmt = db.prepare(`
  INSERT INTO analyses (
    handle, score, verdict, confidence, reasons_json, evidence_json, algorithm_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.handle,
    record.score,
    record.verdict,
    record.confidence,
    JSON.stringify(record.reasons),
    JSON.stringify(record.evidence),
    record.algorithmVersion
  );

  return getAnalysisByHandle(record.handle);
}

module.exports = {
  db,
  getSettings,
  saveSettings,
  getAnalysisByHandle,
  insertAnalysis
};
