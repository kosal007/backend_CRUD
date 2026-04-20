const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "4000", 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      handle(req, res);
    });

    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
      console.log("✅ Connected:", socket.id);

      socket.on("location:update", (payload) => {
        console.log("📍 Role B sent location:update:", payload);

        io.emit("location:update", payload);
        console.log("📡 Broadcasted location:update to all clients", {
          fromSocketId: socket.id,
          connectedClients: io.engine.clientsCount,
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("❌ Disconnected:", socket.id, { reason });
      });
    });

    httpServer.listen(port, host, () => {
      console.log(`🚀 Next.js + Socket.IO listening on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start custom server", error);
    process.exit(1);
  });
