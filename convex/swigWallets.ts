import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get Swig wallet by owner address.
 */
export const getByOwner = query({
  args: { ownerAddress: v.string() },
  handler: async (ctx, { ownerAddress }) => {
    return await ctx.db
      .query("swigWallets")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", ownerAddress.toLowerCase()))
      .first();
  },
});

/**
 * Get Swig wallet by Swig address.
 */
export const getBySwigAddress = query({
  args: { swigWalletAddress: v.string() },
  handler: async (ctx, { swigWalletAddress }) => {
    return await ctx.db
      .query("swigWallets")
      .withIndex("by_swig_wallet", (q) => q.eq("swigWalletAddress", swigWalletAddress))
      .first();
  },
});

/**
 * Create a new Swig wallet record.
 */
export const create = mutation({
  args: {
    ownerAddress: v.string(),
    swigWalletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("swigWallets")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", args.ownerAddress.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("Swig wallet already exists for this owner");
    }

    const now = Date.now();
    return await ctx.db.insert("swigWallets", {
      ownerAddress: args.ownerAddress.toLowerCase(),
      swigWalletAddress: args.swigWalletAddress,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update Swig wallet status.
 */
export const updateStatus = mutation({
  args: {
    swigWalletAddress: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, { swigWalletAddress, status }) => {
    const wallet = await ctx.db
      .query("swigWallets")
      .withIndex("by_swig_wallet", (q) => q.eq("swigWalletAddress", swigWalletAddress))
      .first();

    if (!wallet) {
      throw new Error("Swig wallet not found");
    }

    await ctx.db.patch(wallet._id, {
      status,
      updatedAt: Date.now(),
    });
  },
});
