/**
 * Wallet Activity - Event monitoring activity storage
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get activity by address
 */
export const getByAddress = query({
  args: {
    address: v.string(),
    chain: v.optional(v.string()),
    eventType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { address, chain, eventType, limit = 50 }) => {
    const query = ctx.db
      .query("walletActivity")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", address.toLowerCase()));

    const activities = await query.order("desc").take(limit * 2); // Over-fetch for filtering

    // Apply filters
    let filtered = activities;

    if (chain) {
      filtered = filtered.filter((a) => a.chain === chain);
    }

    if (eventType) {
      filtered = filtered.filter((a) => a.eventType === eventType);
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Get activity by transaction hash
 */
export const getByTxHash = query({
  args: { txHash: v.string() },
  handler: async (ctx, { txHash }) => {
    return await ctx.db
      .query("walletActivity")
      .withIndex("by_tx_hash", (q) => q.eq("txHash", txHash))
      .collect();
  },
});

/**
 * Get recent copyable activities
 */
export const getCopyable = query({
  args: {
    limit: v.optional(v.number()),
    minRelevanceScore: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50, minRelevanceScore = 0 }) => {
    const activities = await ctx.db
      .query("walletActivity")
      .withIndex("by_copyable", (q) => q.eq("isCopyable", true))
      .order("desc")
      .take(limit * 2);

    // Filter by relevance score
    const filtered = activities.filter(
      (a) => a.copyRelevanceScore >= minRelevanceScore
    );

    return filtered.slice(0, limit);
  },
});

/**
 * Get activity for multiple wallets
 */
export const getForWallets = query({
  args: {
    addresses: v.array(v.string()),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { addresses, limit = 100, sinceTimestamp }) => {
    const addressSet = new Set(addresses.map((a) => a.toLowerCase()));

    let activities = await ctx.db
      .query("walletActivity")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit * 10); // Over-fetch since we're filtering

    // Filter by addresses
    activities = activities.filter((a) =>
      addressSet.has(a.walletAddress.toLowerCase())
    );

    // Filter by timestamp if provided
    if (sinceTimestamp) {
      activities = activities.filter((a) => a.timestamp >= sinceTimestamp);
    }

    return activities.slice(0, limit);
  },
});

/**
 * Get activity count by type for a wallet
 */
export const getCountsByType = query({
  args: {
    address: v.string(),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { address, sinceTimestamp }) => {
    let activities = await ctx.db
      .query("walletActivity")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", address.toLowerCase()))
      .collect();

    if (sinceTimestamp) {
      activities = activities.filter((a) => a.timestamp >= sinceTimestamp);
    }

    // Count by type
    const counts: Record<string, number> = {};
    for (const activity of activities) {
      counts[activity.eventType] = (counts[activity.eventType] || 0) + 1;
    }

    return counts;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Insert a wallet activity
 */
export const insert = mutation({
  args: {
    id: v.string(),
    walletAddress: v.string(),
    chain: v.string(),
    eventType: v.string(),
    txHash: v.string(),
    blockNumber: v.number(),
    timestamp: v.number(),
    direction: v.string(),
    valueUsd: v.optional(v.number()),
    counterpartyAddress: v.optional(v.string()),
    counterpartyLabel: v.optional(v.string()),
    isCopyable: v.boolean(),
    copyRelevanceScore: v.number(),
    parsedTx: v.optional(v.any()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate by id
    const existing = await ctx.db
      .query("walletActivity")
      .withIndex("by_external_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      return { created: false, duplicate: true, id: args.id };
    }

    await ctx.db.insert("walletActivity", {
      id: args.id,
      walletAddress: args.walletAddress.toLowerCase(),
      chain: args.chain,
      eventType: args.eventType,
      txHash: args.txHash,
      blockNumber: args.blockNumber,
      timestamp: args.timestamp,
      direction: args.direction,
      valueUsd: args.valueUsd,
      counterpartyAddress: args.counterpartyAddress?.toLowerCase(),
      counterpartyLabel: args.counterpartyLabel,
      isCopyable: args.isCopyable,
      copyRelevanceScore: args.copyRelevanceScore,
      parsedTx: args.parsedTx,
      createdAt: args.createdAt,
      processedAt: args.processedAt,
    });

    return { created: true, id: args.id };
  },
});

/**
 * Insert multiple activities (batch)
 */
export const insertBatch = mutation({
  args: {
    activities: v.array(
      v.object({
        id: v.string(),
        walletAddress: v.string(),
        chain: v.string(),
        eventType: v.string(),
        txHash: v.string(),
        blockNumber: v.number(),
        timestamp: v.number(),
        direction: v.string(),
        valueUsd: v.optional(v.number()),
        counterpartyAddress: v.optional(v.string()),
        counterpartyLabel: v.optional(v.string()),
        isCopyable: v.boolean(),
        copyRelevanceScore: v.number(),
        createdAt: v.number(),
        processedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { activities }) => {
    let created = 0;
    let duplicates = 0;

    for (const activity of activities) {
      // Check for duplicate
      const existing = await ctx.db
        .query("walletActivity")
        .withIndex("by_external_id", (q) => q.eq("id", activity.id))
        .first();

      if (existing) {
        duplicates++;
        continue;
      }

      await ctx.db.insert("walletActivity", {
        id: activity.id,
        walletAddress: activity.walletAddress.toLowerCase(),
        chain: activity.chain,
        eventType: activity.eventType,
        txHash: activity.txHash,
        blockNumber: activity.blockNumber,
        timestamp: activity.timestamp,
        direction: activity.direction,
        valueUsd: activity.valueUsd,
        counterpartyAddress: activity.counterpartyAddress?.toLowerCase(),
        counterpartyLabel: activity.counterpartyLabel,
        isCopyable: activity.isCopyable,
        copyRelevanceScore: activity.copyRelevanceScore,
        createdAt: activity.createdAt,
        processedAt: activity.processedAt,
      });

      created++;
    }

    return { created, duplicates };
  },
});

/**
 * Delete old activities (cleanup)
 */
export const deleteOld = mutation({
  args: {
    olderThanTimestamp: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { olderThanTimestamp, limit = 100 }) => {
    const activities = await ctx.db
      .query("walletActivity")
      .withIndex("by_timestamp")
      .order("asc")
      .take(limit * 2);

    let deleted = 0;
    for (const activity of activities) {
      if (activity.timestamp < olderThanTimestamp && deleted < limit) {
        await ctx.db.delete(activity._id);
        deleted++;
      }
    }

    return { deleted };
  },
});
