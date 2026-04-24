PORT ?= 3000
SOLANA_RPC_URL ?= https://api.devnet.solana.com
MAGICBLOCK_PAYMENTS_URL ?= https://payments.magicblock.app
MAGICBLOCK_TEE_URL ?= https://devnet-tee.magicblock.app
MAGICBLOCK_TEE_WS_URL ?= wss://tee.magicblock.app
MAGICBLOCK_TEE_CHALLENGE_PATH ?= /auth/challenge
MAGICBLOCK_TEE_AUTH_PATH ?= /auth/login
CLUSTER ?= devnet
USDC_MINT ?= 6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW
VALIDATOR ?= MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
SENDER_KEYPAIR_PATH ?= ./keypairs/01.json
VERIFY_TEE ?= false
SQLITE_DB_PATH ?= ./src/db/staked-agent.sqlite

.DEFAULT_GOAL := help

.PHONY: help run init-stakers-db reset-stakers-db build health balance pay remote-build browser-pay

help:
	@printf 'Available tasks:\n'
	@awk 'BEGIN { split("", tasks) } \
		/^\.PHONY:/ { for (i = 2; i <= NF; i++) tasks[$$i] = 1 } \
		END { for (task in tasks) print "  " task }' Makefile | sort

run: init-stakers-db

init-stakers-db:
	SQLITE_DB_PATH=$(SQLITE_DB_PATH) node ./scripts/init-stakers-db.cjs

reset-stakers-db:
	rm -f "$(SQLITE_DB_PATH)" "$(SQLITE_DB_PATH)-wal" "$(SQLITE_DB_PATH)-shm"
	$(MAKE) init-stakers-db SQLITE_DB_PATH=$(SQLITE_DB_PATH)

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
	SQLITE_DB_PATH=$(SQLITE_DB_PATH) \
	USDC_MINT=$(USDC_MINT) \
	VALIDATOR="$(VALIDATOR)" \
	NEXT_PUBLIC_SOLANA_RPC_URL=$(SOLANA_RPC_URL) \
	NEXT_PUBLIC_MAGICBLOCK_TEE_URL=$(MAGICBLOCK_TEE_URL) \
	NEXT_PUBLIC_MAGICBLOCK_TEE_WS_URL=$(MAGICBLOCK_TEE_WS_URL) \
	NEXT_PUBLIC_MAGICBLOCK_ROUTER_URL=https://devnet-router.magicblock.app \
	NEXT_PUBLIC_MAGICBLOCK_ROUTER_WS_URL=wss://devnet-router.magicblock.app \
	NEXT_PUBLIC_CLUSTER=$(CLUSTER) \
	NEXT_PUBLIC_USDC_MINT=$(USDC_MINT) \
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
