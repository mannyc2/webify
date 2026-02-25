import { getStoreById, getProductTypesByStore } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    const { storeId } = params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const data = await getProductTypesByStore(db, storeId);

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
