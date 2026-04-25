import { loadAgentConfig } from "../config";
import {
  createSolanaConnection,
  loadKeypairFromFile,
  parsePublicKey,
} from "../shared";
import { getSwapProvider } from "./providers";
import type { SwapQuoteRequest } from "./providers";
import type { ExecutedTrade, TradeRequest } from "./types";

export async function executeTrade(
  request: TradeRequest,
): Promise<ExecutedTrade> {
  const config = loadAgentConfig();
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const signer = loadKeypairFromFile(config.agentKeypairPath);
  const provider = getSwapProvider(config);

  const quoteRequest: SwapQuoteRequest =
    request.direction === "buy-sol-with-usdc"
      ? {
          inputMint: config.usdcMint,
          outputMint: config.solMint,
          amountAtomic: request.solAtomicAmount,
          swapMode: "ExactOut",
          slippageBps: request.slippageBps,
        }
      : {
          inputMint: config.solMint,
          outputMint: config.usdcMint,
          amountAtomic: request.solAtomicAmount,
          swapMode: "ExactIn",
          slippageBps: request.slippageBps,
        };

  const quote = await provider.getQuote(quoteRequest);

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

    if (availableUsdc < quote.inputAmountAtomic) {
      throw new Error(
        `Insufficient USDC balance: quote requires ${quote.inputAmountAtomic} USDC.`,
      );
    }
  } else {
    const balanceLamports = await connection.getBalance(signer.publicKey);
    const requiredSol =
      request.solAtomicAmount + config.minSolFeeReserveLamports;
    if (BigInt(balanceLamports) < requiredSol) {
      throw new Error(
        `Insufficient native SOL balance: need ${request.solAtomicAmount} SOL for trade plus ${config.minSolFeeReserveLamports} lamports for reserves.`,
      );
    }
  }

  const executedSwap = await provider.executeSwap({ signer, quote });

  return {
    direction: request.direction,
    signature: executedSwap.signature,
    explorerUrl: executedSwap.explorerUrl,
    inputAmountAtomic: executedSwap.inputAmountAtomic,
    outputAmountAtomic: executedSwap.outputAmountAtomic,
  };
}
