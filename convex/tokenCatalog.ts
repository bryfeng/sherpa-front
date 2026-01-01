import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a token from the catalog by chain and address
 */
export const get = query({
  args: {
    chainId: v.number(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", args.address.toLowerCase())
      )
      .first();

    return token;
  },
});

/**
 * Get multiple tokens by their chain and address pairs
 */
export const getBatch = query({
  args: {
    tokens: v.array(
      v.object({
        chainId: v.number(),
        address: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.tokens.map(async (t) => {
        const token = await ctx.db
          .query("tokenCatalog")
          .withIndex("by_chain_address", (q) =>
            q.eq("chainId", t.chainId).eq("address", t.address.toLowerCase())
          )
          .first();
        return token;
      })
    );

    return results;
  },
});

/**
 * Get tokens by symbol (may return multiple across chains)
 */
export const getBySymbol = query({
  args: {
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol.toUpperCase()))
      .collect();

    return tokens;
  },
});

/**
 * Get tokens by sector
 */
export const getBySector = query({
  args: {
    sector: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_sector", (q) => q.eq("sector", args.sector))
      .take(args.limit ?? 100);

    return tokens;
  },
});

/**
 * Get tokens by project slug
 */
export const getByProject = query({
  args: {
    projectSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_project", (q) => q.eq("projectSlug", args.projectSlug))
      .collect();

    return tokens;
  },
});

/**
 * Get tokens by CoinGecko ID
 */
export const getByCoingeckoId = query({
  args: {
    coingeckoId: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_coingecko", (q) => q.eq("coingeckoId", args.coingeckoId))
      .collect();

    return tokens;
  },
});

/**
 * Get stale tokens that need re-enrichment
 */
export const getStaleTokens = query({
  args: {
    maxAge: v.number(), // Max age in milliseconds
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.maxAge;

    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_last_updated")
      .filter((q) => q.lt(q.field("lastUpdated"), cutoff))
      .take(args.limit ?? 50);

    return tokens;
  },
});

/**
 * Search tokens by partial symbol or name
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const queryLower = args.query.toLowerCase();

    // Get all tokens and filter in memory (for small catalogs)
    // For larger catalogs, consider a search index
    const allTokens = await ctx.db.query("tokenCatalog").take(1000);

    const matches = allTokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(queryLower) ||
          t.name.toLowerCase().includes(queryLower) ||
          (t.projectName?.toLowerCase().includes(queryLower) ?? false)
      )
      .slice(0, args.limit ?? 20);

    return matches;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Upsert a token in the catalog
 */
export const upsert = mutation({
  args: {
    address: v.string(),
    chainId: v.number(),
    symbol: v.string(),
    name: v.string(),
    decimals: v.number(),
    logoUrl: v.optional(v.string()),
    categories: v.array(v.string()),
    sector: v.optional(v.string()),
    subsector: v.optional(v.string()),
    projectName: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    coingeckoId: v.optional(v.string()),
    defillamaId: v.optional(v.string()),
    website: v.optional(v.string()),
    twitter: v.optional(v.string()),
    discord: v.optional(v.string()),
    github: v.optional(v.string()),
    marketCapTier: v.optional(v.string()),
    isStablecoin: v.boolean(),
    isWrapped: v.boolean(),
    isLpToken: v.boolean(),
    isGovernanceToken: v.boolean(),
    isNative: v.boolean(),
    relatedTokens: v.array(
      v.object({
        address: v.string(),
        chainId: v.number(),
        relationship: v.string(),
      })
    ),
    dataSource: v.string(),
    enrichmentVersion: v.number(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Check if token exists
    const existing = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", address)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing token
      await ctx.db.patch(existing._id, {
        ...args,
        address,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      // Insert new token
      const id = await ctx.db.insert("tokenCatalog", {
        ...args,
        address,
        lastUpdated: now,
      });
      return id;
    }
  },
});

/**
 * Batch upsert tokens
 */
export const upsertBatch = mutation({
  args: {
    tokens: v.array(
      v.object({
        address: v.string(),
        chainId: v.number(),
        symbol: v.string(),
        name: v.string(),
        decimals: v.number(),
        logoUrl: v.optional(v.string()),
        categories: v.array(v.string()),
        sector: v.optional(v.string()),
        subsector: v.optional(v.string()),
        projectName: v.optional(v.string()),
        projectSlug: v.optional(v.string()),
        coingeckoId: v.optional(v.string()),
        defillamaId: v.optional(v.string()),
        website: v.optional(v.string()),
        twitter: v.optional(v.string()),
        discord: v.optional(v.string()),
        github: v.optional(v.string()),
        marketCapTier: v.optional(v.string()),
        isStablecoin: v.boolean(),
        isWrapped: v.boolean(),
        isLpToken: v.boolean(),
        isGovernanceToken: v.boolean(),
        isNative: v.boolean(),
        relatedTokens: v.array(
          v.object({
            address: v.string(),
            chainId: v.number(),
            relationship: v.string(),
          })
        ),
        dataSource: v.string(),
        enrichmentVersion: v.number(),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: string[] = [];

    for (const token of args.tokens) {
      const address = token.address.toLowerCase();

      const existing = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address", (q) =>
          q.eq("chainId", token.chainId).eq("address", address)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...token,
          address,
          lastUpdated: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("tokenCatalog", {
          ...token,
          address,
          lastUpdated: now,
        });
        results.push(id);
      }
    }

    return results;
  },
});

/**
 * Delete a token from the catalog
 */
export const remove = mutation({
  args: {
    chainId: v.number(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", args.address.toLowerCase())
      )
      .first();

    if (token) {
      await ctx.db.delete(token._id);
      return true;
    }

    return false;
  },
});

// =============================================================================
// Portfolio Profile Queries/Mutations
// =============================================================================

/**
 * Get portfolio profile for a wallet
 */
export const getPortfolioProfile = query({
  args: {
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("portfolioProfiles")
      .withIndex("by_wallet_address", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase())
      )
      .first();

    return profile;
  },
});

/**
 * Upsert portfolio profile
 */
export const upsertPortfolioProfile = mutation({
  args: {
    walletId: v.id("wallets"),
    walletAddress: v.string(),
    sectorAllocation: v.any(),
    categoryExposure: v.any(),
    riskProfile: v.object({
      diversificationScore: v.number(),
      stablecoinPercent: v.number(),
      memePercent: v.number(),
      concentrationRisk: v.number(),
    }),
    tokensByTier: v.any(),
    portfolioValueUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const walletAddress = args.walletAddress.toLowerCase();

    const existing = await ctx.db
      .query("portfolioProfiles")
      .withIndex("by_wallet_address", (q) =>
        q.eq("walletAddress", walletAddress)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        walletAddress,
        calculatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("portfolioProfiles", {
        ...args,
        walletAddress,
        calculatedAt: now,
      });
      return id;
    }
  },
});
