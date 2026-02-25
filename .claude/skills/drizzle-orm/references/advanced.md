# Advanced Patterns Reference

Set operations, batching, caching, read replicas, and utilities.

## Table of Contents
1. [Set Operations](#set-operations)
2. [Batch API](#batch-api)
3. [Dynamic Query Building](#dynamic-query-building)
4. [Caching](#caching)
5. [Read Replicas](#read-replicas)
6. [Utilities](#utilities)
7. [Performance](#performance)

---

## Set Operations

Combine results from multiple queries. Import from dialect-specific package.

```typescript
import { union, unionAll, intersect, intersectAll, except, exceptAll } from 'drizzle-orm/pg-core';
```

### UNION / UNION ALL

```typescript
// UNION: Unique rows only
const uniqueNames = await union(
  db.select({ name: users.name }).from(users),
  db.select({ name: customers.name }).from(customers)
).limit(10);

// UNION ALL: Includes duplicates (faster)
const allTransactions = await unionAll(
  db.select({ id: onlineSales.id, amount: onlineSales.amount }).from(onlineSales),
  db.select({ id: inStoreSales.id, amount: inStoreSales.amount }).from(inStoreSales)
);
```

### INTERSECT / INTERSECT ALL

```typescript
// INTERSECT: Rows in both queries, unique
const commonCourses = await intersect(
  db.select({ name: depA.courseName }).from(depA),
  db.select({ name: depB.courseName }).from(depB)
);

// INTERSECT ALL: Common rows, preserving duplicates
const commonProducts = await intersectAll(
  db.select({ productId: ordersA.productId }).from(ordersA),
  db.select({ productId: ordersB.productId }).from(ordersB)
);
```

### EXCEPT / EXCEPT ALL

```typescript
// EXCEPT: In first query but not second, unique
const exclusiveProjects = await except(
  db.select({ name: depA.projectName }).from(depA),
  db.select({ name: depB.projectName }).from(depB)
);

// EXCEPT ALL: Preserving duplicates
const regularOnly = await exceptAll(
  db.select({ productId: allOrders.productId }).from(allOrders),
  db.select({ productId: vipOrders.productId }).from(vipOrders)
);
```

---

## Batch API

Execute multiple statements in a single network round-trip. Supported by **LibSQL, Neon, and D1**.

```typescript
const batchResponse = await db.batch([
  db.insert(users).values({ id: 1, name: 'John' }).returning(),
  db.update(users).set({ name: 'Jane' }).where(eq(users.id, 1)),
  db.select().from(users).where(eq(users.id, 1)),
  db.delete(users).where(eq(users.id, 2)),
]);

// batchResponse is a tuple with results in order
const [insertResult, updateResult, selectResult, deleteResult] = batchResponse;
```

Use for:
- Reducing network latency
- Atomic operations (all succeed or fail together on some drivers)
- Serverless environments where connections are expensive

---

## Dynamic Query Building

### $dynamic() Mode

Standard query builders are immutable. Use `.$dynamic()` for conditional chaining:

```typescript
import { type PgSelect } from 'drizzle-orm/pg-core';

// Reusable pagination helper
function withPagination<T extends PgSelect>(
  qb: T,
  page: number = 1,
  pageSize: number = 10
) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

// Reusable ordering helper
function withOrdering<T extends PgSelect>(
  qb: T,
  column: 'name' | 'createdAt',
  direction: 'asc' | 'desc' = 'desc'
) {
  const col = column === 'name' ? users.name : users.createdAt;
  return qb.orderBy(direction === 'asc' ? asc(col) : desc(col));
}

// Usage
let query = db.select().from(users).where(eq(users.active, true)).$dynamic();

query = withOrdering(query, 'createdAt', 'desc');
query = withPagination(query, 2, 20);

const results = await query;
```

### Compatible Generic Types

| Database | Select | Insert | Update | Delete |
|----------|--------|--------|--------|--------|
| PostgreSQL | `PgSelect` | `PgInsert` | `PgUpdate` | `PgDelete` |
| MySQL | `MySqlSelect` | `MySqlInsert` | `MySqlUpdate` | `MySqlDelete` |
| SQLite | `SQLiteSelect` | `SQLiteInsert` | `SQLiteUpdate` | `SQLiteDelete` |

---

## Caching

### Upstash Redis Integration

Built-in caching with Upstash:

```typescript
import { upstashCache } from 'drizzle-orm/cache/upstash';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(process.env.DATABASE_URL!, {
  cache: upstashCache({
    url: process.env.UPSTASH_URL!,
    token: process.env.UPSTASH_TOKEN!,
    global: false,  // Opt-in per query (default)
    config: { ex: 60 },  // Default TTL in seconds
  }),
});

// Cached query
const users = await db.select().from(users)
  .$withCache({ config: { ex: 300 } });  // 5 minute TTL

// Disable auto-invalidation for eventual consistency
const stats = await db.select().from(stats)
  .$withCache({ autoInvalidate: false });

// Manual invalidation
await db.$cache.invalidate({ tables: [users] });
await db.$cache.invalidate({ tags: ['user_list'] });
```

### Custom Cache Implementation

```typescript
import { Cache, type CacheConfig } from 'drizzle-orm';

class CustomCache extends Cache {
  private store = new Map<string, { data: any; expires: number }>();

  override strategy(): 'explicit' | 'all' {
    return 'explicit';  // Only cache queries with $withCache()
  }

  override async get(key: string): Promise<any[] | undefined> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  override async put(
    key: string,
    response: any,
    tables: string[],
    config?: CacheConfig
  ): Promise<void> {
    const ttl = config?.ex ?? 60;
    this.store.set(key, {
      data: response,
      expires: Date.now() + ttl * 1000,
    });
  }

  override async onMutate(params: {
    tags: string | string[];
    tables: string | string[] | Table[];
  }): Promise<void> {
    // Invalidate relevant entries
    this.store.clear();
  }
}

const db = drizzle(client, { cache: new CustomCache() });
```

---

## Read Replicas

Route reads to replicas, writes to primary:

```typescript
import { withReplicas } from 'drizzle-orm/pg-core';

const primaryDb = drizzle('postgres://primary...');
const replica1 = drizzle('postgres://replica1...');
const replica2 = drizzle('postgres://replica2...');

// Round-robin (default)
const db = withReplicas(primaryDb, [replica1, replica2]);

// Custom selection logic (weighted)
const dbWeighted = withReplicas(primaryDb, [replica1, replica2], (replicas) => {
  // 70% to replica1, 30% to replica2
  return Math.random() < 0.7 ? replicas[0] : replicas[1];
});

// Usage
await db.select().from(users);          // Routes to replica
await db.insert(users).values({...});   // Routes to primary
await db.update(users).set({...});      // Routes to primary
await db.delete(users).where(...);      // Routes to primary

// Force primary for critical reads
await db.$primary.select().from(users);
```

---

## Utilities

### Logging

```typescript
import { DefaultLogger, type LogWriter } from 'drizzle-orm/logger';

// Built-in logging
const db = drizzle(client, { logger: true });

// Custom logger
class MyLogger implements LogWriter {
  write(message: string) {
    console.log('[DRIZZLE]', message);
  }
}

const db = drizzle(client, {
  logger: new DefaultLogger({ writer: new MyLogger() }),
});
```

### Standalone Query Builder

Generate SQL without database connection:

```typescript
import { QueryBuilder } from 'drizzle-orm/pg-core';

const qb = new QueryBuilder();

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();

console.log(sql);    // SELECT * FROM users WHERE name = $1
console.log(params); // ['Dan']
```

### Get Typed Columns

Omit sensitive columns:

```typescript
import { getColumns } from 'drizzle-orm';

const { password, ...publicColumns } = getColumns(users);

// Select without password
await db.select(publicColumns).from(users);
```

### Get Table Configuration

Inspect table metadata:

```typescript
import { getTableConfig } from 'drizzle-orm/pg-core';

const config = getTableConfig(users);

console.log(config.name);        // 'users'
console.log(config.columns);     // Column definitions
console.log(config.indexes);     // Index definitions
console.log(config.foreignKeys); // Foreign key definitions
console.log(config.primaryKeys); // Primary key definitions
```

### Type Guards

```typescript
import { is, Column, Table } from 'drizzle-orm';

if (is(value, Column)) {
  // value is typed as Column
}

if (is(value, Table)) {
  // value is typed as Table
}
```

### Mock Driver

For testing without database:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const db = drizzle.mock({ schema });

// Use for unit tests
```

---

## Performance

### Serverless Optimization

Declare connections and prepared statements outside handler for reuse:

```typescript
// Outside handler - reused across warm invocations
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const getUserQuery = db.select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user');

// Inside handler
export const handler = async (event: { userId: number }) => {
  // Reuses connection and prepared statement
  return getUserQuery.execute({ id: event.userId });
};
```

### Query Analysis

```typescript
// Get SQL without executing
const query = db.select().from(users).where(eq(users.id, 1));
const { sql, params } = query.toSQL();

// Log slow queries
const db = drizzle(client, {
  logger: {
    logQuery(query, params) {
      const start = performance.now();
      // ... after execution
      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn('Slow query:', query, duration);
      }
    },
  },
});
```
