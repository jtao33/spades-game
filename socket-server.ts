/**
 * Standalone Socket.io server for multiplayer Spades.
 * Runs separately from the Next.js app on port 3001.
 */

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { initializeSocketServer } from "./src/lib/socket/server";

const port = parseInt(process.env.SOCKET_PORT || "3001", 10);
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "http://localhost:3003",
];

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize socket handlers
initializeSocketServer(io);

httpServer.listen(port, () => {
  console.log(`Socket.io server running on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
