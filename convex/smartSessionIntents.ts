/**
 * Smart Session Intents - Convex Functions
 *
 * Tracks intent execution for Smart Session transactions.
 * Used by DCA strategies and manual swaps via Rhinestone.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// =============================================================================
// Types
// =============================================================================

const intentStatusSchema = v.union(
  v.literal("pending"),
  v.literal("executing"),
  v.literal("confirming"),
  v.literal("completed"),
  v.literal("failed")
);

const intentTypeSchema = v.union(
  v.literal("dca_execution"),
  v.literal("swap"),
  v.literal("bridge")
);

const sourceTypeSchema = v.union(
  v.literal("dca_strategy"),
  v.literal("manual")
);

const tokenInfoSchema = v.object({
  symbol: v.string(),
  address: v.string(),
  amount: v.string(),
});

const tokenOutInfoSchema = v.object({
  symbol: v.string(),
  address: v.string(),
  amount: v.optional(v.string()),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * List recent intents for a smart account.
 */
export const listBySmartAccount = query({
  args: {
    smartAccountAddress: v.string(),
    limit: v.optional(v.number()),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const limit = args.limit ?? 50;

    let intents = await ctx.db
      .query("smartSessionIntents")
      .withIndex("by_smart_account", (q) =>
        q.eq("smartAccountAddress", normalizedAddress)
      )
      .order("desc")
      .take(limit);

    // Optionally filter out completed
    if (args.includeCompleted === false) {
      intents = intents.filter(
        (i) => i.status !== "completed" && i.status !== "failed"
      );
    }

    return intents;
  },
});

/**
 * Get pending intents count and list for a smart account.
 */
export const getPending = query({
  args: {
    smartAccountAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();

    const pendingIntents = await ctx.db
      .query("smartSessionIntents")
      .withIndex("by_smart_account", (q) =>
        q.eq("smartAccountAddress", normalizedAddress)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "executing"),
          q.eq(q.field("status"), "confirming")
        )
      )
      .collect();

    return {
      count: pendingIntents.length,
      intents: pendingIntents,
    };
  },
});

/**
 * Get intents for a specific source (e.g., DCA strategy).
 */
export const getBySource = query({
  args: {
    sourceType: sourceTypeSchema,
    sourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const intents = await ctx.db
      .query("smartSessionIntents")
      .withIndex("by_source", (q) =>
        q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId)
      )
      .order("desc")
      .take(limit);

    return intents;
  },
});

/**
 * Get a single intent by ID.
 */
