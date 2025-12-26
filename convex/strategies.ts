import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";
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
 * Get a strategy by ID
 */
export const get = query({
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
    name: v.string(),
    description: v.optional(v.string()),
    config: v.any(),
    cronExpression: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("strategies", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      config: args.config,
      status: "draft",
      cronExpression: args.cronExpression,
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
 * Activate a strategy (sets it to active and schedules if cron is set)
 */
export const activate = mutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const now = Date.now();
    await ctx.db.patch(args.strategyId, {
      status: "active",
      updatedAt: now,
      // If cron expression exists, calculate next execution time
      // For now, we'll set it to run in 1 minute as a placeholder
      nextExecutionAt: strategy.cronExpression ? now + 60000 : undefined,
    });
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
