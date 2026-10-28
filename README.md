# Abdilahi Portfolio

A responsive React and TypeScript portfolio with a Node.js API. Portfolio content and admin/contact data are persisted as JSON files; uploaded media is stored in Backblaze B2 using its S3-compatible API.

## Project layout

- `frontend/` — React, Vite, TypeScript, and the public portfolio/admin UI.
- `backend/src/` — Node.js API, file-backed data storage, admin authentication, and B2 integration.
- `backend/scripts/migrate-mongodb-to-files.mjs` — Optional, read-only one-time export for installations with existing MongoDB data.
- `backend/data/` — Persistent JSON data and legacy uploaded images (ignored by Git).
- `backend/.env.example` — Backend environment variable template.
- `shared/portfolio.default.json` — Initial content used only if no portfolio JSON exists.

## First-time setup

Install dependencies:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Copy `backend/.env.example` to `backend/.env`. Configure `ADMIN_USERNAME`, a private `ADMIN_PASSWORD`, and `FRONTEND_ORIGIN`. Create a Backblaze B2 bucket and a bucket-scoped application key, then set `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET_NAME`, `B2_ACCESS_KEY_ID`, and `B2_APPLICATION_KEY`. The endpoint and region must match the bucket's Backblaze region. Never put B2 credentials in frontend environment variables or commit `.env`.

The backend starts without B2 credentials to serve existing local media during setup, but image uploads are disabled until all B2 settings are configured. A partial B2 configuration prevents startup. Once configured, startup copies supported legacy images from `backend/data/uploads/` to the bucket without changing their existing `/api/media/<filename>` URLs. The local copies are retained as a fallback and are not deleted by migration.

### Migrate a previous MongoDB installation

If the current portfolio or admin account has newer data in MongoDB than the local JSON files, first stop the old backend and keep its existing `MONGODB_URI` (and optional `MONGODB_DB`) in `backend/.env`. Temporarily install the migration-only driver, then run the read-only export:

```sh
npm install --prefix backend --no-save --package-lock=false mongodb
node backend/scripts/migrate-mongodb-to-files.mjs
npm prune --prefix backend
```

The script exports the portfolio, admin account hash, active sessions, contact messages, and supported GridFS images. It does not alter MongoDB. Existing local files that differ are backed up under `DATA_DIRECTORY/migration-backup/`. Configure B2 before starting the new backend so it can copy the exported image files into the bucket. If the MongoDB host is unreachable, the script fails before changing data files; the existing local JSON and image files remain available.

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

- `backend/data/portfolio.json` is the primary portfolio store. Existing content is reused; `shared/portfolio.default.json` seeds it only when the file is absent.
- Admin password hashes, admin sessions, and contact submissions are stored in `admin-password.json`, `admin-sessions.json`, and `contact-messages.json` within `DATA_DIRECTORY`. Passwords are stored as salted scrypt hashes.
- JSON writes use a serialized in-process queue and atomic temporary-file replacement. The backend must run as a single instance against one persistent, writable data directory. This is not a distributed lock, so do not mount the same JSON directory in multiple backend instances.
- Configure `DATA_DIRECTORY` to a persistent volume on production hosts. Ephemeral filesystems lose JSON data on redeploy/restart. Back up the data directory separately. B2 stores media objects, not structured content.
- Existing local uploads are copied to B2 on first startup with working credentials and remain on disk as a fallback. Configure B2 before using image uploads in the admin dashboard.
- The running project no longer uses a database or database driver. The optional exporter is the only migration-time exception; it does not delete or modify the source database. Keep that database until the file export and B2 image migration have been verified.
- B2 private bucket objects are served through the backend media route, so the frontend never receives storage credentials. Use an application key scoped to the portfolio bucket and grant only the read, write, and delete capabilities needed by this API.

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API readiness and current media storage mode. |
| `GET` | `/api/health/storage` | Storage-mode health check. |
| `GET` | `/api/portfolio` | Public portfolio content. |
| `GET` | `/api/media/:filename` | Retrieve an uploaded image from B2 (or a legacy local image). |
| `POST` | `/api/contact` | Validate and persist a contact submission in JSON. |
| `GET` | `/api/admin/session` | Check admin session/configuration status. |
| `POST` | `/api/admin/login` | Sign in and issue an HttpOnly session cookie. |
| `POST` | `/api/admin/logout` | Revoke the current admin session. |
| `POST` | `/api/admin/password` | Change the admin password. |
| `POST` | `/api/admin/uploads` | Upload an authenticated image to B2 (maximum 8 MB). |
| `GET` | `/api/admin/portfolio` | Load portfolio content in the CMS. |
| `PUT` | `/api/admin/portfolio` | Validate and atomically save portfolio content. |

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

The server serves the frontend for `/`, `/admin`, and other client-side routes, while keeping `/api/*` on the API. Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_AUTH_DISABLED=false`, `FRONTEND_ORIGIN`, and all `B2_*` values in Render's environment settings. Set `DATA_DIRECTORY=/var/data` and attach a persistent disk mounted at `/var/data`. Set `VITE_API_URL` to the same Render service's public URL as a build-time environment variable if it differs from the current production API URL.

If deploying the frontend as a separate Render **Static Site**, configure a dashboard rewrite rule with source `/*`, destination `/index.html`, and action **Rewrite** so direct visits and refreshes on `/admin` load the React app. Set `VITE_API_URL` on that static-site service to the backend's public URL. Set `FRONTEND_ORIGIN` on the backend to the static site's exact origin.

For a Vercel frontend, set the project's root directory to `frontend/`. The included `frontend/vercel.json` forwards `/api/*` requests to the Render backend before rewriting frontend routes such as `/admin` to the SPA entry point. The frontend's production API URL also defaults to that Render backend. If the Vercel deployment uses a different frontend origin, add its exact origin to `FRONTEND_ORIGIN` in the Render environment settings (comma-separated if there is more than one).

For separate frontend/backend deployments, when the admin UI and API use separate HTTPS domains, the session cookie uses cross-site `SameSite=None; Secure` settings.
