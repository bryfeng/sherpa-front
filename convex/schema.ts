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
    walletAddress: v.string(),
    // State machine state
    currentState: v.union(
      v.literal("idle"),
      v.literal("analyzing"),
      v.literal("planning"),
      v.literal("awaiting_approval"),
      v.literal("executing"),
      v.literal("monitoring"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("paused"),
      v.literal("cancelled")
    ),
    stateEnteredAt: v.number(),
    // Execution steps
    steps: v.array(
      v.object({
        id: v.string(),
        stepNumber: v.number(),
        description: v.string(),
        actionType: v.string(),
        status: v.string(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        inputData: v.optional(v.any()),
        outputData: v.optional(v.any()),
        txHash: v.optional(v.string()),
        chainId: v.optional(v.number()),
        gasUsed: v.optional(v.number()),
        gasPriceGwei: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        retryCount: v.number(),
      })
    ),
    currentStepIndex: v.number(),
    // State history
    stateHistory: v.array(
      v.object({
        id: v.string(),
        fromState: v.string(),
        toState: v.string(),
        trigger: v.string(),
        timestamp: v.number(),
        reason: v.optional(v.string()),
        context: v.optional(v.any()),
        errorMessage: v.optional(v.string()),
        errorCode: v.optional(v.string()),
      })
    ),
    // Timing
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Approval
    requiresApproval: v.boolean(),
    approvalReason: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    // Error info
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    recoverable: v.boolean(),
    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_strategy", ["strategyId"])
    .index("by_state", ["currentState"])
    .index("by_wallet", ["walletAddress"])
    .index("by_wallet_state", ["walletAddress", "currentState"]),

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
  // Auth: Nonces (for SIWE)
  // ============================================
  nonces: defineTable({
    walletAddress: v.string(),
    nonce: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_wallet_nonce", ["walletAddress", "nonce"])
    .index("by_expiry", ["expiresAt"]),

  // ============================================
  // Auth: Sessions
  // ============================================
  sessions: defineTable({
    sessionId: v.string(),
    walletAddress: v.string(),
    chainId: v.number(),
    userId: v.optional(v.string()),
    walletId: v.optional(v.string()),
    scopes: v.array(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
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

  // ============================================
  // Session Keys (for autonomous agent access)
  // ============================================
  sessionKeys: defineTable({
    sessionId: v.string(),
    walletAddress: v.string(),
    agentId: v.optional(v.string()),
    // Permissions
    permissions: v.array(v.string()), // ["swap", "bridge", "transfer"]
    // Value limits
    valueLimits: v.object({
      maxValuePerTxUsd: v.string(), // Decimal as string
      maxTotalValueUsd: v.string(),
      maxTransactions: v.optional(v.number()),
      totalValueUsedUsd: v.string(),
      transactionCount: v.number(),
    }),
    // Allowlists
    chainAllowlist: v.array(v.number()),
    contractAllowlist: v.array(v.string()),
    tokenAllowlist: v.array(v.string()),
    // Timing
    createdAt: v.number(),
    expiresAt: v.number(),
    // Status
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
      v.literal("exhausted")
    ),
    revokedAt: v.optional(v.number()),
    revokeReason: v.optional(v.string()),
    lastUsedAt: v.optional(v.number()),
    // Usage log (recent entries only)
    usageLog: v.optional(v.array(v.any())),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_wallet", ["walletAddress"])
    .index("by_wallet_status", ["walletAddress", "status"])
    .index("by_expiry", ["expiresAt"])
    .index("by_agent", ["agentId"]),

  // ============================================
  // Admin: Users (separate from regular users)
  // ============================================
  admin_users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("viewer"),
      v.literal("support"),
      v.literal("operator"),
      v.literal("admin"),
      v.literal("super_admin")
    ),
    avatar: v.optional(v.string()),
    isActive: v.boolean(),
    failedLoginAttempts: v.number(),
    lockedUntil: v.optional(v.number()),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.id("admin_users")),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

  // ============================================
  // Admin: Sessions
  // ============================================
  admin_sessions: defineTable({
    sessionId: v.string(),
    adminUserId: v.id("admin_users"),
    expiresAt: v.number(),
    createdAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_admin_user", ["adminUserId"])
    .index("by_expiry", ["expiresAt"]),

  // ============================================
  // Admin: Audit Log
  // ============================================
  audit_log: defineTable({
    adminUserId: v.id("admin_users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminUserId"])
    .index("by_action", ["action"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created", ["createdAt"]),

  // ============================================
  // Admin: User Flags (moderation)
  // ============================================
  user_flags: defineTable({
    userId: v.id("users"),
    flagType: v.union(
      v.literal("verified"),
      v.literal("banned"),
      v.literal("suspended"),
      v.literal("pro_override"),
      v.literal("rate_limit_override")
    ),
    reason: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("admin_users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "flagType"])
    .index("by_type", ["flagType"]),

  // ============================================
  // Admin: System Metrics
  // ============================================
  system_metrics: defineTable({
    metricType: v.string(),
    date: v.string(),
    data: v.object({
      totalUsers: v.optional(v.number()),
      activeUsers: v.optional(v.number()),
      newUsers: v.optional(v.number()),
      totalStrategies: v.optional(v.number()),
      activeStrategies: v.optional(v.number()),
      totalTransactions: v.optional(v.number()),
      transactionVolume: v.optional(v.number()),
      chatMessages: v.optional(v.number()),
      errors: v.optional(v.number()),
    }),
    createdAt: v.number(),
  }).index("by_type_date", ["metricType", "date"]),
});
