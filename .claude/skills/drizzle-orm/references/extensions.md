# Extensions Reference

Drizzle ORM extensions for validation and type generation.

> **v1 RC (beta.15+):** Schema generation is now **first-class** in drizzle-orm. The separate `drizzle-zod`, `drizzle-valibot`, `drizzle-typebox` packages are deprecated. Just install the validator library itself.

## Table of Contents
1. [Zod Integration](#zod-integration)
2. [Valibot Integration](#valibot-integration)
3. [TypeBox Integration](#typebox-integration)
4. [ArkType Integration](#arktype-integration)
5. [Data Type Reference](#data-type-reference)

---

## Zod Integration

Generate Zod schemas from Drizzle table definitions. **First-class support** - no extra packages needed.

### Installation

```bash
# v1 RC - just install zod
bun add drizzle-orm@beta zod
```

**Requirements:** drizzle-orm v1.0.0-beta.15+, zod v3.25.1+

### Schema Generation

```typescript
import { pgTable, text, integer } from 'drizzle-orm/pg-core';

// v1 RC - import from drizzle-orm/zod
import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-orm/zod';

// Legacy (v0.x) - import from drizzle-zod
// import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-zod';

const users = pgTable('users', {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  name: text().notNull(),
  age: integer().notNull(),
  bio: text(),
});

// Select schema - for query results
const userSelectSchema = createSelectSchema(users);
// { id: number; name: string; age: number; bio: string | null }

// Insert schema - excludes generated columns, handles optionals
const userInsertSchema = createInsertSchema(users);
// { name: string; age: number; bio?: string | null }

// Update schema - all fields optional for partial updates
const userUpdateSchema = createUpdateSchema(users);
// { name?: string; age?: number; bio?: string | null }
```

### Usage with Queries

```typescript
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod';

// Validate API input before insert
const userInsertSchema = createInsertSchema(users);

async function createUser(input: unknown) {
  const parsed = userInsertSchema.parse(input);
  return db.insert(users).values(parsed);
}

// Validate query results
const userSelectSchema = createSelectSchema(users);

async function getUser(id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return userSelectSchema.parse(row);
}

// Partial updates
const userUpdateSchema = createUpdateSchema(users);

async function updateUser(id: number, input: unknown) {
  const parsed = userUpdateSchema.parse(input);
  return db.update(users).set(parsed).where(eq(users.id, id));
}
```

### Refining Schemas

Extend or overwrite fields:

```typescript
import { z } from 'zod';
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/zod';

const users = pgTable('users', {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  bio: text(),
  preferences: json(),
});

const userInsertSchema = createInsertSchema(users, {
  // Extend: add validation to generated schema
  name: (schema) => schema.min(2).max(50),
  
  // Extend: add email validation
  email: (schema) => schema.email(),
  
  // Extend: add length limit
  bio: (schema) => schema.max(1000),
  
  // Overwrite: replace json with specific schema
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
});
```

### Extended Zod Instances

Use with libraries that extend Zod (e.g., @hono/zod-openapi):

```typescript
import { createSchemaFactory } from 'drizzle-orm/zod';
import { z } from '@hono/zod-openapi';

const { createInsertSchema, createSelectSchema } = createSchemaFactory({
  zodInstance: z,
});

const userInsertSchema = createInsertSchema(users, {
  name: (schema) => schema.openapi({ example: 'John Doe' }),
  email: (schema) => schema.email().openapi({ example: 'john@example.com' }),
});
```

### Type Coercion

Auto-coerce strings to dates, numbers, etc:

```typescript
import { createSchemaFactory } from 'drizzle-orm/zod';

const { createInsertSchema } = createSchemaFactory({
  coerce: {
    date: true,  // z.coerce.date() for timestamp/date columns
  },
  // Or coerce all supported types:
  // coerce: true,
});

const users = pgTable('users', {
  createdAt: timestamp().notNull(),
});

const schema = createInsertSchema(users);
// createdAt accepts string input, coerces to Date
```

### Views & Enums

```typescript
import { pgEnum, pgView } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-orm/zod';

// Enum
const roleEnum = pgEnum('role', ['admin', 'user', 'guest']);
const roleSchema = createSelectSchema(roleEnum);
// z.enum(['admin', 'user', 'guest'])

// View
const activeUsers = pgView('active_users').as((qb) =>
  qb.select().from(users).where(eq(users.active, true))
);
const activeUserSchema = createSelectSchema(activeUsers);
```

### Type Mappings

| Drizzle Type | Zod Schema |
|--------------|------------|
| `boolean` | `z.boolean()` |
| `text`, `varchar`, `char` | `z.string()` |
| `uuid` | `z.string().uuid()` |
| `integer`, `serial` | `z.number().int()` |
| `bigint({ mode: 'number' })` | `z.number().int()` |
| `bigint({ mode: 'bigint' })` | `z.bigint()` |
| `real`, `float`, `double` | `z.number()` |
| `numeric`, `decimal` | `z.string()` |
| `timestamp` (mode: date) | `z.date()` |
| `timestamp` (mode: string) | `z.string()` |
| `json`, `jsonb` | `z.unknown()` |
| `array(...)` | `z.array(baseSchema)` |

---

## TypeBox Integration

Generate TypeBox schemas from Drizzle tables. **First-class support**.

### Installation

```bash
# v1 RC - just install typebox
bun add drizzle-orm@beta typebox

# For @sinclair/typebox (legacy API)
bun add drizzle-orm@beta @sinclair/typebox
# Import from drizzle-orm/typebox-legacy
```

### Usage

```typescript
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/typebox';

const users = pgTable('users', {
  id: integer().primaryKey(),
  name: text().notNull(),
});

const userSelectSchema = createSelectSchema(users);
const userInsertSchema = createInsertSchema(users);

// Use with TypeBox validation
import { Value } from 'typebox/value';

const isValid = Value.Check(userInsertSchema, { name: 'John' });
```

### Refining Schemas

```typescript
import { Type } from 'typebox';
import { createInsertSchema } from 'drizzle-orm/typebox';

const userInsertSchema = createInsertSchema(users, {
  name: (schema) => Type.String({ ...schema, minLength: 2, maxLength: 50 }),
  email: Type.String({ format: 'email' }),
});
```

---

## Valibot Integration

Generate Valibot schemas from Drizzle tables. **First-class support**.

### Installation

```bash
# v1 RC - just install valibot
bun add drizzle-orm@beta valibot
```

### Usage

```typescript
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/valibot';
import * as v from 'valibot';

const users = pgTable('users', {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
});

const userSelectSchema = createSelectSchema(users);
const userInsertSchema = createInsertSchema(users);

// Validate
const result = v.safeParse(userInsertSchema, { name: 'John', email: 'john@example.com' });
```

### Refining Schemas

```typescript
import * as v from 'valibot';
import { createInsertSchema } from 'drizzle-orm/valibot';

const userInsertSchema = createInsertSchema(users, {
  name: (schema) => v.pipe(schema, v.minLength(2), v.maxLength(50)),
  email: v.pipe(v.string(), v.email()),
});
```

---

## ArkType Integration

Generate ArkType schemas from Drizzle tables. **First-class support**.

### Installation

```bash
# v1 RC - just install arktype
bun add drizzle-orm@beta arktype
```

### Usage

```typescript
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-orm/arktype';

const users = pgTable('users', {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
});

const userSelectSchema = createSelectSchema(users);
const userInsertSchema = createInsertSchema(users);

// Validate
const result = userInsertSchema({ name: 'John', email: 'john@example.com' });
```

---

## Data Type Reference

How Drizzle column types map to Zod schemas:

### Boolean

| Drizzle | Zod |
|---------|-----|
| `pg.boolean()` | `z.boolean()` |
| `mysql.boolean()` | `z.boolean()` |
| `sqlite.integer({ mode: 'boolean' })` | `z.boolean()` |

### Date

| Drizzle | Zod |
|---------|-----|
| `pg.date({ mode: 'date' })` | `z.date()` |
| `pg.timestamp({ mode: 'date' })` | `z.date()` |
| `mysql.date({ mode: 'date' })` | `z.date()` |
| `mysql.datetime({ mode: 'date' })` | `z.date()` |
| `sqlite.integer({ mode: 'timestamp' })` | `z.date()` |

### String

| Drizzle | Zod |
|---------|-----|
| `pg.text()` | `z.string()` |
| `pg.varchar()` | `z.string()` |
| `pg.numeric()` | `z.string()` |
| `pg.uuid()` | `z.string().uuid()` |
| `pg.char({ length: N })` | `z.string().length(N)` |
| `pg.varchar({ length: N })` | `z.string().max(N)` |
| `pg.text({ enum: [...] })` | `z.enum([...])` |

### Integer

| Drizzle | Zod |
|---------|-----|
| `pg.smallint()` | `z.number().min(-32768).max(32767).int()` |
| `pg.integer()` | `z.number().min(-2147483648).max(2147483647).int()` |
| `pg.serial()` | `z.number().min(-2147483648).max(2147483647).int()` |
| `mysql.tinyint()` | `z.number().min(-128).max(127).int()` |
| `mysql.tinyint({ unsigned: true })` | `z.number().min(0).max(255).int()` |
| `mysql.int({ unsigned: true })` | `z.number().min(0).max(4294967295).int()` |

### Float

| Drizzle | Zod |
|---------|-----|
| `pg.real()` | `z.number()` |
| `pg.doublePrecision()` | `z.number()` |
| `mysql.float()` | `z.number()` |
| `mysql.double()` | `z.number()` |
| `sqlite.real()` | `z.number()` |

### BigInt

| Drizzle | Zod |
|---------|-----|
| `pg.bigint({ mode: 'number' })` | `z.number().int()` (safe integer range) |
| `pg.bigint({ mode: 'bigint' })` | `z.bigint()` |
| `mysql.bigint({ mode: 'bigint' })` | `z.bigint()` |
| `sqlite.blob({ mode: 'bigint' })` | `z.bigint()` |

### JSON

| Drizzle | Zod |
|---------|-----|
| `pg.json()` | `z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.any()), z.array(z.any())])` |
| `pg.jsonb()` | Same as above |
| `mysql.json()` | Same as above |
| `sqlite.text({ mode: 'json' })` | Same as above |

### Geometry (PostgreSQL)

| Drizzle | Zod |
|---------|-----|
| `pg.point({ mode: 'tuple' })` | `z.tuple([z.number(), z.number()])` |
| `pg.point({ mode: 'xy' })` | `z.object({ x: z.number(), y: z.number() })` |
| `pg.line({ mode: 'tuple' })` | `z.tuple([z.number(), z.number(), z.number()])` |
| `pg.line({ mode: 'abc' })` | `z.object({ a: z.number(), b: z.number(), c: z.number() })` |
| `pg.vector({ dimensions: N })` | `z.array(z.number()).length(N)` |

### Arrays

| Drizzle | Zod |
|---------|-----|
| `pg.dataType().array()` | `z.array(baseSchema)` |
| `pg.dataType().array(N)` | `z.array(baseSchema).length(N)` |

---

## Common Patterns

### API Validation Layer

```typescript
import { createInsertSchema, createUpdateSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull(),
});

// Strict insert schema with custom validations
export const createUserSchema = createInsertSchema(users, {
  name: (s) => s.min(1).max(100),
  email: (s) => s.email(),
});

// Update schema (all optional)
export const updateUserSchema = createUpdateSchema(users, {
  name: (s) => s.min(1).max(100),
  email: (s) => s.email(),
});

// API route handler
app.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const user = await db.insert(users).values(parsed.data).returning();
  return res.json(user);
});
```

### Form Validation

```typescript
import { createInsertSchema } from 'drizzle-orm/zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userFormSchema = createInsertSchema(users, {
  name: (s) => s.min(2, 'Name must be at least 2 characters'),
  email: (s) => s.email('Invalid email address'),
});

type UserFormData = z.infer<typeof userFormSchema>;

function UserForm() {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
  });
  
  // ...
}
```

### OpenAPI Integration

```typescript
import { createSchemaFactory } from 'drizzle-orm/zod';
import { z } from '@hono/zod-openapi';

const { createSelectSchema, createInsertSchema } = createSchemaFactory({
  zodInstance: z,
});

export const UserSchema = createSelectSchema(users).openapi('User');

export const CreateUserSchema = createInsertSchema(users, {
  name: (s) => s.openapi({ example: 'John Doe' }),
  email: (s) => s.email().openapi({ example: 'john@example.com' }),
}).openapi('CreateUser');
```
