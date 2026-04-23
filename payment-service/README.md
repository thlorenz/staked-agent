# payment-service

`payment-service` is a small custodial demo that shows how a Node.js service can build and sign MagicBlock-backed payment transactions on Solana devnet.

## Commands

- `yarn install`
- `yarn build`
- `yarn dev`
- `yarn start`
- `make run`
- `make health`
- `make balance`

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

- `GET /health`
- `GET /balance`
