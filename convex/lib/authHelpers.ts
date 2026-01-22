/**
 * Authorization helpers for Convex functions.
 *
 * These helpers verify that the caller has permission to access
 * the requested resources. Use these in query and mutation handlers
 * to enforce ownership checks.
 *
 * IMPORTANT: Since this app uses wallet-based auth where the
 * wallet address is the identity, authorization checks should verify
 * that the requested resources belong to the authenticated wallet.
 *
 * For server-to-server calls (backend → Convex), use the internal API key.
 * For client calls, the frontend should pass the connected wallet address
 * and the backend validates ownership via JWT tokens.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Verify the caller's wallet address owns the requested wallet record.
 *
 * @param ctx - Convex query or mutation context
 * @param walletId - The wallet ID being accessed
 * @param callerAddress - The wallet address of the caller (from auth token)
 * @returns true if authorized, throws if not
 */
export async function verifyWalletOwnership(
  ctx: QueryCtx | MutationCtx,
  walletId: Id<"wallets">,
  callerAddress: string
): Promise<boolean> {
  const wallet = await ctx.db.get(walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const isEvm = wallet.chain !== "solana";
  const matches = isEvm
    ? wallet.address.toLowerCase() === callerAddress.toLowerCase()
    : wallet.address === callerAddress;

  if (!matches) {
    throw new Error("Unauthorized: You do not own this wallet");
  }

  return true;
}

/**
 * Verify the caller's wallet address owns the requested conversation.
 *
 * @param ctx - Convex query or mutation context
 * @param conversationId - The conversation ID being accessed
 * @param callerAddress - The wallet address of the caller
 * @returns true if authorized, throws if not
 */
export async function verifyConversationOwnership(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  callerAddress: string
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Get the wallet associated with this conversation
  const wallet = await ctx.db.get(conversation.walletId);

  if (!wallet) {
    throw new Error("Associated wallet not found");
  }

  const isEvm = wallet.chain !== "solana";
  const matches = isEvm
    ? wallet.address.toLowerCase() === callerAddress.toLowerCase()
    : wallet.address === callerAddress;

  if (!matches) {
    throw new Error("Unauthorized: You do not own this conversation");
  }

  return true;
}

/**
 * Verify the caller's wallet address can access user data.
 *
 * @param ctx - Convex query or mutation context
 * @param userId - The user ID being accessed
 * @param callerAddress - The wallet address of the caller
 * @returns true if authorized, throws if not
 */
export async function verifyUserAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  callerAddress: string
): Promise<boolean> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Get the user's wallets
  const wallets = await ctx.db
    .query("wallets")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Check if any of the user's wallets match the caller's address
  const hasAccess = wallets.some((w) => {
    const isEvm = w.chain !== "solana";
    return isEvm
      ? w.address.toLowerCase() === callerAddress.toLowerCase()
      : w.address === callerAddress;
  });

  if (!hasAccess) {
    throw new Error("Unauthorized: No access to this user");
  }

  return true;
}

/**
 * Validate an Ethereum address format.
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a Solana address format (base58, 32-44 characters).
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate a wallet address based on chain.
 */
export function validateWalletAddress(
  address: string,
  chain: string
): boolean {
  if (!address) return false;

  if (chain === "solana") {
    return isValidSolanaAddress(address);
  }

  // Default to EVM validation
  return isValidEthAddress(address);
}
