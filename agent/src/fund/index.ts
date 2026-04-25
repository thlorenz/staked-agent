import { loadAgentConfig } from "../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  parsePublicKey,
} from "../shared";
import { loadFundingWallets } from "../shared/solana-cli";
import { ensureAssociatedTokenAccount, transferSplTokens } from "../shared/spl";
import { executePreparedSwap, prepareSwap } from "../trade";
import type { FundRequest, FundResult } from "./types";

export async function executeFunding(
  request: FundRequest,
): Promise<FundResult> {
  const config = loadAgentConfig();
  if (config.cluster !== "devnet") {
    throw new Error("Only devnet is supported.");
  }

  const connection = createSolanaConnection(config.solanaRpcUrl);
  const { operatorSigner, agentRecipient } = loadFundingWallets(config);
  const usdcMint = parsePublicKey(config.usdcMint, "USDC mint");

  const operatorUsdcAta = await ensureAssociatedTokenAccount(
    connection,
    operatorSigner,
    operatorSigner.publicKey,
    usdcMint,
  );
  const agentUsdcAta = await ensureAssociatedTokenAccount(
    connection,
    operatorSigner,
    agentRecipient.publicKey,
    usdcMint,
  );

  const purchaseTargetAtomicAmount =
    request.requestedUsdcAtomicAmount * BigInt(config.fundingMultiplier);
  const preparedSwap = await prepareSwap({
    signer: operatorSigner,
    inputMint: config.solMint,
    outputMint: config.usdcMint,
    amountAtomic: purchaseTargetAtomicAmount,
    swapMode: "ExactOut",
    slippageBps: request.slippageBps,
  });

  const balanceLamports = await connection.getBalance(operatorSigner.publicKey);
  if (
    BigInt(balanceLamports) <
    preparedSwap.inputAmountAtomic + config.minSolFeeReserveLamports
  ) {
    throw new Error("Insufficient SOL for swap plus fee reserve.");
  }

  let purchaseSignature: string;
  try {
    const executedSwap = await executePreparedSwap(preparedSwap);
    purchaseSignature = executedSwap.signature;
  } catch (error) {
    throw new Error(
      `Failed swap transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let transferSignature: string;
  try {
    transferSignature = await transferSplTokens(
      connection,
      operatorSigner,
      operatorSigner.publicKey,
      operatorUsdcAta,
      agentUsdcAta,
      usdcMint,
      request.requestedUsdcAtomicAmount,
      6,
    );
  } catch (error) {
    throw new Error(
      `Failed SPL token transfer: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return {
    requestedUsdcAtomicAmount: request.requestedUsdcAtomicAmount,
    purchasedUsdcAtomicAmount: preparedSwap.outputAmountAtomic,
    sourceWallet: operatorSigner.publicKey.toBase58(),
    destinationWallet: agentRecipient.publicKey.toBase58(),
    operatorUsdcAta: operatorUsdcAta.toBase58(),
    agentUsdcAta: agentUsdcAta.toBase58(),
    purchaseSignature,
    transferSignature,
    purchaseExplorerUrl: buildExplorerTxUrl(purchaseSignature),
    transferExplorerUrl: buildExplorerTxUrl(transferSignature),
  };
}
