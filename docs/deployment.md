## Production backend and database

The API runs on Render and the database runs on Supabase Postgres. Set `DATABASE_URL` in Render to the Supabase Session Pooler connection string for the production service, or use the Direct connection string when the Render region/network supports it. Keep the password URL-encoded and use the SSL parameters supplied by Supabase.

The repository uses Drizzle's PostgreSQL dialect and `postgres-js`. Apply the checked-in baseline migration from a trusted environment with:

```bash
DATABASE_URL="<supabase-connection-string>" pnpm db:push
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` unless a future feature explicitly uses Supabase client APIs. The current backend uses Supabase only as Postgres; authentication remains ANONYVERSE's existing Manus OAuth/session flow.

## Approved mobile release manifest

The backend exposes `GET /api/releases/approved`. It returns only records with `status=approved`; when no record exists it returns an empty list. The website Download Centre reads this endpoint and shows the signed APK, release notes, minimum requirement and SHA-256 checksum only after approval. The database table is `mobile_releases`.

The Android build and signing step belongs to the Manus Dashboard for this fixed managed Expo project. The source/configuration and migration are prepared, but an APK is not claimed until the Dashboard Android build returns a real artifact. After the signed APK is available, create an admin release record with its download URL, version, notes, minimum requirement and checksum, approve it, then verify `/download` and installation on a test Android device.
