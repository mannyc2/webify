import { stores, getStoreByDomain } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { addStoreSchema } from "@/lib/api/validation";
import { checkRateLimit } from "@/lib/api/rate-limit";


export async function GET(request: Request) {
  try {
    const env = getEnv();
    const db = getDb(env);
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort");

    const orderBy =
      sort === "added_at"
        ? { addedAt: "desc" as const }
        : { name: "asc" as const };

    const data = await db.query.stores.findMany({ orderBy });

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const db = getDb(env);

    // Rate limit: 5 stores per IP per hour
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const { allowed, remaining } = await checkRateLimit(
      env.CACHE,
      ip,
      5,
      3600,
    );
    if (!allowed) {
      throw new ApiError(429, "Rate limit exceeded. Try again later.", "RATE_LIMITED");
    }

    const body = await request.json();
    const parsed = addStoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { domain, name } = parsed.data;

    // Check if store already exists
    const existing = await getStoreByDomain(db, domain);
    if (existing) {
      throw new ApiError(409, "Store already exists", "DUPLICATE_STORE");
    }

    // Validate domain by fetching products.json
    try {
      const res = await fetch(`https://${domain}/products.json?limit=1`, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Webify/1.0" },
      });
      if (!res.ok) {
        throw new ApiError(
          422,
          `Could not reach ${domain}/products.json (HTTP ${res.status})`,
          "DOMAIN_VALIDATION_FAILED",
        );
      }
      const data = (await res.json()) as { products?: unknown };
      if (!Array.isArray(data.products)) {
        throw new ApiError(
          422,
          "Domain does not appear to be a Shopify store",
          "NOT_SHOPIFY",
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        422,
        `Could not validate domain: ${domain}`,
        "DOMAIN_UNREACHABLE",
      );
    }

    const now = new Date().toISOString();

    await db.insert(stores).values({
      domain,
      name: name ?? domain,
      addedAt: now,
      syncStatus: "pending",
    });

    const store = await db.query.stores.findFirst({
      where: { domain },
    });

    return Response.json(store, {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
