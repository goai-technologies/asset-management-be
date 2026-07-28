import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, getPool } from "./config/db.js";

const app = createApp();

async function start() {
  try {
    await getPool().query("SELECT 1");
    console.log("[DB] Connected to PostgreSQL");
  } catch (error) {
    console.error("[DB] Failed to connect:", error);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[Server] EAMS API listening on http://localhost:${env.port}`);
    console.log(`[Server] Health check: http://localhost:${env.port}/api/health`);
    console.log(`[Server] CORS origins: ${env.corsOrigins.join(", ")}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
