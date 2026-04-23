"use client";

import type { ReactNode } from "react";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import "@solana/wallet-adapter-react-ui/styles.css";

import { getClientConfig } from "@/src/lib/client-config";

export function WalletAppProvider({
  children
}: {
  children: ReactNode;
}) {
  const { rpcUrl } = getClientConfig();
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
