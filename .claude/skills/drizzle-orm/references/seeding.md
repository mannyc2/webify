# Seeding Reference

Deterministic data generation for testing and development with drizzle-seed.

## Table of Contents
1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Refinements](#refinements)
4. [Weighted Random](#weighted-random)
5. [Generators](#generators)
6. [Versioning](#versioning)

---

## Installation

```bash
npm install drizzle-seed
# or
bun add drizzle-seed
```

**Requirements:** drizzle-orm v0.36.4+, drizzle-seed v0.1.1+

---

## Basic Usage

```typescript
import { pgTable, integer, text, serial } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seed, reset } from 'drizzle-seed';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
});

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);

  // Reset tables before seeding (truncates data)
  await reset(db, { users, posts });

  // Seed with options
  await seed(db, { users, posts }, {
    count: 100,    // Rows per table (default: 10)
    seed: 12345,   // Fixed seed for reproducible results
  });
}
```

---

## Refinements

Customize generation with `.refine()`:

```typescript
import { seed } from 'drizzle-seed';
import * as schema from './schema';

await seed(db, schema).refine((f) => ({
  users: {
    count: 50,  // Override count for this table
    columns: {
      // Custom generators for specific columns
      id: f.int({ minValue: 1000, maxValue: 9999, isUnique: true }),
      name: f.fullName(),
      email: f.email(),
      bio: f.loremIpsum({ sentencesCount: 2 }),
      role: f.valuesFromArray({ values: ['admin', 'user', 'guest'] }),
    },
    // Generate related entities (one-to-many)
    with: {
      posts: 5,  // 5 posts per user
    },
  },

  posts: {
    columns: {
      title: f.loremIpsum({ sentencesCount: 1 }),
      status: f.valuesFromArray({ values: ['draft', 'published', 'archived'] }),
    },
  },
}));
```

### Refine API

```typescript
await seed(db, schema).refine((f) => ({
  tableName: {
    count: number,           // Rows to generate
    columns: {               // Column-specific generators
      columnName: f.generator({ options }),
    },
    with: {                  // Related tables (one-to-many)
      relatedTable: number,  // Count of related rows
    },
  },
}));
```

---

## Weighted Random

Control probability distributions:

### Column Values

```typescript
await seed(db, schema).refine((f) => ({
  products: {
    columns: {
      // 30% cheap, 70% expensive
      price: f.weightedRandom([
        { weight: 0.3, value: f.int({ minValue: 10, maxValue: 50 }) },
        { weight: 0.7, value: f.int({ minValue: 100, maxValue: 500 }) },
      ]),

      // 80% active, 20% inactive
      status: f.weightedRandom([
        { weight: 0.8, value: f.default({ defaultValue: 'active' }) },
        { weight: 0.2, value: f.default({ defaultValue: 'inactive' }) },
      ]),
    },
  },
}));
```

### Relation Counts

```typescript
await seed(db, schema).refine((f) => ({
  orders: {
    with: {
      // Variable number of order items
      orderItems: [
        { weight: 0.6, count: [1, 2] },      // 60%: 1-2 items
        { weight: 0.3, count: [3, 4, 5] },   // 30%: 3-5 items
        { weight: 0.1, count: [10] },        // 10%: 10 items
      ],
    },
  },
}));
```

---

## Generators

All generators accessed via `f` in `.refine((f) => ...)`.

### Basic Types

| Generator | Options | Output |
|-----------|---------|--------|
| `f.default` | `{ defaultValue }` | Exact value |
| `f.valuesFromArray` | `{ values, isUnique? }` | Pick from array |
| `f.intPrimaryKey` | — | Sequential 1, 2, 3... |
| `f.int` | `{ minValue, maxValue, isUnique? }` | Integer |
| `f.number` | `{ minValue, maxValue, precision, isUnique? }` | Float |
| `f.boolean` | — | true/false |
| `f.string` | `{ isUnique? }` | Random alphanumeric |
| `f.uuid` | — | UUID v4 |
| `f.json` | — | Random JSON object |

### Date & Time

| Generator | Options | Output |
|-----------|---------|--------|
| `f.date` | `{ minDate, maxDate }` | Date |
| `f.time` | — | 24-hour time |
| `f.timestamp` | — | Timestamp |
| `f.datetime` | — | Datetime |
| `f.year` | — | YYYY |
| `f.interval` | `{ isUnique? }` | SQL interval |

### Personal Information

| Generator | Options | Output |
|-----------|---------|--------|
| `f.firstName` | `{ isUnique? }` | First name |
| `f.lastName` | `{ isUnique? }` | Last name |
| `f.fullName` | `{ isUnique? }` | Full name |
| `f.email` | — | Email (unique) |
| `f.jobTitle` | — | Job title |
| `f.phoneNumber` | `{ template? }` or `{ prefixes, generatedDigitsNumbers }` | Phone |

### Location & Address

| Generator | Options | Output |
|-----------|---------|--------|
| `f.country` | `{ isUnique? }` | Country |
| `f.city` | `{ isUnique? }` | City |
| `f.streetAddress` | `{ isUnique? }` | Street address |
| `f.postcode` | `{ isUnique? }` | Postal code |
| `f.state` | — | US state |
| `f.companyName` | `{ isUnique? }` | Company |

### Text & Content

```typescript
// Lorem ipsum text
f.loremIpsum({ sentencesCount: 3 })
```

### Geometric & Advanced

```typescript
// Point coordinates
f.point({
  minXValue: 0, maxXValue: 100,
  minYValue: 0, maxYValue: 100,
})

// Line (a*x + b*y + c = 0)
f.line({
  minAValue: -10, maxAValue: 10,
  minBValue: -10, maxBValue: 10,
  minCValue: -10, maxCValue: 10,
})

// Vector embeddings
f.vector({
  dimensions: 1536,
  minValue: -1,
  maxValue: 1,
  decimalPlaces: 5,
})

// IP addresses
f.inet({ ipAddress: 'ipv4', includeCidr: true })
f.inet({ ipAddress: 'ipv6' })

// Bit strings
f.bitString({ dimensions: 8, isUnique: true })
```

### Array Generation

Most generators support `arraySize` for generating arrays:

```typescript
f.int({ minValue: 1, maxValue: 100, arraySize: 5 })
// Generates: [42, 17, 89, 3, 56]
```

---

## Versioning

Lock generator version for strict determinism across library updates:

```typescript
await seed(db, schema, { version: '2' });
```

**Versions:**
- `v1`: Initial release
- `v2` (LTS): Fixed interval uniqueness, varchar length constraints

---

## Common Patterns

### Test Data Setup

```typescript
// tests/helpers/seed.ts
import { seed, reset } from 'drizzle-seed';
import * as schema from '../../src/db/schema';
import { db } from '../../src/db';

export async function setupTestData(options?: { userCount?: number }) {
  await reset(db, schema);

  await seed(db, schema, { seed: 42 }).refine((f) => ({
    users: {
      count: options?.userCount ?? 10,
      columns: {
        email: f.email(),
        name: f.fullName(),
      },
      with: {
        posts: 3,
      },
    },
  }));
}

// In test file
beforeEach(async () => {
  await setupTestData({ userCount: 5 });
});
```

### Development Seeds

```typescript
// scripts/seed-dev.ts
import { seed, reset } from 'drizzle-seed';
import * as schema from '../src/db/schema';
import { db } from '../src/db';

async function seedDev() {
  console.log('Resetting database...');
  await reset(db, schema);

  console.log('Seeding development data...');
  await seed(db, schema, { seed: 12345 }).refine((f) => ({
    users: {
      count: 100,
      columns: {
        name: f.fullName(),
        email: f.email(),
        role: f.weightedRandom([
          { weight: 0.1, value: f.default({ defaultValue: 'admin' }) },
          { weight: 0.9, value: f.default({ defaultValue: 'user' }) },
        ]),
      },
      with: {
        posts: [
          { weight: 0.3, count: [0] },       // 30% have no posts
          { weight: 0.5, count: [1, 2, 3] }, // 50% have 1-3 posts
          { weight: 0.2, count: [5, 10] },   // 20% are active posters
        ],
      },
    },
  }));

  console.log('Done!');
}

seedDev().catch(console.error);
```

### Reproducible Integration Tests

```typescript
// Same seed = same data every time
const TEST_SEED = 98765;

test('user listing pagination', async () => {
  await reset(db, schema);
  await seed(db, schema, { seed: TEST_SEED, count: 50 });

  const page1 = await getUsersPage(1, 10);
  const page2 = await getUsersPage(2, 10);

  expect(page1).toHaveLength(10);
  expect(page2).toHaveLength(10);
  expect(page1[0].id).not.toBe(page2[0].id);
});
```

---

## Limitations

1. **Circular dependencies**: If Table A references Table B and vice versa, manual intervention required
2. **Geometry arrays**: `arraySize > 1` not supported for `geometry` type
3. **Relation inference**: `with` lists all tables; ensure valid one-to-many relationships exist
