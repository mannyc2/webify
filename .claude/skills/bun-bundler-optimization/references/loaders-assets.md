# Loaders and Asset Handling

## Built-in behavior

Bun maps extensions to built-in loaders (JS/TS/TSX/JSX/CSS/JSON/TOML/YAML/TXT/HTML/WASM/NAPI and others).

## Practical implications

- Unknown extension imports are typically treated as file assets and emitted to output.
- HTML and CSS loaders can rewrite and hash referenced assets.
- Loader overrides can be set via CLI `--loader` or JS API `loader` map.

## Asset strategy

- Prefer hashed asset naming in production for cache correctness.
- Use `publicPath` when assets/chunks are served from CDN.

## SQLite and embedded file notes

- SQLite import behavior depends on target and embed settings.
- For standalone executables, embedded file behavior can differ from normal outdir copies.

## Validation checks

- Confirm emitted asset paths match runtime host paths.
- Verify content hashes change only when content changes.
