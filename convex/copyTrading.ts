/**
 * Copy Trading Functions
 *
 * Manages copy trading relationships and execution tracking.
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// Types
// =============================================================================

const configSchema = v.object({
  leaderAddress: v.string(),
  leaderChain: v.string(),
  leaderLabel: v.optional(v.string()),
  sizingMode: v.string(),
  sizeValue: v.string(),
  minTradeUsd: v.string(),
  maxTradeUsd: v.optional(v.string()),
  tokenWhitelist: v.optional(v.array(v.string())),
  tokenBlacklist: v.optional(v.array(v.string())),
  allowedActions: v.array(v.string()),
  delaySeconds: v.number(),
  maxDelaySeconds: v.number(),
  maxSlippageBps: v.number(),
  maxDailyTrades: v.number(),
  maxDailyVolumeUsd: v.string(),
  sessionKeyId: v.optional(v.string()),
});

const signalSchema = v.object({
  leaderAddress: v.string(),
  leaderChain: v.string(),
  txHash: v.string(),
  blockNumber: v.number(),
  timestamp: v.number(),
  action: v.string(),
  tokenInAddress: v.string(),
  tokenInSymbol: v.optional(v.string()),
  tokenInAmount: v.string(),
  tokenOutAddress: v.string(),
  tokenOutSymbol: v.optional(v.string()),
  tokenOutAmount: v.optional(v.string()),
  valueUsd: v.optional(v.string()),
  dex: v.optional(v.string()),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a single copy relationship by ID
 */
export const getRelationship = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();
  },
});

/**
 * Find a relationship by user and leader
 */
export const findRelationship = query({
  args: {
    userId: v.string(),
    leaderAddress: v.string(),
    leaderChain: v.string(),
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("copyRelationships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return relationships.find(
      (r) =>
        r.config.leaderAddress.toLowerCase() === args.leaderAddress.toLowerCase() &&
        r.config.leaderChain === args.leaderChain
    );
  },
});

/**
 * List all copy relationships for a user
 */
export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("copyRelationships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * List all copy relationships for a leader
 */
export const listByLeader = query({
  args: {
    leaderAddress: v.string(),
    leaderChain: v.string(),
  },
  handler: async (ctx, args) => {
    // Use index on config.leaderAddress and config.leaderChain
    const relationships = await ctx.db
      .query("copyRelationships")
      .collect();

    return relationships.filter(
      (r) =>
        r.config.leaderAddress.toLowerCase() === args.leaderAddress.toLowerCase() &&
        r.config.leaderChain === args.leaderChain &&
        r.isActive
    );
  },
});

/**
 * List all copy relationships for a follower wallet
 */
export const listByFollower = query({
  args: {
    followerAddress: v.string(),
    followerChain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("copyRelationships");

    if (args.followerChain) {
      const relationships = await query
        .withIndex("by_follower", (q) =>
          q.eq("followerAddress", args.followerAddress.toLowerCase()).eq("followerChain", args.followerChain!)
        )
        .collect();
      return relationships;
    }

    const allRelationships = await query.collect();
    return allRelationships.filter(
      (r) => r.followerAddress.toLowerCase() === args.followerAddress.toLowerCase()
    );
  },
});

/**
 * Get execution history for a relationship
 */
export const listExecutions = query({
  args: {
    relationshipId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let executions = await ctx.db
      .query("copyExecutions")
      .withIndex("by_relationship", (q) => q.eq("relationshipId", args.relationshipId))
      .order("desc")
      .take(args.limit ?? 50);

    if (args.status) {
      executions = executions.filter((e) => e.status === args.status);
    }

    return executions;
  },
});

/**
 * Get leaderboard of watched wallets
 */
export const getLeaderboard = query({
  args: {
    chain: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    limit: v.optional(v.number()),
    minTrades: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let wallets = await ctx.db
      .query("watchedWallets")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by chain if specified
    if (args.chain) {
      wallets = wallets.filter((w) => w.chain === args.chain);
    }

    // Filter by minimum trades
    const minTrades = args.minTrades ?? 10;
    wallets = wallets.filter((w) => w.totalTrades >= minTrades);

    // Sort by the specified field
    const sortBy = args.sortBy ?? "totalPnlUsd";
    wallets.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy] ?? 0;
      const bVal = (b as Record<string, unknown>)[sortBy] ?? 0;
      return (bVal as number) - (aVal as number);
    });

    return wallets.slice(0, args.limit ?? 50);
  },
});

