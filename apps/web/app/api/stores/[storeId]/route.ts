import { eq } from "drizzle-orm";
import { stores, getStoreById } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError, ApiError } from "@/lib/api/errors";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await params;
    const db = getDb(getEnv());
    const store = await getStoreById(db, storeId);

    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    return Response.json(store);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await params;
    const db = getDb(getEnv());

    const store = await getStoreById(db, storeId);
    if (!store) {
      throw new ApiError(404, "Store not found", "NOT_FOUND");
    }

    await db.delete(stores).where(eq(stores.domain, storeId));

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
