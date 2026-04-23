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

Copy `.env.example` to `.env` if you want file-based configuration. The sample targets Solana devnet by default.

These environment variables control Solana RPC and MagicBlock endpoints:

- `SOLANA_RPC_URL`
- `MAGICBLOCK_PAYMENTS_URL`
- `MAGICBLOCK_TEE_URL`
- `MAGICBLOCK_TEE_WS_URL`
- `MAGICBLOCK_TEE_CHALLENGE_PATH`
- `MAGICBLOCK_TEE_AUTH_PATH`

The sample is configured for devnet by default. The TEE auth endpoint paths are env-configurable placeholders until they are validated against a live MagicBlock integration. Public transfers do not require that auth path in this sample.

The default local keypair path is `./keypairs/01.json`.

Keep real keypairs out of git.

The service expects a Solana CLI-style keypair file:

```json
[12,34,56,...]
```

## Endpoints

- `GET /api/health`
- `GET /api/balance`
- `POST /api/pay`

The preserved built-in-keypair test path is:

- `POST /api/pay`

Remote-signing routes will be added in later steps:

- `POST /api/remote/build-payment`
- `POST /api/remote/tee/challenge`
- `POST /api/remote/tee/auth`

For `POST /api/pay`, the sample defaults:

- `mint` to `USDC_MINT`
- `cluster` to `CLUSTER`
- `privacy` to `private`

The default cluster is `devnet`, and Solana RPC plus MagicBlock endpoints can be overridden via env vars. The server signs with the local JSON keypair at `./keypairs/01.json` for this preserved custodial test route.

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
cp .env.example .env
mkdir -p keypairs
# place a real Solana CLI-style keypair at ./keypairs/01.json
yarn install
make run
curl http://localhost:3000/api/health
curl http://localhost:3000/api/balance
curl -X POST http://localhost:3000/api/pay \
  -H 'Content-Type: application/json' \
  -d '{"to":"DESTINATION_PUBKEY","amount":1000,"privacy":"private"}'
make browser-pay
```

`make run` uses devnet-oriented defaults, while still letting already-exported environment variables override those values. `NEXT_PUBLIC_SOLANA_RPC_URL` and `NEXT_PUBLIC_CLUSTER` are set from the same server defaults so the future browser wallet flow can use the same environment.

`yarn dev` runs the Next.js app in development mode, and `yarn start` runs the production build.

## Known limitations

- The sample is custodial.
- The migration to a single Next.js app is in progress.
- The default target environment is devnet.
- The TEE auth endpoint paths are placeholders pending confirmation.
- TEE attestation is intentionally not implemented.
- Split payments and delayed scheduling are not implemented.
