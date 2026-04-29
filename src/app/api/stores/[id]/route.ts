import { eq } from "drizzle-orm";
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
  ensureUuid,
  readJsonBody,
  toApiError,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateStoreBody = {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radius?: unknown;
  status?: unknown;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);

    const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);

    if (!store) {
      throw new ApiError("Store not found.", 404);
    }

    return NextResponse.json({ data: store }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireRole(request, ["ROLE_A"]);

    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);
    const payload = await readJsonBody<UpdateStoreBody>(request);

    const updates: {
      name?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
      status?: "active" | "inactive";
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updates.name = ensureNonEmptyString(payload.name, "name");
    }

    if (payload.latitude !== undefined) {
      updates.latitude = ensureLatitude(payload.latitude);
    }

    if (payload.longitude !== undefined) {
      updates.longitude = ensureLongitude(payload.longitude);
    }

    if (payload.radius !== undefined) {
      updates.radius = ensureRadius(payload.radius);
    }

    if (payload.status !== undefined) {
      if (payload.status !== "active" && payload.status !== "inactive") {
        throw new ApiError("status must be active or inactive.", 400);
      }
      updates.status = payload.status;
    }

    if (
      updates.name === undefined &&
      updates.latitude === undefined &&
      updates.longitude === undefined &&
      updates.radius === undefined &&
      updates.status === undefined
    ) {
      throw new ApiError(
        "At least one field (name, latitude, longitude, radius, status) is required.",
        400
      );
    }

    const [updated] = await db.update(stores).set(updates).where(eq(stores.id, id)).returning();

    if (!updated) {
      throw new ApiError("Store not found.", 404);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRole(request, ["ROLE_A"]);

    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);

    const [updated] = await db
      .update(stores)
      .set({
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();

    if (!updated) {
      throw new ApiError("Store not found.", 404);
    }

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
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
