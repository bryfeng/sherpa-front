import { query } from "../_generated/server";
import { v } from "convex/values";

// Helper to verify admin session
async function verifyAdminSession(ctx: any, sessionId: string) {
  const session = await ctx.db
    .query("admin_sessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", sessionId))
    .first();

  if (!session || session.expiresAt < Date.now()) return null;

  const admin = await ctx.db.get(session.adminUserId);
  if (!admin || !admin.isActive) return null;

  return admin;
}

// Get dashboard stats
export const getDashboardStats = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return null;

    // Get counts
    const users = await ctx.db.query("users").collect();
    const strategies = await ctx.db.query("strategies").collect();
    const activeStrategies = strategies.filter((s) => s.status === "active");

    // Get transactions in last 24h
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const transactions = await ctx.db.query("transactions").collect();
    const recentTransactions = transactions.filter(
      (t) => t.createdAt > oneDayAgo
    );

    // Get failed strategy executions in last 24h
    const executions = await ctx.db.query("strategyExecutions").collect();
    const recentErrors = executions.filter(
      (e) => e.currentState === "failed" && e.createdAt > oneDayAgo
    );

    // Estimate active users (users with activity in last 24h)
    const activeWallets = new Set(
      recentTransactions.map((t) => t.walletId.toString())
    );

    return {
      totalUsers: users.length,
      activeUsers: activeWallets.size,
      totalStrategies: strategies.length,
      activeStrategies: activeStrategies.length,
      transactionCount: recentTransactions.length,
      transactionVolume: recentTransactions.reduce(
        (sum, t) => sum + (t.valueUsd || 0),
        0
      ),
      errorCount: recentErrors.length,
    };
  },
});

// Get system health
export const getSystemHealth = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return null;

    // Simple health check - database is up if we got this far
    const database = "up" as const;

    // Check for recent errors
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const executions = await ctx.db.query("strategyExecutions").collect();
    const recentExecutions = executions.filter((e) => e.createdAt > oneDayAgo);
    const recentErrors = recentExecutions.filter((e) => e.currentState === "failed");

    const errorRate =
      recentExecutions.length > 0
        ? recentErrors.length / recentExecutions.length
        : 0;

    let status: "healthy" | "degraded" | "down";
    if (errorRate > 0.5) {
      status = "down";
    } else if (errorRate > 0.1) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      database,
      api: "up" as const,
      errorRate: Math.round(errorRate * 100),
      lastChecked: Date.now(),
    };
  },
});

// Get activity feed
export const getActivityFeed = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return [];

    const limit = args.limit ?? 20;
    const events: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: number;
    }> = [];

    // Get recent users
    const users = await ctx.db.query("users").order("desc").take(5);
    for (const user of users) {
      const wallets = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      events.push({
        id: `user_${user._id}`,
        type: "user_signup",
        message: `New user registered: ${
          wallets?.address
            ? `${wallets.address.slice(0, 6)}...${wallets.address.slice(-4)}`
            : "No wallet"
        }`,
        timestamp: user.createdAt,
      });
    }

    // Get recent strategy executions
    const executions = await ctx.db
      .query("strategyExecutions")
      .order("desc")
      .take(10);

    for (const execution of executions) {
      const strategy = await ctx.db.get(execution.strategyId);
      events.push({
        id: `exec_${execution._id}`,
        type:
          execution.currentState === "failed" ? "error" : "strategy_execution",
        message:
          execution.currentState === "failed"
            ? `Strategy execution failed: ${execution.errorMessage || "Unknown error"}`
            : `Strategy "${strategy?.name || "Unknown"}" executed successfully`,
        timestamp: execution.createdAt,
      });
    }

    // Get recent transactions
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(5);

    for (const tx of transactions) {
      events.push({
        id: `tx_${tx._id}`,
        type: "transaction",
        message: `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} ${
          tx.status === "confirmed" ? "completed" : tx.status
        }${tx.valueUsd ? `: $${tx.valueUsd.toFixed(2)}` : ""}`,
        timestamp: tx.createdAt,
      });
    }

    // Get recent admin actions
    const auditLogs = await ctx.db
      .query("audit_log")
      .order("desc")
      .take(5);

    for (const log of auditLogs) {
      const adminUser = await ctx.db.get(log.adminUserId);
      events.push({
        id: `audit_${log._id}`,
        type: "admin_action",
        message: `${log.action.replace(".", " ").replace(/_/g, " ")} by ${
          adminUser?.name || "Admin"
        }`,
        timestamp: log.createdAt,
      });
    }

    // Sort by timestamp and limit
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

// Get user growth chart data
export const getUserGrowth = query({
  args: {
    sessionId: v.string(),
    period: v.union(v.literal("7d"), v.literal("30d"), v.literal("90d")),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return [];

    const periodDays = { "7d": 7, "30d": 30, "90d": 90 };
    const days = periodDays[args.period];
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const users = await ctx.db.query("users").collect();

    // Group users by date
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startTime + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    for (const user of users) {
      const date = new Date(user.createdAt);
      if (date.getTime() >= startTime) {
        const dateStr = date.toISOString().split("T")[0];
        if (dailyCounts[dateStr] !== undefined) {
          dailyCounts[dateStr]++;
        }
      }
    }

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    }));
  },
});
