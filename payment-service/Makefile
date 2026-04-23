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

.PHONY: run build health balance

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
	yarn dev

build:
	yarn build

health:
	curl -sS http://localhost:3000/health

balance:
	curl -sS http://localhost:3000/balance
