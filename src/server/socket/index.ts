import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { registerLocationSocketHandlers } from "./locationSocketHandler";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(",") ?? "*",
      methods: ["GET", "POST"],
    },
  });

  registerLocationSocketHandlers(io);
  return io;
}
