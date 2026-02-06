# Smart Session + DCA Testing Guide

This guide walks you through creating a Rhinestone smart wallet, granting a trading session, and testing automated DCA execution with real-time intent tracking.

## Prerequisites

1. **Wallet**: MetaMask or any EVM wallet with testnet ETH
2. **Network**: Base Sepolia (testnet) recommended for testing
3. **Frontend running**: `cd frontend && npm run dev`
4. **Backend running**: `cd backend && uvicorn app.main:app --reload`
5. **Convex running**: `cd frontend && npx convex dev`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ StrategyCard    │───▶│ ActivationFlow  │───▶│ SmartSession│ │
│  │ (pending_session)   │ (grant + activate)│   │ Form        │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│            │                     │                     │        │
│            ▼                     ▼                     ▼        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Convex (Real-time Database)                    ││
│  │  smartSessions | dcaStrategies | smartSessionIntents        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Python)                          │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ DCA Scheduler   │───▶│ DCA Executor    │───▶│ Rhinestone  │ │
│  │ (cron job)      │    │ (_execute_swap_  │    │ Provider    │ │
│  │                 │    │  via_intent)     │    │             │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                │                               │
│                                ▼                               │
│                    Writes intent status to Convex              │
│                    (pending → executing → completed)           │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Connect Your Wallet

1. Open the Sherpa app in your browser
2. Click "Connect Wallet" in the header
3. Select your wallet (MetaMask, etc.)
4. Connect on **Base Sepolia** testnet
5. Ensure you have testnet ETH (get from faucet if needed)

## Step 2: Create a DCA Strategy

1. Navigate to the **Strategies** section
2. Click **"New Strategy"** → Select **"DCA"**
3. Configure your DCA:
   - **Name**: "Test DCA Strategy"
   - **From Token**: USDC (or any stablecoin)
   - **To Token**: WETH (or any target token)
   - **Amount**: $10 per execution
   - **Frequency**: Daily (or hourly for faster testing)
   - **Max Slippage**: 1%
4. Click **"Save as Draft"**

The strategy will be created with status `draft` or `pending_session`.

## Step 3: Grant Smart Session

When the strategy is in `pending_session` status, you'll see a **"Grant Smart Session"** button.

### What is a Smart Session?

A Smart Session is an on-chain permission that allows the backend to execute swaps on your behalf without requiring your signature each time. It has:

- **Spending Limit**: Max USD value that can be spent
- **Valid Duration**: How long the permission lasts
- **Allowed Tokens**: Which tokens can be traded
- **Allowed Actions**: What operations are permitted (swap, etc.)

### Granting the Session

1. Click **"Grant Smart Session"** on your strategy card
2. Review the session parameters:
   - Spending limit (auto-calculated from strategy config)
   - Valid for 365 days
   - Allowed tokens: your from/to tokens
   - Allowed action: swap
3. Click **"Grant Session"**
4. **Sign the transaction** in your wallet
   - This deploys a Rhinestone Smart Session on-chain
5. Wait for transaction confirmation (~15 seconds on Base)

Once confirmed, the session is recorded in Convex and linked to your strategy.

## Step 4: Activate the Strategy

After granting the session:

1. The **StrategyActivationFlow** modal will show "Session Granted"
2. Click **"Activate Strategy"**
3. The strategy status changes to `active`
4. The first execution is scheduled based on your frequency

## Step 5: Observe Real-Time Intent Tracking

### In the Activity Widget

1. Navigate to the **Activity** section (or Transaction History Widget)
2. Click the **"Intents"** tab
3. You'll see intent cards showing:
   - **Status**: pending → executing → confirming → completed
   - **Token Flow**: USDC → WETH with amounts
   - **Progress Timeline**: Created → Submitted → Confirmed
   - **Transaction Hash**: Links to block explorer

### Intent Status Flow

