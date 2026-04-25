import fs from "node:fs";
import path from "node:path";

import type { Keypair } from "@solana/web3.js";
import { parse as parseYaml } from "yaml";

import type { AgentConfig } from "../config";
import { loadKeypairFromFile } from "./solana";

export type SolanaCliConfig = {
  keypairPath: string;
};

function expandHome(filePath: string): string {
  if (!filePath.startsWith("~")) {
    return filePath;
  }

  const homeDirectory = process.env.HOME ?? process.env.USERPROFILE;
  if (homeDirectory === undefined || homeDirectory.length === 0) {
    throw new Error("Unable to resolve home directory for Solana CLI config.");
  }

  return path.join(homeDirectory, filePath.slice(2));
}

export function loadSolanaCliConfig(filePath: string): SolanaCliConfig {
  const resolvedPath = path.resolve(expandHome(filePath));
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(
      `Missing or malformed Solana CLI config at ${resolvedPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(fileContents);
  } catch (error) {
    throw new Error(
      `Missing or malformed Solana CLI config at ${resolvedPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("keypair_path" in parsed) ||
    typeof (parsed as { keypair_path?: unknown }).keypair_path !== "string"
  ) {
    throw new Error(
      `Missing or malformed Solana CLI config at ${resolvedPath}: keypair_path is missing.`,
    );
  }

  const rawKeypairPath = (parsed as { keypair_path: string }).keypair_path;
  const expandedKeypairPath = expandHome(rawKeypairPath);
  const keypairPath = path.isAbsolute(expandedKeypairPath)
    ? expandedKeypairPath
    : path.resolve(path.dirname(resolvedPath), expandedKeypairPath);

  return { keypairPath };
}

export function loadFundingWallets(config: AgentConfig): {
  operatorSigner: Keypair;
  operatorKeypairPath: string;
  agentRecipient: Keypair;
  agentFundingKeypairPath: string;
} {
  const operatorKeypairPath =
    config.operatorKeypairPathOverride ??
    loadSolanaCliConfig(config.operatorSolanaCliConfigPath).keypairPath;
  const resolvedOperatorKeypairPath = path.resolve(operatorKeypairPath);

  let operatorSigner: Keypair;
  try {
    operatorSigner = loadKeypairFromFile(resolvedOperatorKeypairPath);
  } catch (error) {
    throw new Error(
      `Unable to read operator keypair at ${resolvedOperatorKeypairPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const defaultAgentFundingKeypairPath = "../keypairs/agent.json";
  const resolvedAgentFundingKeypairPath = path.resolve(
    config.agentFundingKeypairPath,
  );
  if (
    config.agentFundingKeypairPath === defaultAgentFundingKeypairPath &&
    resolvedAgentFundingKeypairPath !==
      path.resolve(defaultAgentFundingKeypairPath)
  ) {
    throw new Error(
      `Invalid or disallowed destination path ${resolvedAgentFundingKeypairPath}.`,
    );
  }

  let agentRecipient: Keypair;
  try {
    agentRecipient = loadKeypairFromFile(resolvedAgentFundingKeypairPath);
  } catch (error) {
    throw new Error(
      `Unable to read funding destination keypair at ${resolvedAgentFundingKeypairPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return {
    operatorSigner,
    operatorKeypairPath: resolvedOperatorKeypairPath,
    agentRecipient,
    agentFundingKeypairPath: resolvedAgentFundingKeypairPath,
  };
}
