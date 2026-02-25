import { changeEvents, markEventsReadBatch } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { batchMarkReadSchema } from "@/lib/api/validation";


export async function POST(request: Request) {
  try {
    const db = getDb(getEnv());

    const body = await request.json();
    const parsed = batchMarkReadSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    if ("all" in parsed.data) {
      await db
        .update(changeEvents)
        .set({ isRead: true });
    } else {
      await markEventsReadBatch(db, parsed.data.event_ids);
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
