import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { WalletAppProvider } from "@/src/components/providers/wallet-provider";

export const metadata: Metadata = { title: "Stake Agent" };

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletAppProvider>{children}</WalletAppProvider>
      </body>
    </html>
  );
}
