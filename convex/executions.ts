import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// State Machine Types
// ============================================

const stateValidator = v.union(
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

const stepValidator = v.object({
  id: v.string(),
  stepNumber: v.number(),
  description: v.string(),
  actionType: v.string(),
  status: v.string(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  inputData: v.optional(v.any()),
  outputData: v.optional(v.any()),
  txHash: v.optional(v.string()),
  chainId: v.optional(v.number()),
  gasUsed: v.optional(v.number()),
  gasPriceGwei: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
});

const transitionValidator = v.object({
  id: v.string(),
  fromState: v.string(),
  toState: v.string(),
  trigger: v.string(),
  timestamp: v.number(),
  reason: v.optional(v.string()),
  context: v.optional(v.any()),
  errorMessage: v.optional(v.string()),
  errorCode: v.optional(v.string()),
});

// ============================================
// Queries
// ============================================

/**
 * Get an execution by ID
 */
export const get = query({
  args: { executionId: v.id("strategyExecutions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId);
  },
});

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
 * Get active executions for a wallet
 */
export const listActiveByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const activeStates = [
      "analyzing",
      "planning",
      "awaiting_approval",
      "executing",
      "monitoring",
    ];

    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .collect();

    return executions.filter((e) => activeStates.includes(e.currentState));
  },
});

/**
 * Get executions by state
 */
export const listByState = query({
  args: {
    state: stateValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("strategyExecutions")
      .withIndex("by_state", (q) => q.eq("currentState", args.state))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get running executions (for monitoring)
 */
export const getRunning = query({
  args: {},
  handler: async (ctx) => {
    const activeStates = ["analyzing", "planning", "executing", "monitoring"];
    const executions = await ctx.db.query("strategyExecutions").collect();
    return executions.filter((e) => activeStates.includes(e.currentState));
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
      .withIndex("by_state", (q) => q.eq("currentState", "failed"))
      .order("desc")
      .take(args.limit || 10);
  },
});

/**
 * Get executions awaiting approval
 */
export const getAwaitingApproval = query({
  args: { walletAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("strategyExecutions")
      .withIndex("by_state", (q) => q.eq("currentState", "awaiting_approval"))
      .collect();

    if (args.walletAddress) {
      return executions.filter((e) => e.walletAddress === args.walletAddress);
    }
    return executions;
  },
});

// ============================================
// Mutations - Creation
// ============================================

/**
 * Create a new execution
 */
export const create = mutation({
  args: {
    strategyId: v.id("strategies"),
    walletAddress: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("strategyExecutions", {
      strategyId: args.strategyId,
      walletAddress: args.walletAddress,
      currentState: "idle",
      stateEnteredAt: now,
      steps: [],
      currentStepIndex: 0,
      stateHistory: [],
      requiresApproval: false,
      recoverable: true,
      metadata: args.metadata,
      createdAt: now,
    });
  },
});

/**
 * Create a new execution (internal - called by scheduler or actions)
 */
export const createInternal = internalMutation({
  args: {
    strategyId: v.id("strategies"),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("strategyExecutions", {
      strategyId: args.strategyId,
      walletAddress: args.walletAddress,
      currentState: "idle",
      stateEnteredAt: now,
      steps: [],
      currentStepIndex: 0,
      stateHistory: [],
      requiresApproval: false,
      recoverable: true,
      createdAt: now,
    });
  },
});

// ============================================
// Mutations - State Machine
// ============================================

/**
 * Update execution state (called by state machine)
 */
export const updateState = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    currentState: stateValidator,
    stateEnteredAt: v.number(),
    transition: transitionValidator,
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    recoverable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    // Add transition to history
    const stateHistory = [...execution.stateHistory, args.transition];

    const updates: Record<string, unknown> = {
      currentState: args.currentState,
      stateEnteredAt: args.stateEnteredAt,
      stateHistory,
    };

    if (args.startedAt !== undefined) updates.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    if (args.errorCode !== undefined) updates.errorCode = args.errorCode;
    if (args.recoverable !== undefined) updates.recoverable = args.recoverable;

    await ctx.db.patch(args.executionId, updates);

    // Update strategy lastExecutedAt on completion
    if (args.currentState === "completed") {
      const strategy = await ctx.db.get(execution.strategyId);
      if (strategy) {
        const now = Date.now();
        await ctx.db.patch(execution.strategyId, {
          lastExecutedAt: now,
          nextExecutionAt: strategy.cronExpression ? now + 3600000 : undefined,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Update execution steps
 */
export const updateSteps = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    steps: v.array(stepValidator),
    currentStepIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      steps: args.steps,
      currentStepIndex: args.currentStepIndex,
    });
  },
});

/**
 * Set approval info
 */
export const setApproval = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    requiresApproval: v.boolean(),
    approvalReason: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      requiresApproval: args.requiresApproval,
      approvalReason: args.approvalReason,
      approvedBy: args.approvedBy,
      approvedAt: args.approvedAt,
    });
  },
});

/**
 * Full state sync (for recovery/debugging)
 */
export const syncState = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    currentState: stateValidator,
    stateEnteredAt: v.number(),
    steps: v.array(stepValidator),
    currentStepIndex: v.number(),
    stateHistory: v.array(transitionValidator),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    requiresApproval: v.boolean(),
    approvalReason: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    recoverable: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { executionId, ...data } = args;
    await ctx.db.patch(executionId, data);
  },
});

// ============================================
// Mutations - Agent Decisions
// ============================================

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

// ============================================
// Mutations - Status Updates (for HTTP handlers)
// ============================================

/**
 * Mark an execution as completed
 */
export const complete = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    const now = Date.now();
    const transition = {
      id: `tr_${now}`,
      fromState: execution.currentState,
      toState: "completed",
      trigger: "complete_called",
      timestamp: now,
    };

    await ctx.db.patch(args.executionId, {
      currentState: "completed",
      stateEnteredAt: now,
      completedAt: now,
      stateHistory: [...execution.stateHistory, transition],
      metadata: args.result ? { ...execution.metadata, result: args.result } : execution.metadata,
    });

    // Update strategy lastExecutedAt
    const strategy = await ctx.db.get(execution.strategyId);
    if (strategy) {
      await ctx.db.patch(execution.strategyId, {
        lastExecutedAt: now,
        nextExecutionAt: strategy.cronExpression ? now + 3600000 : undefined,
        updatedAt: now,
      });
    }
  },
});

/**
 * Mark an execution as failed
 */
export const fail = mutation({
  args: {
    executionId: v.id("strategyExecutions"),
    error: v.string(),
    errorCode: v.optional(v.string()),
    recoverable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    const now = Date.now();
    const transition = {
      id: `tr_${now}`,
      fromState: execution.currentState,
      toState: "failed",
      trigger: "fail_called",
      timestamp: now,
      errorMessage: args.error,
      errorCode: args.errorCode,
    };

    await ctx.db.patch(args.executionId, {
      currentState: "failed",
      stateEnteredAt: now,
      completedAt: now,
      errorMessage: args.error,
      errorCode: args.errorCode,
      recoverable: args.recoverable ?? false,
      stateHistory: [...execution.stateHistory, transition],
    });
  },
});
