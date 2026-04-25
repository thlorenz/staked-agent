# Step 9: Devnet Live Quote Investigation - Findings

## Executive Summary

The trade command **only supports mainnet** for live trading. Devnet quote requests fail with `TOKEN_NOT_TRADABLE` error because Jupiter API aggregates liquidity across Solana DEXs, and devnet has **no real trading activity or liquidity pools**.

## Exact Failure Modes Captured

### Buy Trade on Devnet (+0.0001 SOL)

**Request:**
- URL: `https://api.jup.ag/swap/v1/quote?inputMint=BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k&outputMint=So11111111111111111111111111111111111111112&amount=100000&swapMode=ExactOut&slippageBps=50`
- Input Mint: `BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k` (devnet USDC)
- Output Mint: `So11111111111111111111111111111111111111112` (SOL)
- Amount: `100000` (0.0001 SOL in atomic units)
- Swap Mode: `ExactOut`

**Response:**
```
HTTP 400
{"error":"The token BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k is not tradable","errorCode":"TOKEN_NOT_TRADABLE"}
```

### Sell Trade on Devnet (-0.0001 SOL)

**Request:**
- URL: `https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k&amount=100000&swapMode=ExactIn&slippageBps=50`
- Input Mint: `So11111111111111111111111111111111111111112` (SOL)
- Output Mint: `BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k` (devnet USDC)
- Amount: `100000` (0.0001 SOL in atomic units)
- Swap Mode: `ExactIn`

**Response:**
```
HTTP 400
{"error":"The token BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k is not tradable","errorCode":"TOKEN_NOT_TRADABLE"}
```

### Mainnet Comparison (Control)

**Buy Trade on Mainnet (+0.0001 SOL):** Works (balance error expected)
- No `TOKEN_NOT_TRADABLE` error
- Quote request succeeds, but trade fails due to insufficient USDC balance (expected for test wallet)
- Error message: `Insufficient USDC balance: quote requires 8639 USDC.`

## Root Cause Analysis

From Jupiter documentation (Cobo Agentic Wallet):
> "SOL_DEVNET: same program ID and API; no real liquidity — use for tx-flow testing only"
> "SOL_DEVNET — no liquidity: Most pairs return "no route" on Devnet; expected behavior."

**Key findings:**
1. Jupiter API uses **identical endpoint** for both devnet and mainnet: `https://api.jup.ag/swap/v1`
2. Jupiter aggregates liquidity from all Solana DEXs (Orca, Raydium, etc.)
3. Devnet has **no real liquidity pools** or trading activity
4. The devnet USDC mint exists but is **not part of any tradable pair** on Jupiter's aggregation

## Configuration Change Required

**Decision: Document devnet limitation in README**

The improved diagnostics from Step 6 successfully identified the exact issue. Rather than adding complex mock quote infrastructure or conditional devnet logic, the solution is to **document that trade command requires mainnet**.

### Changes Made

Updated `agent/README.md`:
- Clarified that trade command supports **mainnet trading only** via live Jupiter quotes
- Added explicit devnet limitation note explaining the `TOKEN_NOT_TRADABLE` error
- Removed devnet example from the "examples" section
- Kept mainnet examples as the primary working use case

## Diagnostic Output Quality

The improved error messages from Step 6 were **excellent for debugging**:
- HTTP status code (400) immediately visible
- Request URL shows exact parameters sent
- Input/output mints are explicit
- Amount and swap mode are clearly shown
- Full response body with error code and message provided

This made root cause identification immediate without requiring manual API testing.

## Next Steps (Step 10)

Step 10 should focus on the final integration step: running end-to-end mainnet trade command validation to ensure the complete flow works as expected.
