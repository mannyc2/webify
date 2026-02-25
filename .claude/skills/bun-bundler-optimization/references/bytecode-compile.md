# Bytecode and Compile

## Decision matrix

Use `--compile` when distribution simplicity and startup matter more than binary size.
Use `--bytecode` when cold-start gains justify size increase and version-coupled rebuilds.

## Key facts

- Bytecode benefits startup-heavy tools (CLI, short-lived jobs).
- Bytecode behavior is tied to Bun/JavaScriptCore version behavior; regenerate on Bun upgrade.
- `--compile` embeds runtime and bundled code into a standalone executable.
- `--bytecode` plus `--compile` is valid and often useful for CLI latency.

## Conservative defaults

- Start with `--compile --minify --sourcemap`.
- Add `--bytecode` only after measuring startup bottlenecks.

## Sample commands

```bash
# baseline executable
bun build ./src/cli.ts --compile --outfile ./dist/mycli --minify --sourcemap

# startup-optimized executable
bun build ./src/cli.ts --compile --outfile ./dist/mycli --minify --sourcemap --bytecode
```

## Risks

- Larger artifacts and potential distribution friction.
- Need to rebuild bytecode-enabled outputs when Bun version changes.

## Validation checks

- Measure cold starts across several runs.
- Rebuild after Bun updates and recheck behavior.
