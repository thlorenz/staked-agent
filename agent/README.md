# agent

## purpose

`agent` is a standalone TypeScript CLI package for gathering historical SOL price data, executing devnet USDC/native-SOL trades, and funding the agent wallet on devnet.

## installation

```sh
cd agent && yarn install
```

## required environment

- `SOLANA_RPC_URL`
- `AGENT_KEYPAIR_PATH` with fallback to `SENDER_KEYPAIR_PATH`
- `USDC_MINT`
- `CLUSTER=devnet`
- `SOLANA_CLI_CONFIG_PATH` with fallback to `~/.config/solana/cli/config.yml`
- `OPERATOR_KEYPAIR_PATH` optional explicit override for the funding operator wallet
- `AGENT_FUNDING_KEYPAIR_PATH` with fallback to `../keypairs/agent.json`
- `AGENT_FUNDING_MULTIPLIER` with fallback to `2`

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

## examples

```sh
cd agent
yarn install
yarn gather -- 3600
yarn trade -- +0.001
```

## trade semantics

- `+0.001` means spend exactly `0.001 USDC` to buy native `SOL`
- `-0.002` means sell enough native `SOL` to receive `0.002 USDC`
- all trading is devnet-only in this version

## funding flow

- `yarn fund -- 0.01` parses a requested USDC amount, buys `2x` that amount of devnet USDC on Orca, and transfers the requested amount into `./keypairs/agent.json`
- the command uses the operator wallet from the local Solana CLI config unless `OPERATOR_KEYPAIR_PATH` is set
- it creates the operator and agent USDC ATAs on devnet if they do not exist
- it uses the operator wallet's SOL to buy devnet USDC before the transfer step
- it transfers exactly the requested USDC amount into the agent wallet

## funding notes

- the local Solana CLI config must exist at `SOLANA_CLI_CONFIG_PATH` and include `keypair_path`
- the default destination keypair path is `../keypairs/agent.json` from within `agent/`
- the funding mint is Orca's devnet `devUSDC` mint `BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k`
- the buy step uses the Orca devnet SOL/USDC Whirlpool `3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt`
- funding remains devnet-only in this version

## limitations

- no strategy engine yet
- direct manual CLI usage only
- external provider availability affects gather/trade behavior
