require("dotenv").config({ path: ".env" });
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { Expo } = require("expo-server-sdk");
const { Pool } = require("pg");

const expo = new Expo();
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "4000", 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

async function getRoleAPushTokens() {
  const query = `
    SELECT push_token
    FROM users
    WHERE role = $1
      AND push_token IS NOT NULL
      AND push_token <> ''
  `;

  const result = await dbPool.query(query, ["ROLE_A"]);
  return result.rows.map((row) => row.push_token).filter(Boolean);
}

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

      socket.on("sync:data", async (payload = {}) => {
        try {
          const { userId, lat, lng, syncedAt } = payload;

          console.log(`Role B synced: ${userId}`);
          console.log("📦 sync:data payload:", payload);

          const roleAPushTokens = await getRoleAPushTokens();

          if (!roleAPushTokens.length) {
            console.log("🔕 No ROLE_A push tokens found. Skipping notification.");
            return;
          }

          const validTokens = [];
          for (const token of roleAPushTokens) {
            if (Expo.isExpoPushToken(token)) {
              validTokens.push(token);
            } else {
              console.warn("⚠️ Invalid Expo push token:", token);
            }
          }

          if (!validTokens.length) {
            console.log("🔕 No valid Expo push tokens after validation.");
            return;
          }

          const messages = validTokens.map((token) => ({
            to: token,
            sound: "default",
            title: "Driver Synced",
            body: `Driver ${userId} has synced their data`,
            data: { userId, lat, lng, syncedAt },
          }));

          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            console.log("📨 Sent Expo push chunk", {
              count: chunk.length,
              tickets,
            });
          }

          console.log("✅ Backend broadcasted push notifications to ROLE_A clients", {
            roleACount: validTokens.length,
            syncedUserId: userId,
          });
        } catch (error) {
          console.error("❌ Failed to process sync:data", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
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
