const { analyzeHandleLocal, fakeCorpusForHandle } = require('./analyzer');

const AGENT_VERSION = 'v1.1.0-agent';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildAgentPrompt({ handle, keywords, promptTemplate, snippets }) {
  return [
    promptTemplate,
    '',
    'Return strict JSON with this exact shape:',
    '{"score":0-100,"verdict":"CLEAR|WATCHLIST|SLEEPER_CELL","confidence":0-100,"reasons":["..."],"evidence":{"snippets":["..."],"keywordHits":[{"keyword":"...","count":1}]}}',
    '',
    `Handle: @${handle}`,
    `Configured keywords: ${keywords.join(', ') || '(none)'}`,
    `Candidate snippets: ${JSON.stringify(snippets)}`
  ].join('\n');
}

async function analyzeWithGrok({ handle, settings }) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing GROK_API_KEY or XAI_API_KEY env var for provider=grok');
  }

  const snippets = fakeCorpusForHandle(handle);
  const prompt = buildAgentPrompt({
    handle,
    keywords: settings.keywords,
    promptTemplate: settings.promptTemplate,
    snippets
  });

  const baseUrl = (settings.providerBaseUrl || 'https://api.x.ai/v1').replace(/\/$/, '');
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.providerModel || 'grok-beta',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a strict JSON API for parody classification.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Grok request failed (${resp.status}): ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(text);

  if (!parsed) {
    throw new Error('Agent returned non-JSON content');
  }

  return {
    handle,
    score: Number(parsed.score) || 0,
    verdict: parsed.verdict || 'WATCHLIST',
    confidence: Number(parsed.confidence) || 70,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Agent returned partial reasoning.'],
    evidence: {
      ...(parsed.evidence || {}),
      source: 'grok'
    },
    algorithmVersion: `${AGENT_VERSION}:${settings.providerModel || 'grok-beta'}`
  };
}

async function analyzeWithProvider({ handle, settings }) {
  if (settings.provider === 'grok') {
    return analyzeWithGrok({ handle, settings });
  }

  return analyzeHandleLocal({
    handle,
    keywords: settings.keywords,
    promptTemplate: settings.promptTemplate
  });
}

module.exports = {
  analyzeWithProvider
};
