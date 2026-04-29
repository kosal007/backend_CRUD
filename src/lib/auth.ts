import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

import { ApiError } from "@/lib/db";

export type UserRole = "ROLE_A" | "ROLE_B";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

const PASSWORD_HASH_KEYLEN = 64;
const TOKEN_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length < 16) {
    throw new ApiError("JWT_SECRET is not configured correctly.", 500);
  }

  return secret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_HASH_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hashHex] = storedHash.split(":");

    if (!salt || !hashHex) {
      return false;
    }

    const expectedHash = Buffer.from(hashHex, "hex");
    const actualHash = scryptSync(password, salt, expectedHash.length);

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}

export function createAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

function parseAuthorizationHeader(request: Request): string {
  const value = request.headers.get("authorization");

  if (!value) {
    throw new ApiError("Missing Authorization header.", 401);
  }

  const [scheme, token] = value.split(" ");

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    throw new ApiError("Authorization header must use Bearer token.", 401);
  }

  return token;
}

export function requireAuth(request: Request): AuthTokenPayload {
  const token = parseAuthorizationHeader(request);

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded || typeof decoded === "string") {
      throw new ApiError("Invalid access token.", 401);
    }

    const { sub, email, name, role } = decoded as Partial<AuthTokenPayload>;

    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "ROLE_A" && role !== "ROLE_B")
    ) {
      throw new ApiError("Invalid access token payload.", 401);
    }

    return { sub, email, name, role };
  } catch {
    throw new ApiError("Unauthorized.", 401);
  }
}

export function requireRole(request: Request, allowedRoles: UserRole[]): AuthTokenPayload {
  const auth = requireAuth(request);

  if (!allowedRoles.includes(auth.role)) {
    throw new ApiError("Forbidden.", 403);
  }

  return auth;
}


// ...existing code...

export type VerifiedToken = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function verifyToken(token: string): VerifiedToken | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded || typeof decoded === "string") {
      return null;
    }

    const { sub, email, name, role } = decoded as Partial<AuthTokenPayload>;

    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "ROLE_A" && role !== "ROLE_B")
    ) {
      return null;
    }

    return { id: sub, email, name, role };
  } catch {
    return null;
  }
}

// ...existing code...