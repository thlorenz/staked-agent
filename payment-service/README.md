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

## Current endpoints

- `GET /api/health`

The Next.js migration shell is in place first. The following routes will be restored in later steps:

- `GET /api/balance`
- `POST /api/pay`
- `POST /api/remote/build-payment`
- `POST /api/remote/tee/challenge`
- `POST /api/remote/tee/auth`

`make run` remains the primary local entrypoint.

## Quickstart

```sh
cp .env.example .env
mkdir -p keypairs
# place a real Solana CLI-style keypair at ./keypairs/01.json
yarn install
make run
curl http://localhost:3000/api/health
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
