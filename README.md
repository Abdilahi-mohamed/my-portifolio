# ABdilahi Portfolio

A responsive React and TypeScript portfolio with a separate Node.js and TypeScript API and persistent local content storage.

## Project layout

- `frontend/` — React, Vite, TypeScript, and the portfolio UI.
- `backend/src/` — Node.js HTTP API.
- `backend/data/` — Locally saved portfolio content, uploaded project images, and contact messages (created at runtime).
- `backend/scripts/` — Local development startup launcher.
- `backend/.env.example` — Optional backend environment variables.
- `backend/package-lock.json` and `frontend/package-lock.json` — Independent app dependency locks.
- `shared/portfolio.default.json` — Default portfolio content served when no local override exists.

## First-time setup

Install each application’s dependencies:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Optional: copy `backend/.env.example` to `backend/.env` to set `PORT` or `FRONTEND_ORIGIN`. Do not commit `.env`.

## Start the website

```sh
npm run web
```

This starts the Node API and React frontend and opens the public site in Chrome on Windows (or the default browser on macOS/Linux).

Stop both local servers with `Ctrl+C`.

Portfolio content is read from `backend/data/portfolio.json` when present, otherwise from `shared/portfolio.default.json`. Accepted contact messages are stored in `backend/data/messages.jsonl`. Project screenshots, profile photos, and cover photos uploaded through the admin panel are saved under `backend/data/uploads/` and served by the API, so image URLs remain stable across page refreshes and server restarts. Uploads accept PNG, JPEG, WebP, and GIF files up to 8 MB each. Keep this data directory on persistent storage when deploying. Runtime data files are ignored by Git. `PORT` changes the API port, and `FRONTEND_ORIGIN` configures the allowed browser origin.

## Production builds

```sh
npm run build
```
