# Deployment Guide — Barry O's Old Market Tavern

Production split: **Vercel** hosts the React client; **Railway** hosts the Express API.

| Service | URL | Branch |
|---------|-----|--------|
| Client | `https://barryostavern.com` | `main` |
| API | `https://api.barryostavern.com` | `main` |

---

## Prerequisites

- GitHub repo connected to Vercel and Railway
- MongoDB Atlas cluster
- Auth0 tenant (SPA + API configured)
- Cloudinary account with upload permissions

---

## 1. Vercel (client)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Leave the **root directory** at the repo root — `vercel.json` sets build/output paths.
3. Add environment variables (Production + Preview):

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://api.barryostavern.com/api` |
| `VITE_AUTH0_DOMAIN` | `your-tenant.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | Production SPA client ID |
| `VITE_AUTH0_AUDIENCE` | `https://api.barryostavern.com/api` |

4. Deploy. `vercel.json` rewrites all non-asset routes to `index.html` for SPA routing.

**Local production build test:**

```bash
cd client && npm run build
```

Template values live in `client/.env.production` — replace placeholders before deploying; never commit real secrets.

---

## 2. Railway (server)

1. Create a new Railway project from the same GitHub repo.
2. Leave the **root directory** at `/` (repo root). `nixpacks.toml` and `railway.json` build **only the server** — the client is not built on Railway.
3. Add environment variables:

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this automatically |
| `MONGODB_URI` | Atlas connection string |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | API identifier (matches client) |
| `CLIENT_URL` | `https://barryostavern.com` (add preview URLs if needed) |
| `CLOUDINARY_URL` | Full Cloudinary URL |
| `CLOUDINARY_PENDING_FOLDER` | `barryos/pending` |
| `CLOUDINARY_PUBLIC_FOLDER` | `barryos/gallery` |
| `MAX_UPLOAD_BYTES` | `8000000` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_SUBMISSIONS` | `10` |
| `ADMIN_AUTH0_SUB` | For seed script only |
| `ADMIN_EMAIL` | For seed script only |
| `ADMIN_NAME` | For seed script only |

4. Railway health check: `GET /api/health` → `{ "status": "ok", "timestamp": ... }`

**Alternative:** set Railway **Root Directory** to `server` and use the default Node build (`npm ci` + `npm run build` + `npm start`). Ensure dev dependencies install during build (TypeScript is required to compile).

**If the build fails with `tsc: not found`:** Railway was building the client or omitting dev dependencies. Confirm `nixpacks.toml` is committed and redeploy.

**If the build fails with `Node.js 18.x has reached End-Of-Life`:** Nixpacks no longer ships Node 18. This repo uses Node 22 via `nixpacks.toml` and `.node-version`.

**Seed admin user (one-time, from local machine with env vars set):**

```bash
npx ts-node server/src/scripts/seedAdmin.ts
```

---

## 3. MongoDB Atlas

1. Create a database user with read/write access.
2. Network access: allow Railway's egress IPs, or **Allow Access from Anywhere** (`0.0.0.0/0`) to start — tighten later.
3. Copy the connection string into Railway `MONGODB_URI`.

---

## 4. Auth0 (production)

In your Auth0 SPA application:

| Setting | Value |
|---------|-------|
| Allowed Callback URLs | `https://barryostavern.com/admin`, `http://localhost:5173/admin` |
| Allowed Logout URLs | `https://barryostavern.com`, `http://localhost:5173` |
| Allowed Web Origins | `https://barryostavern.com`, `http://localhost:5173` |

In the Auth0 API settings:

- **Identifier** must match `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE`.
- Enable the SPA under **Applications → APIs → [your API] → Application Access**.

---

## 5. Cloudinary

- Confirm `CLOUDINARY_URL` is set in Railway.
- Pending folder (`barryos/pending/`) should not be publicly listable.
- Gallery folder (`barryos/gallery/`) serves approved photos via CDN.
- Hero video uploads go through the admin media endpoint.

---

## 6. DNS

| Record | Points to |
|--------|-----------|
| `barryostavern.com` (apex) | Vercel |
| `www.barryostavern.com` | Vercel (redirect apex if desired) |
| `api.barryostavern.com` | Railway service URL |

In Vercel: **Settings → Domains** → add `barryostavern.com` and `www.barryostavern.com`.

In Railway: **Settings → Networking** → add custom domain `api.barryostavern.com` → create the CNAME Railway provides.

Update `CLIENT_URL` on Railway if you add `www` or preview domains to the CORS allowlist in `server/src/index.ts`.

---

## Post-deploy checklist

- [ ] `GET https://api.barryostavern.com/api/health` returns `200` with `{ "status": "ok" }`
- [ ] Public site loads with real data (events, hours, hero)
- [ ] Admin login works at `/admin`
- [ ] Submit a test photo → appears in admin **Pending** queue
- [ ] Approve test photo → appears in public gallery
- [ ] Delete test photo → removed from DB and Cloudinary

---

## Troubleshooting

**CORS errors in browser**

- Confirm the site origin is in `allowedOrigins` in `server/src/index.ts` or set `CLIENT_URL` on Railway.

**Auth0 `invalid_request` after login**

- Check callback URLs and that the SPA has API access enabled.

**Submissions fail with 500**

- Verify `CLOUDINARY_URL` on Railway and folder names match env vars.

**Health check fails on Railway**

- Ensure the service listens on `process.env.PORT` (default 3001 locally).
- Confirm `/api/health` is reachable before DB-dependent routes block startup.

---

## Security reminders

- Never commit `.env` files with real credentials.
- Use Railway/Vercel dashboards for all production secrets.
- Rate limiting is active on `POST /api/submissions`.
- All `/api/admin/*` routes require a valid Auth0 JWT.
