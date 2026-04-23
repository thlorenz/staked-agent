import type { ReactNode } from "react";

import "./globals.css";

import { WalletAppProvider } from "@/src/components/providers/wallet-provider";

export default function RootLayout({
  children
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
