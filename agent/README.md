# agent

## purpose

`agent` is a standalone TypeScript CLI package for gathering historical SOL price data and executing devnet USDC/native-SOL trades.

## installation

```sh
cd agent && yarn install
```

## required environment

- `SOLANA_RPC_URL`
- `AGENT_KEYPAIR_PATH` with fallback to `SENDER_KEYPAIR_PATH`
- `USDC_MINT`
- `CLUSTER=devnet`

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
esr bin/gather.ts 3600
esr bin/trade.ts +0.001
esr bin/trade.ts -0.002
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

## limitations

- no strategy engine yet
- direct manual CLI usage only
- external provider availability affects gather/trade behavior
