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
    const query = ctx.db.query("copyRelationships");

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

/**
 * Get a single execution by ID
 */
export const getExecution = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();
  },
});

/**
 * Get pending approvals for a user (across all relationships)
 */
export const getPendingApprovals = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's relationships
    const relationships = await ctx.db
      .query("copyRelationships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const relationshipIds = relationships.map((r) => r.id);

    // Get pending executions for these relationships
    const allExecutions = await ctx.db
      .query("copyExecutions")
      .withIndex("by_status", (q) => q.eq("status", "pending_approval"))
      .order("desc")
      .collect();

    // Filter to user's relationships and enrich with relationship data
    const pendingExecutions = allExecutions
      .filter((e) => relationshipIds.includes(e.relationshipId))
      .map((execution) => {
        const relationship = relationships.find((r) => r.id === execution.relationshipId);
        return {
          ...execution,
          relationship: relationship
            ? {
                id: relationship.id,
                leaderLabel: relationship.config.leaderLabel,
                leaderAddress: relationship.config.leaderAddress,
                sizingMode: relationship.config.sizingMode,
                sizeValue: relationship.config.sizeValue,
              }
            : null,
        };
      });

    return pendingExecutions;
  },
});

/**
 * Get aggregate copy trading stats for a user
 */
export const getUserCopyStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("copyRelationships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      totalRelationships: relationships.length,
      activeRelationships: relationships.filter((r) => r.isActive && !r.isPaused).length,
      pausedRelationships: relationships.filter((r) => r.isPaused).length,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      skippedTrades: 0,
      totalVolumeUsd: 0,
      totalPnlUsd: 0,
      successRate: 0,
    };

    for (const rel of relationships) {
      stats.totalTrades += rel.totalTrades;
      stats.successfulTrades += rel.successfulTrades;
      stats.failedTrades += rel.failedTrades;
      stats.skippedTrades += rel.skippedTrades;
      stats.totalVolumeUsd += parseFloat(rel.totalVolumeUsd || "0");
      stats.totalPnlUsd += parseFloat(rel.totalPnlUsd || "0");
    }

    stats.successRate =
      stats.totalTrades > 0
        ? (stats.successfulTrades / (stats.successfulTrades + stats.failedTrades)) * 100
        : 0;

    return stats;
  },
});

// =============================================================================
// User Mutations (for frontend)
// =============================================================================

/**
 * Pause a copy relationship
 */
