import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Risk Policy Convex Functions
 *
 * Manages user-specific trading risk preferences.
 * Each wallet can have one risk policy that controls limits and safety checks.
 */

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
 * Get risk policy or null.
 * Returns the policy if it exists, or null if no policy is set.
 */
export const getOrDefault = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const policy = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();

    if (!policy) {
      return null;
    }

    return {
      ...policy,
      isDefault: false,
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
 * Reset risk policy (removes it entirely).
 */
export const reset = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const normalizedAddress = walletAddress.toLowerCase();

    const existing = await ctx.db
      .query("riskPolicies")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", normalizedAddress))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }

    return false;
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
