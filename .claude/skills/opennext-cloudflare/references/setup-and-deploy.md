# Setup and Deploy

## Baseline Requirements

- Use Node.js runtime model for Next.js with OpenNext Cloudflare adapter.
- Keep `nodejs_compat` enabled in Wrangler compatibility flags.
- Keep `compatibility_date` at or above the adapter's documented minimum.
- Use Wrangler version compatible with the targeted adapter capabilities.

## New App Path

- Bootstrap: `npm create cloudflare@latest -- <app> --framework=next --platform=workers`.
- Install/confirm `@opennextjs/cloudflare` and `wrangler`.
- Keep project scripts centered on `opennextjs-cloudflare` commands.

## Existing App Path

- Prefer `npx @opennextjs/cloudflare migrate`.
- Review generated `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars`, `public/_headers`, and package scripts.
- Remove legacy next-on-pages package usage and imports.

## Required Configuration Invariants

- `wrangler.jsonc`:
- `main` points to `.open-next/worker.js` unless using a custom worker entry.
- `assets.directory` points to `.open-next/assets`.
- `services` includes `WORKER_SELF_REFERENCE` to worker name when required.
- Add `NEXT_INC_CACHE_R2_BUCKET` binding when using R2 incremental cache.
- `open-next.config.ts`:
- Select incremental cache backend intentionally.
- Add queue/tag cache/purge only when feature requirements justify them.
- `next.config.ts`:
- Call `initOpenNextCloudflareForDev()` for `next dev` bindings integration.

## Command Model

Use adapter CLI as default control plane:

- `opennextjs-cloudflare build`
- `opennextjs-cloudflare preview`
- `opennextjs-cloudflare deploy`
- `opennextjs-cloudflare upload`
- `opennextjs-cloudflare migrate`

Use Wrangler directly only for documented cases (type generation, advanced deployments, targeted diagnostics).

## Deployment Modes

- Local workflow:
- Iterate with `next dev`.
- Validate runtime parity with `opennextjs-cloudflare preview`.
- Deploy with `opennextjs-cloudflare deploy` or `upload`.
- Workers Builds workflow:
- Build command: `npx @opennextjs/cloudflare build`.
- Deploy command: `npx @opennextjs/cloudflare deploy` (or `upload` for gradual rollouts).

## Version-Sensitive Notes

- Validate support matrix claims (Next.js majors/minors, adapter, Wrangler floors) against current official docs.
- Treat time-based deprecation notes as volatile and re-check before enforcement.
