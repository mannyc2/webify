# Integrations and Runtime

## Bindings Access Pattern

- Use `getCloudflareContext()` for bindings access in request-time server code.
- Use `await getCloudflareContext({ async: true })` in SSG/static generation flows.
- Regenerate binding types after config changes:
- `wrangler types --env-interface CloudflareEnv`

## Environment Variable Strategy

- Local development: prefer Next.js `.env*` files for `next dev` compatibility.
- Use `.dev.vars` to set `NEXTJS_ENV` for worker-local environment selection.
- Production/runtime: set variables and secrets in Cloudflare dashboard.
- For Workers Builds, define build variables/secrets so Next build can inline and read needed values.

## Database and ORM Guidance

- Avoid global DB clients in workers.
- Create per-request clients; use request-scoped `cache()` where appropriate.
- For pg-based adapters, constrain reuse (`maxUses: 1`) to avoid cross-request pooling issues.
- Prisma on OpenNext Cloudflare:
- Keep generated client layout compatible with adapter patching expectations.
- Include required Prisma packages in `serverExternalPackages` when needed.

## Stripe Integration

- Use Fetch-based Stripe HTTP client in workers:
- `httpClient: Stripe.createFetchHttpClient()`

## Image Optimization

- Option 1: define an `IMAGES` binding and use adapter-compatible image path.
- Option 2: use custom image loader with Cloudflare Images endpoint pattern.
- Restrict image origins and account for middleware interaction differences.

## workerd-Specific Package Resolution

- Add packages with `workerd` conditional exports to `serverExternalPackages` to avoid Node-default entrypoint mismatches.
- Known examples include `postgres`, `@prisma/client`, `.prisma/client`, and similar runtime-conditional packages.

## Custom Worker Extension

- Reuse generated `.open-next/worker.js` fetch handler in custom worker entry.
- Export additional handlers (for example `scheduled`) only when needed.
- Re-export adapter-generated DO classes when queue/tag cache architecture depends on them.

## Known Runtime/Build Edge Cases

- `__name` runtime errors can be mitigated with `keep_names: false` in Wrangler when supported.
- Internal caching DO warnings during build can be non-fatal in documented contexts; treat runtime DO export failures separately.
