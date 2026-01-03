/**
 * Subscriptions - Event monitoring subscription management
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a subscription by its UUID
 */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_id", (q) => q.eq("id", id))
      .first();
  },
});

/**
 * Get subscription by address and chain
 */
export const getByAddressChain = query({
  args: {
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, { address, chain }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", address.toLowerCase()).eq("chain", chain)
      )
      .first();
  },
});

/**
 * List all active subscriptions
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * List subscriptions for a user
 */
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * List subscriptions by chain
 */
export const listByChain = query({
  args: { chain: v.string() },
  handler: async (ctx, { chain }) => {
    const subs = await ctx.db.query("subscriptions").collect();
    return subs.filter((s) => s.chain === chain && s.status === "active");
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create or update a subscription
 */
export const upsert = mutation({
  args: {
    id: v.string(),
    userId: v.optional(v.string()),
    address: v.string(),
    chain: v.string(),
    eventTypes: v.array(v.string()),
    webhookId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("failed"),
      v.literal("expired")
    ),
    label: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        eventTypes: args.eventTypes,
        webhookId: args.webhookId,
        status: args.status,
        label: args.label,
        updatedAt: args.updatedAt,
        lastActivityAt: args.lastActivityAt,
        errorMessage: args.errorMessage,
      });
      return { updated: true, id: args.id };
    } else {
      // Insert
      await ctx.db.insert("subscriptions", {
        id: args.id,
        userId: args.userId,
        address: args.address.toLowerCase(),
        chain: args.chain,
        eventTypes: args.eventTypes,
        webhookId: args.webhookId,
        status: args.status,
        label: args.label,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        lastActivityAt: args.lastActivityAt,
        errorMessage: args.errorMessage,
      });
      return { created: true, id: args.id };
    }
  },
});

/**
 * Update subscription status
 */
export const updateStatus = mutation({
  args: {
    id: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("failed"),
      v.literal("expired")
    ),
    updatedAt: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, updatedAt, errorMessage }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_id", (q) => q.eq("id", id))
      .first();

    if (!sub) {
      throw new Error(`Subscription ${id} not found`);
    }

    await ctx.db.patch(sub._id, {
      status,
      updatedAt,
      errorMessage,
    });

    return { updated: true };
  },
});

/**
 * Update last activity timestamp
 */
export const updateLastActivity = mutation({
  args: {
    id: v.string(),
    lastActivityAt: v.number(),
  },
  handler: async (ctx, { id, lastActivityAt }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_id", (q) => q.eq("id", id))
      .first();

    if (!sub) {
      return { updated: false };
    }

    await ctx.db.patch(sub._id, {
      lastActivityAt,
      updatedAt: lastActivityAt,
    });

    return { updated: true };
  },
});

/**
 * Delete a subscription
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_id", (q) => q.eq("id", id))
      .first();

    if (!sub) {
      return { deleted: false };
    }

    await ctx.db.delete(sub._id);
    return { deleted: true };
  },
});
