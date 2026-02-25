# Webify — Server + Web Dashboard for Watchify

## Context

Watchify is a macOS app that monitors Shopify stores for price/stock changes via their public `/products.json` endpoint. The desktop client currently talks to Shopify directly. Webify replaces that with a centralized server that:

1. **Indexes Shopify data on a schedule** (cron workers), so change detection runs 24/7 even when the app is closed
2. **Serves a REST API** that the desktop client syncs from (client stops hitting Shopify)
3. **Hosts a web dashboard** with full feature parity (browse stores, products, price charts, activity feed)
4. **Stores image CDN URLs** (never the images themselves) — the client downloads images directly from Shopify's CDN

The key legal constraint: we never host or proxy product images. The server stores Shopify CDN URLs. The user's device fetches bytes directly from Shopify.

---

## Architecture

Bun monorepo with 3 workspaces:

```
webify/
├── packages/db      @webify/db    — Drizzle ORM schema, types, queries (shared)
├── apps/web         @webify/web   — vinext dashboard + API routes
└── apps/sync        @webify/sync  — cron + queue worker for Shopify syncing
```

```
   ┌─────────────────────────────┐   ┌──────────────────────────────┐
   │  apps/web (Worker #1)       │   │  apps/sync (Worker #2)       │
   │                             │   │                              │
   │  Browser ──▶ Dashboard      │   │  Cron (*/15) ──▶ scheduled() │
   │  Client  ──▶ REST API      │   │       │                      │
   │       │                     │   │       ▼                      │
   │       │  Queue producer ────│───│──▶ Cloudflare Queues         │
   │       │                     │   │       │                      │
   │       ▼                     │   │       ▼  queue()             │
   │  ┌──────┐  ┌────┐          │   │  fetch Shopify, diff, store  │
   │  │  D1  │  │ KV │          │   │       │                      │
   │  └──┬───┘  └────┘          │   │       ▼                      │
   │     │                       │   │  ┌──────┐ (same D1)         │
   └─────│───────────────────────┘   │  │  D1  │                   │
         │                           │  └──────┘                   │
         │   packages/db             └──────────────────────────────┘
         │   (shared Drizzle schema)
         │
         │   Shopify CDN ◀── (image URLs only, never proxied)
         │        │
         ▼        ▼
     User's device downloads images
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | vinext (Vite-based Next.js on Cloudflare Workers) |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts (via shadcn chart component) |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Job Queue | Cloudflare Queues |
| Scheduling | Workers Cron Triggers |
| Runtime | bun |
| Deploy | `vinext deploy` to workers.dev |

---

## Data Model

### stores

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | Display name |
| domain | TEXT UNIQUE | Shopify domain |
| added_at | TEXT | ISO 8601 |
| last_fetched_at | TEXT? | Last successful sync |
| sync_status | TEXT | `pending` / `healthy` / `failing` / `stale` |
| last_error | TEXT? | Last sync error message |
| sync_frequency_seconds | INTEGER | Default 900 (15 min), configurable for future paid tiers |
| cached_product_count | INTEGER | Denormalized |
| cached_preview_image_urls | TEXT | JSON array of first 3 image URLs |
| user_id | TEXT? | Nullable, reserved for future multi-tenancy |

### products

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Shopify product ID |
| store_id | TEXT FK | References stores(id) |
| handle | TEXT | Shopify slug |
| title | TEXT | |
| vendor | TEXT? | |
| product_type | TEXT? | |
| first_seen_at | TEXT | ISO 8601 |
| is_removed | INTEGER | 0/1 — product disappeared from feed |
| shopify_created_at | TEXT? | |
| shopify_published_at | TEXT? | |
| shopify_updated_at | TEXT? | |
| image_urls | TEXT | JSON array of CDN URL strings |
| cached_price | TEXT | Decimal as string (e.g., "29.99") |
| cached_is_available | INTEGER | 0/1 — any variant in stock |
| title_search_key | TEXT | Lowercase normalized for search |

### variants

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Shopify variant ID |
| product_id | INTEGER FK | References products(id) |
| title | TEXT | e.g., "Small / Red" |
| sku | TEXT? | |
| price | TEXT | Decimal as string |
| compare_at_price | TEXT? | Original/list price |
| available | INTEGER | 0/1 |
| position | INTEGER | Display order |

### variant_snapshots

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| variant_id | INTEGER FK | References variants(id) |
| captured_at | TEXT | ISO 8601 |
| price | TEXT | Decimal as string |
| compare_at_price | TEXT? | |
| available | INTEGER | 0/1 |

### change_events

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| store_id | TEXT FK | References stores(id) |
| occurred_at | TEXT | ISO 8601 |
| change_type | TEXT | `price_dropped` / `price_increased` / `back_in_stock` / `out_of_stock` / `new_product` / `product_removed` / `images_changed` |
| magnitude | TEXT | `small` (<10%) / `medium` (10-25%) / `large` (>25%) |
| product_title | TEXT | Snapshot at time of change |
| variant_title | TEXT? | |
| old_value | TEXT? | |
| new_value | TEXT? | For `images_changed`: comma-separated added/removed URLs |
| price_change | TEXT? | Decimal as string |
| is_read | INTEGER | 0/1 |
| product_shopify_id | INTEGER? | Null if product removed |
| user_id | TEXT? | Reserved for future multi-tenancy |

### Image URL History

Image changes are tracked as `change_events` with `change_type = 'images_changed'`. Unlike the current desktop app (which only stores the count), events store the actual URLs that were added or removed in `old_value` / `new_value`. This append-only log lets the client reconstruct full image history from events.

---

## API Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Sync status overview: total stores, healthy/failing/stale counts, last sync times |

### Stores

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stores` | List all stores. `?sort=name\|added_at` |
| POST | `/api/stores` | Add store. Validates domain has `/products.json`. Rate-limited per IP. Body: `{ domain, name? }` |
| GET | `/api/stores/:storeId` | Store detail + metadata |
| DELETE | `/api/stores/:storeId` | Remove store + cascade delete |
| POST | `/api/stores/:storeId/sync` | Trigger manual sync (enqueues job) |
| GET | `/api/stores/:storeId/products` | Products for store. `?search=&stock=all\|in\|out&sort=name\|price_asc\|price_desc\|recent&offset=0&limit=50` |
| GET | `/api/stores/:storeId/products/:productId` | Product detail with variants |
| GET | `/api/stores/:storeId/events` | Events for store. `?type=&since=&offset=0&limit=50` |

