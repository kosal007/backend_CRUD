import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { registerLocationSocketHandlers } from "./locationSocketHandler";

export function createSocketServer(httpServer: HttpServer): Server {
  const allowedOrigins = process.env.SOCKET_CORS_ORIGIN?.split(",") ?? "*";
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  console.log("[Socket.IO] server initialized", {
    corsOrigin: allowedOrigins,
  });

  io.engine.on("connection_error", (error) => {
    console.error("[Socket.IO] connection_error", {
      code: error.code,
      message: error.message,
      context: error.context,
    });
  });

  registerLocationSocketHandlers(io);
  return io;
}
