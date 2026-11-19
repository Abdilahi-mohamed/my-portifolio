# Abdilahi Portfolio

## Next.js application

The repository now includes the unified Next.js App Router application at the repository root.
It preserves the existing MongoDB collections and object-storage keys and exposes the same
portfolio, admin, analytics, contact, upload, and media functionality through Next route handlers.

```sh
npm install
npm run dev
npm run build
npm start
```

Configure `.env.local` from `.env.example`. MongoDB credentials and object-storage secrets remain
server-side. The portfolio and admin interface are served by the root Next.js app; the `frontend/`
and `backend/` directories provide UI modules and existing persistence/auth helpers.

A responsive React and TypeScript portfolio with a Node.js API. MongoDB stores portfolio content, admin credentials/sessions, and contact submissions. Uploaded media is stored in Backblaze B2 using its S3-compatible API.

## Project layout

- `app/` — Next.js pages and API route handlers.
- `frontend/src/` — React portfolio and admin UI components.
- `backend/src/lib/` — MongoDB persistence, admin authentication, and object-storage helpers.
- `backend/scripts/migrate-mongodb-to-files.mjs` — Read-only export utility for older MongoDB installations.
- `backend/data/` — Legacy JSON and uploaded media retained for migration (ignored by Git).
- `backend/.env.example` — Backend environment variable template.
- `shared/portfolio.default.json` — Local-development starter content; MongoDB seeding requires explicit opt-in.

## First-time setup

Install the root Next.js application's dependencies:

```sh
npm install
```

Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `MONGODB_DB`,
`ADMIN_USERNAME`, and a private `ADMIN_PASSWORD`. Configure either Backblaze B2
(`B2_*`) or Cloudflare R2 (`R2_*`) for persistent portfolio media. Never commit
`.env.local` or expose database/storage credentials to browser-side variables.

MongoDB is required for portfolio editing and production. Persistent object storage
is required for uploads; text and portfolio changes are stored in MongoDB. Existing
MongoDB collections and media keys are preserved.

If backend startup reports `querySrv ECONNREFUSED` for a `mongodb+srv://` URI, the configured system DNS resolver is refusing the MongoDB SRV lookup. Configure `MONGODB_DNS_SERVERS` with one or more comma-separated, trusted DNS resolver IP addresses in `backend/.env`; this optional setting applies to DNS lookups made by the backend process.

### Existing MongoDB or JSON data

The backend uses the MongoDB collections `portfolio` (`_id: "primary"`), `adminAccounts` (`_id: "primary"`), `adminSessions`, `contactMessages`, and `migrationMetadata` for one-time import tracking. Existing MongoDB records take precedence and are never replaced with local or default data. When the portfolio record is absent, an existing local portfolio is imported once. The older `migrate-mongodb-to-files.mjs` utility is for read-only inspection/export only; it is not part of normal startup:

```sh
node backend/scripts/migrate-mongodb-to-files.mjs
```

This optional utility exports portfolio/account/session/contact data and supported legacy GridFS images. It does not alter MongoDB. Production API routes return explicit database errors and never fall back to empty/default content.

## Run locally

Run the full-stack app, including the admin UI and API routes, on one origin:

```sh
npm run dev
```

Open `http://localhost:3000` for the portfolio or `http://localhost:3000/admin`
for the CMS. The CMS includes an **Edit all data** JSON editor for portfolio fields
that are not covered by the individual section editors.

## Persistence, migration, and deployment

- Portfolio content is stored in MongoDB as one validated `portfolio` document; saves update its content and revision metadata atomically. The dashboard loads the current record before editing; a failed database read or write is reported as an error and does not initialize defaults.
- Admin reads include a MongoDB-backed revision, and saves use `If-Match` so stale dashboards receive `409 Conflict` instead of overwriting newer edits. Successful saves notify other open portfolio and admin tabs to reload the committed database content; unsaved admin edits are preserved.
- The root Next.js app hosts both the admin UI and API. Admin saves use MongoDB-backed revision ETags to prevent overwriting newer edits.
- Admin password hashes, sessions, and contact submissions use `adminAccounts`, `adminSessions`, and `contactMessages`. Passwords remain salted scrypt hashes. MongoDB data is independent of source code, builds, and deployments.
- `DATA_DIRECTORY` identifies legacy JSON for one-time imports. Keep the old directory until MongoDB content is verified; do not delete the MongoDB database or its collections.
- B2 object keys back profile photos, cover photos, project screenshots, certificate images, and experience images. The database stores stable `/api/media/<key>` references, and the backend serves those objects without exposing B2 credentials to the browser.
- Project case-study fields (description, problem statement, solution, workflow) and up to 30 additional media items are saved alongside each project in the MongoDB portfolio document. Project media supports images up to 8 MB and MP4/WebM videos up to 50 MB each; existing project records remain valid without these optional fields.
- Vercel's filesystem is not persistent. Configure B2 or R2 for uploads and keep storage credentials server-side. Back up MongoDB and object storage independently.

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | MongoDB readiness and current database/media storage modes. Admin editing requires `database: "mongodb"`; uploads require persistent B2 or R2 storage. |
| `GET` | `/api/health/storage` | Storage-mode health check. |
| `GET` | `/api/portfolio` | Public portfolio content. |
| `GET` | `/api/media/:filename` | Retrieve uploaded images or videos from B2 (or a legacy local file). |
| `POST` | `/api/contact` | Validate and persist a contact submission in MongoDB. |
| `GET` | `/api/admin/session` | Check admin session/configuration status. |
| `POST` | `/api/admin/login` | Sign in and issue an HttpOnly session cookie. |
| `POST` | `/api/admin/logout` | Revoke the current admin session. |
| `POST` | `/api/admin/password` | Change the admin password from the portfolio settings menu after verifying admin credentials. |
| `POST` | `/api/admin/uploads` | Upload authenticated image (maximum 8 MB) or MP4/WebM video (maximum 50 MB) media to persistent B2 storage. |
| `GET` | `/api/admin/portfolio` | Load portfolio content and its revision (ETag) in the CMS. |
| `PUT` | `/api/admin/portfolio` | Validate and update the MongoDB portfolio document using its required `If-Match` revision. |

## Build

```sh
npm run build
```

## Deploy the full-stack app to Vercel

Import the repository into Vercel and set **Root Directory** to the repository root
(not `frontend/` or `backend/`). The root `vercel.json` selects the existing Next.js
production app while installing the separate Vite frontend package as well. Use
Node.js 20.19 or newer.

Set Vercel's **Install Command** to `npm install && npm install --prefix frontend`
and **Build Command** to `npm run build`. The root Next.js TypeScript project
excludes `frontend/vite.config.ts`; the frontend has its own `tsconfig.json` and
build command (`npm run build --prefix frontend`).

Add these server-side environment variables in the Vercel project settings for each
deployment environment:

- `MONGODB_URI` and `MONGODB_DB`
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- Either the complete `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET_NAME`,
  `B2_ACCESS_KEY_ID`, `B2_APPLICATION_KEY` set, or the complete `R2_ENDPOINT`,
  `R2_REGION`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` set

Use the MongoDB Atlas connection string for the existing database and configure
Atlas network access for the Vercel deployment. Do not disable TLS or use a
wide-open database access rule. Keep all credentials out of `NEXT_PUBLIC_*` and
`VITE_*` variables. The portfolio, admin pages, and `/api/*` routes are deployed
together; no separate frontend or backend deployment is needed.
