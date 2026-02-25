import { getStoreById, getProductsByStore } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { productsQuerySchema } from "@/lib/api/validation";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const url = new URL(request.url);
    const query = productsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!query.success) {
      throw new ApiError(400, query.error.issues[0].message, "VALIDATION_ERROR");
    }

    const data = await getProductsByStore(db, storeId, {
      search: query.data.search,
      stock: query.data.stock,
      sort: query.data.sort,
      offset: query.data.offset,
      limit: query.data.limit,
    });

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
