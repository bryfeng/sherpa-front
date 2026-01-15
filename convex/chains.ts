import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a chain by its chain ID
 */
export const getByChainId = query({
  args: {
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
      .first();

    return chain;
  },
});

/**
 * Resolve an alias to a chain config
 * Checks both the name and aliases array
 */
export const resolveAlias = query({
  args: {
    alias: v.string(),
  },
  handler: async (ctx, args) => {
    const aliasLower = args.alias.toLowerCase();

    // Get all enabled chains and search through them
    const chains = await ctx.db
      .query("chains")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    // Find chain where alias matches name or is in aliases array
    const match = chains.find(
      (c) =>
        c.name.toLowerCase() === aliasLower ||
        c.aliases.some((a) => a.toLowerCase() === aliasLower)
    );

    return match ?? null;
  },
});

/**
 * Get all enabled chains
 */
export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db
      .query("chains")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    return chains;
  },
});

/**
 * Get all chains (including disabled)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db.query("chains").collect();
    return chains;
  },
});

/**
 * Get chains that have verified Alchemy support
 */
export const listAlchemySupported = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db
      .query("chains")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    // Filter to chains with verified Alchemy support
    return chains.filter((c) => c.alchemySlug && c.alchemyVerified === true);
  },
});

/**
 * Get the Alchemy slug for a chain (by chain ID or alias)
 */
export const getAlchemySlug = query({
  args: {
    chainIdOrAlias: v.union(v.number(), v.string()),
  },
  handler: async (ctx, args) => {
    let chain;

    if (typeof args.chainIdOrAlias === "number") {
      const chainId = args.chainIdOrAlias;
      chain = await ctx.db
        .query("chains")
        .withIndex("by_chain_id", (q) => q.eq("chainId", chainId))
        .first();
    } else {
      // Resolve by alias
      const aliasLower = args.chainIdOrAlias.toLowerCase();
      const chains = await ctx.db
        .query("chains")
        .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
        .collect();

      chain = chains.find(
        (c) =>
          c.name.toLowerCase() === aliasLower ||
          c.aliases.some((a) => a.toLowerCase() === aliasLower)
      );
    }

    if (!chain) {
      return null;
    }

    return {
      chainId: chain.chainId,
      name: chain.name,
      alchemySlug: chain.alchemySlug ?? null,
      alchemyVerified: chain.alchemyVerified ?? false,
      nativeSymbol: chain.nativeSymbol,
      nativeDecimals: chain.nativeDecimals,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Upsert a chain configuration
 */
export const upsert = mutation({
  args: {
    chainId: v.number(),
    name: v.string(),
    aliases: v.array(v.string()),
    alchemySlug: v.optional(v.string()),
    alchemyVerified: v.optional(v.boolean()),
    nativeSymbol: v.string(),
    nativeDecimals: v.number(),
    isTestnet: v.boolean(),
    isEnabled: v.boolean(),
    explorerUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("chains", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

/**
 * Batch upsert chains (for seeding)
 */
export const upsertBatch = mutation({
  args: {
    chains: v.array(
      v.object({
        chainId: v.number(),
        name: v.string(),
        aliases: v.array(v.string()),
        alchemySlug: v.optional(v.string()),
        alchemyVerified: v.optional(v.boolean()),
        nativeSymbol: v.string(),
        nativeDecimals: v.number(),
        isTestnet: v.boolean(),
        isEnabled: v.boolean(),
        explorerUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: string[] = [];

    for (const chain of args.chains) {
      const existing = await ctx.db
        .query("chains")
        .withIndex("by_chain_id", (q) => q.eq("chainId", chain.chainId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...chain,
          updatedAt: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("chains", {
          ...chain,
          createdAt: now,
          updatedAt: now,
        });
        results.push(id);
      }
    }

    return results;
  },
});

/**
 * Update Alchemy verification status for a chain
 */
export const updateAlchemyStatus = mutation({
  args: {
    chainId: v.number(),
    alchemySlug: v.optional(v.string()),
    alchemyVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
      .first();

    if (!chain) {
      throw new Error(`Chain ${args.chainId} not found`);
    }

    await ctx.db.patch(chain._id, {
      alchemySlug: args.alchemySlug,
      alchemyVerified: args.alchemyVerified,
      updatedAt: Date.now(),
    });

    return chain._id;
  },
});

/**
 * Enable or disable a chain
 */
export const setEnabled = mutation({
  args: {
    chainId: v.number(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
      .first();

    if (!chain) {
      throw new Error(`Chain ${args.chainId} not found`);
    }

    await ctx.db.patch(chain._id, {
      isEnabled: args.isEnabled,
      updatedAt: Date.now(),
    });

    return chain._id;
  },
});

/**
 * Delete a chain
 */
export const remove = mutation({
  args: {
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
      .first();

    if (chain) {
      await ctx.db.delete(chain._id);
      return true;
    }

    return false;
  },
});
