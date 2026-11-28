# ANONYVERSE

Netflix-style streaming front-end (static) + Vercel Functions. API keys stay on the server.

## Environment variables (Vercel > Settings > Environment Variables)
| Name | Purpose |
|---|---|
| `FRAMEX_API_KEY` | FRAMEX key (built-in provider) |
| `ADMIN_TOKEN` | Admin panel login token (use 24+ random characters) |
| `SITE_URL` | Optional. Your canonical site, e.g. `https://anonymiketech.com` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Added automatically when you connect **Upstash Redis** (Vercel > Storage). Needed so admin settings and usage persist |
| any provider key | Each extra provider reads its key from the env var name you give it in the admin panel |

## Admin panel
Open `/admin`. Providers, routing/failover, live health, endpoints, usage and a tester. Settings are stored in Redis.

## Routes
- `/api/browse`, `/api/detail`, `/api/play`: public, routed through the providers you configure
- `/api/admin`: admin only (signed cookie)
