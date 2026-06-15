# Tavern Base — Platform Overview

Tavern Base is a white-label MERN platform for neighborhood bars, taverns, and pubs. It grew from the production site at [Barry O's Old Market Tavern](https://barryostavern.com) and is maintained as a fork for pitching and deploying to additional establishments.

## What each venue gets

| Capability | Public site | Staff dashboard |
|------------|-------------|-----------------|
| Event calendar | `/calendar` | `/admin/events` |
| Patron photo submissions | `/submit` | `/admin/submissions` |
| Announcement bar | Homepage | `/admin/announcement` |
| Seasonal promotions (e.g. Christmas party) | `/christmas-party` | `/admin/christmas` |
| Hours, contact, about | Footer | `/admin/hours` |
| Hero video & social links | Homepage | `/admin/media` |

All admin routes require Auth0. Photo moderation and consent enforcement are non-negotiable across every deployment.

## Reference implementation

Barry O's remains the first live deployment and regression reference:

- **Client:** `https://barryostavern.com`
- **API:** `https://api.barryostavern.com`
- **Cloudinary folders:** `barryos/pending`, `barryos/gallery`, `barryos/hero`

New venues copy the stack, configure their own Auth0 tenant, MongoDB database, Cloudinary folders, and branding assets.

## Onboarding a new establishment

1. **Fork or clone** this repository (or create a venue-specific branch).
2. **Copy env templates** — `.env.example`, `client/.env.example`, `server/.env.example` → respective `.env` files.
3. **Configure services** — MongoDB Atlas cluster, Auth0 SPA + API, Cloudinary account. See [SETUP.md](../SETUP.md) and [docs/SETUP_AUTH0.md](./SETUP_AUTH0.md).
4. **Set venue identity** — update `config/establishment.json` (see `config/establishment.example.json`) and replace branding assets under `client/public/images/`.
5. **Deploy** — Vercel (client) + Railway (server). See [docs/DEPLOY.md](./DEPLOY.md).
6. **Seed admin** — run `npx ts-node server/src/scripts/seedAdmin.ts` with the venue manager's Auth0 sub.

## Planned platform expansions

These are the next features to build for multi-venue pitches:

| Feature | Goal |
|---------|------|
| Establishment config layer | Single config file drives site name, URLs, consent copy, and Cloudinary paths |
| Theme tokens per venue | CSS custom properties loaded from config or admin settings |
| Multi-tenant admin (optional) | One deployment serving multiple venues with tenant isolation |
| Demo / sandbox mode | Read-only preview for sales demos without live credentials |
| Menu & specials module | Daily food/drink board managed from dashboard |
| Private events inquiry | Lead capture for parties and buyouts |
| Email notifications | Staff alerts on new photo submissions and contact messages |

## Repository layout

```
./
├── client/              # Vite + React public site and staff dashboard
├── server/              # Express API, models, image pipeline
├── config/              # Per-venue configuration (not committed with secrets)
├── docs/                # Architecture, deploy, and platform docs
├── graphics/            # Shared event icon SVGs
└── claude-files/        # Design references from original build
```

## Pitch positioning

**Problem:** WordPress and generic website builders are slow to update, expensive to maintain, and unsafe for patron photo submissions.

**Solution:** Tavern Base gives staff a plain-English dashboard to manage events, announcements, and moderated UGC — with a fast, mobile-friendly public site and production-grade safety defaults.

**Differentiators:**

- Human-in-the-loop photo moderation (never auto-publish)
- Server-side consent enforcement and EXIF stripping
- Event scheduling that handles one-off, multi-day, and weekly recurring events
- Auth0-secured admin with no WordPress login surface
- Deployed on modern serverless infrastructure (Vercel + Railway)

## Related docs

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Quick start and feature inventory |
| [SETUP.md](../SETUP.md) | Local development setup |
| [AGENTS.md](../AGENTS.md) | AI assistant orientation |
| [docs/architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | System design |
| [docs/DEPLOY.md](./DEPLOY.md) | Production deployment |
