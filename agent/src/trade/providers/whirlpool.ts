import { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  UseFallbackTickArray,
  buildWhirlpoolClient,
  WhirlpoolContext,
  swapQuoteByInputToken,
  swapQuoteByOutputToken,
} from "@orca-so/whirlpools-sdk";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

import type { AgentConfig } from "../../config";
import {
  buildExplorerTxUrl,
  createSolanaConnection,
  parsePublicKey,
} from "../../shared";
import type {
  ExecutedSwap,
  SwapExecutionRequest,
  SwapProvider,
  SwapQuote,
  SwapQuoteRequest,
} from "./swap-provider";

const SOL_USDC_TICK_SPACING = 64;

function bigintFromBn(value: BN): bigint {
  return BigInt(value.toString(10));
}

function getSolUsdcWhirlpoolAddress(
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

type WhirlpoolRawQuote = Awaited<ReturnType<typeof swapQuoteByInputToken>>;

export class WhirlpoolSwapProvider implements SwapProvider {
  readonly name = "whirlpool" as const;

  constructor(private readonly config: AgentConfig) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const connection = createSolanaConnection(this.config.solanaRpcUrl);
    // Provider must support quoting without signing; use a throwaway wallet.
    const dummyKeypair = (await import("@solana/web3.js")).Keypair.generate();
    const orcaWallet = new AnchorWallet(dummyKeypair);
    const orcaContext = WhirlpoolContext.from(
      connection,
      orcaWallet,
      ORCA_WHIRLPOOL_PROGRAM_ID,
    );
    const whirlpoolClient = buildWhirlpoolClient(orcaContext);

    const whirlpoolAddress = getSolUsdcWhirlpoolAddress(
      this.config.whirlpoolsConfig,
      this.config.solMint,
      this.config.usdcMint,
    );
    const whirlpool = await whirlpoolClient.getPool(whirlpoolAddress);

    const slippage = Percentage.fromFraction(request.slippageBps, 10_000);
    const amount = new BN(request.amountAtomic.toString());

    const rawQuote: WhirlpoolRawQuote =
      request.swapMode === "ExactIn"
        ? await swapQuoteByInputToken(
            whirlpool,
            parsePublicKey(request.inputMint, "input mint"),
            amount,
            slippage,
            ORCA_WHIRLPOOL_PROGRAM_ID,
            orcaContext.fetcher,
            undefined,
            UseFallbackTickArray.Never,
          )
        : await swapQuoteByOutputToken(
            whirlpool,
            parsePublicKey(request.outputMint, "output mint"),
            amount,
            slippage,
            ORCA_WHIRLPOOL_PROGRAM_ID,
            orcaContext.fetcher,
            undefined,
            UseFallbackTickArray.Never,
          );

    return {
      request,
      inputAmountAtomic: bigintFromBn(rawQuote.estimatedAmountIn),
      outputAmountAtomic: bigintFromBn(rawQuote.estimatedAmountOut),
      rawQuote,
    };
  }

  async executeSwap(request: SwapExecutionRequest): Promise<ExecutedSwap> {
    const connection = createSolanaConnection(this.config.solanaRpcUrl);
    const orcaWallet = new AnchorWallet(request.signer);
    const orcaContext = WhirlpoolContext.from(
      connection,
      orcaWallet,
      ORCA_WHIRLPOOL_PROGRAM_ID,
    );
    const whirlpoolClient = buildWhirlpoolClient(orcaContext);

    const whirlpoolAddress = getSolUsdcWhirlpoolAddress(
      this.config.whirlpoolsConfig,
      this.config.solMint,
      this.config.usdcMint,
    );
    const whirlpool = await whirlpoolClient.getPool(whirlpoolAddress);

    const rawQuote = request.quote.rawQuote as WhirlpoolRawQuote;
    const swapTx = await whirlpool.swap(rawQuote, request.signer.publicKey);
    const signature = await swapTx.buildAndExecute();

    return {
      signature,
      explorerUrl: buildExplorerTxUrl(signature, this.config.cluster),
      inputAmountAtomic: request.quote.inputAmountAtomic,
      outputAmountAtomic: request.quote.outputAmountAtomic,
    };
  }
}
