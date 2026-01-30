import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Strategy Executions - Phase 1 Manual Approval Flow
 *
 * Flow:
 * 1. Scheduler detects strategy is due for execution
 * 2. Creates execution record with currentState: "awaiting_approval"
 * 3. UI displays pending approvals widget
 * 4. User approves → signs transaction → execution completes
 */

// ============================================
// QUERIES
// ============================================

/**
 * Get all pending approvals for a wallet
 * Used by the Pending Approvals widget
 */
export const getPendingApprovals = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_wallet_state", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase()).eq("currentState", "awaiting_approval")
      )
      .order("desc")
      .collect();

    // Fetch associated strategy details for each execution
    const executionsWithStrategy = await Promise.all(
      executions.map(async (execution) => {
        const strategy = await ctx.db.get(execution.strategyId);
        return {
          ...execution,
          strategy: strategy
            ? {
                _id: strategy._id,
                name: strategy.name,
                strategyType: strategy.strategyType,
                config: strategy.config,
              }
            : null,
        };
      })
    );

    return executionsWithStrategy;
  },
});

/**
 * Get executions ready for wallet signing (state = "executing")
 * Used by the ExecutionSigning hook to prompt user for signatures
 */
export const getReadyToSign = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_wallet_state", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase()).eq("currentState", "executing")
      )
      .order("desc")
      .collect();

    // Fetch associated strategy details for each execution
    const executionsWithStrategy = await Promise.all(
      executions.map(async (execution) => {
        const strategy = await ctx.db.get(execution.strategyId);
        return {
          ...execution,
          strategy: strategy
            ? {
                _id: strategy._id,
                name: strategy.name,
                strategyType: strategy.strategyType,
                config: strategy.config,
              }
            : null,
        };
      })
    );

    return executionsWithStrategy;
  },
});

/**
 * Get a single execution with full details
 */
export const get = query({
  args: {
    executionId: v.id("strategyExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return null;

    const strategy = await ctx.db.get(execution.strategyId);
    return {
      ...execution,
      strategy,
    };
  },
});

/**
 * Get execution history for a strategy
 */
export const getByStrategy = query({
  args: {
    strategyId: v.id("strategies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .order("desc")
      .take(args.limit || 20);
  },
});

/**
 * Get all executions for a wallet (any state)
 */
export const getByWallet = query({
  args: {
    walletAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .order("desc")
      .take(args.limit || 50);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a pending execution when strategy is due
 * Called by the scheduler/cron when nextExecutionAt <= now
 */
export const createPendingExecution = mutation({
  args: {
    strategyId: v.id("strategies"),
    approvalReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const now = Date.now();

    // Create execution record awaiting approval
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
          reason: args.approvalReason || "Scheduled execution ready",
        },
      ],
      requiresApproval: true,
      approvalReason: args.approvalReason || generateApprovalReason(strategy),
      recoverable: true,
      createdAt: now,
    });

    // Update strategy's last execution tracking
    await ctx.db.patch(args.strategyId, {
      updatedAt: now,
    });

    return executionId;
  },
});

/**
 * Approve an execution - user has reviewed and wants to proceed
 */
export const approve = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    approverAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.currentState !== "awaiting_approval") {
      throw new Error(`Cannot approve execution in state: ${execution.currentState}`);
    }

    const now = Date.now();

    // Update execution to approved state (ready for user to sign)
    await ctx.db.patch(args.executionId, {
      currentState: "executing",
      stateEnteredAt: now,
      approvedBy: args.approverAddress.toLowerCase(),
      approvedAt: now,
      startedAt: now,
      stateHistory: [
        ...execution.stateHistory,
        {
          id: `sh_${now}`,
          fromState: "awaiting_approval",
          toState: "executing",
          trigger: "user_approved",
          timestamp: now,
          reason: `Approved by ${args.approverAddress}`,
        },
      ],
    });

    return { success: true };
  },
});

/**
 * Skip/reject an execution - user doesn't want to execute this time
 */
