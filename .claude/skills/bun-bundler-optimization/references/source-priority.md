# Source Priority and Conflict Resolution

## Priority order

1. Local installed CLI behavior (`bun build --help`) on the machine running builds
2. Official Bun bundler docs (`bundler/index` and option-specific pages)
3. Migration/comparison pages (for example, esbuild migration)

## Why this order

- Local CLI reflects the actual installed version behavior.
- Option pages are authoritative for current documented semantics.
- Migration pages are useful context but can lag feature parity updates.

## Conflict handling procedure

1. Detect mismatch (docs vs CLI or docs vs docs).
2. Prefer local CLI flags and behavior.
3. Confirm with `bundler/index` and the specific option page.
4. Record the chosen interpretation in task notes.

## Versioning policy

- Re-validate critical assumptions whenever Bun version changes.
- Keep capability-sensitive guidance tied to an explicit version/date in deliverables.

## Example conflict class

If migration docs mark an option unsupported but `bun build --help` and `bundler/index` show support, treat the option as supported for the current installed version.
