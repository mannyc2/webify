# Relations Reference

Drizzle relations for the relational queries API. Available in `drizzle-orm@beta`.

## Table of Contents
1. [Defining Relations](#defining-relations)
2. [Relation Types](#relation-types)
3. [Many-to-Many with Through](#many-to-many-with-through)
4. [Advanced Patterns](#advanced-patterns)
5. [Indexing for Performance](#indexing-for-performance)

---

## Defining Relations

Relations are defined separately from schema using `defineRelations`:

```typescript
import { defineRelations } from 'drizzle-orm';
import * as p from 'drizzle-orm/pg-core';

// Schema
export const users = p.pgTable('users', {
  id: p.integer('id').primaryKey(),
  name: p.text('name').notNull(),
});

export const posts = p.pgTable('posts', {
  id: p.integer('id').primaryKey(),
  title: p.text('title').notNull(),
  authorId: p.integer('author_id').references(() => users.id),
});

// Relations
export const relations = defineRelations({ users, posts }, (r) => ({
  users: {
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));

// Initialize with relations
import { drizzle } from 'drizzle-orm/node-postgres';
const db = drizzle(pool, { schema: { users, posts, ...relations } });

// Query
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true },
});
```

---

## Relation Types

### one()

Single related entity. Use for "belongs to" or the "one" side of one-to-one.

```typescript
r.one.users({
  from: r.posts.authorId,    // FK in current table
  to: r.users.id,            // PK in target table
  optional: false,           // Guarantees non-null (default: true)
  alias: 'postAuthor',       // Custom name for disambiguation
  where: { isActive: true }, // Filter condition
})
```

### many()

Array of related entities. Use for "has many".

```typescript
r.many.posts({
  from: r.users.id,          // PK in current table
  to: r.posts.authorId,      // FK in target table
  optional: false,           // Array always present (can be empty)
  alias: 'userPosts',
  where: { published: true },
})

// Shorthand when columns can be inferred
r.many.posts()
```

---

## Relation Types

### One-to-One

```typescript
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(), // UNIQUE for 1:1
  bio: text('bio'),
});

const relations = defineRelations({ users, profiles }, (r) => ({
  users: {
    profile: r.one.profiles({
      from: r.users.id,
      to: r.profiles.userId,
      optional: true,
    }),
  },
  profiles: {
    user: r.one.users({
      from: r.profiles.userId,
      to: r.users.id,
      optional: false,
    }),
  },
}));
```

### One-to-Many

```typescript
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const posts = pgTable('posts', {
  id: integer('id').primaryKey(),
  title: text('title'),
  authorId: integer('author_id').references(() => users.id),
});

const comments = pgTable('comments', {
  id: integer('id').primaryKey(),
  text: text('text'),
  postId: integer('post_id').references(() => posts.id),
  authorId: integer('author_id').references(() => users.id),
});

const relations = defineRelations({ users, posts, comments }, (r) => ({
  users: {
    posts: r.many.posts(),
    comments: r.many.comments(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
    comments: r.many.comments(),
  },
  comments: {
    post: r.one.posts({
      from: r.comments.postId,
      to: r.posts.id,
    }),
    author: r.one.users({
      from: r.comments.authorId,
      to: r.users.id,
    }),
  },
}));
```

### Self-Referencing

```typescript
const categories = pgTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name'),
  parentId: integer('parent_id'),
});

const relations = defineRelations({ categories }, (r) => ({
  categories: {
    parent: r.one.categories({
      from: r.categories.parentId,
      to: r.categories.id,
    }),
    children: r.many.categories({
      from: r.categories.id,
      to: r.categories.parentId,
    }),
  },
}));
```

---

## Many-to-Many with Through

Use `.through()` to traverse junction tables:

```typescript
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const groups = pgTable('groups', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
}, (t) => [
  primaryKey({ columns: [t.userId, t.groupId] }),
]);

const relations = defineRelations({ users, groups, usersToGroups }, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    members: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
    }),
  },
}));

// Query bypasses junction table
const usersWithGroups = await db.query.users.findMany({
  with: { groups: true },
});
// Returns: { id, name, groups: [{ id, name }, ...] }
```

---

## Advanced Patterns

### Predefined Filters

Filter related data in the relation definition:

```typescript
const relations = defineRelations({ users, posts }, (r) => ({
  users: {
    publishedPosts: r.many.posts({
      where: { published: true },  // Only published posts
    }),
    draftPosts: r.many.posts({
      where: { published: false },
    }),
  },
}));
```

### Disambiguating with Aliases

When multiple relations exist between same tables:

```typescript
const posts = pgTable('posts', {
  id: integer('id').primaryKey(),
  authorId: integer('author_id').references(() => users.id),
  reviewerId: integer('reviewer_id').references(() => users.id),
});

const relations = defineRelations({ users, posts }, (r) => ({
  users: {
    authoredPosts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
      alias: 'author',
    }),
    reviewedPosts: r.many.posts({
      from: r.users.id,
      to: r.posts.reviewerId,
      alias: 'reviewer',
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
      alias: 'author',
    }),
    reviewer: r.one.users({
      from: r.posts.reviewerId,
      to: r.users.id,
      alias: 'reviewer',
    }),
  },
}));
```

### Modular Relations with defineRelationsPart

Split relations across files:

```typescript
// users.relations.ts
import { defineRelationsPart } from 'drizzle-orm';

export const usersRelations = defineRelationsPart({ users, posts }, (r) => ({
  users: {
    posts: r.many.posts(),
  },
}));

// posts.relations.ts
export const postsRelations = defineRelationsPart({ users, posts }, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));

// db.ts - combine
const db = drizzle(pool, {
  schema: { users, posts, ...usersRelations, ...postsRelations },
});
```

---

## Indexing for Performance

### One-to-One

Index the foreign key:

```typescript
const profiles = pgTable('profiles', {
  userId: integer('user_id').references(() => users.id).unique(),
}, (t) => [
  index('profiles_user_id_idx').on(t.userId),
]);
```

### One-to-Many

Index the foreign key on the "many" side:

```typescript
const posts = pgTable('posts', {
  authorId: integer('author_id').references(() => users.id),
}, (t) => [
  index('posts_author_id_idx').on(t.authorId),
]);
```

### Many-to-Many

Index both FKs and add composite index:

```typescript
const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull(),
  groupId: integer('group_id').notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.groupId] }),
  index('utg_user_id_idx').on(t.userId),
  index('utg_group_id_idx').on(t.groupId),
  index('utg_composite_idx').on(t.userId, t.groupId),
]);
```

---

## Relations vs Foreign Keys

| Aspect | Foreign Keys | Relations |
|--------|--------------|-----------|
| Level | Database constraint | Application abstraction |
| Enforcement | Database enforces integrity | No enforcement |
| Migrations | Creates FK constraint | No schema impact |
| Purpose | Data integrity | Query convenience |

**Use both together**: FKs for integrity, relations for querying.

```typescript
// Schema has FK constraint
const posts = pgTable('posts', {
  authorId: integer('author_id').references(() => users.id),
});

// Relations enable query API
const relations = defineRelations({ users, posts }, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```
