import { getProductVideos } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  _request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const { productId } = params;
    const db = getDb(getEnv());

    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      throw new ApiError(400, "Invalid product ID", "INVALID_ID");
    }

    const videos = await getProductVideos(db, id);

    return Response.json({ data: videos });
  } catch (error) {
    return handleApiError(error);
  }
}
