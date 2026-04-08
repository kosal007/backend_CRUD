import { Router } from "express";
import type { Server } from "socket.io";

import { createLocationController } from "../controllers/locationController";

export function createLocationRouter(io: Server): Router {
  const router = Router();
  const controller = createLocationController(io);

  router.post("/update", controller.updateFromStaff);
  router.get("/:userId", controller.getStaffLocation);

  return router;
}
