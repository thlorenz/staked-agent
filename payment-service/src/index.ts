import express from "express";

import { loadConfig } from "./config";
import { createSolanaConnection, loadKeypairFromFile } from "./solana";
import { BalanceResponse, ErrorResponse, HealthResponse } from "./types";

const config = loadConfig();
const sender = loadKeypairFromFile(config.senderKeypairPath);
const connection = createSolanaConnection(config.solanaRpcUrl);
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = {
    ok: true,
    service: "payment-service"
  };
  res.json(response);
});

app.get("/balance", async (_req, res) => {
  try {
    const solBalanceLamports = await connection.getBalance(
      sender.publicKey,
      "confirmed",
    );
    const response: BalanceResponse = {
      ok: true,
      wallet: sender.publicKey.toBase58(),
      solBalanceLamports
    };
    res.json(response);
  } catch (error) {
    const response: ErrorResponse = {
      ok: false,
      error: "Unable to fetch wallet balance",
      details: error instanceof Error ? error.message : String(error)
    };
    res.status(500).json(response);
  }
});

app.listen(config.port, () => {
  console.log(
    `payment-service listening on port ${config.port} for ${config.cluster}`,
  );
});
