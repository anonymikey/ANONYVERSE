# ANONYVERSE rebuild plan for Framex

## Recommendation

Use Framex as a server-side content and playback provider behind an ANONYVERSE provider adapter. Do not make the web or mobile clients call Framex directly, and do not treat Framex as ANONYVERSE’s database, authentication system, or entitlement system.

The existing repository is already a suitable starting point. It is a pnpm monorepo with an Expo Router / React Native application at the root, a Next.js website in `apps/web`, shared packages, an Express/tRPC backend, Drizzle migrations, and a provider-management foundation. The repository currently serves a clearly labelled fictional demo catalogue and has not yet connected a real provider. [1]

The preferred deployment split is:

- **Vercel:** Next.js website and public SEO pages.
- **Render:** Express/tRPC API, provider adapter, authentication/session endpoints, playback-session endpoints, background refresh/sync jobs, and admin operations.
- **Database:** Use Supabase Postgres with Drizzle's PostgreSQL dialect. Render connects through the Supabase connection string; the application keeps database access server-side.
- **Mobile:** Expo/React Native application distributed through EAS builds and the Apple App Store/Google Play. Mobile releases must remain explicit release operations; a Vercel deployment must never be treated as a mobile release.

## What Framex provides

The Framex API base URL is `https://framex.wolvarex.com/api`. Content routes accept the `X-API-Key` header or a Framex session. The documentation recommends keeping the key on the server, authorizing the registrable root domain, and returning only a short-lived playback URL to the browser. [2]

The catalog surface includes MovieBox v1 and Showbox v2 discovery routes for trending, popular, latest, upcoming, search, details, categories, and genres. Search results expose a canonical `contentId` and a `source` value, so ANONYVERSE must preserve both rather than assuming that one ID format works for every source. [2]

Playback is a separate capability from discovery. Framex documents `/api/v1/stream-url`, MovieBox play/download links, proxy source and relay routes, captions/subtitles, AnimeX/Gotaku playback, channel streams, wrestling streams, and sports playback metadata. Most playback URLs are short-lived and normally expire after ten minutes. The client must refresh them proactively and recover the current playback position after refresh or a media error. [2]

Framex also exposes anime, live-TV, wrestling, novels, and sports facades. These should not all be presented as one undifferentiated “Netflix” catalogue. ANONYVERSE should model them as separate capability domains with different UI, playback, metadata, and editorial policies. [2]

## Important production gate

The public Framex documentation does not establish the licensing or redistribution rights for every upstream catalog, stream, replay, download, anime source, channel, or sports source. The advertised `/terms` URL currently returns 404, while the support page only provides a contact form. [3] [4]

Therefore, the first production milestone must be a written provider review with Framex. Before enabling playback or downloads for public users, obtain written confirmation covering commercial use, geographic availability, redistribution/streaming rights, caching, downloads, attribution, takedown handling, age restrictions, sports and live-channel rights, and whether ANONYVERSE may expose Framex proxy URLs to end users. Until then, connect discovery in a controlled environment and keep playback disabled or limited to content for which ANONYVERSE has independently verified rights.

This is not a technical blocker to building the product. It is a release blocker for public playback and downloads.

## Target architecture

### 1. Provider adapter layer

Add a server-only Framex adapter under `server/providers/framex/` implementing the existing provider contract:

- `healthCheck()` — call `/api/healthz` and record latency/status.
- `search(query, page, source)` — call `/api/v1/search` or `/api/v2/search` and normalize results.
- `list(collection, page, filters)` — map trending, popular, latest, upcoming, category, and genre requests.
- `getDetails(ref)` — retain `{ source, contentId, slug, legacyId }` and call the correct v1/v2 detail route.
- `getEpisodes(ref)` — resolve series/anime episodes through the appropriate Framex route.
- `createPlaybackSession(ref, options)` — issue a fresh signed URL or protected relay URL only after ANONYVERSE authorization checks.
- `getSubtitles(ref, options)` — normalize captions and subtitle metadata.
- `normalize(raw, source)` — convert provider payloads into the shared `ContentItem` shape without losing provider references.

Do not place Framex calls in React components, Next.js browser bundles, or the mobile bundle. The adapter reads `FRAMEX_API_KEY` only at Render runtime.

### 2. Render API boundary

Expose an ANONYVERSE-owned API rather than forwarding arbitrary Framex URLs. Suggested routes:

- `GET /api/v1/catalog/home`
- `GET /api/v1/catalog/search?q=&page=&kind=`
- `GET /api/v1/catalog/:source/:contentId`
- `GET /api/v1/catalog/:source/:contentId/episodes`
- `POST /api/v1/playback/session`
- `GET /api/v1/playback/session/:id/refresh`
- `POST /api/v1/progress`
- `GET /api/v1/library`
- `POST /api/v1/library/items`
- `DELETE /api/v1/library/items/:contentId`
- `GET /api/health`

`POST /api/v1/playback/session` should validate the signed-in user, title reference, region/availability policy, device/session limits, and provider approval status before contacting Framex. Return a short-lived session record and the current playback URL. Do not accept an arbitrary upstream URL from a client; this prevents turning ANONYVERSE into an open relay.

The current Express server already has health, OAuth, tRPC, CORS, storage, and release endpoints. Extend that boundary instead of creating a second backend. [1]

