import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Check for strategies that need execution and trigger them
 *
 * Phase 1 (Manual Approval): If requiresManualApproval is true, creates a pending
 * execution that the user must approve before wallet signing.
 *
 * Phase 2 (Session Keys): If strategy has a valid session key, auto-executes
 * without requiring manual approval.
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
        // Phase 2: Smart Session auto-execution bypass
        // If strategy has a valid smart session, skip manual approval entirely
        if (strategy.smartSessionId) {
          const session = await ctx.runQuery(
            internal.scheduler.validateSmartSession,
            { smartSessionId: strategy.smartSessionId }
          );

          if (session?.valid) {
            // Check if there's already a pending execution
            const hasPending = await ctx.runQuery(
              internal.scheduler.hasPendingExecution,
              { strategyId: strategy._id }
            );
            if (hasPending) {
              console.log(`Strategy ${strategy._id} already has pending execution, skipping`);
              continue;
            }

            // Policy pre-check: call backend to evaluate before executing
            const fastapiUrl = process.env.FASTAPI_URL;
            const internalKey = process.env.INTERNAL_API_KEY;

            if (fastapiUrl && internalKey) {
              const config = strategy.config as Record<string, unknown>;
              const policyResponse = await fetch(`${fastapiUrl}/policy/internal/evaluate`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Internal-Key": internalKey,
                },
                body: JSON.stringify({
                  sessionId: strategy.smartSessionId,
                  walletAddress: strategy.walletAddress,
                  actionType: "swap",
                  chainId: (config.chainId as number) || 1,
                  valueUsd: (config.amount_usd as number) || 0,
                  tokenIn: (config.from_token as string) || undefined,
                  tokenOut: (config.to_token as string) || undefined,
                }),
              });

              if (policyResponse.ok) {
                const policyResult = await policyResponse.json();
                if (!policyResult.approved) {
                  console.log(
                    `Strategy ${strategy._id} blocked by policy: ${policyResult.violations?.[0]?.message || "policy violation"}`
                  );
                  await ctx.runMutation(internal.scheduler.updateNextExecution, {
                    strategyId: strategy._id,
                    lastExecutedAt: now,
                  });
                  continue;
                }
              }
              // If policy check fails (network error), proceed with execution
              // The backend executor has its own policy checks as a fallback
            }

            // Create auto-approved execution
            const executionId = await ctx.runMutation(
              internal.scheduler.createAutoApprovedExecution,
              { strategyId: strategy._id }
            );

            // Call backend to execute via intent
            if (fastapiUrl && internalKey) {
              // Calls: backend/app/api/strategies.py:internal_execute
              const response = await fetch(`${fastapiUrl}/strategies/internal/execute`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Internal-Key": internalKey,
                },
                body: JSON.stringify({
                  executionId,
                  strategyId: strategy._id,
                }),
              });

              if (!response.ok) {
                console.error(
                  `Failed to auto-execute strategy ${strategy._id}: ${response.status}`
                );
              } else {
                console.log(`Auto-executed strategy ${strategy._id} via smart session`);
              }
            }

            await ctx.runMutation(internal.scheduler.updateNextExecution, {
              strategyId: strategy._id,
              lastExecutedAt: now,
            });
            continue;
          }
          // If session invalid, fall through to manual approval
        }

        // Check if this strategy requires manual approval (Phase 1)
        if (strategy.requiresManualApproval) {
          // Check if there's already a pending execution for this strategy
          const hasPending = await ctx.runQuery(
            internal.scheduler.hasPendingExecution,
            { strategyId: strategy._id }
          );

          if (hasPending) {
            console.log(`Strategy ${strategy._id} already has pending execution, skipping`);
            continue;
          }

          // Create pending execution for user approval
          await ctx.runMutation(internal.scheduler.createPendingExecution, {
            strategyId: strategy._id,
          });

          console.log(`Created pending execution for strategy ${strategy._id} (requires approval)`);

          // Update next execution time so we don't create duplicates
          await ctx.runMutation(internal.scheduler.updateNextExecution, {
            strategyId: strategy._id,
            lastExecutedAt: now,
          });

          continue;
        }

        // Phase 2: Auto-execution with session key
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
          // Calls: backend/app/api/strategies.py:internal_execute
          const response = await fetch(`${fastapiUrl}/strategies/internal/execute`, {
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
 * Check if a strategy has a pending execution (awaiting_approval or executing)
 */
export const hasPendingExecution = internalQuery({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args): Promise<boolean> => {
    const pending = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .filter((q) =>
        q.or(
          q.eq(q.field("currentState"), "awaiting_approval"),
          q.eq(q.field("currentState"), "executing"),
          q.eq(q.field("currentState"), "monitoring")
        )
      )
      .first();

    return pending !== null;
  },
});

/**
 * Create a pending execution for manual approval
 */
export const createPendingExecution = internalMutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args): Promise<string> => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const now = Date.now();

    // Generate approval reason based on strategy type
    const config = strategy.config as Record<string, unknown>;
    let approvalReason = `Execute ${strategy.name}`;

    if (strategy.strategyType === "dca") {
      const amount = config.amountPerExecution || config.amount || "?";
      const fromToken = (config.fromToken as { symbol?: string })?.symbol || "tokens";
      const toToken = (config.toToken as { symbol?: string })?.symbol || "tokens";
      approvalReason = `Buy ${toToken} with ${amount} ${fromToken}`;
    }

    // Create execution in awaiting_approval state
    const executionId = await ctx.db.insert("strategyExecutions", {
      strategyId: args.strategyId,
      walletAddress: strategy.walletAddress.toLowerCase(),
      currentState: "awaiting_approval",
      stateEnteredAt: now,
      steps: [],
      currentStepIndex: 0,
      stateHistory: [
        {
          id: `sh_${now}`,
          fromState: "idle",
          toState: "awaiting_approval",
          trigger: "scheduled_execution",
          timestamp: now,
          reason: "Scheduled execution ready",
        },
      ],
      requiresApproval: true,
      approvalReason,
      recoverable: true,
      createdAt: now,
    });

    return executionId;
  },
});

