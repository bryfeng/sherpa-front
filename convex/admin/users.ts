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

// List users with pagination
export const listUsers = query({
  args: {
    sessionId: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return { users: [], total: 0 };

    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get all users
    const users = await ctx.db.query("users").order("desc").collect();

    // Get wallets and flags for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const wallets = await ctx.db
          .query("wallets")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const flags = await ctx.db
          .query("user_flags")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const strategies = await ctx.db
          .query("strategies")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        return {
          ...user,
          wallets,
          flags,
          strategyCount: strategies.length,
        };
      })
    );

    // Filter by search (wallet address)
    let filteredUsers = usersWithDetails;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredUsers = filteredUsers.filter((user) =>
        user.wallets?.some((w) =>
          w.address.toLowerCase().includes(searchLower)
        )
      );
    }

    // Filter by status
    if (args.status && args.status !== "all") {
      filteredUsers = filteredUsers.filter((user) => {
        const isBanned = user.flags?.some((f) => f.flagType === "banned");
        if (args.status === "banned") return isBanned;
        if (args.status === "active") return !isBanned;
        return true;
      });
    }

    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  },
});

// Get user by ID with full details
export const getUserById = query({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const flags = await ctx.db
      .query("user_flags")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const strategies = await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get transactions through wallets
    let transactionCount = 0;
    for (const wallet of wallets) {
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", wallet._id))
        .collect();
      transactionCount += txs.length;
    }

    return {
      ...user,
      wallets,
      flags,
      strategyCount: strategies.length,
      transactionCount,
    };
  },
});

// Lookup user by wallet address
export const getUserByWallet = query({
  args: {
    sessionId: v.string(),
    address: v.string(),
    chain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return null;

    let wallet;
    if (args.chain) {
      wallet = await ctx.db
        .query("wallets")
        .withIndex("by_address_chain", (q) =>
          q.eq("address", args.address).eq("chain", args.chain!)
        )
        .first();
    } else {
      // Search by address only
      const wallets = await ctx.db.query("wallets").collect();
      wallet = wallets.find(
        (w) => w.address.toLowerCase() === args.address.toLowerCase()
      );
    }

    if (!wallet) return null;

    return ctx.db.get(wallet.userId);
  },
});

// Ban user
export const banUser = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    reason: v.string(),
    permanent: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return { success: false, error: "Unauthorized" };

    // Check permission (support level or above)
    if (!["support", "operator", "admin", "super_admin"].includes(admin.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if already banned
    const existingBan = await ctx.db
      .query("user_flags")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("flagType", "banned")
      )
      .first();

    if (existingBan) {
      return { success: false, error: "User is already banned" };
    }

    // Create ban flag
    await ctx.db.insert("user_flags", {
      userId: args.userId,
      flagType: "banned",
      reason: args.reason,
      expiresAt: args.permanent ? undefined : args.expiresAt,
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    // Revoke all user sessions
    const user = await ctx.db.get(args.userId);
    if (user) {
      const wallets = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const wallet of wallets) {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_wallet", (q) => q.eq("walletAddress", wallet.address))
          .collect();

        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }
      }
    }

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "user.ban",
      targetType: "user",
      targetId: args.userId,
      details: { reason: args.reason, permanent: args.permanent },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unban user
export const unbanUser = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return { success: false, error: "Unauthorized" };

    // Check permission
    if (!["support", "operator", "admin", "super_admin"].includes(admin.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Find and delete ban flag
    const banFlag = await ctx.db
      .query("user_flags")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("flagType", "banned")
      )
      .first();

    if (!banFlag) {
      return { success: false, error: "User is not banned" };
    }

    await ctx.db.delete(banFlag._id);

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "user.unban",
      targetType: "user",
      targetId: args.userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Verify user
export const verifyUser = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminSession(ctx, args.sessionId);
    if (!admin) return { success: false, error: "Unauthorized" };

    // Check if already verified
    const existingFlag = await ctx.db
      .query("user_flags")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("flagType", "verified")
      )
      .first();

    if (existingFlag) {
      return { success: false, error: "User is already verified" };
    }

    // Create verified flag
    await ctx.db.insert("user_flags", {
      userId: args.userId,
      flagType: "verified",
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "user.verify",
      targetType: "user",
      targetId: args.userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