export const get = query({
  args: {
    id: v.id("smartSessionIntents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get intents for a specific smart session.
 */
export const getBySmartSession = query({
  args: {
    smartSessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const intents = await ctx.db
      .query("smartSessionIntents")
      .withIndex("by_smart_session", (q) =>
        q.eq("smartSessionId", args.smartSessionId)
      )
      .order("desc")
      .take(limit);

    return intents;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new intent record.
 */
export const create = mutation({
  args: {
    smartSessionId: v.string(),
    smartAccountAddress: v.string(),
    intentType: intentTypeSchema,
    chainId: v.number(),
    sourceType: v.optional(sourceTypeSchema),
    sourceId: v.optional(v.string()),
    estimatedValueUsd: v.optional(v.number()),
    tokenIn: v.optional(tokenInfoSchema),
    tokenOut: v.optional(tokenOutInfoSchema),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const now = Date.now();

    const intentId = await ctx.db.insert("smartSessionIntents", {
      smartSessionId: args.smartSessionId,
      smartAccountAddress: normalizedAddress,
      intentType: args.intentType,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      status: "pending",
      chainId: args.chainId,
      estimatedValueUsd: args.estimatedValueUsd,
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      createdAt: now,
    });

    return intentId;
  },
});

/**
 * Mark intent as executing (transaction being built).
 */
export const markExecuting = mutation({
  args: {
    id: v.id("smartSessionIntents"),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent) {
      throw new Error("Intent not found");
    }

    await ctx.db.patch(args.id, {
      status: "executing",
    });
  },
});

/**
 * Mark intent as submitted (transaction broadcast to chain).
 */
export const markSubmitted = mutation({
  args: {
    id: v.id("smartSessionIntents"),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent) {
      throw new Error("Intent not found");
    }

    await ctx.db.patch(args.id, {
      status: "confirming",
      txHash: args.txHash,
      submittedAt: Date.now(),
    });
  },
});

/**
 * Mark intent as confirmed (transaction succeeded on chain).
 */
export const markConfirmed = mutation({
  args: {
    id: v.id("smartSessionIntents"),
    actualValueUsd: v.optional(v.number()),
    gasUsd: v.optional(v.number()),
    tokenOutAmount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent) {
      throw new Error("Intent not found");
    }

    const updates: Record<string, unknown> = {
      status: "completed",
      confirmedAt: Date.now(),
    };

    if (args.actualValueUsd !== undefined) {
      updates.actualValueUsd = args.actualValueUsd;
    }

    if (args.gasUsd !== undefined) {
      updates.gasUsd = args.gasUsd;
    }

    // Update tokenOut amount if provided
    if (args.tokenOutAmount && intent.tokenOut) {
      updates.tokenOut = {
        ...intent.tokenOut,
        amount: args.tokenOutAmount,
      };
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Mark intent as failed.
 */
export const markFailed = mutation({
  args: {
    id: v.id("smartSessionIntents"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent) {
      throw new Error("Intent not found");
    }

    await ctx.db.patch(args.id, {
      status: "failed",
      errorMessage: args.errorMessage,
      confirmedAt: Date.now(),
    });
  },
});

// =============================================================================
// Internal Mutations (for cron/scheduler use)
// =============================================================================

/**
 * Create intent from internal scheduler.
 */
export const internalCreate = internalMutation({
  args: {
    smartSessionId: v.string(),
    smartAccountAddress: v.string(),
    intentType: intentTypeSchema,
    chainId: v.number(),
    sourceType: v.optional(sourceTypeSchema),
    sourceId: v.optional(v.string()),
    estimatedValueUsd: v.optional(v.number()),
    tokenIn: v.optional(tokenInfoSchema),
    tokenOut: v.optional(tokenOutInfoSchema),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const now = Date.now();

    const intentId = await ctx.db.insert("smartSessionIntents", {
      smartSessionId: args.smartSessionId,
      smartAccountAddress: normalizedAddress,
      intentType: args.intentType,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      status: "pending",
      chainId: args.chainId,
      estimatedValueUsd: args.estimatedValueUsd,
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      createdAt: now,
    });

    return intentId;
  },
});

/**
 * Update intent status from internal scheduler.
 */
export const internalUpdateStatus = internalMutation({
  args: {
    id: v.id("smartSessionIntents"),
    status: intentStatusSchema,
    txHash: v.optional(v.string()),
    actualValueUsd: v.optional(v.number()),
    gasUsd: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    tokenOutAmount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent) {
      throw new Error("Intent not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.txHash) {
      updates.txHash = args.txHash;
    }

    if (args.actualValueUsd !== undefined) {
      updates.actualValueUsd = args.actualValueUsd;
    }

    if (args.gasUsd !== undefined) {
      updates.gasUsd = args.gasUsd;
    }

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    // Set timestamps based on status
    if (args.status === "confirming" && !intent.submittedAt) {
      updates.submittedAt = now;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.confirmedAt = now;
    }

    // Update tokenOut amount if provided
    if (args.tokenOutAmount && intent.tokenOut) {
      updates.tokenOut = {
        ...intent.tokenOut,
        amount: args.tokenOutAmount,
      };
    }

    await ctx.db.patch(args.id, updates);
  },
});

// =============================================================================
// Backend HTTP API Mutations (for Python backend calls)
// =============================================================================

/**
 * Create intent from backend (HTTP callable).
 * Called by: backend/app/core/strategies/dca/executor.py
 */
export const backendCreate = mutation({
  args: {
    smartSessionId: v.string(),
    smartAccountAddress: v.string(),
    intentType: intentTypeSchema,
    chainId: v.number(),
    sourceType: v.optional(sourceTypeSchema),
    sourceId: v.optional(v.string()),
    estimatedValueUsd: v.optional(v.number()),
    tokenIn: v.optional(tokenInfoSchema),
    tokenOut: v.optional(tokenOutInfoSchema),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const now = Date.now();

    const intentId = await ctx.db.insert("smartSessionIntents", {
      smartSessionId: args.smartSessionId,
      smartAccountAddress: normalizedAddress,
      intentType: args.intentType,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      status: "pending",
      chainId: args.chainId,
      estimatedValueUsd: args.estimatedValueUsd,
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      createdAt: now,
    });

    // Return string ID for backend use
    return intentId;
  },
});

/**
 * Update intent status from backend (HTTP callable).
 * Called by: backend/app/core/strategies/dca/executor.py
 *
 * Note: Takes string ID since backend HTTP client returns string IDs.
 */
export const backendUpdateStatus = mutation({
  args: {
    id: v.string(), // String ID from backend
    status: intentStatusSchema,
    txHash: v.optional(v.string()),
    actualValueUsd: v.optional(v.number()),
    gasUsd: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    tokenOutAmount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Normalize string ID to Convex ID
    const intentId = ctx.db.normalizeId("smartSessionIntents", args.id);
    if (!intentId) {
      throw new Error(`Invalid intent ID: ${args.id}`);
    }

    const intent = await ctx.db.get(intentId);
    if (!intent) {
      throw new Error("Intent not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.txHash) {
      updates.txHash = args.txHash;
    }

    if (args.actualValueUsd !== undefined) {
      updates.actualValueUsd = args.actualValueUsd;
    }

    if (args.gasUsd !== undefined) {
      updates.gasUsd = args.gasUsd;
    }

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    // Set timestamps based on status
    if (args.status === "confirming" && !intent.submittedAt) {
      updates.submittedAt = now;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.confirmedAt = now;
    }

    // Update tokenOut amount if provided
    if (args.tokenOutAmount && intent.tokenOut) {
      updates.tokenOut = {
        ...intent.tokenOut,
        amount: args.tokenOutAmount,
      };
    }

    await ctx.db.patch(intentId, updates);
  },
});
