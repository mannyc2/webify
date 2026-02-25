# Row-Level Security (RLS) Reference

PostgreSQL Row-Level Security with Drizzle ORM.

> **v1 RC:** `.enableRLS()` is deprecated. Use `pgTable.withRLS()` instead.

## Table of Contents
1. [Enabling RLS](#enabling-rls)
2. [Roles](#roles)
3. [Policies](#policies)
4. [Migration Configuration](#migration-configuration)
5. [Provider Integration](#provider-integration)

---

## Enabling RLS

### Enable on Table

```typescript
import { pgTable, integer, text } from 'drizzle-orm/pg-core';

// Method 1: .withRLS() (recommended, v1.0.0-beta.1+)
export const users = pgTable.withRLS('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

// Method 2: Adding a policy automatically enables RLS
```

### Enable Without Policies

Use `.withRLS()` when you want RLS enabled but policies managed elsewhere (e.g., by Supabase).

---

## Roles

Define PostgreSQL roles for RLS policies.

```typescript
import { pgRole } from 'drizzle-orm/pg-core';

// Create role
export const adminRole = pgRole('admin');

// Role with options
export const appRole = pgRole('app_user', {
  createRole: false,
  createDb: false,
  inherit: true,
});

// Reference existing role (won't be created in migrations)
export const existingRole = pgRole('authenticated').existing();
```

---

## Policies

### Basic Policy

```typescript
import { pgTable, pgPolicy, integer, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const posts = pgTable('posts', {
  id: integer('id').primaryKey(),
  authorId: integer('author_id'),
  content: text('content'),
}, (table) => [
  pgPolicy('posts_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,  // Everyone can select
  }),

  pgPolicy('posts_insert_policy', {
    for: 'insert',
    to: 'authenticated',
    withCheck: sql`${table.authorId} = current_user_id()`,
  }),

  pgPolicy('posts_update_policy', {
    for: 'update',
    to: 'authenticated',
    using: sql`${table.authorId} = current_user_id()`,
    withCheck: sql`${table.authorId} = current_user_id()`,
  }),

  pgPolicy('posts_delete_policy', {
    for: 'delete',
    to: 'authenticated',
    using: sql`${table.authorId} = current_user_id()`,
  }),
]);
```

### Policy Options

```typescript
pgPolicy('policy_name', {
  // Command this policy applies to
  for: 'all',           // 'all' | 'select' | 'insert' | 'update' | 'delete'

  // Role(s) policy applies to
  to: 'public',         // 'public' | role name | role reference | array

  // USING expression (for SELECT, UPDATE, DELETE)
  // Filters which rows are visible/modifiable
  using: sql`...`,

  // WITH CHECK expression (for INSERT, UPDATE)
  // Validates new/modified rows
  withCheck: sql`...`,

  // PERMISSIVE or RESTRICTIVE
  as: 'permissive',     // 'permissive' | 'restrictive'
})
```

### Multiple Roles

```typescript
import { pgRole, pgPolicy } from 'drizzle-orm/pg-core';

const admin = pgRole('admin');
const moderator = pgRole('moderator');

pgPolicy('admin_access', {
  for: 'all',
  to: [admin, moderator],
  using: sql`true`,
})
```

### PERMISSIVE vs RESTRICTIVE

```typescript
// PERMISSIVE (default): OR logic - any permissive policy allows access
pgPolicy('allow_own', {
  as: 'permissive',
  for: 'select',
  using: sql`author_id = current_user_id()`,
})

// RESTRICTIVE: AND logic - all restrictive policies must pass
pgPolicy('require_published', {
  as: 'restrictive',
  for: 'select',
  using: sql`published = true`,
})
```

### Link Policy to Existing Table

```typescript
import { pgPolicy } from 'drizzle-orm/pg-core';
import { posts } from './schema';

// Add policy to table defined elsewhere
export const newPolicy = pgPolicy('new_policy', {
  for: 'select',
  to: 'public',
  using: sql`true`,
}).link(posts);
```

---

## Migration Configuration

### Include Roles in Migrations

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  entities: {
    roles: true,  // Include role management in migrations
  },
});
```

### Filter Roles

```typescript
export default defineConfig({
  entities: {
    roles: {
      include: ['admin', 'app_user'],     // Only include these roles
      // OR
      exclude: ['postgres', 'supabase_*'], // Exclude these roles
    },
  },
});
```

### Provider Presets

```typescript
export default defineConfig({
  entities: {
    roles: {
      provider: 'supabase',  // 'supabase' | 'neon' | undefined
      // Automatically excludes provider-managed roles
    },
  },
});
```

---

## Provider Integration

### Supabase

```typescript
import { pgTable, pgPolicy, integer, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Use Supabase's auth.uid() function
export const profiles = pgTable.withRLS('profiles', {
  id: integer('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
}, (table) => [
  pgPolicy('profiles_select', {
    for: 'select',
    to: 'authenticated',
    using: sql`true`,
  }),

  pgPolicy('profiles_update_own', {
    for: 'update',
    to: 'authenticated',
    using: sql`${table.userId} = auth.uid()`,
    withCheck: sql`${table.userId} = auth.uid()`,
  }),
]);
```

Config for Supabase:

```typescript
// drizzle.config.ts
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
});
```

### Neon

```typescript
import { pgTable, pgPolicy, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { crudPolicy } from 'drizzle-orm/neon';

// Use Neon's auth helpers
export const todos = pgTable.withRLS('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  task: text('task'),
}, (table) => [
  // Neon provides crudPolicy helper
  crudPolicy({
    role: 'authenticated',
    read: sql`${table.userId} = auth.user_id()`,
    modify: sql`${table.userId} = auth.user_id()`,
  }),
]);
```

Config for Neon:

```typescript
// drizzle.config.ts
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  entities: {
    roles: {
      provider: 'neon',
    },
  },
});
```

---

## RLS on Views

Views inherit RLS from underlying tables by default. For custom view policies:

```typescript
import { pgView, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const activeUsers = pgView('active_users').as((qb) =>
  qb.select().from(users).where(eq(users.active, true))
);

// Note: View policies require PostgreSQL 15+
```

---

## Common Patterns

### User Owns Row

```typescript
pgPolicy('user_owns_row', {
  for: 'all',
  to: 'authenticated',
  using: sql`user_id = current_user_id()`,
  withCheck: sql`user_id = current_user_id()`,
})
```

### Admin Bypass

```typescript
pgPolicy('admin_all_access', {
  for: 'all',
  to: adminRole,
  using: sql`true`,
})
```

### Tenant Isolation

```typescript
pgPolicy('tenant_isolation', {
  for: 'all',
  to: 'authenticated',
  using: sql`tenant_id = current_setting('app.current_tenant')::integer`,
  withCheck: sql`tenant_id = current_setting('app.current_tenant')::integer`,
})
```

### Public Read, Authenticated Write

```typescript
[
  pgPolicy('public_read', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('authenticated_write', {
    for: 'insert',
    to: 'authenticated',
    withCheck: sql`true`,
  }),
]
```
