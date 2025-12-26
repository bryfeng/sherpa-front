import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all wallets for a user
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a wallet by address and chain
 */
export const getByAddress = query({
  args: {
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("chain", args.chain)
      )
      .first();
  },
});

/**
 * Add a new wallet to a user
 */
export const add = mutation({
  args: {
    userId: v.id("users"),
    address: v.string(),
    chain: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if wallet already exists
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("chain", args.chain)
      )
      .first();

    if (existing) {
      throw new Error("Wallet already exists");
    }

    // Check if user has any wallets (to determine primary)
    const userWallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return await ctx.db.insert("wallets", {
      userId: args.userId,
      address: args.address.toLowerCase(),
      chain: args.chain,
      label: args.label,
      isPrimary: userWallets.length === 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update wallet label
 */
export const updateLabel = mutation({
  args: {
    walletId: v.id("wallets"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletId, { label: args.label });
  },
});

/**
 * Set a wallet as primary
 */
export const setPrimary = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) throw new Error("Wallet not found");

    // Unset all other wallets as primary
    const userWallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", wallet.userId))
      .collect();

    for (const w of userWallets) {
      if (w._id !== args.walletId && w.isPrimary) {
        await ctx.db.patch(w._id, { isPrimary: false });
      }
    }

    await ctx.db.patch(args.walletId, { isPrimary: true });
  },
});