// =============================================================================
// Internal Queries
// =============================================================================

/**
 * Get active relationships for a leader (for event processing)
 */
export const getActiveRelationshipsForLeader = internalQuery({
  args: {
    leaderAddress: v.string(),
    leaderChain: v.string(),
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("copyRelationships")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isPaused"), false)
        )
      )
      .collect();

    return relationships.filter(
      (r) =>
        r.config.leaderAddress.toLowerCase() === args.leaderAddress.toLowerCase() &&
        r.config.leaderChain === args.leaderChain
    );
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create or update a copy relationship
 */
export const upsertRelationship = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    followerAddress: v.string(),
    followerChain: v.string(),
    config: configSchema,
    isActive: v.boolean(),
    isPaused: v.boolean(),
    pauseReason: v.optional(v.string()),
    dailyTradeCount: v.number(),
    dailyVolumeUsd: v.string(),
    dailyResetAt: v.number(),
    totalTrades: v.number(),
    successfulTrades: v.number(),
    failedTrades: v.number(),
    skippedTrades: v.number(),
    totalVolumeUsd: v.string(),
    totalPnlUsd: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastCopyAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: args.config,
        isActive: args.isActive,
        isPaused: args.isPaused,
        pauseReason: args.pauseReason,
        dailyTradeCount: args.dailyTradeCount,
        dailyVolumeUsd: args.dailyVolumeUsd,
        dailyResetAt: args.dailyResetAt,
        totalTrades: args.totalTrades,
        successfulTrades: args.successfulTrades,
        failedTrades: args.failedTrades,
        skippedTrades: args.skippedTrades,
        totalVolumeUsd: args.totalVolumeUsd,
        totalPnlUsd: args.totalPnlUsd,
        updatedAt: args.updatedAt,
        lastCopyAt: args.lastCopyAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("copyRelationships", {
      id: args.id,
      userId: args.userId,
      followerAddress: args.followerAddress.toLowerCase(),
      followerChain: args.followerChain,
      config: args.config,
      isActive: args.isActive,
      isPaused: args.isPaused,
      pauseReason: args.pauseReason,
      dailyTradeCount: args.dailyTradeCount,
      dailyVolumeUsd: args.dailyVolumeUsd,
      dailyResetAt: args.dailyResetAt,
      totalTrades: args.totalTrades,
      successfulTrades: args.successfulTrades,
      failedTrades: args.failedTrades,
      skippedTrades: args.skippedTrades,
      totalVolumeUsd: args.totalVolumeUsd,
      totalPnlUsd: args.totalPnlUsd,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      lastCopyAt: args.lastCopyAt,
    });
  },
});

/**
 * Insert a copy execution record
 */
export const insertExecution = mutation({
  args: {
    id: v.string(),
    relationshipId: v.string(),
    signal: signalSchema,
    status: v.string(),
    skipReason: v.optional(v.string()),
    calculatedSizeUsd: v.optional(v.string()),
    actualSizeUsd: v.optional(v.string()),
    txHash: v.optional(v.string()),
    gasUsed: v.optional(v.number()),
    gasPriceGwei: v.optional(v.string()),
    gasCostUsd: v.optional(v.string()),
    tokenOutAmount: v.optional(v.string()),
    slippageBps: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    signalReceivedAt: v.number(),
    executionStartedAt: v.optional(v.number()),
    executionCompletedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("copyExecutions", {
      id: args.id,
      relationshipId: args.relationshipId,
      signal: args.signal,
      status: args.status,
      skipReason: args.skipReason,
      calculatedSizeUsd: args.calculatedSizeUsd,
      actualSizeUsd: args.actualSizeUsd,
      txHash: args.txHash,
      gasUsed: args.gasUsed,
      gasPriceGwei: args.gasPriceGwei,
      gasCostUsd: args.gasCostUsd,
      tokenOutAmount: args.tokenOutAmount,
      slippageBps: args.slippageBps,
      errorMessage: args.errorMessage,
      signalReceivedAt: args.signalReceivedAt,
      executionStartedAt: args.executionStartedAt,
      executionCompletedAt: args.executionCompletedAt,
    });
  },
});

