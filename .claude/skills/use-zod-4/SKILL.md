---
name: use-zod-4
description: Implement and migrate TypeScript runtime validation with Zod 4. Use when Codex needs to define or update Zod schemas, parse untrusted inputs, model unions/records/recursive types, customize or format validation errors, generate JSON Schema or OpenAPI-compatible schemas, or migrate Zod 3 code to Zod 4.
---

# Use Zod 4

Use this skill to design validation boundaries that keep runtime inputs safe while preserving precise TypeScript inference.

## Quick Start

Prerequisites:

- Use TypeScript `v5.5+`.
- Enable `compilerOptions.strict: true` in `tsconfig.json`.

1. Define the schema at the data boundary (API request, env vars, queue payload, external API response).
2. Parse with `.parse()` for fail-fast flows or `.safeParse()` for user-facing flows.
3. Use `.parseAsync()` or `.safeParseAsync()` whenever any async refinement or transform exists anywhere in the schema tree.
4. Return parsed output types (`z.infer`/`z.output`) from the boundary layer.
5. Format errors with `z.flattenError()`, `z.treeifyError()`, or `z.prettifyError()` based on consumer needs.

## Workflow

### 1) Choose object strictness intentionally

- Use `z.object()` to strip unknown keys.
- Use `z.strictObject()` to reject unknown keys.
- Use `z.looseObject()` to preserve unknown keys.
- Use `.catchall(schema)` to validate unknown keys.

### 2) Compose schemas with low-friction patterns

- Prefer spread composition over long `.extend()` chains for large schemas.
- Use `.safeExtend()` when extending refined objects.
- Use `z.discriminatedUnion()` for tagged unions.
- Use `z.partialRecord()` when enum-key records should remain optional.
- Add explicit getter return types for complex recursive schemas when TypeScript inference fails.

```ts
import * as z from "zod";

const BaseUser = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

const AdminUser = z.object({
  ...BaseUser.shape,
  role: z.literal("admin"),
});
```

### 3) Keep input and output types explicit

- Use `z.input<typeof Schema>` for pre-parse input type.
- Use `z.output<typeof Schema>` (or `z.infer`) for post-parse output type.
- Use `z.coerce.*` only at true boundary edges where coercion is expected.

### 4) Build predictable error handling

- Set schema-level messages with the `error` param.
- Set per-parse messages for request-scoped customization.
- Set global defaults with `z.config({ customError })`.
- Respect precedence: schema-level > per-parse > global > locale.

### 5) Choose transform direction correctly

- Use `z.codec()` for bidirectional decode/encode transforms.
- Use `.transform()` for one-way transforms only.
- Avoid `encode()` through unidirectional transforms; that throws at runtime.

## Decision Guide

- Need strict request validation with narrow unions: use `z.discriminatedUnion()`.
- Need bool-like env parsing: use `z.stringbool()`.
- Need exact enum-key object shape: use `z.record(z.enum(...), ...)`.
- Need optional enum-key object shape: use `z.partialRecord(...)`.
- Need JSON Schema/OpenAPI output: use `z.toJSONSchema(schema, { target: "openapi-3.0" })`.
- Need JSON Schema with titles/descriptions/examples/ids: use `.meta()`/`z.globalRegistry` patterns before conversion.
- Need rich runtime representation at boundaries: use codecs (`z.codec` + `z.decode`/`z.encode`).
- Need import/version transition guidance during upgrade: use `references/migration-from-zod-3.md`.

## References

- Use `references/patterns-and-recipes.md` for common implementation templates.
- Use `references/migration-from-zod-3.md` for upgrade strategy and replacement map.
- Use `references/codecs-and-json-schema.md` for bidirectional transforms and conversion constraints.
