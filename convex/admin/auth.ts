/**
 * Admin authentication - queries and mutations.
 *
 * Note: Actions that require Node.js (bcrypt, crypto) are in authActions.ts
 */

import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Verify admin session
export const verifySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const admin = await ctx.db.get(session.adminUserId);
    if (!admin || !admin.isActive) return null;

    return {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  },
});

// Get current admin by session
export const getCurrentAdmin = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    const admin = await ctx.db.get(session.adminUserId);
    if (!admin || !admin.isActive) return null;

    return {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
    };
  },
});

// Internal mutation to create session after password verification
export const _createAdminSession = internalMutation({
  args: {
    adminId: v.id("admin_users"),
    sessionId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin) throw new Error("Admin not found");

    // Reset failed attempts on success
    await ctx.db.patch(args.adminId, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create session
    await ctx.db.insert("admin_sessions", {
      sessionId: args.sessionId,
      adminUserId: args.adminId,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: args.adminId,
      action: "admin.login",
      targetType: "admin_user",
      targetId: args.adminId,
      createdAt: Date.now(),
    });

    return {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
    };
  },
});

// Internal mutation to increment failed login attempts
export const _incrementFailedAttempts = internalMutation({
  args: { adminId: v.id("admin_users") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin) return;

    const newAttempts = admin.failedLoginAttempts + 1;
    await ctx.db.patch(args.adminId, {
      failedLoginAttempts: newAttempts,
      lockedUntil: newAttempts >= 10 ? Date.now() + 15 * 60 * 1000 : undefined,
    });
  },
});

// Internal query to get admin by email (for use in action)
export const getAdminByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("admin_users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Logout mutation
export const logout = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      // Log audit event before deleting
      await ctx.db.insert("audit_log", {
        adminUserId: session.adminUserId,
        action: "admin.logout",
        targetType: "admin_session",
        targetId: session.sessionId,
        createdAt: Date.now(),
      });

      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Refresh session
export const refreshSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      return { success: false, error: "Session expired" };
    }

    // Extend session by 4 hours
    const newExpiresAt = Date.now() + 4 * 60 * 60 * 1000;
    await ctx.db.patch(session._id, { expiresAt: newExpiresAt });

    return { success: true, expiresAt: newExpiresAt };
  },
});

// Internal mutation to create admin with hashed password
export const _createAdminUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any admin exists
    const existingAdmin = await ctx.db.query("admin_users").first();
    if (existingAdmin) {
      return { success: false, error: "Admin already exists", adminId: null };
    }

    // Create super admin
    const adminId = await ctx.db.insert("admin_users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      role: "super_admin",
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, adminId, error: null };
  },
});
