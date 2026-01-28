import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// News Item Queries
// =============================================================================

/**
 * Get a news item by source and sourceId
 */
export const get = query({
  args: {
    source: v.string(),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("newsItems")
      .withIndex("by_source_id", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();

    return item;
  },
});

/**
 * Get recent news items with optional filters
 */
export const getRecent = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("regulatory"),
        v.literal("technical"),
        v.literal("partnership"),
        v.literal("tokenomics"),
        v.literal("market"),
        v.literal("hack"),
        v.literal("upgrade"),
        v.literal("general")
      )
    ),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("newsItems").withIndex("by_published");

    if (args.sinceTimestamp) {
      query = query.filter((q) =>
        q.gte(q.field("publishedAt"), args.sinceTimestamp!)
      );
    }

    let items = await query.order("desc").take(args.limit ?? 50);

    // Filter by category in memory if specified
    if (args.category) {
      items = items.filter((item) => item.category === args.category);
    }

    return items;
  },
});

/**
 * Get recent news with source diversity.
 * Uses weighted round-robin to ensure a mix of sources (RSS, CoinGecko, DefiLlama).
 * This prevents any single source from dominating the results.
 */
export const getRecentDiversified = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("regulatory"),
        v.literal("technical"),
        v.literal("partnership"),
        v.literal("tokenomics"),
        v.literal("market"),
        v.literal("hack"),
        v.literal("upgrade"),
        v.literal("general")
      )
    ),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 15;
    // Fetch more items to have a pool for diversification
    const fetchLimit = Math.max(limit * 5, 100);

    let query = ctx.db.query("newsItems").withIndex("by_published");

    if (args.sinceTimestamp) {
      query = query.filter((q) =>
        q.gte(q.field("publishedAt"), args.sinceTimestamp!)
      );
    }

    let items = await query.order("desc").take(fetchLimit);

    // Filter by category if specified
    if (args.category) {
      items = items.filter((item) => item.category === args.category);
    }

    // Group items by source type
    const sourceGroups: Record<string, typeof items> = {
      rss: [],
      coingecko: [],
      defillama: [],
      other: [],
    };

    for (const item of items) {
      if (item.source.startsWith("rss:")) {
        sourceGroups.rss.push(item);
      } else if (item.source.startsWith("coingecko:")) {
        sourceGroups.coingecko.push(item);
      } else if (item.source.startsWith("defillama:")) {
        sourceGroups.defillama.push(item);
      } else {
        sourceGroups.other.push(item);
      }
    }

    // Sort each group by importance (higher first), then by publishedAt
    const sortByImportance = (a: (typeof items)[0], b: (typeof items)[0]) => {
      const aScore = a.importance?.score ?? 0.5;
      const bScore = b.importance?.score ?? 0.5;
      if (bScore !== aScore) return bScore - aScore;
      return b.publishedAt - a.publishedAt;
    };

    sourceGroups.rss.sort(sortByImportance);
    sourceGroups.coingecko.sort(sortByImportance);
    sourceGroups.defillama.sort(sortByImportance);
    sourceGroups.other.sort(sortByImportance);

    // Weighted round-robin: RSS gets more weight since it has real news articles
    // Weights represent how many items to take per round from each source
    const weights = {
      rss: 3,        // 3 RSS articles per round (real news)
      coingecko: 1,  // 1 trending token per round
      defillama: 1,  // 1 TVL update per round
      other: 1,
    };

    const result: typeof items = [];
    const indices = { rss: 0, coingecko: 0, defillama: 0, other: 0 };

    // Round-robin selection with weights
    while (result.length < limit) {
      let addedThisRound = false;

      for (const [sourceType, weight] of Object.entries(weights)) {
        const group = sourceGroups[sourceType as keyof typeof sourceGroups];
        const idx = indices[sourceType as keyof typeof indices];

        // Take up to 'weight' items from this source
        for (let i = 0; i < weight && result.length < limit; i++) {
          if (idx + i < group.length) {
            result.push(group[idx + i]);
            addedThisRound = true;
          }
        }
        indices[sourceType as keyof typeof indices] = idx + weight;
      }

      // If we couldn't add anything this round, we've exhausted all sources
      if (!addedThisRound) break;
    }

    // Final sort by publishedAt to maintain chronological feel while keeping diversity
    // But keep the first few items in their diversified order for visibility
    const topItems = result.slice(0, Math.min(5, result.length));
    const restItems = result.slice(5).sort((a, b) => b.publishedAt - a.publishedAt);

    return [...topItems, ...restItems];
  },
});