export const skip = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.currentState !== "awaiting_approval") {
      throw new Error(`Cannot skip execution in state: ${execution.currentState}`);
    }

    const now = Date.now();

    // Mark execution as cancelled
    await ctx.db.patch(args.executionId, {
      currentState: "cancelled",
      stateEnteredAt: now,
      completedAt: now,
      stateHistory: [
        ...execution.stateHistory,
        {
          id: `sh_${now}`,
          fromState: "awaiting_approval",
          toState: "cancelled",
          trigger: "user_skipped",
          timestamp: now,
          reason: args.reason || "User skipped this execution",
        },
      ],
    });

    // Schedule next execution for the strategy
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy && strategy.status === "active" && strategy.cronExpression) {
      const nextExecution = calculateNextExecution(strategy.cronExpression);
      await ctx.db.patch(execution.strategyId, {
        nextExecutionAt: nextExecution,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Mark execution as completed (called after successful tx)
 */
export const complete = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    txHash: v.optional(v.string()),
    outputData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    const now = Date.now();

    // Mark execution as completed
    await ctx.db.patch(args.executionId, {
      currentState: "completed",
      stateEnteredAt: now,
      completedAt: now,
      metadata: {
        ...(execution.metadata || {}),
        txHash: args.txHash,
        outputData: args.outputData,
      },
      stateHistory: [
        ...execution.stateHistory,
        {
          id: `sh_${now}`,
          fromState: execution.currentState,
          toState: "completed",
          trigger: "execution_success",
          timestamp: now,
          reason: args.txHash ? `Transaction: ${args.txHash}` : "Completed successfully",
        },
      ],
    });

    // Update strategy stats
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      const nextExecution = strategy.cronExpression
        ? calculateNextExecution(strategy.cronExpression)
        : undefined;

      await ctx.db.patch(execution.strategyId, {
        lastExecutedAt: now,
        nextExecutionAt: nextExecution,
        totalExecutions: (strategy.totalExecutions || 0) + 1,
        successfulExecutions: (strategy.successfulExecutions || 0) + 1,
        lastError: undefined,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Mark execution as failed
 */
export const fail = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
    recoverable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    const now = Date.now();

    // Mark execution as failed
    await ctx.db.patch(args.executionId, {
      currentState: "failed",
      stateEnteredAt: now,
      completedAt: now,
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
      recoverable: args.recoverable ?? false,
      stateHistory: [
        ...execution.stateHistory,
        {
          id: `sh_${now}`,
          fromState: execution.currentState,
          toState: "failed",
          trigger: "execution_error",
          timestamp: now,
          errorMessage: args.errorMessage,
          errorCode: args.errorCode,
        },
      ],
    });

    // Update strategy stats
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      await ctx.db.patch(execution.strategyId, {
        failedExecutions: (strategy.failedExecutions || 0) + 1,
        lastError: args.errorMessage,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Generic state transition for execution state machine
 * Phase 13: Used by GenericStrategyExecutor for flexible state updates
 */
// Valid execution states
const executionStates = v.union(
  v.literal("idle"),
  v.literal("analyzing"),
  v.literal("planning"),
  v.literal("awaiting_approval"),
  v.literal("executing"),
  v.literal("monitoring"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("paused"),
  v.literal("cancelled")
);

export const transitionState = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    toState: executionStates,
    trigger: v.string(),
    reason: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    const now = Date.now();

    // Build new state history entry
    const newHistoryEntry = {
      id: `sh_${now}`,
      fromState: execution.currentState,
      toState: args.toState,
      trigger: args.trigger,
      timestamp: now,
      reason: args.reason,
      context: args.context,
    };

    // Update execution with new state
    await ctx.db.patch(args.executionId, {
      currentState: args.toState,
      stateEnteredAt: now,
      stateHistory: [...execution.stateHistory, newHistoryEntry],
      metadata: args.context
        ? { ...(execution.metadata || {}), lastTransitionContext: args.context }
        : execution.metadata,
    });

    return { success: true, newState: args.toState };
  },
});

// ============================================
// HELPERS
// ============================================

/**
 * Generate a human-readable approval reason based on strategy
 */
function generateApprovalReason(strategy: {
  name: string;
  strategyType: string;
  config: unknown;
}): string {
  const config = strategy.config as Record<string, unknown>;

  switch (strategy.strategyType) {
    case "dca": {
      const amount = config.amountPerExecution || config.amount || "?";
      const fromToken = (config.fromToken as { symbol?: string })?.symbol || "tokens";
      const toToken = (config.toToken as { symbol?: string })?.symbol || "tokens";
      return `Buy ${toToken} with ${amount} ${fromToken}`;
    }

    case "rebalance":
      return `Rebalance portfolio to target allocation`;

    case "limit_order":
      return `Execute limit order when price conditions met`;

    case "stop_loss":
      return `Execute stop loss order`;

    case "take_profit":
      return `Execute take profit order`;

    default:
      return `Execute ${strategy.name}`;
  }
}

/**
 * Calculate next execution time from cron expression
 * Simple implementation - production would use a proper cron parser
 */
function calculateNextExecution(cronExpression: string): number {
  // For now, parse simple patterns or default to 24 hours
  const now = Date.now();

  // Pattern: "*/X * * * *" = every X minutes
  const minuteMatch = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);
    return now + minutes * 60 * 1000;
  }

  // Pattern: "0 */X * * *" = every X hours
  const hourMatch = cronExpression.match(/^0 \*\/(\d+) \* \* \*$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    return now + hours * 60 * 60 * 1000;
  }

  // Pattern: "0 0 */X * *" = every X days
  const dayMatch = cronExpression.match(/^0 0 \*\/(\d+) \* \*$/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return now + days * 24 * 60 * 60 * 1000;
  }

  // Default: 24 hours
  return now + 24 * 60 * 60 * 1000;
}

// ============================================
// SCHEDULER FUNCTIONS
// ============================================

/**
 * Check for strategies that are due for execution and create pending approvals
 * This should be called by a cron job or scheduler (e.g., every minute)
 */
export const checkDueStrategies = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all active strategies where nextExecutionAt <= now
    const activeStrategies = await ctx.db
      .query("strategies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const dueStrategies = activeStrategies.filter(
      (s) => s.nextExecutionAt && s.nextExecutionAt <= now
    );

    const results: { strategyId: string; executionId?: string; error?: string }[] = [];

    for (const strategy of dueStrategies) {
      // Check if there's already a pending execution for this strategy
      const existingPending = await ctx.db
        .query("strategyExecutions")
        .withIndex("by_strategy", (q) => q.eq("strategyId", strategy._id))
        .filter((q) => q.eq(q.field("currentState"), "awaiting_approval"))
        .first();

      if (existingPending) {
        // Skip - already has a pending execution
        results.push({
          strategyId: strategy._id,
          error: "Already has pending execution",
        });
        continue;
      }

      // Create new pending execution
      try {
        const executionId = await ctx.db.insert("strategyExecutions", {
          strategyId: strategy._id,
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
          approvalReason: generateApprovalReason(strategy),
          recoverable: true,
          createdAt: now,
        });

        // Update strategy's next execution time (so we don't create duplicates)
        const nextExecution = strategy.cronExpression
          ? calculateNextExecution(strategy.cronExpression)
          : undefined;

        await ctx.db.patch(strategy._id, {
          nextExecutionAt: nextExecution,
          updatedAt: now,
        });

        results.push({ strategyId: strategy._id, executionId });
      } catch (error: any) {
        results.push({ strategyId: strategy._id, error: error.message });
      }
    }

    return {
      checked: activeStrategies.length,
      due: dueStrategies.length,
      created: results.filter((r) => r.executionId).length,
      results,
    };
  },
});

