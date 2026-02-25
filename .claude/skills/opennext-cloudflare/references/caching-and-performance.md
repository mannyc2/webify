# Caching and Performance

## Caching Architecture

OpenNext Cloudflare caching can include these components:

- `incrementalCache` for ISR/SSG/data cache storage.
- `queue` for time-based revalidation synchronization.
- `tagCache` for on-demand revalidation metadata.
- `cachePurge` for automated cache invalidation when needed.
- `enableCacheInterception` for cache-hit short-circuiting in compatible modes.

## Incremental Cache Backend Selection

- Use static-assets incremental cache for pure SSG sites.
- Use R2 incremental cache for revalidation workloads.
- Avoid KV for ISR correctness-sensitive use cases due eventual consistency.

## Revalidation Topology

- Time-based revalidation requires queue configuration.
- On-demand revalidation (`revalidateTag`, `revalidatePath`, `res.revalidate`) requires tag cache in App Router workflows.
- Add cache purge when Cache API-backed layers must be invalidated automatically.

## Scale Guidance

- Small/low-load on-demand invalidation: start with D1 tag cache.
- Higher load or high invalidation volume: use sharded DO tag cache and consider regional cache.
- Use queue cache wrappers only when queue pressure justifies extra complexity.

## Compatibility Constraints

- Cache interception is incompatible with PPR.
- Multi-worker architecture can improve cold starts but increases deployment complexity.

## Performance Checklist

- Keep adapter versions updated.
- Ensure static asset cache headers are configured for `/_next/static/*`.
- Use `withRegionalCache` for R2 where latency and origin load are concerns.
- Keep heavy initialization out of worker global scope to avoid startup CPU limit errors.
- Track compressed worker bundle size, not only raw upload size.

## Practical Limits to Watch

- Worker compressed size limits differ by plan.
- Worker startup must complete global-scope execution within platform CPU limits.
- Route/domain/static-assets and Cache API quotas can constrain large deployments.

Re-check current limit values directly in Cloudflare docs before making hard guarantees.
