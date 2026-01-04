import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // Users & Wallets
  // ============================================
  users: defineTable({
    evmWalletAddress: v.optional(v.string()),
    solanaWalletAddress: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_evm_wallet", ["evmWalletAddress"])
    .index("by_solana_wallet", ["solanaWalletAddress"]),

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
  // DCA Strategies
  // ============================================
  dcaStrategies: defineTable({
    userId: v.id("users"),
    walletId: v.id("wallets"),
    walletAddress: v.string(),

    // Basic info
    name: v.string(),
    description: v.optional(v.string()),

    // What to buy
    fromToken: v.object({
      symbol: v.string(),
      address: v.string(),
      chainId: v.number(),
      decimals: v.number(),
    }),
    toToken: v.object({
      symbol: v.string(),
      address: v.string(),
      chainId: v.number(),
      decimals: v.number(),
    }),

    // How much per execution
    amountPerExecutionUsd: v.number(), // e.g., 100 = $100 per buy

    // Schedule
    frequency: v.union(
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("custom")
    ),
    cronExpression: v.optional(v.string()), // For custom frequency
    executionHourUtc: v.number(), // 0-23, hour of day to execute
    executionDayOfWeek: v.optional(v.number()), // 0-6, for weekly (0 = Sunday)
    executionDayOfMonth: v.optional(v.number()), // 1-31, for monthly

    // Constraints
    maxSlippageBps: v.number(), // e.g., 100 = 1%
    maxGasUsd: v.number(), // Max gas to pay per execution
    skipIfGasAboveUsd: v.optional(v.number()), // Skip if gas exceeds this
    pauseIfPriceAboveUsd: v.optional(v.number()), // Pause if token price above
    pauseIfPriceBelowUsd: v.optional(v.number()), // Pause if token price below
    minAmountOut: v.optional(v.string()), // Minimum tokens to receive (Decimal)

    // Session key reference
    sessionKeyId: v.optional(v.id("sessionKeys")),

    // Status
    status: v.union(
      v.literal("draft"), // Not yet activated
      v.literal("pending_session"), // Waiting for session key
      v.literal("active"), // Running
      v.literal("paused"), // Temporarily paused
      v.literal("completed"), // User ended it
      v.literal("failed"), // Unrecoverable error
      v.literal("expired") // Session key expired
    ),
    pauseReason: v.optional(v.string()),

    // Scheduling state
    nextExecutionAt: v.optional(v.number()), // Timestamp of next scheduled run
    lastExecutionAt: v.optional(v.number()),

    // Lifetime stats
    totalExecutions: v.number(),
    successfulExecutions: v.number(),
    failedExecutions: v.number(),
    skippedExecutions: v.number(), // Due to gas, price bounds, etc.
    totalAmountSpentUsd: v.number(),
    totalTokensAcquired: v.string(), // Decimal string for precision
    averagePriceUsd: v.optional(v.number()),
    lastError: v.optional(v.string()),

    // Budget limits (optional)
    maxTotalSpendUsd: v.optional(v.number()), // Stop after spending this much
    maxExecutions: v.optional(v.number()), // Stop after N executions
    endDate: v.optional(v.number()), // Stop after this date

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    activatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_wallet", ["walletId"])
    .index("by_wallet_address", ["walletAddress"])
    .index("by_status", ["status"])
    .index("by_next_execution", ["status", "nextExecutionAt"]),

  // Individual DCA execution records
  dcaExecutions: defineTable({
    strategyId: v.id("dcaStrategies"),
    executionNumber: v.number(), // 1, 2, 3, etc.

    // Execution result
    status: v.union(
      v.literal("pending"), // Scheduled
      v.literal("running"), // In progress
      v.literal("completed"), // Success
      v.literal("failed"), // Error
      v.literal("skipped") // Skipped due to constraints
    ),

    // Skip reason (if skipped)
    skipReason: v.optional(
      v.union(
        v.literal("gas_too_high"),
        v.literal("price_above_limit"),
        v.literal("price_below_limit"),
        v.literal("insufficient_balance"),
        v.literal("session_expired"),
        v.literal("slippage_exceeded"),
        v.literal("manually_skipped")
      )
    ),

    // Market conditions at execution
    marketConditions: v.optional(
      v.object({
        tokenPriceUsd: v.number(),
        gasGwei: v.number(),
        estimatedGasUsd: v.number(),
      })
    ),

    // Quote details
    quote: v.optional(
      v.object({
        inputAmount: v.string(), // Amount of fromToken
        expectedOutputAmount: v.string(), // Expected toToken amount
        minimumOutputAmount: v.string(), // With slippage
        priceImpactBps: v.number(),
        route: v.optional(v.string()), // DEX route description
      })
    ),

    // Transaction details (if executed)
    txHash: v.optional(v.string()),
    chainId: v.number(),
    actualInputAmount: v.optional(v.string()),
    actualOutputAmount: v.optional(v.string()),
    actualPriceUsd: v.optional(v.number()), // Actual price paid
    gasUsed: v.optional(v.number()),
    gasPriceGwei: v.optional(v.number()),
    gasUsd: v.optional(v.number()),

    // Error info (if failed)
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),

    // Timing
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_strategy", ["strategyId"])
    .index("by_strategy_status", ["strategyId", "status"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"]),

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
  // Risk Policies (per user/wallet)
  // ============================================
  riskPolicies: defineTable({
    walletAddress: v.string(),
    config: v.object({
      maxPositionPercent: v.number(),
      maxPositionValueUsd: v.number(),
      maxDailyVolumeUsd: v.number(),
      maxDailyLossUsd: v.number(),
      maxSingleTxUsd: v.number(),
      requireApprovalAboveUsd: v.number(),
      maxSlippagePercent: v.number(),
      warnSlippagePercent: v.number(),
      maxGasPercent: v.number(),
      warnGasPercent: v.number(),
      minLiquidityUsd: v.number(),
      enabled: v.boolean(),
    }),
    updatedAt: v.number(),
  }).index("by_wallet", ["walletAddress"]),

  // ============================================
  // System Policy (singleton for platform controls)
  // ============================================
  systemPolicy: defineTable({
    emergencyStop: v.boolean(),
    emergencyStopReason: v.optional(v.string()),
    inMaintenance: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    blockedContracts: v.array(v.string()),
    blockedTokens: v.array(v.string()),
    blockedChains: v.array(v.number()),
    allowedChains: v.array(v.number()),
    protocolWhitelistEnabled: v.boolean(),
    allowedProtocols: v.array(v.string()),
    maxSingleTxUsd: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }),

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
  // Token Catalog (Enriched Token Metadata)
  // ============================================
  tokenCatalog: defineTable({
    // Identity
    address: v.string(),
    chainId: v.number(),
    symbol: v.string(),
    name: v.string(),
    decimals: v.number(),
    logoUrl: v.optional(v.string()),

    // Taxonomy
    categories: v.array(v.string()), // ["defi", "lending", "governance"]
    sector: v.optional(v.string()), // "DeFi", "Gaming", "Infrastructure"
    subsector: v.optional(v.string()), // "DEX", "Lending", "L2"

    // Protocol/Project info
    projectName: v.optional(v.string()), // "Aave", "Uniswap"
    projectSlug: v.optional(v.string()), // For API lookups (defillama, coingecko)
    coingeckoId: v.optional(v.string()),
    defillamaId: v.optional(v.string()),
    website: v.optional(v.string()),
    twitter: v.optional(v.string()),
    discord: v.optional(v.string()),
    github: v.optional(v.string()),

    // Market context
    marketCapTier: v.optional(v.string()), // "mega", "large", "mid", "small", "micro"
    isStablecoin: v.boolean(),
    isWrapped: v.boolean(),
    isLpToken: v.boolean(),
    isGovernanceToken: v.boolean(),
    isNative: v.boolean(),

    // Related tokens (for correlation)
    relatedTokens: v.array(
      v.object({
        address: v.string(),
        chainId: v.number(),
        relationship: v.string(), // "same_project", "competitor", "derivative", "wrapped"
      })
    ),

    // Data freshness
    lastUpdated: v.number(),
    dataSource: v.string(), // "coingecko", "defillama", "manual"
    enrichmentVersion: v.number(), // Schema version for re-enrichment

    // Additional metadata
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  })
    .index("by_chain_address", ["chainId", "address"])
    .index("by_symbol", ["symbol"])
    .index("by_project", ["projectSlug"])
    .index("by_sector", ["sector"])
    .index("by_coingecko", ["coingeckoId"])
    .index("by_last_updated", ["lastUpdated"]),

  // Portfolio Profiles (cached portfolio analysis)
  portfolioProfiles: defineTable({
    walletId: v.id("wallets"),
    walletAddress: v.string(),

    // Sector allocation (percentage)
    sectorAllocation: v.any(), // { "DeFi": 45.5, "Infrastructure": 30.2, ... }

    // Category exposure
    categoryExposure: v.any(), // { "lending": 20, "dex": 15, ... }

    // Risk profile
    riskProfile: v.object({
      diversificationScore: v.number(), // 0-100
      stablecoinPercent: v.number(),
      memePercent: v.number(),
      concentrationRisk: v.number(), // Top holding %
    }),

    // Token count by tier
    tokensByTier: v.any(), // { "mega": 2, "large": 3, "mid": 5, ... }

    // Timestamps
    calculatedAt: v.number(),
    portfolioValueUsd: v.optional(v.number()),
  })
    .index("by_wallet", ["walletId"])
    .index("by_wallet_address", ["walletAddress"])
    .index("by_calculated", ["calculatedAt"]),

  // ============================================
  // News Items (Aggregated & Processed News)
  // ============================================
  newsItems: defineTable({
    // Identity
    sourceId: v.string(), // Unique ID from source (URL hash or external ID)
    source: v.string(), // "rss:coindesk", "coingecko", "defillama"

    // Content
    title: v.string(),
    summary: v.optional(v.string()), // LLM-generated summary
    url: v.string(),
    imageUrl: v.optional(v.string()),
    publishedAt: v.number(),

    // Classification (LLM-derived)
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

    // Sentiment (LLM-derived)
    sentiment: v.optional(
      v.object({
        score: v.number(), // -1 to 1
        label: v.union(
          v.literal("very_negative"),
          v.literal("negative"),
          v.literal("neutral"),
          v.literal("positive"),
          v.literal("very_positive")
        ),
        confidence: v.number(), // 0 to 1
      })
    ),

    // Token associations
    relatedTokens: v.array(
      v.object({
        symbol: v.string(),
        address: v.optional(v.string()),
        chainId: v.optional(v.number()),
        relevanceScore: v.number(), // 0 to 1
      })
    ),

    // Related sectors/categories (for portfolio matching)
    relatedSectors: v.array(v.string()), // ["DeFi", "Infrastructure"]
    relatedCategories: v.array(v.string()), // ["lending", "dex"]

    // Importance scoring
    importance: v.optional(
      v.object({
        score: v.number(), // 0 to 1
        factors: v.array(v.string()), // ["major_protocol", "security_issue"]
      })
    ),

    // Processing metadata
    processedAt: v.optional(v.number()),
    processingVersion: v.number(), // Schema version for re-processing
    rawContent: v.optional(v.string()), // Original content for re-processing

    // Data freshness
    fetchedAt: v.number(),
    expiresAt: v.optional(v.number()), // For cleanup
  })
    .index("by_source_id", ["source", "sourceId"])
    .index("by_published", ["publishedAt"])
    .index("by_category", ["category"])
    .index("by_fetched", ["fetchedAt"])
    .index("by_processed", ["processedAt"])
    .index("by_expires", ["expiresAt"]),

  // News Sources Configuration (for cron management)
  newsSources: defineTable({
    name: v.string(), // "coindesk", "theblock", "coingecko"
    type: v.union(
      v.literal("rss"),
      v.literal("api"),
      v.literal("scraper")
    ),
    url: v.string(), // RSS URL or API endpoint
    enabled: v.boolean(),
    lastFetchedAt: v.optional(v.number()),
    lastSuccessAt: v.optional(v.number()),
    errorCount: v.number(),
    lastError: v.optional(v.string()),
    config: v.optional(v.any()), // Source-specific config
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"])
    .index("by_enabled", ["enabled"]),

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

  // ============================================
  // Event Monitoring: Subscriptions
  // ============================================
  subscriptions: defineTable({
    // Identity
    id: v.string(), // UUID from backend
    userId: v.optional(v.string()),

    // What to watch
    address: v.string(),
    chain: v.string(), // "ethereum", "polygon", "solana", etc.
    eventTypes: v.array(v.string()), // ["swap", "transfer_in", "transfer_out"]

    // Webhook config
    webhookId: v.optional(v.string()), // External webhook ID (Alchemy/Helius)
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("failed"),
      v.literal("expired")
    ),

    // Metadata
    label: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_external_id", ["id"])
    .index("by_user", ["userId"])
    .index("by_address_chain", ["address", "chain"])
    .index("by_status", ["status"])
    .index("by_webhook", ["webhookId"]),

  // ============================================
  // Event Monitoring: Wallet Activity
  // ============================================
  walletActivity: defineTable({
    // Identity
    id: v.string(), // UUID from backend
    walletAddress: v.string(),
    chain: v.string(),
    eventType: v.string(), // "swap", "transfer_in", "transfer_out", etc.

    // Transaction info
    txHash: v.string(),
    blockNumber: v.number(),
    timestamp: v.number(), // Unix timestamp ms

    // Direction relative to watched wallet
    direction: v.string(), // "in", "out", "internal"

    // Value
    valueUsd: v.optional(v.number()),

    // Counterparty
    counterpartyAddress: v.optional(v.string()),
    counterpartyLabel: v.optional(v.string()), // "uniswap_v3", "aave_v3", etc.

    // For copy trading
    isCopyable: v.boolean(),
    copyRelevanceScore: v.number(), // 0-1

    // Parsed transaction details (optional, for rich data)
    parsedTx: v.optional(v.any()),

    // Timestamps
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["id"])
    .index("by_wallet", ["walletAddress"])
    .index("by_wallet_chain", ["walletAddress", "chain"])
    .index("by_tx_hash", ["txHash"])
    .index("by_timestamp", ["timestamp"])
    .index("by_event_type", ["eventType"])
    .index("by_copyable", ["isCopyable", "timestamp"]),

  // ============================================
  // Copy Trading: Watched Wallets (Leaders)
  // ============================================
  watchedWallets: defineTable({
    // Identity
    address: v.string(),
    chain: v.string(),

    // Labels
    label: v.optional(v.string()),
    notes: v.optional(v.string()),

    // Performance metrics
    totalTrades: v.number(),
    winRate: v.optional(v.number()), // 0-1
    avgTradePnlPercent: v.optional(v.number()),
    totalPnlUsd: v.optional(v.number()),
    sharpeRatio: v.optional(v.number()),
    maxDrawdownPercent: v.optional(v.number()),

    // Activity metrics
    avgTradesPerDay: v.optional(v.number()),
    mostTradedTokens: v.array(v.string()),
    preferredSectors: v.array(v.string()),

    // Follower info
    followerCount: v.number(),
    totalCopiedVolumeUsd: v.number(),

    // Status
    isActive: v.boolean(),
    firstSeenAt: v.number(),
    lastActiveAt: v.number(),

    // Data quality
    dataQualityScore: v.number(), // 0-1, how much history we have
    lastAnalyzedAt: v.optional(v.number()),
  })
    .index("by_address_chain", ["address", "chain"])
    .index("by_win_rate", ["winRate"])
    .index("by_pnl", ["totalPnlUsd"])
    .index("by_followers", ["followerCount"])
    .index("by_active", ["isActive", "lastActiveAt"]),

  // ============================================
  // Copy Trading: Relationships
  // ============================================
  copyRelationships: defineTable({
    // Identity
    id: v.string(), // UUID from backend
    userId: v.string(),
    followerAddress: v.string(),
    followerChain: v.string(),

    // Config (embedded)
    config: v.object({
      leaderAddress: v.string(),
      leaderChain: v.string(),
      leaderLabel: v.optional(v.string()),
      sizingMode: v.string(), // "percentage", "fixed", "proportional"
      sizeValue: v.string(), // Decimal as string
      minTradeUsd: v.string(),
      maxTradeUsd: v.optional(v.string()),
      tokenWhitelist: v.optional(v.array(v.string())),
      tokenBlacklist: v.optional(v.array(v.string())),
      allowedActions: v.array(v.string()),
      delaySeconds: v.number(),
      maxDelaySeconds: v.number(),
      maxSlippageBps: v.number(),
      maxDailyTrades: v.number(),
      maxDailyVolumeUsd: v.string(),
      sessionKeyId: v.optional(v.string()),
    }),

    // Status
    isActive: v.boolean(),
    isPaused: v.boolean(),
    pauseReason: v.optional(v.string()),

    // Daily limits (reset daily)
    dailyTradeCount: v.number(),
    dailyVolumeUsd: v.string(),
    dailyResetAt: v.number(),

    // Lifetime stats
    totalTrades: v.number(),
    successfulTrades: v.number(),
    failedTrades: v.number(),
    skippedTrades: v.number(),
    totalVolumeUsd: v.string(),
    totalPnlUsd: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastCopyAt: v.optional(v.number()),
  })
    .index("by_external_id", ["id"])
    .index("by_user", ["userId"])
    .index("by_follower", ["followerAddress", "followerChain"])
    .index("by_leader", ["config.leaderAddress", "config.leaderChain"])
    .index("by_active", ["isActive", "isPaused"]),

  // ============================================
  // Copy Trading: Executions
  // ============================================
  copyExecutions: defineTable({
    // Identity
    id: v.string(), // UUID from backend
    relationshipId: v.string(),

    // Signal info (embedded)
    signal: v.object({
      leaderAddress: v.string(),
      leaderChain: v.string(),
      txHash: v.string(),
      blockNumber: v.number(),
      timestamp: v.number(),
      action: v.string(),
      tokenInAddress: v.string(),
      tokenInSymbol: v.optional(v.string()),
      tokenInAmount: v.string(),
      tokenOutAddress: v.string(),
      tokenOutSymbol: v.optional(v.string()),
      tokenOutAmount: v.optional(v.string()),
      valueUsd: v.optional(v.string()),
      dex: v.optional(v.string()),
    }),

    // Status
    status: v.string(), // "pending", "queued", "executing", "completed", "failed", "skipped", "cancelled"
    skipReason: v.optional(v.string()),

    // Sizing
    calculatedSizeUsd: v.optional(v.string()),
    actualSizeUsd: v.optional(v.string()),

    // Transaction
    txHash: v.optional(v.string()),
    gasUsed: v.optional(v.number()),
    gasPriceGwei: v.optional(v.string()),
    gasCostUsd: v.optional(v.string()),

    // Result
    tokenOutAmount: v.optional(v.string()),
    slippageBps: v.optional(v.number()),
    errorMessage: v.optional(v.string()),

    // Timing
    signalReceivedAt: v.number(),
    executionStartedAt: v.optional(v.number()),
    executionCompletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["id"])
    .index("by_relationship", ["relationshipId"])
    .index("by_relationship_status", ["relationshipId", "status"])
    .index("by_status", ["status"])
    .index("by_signal_received", ["signalReceivedAt"]),
});
