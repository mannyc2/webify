# Plugins and Macros

## When to use plugins

Use plugins when loader/resolve transforms cannot be handled by native bundler options.

## Plugin performance model

- JS plugins are easiest to ship but run on single-threaded JS execution.
- Native plugin hooks (`onBeforeParse`) can improve throughput for parser-thread transforms.

## Hook usage policy

- `onResolve`: remap/route specifiers.
- `onLoad`: transform module contents and loader.
- `onStart`/`onEnd`: orchestration and reporting.
- Use `defer()` carefully; it has known usage limits.

## Macro policy

- Use macros for deterministic build-time computation that replaces runtime work.
- Keep macro output serializable and deterministic.
- Do not treat macros as a general runtime substitute.
- Respect macro security constraints around invocation from dependencies.

## Safe defaults

- Prefer native options before plugin complexity.
- Use macros only for clear measurable wins (for example, static metadata embedding).

## Validation checks

- Compare build time before and after introducing plugin/macro logic.
- Confirm transformed output remains deterministic across runs.
