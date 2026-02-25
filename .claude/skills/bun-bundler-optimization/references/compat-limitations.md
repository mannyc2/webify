# Compatibility and Limitations

## Capability baseline

- Baseline used for this skill: Bun 1.3.9 (verified 2026-02-24).

## Known sharp edges

- Migration docs may lag current bundler capabilities.
- Some options are marked experimental or have partial behavior.
- `feature()` requires string literals.
- Bun bundler is not a typechecker and does not replace `tsc` validation.
- Syntax down-leveling support is limited compared to some toolchains.
- Standalone HTML has constraints (for example, no splitting with compile target browser).
- Compile mode has option compatibility constraints (for example, target and entrypoint limitations).
- Plugin lifecycle details include caveats such as `defer()` usage limits.

## Practical rule

Treat these as compatibility checks before committing to a build strategy in CI or release pipelines.

## Validation checks

- Confirm chosen flags are present in local `bun build --help`.
- Test representative builds for each target profile.
- Re-run after Bun upgrades and compare output behavior.
