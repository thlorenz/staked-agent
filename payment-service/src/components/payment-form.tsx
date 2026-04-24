"use client";

import { FormEvent, useState } from "react";

import { Connection, PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { getClientConfig } from "@/src/lib/client-config";
import { executePrivatePayment } from "@/src/lib/payment/private-payment/execute";
import { executePublicPayment } from "@/src/lib/payment/public-payment/execute";
import { getExplorerUrl } from "@/src/lib/payment/shared/transactions";
import type { PrivacyMode } from "@/src/server/types";

type PaymentFormProps = { agentDestination: string };

function logStakeDebug(label: string, payload: Record<string, unknown>): void {
  console.info(`[stake-debug] ${label}`, payload);
  try {
    console.info(`[stake-debug-json] ${label} ${JSON.stringify(payload)}`);
  } catch {
    // Ignore JSON serialization failures in debug-only logging.
  }
}

export function PaymentForm({ agentDestination }: PaymentFormProps) {
  const { connection } = useConnection();
  const { publicKey, signMessage, signTransaction } = useWallet();
  const [amount, setAmount] = useState("1");
  const [privacy, setPrivacy] = useState<PrivacyMode>("public");
  const [status, setStatus] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [buildSummary, setBuildSummary] = useState<string | null>(null);
  const [submittedPrivacy, setSubmittedPrivacy] = useState<PrivacyMode | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { cluster, mint, teeUrl, teeWsUrl, routerUrl, routerWsUrl } =
    getClientConfig();
  const routerConnection = new Connection(routerUrl, {
    commitment: "confirmed",
    wsEndpoint: routerWsUrl,
  });

  async function getBaseTokenBalance(owner: string): Promise<bigint> {
    const mintPublicKey = new PublicKey(mint);
    const ownerPublicKey = new PublicKey(owner);
    const response = await connection.getTokenAccountsByOwner(ownerPublicKey, {
      mint: mintPublicKey,
    });

    let total = 0n;
    for (const { pubkey } of response.value) {
      const balance = await connection.getTokenAccountBalance(pubkey);
      total += BigInt(balance.value.amount);
    }

    return total;
  }

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
    setSubmittedPrivacy(null);

    try {
      const sender = publicKey.toBase58();

      logStakeDebug("submit-start", {
        sender,
        destination: agentDestination,
        amount: parsedAmount,
        privacy,
        cluster,
        baseRpc: connection.rpcEndpoint,
        routerRpc: routerConnection.rpcEndpoint,
      });

      let txSignature: string;
      if (privacy === "private") {
        if (!signMessage) {
          throw new Error("This wallet does not support private auth signing.");
        }

        txSignature = await executePrivatePayment({
          agentDestination,
          amount: parsedAmount,
          cluster,
          connection,
          routerConnection,
          mint,
          publicKey,
          signMessage,
          signTransaction,
          setStatus,
          setBuildSummary,
          teeUrl,
          teeWsUrl,
          getBaseTokenBalance,
          logDebug: logStakeDebug,
        });
      } else {
        txSignature = await executePublicPayment({
          agentDestination,
          amount: parsedAmount,
          connection,
          routerConnection,
          publicKey,
          signTransaction,
          setStatus,
          setBuildSummary,
          getBaseTokenBalance,
          logDebug: logStakeDebug,
        });
      }

      setSignature(txSignature);
      setSubmittedPrivacy(privacy);
      setStatus("Payment submitted and confirmed.");
    } catch (error) {
      logStakeDebug("submit-final-error", {
        error: error instanceof Error ? error.message : String(error),
      });
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">MagicBlock stake flow</p>
        <h1>Staked Agent</h1>
        <p className="lede">
          Connect Phantom and stake to the configured agent using the browser
          signing flow.
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
              value={agentDestination}
              readOnly
              aria-readonly="true"
              className="readonly-field"
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
            Privacy
            <select
              name="privacy"
              value={privacy}
              onChange={(event) =>
                setPrivacy(event.target.value as PrivacyMode)
              }
              disabled={isSubmitting}
            >
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </label>

          <button type="submit" disabled={!publicKey || isSubmitting}>
            Stake Agent
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Result</h2>
        <div className="result-box">
          <p>
            {status ?? "Connect a wallet to begin the remote signing flow."}
          </p>
          {buildSummary ? <p>{buildSummary}</p> : null}
          {signature ? (
            <p>
              Stake transaction:{" "}
              <a
                href={getExplorerUrl(signature, cluster)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {signature}
              </a>
            </p>
          ) : null}
          {signature && submittedPrivacy === "private" ? (
            <p>
              Private routed transactions are not reliably visible on Solana
              Explorer. Query them via{" "}
              <code>https://devnet-router.magicblock.app</code>.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
