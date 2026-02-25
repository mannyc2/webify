# Build Profiles

Use these as copy-paste baselines, then tune with other reference files.

## Table of Contents

- [1) Dev fast-iterate](#1-dev-fast-iterate)
- [2) Production web app](#2-production-web-app)
- [3) Production server bundle (Bun runtime)](#3-production-server-bundle-bun-runtime)
- [4) CLI executable (compile, optional bytecode)](#4-cli-executable-compile-optional-bytecode)
- [5) Library-friendly package strategy](#5-library-friendly-package-strategy)

## 1) Dev fast-iterate

Command:
```bash
bun build ./src/index.tsx --outdir ./dist --sourcemap linked --watch
```

Expected outputs:
- Rebuilt JS and asset outputs in `dist/`
- Linked sourcemaps for local debugging

Risks and when not to use:
- Not production-safe due to missing minify and broad debug exposure

Quick validation checks:
- Edit a source file and confirm rebuild occurs
- Confirm `sourceMappingURL` comment exists in output

## 2) Production web app

Command:
```bash
bun build ./src/index.tsx \
  --target browser \
  --format esm \
  --outdir ./dist \
  --splitting \
  --minify \
  --sourcemap external \
  --metafile ./dist/meta.json \
  --metafile-md ./dist/meta.md \
  --env PUBLIC_*
```

Expected outputs:
- Minified entry/chunk assets
- External sourcemaps and metafiles
- Inlined public-prefixed env vars only

Risks and when not to use:
- Do not use `--env inline` unless every env var is safe to ship
- Do not enable splitting if your runtime cannot load chunks correctly

Quick validation checks:
- Confirm no secret env vars appear in output
- Check `meta.md` for top byte contributors
- Load app and verify chunk requests resolve

## 3) Production server bundle (Bun runtime)

Command:
```bash
bun build ./src/server.ts \
  --target bun \
  --format esm \
  --outdir ./dist \
  --minify-syntax \
  --minify-whitespace \
  --sourcemap external \
  --metafile ./dist/meta.json
```

Expected outputs:
- Server bundle targeted for Bun
- External sourcemaps and metafile

Risks and when not to use:
- Avoid aggressive identifier minification until stacktrace requirements are clear

Quick validation checks:
- Run server from `dist` and verify startup and main paths
- Confirm source-mapped stack traces during forced error

## 4) CLI executable (compile, optional bytecode)

Command:
```bash
bun build ./src/cli.ts \
  --compile \
  --target bun-linux-x64 \
  --outfile ./dist/mycli \
  --minify \
  --sourcemap \
  --bytecode
```

Expected outputs:
- Standalone binary
- Bytecode-enabled startup optimization

Risks and when not to use:
- Bytecode couples to Bun version behavior; regenerate on Bun upgrade
- Binary size may increase noticeably

Quick validation checks:
- Run binary and measure cold start
- Rebuild after Bun update and compare startup

## 5) Library-friendly package strategy

Command:
```bash
bun build ./src/index.ts \
  --target node \
  --format esm \
  --outdir ./dist \
  --packages external \
  --sourcemap external \
  --metafile ./dist/meta.json
```

Expected outputs:
- Publishable bundle that leaves dependencies external

Risks and when not to use:
- Do not use for single-file deployables needing self-contained dependencies

Quick validation checks:
- Verify expected package imports remain in output
- Consumer test: install package and run a minimal import/use case
