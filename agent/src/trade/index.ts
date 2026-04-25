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
  ExecutedSwap,
  PreparedSwap,
  SwapRequest,
  TradeRequest,
} from "./types";

function parseQuoteAmount(value: string, fieldName: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return BigInt(value);
}

export async function prepareSwap(request: SwapRequest): Promise<PreparedSwap> {
  const config = loadAgentConfig();
  const rawQuote = await getJupiterQuote(config, request);

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

export async function executePreparedSwap(
  prepared: PreparedSwap,
): Promise<ExecutedSwap> {
  const config = loadAgentConfig();
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const swapTransactionBase64 = await buildJupiterSwapTransaction(
    config,
    prepared.request.signer.publicKey.toBase58(),
    prepared.rawQuote,
  );
  const transaction = deserializeVersionedTransaction(swapTransactionBase64);
  transaction.sign([prepared.request.signer]);

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
    explorerUrl: buildExplorerTxUrl(signature),
    inputAmountAtomic: prepared.inputAmountAtomic,
    outputAmountAtomic: prepared.outputAmountAtomic,
  };
}

export async function executeTrade(
  request: TradeRequest,
): Promise<ExecutedTrade> {
  const config = loadAgentConfig();

  const connection = createSolanaConnection(config.solanaRpcUrl);
  const signer = loadKeypairFromFile(config.agentKeypairPath);
  const swapRequest: SwapRequest =
    request.direction === "buy-sol-with-usdc"
      ? {
          signer,
          inputMint: config.usdcMint,
          outputMint: config.solMint,
          amountAtomic: request.solAtomicAmount,
          swapMode: "ExactOut",
          slippageBps: request.slippageBps,
        }
      : {
          signer,
          inputMint: config.solMint,
          outputMint: config.usdcMint,
          amountAtomic: request.solAtomicAmount,
          swapMode: "ExactIn",
          slippageBps: request.slippageBps,
        };

  const preparedSwap = await prepareSwap(swapRequest);

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

    if (availableUsdc < preparedSwap.inputAmountAtomic) {
      throw new Error("Insufficient USDC balance.");
    }
  } else {
    const balanceLamports = await connection.getBalance(signer.publicKey);
    if (
      BigInt(balanceLamports) <
      preparedSwap.inputAmountAtomic + config.minSolFeeReserveLamports
    ) {
      throw new Error("Insufficient SOL balance.");
    }
  }

  const executedSwap = await executePreparedSwap(preparedSwap);

  return {
    direction: request.direction,
    signature: executedSwap.signature,
    explorerUrl: executedSwap.explorerUrl,
    inputAmountAtomic: executedSwap.inputAmountAtomic,
    outputAmountAtomic: executedSwap.outputAmountAtomic,
  };
}
