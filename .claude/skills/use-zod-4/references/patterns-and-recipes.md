# Patterns and Recipes

Use these templates as defaults, then tailor constraints and error handling to each boundary.

## Contents

- Validate an HTTP request body
- Parse environment variables
- Validate a discriminated union
- Use async refinements correctly
- Shape a nested error tree for UI
- Model recursive structures
- Prefer spread composition for larger object schemas
- Customize per-parse errors with reportInput
- Configure global errors and locales
- Attach metadata for JSON Schema export
- Model exhaustive vs partial enum-key records
- Validate mutually exclusive payload shapes

## Validate an HTTP request body

```ts
import * as z from "zod";

const CreateOrder = z.strictObject({
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  sizeUsd: z.number().positive(),
  clientOrderId: z.string().optional(),
});

export function parseCreateOrder(input: unknown) {
  const result = CreateOrder.safeParse(input);
  if (!result.success) {
    return {
      ok: false as const,
      errors: z.flattenError(result.error),
    };
  }

  return {
    ok: true as const,
    data: result.data,
  };
}
```

## Parse environment variables

```ts
import * as z from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
  ENABLE_METRICS: z.stringbool().default(false),
});

export const env = Env.parse(process.env);
```

## Validate a discriminated union

```ts
import * as z from "zod";

const Event = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("trade"),
    price: z.number().positive(),
  }),
  z.object({
    type: z.literal("heartbeat"),
    timestamp: z.iso.datetime(),
  }),
]);
```

## Use async refinements correctly

```ts
import * as z from "zod";

const UserId = z.string().refine(async (id) => {
  return id.length > 0;
});

// Always use parseAsync/safeParseAsync for async checks.
const result = await UserId.safeParseAsync("abc123");
```

## Shape a nested error tree for UI

```ts
import * as z from "zod";

const Profile = z.strictObject({
  username: z.string().min(3),
  settings: z.object({
    timezone: z.string(),
  }),
});

const result = Profile.safeParse({
  username: "ab",
  settings: { timezone: 42 },
});

if (!result.success) {
  const tree = z.treeifyError(result.error);
  // tree.properties?.settings?.properties?.timezone?.errors
}
```

## Model recursive structures

```ts
import * as z from "zod";

const Category = z.object({
  name: z.string(),
  get children(): z.ZodArray<typeof Category> {
    return z.array(Category);
  },
});
```

## Prefer spread composition for larger object schemas

```ts
import * as z from "zod";

const Base = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});

const WithOwner = z.object({
  ...Base.shape,
  ownerId: z.uuid(),
});
```

## Customize per-parse errors with reportInput

```ts
import * as z from "zod";

const Payload = z.object({
  quantity: z.number().int().positive(),
});

const result = Payload.safeParse({ quantity: "nope" }, {
  reportInput: true,
  error: (iss) => {
    if (iss.code === "invalid_type") {
      return `Expected ${iss.expected}`;
    }
    return undefined;
  },
});

if (!result.success) {
  // Use carefully: `reportInput` can expose sensitive values in logs.
  console.error(result.error.issues);
}
```

## Configure global errors and locales

```ts
import * as z from "zod";
import { en } from "zod/locales";

z.config(en());
z.config({
  customError: (iss) => {
    if (iss.code === "too_small") return "Value is too small";
    return undefined;
  },
});

// Precedence reminder:
// schema-level `error` > per-parse `error` > global customError > locale
```

## Attach metadata for JSON Schema export

```ts
import * as z from "zod";

const Email = z.email().meta({
  id: "email_address",
  title: "Email address",
  description: "User email",
  examples: ["first.last@example.com"],
});

const jsonSchema = z.toJSONSchema(Email);
```

## Model exhaustive vs partial enum-key records

```ts
import * as z from "zod";

const Keys = z.enum(["id", "name", "email"]);

const Exhaustive = z.record(Keys, z.string());
// Requires all enum keys.

const Partial = z.partialRecord(Keys, z.string());
// Allows missing enum keys.
```

## Validate mutually exclusive payload shapes

```ts
import * as z from "zod";

const Payment = z.xor([
  z.object({ type: z.literal("card"), cardNumber: z.string() }),
  z.object({ type: z.literal("bank"), accountNumber: z.string() }),
]);
```
