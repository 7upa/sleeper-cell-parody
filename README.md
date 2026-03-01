# Sleeper Cell Parody

A parody detector site that analyzes an X handle once, stores the result, and replays the same result forever unless manually reset.

## Features

- Search by `@handle`
- First lookup computes result and caches it
- Future lookups replay cached result for consistency
- Admin page to edit:
  - keyword list
  - prompt template
  - analysis provider (`local` or `grok`)
  - provider model and base URL
- SQLite persistence (no external DB needed)

## Quick Start

```bash
cd sleeper-cell-parody
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3024`

## Admin

Open `http://localhost:3024/admin?token=YOUR_ADMIN_TOKEN`

Admin controls apply only to **new** handles.
Existing handles stay frozen to keep the illusion stable.

## Plugging in Grok (real agent mode)

1. Put your key in `.env`:

```env
GROK_API_KEY=...
```

2. In admin page set:
- Provider: `grok`
- Model: e.g. `grok-beta`
- Base URL: `https://api.x.ai/v1`

3. Save settings.

From that point, new handles will be analyzed by Grok and still cached forever after first run.

## Behavior Notes

- Existing records are immutable by design.
- If two people submit the same new handle simultaneously, unique DB constraint guarantees one canonical record.
- If Grok provider fails, the request returns a clear setup error so you can fix config fast.
