import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { attendanceSessions, stores, users } from "@/db/schema";
import { type AuthTokenPayload } from "@/lib/auth";
import { ApiError, ensureUuid } from "@/lib/db";

export function resolveAttendanceUserId(auth: AuthTokenPayload, requestedUserId?: unknown): string {
  if (requestedUserId === undefined || requestedUserId === null) {
    return auth.sub;
  }

  if (typeof requestedUserId !== "string") {
    throw new ApiError("userId must be a valid UUID.", 400);
  }

  const userId = ensureUuid(requestedUserId, "userId");

  if (auth.role !== "ROLE_A" && auth.sub !== userId) {
    throw new ApiError("Forbidden.", 403);
  }

  return userId;
}

export async function assertUserExists(userId: string): Promise<void> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new ApiError("User not found.", 404);
  }
}

export async function assertStoreExistsAndActive(storeId: string): Promise<void> {
  const [store] = await db
    .select({ id: stores.id, status: stores.status })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store) {
    throw new ApiError("Store not found.", 404);
  }

  if (store.status !== "active") {
    throw new ApiError("Store is inactive.", 400);
  }
}

export async function getActiveSession(userId: string) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(and(eq(attendanceSessions.userId, userId), eq(attendanceSessions.status, "active")))
    .orderBy(desc(attendanceSessions.checkInTime))
    .limit(1);

  return session ?? null;
}
