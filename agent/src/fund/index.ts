import { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  UseFallbackTickArray,
  buildWhirlpoolClient,
  WhirlpoolContext,
  swapQuoteByOutputToken,
} from "@orca-so/whirlpools-sdk";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

import { loadAgentConfig } from "../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  parsePublicKey,
  loadKeypairFromFile,
} from "../shared";
import { loadFundingWallets } from "../shared/solana-cli";
import { ensureAssociatedTokenAccount, transferSplTokens } from "../shared/spl";
import { USDC_DECIMALS } from "../shared/tokens";
import type { FundRequest, FundResult } from "./types";

const SOL_USDC_TICK_SPACING = 64;
const SOL_MINT = "So11111111111111111111111111111111111111112";

function bigintFromBn(value: BN): bigint {
  return BigInt(value.toString(10));
}

function getFundingWhirlpoolAddress(
  whirlpoolsConfig: string,
  solMint: string,
  usdcMint: string,
): PublicKey {
  return PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    parsePublicKey(whirlpoolsConfig, "Whirlpools config"),
    parsePublicKey(solMint, "SOL mint"),
    parsePublicKey(usdcMint, "USDC mint"),
    SOL_USDC_TICK_SPACING,
  ).publicKey;
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
  const cluster = config.cluster;

  const connection = createSolanaConnection(config.solanaRpcUrl);
  const { operatorSigner } = loadFundingWallets(config);
  const agentRecipient = loadKeypairFromFile(config.agentKeypairPath);
  const usdcMint = parsePublicKey(config.usdcMint, "USDC mint");
  const whirlpoolAddress = getFundingWhirlpoolAddress(
    config.whirlpoolsConfig,
    SOL_MINT,
    config.usdcMint,
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
    purchaseExplorerUrl: buildExplorerTxUrl(purchaseSignature, cluster),
    transferExplorerUrl: buildExplorerTxUrl(transferSignature, cluster),
  };
}
