# agent

## purpose

`agent` is a standalone TypeScript CLI package for gathering historical SOL price data, executing USDC/native-SOL trades, and funding the agent wallet. It supports both devnet and mainnet clusters.

## installation

```sh
cd agent && yarn install
```

## required environment

- `SOLANA_RPC_URL`
- `AGENT_KEYPAIR_PATH` with fallback to `SENDER_KEYPAIR_PATH`
- `CLUSTER=devnet` or `CLUSTER=mainnet`
- `USDC_MINT` optional override for the cluster default mint
- `SOLANA_CLI_CONFIG_PATH` with fallback to `~/.config/solana/cli/config.yml`
- `OPERATOR_KEYPAIR_PATH` optional explicit override for the funding operator wallet
- `AGENT_FUNDING_KEYPAIR_PATH` with fallback to `../keypairs/agent.json`
- `AGENT_FUNDING_MULTIPLIER` with fallback to `2`
- `WHIRLPOOLS_CONFIG` optional override for the cluster default Whirlpool config

The default keypair path is `../keypairs/01.json` from within the `agent/` package directory.

Optional environment variables:

- `COINGECKO_DEMO_API_KEY`
- `JUPITER_API_KEY`
- `AGENT_SLIPPAGE_BPS`
- `AGENT_MAX_PRIORITY_FEE_LAMPORTS`
- `AGENT_MIN_SOL_FEE_RESERVE_LAMPORTS`

## commands

```sh
yarn gather -- 3600
yarn trade -- +0.001
yarn trade -- -0.002
yarn fund -- 0.01
esr bin/gather.ts 3600
esr bin/trade.ts +0.001
esr bin/trade.ts -0.002
esr bin/fund.ts 0.01
```

## trade semantics

- `+0.001` means buy exactly `0.001 SOL` by selling `USDC`
- `-0.002` means sell exactly `0.002 SOL` for `USDC`
- the command supports `devnet` and `mainnet` according to `CLUSTER` and `SOLANA_RPC_URL`

## examples

Devnet mode (default):

```sh
cd agent
yarn install
CLUSTER=devnet SOLANA_RPC_URL=https://api.devnet.solana.com yarn trade -- +0.0001
CLUSTER=devnet SOLANA_RPC_URL=https://api.devnet.solana.com yarn trade -- -0.0001
```

Mainnet mode:

```sh
cd agent
CLUSTER=mainnet SOLANA_RPC_URL=https://api.mainnet-beta.solana.com yarn trade -- +0.0001
CLUSTER=mainnet SOLANA_RPC_URL=https://api.mainnet-beta.solana.com yarn trade -- -0.0001
```

## funding flow

- `yarn fund -- 0.01` parses a requested USDC amount, buys `2x` that amount on Orca, and transfers the requested amount into `./keypairs/agent.json`
- the command uses the operator wallet from the local Solana CLI config unless `OPERATOR_KEYPAIR_PATH` is set
- it creates the operator and agent USDC ATAs before the buy/transfer flow
- it uses the operator wallet's SOL to buy USDC before the transfer step
- it transfers exactly the requested USDC amount into the agent wallet

## funding notes

- the local Solana CLI config must exist at `SOLANA_CLI_CONFIG_PATH` and include `keypair_path`
- the default destination keypair path is `../keypairs/agent.json` from within `agent/`
- the funding mint defaults to Orca's devnet `devUSDC` mint on devnet and the mainnet USDC mint on mainnet
- the pool selection is cluster-aware: both devnet and mainnet derive the SOL/USDC Whirlpool from Orca config for the active cluster

## limitations

- no strategy engine yet
- direct manual CLI usage only
- external provider availability affects gather/trade behavior
