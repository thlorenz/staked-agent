import { loadAgentConfig } from "../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  deserializeVersionedTransaction,
  loadKeypairFromFile,
  parsePublicKey,
} from "../shared";
import { buildJupiterSwapTransaction, getJupiterQuote } from "./jupiter";
import type {
  ExecutedTrade,
  JupiterQuoteResponse,
  TradeRequest,
} from "./types";

export async function executeTrade(
  request: TradeRequest,
): Promise<ExecutedTrade> {
  const config = loadAgentConfig();
  if (config.cluster !== "devnet") {
    throw new Error("Only devnet is supported.");
  }

  const connection = createSolanaConnection(config.solanaRpcUrl);
  const signer = loadKeypairFromFile(config.agentKeypairPath);
  const quote = await getJupiterQuote(config, request);

  if (request.direction === "buy-sol-with-usdc") {
    const usdcMint = parsePublicKey(config.usdcMint, "USDC mint");
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      signer.publicKey,
      { mint: usdcMint },
    );
    const availableUsdc = tokenAccounts.value.reduce((total, account) => {
      const amount = account.account.data.parsed.info.tokenAmount
        .amount as string;
      return total + BigInt(amount);
    }, 0n);

    if (availableUsdc < request.usdcAtomicAmount) {
      throw new Error("Insufficient USDC balance.");
    }
  } else {
    const balanceLamports = await connection.getBalance(signer.publicKey);
    if (
      BigInt(balanceLamports) <
      quote.inputAmountAtomic + config.minSolFeeReserveLamports
    ) {
      throw new Error("Insufficient SOL balance.");
    }
  }

  const swapTransactionBase64 = await buildJupiterSwapTransaction(
    config,
    signer.publicKey.toBase58(),
    quote.rawQuote as JupiterQuoteResponse,
  );
  const transaction = deserializeVersionedTransaction(swapTransactionBase64);
  transaction.sign([signer]);

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
    direction: request.direction,
    signature,
    explorerUrl: buildExplorerTxUrl(signature),
    inputAmountAtomic: quote.inputAmountAtomic,
    outputAmountAtomic: quote.outputAmountAtomic,
  };
}
