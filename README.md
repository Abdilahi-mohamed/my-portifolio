# Abdilahi Portfolio

A responsive React and TypeScript portfolio with a Node.js API. MongoDB stores portfolio content, admin credentials/sessions, and contact submissions. Uploaded media is stored in Backblaze B2 using its S3-compatible API.

## Project layout

- `frontend/` — React, Vite, TypeScript, and the public portfolio/admin UI.
- `backend/src/` — Node.js API, MongoDB persistence, admin authentication, and B2 integration.
- `backend/scripts/migrate-mongodb-to-files.mjs` — Read-only export utility for older MongoDB installations.
- `backend/data/` — Legacy JSON and uploaded images retained for migration (ignored by Git).
- `backend/.env.example` — Backend environment variable template.
- `shared/portfolio.default.json` — Local-development starter content; MongoDB seeding requires explicit opt-in.

## First-time setup

Install dependencies:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Copy `backend/.env.example` to `backend/.env`. Configure `MONGODB_URI` (and optionally `MONGODB_DB`), `ADMIN_USERNAME`, a private `ADMIN_PASSWORD`, and `FRONTEND_ORIGIN`. Create a Backblaze B2 bucket and a bucket-scoped application key, then set `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET_NAME`, `B2_ACCESS_KEY_ID`, and `B2_APPLICATION_KEY`. The endpoint and region must match the bucket's Backblaze region. Never put database or B2 credentials in frontend environment variables or commit `.env`. The backend requires Node.js 20.19 or newer.

`MONGODB_URI` is required in development and production; the backend never serves an editable file-backed portfolio. Production also requires a fully configured B2 bucket. If the MongoDB portfolio collection is empty, the backend imports an existing `portfolio.json` instead of overwriting records. Starter content is seeded only when explicitly enabled with `PORTFOLIO_INIT_DEFAULTS=true`. Existing admin account, active sessions, and contact messages are imported only when their corresponding MongoDB collections are empty. Once configured, startup copies supported legacy images from `backend/data/uploads/` to B2 without changing their `/api/media/<filename>` URLs; production media reads come from B2, not the server filesystem.

### Existing MongoDB or JSON data

The backend uses the MongoDB collections `portfolio` (`_id: "primary"`), `adminAccounts` (`_id: "primary"`), `adminSessions`, `contactMessages`, and `migrationMetadata` for one-time import tracking. Existing MongoDB records take precedence and are never replaced with local or default data. When the portfolio record is absent, an existing local portfolio is imported once. The older `migrate-mongodb-to-files.mjs` utility is for read-only inspection/export only; it is not part of normal startup:

```sh
node backend/scripts/migrate-mongodb-to-files.mjs
```

This optional utility exports portfolio/account/session/contact data and supported legacy GridFS images. It does not alter MongoDB. The application itself fails startup on a database connection error and never falls back to empty/default content in production.

## Run the application

Start the backend API:

```sh
npm run dev
```

In another terminal, start the frontend:

```sh
npm run dev --prefix frontend
```

`npm run web` starts only the React frontend and opens the public site in Chrome on Windows (or the default browser on macOS/Linux). Run it from the repository root.

## Persistence, migration, and deployment

- Portfolio content is stored in MongoDB as one validated `portfolio` document, and saves update only that document's `content` field. The dashboard loads the current record before editing; a failed database read or write is reported as an error and does not initialize defaults.
- Admin password hashes, sessions, and contact submissions use `adminAccounts`, `adminSessions`, and `contactMessages`. Passwords remain salted scrypt hashes. MongoDB data is independent of source code, builds, and deployments.
- `DATA_DIRECTORY` identifies legacy JSON for one-time imports. Keep the old directory until MongoDB content is verified; do not delete the MongoDB database or its collections.
- B2 object keys back profile photos, cover photos, project screenshots, certificate images, and experience images. The database stores stable `/api/media/<key>` references, and the backend serves those objects without exposing B2 credentials to the browser.
- Do not use a Render ephemeral filesystem for portfolio data or uploads. Back up MongoDB and B2 independently using their provider-supported backup/versioning facilities.
- B2 private bucket objects are served through the backend media route, so the frontend never receives storage credentials. Use an application key scoped to the portfolio bucket and grant only the read, write, and delete capabilities needed by this API.

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API readiness and current database/media storage modes. |
| `GET` | `/api/health/storage` | Storage-mode health check. |
| `GET` | `/api/portfolio` | Public portfolio content. |
| `GET` | `/api/media/:filename` | Retrieve an uploaded image from B2 (or a legacy local image). |
| `POST` | `/api/contact` | Validate and persist a contact submission in MongoDB. |
| `GET` | `/api/admin/session` | Check admin session/configuration status. |
| `POST` | `/api/admin/login` | Sign in and issue an HttpOnly session cookie. |
| `POST` | `/api/admin/logout` | Revoke the current admin session. |
| `POST` | `/api/admin/password` | Change the admin password from the portfolio settings menu after verifying admin credentials. |
| `POST` | `/api/admin/uploads` | Upload an authenticated image to persistent B2 storage (maximum 8 MB). |
| `GET` | `/api/admin/portfolio` | Load portfolio content in the CMS. |
| `PUT` | `/api/admin/portfolio` | Validate and update the MongoDB portfolio document. |

## Build

```sh
npm run build
```

## Deploy to Render

The backend can serve the built frontend as well as the API. For a single Render **Web Service**, set the repository root directory to the repository root, not `backend/`:

**Build Command**

```sh
npm ci --prefix backend && npm ci --prefix frontend && npm run build
```

**Start Command**

```sh
npm start --prefix backend
```

The server serves the frontend for `/`, `/admin`, and other client-side routes, while keeping `/api/*` on the API. Configure `MONGODB_URI`, optional `MONGODB_DB`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_AUTH_DISABLED=false`, `FRONTEND_ORIGIN`, and all `B2_*` values in Render's environment settings. Set the Render Node version to 20.19 or newer. Do not rely on a Render disk for active portfolio data or uploads; `DATA_DIRECTORY` can point to an existing legacy JSON volume for the one-time import. In production, the frontend sends API requests directly to `https://my-portifolio-3fo7.onrender.com`; no Vercel API proxy or `VITE_API_URL` setting is required.

If deploying the frontend as a separate Render **Static Site**, configure a dashboard rewrite rule with source `/*`, destination `/index.html`, and action **Rewrite** so direct visits and refreshes on `/admin` load the React app. Set `FRONTEND_ORIGIN` on the backend to the static site's exact origin.

For a Vercel frontend, set the project's root directory to `frontend/` and set the frontend build environment variable `VITE_API_URL=https://my-portifolio-3fo7.onrender.com`. Vite embeds this public API base URL into the frontend build; it is not a secret. The frontend also defaults to this Render URL in production if the variable is omitted. The included `frontend/vercel.json` only rewrites frontend routes such as `/admin` to the SPA entry point; API calls go directly from the user's browser to Render and are not proxied by Vercel. The production origin `https://my-portifolio-sigma-sooty.vercel.app` is allowed by default. For any other deployed Vercel domain, set `FRONTEND_ORIGIN` in Render to the exact frontend origin (comma-separated if multiple domains are used), so the backend permits direct browser requests with credentials. Redeploy the backend after changing its origin allowlist or environment settings. Do not put B2 keys or other backend secrets in Vercel.

For separate frontend/backend deployments, when the admin UI and API use separate HTTPS domains, the session cookie uses cross-site `SameSite=None; Secure` settings.
