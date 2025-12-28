import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if a request is within rate limits and increment the counter.
 *
 * Uses a sliding window approach - counts requests in the last N seconds.
 */
export const checkAndIncrement = mutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowSeconds: v.number(),
    now: v.number(), // Current timestamp in milliseconds
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; retryAfter: number; remaining: number }> => {
    const windowStart = args.now - args.windowSeconds * 1000;

    // Get existing rate limit record
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing) {
      // First request - create record
      await ctx.db.insert("rateLimits", {
        key: args.key,
        count: 1,
        windowStart: args.now,
        windowSeconds: args.windowSeconds,
      });

      return {
        allowed: true,
        retryAfter: 0,
        remaining: args.limit - 1,
      };
    }

    // Check if we're in a new window
    if (existing.windowStart < windowStart) {
      // Reset the window
      await ctx.db.patch(existing._id, {
        count: 1,
        windowStart: args.now,
        windowSeconds: args.windowSeconds,
      });

      return {
        allowed: true,
        retryAfter: 0,
        remaining: args.limit - 1,
      };
    }

    // We're in the same window - check if limit exceeded
    if (existing.count >= args.limit) {
      // Calculate retry after (time until window resets)
      const windowEnd = existing.windowStart + args.windowSeconds * 1000;
      const retryAfter = Math.ceil((windowEnd - args.now) / 1000);

      return {
        allowed: false,
        retryAfter: Math.max(1, retryAfter),
        remaining: 0,
      };
    }

    // Increment counter
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });

    return {
      allowed: true,
      retryAfter: 0,
      remaining: args.limit - existing.count - 1,
    };
  },
});

/**
 * Get current rate limit status for a key (without incrementing)
 */
export const getStatus = query({
  args: {
    key: v.string(),
    limit: v.number(),
    windowSeconds: v.number(),
  },
  handler: async (ctx, args): Promise<{ count: number; remaining: number; resetAt: number }> => {
    const now = Date.now();
    const windowStart = now - args.windowSeconds * 1000;

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing || existing.windowStart < windowStart) {
      return {
        count: 0,
        remaining: args.limit,
        resetAt: now + args.windowSeconds * 1000,
      };
    }

    return {
      count: existing.count,
      remaining: Math.max(0, args.limit - existing.count),
      resetAt: existing.windowStart + args.windowSeconds * 1000,
    };
  },
});

/**
 * Reset rate limit for a key (admin function)
 */
export const reset = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Clean up old rate limit records (called by cron)
 */
export const cleanup = mutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const now = Date.now();
    // Delete records older than 1 hour (they're no longer needed)
    const cutoff = now - 60 * 60 * 1000;

    const allRecords = await ctx.db.query("rateLimits").collect();

    let deletedCount = 0;
    for (const record of allRecords) {
      const windowEnd = record.windowStart + record.windowSeconds * 1000;
      if (windowEnd < cutoff) {
        await ctx.db.delete(record._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