/**
 * Execute Now - Immediately create a pending execution for user approval
 * This allows users to manually trigger a strategy execution instead of waiting
 * for the scheduled time.
 */
export const executeNow = mutation({
  args: {
    strategyId: v.id("strategies"),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    // Check strategy is active or draft
    if (strategy.status !== "active" && strategy.status !== "draft") {
      throw new Error(`Cannot execute strategy in status: ${strategy.status}`);
    }

    // Check if there's already a pending execution
    const existingPending = await ctx.db
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

    if (existingPending) {
      throw new Error("Strategy already has a pending execution. Please approve or skip it first.");
    }

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
          trigger: "manual_execute_now",
          timestamp: now,
          reason: "User requested immediate execution",
        },
      ],
      requiresApproval: true,
      approvalReason,
      recoverable: true,
      createdAt: now,
    });

    // If strategy was in draft, activate it
    if (strategy.status === "draft") {
      await ctx.db.patch(args.strategyId, {
        status: "active",
        requiresManualApproval: true,
        updatedAt: now,
      });
    }

    return { executionId, approvalReason };
  },
});

/**
 * Get statistics about pending executions
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const awaitingApproval = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_state", (q) => q.eq("currentState", "awaiting_approval"))
      .collect();

    const executing = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_state", (q) => q.eq("currentState", "executing"))
      .collect();

    // Get oldest pending execution
    const oldestPending = awaitingApproval.reduce(
      (oldest, exec) => (exec.createdAt < oldest ? exec.createdAt : oldest),
      Date.now()
    );

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      pendingCount: awaitingApproval.length,
      executingCount: executing.length,
      oldestPendingAge: awaitingApproval.length > 0 ? now - oldestPending : 0,
      urgentCount: awaitingApproval.filter((e) => e.createdAt < oneHourAgo).length,
      overdueeCount: awaitingApproval.filter((e) => e.createdAt < oneDayAgo).length,
    };
  },
});
