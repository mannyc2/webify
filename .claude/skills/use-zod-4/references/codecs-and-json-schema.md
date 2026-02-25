# Codecs and JSON Schema

Use this reference for bidirectional transforms and schema export.

## Choose between transform and codec

- Use `.transform()` for one-way parsing logic.
- Use `z.codec(input, output, { decode, encode })` when data must move in both directions.
- Use `z.decode()` and `z.encode()` when inputs are already strongly typed.

## Parse vs decode/encode type safety

- `.parse()` accepts `unknown` and validates at runtime.
- `z.decode(schema, input)` requires input typed as the codec's input type.
- `z.encode(schema, value)` requires value typed as the codec's output type.
- Prefer decode/encode APIs when values are already strongly typed in application code.

## Implement a codec for ISO datetime

```ts
import * as z from "zod";

export const isoDatetimeToDate = z.codec(
  z.iso.datetime(),
  z.date(),
  {
    decode: (value) => new Date(value),
    encode: (value) => value.toISOString(),
  },
);

const parsed = isoDatetimeToDate.decode("2024-01-15T10:30:00.000Z");
const serialized = isoDatetimeToDate.encode(new Date("2024-01-15T10:30:00.000Z"));
```

## Apply safe and async codec variants

```ts
const safeDecode = isoDatetimeToDate.safeDecode("2024-01-15T10:30:00.000Z");
const safeEncode = isoDatetimeToDate.safeEncode(new Date("2024-01-15T10:30:00.000Z"));
const decodeAsync = await isoDatetimeToDate.decodeAsync("2024-01-15T10:30:00.000Z");
const encodeAsync = await isoDatetimeToDate.encodeAsync(new Date("2024-01-15T10:30:00.000Z"));
```

## Avoid encode pitfalls

- Avoid calling `.encode()` on schemas that contain `.transform()`.
- Expect runtime errors (not `ZodError`) when encoding through unidirectional transforms.
- Keep `.default()`, `.prefault()`, and `.catch()` behavior forward-only.

## Export JSON Schema from Zod

```ts
import * as z from "zod";

const User = z.object({
  id: z.uuid(),
  email: z.email(),
});

const schema = z.toJSONSchema(User, {
  target: "draft-2020-12",
});
```

Use `target: "openapi-3.0"` for OpenAPI schema output.

Use additional options for advanced conversion control:

- `io: "input"` to emit schema for input type instead of output type.
- `metadata` to copy registry metadata (`id`, `title`, `description`, custom fields).
- `override` to post-process generated JSON Schema nodes.
- `reused`, `cycles`, and `uri` for ref strategy and external references.

```ts
const inputSchema = z.toJSONSchema(User, { io: "input" });
```

## Metadata-aware export pattern

```ts
const Email = z.email().meta({
  id: "email_address",
  title: "Email address",
  description: "User email",
});

const emailJsonSchema = z.toJSONSchema(Email, {
  target: "openapi-3.0",
});
```

## Import JSON Schema into Zod (experimental)

`z.fromJSONSchema()` is explicitly experimental and not part of Zod's stable API surface.

```ts
const jsonSchema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

const schemaFromJson = z.fromJSONSchema(jsonSchema);
```

## Handle unrepresentable types

The following are not representable in JSON Schema and throw by default:

- `z.bigint()`
- `z.int64()`
- `z.symbol()`
- `z.undefined()`
- `z.void()`
- `z.date()`
- `z.map()`
- `z.set()`
- `z.transform()`
- `z.nan()`
- `z.custom()`

Set `unrepresentable: "any"` to map these to `{}`:

```ts
const json = z.toJSONSchema(z.bigint(), { unrepresentable: "any" });
```

## Control reuse and cycles

- Use `cycles: "ref"` (default) to break cycles via `$ref`.
- Use `reused: "ref"` to move shared schemas into `$defs`.
- Use `uri` to generate external `$ref` paths from `id` metadata.

## Object conversion nuance

- `z.object()` usually emits `additionalProperties: false` in output mode.
- In `io: "input"` mode, `additionalProperties` may be omitted.
- Use `z.strictObject()` and `z.looseObject()` intentionally when conversion semantics matter for downstream tools.
