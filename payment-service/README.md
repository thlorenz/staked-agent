# payment-service

`payment-service` is being migrated from an Express-only sample to a single Next.js app that will host both the existing server-side payment route and the new browser wallet-signing flow.

## Commands

- `yarn install`
- `yarn build`
- `yarn dev`
- `yarn start`
- `make run`
- `make health`
- `make balance`
- `make browser-pay`

## Configuration

Copy `.env.local.example` to `.env.local` for Next.js development with `yarn dev`, or copy `.env.example` to `.env` if you want a generic file-based config. The sample targets Solana devnet by default.

These environment variables control Solana RPC and MagicBlock endpoints:

- `SOLANA_RPC_URL`
- `MAGICBLOCK_PAYMENTS_URL`
- `MAGICBLOCK_TEE_URL`
- `MAGICBLOCK_TEE_WS_URL`
- `MAGICBLOCK_TEE_CHALLENGE_PATH`
- `MAGICBLOCK_TEE_AUTH_PATH`
- `AGENT_DESTINATION_PUBKEY`
- `SQLITE_DB_PATH`

The sample is configured for devnet by default. The TEE auth flow uses MagicBlock's current `/auth/challenge` and `/auth/login` endpoints. Public transfers do not require that auth path in this sample.

The default local keypair path is `../keypairs/01.json`.
The fixed browser stake destination defaults to `AhJJkA2WBFPKpRjL5JnHZiTkNYDRWhr13cpTRMHDzZNA` when `AGENT_DESTINATION_PUBKEY` is unset.

Keep real keypairs out of git.

The service expects a Solana CLI-style keypair file:

```json
[12,34,56,...]
```

## Stake persistence

Public browser stakes are recorded only after the server confirms the on-chain transaction and verifies the submitted details against the confirmed result.

This persistence currently applies only to the public payment staking flow. Private payments are not recorded by this feature.

The default SQLite database path is `./src/db/staked-agent.sqlite`.

Recorded fields:

- `signature`
- `staker_pubkey`
- `agent_pubkey`
- `amount`
- `slot`
- `block_time`
- `staked_at`

This version does not add automated tests for the SQLite persistence or on-chain verification path.

## Endpoints

- `GET /api/health`
- `GET /api/balance`
- `POST /api/pay`
- `POST /api/remote/build-payment`
- `POST /api/remote/tee/challenge`
- `POST /api/remote/tee/auth`
- `POST /api/remote/submit`

## Browser UI

The app now exposes a browser UI at `/`.

Phantom is the primary tested wallet via the Solana wallet adapter stack.

The browser stake flow is:

- connect Phantom
- review the fixed configured destination shown in the form
- choose `public` or `private` in the privacy toggle
- enter the amount to stake
- if `private`, request a MagicBlock private-payment challenge and let the wallet sign it
- let the server build the unsigned transaction
- let the wallet sign the transaction
- submit the signed public transaction through the server for verification and persistence before success is shown
- open the Solana Explorer transaction link shown after a successful submission

The current browser UI defaults to `public`, but can switch to `private` when needed. Destination is readonly in the form, memo entry is not part of this flow, and successful submissions show a `Stake transaction` Solana Explorer link.

The preserved built-in-keypair test path is:

- `POST /api/pay`

`POST /api/remote/build-payment` returns an unsigned transaction for the connected wallet to sign in the browser flow.
`POST /api/remote/tee/challenge` and `POST /api/remote/tee/auth` exist so the browser flow can keep using MagicBlock private payments.
`POST /api/remote/submit` is an optional relay endpoint for a fully signed transaction.

For `POST /api/pay`, the sample defaults:

- `mint` to `USDC_MINT`
- `cluster` to `CLUSTER`
- `privacy` to `public`

The default cluster is `devnet`, and Solana RPC plus MagicBlock endpoints can be overridden via env vars. The server signs with the local JSON keypair at `../keypairs/01.json` for this preserved custodial test route.

Example request:

```sh
curl -X POST http://localhost:3000/api/pay \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "DESTINATION_PUBKEY",
    "amount": 1000,
    "privacy": "private"
  }'
```

## Quickstart

```sh
cp .env.local.example .env.local
# place a real Solana CLI-style keypair at ../keypairs/01.json
yarn install
yarn dev
curl http://localhost:3000/api/health
curl http://localhost:3000/api/balance
curl -X POST http://localhost:3000/api/pay \
  -H 'Content-Type: application/json' \
  -d '{"to":"DESTINATION_PUBKEY","amount":1000,"privacy":"private"}'
make browser-pay
```

`.env.local.example` mirrors the `Makefile` defaults used by `make run`, including `NEXT_PUBLIC_SOLANA_RPC_URL` and `NEXT_PUBLIC_CLUSTER`, so plain `yarn dev` gets the same baseline environment.

`make run` uses devnet-oriented defaults, while still letting already-exported environment variables override those values. `NEXT_PUBLIC_SOLANA_RPC_URL` and `NEXT_PUBLIC_CLUSTER` are set from the same server defaults so the future browser wallet flow can use the same environment.

`yarn dev` runs the Next.js app in development mode, and `yarn start` runs the production build.

Additional Make targets:

- `make pay` calls the preserved custodial `POST /api/pay` route
- `make remote-build` calls the unsigned remote build route
- `make browser-pay` prints the browser UI URL

## Shared code

The custodial route and the browser-signing flow share:

- request validation and normalization
- MagicBlock transfer build requests
- private-payment helpers
- Solana transaction decoding helpers

The main difference is who signs:

- `/api/pay` uses the built-in keypair on the server
- the browser flow uses the connected wallet in Phantom

## Stakers leaderboard

- `GET /api/stakers` returns anonymous staker rows only and never exposes real pubkeys.
- `/stakers` renders the leaderboard page.
- Each row shows the total recorded amount and the stake count for that staker.
- Stake count is derived from the number of persisted verified public stake rows for that staker.

## Database init

- `make init-stakers-db` creates the SQLite database file if needed and applies the stakers table schema.
- `make reset-stakers-db` deletes the SQLite database file and recreates an empty schema.
- `make run` now runs that initialization step before starting the Next.js server.

## Known limitations

- The sample is custodial.
- The migration to a single Next.js app is in progress.
- The default target environment is devnet.
- The TEE auth endpoint paths are placeholders pending confirmation.
- TEE attestation is intentionally not implemented.
- Split payments and delayed scheduling are not implemented.
- Only public browser staking is persisted in this version.
