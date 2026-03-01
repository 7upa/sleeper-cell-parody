const ALGO_VERSION = 'v1.1.0-local';

function normalizeHandle(input) {
  if (!input) return '';
  return input.trim().replace(/^@+/, '').toLowerCase();
}

function seededInt(str, max) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % max;
}

function fakeCorpusForHandle(handle) {
  const snippets = [
    `${handle} posted about spreadsheets at 02:11 AM`,
    `${handle} argued about pineapple on pizza for 17 replies`,
    `${handle} said meow under a finance thread`,
    `${handle} posted "phase two" with no context`,
    `${handle} has a suspicious obsession with raccoon logistics`,
    `${handle} posted "all systems nominal" 4 times this week`,
    `${handle} replied "copy that" to a meme`,
    `${handle} debated iced coffee morality`,
    `${handle} entered a thread and said "the sleeper has awakened"`
  ];

  const count = 3 + seededInt(handle, 5);
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    const idx = seededInt(`${handle}-${i}`, snippets.length);
    picked.push(snippets[idx]);
  }
  return picked;
}

function verdictFromScore(score) {
  if (score >= 75) return 'SLEEPER_CELL';
  if (score >= 45) return 'WATCHLIST';
  return 'CLEAR';
}

function analyzeHandleLocal({ handle, keywords, promptTemplate }) {
  const corpus = fakeCorpusForHandle(handle);
  const normalizedKeywords = (keywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);

  const hits = [];
  for (const kw of normalizedKeywords) {
    const hitIn = corpus.filter((line) => line.toLowerCase().includes(kw));
    if (hitIn.length) hits.push({ keyword: kw, count: hitIn.length });
  }

  const hitScore = hits.reduce((acc, h) => acc + h.count * 9, 0);
  const chaos = seededInt(`${handle}-chaos`, 41);
  const score = Math.min(100, hitScore + chaos);
  const confidence = 65 + seededInt(`${handle}-confidence`, 35);

  const reasons = [
    hits.length
      ? `Detected ${hits.length} configured trigger keyword(s) in profile activity.`
      : 'No configured trigger terms found, but chaotic signal model still fired.',
    `Behavioral entropy index: ${chaos}/40`,
    `Comedic prompt profile loaded (${promptTemplate.length} chars).`
  ];

  return {
    handle,
    score,
    verdict: verdictFromScore(score),
    confidence,
    reasons,
    evidence: {
      snippets: corpus,
      keywordHits: hits,
      source: 'local-mock-corpus'
    },
    algorithmVersion: ALGO_VERSION
  };
}

module.exports = {
  normalizeHandle,
  analyzeHandleLocal,
  fakeCorpusForHandle,
  ALGO_VERSION
};
