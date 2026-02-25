import { getStoreById, getProductById, getArchivedImagesByHandle } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: { storeId: string; productId: string } },
) {
  try {
    const { storeId, productId } = params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const product = await getProductById(db, Number(productId));
    if (!product || product.storeDomain !== storeId) {
      throw new ApiError(404, "Product not found", "NOT_FOUND");
    }

    const currentImageUrls = (product.images ?? [])
      .filter((img) => !img.isRemoved)
      .map((img) => img.url);

    const data = await getArchivedImagesByHandle(
      db,
      storeId,
      product.handle,
      currentImageUrls,
    );

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
