import cors from "cors";
import express from "express";
import type { Server } from "socket.io";

import { createLocationRouter } from "./routes/locationRoutes";

export function createExpressApp(io: Server) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "realtime-location-server" });
  });

  app.use("/api/location", createLocationRouter(io));

  return app;
}
