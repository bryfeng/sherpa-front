import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Check for strategies that need execution and trigger them
 */
export const checkTriggers = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const now = Date.now();

    // Get all active strategies
    const strategies: Doc<"strategies">[] = await ctx.runQuery(
      internal.scheduler.getAllActiveStrategies
    );

    // Filter to ones ready for execution
    const readyStrategies = strategies.filter(
      (s) => s.nextExecutionAt && s.nextExecutionAt <= now
    );

    for (const strategy of readyStrategies) {
      try {
        // Get wallet address for the strategy's user
        const wallet = await ctx.runQuery(internal.scheduler.getWalletForUser, {
          userId: strategy.userId,
        });
        const walletAddress = wallet?.address || "0x0000000000000000000000000000000000000000";

        // Create execution record
        const executionId = await ctx.runMutation(internal.executions.createInternal, {
          strategyId: strategy._id,
          walletAddress,
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
            console.error(
              `Failed to trigger execution for strategy ${strategy._id}`
            );
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
 * Get all active strategies (internal query for scheduler)
 */
export const getAllActiveStrategies = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"strategies">[]> => {
    return await ctx.db
      .query("strategies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * Get primary wallet for a user (internal query for scheduler)
 */
export const getWalletForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"wallets"> | null> => {
    // Try to get primary wallet first
    const primaryWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    if (primaryWallet) return primaryWallet;

    // Fall back to any wallet
    return await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
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
  handler: async (ctx, args): Promise<void> => {
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
  handler: async (ctx): Promise<{ deletedCount: number }> => {
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

/**
 * Clean up expired nonces
 */
export const cleanupNonces = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const now = Date.now();

    const expiredNonces = await ctx.db
      .query("nonces")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    for (const nonce of expiredNonces) {
      await ctx.db.delete(nonce._id);
    }

    return { deletedCount: expiredNonces.length };
  },
});

/**
 * Clean up old rate limit records
 */
export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const now = Date.now();
    // Delete records older than 1 hour (they're no longer needed)
    const cutoff = now - 60 * 60 * 1000;

    const allRecords = await ctx.db.query("rateLimits").collect();

    let deletedCount = 0;
    for (const record of allRecords) {
      const windowEnd = record.windowStart + record.windowSeconds * 1000;
      if (windowEnd < cutoff) {
        await ctx.db.delete(record._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});

/**
 * Check for DCA strategies due for execution
 */
export const checkDCAStrategies = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const now = Date.now();

    // Get all active DCA strategies due for execution
    const dueStrategies = await ctx.runQuery(
      internal.scheduler.getDueDCAStrategies,
      { beforeTimestamp: now }
    );

    if (dueStrategies.length === 0) {
      return;
    }

    console.log(`Found ${dueStrategies.length} DCA strategies due for execution`);

    for (const strategy of dueStrategies) {
      try {
        // Call FastAPI to execute the DCA
        const fastapiUrl = process.env.FASTAPI_URL;
        const internalKey = process.env.INTERNAL_API_KEY;

        if (fastapiUrl && internalKey) {
          const response = await fetch(`${fastapiUrl}/internal/dca/execute`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": internalKey,
            },
            body: JSON.stringify({
              strategyId: strategy._id,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Failed to execute DCA strategy ${strategy._id}: ${response.status} ${errorText}`
            );

            // Mark strategy as having an error (don't stop it though)
            await ctx.runMutation(internal.scheduler.recordDCAError, {
              strategyId: strategy._id,
              error: `HTTP ${response.status}: ${errorText}`,
            });
          } else {
            console.log(`Successfully triggered DCA execution for ${strategy._id}`);
          }
        } else {
          console.error("FASTAPI_URL or INTERNAL_API_KEY not configured");
        }
      } catch (error) {
        console.error(`Error executing DCA strategy ${strategy._id}:`, error);

        // Record error but continue with other strategies
        await ctx.runMutation(internal.scheduler.recordDCAError, {
          strategyId: strategy._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
});

/**
 * Get DCA strategies due for execution
 */
export const getDueDCAStrategies = internalQuery({
  args: { beforeTimestamp: v.number() },
  handler: async (ctx, args) => {
    // Get active strategies with nextExecutionAt <= now
    const strategies = await ctx.db
      .query("dcaStrategies")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("nextExecutionAt"), args.beforeTimestamp)
        )
      )
      .take(50); // Process max 50 per minute

    return strategies;
  },
});

/**
 * Record DCA execution error (without stopping the strategy)
 */
export const recordDCAError = internalMutation({
  args: {
    strategyId: v.id("dcaStrategies"),
    error: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.strategyId, {
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Trigger news fetch from RSS and API sources
 */
export const fetchNews = internalAction({
  args: {},
  handler: async (): Promise<void> => {
    const fastapiUrl = process.env.FASTAPI_URL;
    const internalKey = process.env.INTERNAL_API_KEY;

    if (!fastapiUrl || !internalKey) {
      console.error("FASTAPI_URL or INTERNAL_API_KEY not configured for news fetch");
      return;
    }

    try {
      const response = await fetch(`${fastapiUrl}/news/internal/fetch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": internalKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`News fetch failed: ${response.status} ${errorText}`);
      } else {
        const result = await response.json();
        console.log(`News fetch complete: ${result.new} new items, ${result.processed} processed`);
      }
    } catch (error) {
      console.error("Error triggering news fetch:", error);
    }
  },
});

/**
 * Trigger LLM processing of unprocessed news
 */
export const processNews = internalAction({
  args: {},
  handler: async (): Promise<void> => {
    const fastapiUrl = process.env.FASTAPI_URL;
    const internalKey = process.env.INTERNAL_API_KEY;

    if (!fastapiUrl || !internalKey) {
      console.error("FASTAPI_URL or INTERNAL_API_KEY not configured for news processing");
      return;
    }

    try {
      const response = await fetch(`${fastapiUrl}/news/internal/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": internalKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`News processing failed: ${response.status} ${errorText}`);
      } else {
        const result = await response.json();
        console.log(`News processing complete: ${result.processed} items processed`);
      }
    } catch (error) {
      console.error("Error triggering news processing:", error);
    }
  },
});

/**
 * Clean up expired session keys
 */
export const cleanupSessionKeys = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ expiredCount: number; deletedCount: number }> => {
    const now = Date.now();

    // Mark expired sessions
    const activeSessions = await ctx.db
      .query("sessionKeys")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let expiredCount = 0;
    for (const session of activeSessions) {
      if (session.expiresAt < now) {
        await ctx.db.patch(session._id, {
          status: "expired",
        });
        expiredCount++;
      }
    }

    // Delete old sessions (expired or revoked more than 30 days ago)
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const allSessions = await ctx.db.query("sessionKeys").collect();

    let deletedCount = 0;
    for (const session of allSessions) {
      const shouldDelete =
        (session.status === "expired" && session.expiresAt < cutoff) ||
        (session.status === "revoked" && session.revokedAt && session.revokedAt < cutoff);

      if (shouldDelete) {
        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }

    return { expiredCount, deletedCount };
  },
});
