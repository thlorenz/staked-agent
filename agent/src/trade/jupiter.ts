import type { AgentConfig } from "../config";
import type { JupiterQuoteResponse, SwapRequest } from "./types";

export async function getJupiterQuote(
  config: AgentConfig,
  request: Pick<
    SwapRequest,
    "inputMint" | "outputMint" | "amountAtomic" | "swapMode" | "slippageBps"
  >,
): Promise<JupiterQuoteResponse> {
  const url = new URL(`${config.jupiterBaseUrl}/quote`);
  url.searchParams.set("inputMint", request.inputMint);
  url.searchParams.set("outputMint", request.outputMint);
  url.searchParams.set("amount", request.amountAtomic.toString());
  url.searchParams.set("swapMode", request.swapMode);
  url.searchParams.set("slippageBps", request.slippageBps.toString());

  const headers: Record<string, string> = {};
  if (config.jupiterApiKey) {
    headers.Authorization = `Bearer ${config.jupiterApiKey}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Jupiter quote request failed with status ${response.status}.\n` +
      `Request URL: ${url.toString()}\n` +
      `inputMint: ${request.inputMint}\n` +
      `outputMint: ${request.outputMint}\n` +
      `amountAtomic: ${request.amountAtomic}\n` +
      `swapMode: ${request.swapMode}\n` +
      `Response body: ${responseBody}`,
    );
  }

  return (await response.json()) as JupiterQuoteResponse;
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
    const responseBody = await response.text();
    throw new Error(
      `Jupiter swap request failed with status ${response.status}.\n` +
      `Response body: ${responseBody}`,
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
