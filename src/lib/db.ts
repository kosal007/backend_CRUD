import { validate as isUuid } from "uuid";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const dbErrorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;

  if (dbErrorCode === "23505") {
    return new ApiError("A record with the same unique value already exists.", 409);
  }

  if (error instanceof SyntaxError) {
    return new ApiError("Invalid JSON body.", 400);
  }

  return new ApiError("Internal server error.", 500);
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body.", 400);
  }
}

export function ensureUuid(value: string, fieldName = "id"): string {
  if (!isUuid(value)) {
    throw new ApiError(`${fieldName} must be a valid UUID.`, 400);
  }

  return value;
}

export function ensureNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`${fieldName} must be a non-empty string.`, 400);
  }

  return value.trim();
}

export function ensureEmail(value: unknown, fieldName = "email"): string {
  const email = ensureNonEmptyString(value, fieldName).toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValid) {
    throw new ApiError(`${fieldName} must be a valid email address.`, 400);
  }

  return email;
}

export function ensurePrice(value: unknown, fieldName = "price"): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiError(`${fieldName} must be a valid non-negative number.`, 400);
  }

  return value;
}

export function ensureLatitude(value: unknown, fieldName = "latitude"): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < -90 || value > 90) {
    throw new ApiError(`${fieldName} must be a valid latitude between -90 and 90.`, 400);
  }

  return value;
}

export function ensureLongitude(value: unknown, fieldName = "longitude"): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < -180 || value > 180) {
    throw new ApiError(`${fieldName} must be a valid longitude between -180 and 180.`, 400);
  }

  return value;
}

export function ensureRadius(value: unknown, fieldName = "radius"): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ApiError(`${fieldName} must be a valid positive number.`, 400);
  }

  return value;
}

export function ensureTimestamp(value: unknown, fieldName = "updated_at"): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(`${fieldName} must be a valid non-negative integer timestamp.`, 400);
  }

  return value;
}

export function ensureObject(value: unknown, fieldName = "payload"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(`${fieldName} must be an object.`, 400);
  }

  return value as Record<string, unknown>;
}

export function parseLastPulledAt(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError("last_pulled_at must be a valid non-negative integer.", 400);
  }

  return parsed;
}
