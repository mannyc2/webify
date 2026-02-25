import { markEventRead } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { markReadSchema } from "@/lib/api/validation";


export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  try {
    const { eventId } = params;
    const db = getDb(getEnv());

    // Verify event exists
    const event = await db.query.changeEvents.findFirst({
      where: { id: eventId },
    });
    if (!event) {
      throw new ApiError(404, "Event not found", "NOT_FOUND");
    }

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    await markEventRead(db, eventId, parsed.data.is_read);

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