### 3. Data model changes

Extend the existing schema with provider references and user playback state:

- `content_items`: keep normalized display fields, but add `providerSource`, `providerContentId`, `providerSlug`, `providerUpdatedAt`, `availabilityState`, and `rightsState`.
- `content_variants`: one row per source, language, season, episode, quality, and playback capability.
- `playback_sessions`: user/device/content/episode, provider, issued time, expiry time, last refresh, and revoked state. Never persist the signed URL itself.
- `viewing_progress`: support episode/season keys, duration, current position, and completed state.
- `provider_health_checks`: latency, status code class, error category, and checked timestamp.
- `provider_policy_reviews`: terms URL, written approval reference, reviewed capabilities, territory, expiration, and reviewer.
- `admin_audit_events`: retain activation, deactivation, playback-policy, and release changes.

Continue storing only `credentialRef` or the secret name in the database. Store the raw Framex key as a Render secret. Never put it in Vercel public variables, mobile configuration, GitHub, logs, screenshots, or database rows. The repository already documents this security boundary. [1]

### 4. Vercel website

The current Next.js website is a good visual baseline, but it currently renders demo data directly from shared code. Replace that source incrementally with a typed server client to the Render API. [1]

Use server-side Next.js fetching for public catalog pages where possible, with controlled caching for metadata. Keep playback-session creation behind a user action and authenticated API call. Vercel must know only `NEXT_PUBLIC_API_BASE_URL`; it must never know `FRAMEX_API_KEY`.

Add:

- SEO-safe title/detail pages using normalized metadata.
- Search with debouncing, pagination, and source-aware IDs.
- Movie, series, anime, live, and sports detail templates rather than one generic detail page.
- A player shell that handles loading, subtitles, errors, expiry refresh, and resume.
- Clear availability labels such as `Available`, `Coming soon`, `Demo`, `Unavailable in your region`, and `Playback unavailable`.
- Legal, privacy, acceptable-use, and content-reporting pages before any public launch.

Do not cache signed playback URLs in Next.js ISR, Vercel edge caches, the database, or browser local storage. Cache normalized metadata only according to the final Framex agreement.

### 5. Mobile application

Keep Expo Router and the current root mobile project. The app should consume the same Render API contract as the website. It should never contain the Framex key or call Framex directly.

Use a native-capable video implementation with HLS support where the selected Framex source requires it. On mobile, the playback session should return a short-lived URL or a protected player URL, plus `expiresAt` and a session identifier. The player should:

1. Save progress by content, season, episode, and profile.
2. Refresh around 90 seconds before expiry when the app is active.
3. Refresh and restore position after a playback error.
4. Re-request a session when the app returns from background after expiry.
5. Respect platform autoplay, audio-focus, picture-in-picture, and background-playback rules.
6. Avoid offline downloads until rights, encryption, storage, expiry, and platform policy are explicitly approved.

Use EAS development builds, preview builds, and production builds. Release Android and iOS independently through an explicit release checklist. The website’s `/download` page should show only approved release records, matching the repository’s existing release-manifest design. [1]

## Recommended product phases

### Phase 0 — provider and rights validation

Create the Framex account and domain-bound API key. Run health, search, detail, episode, subtitle, and playback probes from Render. Capture real response samples without committing secrets. Ask Framex for written terms and capability-specific permission. Do not expose public playback yet.

### Phase 1 — real catalog foundation

Implement the adapter, normalized IDs, metadata cache, search, home rails, detail pages, provider health checks, and admin activation gates. Keep the demo fallback for categories that are not approved or available. Add contract tests using recorded redacted fixtures.

### Phase 2 — playback web and mobile

Implement playback sessions, signed URL refresh, range/HLS behavior, resume progress, subtitle selection, device/session policy, error telemetry, and mobile player integration. Start with one approved MovieBox flow before adding anime, live channels, or sports.

### Phase 3 — differentiated ANONYVERSE experience

Add profiles, taste onboarding, continue watching, collections, recommendations, editorial rails, watch parties or shared lists, notifications, parental controls, accessibility, and a unified cross-device library. These product capabilities are where ANONYVERSE can outperform a simple provider wrapper.

### Phase 4 — scale and reliability

Add background synchronization for popular metadata, circuit breakers, retries with jitter, per-user and per-IP limits, observability, provider failover, image optimization, search indexing, and an incident/takedown workflow. Never hide upstream outages behind infinite retries.

## What “best that Netflix and others” should mean technically

Do not compete only on the number of titles. Build a faster and more trustworthy experience around a stable internal model: one account, one library, reliable progress sync, excellent search, predictable playback recovery, clear availability, fast startup, accessible controls, and editorial discovery that is specific to ANONYVERSE.

The immediate implementation choice is therefore: **preserve the monorepo, make Render the only provider-aware backend, add Framex as a gated adapter, keep Vercel and mobile provider-blind, and require written rights confirmation before public streaming or downloads.**

## References

[1]: https://github.com/anonymikey/ANONYVERSE "ANONYVERSE repository and current architecture"
[2]: https://framex.wolvarex.com/docs "FRAMEX API Reference"
[3]: https://framex.wolvarex.com/terms "FRAMEX terms page attempted during review"
[4]: https://framex.wolvarex.com/support "FRAMEX support page"
