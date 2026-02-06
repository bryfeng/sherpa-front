import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Default chains for new users (just Ethereum to start)
const DEFAULT_ENABLED_CHAINS = ["ethereum"];

/**
 * Get user preferences by wallet address.
 * Returns default preferences if none exist.
 */
export const get = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!prefs) {
      // Return default preferences
      return {
        walletAddress: args.walletAddress,
        enabledPortfolioChains: DEFAULT_ENABLED_CHAINS,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return prefs;
  },
});

/**
 * Update user preferences (upsert).
 * Creates preferences if they don't exist.
 */
export const update = mutation({
  args: {
    walletAddress: v.string(),
    enabledPortfolioChains: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        ...(args.enabledPortfolioChains !== undefined && {
          enabledPortfolioChains: args.enabledPortfolioChains,
        }),
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new preferences
      return await ctx.db.insert("userPreferences", {
        walletAddress: args.walletAddress,
        enabledPortfolioChains: args.enabledPortfolioChains ?? DEFAULT_ENABLED_CHAINS,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Set enabled portfolio chains.
 * Convenience mutation for updating just the chains.
 */
export const setEnabledChains = mutation({
  args: {
    walletAddress: v.string(),
    chains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate that at least one chain is enabled
    if (args.chains.length === 0) {
      throw new Error("At least one chain must be enabled");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabledPortfolioChains: args.chains,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userPreferences", {
        walletAddress: args.walletAddress,
        enabledPortfolioChains: args.chains,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Toggle a single chain on/off in portfolio preferences.
 * Used by the settings UI for individual chain toggles.
 */
export const toggleChain = mutation({
  args: {
    walletAddress: v.string(),
    chain: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    const now = Date.now();
    let currentChains = existing?.enabledPortfolioChains ?? DEFAULT_ENABLED_CHAINS;

    if (args.enabled) {
      // Add chain if not present
      if (!currentChains.includes(args.chain)) {
        currentChains = [...currentChains, args.chain];
      }
    } else {
      // Remove chain, but ensure at least one remains
      const newChains = currentChains.filter((c) => c !== args.chain);
      if (newChains.length === 0) {
        throw new Error("At least one chain must be enabled");
      }
      currentChains = newChains;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabledPortfolioChains: currentChains,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userPreferences", {
        walletAddress: args.walletAddress,
        enabledPortfolioChains: currentChains,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
