import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { ApiError, toApiError } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.sub))
      .limit(1);

    if (!user) {
      throw new ApiError("User not found.", 404);
    }

    return NextResponse.json(
      {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
