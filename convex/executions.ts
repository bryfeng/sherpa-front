import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List executions for a strategy
 */
export const listByStrategy = query({
  args: {
    strategyId: v.id("strategies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * Get an execution by ID with its decisions
 */
export const getWithDecisions = query({
  args: { executionId: v.id("strategyExecutions") },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return null;

    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .order("asc")
      .collect();

    return { ...execution, decisions };
  },
});

/**
 * Create a new execution (internal - called by scheduler or actions)
 */
export const create = internalMutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("strategyExecutions", {
      strategyId: args.strategyId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Start an execution
 */
export const start = mutation({
  args: { executionId: v.id("strategyExecutions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      startedAt: Date.now(),
    });
  },
});

/**
 * Complete an execution successfully
 */
export const complete = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.executionId, {
      status: "completed",
      completedAt: now,
      result: args.result,
    });

    // Update the strategy's lastExecutedAt
    const execution = await ctx.db.get(args.executionId);
    if (execution) {
      const strategy = await ctx.db.get(execution.strategyId);
      if (strategy) {
        await ctx.db.patch(execution.strategyId, {
          lastExecutedAt: now,
          // Calculate next execution time based on cron (placeholder: 1 hour)
          nextExecutionAt: strategy.cronExpression
            ? now + 3600000
            : undefined,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Fail an execution
 */
export const fail = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "failed",
      completedAt: Date.now(),
      error: args.error,
    });
  },
});

/**
 * Add an agent decision to an execution
 */
export const addDecision = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    decisionType: v.string(),
    inputContext: v.any(),
    reasoning: v.string(),
    actionTaken: v.any(),
    riskAssessment: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentDecisions", {
      executionId: args.executionId,
      decisionType: args.decisionType,
      inputContext: args.inputContext,
      reasoning: args.reasoning,
      actionTaken: args.actionTaken,
      riskAssessment: args.riskAssessment,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get running executions (for monitoring)
 */
export const getRunning = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
  },
});

/**
 * Get recent failed executions (for monitoring)
 */
export const getRecentFailed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(args.limit || 10);
  },
});
