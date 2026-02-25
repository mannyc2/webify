---
name: bun-bundler-optimization
description: Optimize Bun bundler (`bun build`) output for applications and libraries, including bundle size reduction, tree shaking/dead-code elimination, minify and sourcemap strategy, output naming and chunk topology, external/packages boundaries, metafile-driven analysis, and compile/bytecode startup tuning. Use when requests mention Bun build optimization, bundle regressions, tree shaking not working, profile selection for dev/prod builds, sourcemap or metafile troubleshooting, compile executable tradeoffs, or esbuild-to-Bun migration.
---

# Bun Bundler Optimization

## Overview and Operating Principles

- Optimize only `bun build` behavior and outputs.
- Exclude package-manager workflows (`bun install`, `bun add`) and Bun fullstack/HMR runtime flows.
- Default to safe production choices first, then layer higher-risk optimizations intentionally.
- Treat source authority in this order: local `bun build --help`, Bun bundler docs, then migration pages.
- Use references in this skill as the working source of truth while executing tasks.

## Fast Decision Workflow

1. Identify artifact type: web app, server bundle, CLI executable, or library package.
2. Identify primary goal: smaller payload, faster startup, lower build time, or better debuggability.
3. Pick a baseline command profile from [build-profiles.md](references/build-profiles.md).
4. Apply high-impact low-risk changes first: tree shaking and boundaries, then minify/sourcemaps.
5. Run metafile analysis and logs review before adding advanced knobs.
6. Add advanced options only when metrics justify the extra risk.

## Build Profile Selector

- `dev`: [build-profiles.md](references/build-profiles.md)
- `prod-web`: [build-profiles.md](references/build-profiles.md)
- `prod-server`: [build-profiles.md](references/build-profiles.md)
- `cli-exe`: [build-profiles.md](references/build-profiles.md)
- `library`: [build-profiles.md](references/build-profiles.md)

Use this ordering for profile-specific tuning:

1. [tree-shaking-dce.md](references/tree-shaking-dce.md)
2. [output-topology.md](references/output-topology.md)
3. [minify-sourcemaps.md](references/minify-sourcemaps.md)
4. [analysis-metafile.md](references/analysis-metafile.md)
5. [bytecode-compile.md](references/bytecode-compile.md) for executable and startup-focused cases

## Optimization Checklist (Ordered by Impact/Risk)

### P0: High impact, low risk

- Confirm dependency boundaries with `external` or `packages` policy.
- Fix tree-shaking blockers and barrel-file behavior.
- Align output topology (`root`, naming templates, `publicPath`) with deployment model.
- Use the profile-appropriate minify and sourcemap mode.
- Generate and inspect metafile for byte and import graph regressions.

### P1: Medium impact, medium risk

- Enable or tune code splitting based on runtime loading behavior.
- Use `drop` selectively and only for side-effect-safe callsites.
- Apply `feature()` and `define` flags for deterministic dead-code elimination.
- Introduce plugins or macros only where static build-time transforms are clearly beneficial.

### P2: High impact, higher risk or coupling

- Use `--compile` for distribution and startup goals.
- Add `--bytecode` when startup wins outweigh size and Bun-version coupling.
- Use native plugin hooks only when JS plugin throughput is a bottleneck.

## Failure and Diagnostic Workflow

1. Capture the exact build command and target artifact.
2. Check `result.logs` (JS API) or CLI diagnostics for resolve/load errors first.
3. Generate metafile JSON and markdown and inspect top contributors.
4. Diagnose by class:
- Tree shaking not working: review [tree-shaking-dce.md](references/tree-shaking-dce.md)
- Unexpected output paths/chunks: review [output-topology.md](references/output-topology.md)
- Debugging or stack traces degraded: review [minify-sourcemaps.md](references/minify-sourcemaps.md)
- Startup too slow: review [bytecode-compile.md](references/bytecode-compile.md)
- Loader/asset mismatch: review [loaders-assets.md](references/loaders-assets.md)
5. Apply one change at a time and re-measure.

## Reference Navigation Map

- Build commands and profiles: [build-profiles.md](references/build-profiles.md)
- Tree shaking and DCE mechanics: [tree-shaking-dce.md](references/tree-shaking-dce.md)
- Output structure and naming: [output-topology.md](references/output-topology.md)
- Minify and sourcemap policy: [minify-sourcemaps.md](references/minify-sourcemaps.md)
- Compile and bytecode choices: [bytecode-compile.md](references/bytecode-compile.md)
- File loaders and assets: [loaders-assets.md](references/loaders-assets.md)
- Plugin and macro policy: [plugins-macros.md](references/plugins-macros.md)
- Metafile analysis workflow: [analysis-metafile.md](references/analysis-metafile.md)
- Known capability limits and sharp edges: [compat-limitations.md](references/compat-limitations.md)
- Source precedence and conflict resolution: [source-priority.md](references/source-priority.md)