```
┌─────────┐    ┌───────────┐    ┌────────────┐    ┌───────────┐
│ pending │───▶│ executing │───▶│ confirming │───▶│ completed │
└─────────┘    └───────────┘    └────────────┘    └───────────┘
     │              │                 │                 │
     │              │                 │                 │
Backend creates  Backend submits   Tx broadcast    Tx confirmed
intent record    to Rhinestone     to chain        on-chain
```

### Real-Time Updates

The UI updates automatically via Convex subscriptions:
- No page refresh needed
- Status changes appear instantly
- Progress bar fills as execution progresses

## Testing Scenarios

### Happy Path (Successful Execution)

1. Create strategy with valid tokens and sufficient balance
2. Grant session
3. Activate strategy
4. Wait for scheduled execution
5. Observe intent: pending → executing → confirming → completed
6. Check block explorer for actual transaction

### Failed Execution

1. Create strategy with insufficient balance
2. Activate strategy
3. Observe intent: pending → executing → failed
4. Check error message in intent card

### Session Limit Exceeded

1. Create strategy with $100/day
2. Grant session with $50 spending limit
3. First execution succeeds
4. Second execution shows: "Smart Session spending limit would be exceeded"

### Manual Trigger (Dev Testing)

For faster testing, you can manually trigger a DCA execution:

```bash
# From backend directory
curl -X POST "http://localhost:8000/internal/dca/execute" \
  -H "Content-Type: application/json" \
  -d '{"strategyId": "YOUR_STRATEGY_ID"}'
```

## Debugging

### Check Strategy Status

```javascript
// In browser console
const { convex } = window.__CONVEX__;
const strategy = await convex.query(api.dca.get, { id: "STRATEGY_ID" });
console.log(strategy);
```

### Check Smart Session

```javascript
const session = await convex.query(api.smartSessions.getBySessionId, {
  sessionId: "SESSION_ID"
});
console.log(session);
```

### Check Intents

```javascript
const intents = await convex.query(api.smartSessionIntents.listBySmartAccount, {
  smartAccountAddress: "0xYOUR_ADDRESS"
});
console.log(intents);
```

### Backend Logs

Watch the backend logs for execution details:
```bash
cd backend && uvicorn app.main:app --reload --log-level debug
```

Look for:
- `"Executing DCA strategy ..."`
- `"Created UI intent record: ..."`
- `"DCA intent submitted: ..."`
- `"Updated UI intent ... to status: completed"`

## Troubleshooting

### "No Smart Session available"

- Ensure you completed the grant transaction
- Check that the session status is "active" in Convex
- Verify the session hasn't expired

### Intent stuck in "executing"

- Check backend logs for Rhinestone errors
- Verify your wallet has sufficient balance
- Check gas prices aren't blocking execution

### Session grant transaction fails

- Ensure you have enough ETH for gas
- Check network connectivity
- Try increasing gas limit in wallet

### Real-time updates not working

- Verify Convex dev server is running: `npx convex dev`
- Check browser console for WebSocket errors
- Ensure you're on the correct network

## Key Files Reference

| Component | File |
|-----------|------|
| Strategy Card | `src/components/strategies/StrategyCard.tsx` |
| Activation Flow | `src/components/strategies/StrategyActivationFlow.tsx` |
| Intent Progress | `src/components/intents/IntentProgressCard.tsx` |
| Activity Widget | `src/components/transactions/TransactionHistoryWidget.tsx` |
| Intent Hook | `src/hooks/useSmartSessionIntents.ts` |
| DCA Session Hook | `src/hooks/useDCASmartSession.ts` |
| Convex Intents | `convex/smartSessionIntents.ts` |
| Backend Executor | `backend/app/core/strategies/dca/executor.py` |
| Rhinestone Provider | `backend/app/providers/rhinestone.py` |

## What's Next?

After testing the basic flow:

1. **Test on Mainnet**: Same flow with real tokens
2. **Add More Strategies**: Try different tokens and frequencies
3. **Monitor Performance**: Use the Activity widget to track all executions
4. **Manage Sessions**: Revoke/extend sessions as needed
