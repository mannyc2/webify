import { getStoreById, getArchivedProductByHandle } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: { storeId: string; handle: string } },
) {
  try {
    const { storeId, handle } = params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const data = await getArchivedProductByHandle(db, storeId, handle);
    if (!data) {
      throw new ApiError(404, "Archived product not found", "NOT_FOUND");
    }

    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
