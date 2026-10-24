import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { businessRouter } from "./routes/business.js";
import { simulateRouter } from "./routes/simulate.js";
import { aiRouter } from "./routes/ai.js";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));

app.use("/api/business", businessRouter);
app.use("/api/simulate", simulateRouter);
app.use("/api/ai", aiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
