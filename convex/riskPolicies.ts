import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Risk Policy Convex Functions
 *
 * Manages user-specific trading risk preferences.
 * Each wallet can have one risk policy that controls limits and safety checks.
 */

// Default risk policy configuration
const DEFAULT_RISK_CONFIG = {
  maxPositionPercent: 25,
  maxPositionValueUsd: 10000,
  maxDailyVolumeUsd: 50000,
  maxDailyLossUsd: 1000,
  maxSingleTxUsd: 5000,
  requireApprovalAboveUsd: 2000,
  maxSlippagePercent: 3.0,
  warnSlippagePercent: 1.5,
  maxGasPercent: 5.0,
  warnGasPercent: 2.0,
  minLiquidityUsd: 100000,
  enabled: true,
};

// Risk policy config validator
const riskConfigValidator = v.object({
  maxPositionPercent: v.number(),
  maxPositionValueUsd: v.number(),
  maxDailyVolumeUsd: v.number(),
  maxDailyLossUsd: v.number(),
  maxSingleTxUsd: v.number(),
  requireApprovalAboveUsd: v.number(),
  maxSlippagePercent: v.number(),
  warnSlippagePercent: v.number(),
  maxGasPercent: v.number(),
  warnGasPercent: v.number(),
  minLiquidityUsd: v.number(),
  enabled: v.boolean(),
});

/**
 * Get risk policy for a wallet address.
 * Returns the policy if it exists, or null if no policy is set.
 */
export const getByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const policy = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();

    return policy;
  },
});

/**
 * Get risk policy with defaults.
 * Always returns a valid config, using defaults if no policy exists.
 */
export const getOrDefault = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const policy = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();

    if (policy) {
      return {
        ...policy,
        isDefault: false,
      };
    }

    // Return default config
    return {
      _id: null,
      walletAddress: walletAddress.toLowerCase(),
      config: DEFAULT_RISK_CONFIG,
      updatedAt: Date.now(),
      isDefault: true,
    };
  },
});

/**
 * Create or update risk policy for a wallet.
 */
export const upsert = mutation({
  args: {
    walletAddress: v.string(),
    config: riskConfigValidator,
  },
  handler: async (ctx, { walletAddress, config }) => {
    const normalizedAddress = walletAddress.toLowerCase();

    // Validate config constraints
    if (config.warnSlippagePercent >= config.maxSlippagePercent) {
      throw new Error("Warn slippage must be less than max slippage");
    }
    if (config.warnGasPercent >= config.maxGasPercent) {
      throw new Error("Warn gas must be less than max gas");
    }
    if (config.requireApprovalAboveUsd > config.maxSingleTxUsd) {
      throw new Error("Approval threshold cannot exceed max transaction limit");
    }
    if (config.maxPositionPercent < 1 || config.maxPositionPercent > 100) {
      throw new Error("Max position percent must be between 1 and 100");
    }
    if (config.maxSlippagePercent < 0.1 || config.maxSlippagePercent > 10) {
      throw new Error("Max slippage must be between 0.1% and 10%");
    }
    if (config.maxGasPercent < 0.1 || config.maxGasPercent > 20) {
      throw new Error("Max gas percent must be between 0.1% and 20%");
    }

    // Check if policy exists
    const existing = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", normalizedAddress))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing policy
      await ctx.db.patch(existing._id, {
        config,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new policy
      return await ctx.db.insert("riskPolicies", {
        walletAddress: normalizedAddress,
        config,
        updatedAt: now,
      });
    }
  },
});

/**
 * Reset risk policy to defaults.
 */
export const reset = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const normalizedAddress = walletAddress.toLowerCase();

    const existing = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", normalizedAddress))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: DEFAULT_RISK_CONFIG,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("riskPolicies", {
        walletAddress: normalizedAddress,
        config: DEFAULT_RISK_CONFIG,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete risk policy for a wallet.
 */
export const remove = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const policy = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();

    if (policy) {
      await ctx.db.delete(policy._id);
      return true;
    }

    return false;
  },
});
