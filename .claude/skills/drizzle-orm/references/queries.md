# Queries Reference

SQL-like and relational query patterns for Drizzle ORM.

## Table of Contents
1. [SQL-like Queries](#sql-like-queries)
2. [Filters & Operators](#filters--operators)
3. [Relational Queries API](#relational-queries-api)
4. [Dynamic Query Building](#dynamic-query-building)
5. [Subqueries & CTEs](#subqueries--ctes)
6. [Aggregations](#aggregations)
7. [Raw SQL](#raw-sql)
8. [Prepared Statements](#prepared-statements)
9. [Transactions](#transactions)
10. [Iterators](#iterators)

---

## SQL-like Queries

### Select

```typescript
import { eq, and, or, gt, gte, lt, lte, ne, like, ilike, between, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';

// Basic
const all = await db.select().from(users);

// Specific columns
const names = await db.select({ id: users.id, name: users.name }).from(users);

// Conditions
await db.select().from(users).where(eq(users.id, 1));
await db.select().from(users).where(and(gt(users.age, 18), eq(users.active, true)));
await db.select().from(users).where(or(eq(users.role, 'admin'), eq(users.role, 'mod')));
await db.select().from(users).where(like(users.email, '%@gmail.com'));
await db.select().from(users).where(ilike(users.name, '%john%'));  // Case insensitive
await db.select().from(users).where(between(users.age, 18, 65));
await db.select().from(users).where(isNull(users.deletedAt));
await db.select().from(users).where(inArray(users.id, [1, 2, 3]));

// Order, limit, offset
await db.select().from(users)
  .orderBy(desc(users.createdAt))
  .limit(10)
  .offset(20);

// Multiple order columns
await db.select().from(users)
  .orderBy(asc(users.name), desc(users.createdAt));
```

### Insert

```typescript
// Single
await db.insert(users).values({ name: 'John', email: 'john@example.com' });

// Multiple
await db.insert(users).values([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
]);

// Returning
const [newUser] = await db.insert(users)
  .values({ name: 'Jane' })
  .returning();

const [{ id }] = await db.insert(users)
  .values({ name: 'Jane' })
  .returning({ id: users.id });

// Upsert (PostgreSQL)
await db.insert(users)
  .values({ id: 1, name: 'John' })
  .onConflictDoUpdate({
    target: users.id,
    set: { name: 'Updated John' },
  });

await db.insert(users)
  .values({ email: 'test@example.com' })
  .onConflictDoNothing();
```

### Update

```typescript
await db.update(users)
  .set({ name: 'Updated Name' })
  .where(eq(users.id, 1));

// Returning
const [updated] = await db.update(users)
  .set({ active: true })
  .where(eq(users.id, 1))
  .returning();

// Update with SQL expression
await db.update(posts)
  .set({ viewCount: sql`${posts.viewCount} + 1` })
  .where(eq(posts.id, 1));
```

### Delete

```typescript
await db.delete(users).where(eq(users.id, 1));

// Returning deleted rows
const [deleted] = await db.delete(users)
  .where(eq(users.id, 1))
  .returning();
```

### Joins

```typescript
// Inner join
const result = await db.select({
  postTitle: posts.title,
  authorName: users.name,
}).from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// Left join
const result = await db.select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Right join
const result = await db.select()
  .from(posts)
  .rightJoin(users, eq(posts.authorId, users.id));

// Full join
const result = await db.select()
  .from(users)
  .fullJoin(posts, eq(users.id, posts.authorId));

// Multiple joins
const result = await db.select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .innerJoin(comments, eq(posts.id, comments.postId));

// Self-join with alias
import { alias } from 'drizzle-orm/pg-core';

const parent = alias(users, 'parent');
const usersWithParent = await db.select()
  .from(users)
  .leftJoin(parent, eq(users.parentId, parent.id));

// Cross join
const result = await db.select()
  .from(users)
  .crossJoin(products);
```

### Lateral Joins (PostgreSQL)

Lateral joins allow subqueries to reference columns from preceding tables. Useful for correlated subqueries.

```typescript
// Left join lateral - get users with their 3 most recent posts
const recentPosts = db
  .select()
  .from(posts)
  .where(eq(posts.authorId, users.id))
  .orderBy(desc(posts.createdAt))
  .limit(3)
  .as('recent_posts');

const result = await db.select()
  .from(users)
  .leftJoinLateral(recentPosts, sql`true`);

// Inner join lateral
const result = await db.select()
  .from(users)
  .innerJoinLateral(recentPosts, sql`true`);

// Cross join lateral
const result = await db.select()
  .from(users)
  .crossJoinLateral(recentPosts);
```

**Result types:**
- `leftJoinLateral`: Related table fields are nullable
- `innerJoinLateral`: All fields are non-null (only matching rows)
- `crossJoinLateral`: All fields are non-null (cartesian product)

---

## Filters & Operators

Import from `drizzle-orm`. Use in `.where()` clauses.

### Comparison

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal | `eq(users.id, 1)` |
| `ne` | Not equal | `ne(users.id, 1)` |
| `gt` | Greater than | `gt(users.age, 18)` |
| `gte` | Greater than or equal | `gte(users.age, 18)` |
| `lt` | Less than | `lt(users.age, 65)` |
| `lte` | Less than or equal | `lte(users.age, 65)` |
| `between` | Between values | `between(users.age, 18, 65)` |

### Nullability

| Operator | Description | Example |
|----------|-------------|---------|
| `isNull` | Is NULL | `isNull(users.deletedAt)` |
| `isNotNull` | Is NOT NULL | `isNotNull(users.email)` |

### Arrays & Lists

| Operator | Description | Example |
|----------|-------------|---------|
| `inArray` | In list | `inArray(users.id, [1, 2, 3])` |
| `notInArray` | Not in list | `notInArray(users.status, ['banned'])` |
| `arrayContains` | Array contains | `arrayContains(posts.tags, ['tech'])` |
| `arrayContained` | Array contained by | `arrayContained(posts.tags, ['tech', 'news'])` |
| `arrayOverlaps` | Arrays overlap | `arrayOverlaps(posts.tags, ['tech', 'news'])` |

### String Matching

| Operator | Description | Example |
|----------|-------------|---------|
| `like` | SQL LIKE | `like(users.name, '%john%')` |
| `ilike` | Case-insensitive LIKE | `ilike(users.name, '%john%')` |
| `notLike` | NOT LIKE | `notLike(users.email, '%test%')` |
| `notIlike` | Case-insensitive NOT LIKE | `notIlike(users.name, '%bot%')` |

### Logical Operators

```typescript
import { and, or, not, eq, gt, lt } from 'drizzle-orm';

// AND
await db.select().from(users).where(
  and(
    eq(users.active, true),
    gt(users.age, 18)
  )
);

// OR
await db.select().from(users).where(
  or(
    eq(users.role, 'admin'),
    eq(users.role, 'moderator')
  )
);

// NOT
await db.select().from(users).where(
  not(eq(users.role, 'banned'))
);

// Combined
await db.select().from(users).where(
  and(
    eq(users.active, true),
    or(
      gt(users.age, 21),
      eq(users.hasParentalConsent, true)
    )
  )
);
```

### Existence

```typescript
import { exists, notExists } from 'drizzle-orm';

// Users who have at least one post
await db.select().from(users).where(
  exists(
    db.select().from(posts).where(eq(posts.authorId, users.id))
  )
);
```

---

## Relational Queries API

> **v1 RC:** Object-based `where` and `orderBy` replace callback syntax. Use `db._query` for v1 compatibility.

Requires passing relations to `drizzle()`:

```typescript
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));

const db = drizzle(pool, { relations });
```

### findMany

```typescript
// Basic
const users = await db.query.users.findMany();

// With relations
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Nested relations
const usersWithPostsAndComments = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: true,
      },
    },
  },
});

// Select specific columns
const users = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
  },
});

// Exclude columns
const users = await db.query.users.findMany({
  columns: {
    password: false,
  },
});

// Filter, order, limit (v2 object syntax)
const users = await db.query.users.findMany({
  where: { active: true },
  orderBy: { createdAt: 'desc' },
  limit: 10,
  offset: 0,
});

// Complex filters
const users = await db.query.users.findMany({
  where: {
    age: { gte: 18, lte: 65 },
    role: { in: ['admin', 'moderator'] },
    email: { like: '%@company.com' },
  },
});

// Filter on relations
const usersWithPublishedPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      limit: 5,
      offset: 0,  // v2 supports offset on relations
    },
  },
});

// Filter BY relations (v2 only) - users who have matching posts
const usersWithRecentPosts = await db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: {
      content: { like: 'M%' },
    },
  },
});
```

### Where Object Operators (v2)

| Operator | Example | SQL |
|----------|---------|-----|
| equals (implicit) | `{ id: 1 }` | `id = 1` |
| `eq` | `{ id: { eq: 1 } }` | `id = 1` |
| `ne` | `{ id: { ne: 1 } }` | `id != 1` |
| `gt` | `{ age: { gt: 18 } }` | `age > 18` |
| `gte` | `{ age: { gte: 18 } }` | `age >= 18` |
| `lt` | `{ age: { lt: 65 } }` | `age < 65` |
| `lte` | `{ age: { lte: 65 } }` | `age <= 65` |
| `like` | `{ name: { like: '%john%' } }` | `name LIKE '%john%'` |
| `ilike` | `{ name: { ilike: '%john%' } }` | `name ILIKE '%john%'` |
| `in` | `{ id: { in: [1, 2, 3] } }` | `id IN (1, 2, 3)` |
| `notIn` | `{ id: { notIn: [1, 2] } }` | `id NOT IN (1, 2)` |
| `isNull` | `{ deletedAt: { isNull: true } }` | `deleted_at IS NULL` |
| `isNotNull` | `{ email: { isNotNull: true } }` | `email IS NOT NULL` |

### Logical Operators in Where (v2)

```typescript
// AND (implicit - multiple keys)
const users = await db.query.users.findMany({
  where: {
    active: true,
    age: { gte: 18 },
  },
});

// OR
const users = await db.query.users.findMany({
  where: {
    OR: [
      { role: 'admin' },
      { role: 'moderator' },
    ],
  },
});

// NOT
const users = await db.query.users.findMany({
  where: {
    NOT: { role: 'banned' },
  },
});

// Combined
const users = await db.query.users.findMany({
  where: {
    active: true,
    OR: [
      { age: { gt: 21 } },
      { hasParentalConsent: true },
    ],
  },
});

// RAW SQL in where
const users = await db.query.users.findMany({
  where: {
    RAW: (t) => sql`${t.createdAt} > NOW() - INTERVAL '7 days'`,
  },
});
```

### findFirst

```typescript
const user = await db.query.users.findFirst({
  where: { id: 1 },
  with: {
    posts: true,
  },
});

// Returns undefined if not found
if (!user) {
  throw new Error('User not found');
}
```

### Computed Fields (extras)

Add computed/virtual fields to query results:

```typescript
import { sql } from 'drizzle-orm';

const usersWithMeta = await db.query.users.findMany({
  extras: {
    // Using sql template
    loweredName: (users, { sql }) => sql<string>`lower(${users.name})`.as('lowered_name'),
    
    // String concatenation
    fullName: (users, { sql }) => sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('full_name'),
    
    // Subquery count
    postCount: (users) => db.$count(posts, eq(posts.authorId, users.id)).as('post_count'),
  },
});
// Result: { id, name, loweredName, fullName, postCount, ... }

// Extras on relations too
const usersWithPostExtras = await db.query.users.findMany({
  with: {
    posts: {
      extras: {
        commentCount: (posts) => db.$count(comments, eq(comments.postId, posts.id)).as('comment_count'),
      },
    },
  },
});
```

### v1 Compatibility

Use `db._query` and callback syntax for v1 compatibility:

```typescript
// Import relations from legacy path
import { relations } from 'drizzle-orm/_relations';

// Use db._query for v1 syntax
const users = await db._query.users.findMany({
  where: (users, { eq }) => eq(users.active, true),
  orderBy: (users, { desc }) => [desc(users.createdAt)],
});
```

---

## Dynamic Query Building

### Composing WHERE Clauses

```typescript
import { SQL, and, eq, like, gte, lte } from 'drizzle-orm';

interface UserFilters {
  name?: string;
  email?: string;
  minAge?: number;
  maxAge?: number;
  role?: string;
}

function buildUserQuery(filters: UserFilters) {
  const conditions: SQL[] = [];

  if (filters.name) {
    conditions.push(like(users.name, `%${filters.name}%`));
  }
  if (filters.email) {
    conditions.push(eq(users.email, filters.email));
  }
  if (filters.minAge !== undefined) {
    conditions.push(gte(users.age, filters.minAge));
  }
  if (filters.maxAge !== undefined) {
    conditions.push(lte(users.age, filters.maxAge));
  }
  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  return db.select()
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}
```

### Dynamic Column Selection

```typescript
function getUsers(options: { includeEmail?: boolean; includeAge?: boolean }) {
  const columns: Record<string, any> = {
    id: users.id,
    name: users.name,
  };

  if (options.includeEmail) columns.email = users.email;
  if (options.includeAge) columns.age = users.age;

  return db.select(columns).from(users);
}
```

---

## Subqueries & CTEs

### Subquery in WHERE

```typescript
// Users who have posts
const activeAuthors = await db.select()
  .from(users)
  .where(
    inArray(
      users.id,
      db.select({ id: posts.authorId }).from(posts)
    )
  );

// Users with more than 5 posts
const prolificAuthors = await db.select()
  .from(users)
  .where(
    gt(
      db.select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, users.id)),
      5
    )
  );
```

### Scalar Subquery in SELECT

```typescript
const usersWithPostCount = await db.select({
  id: users.id,
  name: users.name,
  postCount: sql<number>`(
    SELECT COUNT(*) FROM ${posts} WHERE ${posts.authorId} = ${users.id}
  )`.as('post_count'),
}).from(users);
```

### Derived Table (Subquery as Table)

```typescript
const postCounts = db.select({
  authorId: posts.authorId,
  count: count().as('count'),
}).from(posts)
  .groupBy(posts.authorId)
  .as('post_counts');

const result = await db.select({
  userName: users.name,
  postCount: postCounts.count,
}).from(users)
  .innerJoin(postCounts, eq(users.id, postCounts.authorId));
```

### Common Table Expressions (WITH)

```typescript
// Define CTE
const activePosts = db.$with('active_posts').as(
  db.select().from(posts).where(eq(posts.published, true))
);

// Use in query
const result = await db.with(activePosts)
  .select()
  .from(activePosts);

// Multiple CTEs
const activeUsers = db.$with('active_users').as(
  db.select().from(users).where(eq(users.active, true))
);

const userPosts = db.$with('user_posts').as(
  db.select({
    userId: posts.authorId,
    postCount: count().as('post_count'),
  }).from(posts).groupBy(posts.authorId)
);

const result = await db
  .with(activeUsers, userPosts)
  .select({
    userName: activeUsers.name,
    postCount: userPosts.postCount,
  })
  .from(activeUsers)
  .leftJoin(userPosts, eq(activeUsers.id, userPosts.userId));
```

---

## Aggregations

```typescript
import { count, sum, avg, min, max, countDistinct } from 'drizzle-orm';

// Count
const [{ total }] = await db.select({ total: count() }).from(users);
const [{ total }] = await db.select({ total: count(users.id) }).from(users);
const [{ total }] = await db.select({ total: countDistinct(users.role) }).from(users);

// Sum, avg, min, max
const [stats] = await db.select({
  totalRevenue: sum(orders.amount),
  avgOrder: avg(orders.amount),
  minOrder: min(orders.amount),
  maxOrder: max(orders.amount),
}).from(orders);

// GROUP BY
const postsByAuthor = await db.select({
  authorId: posts.authorId,
  postCount: count(),
}).from(posts)
  .groupBy(posts.authorId);

// HAVING
const prolificAuthors = await db.select({
  authorId: posts.authorId,
  postCount: count(),
}).from(posts)
  .groupBy(posts.authorId)
  .having(gt(count(), 10));

// $count utility - efficient count wrapper
const totalUsers = await db.$count(users);
const activeUsers = await db.$count(users, eq(users.active, true));
```

---

## Raw SQL

### sql Template Tag

```typescript
import { sql } from 'drizzle-orm';

// In SELECT
const users = await db.select({
  fullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
  createdYear: sql<number>`EXTRACT(YEAR FROM ${users.createdAt})`,
}).from(users);

// In WHERE
const recentPosts = await db.select()
  .from(posts)
  .where(sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`);

// In ORDER BY
await db.select().from(users)
  .orderBy(sql`RANDOM()`);
```

### Execute Raw Query

```typescript
// Untyped
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);

// Typed result
type UserRow = { id: number; name: string; email: string };
const result = await db.execute<UserRow>(sql`SELECT id, name, email FROM users`);
```

### sql.raw for Dynamic Identifiers

```typescript
const columnName = 'email';
const result = await db.execute(
  sql`SELECT * FROM users ORDER BY ${sql.raw(`"${columnName}"`)} ASC`
);
```

### sql Type Mapping

```typescript
// Type cast the result
const count = sql<number>`count(*)`;

// Map driver value to JS type
const count = sql<number>`count(*)`.mapWith(Number);

// Alias for use in select
const total = sql<number>`count(*)`.as('total');
```

### Dynamic SQL Building

```typescript
// Start with empty sql
const query = sql.empty();
query.append(sql`SELECT * FROM users `);

if (filter) {
  query.append(sql`WHERE id = ${id} `);
}

query.append(sql`ORDER BY created_at`);

await db.execute(query);

// Join multiple sql fragments
const conditions = [
  sql`status = 'active'`,
  sql`age > 18`,
];
const whereClause = sql.join(conditions, sql` AND `);
// Result: status = 'active' AND age > 18
```

---

## Prepared Statements

### Core Query Builder

```typescript
// Create prepared statement with placeholder
const getUserById = db.select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

// Execute
const user = await getUserById.execute({ id: 1 });

// Multiple placeholders
const searchUsers = db.select()
  .from(users)
  .where(
    and(
      like(users.name, sql.placeholder('name')),
      eq(users.active, sql.placeholder('active'))
    )
  )
  .limit(sql.placeholder('limit'))
  .prepare('search_users');

const results = await searchUsers.execute({
  name: '%john%',
  active: true,
  limit: 10,
});
```

### Relational Query Builder

```typescript
const prepared = db.query.users.findMany({
  where: (users, { eq }) => eq(users.id, sql.placeholder('id')),
  with: {
    posts: true,
  },
}).prepare('get_user_with_posts');

const result = await prepared.execute({ id: 1 });
```

---

## Transactions

### Basic Transaction

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users)
    .values({ name: 'John' })
    .returning();

  await tx.insert(posts)
    .values({ title: 'First post', authorId: user.id });

  // Automatically commits if no error
  // Automatically rolls back on error
});
```

### Manual Rollback

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John' });

  const shouldRollback = true;
  if (shouldRollback) {
    tx.rollback();  // Explicitly rollback
    return;
  }

  await tx.insert(posts).values({ title: 'Post' });
});
```

### Nested Transactions (Savepoints)

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'User 1' });

  await tx.transaction(async (tx2) => {
    await tx2.insert(users).values({ name: 'User 2' });
    // This creates a savepoint
  });

  await tx.insert(users).values({ name: 'User 3' });
});
```

### Transaction Options

```typescript
await db.transaction(async (tx) => {
  // ...
}, {
  isolationLevel: 'read committed',  // 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable'
  accessMode: 'read write',          // 'read only' | 'read write'
  deferrable: true,
});
```

---

## Iterators

Stream large result sets without loading everything into memory:

```typescript
// Async iterator
const iterator = await db.select().from(users).iterator();

for await (const row of iterator) {
  console.log(row);
  // Process one row at a time
}

// With conditions
const largeResultIterator = await db.select()
  .from(logs)
  .where(gt(logs.createdAt, lastWeek))
  .iterator();

for await (const log of largeResultIterator) {
  await processLog(log);
}
```

Use when:
- Processing millions of rows
- Memory-constrained environments
- Streaming data processing
- ETL pipelines
