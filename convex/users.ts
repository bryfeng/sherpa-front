import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new user
 */
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get a user by ID
 */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get or create user by wallet address
 * This is the main entry point for user creation
 */
export const getOrCreateByWallet = mutation({
  args: {
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if wallet exists
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("chain", args.chain)
      )
      .first();

    if (existingWallet) {
      const user = await ctx.db.get(existingWallet.userId);
      return { user, wallet: existingWallet, isNew: false };
    }

    // Create new user and wallet
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      createdAt: now,
      updatedAt: now,
    });

    const walletId = await ctx.db.insert("wallets", {
      userId,
      address: args.address.toLowerCase(),
      chain: args.chain,
      isPrimary: true,
      createdAt: now,
    });

    const user = await ctx.db.get(userId);
    const wallet = await ctx.db.get(walletId);

    return { user, wallet, isNew: true };
  },
});
