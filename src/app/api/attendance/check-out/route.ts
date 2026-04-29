import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { attendanceSessions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { assertUserExists, getActiveSession, resolveAttendanceUserId } from "@/lib/attendance";
import { ApiError, readJsonBody, toApiError } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckOutBody = {
  userId?: unknown;
};

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const payload = await readJsonBody<CheckOutBody>(request);

    const userId = resolveAttendanceUserId(auth, payload.userId);

    await assertUserExists(userId);

    const activeSession = await getActiveSession(userId);
    if (!activeSession) {
      throw new ApiError("No active attendance session found.", 400);
    }

    const checkOutTime = new Date();
    const totalDuration = Math.max(0, checkOutTime.getTime() - activeSession.checkInTime.getTime());

    const [updated] = await db
      .update(attendanceSessions)
      .set({
        checkOutTime,
        status: "completed",
        totalDuration,
        updatedAt: checkOutTime,
      })
      .where(
        and(
          eq(attendanceSessions.id, activeSession.id),
          eq(attendanceSessions.userId, userId),
          eq(attendanceSessions.status, "active")
        )
      )
      .returning();

    if (!updated) {
      throw new ApiError("Failed to complete attendance session.", 409);
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
