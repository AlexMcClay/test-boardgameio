import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import "@fastify/websocket";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

// Register the WebSocket plugin
await fastify.register(fastifyWebsocket);

// Setup the WebSocket endpoint
fastify.get("/ws", { websocket: true }, (connection, req) => {
  fastify.log.info("A client connected via WebSockets!");

  // TypeScript now perfectly understands that 'connection' is an augmented
  // Fastify object containing the 'socket' instance.
  const { socket } = connection;

  socket.on("message", (message: Buffer) => {
    fastify.log.info(`Received: ${message.toString()}`);
    socket.send(`Server received: ${message.toString()}`);
  });

  socket.on("close", () => {
    fastify.log.info("Client disconnected");
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 8080, host: "0.0.0.0" });
    console.log(
      "🚀 Fastify WebSocket server running on ws://localhost:8080/ws",
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
