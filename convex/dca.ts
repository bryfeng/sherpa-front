/**
 * DCA (Dollar Cost Averaging) Strategy Functions
 *
 * Manages DCA strategy creation, updates, and execution tracking.
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

const tokenSchema = v.object({
  symbol: v.string(),
  address: v.string(),
  chainId: v.number(),
  decimals: v.number(),
});

const frequencySchema = v.union(
  v.literal("hourly"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("monthly"),
  v.literal("custom")
);

const statusSchema = v.union(
  v.literal("draft"),
  v.literal("pending_session"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("expired")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a single DCA strategy by ID
 */
export const get = query({
  args: { id: v.id("dcaStrategies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List all DCA strategies for a user
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(statusSchema),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("dcaStrategies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    const strategies = await query.collect();

    if (args.status) {
      return strategies.filter((s) => s.status === args.status);
    }

    return strategies;
  },
});

/**
 * List all DCA strategies for a wallet address
 */
export const listByWallet = query({
  args: {
    walletAddress: v.string(),
    status: v.optional(statusSchema),
  },
  handler: async (ctx, args) => {
    const strategies = await ctx.db
      .query("dcaStrategies")
      .withIndex("by_wallet_address", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .collect();

    if (args.status) {
      return strategies.filter((s) => s.status === args.status);
    }

    return strategies;
  },
});

/**
 * Get execution history for a strategy
 */
export const getExecutions = query({
  args: {
    strategyId: v.id("dcaStrategies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("dcaExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .order("desc")
      .take(args.limit ?? 50);

    return executions;
  },
});

/**
 * Get strategy stats summary
 */
export const getStats = query({
  args: { strategyId: v.id("dcaStrategies") },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) return null;

    return {
      totalExecutions: strategy.totalExecutions,
      successfulExecutions: strategy.successfulExecutions,
      failedExecutions: strategy.failedExecutions,
      skippedExecutions: strategy.skippedExecutions,
      totalAmountSpentUsd: strategy.totalAmountSpentUsd,
      totalTokensAcquired: strategy.totalTokensAcquired,
      averagePriceUsd: strategy.averagePriceUsd,
      nextExecutionAt: strategy.nextExecutionAt,
      lastExecutionAt: strategy.lastExecutionAt,
    };
  },
});

// =============================================================================
// Internal Queries (for cron/scheduler)
// =============================================================================

/**
 * Get strategies due for execution
 */
export const getDueStrategies = internalQuery({
  args: {
    beforeTimestamp: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get active strategies with nextExecutionAt <= now
    const strategies = await ctx.db
      .query("dcaStrategies")
      .withIndex("by_next_execution")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("nextExecutionAt"), args.beforeTimestamp)
        )
      )
      .take(args.limit ?? 100);

    return strategies;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new DCA strategy
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    walletId: v.id("wallets"),
    walletAddress: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    fromToken: tokenSchema,
    toToken: tokenSchema,
    amountPerExecutionUsd: v.number(),
    frequency: frequencySchema,
    cronExpression: v.optional(v.string()),
    executionHourUtc: v.number(),
    executionDayOfWeek: v.optional(v.number()),
    executionDayOfMonth: v.optional(v.number()),
    maxSlippageBps: v.number(),
    maxGasUsd: v.number(),
    skipIfGasAboveUsd: v.optional(v.number()),
    pauseIfPriceAboveUsd: v.optional(v.number()),
    pauseIfPriceBelowUsd: v.optional(v.number()),
    maxTotalSpendUsd: v.optional(v.number()),
    maxExecutions: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const strategyId = await ctx.db.insert("dcaStrategies", {
      userId: args.userId,
      walletId: args.walletId,
      walletAddress: args.walletAddress.toLowerCase(),
      name: args.name,
      description: args.description,
      fromToken: args.fromToken,
      toToken: args.toToken,
      amountPerExecutionUsd: args.amountPerExecutionUsd,
      frequency: args.frequency,
      cronExpression: args.cronExpression,
      executionHourUtc: args.executionHourUtc,
      executionDayOfWeek: args.executionDayOfWeek,
      executionDayOfMonth: args.executionDayOfMonth,
      maxSlippageBps: args.maxSlippageBps,
      maxGasUsd: args.maxGasUsd,
      skipIfGasAboveUsd: args.skipIfGasAboveUsd,
      pauseIfPriceAboveUsd: args.pauseIfPriceAboveUsd,
      pauseIfPriceBelowUsd: args.pauseIfPriceBelowUsd,
      maxTotalSpendUsd: args.maxTotalSpendUsd,
      maxExecutions: args.maxExecutions,
      endDate: args.endDate,
      status: "draft",
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      skippedExecutions: 0,
      totalAmountSpentUsd: 0,
      totalTokensAcquired: "0",
      createdAt: now,
      updatedAt: now,
    });

    return strategyId;
  },
});

