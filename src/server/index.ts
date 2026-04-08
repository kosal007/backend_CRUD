import { createServer } from "http";

import { createExpressApp } from "./app";
import { createSocketServer } from "./socket";

const PORT = Number.parseInt(process.env.EXPRESS_PORT ?? "4000", 10);

async function bootstrap() {
  const httpServer = createServer();
  const io = createSocketServer(httpServer);
  const app = createExpressApp(io);

  httpServer.removeAllListeners("request");
  httpServer.on("request", app);

  httpServer.listen(PORT, () => {
    console.log(`Realtime location server listening on port ${PORT}`);
  });
}

void bootstrap();
