/**
 * Admin configuration management - queries and mutations.
 *
 * Handles runtime system configuration for:
 * - Feature flags (provider toggles)
 * - Rate limits
 * - Risk parameters
 * - Token gating
 * - LLM settings
 * - Agent runtime settings
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Helper to verify admin session with write:settings permission
async function verifyAdminWithSettings(ctx: any, sessionId: string) {
  const session = await ctx.db
    .query("admin_sessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", sessionId))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: Invalid session");
  }

  const admin = await ctx.db.get(session.adminUserId);
  if (!admin || !admin.isActive) {
    throw new Error("Unauthorized: Inactive admin");
  }

  // Check permission (admin and super_admin have write:settings)
  const hasPermission = admin.role === "admin" || admin.role === "super_admin";
  if (!hasPermission) {
    throw new Error("Unauthorized: Insufficient permissions");
  }

  return admin;
}

// Helper to verify read-only admin session
async function verifyAdminRead(ctx: any, sessionId: string) {
  const session = await ctx.db
    .query("admin_sessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", sessionId))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: Invalid session");
  }

  const admin = await ctx.db.get(session.adminUserId);
  if (!admin || !admin.isActive) {
    throw new Error("Unauthorized: Inactive admin");
  }

  return admin;
}

// Default configuration values
const DEFAULT_CONFIG: Record<string, { value: any; description: string; category: string }> = {
  // Feature Flags
  "feature_flags.enable_alchemy": {
    value: true,
    description: "Enable Alchemy provider for EVM chains",
    category: "feature_flags",
  },
  "feature_flags.enable_coingecko": {
    value: true,
    description: "Enable Coingecko for price data",
    category: "feature_flags",
  },
  "feature_flags.enable_jupiter": {
    value: true,
    description: "Enable Jupiter provider for Solana token lookups",
    category: "feature_flags",
  },
  "feature_flags.enable_birdeye": {
    value: true,
    description: "Enable Birdeye provider for trader analytics",
    category: "feature_flags",
  },
  "feature_flags.enable_gmx": {
    value: true,
    description: "Enable GMX v2 perps provider",
    category: "feature_flags",
  },
  "feature_flags.enable_perennial": {
    value: true,
    description: "Enable Perennial perps provider",
    category: "feature_flags",
  },
  "feature_flags.enable_rhinestone": {
    value: false,
    description: "Enable Rhinestone Smart Wallet integration",
    category: "feature_flags",
  },
  "feature_flags.enable_swig": {
    value: false,
    description: "Enable Swig smart wallet integration (Solana)",
    category: "feature_flags",
  },
  "feature_flags.enable_streaming": {
    value: false,
    description: "Enable streaming responses for chat",
    category: "feature_flags",
  },
  "feature_flags.fake_perps": {
    value: true,
    description: "Use deterministic perps data mocks",
    category: "feature_flags",
  },

  // Rate Limits
  "rate_limits.enabled": {
    value: true,
    description: "Enable rate limiting middleware",
    category: "rate_limits",
  },
  "rate_limits.chat_per_minute": {
    value: 30,
    description: "Max chat requests per minute per user",
    category: "rate_limits",
  },
  "rate_limits.auth_per_minute": {
    value: 10,
    description: "Max auth requests per minute per user",
    category: "rate_limits",
  },
  "rate_limits.portfolio_per_minute": {
    value: 60,
    description: "Max portfolio requests per minute per user",
    category: "rate_limits",
  },
  "rate_limits.strategies_per_minute": {
    value: 30,
    description: "Max strategy requests per minute per user",
    category: "rate_limits",
  },
  "rate_limits.default_per_minute": {
    value: 100,
    description: "Default rate limit per minute per user",
    category: "rate_limits",
  },
  "rate_limits.alchemy_global": {
    value: 1000,
    description: "Global Alchemy requests per minute",
    category: "rate_limits",
  },
  "rate_limits.coingecko_global": {
    value: 100,
    description: "Global Coingecko requests per minute",
    category: "rate_limits",
  },
  "rate_limits.anthropic_global": {
    value: 100,
    description: "Global Anthropic requests per minute",
    category: "rate_limits",
  },

  // Risk Defaults
  "risk_defaults.max_leverage": {
    value: 3.0,
    description: "Default maximum leverage for perps",
    category: "risk_defaults",
  },
  "risk_defaults.max_daily_loss_usd": {
    value: 300.0,
    description: "Default maximum daily loss budget (USD)",
    category: "risk_defaults",
  },
  "risk_defaults.max_position_notional_usd": {
    value: 5000.0,
    description: "Default maximum position notional (USD)",
    category: "risk_defaults",
  },
  "risk_defaults.per_trade_risk_cap_usd": {
    value: 150.0,
    description: "Default maximum per-trade risk (USD)",
    category: "risk_defaults",
  },
  "risk_defaults.kelly_cap": {
    value: 0.5,
    description: "Maximum Kelly fraction for sizing",
    category: "risk_defaults",
  },
  "risk_defaults.var_confidence": {
    value: 0.95,
    description: "Default VaR confidence level",
    category: "risk_defaults",
  },

  // Token Gating
  "token_gating.pro_enabled": {
    value: false,
    description: "Enable token gating for Pro tier",
    category: "token_gating",
  },
  "token_gating.pro_token_address": {
    value: "",
    description: "Contract address that unlocks Pro access",
    category: "token_gating",
  },
  "token_gating.pro_token_chain": {
    value: "ethereum",
    description: "Chain for the entitlement token",
    category: "token_gating",
  },
  "token_gating.pro_token_standard": {
    value: "erc20",
    description: "Token standard (erc20, erc721, erc1155)",
    category: "token_gating",
  },
  "token_gating.pro_token_min_balance": {
    value: "0",
    description: "Minimum balance required for Pro (human units)",
    category: "token_gating",
  },
  "token_gating.pro_token_decimals": {
    value: 18,
    description: "Token decimals for balance checks",
    category: "token_gating",
  },

  // LLM Settings
  "llm_settings.provider": {
    value: "anthropic",
    description: "Default LLM provider",
    category: "llm_settings",
  },
  "llm_settings.model": {
    value: "claude-sonnet-4-5-20250929",
    description: "Default LLM model",
    category: "llm_settings",
  },
  "llm_settings.max_tokens": {
    value: 4000,
    description: "Maximum tokens for LLM response",
    category: "llm_settings",
  },
  "llm_settings.temperature": {
    value: 0.7,
    description: "LLM temperature setting",
    category: "llm_settings",
  },
  "llm_settings.context_window_size": {
    value: 8000,
    description: "Context window size for conversations",
    category: "llm_settings",
  },

  // Agent Runtime
  "agent_runtime.enabled": {
    value: true,
    description: "Enable background agent runtime",
    category: "agent_runtime",
  },
  "agent_runtime.default_interval_seconds": {
    value: 60,
    description: "Default tick interval for strategies",
    category: "agent_runtime",
  },
  "agent_runtime.max_concurrency": {
    value: 4,
    description: "Maximum concurrent strategy tasks",
    category: "agent_runtime",
  },
  "agent_runtime.tick_timeout_seconds": {
    value: 20,
    description: "Max seconds per strategy tick",
    category: "agent_runtime",
  },
};

// Get all configuration by category
export const getConfigByCategory = query({
  args: {
    sessionId: v.string(),
    category: v.union(
      v.literal("feature_flags"),
      v.literal("rate_limits"),
      v.literal("risk_defaults"),
      v.literal("token_gating"),
      v.literal("llm_settings"),
      v.literal("agent_runtime")
    ),
  },
  handler: async (ctx, args) => {
    await verifyAdminRead(ctx, args.sessionId);

    // Get stored configs for this category
    const storedConfigs = await ctx.db
      .query("system_config")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Build config map with defaults
    const configMap: Record<string, any> = {};

    // First, add all defaults for this category
    for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
      if (config.category === args.category) {
        configMap[key] = {
          key,
          value: config.value,
          description: config.description,
          category: config.category,
          isDefault: true,
          updatedAt: null,
          updatedBy: null,
        };
      }
    }

    // Override with stored values
    for (const stored of storedConfigs) {
      configMap[stored.key] = {
        key: stored.key,
        value: stored.value,
        description: stored.description,
        category: stored.category,
        isDefault: false,
        updatedAt: stored.updatedAt,
        updatedBy: stored.updatedBy,
      };
    }

    return Object.values(configMap);
  },
});

// Get all configuration
export const getAllConfig = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    await verifyAdminRead(ctx, args.sessionId);

    // Get all stored configs
    const storedConfigs = await ctx.db.query("system_config").collect();

    // Build config map with defaults
    const configMap: Record<string, any> = {};

    // First, add all defaults
    for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
      configMap[key] = {
        key,
        value: config.value,
        description: config.description,
        category: config.category,
        isDefault: true,
        updatedAt: null,
        updatedBy: null,
      };
    }

    // Override with stored values
    for (const stored of storedConfigs) {
      configMap[stored.key] = {
        key: stored.key,
        value: stored.value,
        description: stored.description,
        category: stored.category,
        isDefault: false,
        updatedAt: stored.updatedAt,
        updatedBy: stored.updatedBy,
      };
    }

    return Object.values(configMap);
  },
});

// Get single config value
export const getConfig = query({
  args: {
    sessionId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAdminRead(ctx, args.sessionId);

    // Check stored value first
    const stored = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (stored) {
      return {
        key: stored.key,
        value: stored.value,
        description: stored.description,
        category: stored.category,
        isDefault: false,
        updatedAt: stored.updatedAt,
        updatedBy: stored.updatedBy,
      };
    }

    // Return default if exists
    const defaultConfig = DEFAULT_CONFIG[args.key];
    if (defaultConfig) {
      return {
        key: args.key,
        value: defaultConfig.value,
        description: defaultConfig.description,
        category: defaultConfig.category,
        isDefault: true,
        updatedAt: null,
        updatedBy: null,
      };
    }

    return null;
  },
});

// Update configuration value
export const updateConfig = mutation({
  args: {
    sessionId: v.string(),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminWithSettings(ctx, args.sessionId);

    // Get default config for description and category
    const defaultConfig = DEFAULT_CONFIG[args.key];
    if (!defaultConfig) {
      throw new Error(`Unknown config key: ${args.key}`);
    }

    // Check if config exists
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      // Insert new
      await ctx.db.insert("system_config", {
        key: args.key,
        category: defaultConfig.category as any,
        value: args.value,
        description: defaultConfig.description,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "config.update",
      targetType: "system_config",
      targetId: args.key,
      details: {
        key: args.key,
        newValue: args.value,
        category: defaultConfig.category,
      },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Bulk update configuration
export const bulkUpdateConfig = mutation({
  args: {
    sessionId: v.string(),
    updates: v.array(
      v.object({
        key: v.string(),
        value: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminWithSettings(ctx, args.sessionId);

    for (const update of args.updates) {
      const defaultConfig = DEFAULT_CONFIG[update.key];
      if (!defaultConfig) {
        continue; // Skip unknown keys
      }

      const existing = await ctx.db
        .query("system_config")
        .withIndex("by_key", (q) => q.eq("key", update.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: update.value,
          updatedAt: Date.now(),
          updatedBy: admin._id,
        });
      } else {
        await ctx.db.insert("system_config", {
          key: update.key,
          category: defaultConfig.category as any,
          value: update.value,
          description: defaultConfig.description,
          updatedAt: Date.now(),
          updatedBy: admin._id,
        });
      }
    }

    // Log bulk audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "config.bulk_update",
      targetType: "system_config",
      details: {
        keys: args.updates.map((u) => u.key),
        count: args.updates.length,
      },
      createdAt: Date.now(),
    });

    return { success: true, updated: args.updates.length };
  },
});

// Reset config to default
export const resetConfig = mutation({
  args: {
    sessionId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminWithSettings(ctx, args.sessionId);

    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);

      // Log audit event
      await ctx.db.insert("audit_log", {
        adminUserId: admin._id,
        action: "config.reset",
        targetType: "system_config",
        targetId: args.key,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get system policy (existing table)
export const getSystemPolicy = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    await verifyAdminRead(ctx, args.sessionId);

    const policy = await ctx.db.query("systemPolicy").first();
    return policy || {
      emergencyStop: false,
      inMaintenance: false,
      blockedContracts: [],
      blockedTokens: [],
      blockedChains: [],
      allowedChains: [1, 8453, 42161, 10, 137], // ETH, Base, Arb, OP, Polygon
      protocolWhitelistEnabled: false,
      allowedProtocols: [],
      maxSingleTxUsd: 10000,
    };
  },
});

// Update system policy
export const updateSystemPolicy = mutation({
  args: {
    sessionId: v.string(),
    updates: v.object({
      emergencyStop: v.optional(v.boolean()),
      emergencyStopReason: v.optional(v.string()),
      inMaintenance: v.optional(v.boolean()),
      maintenanceMessage: v.optional(v.string()),
      blockedContracts: v.optional(v.array(v.string())),
      blockedTokens: v.optional(v.array(v.string())),
      blockedChains: v.optional(v.array(v.number())),
      allowedChains: v.optional(v.array(v.number())),
      protocolWhitelistEnabled: v.optional(v.boolean()),
      allowedProtocols: v.optional(v.array(v.string())),
      maxSingleTxUsd: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminWithSettings(ctx, args.sessionId);

    const existing = await ctx.db.query("systemPolicy").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.updates,
        updatedAt: Date.now(),
        updatedBy: admin._id.toString(),
      });
    } else {
      await ctx.db.insert("systemPolicy", {
        emergencyStop: args.updates.emergencyStop ?? false,
        emergencyStopReason: args.updates.emergencyStopReason,
        inMaintenance: args.updates.inMaintenance ?? false,
        maintenanceMessage: args.updates.maintenanceMessage,
        blockedContracts: args.updates.blockedContracts ?? [],
        blockedTokens: args.updates.blockedTokens ?? [],
        blockedChains: args.updates.blockedChains ?? [],
        allowedChains: args.updates.allowedChains ?? [1, 8453, 42161, 10, 137],
        protocolWhitelistEnabled: args.updates.protocolWhitelistEnabled ?? false,
        allowedProtocols: args.updates.allowedProtocols ?? [],
        maxSingleTxUsd: args.updates.maxSingleTxUsd ?? 10000,
        updatedAt: Date.now(),
        updatedBy: admin._id.toString(),
      });
    }

    // Log audit event
    await ctx.db.insert("audit_log", {
      adminUserId: admin._id,
      action: "system_policy.update",
      targetType: "system_policy",
      details: args.updates,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
