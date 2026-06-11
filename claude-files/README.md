# Barry O's Old Market Tavern — Build Documentation

**barryostavern.com · Royal Oak, MI · Est. 1985**  
**Stack:** MongoDB Atlas · Express · React (Vite) · Node.js · TypeScript  
**Services:** Vercel · Railway · Auth0 · Cloudinary

---

## What This Repo Is

A custom MERN application replacing the existing WordPress site. Two experiences:

1. **Public site** — Marketing page for the tavern. Hero, events, gallery, footer.
2. **Staff dashboard** — Auth-gated content management: events, announcement bar, Christmas party CTA, photo moderation.

The owner is non-technical. The dashboard must use plain language, not CMS jargon.

---

## Document Map

| File | Purpose |
|---|---|
| `.cursorrules` | Cursor IDE rules — read before every session |
| `docs/architecture/ARCHITECTURE.md` | System design, data flow, service topology |
| `docs/contexts/CONTEXT_server_models.md` | Mongoose schemas (paste into session when working on models) |
| `docs/contexts/CONTEXT_image_pipeline.md` | Photo upload + EXIF pipeline (paste into session) |
| `docs/contexts/CONTEXT_public_site.md` | Public React components (paste into session) |
| `docs/contexts/CONTEXT_admin_dashboard.md` | Admin dashboard (paste into session) |
| `docs/prompts/BUILD_PROMPTS.md` | Phased build prompts — the development playbook |
| `docs/GIT_CONVENTIONS.md` | Commit format, branching, PR process |
| `docs/barry-os-project-spec.md` | Full product spec + acceptance criteria |

### Design Reference (static mockups — DO NOT deploy)
| File | Shows |
|---|---|
| `barry-os-tavern.html` | Complete public site design |
| `barry-os-event-states.html` | Events populated vs. empty states |
| `barry-os-admin-dashboard.html` | Full staff dashboard + moderation queue |

---

## Quick Start

```bash
git clone https://github.com/barryostavern/barryostavern.git
cd barryostavern
npm run install:all

cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env

# Fill in env vars (see docs/architecture/ARCHITECTURE.md)
npm run dev
```

---

## Build Roadmap

| Phase | Branch | What Gets Built | Prompt(s) |
|---|---|---|---|
| **0 — Foundation** | `feat/phase-0-foundation` | Models, DB, Auth0, route scaffold | 0.1, 0.2 |
| **1 — Public Site** | `feat/phase-1-public-site` | Hero, events (dual state), footer, Christmas | 1.1–1.5 |
| **2 — Dashboard** | `feat/phase-2-admin-dashboard` | All content editors, live previews | 2.1–2.4 |
| **3 — UGC** | `feat/phase-3-ugc-moderation` | Photo submission, EXIF pipeline, moderation | 3.1–3.3 |
| **4 — Launch** | `feat/phase-4-polish` | a11y, responsive QA, deploy config | 4.1–4.2 |

Each phase has acceptance criteria in `docs/prompts/BUILD_PROMPTS.md`. A phase is done when all AC pass.

---

## Critical Rules (read once, remember always)

1. **No photo goes public without explicit staff approval.** `status: 'pending'` by default. Always.
2. **Consent is enforced server-side.** The UI checkbox is UX; the server rejects without it.
3. **EXIF is stripped before storage.** `sharp` processes every uploaded image.
4. **Empty events calendar = EvergreenPanel, not an error.** Never show "no events scheduled."
5. **All `/api/admin/*` routes require Auth0 JWT.** No exceptions.
6. **Secrets live in `.env` files.** Never in source code.

---

## Services Setup Checklist

Before starting Phase 0:

- [ ] **MongoDB Atlas** — create cluster, database user, get connection string
- [ ] **Auth0** — create tenant, SPA application, API (see `docs/architecture/ARCHITECTURE.md`)
- [ ] **Cloudinary** — create account, note `CLOUDINARY_URL`, create folders: `barryos/pending`, `barryos/gallery`, `barryos/hero`
- [ ] **Vercel** — connect GitHub repo, configure for client deployment
- [ ] **Railway** — connect GitHub repo, configure for server deployment
