/**
 * Convex functions for Rhinestone Smart Accounts.
 *
 * Tracks Smart Account deployments and status for users.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get Smart Account by owner EOA address.
 */
export const getByOwner = query({
  args: {
    ownerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.ownerAddress.toLowerCase();

    return await ctx.db
      .query("smartAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", normalizedAddress))
      .first();
  },
});

/**
 * Get Smart Account by Smart Account address.
 */
export const getByAddress = query({
  args: {
    smartAccountAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.smartAccountAddress.toLowerCase();

    return await ctx.db
      .query("smartAccounts")
      .withIndex("by_smart_account", (q) =>
        q.eq("smartAccountAddress", normalizedAddress)
      )
      .first();
  },
});

/**
 * Create a new Smart Account record.
 */
export const create = mutation({
  args: {
    ownerAddress: v.string(),
    smartAccountAddress: v.string(),
    deployedChains: v.array(v.number()),
    installedModules: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedOwner = args.ownerAddress.toLowerCase();
    const normalizedAccount = args.smartAccountAddress.toLowerCase();

    // Check if already exists
    const existing = await ctx.db
      .query("smartAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", normalizedOwner))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        smartAccountAddress: normalizedAccount,
        deployedChains: args.deployedChains,
        installedModules: args.installedModules,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new record
    return await ctx.db.insert("smartAccounts", {
      ownerAddress: normalizedOwner,
      smartAccountAddress: normalizedAccount,
      deployedChains: args.deployedChains,
      installedModules: args.installedModules,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

/**
 * Update Smart Account deployment (add chains or modules).
 */
export const updateDeployment = mutation({
  args: {
    ownerAddress: v.string(),
    addChains: v.optional(v.array(v.number())),
    addModules: v.optional(v.array(v.string())),
    removeModules: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const normalizedOwner = args.ownerAddress.toLowerCase();

    const account = await ctx.db
      .query("smartAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", normalizedOwner))
      .first();

    if (!account) {
      throw new Error("Smart Account not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Add new chains
    if (args.addChains && args.addChains.length > 0) {
      const existingChains = new Set(account.deployedChains);
      args.addChains.forEach((c) => existingChains.add(c));
      updates.deployedChains = Array.from(existingChains);
    }

    // Add new modules
    if (args.addModules && args.addModules.length > 0) {
      const existingModules = new Set(account.installedModules);
      args.addModules.forEach((m) => existingModules.add(m));
      updates.installedModules = Array.from(existingModules);
    }

    // Remove modules
    if (args.removeModules && args.removeModules.length > 0) {
      const removeSet = new Set(args.removeModules);
      updates.installedModules = account.installedModules.filter(
        (m) => !removeSet.has(m)
      );
    }

    await ctx.db.patch(account._id, updates);
    return account._id;
  },
});

/**
 * Update Smart Account status.
 */
export const updateStatus = mutation({
  args: {
    ownerAddress: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const normalizedOwner = args.ownerAddress.toLowerCase();

    const account = await ctx.db
      .query("smartAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", normalizedOwner))
      .first();

    if (!account) {
      throw new Error("Smart Account not found");
    }

    await ctx.db.patch(account._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return account._id;
  },
});
