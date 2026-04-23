import { NextResponse } from "next/server";

import { requireRole, type AuthTokenPayload, type UserRole } from "@/lib/auth";
import { toApiError } from "@/lib/db";

type RequestWithUser = Request & {
  user: {
    userId: string;
  } & AuthTokenPayload;
};

type RoleHandler = (request: RequestWithUser) => Promise<Response>;

export function withRole(allowedRoles: UserRole[], handler: RoleHandler) {
  return async function roleProtectedHandler(request: Request): Promise<Response> {
    try {
      const auth = requireRole(request, allowedRoles);
      const requestWithUser = request as RequestWithUser;

      requestWithUser.user = {
        userId: auth.sub,
        ...auth,
      };

      return await handler(requestWithUser);
    } catch (error) {
      const apiError = toApiError(error);
      return NextResponse.json(
        { error: apiError.message, details: apiError.details },
        { status: apiError.status }
      );
    }
  };
}
