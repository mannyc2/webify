import { getStoreById, getArchivedProducts } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { archivedProductsQuerySchema } from "@/lib/api/validation";

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    const { storeId } = params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const url = new URL(request.url);
    const query = archivedProductsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!query.success) {
      throw new ApiError(400, query.error.issues[0].message, "VALIDATION_ERROR");
    }

    const result = await getArchivedProducts(db, storeId, {
      search: query.data.search,
      sort: query.data.sort,
      offset: query.data.offset,
      limit: query.data.limit,
    });

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