/**
 * Activate a DCA strategy (requires session key)
 */
export const activate = mutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    sessionKeyId: v.id("sessionKeys"),
    nextExecutionAt: v.number(),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.status !== "draft" && strategy.status !== "pending_session") {
      throw new Error(`Cannot activate strategy in ${strategy.status} status`);
    }

    const now = Date.now();

    await ctx.db.patch(args.strategyId, {
      status: "active",
      sessionKeyId: args.sessionKeyId,
      nextExecutionAt: args.nextExecutionAt,
      activatedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Pause a DCA strategy
 */
export const pause = mutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.status !== "active") {
      throw new Error(`Cannot pause strategy in ${strategy.status} status`);
    }

    await ctx.db.patch(args.strategyId, {
      status: "paused",
      pauseReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resume a paused DCA strategy
 */
export const resume = mutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    nextExecutionAt: v.number(),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.status !== "paused") {
      throw new Error(`Cannot resume strategy in ${strategy.status} status`);
    }

    // Check session key is still valid
    if (strategy.sessionKeyId) {
      const sessionKey = await ctx.db.get(strategy.sessionKeyId);
      if (!sessionKey || sessionKey.status !== "active") {
        throw new Error("Session key expired or revoked");
      }
    }

    await ctx.db.patch(args.strategyId, {
      status: "active",
      pauseReason: undefined,
      nextExecutionAt: args.nextExecutionAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Stop/complete a DCA strategy
 */
export const stop = mutation({
  args: {
    strategyId: v.id("dcaStrategies"),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    await ctx.db.patch(args.strategyId, {
      status: "completed",
      nextExecutionAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update strategy configuration (only allowed when paused or draft)
 */
export const updateConfig = mutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    amountPerExecutionUsd: v.optional(v.number()),
    frequency: v.optional(frequencySchema),
    cronExpression: v.optional(v.string()),
    executionHourUtc: v.optional(v.number()),
    executionDayOfWeek: v.optional(v.number()),
    executionDayOfMonth: v.optional(v.number()),
    maxSlippageBps: v.optional(v.number()),
    maxGasUsd: v.optional(v.number()),
    skipIfGasAboveUsd: v.optional(v.number()),
    pauseIfPriceAboveUsd: v.optional(v.number()),
    pauseIfPriceBelowUsd: v.optional(v.number()),
    maxTotalSpendUsd: v.optional(v.number()),
    maxExecutions: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.status !== "draft" && strategy.status !== "paused") {
      throw new Error(
        `Cannot update strategy in ${strategy.status} status. Pause it first.`
      );
    }

    const { strategyId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.strategyId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// =============================================================================
// Internal Mutations (for execution tracking)
// =============================================================================

/**
 * Create a new execution record (called by cron/executor)
 */
export const createExecution = internalMutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    executionNumber: v.number(),
    scheduledAt: v.number(),
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("dcaExecutions", {
      strategyId: args.strategyId,
      executionNumber: args.executionNumber,
      status: "pending",
      scheduledAt: args.scheduledAt,
      chainId: args.chainId,
    });

    return executionId;
  },
});

/**
 * Mark execution as running
 */
export const markExecutionRunning = internalMutation({
  args: {
    executionId: v.id("dcaExecutions"),
    marketConditions: v.object({
      tokenPriceUsd: v.number(),
      gasGwei: v.number(),
      estimatedGasUsd: v.number(),
    }),
    quote: v.optional(
      v.object({
        inputAmount: v.string(),
        expectedOutputAmount: v.string(),
        minimumOutputAmount: v.string(),
        priceImpactBps: v.number(),
        route: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      marketConditions: args.marketConditions,
      quote: args.quote,
      startedAt: Date.now(),
    });
  },
});

/**
 * Mark execution as completed (success)
 */
export const markExecutionCompleted = internalMutation({
  args: {
    executionId: v.id("dcaExecutions"),
    txHash: v.string(),
    actualInputAmount: v.string(),
    actualOutputAmount: v.string(),
    actualPriceUsd: v.number(),
    gasUsed: v.number(),
    gasPriceGwei: v.number(),
    gasUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    const now = Date.now();

    // Update execution record
    await ctx.db.patch(args.executionId, {
      status: "completed",
      txHash: args.txHash,
      actualInputAmount: args.actualInputAmount,
      actualOutputAmount: args.actualOutputAmount,
      actualPriceUsd: args.actualPriceUsd,
      gasUsed: args.gasUsed,
      gasPriceGwei: args.gasPriceGwei,
      gasUsd: args.gasUsd,
      completedAt: now,
    });

    // Update strategy stats
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      const newTotalTokens =
        parseFloat(strategy.totalTokensAcquired) +
        parseFloat(args.actualOutputAmount);
      const newTotalSpent =
        strategy.totalAmountSpentUsd + parseFloat(args.actualInputAmount);
      const newAvgPrice = newTotalSpent / newTotalTokens;

      await ctx.db.patch(execution.strategyId, {
        totalExecutions: strategy.totalExecutions + 1,
        successfulExecutions: strategy.successfulExecutions + 1,
        totalAmountSpentUsd: newTotalSpent,
        totalTokensAcquired: newTotalTokens.toString(),
        averagePriceUsd: newAvgPrice,
        lastExecutionAt: now,
        lastError: undefined,
        updatedAt: now,
      });

      // Check if we've hit limits
      if (
        (strategy.maxExecutions &&
          strategy.totalExecutions + 1 >= strategy.maxExecutions) ||
        (strategy.maxTotalSpendUsd && newTotalSpent >= strategy.maxTotalSpendUsd)
      ) {
        await ctx.db.patch(execution.strategyId, {
          status: "completed",
          nextExecutionAt: undefined,
        });
      }
    }
  },
});

/**
 * Mark execution as failed
 */
export const markExecutionFailed = internalMutation({
  args: {
    executionId: v.id("dcaExecutions"),
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.executionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
      completedAt: now,
    });

    // Update strategy stats
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      await ctx.db.patch(execution.strategyId, {
        totalExecutions: strategy.totalExecutions + 1,
        failedExecutions: strategy.failedExecutions + 1,
        lastExecutionAt: now,
        lastError: args.errorMessage,
        updatedAt: now,
      });
    }
  },
});

/**
 * Mark execution as skipped
 */
export const markExecutionSkipped = internalMutation({
  args: {
    executionId: v.id("dcaExecutions"),
    skipReason: v.union(
      v.literal("gas_too_high"),
      v.literal("price_above_limit"),
      v.literal("price_below_limit"),
      v.literal("insufficient_balance"),
      v.literal("session_expired"),
      v.literal("slippage_exceeded"),
      v.literal("manually_skipped")
    ),
    marketConditions: v.optional(
      v.object({
        tokenPriceUsd: v.number(),
        gasGwei: v.number(),
        estimatedGasUsd: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.executionId, {
      status: "skipped",
      skipReason: args.skipReason,
      marketConditions: args.marketConditions,
      completedAt: now,
    });

    // Update strategy stats
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      const updates: Record<string, unknown> = {
        totalExecutions: strategy.totalExecutions + 1,
        skippedExecutions: strategy.skippedExecutions + 1,
        lastExecutionAt: now,
        updatedAt: now,
      };

      // If session expired, mark strategy as expired
      if (args.skipReason === "session_expired") {
        updates.status = "expired";
        updates.nextExecutionAt = undefined;
      }

      await ctx.db.patch(execution.strategyId, updates);
    }
  },
});

/**
 * Update strategy's next execution time
 */
export const updateNextExecution = internalMutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    nextExecutionAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.strategyId, {
      nextExecutionAt: args.nextExecutionAt,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark strategy as failed (unrecoverable)
 */
export const markStrategyFailed = internalMutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.strategyId, {
      status: "failed",
      lastError: args.error,
      nextExecutionAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
