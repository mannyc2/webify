# Tree Shaking and DCE

## What matters most

- Bun applies dead-code elimination and tree-shaking transforms during bundling.
- Tree shaking is strongest when modules are statically analyzable and side effects are explicit.

## Primary levers

- Prefer named ESM imports over broad namespace imports.
- Use package `sideEffects` metadata correctly.
- Use `optimizeImports` for heavy barrel-export packages.
- Use compile-time flags (`feature()`, `define`) so unreachable branches collapse.
- Keep DCE annotations enabled (`--emit-dce-annotations` by default unless whitespace minify mode disables re-emission).

## Common failure modes

1. Barrel files with local exports or `import *` usage force more module loading.
2. Side-effectful top-level code prevents pruning.
3. Dynamic access patterns hide static usage from analysis.
4. Misconfigured sideEffects flags in dependencies cause under- or over-pruning.

## Triage checklist

- Check import style in hot paths.
- Inspect metafile input->output byte contributions.
- Toggle `optimizeImports` on known barrel-heavy packages.
- Confirm `feature("FLAG")` uses string literals only.
- Avoid `ignoreDCEAnnotations` unless working around a proven bad annotation.

## Safe defaults

- Start with no override to DCE behavior.
- Add `optimizeImports` only for confirmed barrel bottlenecks.
- Keep code explicit and side-effect boundaries clear.
