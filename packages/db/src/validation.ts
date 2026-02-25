import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { stores, changeEvents } from "./schema";

// ---------------------------------------------------------------------------
// Table-derived schemas
// ---------------------------------------------------------------------------

export const insertStoreSchema = createInsertSchema(stores, {
  domain: (schema) =>
    schema.min(1).regex(
      /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid domain format",
    ),
  name: (schema) => schema.min(1).max(200),
});

export const selectStoreSchema = createSelectSchema(stores);

export const insertChangeEventSchema = createInsertSchema(changeEvents, {
  id: (schema) => schema.uuid(),
});

export const selectChangeEventSchema = createSelectSchema(changeEvents);

// ---------------------------------------------------------------------------
// API request schemas (not table-derived, but shared across web + clients)
// ---------------------------------------------------------------------------

export const addStoreSchema = z.object({
  domain: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid domain format",
    ),
  name: z.string().min(1).max(200).optional(),
});

export const markReadSchema = z.object({
  is_read: z.boolean(),
});

export const batchMarkReadSchema = z.union([
  z.object({ event_ids: z.array(z.string().uuid()).min(1) }),
  z.object({ all: z.literal(true) }),
]);

export const productsQuerySchema = z.object({
  search: z.string().optional(),
  stock: z.enum(["all", "in", "out"]).optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "recent"]).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const eventsQuerySchema = z.object({
  store: z.string().optional(),
  type: z.string().optional(),
  since: z.string().datetime({ offset: true }).optional(),
  is_read: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
