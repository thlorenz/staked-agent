import { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  UseFallbackTickArray,
  buildWhirlpoolClient,
  WhirlpoolContext,
  swapQuoteByOutputToken,
} from "@orca-so/whirlpools-sdk";
import BN from "bn.js";

import { loadAgentConfig } from "../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  parsePublicKey,
} from "../shared";
import { loadFundingWallets } from "../shared/solana-cli";
import { ensureAssociatedTokenAccount, transferSplTokens } from "../shared/spl";
import { USDC_DECIMALS } from "../shared/tokens";
import type { FundRequest, FundResult } from "./types";

const DEVNET_USDC_MINT = "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k";
const DEVNET_SOL_USDC_WHIRLPOOL =
  "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt";

function bigintFromBn(value: BN): bigint {
  return BigInt(value.toString(10));
}

function formatFundingError(prefix: string, error: unknown): never {
  throw new Error(
    `${prefix}: ${error instanceof Error ? error.message : String(error)}`,
  );
}

export async function executeFunding(
  request: FundRequest,
): Promise<FundResult> {
  const config = loadAgentConfig();
  if (config.cluster !== "devnet") {
    throw new Error("Only devnet is supported.");
  }

  const connection = createSolanaConnection(config.solanaRpcUrl);
  const { operatorSigner, agentRecipient } = loadFundingWallets(config);
  const usdcMint = parsePublicKey(DEVNET_USDC_MINT, "USDC mint");
  const whirlpoolAddress = parsePublicKey(
    DEVNET_SOL_USDC_WHIRLPOOL,
    "Orca devnet SOL/USDC whirlpool",
  );

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

  const orcaWallet = new AnchorWallet(operatorSigner);
  const orcaContext = WhirlpoolContext.from(
    connection,
    orcaWallet,
    ORCA_WHIRLPOOL_PROGRAM_ID,
  );
  const whirlpoolClient = buildWhirlpoolClient(orcaContext);

  const whirlpool = await whirlpoolClient.getPool(whirlpoolAddress);
  const purchaseQuote = await swapQuoteByOutputToken(
    whirlpool,
    usdcMint,
    new BN(purchaseTargetAtomicAmount.toString()),
    Percentage.fromFraction(request.slippageBps, 10_000),
    ORCA_WHIRLPOOL_PROGRAM_ID,
    orcaContext.fetcher,
    undefined,
    UseFallbackTickArray.Never,
  );

  const balanceLamports = await connection.getBalance(operatorSigner.publicKey);
  if (
    BigInt(balanceLamports) <
    bigintFromBn(purchaseQuote.estimatedAmountIn) +
      config.minSolFeeReserveLamports
  ) {
    throw new Error("Insufficient SOL for purchase plus fee reserve.");
  }

  let purchaseSignature: string;
  try {
    const purchaseTx = await whirlpool.swap(
      purchaseQuote,
      operatorSigner.publicKey,
    );
    purchaseSignature = await purchaseTx.buildAndExecute();
  } catch (error) {
    formatFundingError("Failed swap transaction", error);
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
      USDC_DECIMALS,
    );
  } catch (error) {
    formatFundingError("Failed SPL token transfer", error);
  }

  return {
    requestedUsdcAtomicAmount: request.requestedUsdcAtomicAmount,
    purchasedUsdcAtomicAmount: bigintFromBn(purchaseQuote.estimatedAmountOut),
    transferredUsdcAtomicAmount: request.requestedUsdcAtomicAmount,
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
