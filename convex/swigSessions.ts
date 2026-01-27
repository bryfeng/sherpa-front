import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List Swig sessions by wallet address.
 */
export const listBySwigWallet = query({
  args: {
    swigWalletAddress: v.string(),
    includeExpired: v.optional(v.boolean()),
    includeRevoked: v.optional(v.boolean()),
  },
  handler: async (ctx, { swigWalletAddress, includeExpired = false, includeRevoked = false }) => {
    const sessions = await ctx.db
      .query("swigSessions")
      .withIndex("by_swig_wallet", (q) => q.eq("swigWalletAddress", swigWalletAddress))
      .collect();

    return sessions.filter((s) => {
      if (s.status === "expired" && !includeExpired) return false;
      if (s.status === "revoked" && !includeRevoked) return false;
      return true;
    });
  },
});

/**
 * Get active Swig session for a wallet.
 */
export const getActive = query({
  args: { swigWalletAddress: v.string() },
  handler: async (ctx, { swigWalletAddress }) => {
    const sessions = await ctx.db
      .query("swigSessions")
      .withIndex("by_swig_wallet_status", (q) =>
        q.eq("swigWalletAddress", swigWalletAddress).eq("status", "active")
      )
      .collect();

    // Return the first active session that hasn't expired
    const now = Date.now();
    return sessions.find((s) => s.validUntil > now) ?? null;
  },
});

/**
 * Get Swig session by ID.
 */
export const getById = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("swigSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

/**
 * Create a new Swig session.
 */
export const create = mutation({
  args: {
    swigWalletAddress: v.string(),
    sessionId: v.string(),
    role: v.string(),
    spendingLimitUsd: v.number(),
    allowedPrograms: v.array(v.string()),
    allowedTokens: v.array(v.string()),
    allowedActions: v.array(v.string()),
    validUntil: v.number(),
    grantTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("swigSessions", {
      swigWalletAddress: args.swigWalletAddress,
      sessionId: args.sessionId,
      role: args.role,
      spendingLimitUsd: args.spendingLimitUsd,
      allowedPrograms: args.allowedPrograms,
      allowedTokens: args.allowedTokens,
      allowedActions: args.allowedActions,
      validUntil: args.validUntil,
      status: "active",
      createdAt: now,
      totalSpentUsd: 0,
      transactionCount: 0,
      grantTxSignature: args.grantTxSignature,
    });
  },
});

/**
 * Revoke a Swig session.
 */
export const revoke = mutation({
  args: {
    sessionId: v.string(),
    revokeTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, revokeTxSignature }) => {
    const session = await ctx.db
      .query("swigSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      status: "revoked",
      revokeTxSignature,
    });
  },
});

/**
 * Update session usage.
 */
export const recordUsage = mutation({
  args: {
    sessionId: v.string(),
    spentUsd: v.number(),
  },
  handler: async (ctx, { sessionId, spentUsd }) => {
    const session = await ctx.db
      .query("swigSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      totalSpentUsd: (session.totalSpentUsd ?? 0) + spentUsd,
      transactionCount: (session.transactionCount ?? 0) + 1,
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Expire sessions past their validity.
 */
export const expireSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeSessions = await ctx.db
      .query("swigSessions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let expiredCount = 0;
    for (const session of activeSessions) {
      if (session.validUntil <= now) {
        await ctx.db.patch(session._id, { status: "expired" });
        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

/**
 * Get session statistics for a wallet.
 */
export const getStats = query({
  args: { swigWalletAddress: v.string() },
  handler: async (ctx, { swigWalletAddress }) => {
    const sessions = await ctx.db
      .query("swigSessions")
      .withIndex("by_swig_wallet", (q) => q.eq("swigWalletAddress", swigWalletAddress))
      .collect();

    const now = Date.now();
    const activeSessions = sessions.filter(
      (s) => s.status === "active" && s.validUntil > now
    );

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalSpentUsd: sessions.reduce((sum, s) => sum + (s.totalSpentUsd ?? 0), 0),
      totalTransactions: sessions.reduce((sum, s) => sum + (s.transactionCount ?? 0), 0),
    };
  },
});
