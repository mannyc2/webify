# OpenNext Cloudflare Profiles

## Profile Selector

- `new-app`: Bootstrap a new Next.js app pre-configured for OpenNext on Cloudflare Workers.
- `migrate-existing`: Convert an existing Next.js app to OpenNext Cloudflare.
- `production-caching`: Configure ISR/SSG/data cache and revalidation components.
- `performance-tuning`: Improve startup time, cache hit behavior, and operational latency.
- `advanced-multi-worker`: Split middleware and server workers with manual staged rollout.
- `incident-response`: Triage and fix build/deploy/runtime regressions.

## new-app

Use when starting from scratch.

- Run `npm create cloudflare@latest -- <app> --framework=next --platform=workers`.
- Confirm scripts include `opennextjs-cloudflare build|preview|deploy|upload`.
- Confirm `wrangler.jsonc` and `open-next.config.ts` are generated or created.
- Run build and preview in the Workers runtime before deploying.

Exit criteria: app runs in `next dev`, `preview`, and deployment without runtime configuration errors.

## migrate-existing

Use for existing Next.js repositories.

- Run `npx @opennextjs/cloudflare migrate` first.
- Remove `@cloudflare/next-on-pages` usage and related ESLint/config hooks.
- Remove `export const runtime = "edge"` in app source where present.
- Add `initOpenNextCloudflareForDev()` to Next config.

Exit criteria: project builds with OpenNext adapter and preview matches expected behavior.

## production-caching

Use when ISR, on-demand revalidation, or high cache traffic is involved.

- Select incremental cache backend (R2 for revalidation, static-assets for pure SSG).
- Add queue for time-based revalidation.
- Add tag cache only when using `revalidateTag`, `revalidatePath`, or App Router tag invalidation.
- Add cache purge when on-demand revalidation must invalidate Cache API-backed responses.

Exit criteria: cache read/write/revalidation flows work in preview and deployed environments.

## performance-tuning

Use when startup, latency, or size limits are at risk.

- Check worker compressed size and startup-time metrics first.
- Apply P0/P1 optimization ordering from `SKILL.md`.
- Use unminified build and CPU profiling when root cause is unclear.

Exit criteria: measurable improvement and no regression in correctness.

## advanced-multi-worker

Use only when single-worker architecture is insufficient.

- Split middleware/routing and main server into separate workers.
- Use version affinity headers and staged Wrangler deployments.
- Upload each worker version with `wrangler versions upload --config <file>`.
- Roll out with staged percentages using `wrangler versions deploy ...` to avoid downtime.
- Do not use this profile with preview URLs or skew protection.

Exit criteria: zero-downtime rollout validated with staged percentages and version alignment.

## incident-response

Use when the app breaks after migration, dependency updates, or config changes.

- Classify symptom and stage quickly.
- Start from config invariants, then runtime/library compatibility, then caching topology.
- Cross-check known non-fatal warnings before escalating.

Exit criteria: minimal fix validated in preview and deployment logs.
