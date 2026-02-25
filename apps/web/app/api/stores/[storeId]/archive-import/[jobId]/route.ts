import { getStoreById, getArchiveImportJob } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  _request: Request,
  { params }: { params: { storeId: string; jobId: string } },
) {
  try {
    const { storeId, jobId } = params;
    const env = getEnv();
    const db = getDb(env);

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    const job = await getArchiveImportJob(db, jobId);
    if (!job || job.storeDomain !== store.domain) {
      throw new ApiError(404, "Import job not found", "NOT_FOUND");
    }

    return Response.json({ data: job });
  } catch (error) {
    return handleApiError(error);
  }
}