/**
 * Update execution status
 */
export const updateExecutionStatus = internalMutation({
  args: {
    id: v.string(),
    status: v.string(),
    skipReason: v.optional(v.string()),
    txHash: v.optional(v.string()),
    actualSizeUsd: v.optional(v.string()),
    tokenOutAmount: v.optional(v.string()),
    slippageBps: v.optional(v.number()),
    gasUsed: v.optional(v.number()),
    gasPriceGwei: v.optional(v.string()),
    gasCostUsd: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    executionStartedAt: v.optional(v.number()),
    executionCompletedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!execution) {
      throw new Error("Execution not found");
    }

    const { id, ...updates } = args;

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(execution._id, cleanUpdates);
  },
});

/**
 * Update or insert a watched wallet (leader profile)
 */
export const upsertWatchedWallet = mutation({
  args: {
    address: v.string(),
    chain: v.string(),
    label: v.optional(v.string()),
    notes: v.optional(v.string()),
    totalTrades: v.number(),
    winRate: v.optional(v.number()),
    avgTradePnlPercent: v.optional(v.number()),
    totalPnlUsd: v.optional(v.number()),
    sharpeRatio: v.optional(v.number()),
    maxDrawdownPercent: v.optional(v.number()),
    avgTradesPerDay: v.optional(v.number()),
    mostTradedTokens: v.array(v.string()),
    preferredSectors: v.array(v.string()),
    followerCount: v.number(),
    totalCopiedVolumeUsd: v.number(),
    isActive: v.boolean(),
    firstSeenAt: v.number(),
    lastActiveAt: v.number(),
    dataQualityScore: v.number(),
    lastAnalyzedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("watchedWallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("chain", args.chain)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        notes: args.notes,
        totalTrades: args.totalTrades,
        winRate: args.winRate,
        avgTradePnlPercent: args.avgTradePnlPercent,
        totalPnlUsd: args.totalPnlUsd,
        sharpeRatio: args.sharpeRatio,
        maxDrawdownPercent: args.maxDrawdownPercent,
        avgTradesPerDay: args.avgTradesPerDay,
        mostTradedTokens: args.mostTradedTokens,
        preferredSectors: args.preferredSectors,
        followerCount: args.followerCount,
        totalCopiedVolumeUsd: args.totalCopiedVolumeUsd,
        isActive: args.isActive,
        lastActiveAt: args.lastActiveAt,
        dataQualityScore: args.dataQualityScore,
        lastAnalyzedAt: args.lastAnalyzedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("watchedWallets", {
      address: args.address.toLowerCase(),
      chain: args.chain,
      label: args.label,
      notes: args.notes,
      totalTrades: args.totalTrades,
      winRate: args.winRate,
      avgTradePnlPercent: args.avgTradePnlPercent,
      totalPnlUsd: args.totalPnlUsd,
      sharpeRatio: args.sharpeRatio,
      maxDrawdownPercent: args.maxDrawdownPercent,
      avgTradesPerDay: args.avgTradesPerDay,
      mostTradedTokens: args.mostTradedTokens,
      preferredSectors: args.preferredSectors,
      followerCount: args.followerCount,
      totalCopiedVolumeUsd: args.totalCopiedVolumeUsd,
      isActive: args.isActive,
      firstSeenAt: args.firstSeenAt,
      lastActiveAt: args.lastActiveAt,
      dataQualityScore: args.dataQualityScore,
      lastAnalyzedAt: args.lastAnalyzedAt,
    });
  },
});

/**
 * Get watched wallet by address
 */
export const getWatchedWallet = query({
  args: {
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("watchedWallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("chain", args.chain)
      )
      .first();
  },
});
