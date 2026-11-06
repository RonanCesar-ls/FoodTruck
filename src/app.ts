import { fileURLToPath } from "node:url";
import express from "express";
import type { Express } from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { createApiRouter } from "./routes/apiRoutes.js";
import type { ApiServices } from "./routes/apiRoutes.js";

/** Configura HTTP usando dependências prontas; não abre banco nem porta. */
export function createApp(services: ApiServices): Express {
  const app = express();

  app.use(express.json());
  app.use("/api", createApiRouter(services));
  app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));
  app.use(errorHandler);
  return app;
}
