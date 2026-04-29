import { NextResponse } from "next/server";

import { db } from "@/db";
import { attendanceSessions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  assertStoreExistsAndActive,
  assertUserExists,
  getActiveSession,
  resolveAttendanceUserId,
} from "@/lib/attendance";
import { ApiError, ensureUuid, readJsonBody, toApiError } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckInBody = {
  userId?: unknown;
  storeId?: unknown;
};

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const payload = await readJsonBody<CheckInBody>(request);

    const userId = resolveAttendanceUserId(auth, payload.userId);
    if (typeof payload.storeId !== "string") {
      throw new ApiError("storeId must be a valid UUID.", 400);
    }
    const storeId = ensureUuid(payload.storeId, "storeId");

    await assertUserExists(userId);
    await assertStoreExistsAndActive(storeId);

    const existingSession = await getActiveSession(userId);
    if (existingSession) {
      throw new ApiError("User already has an active attendance session.", 409);
    }

    const now = new Date();
    const [created] = await db
      .insert(attendanceSessions)
      .values({
        userId,
        storeId,
        checkInTime: now,
        status: "active",
        totalDuration: null,
        checkOutTime: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new ApiError("Failed to create attendance session.", 500);
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
