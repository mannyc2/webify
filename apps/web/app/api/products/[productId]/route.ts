import { getProductById } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const db = getDb(getEnv());

    const product = await getProductById(db, Number(productId));
    if (!product) {
      throw new ApiError(404, "Product not found", "NOT_FOUND");
    }

    return Response.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}
