"use client";

import { FormEvent, useState } from "react";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

import type { PrivacyMode } from "@/src/server/types";

export function PaymentForm() {
  const { publicKey } = useWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("1000");
  const [memo, setMemo] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyMode>("private");
  const [result, setResult] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult("Remote signing flow not implemented yet");
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">MagicBlock payment demo</p>
        <h1>Wallet signing sample</h1>
        <p className="lede">
          Connect Phantom, enter a payment, and use the browser signing flow.
        </p>
        <div className="wallet-row">
          <WalletMultiButton />
          <span className="wallet-state">
            {publicKey ? publicKey.toBase58() : "No wallet connected"}
          </span>
        </div>
      </section>

      <section className="panel">
        <form className="payment-form" onSubmit={handleSubmit}>
          <label>
            Destination
            <input
              name="destination"
              type="text"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Destination pubkey"
            />
          </label>

          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label>
            Memo
            <input
              name="memo"
              type="text"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="Optional memo"
            />
          </label>

          <label>
            Privacy
            <select
              name="privacy"
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as PrivacyMode)}
            >
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </label>

          <button type="submit" disabled={!publicKey}>
            Build and sign payment
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Result</h2>
        <div className="result-box">
          {result ?? "Connect a wallet to begin the remote signing flow."}
        </div>
      </section>
    </main>
  );
}
