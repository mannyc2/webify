# Minify and Sourcemap Policy

## Minify modes

- `--minify`: enable whitespace, syntax, and identifiers.
- `--minify-syntax`: generally safe first step for server/library outputs.
- `--minify-whitespace`: strong size win with low semantic risk.
- `--minify-identifiers`: highest readability/debug cost.
- `--keep-names`: preserve function/class names when identifier minification is enabled.

## `drop` guidance

- `--drop console` and `--drop debugger` can reduce noise and bytes.
- Treat as risky when dropped calls contain side effects.

## Sourcemap modes

- `none`: no maps, smallest output.
- `linked`: local/dev convenience.
- `external`: production-friendly debug maps without runtime sourceMappingURL linkage.
- `inline`: easiest local debugging, largest output.

## Safe defaults by profile

- Dev: `linked`
- Prod web: `external`
- Prod server: `external`
- CLI executable: keep sourcemap unless distribution constraints require removal

## Validation checks

- Force an error and confirm readable stack traces in target runtime.
- Ensure production artifacts do not unintentionally expose source maps publicly.
