import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  type Connection,
  type Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export function getAssociatedTokenAddressForWallet(
  owner: PublicKey,
  mint: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

export async function ensureAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const associatedTokenAccount = getAssociatedTokenAddressForWallet(
    owner,
    mint,
  );
  const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
  if (accountInfo !== null) {
    return associatedTokenAccount;
  }

  const transaction = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      associatedTokenAccount,
      owner,
      mint,
    ),
  );
  await sendAndConfirmTransaction(connection, transaction, [payer]);
  return associatedTokenAccount;
}

export async function transferSplTokens(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  sourceAta: PublicKey,
  destinationAta: PublicKey,
  mint: PublicKey,
  amountAtomic: bigint,
  decimals: number,
): Promise<string> {
  const transaction = new Transaction().add(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      owner,
      amountAtomic,
      decimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  return sendAndConfirmTransaction(connection, transaction, [payer]);
}
