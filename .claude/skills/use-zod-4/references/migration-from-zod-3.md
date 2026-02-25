# Migration from Zod 3

Use this checklist to move existing codebases from Zod 3 patterns to Zod 4 without behavior regressions.

## High-impact API changes

- Replace `z.nativeEnum(...)` with `z.enum(...)`.
- Replace fragmented error APIs (`message`, `errorMap`, `invalid_type_error`, `required_error`) with the unified `error` param.
- Replace deprecated `ZodError` instance helpers (`.format()`, `.flatten()`, `.formErrors`) with top-level helpers:
  - `z.treeifyError()`
  - `z.flattenError()`
  - `z.prettifyError()`
- Replace object strictness helpers:
  - `.strict()` -> `z.strictObject(...)`
  - `.passthrough()` -> `z.looseObject(...)`
  - `.strip()`/`.nonstrict()` usage -> explicit object constructor choice
- Replace `.merge()` with `.extend()` or object spread.
- Replace optional enum-key records that relied on v3 behavior with `z.partialRecord(...)`.
- Replace single-argument `z.record(valueSchema)` usage with explicit key + value schemas.
- Remove `z.promise()` usage where possible; await values before parsing.

## Behavior changes that can break assumptions

- `.default()` now short-circuits on `undefined`; use `.prefault()` when the fallback must still pass through parsing/transforms.
- Defaults can now apply inside optional object fields; verify code paths that relied on key absence.
- `z.uuid()` is stricter; use `z.guid()` when UUID-like identifiers are acceptable.
- `z.record(z.enum(...), ...)` is exhaustive in Zod 4; use `z.partialRecord(...)` for optional keys.

## Versioning and import transitions

Use this import mapping during upgrades:

| Intent | Before | After |
|---|---|---|
| Zod 4 root import | `zod/v4` | `zod` |
| Zod 4 Mini import | `zod/v4-mini` | `zod/mini` |
| Keep using Zod 3 after root moved to v4 | `zod` | `zod/v3` |

For library packages that support both majors, use peer dependencies compatible with both (for example `^3.25.0 || ^4.0.0`) and avoid root-only assumptions.

## Targeted search patterns

Run these searches first to find likely migration hotspots:

```bash
rg "nativeEnum|errorMap|invalid_type_error|required_error|z\\.promise|record\\([^,]+\\)|\\.strict\\(|\\.passthrough\\(|\\.strip\\(|\\.merge\\("
```

Run these searches for parse-path correctness:

```bash
rg "parse\\(|safeParse\\(" --glob "*.ts" --glob "*.tsx"
```

Then verify async parse correctness anywhere async refinements/transforms exist:

```bash
rg "refine\\(async|transform\\(async|parse\\(|safeParse\\(" --glob "*.ts" --glob "*.tsx"
```

## Migration sequence

1. Upgrade package version and lockfile.
2. Update deprecated APIs and compile.
3. Resolve parse flow mismatches (`parse` vs `parseAsync`).
4. Run test suite and inspect error payload snapshots (especially if previous tests asserted old `ZodError` formatting helpers).
5. Validate enum-record behavior where missing keys were previously accepted.
6. Validate any JSON Schema export flow with representative schemas.

## Behavior checks after migration

- Confirm unknown key handling for each object schema (`object` vs `strictObject` vs `looseObject`).
- Confirm schema-level custom errors still override per-parse/global errors.
- Confirm any previous uses of `.strict()`, `.passthrough()`, `.strip()`, or `.merge()` are replaced with explicit top-level object patterns.
- Confirm default/prefault behavior in transforms and optional object fields still matches expectations.
- Confirm `.encode()` is only used on schemas without unidirectional transforms.
- Confirm any branded/readonly schema expectations still match downstream TypeScript usage.
