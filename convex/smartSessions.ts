/**
 * Convex functions for Rhinestone Smart Sessions.
 *
 * Tracks on-chain session grants and their usage.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all Smart Sessions for a Smart Account.
 */
export const listBySmartAccount = query({
  args: {
    smartAccountAddress: v.string(),
    includeExpired: v.optional(v.boolean()),
    includeRevoked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();

    let sessions = await ctx.db
      .query("smartSessions")
      .withIndex("by_smart_account", (q) =>
        q.eq("smartAccountAddress", normalizedAddress)
      )
      .collect();

    // Filter by status
    if (!args.includeExpired) {
      sessions = sessions.filter((s) => s.status !== "expired");
    }
    if (!args.includeRevoked) {
      sessions = sessions.filter((s) => s.status !== "revoked");
    }

    // Sort by creation date (newest first)
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get active Smart Session for a Smart Account.
 */
export const getActive = query({
  args: {
    smartAccountAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const now = Date.now();

    const sessions = await ctx.db
      .query("smartSessions")
      .withIndex("by_smart_account_status", (q) =>
        q.eq("smartAccountAddress", normalizedAddress).eq("status", "active")
      )
      .collect();

    // Return the first non-expired active session
    return sessions.find((s) => s.validUntil > now) ?? null;
  },
});

/**
 * Get Smart Session by session ID.
 */
export const getBySessionId = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smartSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

/**
 * Create a new Smart Session record after on-chain grant.
 */
export const create = mutation({
  args: {
    smartAccountAddress: v.string(),
    sessionId: v.string(),
    spendingLimitUsd: v.number(),
    allowedContracts: v.array(v.string()),
    allowedTokens: v.array(v.string()),
    allowedActions: v.array(v.string()),
    validUntil: v.number(),
    grantTxHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();
    const normalizedContracts = args.allowedContracts.map((c) => c.toLowerCase());
    const normalizedTokens = args.allowedTokens.map((t) => t.toLowerCase());

    return await ctx.db.insert("smartSessions", {
      smartAccountAddress: normalizedAddress,
      sessionId: args.sessionId,
      spendingLimitUsd: args.spendingLimitUsd,
      allowedContracts: normalizedContracts,
      allowedTokens: normalizedTokens,
      allowedActions: args.allowedActions,
      validUntil: args.validUntil,
      status: "active",
      createdAt: Date.now(),
      totalSpentUsd: 0,
      transactionCount: 0,
      grantTxHash: args.grantTxHash,
    });
  },
});

/**
 * Record usage of a Smart Session.
 */
export const recordUsage = mutation({
  args: {
    sessionId: v.string(),
    amountUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("smartSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Smart Session not found");
    }

    const newTotalSpent = (session.totalSpentUsd ?? 0) + args.amountUsd;
    const newTxCount = (session.transactionCount ?? 0) + 1;

    await ctx.db.patch(session._id, {
      totalSpentUsd: newTotalSpent,
      transactionCount: newTxCount,
      lastUsedAt: Date.now(),
    });

    return session._id;
  },
});

/**
 * Revoke a Smart Session.
 */
export const revoke = mutation({
  args: {
    sessionId: v.string(),
    revokeTxHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("smartSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Smart Session not found");
    }

    await ctx.db.patch(session._id, {
      status: "revoked",
      revokeTxHash: args.revokeTxHash,
    });

    return session._id;
  },
});

/**
 * Mark expired sessions.
 * Called by cron job.
 */
export const markExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredSessions = await ctx.db
      .query("smartSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("validUntil"), now)
        )
      )
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.patch(session._id, {
        status: "expired",
      });
    }

    return expiredSessions.length;
  },
});

/**
 * Get session statistics for a Smart Account.
 */
export const getStats = query({
  args: {
    smartAccountAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();

    const sessions = await ctx.db
      .query("smartSessions")
      .withIndex("by_smart_account", (q) =>
        q.eq("smartAccountAddress", normalizedAddress)
      )
      .collect();

    const now = Date.now();
    const activeSessions = sessions.filter(
      (s) => s.status === "active" && s.validUntil > now
    );

    const totalSpent = sessions.reduce(
      (sum, s) => sum + (s.totalSpentUsd ?? 0),
      0
    );
    const totalTransactions = sessions.reduce(
      (sum, s) => sum + (s.transactionCount ?? 0),
      0
    );

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalSpentUsd: totalSpent,
      totalTransactions,
    };
  },
});
