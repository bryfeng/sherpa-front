import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List transactions for a wallet
 */
export const listByWallet = query({
  args: {
    walletId: v.id("wallets"),
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("submitted"),
        v.literal("confirmed"),
        v.literal("failed"),
        v.literal("reverted")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("transactions")
        .withIndex("by_wallet_status", (q) =>
          q.eq("walletId", args.walletId).eq("status", args.status!)
        )
        .order("desc")
        .take(args.limit || 50);
    }

    return await ctx.db
      .query("transactions")
      .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * List transactions for an execution
 */
export const listByExecution = query({
  args: { executionId: v.id("strategyExecutions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .order("asc")
      .collect();
  },
});

/**
 * Get a transaction by hash
 */
export const getByHash = query({
  args: { txHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_tx_hash", (q) => q.eq("txHash", args.txHash))
      .first();
  },
});

/**
 * Create a new transaction (pending)
 */
export const create = mutation({
  args: {
    executionId: v.optional(v.id("strategyExecutions")),
    walletId: v.id("wallets"),
    chain: v.string(),
    type: v.union(
      v.literal("swap"),
      v.literal("bridge"),
      v.literal("transfer"),
      v.literal("approve")
    ),
    inputData: v.any(),
    valueUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      executionId: args.executionId,
      walletId: args.walletId,
      chain: args.chain,
      type: args.type,
      status: "pending",
      inputData: args.inputData,
      valueUsd: args.valueUsd,
      createdAt: Date.now(),
    });
  },
});

/**
 * Mark transaction as submitted (with tx hash)
 */
export const markSubmitted = mutation({
  args: {
    transactionId: v.id("transactions"),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "submitted",
      txHash: args.txHash,
    });
  },
});

/**
 * Mark transaction as confirmed
 */
export const markConfirmed = mutation({
  args: {
    transactionId: v.id("transactions"),
    outputData: v.optional(v.any()),
    gasUsed: v.optional(v.number()),
    gasPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "confirmed",
      outputData: args.outputData,
      gasUsed: args.gasUsed,
      gasPrice: args.gasPrice,
      confirmedAt: Date.now(),
    });
  },
});

/**
 * Mark transaction as failed
 */
export const markFailed = mutation({
  args: {
    transactionId: v.id("transactions"),
    outputData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "failed",
      outputData: args.outputData,
      confirmedAt: Date.now(),
    });
  },
});

/**
 * Mark transaction as reverted
 */
export const markReverted = mutation({
  args: {
    transactionId: v.id("transactions"),
    outputData: v.optional(v.any()),
    gasUsed: v.optional(v.number()),
    gasPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "reverted",
      outputData: args.outputData,
      gasUsed: args.gasUsed,
      gasPrice: args.gasPrice,
      confirmedAt: Date.now(),
    });
  },
});

/**
 * Get pending transactions (for monitoring/retrying)
 */
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/**
 * Get submitted but unconfirmed transactions (for monitoring)
 */
export const getSubmitted = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
  },
});

/**
 * Get transaction stats for a wallet
 */
export const getWalletStats = query({
  args: { walletId: v.id("wallets") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
      .collect();

    const stats = {
      total: transactions.length,
      pending: 0,
      submitted: 0,
      confirmed: 0,
      failed: 0,
      reverted: 0,
      totalValueUsd: 0,
    };

    for (const tx of transactions) {
      stats[tx.status]++;
      if (tx.valueUsd && tx.status === "confirmed") {
        stats.totalValueUsd += tx.valueUsd;
      }
    }

    return stats;
  },
});