/**
 * Get news items by category
 */
export const getByCategory = query({
  args: {
    category: v.union(
      v.literal("regulatory"),
      v.literal("technical"),
      v.literal("partnership"),
      v.literal("tokenomics"),
      v.literal("market"),
      v.literal("hack"),
      v.literal("upgrade"),
      v.literal("general")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("newsItems")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .take(args.limit ?? 50);

    return items;
  },
});

/**
 * Get news items related to specific tokens
 */
export const getByTokens = query({
  args: {
    symbols: v.array(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const symbolsUpper = args.symbols.map((s) => s.toUpperCase());

    // Get recent news and filter by token
    const items = await ctx.db
      .query("newsItems")
      .withIndex("by_published")
      .order("desc")
      .take(500); // Get a larger batch to filter

    const matched = items.filter((item) =>
      item.relatedTokens.some((t) => symbolsUpper.includes(t.symbol.toUpperCase()))
    );

    return matched.slice(0, args.limit ?? 50);
  },
});

/**
 * Get news items related to specific sectors
 */
export const getBySectors = query({
  args: {
    sectors: v.array(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sectorsLower = args.sectors.map((s) => s.toLowerCase());

    const items = await ctx.db
      .query("newsItems")
      .withIndex("by_published")
      .order("desc")
      .take(500);

    const matched = items.filter((item) =>
      item.relatedSectors.some((s) => sectorsLower.includes(s.toLowerCase()))
    );

    return matched.slice(0, args.limit ?? 50);
  },
});

/**
 * Get unprocessed news items (for LLM processing)
 */
export const getUnprocessed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("newsItems")
      .filter((q) => q.eq(q.field("processedAt"), undefined))
      .order("desc")
      .take(args.limit ?? 20);

    return items;
  },
});

/**
 * Search news by keyword in title
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const queryLower = args.query.toLowerCase();

    const items = await ctx.db
      .query("newsItems")
      .withIndex("by_published")
      .order("desc")
      .take(500);

    const matched = items.filter(
      (item) =>
        item.title.toLowerCase().includes(queryLower) ||
        (item.summary?.toLowerCase().includes(queryLower) ?? false)
    );

    return matched.slice(0, args.limit ?? 50);
  },
});

/**
 * Get personalized news for a portfolio
 * Returns news ranked by relevance to the portfolio's holdings
 */
