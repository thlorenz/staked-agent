import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import {
  createSolanaConnection,
  loadKeypairFromFile
} from "@/src/server/solana";
import type { BalanceResponse } from "@/src/server/types";

export async function GET(): Promise<Response> {
  try {
    const config = loadConfig();
    const sender = loadKeypairFromFile(config.senderKeypairPath);
    const connection = createSolanaConnection(config.solanaRpcUrl);
    const solBalanceLamports = await connection.getBalance(
      sender.publicKey,
      "confirmed"
    );

    const response: BalanceResponse = {
      ok: true,
      wallet: sender.publicKey.toBase58(),
      solBalanceLamports
    };

    return jsonOk(response);
  } catch (error) {
    return jsonError(
      500,
      "Unable to fetch wallet balance",
      error instanceof Error ? error.message : String(error)
    );
  }
}
