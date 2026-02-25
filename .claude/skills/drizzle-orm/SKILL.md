---
name: drizzle-orm
description: "TypeScript ORM for SQL databases (v1 RC). Use when building database schemas, writing type-safe queries, setting up relations, or managing migrations with Drizzle ORM. Triggers on drizzle schema definition, drizzle queries, drizzle relations, drizzle migrations, drizzle-kit, type-safe SQL, PostgreSQL/MySQL/SQLite with TypeScript. Also use when user mentions drizzle in database context or asks about TypeScript ORMs."
---

# Drizzle ORM Skill

Type-safe TypeScript ORM with SQL-like syntax. Schema acts as single source of truth for queries and migrations.

> **v1 RC (1.0.0-beta.x):** Install with `bun add drizzle-orm@beta drizzle-kit@beta -D`

## Quick Start

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { defineRelations } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// 1. Define schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
});

// 2. Define relations (v2)
const relations = defineRelations({ users, posts }, (r) => ({
  users: {
    posts: r.many.posts({ from: r.users.id, to: r.posts.authorId }),
  },
  posts: {
    author: r.one.users({ from: r.posts.authorId, to: r.users.id }),
  },
}));

// 3. Connect with relations
const db = drizzle(process.env.DATABASE_URL!, { relations });

// 4. SQL-like queries
const allUsers = await db.select().from(users);
const user = await db.select().from(users).where(eq(users.id, 1));

// 5. Relational queries (v2 object syntax)
const usersWithPosts = await db.query.users.findMany({
  where: { id: { gt: 10 } },
  orderBy: { createdAt: 'desc' },
  with: { posts: true },
});
```

## Database Drivers

| Database | Package | Table Function |
|----------|---------|----------------|
| PostgreSQL | `drizzle-orm/pg-core` | `pgTable` |
| MySQL | `drizzle-orm/mysql-core` | `mysqlTable` |
| SQLite | `drizzle-orm/sqlite-core` | `sqliteTable` |
| MSSQL | `drizzle-orm/mssql-core` | `mssqlTable` |
| CockroachDB | `drizzle-orm/cockroach` | `pgTable` |

## Core Operations

```typescript
import { eq, and, gt, like, isNull, inArray } from 'drizzle-orm';

// SELECT
db.select().from(users);
db.select({ name: users.name }).from(users);
db.select().from(users).where(eq(users.id, 1));
db.select().from(users).where(and(gt(users.id, 10), like(users.email, '%@gmail.com')));

// INSERT
await db.insert(users).values({ name: 'John', email: 'john@example.com' });
await db.insert(users).values([{ name: 'A' }, { name: 'B' }]);
const [newUser] = await db.insert(users).values({ name: 'New' }).returning();

// UPDATE
await db.update(users).set({ name: 'Updated' }).where(eq(users.id, 1));

// DELETE
await db.delete(users).where(eq(users.id, 1));

// JOIN
db.select().from(posts).innerJoin(users, eq(posts.authorId, users.id));
db.select().from(users).leftJoin(posts, eq(users.id, posts.authorId));
```

## Migrations (drizzle-kit)

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',  // postgresql | mysql | sqlite | turso | mssql | cockroachdb
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```bash
npx drizzle-kit generate  # Generate SQL from schema diff
npx drizzle-kit migrate   # Apply migrations
npx drizzle-kit push      # Push schema directly (dev)
npx drizzle-kit pull      # Introspect DB to schema
npx drizzle-kit up        # Upgrade migration folder format (v1 RC)
npx drizzle-kit studio    # GUI browser
```

## Common Patterns

```typescript
// Reusable timestamps
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
};

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  ...timestamps,
});

// Transactions
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ name: 'A' }).returning();
  await tx.insert(posts).values({ title: 'Post', authorId: user.id });
});

// Type inference
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
```

## References

- **[schema.md](references/schema.md)** - Column types, modifiers, constraints, indexes, custom types, generated columns
- **[relations.md](references/relations.md)** - defineRelations, one/many, through tables, aliases, indexing strategies
- **[queries.md](references/queries.md)** - Filters/operators, relational queries (v2 object syntax), CTEs, extras
- **[advanced.md](references/advanced.md)** - Set operations, batch API, caching, read replicas, dynamic queries
- **[migrations.md](references/migrations.md)** - drizzle-kit workflows, custom migrations, runtime migrations
- **[seeding.md](references/seeding.md)** - drizzle-seed generators, refinements, weighted random
- **[extensions.md](references/extensions.md)** - drizzle-orm/zod, drizzle-orm/valibot, drizzle-orm/typebox validation
- **[rls.md](references/rls.md)** - PostgreSQL Row-Level Security policies, roles, Supabase/Neon
