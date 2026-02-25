# Migrations Reference

Drizzle-kit workflows and configuration for database migrations.

> **v1 RC Changes:**
> - New folder structure: SQL files and snapshots grouped into separate migration folders
> - `journal.json` removed (eliminates Git conflicts)
> - `drizzle-kit drop` command removed
> - Run `drizzle-kit up` to migrate existing migrations to new format
> - New dialects: `mssql`, `cockroachdb`

## Table of Contents
1. [Configuration](#configuration)
2. [Migration Approaches](#migration-approaches)
3. [CLI Commands](#cli-commands)
4. [Custom Migrations](#custom-migrations)
5. [Runtime Migrations](#runtime-migrations)
6. [Advanced Configuration](#advanced-configuration)

---

## Configuration

### Basic drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',           // 'postgresql' | 'mysql' | 'sqlite' | 'turso' | 'mssql' | 'cockroachdb'
  schema: './src/db/schema.ts',    // Path to schema file(s)
  out: './drizzle',                // Output directory for migrations
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Multiple Schema Files

```typescript
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',       // Points to directory, finds all exports
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Multiple Config Files

```bash
# Development
npx drizzle-kit push --config=drizzle.dev.config.ts

# Production
npx drizzle-kit migrate --config=drizzle.prod.config.ts
```

---

## Migration Approaches

### Option 1: Database First (pull)

Database is source of truth. Generate TypeScript schema from existing database.

```bash
npx drizzle-kit pull
```

Use when:
- Working with existing database
- Database managed by external tools
- Database-first development preference

### Option 2: Push (Development)

Schema is source of truth. Push changes directly without SQL files.

```bash
npx drizzle-kit push
```

Use when:
- Rapid prototyping
- Development environment
- Don't need migration history

**Warning**: Not recommended for production. No rollback capability.

### Option 3: Generate + Migrate (Production)

Schema is source of truth. Generate SQL files, review, then apply.

```bash
# 1. Generate SQL migration from schema diff
npx drizzle-kit generate

# 2. Review generated SQL in ./drizzle/

# 3. Apply migration
npx drizzle-kit migrate
```

Use when:
- Production deployments
- Need migration history
- Want to review changes before applying
- Team collaboration

### Option 4: Generate + External Tool

Generate SQL with Drizzle-kit, apply with external tool (Flyway, Liquibase, etc.).

```bash
npx drizzle-kit generate
# Then use your tool to apply ./drizzle/*.sql
```

---

## CLI Commands

### generate

Generate SQL migration files from schema diff.

```bash
npx drizzle-kit generate
npx drizzle-kit generate --name=add_users_table
npx drizzle-kit generate --custom --name=seed_data  # Empty file for custom SQL
```

### migrate

Apply pending migrations to database.

```bash
npx drizzle-kit migrate
```

### push

Push schema directly to database (no SQL files).

```bash
npx drizzle-kit push
```

### pull

Introspect database and generate TypeScript schema.

```bash
npx drizzle-kit pull

# v1 RC: Initialize migration tracking on first pull
npx drizzle-kit pull --init
```

The `--init` flag creates a migration table and marks the first pulled migration as applied, so you can continue iterating from there.

### studio

Open Drizzle Studio GUI.

```bash
npx drizzle-kit studio
npx drizzle-kit studio --port=4000
```

### check

Verify migration files for issues.

```bash
npx drizzle-kit check
```

### up

Upgrade migration folder format (required for v1 RC).

```bash
npx drizzle-kit up
```

Run this to migrate from the old flat structure with `journal.json` to the new grouped folder structure.

### export

Output SQL to console.

```bash
npx drizzle-kit export
```

---

## Custom Migrations

### Generate Empty Migration

```bash
npx drizzle-kit generate --custom --name=seed_users
```

Creates empty file in `./drizzle/` for custom SQL:

```sql
-- drizzle/0001_seed_users.sql

INSERT INTO users (name, email) VALUES ('Admin', 'admin@example.com');
INSERT INTO users (name, email) VALUES ('User', 'user@example.com');
```

### Migration File Structure

```
drizzle/
├── 0000_init.sql
├── 0001_add_posts.sql
├── 0002_seed_users.sql
└── meta/
    ├── _journal.json      # Migration history
    └── 0000_snapshot.json # Schema snapshots
```

---

## Runtime Migrations

Apply migrations programmatically at application startup.

### PostgreSQL (node-postgres)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigrations() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete');
}

runMigrations().catch(console.error);
```

### PostgreSQL (postgres.js)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './drizzle' });
```

### SQLite (better-sqlite3)

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './drizzle' });  // Synchronous for better-sqlite3
```

---

## Advanced Configuration

### Full Config Reference

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Required
  dialect: 'postgresql',
  schema: './src/db/schema.ts',

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Or individual fields:
    // host: 'localhost',
    // port: 5432,
    // user: 'postgres',
    // password: 'password',
    // database: 'mydb',
    // ssl: true,
  },

  // Output
  out: './drizzle',

  // Table filters
  tablesFilter: ['users_*', 'posts'],   // Only include matching tables
  schemaFilter: ['public', 'app'],      // Only include matching schemas

  // Migrations table
  migrations: {
    table: '__drizzle_migrations',      // Custom migrations table name
    schema: 'public',
  },

  // Verbose output
  verbose: true,
  strict: true,

  // Introspection options (for pull)
  introspect: {
    casing: 'camel',  // 'camel' | 'preserve'
  },
});
```

### Environment-Specific Configs

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: isProduction
      ? process.env.DATABASE_URL!
      : 'postgresql://postgres:postgres@localhost:5432/dev',
  },
  verbose: !isProduction,
  strict: isProduction,
});
```

### Filtering Tables

```typescript
export default defineConfig({
  // Include only tables matching patterns
  tablesFilter: [
    'users',
    'posts',
    'comments',
    'auth_*',  // Glob pattern
  ],

  // Exclude tables
  tablesFilter: (tableName) => !tableName.startsWith('temp_'),
});
```

### Multiple Schemas

```typescript
export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/db/schema/auth.ts',
    './src/db/schema/blog.ts',
    './src/db/schema/shop.ts',
  ],
  out: './drizzle',
});
```
