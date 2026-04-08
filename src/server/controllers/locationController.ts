import type { Request, Response } from "express";
import type { Server } from "socket.io";

import { MANAGER_ROOM } from "../socket/locationSocketHandler";
import { getLatestLocationByUserId, upsertLatestLocation } from "../services/locationService";
import type { StaffLocationInput } from "../types/location";

function assertManagerRole(req: Request): void {
  const role = req.header("x-role");

  if (role !== "ROLE_A") {
    throw new Error("Forbidden. ROLE_A required.");
  }
}

export function createLocationController(io: Server) {
  return {
    updateFromStaff: async (req: Request, res: Response) => {
      try {
        const payload = req.body as StaffLocationInput;
        const latest = await upsertLatestLocation(payload);

        io.to(MANAGER_ROOM).emit("manager:location:update", latest);

        return res.status(200).json({ data: latest });
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid payload" });
      }
    },

    getStaffLocation: async (req: Request, res: Response) => {
      try {
        assertManagerRole(req);

        const userIdParam = req.params.userId;
        const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;

        if (!userId) {
          return res.status(400).json({ error: "userId is required." });
        }

        const location = await getLatestLocationByUserId(userId);

        return res.status(200).json({ data: location });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch location";
        const status = message.toLowerCase().includes("forbidden") ? 403 : 400;

        return res.status(status).json({ error: message });
      }
    },
  };
}
