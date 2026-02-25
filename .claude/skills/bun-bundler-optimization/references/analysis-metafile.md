# Metafile Analysis Workflow

## Generate metadata

```bash
bun build ./src/index.ts --outdir ./dist --metafile ./dist/meta.json --metafile-md ./dist/meta.md
```

## What to inspect first

1. Largest outputs by bytes
2. Inputs with high `bytesInOutput`
3. Unexpected imports and external markers
4. Chunk count and shared-module distribution

## Regression triage sequence

1. Compare previous and current top contributors.
2. Identify new dependencies or expanded dependency surface.
3. Check tree-shaking blockers and boundary settings.
4. Re-run with one change at a time.

## CI gate suggestions

- Store `meta.json` per build.
- Alert when total JS/CSS bytes cross thresholds.
- Alert when specific high-cost modules exceed expected deltas.

## Quick checks

- Ensure no secret-bearing modules leaked into browser bundles.
- Verify expected externals remain external.
