import { query } from "./_generated/server";

/**
 * Simple health check query to verify Convex is working
 */
export const check = query({
  args: {},
  handler: async (ctx) => {
    // Try to count users as a simple DB test
    const userCount = await ctx.db.query("users").collect();

    return {
      status: "ok",
      timestamp: Date.now(),
      database: "connected",
      userCount: userCount.length,
    };
  },
});
