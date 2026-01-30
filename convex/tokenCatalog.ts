import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ChainId type: number for EVM chains, "solana" for Solana
const chainIdValidator = v.union(v.number(), v.literal("solana"));

// Helper to normalize addresses (lowercase for EVM, keep original for Solana)
function normalizeAddress(address: string, chainId: number | "solana"): string {
  return typeof chainId === "number" ? address.toLowerCase() : address;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a token from the catalog by chain and address
 */
export const get = query({
  args: {
    chainId: chainIdValidator,
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const address = normalizeAddress(args.address, args.chainId);
    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", address)
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
        chainId: chainIdValidator,
        address: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.tokens.map(async (t) => {
        const address = normalizeAddress(t.address, t.chainId);
        const token = await ctx.db
          .query("tokenCatalog")
          .withIndex("by_chain_address", (q) =>
            q.eq("chainId", t.chainId).eq("address", address)
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
// Swap Token Resolution Queries
// =============================================================================

/**
 * List all tokens enabled for swaps on a specific chain (or all chains)
 * Used by TokenService to refresh cache
 */
export const listEnabledForSwaps = query({
  args: {
    chainId: v.optional(chainIdValidator),
  },
  handler: async (ctx, args) => {
    const chainId = args.chainId;

    if (chainId !== undefined) {
      // Filter by specific chain
      const tokens = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_enabled", (q) =>
          q.eq("chainId", chainId).eq("isEnabled", true)
        )
        .collect();

      // Also include tokens where isEnabled is undefined (default true)
      const tokensDefaultEnabled = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address")
        .filter((q) =>
          q.and(
            q.eq(q.field("chainId"), chainId),
            q.eq(q.field("isEnabled"), undefined)
          )
        )
        .collect();

      return [...tokens, ...tokensDefaultEnabled];
    }

    // Return all enabled tokens across all chains
    const allTokens = await ctx.db.query("tokenCatalog").collect();
    return allTokens.filter((t) => t.isEnabled !== false);
  },
});

/**
 * Resolve a token by exact symbol match on a chain
 */
export const resolveBySymbol = query({
  args: {
    chainId: chainIdValidator,
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_symbol", (q) =>
        q.eq("chainId", args.chainId).eq("symbol", args.symbol.toUpperCase())
      )
      .first();

    // If not found by uppercase, try case-insensitive search
    if (!token) {
      const tokens = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address")
        .filter((q) => q.eq(q.field("chainId"), args.chainId))
        .collect();

      return tokens.find(
        (t) => t.symbol.toLowerCase() === args.symbol.toLowerCase()
      );
    }

    return token;
  },
});

/**
 * Resolve a token by alias on a chain
 * Searches the aliases array for a match
 */
export const resolveByAlias = query({
  args: {
    chainId: chainIdValidator,
    alias: v.string(),
  },
  handler: async (ctx, args) => {
    const aliasLower = args.alias.toLowerCase();

    // Get all tokens for the chain
    const tokens = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address")
      .filter((q) => q.eq(q.field("chainId"), args.chainId))
      .collect();

    // Search aliases
    return tokens.find((t) => t.aliases?.includes(aliasLower));
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
    chainId: chainIdValidator,
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
        chainId: chainIdValidator,
        relationship: v.string(),
      })
    ),
    dataSource: v.string(),
    enrichmentVersion: v.number(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Normalize address (lowercase for EVM, keep original for Solana)
    const address =
      typeof args.chainId === "number"
        ? args.address.toLowerCase()
        : args.address;

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
        chainId: chainIdValidator,
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
            chainId: chainIdValidator,
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
      // Normalize address (lowercase for EVM, keep original for Solana)
      const address =
        typeof token.chainId === "number"
          ? token.address.toLowerCase()
          : token.address;

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
    chainId: chainIdValidator,
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
// Swap Token Mutations
// =============================================================================

/**
 * Simplified batch upsert for swap tokens
 * Only requires fields needed for swap functionality
 */
export const upsertBatchForSwaps = mutation({
  args: {
    tokens: v.array(
      v.object({
        address: v.string(),
        chainId: chainIdValidator,
        symbol: v.string(),
        name: v.string(),
        decimals: v.number(),
        aliases: v.array(v.string()),
        isNative: v.boolean(),
        isEnabled: v.optional(v.boolean()),
        coingeckoId: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: string[] = [];

    for (const token of args.tokens) {
      // Normalize address (lowercase for EVM, keep original for Solana)
      const address =
        typeof token.chainId === "number"
          ? token.address.toLowerCase()
          : token.address;

      const existing = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address", (q) =>
          q.eq("chainId", token.chainId).eq("address", address)
        )
        .first();

      // Prepare minimal data for swap token
      const swapData = {
        address,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        aliases: token.aliases,
        isNative: token.isNative,
        isEnabled: token.isEnabled ?? true,
        coingeckoId: token.coingeckoId,
        logoUrl: token.logoUrl,
        lastUpdated: now,
        // Defaults for required fields
        categories: [],
        isStablecoin: false,
        isWrapped: token.symbol.startsWith("W") && !token.isNative,
        isLpToken: false,
        isGovernanceToken: false,
        relatedTokens: [],
        dataSource: "swap_registry",
        enrichmentVersion: 1,
        tags: [],
      };

      if (existing) {
        // Update only swap-relevant fields, preserve existing enrichment
        await ctx.db.patch(existing._id, {
          aliases: token.aliases,
          isEnabled: token.isEnabled ?? existing.isEnabled ?? true,
          coingeckoId: token.coingeckoId ?? existing.coingeckoId,
          logoUrl: token.logoUrl ?? existing.logoUrl,
          lastUpdated: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("tokenCatalog", swapData);
        results.push(id);
      }
    }

    return results;
  },
});

/**
 * Set swap enabled status for a token
 */
export const setSwapEnabled = mutation({
  args: {
    chainId: chainIdValidator,
    address: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const address =
      typeof args.chainId === "number"
        ? args.address.toLowerCase()
        : args.address;

    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", address)
      )
      .first();

    if (!token) {
      throw new Error(
        `Token not found: ${args.address} on chain ${args.chainId}`
      );
    }

    await ctx.db.patch(token._id, {
      isEnabled: args.enabled,
      lastUpdated: Date.now(),
    });

    return token._id;
  },
});

/**
 * Update aliases for a token
 */
export const updateAliases = mutation({
  args: {
    chainId: chainIdValidator,
    address: v.string(),
    aliases: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const address =
      typeof args.chainId === "number"
        ? args.address.toLowerCase()
        : args.address;

    const token = await ctx.db
      .query("tokenCatalog")
      .withIndex("by_chain_address", (q) =>
        q.eq("chainId", args.chainId).eq("address", address)
      )
      .first();

    if (!token) {
      throw new Error(
        `Token not found: ${args.address} on chain ${args.chainId}`
      );
    }

    // Normalize aliases to lowercase
    const normalizedAliases = args.aliases.map((a) => a.toLowerCase());

    await ctx.db.patch(token._id, {
      aliases: normalizedAliases,
      lastUpdated: Date.now(),
    });

    return token._id;
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
