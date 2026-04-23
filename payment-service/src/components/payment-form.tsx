"use client";

import { Buffer } from "buffer";
import bs58 from "bs58";
import { FormEvent, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
  buildRemotePaymentRequest,
  completeRemoteTeeAuth,
  deserializeBuiltTransaction,
  fetchRemoteTeeChallenge,
  submitSignedTransaction
} from "@/src/lib/remote-payment-client";
import type { PrivacyMode } from "@/src/server/types";

function parseChallengeBytes(challenge: string): Uint8Array {
  try {
    return Uint8Array.from(Buffer.from(challenge, "base64"));
  } catch {
    return new TextEncoder().encode(challenge);
  }
}

export function PaymentForm() {
  const { connection } = useConnection();
  const { publicKey, signMessage, signTransaction } = useWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("1000");
  const [memo, setMemo] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyMode>("private");
  const [status, setStatus] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [buildSummary, setBuildSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!publicKey || !signTransaction) {
      setStatus("Connect a wallet that supports transaction signing.");
      return;
    }

    const parsedAmount = Number.parseInt(amount, 10);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setStatus("Amount must be a positive integer.");
      return;
    }

    setIsSubmitting(true);
    setSignature(null);
    setBuildSummary(null);

    try {
      const sender = publicKey.toBase58();
      let teeAuthToken: string | undefined;

      if (privacy === "private") {
        if (!signMessage) {
          throw new Error(
            "This wallet does not support private auth signing."
          );
        }

        setStatus("Requesting MagicBlock private-payment challenge...");
        const challenge = await fetchRemoteTeeChallenge(sender);
        const signedChallenge = await signMessage(parseChallengeBytes(challenge));
        teeAuthToken = await completeRemoteTeeAuth({
          publicKey: sender,
          challenge,
          signature: bs58.encode(signedChallenge)
        });
      }

      setStatus("Building unsigned transaction...");
      const remoteBuild = await buildRemotePaymentRequest({
        from: sender,
        to: destination,
        amount: parsedAmount,
        memo: memo || undefined,
        privacy,
        teeAuthToken
      });

      setBuildSummary(
        `kind=${remoteBuild.build.kind} privacy=${remoteBuild.privacy} destination=${remoteBuild.destination}`
      );

      setStatus("Signing transaction with wallet...");
      const transaction = deserializeBuiltTransaction(
        remoteBuild.build.transactionBase64
      );
      const signedTransaction = await signTransaction(transaction);

      setStatus("Submitting signed transaction...");
      const txSignature = await submitSignedTransaction(
        connection,
        signedTransaction
      );

      setSignature(txSignature);
      setStatus("Payment submitted and confirmed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
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

          <button type="submit" disabled={!publicKey || isSubmitting}>
            Build and sign payment
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Result</h2>
        <div className="result-box">
          <p>{status ?? "Connect a wallet to begin the remote signing flow."}</p>
          {buildSummary ? <p>{buildSummary}</p> : null}
          {signature ? <p>Signature: {signature}</p> : null}
        </div>
      </section>
    </main>
  );
}
