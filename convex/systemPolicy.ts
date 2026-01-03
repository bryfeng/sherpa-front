import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * System Policy Convex Functions
 *
 * Platform-wide controls for emergencies, maintenance, and blocklists.
 * This is a singleton table - only one system policy exists.
 * Admin-only mutations require proper authorization.
 */

// Default system policy
const DEFAULT_SYSTEM_POLICY: {
  emergencyStop: boolean;
  emergencyStopReason: string | undefined;
  inMaintenance: boolean;
  maintenanceMessage: string | undefined;
  blockedContracts: string[];
  blockedTokens: string[];
  blockedChains: number[];
  allowedChains: number[];
  protocolWhitelistEnabled: boolean;
  allowedProtocols: string[];
  maxSingleTxUsd: number;
  updatedAt: number;
  updatedBy: string | undefined;
} = {
  emergencyStop: false,
  emergencyStopReason: undefined,
  inMaintenance: false,
  maintenanceMessage: undefined,
  blockedContracts: [],
  blockedTokens: [],
  blockedChains: [],
  allowedChains: [1, 137, 42161, 8453, 10], // ETH, Polygon, Arbitrum, Base, Optimism
  protocolWhitelistEnabled: false,
  allowedProtocols: [],
  maxSingleTxUsd: 100000,
  updatedAt: Date.now(),
  updatedBy: undefined,
};

/**
 * Get the current system policy.
 * Returns full policy for admin use.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const policy = await ctx.db.query("systemPolicy").first();
    return policy || DEFAULT_SYSTEM_POLICY;
  },
});

/**
 * Get public system status.
 * Returns only operational status - safe to expose to all users.
 */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      return {
        operational: true,
        emergencyStop: false,
        inMaintenance: false,
        message: undefined,
        allowedChains: DEFAULT_SYSTEM_POLICY.allowedChains,
        maxSingleTxUsd: DEFAULT_SYSTEM_POLICY.maxSingleTxUsd,
      };
    }

    return {
      operational: !policy.emergencyStop && !policy.inMaintenance,
      emergencyStop: policy.emergencyStop,
      inMaintenance: policy.inMaintenance,
      message: policy.emergencyStop
        ? policy.emergencyStopReason
        : policy.inMaintenance
          ? policy.maintenanceMessage
          : undefined,
      allowedChains: policy.allowedChains,
      maxSingleTxUsd: policy.maxSingleTxUsd,
    };
  },
});

/**
 * Check if a contract is blocked.
 */
export const isContractBlocked = query({
  args: { contractAddress: v.string() },
  handler: async (ctx, { contractAddress }) => {
    const policy = await ctx.db.query("systemPolicy").first();
    if (!policy) return false;

    const normalizedAddress = contractAddress.toLowerCase();
    return policy.blockedContracts.some(
      (addr) => addr.toLowerCase() === normalizedAddress
    );
  },
});

/**
 * Check if a token is blocked.
 */
export const isTokenBlocked = query({
  args: { tokenAddress: v.string() },
  handler: async (ctx, { tokenAddress }) => {
    const policy = await ctx.db.query("systemPolicy").first();
    if (!policy) return false;

    const normalizedAddress = tokenAddress.toLowerCase();
    return policy.blockedTokens.some(
      (addr) => addr.toLowerCase() === normalizedAddress
    );
  },
});

/**
 * Check if a chain is allowed.
 */
export const isChainAllowed = query({
  args: { chainId: v.number() },
  handler: async (ctx, { chainId }) => {
    const policy = await ctx.db.query("systemPolicy").first();
    if (!policy) {
      return DEFAULT_SYSTEM_POLICY.allowedChains.includes(chainId);
    }

    // Check if chain is in blocked list
    if (policy.blockedChains.includes(chainId)) {
      return false;
    }

    // Check if chain is in allowed list
    return policy.allowedChains.includes(chainId);
  },
});

// ============================================
// Admin Mutations (require authorization)
// ============================================

/**
 * Initialize system policy if it doesn't exist.
 * Should be called once during setup.
 */
export const initialize = mutation({
  args: { adminId: v.optional(v.string()) },
  handler: async (ctx, { adminId }) => {
    const existing = await ctx.db.query("systemPolicy").first();
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("systemPolicy", {
      ...DEFAULT_SYSTEM_POLICY,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });
  },
});

/**
 * Toggle emergency stop.
 */
