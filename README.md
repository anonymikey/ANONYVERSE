# ANONYVERSE

Netflix-style streaming front-end (static) + Vercel Functions that keep `FRAMEX_API_KEY` on the server.

- `index.html`, `app.js`, `styles.css`: the app. `docs.html`: user documentation (served at `/docs`).
- `api/browse.js`: lists (movies, shows, anime, live TV, sports, genres, search)
- `api/detail.js`: details, cast and episodes
- `api/play.js`: short-lived playback URLs

## Deploy
1. Push to GitHub, import in Vercel (Framework preset: Other, no build command).
2. Set `FRAMEX_API_KEY` in Environment Variables, then redeploy.
3. Bind the FRAMEX key to your site's root domain.