export const getForPortfolio = query({
  args: {
    tokens: v.array(
      v.object({
        symbol: v.string(),
        sector: v.optional(v.string()),
        categories: v.array(v.string()),
        valueWeight: v.number(), // Percentage of portfolio
      })
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Build lookup sets for fast matching
    const symbolsUpper = new Set(args.tokens.map((t) => t.symbol.toUpperCase()));
    const sectors = new Set(
      args.tokens.map((t) => t.sector?.toLowerCase()).filter(Boolean)
    );
    const categories = new Set(
      args.tokens.flatMap((t) => t.categories.map((c) => c.toLowerCase()))
    );

    // Weight map for ranking
    const tokenWeights = new Map<string, number>();
    args.tokens.forEach((t) => {
      tokenWeights.set(t.symbol.toUpperCase(), t.valueWeight);
    });

    // Get recent news
    const items = await ctx.db
      .query("newsItems")
      .withIndex("by_published")
      .order("desc")
      .take(500);

    // Score and rank items
    const scoredItems = items.map((item) => {
      let score = 0;

      // Direct token match (highest weight)
      item.relatedTokens.forEach((t) => {
        if (symbolsUpper.has(t.symbol.toUpperCase())) {
          const weight = tokenWeights.get(t.symbol.toUpperCase()) ?? 1;
          score += 10 * t.relevanceScore * (1 + weight / 100);
        }
      });

      // Sector match
      item.relatedSectors.forEach((s) => {
        if (sectors.has(s.toLowerCase())) {
          score += 3;
        }
      });

      // Category match
      item.relatedCategories.forEach((c) => {
        if (categories.has(c.toLowerCase())) {
          score += 2;
        }
      });

      // Boost high-importance items
      if (item.importance?.score) {
        score *= 1 + item.importance.score;
      }

      // Boost recent items
      const ageHours = (Date.now() - item.publishedAt) / (1000 * 60 * 60);
      const recencyMultiplier = Math.max(0.5, 1 - ageHours / 168); // Decay over 1 week
      score *= recencyMultiplier;

      return { item, score };
    });

    // Sort by score and return top items
    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems
      .filter((s) => s.score > 0)
      .slice(0, args.limit ?? 20)
      .map((s) => ({ ...s.item, relevanceScore: s.score }));
  },
});

// =============================================================================
// News Item Mutations
// =============================================================================

/**
 * Insert a new news item
 */
export const insert = mutation({
  args: {
    sourceId: v.string(),
    source: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    url: v.string(),
    imageUrl: v.optional(v.string()),
    publishedAt: v.number(),
    category: v.optional(
      v.union(
        v.literal("regulatory"),
        v.literal("technical"),
        v.literal("partnership"),
        v.literal("tokenomics"),
        v.literal("market"),
        v.literal("hack"),
        v.literal("upgrade"),
        v.literal("general")
      )
    ),
    sentiment: v.optional(
      v.object({
        score: v.number(),
        label: v.union(
          v.literal("very_negative"),
          v.literal("negative"),
          v.literal("neutral"),
          v.literal("positive"),
          v.literal("very_positive")
        ),
        confidence: v.number(),
      })
    ),
    relatedTokens: v.array(
      v.object({
        symbol: v.string(),
        address: v.optional(v.string()),
        chainId: v.optional(v.number()),
        relevanceScore: v.number(),
      })
    ),
    relatedSectors: v.array(v.string()),
    relatedCategories: v.array(v.string()),
    importance: v.optional(
      v.object({
        score: v.number(),
        factors: v.array(v.string()),
      })
    ),
    processedAt: v.optional(v.number()),
    processingVersion: v.number(),
    rawContent: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("newsItems")
      .withIndex("by_source_id", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();

    if (existing) {
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("newsItems", {
      ...args,
      fetchedAt: Date.now(),
    });

    return { id, created: true };
  },
});

/**
 * Batch insert news items
 */
export const insertBatch = mutation({
  args: {
    items: v.array(
      v.object({
        sourceId: v.string(),
        source: v.string(),
        title: v.string(),
        summary: v.optional(v.string()),
        url: v.string(),
        imageUrl: v.optional(v.string()),
        publishedAt: v.number(),
        category: v.optional(
          v.union(
            v.literal("regulatory"),
            v.literal("technical"),
            v.literal("partnership"),
            v.literal("tokenomics"),
            v.literal("market"),
            v.literal("hack"),
            v.literal("upgrade"),
            v.literal("general")
          )
        ),
        sentiment: v.optional(
          v.object({
            score: v.number(),
            label: v.union(
              v.literal("very_negative"),
              v.literal("negative"),
              v.literal("neutral"),
              v.literal("positive"),
              v.literal("very_positive")
            ),
            confidence: v.number(),
          })
        ),
        relatedTokens: v.array(
          v.object({
            symbol: v.string(),
            address: v.optional(v.string()),
            chainId: v.optional(v.number()),
            relevanceScore: v.number(),
          })
        ),
        relatedSectors: v.array(v.string()),
        relatedCategories: v.array(v.string()),
        importance: v.optional(
          v.object({
            score: v.number(),
            factors: v.array(v.string()),
          })
        ),
        processingVersion: v.number(),
        processedAt: v.optional(v.number()),
        rawContent: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: { id: string; created: boolean }[] = [];

    for (const item of args.items) {
      const existing = await ctx.db
        .query("newsItems")
        .withIndex("by_source_id", (q) =>
          q.eq("source", item.source).eq("sourceId", item.sourceId)
        )
        .first();

      if (existing) {
        results.push({ id: existing._id, created: false });
      } else {
        const id = await ctx.db.insert("newsItems", {
          ...item,
          fetchedAt: now,
        });
        results.push({ id, created: true });
      }
    }

    return results;
  },
});

/**
 * Update news item with LLM processing results
 */
export const updateProcessing = mutation({
  args: {
    source: v.string(),
    sourceId: v.string(),
    category: v.union(
      v.literal("regulatory"),
      v.literal("technical"),
      v.literal("partnership"),
      v.literal("tokenomics"),
      v.literal("market"),
      v.literal("hack"),
      v.literal("upgrade"),
      v.literal("general")
    ),
    sentiment: v.object({
      score: v.number(),
      label: v.union(
        v.literal("very_negative"),
        v.literal("negative"),
        v.literal("neutral"),
        v.literal("positive"),
        v.literal("very_positive")
      ),
      confidence: v.number(),
    }),
    summary: v.optional(v.string()),
    relatedTokens: v.array(
      v.object({
        symbol: v.string(),
        address: v.optional(v.string()),
        chainId: v.optional(v.number()),
        relevanceScore: v.number(),
      })
    ),
    relatedSectors: v.array(v.string()),
    relatedCategories: v.array(v.string()),
    importance: v.object({
      score: v.number(),
      factors: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("newsItems")
      .withIndex("by_source_id", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();

    if (!item) {
      throw new Error(`News item not found: ${args.source}:${args.sourceId}`);
    }

    await ctx.db.patch(item._id, {
      category: args.category,
      sentiment: args.sentiment,
      summary: args.summary,
      relatedTokens: args.relatedTokens,
      relatedSectors: args.relatedSectors,
      relatedCategories: args.relatedCategories,
      importance: args.importance,
      processedAt: Date.now(),
    });

    return item._id;
  },
});

/**
 * Delete expired news items
 */
export const deleteExpired = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("newsItems")
      .withIndex("by_expires")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .take(args.batchSize ?? 100);

    for (const item of expired) {
      await ctx.db.delete(item._id);
    }

    return { deleted: expired.length };
  },
});

// =============================================================================
// News Sources Queries/Mutations
// =============================================================================

/**
 * Get all news sources
 */
export const getSources = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("newsSources").collect();
  },
});

/**
 * Get enabled news sources
 */
export const getEnabledSources = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("newsSources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

/**
 * Upsert a news source
 */
export const upsertSource = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("rss"), v.literal("api"), v.literal("scraper")),
    url: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("newsSources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("newsSources", {
      ...args,
      errorCount: 0,
    });
  },
});

/**
 * Update source fetch status
 */
export const updateSourceStatus = mutation({
  args: {
    name: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db
      .query("newsSources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!source) {
      throw new Error(`News source not found: ${args.name}`);
    }

    const now = Date.now();

    if (args.success) {
      await ctx.db.patch(source._id, {
        lastFetchedAt: now,
        lastSuccessAt: now,
        errorCount: 0,
        lastError: undefined,
      });
    } else {
      await ctx.db.patch(source._id, {
        lastFetchedAt: now,
        errorCount: source.errorCount + 1,
        lastError: args.error,
      });
    }

    return source._id;
  },
});

/**
 * Delete a news source
 */
export const deleteSource = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db
      .query("newsSources")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (source) {
      await ctx.db.delete(source._id);
      return true;
    }

    return false;
  },
});
