import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // Users & Wallets
  // ============================================
  users: defineTable({
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  wallets: defineTable({
    userId: v.id("users"),
    address: v.string(),
    chain: v.string(),
    label: v.optional(v.string()),
    isPrimary: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_address_chain", ["address", "chain"]),

  // ============================================
  // Conversations & Messages
  // ============================================
  conversations: defineTable({
    walletId: v.id("wallets"),
    title: v.optional(v.string()),
    archived: v.boolean(),
    totalTokens: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["walletId"])
    .index("by_wallet_archived", ["walletId", "archived"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    tokenCount: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  // ============================================
  // Strategies & Execution
  // ============================================
  strategies: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    config: v.any(), // Strategy configuration object
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
    // Scheduling
    cronExpression: v.optional(v.string()), // e.g., "0 */4 * * *"
    lastExecutedAt: v.optional(v.number()),
    nextExecutionAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_next_execution", ["nextExecutionAt"]),

  strategyExecutions: defineTable({
    strategyId: v.id("strategies"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_strategy", ["strategyId"])
    .index("by_status", ["status"]),

  // ============================================
  // Transactions
  // ============================================
  transactions: defineTable({
    executionId: v.optional(v.id("strategyExecutions")),
    walletId: v.id("wallets"),
    txHash: v.optional(v.string()),
    chain: v.string(),
    type: v.union(
      v.literal("swap"),
      v.literal("bridge"),
      v.literal("transfer"),
      v.literal("approve")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("confirmed"),
      v.literal("failed"),
      v.literal("reverted")
    ),
    inputData: v.any(),
    outputData: v.optional(v.any()),
    gasUsed: v.optional(v.number()),
    gasPrice: v.optional(v.number()),
    valueUsd: v.optional(v.number()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_wallet", ["walletId"])
    .index("by_execution", ["executionId"])
    .index("by_tx_hash", ["txHash"])
    .index("by_status", ["status"])
    .index("by_wallet_status", ["walletId", "status"]),

  // ============================================
  // Audit Trail
  // ============================================
  agentDecisions: defineTable({
    executionId: v.id("strategyExecutions"),
    decisionType: v.string(),
    inputContext: v.any(),
    reasoning: v.string(),
    actionTaken: v.any(),
    riskAssessment: v.any(),
    createdAt: v.number(),
  }).index("by_execution", ["executionId"]),

  // ============================================
  // Sessions & Auth
  // ============================================
  sessions: defineTable({
    walletAddress: v.string(),
    chainId: v.number(),
    nonce: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_expiry", ["expiresAt"]),

  // ============================================
  // Rate Limiting
  // ============================================
  rateLimits: defineTable({
    key: v.string(), // e.g., "chat:0x123..." or "global:alchemy"
    count: v.number(),
    windowStart: v.number(),
    windowSeconds: v.number(),
  }).index("by_key", ["key"]),
});
