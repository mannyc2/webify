import { getVariantSnapshots } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      productId: string;
      variantId: string;
    }>;
  },
) {
  try {
    const { productId, variantId } = await params;
    const db = getDb(getEnv());

    // Verify variant exists and belongs to the product
    const variant = await db.query.variants.findFirst({
      where: { id: Number(variantId) },
    });
    if (!variant || variant.productId !== Number(productId)) {
      throw new ApiError(404, "Variant not found", "NOT_FOUND");
    }

    const url = new URL(request.url);
    const since = url.searchParams.get("since") ?? undefined;

    const data = await getVariantSnapshots(db, Number(variantId), { since });

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