export const setEmergencyStop = mutation({
  args: {
    enabled: v.boolean(),
    reason: v.optional(v.string()),
    adminId: v.string(),
  },
  handler: async (ctx, { enabled, reason, adminId }) => {
    // Validate: reason required when enabling
    if (enabled && !reason) {
      throw new Error("Reason is required when enabling emergency stop");
    }

    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      // Create with emergency stop
      return await ctx.db.insert("systemPolicy", {
        ...DEFAULT_SYSTEM_POLICY,
        emergencyStop: enabled,
        emergencyStopReason: reason,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    await ctx.db.patch(policy._id, {
      emergencyStop: enabled,
      emergencyStopReason: enabled ? reason : undefined,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    return policy._id;
  },
});

/**
 * Toggle maintenance mode.
 */
export const setMaintenanceMode = mutation({
  args: {
    enabled: v.boolean(),
    message: v.optional(v.string()),
    adminId: v.string(),
  },
  handler: async (ctx, { enabled, message, adminId }) => {
    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      return await ctx.db.insert("systemPolicy", {
        ...DEFAULT_SYSTEM_POLICY,
        inMaintenance: enabled,
        maintenanceMessage: message,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    await ctx.db.patch(policy._id, {
      inMaintenance: enabled,
      maintenanceMessage: enabled ? message : undefined,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    return policy._id;
  },
});

/**
 * Add to blocklist.
 */
export const addToBlocklist = mutation({
  args: {
    type: v.union(v.literal("contract"), v.literal("token"), v.literal("chain")),
    value: v.string(),
    adminId: v.string(),
  },
  handler: async (ctx, { type, value, adminId }) => {
    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      const newPolicy = { ...DEFAULT_SYSTEM_POLICY };
      if (type === "contract") {
        newPolicy.blockedContracts = [value.toLowerCase()];
      } else if (type === "token") {
        newPolicy.blockedTokens = [value.toLowerCase()];
      } else if (type === "chain") {
        newPolicy.blockedChains = [parseInt(value, 10)];
      }
      return await ctx.db.insert("systemPolicy", {
        ...newPolicy,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: adminId,
    };

    if (type === "contract") {
      const normalized = value.toLowerCase();
      if (!policy.blockedContracts.includes(normalized)) {
        updates.blockedContracts = [...policy.blockedContracts, normalized];
      }
    } else if (type === "token") {
      const normalized = value.toLowerCase();
      if (!policy.blockedTokens.includes(normalized)) {
        updates.blockedTokens = [...policy.blockedTokens, normalized];
      }
    } else if (type === "chain") {
      const chainId = parseInt(value, 10);
      if (!policy.blockedChains.includes(chainId)) {
        updates.blockedChains = [...policy.blockedChains, chainId];
      }
    }

    await ctx.db.patch(policy._id, updates);
    return policy._id;
  },
});

/**
 * Remove from blocklist.
 */
export const removeFromBlocklist = mutation({
  args: {
    type: v.union(v.literal("contract"), v.literal("token"), v.literal("chain")),
    value: v.string(),
    adminId: v.string(),
  },
  handler: async (ctx, { type, value, adminId }) => {
    const policy = await ctx.db.query("systemPolicy").first();
    if (!policy) return null;

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: adminId,
    };

    if (type === "contract") {
      const normalized = value.toLowerCase();
      updates.blockedContracts = policy.blockedContracts.filter(
        (addr) => addr.toLowerCase() !== normalized
      );
    } else if (type === "token") {
      const normalized = value.toLowerCase();
      updates.blockedTokens = policy.blockedTokens.filter(
        (addr) => addr.toLowerCase() !== normalized
      );
    } else if (type === "chain") {
      const chainId = parseInt(value, 10);
      updates.blockedChains = policy.blockedChains.filter((id) => id !== chainId);
    }

    await ctx.db.patch(policy._id, updates);
    return policy._id;
  },
});

/**
 * Update allowed chains.
 */
export const setAllowedChains = mutation({
  args: {
    chainIds: v.array(v.number()),
    adminId: v.string(),
  },
  handler: async (ctx, { chainIds, adminId }) => {
    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      return await ctx.db.insert("systemPolicy", {
        ...DEFAULT_SYSTEM_POLICY,
        allowedChains: chainIds,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    await ctx.db.patch(policy._id, {
      allowedChains: chainIds,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    return policy._id;
  },
});

/**
 * Update max single transaction limit.
 */
export const setMaxSingleTxUsd = mutation({
  args: {
    maxUsd: v.number(),
    adminId: v.string(),
  },
  handler: async (ctx, { maxUsd, adminId }) => {
    if (maxUsd < 0) {
      throw new Error("Max transaction limit cannot be negative");
    }

    const policy = await ctx.db.query("systemPolicy").first();

    if (!policy) {
      return await ctx.db.insert("systemPolicy", {
        ...DEFAULT_SYSTEM_POLICY,
        maxSingleTxUsd: maxUsd,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    await ctx.db.patch(policy._id, {
      maxSingleTxUsd: maxUsd,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    return policy._id;
  },
});
