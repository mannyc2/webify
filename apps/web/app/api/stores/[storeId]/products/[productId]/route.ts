import { getStoreById, getProductById } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> },
) {
  try {
    const { storeId, productId } = await params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const product = await getProductById(db, Number(productId));
    if (!product || product.storeDomain !== storeId) {
      throw new ApiError(404, "Product not found", "NOT_FOUND");
    }

    return Response.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}
