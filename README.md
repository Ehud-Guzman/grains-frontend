# vittorios-frontend

React 18 + Vite storefront, admin panel, customer dashboard, and driver portal for Vittorios Grains & Cereals. See the repo root `CLAUDE.md` for full architecture notes (branch resolution, auth flow, etc.).

## Setup

```bash
npm install
npm run dev       # Vite dev server, http://localhost:5173
```

Requires Node `>=20 <23` and the backend running locally (or pointed at a reachable dev API — see `.env` below).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally for a final check before deploying |

## Environment variables

Two files, both read by Vite at build time (`VITE_` prefix required to be exposed to client code):

- **`.env`** (local dev, gitignored) — points at your local backend:
  ```bash
  VITE_API_URL=http://localhost:5000/api
  ```
- **`.env.production`** (committed, used by the Netlify build) — points at the deployed backend:
  ```bash
  VITE_API_URL=https://grains-backend-b3n0.onrender.com/api
  ```

There is no `.env.local` override in this project — if you need a different API target for a one-off test, edit `.env` directly (it's gitignored) rather than adding a new env file.

## Deployment

Deployed on Netlify (`https://grains-fronten.netlify.app`). This is a standalone git repo (not the outer `Grains-System` folder) — push to the branch Netlify tracks and it auto-builds using `.env.production`. `npm run build` locally lets you sanity-check the production bundle before pushing.
