# Agent context (Base MERN template)

Use this file as a fast orientation when editing this repository in an AI-assisted IDE.

## What this is

- **client**: Vite + React + TypeScript + Tailwind + Auth0 SPA SDK.
- **server**: Express + TypeScript + Mongoose + MongoDB; JWT validation for protected routes.

Repository layout: **`client/` and `server/` at the repo root** (no intermediate template folder).

## Commands (from repository root)

| Command | Purpose |
|---------|---------|
| `npm run install:all` | Install root, client, and server dependencies |
| `npm run dev` | Run API and Vite dev server together |
| `npm run dev:client` | Frontend only (port 5173) |
| `npm run dev:server` | API only (port 3001) |
| `npm run build` | Production build of client and server |
| `npm run lint` | ESLint in client and server |
| `npm run format` | Prettier for common file types |

## Where to look

| Task | Location |
|------|----------|
| API routes | `server/src/routes/` |
| Auth middleware | `server/src/middleware/auth.ts` |
| Models | `server/src/models/` |
| App routes / pages | `client/src/App.tsx`, `client/src/pages/` |
| API client | `client/src/services/api.ts` |
| Architecture overview | `docs/architecture/ARCHITECTURE.md` |
| Detailed conventions | `.cursorrules`, `.cursor/rules/` |

## Env setup

Copy examples: `.env.example`, `client/.env.example`, `server/.env.example` → respective `.env` files. Configure MongoDB Atlas and Auth0 before exercising authenticated flows.
