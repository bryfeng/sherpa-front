import { mutation, query } from "../_generated/server";
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

// Login mutation
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admin_users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!admin) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check if locked
    if (admin.lockedUntil && admin.lockedUntil > Date.now()) {
      return { success: false, error: "Account is locked. Try again later." };
    }

    // Check if active
    if (!admin.isActive) {
      return { success: false, error: "Account is disabled" };
    }

    // TODO: In production, use bcrypt via Convex action
    // For now, simple password check (demo only)
    const expectedHash = `hash_${args.password}`;
    if (admin.passwordHash !== expectedHash) {
      // Increment failed attempts
      await ctx.db.patch(admin._id, {
        failedLoginAttempts: admin.failedLoginAttempts + 1,
        lockedUntil:
          admin.failedLoginAttempts >= 9
            ? Date.now() + 15 * 60 * 1000
            : undefined,
      });
      return { success: false, error: "Invalid credentials" };
    }

    // Reset failed attempts on success
    await ctx.db.patch(admin._id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create session
    const sessionId = `admin_session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

    await ctx.db.insert("admin_sessions", {
      sessionId,
      adminUserId: admin._id,
      expiresAt,
      createdAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "admin.login",
      targetType: "admin_user",
      targetId: admin._id,
      createdAt: Date.now(),
    });

    return {
      success: true,
      sessionId,
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar,
      },
    };
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

// Create initial admin (one-time setup)
export const createInitialAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any admin exists
    const existingAdmin = await ctx.db.query("admin_users").first();
    if (existingAdmin) {
      return { success: false, error: "Admin already exists" };
    }

    // Create super admin
    const adminId = await ctx.db.insert("admin_users", {
      email: args.email,
      passwordHash: `hash_${args.password}`, // TODO: Use bcrypt in production
      name: args.name,
      role: "super_admin",
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, adminId };
  },
});
