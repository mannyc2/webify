import { getStoreById, archiveImportJobs } from "@webify/db";
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

    const jobId = crypto.randomUUID();
    await db.insert(archiveImportJobs).values({
      id: jobId,
      storeDomain: store.domain,
      status: "discovering",
    });

    await env.SCRAPE_QUEUE.send({
      type: "archive_discover",
      domain: store.domain,
      jobId,
    });

    return Response.json({ success: true, jobId }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
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

    const jobs = await db.query.archiveImportJobs.findMany({
      where: { storeDomain: store.domain },
      orderBy: { startedAt: "desc" },
    });

    return Response.json({ data: jobs });
  } catch (error) {
    return handleApiError(error);
  }
}
