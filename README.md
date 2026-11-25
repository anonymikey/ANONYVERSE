# ANONYVERSE

Static front-end (`index.html`) plus two Vercel Functions that keep `FRAMEX_API_KEY` on the server.

- `GET /api/catalog?section=trending|popular-movies|popular-series|latest-movies|latest-series` or `?q=term`
- `GET /api/stream?id=CONTENT_ID&resolution=1080[&se=1&ep=1][&download=1]` returns `{ url, expiresAt, expiresIn }`

## Deploy
1. Push this folder to GitHub and import the repo in Vercel (Framework preset: Other, no build command).
2. Add `FRAMEX_API_KEY` under Project Settings > Environment Variables, then redeploy.
3. In the FRAMEX dashboard, bind the key to your site's registrable root domain (subdomains are included).
   If you only use a `*.vercel.app` address, a custom domain is the safer choice.

## Local dev
`npm i -g vercel`, copy `.env.example` to `.env.local`, then run `vercel dev`.
