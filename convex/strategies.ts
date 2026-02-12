import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * List strategies for a user
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("strategies")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * List strategies by wallet address
 * Used by agent tools to query strategies without needing userId
 */
export const listByWallet = query({
  args: {
    walletAddress: v.string(),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    // First, find the wallet to get the userId
    // Note: by_address_chain index requires both address and chain, so we filter manually
    const wallets = await ctx.db
      .query("wallets")
      .filter((q) => q.eq(q.field("address"), args.walletAddress.toLowerCase()))
      .collect();
    const wallet = wallets[0];

    if (!wallet) {
      return [];
    }

    // Then query strategies by userId
    if (args.status) {
      return await ctx.db
        .query("strategies")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", wallet.userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", wallet.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a strategy by ID
 */
export const get = query({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.strategyId);
  },
});

/**
 * Internal: get a strategy by ID (for use from internalActions).
 * Called by: scheduler.ts:triggerSmartSessionExecution
 */
export const getById = internalQuery({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.strategyId);
  },
});

/**
 * Get a strategy with its recent executions
 */
export const getWithExecutions = query({
  args: {
    strategyId: v.id("strategies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) return null;

    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .order("desc")
      .take(args.limit || 10);

    return { ...strategy, executions };
  },
});

/**
 * Create a new strategy
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    walletAddress: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    strategyType: v.union(
      v.literal("dca"),
      v.literal("rebalance"),
      v.literal("limit_order"),
      v.literal("stop_loss"),
      v.literal("take_profit"),
      v.literal("custom")
    ),
    config: v.any(),
    cronExpression: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("strategies", {
      userId: args.userId,
      walletAddress: args.walletAddress.toLowerCase(),
      name: args.name,
      description: args.description,
      strategyType: args.strategyType,
      config: args.config,
      status: "draft",
      cronExpression: args.cronExpression,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a strategy
 */
export const update = mutation({
  args: {
    strategyId: v.id("strategies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    config: v.optional(v.any()),
    cronExpression: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { strategyId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(strategyId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update strategy status
 */
export const updateStatus = mutation({
  args: {
    strategyId: v.id("strategies"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.strategyId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Activate a strategy
 *
 * Phase 1 (Manual Approval): Activates the strategy and schedules the next execution.
 * Each execution will require manual user approval via the chat interface.
 *
 * Phase 2 (Session Keys): If a valid session key is provided, executions can happen
 * automatically without manual approval.
 */
export const activate = mutation({
  args: {
    strategyId: v.id("strategies"),
    sessionKeyId: v.optional(v.id("sessionKeys")),
    smartSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const now = Date.now();

    // Check if smart session (Rhinestone) is provided
    if (args.smartSessionId) {
      // Validate smart session is active
      const sessions = await ctx.db
        .query("smartSessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.smartSessionId!))
        .collect();
      const session = sessions[0];
      if (!session || session.status !== "active") {
        throw new Error("Smart session not found or not active");
      }

      // Calculate next execution time
      const config = strategy.config as Record<string, unknown>;
      const frequency = config.frequency as string | undefined;
      let nextExecutionAt: number | undefined;
      if (frequency) {
        nextExecutionAt = now + 60000;
      }

      await ctx.db.patch(args.strategyId, {
        status: "active",
        requiresManualApproval: false,
        smartSessionId: args.smartSessionId,
        updatedAt: now,
        nextExecutionAt,
      });
      return;
    }

    // Check if legacy session key is provided and valid
    let validSessionKey = false;
    if (args.sessionKeyId) {
      const sessionKey = await ctx.db.get(args.sessionKeyId);
      if (sessionKey && sessionKey.status === "active") {
        // Check if session key hasn't expired
        if (!sessionKey.expiresAt || sessionKey.expiresAt > now) {
          validSessionKey = true;
        }
      }
    }

    // Calculate next execution time based on frequency
    const config = strategy.config as Record<string, unknown>;
    const frequency = config.frequency as string | undefined;
    let nextExecutionAt: number | undefined;

    if (frequency) {
      // Schedule first execution for 1 minute from now (for demo/testing)
      // In production, this would be based on the cron expression or frequency
      nextExecutionAt = now + 60000;
    }

    if (validSessionKey && args.sessionKeyId) {
      // Fully activate with session key (auto-execution enabled)
      await ctx.db.patch(args.strategyId, {
        status: "active",
        sessionKeyId: args.sessionKeyId,
        requiresManualApproval: false,
        updatedAt: now,
        nextExecutionAt,
      });
    } else {
      // Activate with manual approval mode (Phase 1)
      // Strategy is active but each execution requires user confirmation
      await ctx.db.patch(args.strategyId, {
        status: "active",
        requiresManualApproval: true,
        updatedAt: now,
        nextExecutionAt,
      });
    }
  },
});

/**
 * Pause a strategy
 */
export const pause = mutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.strategyId, {
      status: "paused",
      nextExecutionAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get active strategies that need execution
 */
export const getReadyForExecution = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get active strategies where nextExecutionAt <= now
    const strategies = await ctx.db
      .query("strategies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return strategies.filter(
      (s) => s.nextExecutionAt && s.nextExecutionAt <= now
    );
  },
});

/**
 * Delete a strategy and all its executions
 */
export const remove = mutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    // Delete all executions first
    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .collect();

    for (const execution of executions) {
      // Delete agent decisions for this execution
      const decisions = await ctx.db
        .query("agentDecisions")
        .withIndex("by_execution", (q) => q.eq("executionId", execution._id))
        .collect();

      for (const decision of decisions) {
        await ctx.db.delete(decision._id);
      }

      await ctx.db.delete(execution._id);
    }

    // Delete strategy
    await ctx.db.delete(args.strategyId);
  },
});
