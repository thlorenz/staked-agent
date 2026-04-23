import { randomUUID } from "node:crypto";

import express from "express";

import { loadConfig } from "./config";
import { buildTransfer, getTeeAuthToken, maybeVerifyTee } from "./magicblock";
import {
  assertRequiredSigner,
  createSolanaConnection,
  deserializeTransaction,
  loadKeypairFromFile,
  parsePublicKey,
  signAndSendBuiltTransaction
} from "./solana";
import {
  BalanceResponse,
  ErrorResponse,
  HealthResponse,
  PayRequestBody,
  PayResponse,
  PrivacyMode
} from "./types";

const config = loadConfig();
const sender = loadKeypairFromFile(config.senderKeypairPath);
const connection = createSolanaConnection(config.solanaRpcUrl);
const app = express();

app.use(express.json());

function sendError(
  res: express.Response,
  status: number,
  error: string,
  details?: string,
): void {
  const response: ErrorResponse = {
    ok: false,
    error,
    details
  };
  res.status(status).json(response);
}

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

app.post("/pay", async (req, res) => {
  const requestId = randomUUID();

  try {
    const body = req.body as Partial<PayRequestBody>;

    if (typeof body.to !== "string" || body.to.trim() === "") {
      sendError(res, 400, "Invalid request body", "`to` must be a non-empty string");
      return;
    }

    if (
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      !Number.isInteger(body.amount) ||
      body.amount <= 0
    ) {
      sendError(
        res,
        400,
        "Invalid request body",
        "`amount` must be a positive integer",
      );
      return;
    }

    if (
      body.privacy !== undefined &&
      body.privacy !== "public" &&
      body.privacy !== "private"
    ) {
      sendError(
        res,
        400,
        "Invalid request body",
        "`privacy` must be either `public` or `private`",
      );
      return;
    }

    const destination = parsePublicKey(body.to, "to");
    const privacy: PrivacyMode = body.privacy ?? "private";
    const mint = body.mint ?? config.usdcMint;
    const cluster = body.cluster ?? config.cluster;
    const validator = body.validator ?? config.validator;
    const memo = body.memo;
    const senderPublicKey = sender.publicKey.toBase58();

    if (privacy === "private") {
      await maybeVerifyTee(config);
      await getTeeAuthToken(config, sender);
      console.log(`[${requestId}] obtained TEE auth token for private payment`);
    }

    const build = await buildTransfer(config, {
      owner: senderPublicKey,
      destination: destination.toBase58(),
      amount: body.amount,
      cluster,
      mint,
      privacy,
      validator,
      memo
    });

    assertRequiredSigner(build.requiredSigners, senderPublicKey);

    const transaction = deserializeTransaction(build.transactionBase64);
    const signature = await signAndSendBuiltTransaction(
      connection,
      transaction,
      sender,
    );

    console.log(
      `[${requestId}] sender=${senderPublicKey} destination=${destination.toBase58()} amount=${body.amount} privacy=${privacy} kind=${build.kind} signature=${signature}`,
    );

    const response: PayResponse = {
      ok: true,
      signature,
      sender: senderPublicKey,
      destination: destination.toBase58(),
      amount: body.amount,
      privacy,
      build
    };
    res.json(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    if (
      details === "Invalid to" ||
      details === "Sender is not listed in requiredSigners"
    ) {
      sendError(res, 400, "Invalid payment request", details);
      return;
    }

    if (
      details.startsWith("MagicBlock transfer build failed") ||
      details.startsWith("TEE challenge request failed") ||
      details.startsWith("TEE auth request failed") ||
      details.startsWith("TEE challenge response did not include a challenge") ||
      details.startsWith("TEE auth response did not include a token") ||
      details === "TEE verification is not implemented in this sample"
    ) {
      sendError(res, 502, "Upstream MagicBlock request failed", details);
      return;
    }

    sendError(res, 500, "Unable to complete payment", details);
  }
});

app.listen(config.port, () => {
  console.log(
    `payment-service listening on port ${config.port} for ${config.cluster}`,
  );
});
