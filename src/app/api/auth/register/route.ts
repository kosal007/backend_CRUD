import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createAccessToken, hashPassword, requireRole, type UserRole } from "@/lib/auth";
import {
  ApiError,
  ensureEmail,
  ensureNonEmptyString,
  readJsonBody,
  toApiError,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<RegisterBody>(request);

    const name = ensureNonEmptyString(payload.name, "name");
    const email = ensureEmail(payload.email);
    const password = ensureNonEmptyString(payload.password, "password");

    if (password.length < 8) {
      throw new ApiError("password must be at least 8 characters.", 400);
    }

    const [existingAnyUser] = await db.select({ id: users.id }).from(users).limit(1);
    const isBootstrap = !existingAnyUser;

    if (!isBootstrap) {
      requireRole(request, ["ROLE_A"]);
    }

    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail) {
      throw new ApiError("Email already in use.", 409);
    }

    let role: UserRole = "ROLE_B";
    if (isBootstrap) {
      role = "ROLE_A";
    } else if (payload.role === "ROLE_A" || payload.role === "ROLE_B") {
      role = payload.role;
    } else if (payload.role !== undefined) {
      throw new ApiError("role must be ROLE_A or ROLE_B.", 400);
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashPassword(password),
        role,
      })
      .returning();

    if (!createdUser) {
      throw new ApiError("Failed to create user.", 500);
    }

    const responseData: {
      user: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        createdAt: Date | null;
      };
      token?: string;
    } = {
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        createdAt: createdUser.createdAt ?? null,
      },
    };

    if (isBootstrap) {
      responseData.token = createAccessToken({
        sub: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role,
      });
    }

    return NextResponse.json({ data: responseData }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
