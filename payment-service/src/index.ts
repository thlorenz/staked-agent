import express from "express";

import { loadConfig } from "./config";
import { HealthResponse } from "./types";

const config = loadConfig();
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = {
    ok: true,
    service: "payment-service"
  };
  res.json(response);
});

app.listen(config.port, () => {
  console.log(
    `payment-service listening on port ${config.port} for ${config.cluster}`,
  );
});
