import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new session key
 */
export const create = mutation({
  args: {
    sessionId: v.string(),
    walletAddress: v.string(),
    agentId: v.optional(v.string()),
    permissions: v.array(v.string()),
    valueLimits: v.object({
      maxValuePerTxUsd: v.string(),
      maxTotalValueUsd: v.string(),
      maxTransactions: v.optional(v.number()),
      totalValueUsedUsd: v.string(),
      transactionCount: v.number(),
    }),
    chainAllowlist: v.array(v.number()),
    contractAllowlist: v.array(v.string()),
    tokenAllowlist: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("sessionKeys", {
      sessionId: args.sessionId,
      walletAddress: args.walletAddress.toLowerCase(),
      agentId: args.agentId,
      permissions: args.permissions,
      valueLimits: args.valueLimits,
      chainAllowlist: args.chainAllowlist,
      contractAllowlist: args.contractAllowlist,
      tokenAllowlist: args.tokenAllowlist,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      status: args.status as "active" | "expired" | "revoked" | "exhausted",
      usageLog: [],
    });
  },
});

/**
 * Get a session key by ID
 */
export const get = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessionKeys")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return session;
  },
});

/**
 * List session keys for a wallet
 */
export const listByWallet = query({
  args: {
    walletAddress: v.string(),
    includeExpired: v.optional(v.boolean()),
    includeRevoked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessionKeys")
      .withIndex("by_wallet", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .collect();

    return sessions.filter((s) => {
      // Filter out expired if not requested
      if (!args.includeExpired && s.expiresAt < now) {
        return false;
      }
      // Filter out revoked if not requested
      if (!args.includeRevoked && s.status === "revoked") {
        return false;
      }
      return true;
    });
  },
});

/**
 * List session keys for an agent
 */
export const listByAgent = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessionKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    // Filter to active only
    const now = Date.now();
    return sessions.filter(
      (s) => s.status === "active" && s.expiresAt > now
    );
  },
});

/**
 * Record usage of a session key
 */
export const recordUsage = mutation({
  args: {
    sessionId: v.string(),
    valueUsd: v.string(),
    transactionCount: v.number(),
    totalValueUsedUsd: v.string(),
    status: v.string(),
    lastUsedAt: v.number(),
    usageEntry: v.object({
      actionType: v.string(),
      valueUsd: v.string(),
      txHash: v.optional(v.string()),
      timestamp: v.number(),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db
      .query("sessionKeys")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    // Get existing usage log and append (keep last 100 entries)
    const usageLog = session.usageLog || [];
    usageLog.push(args.usageEntry);
    const trimmedLog = usageLog.slice(-100);

    await ctx.db.patch(session._id, {
      valueLimits: {
        ...session.valueLimits,
        totalValueUsedUsd: args.totalValueUsedUsd,
        transactionCount: args.transactionCount,
      },
      status: args.status as "active" | "expired" | "revoked" | "exhausted",
      lastUsedAt: args.lastUsedAt,
      usageLog: trimmedLog,
    });
  },
});

/**
 * Revoke a session key
 */
export const revoke = mutation({
  args: {
    sessionId: v.string(),
    revokedAt: v.number(),
    revokeReason: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db
      .query("sessionKeys")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    await ctx.db.patch(session._id, {
      status: "revoked",
      revokedAt: args.revokedAt,
      revokeReason: args.revokeReason,
    });
  },
});

/**
 * Clean up expired sessions (mark as expired)
 */
export const cleanupExpired = mutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args): Promise<{ expiredCount: number }> => {
    const activeSessions = await ctx.db
      .query("sessionKeys")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let expiredCount = 0;
    for (const session of activeSessions) {
      if (session.expiresAt < args.now) {
        await ctx.db.patch(session._id, {
          status: "expired",
        });
        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

/**
 * Extend a session key's expiration.
 */
export const extend = mutation({
  args: {
    sessionId: v.string(),
    additionalDays: v.number(),
  },
  handler: async (ctx, args): Promise<{ newExpiresAt: number }> => {
    if (args.additionalDays < 1 || args.additionalDays > 365) {
      throw new Error("Additional days must be between 1 and 365");
    }

    const session = await ctx.db
      .query("sessionKeys")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    if (session.status === "revoked") {
      throw new Error("Cannot extend a revoked session");
    }

    if (session.status === "exhausted") {
      throw new Error("Cannot extend an exhausted session");
    }

    // Extend from now if expired, or from current expiration if still active
    const baseTime = session.expiresAt < Date.now() ? Date.now() : session.expiresAt;
    const newExpiresAt = baseTime + args.additionalDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      status: "active", // Re-activate if was expired
    });

    return { newExpiresAt };
  },
});

/**
 * Get active sessions count for a wallet.
 */
export const getActiveCount = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessionKeys")
      .withIndex("by_wallet", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .collect();

    return sessions.filter(
      (s) => s.status === "active" && s.expiresAt > now
    ).length;
  },
});

/**
 * Delete old session keys (cleanup)
 */
export const deleteOld = mutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const now = Date.now();
    // Delete sessions that expired or were revoked more than 30 days ago
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    const oldSessions = await ctx.db
      .query("sessionKeys")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("status"), "expired"),
            q.lt(q.field("expiresAt"), cutoff)
          ),
          q.and(
            q.eq(q.field("status"), "revoked"),
            q.lt(q.field("revokedAt"), cutoff)
          )
        )
      )
      .collect();

    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    return { deletedCount: oldSessions.length };
  },
});