/**
 * Validate a smart session is still active and not expired
 */
export const validateSmartSession = internalQuery({
  args: { smartSessionId: v.string() },
  handler: async (ctx, args): Promise<{ valid: boolean } | null> => {
    const now = Date.now();

    // Find session by sessionId
    const session = await ctx.db
      .query("smartSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.smartSessionId))
      .first();

    if (!session) return null;

    const valid =
      session.status === "active" && session.validUntil > now;

    return { valid };
  },
});

/**
 * Create an auto-approved execution (for smart session auto-execution)
 */
export const createAutoApprovedExecution = internalMutation({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args): Promise<string> => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const now = Date.now();

    const executionId = await ctx.db.insert("strategyExecutions", {
      strategyId: args.strategyId,
      walletAddress: strategy.walletAddress.toLowerCase(),
      currentState: "executing",
      stateEnteredAt: now,
      steps: [],
      currentStepIndex: 0,
      stateHistory: [
        {
          id: `sh_${now}`,
          fromState: "idle",
          toState: "executing",
          trigger: "smart_session_auto_execute",
          timestamp: now,
          reason: "Auto-executed via smart session",
        },
      ],
      requiresApproval: false,
      approvedBy: "smart_session",
      approvedAt: now,
      startedAt: now,
      recoverable: true,
      createdAt: now,
    });

    return executionId;
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
          // Calls: backend/app/api/dca.py:internal_execute
          // Contract test: backend/tests/contract/test_convex_api_contracts.py
          const response = await fetch(`${fastapiUrl}/dca/internal/execute`, {
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

/**
 * Reset daily limits for copy trading relationships
 * Called at midnight UTC via cron
 */
export const resetCopyTradingDailyLimits = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const result = await ctx.runMutation(internal.copyTrading.resetDailyLimits);
    console.log(`Reset daily limits for ${result.resetCount} copy trading relationships`);
  },
});
