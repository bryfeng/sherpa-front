"use node";

/**
 * Admin auth actions that require Node.js runtime.
 * These use bcrypt and crypto which aren't available in the default Convex runtime.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

// Type for login response
type LoginResponse = {
  success: boolean;
  error?: string;
  sessionId?: string;
  admin?: {
    _id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  };
};

// Type for create admin response
type CreateAdminResponse = {
  success: boolean;
  error?: string | null;
  adminId?: string | null;
};

// Login action - uses bcrypt for secure password verification
export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<LoginResponse> => {
    // Get admin by email
    const admin = await ctx.runQuery(internal.admin.auth.getAdminByEmail, {
      email: args.email,
    });

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

    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(args.password, admin.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      await ctx.runMutation(internal.admin.auth._incrementFailedAttempts, {
        adminId: admin._id,
      });
      return { success: false, error: "Invalid credentials" };
    }

    // Generate secure session ID using crypto
    const sessionId = `admin_session_${crypto.randomUUID()}`;
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

    // Create session via internal mutation
    const adminData = await ctx.runMutation(internal.admin.auth._createAdminSession, {
      adminId: admin._id,
      sessionId,
      expiresAt,
    });

    return {
      success: true,
      sessionId,
      admin: adminData,
    };
  },
});

// Create initial admin (one-time setup) - uses bcrypt for secure password hashing
export const createInitialAdmin = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<CreateAdminResponse> => {
    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(args.password, salt);

    // Create admin via internal mutation
    const result = await ctx.runMutation(internal.admin.auth._createAdminUser, {
      email: args.email,
      passwordHash,
      name: args.name,
    });

    return result;
  },
});
