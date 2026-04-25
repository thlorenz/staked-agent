import type { AgentConfig } from "../config";
import type { JupiterQuoteResponse, TradeQuote, TradeRequest } from "./types";

function parseQuoteAmount(value: string, fieldName: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return BigInt(value);
}

export async function getJupiterQuote(
  config: AgentConfig,
  request: TradeRequest,
): Promise<TradeQuote> {
  const url = new URL(`${config.jupiterBaseUrl}/quote`);
  const isBuy = request.direction === "buy-sol-with-usdc";

  url.searchParams.set("inputMint", isBuy ? config.usdcMint : config.solMint);
  url.searchParams.set("outputMint", isBuy ? config.solMint : config.usdcMint);
  url.searchParams.set("amount", request.usdcAtomicAmount.toString());
  url.searchParams.set("swapMode", isBuy ? "ExactIn" : "ExactOut");
  url.searchParams.set("slippageBps", request.slippageBps.toString());

  const headers: Record<string, string> = {};
  if (config.jupiterApiKey) {
    headers.Authorization = `Bearer ${config.jupiterApiKey}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(
      `Jupiter quote request failed with status ${response.status}.`,
    );
  }

  const rawQuote = (await response.json()) as JupiterQuoteResponse;

  return {
    direction: request.direction,
    inputMint: rawQuote.inputMint,
    outputMint: rawQuote.outputMint,
    inputAmountAtomic: parseQuoteAmount(
      rawQuote.inAmount,
      "Jupiter quote input amount",
    ),
    outputAmountAtomic: parseQuoteAmount(
      rawQuote.outAmount,
      "Jupiter quote output amount",
    ),
    rawQuote,
  };
}

export async function buildJupiterSwapTransaction(
  config: AgentConfig,
  userPublicKey: string,
  rawQuote: JupiterQuoteResponse,
): Promise<string> {
  const response = await fetch(`${config.jupiterBaseUrl}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.jupiterApiKey
        ? { Authorization: `Bearer ${config.jupiterApiKey}` }
        : {}),
    },
    body: JSON.stringify({
      userPublicKey,
      quoteResponse: rawQuote,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: config.maxPriorityFeeLamports,
          priorityLevel: "high",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Jupiter swap request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as { swapTransaction?: string };
  if (
    typeof payload.swapTransaction !== "string" ||
    payload.swapTransaction.length === 0
  ) {
    throw new Error("Jupiter swap response did not include swapTransaction.");
  }

  return payload.swapTransaction;
}
