import { getEvents } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { eventsQuerySchema } from "@/lib/api/validation";


export async function GET(request: Request) {
  try {
    const db = getDb(getEnv());
    const url = new URL(request.url);

    const query = eventsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!query.success) {
      throw new ApiError(400, query.error.issues[0].message, "VALIDATION_ERROR");
    }

    const data = await getEvents(db, {
      storeDomain: query.data.store,
      changeType: query.data.type,
      since: query.data.since,
      isRead: query.data.is_read,
      offset: query.data.offset,
      limit: query.data.limit,
    });

    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
