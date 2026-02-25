import { getStoreById } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function POST(
  _request: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    const { storeId } = params;
    const env = getEnv();
    const db = getDb(env);

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    await env.SYNC_QUEUE.send({
      domain: store.domain,
    });

    return Response.json({ success: true, message: "Sync job enqueued" });
  } catch (error) {
    return handleApiError(error);
  }
}
