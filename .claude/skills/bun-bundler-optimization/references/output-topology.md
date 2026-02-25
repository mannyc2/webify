# Output Topology

## Goal

Keep emitted files predictable for CDNs, caches, and runtime import resolution.

## Core options

- `root`: controls relative output structure for multiple entrypoints.
- `entry-naming`, `chunk-naming`, `asset-naming`: controls deterministic file layout.
- `publicPath`: prefixes runtime asset/chunk paths.
- `splitting`: enables shared chunks across entrypoints.

## Recommended patterns

### Static hosting / CDN web app

- Use hashed naming for cache busting.
- Set `publicPath` to CDN base URL.

```bash
bun build ./src/index.tsx \
  --outdir ./dist \
  --entry-naming '[dir]/[name]-[hash].[ext]' \
  --chunk-naming '[name]-[hash].[ext]' \
  --asset-naming '[name]-[hash].[ext]' \
  --public-path 'https://cdn.example.com/' \
  --splitting
```

### Server-side bundle

- Prefer stable entry names unless deployment requires immutable hashes.
- Use hashed chunk names when splitting.

## Risks

- Incorrect `publicPath` breaks runtime chunk/asset loads.
- Splitting without compatible runtime hosting causes missing-module failures.
- Overly dynamic naming complicates observability and diffing.

## Validation checks

- Verify all emitted import paths resolve in target environment.
- Confirm cache invalidation behavior after content changes.
