import { mutation, query } from "../_generated/server";
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

// List sessions for a user
export const listUserSessions = query({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return [];

    // Get user's wallets
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get sessions for each wallet
    const sessions: Array<{
      sessionId: string;
      walletAddress: string;
      chainId: number | string;
      createdAt: number;
      expiresAt: number;
    }> = [];

    for (const wallet of wallets) {
      const walletSessions = await ctx.db
        .query("sessions")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", wallet.address))
        .collect();

      for (const session of walletSessions) {
        if (session.expiresAt > Date.now()) {
          sessions.push({
            sessionId: session.sessionId,
            walletAddress: session.walletAddress,
            chainId: session.chainId,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
          });
        }
      }
    }

    return sessions;
  },
});

// Revoke a specific session
export const revokeSession = mutation({
  args: {
    adminSessionId: v.string(),
    targetSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.adminSessionId);
    if (!admin) return { success: false, error: "Unauthorized" };

    // Check permission
    if (!["support", "operator", "admin", "super_admin"].includes(admin.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) =>
        q.eq("sessionId", args.targetSessionId)
      )
      .first();

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    await ctx.db.delete(session._id);

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "session.revoke",
      targetType: "session",
      targetId: args.targetSessionId,
      details: { walletAddress: session.walletAddress },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Revoke all sessions for a user
export const revokeAllUserSessions = mutation({
  args: {
    adminSessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.adminSessionId);
    if (!admin) return { success: false, error: "Unauthorized" };

    // Check permission
    if (!["support", "operator", "admin", "super_admin"].includes(admin.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get user's wallets
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let revokedCount = 0;

    // Delete sessions for each wallet
    for (const wallet of wallets) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", wallet.address))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete(session._id);
        revokedCount++;
      }
    }

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "session.revoke_all",
      targetType: "user",
      targetId: args.userId,
      details: { revokedCount },
      createdAt: Date.now(),
    });

    return { success: true, revokedCount };
  },
});

// Get audit log
export const getAuditLog = query({
  args: {
    sessionId: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return { logs: [], total: 0 };

    // Only admin and super_admin can view audit logs
    if (!["admin", "super_admin"].includes(admin.role)) {
      return { logs: [], total: 0 };
    }

    const page = args.page ?? 1;
    const limit = args.limit ?? 50;
    const offset = (page - 1) * limit;

    let logs;
    if (args.action) {
      logs = await ctx.db
        .query("audit_log")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db.query("audit_log").order("desc").collect();
    }

    // Hydrate with admin names
    const hydratedLogs = await Promise.all(
      logs.slice(offset, offset + limit).map(async (log) => {
        const adminUser = await ctx.db.get(log.adminUserId);
        return {
          ...log,
          adminName: adminUser?.name || "Unknown",
          adminEmail: adminUser?.email || "Unknown",
        };
      })
    );

    return {
      logs: hydratedLogs,
      total: logs.length,
      page,
      limit,
      hasMore: offset + limit < logs.length,
    };
  },
});
