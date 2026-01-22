import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a nonce for wallet sign-in
 */
export const createNonce = mutation({
  args: {
    walletAddress: v.string(),
    nonce: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Delete any existing nonces for this wallet
    const existingNonces = await ctx.db
      .query("nonces")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .collect();

    for (const nonce of existingNonces) {
      await ctx.db.delete(nonce._id);
    }

    // Create new nonce
    await ctx.db.insert("nonces", {
      walletAddress: args.walletAddress,
      nonce: args.nonce,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

/**
 * Verify a nonce exists and hasn't expired
 */
export const verifyNonce = query({
  args: {
    walletAddress: v.string(),
    nonce: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const nonceDoc = await ctx.db
      .query("nonces")
      .withIndex("by_wallet_nonce", (q) =>
        q.eq("walletAddress", args.walletAddress).eq("nonce", args.nonce)
      )
      .first();

    if (!nonceDoc) {
      return false;
    }

    // Check if expired
    if (nonceDoc.expiresAt < Date.now()) {
      return false;
    }

    return true;
  },
});

/**
 * Delete a nonce after use
 */
export const deleteNonce = mutation({
  args: {
    walletAddress: v.string(),
    nonce: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const nonceDoc = await ctx.db
      .query("nonces")
      .withIndex("by_wallet_nonce", (q) =>
        q.eq("walletAddress", args.walletAddress).eq("nonce", args.nonce)
      )
      .first();

    if (nonceDoc) {
      await ctx.db.delete(nonceDoc._id);
    }
  },
});

/**
 * Create a new session
 */
export const createSession = mutation({
  args: {
    sessionId: v.string(),
    walletAddress: v.string(),
    chainId: v.union(v.number(), v.string()),
    userId: v.optional(v.string()),
    walletId: v.optional(v.string()),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("sessions", {
      sessionId: args.sessionId,
      walletAddress: args.walletAddress,
      chainId: args.chainId,
      userId: args.userId,
      walletId: args.walletId,
      scopes: args.scopes,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get a session by session ID
 */
export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  },
});

/**
 * Update a session (for token refresh)
 */
export const updateSession = mutation({
  args: {
    oldSessionId: v.string(),
    newSessionId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.oldSessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        sessionId: args.newSessionId,
        expiresAt: args.expiresAt,
      });
    }
  },
});

/**
 * Revoke a session (logout)
 */
export const revokeSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * Get all sessions for a wallet
 */
export const listSessionsByWallet = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .collect();

    // Filter out expired sessions
    return sessions.filter((s) => s.expiresAt > now);
  },
});

/**
 * Clean up expired nonces (called by cron)
 */
export const cleanupExpiredNonces = mutation({
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
