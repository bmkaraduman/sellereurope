import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.ts";
import { SpApiClient } from "@sellereurope/sp-api";
import { analyzeRoutes } from "./routes/analyze.ts";
import { listingRoutes } from "./routes/listings.ts";
import { storeRoutes } from "./routes/stores.ts";
import { orderRoutes } from "./routes/orders.ts";
import { scanRoutes } from "./routes/scans.ts";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// Simple bearer-token auth shared by the extension and the dashboard.
app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/health") return;
  const auth = req.headers.authorization ?? "";
  if (auth !== `Bearer ${env.apiToken}`) return reply.code(401).send({ error: "unauthorized" });
});

app.get("/health", async () => ({ ok: true }));

const spApi = new SpApiClient(env.spApi);
await storeRoutes(app);
await analyzeRoutes(app, spApi);
await listingRoutes(app, spApi);
await orderRoutes(app, spApi);
await scanRoutes(app, spApi);

app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
