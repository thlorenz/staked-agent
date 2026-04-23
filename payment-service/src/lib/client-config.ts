export function getClientConfig(): { rpcUrl: string; cluster: string } {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
  const cluster = process.env.NEXT_PUBLIC_CLUSTER?.trim();

  if (!rpcUrl) {
    if (typeof window === "undefined") {
      return {
        rpcUrl: "https://api.devnet.solana.com",
        cluster: "devnet"
      };
    }
    throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC_URL");
  }

  if (!cluster) {
    if (typeof window === "undefined") {
      return {
        rpcUrl,
        cluster: "devnet"
      };
    }
    throw new Error("Missing NEXT_PUBLIC_CLUSTER");
  }

  return { rpcUrl, cluster };
}
