import type { Server, Socket } from "socket.io";

import { getLatestLocationByUserId, upsertLatestLocation } from "../services/locationService";
import type { StaffLocationInput } from "../types/location";

export const MANAGER_ROOM = "managers";

type ClientToServerEvents = {
  "manager:join": (payload: { managerId: string }) => void;
  "send-location": (payload: { userId: string; latitude: number; longitude: number }) => void;
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
    console.log("[Socket Debug] Client connected", {
      socketId: socket.id,
      transport: socket.conn.transport.name,
      origin: socket.handshake.headers.origin,
      address: socket.handshake.address,
    });

    socket.onAny((eventName, ...args) => {
      console.log("[Socket Debug] Incoming event", {
        socketId: socket.id,
        event: eventName,
        args,
      });
    });

    socket.on("send-location", (payload) => {
      console.log("[Socket Debug] send-location received", {
        socketId: socket.id,
        userId: payload.userId,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
      console.log("[Socket Debug] Full location payload", payload);
    });

    socket.on("manager:join", (payload) => {
      socket.join(MANAGER_ROOM);
      console.log("[Socket.IO] manager joined room", {
        socketId: socket.id,
        managerId: payload.managerId,
        room: MANAGER_ROOM,
      });
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

    socket.on("disconnect", (reason) => {
      console.warn("[Socket Debug] Client disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });
}
