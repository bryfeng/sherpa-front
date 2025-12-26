import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List conversations for a wallet
 */
export const listByWallet = query({
  args: {
    walletId: v.id("wallets"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeArchived) {
      return await ctx.db
        .query("conversations")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_wallet_archived", (q) =>
        q.eq("walletId", args.walletId).eq("archived", false)
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get a conversation by ID with its messages
 */
export const getWithMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return { ...conversation, messages };
  },
});

/**
 * Create a new conversation
 */
export const create = mutation({
  args: {
    walletId: v.id("wallets"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      walletId: args.walletId,
      title: args.title,
      archived: false,
      totalTokens: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Add a message to a conversation
 */
export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    tokenCount: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      tokenCount: args.tokenCount,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    // Update conversation token count and timestamp
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        totalTokens: conversation.totalTokens + (args.tokenCount || 0),
        updatedAt: Date.now(),
      });
    }

    return messageId;
  },
});

/**
 * Update conversation title
 */
export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Archive a conversation
 */
export const archive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Unarchive a conversation
 */
export const unarchive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      archived: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a conversation and all its messages
 */
export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Delete all messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});
