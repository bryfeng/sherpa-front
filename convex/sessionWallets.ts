import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new session wallet record
 */
export const create = mutation({
  args: {
    walletAddress: v.string(),
    chainType: v.string(),
    turnkeyWalletId: v.string(),
    turnkeyAddress: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const id = await ctx.db.insert("sessionWallets", {
      walletAddress: args.walletAddress.toLowerCase(),
      chainType: args.chainType,
      turnkeyWalletId: args.turnkeyWalletId,
      turnkeyAddress: args.turnkeyAddress,
      status: "active",
      label: args.label,
      createdAt: Date.now(),
      totalSignatures: 0,
    });
    return id;
  },
});

/**
 * Get session wallet by user wallet and chain type
 */
export const getByWalletChain = query({
  args: {
    walletAddress: v.string(),
    chainType: v.string(),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("sessionWallets")
      .withIndex("by_wallet_chain_status", (q) =>
        q
          .eq("walletAddress", args.walletAddress.toLowerCase())
          .eq("chainType", args.chainType)
          .eq("status", "active")
      )
      .first();

    return wallet;
  },
});

/**
 * Get session wallet by Turnkey address
 */
export const getByTurnkeyAddress = query({
  args: {
    turnkeyAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("sessionWallets")
      .withIndex("by_turnkey_address", (q) =>
        q.eq("turnkeyAddress", args.turnkeyAddress)
      )
      .first();

    return wallet;
  },
});

/**
 * List all session wallets for a user
 */
export const listByWallet = query({
  args: {
    walletAddress: v.string(),
    includeRevoked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const wallets = await ctx.db
      .query("sessionWallets")
      .withIndex("by_wallet", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .collect();

    if (args.includeRevoked) {
      return wallets;
    }

    return wallets.filter((w) => w.status === "active");
  },
});

/**
 * Record a signature event (increment counter)
 */
export const recordSignature = mutation({
  args: {
    turnkeyAddress: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const wallet = await ctx.db
      .query("sessionWallets")
      .withIndex("by_turnkey_address", (q) =>
        q.eq("turnkeyAddress", args.turnkeyAddress)
      )
      .first();

    if (!wallet) {
      return;
    }

    await ctx.db.patch(wallet._id, {
      totalSignatures: (wallet.totalSignatures || 0) + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Revoke a session wallet
 */
export const revoke = mutation({
  args: {
    turnkeyWalletId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const wallet = await ctx.db
      .query("sessionWallets")
      .withIndex("by_turnkey_wallet_id", (q) =>
        q.eq("turnkeyWalletId", args.turnkeyWalletId)
      )
      .first();

    if (!wallet) {
      throw new Error(`Session wallet ${args.turnkeyWalletId} not found`);
    }

    await ctx.db.patch(wallet._id, {
      status: "revoked",
      revokedAt: Date.now(),
      revokeReason: args.reason || "User requested",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update session wallet label
 */
export const updateLabel = mutation({
  args: {
    turnkeyWalletId: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const wallet = await ctx.db
      .query("sessionWallets")
      .withIndex("by_turnkey_wallet_id", (q) =>
        q.eq("turnkeyWalletId", args.turnkeyWalletId)
      )
      .first();

    if (!wallet) {
      throw new Error(`Session wallet ${args.turnkeyWalletId} not found`);
    }

    await ctx.db.patch(wallet._id, {
      label: args.label,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get active session wallet count for a user
 */
export const getActiveCount = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const wallets = await ctx.db
      .query("sessionWallets")
      .withIndex("by_wallet", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .collect();

    return wallets.filter((w) => w.status === "active").length;
  },
});
