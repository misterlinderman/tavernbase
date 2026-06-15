# Documentation — Tavern Base

Guides for developers, deployers, and AI-assisted sessions.

## Start here

| Document | Description |
|----------|-------------|
| [../README.md](../README.md) | Project overview, features, quick start, API summary |
| [PLATFORM.md](PLATFORM.md) | White-label platform overview, onboarding, roadmap |
| [LEAGUES.md](LEAGUES.md) | Multi-sport league module — product plan, data model, phased rollout |
| [leagues/SCHEMAS.md](leagues/SCHEMAS.md) | League Mongoose schemas — TypeScript interfaces for review |
| [leagues/CSV_IMPORT.md](leagues/CSV_IMPORT.md) | CSV migration format for CompuSport / spreadsheets |
| [prompts/LEAGUES_BUILD_PROMPTS.md](prompts/LEAGUES_BUILD_PROMPTS.md) | Phased league build prompts (L0–L7.1 shipped; L7.3 tests remain) |
| [../SETUP.md](../SETUP.md) | Local development setup |
| [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System design, routing, middleware, data flows |
| [DEPLOY.md](DEPLOY.md) | Vercel + Railway production deployment |
| [SETUP_AUTH0.md](SETUP_AUTH0.md) | Auth0 SPA + API configuration |
| [GIT_CONVENTIONS.md](GIT_CONVENTIONS.md) | Commits, branches, pull requests |

## Feature context (paste into AI sessions)

These files give focused context when working on a specific area:

| Document | Use when… |
|----------|-----------|
| [contexts/CONTEXT_public_site.md](contexts/CONTEXT_public_site.md) | Building or editing public React components |
| [contexts/CONTEXT_admin_dashboard.md](contexts/CONTEXT_admin_dashboard.md) | Building staff dashboard pages or editors |
| [contexts/CONTEXT_server_models.md](contexts/CONTEXT_server_models.md) | Creating or editing Mongoose models |
| [contexts/CONTEXT_image_pipeline.md](contexts/CONTEXT_image_pipeline.md) | Photo upload, EXIF stripping, Cloudinary |
| [contexts/CONTEXT_leagues.md](contexts/CONTEXT_leagues.md) | League models, standings, captain portal, public `/leagues` |

## Build history

| Document | Description |
|----------|-------------|
| [prompts/BUILD_PROMPTS.md](prompts/BUILD_PROMPTS.md) | Phased build prompts and acceptance criteria |
| [prompts/LEAGUES_BUILD_PROMPTS.md](prompts/LEAGUES_BUILD_PROMPTS.md) | League module build prompts (L0–L7.1 shipped; L7.3 tests remain) |

## Other

| Document | Description |
|----------|-------------|
| [SHOPIFY_AUTH.md](SHOPIFY_AUTH.md) | Optional: replacing Auth0 with Shopify (template legacy) |
| [../AGENTS.md](../AGENTS.md) | Condensed agent orientation |
| [../.cursorrules](../.cursorrules) | Full project rules and conventions |

## Current feature summary (June 2026)

**Public site:** Home with hero, announcement bar, events preview, leagues preview (when active), Christmas CTA, Instagram gallery, contact modal. Dedicated `/calendar` page for the full upcoming schedule. `/leagues` hub and league detail pages when sports are enabled. Photo submission flow at `/submit`.

**Events:** Three schedule types — specific date, multiple consecutive days, and weekly recurring. Empty calendar shows EvergreenPanel.

**Admin:** Overview stats, photo moderation queue, event manager, announcement/Christmas/hours/media editors with live previews where applicable. Leagues dashboard at `/admin/leagues`.

**Leagues (shipped):** Native multi-sport leagues (pool, darts, volleyball) — admin CRUD, round-robin/ladder/bracket schedules, captain dual-entry scoresheets, auto standings, CSV import (incl. CompuSport aliases + historical results), captain and player portals, establishment licensing. Server tests: `npm run test:server`. See [LEAGUES.md](LEAGUES.md) and [contexts/CONTEXT_leagues.md](contexts/CONTEXT_leagues.md).

**Infrastructure:** MongoDB Atlas, Auth0, Cloudinary (pending/gallery/hero), Vercel, Railway.
