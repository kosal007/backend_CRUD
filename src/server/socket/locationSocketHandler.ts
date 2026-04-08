import type { Server, Socket } from "socket.io";

import { getLatestLocationByUserId, upsertLatestLocation } from "../services/locationService";
import type { StaffLocationInput } from "../types/location";

export const MANAGER_ROOM = "managers";

type ClientToServerEvents = {
  "manager:join": (payload: { managerId: string }) => void;
  "manager:location:get": (
    payload: { userId: string },
    ack?: (response: { ok: boolean; data?: unknown; error?: string }) => void
  ) => void;
  "staff:location:update": (
    payload: StaffLocationInput,
    ack?: (response: { ok: boolean; data?: unknown; error?: string }) => void
  ) => void;
};

type ServerToClientEvents = {
  "manager:location:update": (payload: unknown) => void;
};

export function registerLocationSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.on("manager:join", () => {
      socket.join(MANAGER_ROOM);
    });

    socket.on("manager:location:get", async (payload, ack) => {
      try {
        const location = await getLatestLocationByUserId(payload.userId);
        ack?.({ ok: true, data: location });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to fetch location" });
      }
    });

    socket.on("staff:location:update", async (payload, ack) => {
      try {
        const latest = await upsertLatestLocation(payload);
        io.to(MANAGER_ROOM).emit("manager:location:update", latest);
        ack?.({ ok: true, data: latest });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Invalid location payload" });
      }
    });
  });
}
