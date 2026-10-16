import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { businessRouter } from "./routes/business.js";
import { simulateRouter } from "./routes/simulate.js";
import { aiRouter } from "./routes/ai.js";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/business", businessRouter);
app.use("/api/simulate", simulateRouter);
app.use("/api/ai", aiRouter);

// Centralized error handler — routes should mostly try/catch and respond directly,
// this is a last-resort net so an unhandled throw never leaks a stack trace.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`BizWise AI backend listening on http://localhost:${env.port}`);
});
