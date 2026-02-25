# Webify

Cloudflare Workers monorepo: web dashboard + sync worker for Shopify store monitoring.

## Monorepo Structure

```
packages/db     @webify/db    — Drizzle ORM schema, types, queries (shared)
apps/web        @webify/web   — vinext dashboard + API routes
apps/sync       @webify/sync  — cron + queue worker for Shopify syncing
```

## Quick Start

```bash
bun install                              # install all workspace deps
bun run --filter @webify/web dev         # start web dev server
bun run --filter @webify/sync dev        # start sync worker locally
```

## Development

```bash
# Web app
cd apps/web
bun dev                                  # vinext dev server
bun build                                # production build
bun run deploy                           # deploy to Workers

# Sync worker
cd apps/sync
bun run dev                              # wrangler dev (local)
bun run deploy                           # wrangler deploy

# Database
cd packages/db
bunx drizzle-kit generate                # generate migration from schema changes
bunx drizzle-kit studio                  # open Drizzle Studio (local DB browser)

# Migrations
cd apps/sync
bun wrangler d1 migrations apply webify-db --local   # apply locally
bun wrangler d1 migrations apply webify-db --remote  # apply to production

# Test cron locally
bun wrangler dev --test-scheduled        # exposes /__scheduled endpoint
curl http://localhost:8787/__scheduled   # trigger cron manually
```

## Tech Stack

- **Runtime**: bun
- **Framework**: vinext (Vite-based Next.js on Cloudflare Workers)
- **UI**: shadcn/ui (Maia style) + Tailwind CSS 4
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Cache**: Cloudflare KV
- **Queue**: Cloudflare Queues
- **Scheduling**: Workers Cron Triggers

## Code Style

- Use `bun` — not `npm`, `npx`, `yarn`, or `pnpm`
- All prices stored as TEXT strings (e.g., "29.99"), never floating point
- Timestamps as ISO 8601 strings
- UUIDs via `crypto.randomUUID()`
- Import shared types from `@webify/db`
- Use Drizzle ORM for all database operations
- Use Zod 4 for request validation
- shadcn components in `components/ui/`, custom in `components/{domain}/`

## Key Constraint

Never host or proxy Shopify product images. Store CDN URLs only. The client downloads images directly from Shopify's CDN.
