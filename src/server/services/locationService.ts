import { redisClient } from "../redis/redisClient";
import type { StaffLocation, StaffLocationInput } from "../types/location";

const LOCATION_KEY_PREFIX = "staff:location:";
const ttlRaw = Number.parseInt(process.env.LOCATION_TTL_SECONDS ?? "300", 10);
const LOCATION_TTL_SECONDS = Number.isInteger(ttlRaw) && ttlRaw > 0 ? ttlRaw : 300;

function getLocationKey(userId: string): string {
  return `${LOCATION_KEY_PREFIX}${userId}`;
}

function assertUserId(userId: string): void {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required.");
  }
}

function assertCoordinate(value: unknown, name: "latitude" | "longitude"): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }

  if (name === "latitude" && (value < -90 || value > 90)) {
    throw new Error("latitude must be between -90 and 90.");
  }

  if (name === "longitude" && (value < -180 || value > 180)) {
    throw new Error("longitude must be between -180 and 180.");
  }

  return value;
}

export async function upsertLatestLocation(input: StaffLocationInput): Promise<StaffLocation> {
  assertUserId(input.userId);

  const payload: StaffLocation = {
    userId: input.userId,
    latitude: assertCoordinate(input.latitude, "latitude"),
    longitude: assertCoordinate(input.longitude, "longitude"),
    timestamp:
      typeof input.timestamp === "number" && Number.isInteger(input.timestamp) && input.timestamp > 0
        ? input.timestamp
        : Date.now(),
    receivedAt: Date.now(),
  };

  await redisClient.set(getLocationKey(payload.userId), JSON.stringify(payload), "EX", LOCATION_TTL_SECONDS);
  return payload;
}

export async function getLatestLocationByUserId(userId: string): Promise<StaffLocation | null> {
  assertUserId(userId);
  const raw = await redisClient.get(getLocationKey(userId));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StaffLocation;
  } catch {
    return null;
  }
}
