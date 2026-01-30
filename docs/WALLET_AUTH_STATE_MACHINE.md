# Wallet + Auth State Machine

> **Purpose**: Reference doc to avoid iteration loops when working on wallet/auth UI.
> Consult this before implementing any wallet/auth feature.

## State Dimensions

### Wallet Connection State
| State | Description |
|-------|-------------|
| `disconnected` | No wallet connected |
| `connecting` | Connection in progress (modal open) |
| `connected` | Wallet connected (address available) |

### Auth State
| State | Description |
|-------|-------------|
| `idle` | No auth attempt made |
| `signing` | Signature request pending |
| `signed_in` | Valid session exists |
| `error` | Sign-in failed/rejected |

---

## Valid State Combinations & Expected UI

| Wallet | Auth | Header Shows | Actions Available |
|--------|------|--------------|-------------------|
| disconnected | idle | "Connect Wallet" button | Click opens wallet modal |
| disconnected | * | "Connect Wallet" button | Auth state irrelevant when disconnected |
| connected | idle | Wallet address + Disconnect | Auto-triggers sign-in |
| connected | signing | Wallet address + "Signing in..." | User sees wallet popup |
| connected | signed_in | Wallet address + "Signed in" + Disconnect | Full access |
| connected | error | Wallet address + "Sign-in failed" + Retry + Disconnect | User can retry or disconnect |

---

## Critical Edge Cases (The Iteration Killers)

### 1. User Rejects Signature
- **Trigger**: User clicks "Reject" on wallet signature popup
- **Expected**: Status → `error`, NO auto-retry, show "Retry" button
- **Anti-pattern**: Auto-retrying creates spam loop

### 2. User Disconnects Mid-Signing
- **Trigger**: User disconnects wallet while signature pending
- **Expected**: Cancel signing, clear all state, show "Connect Wallet"
- **Anti-pattern**: Orphaned signing state

### 3. Session Expires While Connected
- **Trigger**: JWT expires, wallet still connected
- **Expected**: Auto-attempt re-sign OR show "Session expired, please sign again"
- **Anti-pattern**: Silent failure with stale session

### 4. Wallet Switch
- **Trigger**: User connects different wallet address
- **Expected**: Clear old session, start fresh sign-in for new address
- **Anti-pattern**: Using old session for new wallet

### 5. Chain Switch (EVM ↔ Solana)
- **Trigger**: User switches from EVM wallet to Solana wallet
- **Expected**: Clear old session, start fresh sign-in
- **Anti-pattern**: EVM session used for Solana or vice versa

### 6. Page Reload While Connected
- **Trigger**: User refreshes page with wallet connected
- **Expected**: Check stored session validity, use if valid, else re-sign
- **Anti-pattern**: Always forcing re-sign on reload

### 7. Multi-Wallet Environment
- **Trigger**: User has Phantom (Solana) + MetaMask (EVM) installed
- **Expected**: User explicitly chooses which to connect
- **Anti-pattern**: Auto-connecting to first detected wallet

---

## Disconnect Requirements

### Must Work For:
- [x] EVM wallets via wagmi
- [x] EVM wallets via AppKit
- [x] Solana wallets via AppKit

### On Disconnect:
1. Call AppKit disconnect (handles all wallet types)
2. Call wagmi disconnect (fallback for EVM-only)
3. Clear auth session from storage
4. Clear auth state from store
5. Clear wallet state from store
6. UI updates to show "Connect Wallet"

---

## Implementation Checklist

When implementing wallet/auth features, verify:

- [ ] All 6 state combinations have defined UI behavior
- [ ] Error state does NOT auto-retry
- [ ] Disconnect works for both EVM and Solana
- [ ] Wallet switch clears old session
- [ ] Chain switch clears old session
- [ ] Page reload checks stored session
- [ ] No auto-connect without user action
- [ ] Signing state blocks other auth actions

---

## Testing Matrix

Before marking wallet/auth work complete, test:

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Fresh connect EVM | Click Connect → Select MetaMask → Sign | Shows address + "Signed in" |
| Fresh connect Solana | Click Connect → Select Phantom → Sign | Shows address + "Signed in" |
| Reject signature | Connect → Reject in wallet | Shows "Sign-in failed" + Retry |
| Retry after reject | Reject → Click Retry → Sign | Shows "Signed in" |
| Disconnect EVM | Connect EVM → Disconnect | Shows "Connect Wallet" |
| Disconnect Solana | Connect Solana → Disconnect | Shows "Connect Wallet" |
| Switch wallets | Connect A → Disconnect → Connect B | New address, fresh session |
| Page reload | Connect + Sign → Reload | Session restored, no re-sign |

---

## Related Files

- `src/hooks/useWalletAuth.ts` - Auth flow logic
- `src/App.tsx` - `useWalletSync()` hook
- `src/hooks/useDeFiChatController.tsx` - Disconnect handler
- `src/components/header/HeaderBar.tsx` - Header UI
- `src/store/index.ts` - Auth and wallet store slices