### Products (global)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products/:productId` | Product detail (by Shopify ID, across stores) |
| GET | `/api/products/:productId/variants/:variantId/snapshots` | Variant price history for charts. `?since=` |

### Events (global)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Global activity feed. `?store=&type=&since=&is_read=&offset=0&limit=50` |
| PATCH | `/api/events/:eventId` | Mark read/unread. Body: `{ is_read: boolean }` |
| POST | `/api/events/mark-read` | Batch mark read. Body: `{ event_ids: string[] }` or `{ all: true }` |

### Response Format

All responses use a custom schema (not mirroring Shopify's format). Prices are always strings to preserve decimal precision. Timestamps are ISO 8601. Booleans are native JSON booleans (not 0/1).

```jsonc
// Example: GET /api/stores/:storeId/products/:productId
{
  "id": 123456789,
  "store_id": "uuid-here",
  "handle": "example-product",
  "title": "Example Product",
  "vendor": "Brand",
  "product_type": "Shirts",
  "first_seen_at": "2024-01-01T00:00:00Z",
  "is_removed": false,
  "image_urls": [
    "https://cdn.shopify.com/s/files/1/XXXX/products/image1.jpg",
    "https://cdn.shopify.com/s/files/1/XXXX/products/image2.jpg"
  ],
  "cached_price": "29.99",
  "cached_is_available": true,
  "variants": [
    {
      "id": 987654321,
      "title": "Small",
      "sku": "EX-SM",
      "price": "29.99",
      "compare_at_price": "39.99",
      "available": true,
      "position": 1
    }
  ]
}
```

---

## Sync Architecture

### Cron Flow

1. Cron fires every 15 minutes
2. `scheduled()` handler queries all stores from D1
3. Skips stores where `last_fetched_at + sync_frequency_seconds > now`
4. Enqueues one `SyncJobMessage` per eligible store into Cloudflare Queues
5. Queue consumer processes jobs (max batch of 5, 30s timeout, 3 retries)

### Per-Store Sync (Queue Consumer)

1. Fetch all pages from `https://{domain}/products.json?limit=250&page=N`
2. Load existing products for this store from D1
3. For each fetched product:
   - If new: insert product + variants, create `new_product` event
   - If existing: compare fields, create snapshots + events for changes
4. For products in DB but not in fetch: mark `is_removed`, create `product_removed` event
5. Image change detection: compare URL arrays, log added/removed URLs in event
6. Batch insert all changes via D1 `batch()`
7. Update store `last_fetched_at`, `sync_status`, `cached_product_count`

### Change Detection (ported from StoreService+Sync.swift)

| Change | Detection | Magnitude |
|--------|-----------|-----------|
| Price drop | `variant.price < snapshot.price` | By % change |
| Price increase | `variant.price > snapshot.price` | By % change |
| Back in stock | `variant.available && !snapshot.available` | -- |
| Out of stock | `!variant.available && snapshot.available` | -- |
| New product | Shopify ID not in DB | -- |
| Product removed | DB product not in fetch | -- |
| Images changed | `product.image_urls !== fetched_urls` | By count delta |

Magnitude thresholds: small (<10%), medium (10-25%), large (>25%).

---

## Web Dashboard

### Pages

| Route | Content | Desktop Equivalent |
|-------|---------|-------------------|
| `/` | Redirect to `/stores` or overview grid | -- |
| `/stores` | Store cards grid with sync status, "Add Store" button | `OverviewView` |
| `/stores/:storeId` | Product grid with search/filter/sort | `StoreDetailView` |
| `/stores/:storeId/products/:productId` | Product images, variants, price chart | `ProductDetailView` |
| `/activity` | Filterable event feed with date grouping | `ActivityView` |
| `/settings` | Placeholder for future settings | `SettingsView` |

### Data Fetching

Client-side polling with SWR-like hooks. Dashboard polls API every 30-60s for fresh data. No real-time push for v1.

---

## Store Discovery & Watchlists

The shared catalog is browsable by all users. Both web and desktop can add stores. In the future, users will have personal watchlists (subset of the shared catalog they actively track). For v1, all stores are visible to all clients.

---

## Abuse Prevention

1. **Rate limiting**: POST `/api/stores` is rate-limited per IP using KV (e.g., 5 stores per IP per hour)
2. **Domain validation**: Before accepting a store, the server fetches `https://{domain}/products.json` to verify it returns valid data

---

## Constraints & Risks

- **vinext is experimental** — if route handlers or env bindings break, fallback to Hono for the API layer
- **D1 10GB limit** — sufficient for v1; plan sharding or Neon migration at 8GB
- **D1 batch limit** — 100 statements per `batch()` call; stores with 100+ products need chunked inserts
- **Shopify rate limiting** — concentrated requests from Cloudflare IPs may get blocked; accepted risk for v1
- **30s Worker CPU limit** — queue fan-out ensures each store sync gets its own 30s budget
- **Cloudflare Queues free tier** — 1M messages/month, sufficient for hundreds of stores at 15min intervals

---

## Future (Not v1)

- Authentication + user accounts (columns already in schema)
- Personal watchlists with notification preferences
- Delta sync (client sends `last_synced_at`, server returns only changes)
- SSE/WebSocket push for real-time dashboard updates
- Configurable per-store sync frequency (paid tiers)
- Custom domain
- APNS push notifications to desktop client
