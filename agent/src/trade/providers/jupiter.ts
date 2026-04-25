import type { AgentConfig } from "../../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  deserializeVersionedTransaction,
} from "../../shared";
import { buildJupiterSwapTransaction, getJupiterQuote } from "../jupiter";
import type { JupiterQuoteResponse } from "../types";
import type {
  ExecutedSwap,
  SwapExecutionRequest,
  SwapProvider,
  SwapQuote,
  SwapQuoteRequest,
} from "./swap-provider";

function parseQuoteAmount(value: string, fieldName: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }
  return BigInt(value);
}

export class JupiterSwapProvider implements SwapProvider {
  readonly name = "jupiter" as const;

  constructor(private readonly config: AgentConfig) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const rawQuote = await getJupiterQuote(this.config, request);
    return {
      request,
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

  async executeSwap(request: SwapExecutionRequest): Promise<ExecutedSwap> {
    const connection = createSolanaConnection(this.config.solanaRpcUrl);
    const rawQuote = request.quote.rawQuote as JupiterQuoteResponse;
    const swapTransactionBase64 = await buildJupiterSwapTransaction(
      this.config,
      request.signer.publicKey.toBase58(),
      rawQuote,
    );
    const transaction = deserializeVersionedTransaction(swapTransactionBase64);
    transaction.sign([request.signer]);

    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
    );
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
    );
    if (confirmation.value.err !== null) {
      throw new Error("Swap transaction failed.");
    }

    return {
      signature,
      explorerUrl: buildExplorerTxUrl(signature, this.config.cluster),
      inputAmountAtomic: request.quote.inputAmountAtomic,
      outputAmountAtomic: request.quote.outputAmountAtomic,
    };
  }
}
