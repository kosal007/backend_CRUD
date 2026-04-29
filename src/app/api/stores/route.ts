import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  ApiError,
  ensureLatitude,
  ensureLongitude,
  ensureNonEmptyString,
  ensureRadius,
  readJsonBody,
  toApiError,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateStoreBody = {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radius?: unknown;
  status?: unknown;
};

export async function GET() {
  try {
    const rows = await db.select().from(stores).orderBy(desc(stores.updatedAt));

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}

export async function POST(request: Request) {
  try {
    requireRole(request, ["ROLE_A"]);

    const payload = await readJsonBody<CreateStoreBody>(request);

    const name = ensureNonEmptyString(payload.name, "name");
    const latitude = ensureLatitude(payload.latitude);
    const longitude = ensureLongitude(payload.longitude);
    const radius = ensureRadius(payload.radius);

    let status: "active" | "inactive" = "active";
    if (payload.status !== undefined) {
      if (payload.status !== "active" && payload.status !== "inactive") {
        throw new ApiError("status must be active or inactive.", 400);
      }
      status = payload.status;
    }

    const [inserted] = await db
      .insert(stores)
      .values({
        name,
        latitude,
        longitude,
        radius,
        status,
      })
      .returning();

    if (!inserted) {
      throw new ApiError("Failed to create store.", 500);
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
