# Framex integration

The Framex integration is server-only. The Render API reads `FRAMEX_API_KEY` and returns only short-lived signed playback URLs to authenticated ANONYVERSE clients.

The production database is Supabase Postgres. Render receives the Supabase `DATABASE_URL`; ANONYVERSE does not currently require Supabase client keys because it talks to the database through Drizzle on the server.

## Environment variables

```bash
FRAMEX_API_KEY=fxk_live_replace_me
FRAMEX_BASE_URL=https://framex.wolvarex.com/api
FRAMEX_TIMEOUT_MS=10000
FRAMEX_PLAYBACK_ENABLED=false
FRAMEX_APPROVED_CONTENT_IDS=
```

`FRAMEX_APPROVED_CONTENT_IDS` is a comma-separated server-side allowlist. Use the source-aware form, for example `moviebox:12345`. Playback requires both `FRAMEX_PLAYBACK_ENABLED=true` and a matching approved reference. This is a temporary rollout gate until provider rights have been reviewed and persisted in the database policy model.

## API contract

The protected tRPC mutation is `playback.framexSession`:

```json
{
  "source": "moviebox",
  "contentId": "12345",
  "resolution": "1080",
  "season": 1,
  "episode": 2
}
```

The response contains:

```json
{
  "url": "https://...",
  "expiresAt": "2026-11-24T01:20:00Z",
  "expiresIn": 600,
  "source": "moviebox",
  "contentId": "12345"
}
```

The website and mobile player must refresh before expiry, recover from a media error, and restore the prior position. They must not persist or cache the signed URL.

## Security rules

- Never expose `FRAMEX_API_KEY` to Vercel browser code or mobile configuration.
- Never accept arbitrary upstream URLs from a client.
- Do not enable `download` in the client contract.
- Keep `source` and `contentId` together; do not rely on legacy `id` values.
- Do not enable public playback until Framex rights and content-specific approval are confirmed.
