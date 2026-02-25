# Diagnostics Playbook

## Stage 1: Fast Classification

- `setup`: missing/invalid config files, wrong bindings, unsupported runtime flags.
- `build`: Next build or adapter transform failures.
- `preview`: local Workers runtime behavior mismatch.
- `deploy`: upload, limits, or auth issues.
- `runtime`: request failures, binding access errors, stale cache behavior.
- `performance`: latency, startup time, or bundle size regressions.

## Stage 2: Baseline Commands

- Build: `opennextjs-cloudflare build`
- Preview: `opennextjs-cloudflare preview`
- Deploy dry run size signal: `wrangler deploy --outdir bundled/ --dry-run`
- Bindings type sync: `wrangler types --env-interface CloudflareEnv`

## Symptom Runbooks

### Startup CPU error (`10021`)

- Inspect top-level initialization and move expensive work into handlers or build time.
- Profile startup path with Wrangler-generated CPU profile artifacts.

### Worker too large

- Inspect compressed upload size first.
- Remove unused dependencies.
- Move bulky data/assets to KV, R2, D1, or static assets.
- Split architecture only after simpler reductions fail.

### Revalidation not behaving as expected

- Confirm queue exists for time-based revalidation.
- Confirm tag cache exists for on-demand invalidation flows.
- Confirm cache purge configuration when using Cache API-backed layers.
- Enable cache debug logging (`NEXT_PRIVATE_DEBUG_CACHE=1`) for diagnosis.

### Binding access mismatch in SSG/static routes

- Use async context mode (`getCloudflareContext({ async: true })`) in static generation paths.
- Validate local-vs-remote binding mode assumptions.

### `__name is not defined` browser/runtime failures

- Set Wrangler `keep_names` to `false` if using a compatible Wrangler version.
- Rebuild and confirm generated script behavior.

### Durable Object warnings during build

- Treat known internal cache DO warnings as non-fatal only in documented OpenNext build contexts.
- Do not ignore runtime failures to reach DO classes in production traffic.

## Performance Profiling Workflow

- Build unminified output (`opennextjs-cloudflare build --noMinify`).
- Disable Next/server minification in Next config for readable profile stacks.
- Run preview and record CPU profile.
- Change one variable at a time and re-measure.

## Escalation Criteria

- Escalate to advanced multi-worker only when baseline caching and startup optimizations are exhausted.
- Escalate unresolved adapter/runtime regressions with minimal reproduction details and exact versions.