export const pauseRelationship = mutation({
  args: {
    id: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    await ctx.db.patch(relationship._id, {
      isPaused: true,
      pauseReason: args.reason ?? "Paused by user",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resume a paused copy relationship
 */
export const resumeRelationship = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    await ctx.db.patch(relationship._id, {
      isPaused: false,
      pauseReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete (deactivate) a copy relationship
 */
export const deleteRelationship = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Soft delete - mark as inactive
    await ctx.db.patch(relationship._id, {
      isActive: false,
      isPaused: false,
      updatedAt: Date.now(),
    });

    // Update leader's follower count
    const leader = await ctx.db
      .query("watchedWallets")
      .withIndex("by_address_chain", (q) =>
        q
          .eq("address", relationship.config.leaderAddress.toLowerCase())
          .eq("chain", relationship.config.leaderChain)
      )
      .first();

    if (leader && leader.followerCount > 0) {
      await ctx.db.patch(leader._id, {
        followerCount: leader.followerCount - 1,
      });
    }

    return { success: true };
  },
});

/**
 * Update relationship configuration
 */
export const updateRelationshipConfig = mutation({
  args: {
    id: v.string(),
    config: v.object({
      sizingMode: v.optional(v.string()),
      sizeValue: v.optional(v.string()),
      minTradeUsd: v.optional(v.string()),
      maxTradeUsd: v.optional(v.string()),
      tokenWhitelist: v.optional(v.array(v.string())),
      tokenBlacklist: v.optional(v.array(v.string())),
      allowedActions: v.optional(v.array(v.string())),
      delaySeconds: v.optional(v.number()),
      maxDelaySeconds: v.optional(v.number()),
      maxSlippageBps: v.optional(v.number()),
      maxDailyTrades: v.optional(v.number()),
      maxDailyVolumeUsd: v.optional(v.string()),
      sessionKeyId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Merge config updates
    const updatedConfig = {
      ...relationship.config,
      ...Object.fromEntries(
        Object.entries(args.config).filter(([, v]) => v !== undefined)
      ),
    };

    await ctx.db.patch(relationship._id, {
      config: updatedConfig,
      updatedAt: Date.now(),
    });

    return { success: true, config: updatedConfig };
  },
});

/**
 * Approve a pending copy execution (user action)
 */
export const approveExecution = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!execution) {
      throw new Error("Execution not found");
    }

    if (execution.status !== "pending_approval") {
      throw new Error(`Cannot approve execution in status: ${execution.status}`);
    }

    await ctx.db.patch(execution._id, {
      status: "queued",
      executionStartedAt: Date.now(),
    });

    return { success: true, executionId: args.id };
  },
});

/**
 * Reject a pending copy execution (user action)
 */
export const rejectExecution = mutation({
  args: {
    id: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!execution) {
      throw new Error("Execution not found");
    }

    if (execution.status !== "pending_approval") {
      throw new Error(`Cannot reject execution in status: ${execution.status}`);
    }

    await ctx.db.patch(execution._id, {
      status: "cancelled",
      skipReason: args.reason ?? "Rejected by user",
      executionCompletedAt: Date.now(),
    });

    // Update relationship stats
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", execution.relationshipId))
      .first();

    if (relationship) {
      await ctx.db.patch(relationship._id, {
        skippedTrades: relationship.skippedTrades + 1,
        totalTrades: relationship.totalTrades + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mark execution as completed (after tx confirmation)
 */
export const completeExecution = mutation({
  args: {
    id: v.string(),
    txHash: v.string(),
    actualSizeUsd: v.string(),
    tokenOutAmount: v.optional(v.string()),
    slippageBps: v.optional(v.number()),
    gasUsed: v.optional(v.number()),
    gasCostUsd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!execution) {
      throw new Error("Execution not found");
    }

    await ctx.db.patch(execution._id, {
      status: "completed",
      txHash: args.txHash,
      actualSizeUsd: args.actualSizeUsd,
      tokenOutAmount: args.tokenOutAmount,
      slippageBps: args.slippageBps,
      gasUsed: args.gasUsed,
      gasCostUsd: args.gasCostUsd,
      executionCompletedAt: Date.now(),
    });

    // Update relationship stats
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", execution.relationshipId))
      .first();

    if (relationship) {
      const newVolume =
        parseFloat(relationship.totalVolumeUsd || "0") + parseFloat(args.actualSizeUsd);
      const newDailyVolume =
        parseFloat(relationship.dailyVolumeUsd || "0") + parseFloat(args.actualSizeUsd);

      await ctx.db.patch(relationship._id, {
        successfulTrades: relationship.successfulTrades + 1,
        totalTrades: relationship.totalTrades + 1,
        totalVolumeUsd: newVolume.toString(),
        dailyVolumeUsd: newDailyVolume.toString(),
        dailyTradeCount: relationship.dailyTradeCount + 1,
        lastCopyAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mark execution as failed
 */
export const failExecution = mutation({
  args: {
    id: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("copyExecutions")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (!execution) {
      throw new Error("Execution not found");
    }

    await ctx.db.patch(execution._id, {
      status: "failed",
      errorMessage: args.errorMessage,
      executionCompletedAt: Date.now(),
    });

    // Update relationship stats
    const relationship = await ctx.db
      .query("copyRelationships")
      .withIndex("by_external_id", (q) => q.eq("id", execution.relationshipId))
      .first();

    if (relationship) {
      await ctx.db.patch(relationship._id, {
        failedTrades: relationship.failedTrades + 1,
        totalTrades: relationship.totalTrades + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// =============================================================================
// Cron / Internal Mutations
// =============================================================================

/**
 * Reset daily limits for all active relationships (called by cron)
 */
export const resetDailyLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const relationships = await ctx.db
      .query("copyRelationships")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let resetCount = 0;
    for (const rel of relationships) {
      // Check if 24h has passed since last reset
      const hoursSinceReset = (now - rel.dailyResetAt) / (1000 * 60 * 60);
      if (hoursSinceReset >= 24) {
        await ctx.db.patch(rel._id, {
          dailyTradeCount: 0,
          dailyVolumeUsd: "0",
          dailyResetAt: now,
        });
        resetCount++;
      }
    }

    return { resetCount };
  },
});
