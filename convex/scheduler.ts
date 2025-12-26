import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Check for strategies that need execution and trigger them
 */
export const checkTriggers = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get active strategies where nextExecutionAt <= now
    const strategies = await ctx.runQuery(internal.scheduler.getReadyStrategies);

    for (const strategy of strategies) {
      try {
        // Create execution record
        const executionId = await ctx.runMutation(internal.executions.create, {
          strategyId: strategy._id,
        });

        // Call FastAPI to run the actual strategy
        const fastapiUrl = process.env.FASTAPI_URL;
        const internalKey = process.env.INTERNAL_API_KEY;

        if (fastapiUrl && internalKey) {
          const response = await fetch(`${fastapiUrl}/internal/execute`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": internalKey,
            },
            body: JSON.stringify({
              executionId,
              strategyId: strategy._id,
              config: strategy.config,
            }),
          });

          if (!response.ok) {
            console.error(`Failed to trigger execution for strategy ${strategy._id}`);
          }
        }

        // Update strategy's next execution time (simple interval for now)
        await ctx.runMutation(internal.scheduler.updateNextExecution, {
          strategyId: strategy._id,
          lastExecutedAt: now,
        });
      } catch (error) {
        console.error(`Error triggering strategy ${strategy._id}:`, error);
      }
    }
  },
});

/**
 * Get strategies ready for execution (internal query)
 */
export const getReadyStrategies = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // This would normally be a query, but we need to filter by nextExecutionAt
    // For now, we fetch all active strategies and filter in memory
    const strategies = await ctx.runQuery(internal.scheduler.getAllActiveStrategies);

    return strategies.filter(
      (s: any) => s.nextExecutionAt && s.nextExecutionAt <= now
    );
  },
});

/**
 * Get all active strategies (internal query for scheduler)
 */
import { internalQuery } from "./_generated/server";

export const getAllActiveStrategies = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("strategies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * Update strategy's next execution time
 */
export const updateNextExecution = internalMutation({
  args: {
    strategyId: v.id("strategies"),
    lastExecutedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) return;

    // Simple interval: execute again in 1 hour (placeholder)
    // In production, you'd parse the cronExpression properly
    const nextExecutionAt = args.lastExecutedAt + 3600000; // 1 hour

    await ctx.db.patch(args.strategyId, {
      lastExecutedAt: args.lastExecutedAt,
      nextExecutionAt,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clean up expired sessions
 */
export const cleanupSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deletedCount: expiredSessions.length };
  },
});

// Import v for the mutation args
import { v } from "convex/values";
