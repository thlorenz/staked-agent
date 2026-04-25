#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$DIR/.."
AGENT_DIR="$REPO_ROOT/agent"
KEYPAIRS_DIR="$REPO_ROOT/keypairs"
DB_DIR="$REPO_ROOT/payment-service/src/db"

cd "$AGENT_DIR"

timeout 180 env \
  CLUSTER=devnet \
  SOLANA_RPC_URL=https://api.devnet.solana.com \
  AGENT_KEYPAIR_PATH="$KEYPAIRS_DIR/01.json" \
  AGENT_STRATEGY_TICK_SECONDS=30 \
  AGENT_STRATEGY_BUY_PERCENT=20 \
  AGENT_STRATEGY_SELL_PERCENT=90 \
  AGENT_STRATEGY="moving-average" \
  AGENT_TRADES_DB_PATH="$DB_DIR/staked-agent.sqlite" \
  yarn strategy
