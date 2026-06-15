# Barry O's Old Market Tavern — Build Documentation

**barryostavern.com · Royal Oak, MI · Est. 1985**  
**Stack:** MongoDB Atlas · Express · React (Vite) · Node.js · TypeScript  
**Services:** Vercel · Railway · Auth0 · Cloudinary

> **Canonical docs live in [`docs/`](../docs/) and [`README.md`](../README.md).** This file is a quick reference for AI-assisted sessions.

---

## What This Repo Is

A custom MERN application replacing the existing WordPress site. Two experiences:

1. **Public site** — Home, full event calendar, photo gallery, Christmas tickets, contact
2. **Staff dashboard** — Auth-gated content management: events, announcement bar, Christmas party, photo moderation, hours, media

The owner is non-technical. The dashboard uses plain language, not CMS jargon.

---

## Current Features (shipped)

### Public site
- Home with hero video, announcement bar, events preview, Christmas CTA, gallery, footer
- `/calendar` — full upcoming event schedule with descriptions
- `/submit` — consent-gated photo upload with rate limiting
- `/christmas-party` — ticket page when Christmas party is enabled
- EvergreenPanel when no upcoming events (never an error state)

### Events (three schedule types)
- **Specific date** — one-time event
- **Multiple days** — consecutive back-to-back days (e.g. Thu–Sun tournament)
- **Weekly** — repeats weekly during a season

### Admin dashboard
- Overview stats, photo moderation (approve/reject/delete)
- Event manager with all schedule types
- Announcement, Christmas, hours, and media editors
- Live previews on announcement and Christmas editors

### Leagues (multi-sport — shipped)
- Pool, darts, and volleyball — admin CRUD, schedules (round-robin / ladder / bracket), captain scoresheets, auto standings
- Public `/leagues` hub + league detail; homepage `LeaguesSection` when active leagues exist
- Captain portal `/captain` and player portal `/player` (read-only standings)
- CSV import with CompuSport column mapping and historical results backfill
- Per-sport licensing via `config/establishment.json` (`modules.leagues`)
- See [docs/LEAGUES.md](../docs/LEAGUES.md) and [docs/contexts/CONTEXT_leagues.md](../docs/contexts/CONTEXT_leagues.md)

### Safety
- No photo public without staff approval
- Consent enforced server-side
- EXIF stripped via sharp before Cloudinary upload
- All `/api/admin/*` routes require Auth0 JWT

---

## Document Map

| File | Purpose |
|---|---|
| [README.md](../README.md) | Project overview, API, quick start |
| [SETUP.md](../SETUP.md) | Local development setup |
| [AGENTS.md](../AGENTS.md) | AI agent quick orientation |
| [docs/README.md](../docs/README.md) | Full documentation index |
| [docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md) | System design, data flow |
| [docs/contexts/](../docs/contexts/) | Feature-specific AI session context |
| [docs/DEPLOY.md](../docs/DEPLOY.md) | Vercel + Railway deployment |
| [docs/GIT_CONVENTIONS.md](../docs/GIT_CONVENTIONS.md) | Commits, branches, PRs |
| [contexts/CONTEXT_leagues.md](../docs/contexts/CONTEXT_leagues.md) | League module AI session context |
| [LEAGUES_BUILD_PROMPTS.md](./LEAGUES_BUILD_PROMPTS.md) | Phased league build prompts (L0–L7.1 shipped) |
| [LEAGUES.md](../docs/LEAGUES.md) | Multi-sport league product plan |
| [.cursorrules](../.cursorrules) | Cursor IDE rules — read before every session |

---

## Quick Start

```bash
npm run install:all

cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env

# Fill in MongoDB, Auth0, Cloudinary (see SETUP.md)
npm run dev
```

Frontend: http://localhost:5173 · API: http://localhost:3001

---

## Critical Rules

1. **No photo goes public without explicit staff approval.** `status: 'pending'` by default.
2. **Consent is enforced server-side.** The UI checkbox is UX; the server rejects without it.
3. **EXIF is stripped before storage.** `sharp` processes every uploaded image.
4. **Empty events calendar = EvergreenPanel, not an error.**
5. **All `/api/admin/*` routes require Auth0 JWT.**
6. **Secrets live in `.env` files.** Never in source code.

---

## Services Checklist

- [ ] **MongoDB Atlas** — cluster, database user, connection string
- [ ] **Auth0** — SPA application + API (see `docs/SETUP_AUTH0.md`)
- [ ] **Cloudinary** — `CLOUDINARY_URL`, folders: `barryos/pending`, `barryos/gallery`, `barryos/hero`
- [ ] **Vercel** — client deploy, root directory `client/`
- [ ] **Railway** — server deploy, health check `/api/health`
