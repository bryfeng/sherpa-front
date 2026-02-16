import { query } from "../_generated/server";

/**
 * Execution health stats for the /healthz endpoint.
 * Called by the backend without admin auth — lightweight, no PII.
 */
export const getExecutionHealth = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const tenMinAgo = now - 10 * 60 * 1000;

    // Active DCA strategies
    const activeStrategies = await ctx.db
      .query("dcaStrategies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Failed executions in last 24h
    const failedExecutions = await ctx.db
      .query("dcaExecutions")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    const recentFailures = failedExecutions.filter(
      (e) => e.scheduledAt > oneDayAgo
    );

    // Stuck executions: status=running, startedAt > 10 min ago
    const runningExecutions = await ctx.db
      .query("dcaExecutions")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
    const stuckExecutions = runningExecutions.filter(
      (e) => e.startedAt != null && e.startedAt < tenMinAgo
    );

    // Most recent completed execution
    const recentCompleted = await ctx.db
      .query("dcaExecutions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .first();

    return {
      activeStrategies: activeStrategies.length,
      recentFailures24h: recentFailures.length,
      stuckExecutions: stuckExecutions.length,
      lastExecutionAt: recentCompleted?.completedAt ?? null,
    };
  },
});
