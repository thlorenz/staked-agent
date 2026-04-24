export function getClientConfig(): {
  rpcUrl: string;
  teeUrl: string;
  teeWsUrl: string;
  routerUrl: string;
  routerWsUrl: string;
  cluster: string;
  mint: string;
} {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
  const teeUrl = process.env.NEXT_PUBLIC_MAGICBLOCK_TEE_URL?.trim();
  const teeWsUrl = process.env.NEXT_PUBLIC_MAGICBLOCK_TEE_WS_URL?.trim();
  const routerUrl = process.env.NEXT_PUBLIC_MAGICBLOCK_ROUTER_URL?.trim();
  const routerWsUrl = process.env.NEXT_PUBLIC_MAGICBLOCK_ROUTER_WS_URL?.trim();
  const cluster = process.env.NEXT_PUBLIC_CLUSTER?.trim();
  const mint = process.env.NEXT_PUBLIC_USDC_MINT?.trim();

  if (!rpcUrl) {
    if (typeof window === "undefined") {
      return {
        rpcUrl: "https://api.devnet.solana.com",
        teeUrl: "https://devnet-tee.magicblock.app",
        teeWsUrl: "wss://tee.magicblock.app",
        routerUrl: "https://devnet-router.magicblock.app",
        routerWsUrl: "wss://devnet-router.magicblock.app",
        cluster: "devnet",
        mint: "6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW",
      };
    }
    throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC_URL");
  }

  if (!cluster) {
    if (typeof window === "undefined") {
      return {
        rpcUrl,
        teeUrl: teeUrl || "https://devnet-tee.magicblock.app",
        teeWsUrl: teeWsUrl || "wss://tee.magicblock.app",
        routerUrl: routerUrl || "https://devnet-router.magicblock.app",
        routerWsUrl: routerWsUrl || "wss://devnet-router.magicblock.app",
        cluster: "devnet",
        mint: mint || "6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW",
      };
    }
    throw new Error("Missing NEXT_PUBLIC_CLUSTER");
  }

  if (!mint) {
    if (typeof window === "undefined") {
      return {
        rpcUrl,
        teeUrl: teeUrl || "https://devnet-tee.magicblock.app",
        teeWsUrl: teeWsUrl || "wss://tee.magicblock.app",
        routerUrl: routerUrl || "https://devnet-router.magicblock.app",
        routerWsUrl: routerWsUrl || "wss://devnet-router.magicblock.app",
        cluster,
        mint: "6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW",
      };
    }
    throw new Error("Missing NEXT_PUBLIC_USDC_MINT");
  }

  return {
    rpcUrl,
    teeUrl: teeUrl || "https://devnet-tee.magicblock.app",
    teeWsUrl: teeWsUrl || "wss://tee.magicblock.app",
    routerUrl: routerUrl || "https://devnet-router.magicblock.app",
    routerWsUrl: routerWsUrl || "wss://devnet-router.magicblock.app",
    cluster,
    mint,
  };
}
