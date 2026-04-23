PORT ?= 3000
SOLANA_RPC_URL ?= https://api.devnet.solana.com
MAGICBLOCK_PAYMENTS_URL ?= https://payments.magicblock.app
MAGICBLOCK_TEE_URL ?= https://devnet-tee.magicblock.app
MAGICBLOCK_TEE_WS_URL ?= wss://tee.magicblock.app
MAGICBLOCK_TEE_CHALLENGE_PATH ?= /challenge
MAGICBLOCK_TEE_AUTH_PATH ?= /authenticate
CLUSTER ?= devnet
USDC_MINT ?= 6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW
SENDER_KEYPAIR_PATH ?= ./keypairs/01.json
VERIFY_TEE ?= false

.PHONY: run build health balance pay remote-build browser-pay

run:
	PORT=$(PORT) \
	SOLANA_RPC_URL=$(SOLANA_RPC_URL) \
	MAGICBLOCK_PAYMENTS_URL=$(MAGICBLOCK_PAYMENTS_URL) \
	MAGICBLOCK_TEE_URL=$(MAGICBLOCK_TEE_URL) \
	MAGICBLOCK_TEE_WS_URL=$(MAGICBLOCK_TEE_WS_URL) \
	MAGICBLOCK_TEE_CHALLENGE_PATH=$(MAGICBLOCK_TEE_CHALLENGE_PATH) \
	MAGICBLOCK_TEE_AUTH_PATH=$(MAGICBLOCK_TEE_AUTH_PATH) \
	CLUSTER=$(CLUSTER) \
	SENDER_KEYPAIR_PATH=$(SENDER_KEYPAIR_PATH) \
	VERIFY_TEE=$(VERIFY_TEE) \
	USDC_MINT=$(USDC_MINT) \
	VALIDATOR="$(VALIDATOR)" \
	NEXT_PUBLIC_SOLANA_RPC_URL=$(SOLANA_RPC_URL) \
	NEXT_PUBLIC_CLUSTER=$(CLUSTER) \
	yarn dev

build:
	yarn build

health:
	curl -sS http://localhost:3000/api/health

balance:
	curl -sS http://localhost:3000/api/balance

pay:
	curl -sS -X POST http://localhost:3000/api/pay \
		-H 'Content-Type: application/json' \
		-d '{"to":"DESTINATION_PUBKEY","amount":1000,"privacy":"private"}'

remote-build:
	curl -sS -X POST http://localhost:3000/api/remote/build-payment \
		-H 'Content-Type: application/json' \
		-d '{"from":"SENDER_PUBKEY","to":"DESTINATION_PUBKEY","amount":1000,"privacy":"private"}'

browser-pay:
	@printf '%s\n' 'http://localhost:3000'
