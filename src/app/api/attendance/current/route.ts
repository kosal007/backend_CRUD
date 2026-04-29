import { NextResponse } from "next/server";

import { db } from "@/db";
import { attendanceSessions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { assertUserExists, getActiveSession, resolveAttendanceUserId } from "@/lib/attendance";
import { toApiError } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const searchParams = new URL(request.url).searchParams;
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId && auth.role === "ROLE_A") {
      const rows = await db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.status, "active"))
        .orderBy(desc(attendanceSessions.checkInTime));

      return NextResponse.json({ data: rows }, { status: 200 });
    }

    const userId = resolveAttendanceUserId(auth, requestedUserId);

    await assertUserExists(userId);

    const activeSession = await getActiveSession(userId);

    return NextResponse.json({ data: activeSession }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
